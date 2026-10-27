/* F4 witness: metal, docking, market, building, beacons, raids.
 * node scripts/witness-hubs.mjs [chromium|firefox] */
import { mkdirSync } from 'node:fs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browserName = process.argv[2] || 'chromium';
const out = `shots/hubs/${browserName}`; mkdirSync(out, { recursive: true });
const b = await ({ chromium, firefox })[browserName].launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
let pass = 0, fail = 0;
const check = (n, ok, v) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ': ' + JSON.stringify(v)}`); ok ? pass++ : fail++; };
await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8811/'); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => window.hubs && window.galaxy && galaxy.data && window.menu);
await page.waitForFunction(()=>window.starterJourney?.ready&&window.stationGrid?.ready);
await page.evaluate(() => { document.getElementById('btn-menu-new').click();civilisations.choose(null);document.getElementById('title-callsign').value='BUILDER';document.getElementById('btn-title-quick').click(); garage.closeMission();
  window.__step = n => { for (let i = 0; i < n; i++) { engine.paused = false; engine.mapOpen = false; engine.update(1000 / 60); } }; });
const r1 = await page.evaluate(() => {
  const e = new EnemyOrganism(engine.player.x + 300, engine.player.y, { tier: 3, archetype: 'stalker' }); engine.enemies.push(e);
  const m0 = hubs.metal; engine.killEnemy(engine.enemies.indexOf(e));
  engine.player.x = 40; engine.player.y = 0; __step(2);
  return { metal: hubs.metal - m0, prompt: document.getElementById('dock-prompt').classList.contains('on') };
});
// 2.2.0 economy: kill metal is tier x1 (x3 elite), halved from the old x2
check('kills pay metal (tier-scaled)', r1.metal === 3, r1);
check('the dock prompt shows at the home anchorage', r1.prompt, r1);
await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/dock.png` });
const r2 = await page.evaluate(() => {
  const open = document.getElementById('dock-panel').style.display === 'flex' && engine.paused;
  hubs.metal = 1000;
  hubs.openDock && null;
  document.getElementById('dock-undock').click();
  return { open, closed: document.getElementById('dock-panel').style.display === 'none' && !engine.paused };
});
check('E docks (pauses, panel up) and Undock resumes', r2.open && r2.closed, r2);
const r3 = await page.evaluate(() => {
  engine.player.x=40;engine.player.y=0;hubs.openDock();
  const m0=hubs.metal,design=JSON.stringify(saveState.doc.design);bay.show();
  document.querySelector('#modular-slots [data-select-section="gun"]').click();
  hangarUI.browseItem('gun-bolt-point');document.querySelector('#hangar-picker [data-hangar-item="gun-bolt-point"]').click();
  const free=hubs.metal===m0&&JSON.stringify(saveState.doc.design)===design&&modularShips.quote(shipyard.design).total===6;
  document.getElementById('modular-apply').click();
  const bought=m0-hubs.metal,owned=modularShips.hangar().owned['gear:gun-bolt-point:1'],mounted=saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-bolt-point');
  modularYard.close();hubs.closeDock();return{free,bought,owned,mounted};
});
check('previewing ordinary hardware preserves the flying ship and wallet',r3.free,r3);
check('buying ordinary hardware charges once and delivers one mounted copy',r3.bought===6&&r3.owned===1&&r3.mounted,r3);
const r4 = await page.evaluate(() => {
  const why = hubs.canBuild('gun');   // home centre is a haven
  worldMap.currentGridX = 1; worldMap.currentGridY = 0; engine.enterChamber({ silent: true });
  engine.enemies.length = 0; engine.player.x = 600; engine.player.y = 600;
  for (let i = 0; i < 6; i++) saveState.addPart({ type: 'pod', radius: 18 });
  hubs.metal = 2000;
  const okGun = hubs.build('gun');
  engine.player.x = -900; engine.player.y = 300;
  const okDrill = hubs.build('drill');
  const near = hubs.canBuild('dock');
  const e = new EnemyOrganism(1200, 600, { tier: 1, archetype: 'mote' }); e._aggro = true; engine.enemies.push(e);
  __step(200);
  const gunKilledOrHit = !engine.enemies.includes(e) || e.hp < e.maxHp;
  const m0 = hubs.metal; __step(hubs.CFG.drillEvery + 2);
  return { why, okGun, okDrill, n: hubs.list().length, near, gunKilledOrHit, drill: hubs.metal - m0 };
});
check('no building inside a hub (haven)', /hub/i.test(r4.why || ''), r4);
check('build a gun platform and a drill in open water', r4.okGun && r4.okDrill && r4.n === 2, r4);
check('the gun platform shoots hostiles', r4.gunKilledOrHit, r4);
check('the drill pays metal while you are in its system', r4.drill > 0, r4);
await page.screenshot({ path: `${out}/structures.png` });
const r5 = await page.evaluate(() => {
  hubs.raidT = 1; __step(3);
  const raid = hubs.raid ? hubs.raid.length : 0;
  const target = hubs.raid && hubs.raid[0].raidTarget;
  return { raid, targeted: !!target };
});
check('raids come for your structures while you are there', r5.raid >= 3 && r5.targeted, r5);
const r6 = await page.evaluate(() => {
  engine.enemies.length = 0; hubs.raid = null;
  const p = galaxy.data.byId.home.portals[0];
  worldMap.currentGridX = p.gx; worldMap.currentGridY = p.gy; engine.enterChamber({ silent: true });
  galaxy.armed = true; engine.player.x = p.x; engine.player.y = p.y; __step(1);
  const sys = galaxy.currentId; worldMap.currentGridX = galaxy.current.size; worldMap.currentGridY = 0; engine.enterChamber({ silent: true });
  engine.enemies.length = 0; engine.player.x = 300; engine.player.y = -700;
  hubs.metal = 2000; const ok = hubs.build('beacon');
  const toHome = galaxy.portalsOf(galaxy.current).find(q => q.beacon && q.to === 'home');
  galaxy.armed = true; engine.player.x = toHome.x; engine.player.y = toHome.y; __step(1);
  const home = galaxy.currentId === 'home';
  const back = galaxy.portalsOf(galaxy.data.byId.home).find(q => q.beacon && q.to === sys);
  return { ok, home, back: !!back };
});
check('a jump beacon links its system and home, both ways', r6.ok && r6.home && r6.back, r6);
await page.reload(); await page.waitForFunction(() => window.hubs && window.galaxy && galaxy.data);
const r7 = await page.evaluate(() => ({ n: hubs.list().filter(s => !s.public).length, publicDocks: hubs.list().filter(s=>s.public).length, metal: hubs.metal }));
check('structures and metal survive a reload', r7.n === 3 && r7.metal > 0, r7);
await page.evaluate(() => { document.getElementById('btn-title-continue').click(); });
await page.keyboard.press('KeyX'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/build.png` });
const r8 = await page.evaluate(() => ({ open: document.getElementById('build-panel').style.display === 'flex', cards: document.querySelectorAll('.build-card').length }));
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
const r9 = await page.evaluate(() => ({ closed: document.getElementById('build-panel').style.display === 'none', paused: menu.isPaused() }));
check('X opens the build menu with 4 structures; Esc closes it (no pause menu)', r8.open && r8.cards === 4 && r9.closed && !r9.paused, { r8, r9 });
check('no page errors', errors.length === 0, errors);
console.log(`RESULT ${pass} passed / ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
