# 🎮 TEST TONIGHT — the play card
### Mac reads this, plays, and rules. Nothing here is a verdict; feel is his alone.
### additive file · `README.md` is Aetheron's seat and is not edited here

---

## ▶ START

```
http://localhost:8811/
```

✅ **Fixed 2026-08-17 — every doc now says 8811.** (Historical note: five files used to say `8082` — `README.md:4`, `AGENTS.md:13`,
`SOLPRIME_..._HANDOFF_2026-08-15.md:9`, `scripts/witness-movement-feel.mjs:14`,
`scripts/witness-skin-selector.mjs:5`. **MEASURED 2026-08-16:** `8811` returns
`200`, and it is the server already running. The two witness scripts will point
at a dead port until someone fixes them (`GAME_URL` env var overrides both).

---

## ⚠ THE ONE TRAP — READ THIS OR TONIGHT'S WORK IS INVISIBLE

**Your default ship has ONE cannon node.** With one gun, the new hardpoint system
looks *identical* to the old one. You will play for ten minutes and conclude
nothing changed.

**So do this first:**

1. Press <kbd>TAB</kbd> → the Organism Designer.
2. Place **four to six `cannon` nodes**, spread wide — some forward, some on the
   flanks, at least one facing **backward**.
3. Make one of them **big** (drag the radius up) and one **small**.
4. Close the designer.
5. Press <kbd>k</kbd> to turn on the **arc overlay**.

*Now* you are looking at the thing that was built.

---

## 👀 WHAT TO ACTUALLY LOOK FOR — in this order

### 1. Do the guns come from the guns?
Bullets should leave **each cannon's own muzzle**, not the middle of the ship.
On a wide hull the flank batteries visibly lead the centre ones.
⛔ If everything still spawns from one point, `hardpoints.js` is not wired.

### 2. Does the big gun swing slower than the small one?
This is **the keystone**. Swing the cursor fast across the screen and watch the
overlay. The small barrel should snap; the big one should lumber and lag.
`traverse = 0.052 × (12 / radius)` — a 12px gun ≈ 180°/s, a 30px gun ≈ 71°/s.

### 3. Does the rear gun refuse to fire forward?
Green cone = it can bear. Red cone = it can't. **A gun outside its arc does not
shoot.** Fly so an enemy sits behind you and confirm the front battery goes
quiet. ⭐ *That silence is the whole design* — it's what lets a small ship kill a
big one by getting inside the arc.

### 4. Does the hull have weight now?
Whip the mouse 180°. The ship should **rotate into it over about a second**, not
snap. ⭐ You should notice your **movement did not get worse** — thrust is
world-absolute, so W is still world-up and the ship still darts. Only the guns
have to catch up.

### 5. Is the fleet number sane?
Bottom-right HUD: `GUNS n · DMG/GUN ×s · FLEET ×t`. Six guns should read
**FLEET ×2.45**, not ×6. If it reads ×6, the balance law broke.

---

## 🎛 CONTROLS — MEASURED from source, 2026-08-16

| key | does | file |
|---|---|---|
| <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | move — **world-absolute, not ship-relative** | `engine.js` |
| mouse | aim (hull now eases toward it) | `engine.js:691` |
| click / hold | fire | `engine.js` |
| <kbd>Space</kbd> / <kbd>Q</kbd> | secondary ability | `engine.js:143` |
| <kbd>Tab</kbd> | **Organism Designer** | `engine.js:134` |
| <kbd>M</kbd> | world matrix map | `engine.js:138` |
| <kbd>P</kbd> | cycle art pack *(shift+P reverse)* | `packs.js:461` |
| <kbd>Esc</kbd> | close reward / mission modal | `garage.js:93` |
| **REACTOR** | | |
| <kbd>1</kbd> | CILIA — +100% thrust | `energy.js:33` |
| <kbd>2</kbd> | MEMBRANE — −45% damage taken | `energy.js:34` |
| <kbd>3</kbd> | STINGERS — +67% fire rate | `energy.js:35` |
| <kbd>4</kbd> | DORMANT — reactor recovers | `energy.js:36` |
| **DIALS** | | |
| <kbd>-</kbd> <kbd>=</kbd> | top speed | `feel.js:236` |
| <kbd>;</kbd> <kbd>'</kbd> | response *(higher = snappier)* | `feel.js:240` |
| <kbd>[</kbd> <kbd>]</kbd> | 🔴 zoom **AND** fog — see bug below | `feel.js` + `shaders.js` |
| <kbd>&lt;</kbd> <kbd>&gt;</kbd> | **hull turn rate** (default 120°/s) | `hardpoints.js:259` |
| <kbd>k</kbd> | **turret arc overlay** | `hardpoints.js:263` |
| <kbd>0</kbd> | reset movement dials | `feel.js:243` |
| <kbd>\\</kbd> | reset turn rate **and** fog *(both listen)* | `hardpoints.js` + `shaders.js` |

⚠ Every dial is guarded against text fields, so typing your callsign is safe.

---

## 🔴 KNOWN LIVE BUG — you will hit this in the first two minutes

**<kbd>[</kbd> and <kbd>]</kbd> are bound twice and BOTH fire.**

- `js/feel.js:238-239` → camera zoom
- `js/shaders.js:327-328` → fog density

Both listen on `window`, both call `preventDefault()`. **Pressing `[` changes the
zoom and the fog at the same time.** This was diagnosed in `DREADNOUGHT_PLAN.md`
and the fix (move fog to <kbd>,</kbd>/<kbd>.</kbd>) is **still unbuilt**.

⚠ <kbd>\\</kbd> is also doubled — resets turn rate *and* snaps fog to 0.82. Less
harmful, both are resets, but it is the same defect.

---

## ⛔ WHAT NOT TO JUDGE TONIGHT

- **The phone.** Completely unwitnessed. A green browser is not a green phone.
- **The art.** The 268 keyed assets are not wired to anything; the renderer is
  still 100% procedural. **The sprite-path decision is still yours and unmade.**
- **Big fights.** `perf.js` is unbuilt — no `MAX_PROJECTILES`, no `MAX_PARTICLES`,
  no glow cache. If a heavy fight stutters, that is the known missing floor, not
  a hardpoints defect. Note it and move on.
- **Weapon-per-mount.** PHASE 5 is *recorded, not built*. Every mount still fires
  the same weapon type tonight.

---

## 📝 WHAT I NEED BACK FROM YOU

Just answers to these, in whatever words:

1. **Does 120°/s feel right,** or do you want it faster/slower? *(dial it live with
   `<` `>` and tell me the number the HUD lands on.)*
2. **Is the arc too tight or too generous?** A 12px gun currently covers ~213°,
   a 30px gun ~120°.
3. **Is `FLEET ×2.45` for six guns enough reward**, or does stacking cannons feel
   pointless?
4. **Should a ship with zero cannon nodes be able to fire at all?** Right now it
   cannot — correct, or a trap for a new player?

Those four numbers are the only things a gate can never tell me.
