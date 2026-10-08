export const WORLD_WIDTH = 2000;
export const FLOOR = 430;
export const PLATES = [1700, 1800] as const;
export const EXIT_X = 1920;

export const WORLDS = [
  { name: "Sunleaf Wilds", short: "SUNLEAF", tagline: "A forest that bounces back.", sky: "#b5f5d2", far: "#5bbf89", near: "#207957", ground: "#174a36", accent: "#fff36e", hazard: "thorns" },
  { name: "Brass Carnival", short: "BRASS", tagline: "Keep time with the turning fair.", sky: "#f5bc88", far: "#cd685d", near: "#7d3958", ground: "#402747", accent: "#ffe07a", hazard: "gears" },
  { name: "Tideglass Reefs", short: "TIDEGLASS", tagline: "Ride the gentle current.", sky: "#a9e9ee", far: "#5cbfc6", near: "#297b92", ground: "#17475e", accent: "#ffe18a", hazard: "urchins" },
  { name: "Cloudspire Sky", short: "CLOUDSPIRE", tagline: "Leap into the updraft.", sky: "#b9c9fa", far: "#828de0", near: "#4b5aab", ground: "#263476", accent: "#ffe77a", hazard: "storm orbs" },
] as const;

const NAMES = [
  ["First Flight", "Mushroom Mile", "Canopy Chase", "Bloom Gate"],
  ["Clockwork Entry", "Pinwheel Path", "Midnight Midway", "The Great Wheel"],
  ["Glasswater Run", "Coral Lift", "Current Crossing", "Pearl Passage"],
  ["Above the Bells", "Starfall Steps", "Gale Arcade", "Skyline Finale"],
] as const;

export const LEVELS = NAMES.flatMap((names, world) => names.map((name, stage) => ({ name, world, stage, index: world * 4 + stage })));
export type Platform = { x: number; y: number; w: number; spring: boolean };
export type Gap = { x: number; w: number };
export type Shard = { x: number; y: number };

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
  return { level, gaps, platforms, shards, hazards };
}

export function isGround(x: number, gaps: Gap[]) {
  return !gaps.some(g => x > g.x && x < g.x + g.w);
}
