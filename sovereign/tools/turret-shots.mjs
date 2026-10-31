// Turret close-ups in a live fight: a hull at the breach, locked, guns tracking and firing.
//   node tools/turret-shots.mjs savanah_battleship
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hull = process.argv[2] || 'savanah_battleship';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(pathToFileURL(join(root, 'dist/sovereign-eclipse.html')).href + '?capture&hull=' + hull);
await page.waitForFunction(() => window.__SE?.modelsReady && window.__SE.world.tick > 30, null, { timeout: 90000 });
await page.evaluate(() => { const w = window.__SE.world, p = window.__SE.getPlayer(), b = w.sector.landmarks.breach.pos;
  p.pos = { x: b.x + 900, y: b.y + 120, z: b.z + 500 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.throttle = 0; });
await page.waitForFunction(() => window.__SE.world.op.stage === 'wave', null, { timeout: 20000 });
for (let i = 0; i < 25; i++) {
  if (await page.evaluate(() => window.__SE.getPlayer().lock.progress >= 1)) break;
  if (await page.evaluate(() => window.__SE.getPlayer().lock.targetId == null)) await page.keyboard.press('Tab');
  await page.waitForTimeout(700);
}
await page.evaluate(() => { for (const g of ['fore', 'mid', 'aft']) window.__SE.getPlayer().groups[g].active = true; const r = window.__SE.view.rig; r.yaw = 2.6; r.pitch = 0.45; r.targetDist = r.minDist * 0.75; r.dist = r.targetDist; r.minDist *= 0.5; r.targetDist = r.minDist * 1.4; });
for (let k = 0; k < 3; k++) { await page.waitForTimeout(1600); await page.screenshot({ path: join(root, 'shots', `turrets-${hull}-${k}.png`) }); }
const yaws = await page.evaluate(() => { const v = window.__SE.view.views.get(window.__SE.world.playerId); return v.mesh.userData.hardpoints.map((n) => [n.name, +n.userData.yaw?.rotation.y.toFixed(2), +n.userData.pitch?.rotation.x.toFixed(2)]); });
console.log('turrets', JSON.stringify(yaws));
await browser.close();
