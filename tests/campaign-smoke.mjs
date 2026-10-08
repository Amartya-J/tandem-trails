import assert from 'node:assert/strict';
import { EXIT_X, layout, LEVELS, PLATES, WORLDS } from '../lib/levels.ts';

const base = new URL('/api/trails', process.env.TRAILS_BASE_URL || 'http://127.0.0.1:8787');

async function post(action, session = {}, extra = {}) {
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...session, ...extra }),
  });
  return { status: response.status, data: await response.json() };
}

assert.equal(WORLDS.length, 4);
assert.equal(LEVELS.length, 16);
assert.equal(new Set(LEVELS.map(level => level.name)).size, 16);

const hostResult = await post('create', {}, { name: 'Campaign Host' });
assert.equal(hostResult.status, 200);
const host = hostResult.data;
const guestResult = await post('join', {}, { code: host.code, name: 'Campaign Friend' });
assert.equal(guestResult.status, 200);
const guest = guestResult.data;

for (const level of LEVELS) {
  const started = await post('start', host, { level: level.index });
  assert.equal(started.status, 200, `${level.name} should start: ${JSON.stringify(started.data)}`);
  assert.equal(started.data.level, level.index);

  for (const [shard, target] of layout(level.index).shards.entries()) {
    assert.equal((await post('move', host, { x: target.x - 17, y: target.y - 22 })).status, 200);
    assert.equal((await post('collect', host, { shard })).status, 200, `${level.name} light ${shard} must be collectible`);
  }

  assert.equal((await post('move', host, { x: PLATES[0] - 20, y: 388 })).status, 200);
  assert.equal((await post('move', guest, { x: PLATES[1] - 20, y: 388 })).status, 200);
  assert.equal((await post('move', host, { x: EXIT_X, y: 388 })).status, 200);
  assert.equal((await post('move', guest, { x: EXIT_X, y: 388 })).status, 200);

  const finished = await post('complete', guest);
  assert.equal(finished.status, 200, `${level.name} should finish: ${JSON.stringify(finished.data)}`);
  assert.equal(finished.data.phase, 'finished');
  assert.equal(finished.data.unlocked, Math.min(15, level.index + 1));
  assert.equal(finished.data.collected, 15);
  assert.equal(finished.data.gateOpen, true);
}

console.log('Tandem Trails campaign passed: all 16 original levels across four worlds start, share lights, open two-player gates, finish, and unlock in order.');
