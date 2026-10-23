import assert from 'node:assert/strict';
import { TRAIL_TWISTS } from '../lib/game-types.ts';
const base = new URL('/api/trails',process.env.TRAILS_BASE_URL || 'http://127.0.0.1:8787');
async function post(action, session={}, extra={}) { const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...session,...extra})}); return {status:response.status,data:await response.json()}; }
async function get(session) { const u=new URL(base);u.searchParams.set('code',session.code);const response=await fetch(u,{headers:{'X-Trail-Token':session.token}});return {status:response.status,data:await response.json()}; }
const malformed=await post('move',{code:'BAD',token:'x'},{x:'fast',y:388});assert.equal(malformed.status,400);assert.equal(malformed.data.code,'INVALID_REQUEST');
const host=(await post('create',{}, {name:'Trail Host'})).data;assert.ok(host.code&&host.token);
const attempts=await Promise.all(Array.from({length:6},(_,i)=>post('join',{}, {code:host.code,name:`Friend ${i}`})));
const guests=attempts.filter(r=>r.status===200).map(r=>r.data);assert.equal(guests.length,3,'room must cap at four people');
const nonHostStart=await post('start',guests[0],{level:0});assert.equal(nonHostStart.status,403);assert.equal(nonHostStart.data.code,'NOT_HOST');
assert.equal((await post('move',host,{x:Infinity,y:388})).status,400,'non-finite positions are rejected');
assert.equal((await post('move',host,{x:2001,y:388})).status,400,'out-of-bounds positions are rejected');
const started=await post('start',host,{level:0});assert.equal(started.status,200);assert.equal(started.data.players.length,4);assert.equal(started.data.phase,'active');
assert.ok(started.data.trailTwist in TRAIL_TWISTS,'each run receives a valid shared Trail Twist');
// Reconnect restores the same device session (refresh / temporary network loss).
const reconnected=await post('reconnect',host);assert.equal(reconnected.status,200);assert.equal(reconnected.data.phase,'active');assert.equal(reconnected.data.isHost,true);assert.equal(reconnected.data.players[reconnected.data.meIndex].isHost,true);
assert.equal((await get(host)).status,200,'saved token must keep working after reconnect');
assert.equal((await post('reconnect',{code:host.code,token:crypto.randomUUID()})).status,403,'unknown tokens cannot reclaim a seat');
assert.equal((await get({code:host.code,token:'not-a-real-token'})).status,403);
assert.equal((await post('move',host,{x:640,y:388})).status,200);
const midLevel=await post('reconnect',host);assert.equal(midLevel.status,200);
const me=midLevel.data.players[midLevel.data.meIndex];
assert.equal(me.x,640,'reconnect returns the last saved position');
assert.equal(me.active,true,'reconnecting player is marked active');
assert.ok(Number.isInteger(me.lastSeen),'lastSeen is tracked');
assert.ok(Number.isInteger(midLevel.data.serverTime),'serverTime is included');
assert.equal((await post('join',{}, {code:host.code,name:'Too Late'})).status,409);
assert.equal((await post('collect',host,{shard:0})).status,409);
const shards=[{x:435,y:295},{x:835,y:275},{x:1240,y:265},{x:1580,y:300}];
for(let i=0;i<4;i++){assert.equal((await post('move',host,{x:shards[i].x-17,y:shards[i].y-22})).status,200);assert.equal((await post('collect',host,{shard:i})).status,200);}
let state=(await get(guests[0])).data;assert.equal(state.collected,15,'lights must sync across devices');
assert.equal((await post('complete',host)).status,409,'switches and exit are required');
await post('move',host,{x:1680,y:388});await post('move',guests[0],{x:700,y:388});await post('move',guests[0],{x:1400,y:388});await post('move',guests[0],{x:1780,y:388});
state=(await get(guests[1])).data;assert.equal(state.gateOpen,true,'separate players open the two switches');
assert.equal((await post('move',host,{x:1910,y:388})).status,200);
assert.equal((await post('move',guests[0],{x:1910,y:388})).status,200);
for(const player of guests.slice(1)){for(const x of [700,1400,1910])assert.equal((await post('move',player,{x,y:388})).status,200);}
const done=await post('complete',guests[2]);assert.equal(done.status,200);assert.equal(done.data.phase,'finished');assert.equal(done.data.unlocked,1);
assert.equal(done.data.completion.lights,4);assert.equal(done.data.completion.players.length,4);assert.ok(Number.isInteger(done.data.completion.seconds));
assert.equal((await post('start',host,{level:2})).status,400,'locked levels remain closed');
const next=await post('start',host,{level:1});assert.equal(next.status,200);assert.equal(next.data.level,1);assert.equal(next.data.collected,0);assert.equal(next.data.gateOpen,false);
const run=next.data.run;const previousTwist=next.data.trailTwist;const restarted=await post('restart',host);assert.equal(restarted.data.run,run+1);
assert.ok(restarted.data.trailTwist in TRAIL_TWISTS,'restarted runs receive a valid Trail Twist');
assert.notEqual(restarted.data.trailTwist,previousTwist,'a replay rerolls its Trail Twist');
assert.equal((await post('restart',guests[0])).status,403,'only the host can restart a shared run');
const transfer=(await post('create',{}, {name:'Departing Host'})).data;const successor=(await post('join',{}, {code:transfer.code,name:'Successor'})).data;
assert.equal((await post('leave',transfer)).status,200);assert.equal((await get(successor)).data.isHost,true);

// An away host yields to the next active teammate during lobby or play.
const crown=(await post('create',{}, {name:'Away Host'})).data;
const heir=(await post('join',{}, {code:crown.code,name:'Heir'})).data;
assert.equal((await get(crown)).data.isHost,true);
await new Promise(resolve=>setTimeout(resolve,7000));await get(heir);await new Promise(resolve=>setTimeout(resolve,2000));
const promoted=(await get(heir)).data;
assert.equal(promoted.isHost,true,'active teammate becomes host after the previous host goes away');
assert.equal(promoted.players.find(p=>p.name==='Heir')?.isHost,true);
assert.equal(promoted.players.find(p=>p.name==='Away Host')?.active,false);

// Inactive seats should not block completion for the remaining active crew.
const stuck=(await post('create',{}, {name:'Stuck Host'})).data;
const helper=(await post('join',{}, {code:stuck.code,name:'Helper'})).data;
const idle=(await post('join',{}, {code:stuck.code,name:'Idle'})).data;
assert.equal((await post('start',stuck,{level:0})).status,200);
for(let i=0;i<4;i++){assert.equal((await post('move',stuck,{x:shards[i].x-17,y:shards[i].y-22})).status,200);assert.equal((await post('collect',stuck,{shard:i})).status,200);}
await post('move',stuck,{x:1680,y:388});await post('move',helper,{x:700,y:388});await post('move',helper,{x:1400,y:388});await post('move',helper,{x:1780,y:388});
assert.equal((await get(stuck)).data.gateOpen,true);
await post('move',idle,{x:120,y:388}); // idle player stays far from the portal
for(const player of [stuck,helper])assert.equal((await post('move',player,{x:1910,y:388})).status,200);
// Let the idle seat age past the activity window without another heartbeat.
await new Promise(resolve=>setTimeout(resolve,9500));
await post('move',stuck,{x:1910,y:388});
await post('move',helper,{x:1910,y:388});
const awayState=(await get(stuck)).data;
assert.equal(awayState.players.find(p=>p.name==='Idle')?.active,false,'idle player is marked away');
assert.ok(awayState.players.filter(p=>p.active).length >= 2,'active finishers remain after the idle window');
assert.equal((await post('complete',stuck)).status,200,'away teammates must not block the portal');

console.log('Tandem Trails smoke test passed: payload validation, structured errors, four-player capacity, roles, shared lights, gates, completion results, unlocks, replay, restart, reconnect, activity, and host transfer.');
