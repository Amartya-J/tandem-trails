import assert from 'node:assert/strict';
const base = new URL('/api/trails',process.env.TRAILS_BASE_URL || 'http://127.0.0.1:8787');
async function post(action, session={}, extra={}) { const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...session,...extra})}); return {status:response.status,data:await response.json()}; }
async function get(session) { const u=new URL(base);u.searchParams.set('code',session.code);const response=await fetch(u,{headers:{'X-Trail-Token':session.token}});return {status:response.status,data:await response.json()}; }
const host=(await post('create',{}, {name:'Trail Host'})).data;assert.ok(host.code&&host.token);
const attempts=await Promise.all(Array.from({length:6},(_,i)=>post('join',{}, {code:host.code,name:`Friend ${i}`})));
const guests=attempts.filter(r=>r.status===200).map(r=>r.data);assert.equal(guests.length,3,'room must cap at four people');
assert.equal((await post('start',guests[0],{level:0})).status,403);
const started=await post('start',host,{level:0});assert.equal(started.status,200);assert.equal(started.data.players.length,4);assert.equal(started.data.phase,'active');
assert.equal((await post('join',{}, {code:host.code,name:'Too Late'})).status,409);
assert.equal((await post('collect',host,{shard:0})).status,409);
const shards=[{x:435,y:295},{x:835,y:275},{x:1240,y:265},{x:1580,y:300}];
for(let i=0;i<4;i++){assert.equal((await post('move',host,{x:shards[i].x-17,y:shards[i].y-22})).status,200);assert.equal((await post('collect',host,{shard:i})).status,200);}
let state=(await get(guests[0])).data;assert.equal(state.collected,15,'lights must sync across devices');
assert.equal((await post('complete',host)).status,409,'switches and exit are required');
await post('move',host,{x:1680,y:388});await post('move',guests[0],{x:1780,y:388});
state=(await get(guests[1])).data;assert.equal(state.gateOpen,true,'separate players open the two switches');
for(const player of [host,...guests])assert.equal((await post('move',player,{x:1910,y:388})).status,200);
const done=await post('complete',guests[2]);assert.equal(done.status,200);assert.equal(done.data.phase,'finished');assert.equal(done.data.unlocked,1);
assert.equal((await post('start',host,{level:2})).status,400,'locked levels remain closed');
const next=await post('start',host,{level:1});assert.equal(next.status,200);assert.equal(next.data.level,1);assert.equal(next.data.collected,0);assert.equal(next.data.gateOpen,false);
const run=next.data.run;const restarted=await post('restart',host);assert.equal(restarted.data.run,run+1);
const transfer=(await post('create',{}, {name:'Departing Host'})).data;const successor=(await post('join',{}, {code:transfer.code,name:'Successor'})).data;
assert.equal((await post('leave',transfer)).status,200);assert.equal((await get(successor)).data.isHost,true);
console.log('Tandem Trails smoke test passed: four-player capacity, roles, shared lights, gates, completion, unlocks, replay, restart, and host transfer.');
