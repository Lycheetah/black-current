# Development

Black Current is classic HTML, CSS and JavaScript. The scripts share browser globals;
their order in `index.html` is part of the application. Keep the runtime small.

## Local game

```sh
python3 -m http.server 8811
```

Open `http://localhost:8811/`. No runtime package installation is required.

## Useful source paths

| Path | Purpose |
| --- | --- |
| `index.html` | Playable source entry and script order |
| `js/` | Simulation, combat, presentation, editor and encounters |
| `css/` | Game styles |
| `art/manifest.json` | Art catalogue |
| `art/keyed/` | Ship, enemy and module artwork |
| `scripts/` | Art tools, browser witnesses and packaging |
| `dist/black-current.html` | Generated standalone snapshot |
| `site/` | Public landing page |
| `docs/ATMOSPHERE.md` | Proposed atmosphere and feature directions |

The source entry remains the game. Site packaging copies it to `play/index.html`, with
its relative assets beside it. It never replaces the source entry with the landing page.

## Optional browser checks

```sh
npm install
npx playwright install firefox
npm run check
npm test
```

Playwright is a development dependency. The game does not use it at runtime.
Some existing witness scripts accept `GAME_URL` for an alternate local address.
Headless checks establish specific behavior; device performance and fun require play.

## Standalone snapshot

`scripts/build-single.py` inlines the game and embeds selected artwork. Its image
processing requires Pillow in the Python environment. Rebuild the snapshot deliberately
after source changes, then open it and check the artwork and editor. Do not assume a
previous standalone snapshot matches later source edits.

## Public site

```sh
python3 scripts/build-site.py
python3 -m http.server 8812 --directory .site-build
```

The packager has no package dependencies. It includes the landing page, current playable
source, keyed artwork and the standalone download. Historical notes, test output and
inactive code are excluded. `build.json` records file hashes and the two game entries.

GitHub Actions packages the site from `main`, then deploys that artifact to GitHub Pages.
The workflow uses separate build and deploy jobs; only deploy has Pages write access.

## Design constraints

- Preserve the existing `nodes[]` ship format and saved design compatibility.
- Give large ships mass and commitment; keep weapons and silhouettes readable.
- Keep useful controls accessible, with diagnostics behind F1.
- Prefer lateral equipment tradeoffs over endless numerical tiers.
- Make loss recoverable and preserve player-authored designs.
- Keep the sector map understandable while encounters and dressing can vary by seed.
- Measure expensive effects; use bounded particles and quality controls.
- Treat art, lore and feature ideas as proposals until reviewed and implemented.

Commit only intended project files. Local agent instructions and historical planning
material are ignored in working copies; they do not belong in the public site artifact.
