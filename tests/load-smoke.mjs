import assert from "node:assert/strict";

const base = new URL("/api/trails", process.env.TRAILS_BASE_URL || "http://127.0.0.1:8787");

async function post(type, session = {}, payload = {}) {
  const response = await fetch(base, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, session, payload }),
  });
  return { status: response.status, data: await response.json() };
}

const host = (await post("create", {}, { name: "Load Host", avatar: 0 })).data.session;
assert.ok(host, "host session should be created");
const room = (await post("poll", host)).data.room;
const players = [host];
for (let index = 1; index < 4; index++) {
  const joined = await post("join", {}, { code: room.code, name: `Load ${index}`, avatar: index });
  assert.equal(joined.status, 200, "all four seats should be available");
  players.push(joined.data.session);
}

const started = await post("start", host, { level: 0 });
assert.equal(started.status, 200, "load room should start");

const requests = [];
for (let round = 0; round < 30; round++) {
  for (const [index, player] of players.entries()) {
    requests.push(post("move", player, { x: 100 + ((round * 31 + index * 47) % 620), y: 388 }));
    requests.push(post("poll", player));
  }
}
const results = await Promise.all(requests);
assert.ok(results.every(result => result.status === 200), "all concurrent room operations should succeed");
const final = await post("poll", host);
assert.equal(final.status, 200);
assert.equal(final.data.room.players.length, 4);
assert.equal(final.data.room.phase, "active");

console.log(`Tandem Trails load smoke passed: ${results.length} concurrent operations across four players.`);
