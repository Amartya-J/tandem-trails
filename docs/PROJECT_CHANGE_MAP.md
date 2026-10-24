# Tandem Trails: What You Can Still Change

This is the owner-facing map of what is already editable, what is planned, and what would make the biggest difference next. The multiplayer platformer core is complete; players can now choose an explorer, and the remaining work is focused on new co-op mechanics plus release publication.

## Best next-three plan

1. **Expand player choice:** Build on the new Scout, Spark, Echo, and Flare selection with trails, emotes, badges, or room banners.
2. **Create one unforgettable co-op moment:** Build a carryable lantern/block, a rescue tether, or a puzzle where one player holds a switch while another crosses.
3. **Finish the showcase package:** Capture a strong two-player cover image, finalize the short project description, and verify the deployed game in a private browser window.

## Things players can change right now

- **Identity:** Enter a player name, choose Scout, Spark, Echo, or Flare, and rename the player from the lobby before the game starts.
- **Room:** Create a room, join by six-character code, share an invite link, copy the code, mark ready, select unlocked trails, and leave safely.
- **Audio:** Toggle mute and independently adjust music and sound-effect volume. These preferences save in that browser.
- **Touch controls:** Switch between standard and left-handed touch layouts.
- **Campaign:** Choose any unlocked level from the campaign map. Personal best times and medals save on that device.
- **Private notes:** Use the pause menu to unlock a browser-only note editor. The note is not sent to other players.
- **Creator bio:** Sign in with ChatGPT to edit the public creator bio (up to 20,000 characters).

## Creator content you can change

| Change | Main location | What is editable |
| --- | --- | --- |
| Worlds and levels | `lib/levels.ts` | World names, level names, briefings, palettes, hazards, platforms, gaps, lights, fireflies, Sync/Tempo bridges, and medal thresholds. |
| Game modifiers | `lib/game-types.ts`, `app/hooks/useGameLoop.ts` | Add or change shared Trail Twists. Current twists are Moon Hop, Crosswind, and Quickstep. |
| Movement feel | `app/hooks/useGameLoop.ts` | Run speed, jump height, gravity, air control, jump buffer, coyote time, fall behavior, checkpoints, and hazards. |
| Art and UI | `public/art/`, `app/components/game/GameCanvas.tsx`, `app/globals.css` | Title/cast art, characters, parallax scenery, palettes, particles, typography, HUD, roster, menus, and responsive layout. |
| Audio | `lib/audio.ts` | World music patterns and procedural sounds for jumping, landing, collecting, switches, falls, and victory. |
| Lore and writing | `app/trail-journal/page.tsx`, `app/bio/` | World lore, crew descriptions, mechanics guide, developer narrative, and public bio. |

## Recommended player-facing upgrades

### Cosmetics and customization

The first cosmetic layer is implemented: players choose Scout, Spark, Echo, or Flare before entering a room, and the choice syncs to every device. The co-op mechanics are also complete: use `E` to carry/drop the shared Trail Crate, keep a teammate on the Relay Switch to power Harmony Step, and press `R` beside a downed teammate to rescue them. Good future options:

- Selectable explorer skins or color palettes before joining a room.
- Unlockable trails, hats, badges, or victory poses.
- Emotes for quick communication without voice chat.
- A customizable room banner or host crest.
- Completion rewards tied to medals, flawless runs, or firefly collection.

### New cooperative mechanics

The planned mechanics are implemented:

- **Carryable or movable objects:** The Trail Crate can be picked up, moved, and dropped by any active teammate.
- **Held buttons:** One player holds the Relay Switch while others cross the powered Harmony Step.
- **Rescue mechanics:** A fallen player enters a shared downed state; a nearby teammate can rescue them before fallback respawn.
- **Shared ability:** Sync Link remains the crew’s proximity-powered shared ability.

## Technical and quality upgrades

- Browser/UI tests now cover the landing flow, explorer selection, and room creation.
- The game now measures actual polling round-trip latency, uses versioned full-snapshot resynchronization, and has a four-player concurrent load smoke test.
- The documented release decision is to retain client-predicted polling for this 2–4 player game; see `docs/MULTIPLAYER_ARCHITECTURE.md`.
- Run the final rubric review and remove any remaining placeholder-like copy.

## Submission and release checklist

- [ ] Create or recapture a polished project cover image.
- [ ] Finalize the project description.
- [ ] Verify the deployed URL in a private browser window.
- [ ] Confirm the repository and public deployment are both current.
- [ ] Submit/share the project.

## Recently fixed

- The README and app now agree on the private-note code: `TRAILBLAZER`.
- Lantern Keeper now correctly requires both optional fireflies placed in every level.

## Status of the older improvement plan

`docs/IMPROVEMENT_PLAN.md` is **not ready to delete** only because external deployment verification remains. The feature and review checklist is complete; keep this file until the published Sites build has been verified.
