# Sovereign Eclipse · Reforge

A clean rebuild of Sovereign Eclipse as a 3D capital-ship game on our own engine. Three.js is the renderer only;
the loop, simulation, data, input, camera, UI and build are ours. Brief: the Reforge brief Mac wrote on 2026-10-31.

Play: open `dist/sovereign-eclipse.html` in a browser (one file, works offline and from a link).

```bash
cd sovereign && npm install
npm run build      # → dist/sovereign-eclipse.html
npm run dev        # rebuild on save
npm run smoke      # headless: boots, flies, cycles hulls, phone layout + screenshots in shots/
node tools/shots.mjs savanah_starter chaos_titan   # close beauty captures of any hulls
```

## Controls

Desktop (original Sovereign Eclipse scheme): **W/S** throttle order, **A/D** yaw, **R/F** pitch, **Q/E** roll,
**X** all stop, **L** auto-level, drag to orbit the camera, wheel to zoom, **C** chase camera, **H** help.
Combat: **Tab** lock nearest hostile (or click an Overview row / bracket), **Esc** unlock, **1 2 3** fire the
fore/mid/aft group at the lock, **Shift+1/2/3** (or right-click a group tile) puts a group on autonomous AI-core fire,
**Space** all groups, **O** orbit / **K** keep at range / **T** approach the target. Click a landmark in the Overview
to approach it.

Forge test: **[ ]** step hull class, **, .** step civilisation (all 252 hulls).

Phone: left stick yaw/pitch, right rail throttle, roll buttons, LOCK / FIRE / ORBIT buttons, one-finger drag orbits,
pinch zooms.

## Combat model (Batch 1)

- **Hit chance** (EVE-style): `0.5^(track² + range²)`, where track = angular velocity × 17 / (turret tracking ×
  target radius) and range = distance past optimal ÷ falloff. Guided ordnance ignores tracking. Optimal and falloff
  come from the original `TURRET_CATALOG` ×6; shot speeds ×8.
- **Anatomy**: shield (with the weapon's `shieldBypass`) → the **local armour plate** facing the shooter (fore, aft,
  port, starboard) → **penetration** grows as that plate is worn down → **structure** → **systems** behind the zone
  (fore: sensors / fore battery; aft: engines / aft battery; flanks: reactor / mid battery). Multipliers are the
  original `DAMAGE_PROFILES` and `WEAPON_ANATOMY`. Damaged engines slow the hull, sensors slow locks, the reactor
  slows shield and capacitor regen, and batteries cycle slower.
- **Operation**: canon contract *Break the Current* (`breach_purge`) at the Current Breach, hostiles from its canon
  races (Blackhole, Hybrid Fused, Pagan AI). The slice flies the first two canon waves at half strength
  (`SLICE_WAVES`, `SLICE_SCALE` in `src/sim/encounter.js`). Enemy stats are the original `ENEMY_CLASS_CATALOG` and
  `ENEMY_RACE_DOCTRINES` with the original 0.66 damage factor. Losing the hull recovers you at Asterion Forge.

## Engine layout

| Folder | Owns | Rule |
|---|---|---|
| `src/core/` | fixed-step loop (60 Hz), vector/quaternion math, event bus | no Three.js |
| `src/sim/` | **all game state**: world, ships, flight model | the only writer of state; runs headless |
| `src/data/` | Mac's original catalogs ported unchanged: 18 classes × 14 civilisations = 252 hulls, turrets, modules, damage anatomy, research, materials | data only |
| `src/world/` | sector layouts (Naraka Veil from the canon WORLD table, ×8 scale) | data only |
| `src/render/` | Three.js scene, PBR materials, procedural hulls, station, black sun, sky, post | reads sim, never writes it |
| `src/input/` | keyboard, mouse, touch → ship orders, camera gestures, actions | never writes sim |
| `src/ui/` | HUD, Overview, brackets, styles | reads sim |
| `tools/` | esbuild single-HTML build, smoke check, beauty captures | |

Flight: throttle sets an ordered speed; hulls accelerate toward it, velocity bends toward the nose at hull
acceleration (big hulls drift through turns), and turn rates spin up with angular inertia. All of it scales
from each hull's catalog `maxSpeed`, `accel` and `turn`, so a Titan and a Starter Frigate feel different.

Rendering: ACES tone mapping, bloom, image-based lighting baked from the sector sky, procedural plating
(albedo/roughness/bump), lofted hulls with per-civilisation doctrine forms, hardpoint nodes on every active bank,
spectral black sun with photon rim, lensed ring and eclipsed accretion disc.

## Vertical slice plan

| Batch | Delivers | Status |
|---|---|---|
| 0 · Ignition | engine skeleton, capital flight, orbit camera, Naraka Veil, Asterion Forge, black sun, HUD, phone controls | **done** |
| 1 · Combat | Overview lock, weapon groups fore/mid/aft, turret tracking/optimal/falloff, anatomy damage (shield → local armour → penetration → structure → systems), one authored encounter | **done** |
| 2 · Shipwright + Hull Forge | dock at Asterion, Elite Shipwright: move a hardpoint node, fit a gun, flying ship changes; Hull Forge builder tool with JSON hull blueprints the game loads | next |
| 3 · Scanner | one signature: detect → triangulate → scan → understand → resolve, reward | |
| 4 · Save | versioned save + migration, quota-safe file fallback, full slice witness captures | |

After the slice (Mac reorders): remaining zones (Erebos, Aion, Chaos Cradle, Deep Current), PILLAR/Micro-ZJ
universe layer, industry and research, Titans and civilisation fleets, co-op on the separated sim.

## Open questions for Mac

1. Forge 0.77.11: the canon bible cites it, but it is not in `lycheetah-sovereign-eclipse`. Send it if it exists.
2. Home: settled, it lives in `black-current/sovereign/`.
