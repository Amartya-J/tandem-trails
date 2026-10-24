import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { EXIT_X, PLATES, layout } from "@/lib/levels";
import { ROOM_STATE_VERSION, TRAIL_TWISTS, type Completion, type Player, type Room, type RoomEvent, type TrailTwistId } from "@/lib/game-types";
import { getDb } from "@/db";
import { rooms as roomRows, trailSessions } from "@/db/schema";

type ServerPlayer = Player & { active: boolean; lastSeen: number };
type ServerRoom = Pick<Room, "code" | "phase" | "level" | "unlocked" | "run" | "collected" | "optionalCollected" | "gateOpen" | "relayActive" | "crate" | "trailTwist"> & {
  falls: number;
  players: ServerPlayer[];
  completion: Completion | null;
  events: RoomEvent[];
  startedAt?: number;
};
type RequestData = Record<string, unknown>;

const rooms = new Map<string, ServerRoom>();
const sessions = new Map<string, { code: string; playerIndex: number; token: string }>();
const ACTIVE_WINDOW_MS = 8_000;
const MAX_NAME_LENGTH = 20;

async function loadRoom(code: string) {
  const cached = rooms.get(code);
  if (cached) return cached;
  const [row] = await getDb().select({ stateJson: roomRows.stateJson }).from(roomRows).where(eq(roomRows.code, code)).limit(1);
  if (!row?.stateJson) return undefined;
  try {
    const room = JSON.parse(row.stateJson) as ServerRoom;
    // Preserve compatibility with rooms created before the cooperative-expansion fields existed.
    room.events ??= [];
    room.relayActive ??= false;
    room.crate ??= { ...layout(room.level).trailCrate };
    rooms.set(code, room);
    return room;
  } catch {
    return undefined;
  }
}

async function saveRoom(room: ServerRoom) {
  rooms.set(room.code, room);
  await getDb().update(roomRows).set({
    phase: room.phase,
    level: room.level,
    unlocked: room.unlocked,
    run: room.run,
    collected: room.collected,
    gateOpen: room.gateOpen ? 1 : 0,
    startedAt: room.startedAt ?? null,
    falls: room.falls,
    stateJson: JSON.stringify(room),
  }).where(eq(roomRows.code, room.code));
}

async function loadSession(token: string) {
  const cached = sessions.get(token);
  if (cached) return cached;
  const [row] = await getDb().select().from(trailSessions).where(eq(trailSessions.token, token)).limit(1);
  if (!row) return undefined;
  const session = { code: row.roomCode, playerIndex: row.playerIndex, token };
  sessions.set(token, session);
  return session;
}

async function saveSession(session: { code: string; playerIndex: number; token: string }) {
  sessions.set(session.token, session);
  await getDb().insert(trailSessions).values({ token: session.token, roomCode: session.code, playerIndex: session.playerIndex, updatedAt: Date.now() }).onConflictDoUpdate({ target: trailSessions.token, set: { roomCode: session.code, playerIndex: session.playerIndex, updatedAt: Date.now() } });
}

function rollTrailTwist(previous?: TrailTwistId): TrailTwistId {
  const options = (Object.keys(TRAIL_TWISTS) as TrailTwistId[]).filter(twist => twist !== previous);
  return options[Math.floor(Math.random() * options.length)];
}

function refreshActivity(room: ServerRoom) {
  const now = Date.now();
  for (const player of room.players) {
    player.active = now - player.lastSeen <= ACTIVE_WINDOW_MS;
    if (player.downedUntil && player.downedUntil <= now) {
      delete player.downedUntil;
      player.x = 80;
      player.y = 388;
    }
  }

  const host = room.players.find(player => player.isHost);
  if (host && !host.active) {
    const nextHost = room.players.find(player => player.active && player !== host);
    if (nextHost) {
      host.isHost = false;
      nextHost.isHost = true;
    }
  }
}

function recordEvent(room: ServerRoom, event: Omit<RoomEvent, "at">) {
  room.events = [...(room.events ?? []), { ...event, at: Date.now() }].slice(-12);
}

function isNear(player: { x: number; y: number }, target: { x: number; y: number }, radius = 52) {
  return Math.hypot(player.x + 17 - target.x, player.y + 22 - target.y) <= radius;
}

function isValidPosition(x: unknown, y: unknown) {
  return typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1950 && y >= 0 && y <= 545;
}

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_NAME_LENGTH;
}

function avatarOf(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 4 ? value : fallback;
}

function updateGate(room: ServerRoom) {
  const activePlayers = room.players.filter(player => player.active);
  if (PLATES.every(plate => activePlayers.some(player => Math.abs(player.x + 17 - plate) <= 48))) {
    room.gateOpen = true;
  }
  const relay = layout(room.level).relaySwitch;
  room.relayActive = activePlayers.some(player => !player.downedUntil && Math.abs(player.x + 17 - relay.x) <= 34 && player.y > 360);
}

function sanitizeRoom(room: ServerRoom, meIndex: number) {
  return {
    ...room,
    stateVersion: ROOM_STATE_VERSION,
    meIndex,
    isHost: room.players[meIndex]?.isHost ?? false,
    playerCount: room.players.length,
    serverTime: Date.now(),
  };
}

function asRecord(value: unknown): RequestData {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RequestData : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const token = req.headers.get("X-Trail-Token");

  if (!code || !token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 403 });
  }

  const sess = await loadSession(token);
  if (!sess || sess.code !== code) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const room = await loadRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Update active status
  const player = room.players[sess.playerIndex];
  if (player) {
    player.lastSeen = Date.now();
    player.active = true;
  }

  refreshActivity(room);
  updateGate(room);
  await saveRoom(room);

  return NextResponse.json(sanitizeRoom(room, sess.playerIndex));
}

export async function POST(req: Request) {
  let body: RequestData;
  try {
    body = asRecord(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const action = text(body.action) || text(body.type);
  const payload = asRecord(body.payload);
  const requestPayload = Object.keys(payload).length ? payload : body;
  const session = asRecord(body.session);
  const token = req.headers.get("X-Trail-Token") || text(body.token) || text(session.token);
  const code = text(body.code) || text(session.code);

  if (action === "move" && !isValidPosition(requestPayload.x, requestPayload.y)) {
    return NextResponse.json({ error: "Invalid coordinates", code: "INVALID_REQUEST" }, { status: 400 });
  }

  if (action === "create") {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newToken = Math.random().toString(36).substring(2, 12);
    const room: ServerRoom = {
      code: newCode,
      phase: "lobby",
      level: 0,
      unlocked: 0,
      run: 0,
      trailTwist: rollTrailTwist(),
      falls: 0,
      collected: 0,
      optionalCollected: 0,
      gateOpen: false,
      relayActive: false,
      crate: { ...layout(0).trailCrate },
      players: [{ name: validName(requestPayload.name) ? requestPayload.name.trim() : "Host", x: 80, y: 388, color: 0, avatar: avatarOf(requestPayload.avatar, 0), isHost: true, active: true, lastSeen: Date.now() }],
      completion: null,
      events: [],
    };
    await getDb().insert(roomRows).values({ code: newCode, hostToken: newToken, phase: room.phase, level: room.level, unlocked: room.unlocked, run: room.run, collected: room.collected, gateOpen: 0, startedAt: null, falls: 0, createdAt: Date.now(), stateJson: JSON.stringify(room) });
    await saveSession({ code: newCode, playerIndex: 0, token: newToken });
    return NextResponse.json({ session: { code: newCode, token: newToken }, code: newCode, token: newToken, room: sanitizeRoom(room, 0) });
  }

  if (action === "join") {
    const targetCode = text(requestPayload.code) || code;
    if (!targetCode) return NextResponse.json({ error: "Room not found", code: "NOT_FOUND" }, { status: 404 });
    const room = await loadRoom(targetCode);
    if (!room) return NextResponse.json({ error: "Room not found", code: "NOT_FOUND" }, { status: 404 });
    if (room.phase !== "lobby") return NextResponse.json({ error: "Game already started", code: "GAME_STARTED" }, { status: 409 });
    if (room.players.length >= 4) return NextResponse.json({ error: "Room full", code: "ROOM_FULL" }, { status: 400 });

    const newToken = Math.random().toString(36).substring(2, 12);
    const pIdx = room.players.length;
    const joinerName = validName(requestPayload.name) ? requestPayload.name.trim() : `Player ${pIdx + 1}`;
    room.players.push({ name: joinerName, x: 80, y: 388, color: pIdx, avatar: avatarOf(requestPayload.avatar, pIdx), isHost: false, active: true, lastSeen: Date.now() });
    recordEvent(room, { type: "crew-joined", actor: joinerName });
    await saveRoom(room);
    await saveSession({ code: targetCode, playerIndex: pIdx, token: newToken });
    return NextResponse.json({ session: { code: targetCode, token: newToken }, code: targetCode, token: newToken, room: sanitizeRoom(room, pIdx) });
  }

  // Session verification
  if (!token) return NextResponse.json({ error: "No session token", code: "UNAUTHORIZED" }, { status: 401 });
  const sess = await loadSession(token);
  if (!sess) return NextResponse.json({ error: "Unknown token", code: "FORBIDDEN" }, { status: 403 });

  const room = await loadRoom(sess.code);
  if (!room) return NextResponse.json({ error: "Room not found", code: "NOT_FOUND" }, { status: 404 });

  const me = room.players[sess.playerIndex];
  if (me) {
    me.lastSeen = Date.now();
    me.active = true;
  }
  refreshActivity(room);
  updateGate(room);

  if (action === "reconnect") {
    await saveRoom(room);
    return NextResponse.json(sanitizeRoom(room, sess.playerIndex));
  }

  if (action === "poll") {
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "move") {
    const x = requestPayload.x, y = requestPayload.y;
    if (me?.downedUntil) return NextResponse.json({ error: "Wait for a teammate to rescue you", code: "DOWNED" }, { status: 409 });
    if (me && isValidPosition(x, y) && typeof x === "number" && typeof y === "number") {
      me.x = x; me.y = y;
      if (room.crate?.carrier === sess.playerIndex) { room.crate.x = x + 38; room.crate.y = y + 18; }
    }
    updateGate(room);
    await saveRoom(room);
    return NextResponse.json({ success: true, ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "collect") {
    if (room.phase !== "active") return NextResponse.json({ error: "Level not active", code: "NOT_ACTIVE" }, { status: 409 });
    const shardIndex = typeof requestPayload.shard === "number" ? requestPayload.shard : -1;
    const shard = layout(room.level).shards[shardIndex];
    if (!me || !shard || !isNear(me, shard)) {
      return NextResponse.json({ error: "Move closer to the spirit light", code: "OUT_OF_RANGE" }, { status: 409 });
    }
    const wasCollected = room.collected;
    room.collected |= (1 << shardIndex);
    if (wasCollected !== room.collected) recordEvent(room, { type: "light-collected", actor: me.name });
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "collectOptional") {
    if (room.phase !== "active") return NextResponse.json({ error: "Level not active", code: "NOT_ACTIVE" }, { status: 409 });
    const optionalIndex = typeof requestPayload.index === "number" ? requestPayload.index : -1;
    const optional = layout(room.level).optional[optionalIndex];
    if (!me || !optional || !isNear(me, optional)) {
      return NextResponse.json({ error: "Move closer to the firefly", code: "OUT_OF_RANGE" }, { status: 409 });
    }
    room.optionalCollected |= (1 << optionalIndex);
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "fall") {
    if (room.phase !== "active") return NextResponse.json({ error: "Level not active", code: "NOT_ACTIVE" }, { status: 409 });
    room.falls = (room.falls || 0) + 1;
    if (me) me.downedUntil = Date.now() + 5_000;
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "carry") {
    if (!me || room.phase !== "active") return NextResponse.json({ error: "The trail is not active", code: "NOT_ACTIVE" }, { status: 409 });
    if (room.crate.carrier === sess.playerIndex) {
      delete room.crate.carrier;
      room.crate.x = me.x + 38;
      room.crate.y = me.y + 18;
    } else {
      if (room.crate.carrier !== undefined) return NextResponse.json({ error: "A teammate is carrying the Trail Crate", code: "IN_USE" }, { status: 409 });
      if (!isNear(me, room.crate, 70)) return NextResponse.json({ error: "Move closer to the Trail Crate", code: "OUT_OF_RANGE" }, { status: 409 });
      room.crate.carrier = sess.playerIndex;
    }
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "rescue") {
    const targetIndex = typeof requestPayload.targetIndex === "number" ? requestPayload.targetIndex : -1;
    const target = room.players[targetIndex];
    if (!me || !target || !target.downedUntil || !isNear(me, target, 74)) {
      return NextResponse.json({ error: "Stand beside a downed teammate to rescue them", code: "OUT_OF_RANGE" }, { status: 409 });
    }
    delete target.downedUntil;
    target.x = Math.min(1950, me.x + 42);
    target.y = me.y;
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "complete") {
    const activePlayers = room.players.filter(player => player.active);
    const everyoneAtExit = activePlayers.length > 0 && activePlayers.every(player => Math.abs(player.x + 17 - EXIT_X) <= 54);
    if (room.phase !== "active" || room.collected !== 15 || !room.gateOpen || !everyoneAtExit) {
      return NextResponse.json({ error: "The trail is not ready to clear", code: "NOT_READY" }, { status: 409 });
    }
    room.phase = "finished";
    room.unlocked = Math.min(15, Math.max(room.unlocked, room.level + 1));
    room.completion = {
      seconds: Math.max(1, Math.floor((Date.now() - (room.startedAt || Date.now())) / 1000)),
      falls: room.falls || 0,
      lights: 4,
      fireflies: room.optionalCollected || 0,
      players: room.players.map(p => p.name),
      newlyUnlocked: room.unlocked,
    };
    recordEvent(room, { type: "trail-cleared", actor: me?.name });
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex), completion: room.completion });
  }

  if (action === "start") {
    if (!me?.isHost) return NextResponse.json({ error: "Only host can start", code: "NOT_HOST" }, { status: 403 });
    const requestedLevel = typeof requestPayload.level === "number" ? requestPayload.level : 0;
    if (!Number.isInteger(requestedLevel) || requestedLevel < 0 || requestedLevel > room.unlocked) return NextResponse.json({ error: "Level locked", code: "LOCKED" }, { status: 400 });
    room.level = requestedLevel;
    room.run = (room.run || 0) + 1;
    room.trailTwist = rollTrailTwist(room.trailTwist);
    room.phase = "active";
    room.startedAt = Date.now();
    room.collected = 0;
    room.optionalCollected = 0;
    room.falls = 0;
    room.gateOpen = false;
    room.relayActive = false;
    room.crate = { ...layout(requestedLevel).trailCrate };
    room.completion = null;
    recordEvent(room, { type: "trail-started", actor: me.name });
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "restart") {
    if (!me?.isHost) return NextResponse.json({ error: "Only host can restart", code: "NOT_HOST" }, { status: 403 });
    room.run = (room.run || 0) + 1;
    room.trailTwist = rollTrailTwist(room.trailTwist);
    room.collected = 0;
    room.optionalCollected = 0;
    room.falls = 0;
    room.gateOpen = false;
    room.relayActive = false;
    room.crate = { ...layout(room.level).trailCrate };
    room.startedAt = Date.now();
    room.completion = null;
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "rename") {
    if (!validName(requestPayload.name)) return NextResponse.json({ error: "Name must be 1–20 characters", code: "INVALID_NAME" }, { status: 400 });
    if (me) me.name = requestPayload.name.trim();
    await saveRoom(room);
    return NextResponse.json({ room: sanitizeRoom(room, sess.playerIndex), ...sanitizeRoom(room, sess.playerIndex) });
  }

  if (action === "leave") {
    if (me?.isHost) {
      const next = room.players.find(p => p !== me && p.active !== false);
      if (next) next.isHost = true;
    }
    const leavingIndex = sess.playerIndex;
    room.players = room.players.filter(p => p !== me);
    sessions.delete(token);
    await getDb().delete(trailSessions).where(eq(trailSessions.token, token));
    for (const [, session] of sessions) {
      if (session.code === room.code && session.playerIndex > leavingIndex) {
        await saveSession({ ...session, playerIndex: session.playerIndex - 1 });
      }
    }
    await saveRoom(room);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action", code: "UNKNOWN_ACTION" }, { status: 400 });
}
