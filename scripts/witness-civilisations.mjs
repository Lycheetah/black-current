/* Witness for js/civilisations.js: every civilisation gets its own calm home, picking one starts you there
   at an anchorage, the hull leans to its fleet, and Continue after a reload wakes you at the same home. */
import { firefox } from 'playwright';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8811/black-current/';
const out = process.argv.slice(2).find(a => a.includes('/'));   // a browser name is not a folder let pass = 0, fail = 0; const errors = [];
const check = (name, ok, info) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || info === undefined ? '' : ' ' + JSON.stringify(info)}`); };
const browser = await firefox.launch();
const ready = p => p.waitForFunction(() => window.civilisations && window.engine && engine.player, null, { timeout: 30000 });
for (const [w, h] of [[1366, 900], [390, 844]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await ready(page);
  const homes = await page.evaluate(() => { const H = civilisations.homes(); return { n: civilisations.list().length, ids: Object.values(H), calm: Object.values(H).every(id => { const s = galaxy.data.byId[id]; return s && !s.home && !s.rule && s.danger <= 3; }) }; });
  check(`${w}px 15 civilisations listed`, homes.n === 15, homes.n);
  check(`${w}px every civilisation has its own calm home`, homes.ids.length === 15 && new Set(homes.ids).size === 15 && homes.calm, homes);
  await page.evaluate(() => document.getElementById('btn-menu-new')?.click()); await page.waitForTimeout(200);
  const tiles = await page.evaluate(() => { const b = [...document.querySelectorAll('#title-civs .choice-tile')]; return { n: b.length, small: b.filter(x => { const r = x.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length, overflow: document.documentElement.scrollWidth > innerWidth }; });
  check(`${w}px 16 banner tiles, touch-sized, no sideways scroll`, tiles.n === 16 && !tiles.small && !tiles.overflow, tiles);
  if (w === 390) { if (out) await page.screenshot({ path: `${out}/civs-phone.png`, fullPage: true }); await page.close(); continue; }
  const seen = new Set();
  const fresh = async () => { const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept()); await p.goto(URL); await ready(p); return p; };
  const startAt = async (p, civ, viaNewCampaign) => {
    await p.evaluate(c => { document.getElementById('btn-menu-new')?.click(); document.querySelector(`#title-civs [data-civ="${c}"]`).click(); document.getElementById('title-callsign').value = 'CIVTEST'; }, civ);
    if (viaNewCampaign) { await Promise.all([p.waitForEvent('load', { timeout: 20000 }).catch(() => null), p.evaluate(() => garage.launch(false))]); await ready(p); await p.waitForTimeout(800); }
    else await p.evaluate(() => garage.launch(false));
    return p.evaluate(() => { garage.closeMission?.(); const ch = worldMap.getCurrentChamber(); return { civ: saveState.doc.civ, home: saveState.doc.civHome, at: galaxy.currentId, haven: !!ch.isHaven, hull: saveState.profile.hullStyle, want: civilisations.HULL[saveState.doc.civ], hub: galaxy.data.hubs.includes(galaxy.currentId) }; });
  };
  let p = null;
  for (const [civ, viaNew] of [['savanah', false], ['chaos', false], ['techno-angels', true]]) {
    if (!viaNew) { await p?.close(); p = await fresh(); }
    const r = await startAt(p, civ, viaNew);
    check(`${civ} starts at its own home anchorage${viaNew ? ' (new campaign over an old save)' : ''}`, r.civ === civ && r.home && r.at === r.home && r.haven && r.hub && !seen.has(r.at), r);
    check(`${civ} starter hull leans to its fleet`, r.hull === r.want, r);
    seen.add(r.at);
    if (civ === 'chaos' && out) await p.screenshot({ path: `${out}/civs-start.png` });
    await p.reload(); await ready(p);
    const c = await p.evaluate(() => { garage.launch(true); garage.closeMission?.(); return { at: galaxy.currentId, home: saveState.doc.civHome, civ: saveState.doc.civ }; });
    check(`${civ} Continue after reload wakes at the same home`, c.civ === civ && c.at === r.home, c);
  }
  await p.close();
  await page.evaluate(() => document.getElementById('btn-menu-new')?.click());
  if (out) await page.screenshot({ path: `${out}/civs-title.png`, fullPage: true });
  const u = await page.evaluate(() => { document.querySelector('#title-civs [data-civ=""]').click(); document.getElementById('title-callsign').value = 'CLASSIC'; garage.launch(false); return { at: galaxy.currentId, civ: saveState.doc.civ }; });
  check('Unaligned keeps the classic Asterion start', u.at === 'home' && !u.civ, u);
  await page.close();
}
check('no application exceptions', !errors.length, errors);
console.log(`RESULT ${pass} passed / ${fail} failed`);
await browser.close(); process.exit(fail ? 1 : 0);
