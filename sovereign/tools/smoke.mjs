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
  const { page, errors } = await run({ width: 844, height: 390 }, 'phone', true);
  check(errors.length === 0, 'phone: no runtime errors');
  await page.close();
}
await browser.close();
if (fail.length) { console.error(`${fail.length} smoke check(s) failed`); process.exit(1); }
console.log('smoke ok');
