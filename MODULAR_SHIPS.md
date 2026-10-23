# MODULAR SHIPS — BASES + PARTS
### `bubble-tanks-forge` · stable name, edit this file, never date-stamp a copy

**The goal, Mac's words:** *"a modular ship design and the parts — we were meant
to have the body and parts so we can make ships from bases."*

---

## 0. WHAT ALREADY EXISTS — read this before building anything

⭐ **The engine is ALREADY modular. It just has no BASE layer.**

**MEASURED** from `js/designer.js`:

```js
nodes: [
  { dx: 0,   dy: 0,   radius: 26, type: 'core' },
  { dx: 38,  dy: 0,   radius: 12, type: 'cannon' },
  { dx: -32, dy: -18, radius: 14, type: 'pod' },
  { dx: -32, dy: 18,  radius: 14, type: 'pod' }
]
```

A ship **is** that array. `dx/dy` are **pixels from the core centre**, and
**forward is `+X`** (every cannon in every preset sits at positive `dx`).

**What ships today:**

| thing | where | count |
|---|---|---|
| part types | `ORGANELLE_TYPES` | **6** — core, pod, cannon, spike, thruster, shield |
| preset ships | `PRESET_DESIGNS` | **5** — balanced, assault, mortar, seeker, titan |
| primary weapons | `PRIMARY_WEAPONS_CATALOG` | **6** |
| secondary actives | `SECONDARY_ACTIVES_CATALOG` | **5** |
| art packs | `packs/*.json` + inline | **16**, each with all 6 part types |

**MEASURED radii and costs:**

| type | radius | GP cost | where it sits in the presets |
|---|---|---|---|
| `core` | **26 / 28 / 30** | 0 | always `dx 0, dy 0` |
| `spike` | 10 | 20 | — |
| `cannon` | **12** (titan 14) | 20 | `dx +36 … +42` |
| `thruster` | 12 | 25 | `dx −35 … −40`, `dy 0` |
| `pod` | **14** (titan 16) | 15 | `dx −28 … −32`, `dy ±18 … ±28` |
| `shield` | 15 | 35 | `dx −40`, `dy 0` |

⭐ **THE POSITIONS ARE NOT RANDOM — there is already an unwritten arc rule.**
Guns forward, pods on the aft flanks, drive and shield on the centreline aft.
Nobody wrote it down, so nothing enforces it. **This document writes it down.**

⛔ **THE GAP:** the designer lets you drop any node anywhere in 360°. There is no
such thing as a *hull that comes with sockets*. So "pick a base, slot parts into
it" — the thing Mac is asking for — **genuinely does not exist yet.** Everything
below is the smallest way to add it.

---

## 1. THE CONTRACT

> **A BASE is a hull that declares its own sockets.**
> **A PART is a module that declares one mount point and one size.**
> **A SHIP is a base plus a chosen part in each socket.**

### ⛔ THE ONE ARCHITECTURAL LAW

**A base + loadout MUST COMPILE DOWN TO THE EXISTING `nodes[]` ARRAY.**

It is an **ADAPTER**, not a second format. The renderer, the save file, the
collision, the pack art and `PRESET_DESIGNS` all keep working unchanged, because
what reaches them is the same array it has always been.

⛔ **If a base ever gets its own renderer or its own save shape, stop — that is a
split roster, and a split roster is the only failure that actually matters.**

---

## 2. SOCKET SIZE CLASSES

Taken straight from the radii already shipping, so no existing ship changes:

| class | radius | fits | reads as |
|---|---|---|---|
| **S** | 10 | spike | light mount |
| **M** | 12 | cannon, thruster | standard hardpoint |
| **L** | 14 | pod | heavy bay |
| **XL** | 16 | capital pod, capital battery | capital hardpoint |

### The fit rule

> **A part mounts if `part.size <= socket.size`.**
> A big socket accepts a small part — draw a visible **adapter collar** in the
> gap so the downgrade is honest on screen. A small socket **never** accepts a
> big part.

⭐ **This one rule is what makes bases actually different from each other.** A
dreadnought base with three XL sockets can carry things a needle base physically
cannot, without a single stat needing to be invented.

---

## 3. SOCKET ARCS — the rule that was already there

Every socket declares which types it accepts. Derived from where the shipped
presets already put things:

| arc | region | accepts | why |
|---|---|---|---|
| **PROW** | `dx > +30` | `cannon`, `spike` | guns and rams face the threat |
| **FLANK** | `abs(dy) > 16` | `pod`, `cannon`, `shield` | broadside bays |
| **DORSAL** | near centreline, `dx` mid | `shield`, `pod` | sensor/aegis spine |
| **STERN** | `dx < −30`, `dy ≈ 0` | `thruster`, `shield` | drive and aft aegis |

⛔ **A ship with no STERN socket cannot mount a thruster.** That is the point —
the base is a real design constraint, not a skin.

---

## 4. THE SCHEMA — additive, breaks nothing

New file, e.g. `js/bases.js`, loaded **after** `designer.js` (⚠ classic scripts
sharing globals — load order in `index.html` is load-bearing; **no `export`**,
because a module tag would defer the file and break the ordering).

```js
const HULL_BASES = {
  ironwake_cruiser: {
    id: 'ironwake_cruiser',
    name: 'Ironwake Cruiser',
    pack: 'ironwake-fleet',      // which art pack draws it
    house: 'IRONWAKE',
    hullClass: 'cruiser',
    coreRadius: 26,
    gpBudget: 90,                // spend on parts, cost table above
    sockets: [
      { id: 'prow',   dx:  38, dy:   0, size: 12, arc: 'PROW',  accepts: ['cannon','spike'] },
      { id: 'port',   dx: -32, dy: -18, size: 14, arc: 'FLANK', accepts: ['pod','shield'] },
      { id: 'stbd',   dx: -32, dy:  18, size: 14, arc: 'FLANK', accepts: ['pod','shield'] },
      { id: 'drive',  dx: -35, dy:   0, size: 12, arc: 'STERN', accepts: ['thruster'] }
    ]
  }
};
```

A loadout is just socket id → part id:

```js
const loadout = { prow: 'cannon_node', port: 'pod_vitality', drive: 'thruster_plasma' };
```

### The compiler — the whole adapter, and it is small

```js
function nodesFromBase(base, loadout) {
  const nodes = [{ dx: 0, dy: 0, radius: base.coreRadius, type: 'core' }];
  for (const s of base.sockets) {
    const partId = loadout[s.id];
    if (!partId) continue;                       // empty socket is legal
    const part = ORGANELLE_TYPES.find(p => p.id === partId);
    if (!part) continue;
    if (!s.accepts.includes(part.type)) continue; // arc rule
    if (part.radius > s.size) continue;           // fit rule
    nodes.push({ dx: s.dx, dy: s.dy, radius: part.radius, type: part.type });
  }
  return nodes;
}
```

⚠ **Note what it returns: the same array shape as `PRESET_DESIGNS.balanced.nodes`.**
That is the proof it is an adapter. `PRESET_DESIGNS` keeps working untouched —
each preset is simply a base whose loadout is already filled in.

⛔ **Empty sockets must be legal and must be VISIBLE** — draw the bare mount
collar. An empty hardpoint is the strongest possible advertisement for the next
upgrade, and it costs nothing to render.

---

## 5. HOW THE ART FEEDS THIS — the loop closes

This is why `ART_PROMPTS.md` now demands mounts drawn as **real architecture**
with a green dot in the centre.

```
core hull art  ──►  key-flat-background.py  ──►  extract-node-points.py
                                                        │
                                       { dx, dy, radius } per green dot
                                                        │
                                          snap radius to {10,12,14,16}
                                                        │
                                                  a BASE's sockets
```

⭐ **THE SIZE CLASS FALLS OUT OF THE ARTWORK.** The artist draws a big collar for
a capital hardpoint and a small one for a light mount; the extractor measures the
dot; the size class is read, not decided. **Nobody has to keep a spreadsheet in
sync with a drawing.**

Module art is the mirror image: **exactly one** green dot, at the face that bolts
to the hull. That dot becomes the part's **origin** — the point the compiler
places at `socket.dx, socket.dy`.

⚠ **This means part art must be drawn with its mount dot at the correct face**,
or every part will render offset. Forward-facing parts: rear face. Thrusters:
front face. That rule is already in every relevant batch of `ART_PROMPTS.md`.

---

## 6. MAKING SHIPS FROM BASES — what it buys

With 16 art packs × the six part types already drawn:

- **Same base, different parts** → a recognisable hull with a readable role
  change. This is the build variety the game currently fakes with 5 fixed presets.
- **Same parts, different base** → the house identity carries. An Ironwake hull
  and a Glassreef hull with identical loadouts should be tellable apart **in pure
  black silhouette** — that is the black test from `ART_PROMPTS.md`, and it is the
  real check on whether a base is a design or a recolour.
- **Mixed-house ships** → an Ironwake hull wearing a salvaged Voidwright battery.
  ⭐ This is the loot fantasy, and the node graph already supports it for free
  because each node draws from its own pack.

⚠ **Mixed-house is a rendering question we have not yet witnessed** — nothing
today draws two packs in one ship. Prove it with two nodes before designing loot
around it. **UNVERIFIED.**

---

## 7. BUILD ORDER — smallest first

1. **`js/bases.js` with ONE base** (`ironwake_cruiser` above) + `nodesFromBase`.
   Feed it into the existing render path and look at the screen.
2. **Express the 5 existing presets as bases.** If all 5 still play identically,
   the adapter is correct. ⛔ If any preset changes, the adapter is wrong — fix
   the adapter, do not adjust the preset.
3. **Empty-socket rendering** — bare collars visible.
4. **The designer UI reads sockets** instead of free 360° placement. ⚠ Keep free
   placement behind a flag; it is how bases get authored in the first place.
5. **Extractor → base generator**, once real hull art exists.
6. Only then: hull classes beyond cruiser, GP budget tuning, mixed-house loot.

⛔ **Do not start at step 5.** Everything upstream is unblocked without a single
image; the art makes it *better*, not *possible*.

---

## 8. STATUS — say which is which

| claim | status |
|---|---|
| 6 part types, radii, GP costs, `+X` forward | **MEASURED** — `js/designer.js` |
| 5 presets, 16 packs each with all 6 parts | **MEASURED** |
| the arc rule matches shipped preset positions | **DERIVED** from those positions |
| size classes S/M/L/XL = 10/12/14/16 | **DERIVED** — chosen to match shipped radii so nothing changes |
| `nodesFromBase` compiles to the shipped array | **SCAFFOLD** — written here, not yet in the repo |
| hull classes above `coreRadius 30` | ⚠ **CONJECTURE** — nothing has ever shipped bigger than 30 |
| mixed-house ships render correctly | ⚠ **UNVERIFIED** — never drawn |

⛔ **Nothing in this file has been run.** It is a specification. The first receipt
is step 1 on screen.

▶ Companion documents: **`ART_PROMPTS.md`** (the art that feeds this) ·
**`PARALLEL_LANES_2026-08-16.md`** (the live board).
