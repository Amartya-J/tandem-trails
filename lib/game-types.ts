export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 42;
export const SPAWN = { x: 80, y: 388 } as const;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const NETWORK_POLL_MS = 220;
export const POSITION_SEND_MS = 150;

export const TRAIL_TWISTS = {
  "moon-hop": { label: "MOON HOP", icon: "☾", description: "Low gravity turns every leap into a long, floaty arc." },
  "crosswind": { label: "CROSSWIND", icon: "≋", description: "A playful gust bends airborne jumps back and forth." },
  "quickstep": { label: "QUICKSTEP", icon: "✦", description: "The whole crew gets a little extra trail speed." },
} as const;

export type TrailTwistId = keyof typeof TRAIL_TWISTS;

export type Session = {
  code: string;
  token: string;
};

export type Player = {
  name: string;
  x: number;
  y: number;
  color: number;
  isHost: boolean;
  lastSeen?: number;
  active?: boolean;
};

export type PlayerState = Player;

export type Completion = {
  seconds: number;
  falls: number;
  lights: number;
  fireflies: number;
  players: string[];
  newlyUnlocked: number;
};

export type Room = {
  code: string;
  phase: "lobby" | "active" | "finished";
  level: number;
  unlocked: number;
  run: number;
  trailTwist: TrailTwistId;
  collected: number;
  optionalCollected: number;
  gateOpen: boolean;
  isHost: boolean;
  meIndex: number;
  playerCount: number;
  players: Player[];
  completion: Completion | null;
};

export type RoomState = Room;
