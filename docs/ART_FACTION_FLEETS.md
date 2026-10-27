# Faction fleet kit · 27 October 2026

World, canon and direction: Mac / Lycheetah / Sovereign Eclipse.
Twelve existing keyed assets were selected from Mac's supplied Aetheron art.
Their original PNG files are unchanged; model/provider provenance beyond that
handoff is unverified. No sibling seat files were edited.

`art/faction-kit.json` is the acceptance list: six structural textures and six
turret sprites, with original source references, SHA-256 and normalised turret
pivots. It selects only those files from the larger incoming kit.

Three shared visual/tactical styles cover the fifteen canonical civilisations:

- Hunt: chitin, a living core and ribbed spine; hooked rear shoulders; split
  stalker orbit directions and hunting-wing compositions.
- Forge: industrial armour and mechanical turrets; broad bow shoulders;
  chargers, covering gunships and artillery.
- Lance: gold-bound citadel/keel art and radiant mounts; a longer connected
  bow; sniper screens and tenders that hold back from the immediate fight.

These are shared styles, not fifteen completed art sets or new civilisations.
Enemy names use existing canon hull names. Fresh ordinary sector actors and
three-ship patrols use existing roles. The first three home rings, practice,
boss sectors, named encounters, elites and quest guard index zero are protected
from composition changes. The tender's existing brood remains capped by the
native AI. No raw HP bonus or weapon/reward retuning is added by this batch.

Runtime: `js/faction-art.js`, `js/faction-fleets.js`, and small extensions to
`pve-frontier.js`, `contacts.js`, `topdown-kit.js` and encounter labels. The one
painter uses the same pivots in world rendering and model thumbnails. Missing
art falls back; the focused gate explicitly rejects fallback as success.

The candidate builder validates selected hashes. The standalone embeds this
manifest and the twelve images. Other incoming files stay out of the package.

`scripts/witness-faction-fleets.mjs`: **29/29** focused packaged/offline checks.
It compiled 300 civilisation/class/role models; witnessed three native sector
formations and patrols, actual steering, real firing and destroyed guns,
protected actors, twelve sprites reached in rendering, phone warnings clear
of reactor controls, cache bounds, six protected sources and package hashes.
The initial fixture was corrected to distinguish the tender's native child
drone from its three patrol members; a frigate scene reaches the smaller solar
turret skin. Normally lit desktop and phone screenshots were inspected.

Evidence: `shots/faction-fleets/`. Full npm regression did not run; actual phone
FPS, touch and combat balance remain unverified. Local, uncommitted, unpublished.
