export const WORLD_WIDTH = 2000;
export const FLOOR = 430;
export const PLATES = [1700, 1800] as const;
export const EXIT_X = 1920;

export const WORLDS = [
  { name: "Hollowwood", short: "HOLLOWWOOD", tagline: "Something old is waking beneath the roots.", sky: "#100f1f", far: "#302a4a", near: "#3b3152", ground: "#14101f", accent: "#ff9b45", hazard: "thorned shadows" },
  { name: "The Last Midway", short: "MIDWAY", tagline: "The rides keep turning after the lights go out.", sky: "#1a1020", far: "#4c2445", near: "#6f2e4c", ground: "#170b19", accent: "#ff6b3d", hazard: "rusted gears" },
  { name: "Drownlight Depths", short: "DROWNLIGHT", tagline: "Do not follow the lights beneath the black water.", sky: "#071827", far: "#163a4b", near: "#1c5963", ground: "#07131d", accent: "#78f1d0", hazard: "grave urchins" },
  { name: "Witchwire Heights", short: "WITCHWIRE", tagline: "A storm is stitching the sky shut.", sky: "#151229", far: "#383052", near: "#54446f", ground: "#0d0b1a", accent: "#d4a0ff", hazard: "watcher orbs" },
] as const;

const NAMES = [
  ["Whispering Roots", "Mothcap Mile", "The Crooked Canopy", "The Blooming Door"],
  ["After-Hours Entry", "Deadman’s Midway", "Carousel of Teeth", "The Great Unmaking"],
  ["Blackwater Run", "The Sunken Lift", "Current of the Lost", "The Pearl Below"],
  ["Bells at Midnight", "Static Steps", "Gale of the Witches", "The Last Signal"],
] as const;

const BRIEFINGS = [
  ["Follow the lanterns before the forest notices you.", "Use the swollen mothcaps to cross the hollow gaps.", "Stay close beneath the branches that bend toward voices.", "Gather every ember before the root-door opens."],
  ["The fairground has been closed for years. The gears disagree.", "Time your jumps while the midway turns itself.", "Do not split up under the dead bulbs.", "Take one last lap before the wheel sees you."],
  ["The water reflects someone who is not in your crew.", "Let the current lift you above the drowned halls.", "Keep a shared rhythm through the undertow.", "Bring all four embers to the pearl below."],
  ["The bells ring even when nobody pulls the rope.", "Use the updraft before the static swallows it.", "Keep moving when the witches' wind arrives.", "Reach the final signal together above the storm."],
] as const;

export const LEVELS = NAMES.flatMap((names, world) => names.map((name, stage) => ({ name, briefing: BRIEFINGS[world][stage], world, stage, index: world * 4 + stage })));
export type Platform = { x: number; y: number; w: number; spring: boolean };
export type Gap = { x: number; w: number };
export type Shard = { x: number; y: number };
export type Collectible = { x: number; y: number; type: string };
export type SyncBridge = { x: number; y: number; w: number };
export type TempoBridge = { x: number; y: number; w: number; period: number; openFor: number };
export type RelaySwitch = { x: number; y: number };
export type TrailCrateStart = { x: number; y: number };

/**
 * A deterministic shared beat. Every client sees the same open window without
 * needing a new network message, while proximity still makes it cooperative.
 */
export function isTempoBridgeActive(bridge: TempoBridge, timeSeconds: number) {
  return ((timeSeconds + bridge.period * 0.17) % bridge.period) < bridge.openFor;
}

export function layout(index: number) {
  const level = LEVELS[Math.max(0, Math.min(15, index))];
  const { world, stage } = level;
  const gaps: Gap[] = [310, 690, 1080, 1450].map((base, i) => ({ x: base + stage * 11 + (world % 2) * 13 + i * 4, w: 76 + stage * 7 + (i % 2) * 8 }));
  const platforms: Platform[] = gaps.map((gap, i) => ({ x: gap.x - 46, y: 350 - (i % 2) * 18, w: gap.w + 92, spring: world === 0 && (i + stage) % 2 === 0 }));
  platforms.push({ x: 785 + stage * 8, y: 327, w: 150, spring: world === 0 && stage > 1 });
  platforms.push({ x: 1190 + stage * 7, y: 314, w: 145, spring: false });
  const shards: Shard[] = [
    { x: 435 + stage * 12, y: 295 - (stage % 2) * 16 },
    { x: 835 + stage * 8, y: 275 },
    { x: 1240 + stage * 7, y: 265 },
    { x: 1580 + stage * 10, y: 300 },
  ];
  const hazards = [560 + stage * 13, 970 + stage * 9, 1360 + stage * 11];

  // Optional Collectibles: One per level, placed in a slightly harder-to-reach spot
  const optional: Collectible[] = [
    { x: 100 + stage * 5, y: 380, type: "firefly" },
    { x: 1800 - stage * 10, y: 280, type: "firefly" },
  ];
  // A high alternate route that only becomes solid while a teammate is within Sync Link range.
  const syncBridge: SyncBridge = { x: 1025 + stage * 7, y: 276 - (world % 2) * 12, w: 142 };
  // A short, rhythmic crossing over the final gap. It is only solid on the beat
  // while the crew remains linked, giving pairs a small coordination challenge.
  const finalGap = gaps[3];
  const tempoBridge: TempoBridge = {
    x: finalGap.x - 16,
    y: 334 - (world % 2) * 8,
    w: finalGap.w + 32,
    period: 2.4,
    openFor: 1.05,
  };
  // One crew member holds this relay while the others cross the Harmony Step.
  const relaySwitch: RelaySwitch = { x: 1610 + stage * 4, y: FLOOR };
  // A shared object can be carried between players; its authoritative state lives in the room.
  const trailCrate: TrailCrateStart = { x: 1040 + stage * 7, y: FLOOR - 22 };

  return { level, gaps, platforms, shards, hazards, optional, syncBridge, tempoBridge, relaySwitch, trailCrate };
}

export interface TutorialCue {
  id: string;
  minX: number;
  maxX: number;
  title: string;
  subtitle: string;
}

export const LEVEL_0_TUTORIAL_CUES: TutorialCue[] = [
  {
    id: "move",
    minX: 0,
    maxX: 280,
    title: "🏃 MOVE TOGETHER",
    subtitle: "Use A / D or ← / → arrows (or touch controls) to move",
  },
  {
    id: "jump",
    minX: 285,
    maxX: 640,
    title: "🦘 LEAP ACROSS GAPS",
    subtitle: "Press SPACE or ↑ to jump over bramble pits & hazards",
  },
  {
    id: "shards",
    minX: 650,
    maxX: 1450,
    title: "✨ SPIRIT LIGHTS",
    subtitle: "Collect all 4 spirit lights to unlock the trailhead gate",
  },
  {
    id: "plates",
    minX: 1600,
    maxX: 1835,
    title: "⚖️ DUAL PRESSURE PLATES",
    subtitle: "Teammates must step on plates A and B together to lower the gate",
  },
  {
    id: "portal",
    minX: 1840,
    maxX: 2000,
    title: "🌀 THE PORTAL",
    subtitle: "All teammates must enter the portal to clear the trail!",
  },
];

export interface LevelMedalThresholds {
  gold: number;
  silver: number;
  bronze: number;
}

export function getMedalThresholds(levelIndex: number): LevelMedalThresholds {
  const world = Math.floor(levelIndex / 4);
  const stage = levelIndex % 4;
  const gold = 20 + world * 5 + stage * 4;
  const silver = gold + 15;
  const bronze = silver + 25;
  return { gold, silver, bronze };
}

export function calculateMedal(levelIndex: number, seconds: number): "gold" | "silver" | "bronze" | "cleared" {
  const thresholds = getMedalThresholds(levelIndex);
  if (seconds <= thresholds.gold) return "gold";
  if (seconds <= thresholds.silver) return "silver";
  if (seconds <= thresholds.bronze) return "bronze";
  return "cleared";
}

export function isGround(x: number, gaps: Gap[]) {
  return !gaps.some(g => x > g.x && x < g.x + g.w);
}
