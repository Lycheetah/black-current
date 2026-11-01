// Performance check: draw calls, triangles and memory in the opening scene, in a fight, and after
// repeated hull swaps (leak check). Headless frame rate is not meaningful (software GPU); counts are.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(join(root, 'dist/sovereign-eclipse.html')).href + '?capture');
await page.waitForFunction(() => window.__SE?.modelsReady && window.__SE.world.tick > 60, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const snap = () => page.evaluate(() => ({ ...window.__SE.view.stats }));
const fmt = (s) => `${s.calls} calls · ${(s.triangles / 1000).toFixed(0)}k tris · ${s.geometries} geometries · ${s.textures} textures · ${s.programs} shaders`;
console.log('opening scene  ', fmt(await snap()));
for (let i = 0; i < 12; i++) await page.keyboard.press('BracketRight');
for (let i = 0; i < 12; i++) await page.keyboard.press('BracketLeft');
await page.waitForTimeout(2500);
console.log('after 24 swaps ', fmt(await snap()));
await page.evaluate(() => { const w = window.__SE.world, p = window.__SE.getPlayer(), br = w.sector.landmarks.breach.pos;
  p.pos = { x: br.x + 900, y: br.y + 100, z: br.z + 500 }; p.prevPos = { ...p.pos }; });
await page.waitForFunction(() => window.__SE.world.op.stage === 'wave', null, { timeout: 20000 });
await page.waitForTimeout(3000);
console.log('in a fight     ', fmt(await snap()));
await b.close();
