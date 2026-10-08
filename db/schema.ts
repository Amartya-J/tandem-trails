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
  createdAt: integer("created_at").notNull(),
});

export const players = sqliteTable("trail_players", {
  token: text("token").primaryKey(),
  roomCode: text("room_code").notNull(),
  name: text("name").notNull(),
  joinedAt: integer("joined_at").notNull(),
  x: real("x").notNull().default(80),
  y: real("y").notNull().default(388),
}, table => [index("idx_trail_players_room").on(table.roomCode)]);
