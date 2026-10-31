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
await browser.close();
if (fail.length) { console.error(`${fail.length} smoke check(s) failed`); process.exit(1); }
console.log('smoke ok');
