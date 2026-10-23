# GEMINI — ART PACK HANDOFF
### bubble-tanks-forge · 2026-08-16

You are making **art** for a small HTML5 canvas game. Read §0 before anything
else, because the medium is not what you expect.

---

## §0 — THE ONE RULE

**THIS GAME CONTAINS ZERO IMAGE FILES. DO NOT GENERATE PICTURES.**

No PNG. No SVG. No sprite sheet. No texture. If you produce an image, it cannot
be loaded, because there is no image loader in this codebase and adding one
would destroy the per-frame wobble, membrane undulation and player-colour
tinting that the whole look depends on.

**You are writing JSON that describes how to draw.** A file of shapes,
coordinates and colours. The game's renderer is an interpreter: it reads your
JSON every frame and issues canvas drawing calls. Your art *is* the data.

Think of it as authoring vector geometry by hand, not painting.

---

## §1 — STATUS: WHAT IS ALREADY DONE

Two packs exist. **Do not remake them.** Study them — they are your ground truth.

| Pack | Kind | Where | Author | State |
|---|---|---|---|---|
| `abyssal-choir` | organism | `js/packs.js` (bottom of file) | Sol | Reference port of the game's original hand-written look |
| `ironwake-fleet` | ship | `packs/ironwake-fleet.json` | Codex | ✅ Validated. All 6 parts draw. **This is your exemplar.** |

**Open `packs/ironwake-fleet.json` and `packs/contact-sheet.png` before you write
a line.** The JSON is the format; the PNG is what that JSON actually renders to.
Match that level of finish.

---

## §2 — THE GEOMETRY LAW

Three rules govern every coordinate you write. Breaking any one produces a pack
that validates and looks wrong.

**1. Every coordinate is normalised to the node's radius.**
`1.0` means "exactly this node's radius". Never write pixels. This is what lets
one pack draw correctly on a radius-12 node and a radius-30 node without being
redrawn. `[[1.0, 0], [-0.5, -0.6]]` is a valid triangle edge; `[[46, 0]]` is not.

**2. Forward is +X.** Author every part facing **east / right**. The engine
rotates the whole body by its aim angle at draw time. A part authored facing up
will point sideways in play.

**3. Keep the main body inside ±1.0. Only protrusions may exceed it.**
A barrel, a ram prow or an exhaust plume may reach out to about **±1.75**.
Everything else stays within ±1.0, because nodes are placed roughly 38px apart
and a fat part invades its neighbour. The validator warns past ±1.95.

> ⚠ **KNOWN INCONSISTENCY, DO NOT COPY IT.** The original hand-written renderer
> draws its spike pointing **−Y (up)** while every other part faces +X, and
> `abyssal-choir` faithfully reproduces that bug. `ironwake-fleet` correctly
> points its ram prow at **+X**. **Follow ironwake, not abyssal-choir, on this
> one point.**

---

## §3 — THE SCHEMA

This is not aspirational. Every field below is read by real code in
`js/packs.js`. Fields not listed here are ignored silently.

### Top level

```jsonc
{
  "id": "your-pack-id",        // REQUIRED. lowercase-kebab. Must equal the filename.
  "name": "Your Pack Name",    // Display name
  "kind": "ship",              // ship | organism | machine | arcane
  "tintChannel": "accent",
  "vernacular": { ... },       // §5 — what the UI calls things
  "ambient":    { ... },       // §6 — the world behind the fight
  "threat":     { ... },       // §7 — enemy colours
  "parts":      { ... },       // §4 — REQUIRED. The actual art.
  "projectiles":{ ... },       // §8 — forward-spec
  "effects":    { ... }        // §8 — forward-spec
}
```

### §4 — `parts` — THE CORE OF THE JOB

**All six are required**: `core`, `pod`, `cannon`, `spike`, `thruster`, `shield`.
A missing part falls back to a plain legacy bubble and visibly breaks the set.

Each part is `{ "layers": [ ... ] }` — **2 to 6 layers**, drawn in order,
first to last. This is the hot path: roughly 40 entities × 5 nodes × your layer
count, every frame. Six is a ceiling, not a target. Ironwake averages 4.5.

`core` additionally carries the connector that links nodes together:

```jsonc
"core": {
  "connector": { "width": 4, "stroke": "rgba(190,205,225,0.35)", "style": "beam" },
  "layers": [ ... ]
}
```

#### The four shapes

Anything else is **skipped silently** — a typo'd shape name is invisible art.

```jsonc
// POLYGON — your main tool. 3+ points. This is how you make a silhouette.
{ "shape": "poly",
  "points": [[1.18,-0.18],[0.72,0.62],[-0.62,0.76],[-1.12,0.36]],
  "fill": "#2A3646", "close": true }

// RECTANGLE — barrels, panels, vents. `round` is a corner radius.
{ "shape": "rect", "x": 0.08, "y": -0.2, "w": 1.34, "h": 0.36,
  "fill": "#141A24", "stroke": "#8FA6C4", "lineWidth": 0.07, "round": 0.05 }

// CIRCLE — lenses, ports, cores. Defaults cx:0 cy:0 r:1.
{ "shape": "circle", "cx": 0.04, "cy": 0.02, "r": 0.64, "fill": "#2A3646" }

// ARCBAND — a ring segment. Angles in radians. Great for shields and halos.
{ "shape": "arcband", "r0": 0.82, "r1": 1.08, "from": -0.82, "to": 0.84,
  "fill": "tint" }
```

#### Paint

Every `fill` and `stroke` takes one of three forms:

```jsonc
"fill": "#2A3646"                              // hex
"fill": "rgba(190,205,225,0.35)"               // rgba
"fill": "tint"                                 // ← THE PLAYER'S CHOSEN COLOUR
"fill": { "grad": "linear", "x0":-1,"y0":-0.4,"x1":1,"y1":0.6,
          "stops": [[0,"#141A24"],[1,"#2A3646"]] }
"fill": { "grad": "radial", "fx":-0.3,"fy":-0.3,
          "stops": [[0,"#ffffff"],[0.35,"tint"],[1,"rgba(2,6,16,0.9)"]] }
```

**`"tint"` is the most important value in this document.** It is replaced at
draw time by the colour the player picked in the garage. **Every part must use
it at least once**, or that part stays grey no matter what the player chooses
and the customiser looks broken. `"tint"` also works inside a gradient stop.

`lineWidth` is normalised too — `0.07` means 7% of the node radius.

#### Conditional and animated layers

```jsonc
"onFire":   true,   // draw ONLY while the weapon is firing (muzzle glow)
"onThrust": true,   // draw ONLY while moving (exhaust plume)
"pulse": { "on": "undulation", "amp": 0.04 }   // breathes with the shared clock
```

`pulse.on` must be the string `"undulation"` — it is the only clock available.
Keep `amp` between `0.03` and `0.08`; higher reads as a wobble bug.

### §5 — `vernacular`

The UI reads these strings. Without them the garage says "Nucleus" over a
battleship. All nine required:

```jsonc
"vernacular": {
  "core": "Command Deck",  "pod": "Armour Cell",   "cannon": "Main Battery",
  "spike": "Ram Prow",     "thruster": "Drive Nacelle", "shield": "Aegis Projector",
  "connector": "Hull Spar","currency": "Salvage",  "graft": "Retrofit"
}
```

Make these *specific to the pack's world.* This is cheap flavour with a very
high return — renaming the currency changes how the whole screen feels.

### §6 — `ambient`

```jsonc
"ambient": {
  "ground": "#05070C",                      // the ocean/void behind everything
  "gridStroke": "rgba(150,180,210,0.05)",   // background grid
  "gridShape": "cross",                     // cross | circle
  "maskAlpha": 0.78                         // vignette strength, 0..1
}
```

Keep `ground` very dark. The parts are dark too, and their read depends on the
pale plate highlights, not on ground contrast.

### §7 — `threat`

Enemy colours. All six required, all hex:

```jsonc
"threat": { "mote":"#7E8A5A", "stalker":"#5FA8D3", "charger":"#D98324",
            "sniper":"#8C6BB1", "hive":"#B54B5F", "boss":"#E03050" }
```

⚠ **Make `hive` and `boss` clearly different.** In the stock game they are the
same red, so a carrier reads as a flagship at a glance. Don't inherit that.

### §8 — `projectiles` and `effects` — FORWARD-SPEC

**Honest status: the interpreter does not render these yet.** The schema is
fixed and validated, and `ironwake-fleet` already supplies them, but no code
calls them today. Include them — they cost you little and they will light up
when the projectile seam lands. Just don't expect to see them on screen.

Six weapons: `spitter`, `twin`, `mortar`, `laser`, `homing`, `railgun`.
Same `layers` schema, plus two extra fields:

```jsonc
"laser": {
  "layers": [ ... ],
  "trail": { "rate": 0.4, "type": "trail", "life": 0.18 },
  "stretch": 3.0,   // elongate along travel — beams 3-5, shells 1
  "spin": 0.12      // radians per frame — tumbling shells only
}
```

---

## §9 — THE SILHOUETTE LAW

**A pack that changes only colour is a palette, not a pack.**

This is the single thing most likely to go wrong. If I can take your pack,
recolour ironwake, and get the same result, you have not delivered a pack.

Each pack must be recognisable **in black, at thumbnail size, with no colour at
all.** Before you write JSON, decide the pack's *shape language* and apply it to
all six parts:

- Is the outline **angular or curved**?
- Are forms **solid or hollow**?
- Is it **symmetrical or asymmetrical**?
- Are edges **hard plates, soft membranes, or thin frames**?
- Where does the eye land — a **lens, a vent, a seam, a spine**?

Ironwake's language: *hard faceted plates, a pale top-lit bevel on the leading
edge, one small tint slot per part, flat-bottomed hexagonal outlines.* Six parts,
one grammar. Yours needs its own — and it must not be that one.

### Fill your radius

**Measured note from wiring ironwake into the live renderer:** an angular part
inscribed inside `r = 1.0` renders visibly *smaller* than the legacy bubble,
because a circle fills its radius and a hexagon does not. Assembled, the ship
then reads thinner than the organism it replaced.

So: **push your main silhouette out to roughly ±0.9–1.0 on its long axis.**
Ironwake's core spans about 1.18 × 0.76 and that is close to the floor of what
reads well. A part that only reaches ±0.6 will look underweight next to every
other pack, and the assembled body will look sparse rather than solid.

---

## §10 — WHAT TO BUILD

Four packs. One file each, in `packs/`, named exactly `<id>.json`.

### 1. `voidwright` — kind `arcane`
Crystalline and hollow. **Shape language:** thin sharp shards, hairline strokes
over near-empty interiors, floating detached fragments around a hollow centre.
Very few filled areas — this pack reads as *outline*. Angular but brittle, not
armoured. Palette: deep violet ground, cold white edges, tint in the hollows.
*The opposite of ironwake: where ironwake is solid mass, this is empty frame.*

### 2. `emberwake-swarm` — kind `organism`
Insectile chitin. **Shape language:** segmented, tapering, asymmetrical.
Overlapping carapace bands like a beetle's abdomen. Every part narrows toward
one end. Nothing is a clean rectangle. Palette: hot amber, rust, charred brown;
tint glows from *between* the segments. Use `pulse` on the seams — this pack
should look like it is breathing.

### 3. `glassreef-choir` — kind `organism`
Soft bioluminescent reef. **Shape language:** rounded, translucent, layered.
Circles and fat arcbands rather than polys. Low-opacity fills stacked so inner
shapes glow through outer ones. No hard corners anywhere. Palette: pale teal,
rose, sea-glass; heavy use of rgba with alpha around 0.3–0.6.
*This is the one that proves the schema can do softness, not just plate armour.*

### 4. `deepiron-cartel` — kind `machine`
Industrial salvage. **Shape language:** boxy, riveted, deliberately mismatched —
like it was welded from three other ships. Rectangles dominate. Add asymmetric
bolted-on plates that do not line up. Blunt, heavy, no aerodynamic taper.
Palette: gunmetal, ochre, warning-stripe yellow; tint on hazard markings.

---

## §11 — HOW TO CHECK YOUR WORK

**Do not hand back a pack you have not run through this.**

```bash
cd ~/Desktop/bubble-tanks-forge
node scripts/validate-pack.mjs --sheet
```

It runs two passes:

- **PASS 1 · STRUCTURE** — schema, colour validity, coordinate range, layer budget.
- **PASS 2 · RENDER** — loads the *real* interpreter in a *real* browser, calls
  the *real* draw function, and counts painted pixels per part.

Pass 2 is the one that matters. A pack can satisfy every key and still draw
nothing — a bad coordinate sign, a missing fill, a typo'd shape name. **Zero
painted pixels is the failure mode a schema check can never catch.**

`--sheet` writes `packs/contact-sheet.png`, one row per pack, all six parts on
that pack's own ground colour. **Open it and look at it.** A green validator is
not a verdict on whether it looks good.

### Acceptance

- [ ] `node scripts/validate-pack.mjs` exits **0**, zero failures
- [ ] All six parts paint **> 200px** each in the render pass
- [ ] Every part uses `"tint"` at least once
- [ ] All nine `vernacular` keys present and world-specific
- [ ] `threat.hive` ≠ `threat.boss`
- [ ] Silhouette test: recognisable in pure black at thumbnail size
- [ ] On the contact sheet, your row cannot be mistaken for ironwake's

---

## §12 — DO NOT

- ❌ **Do not generate images.** Not PNG, not SVG, not a sprite sheet. JSON only.
- ❌ **Do not edit any existing file.** New `packs/*.json` files only. Do not
  touch `js/`, `index.html`, or the two finished packs.
- ❌ **Do not copy another game's art, names, or signature layout.** No Pokémon,
  Zelda, Diablo, Dreadnought, Warhammer, Star Wars. Ships and creatures are a
  broad vocabulary — use the vocabulary, not a specific game's dialect.
- ❌ **Do not exceed 6 layers per part.** It is the per-frame hot path.
- ❌ **Do not use pixel coordinates.** Everything is normalised to node radius.
- ❌ **Do not author parts facing any direction but +X** (except that you should
  ignore `abyssal-choir`'s −Y spike, which is a known bug).
- ❌ **Do not invent new `shape` names.** Unknown shapes are skipped silently, so
  the failure is invisible: your art simply will not be there.

---

## §13 — DELIVERABLE

Four files:

```
packs/voidwright.json
packs/emberwake-swarm.json
packs/glassreef-choir.json
packs/deepiron-cartel.json
```

Plus the validator output showing **exit 0**, and the contact sheet PNG.

If something in this document is ambiguous or contradicts the exemplar, **the
exemplar `packs/ironwake-fleet.json` wins** — it is the one that has been proven
to render.
