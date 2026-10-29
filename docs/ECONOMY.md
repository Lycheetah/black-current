# Economy (measured)

Probe: `scripts/probe-economy.mjs`. A bot flies each frame's factory ship at its danger band for 1 simulated minutes per band. It aims, fires, closes to range, and hops sectors when one goes quiet, charging 20 s of travel per hop. Stock factory loadouts; no gun upgrades.

## Income by band

| Frame (ship) | Danger | Metal/min | Kills/min | Hops | Deaths |
|---|---|---|---|---|---|
| frigate (hornet) | 1–2 (mean 2) | 20 | 9.8 | 3 | 0 |
| cruiser (lancer) | 3–4 (mean 4) | 0 | 0 | 1 | 0 |
| battleship (dreadnought) | 5–7 (mean 5) | 4 | 1 | 1 | 0 |
| capital (leviathan) | 8–11 (mean 9) | 0 | 0 | 1 | 0 |
| supercapital (sovereign) | 12–15 (mean 12) | 216 | 1 | 1 | 0 |
| titan (athanor) | 16–20 (mean 16) | 0 | 0 | 1 | 0 |

## Time to the next frame (metal only)

| Step | Frame + training (metal) | Metal/min on the previous frame | Minutes |
|---|---|---|---|
| frigate → cruiser | 720 | 20 | 36 |
| cruiser → battleship | 9,800 | 0 | — |
| battleship → capital | 33,000 | 4 | 8250 |
| capital → supercapital | 85,000 | 0 | — |
| supercapital → titan | 185,000 | 216 | 856 |

Targets (docs/MASTER_PLAN.md §4.4): cruiser 35 min, battleship 3 h cumulative, capital 6 h, carrier 10 h, titan 20 h+. This table is the first-pass measurement; outfitting (decks, guns) costs come on top of it.

## Reading (overnight run step 2, 2026-10-29)

- **Income runs at about 22 → 90 → 150 → 200 → 280 → 600 metal per minute.** Those are the frigate → titan bands, for a bot that only fights and hops. Bot deaths at the higher bands make those rows noisy. Biomass is not the gate: a frigate collects about 345 per minute in pickups.
- **Stock factory ships are under-gunned for their bands.** Their battleship carries four Point guns. Outfitting (decks and real guns) is most of what a player must buy after a frame, and that cost is not in the table above.
- **The wall Mac felt is real.** Cruiser → battleship is one 9,800-metal step (5,000 frame + 4,800 training). That is over an hour of perfect farming before the first deck or gun, and there is no power step in between.

## The new ladder and prices (overnight steps 3 and 7)

The climb becomes nine rungs (`docs/MASTER_PLAN.md` §4.2), so the wall breaks into steps with a power gain at each one. Gun ranks give the 10-minute upgrades in between. The table below uses the measured income at 80% (a real pilot travels, docks and dies). About 70% of each step's budget goes on frame and training; the rest is left for outfitting.

| Rung | Id | Cumulative target | Step budget | Frame + training (metal) |
|---|---|---|---|---|
| Frigate | frigate | start | — | 0 |
| Destroyer | destroyer | 15 min | 15 min × 18/min | 190 |
| Cruiser | cruiser | 35 min | 20 min × 40/min | 560 |
| Heavy Cruiser | heavycruiser | 1 h | 25 min × 72/min | 1,260 |
| Battlecruiser | battlecruiser | 1 h 30 min | 30 min × 100/min | 2,100 |
| Battleship | battleship | 2 h | 30 min × 120/min | 2,500 |
| Dreadnought | capital (display renamed) | 4 h | 120 min × 150/min | 12,600 |
| Carrier | supercapital (display renamed) | 7 h | 180 min × 200/min | 25,000 |
| Titan | titan | 14 h | 420 min × 250/min | 73,500 |

- Existing saves keep their frame. Training ranks map onto the new ladder: old cruiser → new cruiser, old battleship → new battleship, and so on.
- The playtest funds buttons stay until a second measured pass confirms these targets.
