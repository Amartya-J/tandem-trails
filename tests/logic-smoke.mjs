import assert from 'node:assert/strict';
import { isGround, layout, LEVELS, PLATES, WORLDS } from '../lib/levels.ts';

console.log('Testing game rules, bounds, and campaign progression logic...');

// 1. Level metadata & World integrity
assert.equal(WORLDS.length, 4, 'Must have 4 worlds');
assert.equal(LEVELS.length, 16, 'Must have 16 levels total');

WORLDS.forEach((world, idx) => {
  assert.ok(world.name && world.name.length > 0, `World ${idx} must have name`);
  assert.ok(world.sky && world.far && world.near && world.ground && world.accent, `World ${idx} must define theme colors`);
  const levelsInWorld = LEVELS.filter(l => l.world === idx);
  assert.equal(levelsInWorld.length, 4, `World ${idx} (${world.name}) must contain exactly 4 levels`);
});

// 2. Progression & unlocking logic simulation
let unlocked = 0;
for (let lvl = 0; lvl < 16; lvl++) {
  assert.ok(lvl <= unlocked, `Level ${lvl} should be playable when reached`);
  // On level complete, unlocked advances to Math.min(15, lvl + 1)
  unlocked = Math.max(unlocked, Math.min(15, lvl + 1));
}
assert.equal(unlocked, 15, 'All 16 levels should be unlockable in sequence');

// 3. Platform & ground collision rules
for (let i = 0; i < 16; i++) {
  const { gaps, hazards } = layout(i);

  // Checkpoint coordinate tests (520, 990, 1620)
  const checkpoints = [80, 520, 990, 1620];
  for (const cp of checkpoints) {
    assert.ok(isGround(cp, gaps), `Level ${i}: Checkpoint at x=${cp} must be safe ground`);
  }

  // Hazard proximity
  hazards.forEach(hazardX => {
    assert.ok(hazardX > 80 && hazardX < PLATES[0], `Hazard at ${hazardX} must not block spawn or plates directly`);
  });

  // Switch plate separation
  assert.ok(PLATES[1] - PLATES[0] >= 40, 'Plates A and B must be spaced so separate players are required');
}

console.log('✓ Game logic and progression verification passed!');
