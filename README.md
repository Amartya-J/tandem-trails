# Tandem Trails

**Tandem Trails** is an original cooperative browser platformer for 2–4 people on separate phones or laptops. Create a room, share the six-character code or invite link, and travel through 16 levels in four worlds. No accounts or installs are required.

**Play:** https://tandem-trails-coop.amar12356.chatgpt.site/

## How to play

1. One person creates a room. Another person joins using the link or room code. The host starts a level once at least two players are present.
2. Run with **← / →** or **A / D**, and jump with **↑**, **W**, or **Space**. Phones have on-screen buttons.
3. Collect all four glowing lights. Two different players must stand on switches **A** and **B** at the same time to open the gate.
4. Everyone reaches the portal to finish. The host can then pick any unlocked level. If you fall or touch a hazard, you respawn at your most recent checkpoint.

The room shares player positions, lights, gate state, and level progress across devices. You can play from different places. A room supports up to four players.

## The campaign

| World | Levels | Distinct feel |
| --- | --- | --- |
| Sunleaf Wilds | First Flight · Mushroom Mile · Canopy Chase · Bloom Gate | Spring platforms and living forest scenery |
| Brass Carnival | Clockwork Entry · Pinwheel Path · Midnight Midway · The Great Wheel | Moving conveyor section and mechanical fairground |
| Tideglass Reefs | Glasswater Run · Coral Lift · Current Crossing · Pearl Passage | Gentle low-gravity current and underwater scenery |
| Cloudspire Sky | Above the Bells · Starfall Steps · Gale Arcade · Skyline Finale | Updraft section and floating skyline |

Each level changes the gaps, platforms, hazards, and light positions. The worlds have their own color palettes, backgrounds, and movement effects. This is an original game inspired by the energy and teamwork of side-scrolling platform adventures; it uses no Rayman characters, levels, or assets.

## Build and run locally

Node.js 22.13+ is required.

```sh
npm ci
npm run db:generate
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flimsy_sunspot.sql
npm start
```

Open `http://127.0.0.1:8787`. For a two-device local test, both devices must be able to reach the same host; the public URL above is simpler.

## Verification

```sh
npx tsc --noEmit
npm run lint
npm run build
node tests/room-smoke.mjs
node --experimental-strip-types tests/campaign-smoke.mjs
```

The smoke tests expect a running local server. They verify room capacity, host permissions, synchronized collectibles, two-player switches, completion, unlocks, restarts, host transfer, and progression through all 16 levels.

## How it works

The game uses React and Canvas for smooth local movement and touch controls. A Cloudflare Worker API stores room and player state in D1. Clients poll for shared state and send position updates, so players can join from different networks and see each other in the same room. Room codes are generated server-side, and a device-specific token identifies each player without a login.

The game is hosted with ChatGPT Sites. Site configuration lives in `.openai/hosting.json`; schema migrations live in `drizzle/`. The original source is on this repository's `main` branch.
