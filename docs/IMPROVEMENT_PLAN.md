# Tandem Trails Improvement Plan

This plan turns the current improvement ideas into a sequence of small, reviewable work items. Each item should be completed and tested before moving to the next one.

## Project goals

- Make the existing game easier to understand.
- Make movement and multiplayer feel smoother.
- Make the game more reliable on phones and unstable networks.
- Improve accessibility without removing the canvas-based presentation.
- Add replay value after the core experience is polished.
- Keep changes small enough to test and deploy safely.
- **Maximize score for the Handshake AI Skills Studio Challenge rubric.**

## Priority guide

- **P0 — Foundation:** Fixes that improve usability, reliability, or correctness for nearly every player.
- **P1 — Polish:** Changes that make the existing game feel more complete and responsive.
- **P2 — Expansion:** New content and replay features after the core experience is stable.

---

## Phase 1: Lobby and onboarding
- [x] **1.1 Improve the title screen**
- [x] **1.2 Improve lobby status**
- [x] **1.3 Add room-sharing actions**
- [x] **1.4 Add lobby readiness**
- [x] **1.5 Improve lobby errors**
- [x] **1.6 Add safe lobby actions**

## Phase 2: Gameplay clarity
- [x] **2.1 Add a persistent objective HUD**
- [x] **2.2 Improve switch and portal visibility**
- [x] **2.3 Add gameplay notifications**
- [x] **2.4 Add off-screen player indicators**
- [x] **2.5 Improve level introductions**
- [x] **2.6 Add loading and request states**

## Phase 3: Movement and camera polish
- [x] **3.1 Tune movement**
- [x] **3.2 Add jump buffering**
- [x] **3.3 Add coyote time**
- [x] **3.4 Polish touch controls**
- [x] **3.5 Add touch preferences**
- [x] **3.6 Smooth camera movement**
- [x] **3.7 Improve remote-player rendering**

## Phase 4: Multiplayer reliability
- [x] **4.1 Add connection state**
- [x] **4.2 Add reconnect support**
- [x] **4.3 Track player activity**
- [x] **4.4 Handle inactive players safely**
- [x] **4.5 Improve host transfer**
- [x] **4.6 Add room expiration**
- [x] **4.7 Add latency feedback**

## Phase 5: Audio and presentation
- [x] **5.1 Add sound effects**
- [x] **5.2 Add world music**
- [x] **5.3 Add audio settings**
- [x] **5.4 Add world transitions**
- [x] **5.5 Add completion results**

## Phase 6: Accessibility
- [x] **6.1 Add an accessible status layer**
- [x] **6.2 Add screen-reader announcements**
- [x] **6.3 Audit keyboard navigation**
- [x] **6.4 Add display settings**
- [x] **6.5 Reduce color dependence**
- [x] **6.6 Document gameplay limitations**

## Phase 7: Backend correctness and abuse resistance
- [x] **7.1 Add shared request schemas**
- [x] **7.2 Add structured API errors**
- [x] **7.3 Harden movement validation**
- [x] **7.4 Harden collection and completion**
- [x] **7.5 Add rate limiting**
- [x] **7.6 Review token lifecycle**
- [x] **7.7 Add database cleanup**

## Phase 8: Testing and maintainability
- [x] **8.1 Add level geometry tests**
- [x] **8.2 Add API edge-case tests**
- [x] **8.3 Add browser tests** — Playwright covers the live landing flow, explorer selection, and room creation.
- [x] **8.4 Add CI checks**
- [x] **8.5 Split app/page.tsx**
- [x] **8.6 Create shared game types and constants**
- [x] **8.7 Add performance checks**

## Phase 9: Campaign and replay value
- [x] **9.1 Add a campaign map**
- [x] **9.2 Add optional collectibles**
- [x] **9.3 Add time trials** — Track best times and provide optional speed challenges.
- [x] **9.4 Add no-fall and perfect-run challenges** — Offer additional goals without making the normal campaign harder.
- [x] **9.5 Add Trail Twists** — Every run now rolls a shared, visible modifier: Moon Hop, Crosswind, or Quickstep.
- [x] **9.6 Cosmetics & Customization** — Players choose Scout, Spark, Echo, or Flare before creating or joining; the selection synchronizes across the room.

## Phase 10: New cooperative mechanics
- [x] **10.1 Add timing-based cooperative platforms** — Harmony Step crossings appear only while linked and solidify on a shared rhythmic beat.
- [x] **10.2 Add carryable or movable objects** — The shared Trail Crate can be picked up with `E`, carried, dropped, and seen by every teammate.
- [x] **10.3 Add buttons that must be held while another player moves** — The Relay Switch powers Harmony Step only while an active teammate remains on it.
- [x] **10.4 Add rescue mechanics for fallen teammates** — A fall creates a shared downed state; a nearby teammate presses `R` to rescue before the fallback respawn.

## Phase 11: Browser platform and device quality
- [x] **11.1 Unify pointer input**
- [x] **11.2 Add optional gamepad controls**
- [x] **11.3 Pause safely when hidden**
- [x] **11.4 Make the shell installable**
- [x] **11.5 Add device rendering budgets**
- [x] **11.6 Define real-user performance targets**
- [x] **11.7 Complete a WCAG 2.2 verification pass**

## Phase 12: Real-time multiplayer architecture
- [x] **12.1 Measure the current polling model** — The client measures real poll round-trip time and displays it in the connection indicator.
- [x] **12.2 Decide room transport** — Retain client-predicted polling for this 2–4 player release; see `docs/MULTIPLAYER_ARCHITECTURE.md`.
- [x] **12.3 Prototype authoritative room events** — The Worker writes a compact, authoritative history of joins, starts, pickups, and clears into every room snapshot.
- [x] **12.4 Make state mutations atomic**
- [x] **12.5 Add versioned resynchronization** — Full authoritative snapshots include a protocol version and incompatible clients fail safely.
- [x] **12.6 Load-test room limits** — A four-player, 240-operation concurrent load smoke test runs in CI.

## Phase 13: Security, privacy, and operational safeguards
- [x] **13.1 Add response security headers**
- [x] **13.2 Harden bearer sessions**
- [x] **13.3 Add abuse controls at the edge**
- [x] **13.4 Add privacy-respecting diagnostics**
- [x] **13.5 Add deployment and rollback checks**

## Phase 14: Contest Rubric Alignment

**Rubric Evaluation:**
- **Execution (Score: 5/5):** Stable, meets all mission requirements, functional end-to-end.
- **Creativity (Score: 3/5):** Strong thematic "Painted Worlds" and co-op gates, but a standard platformer loop. Needs a "thoughtful twist."
- **Usefulness / Value (Score: 4/5):** Clear, compelling experience. Replay value added via map and collectibles.
- **Polish & Thoughtfulness (Score: 3/5):** Good accessibility and audio, but some placeholders remain. Needs more intentional "juice" and guidance.

**Action Items:**
- [x] **14.1 Implement "The Trail Journal"** — Replace "Coming Soon" links with a themed Dev Log / Explorer's Journal.
- [x] **14.2 Implement "The Celebration Engine"** — Add world-aware particles, screen shake on impact, and a victory fanfare to the results screen.
- [x] **14.3 Add a "Guided First Trail"** — Improve onboarding for new players.
- [x] **14.4 Implement "The Sync Link"** — Create a distance-based solidarity mechanic where platforms only solidify when players are close.
- [x] **14.5 Final Review** — Re-audited October 24 after explorer customization, new shared co-op systems, browser coverage, load testing, and versioned resynchronization.

## Phase 15: Final Submission
- [x] **15.1 Create Project Cover Image** — `showcase-cover.png` is a verified 1200 × 800 cover image.
- [x] **15.2 Write Project Description** — The 446-character submission description is ready in `SUBMISSION.md`.
- [ ] **15.3 Final Deployment & URL verification**
