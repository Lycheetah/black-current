# Hostile fleet art — 28 October 2026

Black Current and Sovereign Eclipse direction and canon: Mac / Lycheetah.
The six ship designs came from the Aetheron-supplied review material. The
original local source is `art/concepts/hostile-fleet-v1.png`; it is preserved.
The first review cutouts were incomplete crops and were not adopted.

The built-in image_gen tool prepared a transparent atlas from that original,
preserving six complete right-facing silhouettes and removing text and the
background. The accepted derivative is `art/keyed/hostiles/hostile-fleet-v2.png`.
Its hash, source frames, anchors and alpha-sampled attachment footprints are
in `art/hostile-kit.json`. Original inputs and generated output are preserved.

Runtime: `js/hostile-skins.js`. It places the existing enemy module skeleton
under the authored silhouette, caches each hull and erases areas belonging
to lost modules. It retains module counts and maximum HP. Ordinary scouts
bind a low-damage gun to an existing section; brood/training/boss/jelly
actors keep their separate paths. This is the first shared naval hull set,
not fifteen finished civilisation-specific art libraries.

The site and standalone builders explicitly include this manifest and atlas.
`npm run test:combat` checks native combat, module loss, phone controls and
standalone art. Gameplay balance and actual-device performance need playtests.
