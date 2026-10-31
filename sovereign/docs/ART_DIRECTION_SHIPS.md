# Ship art direction

How Sovereign Eclipse ships should look, and why. Studied from EVE Online and other space games as
**design principles**, then written in our own shape language from the Pantheon codex
(`docs/canon/COMPLETE_PANTHEON_LORE_15_CIVILISATIONS.md`). We borrow lessons, never shapes.

## What the study says

1. **Silhouette first.** A hull must read at Overview-bracket size, as a dark shape against a nebula.
   The outline should say what the ship does: a carrier reads flat and open, a dreadnought reads like a
   gun. Spend geometry on silhouette edges and big surface breaks before small detail.
2. **Big, medium, small (60 / 30 / 10).** One dominant mass, a few secondary forms layered on it, then a
   little detail. Keep most surfaces calm; concentrate detail at engines, sensors, hangars and guns.
3. **Detail must look purposeful.** Vents, ports, hatches, pipes and seams that suggest a job, never
   random greebles stuck on for noise ("the trouble with greebles").
4. **Scale cues.** In empty space the eye judges size from detail: windows, running lights, hangar doors
   and hatches sized to people. Titans need many small lit windows; frigates need few.
5. **Faction language by contrast.** EVE's artists set races against each other on purpose: Caldari
   sealed into a sleek uniform shell with few exposed systems, Minmatar deliberately exposing internals,
   with warm crowded windows to say "full of crew". Our fourteen civilisations are paired the same way
   (below), so neighbours never blur.
6. **Two or three tones plus one glow.** Hull tone, trim tone, one metal; one emissive accent that
   identifies the civilisation from far away. Team colour (cyan yours, red hostile) rides on strakes and
   shields, never repaints the hull.
7. **Life inside.** Crewed civilisations show lit windows; machine civilisations show sensor seams
   and circuitry instead, never windows.
8. **Guns and engines tell mass.** Turret size follows weapon class; engines are the brightest,
   cleanest-read part of the ship and scale with how heavy the hull feels to fly.
9. **Turrets live.** They swivel and elevate to track, at a speed that matches the weapon (flak snaps,
   railguns grind), and kick back when they fire.

## Contrast pairs

| Sealed / clean | against | Exposed / worked |
|---|---|---|
| Sol Symbiots (flowing shells) | | Chaos (fractured armour, visible rebuilds) |
| AI Hunters (minimal external systems) | | Human Hunters (field-service geometry, oversized engines) |
| Techno Angels (crystal frame) | | Pagan AI (bone, bronze, chains) |
| Cosmic Light (open radiance) | | Cosmic Darkness (cloaked, absorbent) |
| AI Gods (polished, radial order) | | AI (replaceable modular blocks) |
| Amethyst Angels (gothic, vertical) | | Blackhole (squat around a central mass) |
| Savanah (grown, organic predator) | | Hybrid Fused (stitched, deliberately asymmetric) |

## Civilisation sheets

| Civilisation | Silhouette | Secondary forms | Detail and scale cues | Turrets | Drives | Avoid |
|---|---|---|---|---|---|---|
| **Savanah** | hunched predator, pincer bow | layered chitin plates with gold lips, hooked fins | emerald eyes everywhere, gold veins; few warm windows | organic domes, eye-lens sensor on each | twin outboard pods, gold collars | hard right angles |
| **Sol Symbiots** | domed protective shell | overlapping shells, witness faces | luminous cyan neural channels, many soft windows | smooth shielded blisters | wide soft-glow drive bands | exposed pipes |
| **Chaos** | ragged beast, heavy jaw | mismatched rebuilt plates, spikes | yellow weld seams, exposed internals | asymmetric, oversized | uneven, flaring | symmetry |
| **Cosmic Darkness** | flying wing | cloaked wing blades, feline sensor ears | silver constellation lines, almost no lights | low, retractable | hidden slot drives | bright surfaces |
| **Cosmic Light** | spine through a halo ring | open celestial blades | visible energy flow, solar core | gold lances | radiant rings | dark mass |
| **Blackhole** | squat hull around a central mass | gravitational claws, accretion ring | orange fire seams, very few windows | heavy squat casemates | deep recessed nozzles | thin parts |
| **Hybrid Fused** | two different hulls stitched | bone lattice, grafted pods | violet stitching, mixed window styles | mismatched pairs | one big, one small | perfect symmetry |
| **Human Hunters** | industrial brick | service modules, cargo, cranes | orange pursuit stripes, warm crowded windows | boxy autocannon mounts | oversized, exposed | elegance |
| **AI Hunters** | spear / needle | faceted stealth plates | red sensor seams only, no windows | flush, hidden until firing | thin slit drives | clutter |
| **Amethyst Angels** | vertical cathedral sail | spires, buttresses, crowned mask | violet cores, gothic window rows | ornate gold towers | cathedral-arch nozzles | low profiles |
| **Techno Angels** | faceted crystal | feather arrays, halos | icy facets, distributed halo lights | crystal prisms | halo-ringed | metal greebles |
| **AI Gods** | trident / radial | radial reactors, crown | gold boundaries, central light | polished radial mounts | ring drives | asymmetry |
| **Pagan AI** | stepped fortress | bone ribs, horns, towers | furnace glow, chains, battlements | tower casemates | furnace mouths | sleekness |
| **AI** | open modular lattice | cubes on a frame | cyan circuitry, no windows | identical modular blocks | square nozzles | faces, ornament |

## Workflow per hero hull

1. Silhouette pass in Blender (cage + subdivision), checked as a black shape at small size.
2. Secondary pass: layered plates, fins, pods, role structure.
3. Detail pass: panel seams, purposeful greebles, windows or seams, lights.
4. Markers: `NODE_WPN_*`, `ENGINE_*`; palette materials `HULL`, `TRIM`, `GOLD`, `GLOW`.
5. Studio render (`tools/blender/render.py`) for review, then in-game shots before it ships.

## Sources studied
- CCP, "Iconic Ships Reimagined: the Minmatar Rupture" (racial contrast, exposed internals, windows) — https://www.eveonline.com/news/view/iconic-ships-reimagined-the-minmatar-rupture
- CCP, "Introducing Racial Captain's Quarters" (racial interior languages) — https://www.eveonline.com/zh/news/view/introducing-racial-captain-s-quarters
- Kinnear & Kaplan, procedural spaceship detailing (silhouette and staging) — https://cs.uwaterloo.ca/~csk/publications/Papers/kinnear_kaplan_2010.pdf
- 99% Invisible, greebles as scale cues — https://99percentinvisible.org/article/interstellar-illusions-greebles-lend-large-sci-fi-structures-a-sense-of-scale/
- Fractal Softworks, "The Trouble With Greebles" (purposeless detail) — https://fractalsoftworks.com/tag/greebling
- PCGamesN, Fractured Space ship design masterclass (outline communicates function) — https://www.pcgamesn.com/fractured-space/fractured-space-ship-design
