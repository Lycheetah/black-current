# Baton handoff — 2026-10-24 (Black Current 2.5.0)

Written for the next seat. Read `README.md` → "🤖 AGENT: START HERE" first. This file
only says where the work stands today and what bites.

## State

| Release | What landed | main | gh-pages |
|---|---|---|---|
| 2.3.0 | graphics presets + FPS limiter, faster phone right-stick turning, left-side reactor buttons on phone, new fittings, slower progression | — | live |
| 2.4.0 | every one of the 32 fittings has an emblem, hull art, shot trail and voice (`js/quirk-art.js`) | `9decae7` | `7a1ce17` |
| 2.5.0 | living water: per-place atmosphere, ambient bed, low-hull edge pulse (`js/atmosphere.js`) | `63723c1` | `714ce31` |
| 2.5.1 | save guard: every restore is sanitized (`engine.sanitizeDesign`), coreless saves fall back to the starter, Settings → Reset ship to starter (fittings return to the hold, legacy `biotank_forge_player` key cleared) | see `git log` | see `git log` |
| 2.6.0 | the armoury: 13 weapons, chosen per gun (`fleet.mountWeapons` / `weaponFor`, `node.weapon`), flight behaviours in `Projectile.update`, 360° mounts (`HP_DEFAULTS` arc = π, `traverseMin`) | see `git log` | see `git log` |

Witnesses on the 2.5.0 commit: `npm test` 8/8 green (31/36/19/6/21/9/14/8),
`witness-night-sprint` 80/80, `witness-phone-layout` 110/110.
**Not witnessed:** how any of it feels on Mac's phone, or how the sound lands
on real speakers. That is Mac's verdict, not a test's.

Live: <https://lycheetah.github.io/black-current/play/> (the root is a landing page).

## Open items, in priority order

1. **Old-save glitch: guarded in 2.5.1, not yet witnessed on Mac's device.** Mac: *"the old ship doesnt clear form cache and just litches out from the old save."*
   Still no repro of his exact save. What shipped: `engine.applyDesign(..., {restore:true})` now runs
   `sanitizeDesign` first (drops non-finite or oversized parts, strips retired quirks, fixes a bad colour or
   dead weapon, and shows a banner naming the repair). A design with no core goes to `resetToStarter`. The
   Settings button "Reset ship to starter" asks for two taps. The prime suspect (CONJECTURE) was the legacy
   key `biotank_forge_player`: `campaign.js` imports it whenever a fresh v2 doc is built, and it is now
   cleared on reset. If Mac still sees it, get the save: `JSON.stringify(saveState.doc.design)` in the console.
1b. **Mac's queue, 2026-10-24, while playing 2.5.1** (his words, in his order):
   - *"its so easy ... you just become op after the 3rd zone"*: raise prices and steepen the curve past zone 3. Measure the curve before tuning it.
   - *"work on the vows, main menus, passive upgrades you keep getting offered, the ai augments etc and the starter menu"*
   - *"add a visual hp and shield for numbers"*: HP and shield bars with numbers.
   - *"wonder if we can add ship rotation which would remove a lot of the need to aim hectically"*: an optional auto-aim or hull-facing mode. The 360° guns in 2.6.0 already cover part of this.
2. **GitHub Actions is locked by a billing issue** (Mac's step to fix). Until it's fixed, publish by
   hand (runbook below).
3. **Phone verdicts pending:** the 2.3 turn speed (`TOUCH_TURN_BOOST` 2.5 in `js/hardpoints.js`),
   the reactor buttons, the 2.4 art, and the 2.5 water and sound.
4. **Atmosphere tuning** lives in one table, `PLACES` in `js/atmosphere.js`. If Mac says it's too
   subtle or too loud, change numbers there, not code.

## Architecture you need

- `js/*.js` are **classic scripts sharing globals**. Never add `export`. Guard with `typeof X`, not
  `window.X`: `fluidShader`, `engine` and `soundEngine` are global `const`s and are **not** on
  `window`.
- **Extend by wrapping, never replacing.** Example:
  `const base = obj.fn.bind(obj); obj.fn = (...a) => { const r = base(...a); /* add */ return r; };`.
  Several layers stack on the same methods: `look.js` → `quirk-art.js` → `atmosphere.js`, in
  `index.html` script order.
- **Cache busting:** every `<script>`/`<link>` in `index.html` carries `?v=20261024s9`. Bump all
  of them every release (`sed -i 's/?v=20261024s9/?v=20261024s10/g' index.html`), or phones keep
  stale JS.
- **Graphics switches:** `look.cfg.<layer>` ↔ `js/menu.js`. A new layer touches six places in
  menu.js: `SETTINGS_DEFAULTS`, `GFX_ON`, the `low` and `medium` presets, `GFX_LOOK`, and the
  toggle list. Old saves get new keys from the defaults merge (`menu.js:38`).
- **`js/quirk-art.js`** (2.4): `COLOR` must match `quirks.SHOT` colours, and night-sprint fails on
  drift. Each `GLYPH` is drawn in unit space through `pen()`. Sprites are cached at 128px. Shot
  voices are `'q:<quirk>'` specs exposed through `SoundEngine.prototype.extraVoices`, which
  `soundscape.js` falls back to.
- **`js/atmosphere.js`** (2.5):
  - `paint(ctx, camera, place)` draws the wash, shafts, plankton and embers. It wraps the ocean
    draw and is gated by `look.cfg.atmosphere`; an art pack keeps its own ocean.
  - `tick()` runs per engine update: it re-reads the place every 15 ticks, drives the `#atmo-edge`
    opacity, and builds and retunes the ambient bed.
  - The bed and calls sit under `musicBus`, so the Music slider and Mute own them.
  - The edge pulse lands on the heartbeat `soundscape.js` schedules (by wrapping `voice`), and
    falls back to its own 1.1 Hz beat.
  - Reduced motion freezes the water.

## Witness notes (these bite)

- Always run Playwright with `PULSE_SERVER=unix:/nonexistent`, or the tests play audio out loud.
- Serve with `npm run serve`, or `python3 -m http.server 8811 --bind 127.0.0.1`. Witnesses default
  to `http://127.0.0.1:8811/`.
- `witness-phone-layout` checks that "all existing game scripts remain byte-identical"
  **against HEAD**, so it fails on any uncommitted `js/` edit. Commit first, then run it.
- `witness-gentle` and `witness-galaxy` are known flaky. Rerun once before diagnosing.
- `node_modules` may be a local symlink. It's untracked, so never commit it. Stage exact files,
  never `git add -A` on main.

## Release runbook (manual Pages, while Actions is locked)

1. Bump the `?v=` token in `index.html`, the version in `package.json`, and add a `CHANGELOG.md`
   entry.
2. Run `python3 scripts/build-single.py`, which rebuilds `dist/black-current.html`.
3. Run `npm test` once. Counts only go up.
4. Commit the exact files, run `witness-phone-layout`, then `git push origin main`.
5. Run `python3 scripts/build-site.py`, which writes `.site-build/` and must report
   `play_source_matches: true`.
6. Publish to gh-pages through a worktree:
   ```sh
   W=$(mktemp -d); git fetch origin gh-pages; git worktree add "$W" origin/gh-pages
   cd "$W"; git checkout -B gh-pages origin/gh-pages
   rsync -a --delete --exclude .git <repo>/.site-build/ "$W"/
   git add -A; git commit -m "Publish X.Y.Z"; git push origin gh-pages
   cd <repo>; git worktree remove "$W"; git branch -D gh-pages
   ```
7. Verify the live site:
   - `gh api repos/Lycheetah/black-current/pages/builds/latest` reports `built` with the new SHA.
   - `curl -s https://lycheetah.github.io/black-current/play/ | grep -o '20261024s[0-9]*' | sort | uniq -c`
     shows only the new token.
   - Every new file under `/play/js/` returns 200.
