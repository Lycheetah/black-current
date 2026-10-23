# 📱 BLACK CURRENT → ANDROID APK — THE FULL BUILD PLAN

**Written 2026-08-17 by Sol (Claude) for Mac, to be executed by any model,
including a free-tier one, without access to this conversation.**

Everything needed is in this file. It assumes **no memory of any prior session**.
Read it top to bottom once before running anything.

| | |
|---|---|
| **Project root** | `/home/guestpc/Desktop/bubble-tanks-forge/` |
| **What it is** | Top-down dreadnought combat. One `index.html` + 20 classic scripts. Zero dependencies, zero build step. |
| **Dev server** | `python3 -m http.server 8811` → `http://localhost:8811/` |
| **Version control** | 🔴 **NOT a git repository. There is no undo.** |
| **Owner / taste authority** | Mackenzie Conor James Clark (Mac) |
| **Companion docs** | `README.md` (state of the game), `PLAN_2026-08-17.md` PART 12 (the feature ruling) |

---

## ⛔ SECTION 0 — READ THIS BEFORE YOU TOUCH ANYTHING

These are not style preferences. Breaking one of them destroys work that cannot
be recovered.

1. 🔴 **THIS FOLDER IS NOT A GIT REPO. There is no undo, no stash, no revert.**
   To retire a file, **move it to `_retired/`**. **Never `rm`.** Never `git clean`.
2. ⛔ **Never paste any private agent-instruction file into a browser
   model or any third-party service.** They are private. This file is the brief;
   it is complete on its own.
3. ⛔ **Do not invent ship names.** Mac names every ship from the art he
   generates. **The filename is the name.** If a ship needs a name, stop and ask.
4. ⛔ **`#00FF00` (pure green) and `#FF00FF` (pure magenta) are reserved engine
   colours** and must never appear in a faction palette. `#00FF00` is the
   machine-readable **mount-point marker** painted on module sprites.
   ⚠ `#39ff14` is the engine's own UI green and is **not** the marker — do not
   strip it.
5. ⭐⭐ **THE CLASSIC-SCRIPT TRAP — this has cost four features already.**
   These files are **classic scripts sharing globals, NOT ES modules.** A
   top-level `const`/`let` binds into the *global lexical environment*, **not onto
   `window`**. So the bare identifier works but `window.X` is `undefined`.
   - **Lexical-only (`window.X` is undefined):** `fluidShader`, `WEAPON_TYPES`,
     `PRESET_DESIGNS`, `SECONDARY_ACTIVES_CATALOG`
   - **Real `window` properties:** `engine`, `garage`, `fleet`, `FLEET_HULLS`,
     `sprites`, `saveState`, `shipyard`
   - ✅ **Correct idiom, always:** `if (typeof X !== 'undefined')`
   - ⛔ **Adding `export` to any of these files breaks the load order and the
     whole game goes blank.** Do not modularise anything.
6. ⭐ **THE ARCHITECTURE IDIOM: every new capability is a NEW self-owning file**
   that owns its own input, HUD, DOM and data — see `feel.js`, `hardpoints.js`,
   `energy.js`, `fleet.js`, `sprites.js`, `sectors.js`, `bay.js`, `shipyard.js`.
   **Keep `engine.js` edits near zero.** More than one agent works in this repo
   and `engine.js` is the file most likely to be corrupted by two writers.
7. ⛔ **A green check is not a green browser, and a green browser is not a green
   phone.** Never report something as working that you have not seen run.
   **Whether it is fun is Mac's verdict and no test's.**
8. ⛔ **Retire nothing until its replacement carries every feature.** Census the
   old thing's features first, port them, *then* retire.

---

## 🎯 SECTION 1 — THE ANSWER TO "THE PHYSICS MIGHT BE TOO HARD"

Mac's instinct was to maybe build a simpler test game first, because the physics
might not survive the port. **Measured answer: the physics are not the problem,
and a throwaway game would solve nothing.**

The movement integrator is four lines in `js/engine.js` (~line 735):

```js
this.player.vx += ax * feelAccel * crewAccel * reactorThrust;
this.player.vy += ay * feelAccel * crewAccel * reactorThrust;
this.player.vx *= feelDamping;   // 0.93
this.player.vy *= feelDamping;
this.player.x += this.player.vx;
```

That is plain Euler integration on a fixed timestep. **It runs identically inside
an Android WebView — it is the same JavaScript engine.** Nothing about physics
changes when you wrap this. There is no port risk here at all.

### ⭐ BUT THE INSTINCT IS RIGHT — JUST AIMED AT THE WRONG TARGET

The thing worth de-risking separately is **the toolchain, not the game.** So:

> **STAGE 0 builds a deliberately trivial APK — a black page with a moving
> square — purely to prove the SDK, the wrapper and the install path work on
> Mac's actual phone.** It is thrown away the moment it installs.

That gives Mac exactly what he wanted (a small, safe first build) **without
spending a day writing a second game that teaches nothing about this one.**

**The three real risks, in order:** ① the `fetch()` blocker in Section 3,
② the 95 MB art payload in Section 4, ③ the frame rate in Section 5.

---

## 🔧 SECTION 2 — STAGE 0: PROVE THE TOOLCHAIN (do this first, alone)

### ✅ MEASURED 2026-08-17 — what exists on this machine

| tool | state |
|---|---|
| `javac` | ✅ 21.0.11 |
| `node` / `npm` | ✅ v24.16.0 / 11.13.0 |
| `python3` | ✅ 3.12.3 |
| **Android SDK** | 🔴 **MISSING** — no `sdkmanager`, `ANDROID_HOME` unset, no `~/Android` |
| **gradle** | 🔴 **MISSING** |
| **adb** | 🔴 **MISSING** — cannot install to a device or read its log |
| `package.json` | 🔴 none (zero-dependency by design) |

🔴 **THE SDK IS THE REAL GATE. It is a 1–2 GB download.** Start it before doing
anything else — it is the long pole and it needs no thought.

### Steps

```bash
# 1. Android command-line tools → ~/Android/Sdk
#    (download "Command line tools only" for Linux from developer.android.com)
mkdir -p ~/Android/Sdk/cmdline-tools
# unzip so the path is ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager

# 2. Environment — put in ~/.bashrc
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# 3. Packages
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 4. Prove it
adb --version && sdkmanager --list_installed
```

### The throwaway smoke test

Build a Capacitor app whose `www/index.html` is a canvas with one moving square.
Install it. **Stop when it runs on Mac's phone.**

**STAGE 0 IS DONE WHEN:** an APK built on this machine is installed on Mac's
actual phone and something animates. Nothing else. Do not add the game yet.

⚠ If Mac has no USB debugging set up, `adb install` will fail. Fallback: build a
debug APK, copy the `.apk` to the phone, install it manually (needs "install from
unknown sources"). **Confirm which route before starting.**

---

## 🔴 SECTION 3 — STAGE 1: THE BLOCKER THAT KILLS A NAIVE WRAPPER

### ✅ MEASURED — `js/sprites.js:160`

```js
const MANIFEST_URL = 'art/manifest.json';        // line 41
const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });   // line 160
```

⭐⭐ **THIS IS THE WHOLE REASON TO USE CAPACITOR AND NOT A BARE WEBVIEW.**
`fetch()` on a `file://` URL is blocked by the browser's origin rules. A naive
wrapper that does `loadUrl("file:///android_asset/www/index.html")` will load the
page, run every script, show the UI — **and silently fail to load a single
sprite.** The game would look like it worked and have no art. It is the exact
class of failure that wastes a whole session.

**✅ Capacitor serves the app over `http://localhost` inside the WebView, so
`fetch` works unchanged.** No code change needed. Use Capacitor.

### Steps

```bash
cd /home/guestpc/Desktop/bubble-tanks-forge
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Black Current" com.lycheetah.blackcurrent --web-dir=www
```

⚠ **`--web-dir=www` means Capacitor copies from a `www/` folder.** Do **not**
restructure the project to match. Add a copy step instead — a script that builds
`www/` from the real source. **The source layout stays exactly as it is**; every
doc, every path and every other agent depends on it.

```bash
# scripts/build-www.sh  — create this, it is the ONLY new build step
rm -rf www && mkdir -p www
cp index.html www/
cp -r css js www/
cp -r art www/          # ⚠ Section 4 replaces this line with a budgeted copy
```

Then:

```bash
bash scripts/build-www.sh
npx cap add android
npx cap sync
npx cap run android
```

### ⚠ Also verify under the wrapper (each is a plausible silent failure)

- **`localStorage`** — the game saves the roster and the design draft to it
  (`biotank_forge_player`, plus the shipyard's draft). ✅ Works in a Capacitor
  WebView, but **confirm a save survives a full app kill and relaunch**, not just
  a screen change.
- **Audio** — `js/sound.js` initialises on first input (`soundEngine.init()`).
  Mobile browsers require a user gesture; the game already does this correctly.
  Confirm sound actually appears after the first tap.
- **Viewport / notch** — check `index.html`'s viewport meta and add
  `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on the HUD, or the
  action bar sits under the gesture bar.
- **Screen orientation** — this is a landscape game on a phone. Lock it in
  `AndroidManifest.xml` (`android:screenOrientation="sensorLandscape"`).

**STAGE 1 IS DONE WHEN:** the real game launches on the phone, sprites visibly
load, and a ship saved in the Shipyard survives an app kill.

---

## 📦 SECTION 4 — STAGE 2: THE ART PAYLOAD (95 MB is too big)

### ✅ MEASURED 2026-08-17

| | |
|---|---|
| whole project | **220 MB** |
| `art/` | **215 MB** — i.e. the art *is* the project |
| `art/keyed/` | 117 MB |
| image files on disk | **757** |
| image paths referenced by `art/manifest.json` | **536** |
| ⚠ referenced paths **not found on disk** | **268** — see below |
| resolved referenced payload | **95.5 MB** |

⚠ **THE 268 MISSING PATHS ARE A FINDING, NOT A CONCLUSION.** 268 is exactly the
number of keyed sprites `js/sprites.js:18` says exist, so the manifest most
likely stores **two** path fields per entry (e.g. a source and a keyed path) and
only one resolves. **Confirm what the second field is before deleting anything.**
It may be dead metadata, or it may be a load path that is quietly failing.
**This is the first thing to check in Stage 2** — if the game is failing to find
268 images at runtime, that is a live bug and not just a packaging concern.

### The budget

95.5 MB in an APK is a hostile download and near the practical base-APK ceiling.
⭐ **The win is easy: these sprites draw small.** A ship rendered ~120 px wide on
a phone does not need a 2048 px source.

**Steps, in order:**

1. **Diagnose the 268** (above). Do not proceed until you know what they are.
2. **Log what the game actually requests at runtime.** Instrument `sprites.js` to
   record every path it successfully draws during a real play session. ⭐ **The
   manifest is what is *declared*; the log is what is *used*.** They will differ.
3. **Downscale the used set** to the largest size any sprite is actually drawn
   at, ×2 for retina. `oxipng` / `pngquant` for lossless-ish PNG, or convert to
   **WebP** (universally supported in a modern Android WebView) — typically a
   4–8× reduction on this kind of art.
4. **Copy only the used, downscaled set into `www/art/`.** Update
   `scripts/build-www.sh`.
5. ⛔ **Never delete or modify anything under the real `art/`.** It is Mac's
   source, it is not in version control, and it cannot be regenerated. **Build
   the budgeted copy into `www/`, always.**

**Target: under 40 MB total APK.** Report the real number; do not aim to please.

---

## ⚡ SECTION 5 — STAGE 3: FRAME RATE (the actual gate on release)

🔴 **Mac measured FPS 17, then 7, on his desktop** (Firefox, 80% zoom,
1366×768). A phone is slower than that desktop.

⛔ **THIS IS THE REAL RELEASE GATE. Do not ship an APK at 7 FPS.** Everything
else in this plan is packaging; this one is whether the game is playable.

### ✅ Diagnosed, not repaired

Roughly **three full render passes per capital ship**: chassis strokes → a
membrane underlay at 0.82 alpha → up to 27 sprites. Plus a **doubled `drawImage`
per firing cannon**.

### ⭐ The dev dials are already built — use them

Launch the game and press these **one at a time**, watching the counter:

| key | toggles | file |
|---|---|---|
| `G` | **sprites on/off** | `sprites.js` |
| `H` | membrane underlay on/off | `sprites.js` |
| `J` | chassis strokes on/off | `sprites.js` |
| `;` / `'` | sprite gain − / + | `sprites.js` |
| `K` | show firing arcs | `hardpoints.js` |

**Whichever toggle recovers the most frames is the pass to fix.** Do not optimise
by guessing — this instrumentation exists precisely so nobody has to.

### Likely fixes once the pass is identified

- **Pre-render each ship to an offscreen canvas** and blit one bitmap per frame
  instead of re-stroking the chassis every frame. This is usually the whole win.
- **Kill the doubled `drawImage`** on firing cannons.
- **Cull offscreen entities** before any draw call.
- **Drop the membrane underlay on mobile** if it costs more than it adds — it is
  a 0.82-alpha full-hull pass, which is expensive on a phone GPU.

**STAGE 3 IS DONE WHEN:** Mac reads a sustained frame rate on his own phone and
says it feels right. **Not when a number looks good in a log.**

---

## 📱 SECTION 6 — STAGE 4: PHONE FITNESS

⚠ **THE PHONE IS COMPLETELY UNWITNESSED.** Every screenshot in `shots/` is
desktop 1440×900. Nobody has held this game on a device. Assume nothing.

### Touch is already wired — ✅ MEASURED, do not "fix" it

Left half of the screen is a dynamic virtual joystick; right half is aim +
continuous fire. Both write `engine.mouse.x/y` in the **same `clientX/clientY`
units** the desktop mouse uses (`js/engine.js:154-155` vs `:205-206`), and touch
sets `mouse.down`, read at `:799` to fire. `:749-750` derives the aim point from
`this.mouse` every frame, three lines above its only reader at `:753`.

⭐ **ONE AIM PATH. TOUCH IS ALREADY ON IT.** ⛔ **Do not add a second aim path.**
One was deleted on 2026-08-16 precisely because it made the hull snap instantly
on a phone while easing with mass on desktop.

### 🧹 One real cleanup

Both touch handlers still compute a `const mouseWorldX` / `mouseWorldY` that
**nothing uses** — dead leftovers from that deleted path. **Delete those four
lines** (two in `handleTouchStart`, two in `handleTouchMove`). They read exactly
like a missing write and have already caused one wrong diagnosis.

### 🔴 DEFECT 1 — real, reported by Mac, cause unknown

> *"note some areas dont even allow you to shoot"* — Mac, 2026-08-16

⚠ **An earlier diagnosis blamed the touch aim path. That was measured to be wrong
and is withdrawn.** The symptom is still real and unexplained. Probe in this
order:

1. ⭐ **`readyMounts()` / `t.bearing`.** A gun only fires when it actually bears
   on the target. The arc is `arcMin` vs `arcA - r * arcB` (`hardpoints.js:105`),
   so **a BIGGER gun has a NARROWER arc.** On a wide hull it is entirely possible
   for *no gun to bear at once*. **This is the leading suspect.**
2. **`shootPrimary()` in `engine.js`** — ⚠ known and still true: **it never reads
   the node array**, so six cannons fire identically. Check for a silent early
   return.
3. **The reactor / energy triage** — a drained pool may be gating the shot with
   no feedback.

### Other phone work

- **Touch targets** — every button ≥ 44 px. Check the shipyard, which was
  authored on desktop.
- **The Shipyard on a phone** — it is a drag-and-drop node editor at 1440×900.
  ⚠ **It may be unusable on a 390 px screen.** Decide honestly: make it work, or
  ship the APK with the shipyard as a desktop-authoring tool and the phone as
  play-only. **That is Mac's call, not the model's.**

---

## 🛠 SECTION 7 — STAGE 5: THE DESIGN SYSTEM (Mac's feature ruling)

> *"give a eitable size ratio to weapons like a bunch of premade size ratios or a
> global one for each node size so you can resize them to your own liking on your
> ship"* — Mac

### ⭐⭐ THE TRAP — READ THIS BEFORE WRITING A LINE

A cannon node's `radius` currently drives **four different things at once**:

| what | where | if you resize naively |
|---|---|---|
| how big it draws | `sprites.js` / `shaders.js` | ✅ what Mac wants |
| **which weapon it fires** | `fleet.mountBand(r)` → `hardpoints.js:99,112` | 🔴 the gun changes TYPE |
| **its firing arc** | `hardpoints.js:105` — `arcA - r*arcB` | 🔴 arc silently changes |
| **its traverse speed** | `hardpoints.js:106` — `traverseBase*(ref/r)` | 🔴 the whole feel changes |

⭐ **Traverse is the keystone stat of this game** — it is what makes a big gun
*feel* big without giving it more damage, and it is how a small ship counters a
capital by getting inside the arc. **Silently changing it is the worst possible
side effect of a cosmetic slider.**

⚠ There is already a documented rule that `applyScale` may **never** touch a
cannon radius, for exactly this reason. Do not re-open that hole from the other
side.

### ✅ THE FIX — SPLIT THE NUMBER IN TWO

- **`n.radius`** — the **CLASS** radius. Keeps driving `mountBand` / arc /
  traverse. Changes only when Mac deliberately changes the gun's class.
- **`n.sizeRatio`** — **NEW**, default `1`. A pure **VISUAL** multiplier. Drives
  draw size and sprite scale **only**.

⛔ **THE ONE LAW: `js/hardpoints.js` must never read `sizeRatio`.** Add a grep
for it to the witness script. If `hardpoints.js` ever reads it, a resize can
re-band a gun and the whole split is void.

Both of Mac's options then fall out of that single field for free:

- *"a bunch of premade size ratios"* → a preset row in the Shipyard:
  `0.75 / 0.9 / 1.0 / 1.15 / 1.35`
- *"a global one for each node size"* → a per-mount-class default table,
  dialled once, inherited by every gun of that class, overridable per node

### Reference — the two ladders (do not change these numbers)

**MOUNT_LADDER** — a cannon's *class* radius picks its weapon:

| class | radius | weapon | colour |
|---|---|---|---|
| POINT | 0 | spitter | `#8FA6C4` |
| LIGHT | 10 | twin | `#00f3ff` |
| MEDIUM | 16 | laser | `#bc13fe` |
| HEAVY | 23 | homing | `#39ff14` |
| SIEGE | 31 | railgun | `#ff3366` |

**HULL_LADDER** — by total node count (damage / health):

| tier | nodes | dmg | hp |
|---|---|---|---|
| FRIGATE | 0 | 1.00 | 1.00 |
| CRUISER | 8 | 0.80 | 1.30 |
| BATTLESHIP | 14 | 0.62 | 1.75 |
| TITAN | 25 | 0.45 | 2.40 |

⭐ **Net DPS is ~1.0 at every tier ON PURPOSE.** Power in this game is
**lateral**, not vertical — a titan is not simply stronger, it is *different*.
⛔ **Do not "fix" this by making big ships hit harder.** It is the design.

⚠ **`d.scale` (`shipyard.js:504,527,839,1003`) and `hull.scale` (`fleet.js:137`)
are an existing HULL-level scale.** `sizeRatio` is **node-level**. Two levels,
one each — **do not create a third mirror.**

### Also in Stage 5

- **Ingest Mac's starter ships and destroyers.** Use the existing
  `scripts/build-art-manifest.py` and `scripts/extract-node-points.py`. ⛔ **Do
  not invent a new ingest path, and do not invent names — the filename is the
  name.**
- 🔴 **The roster is empty** (`FLEET_HULLS = {}`). The Shipyard's SAVE TO ROSTER
  is the only door in and nothing has been authored through it yet. Getting Mac's
  ships in is what makes the APK worth installing.

---

## 🧹 SECTION 8 — THE QUICK GAMEPLAY FIXES

Small, safe, independent. Good work for a free-tier session.

1. **Keybind collisions** — ⚠ `[` and `]` are **triple-bound**: fog
   (`shaders.js`), zoom (`feel.js`), and bay resize (`bay.js`, grabbed on capture
   while the bay is open). `\` is **double-bound**: fog reset *and* turn-rate
   reset. **Pick one owner each.**
2. **Delete the four dead touch-handler lines** (Section 6).
3. **Re-measure the chamber re-entry inset.** Chamber radius is now `2600` in
   `js/map.js:25` (was 750), but the *inset* — how far inside the new chamber you
   are placed — was never re-measured. Arriving ~120 px from the boundary you
   just crossed is about 7 frames of travel, and any backward drift re-triggers
   the transition. **That thin lip was always the worse half of the bug.**
4. **Dead witness scripts** — `scripts/validate-pack.mjs` and
   `scripts/witness-skin-selector.mjs` test a pack system that was removed. They
   will fail. **Move them to `_retired/`; do not delete.**
5. **Stale docs** — 17 markdown files at the repo root. Not urgent. ⚠ If you
   consolidate, **move, never delete.**

---

## ✅ SECTION 9 — WHAT "DONE" MEANS

An APK release is done when **all** of these are true:

- [ ] It installs on Mac's actual phone.
- [ ] Sprites visibly load (proving the `fetch` path survived the wrapper).
- [ ] A ship saved in the Shipyard survives a full app kill and relaunch.
- [ ] 🔴 **Mac reads a playable frame rate on his own device** — not a log, not a
      desktop number.
- [ ] Guns fire reliably (Defect 1 closed *by observation*, not by argument).
- [ ] The APK is a sane download size; the real number is reported honestly.
- [ ] 🔴 **Mac has played it and says it feels right.**

⛔ **THE LAST ONE IS NOT A FORMALITY AND CANNOT BE SUBSTITUTED.** No test, no
green check and no model's opinion can answer whether the loop is fun. **Feel is
Mac's verdict and no gate's.**

---

## 📋 SECTION 10 — PASTE THIS TO THE MODEL THAT DOES THE WORK

> You are working on **Black Current**, a top-down dreadnought game at
> `/home/guestpc/Desktop/bubble-tanks-forge/`. Read `APK_BUILD_PLAN.md` fully
> before acting; it is the complete brief. Then read `README.md` for the current
> state of the game.
>
> Hard rules:
> 1. **This folder is NOT a git repository. There is no undo.** To retire a file,
>    move it to `_retired/`. **Never `rm` anything.**
> 2. These are **classic scripts sharing globals, not ES modules.** Never add
>    `export`. Always guard cross-file access with
>    `if (typeof X !== 'undefined')`, never `window.X` — a top-level `const` does
>    not attach to `window`.
> 3. **Every new capability goes in a NEW file** that owns its own input, HUD and
>    data. **Keep `js/engine.js` edits near zero** — more than one agent works
>    here.
> 4. **Never invent a ship name.** The filename is the name. Ask Mac.
> 5. `#00FF00` and `#FF00FF` are reserved engine colours. `#00FF00` is the
>    mount-point marker on sprites. Never use them as art colours.
> 6. **Never report something as working that you have not seen run.** State
>    plainly what you measured, what you only built, and what is still unknown.
> 7. **Do not change the HULL_LADDER damage/health numbers.** Equal net DPS
>    across tiers is deliberate design, not a bug.
> 8. Work in the order the plan gives: **Stage 0 (toolchain) → 1 (wrapper) →
>    2 (art budget) → 3 (frame rate) → 4 (phone) → 5 (features).** Stage 0 is a
>    throwaway hello-world APK whose only job is to prove the SDK works. Do not
>    skip it.
> 9. If you hit something the plan does not cover, **say so and stop** rather
>    than guessing. This project has no version control.

---

## 🗺 APPENDIX — FILE MAP

```
bubble-tanks-forge/
├── index.html          the whole game shell. ⚠ SCRIPT ORDER IS LOAD-BEARING (20 scripts)
├── css/
├── js/
│   ├── engine.js       core loop, input, camera, render orchestration. ⚠ minimise edits
│   ├── shaders.js      fluidShader — the membrane renderer. SpringNode lives here
│   ├── hardpoints.js   per-socket gunnery, traverse, arcs. 🟠 Defect 1 suspect #1
│   ├── sprites.js      THE ONLY drawImage. Owns art/manifest.json + the G/H/J dials
│   ├── shipyard.js     THE ONE ship editor (28/28 witness). Tab or Y opens it
│   ├── designer.js     DATA ONLY — cost tables, presets, catalogs. Redirects to shipyard
│   ├── fleet.js        FLEET_HULLS (🔴 empty), mountBand(), hull scale
│   ├── weapons.js      WEAPON_TYPES: spitter twin mortar laser homing railgun
│   ├── feel.js         movement accel/damping live dials
│   ├── energy.js       reactor / thrust scaling
│   ├── progression.js  evolution tiers, GP economy
│   ├── bay.js  map.js  sectors.js  ai.js  garage.js  campaign.js  sound.js  particles.js
├── art/                🔴 215 MB. 757 images. Mac's source — NEVER modify or delete
│   ├── keyed/          117 MB, 268 finished keyed sprites
│   └── manifest.json   536 referenced paths ⚠ 268 do not resolve — investigate
├── scripts/            python ingest + .mjs witnesses
├── shots/              ⚠ ALL desktop 1440×900. The phone is unwitnessed
├── _retired/           ⭐ where files go instead of being deleted
├── README.md           state of the game — read second
├── PLAN_2026-08-17.md  full working history; PART 12 is the current ruling
└── APK_BUILD_PLAN.md   ← this file
```
