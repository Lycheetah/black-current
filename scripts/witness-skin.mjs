/* F6 witness: the hull skin. One baked hull per design, rebaked when a part is
 * lost, crisp in the Shipyard, cheap to bake, and switchable back to bubbles.
 * node scripts/witness-skin.mjs [chromium|firefox] */
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browserName = process.argv[2] || 'chromium';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const out = `shots/skin/${browserName}`; mkdirSync(out, { recursive: true });
const b = await ({ chromium, firefox })[browserName].launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
let pass = 0, fail = 0; const report = {};
const check = (name, ok, v) => { report[name] = { ok, v }; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + JSON.stringify(v)}`); ok ? pass++ : fail++; };
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => window.engine && window.garage && typeof hullSkin === 'function');
await page.evaluate(() => { document.getElementById('title-callsign').value = 'SKIN'; garage.launch(false); garage.closeMission(); });
await page.waitForTimeout(400);
const r = await page.evaluate(() => {
  const o = {};
  o.on = fluidShader.hullSkinOn !== false;
  const nodes = engine.player.nodes;
  const a = hullSkin(nodes, 18, engine.player.color, 0.5), a2 = hullSkin(nodes, 18, engine.player.color, 0.5);
  o.cached = a === a2;
  const gun = nodes.find(n => n.type === 'cannon'); gun.lost = true;
  const c = hullSkin(nodes, 18, engine.player.color, 0.5); gun.lost = false;
  o.lostRebakes = c !== a && c.w * c.h <= a.w * a.h + 1;
  const big = hullSkin(nodes, 18, engine.player.color, 4.66);
  o.crisp = big.canvas.width > a.canvas.width * 3;
  const titan = [{ dx: 0, dy: 0, radius: 40, type: 'core' }];
  for (let i = 0; i < 12; i++) { titan.push({ dx: 60 + i * 30, dy: 50 + i * 6, radius: 14 + i, type: 'cannon' }); titan.push({ dx: 60 + i * 30, dy: -50 - i * 6, radius: 14 + i, type: 'cannon' }); }
  for (let w = 0; w < 2; w++) { _skinCache.clear(); hullSkin(titan, 40, '#ff3366', 0.5); }
  _skinCache.clear(); let t = performance.now(); hullSkin(titan, 40, '#ff3366', 0.5); o.titanMs = Math.round(performance.now() - t);
  _skinCache.clear(); t = performance.now(); hullSkin(nodes, 18, '#00f3ff', 0.5); o.frigateMs = Math.round((performance.now() - t) * 10) / 10;
  for (let i = 0; i < 300; i++) hullSkin([{ dx: 0, dy: 0, radius: 10 + i % 40, type: 'core' }], 10, '#00f3ff', 0.5);
  o.cacheBounded = _skinCache.size <= SKIN.cacheMax;
  let calls = 0; const real = window.hullSkin;
  window.hullSkin = (...a) => { calls++; return real(...a); };
  const cv = document.createElement('canvas').getContext('2d');
  fluidShader.hullSkinOn = false; fluidShader.drawOrganismMembrane(cv, 50, 50, 0, 18, nodes, '#00f3ff', {}); const off = calls;
  fluidShader.hullSkinOn = true; fluidShader.drawOrganismMembrane(cv, 50, 50, 0, 18, nodes, '#00f3ff', {}); const on = calls - off;
  window.hullSkin = real;
  o.switchable = off === 0 && on >= 1;
  return o;
});
check('the hull skin is on by default', r.on, r);
check('one baked hull per design (cached)', r.cached, r);
check('a lost part rebakes the hull without it', r.lostRebakes, r);
check('the Shipyard close-up bakes crisp (higher resolution)', r.crisp, r);
check('a frigate bakes in under 5 ms', r.frigateMs < 5, r);
check('a 25-gun titan bakes in under 30 ms at flight zoom', r.titanMs < 30, r);
check('the skin cache stays bounded', r.cacheBounded, r);
check('`fluidShader.hullSkinOn = false` brings the bubbles back', r.switchable, r);
await page.screenshot({ path: `${out}/flight.png` });
check('no page errors', errors.length === 0, errors);
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(`RESULT ${pass} passed / ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
