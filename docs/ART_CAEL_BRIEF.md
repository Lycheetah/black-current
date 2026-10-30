# Art brief for Cael · Black Current

Mac (2026-10-30): "I'm going to have Cael generate an absolute boat load of art for the game." This brief says what the game needs and how to deliver it so it goes in without code changes. Drop the files under `art/cael/`, run `python3 scripts/import-art.py`, and the game picks them up (`js/art-drop.js`).

## The rules for every image

- **Top-down**, seen straight from above. **Nose UP**: the front of the ship or gun points to the top of the image.
- **PNG with a transparent background.** No shadow or glow baked onto the background. The game adds glow, light and bloom.
- **Size:** 128 to 2048 px. Guns are square.
- **Style:** the game's look is dark steel, faction colour on trim, readable silhouettes at small size (see `docs/ART_DIRECTION.md`). Factions and names come from Mac's canon (`docs/canon/`); invent no new lore names.
- **One file per id**, named exactly as the id below (`drive.png`, `rifle-heavy.png`).

## What is wired now (lands without code)

### 1 · Hull sections → `art/cael/sections/<kind>.png`

The modular ship is built from these plates. Each fills its section's footprint (about 46×40 units; spines are long), nose up.

| Kind | Name | Slot |
|---|---|---|
| `bridge` | Command core | utility |
| `spine` | Structural spine | structure |
| `plate` | Armour plate (+35 base hull HP) | structure |
| `novice` | Novice weapon deck | point |
| `deck` | Light weapon deck | light |
| `battery` | Medium battery deck | medium |
| `drive` | Engine block | engine |
| `utility` | Utility section | utility |
| `heavy` | Heavy battery deck | heavy |
| `hangar` | Hangar deck | utility |
| `spinal` | Spinal mount | capital |

### 2 · Guns → `art/cael/guns/<gun-id>.png` (one gun) or `art/cael/arch/<archetype>.png` (a whole archetype)

A gun is a turret seen from above: a round base (the part that turns) with barrels pointing UP. By default it turns about the image centre and the base fills about 64% of the width. If yours differs, add `<name>.json` beside it: `{"pivot": [x, y], "radius": r}` in pixels. A gun image wins over its archetype image; an archetype image covers every gun of that archetype that has no image of its own.

**Archetypes (15):** `cannon`, `repeater`, `scatter`, `stream`, `driver`, `rifle`, `bolt`, `pulse`, `lance`, `seeker`, `rocket`, `torpedo`, `mortar`, `flak`, `shell`

#### Kinetic (15 guns)

| Gun id | Name | Class | Archetype |
|---|---|---|---|
| `repeater-point` | Pepper gun | Point | repeater |
| `scatter-point` | Scattergun | Point | scatter |
| `spitter` | Spitter autogun | Point | cannon |
| `autocannon` | Rotary autocannon | Light | repeater |
| `scatter-light` | Deck shotgun | Light | scatter |
| `twin` | Twin cannon | Light | scatter |
| `boomerang` | Boomerang driver | Medium | scatter |
| `heavycannon` | Heavy deck cannon | Medium | cannon |
| `scatter-medium` | Broad scattergun | Medium | scatter |
| `cannon-heavy` | Battle cannon | Heavy | cannon |
| `repeater-heavy` | Megacannon | Heavy | repeater |
| `cannon-siege` | Siege cannon | Siege | cannon |
| `scatter-siege` | Siege shotgun | Siege | scatter |
| `cannon-capital` | Titan cannon | Capital | cannon |
| `repeater-capital` | Storm battery | Capital | repeater |

#### Rail (14 guns)

| Gun id | Name | Class | Archetype |
|---|---|---|---|
| `driver-point` | Pin driver | Point | driver |
| `flechette` | Flechette repeater | Point | stream |
| `needler` | Needle Stream | Point | stream |
| `rifle-point` | Marksman rail | Point | rifle |
| `driver-light` | Coil carbine | Light | driver |
| `rifle-light` | Longshot rail | Light | rifle |
| `rifle-medium` | Lancer rifle | Medium | rifle |
| `stream-medium` | Needle storm | Medium | stream |
| `driver-heavy` | Mass driver | Heavy | driver |
| `rifle-heavy` | Starshot rifle | Heavy | rifle |
| `railgun` | Needle railgun | Siege | driver |
| `rifle-siege` | Horizon rail | Siege | rifle |
| `capitalrail` | Capital spinal rail | Capital | driver |
| `rifle-capital` | Eclipse rail | Capital | rifle |

#### Beam (13 guns)

| Gun id | Name | Class | Archetype |
|---|---|---|---|
| `bolt-point` | Pulse emitter | Point | bolt |
| `burst` | Three-round pulse | Point | pulse |
| `lance-point` | Light lance | Point | lance |
| `pulse-light` | Pulse rifle | Light | pulse |
| `wave` | Wave emitter | Light | lance |
| `lance-medium` | Ion lance | Medium | lance |
| `laser` | Bolt laser | Medium | bolt |
| `bolt-heavy` | Heavy bolt array | Heavy | bolt |
| `pulse-heavy` | Pulse battery | Heavy | pulse |
| `lance` | Siege lance | Siege | lance |
| `pulse-siege` | Pulse bastion | Siege | pulse |
| `bolt-capital` | Solar bolter | Capital | bolt |
| `lance-capital` | Sun lance | Capital | lance |

#### Missile (13 guns)

| Gun id | Name | Class | Archetype |
|---|---|---|---|
| `rocket-point` | Rocket pod | Point | rocket |
| `seeker-point` | Micro-missile pod | Point | seeker |
| `torpedo-point` | Dart torpedo | Point | torpedo |
| `rocket-light` | Rocket rack | Light | rocket |
| `seeker-light` | Seeker rack | Light | seeker |
| `rocket-medium` | Rocket barrage | Medium | rocket |
| `seeker-medium` | Swarm launcher | Medium | seeker |
| `rocket-heavy` | Thunder rockets | Heavy | rocket |
| `torpedo` | Heavy torpedo | Heavy | torpedo |
| `seeker-siege` | Hellfire salvo | Siege | seeker |
| `torpedo-siege` | Siege torpedo | Siege | torpedo |
| `seeker-capital` | Swarm battery | Capital | seeker |
| `torpedo-capital` | Doomsday torpedo | Capital | torpedo |

#### Ordnance (13 guns)

| Gun id | Name | Class | Archetype |
|---|---|---|---|
| `flak` | Flak Burst | Point | flak |
| `mortar-point` | Grenade launcher | Point | mortar |
| `shell-point` | Light howitzer | Point | shell |
| `mortar-light` | Pocket mortar | Light | mortar |
| `shrapnel` | Shrapnel shell | Light | flak |
| `flak-medium` | Flak cannon | Medium | flak |
| `mortar` | Triple mortar | Medium | mortar |
| `howitzer` | Siege howitzer | Heavy | shell |
| `mortar-heavy` | Nova mortar | Heavy | mortar |
| `cluster` | Cluster bombard | Siege | shell |
| `flak-siege` | Flak bastion | Siege | flak |
| `mortar-capital` | Cataclysm mortar | Capital | mortar |
| `shell-capital` | Titan bombard | Capital | shell |

## Next to wire (send them; the loader learns these kinds next)

- **Modules and fittings** (`art/cael/modules/<id>.png`): engines, shield emitters, armour, repair, actives, bays. 59 ids; the shop lists them.
- **Whole hulls per civilisation** (`art/cael/hulls/<civ>-<class>.png`): 15 civilisations × 9 classes (Forge frigate, Forge destroyer, Forge cruiser, Forge heavy cruiser, Forge battlecruiser, Forge battleship, Forge dreadnought, Forge carrier, Forge titan). Civilisations: Savanah, Sol Symbiots, Chaos, Cosmic Darkness, Cosmic Light, Blackhole, Hybrid Fused, Human Hunters, AI Hunters, Amethyst Angels, Techno Angels, AI Gods, Pagan AI, AI, AI Human Gods.
- **Enemy hulls** by role (mote, stalker, charger, sniper, hive) and class.
- **Stations, gates and landmarks** (top-down, large: 1024-2048 px).
- **Effects** (muzzle flashes, impacts, explosions) as sprite sheets: the GPU renderer will animate them.

## Priority

1. Hull sections (11 images): they are on screen all the time.
2. Archetype guns (15 images): every gun gets new art at once.
3. Signature guns per family, then whole faction hulls.

