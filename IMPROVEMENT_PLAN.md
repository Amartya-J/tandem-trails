# Tandem Trails Improvement Plan

This plan turns the current improvement ideas into a sequence of small, reviewable work items. Each item should be completed and tested before moving to the next one.

## Project goals

- Make the existing game easier to understand.
- Make movement and multiplayer feel smoother.
- Make the game more reliable on phones and unstable networks.
- Improve accessibility without removing the canvas-based presentation.
- Add replay value after the core experience is polished.
- Keep changes small enough to test and deploy safely.

## Priority guide

- **P0 — Foundation:** Fixes that improve usability, reliability, or correctness for nearly every player.
- **P1 — Polish:** Changes that make the existing game feel more complete and responsive.
- **P2 — Expansion:** New content and replay features after the core experience is stable.

---

## Phase 1: Lobby and onboarding

**Goal:** Make it immediately obvious how to start or join a game.

- [x] **1.1 Improve the title screen** — Clarify the primary “Create Room” action, separate the “Join Room” flow, and explain the cooperative objective in one sentence.
- [x] **1.2 Improve lobby status** — Show `players/4`, host status, player names, and whether the room can start.
- [x] **1.3 Add room-sharing actions** — Add copy-room-code, copy-invite-link, and native mobile sharing where available.
- [x] **1.4 Add lobby readiness** — Let each player mark themselves ready and explain why the host cannot start.
- [x] **1.5 Improve lobby errors** — Use clear messages for invalid names, missing players, full rooms, expired rooms, and host-only actions.
- [x] **1.6 Add safe lobby actions** — Add confirmation for leaving, changing the player name, and returning to the lobby.

**Done when:** A new player can create or join a room, understand what to do next, share the room from a phone, and see why the game is or is not ready to start.

## Phase 2: Gameplay clarity

**Goal:** Make objectives and multiplayer state understandable while playing.

- [x] **2.1 Add a persistent objective HUD** — Show world, level, lights collected, gate state, and exit status.
- [x] **2.2 Improve switch and portal visibility** — Add stronger visual states, labels, effects, and clear inactive/active feedback.
- [x] **2.3 Add gameplay notifications** — Announce joins, leaves, falls, collected lights, switch activation, gate opening, and completion.
- [x] **2.4 Add off-screen player indicators** — Point toward teammates who are outside the camera view.
- [x] **2.5 Improve level introductions** — Briefly explain each level’s special mechanic before play begins.
- [x] **2.6 Add loading and request states** — Disable duplicate actions and show progress while creating, joining, starting, restarting, or completing.

**Done when:** Players always know the current objective, what teammates are doing, and what is preventing completion.

## Phase 3: Movement and camera polish

**Goal:** Make controls feel responsive and consistent across keyboard and touch.

- [x] **3.1 Tune movement** — Improve acceleration, deceleration, jump height, and air control without changing the intended level difficulty.
- [x] **3.2 Add jump buffering** — Accept a jump pressed shortly before landing.
- [x] **3.3 Add coyote time** — Allow a jump shortly after leaving a platform.
- [x] **3.4 Polish touch controls** — Add pressed states, prevent accidental page gestures, support safe-area insets, and test landscape layouts.
- [x] **3.5 Add touch preferences** — Support left-handed layouts and configurable control placement.
- [x] **3.6 Smooth camera movement** — Use eased camera tracking and keep the local player readable during fast movement.
- [x] **3.7 Improve remote-player rendering** — Interpolate remote positions to reduce visible snapping.

**Done when:** Keyboard and touch players can complete representative levels comfortably, and remote players move smoothly on a normal connection.

## Phase 4: Multiplayer reliability

**Goal:** Make rooms resilient to refreshes, temporary network loss, and abandoned sessions.

- [x] **4.1 Add connection state** — Show connected, reconnecting, and disconnected states in the lobby and game.
- [x] **4.2 Add reconnect support** — Restore a player after refresh or temporary network loss using their existing session.
- [x] **4.3 Track player activity** — Store a last-seen timestamp and identify inactive players.
- [x] **4.4 Handle inactive players safely** — Prevent disconnected players from blocking switches, the exit, or level completion.
- [x] **4.5 Improve host transfer** — Handle host departure during lobby and active play with a clear replacement rule.
- [x] **4.6 Add room expiration** — Remove abandoned rooms after a defined period and return a clear expired-room error.
- [x] **4.7 Add latency feedback** — Show a lightweight warning when updates are delayed.

**Done when:** Refreshing or briefly losing connectivity does not unnecessarily destroy a player’s session or strand the group.

## Phase 5: Audio and presentation

**Goal:** Give important actions satisfying feedback and make each world feel distinct.

- [x] **5.1 Add sound effects** — Cover jumping, landing, collecting, falling, switches, gates, joins, and completion.
- [x] **5.2 Add world music** — Give each of the four worlds a distinct musical identity.
- [x] **5.3 Add audio settings** — Provide mute and separate music/effects volume controls.
- [x] **5.4 Add world transitions** — Introduce each world and transition clearly between worlds.
- [x] **5.5 Add completion results** — Show completion time, falls, collected lights, participating players, and newly unlocked content.

**Done when:** The game communicates important events through both visuals and audio, with usable mute controls.

## Phase 6: Accessibility

**Goal:** Make the lobby, status, and game feedback usable by more players.

- [x] **6.1 Add an accessible status layer** — Expose level, objective, lights, gate state, player list, connection state, and errors in HTML alongside the canvas.
- [x] **6.2 Add screen-reader announcements** — Announce level starts, objectives, collections, falls, unlocks, errors, and completion.
- [x] **6.3 Audit keyboard navigation** — Verify focus order, labels, visible focus, modal behavior, and keyboard-only lobby use.
- [x] **6.4 Add display settings** — Support reduced motion, high contrast, larger text, and stronger focus indicators.
- [x] **6.5 Reduce color dependence** — Give players numbers, icons, or patterns in addition to colors.
- [x] **6.6 Document gameplay limitations** — Clearly describe which portions of canvas gameplay are and are not accessible.

**Done when:** All non-gameplay controls and game status are keyboard and screen-reader understandable, with clear alternatives where canvas interaction is limited.

## Phase 7: Backend correctness and abuse resistance

**Goal:** Make multiplayer state safer and easier to maintain.

- [x] **7.1 Add shared request schemas** — Validate action payloads, room codes, names, coordinates, tokens, and level IDs consistently.
- [x] **7.2 Add structured API errors** — Return stable codes such as `ROOM_FULL`, `NOT_HOST`, `LEVEL_LOCKED`, and `PLAYER_DISCONNECTED`.
- [x] **7.3 Harden movement validation** — Reject impossible coordinates and unreasonable movement changes where practical.
- [x] **7.4 Harden collection and completion** — Validate current level, collection state, switch state, player positions, and repeated requests server-side.
- [x] **7.5 Add rate limiting** — Protect room creation, joining, movement, collection, and completion endpoints.
- [x] **7.6 Review token lifecycle** — Invalidate tokens when appropriate and avoid retaining unnecessary session data.
- [x] **7.7 Add database cleanup** — Expire inactive players and rooms without affecting active sessions.

**Done when:** Malformed, repeated, stale, and suspicious requests fail safely with useful client-facing errors.

## Phase 8: Testing and maintainability

**Goal:** Make improvements safer to build and easier to continue.

- [x] **8.1 Add level geometry tests** — Validate platforms, gaps, hazards, lights, switches, exits, and spawn points for all 16 levels.
- [x] **8.2 Add API edge-case tests** — Cover malformed requests, duplicate joins, stale tokens, concurrent joins, repeated collection, repeated completion, reconnects, and host transfer.
- [ ] **8.3 Add browser tests** — Test the real lobby, keyboard controls, touch controls, responsive layouts, and two-browser multiplayer flow.
- [x] **8.4 Add CI checks** — Run TypeScript, lint, build, smoke tests, and campaign tests on pull requests. Browser automation remains a separate follow-up until a browser runner is selected.
- [ ] **8.5 Split `app/page.tsx`** — Separate lobby UI, gameplay UI, canvas rendering, physics, input, networking, and shared state.
- [x] **8.6 Create shared game types and constants** — Centralize player dimensions, spawn positions, network intervals, and room state types.
- [x] **8.7 Add performance checks** — Monitor frame time in development and cap rendering work for mobile and high-DPI devices.

**Done when:** Core behavior is covered by automated tests and the main page is divided into maintainable responsibilities.

## Phase 9: Campaign and replay value

**Goal:** Give players reasons to return after completing the campaign.

- [x] **9.1 Add a campaign map** — Show four worlds, 16 levels, completion state, locked levels, and replayable stages.
- [ ] **9.2 Add optional collectibles** — Hide fireflies, badges, or other collectibles in completed levels.
- [ ] **9.3 Add time trials** — Track best times and provide optional speed challenges.
- [ ] **9.4 Add no-fall and perfect-run challenges** — Offer additional goals without making the normal campaign harder.
- [ ] **9.5 Add cosmetic rewards** — Unlock scarves, hats, colors, or character variants.
- [ ] **9.6 Add player customization** — Let players choose a distinct appearance for the current room.
- [ ] **9.7 Add harder variants** — Unlock optional remixed stages after the main campaign.

**Done when:** Players can replay completed content with meaningful optional goals and visible progression.

## Phase 10: New cooperative mechanics

**Goal:** Expand the game only after the existing 16-level experience is polished.

- [ ] **10.1 Add timing-based cooperative platforms**
- [ ] **10.2 Add carryable or movable objects**
- [ ] **10.3 Add buttons that must be held while another player moves**
- [ ] **10.4 Add rescue mechanics for fallen teammates**
- [ ] **10.5 Add temporary player abilities or power-ups**
- [ ] **10.6 Add new hazards and environmental interactions**

**Done when:** New mechanics are introduced gradually, taught clearly, tested in isolation, and used meaningfully in new levels.

## Phase 11: Browser platform and device quality

**Goal:** Use stable browser capabilities deliberately so the game behaves consistently across phones, desktops, background tabs, and supported controllers.

These items are based on the [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/), [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), the [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API), the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), and [PWA installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

- [x] **11.1 Unify pointer input** — Use Pointer Events for touch and mouse controls, set intentional `touch-action` behavior on the game surface, handle pointer cancellation, and keep keyboard input unchanged.
- [x] **11.2 Add optional gamepad controls** — Detect supported controllers, map movement and jump without requiring a controller, show the active control scheme, and provide a fallback when the browser does not expose Gamepad support.
- [x] **11.3 Pause safely when hidden** — Stop or reduce the animation loop and network work when the tab is hidden, resume with a state refresh, and prevent a background tab from sending stale movement.
- [x] **11.4 Make the shell installable** — Add a web app manifest, icons, theme metadata, and a service worker only for static shell assets; clearly keep room creation, multiplayer state, and gameplay network-dependent.
- [x] **11.5 Add device rendering budgets** — Cap canvas pixel density on high-DPI devices, measure frame time and memory-sensitive paths, and test low-power mobile settings before adding visual effects.
- [x] **11.6 Define real-user performance targets** — Set 75th-percentile targets for load (<3s mobile), interaction (<200ms), and layout shift (<0.1), with frame-time warnings for the canvas.
- [x] **11.7 Complete a WCAG 2.2 verification pass** — Verify keyboard focus, focus visibility, target sizes, contrast, reduced motion, status messages, and error recovery; record intentional canvas-gameplay limitations.

**Done when:** Desktop keyboard, touch, and (where available) gamepad users receive consistent controls; background tabs do not waste work or corrupt state; the app is optionally installable without pretending multiplayer works offline; and performance/accessibility targets are measured rather than assumed.

## Phase 12: Real-time multiplayer architecture

**Goal:** Choose and implement a networking model that matches the cooperative game's latency and reliability needs instead of treating rapid polling as the permanent design.

Cloudflare documents [Durable Objects with WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) as a fit for coordinating connected clients in a room, while D1's [`batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) provides sequential transactional batches and reduces round trips. These are architecture options to evaluate, not a requirement to migrate blindly.

- [ ] **12.1 Measure the current polling model** — Record request rate, response latency, dropped updates, CPU/frame impact, and room-size behavior at 2–4 players; establish a baseline for the current 220 ms refresh loop.
- [ ] **12.2 Decide room transport** — Compare optimized polling/SSE with a Durable Object WebSocket room, documenting latency, reconnect behavior, D1 consistency, deployment complexity, and cost before selecting one.
- [ ] **12.3 Prototype authoritative room events** — If WebSockets are selected, move presence, movement snapshots, room events, and disconnect handling behind a room object while keeping D1 as durable campaign state where appropriate.
- [x] **12.4 Make state mutations atomic** — Group coupled room/player updates in D1 batches or equivalent transactional operations, especially joins, host transfer, restart, collection, gate opening, and completion.
- [ ] **12.5 Add versioned resynchronization** — Include a room-state version or event cursor so reconnecting clients can detect missed updates, request a full snapshot, and discard stale movement/events.
- [ ] **12.6 Load-test room limits** — Test concurrent joins, rapid movement, reconnect storms, abandoned rooms, and simultaneous completion attempts with explicit latency and error budgets.

**Done when:** The chosen transport is justified by measurements, room state remains consistent under concurrent actions, reconnects converge to one authoritative snapshot, and the smoke suite covers the selected transport rather than only the happy path.

## Phase 13: Security, privacy, and operational safeguards

**Goal:** Protect bearer-token rooms and keep the hosted game observable without collecting unnecessary player data.

- [x] **13.1 Add response security headers** — Define an appropriate Content Security Policy, frame/embedding policy, referrer policy, and MIME/sniffing protections compatible with canvas, sharing, and the hosting platform.
- [x] **13.2 Harden bearer sessions** — Treat device tokens as credentials: avoid exposing them in URLs or logs, rotate or revoke them on leave/expiry, clear invalid local sessions, and document the threat model for room links.
- [x] **13.3 Add abuse controls at the edge** — Rate-limit room creation, joins, polling or socket handshakes, movement updates, and state-changing actions; return stable retryable errors instead of silently dropping requests.
- [x] **13.4 Add privacy-respecting diagnostics** — Track aggregate server errors, latency, reconnects, and room expiry without names, tokens, or gameplay traces; document retention and provide an opt-out if any client telemetry is introduced.
- [x] **13.5 Add deployment and rollback checks** — Verify migration compatibility, D1 bindings, headers, manifest/service-worker assets, and smoke tests in CI before promoting a hosted release.

**Done when:** Room credentials and player data are not unnecessarily exposed, abusive traffic is bounded, operators can diagnose failures without identifying players, and deployments can be validated and rolled back safely.

## Research sources and review notes

Reviewed 2026-10-19. The existing phases already cover related work; the new phases above make the following externally documented concerns explicit:

- W3C [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) — accessibility acceptance criteria and status/error communication.
- MDN [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) — one input model for mouse, pen, and touch.
- MDN [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) — optional controller support and feature detection.
- MDN [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — pausing work for hidden documents.
- MDN [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) — manifest/service-worker requirements and installability boundaries.
- web.dev [Web Vitals](https://web.dev/articles/vitals) — field performance measurement and 75th-percentile targets.
- Cloudflare [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) — transactional batching and reduced database round trips.
- Cloudflare [Durable Objects WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) — room-oriented, bidirectional real-time coordination.

---

## Recommended next work cycle

Phase 4 (multiplayer reliability) is complete. Continue with one small item at a time:

1. **5.2 Add world music**
2. **5.4 Add world transitions**
3. **5.5 Add completion results**
4. **6.6 Document gameplay limitations**
5. **7.1 Add shared request schemas**
6. **8.2 Add API edge-case tests**
7. **8.4 Add CI checks**
8. **8.5 Split `app/page.tsx`**

## Definition of done for each item

Before checking off an item:

1. The behavior works on desktop and a phone-sized layout where relevant.
2. Existing behavior is preserved unless the item explicitly changes it.
3. TypeScript, lint, and the smallest relevant test pass.
4. Error and loading states are handled.
5. The README or related documentation is updated when the user-facing behavior changes.
6. The change is small enough to review and revert independently.
