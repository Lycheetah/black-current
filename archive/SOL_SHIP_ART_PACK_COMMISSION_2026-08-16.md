# SHIP ART PACK — generation commission

**Written:** 2026-08-16 · **Seat:** Sol (Claude Code) · **For:** Codex, generating
**Status of this file:** additive commission. It edits nothing. `AGENTS.md` assigns this
project to **Aetheron** (Antigravity); Mac is founder and assigned this packet directly.

---

## 0. The one rule

> **This game contains zero image files. Do not generate pictures.**

Every visual in `bubble-tanks-forge` is drawn at runtime by `js/shaders.js` using
`ctx.arc`, `ctx.createRadialGradient`, `ctx.fillRect` and `ctx.lineTo`. There is no
sprite loader, no atlas, no texture. A folder of PNGs cannot be used by this engine
without first building a sprite pipeline — and that pipeline would destroy the
spring-damper wobble, the undulating membrane and the per-crew colour tinting, which
are the three things that currently make it feel alive.

**What you generate is a `pack` — a JSON file of normalised draw instructions.** The
existing renderer becomes a pack interpreter. Art becomes data. That is the whole point:
the same combat code then renders bubble organisms *or* battleships depending on which
pack is loaded.

---

## 1. MEASURED ground truth — read before designing anything

Taken from source on 2026-08-16, not assumed.

### Node types the engine already knows

`js/designer.js` defines exactly six, and `js/shaders.js` draws them:

| type | radius | GP cost | current appearance | role in a ship pack |
|---|---|---|---|---|
| `core` | 26–30 | 0 | nucleus + white gradient + inner "eye" | Command deck / bridge |
| `pod` | 14 | 15 | plain glowing sphere | Armour cell / hull block |
| `cannon` | 12 | 20 | dark 11×6 barrel drawn to **+X** | Main battery turret |
| `spike` | 10 | 20 | white triangle pointing **−Y** | Ram prow / boarding spar |
| `thruster` | 12 | 25 | green triangle flaring to **−X** | Drive nacelle |
| `shield` | 15 | 35 | plain glowing sphere | Shield projector |

### Geometry law — get this wrong and everything renders sideways

- **Forward is `+X` (east).** `shaders.js:111` draws the cannon barrel at
  `wobbleX + node.radius * 0.2`; `shaders.js:117` flares the thruster to
  `wobbleX - node.radius * 1.4`. The whole organism is then rotated by `ctx.rotate(angle)`.
  **Author every part facing east. Never facing up.**
- **The origin `(0,0)` of a part is the centre of its node**, not a corner.
- Nodes are placed by the designer at `dist = 38` from centre on the angle you clicked
  (`designer.js:345–353`), so parts sit on a ring around the core and must read correctly
  at any rotation.
- A connector tendril is drawn from core to every node (`shaders.js:74–79`). In a ship
  pack this becomes a **hull spar**, not a tendril.

### Colours currently in the source

Ocean `#030814` · ambient mask `rgba(2,5,12,0.82)` · default glow `#00f3ff` ·
preset accents `#39ff14` `#ffb703` `#bc13fe` `#ff3366` · grid `rgba(0,243,255,0.04)`.
The player's chosen colour is passed in as `glowColor` and tints core, pods and cannon
outline. **A pack must keep one tintable channel** or crew colours stop working.

### Two save keys exist and they are not the same

`biotank_forge_player` (the design, `designer.js:391`) and `biotank_forge_save_v2`
(the campaign). A pack must not write to either.

---

## 2. The pack contract — generate exactly this shape

One file per pack: `packs/<id>.json`.

```json
{
  "id": "ironwake-fleet",
  "name": "Ironwake Fleet",
  "kind": "ship",
  "tintChannel": "accent",

  "vernacular": {
    "core": "Command Deck",
    "pod": "Armour Cell",
    "cannon": "Main Battery",
    "spike": "Ram Prow",
    "thruster": "Drive Nacelle",
    "shield": "Aegis Projector",
    "connector": "Hull Spar",
    "currency": "Salvage",
    "graft": "Retrofit"
  },

  "ambient": {
    "ground": "#05070C",
    "gridStroke": "rgba(150,180,210,0.05)",
    "gridShape": "cross",
    "maskAlpha": 0.78
  },

  "parts": {
    "core": {
      "connector": { "width": 4, "stroke": "rgba(190,205,225,0.35)", "style": "beam" },
      "layers": [ /* see §3 */ ]
    },
    "pod":      { "layers": [] },
    "cannon":   { "layers": [] },
    "spike":    { "layers": [] },
    "thruster": { "layers": [] },
    "shield":   { "layers": [] }
  }
}
```

### 3. Layer primitives — the only shapes an interpreter must support

**All coordinates are normalised to the node radius.** `1.0` means "exactly the node's
radius". This is what makes one pack work at radius 10 and radius 30 without redrawing.

```json
{ "shape": "circle", "cx": 0, "cy": 0, "r": 1.0, "fill": <paint>, "stroke": <paint>, "lineWidth": 0.08 }
{ "shape": "rect",   "x": 0.2, "y": -0.25, "w": 0.9, "h": 0.5, "fill": <paint>, "round": 0.06 }
{ "shape": "poly",   "points": [[1.4,0],[0.2,-0.45],[0.2,0.45]], "fill": <paint>, "close": true }
{ "shape": "arcband","r0": 0.8, "r1": 1.05, "from": -0.6, "to": 0.6, "fill": <paint> }
```

`<paint>` is one of:

```json
"#8FA6C4"
"tint"                                  // substituted with the player's crew colour
{ "grad": "radial", "fx": -0.3, "fy": -0.3, "stops": [[0,"#FFFFFF"],[0.4,"tint"],[1,"#060A12"]] }
{ "grad": "linear", "x0": -1, "y0": 0, "x1": 1, "y1": 0, "stops": [[0,"#2A3646"],[1,"#0A0F18"]] }
```

Optional per-layer modifiers:

```json
"pulse":  { "on": "undulation", "amp": 0.04 }   // breathes with fluidShader.undulationTime
"onFire": true                                   // drawn only while the weapon discharges
"onThrust": true                                 // drawn only while moving
```

**Layer budget: 3–6 layers per part.** This runs inside a per-frame loop over every node
on every entity. Eight layers on a pod at forty entities is a frame-rate problem, not a
detail win.

---

## 4. What to generate — the manifest

### Pack A — `ironwake-fleet` (the proof)

Six parts, above. This is the pack that proves the seam: if it loads and plays without
one special case in the combat loop, the engine is real. **Generate this first and stop
until it is witnessed.**

### Pack B — `abyssal-choir` (organism, ported)

The same six parts, reproducing what `shaders.js` already draws, expressed as pack data.
This is the regression check — the game must look **identical** to today when Pack B is
loaded. If it doesn't, the interpreter is wrong, not the art.

> **The six hull parts are only half the pack.** Projectiles, weapon signatures, ability
> effects and enemies are specified in **§9 and §10**. A pack that skins only the hull
> gives you battleships firing bubbles.

### Pack C — `voidwright` (stretch, only after A and B pass)

Angular, faceted, non-naval. Exists to prove the pack format isn't secretly ship-shaped.

---

## 5. Lycheetah style — the ship pack

Not a mood board. Rules that decide pixels.

**Silhouette first.** Every part must be identifiable as a black shape with no colour.
A cannon must read as a cannon at 12px radius on a phone. Test by filling every layer
flat black and checking you can still name the six parts.

**Weight over detail.** These are capital ships in deep water. Long horizontals, heavy
lower mass, small bright details high on the form. Avoid symmetry on the X axis — an
asymmetric superstructure reads as a *ship* rather than a *blob with a gun*.

**Light comes from above-left.** The current renderer already does this
(`shaders.js:87`, offset `-0.35, -0.35`). Keep it. One consistent light source across a
pack is the single largest contributor to it looking authored rather than assembled.

**Three values, one accent.** Hull dark `#141A24`, plate mid `#2A3646`, edge light
`#8FA6C4`, and `"tint"` for the crew accent. Every part uses the same four. Restraint is
what makes six separately-generated parts look like one fleet.

**The accent is a *light*, not a paint.** It belongs on emissive things — viewport
strips, muzzle glow, drive flare, shield film. Never on hull plating. This is what keeps
the crew-colour tinting from turning ships into jellybeans.

**Wear, not grime.** A hairline of lighter value along a top edge reads as worn metal.
Noise, splatter and rust textures do not survive at 12px and cost frames.

**No text, no insignia, no flags.** Decals are a separate earned system and must not be
baked into a part.

**Original forms only.** Do not reproduce the silhouette, name, or livery of any existing
game's ships — Dreadnought, EVE, Homeworld, Battlefleet or otherwise. Naval *vocabulary*
(prow, battery, nacelle) is common language and is fine; a recognisable copy of a
specific vessel is not.

---

## 6. Acceptance — how you prove the pack works

A pack is not delivered until all five pass:

1. **It parses.** `JSON.parse` succeeds and every part in the manifest is present.
2. **Contact sheet.** Render all six parts at radius **10, 20 and 30** onto one PNG,
   on the pack's own `ambient.ground`. Open it and look at it. Attach it.
3. **Silhouette test.** Same sheet, every layer forced flat black. All six still nameable.
4. **Rotation test.** Render `cannon` and `thruster` at 0°, 90°, 180°, 270°. The barrel
   must always point along the ship's facing and the flare must always trail behind it.
   This is the test that catches a part authored facing up.
5. **Tint test.** Render the core with `tint` set to `#00f3ff`, `#ff3366` and `#ffb703`.
   All three must look like the same ship in different livery — not like three
   different materials.

Numbers 2 and 3 mean **look at the image**. A pack that parses is not a pack that draws.

---

## 7. Do not

- Do not generate PNG, WebP, SVG files or a sprite atlas. Draw-data only.
- Do not edit `js/shaders.js`, `js/engine.js`, `js/designer.js` or any existing file.
  Packs are new files in a new `packs/` directory. The interpreter is a separate task and
  a separate decision.
- Do not touch `biotank_forge_player` or `biotank_forge_save_v2`.
- Do not add a dependency, a build step, or a package manager. This game is a folder you
  can open. That is a feature worth more than any renderer improvement.
- Do not invent new node types. Six exist. A seventh is a code change, not an art change.
- Do not describe the pack as finished, shipped, or approved. Mac holds the taste gate,
  and a green parse is not a green screen.

---

## 8. Open questions for Mac — do not guess these

1. **Brand palette.** The values in §5 are derived from the game's own source, not from
   the Lycheetah brand canon. If a canonical palette exists, it overrides §5 entirely.
2. **Pack C** — is a third, deliberately non-naval pack wanted, or is proving the seam
   with two enough?
3. **Whether the interpreter is Aetheron's task or Codex's.** This commission covers the
   art data only; something still has to read it.

---

## 9. Weapons, projectiles and effects — the other half of the pack

### What exists, MEASURED from `js/weapons.js`

Six primaries, five secondaries. These stats are live — a pack changes how they **look**,
never how they behave.

| id | title | dmg | fireRate | speed | proj radius | ship-pack reading |
|---|---|---|---|---|---|---|
| `spitter` | Bubble Spitter | 20 | 10 | 14 | 6 | Autocannon — short tracer |
| `twin` | Twin Splitter | 16 | 12 | 13 | 6 | Twin-linked — paired tracers |
| `mortar` | Tri-Spread Mortar | 25 | 18 | 10 | 9 | Shell — heavy, slow, tumbling |
| `laser` | Bio-Laser Tendril | 12 | 4 | 20 | 4 | Beam lance — thin hot line |
| `homing` | Homing Spore Array | 26 | 16 | 9 | 7 | Missile — fin + exhaust trail |
| `railgun` | Bio-Needle Railgun | 50 | 25 | 26 | 5 | Slug — pure white streak |

| id | title | cooldown | ship-pack reading |
|---|---|---|---|
| `shield` | Force Membrane Shield | 160 | Aegis bubble — faceted, not organic |
| `emp` | Bio-Electric EMP | 180 | Flak burst — expanding hard ring |
| `dash` | Hydro-Dash Burst | 75 | Burn — cone of drive flame |
| `drone` | Mitosis Drone Pod | 260 | Escort craft, orbit radius 65, r 10 |
| `mine` | Bio-Mine Layer | 100 | Sea mine, r 15, pulses ±2.5 |

### Projectile spec — add to the pack

Projectiles draw in `weapons.js:43–66` as three stacked circles (outer glow, core,
offset white highlight). A pack replaces that with the same layer primitives from §3,
**normalised to `this.radius`**, plus a heading — projectiles travel along `+X` of their
own velocity vector, same law as §1.

```json
"projectiles": {
  "spitter":  { "layers": [], "trail": { "rate": 0.25, "type": "spark", "life": 0.35 } },
  "twin":     { "layers": [], "trail": {} },
  "mortar":   { "layers": [], "trail": {}, "spin": 0.12 },
  "laser":    { "layers": [], "trail": {}, "stretch": 3.0 },
  "homing":   { "layers": [], "trail": {}, "stretch": 1.6 },
  "railgun":  { "layers": [], "trail": {}, "stretch": 5.0 }
}
```

`stretch` scales the shape along its heading — a railgun slug at `5.0` reads as a streak
rather than a dot, which is the single cheapest thing that makes fast projectiles feel
fast. `spin` rotates a tumbling shell. Both are new interpreter fields; specify them,
don't implement them.

### Effect spec — add to the pack

`particles.js` supports exactly four particle types: `bubble`, `trail`, `ring`, `spore`.
**Do not invent a fifth.** A pack re-skins the four:

```json
"effects": {
  "burst":  { "count": 14, "particle": "bubble", "palette": ["tint","#FFE7B0","#8FA6C4"] },
  "ring":   { "lineWidth": 2, "maxRadius": [50,70], "stroke": "tint" },
  "trail":  { "layers": [] },
  "ambient":{ "count": 80, "palette": ["#8FA6C4","#3C4C63"], "shape": "mote" }
}
```

For the ship pack, `ambient` is the one with the biggest atmosphere payoff: 80 drifting
green-and-cyan spores read as *ocean life*. Change them to slow grey particulate and
falling ash and the same water reads as *a battlefield*. Nothing else in the file changes.

---

## 10. Enemies — one pack skins them for free

**This is the best structural news in the codebase.** `ai.js:200` draws every enemy and
every boss through `fluidShader.drawOrganismMembrane` — the *same* function, with the
same node array shape, as the player. There is no separate enemy renderer.

**Consequence: a pack that skins the six hull parts automatically skins all five enemy
archetypes and all four bosses.** No extra art required. That is one implementation path
doing its job, and it is why the pack idea is cheap rather than enormous.

What a pack *should* still specify is the archetype palette, since colour is how the
player reads threat at a glance:

| archetype | current | nodes it carries | ship-pack reading |
|---|---|---|---|
| `mote` | `#39ff14` | core only | Drone skiff |
| `stalker` | `#00f3ff` | core + 2 cannon | Fast frigate |
| `charger` | `#ffb703` | core + 2 spike | Ram cutter |
| `sniper` | `#bc13fe` | core + 2 cannon | Artillery hull |
| `hive` | `#ff3366` | core only | Carrier |
| boss | `#ff3366` | core + 4 cannon | Flagship |

```json
"threat": { "mote": "#7E8A5A", "stalker": "#5FA8D3", "charger": "#D98324",
            "sniper": "#8C6BB1", "hive": "#B54B5F", "boss": "#E03050" }
```

⚠ **`hive` and boss are both `#ff3366` today.** At a glance a carrier reads as a
flagship. Give them distinct values in every pack.

---

## 11. Two defects found while reading — not art tasks, but real

**1. The projectile glow ring does nothing.** `weapons.js:51`:

```js
ctx.fillStyle = this.color.replace(')', ', 0.25)').replace('rgb', 'rgba');
```

Every colour in this game is hex (`'#00f3ff'`). A hex string contains no `)` and no
`rgb`, so **both replacements are no-ops** and the "glowing outer ring" is filled at full
opacity in the core colour. The intended soft halo has never rendered. Fix is a real
alpha conversion, not a string replace — but it is a **code** change and belongs to
whoever owns `weapons.js`, not to this commission.

**2. `shadowBlur` is used on the hot path.** `shaders.js` says in its own header that it
achieves speed "without slow shadowBlur" — but `particles.js:53` and `:172` set
`shadowBlur = 8` on every trail particle and all 80 ambient spores, every frame. That is
the most likely frame-rate cost in the file. Flag only; measure before changing.
