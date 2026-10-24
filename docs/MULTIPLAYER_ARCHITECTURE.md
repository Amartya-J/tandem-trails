# Multiplayer Architecture Decision

## Current transport

Tandem Trails uses client-predicted movement plus an authoritative Cloudflare Worker room state. Clients send movement at a bounded cadence and poll room state every 220 ms. The worker validates room actions, collectible proximity, gate state, completion, permissions, and activity before persisting the room to D1.

## Measurement

The client now measures real request round-trip time with `performance.now()` around every poll and shows the current value in the connection indicator. This replaces the previous simulated latency response. The game warns visually when a measured poll exceeds 700 ms.

## Decision: retain polling for this release

Polling is intentionally retained for the current 2–4 player cooperative game:

- Local movement is predicted, so a slow poll does not make the controlled explorer feel delayed.
- The Worker remains authoritative for shared state.
- Polling keeps reconnect and persistence simple on the existing Sites/Worker deployment.
- A WebSocket or Durable Object migration would add operational surface area without changing the cooperative core enough to justify release risk today.

## Event prototype and resynchronization

Every successful poll returns the full server-authoritative room snapshot, including a `stateVersion`, `serverTime`, player activity, shared collectibles, gate state, run number, Trail Twist, and a compact authoritative event history. The Worker records crew joins, trail starts, new light pickups, and clears; this is the event-model prototype for a future push transport. A resumed session therefore performs a full state resynchronization before it continues rendering. Mutating actions also return the same authoritative snapshot, so the client never treats its own local action as canonical. Clients reject an incompatible state version rather than trying to interpret it incorrectly.

## Load test

`npm run test:load` drives four player sessions through repeated polls and legal movement updates, checking that room membership and snapshots remain valid under concurrent request pressure. Run it against a local server by default or set `TRAILS_BASE_URL` for a dedicated test target.

## Upgrade trigger

Revisit a real-time event transport if measured production p95 polling latency stays above 700 ms, rooms grow beyond four players, or new mechanics require sub-100 ms shared timing. A future event channel should preserve the existing full-snapshot resync path as its recovery mechanism.
