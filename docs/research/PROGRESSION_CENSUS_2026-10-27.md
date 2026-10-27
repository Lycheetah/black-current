# Progression census · 27 October 2026

Measured in Firefox against the game runtime. Owner: Mac; local implementation
and witness: Caelorynth. This records one tuning batch, not a second plan.
The live sequence remains [PLAN.md](../PLAN.md).

## Price and frame measurements

| Weapon size | Before, metal | Candidate, metal | Models |
| --- | ---: | ---: | ---: |
| Ordinary novice | 4–16 | 4–16 | 15 |
| Light | 150–450 | 48–68 | 15 |
| Medium | 150–825 | 360–504 | 16, including the named special |
| Heavy | 150–1,800 | 2,200–3,080 | 15 |
| Siege | 150–3,150 | 9,800–13,720 | 15 |
| Capital | 99,000 | 99,000–138,600 | 15 |

The additional Point special remains outside the ordinary novice range.
No weapon damage, cadence, gun marks, mastery or mount rules changed.

| Frame | Original frame + cumulative training | Candidate frame + cumulative training |
| --- | ---: | ---: |
| Frigate | supplied | supplied |
| Cruiser | 2,400 | 720 |
| Battleship | 21,600 | 18,120 |
| Capital | 60,600 | 57,120 |
| Supercapital | 156,600 | 153,120 |
| Titan | 546,600 | 543,120 |

These are investments from rank zero, before owned frames, wallet and hardware.
The cruiser is 600 metal plus rank one at 120 and requires 500 biomass.
Biomass is a milestone, not a currency spent on fabrication. Later training
still adds one module slot per rank and does not override power or mount size.

## Native rewards

Twenty actual `engine.killEnemy` calls per cohort, in an isolated test campaign:

| Cohort | Before metal | Candidate metal |
| --- | ---: | ---: |
| Tier 1 ordinary | 20 | 20 |
| Tier 2 ordinary | 40 | 40 |
| Tier 3 ordinary | 60 | 60 |
| Tier 5 ordinary | 100 | 240 |
| Tier 7 ordinary | 140 | 720 |
| Tier 3 elite | 180 | 180 |
| Tier 3 outpost | 720 | 720 |

The original census executed synchronous kill chains; its biomass includes
artificial chain bonuses. The candidate census resets the chain before each
kill. **Do not compare their biomass totals or infer gameplay minutes.**
Metal comparisons remain meaningful. Sample drop counts are observations,
not estimates of the true drop rate; this batch does not retune drop chances.

The tuning keeps the first three tiers’ income stable, fixes the inverted
weapon-size prices, makes the first real Light purchase reachable, and retains
large capital investments. Outer threats pay more so their economy can support
later equipment. Whether those timings feel right requires play evidence.

## Witness and boundaries

`scripts/witness-progression-path.mjs` checks the actual station door, native
shop and Apply, six earned rookie metal buying a six-metal Pulse emitter,
free reuse, Shipwright gates and refused-save rollback, a layout-preserving
cruiser preview, native frame purchase, reload, practice exclusion, protected
source hashes, packaged bytes and offline launch. Phone-width choices and
frame actions are required to fit on screen with at least 44-pixel heights.
The price gate rejects the recorded old flattened ladder as a negative control.
Final packaged/offline witness: **25/25**, zero application exceptions. All
612 manifested file hashes match (613 package files including the manifest).
Desktop and phone screenshots were inspected. One initial run stopped after
13 passes on a mistaken selector; the final fixture also persists its seeded
biomass through the native save path and asserts it survives reload.

Artifacts: `shots/progression-path/{baseline,report}.json`,
`progression-phone.png` and `progression-desktop.png`. Late purchases use seeded
wallet/biomass fixtures; they do not establish time to reach a cruiser. The
first earned purchase uses six real rookie kills without a currency grant.

Full npm regression did not run. Actual phone FPS, touch, balance and a timed
first-five-minute playtest remain unverified. No commit or publication is
part of this batch. Six protected combat/editor sources remain unchanged.
