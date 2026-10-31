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
Forge test: **[ ]** step hull class, **, .** step civilisation (all 252 hulls).

Phone: left stick yaw/pitch, right rail throttle, roll buttons, one-finger drag orbits, pinch zooms.

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
| 1 · Combat | Overview lock, weapon groups fore/mid/aft, turret tracking/optimal/falloff, anatomy damage (shield → local armour → penetration → structure → systems), one authored encounter | next |
| 2 · Shipwright | dock at Asterion, Elite Shipwright: move a hardpoint node, fit a gun, flying ship changes | |
| 3 · Scanner | one signature: detect → triangulate → scan → understand → resolve, reward | |
| 4 · Save | versioned save + migration, quota-safe file fallback, full slice witness captures | |

After the slice (Mac reorders): remaining zones (Erebos, Aion, Chaos Cradle, Deep Current), PILLAR/Micro-ZJ
universe layer, industry and research, Titans and civilisation fleets, co-op on the separated sim.

## Open questions for Mac

1. Forge 0.77.11: the canon bible cites it, but it is not in `lycheetah-sovereign-eclipse`. Send it if it exists.
2. Home: this lives in `black-current/sovereign/` for now because that is where this session can push. Say if it
   should move to `lycheetah-sovereign-eclipse` or a fresh repository.
