export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 42;
export const SPAWN = { x: 80, y: 388 } as const;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const NETWORK_POLL_MS = 220;
export const POSITION_SEND_MS = 150;

export type Player = {
  name: string;
  x: number;
  y: number;
  color: number;
  isHost: boolean;
  lastSeen?: number;
  active?: boolean;
};

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
  collected: number;
  optionalCollected: number;
  gateOpen: boolean;
  isHost: boolean;
  meIndex: number;
  playerCount: number;
  players: Player[];
  completion: Completion | null;
};
