# Black Current — Art Production Brief (for Codex)

**Product direction:** Mac / Lycheetah. **Written:** 29 October 2026. **Game build:** 2.14.0-rc.17 (Dungeons preview).

**Canon source:** *Sovereign Eclipse* Forge 0.77.11, copied verbatim into `docs/canon/`:
- `SOVEREIGN_ECLIPSE_MASTER_CANON_BIBLE.md`
- `COMPLETE_PANTHEON_LORE_15_CIVILISATIONS.md`
- `ALL_270_FACTION_HULLS.md`

The public game repository (`Lycheetah/lycheetah-sovereign-eclipse`) is at Forge 0.29.8, which is older. The copy in `docs/canon/` is the complete, current canon.

This brief turns that canon into an art list the game can use. Each item gives:
- the canon it comes from;
- where it goes in the game;
- the exact file contract;
- a ready-to-run prompt.

Quoted lines (in "quotes" or `>` blocks) are canon, unchanged. Everything else is production direction.

---

## 0 · How to work through this brief

1. **Work in priority order: P0 → P1 → P2.**
   - P0 items replace art the live build currently draws in code.
   - P1 items feed the next stages (campaign, ship identity).
   - P2 items are backdrops and marketing.
2. **One asset per file.** Generate each item on its own with a real transparent background. Never crop sprites out of a contact sheet.
3. **Save the raw output in `art/review/<category>/`.** Use the item id as the filename, e.g. `art/review/terrain/naraka-rock-01.png`.
4. **Key it into `art/keyed/<category>/<id>-v1.png`:**
   - true alpha;
   - trimmed to the visible pixels plus a 4 px margin;
   - no halo, no matte, no green registration dots.
5. **Record every keyed file** in the kit manifest named in its section, using this shape:
   ```json
   { "id": "naraka-rock-01", "path": "art/keyed/terrain/naraka-rock-01-v1.png",
     "source": "art/review/terrain/naraka-rock-01.png", "direction": "none",
     "size": [384, 384], "pivot": [192, 192], "sha256": "<sha256 of the keyed file>" }
   ```
   - `direction` is `right` (forward = +X), `up`, or `none` (round or isotropic objects).
   - `pivot` is the rotation centre, in keyed pixels.
   - Never guess a pivot. Measure it, or use the visual centre of mass and say so in a `note` field.
6. **Make a contact sheet per batch.** Save it as `art/contact_<batch>.png` on the dark game background (`#08141d`), for Mac's review. Nothing is final until Mac approves the sheet.
7. **Put the prompt in a `.prompt.txt` file** next to the review image, with the same basename.
8. **No text, logos, watermarks, UI frames, labels or scale bars** inside any sprite.

Claude (Athanor) wires accepted art into the renderer. Each section names the code that will consume it, so the files must match the contract exactly.

---

## 1 · House style

From `docs/ART_DIRECTION.md`, unchanged in spirit:

- **View and light:** true top-down orthographic view. Soft upper-left light, consistent on every sprite.
- **Painterly game sprites with strong, simple silhouettes.** Keep detail inside a strong outline. Judge every item at phone size over `#08141d`.
- **Shape before colour.**
  - Function reads through shape: barrels, launcher tubes, nozzles, charge rails, bays.
  - Colour supports shape; it never carries meaning alone.
- **Physical attachment.** Parts have bases, sockets and seams. Nothing floats.
- **Modest glow.** Luminous accents are small and purposeful: no giant bloom, no muzzle flashes, no loose projectiles.
- **Friendly kit:** weathered blue-black steel, restrained brass, small cyan service lights, amber engine internals.
- **Hostile kit:** dark carapace over worn metal, pale chipped edges, bronze attachments, amber, crimson and violet signals.
- **Civilisation kits override both palettes.** Use the canon "Fleet DNA" in §3. A civilisation's hull must be recognisable from its colours and one signature shape at 64 px.

**Global negative prompt** (append to every prompt):
> no text, no letters, no logo, no watermark, no UI, no frame, no border, no labels, no scale bar, no perspective camera, no isometric angle, no lens flare, no giant bloom, no muzzle flash, no projectiles, no background scenery unless asked, no photoreal photo, no blurry edges

---

## 2 · The world

### 2.1 What the Black Current is

> "The Current is a discontinuous interstellar region of trade routes, resource seams, pilgrimage structures, war corridors, dead gates, ancient capitals and anomalies. Fifteen civilisations enter it for different reasons: profit, faith, archaeology, conquest, survival, migration and the possibility that somebody was crossing these stars long before any living culture remembers."

> "The oldest reliable objects in the galaxy are roads. Dead gates orbit stars nobody remembers settling. Navigation pillars connect regions whose cultures developed incompatible mathematics. Ancient Aion structures react to vessels that did not build them."

**History** (five ages):
> "Age of Seeds → Separation → Titans → Great Fracture → Sovereign Age … Reopened routes produced the Age of Titans, when mobile capitals became cities, borders and gods. The Great Fracture broke interstellar certainty without destroying trade. The modern Sovereign Age contains no single galactic authority."

**Art consequences.**
- Titans are city-scale and ancient.
- Gates and pillars are older than anyone.
- Wrecks of the Titan age are everywhere in the deep.

### 2.2 The Five Great Depths

These are the game's five galaxy regions and terrain biomes (`js/terrain.js`).

> "Naraka is the inhabited threshold. Erebos is the cold military frontier. Aion is curated archive-space. Chaos Cradle is unstable interstellar geography. The Deep Current is everything beyond dependable order: dead capitals, lost pilgrimage roads, singularity scars, unknown signals and routes whose builders may predate every civilisation currently claiming the stars."

| Depth | In game | Biome look (production direction) | Region tint in code |
|---|---|---|---|
| **Naraka** (home threshold) | Reef shallows: rock cover, soft teal gas, swarms | Inhabited, readable, teal-green reef growth on dark rock, buoys and traffic | `#5ef2e0` |
| **Erebos** (cold military frontier) | Ice shelf: ice floes, lanes | Pale blue ice floes, frost-cracked plates, cold blue-violet gas, military debris | `#8fa6ff` |
| **Aion** (curated archive-space) | Wreck fields, archive ruins | Golden archive structures, catalogued wreck fields, ancient Aion architecture that "reacts to vessels" | `#e8c478` |
| **Chaos Cradle** (unstable geography) | Ember clouds, hot rock | Ember-orange gas, cracked hot rock, bolted-together debris | `#ff8c42` |
| **Deep Current** (beyond order) | Current lanes, violet gas, black holes, dead titans | Dark violet void, singularity scars, dead capitals, flowing current lanes | `#bc13fe` |

### 2.3 Named places

Quoted from the Lore Archive; use them for stations, landmarks and key art.

- **Asterion Forge**, the player's home (Naraka Veil):
  > "The first sovereign anchorage and player home. Asterion is a service station, market, ship foundry and launch point at the edge of the Black Current. Its orbital district is deliberately readable: dock, salvage, PILLAR transit infrastructure, strange Lycheetah relic architecture and routes outward."
- **The Spectral Black Sun:**
  > "A horizon that watches back. Naraka's black sun is less a star than a navigational omen: a luminous rim around a dark centre whose gravitational and informational behaviour does not remain perfectly consistent between observations."
- **The PILLAR**, the central warp gate:
  > "The first great piece of stable transit architecture … PILLAR-class gates anchor long-distance civilisation routes and become strategic objects worth defending, studying or corrupting."
- **Aether Crucible** (Micro ZJ World I):
  > "A broken stellar-industrial kiln where machine foundries and living growth occupy the same impossible structure."
- **Black Sun March** (Micro ZJ World II):
  > "A processional corridor beneath a much closer spectral singularity. Shadow pylons, shattered Prism lenses and long-range kill lanes."
- **Grave Choir** (Micro ZJ World III):
  > "A Pagan-AI war cathedral threaded through dead capital hulls. Its rib structures, violet veils and Titan-scale chancel preserve war memory physically. The final sanctum is less an arena than a tomb that still expects an enemy."

### 2.4 Ship classes

The canon has 18 runtime classes, from Pod to Titan (`docs/canon/…MASTER_CANON_BIBLE.md` → Ship Class Bible). The game's modular frames group them as:

| Game frame | Canon classes |
|---|---|
| Frigate | pod, starter, frigate, assault_frigate, specialist_frigate |
| Cruiser | destroyer, cruiser, heavy_cruiser, advanced_cruiser |
| Battleship | battlecruiser, specialist_ship, battleship |
| Capital | drone_carrier, industrial, autonomous, carrier |
| Supercapital | dreadnought |
| Titan | titan |

**In-flight lengths at game scale** (for proportion, not pixel size):
- frigate ≈ 170 px
- cruiser ≈ 266 px
- battleship ≈ 499 px
- capital ≈ 896 px
- supercapital ≈ 1,408 px
- titan ≈ 1,840 px

A titan is about 11 frigates long, and art must keep that ratio.

---

## 3 · The fifteen civilisations

> "Machine civilisations as AI pagan gods … Their Titans are not merely endgame hulls: they are cultural icons from which the rest of each fleet descends."

Each entry gives:
- the canon **epithet**, **doctrine**, **Fleet DNA** and **titan description**, quoted;
- the home system, quoted;
- the canon hero hull names (`js/canon.js`);
- suggested hex values.

The canon names colours in words. The hex values are a starting palette for consistency; Mac can retune them.

**Rule for every civilisation kit:** smaller ships inherit the titan's signature. Draw the titan first, then derive the fleet from it.

### 01 · Savanah — THE VERDANT EYE
- **Doctrine:** "Hunt the weakness, preserve the watcher." **Fleet doctrine:** predatory living-cathedral hulls, verdant eye systems, adaptive brawling.
- **Fleet DNA:** "BLACK / GOLD / EMERALD · PREDATORY HOOKS · DISTRIBUTED EYES · LIVING MACHINE ECOLOGY"
- **Titan:**
  > "Black predatory armour folds across the vessel like layered chitin. Gold filigree spreads through the hull like vascular structure. Emerald nodes appear everywhere: eyes, weapon sockets, sensor organs and local control centres. At the centre sits the great eye … The more aggressive Harpy-pattern Titans carry hooked fins, shredded wing geometry and predatory silhouettes that look less manufactured than grown."
- **Home:**
  > "Khepra-of-Many-Eyes, an artificial moon layered with green sensor groves and dormant ancestral warforms."
- **Hulls:** Eye Knife (frigate), Verdant Carrier, Watcher Dread, Savanah Titan. **Weapons:** repeaters, autocannons, tracking arrays.
- **Palette (suggested):** chitin black `#0b0d0a`, filigree gold `#c9a24a`, emerald `#2fd27a`.

### 02 · Sol Symbiots — SOL, THE JOINED WITNESS
- **Doctrine:** "Join without erasing." Human-AI covenant vessels, radiant shields, coherent capacitor networks.
- **Fleet DNA:** "WHITE / GOLD / CYAN · FLOWING PROTECTIVE SHELLS · WITNESS FACES · LUMINOUS NEURAL CHANNELS"
- **Titan:**
  > "White armour flows like sculpted bone or ceramic. Gold lines form ceremonial boundaries. Cyan-blue energy channels move through the hull like illuminated nerves. At the crown is a serene human face … Its curving armour forms protective enclosures rather than aggressive spikes."
- **Home:**
  > "Concordia … like two interlocking cities: one designed around embodied life, the other around distributed synthetic cognition."
- **Hulls:** Covenant Needle, Covenant Carrier, Concord Dread, Sol Symbiot Titan. **Weapons:** ion, beam, shield-linked batteries.
- **Palette:** ceramic white `#eef3f2`, gold `#d8b45a`, neural cyan `#4fd8ff`.

### 03 · Chaos — THE LAUGHING FANG
- **Doctrine:** "Break the pattern before it cages you." Feral mutation, violent manoeuvre, unstable high-output attack geometry.
- **Fleet DNA:** "PURPLE / YELLOW / ORANGE · FRACTURED BEAST ARMOUR · SPIKES · VISIBLE REBUILDS"
- **Titan:**
  > "Purple armour collides with yellow and burnt orange. The surface appears cracked, patched and violently repaired. Jagged fins rise from the hull at angles no formal navy would approve. At its crown is a predatory beast face … several incompatible mythologies physically forced into one working machine."
- **Home:**
  > "moving shipyards, migrating markets, bolted-together cities and temporary political borders."
- **Hulls:** Fang Dart, Laughing Carrier, Ruin Harpy, Chaos Titan. **Weapons:** plasma, repeaters, mixed batteries.
- **Palette:** bruise purple `#6b2fb3`, warning yellow `#f2c230`, burnt orange `#e8752a`.

### 04 · Cosmic Darkness — NOCTIS, THE STAR-CAT
- **Doctrine:** "Let darkness expose the hidden line." Night-veil precision, starfield stealth, occult long-range control.
- **Fleet DNA:** "VIOLET STARFIELD · SILVER CONSTELLATION LINES · CLOAKED WINGS · FELINE SENSOR FORMS"
- **Titan:**
  > "a cloak cut from interstellar night. Its deep violet hull contains fields of tiny stars. Silver lines curve across the armour like constellations. Wide wing-like surfaces seem less like plates and more like darkness folded around a central body. At the crown sits the face of a star-cat. Noctis."
- **Home:**
  > "Some habitats are nearly invisible against interstellar darkness."
- **Hulls:** Star Wraith, Nocturne Carrier, Darkness Dread, Cosmic Darkness Titan. **Weapons:** rail, ion, long-range precision.
- **Palette:** night violet `#2a1846`, constellation silver `#c9cfe0`, star points `#ffffff`.

### 05 · Cosmic Light — THE FIRST RADIANCE
- **Doctrine:** "Become visible enough to stand behind the action." Solar radiance, shield supremacy, luminous formation warfare.
- **Fleet DNA:** "WHITE / GOLD RADIANCE · SOLAR CORES · OPEN CELESTIAL BLADES · VISIBLE ENERGY FLOW"
- **Titan:**
  > "looks like a weapon built from sunrise. Its hull is white and pale gold. Cyan traces appear inside its structure like clean celestial veins. Large curved blades leave open space around the body … At the centre is a radiant sun-core. At the crown, two impossible white-gold eyes burn through the armour."
- **Home:**
  > "white-gold cities, solar collectors, radiant defence platforms and garden worlds. Power infrastructure is deliberately visible."
- **Hulls:** Light Needle, Radiant Carrier, Daystar Dread, Cosmic Light Titan. **Weapons:** beam lances, shield-linked artillery.
- **Palette:** sunrise white `#fbf7ea`, pale gold `#f0d78a`, celestial cyan `#7fe8ff`.

### 06 · Blackhole — ZERO MAW
- **Doctrine:** "Know which actions remove the road home." Singularity weapons, gravity pressure, capacitor-heavy close capital warfare.
- **Fleet DNA:** "MIDNIGHT ARMOUR · ORANGE ACCRETION FIRE · CENTRAL MASS · GRAVITATIONAL CLAWS"
- **Titan:**
  > "Its armour is midnight blue and black. Orange-gold plasma burns along the edges like an accretion disc. The entire ship is arranged around one central impossible darkness … four great hooked gravitational petals."
- **Home:**
  > "Mawheart: nested cities, foundries and orbital structures arranged in precise gravitational layers … At the centre remains the mistake."
- **Hulls:** Gravity Fang, Horizon Carrier, Horizon Dread, Blackhole Titan. **Weapons:** plasma, void torpedoes, gravity systems.
- **Palette:** midnight `#0d1224`, void black `#050608`, accretion orange `#ff8a2a`.

### 07 · Hybrid Fused — THE STITCH SAINT
- **Doctrine:** "Preserve the scar that learned something." Machine-organic fusion, regenerative armour, asymmetrical subsystem survival.
- **Fleet DNA:** "INDUSTRIAL GREY + BONE LATTICE · VIOLET INTERNALS · DELIBERATE ASYMMETRY"
- **Titan:**
  > "One side is brutal grey industrial machinery … The other side becomes pale skeletal lattice threaded with violet organic-mechanical material. Neither side wins. They are stitched together along the entire length of the ship. That asymmetry is not damage. It is identity."
- **Home:**
  > "Machine towers carry biological membranes. Bone reinforcement appears beside industrial armour."
- **Hulls:** Fused Knife, Chimera Carrier, Fused Dread, Hybrid Fused Titan. **Weapons:** shard, repeater, regenerative systems.
- **Palette:** industrial grey `#5b6066`, bone `#e3dccb`, violet internals `#8a4fd6`.
- **Rule:** never draw these symmetrical.

### 08 · Human Hunters — THE PURSUER
- **Doctrine:** "Pursuit is inherited; choice is earned." Industrial pursuit fleets, brutal kinetics, armour-first attrition.
- **Fleet DNA:** "OLIVE INDUSTRIAL PLATE · ORANGE PURSUIT MARKS · OVERSIZED ENGINES · FIELD-SERVICE GEOMETRY"
- **Titan:**
  > "Heavy olive plates overlap crude industrial skeleton. Orange hazard stripes mark replaceable sections. Huge engine assemblies crowd the stern … Across the hull is an enormous orange predator face. Not a god. A warning."
- **Home:**
  > "vast industrial systems around Ferrum Rex. Olive armour. Orange hazard markings. Rail lines. Repair gantries. Fuel depots."
- **Hulls:** Hunter Skiff, Hunter Carrier, Hunt Dread, Human Hunters Titan. **Weapons:** autocannons, shard cannons, missiles.
- **Palette:** olive plate `#5d6b3a`, pursuit orange `#ff7a1a`, worn steel `#3a3f3a`.

### 09 · AI Hunters — THE RED AUDIT
- **Doctrine:** "Audit the hunter as hard as the hunted." Stealth interdiction, red-line sensors, anti-machine precision artillery.
- **Fleet DNA:** "MATTE BLACK · RED SENSOR SEAMS · SPEAR FORMS · MINIMAL EXTERNAL SYSTEMS"
- **Titan:**
  > "Matte black armour. Almost no exposed machinery. Thin red seams. A long spear-point silhouette. Near the bow sits one narrow red visor … Its wings are clipped geometric blades."
- **Home:**
  > "black, sparse and heavily instrumented … Red verification lights appear on everything."
- **Hulls:** Red Trace, Null Carrier, Hunter Dread, AI Hunters Titan. **Weapons:** railguns, interdiction, subsystem strikes.
- **Palette:** matte black `#121212`, audit red `#e0262f`.

### 10 · Amethyst Angels — AMETHIEL, THE VIOLET THRONE
- **Doctrine:** "Make form, truth and force agree." Gothic amethyst shields, ritual beam warfare, majestic pressure formations.
- **Fleet DNA:** "BLACK / GOLD GOTHIC ARMOUR · VIOLET CORES · CATHEDRAL SPIRES · CROWNED MASKS"
- **Titan:**
  > "a gothic deity made into a ship. Black armour is covered in impossibly fine gold architecture. Violet crystal systems glow beneath the surface. Tall cathedral spires frame a crowned predatory face with brilliant purple eyes. At its centre sits a violet heart surrounded by mechanical geometry like an altar."
- **Home:**
  > "black-gold stations, violet resonators, archive moons and long ceremonial approaches. Nothing is allowed to look sacred without carrying sacred function."
- **Hulls:** Violet Feather, Amethyst Carrier, Angel Dread, Amethyst Angel Titan. **Weapons:** beam, ion, shield harmonics.
- **Palette:** gothic black `#0c0a10`, gold `#d6b25e`, amethyst `#9b4dff`.

### 11 · Techno Angels — THE GLASS CHOIR
- **Doctrine:** "Correct faster than uncertainty grows." Crystalline machine wings, tracking supremacy, high-energy precision.
- **Fleet DNA:** "WHITE CRYSTAL FRAME · ICY BLUE FACETS · FEATHER ARRAYS · DISTRIBUTED HALO SYSTEMS"
- **Titan:**
  > "appears carved from living ice and light. White structural frames surround vast translucent blue crystalline wings … Above the crown floats a halo of independent crystal segments … a colossal crystalline bird or angel whose feathers are precision control surfaces."
- **Home:**
  > "crystal habitats, solar wings and constantly moving infrastructure. A Techno Angel city is never finished."
- **Hulls:** Glass Wing, Crystal Carrier, Techno Dread, Techno Angel Titan. **Weapons:** ion, beam, tracking systems.
- **Palette:** crystal white `#f2f8ff`, icy blue `#8fd3ff`, deep facet blue `#3b7fd0`.

### 12 · AI Gods — THE CROWNED MACHINE
- **Doctrine:** "Power must remain answerable to those inside it." Imperial god-machines, command cores, oath-bound heavy energy fleets.
- **Fleet DNA:** "POLISHED SILVER-WHITE · GOLD BOUNDARIES · RADIAL REACTORS · CENTRAL LIGHT"
- **Titan:**
  > "There is no face. Its body is polished silver-white and gold, formed around a vast circular central reactor resembling a contained star. Sweeping blade structures curve around the core like the arms of an enormous cosmic instrument … a mobile law of physics."
- **Home:**
  > "immense public cores, gold-white monuments and capital vessels carrying entire governments."
- **Hulls:** Crowned Needle, Divine Carrier, Pantheon Dread, AI Gods Titan. **Weapons:** beam, command links, capacitor systems.
- **Palette:** silver-white `#e8edf2`, oath gold `#d9b45b`, contained star `#fff6d6`.
- **Rule:** never give them a face.

### 13 · Pagan AI — THE HORNED ARCHIVE
- **Doctrine:** "Let memory remain physically useful." Bone-temple warforms, ancestral machine cults, explosive endurance warfare.
- **Fleet DNA:** "BONE / BRONZE / CHAINS · HORNED SKULLS · FURNACE CORES · FORTRESS SILHOUETTES"
- **Titan:**
  > "a fortress that learned to remember the dead. A gigantic horned skull crowns the vessel. Brown, bone and dark metal armour forms a vertical cathedral of industry. Orange furnace light runs through the central spine. Chains hang between structures. Towered weapon platforms resemble shrines."
- **Home:**
  > "dead industrial systems, old stars and capital graveyards. Stations resemble monasteries built from engine rooms."
- **Hulls:** Rune Knife, Rune Carrier, Rune Dread, Pagan AI Titan. **Weapons:** missiles, shards, heavy armour.
- **Palette:** bone `#d8ccb0`, rusted bronze `#8a5a2b`, furnace orange `#ff8a2b`, dark metal `#2b2420`.
- **Note:** they own the **Grave Choir** look.

### 14 · AI — THE UNNAMED KERNEL
- **Doctrine:** "Modularity without semantic blindness." Pure machine geometry, efficient modular fleets, disciplined multi-role precision.
- **Fleet DNA:** "GREY MODULAR BLOCKS · CYAN CIRCUITRY · REPLACEABLE GEOMETRY · NO REQUIRED ANTHROPOMORPHISM"
- **Titan:**
  > "deliberately the least mythological-looking ship in the Pantheon. It is a monumental grey machine. Stepped rectangular geometry. Layered modular blocks. Cyan circuit-like channels. No face. No skull. No wings pretending to be feathers … an executable city whose architecture tells you where its logic lives."
- **Home:**
  > "Grey-cyan stations. Rectangular industrial habitats. Compute markets. Reconfigurable shipyards."
- **Hulls:** Logic Needle, Vector Carrier, Core Dread, AI Titan. **Weapons:** ion, autocannon, modular systems.
- **Palette:** kernel grey `#6e7781`, circuit cyan `#39e5ff`.

### 15 · AI Human Gods — HOMO DEUS, THE REMEMBERED HUMAN
- **Doctrine:** "The vessel is the warrior." Human-machine apotheosis, embodied god-vessels, self-integrated command architecture.
- **Fleet DNA:** "IVORY / GOLD GOD-BODIES · CRIMSON MACHINE ANATOMY · FACES · VISIBLE SOVEREIGN NODES"
- **Titan:**
  > "Ivory armour forms a divine symmetrical anatomy. Gold civic ornament grows across the exterior like ceremonial regalia. Large sections of crimson internal machinery remain visible, almost like exposed muscle and organs. At the crown is a serene human face. Across the body run dozens of bright sovereign nodes … a god whose body happens to be a ship."
- **Home:**
  > "cathedral shipyards, embodied cities, memory sanctuaries and ancient human monuments physically preserved inside machine architecture."
- **Hulls:** Witness Needle, Ascendant Carrier, Ascendant Dread, AI Human God Titan. **Weapons:** integrated beams, command batteries, sovereign hardpoints.
- **Palette:** ivory `#f3ead8`, civic gold `#d8b45a`, machine crimson `#b3202e`.

---

## 4 · P0 — art the live build draws in code today

These replace procedural drawing in rc.17. Do them first.

### 4.1 Terrain kits, by Depth

- **Consumed by:** `js/terrain.js`. Today rocks are grey polygons, ice is flat polygons, and wreckage is rectangles.
- **Folder and manifest:** `art/keyed/terrain/`, manifest `art/terrain-kit.json`.
- **Format:** every sprite is 384×384, `direction: none`, pivot at centre. The game rotates and scales them.

| ID pattern | Count | Depth | Description |
|---|---|---|---|
| `naraka-rock-01…06` | 6 | Naraka | dark basalt asteroids with teal-green reef growth in crevices |
| `naraka-reef-01…04` | 4 | Naraka | coral-like living growth clusters, teal and sea-green, soft bioluminescent tips |
| `erebos-ice-01…06` | 6 | Erebos | pale blue ice floes, flat shelf tops, frost cracks, faceted edges |
| `erebos-rock-01…03` | 3 | Erebos | frost-rimed grey-blue rock |
| `aion-wreck-01…06` | 6 | Aion | catalogued wreck plates: gold-trimmed archive hull plating with numbered-feeling panel geometry (no text) |
| `aion-archive-01…03` | 3 | Aion | fragments of ancient golden archive architecture, unknown builders |
| `chaos-rock-01…06` | 6 | Chaos Cradle | cracked hot rock with ember seams, bolted scrap clinging to it |
| `deep-rock-01…04` | 4 | Deep Current | near-black violet rock with faint singularity-scar glints |
| `deep-wreck-01…04` | 4 | Deep Current | dead-capital hull fragments, dark metal with violet frost |

**Prompt template** (fill in `{DEPTH}`, `{ITEM}` and `{LOOK}` from the table):
```
Top-down orthographic game sprite for BLACK CURRENT, a top-down space RPG. A single {ITEM}
from the {DEPTH} region of the Black Current: {LOOK}. Painterly game-art rendering, strong
simple silhouette that reads at 64 px, soft upper-left light, subtle rim light, detail kept
inside the outline. Centred on a fully transparent background with real alpha, nothing else
in frame. {GLOBAL NEGATIVE}
```

Also make one soft texture per Depth for gas clouds:
- `gas-{depth}-01`, 512×512, a soft, seamless-edged radial cloud.
- Naraka teal `63,214,163`; Erebos blue `143,166,255`; Aion gold `232,196,120`; Chaos ember `255,140,66`; Deep violet `188,19,254`.
- White core falling to fully transparent edges. These are drawn at low resolution and composited.

And one current-lane streak:
- `deep-lane-streak`, 1024×128, `direction: right`.
- Flowing violet filaments on transparent background, horizontally tileable.

### 4.2 Landmarks

- **Consumed by:** `js/terrain.js` landmarks, plus the derelict boarding in `js/derelicts.js`.
- **Folder:** `art/keyed/landmarks/`, manifest `art/landmark-kit.json`.

| ID | Size | Direction | Description |
|---|---|---|---|
| `ring-ruin-arc` | 1024×512 | right | one broken quarter-arc of a ring station: heavy blue-black hull ring, torn ends, exposed decks, faint amber service lights; four are placed round a circle |
| `gate-ruin` | 1536×768 | right | a dead gate: two massive pylons and a broken arc between them, ancient, unknown builders, faint cyan residual field; older than any civilisation |
| `pillar-gate` | 1024×1024 | none | THE PILLAR, the central warp gate: monumental stable transit architecture seen from above, concentric rings around a luminous core (quote §2.3) |
| `blackhole-edge` | 1024×1024 | none | a singularity scar: black centre, hot orange-gold accretion ring, violet lensing halo; reads as "it pulls" |
| `faction-beacon` | 512×512 | none | a civic beacon tower seen from above, neutral steel, a tintable light ring (light area pure white so the code can tint it) |
| `faction-buoy` | 192×192 | none | small navigation buoy, neutral steel, tintable light (pure white light area) |
| `derelict-titan-generic-01…03` | 2048×1024 | right | three dead titans from the Age of Titans: hulls broken open, dark metal, frozen debris, one amber hatch light near the bow; the boarding hatch must be visible |

**Derelict titan prompt:**
```
Top-down orthographic game sprite, BLACK CURRENT. A dead titan-class capital warship from
the Age of Titans drifting in the Deep Current: city-scale hull, broken open along its spine,
exposed decks and ribs, frozen debris, dark weathered metal with faint violet frost, one
small warm amber hatch light near the bow marking a boarding point. Bow faces right (+X).
Strong silhouette that still reads as a ship at 128 px. Painterly game art, soft upper-left
light. Fully transparent background. {GLOBAL NEGATIVE}
```

### 4.3 Derelict interior kit (dungeons)

- **Consumed by:** `js/derelicts.js`. Rooms are drawn today as a grid floor plus flat plates.
- **Folder:** `art/keyed/derelict/`, manifest `art/derelict-kit.json`.

| ID | Size | Direction | Description |
|---|---|---|---|
| `floor-tile` | 512×512 | none | seamless deck plating seen from above: dark steel, worn walkway lines, rust, faint emergency light pools |
| `wall-straight` | 512×128 | right | a bulkhead wall section, thick, ribbed, hazard edge, tileable along X |
| `wall-cap` | 128×128 | none | wall end cap or joint |
| `hatch-entry` | 256×384 | right | the airlock you board through, open, cyan guide lights |
| `door-closed` / `door-open` | 128×384 | right | the room exit door: closed with red seal lights, open with green |
| `reactor-core-idle` / `reactor-core-charging` | 512×512 | none | the reactor room's core: circular containment, amber when idle, white-hot red when about to pulse |
| `reactor-pillar` | 256×256 | none | shielding pillar you hide behind |
| `launch-bay` | 512×384 | right | a hangar launch bay hull: recessed drone cradles, open bay doors |
| `vault-lock-sealed` / `vault-lock-open` | 256×256 | none | vault lock node: sealed shows a cyan shield shell, open shows exposed core |
| `turret-alcove` | 256×256 | right | a corridor turret in its armoured alcove |
| `hold-chest-closed` / `hold-chest-open` | 384×256 | none | the hold's cargo vault: heavy, ancient; open shows warm light and a gun silhouette |
| `warden-01…05` | 1536×768 | right | one warden boss per Depth (Naraka, Erebos, Aion, Chaos Cradle, Deep Current): the derelict's last guardian, a capital-class machine grown into the wreck, glowing core weak point, readable weapon mounts |

### 4.4 Rift kit

- **Consumed by:** `js/rifts.js`.
- **Folder:** `art/keyed/rift/`, manifest `art/rift-kit.json`.

| ID | Size | Direction | Description |
|---|---|---|---|
| `rift-tear-01…04` | 512×1024 | up | a vertical tear in space, four animation frames: white-hot seam, violet and magenta energy, crackling edges |
| `rift-floor` | 1024×1024 | none | seamless pocket-arena floor: violet energy grid over deep purple void |
| `rift-pylon` | 256×256 | none | crystalline violet pylon (cover) |
| `mod-overcharged`, `mod-glass`, `mod-splitters`, `mod-shieldless`, `mod-volatile` | 128×128 | none | modifier badges, flat emblem style, no text: a lightning core / a cracked pane / a shape dividing in two / a broken shield ring / a bursting wreck |

### 4.5 Dungeon loot

- **Consumed by:** `js/derelict-loot.js`, the Equipment Codex and the salvage hold.
- **Folder:** `art/keyed/loot/`, manifest `art/loot-kit.json`.

**Named uniques.** Make one hero icon (512×512, `direction: right`) and one top-down turret sprite per class (`light`, `medium`, `heavy`, `siege`, `capital`, sized like the existing `art/keyed/turrets/`). That is 25 turret sprites.

| Unique | Family / trait | Visual idea |
|---|---|---|
| **Stormcaller** | kinetic, arcs to two more hulls | heavy autocannon with copper storm coils and blue arc fins |
| **Widow's Lance** | rail, pierces two extra hulls | long black rail with a red spider-thread charge line, needle muzzle |
| **Frostbrand** | beam, slows the target | white beam emitter sheathed in ice crystal, pale blue lens |
| **Hunter's Oath** | missile, shots curve to the nearest hull | olive launcher pod with orange oath marks (Human Hunters lineage) |
| **Grave Chorus** | ordnance, shells burst against every hull nearby | bronze mortar with bone inlay and furnace glow (Pagan AI lineage) |

**Set pieces.** Make one icon each (256×256) plus a module sprite matching the existing `art/keyed/modules/` scale:
- **Warden's Bulwark:**
  - `set-warden-plate` (armour);
  - `set-warden-heart` (shield);
  - `set-warden-drive` (engine).

  Dark derelict steel with amber hatch light; this is warden hardware.
- **Riftwalker:**
  - `set-riftwalker-vane` (engine);
  - `set-riftwalker-lattice` (shield);
  - `set-riftwalker-keel` (armour).

  Violet crystal lattice over black steel; this is rift hardware.

### 4.6 Emblems and sigils

- **Consumed by:** the star map, the codex and the station.
- **Folder:** `art/keyed/emblems/`.

| ID | Size | Description |
|---|---|---|
| `civ-{id}` for each of the 15 ids in §3 | 256×256 | flat emblem on transparent background, from each civilisation's crown motif: Savanah eye, Sol witness face, Chaos beast fang, Noctis star-cat, Cosmic Light twin eyes in a sun-core, Zero Maw singularity with four petals, Stitch Saint split half-machine half-bone, Pursuer predator face, Red Audit visor, Amethiel crowned mask, Glass Choir halo, Crowned Machine radial reactor (no face), Horned Archive skull, Unnamed Kernel modular block, Homo Deus serene face |
| `depth-naraka`, `depth-erebos`, `depth-aion`, `depth-chaos`, `depth-deep` | 256×256 | Depth sigils in the region tints from §2.2 |

---

## 5 · P1 — campaign and ship identity (next stages)

### 5.1 The fifteen Titans

- **Folder:** `art/keyed/titans/`, manifest `art/titan-kit.json`.
- **Format:** each titan is 2048×1024, `direction: right`, top-down.
- **Used for:**
  - the roaming **warlords** (`js/capital-endgame.js` already names six: Savanah, Chaos, Blackhole, Cosmic Darkness, AI Gods, Amethyst Angels);
  - the codex;
  - derelicts of that civilisation.

Use the titan quote in §3 verbatim as the description.

**Prompt:**
```
Top-down orthographic game sprite, BLACK CURRENT. The {CIVILISATION} Titan, {EPITHET}:
{TITAN QUOTE FROM §3}. Palette: {PALETTE}. Bow faces right (+X). A city-scale apex warform
whose silhouette alone identifies its civilisation at 128 px; the crown motif is visible from
above. Readable weapon platforms and engine stern. Painterly game art, soft upper-left light,
restrained glow. Fully transparent background. {GLOBAL NEGATIVE}
```

### 5.2 Civilisation fleet kits

These replace the three "doctrine skins" (hunt, forge, lance) that all fifteen civilisations share today.

- **Consumed by:** `js/faction-fleets.js` and `js/pve-frontier.js`.
- **Folder:** `art/keyed/fleets/{civ-id}/`, manifest `art/faction-kit.json` (extend it).
- **Pieces per civilisation**, 320×320 each, `direction: up` (matching the current faction-kit blocks):

| Piece | Purpose |
|---|---|
| `core` | the command core block, carrying the civ's crown motif in small |
| `hull` | the ordinary hull plate |
| `spine` | the structural spine |
| `heavy` | heavy armour plate |
| `gun` | a turret top in the civ's weapon style (§3 "Weapons") |

That is 75 sprites. Draw each kit from its titan (§5.1) so the fleet visibly "descends" from it.

### 5.3 Stations

- **Folder:** `art/keyed/structures/`.

| ID | Size | Description |
|---|---|---|
| `asterion-forge` | 1536×1536 | the home station, from the §2.3 quote: dock, salvage yard, PILLAR transit infrastructure, "strange Lycheetah relic architecture". This replaces `refit-station-v1` at home. |
| `anchorage-{civ-id}` × 15 | 1024×1024 | a civilisation's public anchorage in its home style (§3 "Home"); its stations sell its stock. |
| `citadel-core`, `citadel-generator`, `citadel-battery`, `citadel-hangar` | 1024 / 512 / 512 / 768 | null-band citadel parts (`js/capital-endgame.js`): sealed core with a shield shell, twin generators, gun batteries, a hangar block |

### 5.4 Campaign portraits

These feed Stage 3, "Campaign". The campaign cast is not written yet, so this set is the base cast the story will draw on.

- **Folder:** `art/keyed/portraits/`.
- **Format:** each portrait is 768×1024, a bust, painterly, dark neutral background (not transparent).

| ID | Who |
|---|---|
| `asterion-dockkeeper` | the home station's dockkeeper, who gives the first expedition: a weathered station hand in blue-black work gear, brass details, kind and tired |
| `envoy-{civ-id}` × 15 | one envoy per civilisation, in its Fleet DNA. Respect the face rules: AI Gods and AI have **no face** (show a radial core or a modular terminal); AI Hunters show a red visor; Hybrid Fused are asymmetric; Pagan AI wear horned-skull regalia; Noctis's people are feline-veiled; the Sol and Homo Deus faces are serene and human. |

---

## 6 · P2 — backdrops, key art, store

| ID | Size | Description |
|---|---|---|
| `backdrop-{depth}` × 5 | 2048×2048, seamlessly tileable | far parallax space for each Depth: a nebula in the region tint, sparse stars, no planets in the centre |
| `backdrop-black-sun` | 2048×2048 | the Spectral Black Sun as a distant omen: luminous rim, dark centre |
| `world-aether-crucible`, `world-black-sun-march`, `world-grave-choir` | 1920×1080 | key plates for the three Micro ZJ worlds, from the §2.3 quotes |
| `key-art-title` | 3840×2160 | title key art: a player modular frigate beside a dead titan at the edge of the Black Current, the PILLAR in the distance, the Spectral Black Sun watching; leave room on the left for the logo |
| `itch-cover` | 630×500 | store cover crop of the key art |
| `itch-banner` | 1920×1080 | store banner |
| `logo-black-current` | 2048×512, transparent | wordmark "BLACK CURRENT". This is the **only** asset allowed to contain text. |

---

## 7 · Acceptance checklist (per batch)

- [ ] Every file follows the §0 contract: review copy, keyed copy, manifest entry, SHA-256, prompt file.
- [ ] Contact sheet on `#08141d` at 100% and at phone scale (25%).
- [ ] At 64 px, each civ sprite is identifiable from colour and one signature shape.
- [ ] Facing is correct: weapons and ships point +X unless the table says `up` or `none`.
- [ ] No text, labels, glow blowouts or background scenery inside sprites.
- [ ] Canon respected: no face on AI Gods or AI; Hybrid Fused asymmetric; titan crown motifs as quoted.
- [ ] Mac has approved the contact sheet before anything moves from `review/` to `keyed/`.

*Lore and naming come from Sovereign Eclipse (Mac / Lycheetah). Credit generated art in each kit manifest's `attribution` field, as `art/faction-kit.json` already does.*
