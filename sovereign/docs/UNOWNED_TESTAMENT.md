# The Unowned Testament — first frontier contract

Implemented locally on 6 November 2026. Original story by Caelorynth for Mackenzie
Conor James Clark / Lycheetah. No commit, push or publication.

## How to play

1. Open the game and continue a pilot or create one. Any civilisation can take it.
2. Dock at Asterion Forge in Naraka (`G` nearby), then open **JOBS**.
3. Accept **The Unowned Testament**, select **COURSE**, undock and travel to the
   Quiet Reliquary. A local jump (`J`) can shorten the journey.
4. Clear the small Tithe escort. Approach **Ilex · Testament archive** and collect
   it with `V`. The job tracker then points back to Asterion.
5. Dock and open **JOBS** to hear Ilex and choose the archive's fate.

The active-contract tracker offers the next contextual action: undock, set course,
lock a mission guard, fire, keep range, collect the particular archive, return,
dock and **HEAR ILEX**. The target panel explains range/tracking losses; weapon
groups distinguish locking, cycling, range and capacitor blockers. See
`FLIGHT_GUIDANCE.md` for the later guidance build and preview-save protection.

The contract appears once on the Naraka board. Abandoning it allows another
attempt. A completed decision remains recorded and does not return as a new offer.

## The choice and its present consequences

Ilex refuses ownership and copying. Its recovery broker and the Tithe make
conflicting claims. The Tithe is a splinter order, not a stand-in for every
Amethyst believer.

| Choice | Salvage | Research | Naraka standing | Recorded aftermath |
| --- | ---: | ---: | ---: | --- |
| Honour Ilex's refusal | 140 | 12 | 1 | A protected berth and voluntary testimony |
| Complete Mara's delivery | 260 | 5 | 1.5 | Broker custody with Ilex's objection preserved |
| Sell the archive to the Tithe | 340 | 0 | 0.5 | A reclamation receipt and a closed channel |

The dialog states these payments before commitment. Returning with the archive
does not automatically choose or pay an ending. The current consequences are the
payment, research, local standing and persistent aftermath. Regional diplomacy,
later contacts and trade attitudes remain later roadmap work.

## Implementation and recovery

- `src/data/story/unowned-testament.js` owns the authored offer, testimony and
  ending text. The site lies about 24 km from Asterion and clear of the main
  breach operation's activation range in the stock sector.
- `src/sim/jobs.js` owns mission state, accepts choices and uses its existing
  single reward writer. Duplicate or stale completion orders cannot pay again.
- `src/ui/jobs-tab.js` renders the testimony, three choices and aftermath through
  the existing station controls. Actions return through the normal world pipeline.
- A loot event for the actual mission wreck proves recovery. A missing or expired
  wreck does not grant cargo; an uncollected mission wreck is restored as needed.
  This also repairs ordinary recovery jobs after reload.
- If the archive is aboard when the player's hull is lost, it becomes recoverable
  at the reliquary after respawn. Cleared guards remain cleared.
- Docked pilots no longer trigger encounters by proximity. Market-price drift
  refreshes the Exchange without replacing the Jobs dialogue.

Save version **10** adds `jobs.stories`. Version 9 migrates automatically while
preserving existing jobs and standing. Terminal records contain the story ID,
chosen ending and completion time; the existing job-completion event triggers the
game's normal save path. Restoration clones job data before resetting unfinished
encounters, leaving the imported payload intact.

## Acceptance receipt

`node tools/check-testament.mjs` passed **11 cases / 9 reloads** covering all three
endings, reward replay, invalid/early choices, duplicate acceptance, mid-encounter
reload, uncollected/expired wrecks, archive loss and recovery, abandonment/retry,
ordinary recovery delivery, version 9 migration and site clearance.

The existing frontier check also passed: 36 generated frontier hulls, two authored
heroes and five save round trips. The game, Hull Forge and Sector Forge built.

The production-browser station check accepted the job through JOBS, recovered the
archive with `V`, and reached the visible dialogue with three choice controls.
Combat and docking were seeded; 3D drawing was disabled for this DOM check.
Screenshot capture timed out, including one focused retry. That chain was stopped.
No screenshot was produced and the ending button was not exercised by that check;
all ending/reward/reload assertions above are simulation checks.

First complete spaceflight playthrough, combat balance, browser visual acceptance
and device performance remain open. The initial combat route exists; additional
evasion tactics, cover composition and subsequent campaign contacts remain future
work. See `captures/testament/station-witness.json` for the partial browser receipt.
