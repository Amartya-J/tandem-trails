export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 42;
export const SPAWN = { x: 80, y: 388 } as const;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const NETWORK_POLL_MS = 220;
export const POSITION_SEND_MS = 150;
export const ROOM_STATE_VERSION = 1;

export const TRAIL_TWISTS = {
  "moon-hop": { label: "WITCH MOON", icon: "☾", description: "The moon loosens gravity and stretches every leap into a haunted arc." },
  "crosswind": { label: "COLD DRAFT", icon: "≋", description: "An unseen draft bends airborne jumps back and forth." },
  "quickstep": { label: "PANIC STEP", icon: "✦", description: "The whole crew runs faster when something is close behind." },
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
  /** Selected explorer appearance. Stored in room state so every device agrees. */
  avatar?: number;
  isHost: boolean;
  lastSeen?: number;
  active?: boolean;
  downedUntil?: number;
};

export type TrailCrate = { x: number; y: number; carrier?: number };

export type PlayerState = Player;

export type Completion = {
  seconds: number;
  falls: number;
  lights: number;
  fireflies: number;
  players: string[];
  newlyUnlocked: number;
};

export type RoomEvent = {
  type: "crew-joined" | "trail-started" | "light-collected" | "gate-opened" | "trail-cleared";
  actor?: string;
  at: number;
};

export type Room = {
  stateVersion: number;
  code: string;
  phase: "lobby" | "active" | "finished";
  level: number;
  unlocked: number;
  run: number;
  trailTwist: TrailTwistId;
  collected: number;
  optionalCollected: number;
  gateOpen: boolean;
  relayActive: boolean;
  crate: TrailCrate;
  isHost: boolean;
  meIndex: number;
  playerCount: number;
  players: Player[];
  completion: Completion | null;
  events: RoomEvent[];
};

export type RoomState = Room;
