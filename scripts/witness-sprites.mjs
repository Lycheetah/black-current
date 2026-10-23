/* WITNESS — the art actually reaches the screen.
 *
 * ⛔ `sprites.ready === true` PROVES A FETCH RESOLVED. It says nothing about
 *    whether a single pixel of Mac's art was ever painted. So this counts real
 *    `drawImage` calls by instrumenting the live 2D context, and then SHOOTS THE
 *    SCREEN so a person can judge it — because a green gate is not a green
 *    browser, and neither is Mac's verdict.
 *
 *   node scripts/witness-sprites.mjs
 */
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs');

const URL = process.env.GAME_URL || 'http://localhost:8811/';
const OUT = 'shots/sprites';
mkdirSync(OUT, { recursive: true });

const errors = [];
let pass = 0, fail = 0;
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${n}${d ? `   [${d}]` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
/* ⚠ SCOPED TO OUR OWN ORIGIN, DELIBERATELY AND NARROWLY. The page pulls a
   webfont from fonts.gstatic.com which headless cannot reach, and a witness that
   goes red on someone else's CDN teaches you to ignore it — which is how a real
   error gets waved through. Third-party network failures are excluded; every
   error from our own code still counts. */
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/fonts\.(gstatic|googleapis)\.com/.test(t)) return;
  if (/Failed to load resource/.test(t) && !/localhost/.test(t)) return;
  errors.push('console: ' + t);
});
page.on('response', r => {
  if (r.status() >= 400 && r.url().includes('localhost')) {
    errors.push(`HTTP ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
  }
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1400);   // the manifest is fetched, images decode

// ---- §1 the layer is installed and loaded ------------------------------
console.log('\n§1 THE SPRITE LAYER IS LIVE');
const live = await page.evaluate(() => ({
  exists: typeof window.sprites,
  ready: window.sprites && sprites.ready,
  installed: typeof fluidShader !== 'undefined' && !!fluidShader._spritesInstalled,
  types: window.sprites ? Object.keys(sprites.byType).map(t => t + ':' + sprites.byType[t].length) : [],
  usable: window.sprites && sprites.manifest
    ? [].concat(sprites.manifest.modules, sprites.manifest.ships, sprites.manifest.enemies)
        .filter(e => e.usable).length : 0,
  /* ⛔ CAPTURED BEFORE ANY SECTION MUTATES THEM. §5 must photograph the game as
     it SHIPS — a witness that overrides the defaults it is meant to prove shoots
     a configuration nobody ever sees. */
  defaults: window.sprites
    ? { enabled: sprites.enabled, underlay: sprites.underlay,
        chassis: sprites.chassis, gain: sprites.gain } : null,
  /* a core node must wear NO sprite — that bucket is how the caterpillar happened */
  coreBucket: window.sprites ? (sprites.byType.core || []).length : -1
}));
ck('window.sprites exists', live.exists === 'object', live.exists);
ck('manifest loaded', !!live.ready);
ck('wrapped fluidShader.drawOrganismMembrane', live.installed);
ck('buckets built for the node types', live.types.length >= 5, live.types.join(' '));
ck('usable sprite count > 100', live.usable > 100, String(live.usable));
/* 🔴 MAC FOUND THIS BY PLAYING, 2026-08-17: modules 093-100 are whole purple
   alien ships and I had filed them `core`, so every hull's core node wore a
   complete ship and they chained nose-to-tail — *"some of the ships youve
   connected modules to ships what the fuck"*. A CORE NODE WEARS NO SPRITE. The
   procedural membrane draws the body the painted parts bolt onto. This law is
   here so the bucket cannot quietly come back. */
ck('NO core bucket exists (a core node wears no sprite)', live.coreBucket === 0,
  `core bucket = ${live.coreBucket}`);

// ---- §2 THE PIXELS. instrument drawImage and fly a real hull -----------
console.log('\n§2 ART IS ACTUALLY PAINTED (instrumented drawImage)');
const painted = await page.evaluate(async () => {
  /* ⛔ `garage.launch()` REFUSES WITHOUT A CALLSIGN and leaves the title overlay
     covering the canvas — a screenshot then photographs the DOM, not the game.
     Drive the real door: fill the real field, press the real button. */
  const cs = document.getElementById('title-callsign');
  if (cs) { cs.value = 'WITNESS'; cs.dispatchEvent(new Event('input', { bubbles: true })); }
  if (window.garage && garage.launch) { try { garage.launch(false); } catch (e) {} }
  engine.paused = false; engine.mapOpen = false;
  fleet.equip('dreadnought');
  await new Promise(r => setTimeout(r, 700));   // let the images decode

  const ctx = engine.ctx;
  const real = ctx.drawImage;
  let calls = 0; const srcs = new Set();
  ctx.drawImage = function (img, ...a) {
    // sprites.js blits PRE-SCALED CANVASES, which have no `.src` — read the tag.
    calls++;
    if (img && img._file) srcs.add(img._file);
    else if (img && img.src) srcs.add(img.src.split('/').pop());
    return real.apply(this, [img, ...a]);
  };
  for (let i = 0; i < 6; i++) engine.render ? engine.render() : engine.draw && engine.draw();
  ctx.drawImage = real;
  return { calls, distinct: srcs.size, sample: [...srcs].slice(0, 6) };
});
ck('drawImage is CALLED during a real frame', painted.calls > 0, `${painted.calls} calls / 6 frames`);
ck('several distinct sprites on one hull', painted.distinct >= 4,
  `${painted.distinct} distinct — ${painted.sample.join(' ')}`);

// ---- §3 the pivot is the mount, not the centre -------------------------
console.log('\n§3 THE MOUNT DOT IS THE PIVOT');
const pivot = await page.evaluate(() => {
  const e = sprites.byType.cannon[Math.floor(sprites.byType.cannon.length / 2)];
  return { file: e.file, mount: e.mount, offCentre: Math.abs(e.mount[0] - 0.5) };
});
ck('a cannon mount is NOT at the bitmap centre', pivot.offCentre > 0.15,
  `${pivot.file} mount u=${pivot.mount[0]}`);

// ---- §3b the chassis is DRAWN, not merely configured -------------------
console.log('\n§3b THE CHASSIS IS ACTUALLY STROKED');
/* ⛔ `sprites.chassis === true` IS A FLAG, NOT A MECHANISM. The spars sit UNDER
   the sprites, so on a dense hull they are invisible by design and a screenshot
   cannot tell "drawn and covered" from "never drawn". Count real strokes with the
   toggle on and off: the difference is the chassis or nothing is. */
const chassis = await page.evaluate(() => {
  const ctx = engine.ctx;
  const real = ctx.stroke;
  const count = (on) => {
    sprites.chassis = on;
    let n = 0;
    ctx.stroke = function (...a) { n++; return real.apply(this, a); };
    engine.render ? engine.render() : engine.draw && engine.draw();
    ctx.stroke = real;
    return n;
  };
  const off = count(false), on = count(true);
  sprites.chassis = true;
  return { on, off, nodes: engine.player.nodes.length };
});
ck('chassis ON strokes more than chassis OFF', chassis.on > chassis.off,
  `${chassis.off} → ${chassis.on} strokes`);
/* three strokes per spar (shadow, body, highlight) + two for the core drum */
ck('one spar per non-core node', chassis.on - chassis.off >= (chassis.nodes - 1) * 3,
  `${chassis.on - chassis.off} extra for ${chassis.nodes - 1} spars`);

// ---- §4 it is a costume, not a second engine ---------------------------
console.log('\n§4 THE NODE GRAPH IS UNCHANGED (a sprite is a costume)');
const costume = await page.evaluate(() => {
  const snap = () => engine.player.nodes.map(n => `${n.type}:${n.radius}`).join('|');
  const before = snap();
  sprites.enabled = false; engine.update(1 / 60);
  const off = snap();
  sprites.enabled = true; engine.update(1 / 60);
  return { same: before === off && off === snap(), count: engine.player.nodes.length };
});
ck('toggling sprites changes NO node', costume.same, `${costume.count} nodes`);

// ---- §5 SHOOT THE SCREEN. Mac judges this, no gate does ----------------
console.log('\n§5 SHOTS FOR MAC');
/* ⛔ THE SHOT MUST BE OF THE GAME. Assert the title overlay is gone before
   spending six screenshots photographing a menu. */
const doorOpen = await page.evaluate(() => {
  const t = document.getElementById('title-overlay');
  return { hidden: !t || getComputedStyle(t).display === 'none',
           found: !!t, launched: !!(window.saveState && saveState.doc.launched) };
});
ck('the title overlay is closed (we are photographing the GAME)',
  doorOpen.hidden && doorOpen.launched, JSON.stringify(doorOpen));

/* ⚠ CROP TIGHT. A ship photographed inside 600px of empty space is judged on a
   thumbnail. The hull sits at viewport centre, so frame it there. */
async function shot(name, setup, arg) {
  await page.evaluate(setup, arg);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/${name}.png`,
    clip: { x: 452, y: 262, width: 376, height: 376 } });
  console.log(`   → ${OUT}/${name}.png`);
}

/* ⛔ THE HULL SHOTS OVERRODE `underlay = false` WHILE THE FILE SHIPPED `true`.
   Nine photographs of a configuration Mac never loads. The shots now change ONE
   thing — which hull is equipped — and this asserts the rest is what ships. */
ck('shooting the SHIPPED defaults, not a private configuration',
  !!live.defaults && live.defaults.enabled === true && live.defaults.underlay === true
    && live.defaults.chassis === true,
  JSON.stringify(live.defaults));

// The roster, wearing art, at the shipped defaults.
const HULLS = ['interceptor', 'frigate', 'superBattleFrigate', 'destroyer',
               'heavyCruiser', 'battlecruiser', 'dreadnought', 'flagship', 'leviathan'];
for (let i = 0; i < HULLS.length; i++) {
  await shot(`hull-${String(i + 1).padStart(2, '0')}-${HULLS[i]}`, ({ k, d }) => {
    sprites.enabled = d.enabled; sprites.underlay = d.underlay;
    sprites.chassis = d.chassis; sprites.gain = d.gain;
    fleet.equip(k); engine.mouse.down = false;
  }, { k: HULLS[i], d: live.defaults });
}
// The three-way comparison Mac needs to rule on the look.
await shot('cmp-1-procedural', () => {
  fleet.equip('dreadnought'); sprites.enabled = false;
});
await shot('cmp-2-sprites', () => { sprites.enabled = true; sprites.underlay = false; });
await shot('cmp-3-sprites-underlay', () => { sprites.underlay = true; });

/* ⭐ DIAGNOSTIC, NOT A LOOK. On a dense hull the spars are covered by the parts
   they carry — correct, and unphotographable. Shrink the sprites and the
   structure becomes visible, so a person can check it is derived from the real
   nodes and not invented geometry. */
await shot('diag-chassis-exposed', () => {
  fleet.equip('heavyCruiser');
  sprites.enabled = true; sprites.underlay = false; sprites.chassis = true;
  sprites.gain = 0.45;
});

// ---- §6 nothing broke ---------------------------------------------------
console.log('\n§6 NO RUNTIME ERRORS');
ck('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

await browser.close();
console.log(`\n${fail === 0 ? '🟢' : '🔴'}  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
