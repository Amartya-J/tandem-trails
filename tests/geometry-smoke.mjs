import assert from 'node:assert/strict';
import { FLOOR, isGround, layout, LEVELS, PLATES, EXIT_X, WORLD_WIDTH, WORLDS } from '../lib/levels.ts';

console.log('Testing level geometry for all 16 levels across 4 worlds...');

assert.equal(WORLDS.length, 4, 'Should have 4 distinct worlds');
assert.equal(LEVELS.length, 16, 'Should have 16 total levels');

for (let i = 0; i < 16; i++) {
  const { level, gaps, platforms, shards, hazards } = layout(i);
  
  // Basic level properties
  assert.equal(level.index, i, `Level index should be ${i}`);
  assert.ok(level.name && level.name.length > 0, `Level ${i} should have a name`);
  assert.ok(level.briefing && level.briefing.length > 0, `Level ${i} should have a briefing`);
  assert.ok(level.world >= 0 && level.world < 4, `Level ${i} world should be valid`);
  
  // Spawn point validity
  assert.ok(isGround(80, gaps), `Level ${i} (${level.name}): Spawn point x=80 must be on solid ground`);
  
  // Exit and plates validity
  assert.ok(isGround(PLATES[0], gaps), `Level ${i} (${level.name}): Switch plate A must be on solid ground`);
  assert.ok(isGround(PLATES[1], gaps), `Level ${i} (${level.name}): Switch plate B must be on solid ground`);
  assert.ok(isGround(EXIT_X, gaps), `Level ${i} (${level.name}): Exit portal must be on solid ground`);
  assert.ok(PLATES[0] < PLATES[1], 'Switch plate A must be before switch plate B');
  assert.ok(PLATES[1] < EXIT_X, 'Switch plates must be before exit portal');
  assert.ok(EXIT_X < WORLD_WIDTH, 'Exit portal must be within world boundaries');

  // Gaps
  assert.equal(gaps.length, 4, `Level ${i}: Should have 4 gaps`);
  for (const gap of gaps) {
    assert.ok(gap.x > 80 && gap.x + gap.w < PLATES[0], `Gap at ${gap.x} must be between spawn and plates`);
    assert.ok(gap.w > 0 && gap.w < 200, `Gap width ${gap.w} must be reasonable`);
  }

  // Platforms
  assert.ok(platforms.length >= 4, `Level ${i}: Should have at least 4 platforms`);
  for (const platform of platforms) {
    assert.ok(platform.x >= 0 && platform.x + platform.w <= WORLD_WIDTH, `Platform at ${platform.x} must be within world bounds`);
    assert.ok(platform.y >= 100 && platform.y <= FLOOR, `Platform y=${platform.y} must be between 100 and FLOOR`);
    assert.ok(platform.w > 30, `Platform width ${platform.w} must be wide enough to land on`);
  }

  // Shards (Lights)
  assert.equal(shards.length, 4, `Level ${i}: Must contain exactly 4 shards`);
  for (let s = 0; s < shards.length; s++) {
    const shard = shards[s];
    assert.ok(shard.x > 80 && shard.x < EXIT_X, `Shard ${s} at x=${shard.x} must be between spawn and exit`);
    assert.ok(shard.y >= 100 && shard.y <= FLOOR, `Shard ${s} at y=${shard.y} must be within vertical level bounds`);
  }

  // Hazards
  assert.equal(hazards.length, 3, `Level ${i}: Must contain 3 hazards`);
  for (const hazardX of hazards) {
    assert.ok(hazardX > 80 && hazardX < PLATES[0], `Hazard at x=${hazardX} must be between spawn and plates`);
    assert.ok(isGround(hazardX, gaps), `Hazard at x=${hazardX} should be situated on ground`);
  }
}

console.log('✓ All 16 level geometries validated successfully!');
