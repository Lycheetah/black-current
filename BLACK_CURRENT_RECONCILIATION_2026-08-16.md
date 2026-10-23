# BLACK CURRENT — STATE RECONCILIATION
**2026-08-16 · measured against the ✅ 100% status report**

Two documents landed together: Aetheron's status report (nine subsystems, all ✅ 100%)
and GPT's creative vision (45 sections). This reconciles the first against what I
could actually measure, so the session gets planned on real ground.

**Headline: the report is mostly accurate.** Most claims held up under test. Four
did not, and one of those was a live crash in a feature marked 100%.

Re-run the measurements yourself: `node scripts/witness-skin-selector.mjs`
(13/14 — the one failure is a real open defect, listed below).

---

## ✅ CONFIRMED TRUE — I tested these and they hold

| Claim | How it was measured | Result |
|---|---|---|
| Pack JSON validates 0 errors 0 warnings | ran `scripts/validate-pack.mjs` | **exit 0**, all 90 parts draw, 0 warnings — accurate *for the 15 files* |
| Hull Skin selector exists and is wired | `garage.js:159–190`, real browser | **real** — 16 tiles render and respond |
| All manifest packs load at runtime | `Object.keys(packRenderer.packs)` in-page | **16 loaded**, none silently dropped |
| Zero image files | pack schema + renderer | **true** — 100% procedural, no atlas, no loader |

The report earned these. The validator is not rubber-stamping: it renders each part
in real Chromium and counts painted pixels, so "all packs draw" means they draw.

---

## 🔴 CONTRADICTED BY MEASUREMENT

### 1. The Hull Skin selector threw on every click — FIXED

Reported ✅ 100%. Witnessed in a real browser:

```
TypeError: packRenderer.save is not a function
```

`garage.js:186` called `.save()`; `packs.js` defines `.persist()`. Because `use()`
runs on the line *before*, **the pack visibly changed** — which is exactly why this
survived a 100% report. It looked like it worked. The throw killed the rest of the
handler, so:

- the choice never reached localStorage (`stored=null`)
- the tile never got its `.active` class (`0 tiles marked active`)
- **pick a skin, reload, it is gone**

Fixed by aliasing `save()` → `persist()` in `packs.js`, not by editing `garage.js`,
because two seats are live in this repo. Re-witnessed: **9/10, error gone, choice
persists, tile highlights.** Converge on one name when the lanes sync — an alias is
a bridge, not an answer.

> **The lesson worth keeping:** a feature that *half* works reads as done. The pack
> switched, so a human clicking once would have reported success too. Only reading
> the console caught it.

### 2. Pack projectile art renders nowhere

Every pack authors a full `projectiles` block — six weapons with `stretch`, `spin`,
trails. **Nothing reads it.** No `drawProjectile` exists anywhere in `js/`.
`weapons.js` still draws every shot as its own circle.

So `ai-battleship` fires the same bubble as `glassreef-choir`. Fifteen packs of
authored ammunition, zero of it on screen. "Weapons & Actives ✅ 100%" is true of
*gameplay* and false of *art reach*.

Also still live at `weapons.js:51`:

```js
ctx.fillStyle = this.color.replace(')', ', 0.25)').replace('rgb', 'rgba');
```

Every colour in this game is hex. A hex string has no `)` and no `rgb`, so **both
replacements are no-ops** and the "glowing outer ring" fills at full opacity. That
soft halo has never rendered, in any pack, ever.

### 3. "15 distinct packs" is really ~6 designs

I rendered the contact sheet and looked at it. Nine packs share one drawing in nine
hues — the same hexagonal core, the same barrel-plus-two-slots cannon, the same
arrowhead spike:

> `ai-battleship` · `cyber-dreadnought` · `eclipse-battlecruiser` · `emberwake-swarm`
> `obsidian-reaver` · `plasma-cruiser` · `sol-flagship` · `titan-dreadnought` · `voidwright`

Six have genuine silhouettes of their own: `deepiron-cartel` (boxy industrial),
`glassreef-choir` (circular, soft), `hammerhead-dreadnought` (flat-front T-bar),
`needle-interceptor` (thin dart), `trident-assault` (forked), `ironwake-fleet`
(filled dark hull — a different *treatment*, not just a different shape).

This is precisely what GPT's §19 warns against, and the validator cannot see it:
**a pixel count proves a part drew, never that it is a different design.** Hue is
not silhouette. At 32px on a phone, hue is nearly all you lose first.

**Plus a real tint bug:** `plasma-cruiser` (18 hardcoded cyans), `cyber-dreadnought`
(7) and `titan-dreadnought` (1) bypass the `"tint"` system, so **those three ignore
the player's chosen colour.** The other twelve are clean. The validator only warns
when a part uses *no* tint at all, so a part with both passes — that is a gap in my
gate, not a lie in the report.

### 4. It is 16 packs, not 15 — and the validator has never seen the 16th

Every "15 packs" claim in this repo counts **files**, not packs. `packs/` holds 15
JSON files, but `abyssal-choir` is defined **inline at `js/packs.js:330`** and
registered at load. The runtime carries **16**, and a player can select all 16.

`scripts/validate-pack.mjs` globs `packs/*.json`. So the headline number — 0 errors,
0 warnings — covers **15 of the 16 packs that ship**. `abyssal-choir` has never been
validated, never had its parts pixel-counted, and would not be caught by the gate if
it broke.

> This is the "an audit measured N nodes and called the room green" pattern. The gate
> is honest about what it measured; nobody checked that what it measured was
> everything. **A validator that discovers its own inputs can only ever see the
> inputs it knows how to discover.**

**And `legacy` is a one-way door.** `ids()` returns **17** options — 16 packs plus
`legacy`, and the comment at `packs.js:256` is explicit that legacy is "a real,
selectable option, not the absence of one." But `renderSkinChoices()` iterates
`Object.values(packRenderer.packs)`, which does not contain it. So the grid renders
16 tiles for 17 options: **once a player picks any pack, the garage UI offers no way
back to the legacy look.** `cycle()` can still reach it; the tiles cannot.

---

## 🎯 WHERE THE VISION MEETS THE CODE

GPT's document needs no notes from me. But one connection is worth naming because
it is nearly free and unlocks several sections at once.

### The pack system already IS the "ship vocabulary" of §39

§39 asks for packs to be *civilizations* rather than skins. §5 calls the six node
types an alphabet. **That architecture already shipped** — 15 lineages × 6 parts,
normalised geometry, player tint, proven not to move a single hitbox.

The one thing missing is that a pack is currently **chosen from a menu**. Bind pack
identity to *sector* instead, and §10 (regions change evolution), §21 (the ship's
visible life story) and §39 all light up using code that already exists:

- salvage from Machine Grave grafts on a `cyber-dreadnought` cannon
- a Coral Reef pod arrives as `glassreef-choir`
- a veteran hull becomes **visibly** mixed-lineage — the archaeological record of §21,
  rendered by the pack seam already wired

That is the highest-leverage move on the board: it is mostly *wiring*, not new art,
and it converts a cosmetic menu into the game's core identity system.

**The prerequisite is honest:** mixed-lineage hulls only look good if the lineages
are actually distinct. Which is why the nine palette-swaps matter more than they
look — they are not a cosmetic debt, they are blocking the best idea in the document.

---

## ORDERED NEXT MOVES

Sequenced by leverage, not by effort.

1. **Physics feel** — Mac's live complaint, and arithmetic, not taste. Accel `0.75`
   against damping `0.93` means **41 frames (~0.68s) to reach speed and 41 to shed
   it.** Ship it as a live dial (`-`/`=`, `;`/`'`) the way the fog dial works, so Mac
   finds the number instead of us guessing it again.
2. **Rebuild the nine palette-swaps as six real silhouettes.** Fewer, more distinct
   beats fifteen near-identical. Test: recognisable in pure black silhouette (§19).
3. **Wire the projectile seam.** The art is authored and validated; it needs a
   reader. Fix `weapons.js:51` in the same pass.
4. **Fix the three hardcoded-cyan packs**, and tighten the validator to catch a part
   that mixes `"tint"` with a literal — the gap that let them through.
5. **Close the two roster gaps.** Feed `validate-pack.mjs` from the *runtime* roster
   rather than a directory glob, so `abyssal-choir` is covered; and render a `legacy`
   tile so the grid can express every option `ids()` declares. Both are small, and
   both are the kind of gap that silently invalidates a headline number.
5. **Bind pack lineage to sector.** The §39 unlock above.
6. **Typed sockets + socket lock.** A lock costs nothing and nothing silently unlocks it.

---

## WHAT REMAINS UNWITNESSED

Said plainly, because a reconciliation that only lists wins is the thing it is
supposed to catch.

- ⏭ **The phone.** Every measurement here is desktop Chromium at 1280×900. Frame
  pacing, heat, touch latency and whether the loop is *fun* are answered only by a
  person holding the device.
- ⏭ **Nobody has reported whether it is fun.** I have never played it. Every claim I
  could make about feel would be borrowed.
- ⏭ **The fog default (`0.5`) is still a guess.** Mac's dial number wins; it has not
  landed yet.
- ⚠ **This directory is not a git repository** (`fatal: not a git repository`). There
  is no version history and no way to recover a bad edit. With multiple seats writing
  in parallel, that is the largest structural risk on this list.
