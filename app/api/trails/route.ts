import { env } from "cloudflare:workers";
import { EXIT_X, layout, LEVELS, PLATES } from "../../../lib/levels";

type Room = { code: string; host_token: string; phase: string; level: number; unlocked: number; run: number; collected: number; gate_open: number; created_at: number };
type Player = { token: string; room_code: string; name: string; joined_at: number; x: number; y: number };
const respond = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const db = () => { if (!env.DB) throw Error("Room storage is unavailable"); return env.DB; };
const validCode = (value: unknown) => String(value ?? "").trim().toUpperCase();
const validName = (value: unknown) => String(value ?? "").trim().slice(0, 20);
const now = () => Math.floor(Date.now() / 1000);

async function rows(code: string) {
  const room = await db().prepare("SELECT * FROM trail_rooms WHERE code = ?").bind(code).first<Room>();
  const players = room ? (await db().prepare("SELECT * FROM trail_players WHERE room_code = ? ORDER BY joined_at, token").bind(code).all<Player>()).results : [];
  return { room, players };
}

async function state(code: string, token: string) {
  const { room, players } = await rows(code);
  if (!room) return respond({ error: "Room not found" }, 404);
  const meIndex = players.findIndex(player => player.token === token);
  if (meIndex < 0) return respond({ error: "This device is not in the room" }, 403);
  return respond({
    code, phase: room.phase, level: room.level, unlocked: room.unlocked, run: room.run, collected: room.collected, gateOpen: !!room.gate_open,
    isHost: room.host_token === token, meIndex, playerCount: players.length, serverTime: now(),
    players: players.map((player, index) => ({ name: player.name, x: player.x, y: player.y, color: index, isHost: player.token === room.host_token })),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return state(validCode(url.searchParams.get("code")), request.headers.get("X-Trail-Token") || "");
  } catch (error) { console.error(error); return respond({ error: "Could not load the room. Try again." }, 500); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const action = String(input.action ?? "");
    const code = validCode(input.code);
    const token = String(input.token ?? "");
    const d = db();
    if (action === "create") {
      const name = validName(input.name);
      if (!name) return respond({ error: "Enter a name" }, 400);
      const playerToken = crypto.randomUUID();
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let attempt = 0; attempt < 5; attempt++) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const roomCode = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
        try {
          await d.batch([
            d.prepare("INSERT INTO trail_rooms (code, host_token, phase, level, unlocked, collected, gate_open, created_at) VALUES (?, ?, 'lobby', 0, 0, 0, 0, ?)").bind(roomCode, playerToken, now()),
            d.prepare("INSERT INTO trail_players (token, room_code, name, joined_at, x, y) VALUES (?, ?, ?, ?, 80, 388)").bind(playerToken, roomCode, name, now()),
          ]);
          return respond({ code: roomCode, token: playerToken });
        } catch (error) { if (attempt === 4) throw error; }
      }
    }
    if (!/^[A-Z2-9]{6}$/.test(code)) return respond({ error: "Enter a six-character room code" }, 400);
    const { room, players } = await rows(code);
    if (!room) return respond({ error: "Room not found" }, 404);
    if (action === "join") {
      const name = validName(input.name);
      if (!name) return respond({ error: "Enter a name" }, 400);
      if (room.phase !== "lobby") return respond({ error: "This adventure has already started" }, 409);
      const playerToken = crypto.randomUUID();
      const joined = await d.prepare("INSERT INTO trail_players (token, room_code, name, joined_at, x, y) SELECT ?, ?, ?, ?, 80, 388 WHERE EXISTS (SELECT 1 FROM trail_rooms WHERE code = ? AND phase = 'lobby') AND (SELECT COUNT(*) FROM trail_players WHERE room_code = ?) < 4")
        .bind(playerToken, code, name, now(), code, code).run();
      if (!joined.meta.changes) return respond({ error: "This room is full or has started" }, 409);
      return respond({ code, token: playerToken });
    }
    const me = players.find(player => player.token === token);
    if (!me) return respond({ error: "This device is not in the room" }, 403);
    if (action === "leave") {
      if (room.phase === "active") return respond({ error: "Finish or restart the level before leaving" }, 409);
      await d.prepare("DELETE FROM trail_players WHERE token = ? AND room_code = ?").bind(token, code).run();
      const remaining = (await rows(code)).players;
      if (!remaining.length) await d.prepare("DELETE FROM trail_rooms WHERE code = ?").bind(code).run();
      else if (room.host_token === token) await d.prepare("UPDATE trail_rooms SET host_token = ? WHERE code = ?").bind(remaining[0].token, code).run();
      return respond({ left: true });
    }
    if (action === "start") {
      if (room.host_token !== token) return respond({ error: "Only the host can choose a level" }, 403);
      const level = Number(input.level ?? room.level);
      if (!Number.isInteger(level) || level < 0 || level > room.unlocked || level >= LEVELS.length) return respond({ error: "That level is still locked" }, 400);
      const started = await d.prepare("UPDATE trail_rooms SET phase = 'active', level = ?, run = run + 1, collected = 0, gate_open = 0 WHERE code = ? AND phase IN ('lobby','finished') AND (SELECT COUNT(*) FROM trail_players WHERE room_code = ?) BETWEEN 2 AND 4")
        .bind(level, code, code).run();
      if (!started.meta.changes) return respond({ error: "Invite 2–4 players before starting" }, 409);
      await d.prepare("UPDATE trail_players SET x = 80, y = 388 WHERE room_code = ?").bind(code).run();
      return state(code, token);
    }
    if (action === "restart") {
      if (room.host_token !== token || room.phase !== "active") return respond({ error: "Only the host can restart an active level" }, 403);
      await d.batch([
        d.prepare("UPDATE trail_rooms SET run = run + 1, collected = 0, gate_open = 0 WHERE code = ? AND phase = 'active'").bind(code),
        d.prepare("UPDATE trail_players SET x = 80, y = 388 WHERE room_code = ?").bind(code),
      ]);
      return state(code, token);
    }
    if (room.phase !== "active") return respond({ error: "Start a level first" }, 409);
    if (action === "move") {
      const x = Number(input.x), y = Number(input.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1960 || y < -150 || y > 550) return respond({ error: "Invalid position" }, 400);
      await d.prepare("UPDATE trail_players SET x = ?, y = ? WHERE room_code = ? AND token = ?").bind(x, y, code, token).run();
      await d.prepare("UPDATE trail_rooms SET gate_open = 1 WHERE code = ? AND phase = 'active' AND gate_open = 0 AND EXISTS (SELECT 1 FROM trail_players WHERE room_code = ? AND x BETWEEN ? AND ? AND y BETWEEN 360 AND 400) AND EXISTS (SELECT 1 FROM trail_players WHERE room_code = ? AND x BETWEEN ? AND ? AND y BETWEEN 360 AND 400)")
        .bind(code, code, PLATES[0]-32, PLATES[0]+16, code, PLATES[1]-32, PLATES[1]+16).run();
      return respond({ ok: true });
    }
    if (action === "collect") {
      const shard = Number(input.shard);
      if (!Number.isInteger(shard) || shard < 0 || shard > 3) return respond({ error: "Invalid lantern" }, 400);
      const target = layout(room.level).shards[shard];
      const current = await d.prepare("SELECT x, y FROM trail_players WHERE token = ? AND room_code = ?").bind(token, code).first<{x:number;y:number}>();
      if (!current || Math.hypot(current.x + 17 - target.x, current.y + 22 - target.y) > 90) return respond({ error: "Move closer to the lantern" }, 409);
      await d.prepare("UPDATE trail_rooms SET collected = collected | ? WHERE code = ? AND phase = 'active' AND level = ?").bind(1 << shard, code, room.level).run();
      return state(code, token);
    }
    if (action === "complete") {
      const current = (await rows(code)).room;
      const allAtExit = players.length >= 2 && players.every(player => player.x + 17 >= EXIT_X - 45 && player.y <= 410);
      if (!current || current.phase !== "active" || current.collected !== 15 || !current.gate_open || !allAtExit) return respond({ error: "Collect four lights, open the gate, and bring everyone to the portal" }, 409);
      await d.prepare("UPDATE trail_rooms SET phase = 'finished', unlocked = MAX(unlocked, MIN(15, level + 1)) WHERE code = ? AND phase = 'active'").bind(code).run();
      return state(code, token);
    }
    return respond({ error: "Unknown action" }, 400);
  } catch (error) { console.error(error); return respond({ error: "Something went wrong. Please try again." }, 500); }
}
