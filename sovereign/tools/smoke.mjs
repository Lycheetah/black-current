// Smoke check: boots, flies, turns, cycles a hull, and captures screenshots. Fast and headless.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'shots');
mkdirSync(shots, { recursive: true });
const url = pathToFileURL(join(root, 'dist', 'sovereign-eclipse.html')).href + '?capture';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fail = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fail.push(msg); };

async function run(viewport, tag, touch = false) {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__SE && window.__SE.world.tick > 30, null, { timeout: 60000 });
  check(errors.length === 0, `${tag}: boots without errors ${errors.join(' | ')}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, `${tag}-01-launch.png`) });
  return { page, errors };
}

{
  const { page, errors } = await run({ width: 1600, height: 900 }, 'desktop');
  const p0 = await page.evaluate(() => ({ ...window.__SE.getPlayer().pos }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD'); await page.waitForTimeout(2000); await page.keyboard.up('KeyD');
  const s = await page.evaluate(() => { const p = window.__SE.getPlayer(); return { pos: { ...p.pos }, throttle: p.throttle, speed: p.speed }; });
  check(s.throttle > 0.5, `throttle order rises with W (${s.throttle.toFixed(2)})`);
  check(Math.hypot(s.pos.x - p0.x, s.pos.z - p0.z) > 50, 'ship flies');
  await page.screenshot({ path: join(shots, 'desktop-02-flight.png') });
  // Orbit the camera around to frame the station and black sun.
  await page.mouse.move(800, 450); await page.mouse.down(); await page.mouse.move(1150, 420, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, 'desktop-03-orbit.png') });
  for (let i = 0; i < 10; i++) await page.keyboard.press('BracketRight');
  await page.waitForTimeout(1200);
  const hull = await page.evaluate(() => window.__SE.getPlayer().hull.className);
  check(hull === 'Battleship', `hull cycle reaches Battleship (${hull})`);
  await page.screenshot({ path: join(shots, 'desktop-04-battleship.png') });
  check(errors.length === 0, 'no runtime errors during flight ' + errors.join(' | '));
  await page.close();
}
{
  // Combat: jump to the breach, lock, fire the fore group, orbit, and watch damage land.
  const { page, errors } = await run({ width: 1600, height: 900 }, 'combat');
  await page.evaluate(() => {
    const w = window.__SE.world, p = window.__SE.getPlayer(), b = w.sector.landmarks.breach.pos;
    p.pos = { x: b.x + 1700, y: b.y + 60, z: b.z + 900 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
  });
  await page.waitForFunction(() => window.__SE.world.op.stage === 'wave', null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => window.__SE.getPlayer().lock.progress >= 1)) break;
    if (await page.evaluate(() => window.__SE.getPlayer().lock.targetId == null)) await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
  }
  check(await page.evaluate(() => window.__SE.getPlayer().lock.progress >= 1), 'target lock completes');
  await page.keyboard.press('Digit1');
  await page.keyboard.press('KeyO');
  let hits = 0;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(1000);
    hits += await page.evaluate(() => { const n = window.__SE.world.events.filter((e) => e.type === 'hit').length; return n; });
    if (i === 6) await page.screenshot({ path: join(shots, 'combat-01-engaged.png') });
    await page.evaluate(() => { const p = window.__SE.getPlayer(); if (!p.lock.targetId || p.lock.progress < 0) return; });
    const relock = await page.evaluate(() => window.__SE.getPlayer().lock.targetId == null);
    if (relock) { await page.keyboard.press('Tab'); }
  }
  const st = await page.evaluate(() => ({ killed: window.__SE.world.op.alive.length, stage: window.__SE.world.op.stage, wave: window.__SE.world.op.wave }));
  check(hits > 0, `shots land on targets (${hits} hit events seen)`);
  await page.evaluate(() => { const r = window.__SE.view.rig; r.yaw += 2.2; r.pitch = 0.25; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, 'combat-02-fight.png') });
  console.log('     op', JSON.stringify(st));
  check(errors.length === 0, 'no runtime errors in combat ' + errors.join(' | '));
  await page.close();
}
{
  // Shipwright: dock, fit a gun, drag a hardpoint aft, undock and see it in flight.
  const { page, errors } = await run({ width: 1600, height: 900 }, 'shipwright');
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__SE.getPlayer().docked, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, 'shipwright-01-docked.png') });
  // Let the showroom camera settle before dragging against it.
  await page.waitForFunction(() => { const r = window.__SE.view.rig; return Math.abs(r.dist - r.targetDist) < 0.5; }, null, { timeout: 10000 });
  await page.click('[data-bank="WPN_FR"]');
  await page.click('[data-turret="railgun"]');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => window.__SE.getPlayer().fit.WPN_FR !== 'railgun'), 'shipwright refuses a tier 3 railgun on a starter frigate');
  await page.click('[data-turret="flak"]');
  await page.waitForFunction(() => window.__SE.getPlayer().fit.WPN_FR === 'flak', null, { timeout: 5000 });
  check(true, 'shipwright fits flak to the fore starboard node');
  const h = await page.locator('[data-h="WPN_FR"]').boundingBox();
  const tail = await page.evaluate(() => { const v = window.__SE.view; const p = window.__SE.getPlayer(); const bp = p.blueprint;
    const m = v.views.get(p.id).mesh; const P = m.userData.profile; const THREE_V = m.position.clone();
    const local = m.localToWorld(m.userData.hardpoints[0].position.clone().set(P.width(0.8) * 0.5, P.deck(0.8), 0.3 * P.L));
    return v.project(local); });
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(tail.x, tail.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__SE.getPlayer().blueprint.nodes.find((n) => n.bank === 'WPN_FR').z > 0.16, null, { timeout: 8000 }).catch(() => {});
  const moved = await page.evaluate(() => { const p = window.__SE.getPlayer(); return { z: p.blueprint.nodes.find((n) => n.bank === 'WPN_FR').z, g: p.weapons.find((w) => w.bank === 'WPN_FR').group }; });
  check(moved.z > 0.16 && moved.g === 'aft', `dragged node moves aft and joins the aft group (z ${moved.z.toFixed(2)}, ${moved.g})`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, 'shipwright-02-refit.png') });
  await page.click('[data-sw-undock]');
  await page.waitForFunction(() => !window.__SE.getPlayer().docked, null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  const flying = await page.evaluate(() => { const p = window.__SE.getPlayer(); const m = window.__SE.view.views.get(p.id).mesh;
    return m.userData.hardpoints.find((n) => n.name === 'WPN_FR').userData.turretId; });
  check(flying === 'flak', `the flying ship carries the new flak turret (${flying})`);
  await page.evaluate(() => { const r = window.__SE.view.rig; r.yaw = 0.9; r.pitch = 0.5; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, 'shipwright-03-flying.png') });
  check(errors.length === 0, 'no runtime errors in shipwright ' + errors.join(' | '));
  await page.close();
}
{
  // Scanner Atlas: ping from spread positions, scan, tune the harmonic, resolve, get paid.
  const { page, errors } = await run({ width: 1600, height: 900 }, 'atlas');
  await page.waitForFunction(() => Object.values(window.__SE.world.atlas.sigs).some((s) => s.stage === 'detected'), null, { timeout: 10000 });
  const id = await page.evaluate(() => window.__SE.world.atlas.activeId);
  const until = (fn, arg, ms = 10000) => page.waitForFunction(fn, arg, { timeout: ms }).catch(() => {});
  for (const off of [[0, 0], [1600, 0], [0, 1600]]) {
    await page.evaluate(([dx, dz]) => { const p = window.__SE.getPlayer(); const b = window.__SE.base ??= { ...p.pos };
      p.pos = { x: b.x + dx, y: b.y, z: b.z + dz }; p.prevPos = { ...p.pos }; p.combat.cap.cur = p.combat.cap.max; window.__SE.world.atlas.pingCooldown = 0; }, off);
    const n = await page.evaluate((i) => window.__SE.world.atlas.sigs[i].pings.length, id);
    await page.keyboard.press('KeyP');
    await until(([i, k]) => window.__SE.world.atlas.sigs[i].pings.length > k, [id, n]);
    if (off[0] === 1600) await page.screenshot({ path: join(shots, 'atlas-01-triangulating.png') });
  }
  check(await page.evaluate((i) => window.__SE.world.atlas.sigs[i].stage === 'triangulated', id), 'three spread pings triangulate the signature');
  await page.evaluate((i) => { const p = window.__SE.getPlayer(), s = window.__SE.world.atlas.sigs[i];
    p.pos = { x: s.pos.x + 300, y: s.pos.y + 80, z: s.pos.z + 200 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.throttle = 0; }, id);
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'scanned', id, 60000);
  check(await page.evaluate((i) => window.__SE.world.atlas.sigs[i].stage === 'scanned', id), 'holding slow inside scan range scans it');
  const target = await page.evaluate((i) => window.__SE.world.atlas.sigs[i].tune.target, id);
  await page.$eval('[data-at-tune]', (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, target);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, 'atlas-02-tuning.png') });
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'understood', id, 30000);
  await page.click('[data-at-act="resolve"]');
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'resolved', id);
  const r = await page.evaluate(() => ({ research: window.__SE.world.research, mats: window.__SE.world.materials }));
  check(r.research > 0, `resolving pays research and materials (${r.research} research, ${JSON.stringify(r.mats)})`);
  await page.evaluate(() => { const rg = window.__SE.view.rig; rg.yaw += 2.4; rg.pitch = 0.2; rg.targetDist *= 2.5; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, 'atlas-03-resolved.png') });
  check(errors.length === 0, 'no runtime errors in the Atlas ' + errors.join(' | '));
  await page.close();
}
{
  // Real player path: no test flags. Launch screen → click LAUNCH → keys fly the ship.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('?capture', ''));
  await page.waitForSelector('[data-launch]:not([disabled])', { timeout: 60000 });
  await page.screenshot({ path: join(shots, 'launch-00-screen.png') });
  const t0 = await page.evaluate(() => window.__SE.world.tick);
  await page.waitForTimeout(500);
  check(t0 === await page.evaluate(() => window.__SE.world.tick), 'sim waits behind the launch screen');
  await page.click('[data-launch]');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
  const thr = await page.evaluate(() => window.__SE.getPlayer().throttle);
  check(thr > 0.35, `after LAUNCH, keyboard reaches the ship (throttle ${thr.toFixed(2)})`);
  check(errors.length === 0, 'launch path has no errors ' + errors.join(' | '));
  await page.close();
}
{
  // Phone path: tap LAUNCH, drag the throttle rail, tap LOCK/FIRE.
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('?capture', ''));
  await page.waitForSelector('[data-launch]:not([disabled])', { timeout: 60000 });
  await page.tap('[data-launch]');
  await page.waitForTimeout(400);
  const rail = await page.locator('[data-throttle]').boundingBox();
  await page.evaluate(({ x, y }) => {
    const el = document.querySelector('[data-throttle]');
    const t = new Touch({ identifier: 7, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
  }, { x: rail.x + rail.width / 2, y: rail.y + 4 });
  await page.waitForTimeout(600);
  const thr = await page.evaluate(() => window.__SE.getPlayer().throttle);
  check(thr > 0.9, `phone: throttle rail sets full throttle (${thr.toFixed(2)})`);
  check(await page.evaluate(() => document.body.classList.contains('touch')), 'phone: touch controls are on');
  check(errors.length === 0, 'phone launch path has no errors ' + errors.join(' | '));
  await page.close();
}
{
  const { page, errors } = await run({ width: 844, height: 390 }, 'phone', true);
  check(errors.length === 0, 'phone: no runtime errors');
  await page.close();
}
{
  // Hull Forge: loads a hull, a slider reshapes it, a node drags, and the JSON validates.
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(join(root, 'dist', 'hull-forge.html')).href + '?hull=techno_angels_battleship');
  await page.waitForFunction(() => window.__FORGE?.blueprint?.id === 'techno_angels_battleship', null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(shots, 'forge-01-loaded.png') });
  await page.$eval('input[data-path="hull.width"]', (el) => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('input[data-path="sponsons.on"]', (el) => { el.checked = true; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-add-fin]');
  await page.waitForTimeout(800);
  const bp = await page.evaluate(() => window.__FORGE.blueprint);
  check(bp.hull.width === 0.3 && bp.sponsons.on && bp.fins.length >= 1, 'forge sliders and toggles edit the blueprint');
  const valid = await page.textContent('[data-valid]');
  check(valid === 'VALID', `forge JSON validates (${valid})`);
  const json = JSON.parse(await page.inputValue('[data-json]'));
  check(json.schema === 'sovereign.hull/1' && json.nodes.length === bp.nodes.length, 'forge exports sovereign.hull/1 JSON');
  await page.screenshot({ path: join(shots, 'forge-02-edited.png') });
  check(errors.length === 0, 'no runtime errors in the Hull Forge ' + errors.join(' | '));
  await page.close();
}
await browser.close();
if (fail.length) { console.error(`${fail.length} smoke check(s) failed`); process.exit(1); }
console.log('smoke ok');
