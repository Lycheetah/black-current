// Beauty captures: close three-quarter views of hulls across civilisations and classes.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'shots');
mkdirSync(out, { recursive: true });
const hulls = process.argv.slice(2).length ? process.argv.slice(2) : ['savanah_starter', 'techno_angels_cruiser', 'human_hunters_battleship', 'blackhole_dreadnought', 'chaos_titan'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const id of hulls) {
  await page.goto(pathToFileURL(join(root, 'dist', 'sovereign-eclipse.html')).href + '?capture&hull=' + id);
  await page.waitForFunction(() => window.__SE && window.__SE.world.tick > 30, null, { timeout: 60000 });
  await page.evaluate(() => { const r = window.__SE.view.rig; r.yaw = 0.9; r.pitch = 0.32; r.targetDist = r.minDist * 1.35; r.dist = r.targetDist; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, `hull-${id}.png`) });
  console.log('shot', id);
}
await browser.close();
