export const WORLD_WIDTH = 2000;
export const FLOOR = 430;
export const PLATES = [1700, 1800] as const;
export const EXIT_X = 1920;

export const WORLDS = [
  { name: "Sunleaf Wilds", short: "SUNLEAF", tagline: "A forest that bounces back.", sky: "#153b42", far: "#40776d", near: "#34836b", ground: "#102f30", accent: "#fff36e", hazard: "thorns" },
  { name: "Brass Carnival", short: "BRASS", tagline: "Keep time with the turning fair.", sky: "#342640", far: "#976775", near: "#aa6b76", ground: "#211e35", accent: "#ffe07a", hazard: "gears" },
  { name: "Tideglass Reefs", short: "TIDEGLASS", tagline: "Ride the gentle current.", sky: "#133c58", far: "#4188a0", near: "#328e9a", ground: "#112d40", accent: "#ffe18a", hazard: "urchins" },
  { name: "Cloudspire Sky", short: "CLOUDSPIRE", tagline: "Leap into the updraft.", sky: "#272e58", far: "#767cae", near: "#777db3", ground: "#1c2545", accent: "#ffe77a", hazard: "storm orbs" },
] as const;

const NAMES = [
  ["First Flight", "Mushroom Mile", "Canopy Chase", "Bloom Gate"],
  ["Clockwork Entry", "Pinwheel Path", "Midnight Midway", "The Great Wheel"],
  ["Glasswater Run", "Coral Lift", "Current Crossing", "Pearl Passage"],
  ["Above the Bells", "Starfall Steps", "Gale Arcade", "Skyline Finale"],
] as const;

const BRIEFINGS = [
  ["Follow the first lights through the treetops.", "Use the springy mushrooms to cross the wide gaps.", "Keep the crew together beneath the high canopy.", "Gather every light before the forest gate opens."],
  ["The fairground starts gently. Watch for the gears.", "Time your jumps as the midway turns around you.", "Stay close to your crew through the late-night lights.", "Take one last lap before the great wheel."],
  ["The reef glows below. Follow the lights across the water.", "Let the current carry you up to the next platform.", "Find a rhythm together through the crossing.", "Bring all four lights to the pearl passage."],
  ["The sky path begins above the bells.", "Use the updraft to climb toward the stars.", "Keep moving when the wind picks up.", "Reach the final portal together above the clouds."],
] as const;

export const LEVELS = NAMES.flatMap((names, world) => names.map((name, stage) => ({ name, briefing: BRIEFINGS[world][stage], world, stage, index: world * 4 + stage })));
export type Platform = { x: number; y: number; w: number; spring: boolean };
export type Gap = { x: number; w: number };
export type Shard = { x: number; y: number };
export type Collectible = { x: number; y: number; type: string };
export type SyncBridge = { x: number; y: number; w: number };
export type TempoBridge = { x: number; y: number; w: number; period: number; openFor: number };

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

  return { level, gaps, platforms, shards, hazards, optional, syncBridge, tempoBridge };
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
