# Black Current — modular ship art direction

Product direction: Mac / Lycheetah. Working draft, 25 October 2026.

Shipbuilding and RPG progression drive the art. A component should explain its job,
attachment and scale before a player opens its statistics. This first set establishes
one coherent industrial family for the structural-hull and typed-slot work in
FORGE_PLAN.md S02–S04. The concept sheet is a design reference, not a runtime atlas.

## Shared visual language

- Weathered blue-black steel, restrained brass reinforcement and small luminous
  service details, continuing the existing abyssal ship palette.
- True top-down silhouettes, consistent lighting and physical attachment bases.
  A gun is a gun assembly; a hull section is structure with usable space.
- Hull ribs and seams show how sections connect. Empty sockets remain visible;
  fitted equipment meets those sockets instead of floating over a complete ship.
- Function reads through shape: paired barrels, recessed launcher tubes, an engine
  nozzle, exposed charge rails. Colour supports shape and does not carry meaning alone.
- Small equipment stays compact. Capital hardware has substantial structure,
  clearance and mounting space; rarity is not represented by extra bullet effects.
- Keep detail inside a strong outline. Judge every item at its intended phone size
  over the actual dark game background before accepting a production sprite.

## First construction kit

| Asset | Visible purpose | Construction / RPG role |
| --- | --- | --- |
| Structural keel | Ribbed spine and fore/aft couplers | Connects hull sections; establishes silhouette |
| Armour section | Plating around readable empty mount space | Protects structure and offers defined sockets |
| Engine block | Nozzle, heat fins and one clear attachment face | Mobility with space and power costs |
| Point-defence turret | Compact twin barrels and circular turret base | Light tracking weapon on a small weapon slot |
| Torpedo battery | Armoured launcher tubes and heavy mounting base | Deliberate heavy shots and a larger fitting footprint |
| Capital rail | Long charge rails, reinforced cradle and large base | Capital-class commitment, power demand and clearance |

Build frigate and cruiser sections first. Expand into carrier hangar bays,
dreadnought spinal sections and titan reactor/armour assemblies after the first
hull/slot/owned-module loop works. Different families can follow the shared connector
rules; faction colours and ornament come after functional readability.

## Production contract

1. Pick the connector and slot geometry with the builder implementation before
   commissioning a large sprite batch. The silhouettes here are proposals.
2. Generate each accepted component separately with real transparency; deliver
   isolated sprites rather than crop labels and backgrounds out of this sheet.
3. Draw every sprite NOSE UP: the front of a ship, section or gun points to the top of the
   image; engine exhaust points down. The loaders (section-art.js, turret-art.js, art-drop.js)
   turn it to face +X in flight. (Corrected 2026-10-30: this line used to say barrels face
   right, which contradicted the loaders.) Delivery rules and ids: docs/ART_CAEL_BRIEF.md.
   Structural connectors and module attachment anchors must be documented.
4. Record measured bounds, attachment anchor and rotation pivot per sprite. The
   current renderer reads art/manifest.json and marker-free clean sprites; any
   adapter for structural sockets must preserve that distinction. Do not invent
   measured pivots or silently rebuild authored type assignments.
5. Preview new art in the actual editor and flight renderer. Check fit, overlap,
   rotation, foreground/background order and legibility at small sizes.

## First concept sheet

Saved: [six-piece concept sheet](../art/concepts/asterion-components-v1.png).
Generated using the built-in image
generation tool. Concept only; this is not yet fitted, priced or deployed content.

The generated scale bars are illustrative, not measured game units. The sheet
has been inspected for component identity, orientation and connector readability;
in-game fit and phone-scale legibility remain unverified.

### Generation prompt

Use case: stylized-concept.
Asset type: one landscape art-direction concept sheet for Black Current, a top-down
modular ship-building RPG. Create a clean 3-column by 2-row component design board,
with six distinct isolated physical components, generous spacing, consistent scale
cues, and a deep ink-navy background. Header text: BLACK CURRENT / MODULAR KIT 01.

Top row, labelled STRUCTURAL KEEL, ARMOUR SECTION, ENGINE BLOCK. Bottom row,
labelled POINT DEFENCE, TORPEDO BATTERY, CAPITAL RAIL. Each object is a component,
not a complete spacecraft. The keel has a ribbed structural spine and obvious
fore/aft interlocking couplers. The armour section has broad plates around clear
empty attachment sockets. The engine has heat fins, a physical attachment face and
an exhaust nozzle facing left. The point-defence turret has a compact circular
swivel base and twin short barrels facing right. The torpedo battery has three
recessed armoured launch tubes, a substantial cradle and clear mounting base.
The capital rail has long paired charge rails facing right, a reinforced cradle,
sparse violet charge details and visibly heavier structure than the small turret.

Style: detailed painterly game sprites with strong simplified silhouettes,
weathered blue-black steel, restrained brass braces, subtle cyan service lights
and restrained amber engine internals. Coherent industrial design, no unrelated
faction ornament. True top-down orthographic view, consistent soft upper-left
lighting, physical connection points readable on every part. Modest luminous
accents; no giant bloom, firing effects, loose projectiles, scenery, watermark,
green registration dots, photorealistic perspective or whole ships posing as
modules. Keep the forms useful as references for later small-screen sprites.

## Hostile ships — role study

The current AI already uses mote, stalker, charger, sniper and hive archetypes.
This study maps those existing roles to distinct silhouettes, plus a proposed
capital hunter. Concept art does not add an AI behaviour or a new spawn class.

| Role | Silhouette | Readable equipment / counterplay cue |
| --- | --- | --- |
| Mote / scout | Small compact dart | One exposed light gun; small vulnerable core |
| Stalker / flanker | Hooked crescent | Off-axis engine pods and paired short weapons |
| Charger / rammer | Broad blunt wedge | Reinforced prow and visible engine heat at the rear |
| Sniper | Long narrow spine | One unmistakable rail assembly and exposed charge hardware |
| Hive / carrier | Broad pod with recessed bays | Visible drone hangars; engine/core targets away from bays |
| Capital hunter, proposed | Heavy segmented hull | A few large batteries, substantial armour and readable weak points |

Enemy plates use dark carapace and worn metal with pale chipped edges, restrained
bronze and amber/crimson/violet signals. Shape and mounting arrangement establish
role independently of colour. Keep the small scout small at the same world zoom;
capital scale must come from actual hull geometry.

Production enemies need separate structural and fitted-part sprites. Preserve the
existing lost-part, damage, recoil and salvage behaviour: a destroyed turret must
visually disappear, and a flat painted hull must not hide whether a fitting remains.
Before integration, establish part anchors and review the actual EnemyOrganism draw
path. This board is a visual target, not a replacement renderer or installed enemy set.

Saved: [enemy concept lineup](../art/concepts/hostile-fleet-v1.png). Generated
with the built-in image tool. Six primary role silhouettes and their equipment
were inspected. These are proposed assemblies; runtime pivots, detachable layers
and phone-scale readability still require production validation.
Physical dimensions and threat balance remain unspecified at concept stage.

### Hostile ship generation prompt

Use case: stylized-concept.
Asset type: a single landscape enemy-fleet art-direction sheet for BLACK CURRENT,
a top-down modular living-ship RPG. Clean three-column, two-row board, six primary
assembled enemy ships, all flying toward the right. Use a deep ink-navy backdrop
and precise restrained typography. Header: BLACK CURRENT / HOSTILE FLEET 01.
Top-row labels: MOTE SCOUT, STALKER FLANKER, CHARGER RAMMER. Bottom-row labels:
RAIL SNIPER, HIVE CARRIER, CAPITAL HUNTER.

Shared style: beautifully rendered painterly game concept sprites, true overhead
orthographic view, layered living carapace over weathered mechanical structure,
dark blue-black plates with pale chipped armour edges, worn bronze attachments,
small amber and crimson signals with occasional violet weapon charge. Consistent
upper-left lighting. Distinct from the friendly steel/brass kit while belonging
to the same universe. Physical attachment bases, detachable equipment, visible
reactor hardware and readable silhouettes. Strong broad forms that remain useful
for a phone-size sprite; restrained fine detail and glow.

MOTE SCOUT is a small compact dart with one obvious exposed light gun and a
vulnerable circular core. STALKER FLANKER has a hooked crescent body, offset engine
pods and paired short guns. CHARGER RAMMER is a broad blunt wedge with a heavily
reinforced prow, little side armament and powerful visible rear engines.
RAIL SNIPER is a long narrow ship built around one unmistakable charged rail spine,
with delicate exposed charge hardware and no generic cluster of extra guns.
HIVE CARRIER is a broad armoured pod with two recessed drone hangars and visible
engine/core targets; two tiny subordinate drones can show the bay role.
CAPITAL HUNTER is a substantial segmented heavy hull with a distinctive command
core, layered armour and only a few massive batteries, suggesting deliberate
powerful attacks. Its mounting structure belongs to the same component language.

Show an honest relative size hierarchy at one shared drawing scale: do not enlarge
the small scout to fill its panel. The scout should be about one third the capital
hunter's length. Leave generous space around every silhouette. Make each ship
recognisable by shape alone, with weapons and engines visibly fitted to its hull.
No firing effects, projectile clouds, giant bloom, green registration dots,
perspective scenes, UI screenshots, watermark or unrelated faction logos.

## Refit station production sprite

One isolated overhead station asset for the actual world renderer. The station
anchor is the centre of its square canvas; physical docking uses the existing
station range rather than the decorative outer tips. The image must have real
transparency and separate empty berths, so ships remain independent game objects.

### Refit station generation prompt

Use case: stylized-concept.
Asset type: one production-candidate transparent PNG sprite for a top-down browser
space RPG, Black Current. A friendly industrial orbital refit station, seen from
strict overhead orthographic view, centred in a square canvas. No perspective tilt.
Weathered blue-black steel, restrained brass structural braces and cyan service
lights match a modular shipbuilding universe. A substantial round command/reactor
hub connects four structural dock arms. Two broad open drydock cradles, a repair arm
with tool gantries and a freight/market platform provide distinct readable shapes.
All berths are empty; do not draw ships. Keep clear negative space between arms.
Use strong readable large forms, restrained surface detail, crisp painterly game
sprite rendering, consistent upper-left lighting, and modest cyan accent lights.
The sprite must remain recognisable at 140 pixels across on a dark navy background.
No lettering, icons, border, diagram, backdrop, watermark, explosions, projectiles,
cast background shadow, green registration markers or baked-in spacecraft. Real
transparent background throughout the gaps and outside the station. Keep the entire
station visible with an even 8% transparent margin around all outer arms.
