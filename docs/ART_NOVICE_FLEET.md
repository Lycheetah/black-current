# Novice fleet art — 25 October 2026

Game direction and canon: Mac / Lycheetah. This batch combines nine generated
turrets with nine section pieces supplied through the shared review directory.
No new provider credentials or external API runner were used.

## Installed assets

- `art/keyed/turrets/manifest.json`: nine extracted RGBA sprites, measured bearing
  pivots, source dimensions and hashes. Runtime: `js/turret-art.js`.
- `art/keyed/sections/manifest.json`: nine accepted review pieces, copied by exact
  hash from `art/review/sections/section_01.png` through `section_09.png`. Runtime:
  `js/section-art.js`. Anchors are authored canvas centres, not measured turret
  pivots. Originals and incoming packs are preserved outside the release staging.
- `art/concepts/turrets-overhead-v1.png`: accepted source atlas. Runtime consumes
  the extracted pieces, not the entire sheet. The first, tilted generation was
  rejected and corrected before extraction.

The shared top-down painter uses the same geometry in novice cards, construction
and flight. Original alpha is preserved. Sprite art changes no hit circles or
weapon statistics; structural connections remain the modular grid's geometry.

## Built-in generation prompt

Use case: stylized-concept. Asset type: production sprite atlas for Black Current,
a top-down modular spaceship action RPG. Generate one square 3 by 3 sprite sheet
containing exactly nine separate overhead turret sprites on genuine transparent
alpha. No text, labels, frames, grid lines, external shadows, pedestal, starfield,
ship hull, background or checkerboard. Camera exactly orthographic directly above,
zero tilt or visible front/side faces. All barrels point up. Each rotating bearing
is centred in its equal-size cell, with the complete sprite inside the central
75 percent and transparent gutters.

Row 1: compact single-barrel electro-kinetic naval cannon; twin industrial
repeater; precision twin-rail accelerator. Row 2: cyan lens beam projector;
violet arc/pulse projector; six-cell missile launcher. Row 3: grouped-barrel flak;
broad siege mortar; heavy twin-prong golden lance. Practical gunmetal machinery,
layered bevelled steel, brass fasteners, restrained luminous accents, crisp edges,
strong silhouettes readable at 40 pixels, shared upper-left lighting.

## Camera-correction edit prompt

Keep the nine identities, 3 by 3 arrangement, craftsmanship, palette and genuine
alpha. Correct the camera and barrels into strict orthographic top view. Weapons
lie flat in the image plane and fire toward the top edge, parallel to the page.
Show only top surfaces of housings and the long top strips of horizontal barrels.
Remove every circular/elliptical muzzle pointing at the viewer, upright cylinder,
visible sidewall/front face and isometric tilt. Cannon, repeater, flak and mortar
barrels are flat top profiles extending up from the bearing; their muzzle tip is
a narrow flat line, never a visible hole. Keep centred bearings, transparent
gutters, no overlaps, labels, grid or background.

Generated with the built-in image tool, then extracted into independent cells.
The individual sprite pivot data in the manifest is authoritative; the generator
was not assumed to have placed bearings on exact cell centres.
