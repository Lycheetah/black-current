/* F3b witness: the galaxy. Generation, jumps both ways, save/continue across
 * systems, hub respawn, wreck-per-system, the four weird rules, the chart.
 * node scripts/witness-galaxy.mjs [chromium|firefox]   (PW_EXECUTABLE overrides the binary)
 * Screenshots: shots/galaxy/<browser>/ */
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browserName = process.argv[2] || 'chromium';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const out = `shots/galaxy/${browserName}`; mkdirSync(out, { recursive: true });
const b = await ({ chromium, firefox })[browserName].launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
let pass = 0, fail = 0; const report = {};
const check = (name, ok, v) => { report[name] = { ok, v }; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + JSON.stringify(v)}`); ok ? pass++ : fail++; };

await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => window.galaxy && galaxy.data && window.menu);
await page.evaluate(() => { document.getElementById('title-callsign').value = 'JUMPER'; garage.launch(false); garage.closeMission(); });

/* helpers living in the page */
await page.evaluate(() => {
  window.__step = (n) => { for (let i = 0; i < n; i++) { engine.paused = false; engine.mapOpen = false; engine.update(1000 / 60); } };
  window.__flyInto = (p) => {
    worldMap.currentGridX = p.gx; worldMap.currentGridY = p.gy; engine.enterChamber({ silent: true });
    galaxy.armed = true; engine.player.x = p.x; engine.player.y = p.y; engine.player.vx = engine.player.vy = 0;
    __step(1);
  };
});

const gen = await page.evaluate(() => {
  const D = galaxy.data, again = galaxy.generate(D.seed);
  const reach = D.systems.every(s => Number.isFinite(s.hops));
  const rules = new Set(D.systems.map(s => s.rule).filter(Boolean));
  return { n: D.systems.length, same: JSON.stringify(D.systems.map(s => [s.name, s.links])) === JSON.stringify(again.systems.map(s => [s.name, s.links])),
    reach, homeLinks: D.byId.home.links.length, hubs: D.hubs.length, rules: [...rules], sizes: [...new Set(D.systems.map(s => s.size))].sort(),
    regions: [...new Set(D.systems.map(s => s.region))].length, maxDanger: Math.max(...D.systems.map(s => s.danger)) };
});
check('galaxy holds 60–120 systems', gen.n >= 60 && gen.n <= 120, gen);
check('same seed → same galaxy (the world code holds)', gen.same, gen);
check('every system is reachable from home', gen.reach && gen.homeLinks >= 1, gen);
check('8 hubs, 5 regions, 3 system sizes, all 4 weird rules present', gen.hubs === 8 && gen.regions === 5 && gen.sizes.length === 3 && gen.rules.length === 4, gen);

const j1 = await page.evaluate(() => {
  const p = galaxy.data.byId.home.portals[0];
  const marks = sectorField.landmarks((worldMap.currentGridX = p.gx, worldMap.currentGridY = p.gy, engine.enterChamber({ silent: true }), worldMap.getCurrentChamber()));
  const portalMark = marks.some(m => m.kind === 'jump' && m.to === p.to);
  __flyInto(p);
  const ch = worldMap.getCurrentChamber(), sys = galaxy.current;
  const r = { to: p.to, now: galaxy.currentId, size: worldMap.size, sysSize: sys.size, key: ch.key, title: document.getElementById('hud-chamber-title').textContent,
    card: document.getElementById('system-card').classList.contains('on'), strip: document.getElementById('system-strip').classList.contains('on'), portalMark };
  __step(150);
  r.stayed = galaxy.currentId === p.to;
  return r;
});
await page.screenshot({ path: `${out}/arrival.png` });
check('a home portal is a landmark you can see (with bearing)', j1.portalMark, j1);
check('flying into a portal jumps to the linked system', j1.now === j1.to && j1.size === j1.sysSize + 6 && j1.key.startsWith(j1.to + ':'), j1);
check('arrival shows the system card, strip and title', j1.card && j1.strip && j1.title.includes(await page.evaluate(id => galaxy.data.byId[id].name, j1.to)), j1);
check('arrival does not bounce you straight back out', j1.stayed, j1);

const j2 = await page.evaluate(() => {
  const back = galaxy.current.portals.find(p => p.to === 'home');
  __flyInto(back);
  return { now: galaxy.currentId, size: worldMap.size, sys: worldMap.system };
});
check('the return portal jumps you home (expanded 19×19)', j2.now === 'home' && j2.size === 9 && j2.sys === null, j2);

/* walk three jumps out, save, reload, Continue */
const far = await page.evaluate(() => {
  for (let k = 0; k < 3; k++) {
    const sys = galaxy.current, p = sys.portals.find(q => !galaxy.doc().visited.includes(q.to)) || sys.portals[0];
    __flyInto(p); __step(5);
  }
  engine.paused = true; // Hold the measured spot until navigation; currents otherwise keep moving it.
  menu.saveWhere(true);
  return { id: galaxy.currentId, gx: worldMap.currentGridX, gy: worldMap.currentGridY, x: Math.round(engine.player.x), visited: galaxy.doc().visited.length };
});
await page.reload(); await page.waitForFunction(() => window.galaxy && galaxy.data && window.menu);
// Freeze only after the real Continue handler restores the ship. The old 300ms
// flight delay measured currents/inertia rather than the saved arrival position.
await page.evaluate(()=>document.getElementById('btn-title-continue').addEventListener('click',()=>{engine.paused=true;},{once:true}));
await page.click('#btn-title-continue'); await page.waitForTimeout(300);
const cont = await page.evaluate(() => ({ id: galaxy.currentId, gx: worldMap.currentGridX, gy: worldMap.currentGridY, x: Math.round(engine.player.x), visited: galaxy.doc().visited.length, size: worldMap.size, sysSize: galaxy.current.size }));
const sameSpot=c=>c.id===far.id&&c.gx===far.gx&&c.gy===far.gy&&Math.abs(c.x-far.x)<3&&c.size===c.sysSize+6;
check('Continue lands in the same far system, sector and spot', sameSpot(cont), { far, cont });
check('save-position assertion rejects a planted 100px restore error',!sameSpot({...cont,x:far.x+100}));
check('visited systems survive a reload', cont.visited === far.visited && cont.visited >= 3, { far, cont });

await page.evaluate(() => { window.__step = (n) => { for (let i = 0; i < n; i++) { engine.paused = false; engine.mapOpen = false; engine.update(1000 / 60); } }; });
const death = await page.evaluate(() => {
  engine.paused = false; // Resume after the isolated Continue-position measurement.
  progression.totalMass = 500;
  const from = galaxy.currentId, hub = galaxy.nearestHub(from);
  engine.player.iFrames = 0; engine.playerTakeDamage(99999);
  const w = saveState.doc.wreck ? { ...saveState.doc.wreck } : null;
  __step(200);
  return { from, hub, now: galaxy.currentId, wreckSys: w && w.sys, haven: worldMap.getCurrentChamber().isHaven, here: window.wreck ? wreck.here(saveState.doc.wreck) : null };
});
check('death leaves the wreck in the system you died in', death.wreckSys === death.from, death);
check('you wake at the nearest hub, in its calm centre', death.now === death.hub && death.haven, death);
check('a wreck in another system is not recoverable from here', death.from === death.hub || death.here === false, death);

const rules = await page.evaluate(() => {
  const r = {};
  const visit = (rule) => {
    const s = galaxy.data.systems.find(x => x.rule === rule);
    galaxy.enterSystemById(s.id);
    worldMap.currentGridX = s.size; worldMap.currentGridY = 0;
    engine.enterChamber({ silent: true });
    engine.enemies.length = Math.min(engine.enemies.length, 9999);
    engine.player.x = 0; engine.player.y = 0; engine.player.vx = engine.player.vy = 0; engine.player.iFrames = 9999;
    return s;
  };
  let s = visit('riptide');
  engine.readInput = () => (engine.input = { ax: 0, ay: 0, aimX: 9e3, aimY: 0, fire: false, ability: false });
  engine.enemies.length = 0;
  __step(120);
  const along = engine.player.x * Math.cos(s.drift) + engine.player.y * Math.sin(s.drift);
  r.riptide = Math.round(along);
  s = visit('foundry'); engine.enemies.length = 0;
  const drops0 = progression.bubbleDrops.filter(d => d.part).length, hold0 = saveState.partCount();
  __step(520);
  r.foundryParts = progression.bubbleDrops.filter(d => d.part).length - drops0 + (saveState.partCount() - hold0);   // the magnet banks some
  s = visit('swarm');
  r.swarmMotes = engine.enemies.filter(e => e.archetype === 'mote').length;
  r.swarmDanger = worldMap.getCurrentChamber().dangerLevel;
  s = visit('blacksun');
  engine.render ? engine.render() : null;
  fluidShader._fogKey = null;
  engine.lightingCtx && fluidShader.drawLightingShader(engine.lightingCtx, 400, 300, 200, 0.5);
  const px = engine.lightingCtx.getImageData(5, 5, 1, 1).data[3];
  r.darkAlpha = px;
  galaxy.enterSystemById('home'); worldMap.currentGridX = 1; worldMap.currentGridY = 0; engine.enterChamber({ silent: true });
  fluidShader._fogKey = null;
  fluidShader.drawLightingShader(engine.lightingCtx, 400, 300, 200, 0.5);
  r.homeAlpha = engine.lightingCtx.getImageData(5, 5, 1, 1).data[3];
  return r;
});
check('RIPTIDE drags an idle ship downstream (~3 px/frame)', rules.riptide > 250, rules);
check('FOUNDRY STORM rains parts', rules.foundryParts >= 2, rules);
check('SWARM fills a sector with extra motes', rules.swarmMotes >= 6 + rules.swarmDanger, rules);
check('BLACK SUN darkens the screen edge; home does not', rules.darkAlpha > 220 && rules.homeAlpha < rules.darkAlpha, rules);

const rift = await page.evaluate(() => {
  const s = galaxy.data.systems.find(x => x.size === 3 && !x.home);
  galaxy.enterSystemById(s.id);
  const ch = worldMap.chambers['0,0'];
  return sectorField.landmarks(ch).some(m => /RIFT|GRAVE/i.test((m.def && m.def.label) || ''));
});
check('the Grave Choir rift stays at home only', rift === false, rift);

await page.evaluate(() => { galaxy.enterSystemById('home'); worldMap.currentGridX = 0; worldMap.currentGridY = 0; engine.enterChamber({ silent: true }); engine.paused = false; });
// an evolution earned earlier offers a vow (vows.js) on the next live frame; answer it like a player
await page.waitForTimeout(150);
if (await page.locator('#vow-panel').isVisible()) await page.click('#vow-later');
await page.keyboard.press('KeyM'); await page.waitForTimeout(200);
await page.click('#chart-tab-galaxy'); await page.waitForTimeout(250);
const chart = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('galaxy-wrap')).display !== 'none', info: document.getElementById('galaxy-info').textContent, visited: document.getElementById('galaxy-visited').textContent }));
await page.screenshot({ path: `${out}/galaxy-chart.png` });
check('the galaxy chart opens from the map with info + visited count', chart.shown && chart.info.length > 10 && /systems visited/.test(chart.visited), chart);
await page.click('#chart-tab-system'); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/system-chart.png` });
check('no page errors', errors.length === 0, errors);
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(`RESULT ${pass} passed / ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
