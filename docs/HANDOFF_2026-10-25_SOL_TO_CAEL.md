# Hey Cael

This is a list of things I'd love to see forged better and added to the game, to take it where we're trying to go.
EVE-like quests and bounties, NPCs, ships built up to capital and titan proportions, bases, a range of enemies,
and deep-space anomalies. Industry and mining come later, and only if players want them.

Sol drafted this list on Mac's behalf on 2026-10-25, at the end of its Black Current session. It carries Black
Current state only. Every claim below is marked: MEASURED means seen in a gate or on screen, UNVERIFIED means
not yet checked.

## Where it stands (MEASURED, live at token `v=20261025s47`)

**The class ladder: six frames, each strictly bigger**

These are defined in `js/modular-ships.js` as `HULLS`.

| Frame | Sections | Slots | Power | Mass | Shipwright rank | Frame cost |
|---|---|---|---|---|---|---|
| Frigate | 6 | 3 | 8 | 0 | 0 | starter |
| Cruiser | 10 | 4 | 14 | 500 | 1 | 1,800 |
| Battleship | 18 | 6 | 28 | 1,400 | 3 | 9,000 |
| Capital | 30 | 9 | 48 | 3,000 | 4 | 24,000 |
| Supercapital | 48 | 12 | 72 | 6,000 | 5 | 60,000 |
| Titan | 64 | 16 | 110 | 20,000 | 6 | 250,000 |

- **Shipwright ranks.** `RANK_COST` runs 600, 2.4k, 9.6k, 24k, 60k, 200k. Rank 6 is the steepest absolute step,
  for both cost and mass. That is Mac's ruling: *"give it to people and make it the steepest thing"*.
- **Combat bands.** Capital and supercapital have their own bands (`CAPITAL_BANDS`). Titan uses the TITAN rung
  already in `fleet.js` `HULL_LADDER`. Every band sits near a net of 1.07–1.08 (rate × damage). That is the law:
  bigger is never strictly stronger. Don't "fix" it.
- **New sections:**
  - Heavy battery deck: battleship and up.
  - Spinal mount: capital and up, takes CAPITAL-class guns.
  - Hangar deck.
  - Medium batteries: now allowed on any frame above frigate.
- **Factory flagships:**
  - Asterion dreadnought: battleship.
  - Leviathan carrier: capital.
  - Sovereign titan: supercapital, 40 sections. The id is `sovereign`, a leftover name from before titans existed.
  - Athanor titan: titan, 64 sections. A flying base.
- **Clip-on forge set.** 25 pieces with art, shown as yard thumbnails. Covered by `scripts/witness-clip-ons.mjs`
  (15/15).
- **Gates at handoff (MEASURED):**

  | Gate | Result |
  |---|---|
  | clip-ons | 15/15 |
  | modular-ships | 60/60 |
  | workshop | 44/44 |
  | civilisations | 17/17 |

  The pre-existing reds are still there: galaxy ring-1 (2) and hubs reload (1). They predate this work.

## The forge list, top first

1. **Specialisation pathways for every frame.** EVE-style role branches: interceptor, assault, logistics, ewar,
   carrier, siege. Mac said *"5 eight classes"*, so ask him whether that means 5 paths per frame or 8.
   This is now item 1 of `docs/PLAN.md`.
2. **A real progression to the titan.** Mac: *"gives us a good ladder to balance the game progression towards"*.
   The numbers exist but no player has climbed them, so pacing is UNVERIFIED. Bounty and quest payouts should
   be tuned against this ladder.
3. **Capital weapons people can earn.** A fresh save flies the flagships on spitters, because factory hulls
   prefer researched guns. `gun-capitalrail` needs a research or unlock path to reach the spinal mounts.
4. **Titans as bases.** At 64 sections it should play like a base: fleet docking, station services, maybe a
   respawn point. Right now it is only a very big ship.
5. **Yard usability for big frames.** UNVERIFIED: the yard was not checked at phone width with a 30–64 section
   design. The section grid may need zoom or pan.
6. **Spinal art.** The spinal mount art is hidden when a turret is fitted over it. The keel rail should stay
   visible under the gun.
7. **The rest of `docs/PLAN.md`:**
   - hired escorts and a wider galaxy;
   - quests, bounties and NPC agents (census `contracts.js` and `contacts.js` first);
   - anomalies, field refit, jump gates and bases.
8. **Space demons.** Mac's enemy list is still to come.

## How Sol worked here (Mac's standing orders)

- **Always ship it live.** Every green batch is committed (exact files only), pushed to `main`, published to
  `gh-pages`, and checked on the live page for the new token.
- **Deploy recipe:**
  1. Run `python3 scripts/build-site.py`.
  2. Make a worktree of `origin/gh-pages` and run `git rm -rq .` in it.
  3. Copy `.site-build/.` into the worktree, commit and push.
  4. Remove the worktree.
  5. Poll `gh api repos/Lycheetah/black-current/pages/builds/latest`.
  6. Curl https://lycheetah.github.io/black-current/play/ and look for the token.
- **Cache token.** Bump `v=...` in `index.html` on every change.
- **Mute headless tests** with `PULSE_SERVER=unix:/nonexistent`.
- **Classic scripts.** `js/*.js` share globals: never add `export`, and guard with `typeof X`.
- **Never stage or edit:**
  - never stage `node_modules`;
  - never stage `docs/HANDOFF_2026-10-25_AETHERON_CONTINUATION.md` or
    `docs/research/RETENTION_DOSSIER_FOR_SOL_OPUS.md`;
  - never edit `weapons.js` or the other hash-gated sources.
- **Fun and phone feel** are Mac's verdict, not a gate's.
