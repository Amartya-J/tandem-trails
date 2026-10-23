import { integer, real, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("trail_rooms", {
  code: text("code").primaryKey(),
  hostToken: text("host_token").notNull(),
  phase: text("phase").notNull().default("lobby"),
  level: integer("level").notNull().default(0),
  unlocked: integer("unlocked").notNull().default(0),
  run: integer("run").notNull().default(0),
  collected: integer("collected").notNull().default(0),
  gateOpen: integer("gate_open").notNull().default(0),
  startedAt: integer("started_at"),
  falls: integer("falls").notNull().default(0),
  stateJson: text("state_json"),
  createdAt: integer("created_at").notNull(),
});

export const trailSessions = sqliteTable("trail_sessions", {
  token: text("token").primaryKey(),
  roomCode: text("room_code").notNull(),
  playerIndex: integer("player_index").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [index("idx_trail_sessions_room").on(table.roomCode)]);

export const players = sqliteTable("trail_players", {
  token: text("token").primaryKey(),
  roomCode: text("room_code").notNull(),
  name: text("name").notNull(),
  joinedAt: integer("joined_at").notNull(),
  lastSeen: integer("last_seen").notNull().default(0),
  x: real("x").notNull().default(80),
  y: real("y").notNull().default(388),
}, table => [index("idx_trail_players_room").on(table.roomCode)]);

export const siteContent = sqliteTable("site_content", {
  key: text("key").primaryKey(),
  content: text("content").notNull(),
  updatedAt: integer("updated_at").notNull(),
  ownerUserId: text("owner_user_id"),
});
