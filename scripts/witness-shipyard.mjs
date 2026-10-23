/* WITNESS — THE SHIPYARD IS A REAL CUSTOMIZER
 *
 * ⛔ `shipyard.open === true` PROVES A CSS CLASS FLIPPED. It says nothing about
 *    whether a ship was drawn. So this instruments the live 2D context, counts
 *    what the GAME'S renderer actually painted into the editor canvas, and then
 *    SHOOTS THE SCREEN so a person can judge it — because a green gate is not a
 *    green browser, and neither is Mac's verdict.
 *
 * ⭐ THE CLAIM UNDER TEST: the editor draws with `fluidShader.drawOrganismMembrane`,
 *    the identical call engine.js makes. If that were a lie the canvas would
 *    still have circles on it (the handles), so counting strokes is not enough —
 *    this asserts the RENDERER ITSELF was entered, by spying on it.
 *
 *   node scripts/witness-shipyard.mjs
 */
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));

const URL = process.env.GAME_URL || 'http://localhost:8811/';
const OUT = 'shots/shipyard';
mkdirSync(OUT, { recursive: true });

const errors = [];
let pass = 0, fail = 0;
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${n}${d ? `   [${d}]` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

/* ---- 0. ⭐ ONE STARTER CHASSIS, NOT THREE -----------------------------
   This is the split-roster guard. `engine.js`, `designer.js` and `shipyard.js`
   all begin from the starting hull; they used to hold separate hand copies of
   it. Comparing the ACTUAL node graphs is the only check that catches a drift —
   grepping for the constant's name would prove a name, not a mechanism. */
const starter = await page.evaluate(() => {
  const s = fleet.starterChassis().nodes;
  const key = ns => ns.map(n => `${n.dx},${n.dy},${n.radius},${n.type}`).join('|');
  return {
    slots: s.filter(n => n.type !== 'core').length,
    coreR: (s.find(n => n.type === 'core') || {}).radius,
    ref: key(s),
    /* ⚠ A SpringNode HAS NO `dx`. It stores the authored home position as
       `targetDx/targetDy` (shaders.js:8) and springs `currentDx/currentDy`
       toward it. The first cut of this check read `n.dx`, got undefined for
       every node, and failed a comparison the code was actually passing —
       a false alarm costs the witness its authority, so it is named here. */
    engine: key(engine.player.nodes.map(n => ({ dx: n.targetDx, dy: n.targetDy, radius: n.radius, type: n.type }))),
    preset: key(PRESET_DESIGNS.balanced.nodes),
    yard: key(window.shipyard ? (() => { shipyard.build(); const d = shipyard.design; return d.nodes; })() : [])
  };
});
ck('starter chassis has exactly 3 slots', starter.slots === 3, `slots=${starter.slots}`);
ck('starter core is small (<= 18)', starter.coreR <= 18, `core r${starter.coreR}`);
ck('engine.js starts from the ONE starter', starter.engine === starter.ref, starter.engine);
ck('designer PRESET_DESIGNS.balanced is the SAME hull', starter.preset === starter.ref, starter.preset);

/* ---- 1. THE PACKS ARE GONE ------------------------------------------- */
const packsGone = await page.evaluate(() => typeof window.packRenderer === 'undefined');
ck('visual packs unloaded (packRenderer undefined)', packsGone);

/* ---- 2. SPY ON THE REAL RENDERER -------------------------------------
   ⭐ Wrapping the function ITSELF is the only way to prove the editor uses it.
   A pixel count would pass on the handles alone. */
await page.evaluate(() => {
  window.__sy = { membrane: 0, drawImage: 0, arcs: 0 };
  /* ⛔ `window.fluidShader` IS UNDEFINED. It is a top-level `const` in a classic
     script, so it lives in the global LEXICAL environment, not on `window`. The
     first cut of this spy wrapped `window.fluidShader`, found nothing, and
     therefore reported `membrane calls = 0` — which was true, but for the
     spy's reason as well as the tool's. Reach it by bare identifier. */
  const fs = (typeof fluidShader !== 'undefined') ? fluidShader : null;
  if (fs && fs.drawOrganismMembrane) {
    const orig = fs.drawOrganismMembrane.bind(fs);
    fs.drawOrganismMembrane = function (...a) { window.__sy.membrane++; return orig(...a); };
  } else {
    window.__sy.noShader = true;
  }
  const proto = CanvasRenderingContext2D.prototype;
  const di = proto.drawImage, ar = proto.arc;
  proto.drawImage = function (...a) { window.__sy.drawImage++; return di.apply(this, a); };
  proto.arc = function (...a) { window.__sy.arcs++; return ar.apply(this, a); };
});

/* ---- 3. OPEN IT AND SEED A REAL SHIP ---------------------------------- */
const opened = await page.evaluate(() => {
  if (!window.shipyard) return 'no shipyard global';
  shipyard.show();
  // a capital with a spread of mount bands, so the ladder is visible on screen
  shipyard.design.nodes = [
    { dx: 0, dy: 0, radius: 46, type: 'core' },
    { dx: 84, dy: 0, radius: 33, type: 'cannon' },
    { dx: 40, dy: -52, radius: 18, type: 'cannon' },
    { dx: 40, dy: 52, radius: 18, type: 'cannon' },
    { dx: -20, dy: -74, radius: 12, type: 'cannon' },
    { dx: -20, dy: 74, radius: 12, type: 'cannon' },
    { dx: -62, dy: -34, radius: 18, type: 'pod' },
    { dx: -62, dy: 34, radius: 18, type: 'pod' },
    { dx: -92, dy: 0, radius: 15, type: 'thruster' },
    { dx: 10, dy: -30, radius: 15, type: 'shield' },
    { dx: 10, dy: 30, radius: 15, type: 'shield' }
  ];
  shipyard.design.id = 'witness_capital';
  shipyard.design.frame = 'Citadel';
  shipyard.sel = 1;
  shipyard.paint();
  return true;
});
ck('shipyard global exists and opened', opened === true, String(opened));

const vis = await page.evaluate(() =>
  !!document.querySelector('#shipyard.on') &&
  document.querySelector('#shipyard').getBoundingClientRect().width > 400);
ck('overlay is visible and laid out', vis);

/* ---- 4. DID THE GAME'S RENDERER RUN? ---------------------------------- */
const spy = await page.evaluate(() => window.__sy);
ck('game renderer entered from the editor', spy.membrane > 0, `membrane calls=${spy.membrane}`);
ck('canvas actually painted', spy.arcs > 20, `arc calls=${spy.arcs}`);

/* ---- 5. THE LADDER IS READABLE ---------------------------------------- */
const stats = await page.evaluate(() => {
  const s = document.querySelector('#sy-stats');
  return s ? s.textContent.replace(/\s+/g, ' ').trim() : '';
});
ck('stat block reports a hull band', /FRIGATE|CRUISER|BATTLESHIP|TITAN/.test(stats), stats);

/* ---- 6. ⭐ THE LAW: EXPORT IS THE FILE FORMAT -------------------------
   Round-trip it. Export, re-import, and compare the node graph. If these ever
   disagree, a second ship format exists and the roster is split. */
const roundTrip = await page.evaluate(() => {
  const before = JSON.stringify(shipyard.design.nodes);
  const txt = shipyard.exportText();
  shipyard.design = { id: '', frame: '', mark: 'I', scale: 1, color: '#00f3ff',
                      primaryWeapon: 'spitter', secAbility: 'shield',
                      nodes: [{ dx: 0, dy: 0, radius: 22, type: 'core' }] };
  shipyard.doImport(txt);
  const after = JSON.stringify(shipyard.design.nodes);
  return { same: before === after, keys: Object.keys(shipyard.design).sort().join(','), txt: txt.slice(0, 60) };
});
ck('EXPORT → IMPORT round-trips the node graph', roundTrip.same, roundTrip.txt);
ck('exported hull carries the full FLEET_HULLS shape',
  ['color', 'frame', 'id', 'mark', 'nodes', 'primaryWeapon', 'scale', 'secAbility']
    .every(k => roundTrip.keys.includes(k)), roundTrip.keys);

/* ---- 7. ⭐ THE ROSTER SEAM — the only door back in -------------------- */
const roster = await page.evaluate(() => {
  shipyard.design.id = 'witness_capital';
  shipyard.saveToRoster();
  return {
    inHulls: !!window.FLEET_HULLS.witness_capital,
    inOrder: window.fleet.order.indexOf('witness_capital') >= 0,
    cycles: (() => { try { fleet.cycle(1); return true; } catch (e) { return String(e); } })()
  };
});
ck('SAVE puts the hull in FLEET_HULLS', roster.inHulls);
ck('…and into fleet.order, so f/F reach it', roster.inOrder);
ck('fleet.cycle() no longer throws on it', roster.cycles === true, String(roster.cycles));

/* ---- 9. ⭐⭐ ONE TOOL — MAC, 2026-08-17 --------------------------------
   *"we only need one tool bro to do it properly."*
   Two things must both be true for that ruling to be kept, and neither is
   provable by grepping for a name:
     (a) every legacy entry point (Tab, the DESIGNER button, the touch button)
         must land in THE SHIPYARD, and
     (b) the retired designer must not be able to open at all.
   So this drives the actual redirect and reads the actual DOM. */
const oneTool = await page.evaluate(() => {
  shipyard.hide();
  const before = document.querySelector('#shipyard').classList.contains('on');
  organismDesigner.openDesigner();                    // what Tab calls
  const after = document.querySelector('#shipyard').classList.contains('on');
  const ov = document.getElementById('designer-overlay');
  const btn = document.getElementById('btn-open-designer');
  return {
    before, after,
    overlayHidden: !ov || getComputedStyle(ov).display === 'none',
    overlayRetired: !!(ov && ov.getAttribute('data-retired')),
    btnLabel: btn ? btn.textContent.trim() : '(no button)',
    /* ⛔ THE CLASS MUST BE GONE, NOT SHADOWED. If `OrganismDesigner` still
       exists something could construct a second editor tomorrow. */
    classGone: typeof OrganismDesigner === 'undefined',
    /* ⭐ ...while the DATA it declared must still be there, because shipyard.js
       READS these rather than copying them. */
    dataKept: (typeof PRESET_DESIGNS !== 'undefined') &&
              (typeof SECONDARY_ACTIVES_CATALOG !== 'undefined') &&
              (typeof ORGANELLE_COSTS !== 'undefined')
  };
});
ck('Tab / DESIGNER button open THE SHIPYARD', !oneTool.before && oneTool.after);
ck('the retired designer overlay cannot show', oneTool.overlayHidden && oneTool.overlayRetired);
ck('the second editor class is gone', oneTool.classGone);
ck('…but its data tables are still readable', oneTool.dataKept);
ck('the button says which tool it opens', /SHIPYARD/.test(oneTool.btnLabel), oneTool.btnLabel);

/* ---- 10. THE ECONOMY SURVIVED THE MERGE -------------------------------
   ⛔ THIS IS THE FEATURE MOST LIKELY TO BE LOST SILENTLY. The designer owned
   the GP budget and the socket cap; if they vanished, every ship would still
   draw, export and fly, and nothing would look broken. So: assert the numbers
   come from `progression`, and assert the GATE ACTUALLY REFUSES. */
const econ = await page.evaluate(() => {
  const b = shipyard.budget();
  const evo = progression.getEvolutionData();
  // an 11-node capital against a fresh save is over on both counts
  const gated = (() => {
    const wasOpen = shipyard.open;
    shipyard.testFlight();
    return { stillOpen: shipyard.open === wasOpen,
             toast: document.querySelector('#sy-toast').textContent };
  })();
  const statTxt = document.querySelector('#sy-stats').textContent;
  return {
    totalGP: b.totalGP, usedGP: b.usedGP, hp: b.hp,
    maxSockets: b.maxSockets, evoMax: evo.maxSockets,
    gpFromProgression: b.totalGP === progression.getTotalGP(),
    over: b.overSockets || b.overGP,
    gated, statTxt: statTxt.replace(/\s+/g, ' ').trim()
  };
});
ck('GP budget is read from progression, not invented', econ.gpFromProgression, `${econ.usedGP}/${econ.totalGP} GP`);
ck('socket cap is the evolution tier cap', econ.maxSockets === econ.evoMax, `${econ.maxSockets}`);
ck('the stat block shows the budget', /GP/.test(econ.statTxt) && /sockets/.test(econ.statTxt), econ.statTxt);
ck('FLY REFUSES an illegal hull and says why',
  econ.over && econ.gated.stillOpen && /sockets|budget/i.test(econ.gated.toast),
  econ.gated.toast);

/* ---- 11. THE PORTED LISTS EXIST AND ARE DERIVED ----------------------- */
const lists = await page.evaluate(() => {
  const sec = [...document.querySelectorAll('#sy-sec option')].map(o => o.value);
  const secLabels = [...document.querySelectorAll('#sy-sec option')].map(o => o.textContent);
  const presets = [...document.querySelectorAll('#sy-presets .p')].map(p => p.textContent);
  // load a preset and confirm the node graph actually changed
  const before = JSON.stringify(shipyard.design.nodes);
  const btn = [...document.querySelectorAll('#sy-presets .p')].find(p => p.textContent === 'titan');
  if (btn) btn.click();
  return { sec, secLabels, presets,
           changed: JSON.stringify(shipyard.design.nodes) !== before,
           matchesTable: typeof PRESET_DESIGNS !== 'undefined' &&
             JSON.stringify(shipyard.design.nodes) === JSON.stringify(PRESET_DESIGNS.titan.nodes) };
});
ck('secondary abilities are a named list, not a text box',
  lists.sec.length >= 5 && lists.secLabels.some(l => /Shield|EMP|Dash/i.test(l)), lists.sec.join(','));
ck('presets row carries the five starts', lists.presets.length >= 5, lists.presets.join(' '));
ck('clicking a preset loads THAT preset', lists.changed && lists.matchesTable);

/* ---- 8. SHOOT IT ------------------------------------------------------ */
await page.evaluate(() => { shipyard.show(); shipyard.sel = 1; shipyard.paint(); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/shipyard-full.png` });
const cv = await page.$('#sy-canvas');
if (cv) await cv.screenshot({ path: `${OUT}/shipyard-canvas.png` });

/* clean up the witness hull so it never pollutes Mac's real roster */
await page.evaluate(() => { try { shipyard.deleteFromRoster('witness_capital'); } catch (e) {} });

const ours = errors.filter(e => !/fonts\.gstatic|net::ERR_|favicon/.test(e));
ck('no page errors from our own code', ours.length === 0, ours.slice(0, 3).join(' | '));

console.log(`\n  ${pass} pass, ${fail} fail`);
console.log(`  shots: ${OUT}/shipyard-full.png, ${OUT}/shipyard-canvas.png`);
await browser.close();
process.exit(fail ? 1 : 0);
