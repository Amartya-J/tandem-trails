import { env } from "cloudflare:workers";
import { ZodError } from "zod";
import { EXIT_X, layout, LEVELS, PLATES } from "../../../lib/levels";
import { parseTrailRequest, requestIdentity } from "../../../lib/request-schemas";

type Room = { code: string; host_token: string; phase: string; level: number; unlocked: number; run: number; collected: number; gate_open: number; started_at: number | null; falls: number; created_at: number };
type Player = { token: string; room_code: string; name: string; joined_at: number; last_seen: number; x: number; y: number };
/** Seconds without a heartbeat before a seat is treated as inactive. */
const ACTIVE_WITHIN = 8;
/** Seconds since the newest player heartbeat before an abandoned room is deleted. */
const ROOM_IDLE_SECONDS = 60 * 60 * 2;
const respond = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const errorResponse = (code: string, error: string, status: number) => respond({ code, error }, status);
const rateBuckets = new Map<string, { started: number; count: number }>();
function rateLimited(key: string, limit: number, windowMs: number) {
  const current = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || current - bucket.started >= windowMs) {
    rateBuckets.set(key, { started: current, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}
const db = () => { if (!env.DB) throw Error("Room storage is unavailable"); return env.DB; };
const validCode = (value: unknown) => String(value ?? "").trim().toUpperCase();
const now = () => Math.floor(Date.now() / 1000);
let lastRoomPurgeAt = 0;

async function purgeAbandonedRooms() {
  const seenAt = now();
  if (seenAt - lastRoomPurgeAt < 60) return;
  lastRoomPurgeAt = seenAt;
  const cutoff = seenAt - ROOM_IDLE_SECONDS;
  // Rooms whose newest heartbeat (or create time if empty) is older than the idle window.
  await db().prepare(`
    DELETE FROM trail_players WHERE room_code IN (
      SELECT r.code FROM trail_rooms r
      WHERE COALESCE((SELECT MAX(p.last_seen) FROM trail_players p WHERE p.room_code = r.code), r.created_at) < ?
    )`).bind(cutoff).run();
  await db().prepare(`
    DELETE FROM trail_rooms WHERE COALESCE(
      (SELECT MAX(p.last_seen) FROM trail_players p WHERE p.room_code = trail_rooms.code),
      created_at
    ) < ?`).bind(cutoff).run();
}

async function rows(code: string) {
  await purgeAbandonedRooms();
  const room = await db().prepare("SELECT * FROM trail_rooms WHERE code = ?").bind(code).first<Room>();
  const players = room ? (await db().prepare("SELECT * FROM trail_players WHERE room_code = ? ORDER BY joined_at, token").bind(code).all<Player>()).results : [];
  return { room, players };
}

async function touch(token: string, code: string, seenAt = now()) {
  // Throttle writes: polls arrive ~every 220ms, so only bump when stale by ≥2s.
  await db().prepare("UPDATE trail_players SET last_seen = ? WHERE token = ? AND room_code = ? AND (? - last_seen) >= 2")
    .bind(seenAt, token, code, seenAt).run();
}

function isActive(player: Player, seenAt: number) {
  return seenAt - (player.last_seen || 0) <= ACTIVE_WITHIN;
}

/** If the host is away, promote the earliest-joined active teammate. */
async function ensureHost(room: Room, players: Player[], seenAt: number) {
  const host = players.find(player => player.token === room.host_token);
  if (host && isActive(host, seenAt)) return room;
  const successor = players.find(player => player.token !== room.host_token && isActive(player, seenAt));
  if (!successor) return room;
  await db().prepare("UPDATE trail_rooms SET host_token = ? WHERE code = ? AND host_token = ?")
    .bind(successor.token, room.code, room.host_token).run();
  return { ...room, host_token: successor.token };
}

async function state(code: string, token: string) {
  const seenAt = now();
  await touch(token, code, seenAt);
  const loaded = await rows(code);
  if (!loaded.room) return respond({ error: "Room not found or the room has expired" }, 404);
  const meIndex = loaded.players.findIndex(player => player.token === token);
  if (meIndex < 0) return respond({ error: "This device is not in the room" }, 403);
  const room = await ensureHost(loaded.room, loaded.players, seenAt);
  const players = loaded.players;
  return respond({
    code, phase: room.phase, level: room.level, unlocked: room.unlocked, run: room.run, collected: room.collected & 15,
    optionalCollected: (room.collected >> 4) & 3, gateOpen: !!room.gate_open,
    completion: room.phase === "finished" ? {
      // A negative started_at stores the frozen run duration for finished rooms.
      seconds: room.started_at !== null && room.started_at < 0 ? -room.started_at : Math.max(0, seenAt - (room.started_at || seenAt)),
      falls: room.falls,
      lights: 4,
      fireflies: ((room.collected >> 4) & 3).toString(2).replace(/0/g, "").length,
      players: players.map(player => player.name),
      newlyUnlocked: Math.min(16, room.level + 2),
    } : null,
    isHost: room.host_token === token, meIndex, playerCount: players.length, serverTime: seenAt,
    players: players.map((player, index) => {
      const lastSeen = player.token === token ? Math.max(player.last_seen || 0, seenAt) : (player.last_seen || 0);
      return {
        name: player.name, x: player.x, y: player.y, color: index, isHost: player.token === room.host_token,
        lastSeen, active: seenAt - lastSeen <= ACTIVE_WITHIN,
      };
    }),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = validCode(url.searchParams.get("code"));
    const token = request.headers.get("X-Trail-Token") || "";
    if (rateLimited(`${token || code}:poll`, 120, 10000)) return errorResponse("RATE_LIMITED", "Too many requests. Please try again shortly.", 429);
    return state(code, token);
  } catch (error) { console.error(error); return respond({ error: "Could not load the room. Try again." }, 500); }
}

export async function POST(request: Request) {
  try {
    const input = parseTrailRequest(await request.json());
    const { action, code: requestCode, token: requestToken } = requestIdentity(input);
    const code = validCode(requestCode);
    const token = requestToken;
    const rateKey = token || code || "anonymous";
    if (rateLimited(`${rateKey}:${action}`, action === "move" ? 90 : 120, action === "move" ? 1000 : 10000)) {
      return errorResponse("RATE_LIMITED", "Too many requests. Please try again shortly.", 429);
    }
    const d = db();
    if (action === "create") {
      const name = "name" in input ? input.name : "";
      if (!name) return errorResponse("INVALID_NAME", "Please enter a player name (1–20 characters)", 400);
      const playerToken = crypto.randomUUID();
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const joinedAt = now();
      for (let attempt = 0; attempt < 5; attempt++) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const roomCode = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
        try {
          await d.batch([
            d.prepare("INSERT INTO trail_rooms (code, host_token, phase, level, unlocked, collected, gate_open, started_at, falls, created_at) VALUES (?, ?, 'lobby', 0, 0, 0, 0, NULL, 0, ?)").bind(roomCode, playerToken, joinedAt),
            d.prepare("INSERT INTO trail_players (token, room_code, name, joined_at, last_seen, x, y) VALUES (?, ?, ?, ?, ?, 80, 388)").bind(playerToken, roomCode, name, joinedAt, joinedAt),
          ]);
          return respond({ code: roomCode, token: playerToken });
        } catch (error) { if (attempt === 4) throw error; }
      }
    }
    if (!/^[A-Z2-9]{6}$/.test(code)) return errorResponse("INVALID_ROOM_CODE", "Please enter a valid six-character room code", 400);
    const { room, players } = await rows(code);
    if (!room) return respond({ error: "Room not found or the room has expired" }, 404);
    if (action === "join") {
      const name = "name" in input ? input.name : "";
      if (!name) return errorResponse("INVALID_NAME", "Please enter a player name (1–20 characters)", 400);
      if (room.phase !== "lobby") return errorResponse("ROOM_STARTED", "This adventure has already started", 409);
      const playerToken = crypto.randomUUID();
      const joinedAt = now();
      const joined = await d.prepare("INSERT INTO trail_players (token, room_code, name, joined_at, last_seen, x, y) SELECT ?, ?, ?, ?, ?, 80, 388 WHERE EXISTS (SELECT 1 FROM trail_rooms WHERE code = ? AND phase = 'lobby') AND (SELECT COUNT(*) FROM trail_players WHERE room_code = ?) < 4")
        .bind(playerToken, code, name, joinedAt, joinedAt, code, code).run();
      if (!joined.meta.changes) return errorResponse("ROOM_FULL", "This room is full (maximum 4 players) or has started", 409);
      return respond({ code, token: playerToken });
    }
    const me = players.find(player => player.token === token);
    if (!me) return errorResponse("INVALID_SESSION", "This device is not in the room", 403);
    if (action === "reconnect") {
      // Same snapshot as GET: validates the saved device token after refresh or network loss.
      return state(code, token);
    }
    if (action === "rename") {
      const name = "name" in input ? input.name : "";
      if (!name) return errorResponse("INVALID_NAME", "Please enter a player name (1–20 characters)", 400);
      await d.prepare("UPDATE trail_players SET name = ?, last_seen = ? WHERE token = ? AND room_code = ?").bind(name, now(), token, code).run();
      return state(code, token);
    }
    if (action === "leave") {
      if (room.phase === "active") return errorResponse("LEVEL_ACTIVE", "Finish or restart the level before leaving", 409);
      await d.prepare("DELETE FROM trail_players WHERE token = ? AND room_code = ?").bind(token, code).run();
      const remaining = (await rows(code)).players;
      if (!remaining.length) await d.prepare("DELETE FROM trail_rooms WHERE code = ?").bind(code).run();
      else if (room.host_token === token) await d.prepare("UPDATE trail_rooms SET host_token = ? WHERE code = ?").bind(remaining[0].token, code).run();
      return respond({ left: true });
    }
    if (action === "start") {
      if (room.host_token !== token) return errorResponse("NOT_HOST", "Only the host can choose a level", 403);
      const level = Number("level" in input ? input.level : room.level);
      if (!Number.isInteger(level) || level < 0 || level > room.unlocked || level >= LEVELS.length) return errorResponse("LEVEL_LOCKED", "That level is still locked", 400);
      const started = await d.prepare("UPDATE trail_rooms SET phase = 'active', level = ?, run = run + 1, collected = 0, gate_open = 0, started_at = ?, falls = 0 WHERE code = ? AND phase IN ('lobby','finished') AND (SELECT COUNT(*) FROM trail_players WHERE room_code = ?) BETWEEN 2 AND 4")
        .bind(level, now(), code, code).run();
      if (!started.meta.changes) return errorResponse("ROOM_NOT_READY", "Invite 2–4 players before starting", 409);
      await d.prepare("UPDATE trail_players SET x = 80, y = 388 WHERE room_code = ?").bind(code).run();
      return state(code, token);
    }
    if (action === "restart") {
      if (room.host_token !== token || room.phase !== "active") return errorResponse("NOT_HOST", "Only the host can restart an active level", 403);
      await d.batch([
        d.prepare("UPDATE trail_rooms SET run = run + 1, collected = 0, gate_open = 0, started_at = ?, falls = 0 WHERE code = ? AND phase = 'active'").bind(now(), code),
        d.prepare("UPDATE trail_players SET x = 80, y = 388 WHERE room_code = ?").bind(code),
      ]);
      return state(code, token);
    }
    if (room.phase !== "active") return errorResponse("LEVEL_INACTIVE", "Start a level first", 409);
    if (action === "move") {
      const x = Number("x" in input ? input.x : NaN), y = Number("y" in input ? input.y : NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1960 || y < -150 || y > 550) return errorResponse("INVALID_POSITION", "Invalid position", 400);
      const seenAt = now();
      const previous = await d.prepare("SELECT x, y, last_seen FROM trail_players WHERE room_code = ? AND token = ?").bind(code, token).first<{ x: number; y: number; last_seen: number }>();
      if (!previous) return errorResponse("INVALID_SESSION", "This device is not in the room", 403);
      const elapsed = Math.max(0, seenAt - previous.last_seen);
      const allowedDistance = 700 + elapsed * 420;
      if (elapsed <= ACTIVE_WITHIN && Math.hypot(x - previous.x, y - previous.y) > allowedDistance) {
        return errorResponse("IMPOSSIBLE_POSITION", "Movement update was too large", 400);
      }
      await d.prepare("UPDATE trail_players SET x = ?, y = ?, last_seen = ? WHERE room_code = ? AND token = ?").bind(x, y, seenAt, code, token).run();
      // Only recently active seats can hold switches, so a disconnected player cannot jam a plate.
      await d.prepare(`UPDATE trail_rooms SET gate_open = 1 WHERE code = ? AND phase = 'active' AND gate_open = 0
        AND EXISTS (SELECT 1 FROM trail_players WHERE room_code = ? AND (? - last_seen) <= ? AND x BETWEEN ? AND ? AND y BETWEEN 360 AND 400)
        AND EXISTS (SELECT 1 FROM trail_players WHERE room_code = ? AND (? - last_seen) <= ? AND x BETWEEN ? AND ? AND y BETWEEN 360 AND 400)`)
        .bind(code, code, seenAt, ACTIVE_WITHIN, PLATES[0]-32, PLATES[0]+16, code, seenAt, ACTIVE_WITHIN, PLATES[1]-32, PLATES[1]+16).run();
      return respond({ ok: true });
    }
    if (action === "collect") {
      const shard = Number("shard" in input ? input.shard : NaN);
      if (!Number.isInteger(shard) || shard < 0 || shard > 3) return errorResponse("INVALID_LANTERN", "Invalid lantern", 400);
      const target = layout(room.level).shards[shard];
      const current = await d.prepare("SELECT x, y FROM trail_players WHERE token = ? AND room_code = ?").bind(token, code).first<{x:number;y:number}>();
      if (!current || Math.hypot(current.x + 17 - target.x, current.y + 22 - target.y) > 90) return errorResponse("LANTERN_OUT_OF_RANGE", "Move closer to the lantern", 409);
      await d.prepare("UPDATE trail_rooms SET collected = collected | ? WHERE code = ? AND phase = 'active' AND level = ?").bind(1 << shard, code, room.level).run();
      return state(code, token);
    }
    if (action === "collectOptional") {
      const index = Number("index" in input ? input.index : NaN);
      if (!Number.isInteger(index) || index < 0 || index > 1) return errorResponse("INVALID_FIREFLY", "Invalid firefly", 400);
      const target = layout(room.level).optional[index];
      const current = await d.prepare("SELECT x, y FROM trail_players WHERE token = ? AND room_code = ?").bind(token, code).first<{x:number;y:number}>();
      if (!current || Math.hypot(current.x + 17 - target.x, current.y + 22 - target.y) > 90) return errorResponse("FIREFLY_OUT_OF_RANGE", "Move closer to the firefly", 409);
      await d.prepare("UPDATE trail_rooms SET collected = collected | ? WHERE code = ? AND phase = 'active' AND level = ?")
        .bind(1 << (index + 4), code, room.level).run();
      return state(code, token);
    }
    if (action === "fall") {
      await d.prepare("UPDATE trail_rooms SET falls = falls + 1 WHERE code = ? AND phase = 'active'").bind(code).run();
      return respond({ ok: true });
    }
    if (action === "complete") {
      const snapshot = await rows(code);
      const current = snapshot.room;
      const seenAt = now();
      // Away seats must not strand the room: only recently active players need to reach the portal.
      const activePlayers = snapshot.players.filter(player => isActive(player, seenAt));
      const finishers = activePlayers.length >= 2 ? activePlayers : snapshot.players;
      const allAtExit = finishers.length >= 2 && finishers.every(player => player.x + 17 >= EXIT_X - 45 && player.y <= 410);
      if (!current || current.phase !== "active" || (current.collected & 15) !== 15 || !current.gate_open || !allAtExit) {
        return errorResponse("COMPLETION_NOT_READY", activePlayers.length < 2 && snapshot.players.length >= 2
          ? "At least two active players need to reach the portal together"
          : "Collect four lights, open the gate, and bring everyone to the portal", 409);
      }
      const seconds = Math.max(1, seenAt - (current.started_at ?? seenAt));
      await d.prepare("UPDATE trail_rooms SET phase = 'finished', started_at = ?, unlocked = MAX(unlocked, MIN(15, level + 1)) WHERE code = ? AND phase = 'active'")
        .bind(-seconds, code).run();
      return state(code, token);
    }
    return errorResponse("UNKNOWN_ACTION", "Unknown action", 400);
  } catch (error) {
    if (error instanceof ZodError) return errorResponse("INVALID_REQUEST", "Invalid request payload", 400);
    console.error(error); return respond({ error: "Something went wrong. Please try again." }, 500);
  }
}
