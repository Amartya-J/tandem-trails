# Tandem Trails

A cooperative browser platformer for **2–4 players**. Cross four worlds, collect their lights, and open gates together. Friends can join from separate computers or phones with a room code. No account is required.

[Play the hosted edition](https://tandem-trails-coop.amar12356.chatgpt.site/)

> The illustrated redesign is live at the hosted link above. GitHub stores the source; updating the hosted Sites edition requires a separate deployment.

## Play together

1. Enter your name and create a room. Share the invite link or six-character code.
2. A second player joins. The host chooses an unlocked level and starts.
3. Collect all four lights, then put two players on switches **A** and **B** at the same time.
4. Bring everyone through the exit portal. The host can advance to the next level.

Falls and hazards return you to a checkpoint. The room shares collectibles, gate state and campaign progress. Players control their own movement.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Left / Right or A / D | Arrow buttons |
| Jump | Space, Up or W | JUMP |

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

Use **Node.js 22.13 or newer**. The app needs a local Cloudflare Worker and D1 database; opening an HTML file will not run it.

```sh
git clone https://github.com/Amartya-J/tandem-trails.git
cd tandem-trails
npm run install:ci
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flimsy_sunspot.sql
npm start
```

Open **http://127.0.0.1:8787** in two browser profiles to test room creation and joining. The server binds to the local machine. Use the hosted edition to play from separate networks.

For development, `npm run dev` starts the framework's development server. Run `npm run db:generate` when changing the database schema; committed migrations support the setup above.

## Verify changes

```sh
npx tsc --noEmit
npm run lint
npm run build
```

With the local server and database running:

```sh
npm run test:smoke
npm run test:campaign
```

The API tests create test rooms. They cover room capacity, host permissions, shared lights, paired switches, completion, unlocks, restarts and host transfer. The campaign test traverses all sixteen levels. Point `TRAILS_BASE_URL` at another test server when needed.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Canvas renderer, player movement, room UI and network client |
| `app/globals.css` | Layout, controls and responsive styles |
| `app/api/trails/` | Room operations and multiplayer state |
| `lib/levels.ts` | World palettes, stage layouts and geometry |
| `drizzle/` | D1 schema migrations |
| `scripts/` | Local setup, framework runner and build support |
| `tests/` | Multiplayer and campaign smoke tests |
| `.openai/hosting.json` | Sites hosting configuration |

React handles the room interface. The browser draws and moves the local player, sends position updates, and polls the room API for other players. The Worker stores room state in D1. A device token identifies a player without a login.

The repository uses the Vinext build runner with Cloudflare support. Use the checked-in scripts so the build and runtime agree. Multiplayer depends on network latency; this is a cooperative game, not a competitive server-authoritative simulation.

## Deployment

The existing public game runs on ChatGPT Sites. Build output and D1 bindings must travel together when deploying. A static-file host cannot run the room API. Pushing to `main` stores your changes but does not, by itself, publish a new Sites version.

All characters and levels are original. The game has keyboard and touch input. Screen-reader gameplay and broader device testing remain future work.
