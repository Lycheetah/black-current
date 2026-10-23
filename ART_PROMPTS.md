# IMAGE PROMPT PACK — BLACK CURRENT
### 2026-08-16 · **12 BATCHES OF 10** · 112 images · Grok or GPT
### ⚓ capital-fleet register · 🜛 five houses · 🟢 node points on every image

---

## WHAT CHANGED IN THIS VERSION

**Mac, 2026-08-16:** *"you havent really thought of the EVE Online /
Dreadnought / Lycheetah feel"* and *"all images need to have node points clearly
distinguishable so then we can clearly layer and have actual ships."*

Three fixes, and the third one was found while making the first two.

1. **THE REGISTER IS NOW CAPITAL-FLEET.** Not "spaceship". A hull is a **city
   with engines** — deck levels you can count, running lights in rows, antenna
   masts, hangar mouths, tug scars, armour belts, hardpoints that read as
   bolted-on modules. Slow, heavy, enormous.
2. **🟢 EVERY IMAGE CARRIES NODE POINTS.** See the section below — this is the
   one that turns reference art into actual layerable ships.
3. **⛔ THE SUBJECTS ARE NOW THE 16 PACKS THAT ALREADY EXIST.** The previous
   draft invented 16 brand-new classes alongside `ironwake-fleet`,
   `voidwright`, `obsidian-reaver` and the rest — which is a **split roster**,
   and a split roster is the only failure that actually matters. Every image
   below now traces into a pack id that already loads, already renders, and is
   already registered. **ADAPTER, not NEW.**

4. ⛔ **THE LITERAL-OBJECT TRAP IS FIXED — this is why they looked weird.**
   *(Mac, 2026-08-16: "its still weird looking ones")* The previous version broke
   "generic" by injecting **concrete non-spaceship nouns** — *"a blacksmith's
   anvil laid on its side"*, *"a fencing epee with a heron's beak"*. A diffusion
   model takes those **literally** and draws an anvil, or a bird-sword. ⭐ **A
   REFERENT FIXES GENERICNESS AND CAUSES WEIRDNESS BY THE SAME MECHANISM — the
   model cannot tell whether you meant the object's SHAPE or the object.** Every
   referent is now explicitly a **PROPORTION NOTE**, and every batch carries a
   hard rule: *it is always a warship, never the object.*
5. ⚙ **EPIC / MOUNTING / MYSTERY.** *(Mac: "a eve online - capital ship - epic
   looking aswell, and or mysteries with proper points for mounting and future")*
   Every batch now demands **one huge readable primary mass + fine greeble**,
   **scale cues that imply kilometres**, **seam-light**, and a **mystery layer**
   of engraved ritual geometry. ⭐ **And hardpoints are now drawn as REAL
   ARCHITECTURE** — a recessed mount collar, a gimbal ring, a keyed flange —
   **with the green dot placed in its centre.** Previously the dots were stuck
   onto finished art, which both looked wrong and gave us nothing to mount to.
   Now the mount is a designed hull feature and the dot merely marks its centre.

⚠ **On the reference points:** we take the *register* — faction-coherent design
language, capital scale, layered plating, readable hardpoints — and author our
own. ⛔ **No copied names, no copied faction insignia, no copied signature
silhouettes.** The alchemical spine below is Lycheetah's own and belongs to Mac.

---

## 🟢 NODE POINTS — READ THIS TWICE

This is the difference between a picture of a ship and a **ship we can build**.

The game does not draw ships. It draws a **node graph**: `{ dx, dy, radius,
type }` in pixels from the core centre, with each node's art drawn in its own
normalised space where `r: 1.0` is that node's radius. So a part image is useless
for layering unless it tells us **where it bolts on.**

### The marker

> **Solid PURE GREEN `#00FF00` filled circle. Flat. No outline, no glow, no
> gradient. Drawn ON TOP of the finished artwork. Pure green appears NOWHERE
> else in the image.**

- **A CORE HULL** gets **one green dot at every socket** where a module bolts
  on — and **the dot's size shows how big that module is.** A big dot is a
  capital hardpoint; a small dot is a light mount.
- **A MODULE** (cannon / pod / spike / thruster / shield) gets **exactly ONE
  green dot**, at the point where it attaches to the hull. For a
  forward-pointing part that is its rear face; for a thruster, its front face.

⭐ **Reserving one colour makes the markers MACHINE-READABLE.** That is the whole
trick. Because pure green is banned from every hull palette, the extractor can
find the dots without any model, any tracing, or any guesswork:

```
python3 scripts/extract-node-points.py keyed/ --emit layout
```

…which prints `{ dx, dy, radius, type }` in the game's own units, forward `+X`,
ready to paste. **The art carries the socket geometry, not just the shape.**

⚠ **A generator will not place these perfectly.** That is fine — the extractor
prints what it actually found and flags images with zero dots or an implausible
count, so a bad one is visible instead of silently wrong. Fix those by nudging
numbers, not by re-generating the art.

⚠ **Green is reserved. Magenta is reserved.** Green = node marker, magenta =
background key. Neither may appear in a hull palette. Everything else is free.

---

## HOW TO USE THIS

**Each `BATCH` is ONE self-contained copy-paste.** Paste the whole code block as
a single message; you get 10 images.

⚠ **The rules are repeated inside every batch on purpose.** An earlier draft put
the rules in one place and the prompts in another and the model got confused
assembling them. **Never make a generator hold two halves of a prompt in its
head.** Do not "tidy" the redundancy away.

### ⭐ WHY BATCHES 1–2 ARE ALL CORES

The core carries the whole house identity. Get all 16 first, put them side by
side, and any hull that fails the black test dies as a **1-image loss instead of
a 6-image loss.** ⛔ **Stop after batch 2 and test before running batch 3.**

### The three tests

1. **Black test** — fill it solid black. Still know which house it is? If not
   it is a recolour, not a design. That is exactly the failure nine of the
   current fifteen packs already have.
2. **32px test** — scale to 32 pixels. Still readable? A phone never shows it
   bigger.
3. **Pair test** — any two side by side in black. Confusable? One is wrong.

### If the generator won't do transparency

GPT usually ignores it and returns an opaque white card. Every batch therefore
says: fall back to **flat pure magenta `#FF00FF`**. Then:

```
python3 scripts/key-flat-background.py ~/Downloads/batch1 --colour FF00FF
```

⭐ **Ask for the background you can remove, instead of trying to remove the
background you were given.** `rembg` is installed here but has no working
onnxruntime backend, so it does not run — keying a flat colour needs no model.

---

## 🜛 THE FIVE HOUSES

The alchemical spine is Lycheetah's own. Each house has a **coherent material
and geometry language**, so you can name the house from silhouette alone —
that is the faction-coherence the register is built on.

| house | stage | language | packs |
|---|---|---|---|
| **IRONWAKE** | ⚙ the line fleet | riveted armour belts, counted deck levels, running lights, brutal symmetry | `ironwake-fleet` `hammerhead-dreadnought` `titan-dreadnought` `deepiron-cartel` `needle-interceptor` `trident-assault` |
| **VOIDWRIGHT** | 🜃 **Nigredo** — the blackening | burnt calcined hulls, ash-glaze, sigil geometry etched in gold leaf, asymmetry | `voidwright` `obsidian-reaver` `eclipse-battlecruiser` |
| **GLASSREEF** | 🜍 **Rubedo** — the reddening | grown not built, chitin and living glass, bioluminescence in the joints only | `glassreef-choir` `abyssal-choir` `emberwake-swarm` |
| **SOLARIS** | 🜚 **Citrinitas** — the yellowing | brass orrery clockwork, monstrance crowns, hard light, gold on white | `sol-flagship` `plasma-cruiser` |
| **MACHINA** | 🜔 **Albedo** — the whitening | cold pattern, exact repetition, no wear, no hand, unsettlingly clean | `ai-battleship` `cyber-dreadnought` |

### THE 16 SUBJECTS, IN BATCH ORDER

`1 IRONWAKE FLEET` · `2 HAMMERHEAD DREADNOUGHT` · `3 TITAN DREADNOUGHT` ·
`4 DEEPIRON CARTEL` · `5 NEEDLE INTERCEPTOR` · `6 TRIDENT ASSAULT` ·
`7 VOIDWRIGHT` · `8 OBSIDIAN REAVER` · `9 ECLIPSE BATTLECRUISER` ·
`10 GLASSREEF CHOIR` — *batch 1* —
`11 ABYSSAL CHOIR` · `12 EMBERWAKE SWARM` · `13 SOL FLAGSHIP` ·
`14 PLASMA CRUISER` · `15 AI BATTLESHIP` · `16 CYBER DREADNOUGHT` — *batch 2*

### THE RUN SHEET

| batch | contents | n |
|---|---|---|
| 1 | **CORE** — subjects 1–10 | 10 |
| 2 | **CORE** — subjects 11–16 + 4 projectiles | 10 |
| — | ⛔ **BLACK TEST + PAIR TEST HERE** | |
| 3 | **CANNON** — 1–10 | 10 |
| 4 | **CANNON** — 11–16 + 4 projectiles | 10 |
| 5 | **POD** — 1–10 | 10 |
| 6 | **POD** — 11–16 + 4 projectiles | 10 |
| 7 | **SPIKE** — 1–10 | 10 |
| 8 | **SPIKE** — 11–16 + 4 projectiles | 10 |
| 9 | **THRUSTER** — 1–10 | 10 |
| 10 | **THRUSTER** — 11–16 | 6 |
| 11 | **SHIELD** — 1–10 | 10 |
| 12 | **SHIELD** — 11–16 | 6 |
| | | **112** |

Batches 10 and 12 are short because 16 does not divide by 10. Merge them into
one run of 12 if your limit is soft.

### ⛔ TO ANY AGENT CUSTOMIZING THESE FURTHER

Mac on the first draft: ***"they looked generic as fuck."*** He was right. The
cause was **category + adjectives + colours** — an adjective stack is exactly
what a diffusion model collapses into the average of every spaceship it has seen.

**Four levers break the average. Every prompt below carries at least three.**

| lever | generic | specific |
|---|---|---|
| **PROPORTION note — never the object** | "boxy industrial hauler" | "anvil proportions: heavy squared bow, sagging belly aft" |
| **countable structure** | "many vents" | "exactly seven ports, four then three" |
| **named material + its wear** | "grimy steel" | "galvanised steel, salt bloom out of every weld seam" |
| **one weird true detail** | — | "the middle drum is newer — a replacement" |

⭐ **Identity lives in NOUNS and things you can COUNT.** A shape you can count
survives being filled in black. An adjective does not. **Longer is not the point
— specific is.**

**Nine things you may not customize away** (engine contract, not style):
🟢 **node markers in pure `#00FF00`** · transparent-or-magenta background ·
**facing right** (engine forward is `+X`) · flat limited palette, hard edges (it
gets traced to vectors — a gradient cannot) · no shadow/glow/ground · legible in
pure black · single centred object ~85% of a square frame · no text or watermark
· **the six part types** core/cannon/pod/spike/thruster/shield, which is the
shipped node schema — a seventh has nowhere to go.

---
---


## ⭐ SHEET MODE — DO THIS. 7 IMAGES, NOT 112.

**Mac, 2026-08-16:** *"why not just have 4 images of the extra shit outside the
bodies or even for the ship in one image generation bro???"* and *"you can
probably get 4x4 images at full ratio fine."*

He is right, and **cost is the weaker half of the argument.**

⭐ **PARTS DRAWN IN THE SAME IMAGE ARE STYLE-COHERENT FOR FREE.** A cannon
generated in its own call has no reason to share the hull's palette, line
weight, wear pattern or light direction. Drawn in one frame it inherits all
four. That is exactly why bolted-on parts look bolted-on.

⭐ **AND A BY-PART SHEET *IS* THE PAIR TEST.** Sixteen cannons side by side in
one image — any two houses that are confusable are visible in a single glance,
with nothing to composite. The grid also forces one consistent scale across all
16, which is what the engine needs: every cannon renders at radius 12.

**Why by PART and not by SHIP:** there are only six part types, so a per-ship
sheet wastes half a 4x4 grid. Six part sheets plus two core sheets covers all 96.

| | |
|---|---|
| sheets 1–2 | **CORE HULLS** — 8 each |
| sheets 3–8 | **CANNON · POD · SPIKE · THRUSTER · SHIELD** — 16 each |
| **total** | **7 images, 96 objects** *(projectiles: appendix batch 2, items 7–10)* |

### THE CHAIN

```
generate sheet  ->  slice-sheet.py  ->  key-flat-background.py  ->  extract-node-points.py
                       cut it            make it transparent          read its sockets
```

```
python3 scripts/slice-sheet.py ~/Downloads/sheet3.png --expect 16
python3 scripts/key-flat-background.py ~/Downloads/sliced --colour FF00FF
python3 scripts/extract-node-points.py ~/Downloads/sliced/keyed --emit layout
```

⛔ **ALWAYS PASS `--expect`.** The slicer reads objects in grid order, so grid
position IS the ship id. **If the generator drops one object, every part after
it is silently mislabelled** — a Voidwright cannon filed as a Glassreef one.
`--expect` is what turns that from a silent corruption into a printed warning.

⚠ **Objects must not touch.** Two touching parts become ONE component and the
slicer flags it by fill ratio rather than guessing where the seam was. ⛔ Do not
hand-repair a merged blob — re-generate that sheet with wider gutters.

⚠ **Resolution is the real risk here, not layout.** 16 objects on a 1024px
square gives each ~256px. That is enough to trace a silhouette to vectors, which
is all we need — but generate at the largest size the model offers, and if the
detail comes back mushy, split that sheet into two of 8.

---

### SHEET 1 — CORE HULLS 1–8 (8 objects, 2 rows of 4)

⭐ The hull carries the whole house identity, so cores get 8 per sheet instead of 16 — twice the pixels each. Collapse to one 4x4 sheet only if these come back sharp.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 8 separate objects arranged in a 4x2 grid, 2 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 8 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKERS: on each hull, mark EVERY place a module bolts on with a solid
  pure green #00FF00 filled circle, flat, no outline, no glow, drawn ON TOP of
  the finished art. Bigger circle = bigger hardpoint. One at the forward gun
  position, one at each side module bay, one at the stern drive mount. USE PURE
  GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 8 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET — CORE HULL. House Ironwake, the line fleet. A ship of
     the line built like a floating foundry: a long armoured wedge with
     exactly four stepped deck levels rising toward the stern, a riveted
     armour belt running the full length at the waterline, and two rows of
     tiny cold-white running lights along each flank. Steel blue over
     near-black burnished plate. One long tug scar gouged across the port
     belt, never repaired.
 2. HAMMERHEAD DREADNOUGHT — CORE HULL. House Ironwake. HAMMERHEAD
     PROPORTIONS, never a hammer: a wide blunt T-bar bow crossing the entire
     front of the ship, sensor towers at both extreme tips, narrowing hard to
     a tapered stern. Three deck levels. Gunmetal with the leading edge
     chipped down to bare metal. The port tip is visibly shorter than
     starboard — sheared off and squared flat in a refit.
 3. TITAN DREADNOUGHT — CORE HULL. House Ironwake, apex capital. The single
     largest hull in the fleet: a slab-sided fortress with exactly six deck
     levels, two hangar mouths open on the flank, four antenna masts, and an
     armour belt so thick it has its own walkway. Steel blue and near-black,
     one cold white accent. Whole plate sections are mismatched shades — this
     ship has been rebuilt more than once.
 4. DEEPIRON CARTEL — CORE HULL. House Ironwake, the industrial arm. The
     ANVIL PROPORTIONS, never an anvil: a heavy squared mass forward, a deep
     sagging belly aft. Built from three stacked pressure drums bolted
     through external ladder frames — the middle drum is visibly newer and a
     different shade, an obvious replacement. Galvanised steel gone dull,
     white salt bloom creeping out of every weld seam, oxide-red primer
     showing in long vertical flake streaks. One amber beacon on a stalk,
     off-centre to port.
 5. NEEDLE INTERCEPTOR — CORE HULL. House Ironwake, light hull. EPEE
     PROPORTIONS: extremely long and thin, barely wider than its own spine,
     one deck level only, drawn to a fine tapered point at the bow. Exactly
     three small dorsal fins in a row. Bone-white ceramic with hairline
     stress cracks running lengthwise. One narrow blood-red band circling the
     hull a third of the way back from the bow.
 6. TRIDENT ASSAULT — CORE HULL. House Ironwake, boarding hull. A bronze
     eel-spear: three prows forward, the centre one twice the length of the
     two outer, with deep notches between them and boarding ramps folded into
     each notch. Verdigris bronze, green oxidation pooled in the notches. The
     two outer prows are barbed inward; the centre one is smooth.
 7. VOIDWRIGHT — CORE HULL. House Voidwright, Nigredo, the blackening. A
     hull that has been through fire: calcined black, ash-glazed, its plating
     crazed like burnt pottery. Deliberately asymmetric — the starboard side
     carries a heavy sensor spine, the port side is bare. Exactly five
     alchemical sigils etched into the dorsal plating in gold leaf, most of
     it flaked away. Void black over charcoal, gold accent.
 8. OBSIDIAN REAVER — CORE HULL. House Voidwright. A raider hull whose
     PLATING is cut in flat angular fracture facets like knapped obsidian: no
     flat panels, every edge glass-sharp, no curves anywhere. Two deck
     levels, both cut into the stone rather than built up. Glossy black with
     pale grey fracture edges, one gold sigil at the bow.
```

---

### SHEET 2 — CORE HULLS 9–16 (8 objects, 2 rows of 4)

⭐ The hull carries the whole house identity, so cores get 8 per sheet instead of 16 — twice the pixels each. Collapse to one 4x4 sheet only if these come back sharp.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 8 separate objects arranged in a 4x2 grid, 2 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 8 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKERS: on each hull, mark EVERY place a module bolts on with a solid
  pure green #00FF00 filled circle, flat, no outline, no glow, drawn ON TOP of
  the finished art. Bigger circle = bigger hardpoint. One at the forward gun
  position, one at each side module bay, one at the stern drive mount. USE PURE
  GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 8 OBJECTS, IN GRID ORDER:
 1. ECLIPSE BATTLECRUISER — CORE HULL. House Voidwright. A hull built around
     a single enormous circular occulting disc amidships, held in a gimbal
     ring you can see straight through. Four thin spars connect the bow to
     the stern past the disc. Void black, one thin ring of gold corona light
     around the disc's rim only. Three deck levels forward, none aft.
 2. GLASSREEF CHOIR — CORE HULL. House Glassreef, Rubedo, the reddening.
     Grown, not built: a rounded living hull of coral and glass with exactly
     seven soft lobes around its rim, no straight line anywhere. Translucent
     aquamarine over pearl, coral pink in the lobes. Bioluminescent light
     shows ONLY in the seams between lobes, never on the lobes themselves.
     Living coral is growing on the port side and not the starboard.
 3. ABYSSAL CHOIR — CORE HULL. House Glassreef, deep tier. A colossal
     deep-sea isopod under crushing pressure: thick overlapping carapace
     plates, riveted pressure-vessel construction where the living shell
     meets machinery, immense heavy bulk. Exactly five plate courses bow to
     stern. Abyssal black over pale dead bone. A single dim anglerfish lure
     hangs forward on a bent stalk.
 4. EMBERWAKE SWARM — CORE HULL. House Glassreef. NOT one solid object — a
     dinner plate shattered and frozen mid-explosion, exactly nine separate
     hull fragments flying in loose formation with clear empty gaps between
     every piece. Each fragment has its own tiny running lights. Charcoal
     cores with ember-orange glowing along every fracture edge. One fragment
     is much larger than the other eight: the mother shard.
 5. SOL FLAGSHIP — CORE HULL. House Solaris, Citrinitas. A cathedral crossed
     with an orrery: a tall narrow gold hull with exactly five stepped
     buttresses down each flank, three brass armillary rings turning around
     the amidships spine, and a monstrance crown of twelve short radiating
     spines at the bow. Solar gold and white, gold leaf flaking off the
     buttress ribs. A small bronze bell hangs at the apex of the tallest
     mast.
 6. PLASMA CRUISER — CORE HULL. House Solaris. A brass clockwork hull built
     around a single containment sphere amidships, held in three concentric
     gimbal rings. Exactly four deck levels, all stepped down toward the bow.
     Brass and warm ivory, blindingly bright plasma blue inside the sphere
     only — nowhere else on the hull.
 7. AI BATTLESHIP — CORE HULL. House Machina, Albedo, the whitening. Cold
     exact pattern with no hand in it: a hull of perfectly repeated identical
     modules, exactly eight per side, mathematically spaced, seamless, no
     wear, no asymmetry, no repair, no rivets. Unsettlingly clean. Matte bone
     white with thin graphite seams, one cold cyan strip down the spine.
 8. CYBER DREADNOUGHT — CORE HULL. House Machina, apex. The same cold
     repetition at capital scale: a slab hull of exactly sixteen identical
     stacked cells in two rows of eight, each cell lit by one identical
     square window. No two things about it are different from each other.
     Matte bone white, graphite seams, cold cyan windows.
```

---

### SHEET 3 — ALL 16 CANNONS (16 objects, 4 rows of 4)

⭐ All 16 cannons in one frame IS the pair test — any two houses that are confusable show up in the same glance.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 16 separate objects arranged in a 4x4 grid, 4 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 16 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKER: exactly ONE solid pure green #00FF00 filled circle per object,
  flat, no outline, no glow, drawn ON TOP of the finished art, at the face where
  that module BOLTS ONTO THE HULL — the REAR face for forward-pointing parts,
  the FRONT face for a thruster. USE PURE GREEN NOWHERE ELSE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 16 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET CANNON. A capital main battery: a twin-barrel turret in a
     riveted armoured mantlet with a heavy ring collar underneath, two rows
     of cooling ribs along the barrels. Steel blue over near-black, cold
     white accent. Muzzle rims worn bright.
 2. HAMMERHEAD DREADNOUGHT CANNON. A squat wide-bore siege mortar sunk flush
     into a flat square mounting plate, barrel shorter than it is wide, two
     hold-down bolts each side. Gunmetal, muzzle rim worn to bare metal.
 3. TITAN DREADNOUGHT CANNON. The largest gun in the fleet: a single
     enormous barrel eight deck-levels long with three reinforcing bands, a
     walkway railing running along its top, and a breech block bigger than a
     light hull. Steel blue and near-black, one mismatched replacement band.
 4. DEEPIRON CARTEL CANNON. A boxy autocannon with an external ammo hopper
     bolted to its side and a belt feed sagging visibly between them.
     Galvanised steel with salt bloom, oxide-red flaking, one blackened
     rectangular ejection port.
 5. NEEDLE INTERCEPTOR CANNON. A rail-barrel eight times longer than it is
     wide — two thin parallel rails with a visible gap of air between them.
     Bone-white ceramic, one blood-red band at the breech, a hairline crack
     near the muzzle.
 6. TRIDENT ASSAULT CANNON. Three bronze barrels clustered in a triangle,
     the top one longer than the two below, each muzzle fluted like a trumpet
     bell. Verdigris bronze, green oxidation where the barrels meet.
 7. VOIDWRIGHT CANNON. A calcined black barrel that looks fired from a kiln
     rather than machined, its surface crazed like burnt pottery, with three
     alchemical sigils in flaking gold leaf along its length. Asymmetric
     mounting — the collar sits off-centre.
 8. OBSIDIAN REAVER CANNON. A knapped obsidian barrel with flat conchoidal
     fracture faces instead of a round bore, every edge glass-sharp. Glossy
     black, pale grey fracture edges, one gold sigil at the breech.
 9. ECLIPSE BATTLECRUISER CANNON. An occulting projector: a small circular
     disc in a gimbal ring you can see straight through, mounted on a short
     spar. Void black, one thin ring of gold corona light around the disc's
     rim only.
10. GLASSREEF CHOIR CANNON. A smooth tapering organic siphon like a squid's
     funnel — no mechanical parts, no seams, no bolts. Translucent
     aquamarine, pearl at the opening, a ring of seven tiny nodules around
     the mouth. Bioluminescence in the seam at its base only.
11. ABYSSAL CHOIR CANNON. A pressure-driven harpoon launcher grown from
     carapace, thick and riveted where shell meets machinery, a barbed bone
     harpoon already loaded. Abyssal black, pale bone barb, one dim
     lure-light.
12. EMBERWAKE SWARM CANNON. NOT one object — a scattered cloud of exactly
     twelve tiny emitter motes in loose formation with clear gaps,
     collectively pointing right. Charcoal cores, ember-orange fracture
     edges. The green node dot sits at the rear of the formation.
13. SOL FLAGSHIP CANNON. A monstrance lance: a gold reliquary barrel wearing
     a crown of eight radiating hard-light spines at the muzzle, with a brass
     armillary ring turning around its midpoint. Solar gold and white, plasma
     blue at the aperture, gold leaf flaking off the collar.
14. PLASMA CRUISER CANNON. A brass clockwork gun built around a small
     containment sphere at the breech, held in two gimbal rings, with a
     fluted ivory barrel. Brass and warm ivory, blindingly bright plasma blue
     inside the sphere only.
15. AI BATTLESHIP CANNON. Cold exact repetition: exactly six identical short
     barrels in one mathematically even row, seamless, no wear, no rivets, no
     asymmetry. Matte bone white, thin graphite seams, one cold cyan aperture
     per barrel, all identical.
16. CYBER DREADNOUGHT CANNON. The same cold repetition at capital scale: a
     slab battery of exactly twelve identical apertures in two rows of six,
     perfectly spaced. Matte bone white, graphite seams, cold cyan.
```

---

### SHEET 4 — ALL 16 PODS (16 objects, 4 rows of 4)

⭐ All 16 pods in one frame IS the pair test — any two houses that are confusable show up in the same glance.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 16 separate objects arranged in a 4x4 grid, 4 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 16 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKER: exactly ONE solid pure green #00FF00 filled circle per object,
  flat, no outline, no glow, drawn ON TOP of the finished art, at the face where
  that module BOLTS ONTO THE HULL — the REAR face for forward-pointing parts,
  the FRONT face for a thruster. USE PURE GREEN NOWHERE ELSE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 16 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET POD. An armoured cell that continues the hull's armour
     belt across its face, two banding straps, one access hatch with a wheel.
     Steel blue over near-black, two tiny cold-white running lights.
 2. HAMMERHEAD DREADNOUGHT POD. A rounded canister clamped flat under a
     squared bracket with two bolts. Gunmetal, chipped edges, one cyan level
     window.
 3. TITAN DREADNOUGHT POD. A capital magazine cell the size of a small hull:
     three banding straps, a walkway railing across the top, four lifting
     eyes. Steel blue and near-black, one mismatched replacement panel.
 4. DEEPIRON CARTEL POD. A horizontal cylindrical pressure tank with two
     banding straps and one large hand-wheel valve on the end cap. Galvanised
     steel, salt bloom at the welds, an amber hazard chevron stencilled on
     the side.
 5. NEEDLE INTERCEPTOR POD. A slim tapered spindle streamlined almost into
     invisibility, four times longer than it is wide. Bone-white ceramic, one
     blood-red band, hairline cracks.
 6. TRIDENT ASSAULT POD. A trilobed module — three rounded bronze lobes
     fused into one body, verdigris pooled in the two seams between them.
 7. VOIDWRIGHT POD. A calcined black vessel crazed like burnt pottery, with
     two alchemical sigils in flaking gold leaf on its face. Asymmetric — one
     side swells more than the other. Void black over charcoal, gold accent.
 8. OBSIDIAN REAVER POD. A knapped obsidian cell with flat conchoidal
     fracture faces, glass-sharp edges, no curves. Glossy black, pale grey
     fracture edges, one gold sigil.
 9. ECLIPSE BATTLECRUISER POD. A small circular occulting disc in a gimbal
     ring you can see straight through, mounted flush. Void black, one thin
     ring of gold corona light around the rim only.
10. GLASSREEF CHOIR POD. A translucent bulbous egg-sac with three darker
     embryos suspended visibly inside it. Aquamarine glass, pearl sheen,
     coral pink embryos, bioluminescence in the base seam only.
11. ABYSSAL CHOIR POD. A riveted pressure bladder slung under carapace
     plating, straining visibly at its two bands. Abyssal black, pale bone
     ribs, one dim lure-light.
12. EMBERWAKE SWARM POD. NOT one object — a tight clump of exactly seven
     small spheres held in formation with visible gaps, not fused. Charcoal
     with ember-orange fracture edges, one sphere brighter than the rest. The
     green node dot sits at the clump's rear.
13. SOL FLAGSHIP POD. A gold reliquary casket with a domed lid, four
     kneeling figure-shaped buttresses, and a brass armillary ring around its
     waist. Solar gold and white, plasma blue light escaping the lid seam,
     gold leaf flaking.
14. PLASMA CRUISER POD. A brass containment sphere in two concentric gimbal
     rings on an ivory cradle. Brass and warm ivory, blindingly bright plasma
     blue inside the sphere only.
15. AI BATTLESHIP POD. Cold exact repetition: exactly nine identical small
     cells in a perfect three-by-three grid, seamless, no wear, no rivets.
     Matte bone white, thin graphite seams, one cold cyan window per cell,
     all identical.
16. CYBER DREADNOUGHT POD. The same at capital scale: a slab of exactly
     twenty identical cells in four rows of five, mathematically spaced.
     Matte bone white, graphite seams, cold cyan windows.
```

---

### SHEET 5 — ALL 16 SPIKES (16 objects, 4 rows of 4)

⭐ All 16 spikes in one frame IS the pair test — any two houses that are confusable show up in the same glance.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 16 separate objects arranged in a 4x4 grid, 4 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 16 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKER: exactly ONE solid pure green #00FF00 filled circle per object,
  flat, no outline, no glow, drawn ON TOP of the finished art, at the face where
  that module BOLTS ONTO THE HULL — the REAR face for forward-pointing parts,
  the FRONT face for a thruster. USE PURE GREEN NOWHERE ELSE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 16 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET SPIKE. A riveted ram prow that continues the armour belt
     to a squared point, three reinforcing ribs, a walkway railing along the
     top. Steel blue over near-black.
 2. HAMMERHEAD DREADNOUGHT SPIKE. A broad flat chisel blade, wide and
     squared, NOT a needle. Gunmetal, cutting edge burnished bright from use.
 3. TITAN DREADNOUGHT SPIKE. A capital ram the size of a light hull: blunt,
     massive, more mass than point, with four reinforcing bands and a
     mismatched replacement plate near the tip. Steel blue and near-black.
 4. DEEPIRON CARTEL SPIKE. An industrial breaching drill bit with a heavy
     helical flute. Galvanised steel, salt bloom, oxide-red flaking, tip worn
     bright.
 5. NEEDLE INTERCEPTOR SPIKE. A single hair-fine stiletto point, absurdly
     thin, nearly a line. Bone-white ceramic, one blood-red band at its base.
 6. TRIDENT ASSAULT SPIKE. A three-pointed barbed boarding head, centre
     point longest, the two outer points barbed inward. Verdigris bronze,
     green in the notches.
 7. VOIDWRIGHT SPIKE. A calcined black spar crazed like burnt pottery,
     tapering to a point, with two alchemical sigils in flaking gold leaf.
     Asymmetric — it curves slightly to port. Void black over charcoal, gold
     accent.
 8. OBSIDIAN REAVER SPIKE. A knapped obsidian blade with flat conchoidal
     fracture faces and a glass-sharp edge, exactly the shape of a struck
     flake. Glossy black, pale grey fracture edges, one gold sigil at the
     base.
 9. ECLIPSE BATTLECRUISER SPIKE. A thin spar carrying a small circular
     occulting disc near its tip, the disc in a gimbal you can see through.
     Void black, one thin gold corona ring around the disc rim only.
10. GLASSREEF CHOIR SPIKE. A curved stingray barb, organic and tapering,
     fine serration along its inner curve. Aquamarine, coral pink tip,
     bioluminescence in the base joint only.
11. ABYSSAL CHOIR SPIKE. A colossal barbed bone ram grown out of layered
     carapace, riveted where bone meets plate. Abyssal black, pale bone, one
     dim lure-light at the base.
12. EMBERWAKE SWARM SPIKE. NOT one object — a spray of exactly eleven small
     sharp shards in loose formation with gaps between them, collectively
     pointing right. Charcoal, ember-orange fracture edges. Green node dot at
     the rear of the spray.
13. SOL FLAGSHIP SPIKE. A hard-light lance spine radiating from a gold
     collar, straight and blindingly sharp, with a brass armillary ring at
     its base. Solar gold, white, plasma blue at the point, gold leaf flaking
     off the collar.
14. PLASMA CRUISER SPIKE. A fluted ivory lance with a small brass
     containment sphere at its base held in one gimbal ring. Brass and warm
     ivory, plasma blue inside the sphere only.
15. AI BATTLESHIP SPIKE. Cold exact repetition: exactly five identical
     points in a mathematically even row, seamless, no wear, no asymmetry.
     Matte bone white, thin graphite seams, one cold cyan line.
16. CYBER DREADNOUGHT SPIKE. The same at capital scale: a slab ram faced
     with exactly fifteen identical points in three rows of five, perfectly
     spaced. Matte bone white, graphite seams, cold cyan.
```

---

### SHEET 6 — ALL 16 THRUSTERS (16 objects, 4 rows of 4)

⭐ All 16 thrusters in one frame IS the pair test — any two houses that are confusable show up in the same glance.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 16 separate objects arranged in a 4x4 grid, 4 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 16 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKER: exactly ONE solid pure green #00FF00 filled circle per object,
  flat, no outline, no glow, drawn ON TOP of the finished art, at the face where
  that module BOLTS ONTO THE HULL — the REAR face for forward-pointing parts,
  the FRONT face for a thruster. USE PURE GREEN NOWHERE ELSE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 16 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET THRUSTER. A riveted drive nacelle with exactly eight
     square vents in one row across its mouth, two rows of tiny cold-white
     running lights along the housing. Steel blue over near-black,
     soot-blackened vent rims.
 2. HAMMERHEAD DREADNOUGHT THRUSTER. A wide rectangular exhaust bank,
     exactly eight small square vents in one row. Gunmetal, vent rims
     soot-blackened.
 3. TITAN DREADNOUGHT THRUSTER. A capital drive the size of a light hull:
     one enormous bell mouth with four reinforcing bands, a walkway railing
     around the housing, and one mismatched replacement band. Steel blue and
     near-black.
 4. DEEPIRON CARTEL THRUSTER. A heavy riveted exhaust stack with a soot cowl
     and two guy-wires bracing it. Galvanised steel, salt bloom, thick black
     soot staining the cowl.
 5. NEEDLE INTERCEPTOR THRUSTER. A single tight narrow cone, minimal frontal
     area, barely wider than the spine it came off. Bone-white ceramic, one
     blood-red band, hairline cracks.
 6. TRIDENT ASSAULT THRUSTER. Three small bronze nozzles in a triangle, the
     top one slightly larger, each with a fluted lip. Verdigris, green
     oxidation.
 7. VOIDWRIGHT THRUSTER. A calcined black bell crazed like burnt pottery,
     its mouth ash-glazed, with two alchemical sigils in flaking gold leaf on
     the housing. Asymmetric — the mouth is cut at an angle. Void black over
     charcoal.
 8. OBSIDIAN REAVER THRUSTER. A knapped obsidian nozzle with flat conchoidal
     fracture faces instead of a round bell, every edge glass-sharp. Glossy
     black, pale grey fracture edges, one gold sigil.
 9. ECLIPSE BATTLECRUISER THRUSTER. An annular drive ring with a genuinely
     hollow centre you can see straight through, held by three spars. Void
     black, one thin ring of gold corona light around the inner rim only.
10. GLASSREEF CHOIR THRUSTER. A fluted cilia fan — dozens of soft trailing
     filaments spreading left, no mechanical parts anywhere. Aquamarine,
     coral pink filament tips, bioluminescence at the base joint only.
11. ABYSSAL CHOIR THRUSTER. A cluster of riveted pressure jets set deep
     between carapace plates, barnacles crusting the rims. Abyssal black,
     pale bone, one dim lure-light.
12. EMBERWAKE SWARM THRUSTER. NOT one object — a dispersed trail of exactly
     fourteen individual glowing motes in loose formation spreading left,
     gaps between every one. Charcoal cores, ember-orange glow. Green node
     dot at the right-hand end of the trail.
13. SOL FLAGSHIP THRUSTER. A gold censer trailing hard-light rays instead of
     smoke, wearing a crown of six short spines, with a brass armillary ring
     at its throat. Solar gold, white, plasma blue, gold leaf flaking.
14. PLASMA CRUISER THRUSTER. A brass bell with a small containment sphere at
     its throat held in one gimbal ring, ivory fluting down the housing.
     Brass and warm ivory, plasma blue inside the sphere only.
15. AI BATTLESHIP THRUSTER. Cold exact repetition: exactly twelve identical
     circular vents in a perfect three-by-four grid, seamless, no wear, no
     soot. Matte bone white, thin graphite seams, cold cyan inside each vent,
     all identical.
16. CYBER DREADNOUGHT THRUSTER. The same at capital scale: a slab drive face
     of exactly twenty-four identical vents in four rows of six,
     mathematically spaced. Matte bone white, graphite seams, cold cyan.
```

---

### SHEET 7 — ALL 16 SHIELDS (16 objects, 4 rows of 4)

⭐ All 16 shields in one frame IS the pair test — any two houses that are confusable show up in the same glance.

```
LAYOUT — READ CAREFULLY, THE SLICER DEPENDS ON IT:
- ONE SINGLE IMAGE at the HIGHEST RESOLUTION you can produce.
- Exactly 16 separate objects arranged in a 4x4 grid, 4 rows of 4,
  filled left to right then top to bottom.
- WIDE EMPTY MAGENTA GUTTERS between every object. They must NEVER touch,
  overlap, or share an edge. Equal spacing, roughly aligned rows.
- BACKGROUND: flat pure MAGENTA #FF00FF, absolutely nothing else on it.
- ⛔ DO NOT DRAW NUMBERS, LABELS, CAPTIONS, TITLES, BORDERS OR A FRAME. The
  grid positions carry the numbering. Any drawn text becomes a stray object.
- Every object faces RIGHT, top-down orthographic, and all 16 are drawn at
  CONSISTENT RELATIVE SCALE so they can be compared side by side.

- NODE MARKER: exactly ONE solid pure green #00FF00 filled circle per object,
  flat, no outline, no glow, drawn ON TOP of the finished art, at the face where
  that module BOLTS ONTO THE HULL — the REAR face for forward-pointing parts,
  the FRONT face for a thruster. USE PURE GREEN NOWHERE ELSE.
- ⛔ IT IS ALWAYS WARSHIP HARDWARE. Where a description names a real-world
  object, that object gives PROPORTION AND MASS ONLY — never draw the object
  itself. No animals, no tools, no hand weapons, no creatures, no faces.
- EPIC CAPITAL REGISTER: one big readable primary mass, then dense fine detail
  on top — panel grids, greeble, catwalks, radiator fins, machined recesses.
  Thin lines of cold seam-light between plates. Matte industrial plate, never
  chrome. Futuristic, sculptural, monumental.
- MOUNTING POINTS ARE REAL ARCHITECTURE: draw an actual built mount — a
  recessed circular collar, a gimbal ring, a keyed flange with bolt holes —
  and place the green dot in its centre. The mount is the art; the dot only
  marks its centre.
- MYSTERY LAYER: etched glyph bands, ritual geometry and concentric rings
  worked into the plating as ENGRAVING AND STRUCTURE. Invented symbols only —
  no real alphabets, no readable text.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare, no shadow, no glow
  spill, no ground, no scene.
- Each object must stay identifiable when filled in as pure black.

THE 16 OBJECTS, IN GRID ORDER:
 1. IRONWAKE FLEET SHIELD. A section of the armour belt itself, unbolted and
     remounted: riveted, three reinforcing ribs, two rows of tiny cold-white
     running lights. Steel blue over near-black, one long tug scar.
 2. HAMMERHEAD DREADNOUGHT SHIELD. A flat rectangular armour slab with heavy
     bevelled edges and four corner bolts. Gunmetal, one corner chipped to
     bare metal.
 3. TITAN DREADNOUGHT SHIELD. The largest plate in the fleet: seven layered
     composite courses, a walkway railing across the top, four lifting eyes,
     one unrepaired gouge crossing three courses. Steel blue and near-black.
 4. DEEPIRON CARTEL SHIELD. A bolted-on scrap plate, obviously salvaged —
     uneven edges, three mismatched patches welded over old holes. Galvanised
     steel, salt bloom, oxide-red flaking, one amber hazard chevron.
 5. NEEDLE INTERCEPTOR SHIELD. A narrow angled deflector vane presented
     knife-edge on, meant to glance hits aside rather than stop them.
     Bone-white ceramic, one blood-red band.
 6. TRIDENT ASSAULT SHIELD. A three-panel folding shield with two visible
     bronze hinges, the centre panel largest. Verdigris, green oxidation in
     the hinges.
 7. VOIDWRIGHT SHIELD. A calcined black plate crazed like burnt pottery,
     with exactly five alchemical sigils etched across it in gold leaf, most
     of it flaked away. Asymmetric — one edge is burnt further than the
     other. Void black over charcoal.
 8. OBSIDIAN REAVER SHIELD. A knapped obsidian plate, one enormous
     conchoidal fracture face, glass-sharp edges, no curves. Glossy black,
     pale grey fracture edges, one gold sigil.
 9. ECLIPSE BATTLECRUISER SHIELD. A large circular occulting disc in a
     gimbal ring you can see straight through, held on two spars. Void black,
     one thin ring of gold corona light around the rim only.
10. GLASSREEF CHOIR SHIELD. A curved translucent membrane, iridescent, with
     a fine organic vein network branching through it. Aquamarine and pearl,
     coral pink veins, bioluminescence in the base seam only.
11. ABYSSAL CHOIR SHIELD. A colossal riveted carapace plate, five
     overlapping courses, barnacles and deep pressure scoring across the
     face. Abyssal black, pale bone, one dim lure-light.
12. EMBERWAKE SWARM SHIELD. NOT one object — a loose lattice of exactly ten
     small plates held in formation with clear gaps between every one.
     Charcoal, ember-orange fracture edges, one plate larger than the rest.
     Green node dot at the lattice's rear.
13. SOL FLAGSHIP SHIELD. A gold monstrance disc wearing a crown of twelve
     short radiating spines, a bright plasma core at its centre, a brass
     armillary ring around its rim. Solar gold and white, plasma blue, gold
     leaf flaking.
14. PLASMA CRUISER SHIELD. A brass-framed ivory plate with a containment
     sphere at its centre held in two gimbal rings. Brass and warm ivory,
     blindingly bright plasma blue inside the sphere only.
15. AI BATTLESHIP SHIELD. Cold exact repetition: exactly sixteen identical
     square panels in a perfect four-by-four grid, seamless, no wear, no
     rivets, no damage. Matte bone white, thin graphite seams, one cold cyan
     line per panel, all identical.
16. CYBER DREADNOUGHT SHIELD. The same at capital scale: a slab of exactly
     thirty-six identical panels in six rows of six, mathematically spaced,
     utterly uniform. Matte bone white, graphite seams, cold cyan.
```

---
## APPENDIX — ONE-AT-A-TIME BATCHES (fallback)

⚠ **Sheet mode above replaces these.** They remain for **regenerating a single
part that failed**, and because the projectiles live in batch 2 items 7–10.
Same descriptions, one image each.

---
## BATCH 1 — CORE HULLS, SUBJECTS 1–10
### ⭐ the silhouette batch. Everything else depends on these landing.

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic view of a CAPITAL WARSHIP HULL. Single object, centred,
  FACING RIGHT.
- SCALE: this is a city with engines, not a fighter. Show counted deck levels,
  rows of tiny running lights, antenna masts, hangar mouths, armour belts,
  panel seams, tug scars. It must feel enormous and slow.
- NODE MARKERS (REQUIRED): mark every place a module bolts onto this hull with
  a SOLID PURE GREEN #00FF00 FILLED CIRCLE, flat colour, no outline, no glow,
  drawn ON TOP of the finished artwork. Bigger circle = bigger hardpoint. Put
  one at the forward gun position, one at each side module bay, and one at the
  stern drive mount. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET — CORE HULL. House Ironwake, the line fleet. A ship of the
   line built like a floating foundry: a long armoured wedge with exactly four
   stepped deck levels rising toward the stern, a riveted armour belt running
   the full length at the waterline, and two rows of tiny cold-white running
   lights along each flank. Steel blue over near-black burnished plate. One
   long tug scar gouged across the port belt, never repaired.

2. HAMMERHEAD DREADNOUGHT — CORE HULL. House Ironwake. HAMMERHEAD PROPORTIONS,
   never a hammer: a wide blunt T-bar bow crossing the entire front of the ship,
   sensor towers at both extreme tips, narrowing hard to a tapered stern.
   Three deck levels. Gunmetal with the leading edge chipped down to bare metal.
   The port tip is visibly shorter than starboard — sheared off and squared flat
   in a refit.

3. TITAN DREADNOUGHT — CORE HULL. House Ironwake, apex capital. The single
   largest hull in the fleet: a slab-sided fortress with exactly six deck
   levels, two hangar mouths open on the flank, four antenna masts, and an
   armour belt so thick it has its own walkway. Steel blue and near-black, one
   cold white accent. Whole plate sections are mismatched shades — this ship has
   been rebuilt more than once.

4. DEEPIRON CARTEL — CORE HULL. House Ironwake, the industrial arm. The
   ANVIL PROPORTIONS, never an anvil: a heavy squared mass forward, a deep
   sagging belly aft. Built from three stacked pressure drums bolted
   through external ladder frames — the middle drum is visibly newer and a
   different shade, an obvious replacement. Galvanised steel gone dull, white
   salt bloom creeping out of every weld seam, oxide-red primer showing in long
   vertical flake streaks. One amber beacon on a stalk, off-centre to port.

5. NEEDLE INTERCEPTOR — CORE HULL. House Ironwake, light hull. EPEE
   PROPORTIONS: extremely long and thin, barely wider than its own spine, one
   deck level only, drawn to a fine tapered point at the bow. Exactly three
   small dorsal fins in a row.
   Bone-white ceramic with hairline stress cracks running lengthwise. One narrow
   blood-red band circling the hull a third of the way back from the bow.

6. TRIDENT ASSAULT — CORE HULL. House Ironwake, boarding hull. A bronze
   eel-spear: three prows forward, the centre one twice the length of the two
   outer, with deep notches between them and boarding ramps folded into each
   notch. Verdigris bronze, green oxidation pooled in the notches. The two outer
   prows are barbed inward; the centre one is smooth.

7. VOIDWRIGHT — CORE HULL. House Voidwright, Nigredo, the blackening. A hull
   that has been through fire: calcined black, ash-glazed, its plating crazed
   like burnt pottery. Deliberately asymmetric — the starboard side carries a
   heavy sensor spine, the port side is bare. Exactly five alchemical sigils
   etched into the dorsal plating in gold leaf, most of it flaked away. Void
   black over charcoal, gold accent.

8. OBSIDIAN REAVER — CORE HULL. House Voidwright. A raider hull whose PLATING
   is cut in flat angular fracture facets like knapped obsidian: no flat panels,
   every edge glass-sharp, no curves anywhere. Two deck levels, both cut into the
   stone rather than built up. Glossy black with pale grey fracture edges, one
   gold sigil at the bow.

9. ECLIPSE BATTLECRUISER — CORE HULL. House Voidwright. A hull built around a
   single enormous circular occulting disc amidships, held in a gimbal ring you
   can see straight through. Four thin spars connect the bow to the stern past
   the disc. Void black, one thin ring of gold corona light around the disc's
   rim only. Three deck levels forward, none aft.

10. GLASSREEF CHOIR — CORE HULL. House Glassreef, Rubedo, the reddening. Grown,
    not built: a rounded living hull of coral and glass with exactly seven soft
    lobes around its rim, no straight line anywhere. Translucent aquamarine over
    pearl, coral pink in the lobes. Bioluminescent light shows ONLY in the seams
    between lobes, never on the lobes themselves. Living coral is growing on the
    port side and not the starboard.
```

---

## BATCH 2 — CORE HULLS, SUBJECTS 11–16 + 4 PROJECTILES

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single object, centred, FACING RIGHT.
- Images 1 to 6 are CAPITAL WARSHIP HULLS: a city with engines, not a fighter.
  Counted deck levels, rows of tiny running lights, masts, hangar mouths,
  armour belts, panel seams. Enormous and slow.
- NODE MARKERS (REQUIRED, images 1-6): mark every place a module bolts on with
  a SOLID PURE GREEN #00FF00 FILLED CIRCLE, flat, no outline, no glow, drawn ON
  TOP of the artwork. Bigger circle = bigger hardpoint. One forward gun
  position, one at each side bay, one at the stern drive mount. USE PURE GREEN
  NOWHERE ELSE. Images 7-10 (projectiles) get NO green dot.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR — CORE HULL. House Glassreef, deep tier. A colossal deep-sea
   isopod under crushing pressure: thick overlapping carapace plates, riveted
   pressure-vessel construction where the living shell meets machinery, immense
   heavy bulk. Exactly five plate courses bow to stern. Abyssal black over pale
   dead bone. A single dim anglerfish lure hangs forward on a bent stalk.

2. EMBERWAKE SWARM — CORE HULL. House Glassreef. NOT one solid object — a
   dinner plate shattered and frozen mid-explosion, exactly nine separate hull
   fragments flying in loose formation with clear empty gaps between every
   piece. Each fragment has its own tiny running lights. Charcoal cores with
   ember-orange glowing along every fracture edge. One fragment is much larger
   than the other eight: the mother shard.

3. SOL FLAGSHIP — CORE HULL. House Solaris, Citrinitas. A cathedral crossed with
   an orrery: a tall narrow gold hull with exactly five stepped buttresses down
   each flank, three brass armillary rings turning around the amidships spine,
   and a monstrance crown of twelve short radiating spines at the bow. Solar
   gold and white, gold leaf flaking off the buttress ribs. A small bronze bell
   hangs at the apex of the tallest mast.

4. PLASMA CRUISER — CORE HULL. House Solaris. A brass clockwork hull built
   around a single containment sphere amidships, held in three concentric
   gimbal rings. Exactly four deck levels, all stepped down toward the bow.
   Brass and warm ivory, blindingly bright plasma blue inside the sphere only —
   nowhere else on the hull.

5. AI BATTLESHIP — CORE HULL. House Machina, Albedo, the whitening. Cold exact
   pattern with no hand in it: a hull of perfectly repeated identical modules,
   exactly eight per side, mathematically spaced, seamless, no wear, no
   asymmetry, no repair, no rivets. Unsettlingly clean. Matte bone white with
   thin graphite seams, one cold cyan strip down the spine.

6. CYBER DREADNOUGHT — CORE HULL. House Machina, apex. The same cold repetition
   at capital scale: a slab hull of exactly sixteen identical stacked cells in
   two rows of eight, each cell lit by one identical square window. No two
   things about it are different from each other. Matte bone white, graphite
   seams, cold cyan windows.

7. PROJECTILE — RAILGUN SLUG. A dense dart of depleted metal with four small
   tail fins, travelling right. Dull grey, orange heat glow at the nose only.
   No green dot.

8. PROJECTILE — PLASMA BOLT. A teardrop of contained plasma, blunt front,
   tapering tail, travelling right. Hot blue-white core, thin cyan shell. No
   green dot.

9. PROJECTILE — MORTAR SHELL. A stubby fat shell with a banded driving ring and
   a rounded nose, travelling right. Olive casing, one yellow band. No green dot.

10. PROJECTILE — HOMING DART. A slim seeker with two swept canards and a single
    glowing eye at the tip, travelling right. Bone white, magenta eye. No green
    dot.
```

> ⛔ **STOP. Run the black test and the pair test on all 16 cores before batch 3.**
> Then `python3 scripts/extract-node-points.py keyed/ --emit layout` and check
> the sockets came out where you'd expect. A hull whose dots land wrong is
> cheaper to fix now than after its five modules exist.

---

## BATCH 3 — CANNONS, SUBJECTS 1–10

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached SHIP MODULE, centred,
  FACING RIGHT. This is a weapon mount removed from its hull, not a whole ship.
  It must read as heavy capital-ship hardware: bolt flanges, a mounting collar,
  ammunition feeds, cooling ribs.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, placed at the point
  where this module BOLTS ONTO THE HULL — for a forward-pointing gun that is its
  REAR face, on the left. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET CANNON. A capital main battery: a twin-barrel turret in a
   riveted armoured mantlet with a heavy ring collar underneath, two rows of
   cooling ribs along the barrels. Steel blue over near-black, cold white accent.
   Muzzle rims worn bright.

2. HAMMERHEAD DREADNOUGHT CANNON. A squat wide-bore siege mortar sunk flush into
   a flat square mounting plate, barrel shorter than it is wide, two hold-down
   bolts each side. Gunmetal, muzzle rim worn to bare metal.

3. TITAN DREADNOUGHT CANNON. The largest gun in the fleet: a single enormous
   barrel eight deck-levels long with three reinforcing bands, a walkway railing
   running along its top, and a breech block bigger than a light hull. Steel blue
   and near-black, one mismatched replacement band.

4. DEEPIRON CARTEL CANNON. A boxy autocannon with an external ammo hopper bolted
   to its side and a belt feed sagging visibly between them. Galvanised steel
   with salt bloom, oxide-red flaking, one blackened rectangular ejection port.

5. NEEDLE INTERCEPTOR CANNON. A rail-barrel eight times longer than it is wide —
   two thin parallel rails with a visible gap of air between them. Bone-white
   ceramic, one blood-red band at the breech, a hairline crack near the muzzle.

6. TRIDENT ASSAULT CANNON. Three bronze barrels clustered in a triangle, the top
   one longer than the two below, each muzzle fluted like a trumpet bell.
   Verdigris bronze, green oxidation where the barrels meet.

7. VOIDWRIGHT CANNON. A calcined black barrel that looks fired from a kiln
   rather than machined, its surface crazed like burnt pottery, with three
   alchemical sigils in flaking gold leaf along its length. Asymmetric mounting
   — the collar sits off-centre.

8. OBSIDIAN REAVER CANNON. A knapped obsidian barrel with flat conchoidal
   fracture faces instead of a round bore, every edge glass-sharp. Glossy black,
   pale grey fracture edges, one gold sigil at the breech.

9. ECLIPSE BATTLECRUISER CANNON. An occulting projector: a small circular disc
   in a gimbal ring you can see straight through, mounted on a short spar. Void
   black, one thin ring of gold corona light around the disc's rim only.

10. GLASSREEF CHOIR CANNON. A smooth tapering organic siphon like a squid's
    funnel — no mechanical parts, no seams, no bolts. Translucent aquamarine,
    pearl at the opening, a ring of seven tiny nodules around the mouth.
    Bioluminescence in the seam at its base only.
```

---

## BATCH 4 — CANNONS, SUBJECTS 11–16 + 4 PROJECTILES

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single object, centred, FACING RIGHT.
- Images 1 to 6 are detached capital-ship WEAPON MODULES: bolt flanges, a
  mounting collar, ammunition feeds, cooling ribs. Heavy hardware, not a ship.
- NODE MARKER (REQUIRED, images 1-6): exactly ONE solid PURE GREEN #00FF00
  FILLED CIRCLE, flat, no outline, no glow, drawn ON TOP of the artwork, at the
  point where the module BOLTS ONTO THE HULL — its REAR face, on the left. USE
  PURE GREEN NOWHERE ELSE. Images 7-10 (projectiles) get NO green dot.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR CANNON. A pressure-driven harpoon launcher grown from carapace,
   thick and riveted where shell meets machinery, a barbed bone harpoon already
   loaded. Abyssal black, pale bone barb, one dim lure-light.

2. EMBERWAKE SWARM CANNON. NOT one object — a scattered cloud of exactly twelve
   tiny emitter motes in loose formation with clear gaps, collectively pointing
   right. Charcoal cores, ember-orange fracture edges. The green node dot sits
   at the rear of the formation.

3. SOL FLAGSHIP CANNON. A monstrance lance: a gold reliquary barrel wearing a
   crown of eight radiating hard-light spines at the muzzle, with a brass
   armillary ring turning around its midpoint. Solar gold and white, plasma blue
   at the aperture, gold leaf flaking off the collar.

4. PLASMA CRUISER CANNON. A brass clockwork gun built around a small containment
   sphere at the breech, held in two gimbal rings, with a fluted ivory barrel.
   Brass and warm ivory, blindingly bright plasma blue inside the sphere only.

5. AI BATTLESHIP CANNON. Cold exact repetition: exactly six identical short
   barrels in one mathematically even row, seamless, no wear, no rivets, no
   asymmetry. Matte bone white, thin graphite seams, one cold cyan aperture per
   barrel, all identical.

6. CYBER DREADNOUGHT CANNON. The same cold repetition at capital scale: a slab
   battery of exactly twelve identical apertures in two rows of six, perfectly
   spaced. Matte bone white, graphite seams, cold cyan.

7. PROJECTILE — SHOTGUN PELLET SPREAD. Five blunt pellets in a widening fan
   travelling right. Dull grey, orange trailing edges. No green dot.

8. PROJECTILE — BEAM SEGMENT. A straight hard-edged bar of light, brightest
   along its centre line, squared at both ends so segments tile end to end.
   White core, cyan shell. No green dot.

9. PROJECTILE — TORPEDO. A long finned torpedo, rounded nose, four tail fins,
   travelling right. Olive body, one cyan band. No green dot.

10. PROJECTILE — MINE. A round spiked sea-mine, exactly eight spikes evenly
    around it, no facing direction. Rust brown, one red eye at the centre. No
    green dot.
```

---

## BATCH 5 — PODS, SUBJECTS 1–10

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached SHIP MODULE, centred,
  FACING RIGHT. A capacity cell removed from its hull: rounded, contained,
  storing something. It must read as NON-threatening — no barrels, no points,
  no blades. Capital-ship hardware: bolt flanges, banding straps, access hatches.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the point where
  this module BOLTS ONTO THE HULL. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET POD. An armoured cell that continues the hull's armour belt
   across its face, two banding straps, one access hatch with a wheel. Steel
   blue over near-black, two tiny cold-white running lights.

2. HAMMERHEAD DREADNOUGHT POD. A rounded canister clamped flat under a squared
   bracket with two bolts. Gunmetal, chipped edges, one cyan level window.

3. TITAN DREADNOUGHT POD. A capital magazine cell the size of a small hull:
   three banding straps, a walkway railing across the top, four lifting eyes.
   Steel blue and near-black, one mismatched replacement panel.

4. DEEPIRON CARTEL POD. A horizontal cylindrical pressure tank with two banding
   straps and one large hand-wheel valve on the end cap. Galvanised steel, salt
   bloom at the welds, an amber hazard chevron stencilled on the side.

5. NEEDLE INTERCEPTOR POD. A slim tapered spindle streamlined almost into
   invisibility, four times longer than it is wide. Bone-white ceramic, one
   blood-red band, hairline cracks.

6. TRIDENT ASSAULT POD. A trilobed module — three rounded bronze lobes fused
   into one body, verdigris pooled in the two seams between them.

7. VOIDWRIGHT POD. A calcined black vessel crazed like burnt pottery, with two
   alchemical sigils in flaking gold leaf on its face. Asymmetric — one side
   swells more than the other. Void black over charcoal, gold accent.

8. OBSIDIAN REAVER POD. A knapped obsidian cell with flat conchoidal fracture
   faces, glass-sharp edges, no curves. Glossy black, pale grey fracture edges,
   one gold sigil.

9. ECLIPSE BATTLECRUISER POD. A small circular occulting disc in a gimbal ring
   you can see straight through, mounted flush. Void black, one thin ring of
   gold corona light around the rim only.

10. GLASSREEF CHOIR POD. A translucent bulbous egg-sac with three darker
    embryos suspended visibly inside it. Aquamarine glass, pearl sheen, coral
    pink embryos, bioluminescence in the base seam only.
```

---

## BATCH 6 — PODS, SUBJECTS 11–16 + 4 PROJECTILES

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single object, centred, FACING RIGHT.
- Images 1 to 6 are detached capital-ship CAPACITY MODULES: rounded, contained,
  non-threatening. Bolt flanges, banding straps, access hatches. No barrels, no
  points, no blades.
- NODE MARKER (REQUIRED, images 1-6): exactly ONE solid PURE GREEN #00FF00
  FILLED CIRCLE, flat, no outline, no glow, drawn ON TOP of the artwork, at the
  point where the module BOLTS ONTO THE HULL. USE PURE GREEN NOWHERE ELSE.
  Images 7-10 (projectiles) get NO green dot.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR POD. A riveted pressure bladder slung under carapace plating,
   straining visibly at its two bands. Abyssal black, pale bone ribs, one dim
   lure-light.

2. EMBERWAKE SWARM POD. NOT one object — a tight clump of exactly seven small
   spheres held in formation with visible gaps, not fused. Charcoal with
   ember-orange fracture edges, one sphere brighter than the rest. The green
   node dot sits at the clump's rear.

3. SOL FLAGSHIP POD. A gold reliquary casket with a domed lid, four kneeling
   figure-shaped buttresses, and a brass armillary ring around its waist. Solar
   gold and white, plasma blue light escaping the lid seam, gold leaf flaking.

4. PLASMA CRUISER POD. A brass containment sphere in two concentric gimbal
   rings on an ivory cradle. Brass and warm ivory, blindingly bright plasma blue
   inside the sphere only.

5. AI BATTLESHIP POD. Cold exact repetition: exactly nine identical small cells
   in a perfect three-by-three grid, seamless, no wear, no rivets. Matte bone
   white, thin graphite seams, one cold cyan window per cell, all identical.

6. CYBER DREADNOUGHT POD. The same at capital scale: a slab of exactly twenty
   identical cells in four rows of five, mathematically spaced. Matte bone
   white, graphite seams, cold cyan windows.

7. PROJECTILE — ACID GLOBULE. An irregular blob of caustic fluid mid-flight,
   slightly teardropped by its own motion, travelling right. Rot green, one pale
   highlight. No green dot.

8. PROJECTILE — ICE SHARD. A sharp angular crystal splinter with hard flat
   facets, travelling right. Pale cyan, white core, no glow. No green dot.

9. PROJECTILE — FLAK BURST. A ragged star of hot fragments frozen at the instant
   of detonation, no facing direction. Ember orange, charcoal specks. No green
   dot.

10. PROJECTILE — CHAIN LIGHTNING ARC. A jagged bolt travelling right with
    exactly three branches off one main trunk. White core, violet fringe. No
    green dot.
```

---

## BATCH 7 — SPIKES, SUBJECTS 1–10

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached SHIP MODULE, centred,
  POINTING RIGHT. A ram or boarding spike removed from its hull: sharp, strongly
  directional, obviously dangerous. Capital-ship hardware — a heavy mounting
  base where it meets the hull.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the REAR mounting
  base on the left. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET SPIKE. A riveted ram prow that continues the armour belt to a
   squared point, three reinforcing ribs, a walkway railing along the top. Steel
   blue over near-black.

2. HAMMERHEAD DREADNOUGHT SPIKE. A broad flat chisel blade, wide and squared,
   NOT a needle. Gunmetal, cutting edge burnished bright from use.

3. TITAN DREADNOUGHT SPIKE. A capital ram the size of a light hull: blunt,
   massive, more mass than point, with four reinforcing bands and a mismatched
   replacement plate near the tip. Steel blue and near-black.

4. DEEPIRON CARTEL SPIKE. An industrial breaching drill bit with a heavy helical
   flute. Galvanised steel, salt bloom, oxide-red flaking, tip worn bright.

5. NEEDLE INTERCEPTOR SPIKE. A single hair-fine stiletto point, absurdly thin,
   nearly a line. Bone-white ceramic, one blood-red band at its base.

6. TRIDENT ASSAULT SPIKE. A three-pointed barbed boarding head, centre point
   longest, the two outer points barbed inward. Verdigris bronze, green in the
   notches.

7. VOIDWRIGHT SPIKE. A calcined black spar crazed like burnt pottery, tapering
   to a point, with two alchemical sigils in flaking gold leaf. Asymmetric — it
   curves slightly to port. Void black over charcoal, gold accent.

8. OBSIDIAN REAVER SPIKE. A knapped obsidian blade with flat conchoidal fracture
   faces and a glass-sharp edge, exactly the shape of a struck flake. Glossy
   black, pale grey fracture edges, one gold sigil at the base.

9. ECLIPSE BATTLECRUISER SPIKE. A thin spar carrying a small circular occulting
   disc near its tip, the disc in a gimbal you can see through. Void black, one
   thin gold corona ring around the disc rim only.

10. GLASSREEF CHOIR SPIKE. A curved stingray barb, organic and tapering, fine
    serration along its inner curve. Aquamarine, coral pink tip, bioluminescence
    in the base joint only.
```

---

## BATCH 8 — SPIKES, SUBJECTS 11–16 + 4 PROJECTILES

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single object, centred, POINTING RIGHT.
- Images 1 to 6 are detached capital-ship RAM/BOARDING SPIKES: sharp, strongly
  directional, with a heavy mounting base where they meet the hull.
- NODE MARKER (REQUIRED, images 1-6): exactly ONE solid PURE GREEN #00FF00
  FILLED CIRCLE, flat, no outline, no glow, drawn ON TOP of the artwork, at the
  REAR mounting base on the left. USE PURE GREEN NOWHERE ELSE. Images 7-10
  (projectiles) get NO green dot.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR SPIKE. A colossal barbed bone ram grown out of layered
   carapace, riveted where bone meets plate. Abyssal black, pale bone, one dim
   lure-light at the base.

2. EMBERWAKE SWARM SPIKE. NOT one object — a spray of exactly eleven small sharp
   shards in loose formation with gaps between them, collectively pointing
   right. Charcoal, ember-orange fracture edges. Green node dot at the rear of
   the spray.

3. SOL FLAGSHIP SPIKE. A hard-light lance spine radiating from a gold collar,
   straight and blindingly sharp, with a brass armillary ring at its base. Solar
   gold, white, plasma blue at the point, gold leaf flaking off the collar.

4. PLASMA CRUISER SPIKE. A fluted ivory lance with a small brass containment
   sphere at its base held in one gimbal ring. Brass and warm ivory, plasma blue
   inside the sphere only.

5. AI BATTLESHIP SPIKE. Cold exact repetition: exactly five identical points in
   a mathematically even row, seamless, no wear, no asymmetry. Matte bone white,
   thin graphite seams, one cold cyan line.

6. CYBER DREADNOUGHT SPIKE. The same at capital scale: a slab ram faced with
   exactly fifteen identical points in three rows of five, perfectly spaced.
   Matte bone white, graphite seams, cold cyan.

7. PROJECTILE — ENERGY LANCE. A long straight spear of coherent light tapering
   to a fine point on the right, blunt at the left. White core, cyan fringe. No
   green dot.

8. PROJECTILE — SHRAPNEL BURST. An irregular scatter of nine jagged metal
   fragments radiating outward, no single facing. Dull grey, orange hot edges.
   No green dot.

9. PROJECTILE — VOID TEAR. A narrow vertical slit in space, void black inside,
   edged with fracturing white cracks, deep violet bleed. No facing. No green
   dot.

10. PROJECTILE — SEEKER SWARM CLUSTER. Six tiny darts flying in a loose arrow
    formation with gaps between them, all facing right. Bone white, magenta
    eyes. No green dot.
```

---

## BATCH 9 — THRUSTERS, SUBJECTS 1–10

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached SHIP MODULE, centred. The
  ship faces RIGHT, so the thruster's OPENING faces LEFT, away from travel.
- A capital-ship drive nacelle removed from its hull: flared, open at the back,
  with a heavy mounting pylon at its front. Draw the HARDWARE ONLY — no long
  flame plume.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the FRONT mounting
  pylon on the RIGHT (a thruster bolts on at its front). USE PURE GREEN NOWHERE
  ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET THRUSTER. A riveted drive nacelle with exactly eight square
   vents in one row across its mouth, two rows of tiny cold-white running lights
   along the housing. Steel blue over near-black, soot-blackened vent rims.

2. HAMMERHEAD DREADNOUGHT THRUSTER. A wide rectangular exhaust bank, exactly
   eight small square vents in one row. Gunmetal, vent rims soot-blackened.

3. TITAN DREADNOUGHT THRUSTER. A capital drive the size of a light hull: one
   enormous bell mouth with four reinforcing bands, a walkway railing around the
   housing, and one mismatched replacement band. Steel blue and near-black.

4. DEEPIRON CARTEL THRUSTER. A heavy riveted exhaust stack with a soot cowl and
   two guy-wires bracing it. Galvanised steel, salt bloom, thick black soot
   staining the cowl.

5. NEEDLE INTERCEPTOR THRUSTER. A single tight narrow cone, minimal frontal
   area, barely wider than the spine it came off. Bone-white ceramic, one
   blood-red band, hairline cracks.

6. TRIDENT ASSAULT THRUSTER. Three small bronze nozzles in a triangle, the top
   one slightly larger, each with a fluted lip. Verdigris, green oxidation.

7. VOIDWRIGHT THRUSTER. A calcined black bell crazed like burnt pottery, its
   mouth ash-glazed, with two alchemical sigils in flaking gold leaf on the
   housing. Asymmetric — the mouth is cut at an angle. Void black over charcoal.

8. OBSIDIAN REAVER THRUSTER. A knapped obsidian nozzle with flat conchoidal
   fracture faces instead of a round bell, every edge glass-sharp. Glossy black,
   pale grey fracture edges, one gold sigil.

9. ECLIPSE BATTLECRUISER THRUSTER. An annular drive ring with a genuinely hollow
   centre you can see straight through, held by three spars. Void black, one
   thin ring of gold corona light around the inner rim only.

10. GLASSREEF CHOIR THRUSTER. A fluted cilia fan — dozens of soft trailing
    filaments spreading left, no mechanical parts anywhere. Aquamarine, coral
    pink filament tips, bioluminescence at the base joint only.
```

---

## BATCH 10 — THRUSTERS, SUBJECTS 11–16 *(short batch — 6 images)*

```
Generate 6 separate images, numbered 1 to 6. Same rules for all 6.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached capital-ship DRIVE NACELLE,
  centred. The ship faces RIGHT, so the thruster's OPENING faces LEFT.
- Flared, open at the back, heavy mounting pylon at the front. HARDWARE ONLY —
  no long flame plume.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the FRONT mounting
  pylon on the RIGHT. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR THRUSTER. A cluster of riveted pressure jets set deep between
   carapace plates, barnacles crusting the rims. Abyssal black, pale bone, one
   dim lure-light.

2. EMBERWAKE SWARM THRUSTER. NOT one object — a dispersed trail of exactly
   fourteen individual glowing motes in loose formation spreading left, gaps
   between every one. Charcoal cores, ember-orange glow. Green node dot at the
   right-hand end of the trail.

3. SOL FLAGSHIP THRUSTER. A gold censer trailing hard-light rays instead of
   smoke, wearing a crown of six short spines, with a brass armillary ring at
   its throat. Solar gold, white, plasma blue, gold leaf flaking.

4. PLASMA CRUISER THRUSTER. A brass bell with a small containment sphere at its
   throat held in one gimbal ring, ivory fluting down the housing. Brass and
   warm ivory, plasma blue inside the sphere only.

5. AI BATTLESHIP THRUSTER. Cold exact repetition: exactly twelve identical
   circular vents in a perfect three-by-four grid, seamless, no wear, no soot.
   Matte bone white, thin graphite seams, cold cyan inside each vent, all
   identical.

6. CYBER DREADNOUGHT THRUSTER. The same at capital scale: a slab drive face of
   exactly twenty-four identical vents in four rows of six, mathematically
   spaced. Matte bone white, graphite seams, cold cyan.
```

---

## BATCH 11 — SHIELDS, SUBJECTS 1–10

```
Generate 10 separate images, numbered 1 to 10. Same rules for all 10.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached SHIP MODULE, centred, its
  protective face pointing RIGHT.
- A capital-ship defensive plate or projector removed from its hull: broad,
  obviously protective, with a heavy mounting bracket behind it. It should look
  like it ABSORBS, not attacks. No points, no barrels.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the REAR mounting
  bracket on the left. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. IRONWAKE FLEET SHIELD. A section of the armour belt itself, unbolted and
   remounted: riveted, three reinforcing ribs, two rows of tiny cold-white
   running lights. Steel blue over near-black, one long tug scar.

2. HAMMERHEAD DREADNOUGHT SHIELD. A flat rectangular armour slab with heavy
   bevelled edges and four corner bolts. Gunmetal, one corner chipped to bare
   metal.

3. TITAN DREADNOUGHT SHIELD. The largest plate in the fleet: seven layered
   composite courses, a walkway railing across the top, four lifting eyes, one
   unrepaired gouge crossing three courses. Steel blue and near-black.

4. DEEPIRON CARTEL SHIELD. A bolted-on scrap plate, obviously salvaged — uneven
   edges, three mismatched patches welded over old holes. Galvanised steel, salt
   bloom, oxide-red flaking, one amber hazard chevron.

5. NEEDLE INTERCEPTOR SHIELD. A narrow angled deflector vane presented
   knife-edge on, meant to glance hits aside rather than stop them. Bone-white
   ceramic, one blood-red band.

6. TRIDENT ASSAULT SHIELD. A three-panel folding shield with two visible bronze
   hinges, the centre panel largest. Verdigris, green oxidation in the hinges.

7. VOIDWRIGHT SHIELD. A calcined black plate crazed like burnt pottery, with
   exactly five alchemical sigils etched across it in gold leaf, most of it
   flaked away. Asymmetric — one edge is burnt further than the other. Void
   black over charcoal.

8. OBSIDIAN REAVER SHIELD. A knapped obsidian plate, one enormous conchoidal
   fracture face, glass-sharp edges, no curves. Glossy black, pale grey fracture
   edges, one gold sigil.

9. ECLIPSE BATTLECRUISER SHIELD. A large circular occulting disc in a gimbal
   ring you can see straight through, held on two spars. Void black, one thin
   ring of gold corona light around the rim only.

10. GLASSREEF CHOIR SHIELD. A curved translucent membrane, iridescent, with a
    fine organic vein network branching through it. Aquamarine and pearl, coral
    pink veins, bioluminescence in the base seam only.
```

---

## BATCH 12 — SHIELDS, SUBJECTS 11–16 *(short batch — 6 images)*

```
Generate 6 separate images, numbered 1 to 6. Same rules for all 6.

RULES FOR EVERY IMAGE:
- Top-down orthographic game asset. Single detached capital-ship DEFENSIVE
  PLATE, centred, its protective face pointing RIGHT.
- Broad, obviously protective, heavy mounting bracket behind it. It should look
  like it ABSORBS, not attacks. No points, no barrels.
- NODE MARKER (REQUIRED): exactly ONE solid PURE GREEN #00FF00 FILLED CIRCLE,
  flat, no outline, no glow, drawn ON TOP of the artwork, at the REAR mounting
  bracket on the left. USE PURE GREEN NOWHERE ELSE IN THE IMAGE.
- ⛔ IT IS ALWAYS A WARSHIP. Where a description names a real-world object,
  that object gives PROPORTION AND MASS ONLY — never draw the object itself.
  "Anvil proportions" means a heavy squared bow and a deep sagging stern. It does
  NOT mean an anvil in space. No animals, no tools, no hand weapons, no
  creatures, no furniture, no faces. If in doubt, draw the warship.
- EPIC CAPITAL REGISTER: ONE huge simple primary mass that reads instantly at
  thumbnail size, then dense fine detail discovered on top of it — panel grids,
  greeble clusters, catwalks, radiator fins, machined recesses. Long dorsal
  spines and sweeping structural architecture. A few thin lines of cold
  seam-light glowing between plates. Matte industrial plate, never chrome.
  Futuristic, sculptural, monumental, purposeful.
- SCALE CUES ARE WHAT MAKE IT EPIC: rows of lights and hangar mouths drawn so
  small they imply a hull kilometres long. Big shape first, tiny detail second.
- MOUNTING POINTS MUST BE REAL ARCHITECTURE. Draw each hardpoint as an actual
  built mount — a recessed circular collar sunk into the plating, a gimbal ring,
  a keyed flange with bolt holes — so it visibly exists to receive a module.
  THEN place the flat green dot exactly in its centre. The mount is the art; the
  dot only marks its centre.
- MYSTERY LAYER: this fleet comes from a mystery school. Work etched glyph
  bands, ritual geometry, concentric rings and reliquary structure into the
  plating as ENGRAVING AND ARCHITECTURE. Invented symbols only — no real
  alphabets, no real occult marks, no readable text.
- TRANSPARENT background. If you cannot do transparency, use a FLAT PURE
  MAGENTA #FF00FF background with absolutely nothing else on it.
- No shadow, no glow spill, no ground, no scene, no text, no border, no frame.
- Flat vector illustration, hard clean edges, 3-5 flat colours plus one bright
  accent. No photorealism, no soft gradients, no lens flare.
- Must stay identifiable when filled in as a pure black silhouette.
- Square image, object fills about 85% of the frame.

1. ABYSSAL CHOIR SHIELD. A colossal riveted carapace plate, five overlapping
   courses, barnacles and deep pressure scoring across the face. Abyssal black,
   pale bone, one dim lure-light.

2. EMBERWAKE SWARM SHIELD. NOT one object — a loose lattice of exactly ten small
   plates held in formation with clear gaps between every one. Charcoal,
   ember-orange fracture edges, one plate larger than the rest. Green node dot at
   the lattice's rear.

3. SOL FLAGSHIP SHIELD. A gold monstrance disc wearing a crown of twelve short
   radiating spines, a bright plasma core at its centre, a brass armillary ring
   around its rim. Solar gold and white, plasma blue, gold leaf flaking.

4. PLASMA CRUISER SHIELD. A brass-framed ivory plate with a containment sphere
   at its centre held in two gimbal rings. Brass and warm ivory, blindingly
   bright plasma blue inside the sphere only.

5. AI BATTLESHIP SHIELD. Cold exact repetition: exactly sixteen identical square
   panels in a perfect four-by-four grid, seamless, no wear, no rivets, no
   damage. Matte bone white, thin graphite seams, one cold cyan line per panel,
   all identical.

6. CYBER DREADNOUGHT SHIELD. The same at capital scale: a slab of exactly
   thirty-six identical panels in six rows of six, mathematically spaced, utterly
   uniform. Matte bone white, graphite seams, cold cyan.
```

---
---

## AFTER THE IMAGES COME BACK

1. **Key the background** if they came back magenta:
   `python3 scripts/key-flat-background.py ~/Downloads/batch1 --colour FF00FF`
   The script reports subject coverage per file and flags anything suspect — a
   keyer that quietly writes a blank PNG is worse than one that fails.
2. **Extract the node points:**
   `python3 scripts/extract-node-points.py keyed/ --emit layout`
   This finds the pure-green dots and prints `{ dx, dy, radius, type }` in the
   game's own units with forward `+X`. ⚠ It also **strips the green markers**
   into a clean copy, so the dots never end up traced into the art.
3. **Run the three tests.** Sort keep / reject.
4. **Trace each keeper** into the 6-part JSON pack schema — normalised
   coordinates, `r: 1.0` = node radius, **forward is +X**.
5. `node scripts/validate-pack.mjs --sheet` — renders every part in real
   Chromium and counts painted pixels.
6. ⛔ The 16 ids above **already exist** in `packs/index.json`. You are
   replacing art inside a registered pack, not adding a new one — **do not
   create a seventeenth id.**
7. ⚠ Feed the validator from the runtime roster, not a directory glob:
   `abyssal-choir` is defined inline at `js/packs.js:330` and the validator has
   never once seen it.

---
---

# ⚓ THE CAPITAL CATALOG — THE FLEET LADDER
### added 2026-08-16 · **whole hulls, sheet-batched by node count** · Grok
### ⛔ an EXTENSION of this file, never a second brief. Every law above still rules.

---

## THE RULING — Mac, 2026-08-16

> *"for modules and stuff he will be able to do the 4x4 grid properly and for
> enemy ships you can do 2x1 for larger 3-9 node ships 2x2 for 2-5 ones and 4x4
> for single node drones then capital titan, carrier, star destroyer,
> dreadnought, mother ships can all have 12-60 nodes."*

**Authorship: Mackenzie Conor James Clark.** The ladder, the densities and the
node ranges are his. Recorded verbatim so the record is unambiguous.

---

## ⭐ THE LAW UNDERNEATH THE RULING

**SHEET DENSITY IS THE INVERSE OF NODE COUNT.**

That single sentence generates the whole table. A 60-node mothership needs the
entire frame to resolve sixty distinct hardpoints; a 1-node drone needs a
sixteenth of it. Ask a generator for sixteen dreadnoughts and you get sixteen
smudges — **the density is not a convenience, it is the resolution budget.**

⭐ **And the frame share doubles as the size cue.** A skiff that fills its tile
edge-to-edge reads exactly as large as a titan that fills its own. Density and
frame share together are the only way a top-down player learns scale.

---

## 🚢 THE FLEET LADDER

| class | nodes | sheet | per image | frame share |
|---|---|---|---|---|
| **DRONE** | 1 | **4×4** | 16 | ~40% of its tile |
| **INTERCEPTOR** | 2–3 | **2×2** | 4 | ~45% of its tile |
| **CORVETTE** | 4–5 | **2×2** | 4 | ~55% of its tile |
| **FRIGATE** | 6–7 | **2×1** | 2 | ~65% of its tile |
| **CRUISER** | 8–9 | **2×1** | 2 | ~80% of its tile |
| **DESTROYER** | 12–18 | **1×1** | 1 | ~80% |
| **CARRIER** | 20–28 | **1×1** | 1 | ~88% |
| **DREADNOUGHT** | 30–40 | **1×1** | 1 | ~92% |
| **TITAN** | 45–55 | **1×1** | 1 | ~96% |
| **MOTHERSHIP** | 60 | **1×1** | 1 | ~98% |

⭐ **THE GAP FROM 9 TO 12 IS DELIBERATE.** Nothing sits between a cruiser and a
destroyer. That gap is the line between a ship you fight *with* and a ship you
fight *around*, and an empty rung makes it legible.

⭐ **THE CARRIER IS THE ONE THAT CLOSES THE LOOP** — it is the hull that launches
the 1-node drones off the 4×4 sheets. Generate those two together and a whole
gameplay system arrives in two images.

⚠ **NAMING FLAG — Mac's call.** *"Star destroyer"* is Lucasfilm's. **DESTROYER**
alone is a real naval class, entirely generic, and reads better in our register.
Used throughout below. Overrule me if you want the other word.

---

## 🔴 THE TWO LAWS THE FIRST TEST IMAGES BROKE

Both of the 2026-08-16 Grok test hulls were materially better than anything in
the current library — and both would have been **unusable**.

### 1. NO GREEN DOTS

They carry no socket geometry. `scripts/extract-node-points.py` has nothing to
read, and a gorgeous hull with no markers is wallpaper we cannot bolt a gun to.

> **Solid PURE GREEN `#00FF00` filled circle. Flat. No outline, no glow, no
> gradient. Drawn ON TOP of the finished artwork. Pure green appears NOWHERE
> else in the image.**

⭐ **PUT THE DOT ON EVERY GOLD TURRET DOME.** In this register the domes *are*
the hardpoints, so the marker is not extra work laid over the art — it is a dot
centred on something the picture already drew. **Dot size = mount size.**

⭐ **THE DOT COUNT IS THE CLASS.** A hull's rung on the ladder is not a label we
write down afterwards — it is literally how many green dots are on it. Count the
dots, know the ship.

### 2. FACING DISAGREED WITH ITSELF

Test image 1 put the cat head at the **top**; image 2 at the **bottom**. A
catalog that cannot agree which way is forward costs a hand-tagged rotation on
every asset, forever.

**RULE: PROW POINTS UP. Every hull, every tile, every sheet, no exceptions.**

Nose-up beats the engine's native forward-`+X` deliberately — generators hold
**vertical** bilateral symmetry far better than horizontal, and these are
symmetric designs. The cost is **one uniform −90° rotation at import, applied
identically to every asset**: one line in the pipeline, never a per-asset tag.

⚠ **UNBUILT.** That import rotation does not exist in `slice-sheet.py` yet. It is
one flag and it is on the list. ⛔ **Do not hand-rotate anything.**

---

## 🜃 THE REGISTER — VOIDWRIGHT AT CAPITAL SCALE

The two test hulls sit inside the existing **VOIDWRIGHT** house (🜃 Nigredo —
*burnt calcined hulls, sigil geometry etched in gold leaf*). They are not a sixth
faction; they are that house finally rendered at capital scale. Keep them there —
a new house would dilute a spine that already works.

| element | spec |
|---|---|
| hull plate | matte calcined black, near-zero specular, deep etched panel lines |
| ornament | antique gold filigree, gothic tracery, sigil geometry inlaid |
| core | violet singularity ring-bound in gold — the single brightest element |
| **turret domes** | polished gold hemispheres in symmetric ranks — **the hardpoints** |
| structure | blade-spar wings, cathedral spires, ribbed forward barrel clusters |
| figurehead | great-cat mask at the prow, gold eyes lit |
| palette | black · antique gold · violet. **Nothing else.** |

⛔ **Gold is ornament and mounts only.** The moment gold becomes the hull, the
black test dies and every ship in the fleet reads the same.

---

## 🎛 THE MODULE GRID — 4×4, AND THE GRID *IS* THE STAT TABLE

⭐ **THIS IS THE HIGHEST-LEVERAGE RULE IN THE WHOLE DOCUMENT.** If the 4×4 is
laid out deliberately, a module's stats are derivable from **where it was drawn**
instead of from tags nobody maintains. `slice-sheet.py` already records `row` and
`col` for every slice into `manifest.tsv`, so this costs nothing to harvest.

|  | **col 1 · KINETIC** | **col 2 · ENERGY** | **col 3 · EXPLOSIVE** | **col 4 · EXOTIC** |
|---|---|---|---|---|
| **row 1 · LIGHT** | autocannon | pulse laser | rocket pod | disruptor |
| **row 2 · STANDARD** | railcannon | beam emitter | torpedo rack | warp lance |
| **row 3 · HEAVY** | siege mortar | lance battery | missile bank | singularity coil |
| **row 4 · CAPITAL** | spinal driver | annihilation beam | ordnance spine | void breaker |

**Row = size class → radius, HP, mass. Column = damage type → damage, fire rate,
projectile.** Read straight off the manifest.

⚠ **A DROPPED OBJECT SHIFTS EVERY ID AFTER IT.** Position is identity in sheet
mode. **Count the objects before running `--consume`** — the slicer prints
`objects_in_sheet`, and a 4×4 that returns 15 must be re-run, never accepted.

---

## ⛔ NEGATIVE LIST — paste inside every prompt

no text · no watermark · no signature · no labels · no numbers · no UI · no HUD ·
no frame · no border · no grid lines · no ground · no shadow beneath · no
perspective floor · no 3/4 view · no cockpit interior · no human figure · no
planet · no nebula · no stars · no background gradient · no bloom bleeding to
the frame edge

⚠ **Background haze is the one that actually bites.** The keyer separates hull
from field by silhouette; a violet glow fading into the corners gives it no edge
to find. **Pure `#000000` right out to all four corners, and between every tile.**

---

## BATCH A — THE CAPITALS · 1 SHIP PER IMAGE · 5 images

⚠ **The rules are repeated inside every batch on purpose. Never make a generator
hold two halves of a prompt in its head.** Do not tidy the redundancy away.

```
Generate 5 images. Each image is ONE complete capital warship seen from
DIRECTLY ABOVE — pure top-down orthographic, no perspective, no tilt.

GLOBAL RULES — apply to all 5:
- PROW POINTS UP in every image. No exceptions.
- Background: pure #000000 solid black, edge to edge, all four corners. No
  gradient, no haze, no glow bleeding to the edge, no stars.
- Bilateral symmetry about the vertical axis.
- Palette: matte calcined BLACK hull plate, ANTIQUE GOLD ornament, VIOLET
  singularity core. Nothing else.
- The hull is BLACK. Gold is filigree, tracery and turret domes ONLY. If gold
  becomes the hull, the design has failed.
- A violet singularity ring-bound in gold sits at the ship's centre and is the
  single brightest element in the image.
- Turrets are polished GOLD HEMISPHERE DOMES arranged in symmetric ranks.
- A great-cat mask figurehead at the prow, gold eyes lit.
- Style: gothic cathedral-mechanical. Blade-spar wings, cathedral spires,
  ribbed forward barrel clusters, sigil geometry etched into the plate.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw a SOLID PURE GREEN #00FF00 FILLED CIRCLE centred on EVERY gold turret
  dome, ON TOP of the finished artwork.
- Flat green. No outline, no glow, no gradient, no transparency.
- Pure green #00FF00 appears NOWHERE else in the image.
- Dot size encodes mount size: large = capital mount, medium = standard,
  small = light.
- The DOT COUNT MUST MATCH the number given for each ship exactly.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no ground, no shadow, no perspective floor, no
3/4 view, no human, no planet, no nebula, no stars, no background gradient.

THE FIVE SHIPS:
1. DESTROYER — exactly 15 green dots: 2 large, 5 medium, 8 small. Fills ~80%
   of the frame. Lean, raked forward, armoured prow, few spires.
2. CARRIER — exactly 24 green dots: 2 large, 8 medium, 14 small. Fills ~88%.
   A broad flat spine with open launch bays down both flanks; fewer guns than
   its size suggests, because it carries drones instead.
3. DREADNOUGHT — exactly 36 green dots: 4 large, 12 medium, 20 small. Fills
   ~92%. Widest wingspan, tall spires, heavy forward barrel clusters.
4. TITAN — exactly 50 green dots: 6 large, 16 medium, 28 small. Fills ~96%.
   A fortress: layered armour terraces, ranks of domes stacked in tiers.
5. MOTHERSHIP — exactly 60 green dots: 8 large, 20 medium, 32 small. Fills
   ~98%. The apex of the fleet. Cathedral city rather than ship, the violet
   singularity at its heart the size of a small moon.
```

---

## BATCH B — LINE SHIPS · 2×1 SHEETS · 4 images, 8 ships

```
Generate 4 images. Each image is a sheet of EXACTLY 2 complete warships side
by side in ONE ROW — a 2x1 grid, left and right, equal tile widths.

GLOBAL RULES — apply to every ship in every image:
- Seen from DIRECTLY ABOVE. Pure top-down orthographic, no perspective.
- PROW POINTS UP for BOTH ships in every image. No exceptions.
- Background: pure #000000 solid black, edge to edge, all four corners, AND in
  the gap between the two ships. No gradient, no haze, no stars, no grid lines,
  no dividing rule.
- Each ship is fully separated from the other by clear black. They must never
  touch or overlap.
- Bilateral symmetry about the vertical axis, per ship.
- Palette: matte calcined BLACK hull, ANTIQUE GOLD ornament, VIOLET core.
  Nothing else. The hull is BLACK; gold is filigree and turret domes ONLY.
- Turrets are polished GOLD HEMISPHERE DOMES.
- A small great-cat mask motif at each prow.
- Style: gothic cathedral-mechanical, sigil geometry etched into the plate.
- These are MID-SIZED ships: clearly simpler than a capital. Fewer spires,
  shorter wingspan, less tracery.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw a SOLID PURE GREEN #00FF00 FILLED CIRCLE centred on EVERY gold turret
  dome, ON TOP of the finished artwork.
- Flat green. No outline, no glow, no gradient, no transparency.
- Pure green #00FF00 appears NOWHERE else in the image.
- The DOT COUNT PER SHIP MUST MATCH exactly. Dot size: medium = standard
  mount, small = light mount.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no grid lines, no ground, no shadow, no
perspective floor, no 3/4 view, no human, no planet, no nebula, no stars,
no background gradient.

THE FOUR SHEETS:
1. TWO CRUISERS. Left: 9 dots (3 medium, 6 small). Right: 8 dots (3 medium,
   5 small). Each fills ~80% of its own half. Distinct silhouettes.
2. TWO CRUISERS. Left: 9 dots (3 medium, 6 small). Right: 8 dots (2 medium,
   6 small). Distinct from sheet 1 and from each other.
3. TWO FRIGATES. Left: 7 dots (1 medium, 6 small). Right: 6 dots (1 medium,
   5 small). Each fills ~65% of its own half — visibly smaller than a cruiser.
4. TWO FRIGATES. Left: 7 dots (1 medium, 6 small). Right: 6 dots (1 medium,
   5 small). Distinct from sheet 3 and from each other.
```

---

## BATCH C — SMALL HULLS · 2×2 SHEETS · 3 images, 12 ships

```
Generate 3 images. Each image is a sheet of EXACTLY 4 complete warships in a
2x2 GRID — two rows of two, equal tiles.

GLOBAL RULES — apply to every ship in every image:
- Seen from DIRECTLY ABOVE. Pure top-down orthographic, no perspective.
- PROW POINTS UP for ALL FOUR ships in every image. No exceptions.
- Background: pure #000000 solid black, edge to edge, all four corners, AND in
  every gap between tiles. No gradient, no haze, no stars, no grid lines, no
  dividing rules.
- Each ship fully separated by clear black. They must never touch or overlap.
- Bilateral symmetry about the vertical axis, per ship.
- Palette: matte calcined BLACK hull, ANTIQUE GOLD ornament, VIOLET core.
  Nothing else. The hull is BLACK; gold is filigree and turret domes ONLY.
- Turrets are polished GOLD HEMISPHERE DOMES.
- Style: gothic cathedral-mechanical, sigil geometry etched into the plate.
- These are SMALL, FAST hulls. Minimal: a blade of a hull, little tracery,
  no spires, no barrel clusters. A tiny cat-mask motif at the prow, not a
  full figurehead.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw a SOLID PURE GREEN #00FF00 FILLED CIRCLE centred on EVERY gold turret
  dome, ON TOP of the finished artwork.
- Flat green. No outline, no glow, no gradient, no transparency.
- Pure green #00FF00 appears NOWHERE else in the image.
- The DOT COUNT PER SHIP MUST MATCH exactly. All dots SMALL — light mounts.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no grid lines, no ground, no shadow, no
perspective floor, no 3/4 view, no human, no planet, no nebula, no stars,
no background gradient.

THE THREE SHEETS:
1. FOUR CORVETTES. Dot counts, reading left-to-right then top-to-bottom:
   5, 5, 4, 4. Each fills ~55% of its tile. Four distinct silhouettes.
2. FOUR CORVETTES. Dot counts: 5, 4, 4, 4. Distinct from sheet 1.
3. FOUR INTERCEPTORS. Dot counts: 3, 3, 2, 2. Each fills ~45% of its tile —
   visibly smaller and leaner than a corvette. Single swept blade hulls.
```

---

## BATCH D — DRONES · 4×4 SHEET · 1 image, 16 drones

```
Generate 1 image: a sheet of EXACTLY 16 small drone craft in a 4x4 GRID —
four rows of four, equal tiles.

GLOBAL RULES — apply to every drone:
- Seen from DIRECTLY ABOVE. Pure top-down orthographic, no perspective.
- PROW POINTS UP for ALL SIXTEEN. No exceptions.
- Background: pure #000000 solid black, edge to edge, all four corners, AND in
  every gap between tiles. No gradient, no haze, no stars, no grid lines, no
  dividing rules.
- Each drone fully separated by clear black. They must never touch or overlap.
- Bilateral symmetry about the vertical axis, per drone.
- Palette: matte calcined BLACK hull, ANTIQUE GOLD ornament, VIOLET core.
  Nothing else.
- These are the SMALLEST craft in the fleet: one hull, one gold turret dome,
  minimal ornament, no spires, no wings beyond a single blade or fin pair.
- Each fills only ~40% of its tile, surrounded by black. That emptiness is how
  the player learns they are small.
- Sixteen DISTINCT silhouettes — dart, disc, wedge, cross, ring, blade, claw,
  spike, teardrop, arrowhead, crescent, trident, needle, fan, hook, star.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw exactly ONE SOLID PURE GREEN #00FF00 FILLED CIRCLE on each drone,
  centred on its single gold turret dome, ON TOP of the finished artwork.
- Flat green. No outline, no glow, no gradient, no transparency.
- Pure green #00FF00 appears NOWHERE else in the image.
- Exactly 16 green dots in the whole image — one per drone. All small.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no grid lines, no ground, no shadow, no
perspective floor, no 3/4 view, no human, no planet, no nebula, no stars,
no background gradient.
```

---

## BATCH E — MODULES · 4×4 SHEET · the stat table

```
Generate 1 image: a sheet of EXACTLY 16 weapon modules in a 4x4 GRID — four
rows of four, equal tiles. These are PARTS that bolt onto a warship, not
ships.

GLOBAL RULES — apply to every module:
- Seen from DIRECTLY ABOVE. Pure top-down orthographic, no perspective.
- EVERY MODULE POINTS UP — its barrel, emitter or business end faces the top
  of the image. No exceptions.
- Background: pure #000000 solid black, edge to edge, all four corners, AND in
  every gap between tiles. No gradient, no haze, no stars, no grid lines.
- Each module fully separated by clear black. They must never touch or overlap.
- Palette: matte calcined BLACK casing, ANTIQUE GOLD ornament and collar,
  VIOLET energy where the weapon is live. Nothing else.
- Every module has a visible MOUNTING COLLAR at its base — a gold ring or
  gimbal where it bolts to a hull. This is the part that must read clearly.
- Style: gothic cathedral-mechanical, sigil geometry etched into the casing.
- SIZE INCREASES DOWN THE ROWS. Row 1 modules fill ~40% of their tile,
  row 2 ~55%, row 3 ~75%, row 4 ~90%. This size ladder is the point.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw exactly ONE SOLID PURE GREEN #00FF00 FILLED CIRCLE on each module,
  centred on its MOUNTING COLLAR at the base — the point where it attaches to
  the hull. ON TOP of the finished artwork.
- Flat green. No outline, no glow, no gradient, no transparency.
- Pure green #00FF00 appears NOWHERE else in the image.
- Exactly 16 green dots — one per module. Dot size grows with row: row 1
  small, row 2 medium, row 3 large, row 4 largest.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no grid lines, no ground, no shadow, no
perspective floor, no 3/4 view, no human, no planet, no nebula, no stars,
no background gradient.

THE SIXTEEN MODULES, reading left-to-right, top row first:
ROW 1 (LIGHT):    autocannon        pulse laser         rocket pod
                  disruptor
ROW 2 (STANDARD): railcannon        beam emitter        torpedo rack
                  warp lance
ROW 3 (HEAVY):    siege mortar      lance battery       missile bank
                  singularity coil
ROW 4 (CAPITAL):  spinal driver     annihilation beam   ordnance spine
                  void breaker

Column 1 is KINETIC — barrels, breeches, shell feeds, mechanical.
Column 2 is ENERGY — emitters, lenses, coils, violet light.
Column 3 is EXPLOSIVE — tubes, racks, warheads, launch cells.
Column 4 is EXOTIC — rings, singularities, impossible geometry.
```

---

## ⛔ RUN ORDER — STOP AND TEST AFTER BATCH A

Same discipline as batches 1–2 above, for the same reason: **a register that
fails dies as a 5-image loss instead of a 34-ship loss.**

| step | batch | images | ships |
|---|---|---|---|
| 1 | **A — capitals** | 5 | 5 |
| — | ⛔ **STOP. TEST HERE.** | | |
| 2 | **B — line ships** | 4 | 8 |
| 3 | **C — small hulls** | 3 | 12 |
| 4 | **D — drones** | 1 | 16 |
| 5 | **E — modules** | 1 | 16 parts |
| | | **14 images** | **41 hulls + 16 modules** |

### The gate after batch A — all five must pass

1. **Dot test** — is there a flat pure-green dot on every dome, and does the
   count match? ⭐ **This is the pass/fail gate, not the beauty.** A stunning
   hull with no markers is wallpaper; a plain hull with correct markers is a
   ship.
2. **Prow test** — is the cat mask at the TOP in all five?
3. **Corner test** — is `#000000` clean out to all four corners?
4. **Black test** — fill it solid black. Still know the class from silhouette?
5. **32px test** — scale to 32px. Still readable? A phone never shows it bigger.
6. **Pair test** — destroyer beside dreadnought. Confusable? One is wrong.

---

## AFTER THE CATALOG COMES BACK

```
python3 scripts/slice-sheet.py "<drop folder>" --out art/sliced --consume
python3 scripts/key-flat-background.py art/sliced art/keyed
python3 scripts/contact-sheet.py art/keyed/ships --out art/contact_ships.png
python3 scripts/extract-node-points.py art/keyed/ships --emit layout
```

⭐ **A SUBFOLDER NAME IS THE CATEGORY.** Capitals and line ships into `ships/`,
hostiles into `enemy ships/`, parts into `modules/`, and the slicer files them
itself. The chain is incremental by md5 — it never renumbers what you already
have, and `--consume` deletes a sheet only after its slices exist and its hash is
written to `manifest.tsv`.

⚠ **CHECK `objects_in_sheet` BEFORE CONSUMING.** In sheet mode **position is
identity** — a 4×4 that returns 15 objects has shifted every id after the gap.
Re-run that sheet; never accept a short count.

⚠ The black-background keyer runs the **silhouette** path, not a brightness ramp.
That is deliberate: against black, distance-to-background *is* brightness, and a
ramp deletes the dark parts of a dark ship. This register is almost entirely
dark ship.

---
---

# 🜏 THE FOURTEEN — THE FACTION ROSTER
### added 2026-08-16 · **Mac's classes, his words, his ideas** · Grok

---

## THE RULING — Mac, 2026-08-16

> *"the big ships get a single image brother and abstract unique lycheetah, ai,
> chaos, black hole, cosmic light, cosmic darkness, crimson blood, amethyst
> angel, techno angels, pagan ai, ai gods, human ai gods, ai hunters, human
> hunters, hybrid fused hunters"*
>
> *"those all seem like extremely sick classes we could have bro"*

**Authorship: Mackenzie Conor James Clark.** All fourteen names are his.

✅ **"The big ships get a single image"** — already the law in BATCH A above.
Capitals are 1×1, whole frame, no sheet. Confirmed, not changed.

---

## ⭐⭐ THE ONE IDEA THAT MAKES FOURTEEN FACTIONS WORK

Fourteen factions is normally how an art library dies. Everything drifts, nothing
reads at 32px, and the player learns none of it. **Two rules stop that, and they
are the most important paragraphs in this document.**

### 1. THE CAT MASK IS THE FLEET'S HOUSE MARK — WORN IN FOURTEEN MATERIALS

⭐ **Every hull in the game carries a cat-mask motif at the prow. Only the
material changes.** Gold filigree for Amethyst Angel. A single red sensor slit
for AI Hunters. Fused chitin skull for the Hybrids. A lens flare shaped like a
mask for Cosmic Light. Rusted bone and antler for Pagan AI.

**This is what "abstract unique lycheetah" means in practice**, and it is the
whole answer to the problem: fourteen wildly different fleets still read as **one
game** because they all wear the same face. Remove it and this is an asset dump.
Keep it and it is a world.

### 2. FAMILY = SILHOUETTE. FACTION = SKIN.

⭐ **A player must be able to read the FAMILY at 32px, before they can tell which
member.** Silhouette grammar is shared inside a family; palette and material
split them. This is also what lets a generator hold it, and what lets *you* add
a fifteenth faction later without redesigning anything.

| family | members | shared silhouette grammar |
|---|---|---|
| **I · THE MACHINE** | AI · Pagan AI · AI Gods · Human AI Gods | rigid, repeated, modular — the same part many times |
| **II · THE ANGELIC** | Amethyst Angel · Techno Angels | wings and spires, vertical, cathedral proportions |
| **III · THE HUNTERS** | AI Hunters · Human Hunters · Hybrid Fused Hunters | forward-raked, barbed, asymmetric, gripping shapes |
| **IV · THE COSMIC** | Black Hole · Cosmic Light · Cosmic Darkness | rings, discs and rays — geometry, not machinery |
| **V · THE VISCERAL** | Chaos · Crimson Blood | ribbed, organic, torn, no clean repeats |

⚠ **SPLIT-ROSTER FLAG — one line, then it is your call.** The five earlier houses
(IRONWAKE · VOIDWRIGHT · GLASSREEF · SOLARIS · MACHINA) are a *different* roster
in this same file. **The Fourteen are better and they are yours.** Recommendation:
**the Fourteen are the roster**, and VOIDWRIGHT's material table is absorbed
wholesale as **AMETHYST ANGEL** — it is already exactly that ship. The other four
retire to reference. ⛔ Two live rosters is the only failure that actually costs
us anything.

---

## 🎨 THE MATERIAL TABLE — all fourteen

**Three colours per faction, never four.** That constraint is not minimalism for
its own sake — it is the only reason fourteen palettes stay distinguishable.

⛔ **PURE GREEN `#00FF00` AND PURE MAGENTA `#FF00FF` ARE RESERVED ENGINE COLOURS
AND MAY NOT APPEAR IN ANY FACTION PALETTE.** Green is the mount marker; magenta
is a background key. A faction that uses either destroys its own assets.

### ⭐ THE FIELD COLOUR IS A PROPERTY OF THE FACTION, NOT A GLOBAL SETTING

**A key only works when the background colour is absent from the subject.**
Against black, distance-to-background *is* brightness — so a black-hulled ship on
a black field has no silhouette, and the keyer's dark path has to guess. It
already ate four ships that way.

**Therefore: dark-hulled factions generate on MAGENTA `#FF00FF`. Everything else
generates on BLACK `#000000`.** Same fleet, two fields, chosen per faction.

| # | faction | hull | ornament | core / accent | field |
|---|---|---|---|---|---|
| 1 | **AI** | brushed gunmetal, panel-perfect | cyan circuit tracery, etched lattice | cold white | **magenta** |
| 2 | **PAGAN AI** | rusted iron, pitted | lashed bone + antler, burnt ochre runes | ember orange | black |
| 3 | **AI GODS** | mirror chrome, seamless | concentric floating halo rings | blinding white | black |
| 4 | **HUMAN AI GODS** | marble-white ceramic over cable | gold laurel, classical fluting | arterial red-gold | black |
| 5 | **AMETHYST ANGEL** | matte calcined black plate | antique gold filigree, sigil geometry | ring-bound violet | **magenta** |
| 6 | **TECHNO ANGELS** | white enamel + mirror glass | six wings of stacked glass panels | prismatic pale blue | black |
| 7 | **AI HUNTERS** | matte black stealth facets | **none — ornament is the tell** | thin red sensor lines | **magenta** |
| 8 | **HUMAN HUNTERS** | scavenged plate, welded patches | hand-painted sigils, exposed cabling | orange hazard stripe | black |
| 9 | **HYBRID FUSED HUNTERS** | bone-grey chitin fused to steel | grown ribs, machined seams | wet violet sinew | black |
| 10 | **BLACK HOLE** | void — hull is an *absence* | light bending round the rim | orange-white accretion | **magenta** |
| 11 | **COSMIC LIGHT** | solidified starlight, gold-white | rays as structural spars | warm sun core | black |
| 12 | **COSMIC DARKNESS** | deep indigo plate, starfields *inside* the metal | draped sail-like sheets | faint silver stars | **magenta** |
| 13 | **CHAOS** | mismatched plate, warp-torn | nothing repeats, no two mounts alike | acid yellow / burnt orange | black |
| 14 | **CRIMSON BLOOD** | lacquered arterial red over dark iron | brass ribs, hooked spurs | blood-black core | **magenta** |

⭐ **AI HUNTERS ARE THE PROOF THE SYSTEM WORKS.** They are the only faction with
*no ornament at all*, and that absence is instantly readable next to thirteen
decorated fleets. **A faction can be defined by what it refuses to wear.**

---

## 🌙 THE TONIGHT RUN — FOURTEEN FLAGSHIPS

> *"i could generate some real amazing game by the end of tonight if we do that"*

**You can.** Fourteen factions × the full ladder is 140 images and is not a
tonight job. **But the roster is.**

⭐ **ONE CAPITAL PER FACTION = 14 IMAGES = THE ENTIRE GAME'S IDENTITY.** Every
faction's palette, material, silhouette grammar and mask are decided by its
flagship, and everything smaller inherits from it. Fill the ladder downward on
another night; **tonight is the fourteen faces.**

| step | what | images |
|---|---|---|
| 1 | **AMETHYST ANGEL · AI HUNTERS · COSMIC LIGHT** flagships | 3 |
| — | ⛔ **STOP. RUN THE SIX-TEST GATE.** | |
| 2 | the remaining eleven flagships | 11 |
| | | **14 total** |

⭐ **THOSE THREE FIRST, DELIBERATELY.** One magenta-field ornate hull, one
magenta-field bare hull, one black-field bright hull. **If all three key cleanly,
every remaining faction is covered by a case you have already proven.** Three
images buys certainty on all fourteen.

---

## 📋 THE FLAGSHIP PROMPT — master block + faction block

⚠ **PASTE BOTH HALVES TOGETHER AS ONE PROMPT. Never send a faction block alone.**
Every batch above repeats its rules inline on purpose; this section is the one
deliberate exception, because fourteen full copies would be unmaintainable — and
the law it protects is *"the generator must receive one complete prompt"*, which
pasting both halves satisfies exactly. ⛔ Do not send half.

### MASTER BLOCK — paste this first, every time

```
ONE complete capital warship seen from DIRECTLY ABOVE. Pure top-down
orthographic projection. No perspective, no tilt, no 3/4 view.

FRAMING:
- PROW POINTS UP. The ship's nose is at the top of the image.
- Bilateral symmetry about the vertical axis (unless the faction block
  overrides this).
- The ship fills ~92% of the frame.
- ONE ship only. Nothing else in the image.

BACKGROUND — use the field colour named in the faction block:
- Solid flat colour, edge to edge, all four corners.
- No gradient, no haze, no glow bleeding to the frame edge, no stars, no
  nebula, no planet, no ground, no shadow beneath the ship.
- The background colour must appear NOWHERE on the ship itself.

THE CAT MASK — the fleet's house mark, on every ship in the game:
- A stylised great-cat face is worked into the prow as a figurehead.
- It is rendered in THIS FACTION'S materials, never gold-by-default.
- Abstract and architectural, not a cartoon animal. It should read as a mask
  at a glance and dissolve into hull detail up close.

NODE MARKERS — MANDATORY. THE IMAGE IS WORTHLESS WITHOUT THEM:
- Draw a SOLID PURE GREEN #00FF00 FILLED CIRCLE centred on EVERY weapon
  mount, ON TOP of the finished artwork, as the last step.
- Flat green. No outline, no glow, no gradient, no transparency, no shading.
- Pure green #00FF00 appears NOWHERE else in the image.
- EXACTLY 36 dots: 4 large, 12 medium, 20 small. The count must be exact.
- Dot size encodes mount size: large = capital gun, medium = standard,
  small = light.

COLOUR LAW:
- Use ONLY the three colours named in the faction block.
- Pure green #00FF00 and pure magenta #FF00FF are RESERVED. They may never
  appear as hull, ornament, light or accent.

NEGATIVE: no text, no watermark, no signature, no labels, no numbers, no UI,
no HUD, no frame, no border, no grid lines, no ground, no shadow, no
perspective floor, no 3/4 view, no cockpit interior, no human figure, no
planet, no nebula, no stars, no background gradient, no second ship.

THE FACTION:
```

### THE FOURTEEN FACTION BLOCKS — paste ONE after the master block

```
1. AI — field: MAGENTA #FF00FF.
Brushed gunmetal hull, panel-perfect, machined to zero tolerance. Cyan
circuit tracery etched into every surface in a repeating lattice. Cold white
core. Silhouette: rigid and modular — the SAME structural part repeated many
times down the hull, like a rack. Nothing is unique, nothing is decorative.
The cat mask is a wireframe of cyan lattice lines on bare gunmetal.
Colours: gunmetal, cyan, cold white. Nothing else.

2. PAGAN AI — field: BLACK #000000.
Rusted pitted iron hull. Bone and antler lashed to the plate with cord.
Burnt ochre runes scorched into the metal by hand. Ember orange core.
Silhouette: modular machine structure overgrown with asymmetric votive
additions — hanging chains, standing-stone slabs, offerings bolted on.
The cat mask is a real animal skull wired to the prow, runes burned into it.
Colours: rust brown, bone white, ember orange. Nothing else.

3. AI GODS — field: BLACK #000000.
Seamless mirror chrome hull with no visible mechanism, no panel lines, no
joins. Concentric halo rings float unattached around the hull. Blinding white
core. Silhouette: perfect concentric geometry — a sphere at the heart inside
nested rings. Serene, not aggressive. It does not look like it has engines.
The cat mask is a smooth chrome negative-space impression, barely there.
Colours: chrome silver, blinding white, pale gold. Nothing else.

4. HUMAN AI GODS — field: BLACK #000000.
Marble-white ceramic plate laid over exposed dark muscle-cable that shows at
every joint. Gold laurel and classical fluting. Arterial red-gold core.
Silhouette: the proportions of a classical statue rendered as a warship —
shoulders, a torso, a bearing. Beautiful and slightly wrong.
The cat mask is a serene carved marble face with gold laurel, eyes closed.
Colours: ivory white, gold, arterial red. Nothing else.

5. AMETHYST ANGEL — field: MAGENTA #FF00FF.
Matte calcined black plate, near-zero specular, deep etched panel lines.
Antique gold filigree and gothic tracery, sigil geometry inlaid in gold leaf.
A violet singularity ring-bound in gold at the centre, the brightest element.
Polished gold hemisphere domes mark the turrets. Silhouette: blade-spar wings,
cathedral spires, ribbed forward barrel clusters. Vertical and sacred.
The cat mask is gold filigree with lit violet eyes. THE FLAGSHIP OF FLAGSHIPS.
Colours: matte black, antique gold, violet. Nothing else.

6. TECHNO ANGELS — field: BLACK #000000.
White enamel hull inset with mirror glass. SIX wings made of stacked
translucent glass panels, prismatic pale blue light refracting through them.
A halo of small floating panels above the spine. No visible engines, no
exhaust. Silhouette: vertical, winged, weightless — it looks like it is
descending rather than flying. The cat mask is cut from clear glass, edge-lit.
Colours: white, prismatic pale blue, mirror silver. Nothing else.

7. AI HUNTERS — field: MAGENTA #FF00FF.
Matte black stealth facets, flat angular planes, light-absorbing. ABSOLUTELY
NO ORNAMENT — no filigree, no tracery, no runes, no decoration of any kind.
The only colour is thin red sensor lines tracing the facet edges. Silhouette:
a forward-raked faceted wedge, barbed prow, limbs folded tight against the
hull. Predatory and utterly plain. The cat mask is a SINGLE horizontal red
sensor slit across a blank black faceted head — the suggestion of a face.
Colours: matte black, blood red, dark steel. Nothing else. NO ORNAMENT.

8. HUMAN HUNTERS — field: BLACK #000000.
Scavenged mismatched plate, welded patches, visible weld beads, exposed
cabling and hydraulic lines. Hand-painted sigils and tally marks. Orange
hazard stripes. Silhouette: forward-raked and ASYMMETRIC — harpoon launchers,
trophy racks of enemy plate, boarding claws on one flank only. Built, not
manufactured. The cat mask is spray-painted by hand onto welded plate.
Colours: oxidised olive, orange hazard, bare steel. Nothing else.

9. HYBRID FUSED HUNTERS — field: BLACK #000000.
Bone-grey chitin fused directly into steel plate, the two materials growing
into each other with no clean boundary. Wet violet sinew in every seam.
Silhouette: forward-raked and HALF-SYMMETRIC — the port side machined and
precise, the starboard side grown, ribbed and irregular. The same ship built
twice by two different things. The cat mask is half chitin skull, half
machined steel faceplate, split down the middle.
Colours: bone grey, dark steel, wet violet. Nothing else.

10. BLACK HOLE — field: MAGENTA #FF00FF.
The hull is an ABSENCE — a true void black shape that reflects nothing and
shows no surface detail at all. It is visible only by its edge, where an
orange-white accretion rim burns, and by the way light bends around it.
Silhouette: a great ring or disc with a hole at its centre, structure spiralling
inward. Geometry, not machinery. No panel lines, because there is no panel.
The cat mask is a shape torn out of the accretion glow — a face made of gap.
Colours: void black, orange-white accretion, deep indigo. Nothing else.

11. COSMIC LIGHT — field: BLACK #000000.
Hull of solidified starlight, gold-white and self-luminous, warm rather than
harsh. Rays of light ARE the structural spars — they hold the ship together.
A small sun at the core. Silhouette: radiant symmetry, rays extending in an
even corona, more heraldic sunburst than vessel. Geometry, not machinery.
The cat mask is formed by converging rays, its eyes two brighter points.
Colours: white-gold, pale cyan, warm white. Nothing else.

12. COSMIC DARKNESS — field: MAGENTA #FF00FF.
Deep indigo plate with real starfields visible INSIDE the metal, as if the
armour were a window onto deep space. Great draped sail-like sheets hang from
the spars. Faint silver stars scattered through the material. Silhouette:
cloaked and draped — a shrouded figure more than a hull, wide and slow.
Geometry, not machinery. The cat mask is a constellation of silver stars
forming a face within the indigo.
Colours: deep indigo, deep violet, faint silver. Nothing else.

13. CHAOS — field: BLACK #000000.
Mismatched plate in warp-torn geometry. NOTHING REPEATS — no two panels, no
two mounts, no two structural members are alike. Surfaces fold into themselves
at angles that should not close. Acid yellow and burnt orange bleed through
the seams. Silhouette: violently asymmetric, spiralling, ribbed and torn, with
no discernible front except the mask. The cat mask is the ONLY stable, correct,
symmetrical thing in the entire image, which is what makes it frightening.
Colours: bruised purple, acid yellow, burnt orange. Nothing else.
NEVER use pure green or pure magenta anywhere, even as a chaotic accent.

14. CRIMSON BLOOD — field: MAGENTA #FF00FF.
Lacquered arterial red, deep and wet-looking, over dark iron beneath. Brass
ribs arch over the hull like a ribcage over organs. Hooked brass spurs.
Blood-black core. Silhouette: ribbed like a carcass — a cathedral built out of
a body. Organic curves in hard metal, hooked and grasping.
The cat mask is a brass skull-mask with the red lacquer showing through.
Colours: crimson lacquer, brass, iron black. Nothing else.
```

---

## AFTER THE FOURTEEN COME BACK

```
python3 scripts/slice-sheet.py "<drop folder>" --out art/sliced --consume
python3 scripts/key-flat-background.py art/sliced art/keyed
python3 scripts/contact-sheet.py art/keyed/ships --out art/contact_ships.png
python3 scripts/extract-node-points.py art/keyed/ships --emit layout
```

⭐ **DROP EACH FACTION IN ITS OWN SUBFOLDER** — `ships/amethyst-angel/`,
`ships/ai-hunters/` and so on. **A subfolder name is the category**, the slicer
walks recursively and files by folder, so the faction is recorded for free and
never has to be tagged by hand afterwards.

⭐ The keyer probes each file for its actual background — it already handles
alpha, magenta and black in the same run. **Mixing magenta-field and black-field
factions in one drop is safe.**

⚠ **UNBUILT:** the uniform −90° nose-up import rotation in `slice-sheet.py`, and
the sprite path itself. ⛔ **The sprite path is still Mac's open decision in
`GAME_VISION.md` and generating this catalog does not make it for him** — the
engine remains 100% procedural until he rules.
