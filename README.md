# Tandem Trails

A cooperative browser platformer for **2–4 players**. Cross four worlds, collect their lights, and open gates together. Friends can join from separate computers or phones with a room code. No account is required.

[Play the hosted edition](https://tandem-trails-coop.amar12356.chatgpt.site/)

> The illustrated redesign is live at the hosted link above. GitHub stores the source; updating the hosted Sites edition requires a separate deployment.

## Play together

1. Enter your name and create a room. Share the invite link or six-character code.
2. A second player joins. The host chooses an unlocked level and starts.
3. Collect all four lights, then put two players on switches **A** and **B** at the same time.
4. Bring everyone through the exit portal. The host can advance to the next level.

Falls and hazards return you to a checkpoint. The room shares collectibles, gate state and campaign progress. Players control their own movement. Refreshing the page or briefly losing connectivity restores your seat from the saved device session and picks up your last position. Teammates who go idle are marked Away after a few seconds so they cannot hold switches or block the portal for everyone else. If the host goes Away, the earliest-joined active teammate becomes the new host (the same rule used when a host leaves the lobby). Abandoned rooms with no heartbeat for two hours are removed; rejoining then returns a clear expired-room error. The header shows connection state and warns when round-trip updates exceed about 700 ms.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Left / Right or A / D | Arrow buttons |
| Jump | Space, Up or W | JUMP |

An optional connected gamepad uses the left stick and A/Cross (or the south face button) for movement and jumping. Keyboard and touch controls remain available when the Gamepad API is unsupported.

Landscape gives more room to see the next jump on a phone.

## Four worlds, sixteen levels

| World | Levels | Movement |
| --- | --- | --- |
| Sunleaf Wilds | First Flight · Mushroom Mile · Canopy Chase · Bloom Gate | Spring platforms |
| Brass Carnival | Clockwork Entry · Pinwheel Path · Midnight Midway · The Great Wheel | Conveyor section |
| Tideglass Reefs | Glasswater Run · Coral Lift · Current Crossing · Pearl Passage | Low-gravity current |
| Cloudspire Sky | Above the Bells · Starfall Steps · Gale Arcade · Skyline Finale | Updraft section |

Each stage changes the gaps, platforms, hazards and light positions. Canvas artwork gives the worlds separate palettes, with layered scenery and small woodland explorers.

## Run locally

### Prerequisites
- **Node.js 22.13 or newer** (required for modern Node runtime and native TypeScript stripping in test scripts)
- **npm 10+**

The app requires a local Cloudflare Worker and D1 SQLite database instance; opening a static HTML file will not run it.

### Step-by-step setup

1. **Clone and install dependencies:**
   ```sh
   git clone https://github.com/Amartya-J/tandem-trails.git
   cd tandem-trails
   npm run install:ci
   ```

2. **Build client and server bundles:**
   ```sh
   npm run build
   ```

3. **Initialize local D1 database schema:**
   ```sh
   npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flimsy_sunspot.sql
   # Existing local databases created before activity tracking also need:
   # npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_add_last_seen.sql
   # Existing databases also need completion stats:
   # npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_add_completion_stats.sql
   ```

4. **Start the local server:**
   ```sh
   npm start
   ```

5. **Open and test:**
   Open **http://127.0.0.1:8787** across two separate browser windows/tabs or browser profiles to test real-time room creation, invite codes, readiness toggles, and cooperative multiplayer.

### Development commands

- `npm run dev` – Starts the framework development server with hot-reloading.
- `npm run build` – Compiles the client bundle and Vite/Cloudflare worker runtime into `dist/`.
- `npm start` – Serves the compiled worker locally on port 8787 with persistence to `.wrangler/state`.
- `npm run db:generate` – Generates new migration SQL files with Drizzle Kit when modifying schema in `db/schema.ts`.
- `npm run lint` – Runs ESLint across the codebase.

## Verify changes

Run the unified test suite, linter, and build pipeline:

```sh
npm test
npm run lint
npm run build
```

The unified `npm test` runs all verification suites:
1. `npm run test:geometry` – Validates stage geometry, bounding boxes, plate reachability, and platform positioning across all 16 levels.
2. `npm run test:logic` – Checks progression rules, hazard clearance, world thematic mechanics, and safety margins.
3. `npm run test:smoke` – Tests live multiplayer room creation, 4-player capacity, shared light pickups, gate switches, completion, unlocks, and host migrations.
4. `npm run test:campaign` – Traverses all 16 levels end-to-end through the live room API.

### Custom test configuration
To run API smoke and campaign tests against an alternative local port or remote server, pass `TRAILS_BASE_URL`:

```sh
TRAILS_BASE_URL=http://localhost:5173 npm run test:smoke
TRAILS_BASE_URL=https://tandem-trails-coop.amar12356.chatgpt.site npm run test:campaign
```

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Canvas renderer, world transitions, player movement physics, audio triggers, room UI, and network polling |
| `app/globals.css` | Game styling, responsive layouts, HUD indicators, and accessibility focus styles |
| `app/api/trails/` | Multiplayer room API routes (room creation, joins, state updates, heartbeats, transitions) |
| `lib/levels.ts` | World palettes, level configurations, platform geometry, hazard layouts, and light placements |
| `lib/audio.ts` | Procedural Web Audio API sound synthesizer (world music, jumps, lands, switches, pickups, victory fanfares) |
| `db/schema.ts` | Drizzle ORM schema for room entities and multiplayer state in Cloudflare D1 |
| `drizzle/` | D1 SQLite schema migrations (`0000` creates tables; `0001` adds `last_seen`; `0002` adds completion stats) |
| `tests/geometry-smoke.mjs` | Level geometry, bounds, and plate reachability automated test suite |
| `tests/logic-smoke.mjs` | Campaign logic, checkpoint safety, and world mechanics automated test suite |
| `tests/room-smoke.mjs` | Real-time multiplayer API and room lifecycle automated test suite |
| `tests/campaign-smoke.mjs` | 16-level campaign end-to-end traversal test suite |
| `scripts/` | Local server configuration and build scripts |
| `.openai/hosting.json` | Sites hosting configuration |

React handles the room interface. The browser draws and moves the local player, sends position updates, and polls the room API for other players. The Worker stores room state in D1. A device token identifies a player without a login.

The repository uses the Vinext build runner with Cloudflare support. Use the checked-in scripts so the build and runtime agree. Multiplayer depends on network latency; this is a cooperative game, not a competitive server-authoritative simulation.

## Accessibility and gameplay limits

The room flow, controls, connection state, crew roster, objectives, errors, and completion results are provided as regular, keyboard-navigable HTML. Important gameplay events are also exposed through live status announcements. The canvas has a descriptive label with keyboard instructions, and touch controls expose labeled buttons with safe-area support.

The shell is optionally installable through the web app manifest. The service worker caches only static presentation assets; room creation, multiplayer state, and gameplay remain network-dependent and are not available offline. Hidden tabs pause the animation and movement loop until they return to the foreground.

Performance targets are tracked at the 75th percentile: mobile load under 3 seconds, interaction response under 200 ms, cumulative layout shift under 0.1, and gameplay frames under 24 ms where device hardware permits. The renderer caps device pixel ratio at 1.5 and logs slow frames only for local diagnostics; no player identity or gameplay trace is collected.

Room tokens are bearer credentials stored in the device session and sent in headers for polling; they are not included in invite URLs. Leaving a room deletes the seat, expired rooms are purged, and invalid saved sessions are cleared locally.

The platformer itself remains canvas-based: player movement, platform collision, hazards, collectible locations, switches, and the portal are visual interactions that do not currently have an equivalent text or non-visual control model. Players who cannot use the canvas can still create or join rooms, read the objective and shared progress, use the accessible touch/keyboard controls where applicable, and follow status updates, but a fully non-visual campaign path is not yet provided. This is an intentional limitation rather than an assertion that canvas gameplay is fully accessible.

## Deployment

The existing public game runs on ChatGPT Sites. Build output and D1 bindings must travel together when deploying. A static-file host cannot run the room API. Pushing to `main` stores your changes but does not, by itself, publish a new Sites version.

All characters and levels are original. The game has keyboard and touch input. Screen-reader gameplay alternatives beyond the documented status layer remain future work.
