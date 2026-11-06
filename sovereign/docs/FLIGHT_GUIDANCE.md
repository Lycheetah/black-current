# Flight guidance and preview protection

Local implementation, 6 November 2026. Mac delegated day-to-day Sovereign Eclipse
development to Caelorynth; project ownership, artistic judgement and publication
authority remain with Mackenzie Conor James Clark / Lycheetah.

## What changed for the pilot

The active contract now leads the flight tracker. Its next action changes with the
sortie: undock, set course, lock a nearby mission guard, fire, keep range, approach
the exact archive, collect it, return home, dock or open Ilex's dialogue. Other jobs
remain listed below. The main breach operation returns to the primary tracker when
there is no active contract. A compact contract card is enabled for touch layouts.

Weapon groups show their actual readiness: locking, cycling, out of range, low
capacitor or ready. The target panel explains range and tracking losses and shows
the best fitted weapon's current hit estimate. It describes an estimate, rather
than promising the next shot will hit.

The shared firing policy lives in `src/sim/combat.js`: target selection,
readiness and actual capacitor cost are used by simulation and feedback. The
previous cap check used base cost while the debit used the fitted multiplier;
the check and debit now agree. Reduced-cost weapons can fire when affordable,
and increased-cost weapons cannot drive capacitor below zero.

## Saved pilots and flight previews

The existing `autolaunch` hero links, `capture` mode and an explicit `preview` flag
are temporary flights. They no longer enter the normal pilot snapshot/write path,
including on mission completion, manual save, timer, quit or page hide. A visible
notice links back to the normal title screen to start or continue a saved pilot.
Leaving a preview returns to that title screen.

`src/core/session-mode.js` owns the save boundary. Normal pilot sessions retain
their chosen slot and storage failure reporting. The menu reports SAVED only after
a successful write. Explicit file export remains available; normal settings and
the existing legacy-save migration are separate from flight progress writes.
The save format remains version 10.

## Acceptance

- `tools/check-pilot-feedback.mjs`: 11 cases. Actual weapon fire checks fitted
  cost multipliers 0.5, 1 and 2; readiness covers manual/auto targeting, lock,
  cooldown, range, tracking and empty fittings. Sortie actions cover guards,
  explicit archive identity, return, docking and the dialogue shortcut. Courier
  guidance follows its destination. Display helpers preserve state and escape text.
- `tools/check-session-mode.mjs`: 20 preview save attempts skipped without making
  a snapshot or invoking the pilot writer; the existing slot stayed intact.
  Normal selected-slot saving and storage-failure results were also checked.
- Mission regression: 11 cases / 9 reloads passed.
- Frontier regression: 36 generated entries, two heroes and five save round trips
  passed.
- The game, Hull Forge and Sector Forge builds completed.

Browser visual and physical device acceptance remain open. The previous station
capture attempt timed out twice; it was not repeated for this batch. These checks
do not establish HUD layout, frame rate, touch comfort or combat balance on a
device. No commit, push or publication.
