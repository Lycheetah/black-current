#!/usr/bin/env node
/* ==========================================================================
   ART PACK VALIDATOR  —  bubble-tanks-forge
   ==========================================================================

   Usage:
     node scripts/validate-pack.mjs                  # every pack in packs/
     node scripts/validate-pack.mjs packs/foo.json   # one pack
     node scripts/validate-pack.mjs --sheet          # also write a contact sheet PNG

   TWO PASSES, AND THE SECOND IS THE ONE THAT MATTERS.

     PASS 1 · STRUCTURE   Does it match the schema the interpreter reads?
     PASS 2 · RENDER      Does it actually put pixels on a canvas?

   Pass 1 alone is the trap. A pack can satisfy every key and still draw
   nothing — coordinates outside the node, a layer with no `fill`, a poly with
   two points. So pass 2 loads the REAL `js/packs.js` in a real browser, calls
   the REAL `drawPart`, and counts non-transparent pixels per part. A part that
   draws zero pixels is a failure no schema check would ever catch.

   The contact sheet exists because a pixel count cannot tell you a ship looks
   like a ship. Render it, then LOOK at it. ==================================
   ========================================================================== */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PW = process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright');

const PARTS = ['core', 'pod', 'cannon', 'spike', 'thruster', 'shield'];
const SHAPES = ['circle', 'rect', 'poly', 'arcband'];
const MAX_LAYERS = 6;
const MIN_LAYERS = 2;
const COORD_LIMIT = 2.2;   // normalised units; beyond this a part invades its neighbours

let failures = 0, warnings = 0;
const fail = (pack, msg) => { failures++; console.log(`  🔴 [${pack}] ${msg}`); };
const warn = (pack, msg) => { warnings++; console.log(`  ⚠  [${pack}] ${msg}`); };
const ok   = (msg)       => console.log(`  ok   ${msg}`);

/* ── argument handling ─────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const wantSheet = args.includes('--sheet');
const files = args.filter(a => !a.startsWith('--'));

const packFiles = files.length
  ? files.map(f => resolve(process.cwd(), f))
  : (existsSync(join(ROOT, 'packs'))
      ? readdirSync(join(ROOT, 'packs')).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => join(ROOT, 'packs', f))
      : []);

if (!packFiles.length) {
  console.log('No packs found. Put pack JSON in packs/ or pass a path.');
  process.exit(1);
}

/* ── PASS 1 · STRUCTURE ────────────────────────────────────────────────── */

const isHex = s => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s);
const isColorish = s => typeof s === 'string' && (s === 'tint' || isHex(s) || /^rgba?\(/i.test(s));

function checkPaint(pack, where, p) {
  if (p === undefined || p === null) return;
  if (typeof p === 'string') {
    if (!isColorish(p)) fail(pack, `${where}: "${p}" is not a colour, "tint", or rgb()/rgba()`);
    return;
  }
  if (typeof p !== 'object') { fail(pack, `${where}: paint must be a string or a gradient object`); return; }
  if (p.grad !== 'linear' && p.grad !== 'radial') {
    fail(pack, `${where}: gradient needs "grad":"linear" or "radial", got ${JSON.stringify(p.grad)}`);
    return;
  }
  if (!Array.isArray(p.stops) || p.stops.length < 2) {
    fail(pack, `${where}: gradient needs at least 2 stops`);
    return;
  }
  for (const [i, s] of p.stops.entries()) {
    if (!Array.isArray(s) || s.length < 2) { fail(pack, `${where}: stop ${i} must be [offset, colour]`); continue; }
    if (typeof s[0] !== 'number' || s[0] < 0 || s[0] > 1) fail(pack, `${where}: stop ${i} offset ${s[0]} outside 0..1`);
    if (!isColorish(s[1])) fail(pack, `${where}: stop ${i} colour "${s[1]}" is not valid`);
  }
}

function checkLayer(pack, where, L) {
  if (!SHAPES.includes(L.shape)) {
    fail(pack, `${where}: shape "${L.shape}" unknown — the interpreter silently SKIPS it. Use ${SHAPES.join('/')}`);
    return;
  }
  if (L.fill === undefined && L.stroke === undefined) {
    fail(pack, `${where}: no fill and no stroke — this layer is invisible`);
  }
  checkPaint(pack, `${where}.fill`, L.fill);
  checkPaint(pack, `${where}.stroke`, L.stroke);

  const coords = [];
  if (L.shape === 'poly') {
    if (!Array.isArray(L.points) || L.points.length < 3) {
      fail(pack, `${where}: poly needs 3+ points, got ${L.points?.length ?? 0}`);
    } else {
      for (const pt of L.points) {
        if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
          fail(pack, `${where}: bad point ${JSON.stringify(pt)}`);
        } else coords.push(...pt);
      }
    }
  } else if (L.shape === 'rect') {
    if (typeof L.w !== 'number' || typeof L.h !== 'number' || L.w <= 0 || L.h <= 0) {
      fail(pack, `${where}: rect needs positive w and h`);
    }
    coords.push(L.x ?? 0, L.y ?? 0, (L.x ?? 0) + (L.w ?? 0), (L.y ?? 0) + (L.h ?? 0));
  } else if (L.shape === 'circle') {
    if (L.r !== undefined && (typeof L.r !== 'number' || L.r <= 0)) fail(pack, `${where}: circle r must be > 0`);
    coords.push((L.cx ?? 0) + (L.r ?? 1), (L.cy ?? 0) + (L.r ?? 1));
  } else if (L.shape === 'arcband') {
    if ((L.r1 ?? 1) <= (L.r0 ?? 0.8)) fail(pack, `${where}: arcband needs r1 > r0`);
    coords.push(L.r1 ?? 1);
  }

  for (const c of coords) {
    if (Math.abs(c) > COORD_LIMIT) {
      warn(pack, `${where}: coordinate ${c} exceeds ±${COORD_LIMIT} node radii — it will overlap neighbouring parts`);
      break;
    }
  }

  if (L.pulse && L.pulse.on !== 'undulation') {
    fail(pack, `${where}: pulse.on must be "undulation" (the only clock the interpreter has)`);
  }
}

function structure(path) {
  const name = basename(path);
  let pack;
  try { pack = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { fail(name, `not valid JSON — ${e.message}`); return null; }

  const id = pack.id || name;
  if (typeof pack.id !== 'string' || !/^[a-z0-9-]+$/.test(pack.id || '')) {
    fail(id, 'id must be lowercase-kebab and present — packRenderer.register() REFUSES a pack without one');
  }
  if (basename(path, '.json') !== pack.id) {
    warn(id, `filename "${basename(path, '.json')}" does not match id "${pack.id}"`);
  }
  if (!pack.name) warn(id, 'no display name');
  if (!['ship', 'organism', 'machine', 'arcane'].includes(pack.kind)) {
    warn(id, `kind "${pack.kind}" is unusual — expected ship/organism/machine/arcane`);
  }

  if (!pack.parts || typeof pack.parts !== 'object') {
    fail(id, 'no "parts" object — register() refuses this');
    return null;
  }

  for (const p of PARTS) {
    const part = pack.parts[p];
    if (!part) { fail(id, `missing part "${p}" — it will fall back to the legacy bubble and break the look`); continue; }
    if (!Array.isArray(part.layers) || !part.layers.length) { fail(id, `part "${p}" has no layers`); continue; }
    if (part.layers.length > MAX_LAYERS) warn(id, `part "${p}" has ${part.layers.length} layers (budget ${MAX_LAYERS}) — this is the hot path, 40 entities × 5 nodes every frame`);
    if (part.layers.length < MIN_LAYERS) warn(id, `part "${p}" has only ${part.layers.length} layer — likely too plain to read`);
    part.layers.forEach((L, i) => checkLayer(id, `parts.${p}.layers[${i}]`, L));

    const hasTint = JSON.stringify(part.layers).includes('"tint"');
    if (!hasTint) warn(id, `part "${p}" uses no "tint" — the player's chosen colour will not appear on it`);
  }

  if (!pack.parts.core?.connector) warn(id, 'no parts.core.connector — the spars between nodes will use the legacy tendril');
  if (!pack.vernacular) warn(id, 'no vernacular — the UI will keep saying "Nucleus" over a battleship');
  else for (const k of [...PARTS, 'connector', 'currency', 'graft']) {
    if (!pack.vernacular[k]) warn(id, `vernacular missing "${k}"`);
  }

  if (!pack.threat) warn(id, 'no threat colours — enemies stay bio-green in a steel fleet');
  else for (const a of ['mote', 'stalker', 'charger', 'sniper', 'hive', 'boss']) {
    if (!pack.threat[a]) warn(id, `threat missing "${a}"`);
    else if (!isHex(pack.threat[a])) fail(id, `threat.${a} must be a hex colour`);
  }
  if (pack.threat?.hive && pack.threat.hive === pack.threat.boss) {
    warn(id, 'threat.hive === threat.boss — a carrier will read as a flagship at a glance (this bug is in the stock game too)');
  }

  if (!pack.ambient) warn(id, 'no ambient — the ocean stays the legacy colour under a new fleet');
  if (pack.ambient && !isHex(pack.ambient.ground)) warn(id, 'ambient.ground should be a hex colour');

  /* Forward-spec: accepted and validated, but NOT yet consumed by js/packs.js. */
  if (pack.projectiles) {
    for (const w of ['spitter', 'twin', 'mortar', 'laser', 'homing', 'railgun']) {
      if (!pack.projectiles[w]) warn(id, `projectiles missing "${w}" (forward-spec, not yet rendered)`);
      else (pack.projectiles[w].layers || []).forEach((L, i) => checkLayer(id, `projectiles.${w}.layers[${i}]`, L));
    }
  }
  if (pack.effects?.trail?.layers) pack.effects.trail.layers.forEach((L, i) => checkLayer(id, `effects.trail.layers[${i}]`, L));

  return pack;
}

console.log('\n══ PASS 1 · STRUCTURE ══');
const packs = [];
for (const f of packFiles) {
  console.log(`\n▸ ${basename(f)}`);
  const p = structure(f);
  if (p) { packs.push(p); ok(`${Object.keys(p.parts || {}).length} parts parsed`); }
}

/* ── PASS 2 · RENDER ───────────────────────────────────────────────────── */

console.log('\n══ PASS 2 · RENDER (real interpreter, real canvas) ══');

let chromium;
try { ({ chromium } = await import(PW)); }
catch {
  console.log(`  ⚠  playwright not found at ${PW} — RENDER PASS SKIPPED.`);
  console.log('     Structure alone does NOT prove a pack draws. Set PLAYWRIGHT_PATH and re-run.');
  console.log(`\n${failures ? `🔴 ${failures} failure(s)` : '✅ structure clean'}, ${warnings} warning(s) — render UNVERIFIED\n`);
  process.exit(failures ? 1 : 0);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<canvas id="c" width="1080" height="${Math.max(180, packs.length * 180)}"></canvas>`);
await page.addScriptTag({ path: join(ROOT, 'js', 'packs.js') });

const results = await page.evaluate(({ packs, PARTS }) => {
  const c = document.getElementById('c');
  const ctx = c.getContext('2d');
  /* CELL must clear the longest legitimate part. Ironwake's ram prow reaches
     1.72 radii, so a half-cell under that clips the very parts most likely to
     be wrong. 90px half-cell at R=46 gives 1.95 radii of headroom. */
  const R = 46, CELL = 180;
  const out = [];

  packs.forEach((pack, row) => {
    packRenderer.register(pack);
    packRenderer.use(pack.id);
    const per = {};

    /* Paint the pack's OWN ocean behind it. Judging a near-black hull on a
       white sheet tells you nothing about how it reads in the game, and it is
       how a "fine" contact sheet hides an invisible part. */
    ctx.fillStyle = (pack.ambient && pack.ambient.ground) || '#05070C';
    ctx.fillRect(0, row * CELL, PARTS.length * CELL, CELL);

    PARTS.forEach((part, col) => {
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;

      /* Isolate this cell so a pixel count measures THIS part only. */
      const before = ctx.getImageData(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
      ctx.save();
      const drew = packRenderer.drawPart(ctx, part, cx, cy, R, pack.__tint || '#00f3ff', {
        undulation: 1.1, firing: true, thrusting: true,
      });
      ctx.restore();

      const after = ctx.getImageData(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
      let painted = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (let i = 0; i < after.data.length; i += 4) {
        if (after.data[i + 3] !== before.data[i + 3] || after.data[i] !== before.data[i]
            || after.data[i + 1] !== before.data[i + 1] || after.data[i + 2] !== before.data[i + 2]) {
          painted++;
          const px = (i / 4) % CELL, py = Math.floor((i / 4) / CELL);
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
      per[part] = {
        drew, painted,
        w: painted ? maxX - minX + 1 : 0,
        h: painted ? maxY - minY + 1 : 0,
        clipped: painted ? (minX <= 0 || minY <= 0 || maxX >= CELL - 1 || maxY >= CELL - 1) : false,
      };
    });

    out.push({ id: pack.id, per });
  });

  packRenderer.use(null);
  return out;
}, { packs, PARTS });

for (const r of results) {
  console.log(`\n▸ ${r.id}`);
  for (const part of PARTS) {
    const m = r.per[part];
    if (!m.drew) { fail(r.id, `drawPart("${part}") returned FALSE — the interpreter did not handle it`); continue; }
    if (m.painted === 0) {
      fail(r.id, `"${part}" drew ZERO pixels — it parses and renders nothing. Check fills and coordinate signs.`);
      continue;
    }
    if (m.painted < 200) warn(r.id, `"${part}" painted only ${m.painted}px — probably too small to read at r=46`);
    if (m.clipped) warn(r.id, `"${part}" touches its cell edge — coordinates likely exceed ±1.6 radii`);
    ok(`${part.padEnd(9)} ${String(m.painted).padStart(6)}px   bbox ${m.w}×${m.h}${m.clipped ? '  ⚠clipped' : ''}`);
  }
}

if (wantSheet) {
  /* Label the sheet so a human can tell which row is which pack. */
  await page.evaluate(({ ids, PARTS }) => {
    const ctx = document.getElementById('c').getContext('2d');
    const CELL = 180;
    ctx.font = 'bold 11px monospace';
    PARTS.forEach((p, i) => {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillText(p.toUpperCase(), i * CELL + 8, 16);
    });
    ids.forEach((id, r) => {
      ctx.fillStyle = '#00f3ff';
      ctx.fillText(id, 8, r * CELL + CELL - 8);
    });
  }, { ids: results.map(r => r.id), PARTS });

  const rows = Math.max(1, results.length);
  const buf = await page.locator('#c').screenshot({
    clip: { x: 0, y: 0, width: 6 * 180, height: rows * 180 },
  }).catch(() => null);
  const sheetPath = join(ROOT, 'packs', 'contact-sheet.png');
  if (buf) { writeFileSync(sheetPath, buf); console.log(`\n  contact sheet → ${sheetPath}`); }
}

await browser.close();

console.log(`\n${failures ? `🔴 ${failures} FAILURE(S)` : '✅ ALL PACKS DRAW'}  ·  ${warnings} warning(s)`);
console.log('⚠ A pixel count is not a verdict on how it LOOKS. Open the contact sheet.\n');
process.exit(failures ? 1 : 0);
