/* Render the public page and follow its real playable link in a fresh browser.
 * Run a local server from the repository root, then:
 * node scripts/witness-site.mjs http://127.0.0.1:8812/
 * Browser installation belongs to optional developer tooling, never the game.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8812/');
const { firefox, chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browserName = process.env.SITE_BROWSER || 'firefox';
const output = resolve(root, 'shots/public-site');
mkdirSync(output, { recursive: true });
mkdirSync(resolve(root, 'site/assets'), { recursive: true });
const report = { browser: browserName, checks: [], errors: [], assets: [] };
const check = (name, ok, detail = null) => {
  report.checks.push({ name, ok: !!ok, detail });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${name}\n`);
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await ({ firefox, chromium })[browserName].launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
  const game = await context.newPage();
  game.on('pageerror', error => report.errors.push(error.message));
  await game.goto(base.href, { waitUntil: 'load' });
  await game.waitForFunction(() => typeof engine !== 'undefined' && typeof garage !== 'undefined' && typeof sprites !== 'undefined' && sprites.ready);
  await game.evaluate(() => {
    document.getElementById('title-callsign').value = 'CURRENT';
    garage.launch(false);
    garage.closeMission();
  });
  // a new pilot's first-ship workshop opens over the title (a moment after launch); Use premade takes off, so the
  // landing-page capture shows flight rather than the workshop
  await game.waitForFunction(() => window.starterJourney?.active || !document.body.classList.contains('at-title'), null, { timeout: 15000 });
  await game.evaluate(() => { if (window.starterJourney?.active) starterJourney.finish(true); garage.closeMission(); });
  await game.waitForTimeout(900);
  check('source game launches before capture', await game.evaluate(() => !!engine.player && !engine.paused));
  await game.screenshot({ path: resolve(root, 'site/assets/gameplay.jpg'), type: 'jpeg', quality: 85 });
  process.stdout.write(execFileSync('python3', ['scripts/build-site.py'], { cwd: root, encoding: 'utf8' }));
  const manifest = JSON.parse(readFileSync(resolve(root, '.site-build/build.json')));
  check('playable page is byte-identical to source', manifest.play_source_sha256 === digest(readFileSync(resolve(root, '.site-build/play/index.html'))));
  check('download is byte-identical to the standalone snapshot', manifest.standalone_sha256 === digest(readFileSync(resolve(root, '.site-build/download/black-current.html'))));
  check('historical notes are absent from the site artifact', !Object.keys(manifest.files).some(path => /(?:^|\/)(?:archive|_retired|AGENTS\.md|CLAUDE\.md|PLAN_)/.test(path)));
  const siteURL = new URL('.site-build/', base);
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(siteURL.href, { waitUntil: 'load' });
    await page.locator('.game-preview').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.game-preview img').complete);
    check(`page fits ${viewport.width}px without horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`gameplay image decodes at ${viewport.width}px`, await page.locator('.game-preview img').evaluate(image => image.naturalWidth === 1440 && image.naturalHeight === 900));
    check(`play link points to current source at ${viewport.width}px`, await page.locator('.hero-actions .primary').getAttribute('href') === 'play/');
    await page.screenshot({ path: resolve(output, `page-${viewport.width}.png`), fullPage: true });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: resolve(output, `hero-${viewport.width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('reduced-motion preference removes smooth scrolling', await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'));
  const links = await page.locator('a').evaluateAll(items => [...new Set(items.map(a => a.href))]);
  for (const url of links) {
    if (!url.startsWith(base.origin) || new URL(url).hash) continue;
    const response = await context.request.get(url);
    report.assets.push({ url: new URL(url).pathname, status: response.status() });
    check(`local link resolves: ${new URL(url).pathname}`, response.ok());
  }
  await page.goto(siteURL.href);
  await page.locator('.hero-actions .primary').click();
  await page.waitForFunction(() => typeof engine !== 'undefined' && typeof garage !== 'undefined' && typeof shipyard !== 'undefined' && typeof sprites !== 'undefined' && sprites.ready);
  check('landing-page Play opens the actual game', new URL(page.url()).pathname.endsWith('/play/'));
  await page.evaluate(() => {
    document.getElementById('title-callsign').value = 'SITE';
    if (saveState.doc.launched) garage.launch(true); else garage.launch(false);   // the source capture above already saved a pilot on this origin: continue it
    garage.closeMission();
  });
  // a new pilot's first-ship workshop opens over the title (a moment after launch); Use premade takes off
  await page.waitForFunction(() => window.starterJourney?.active || !document.body.classList.contains('at-title'), null, { timeout: 15000 });
  await page.evaluate(() => { if (window.starterJourney?.active) starterJourney.finish(true); garage.closeMission(); });
  await page.waitForTimeout(300);
  check('packaged game has a running player', await page.evaluate(() => !!engine.player && !engine.paused));
  await page.waitForFunction(() => !document.body.classList.contains('at-title'), null, { timeout: 15000 });   // the title closes once the first ship takes off
  await page.click('#btn-open-designer');
  // the freeform pictured workshop is retired (modular only); the Shipyard is the modular yard: the flying ship's
  // hull sections on its canvas, with the hull-part rail beside it
  await page.waitForSelector('#modular-canvas [data-section]', { timeout: 15000 });
  const yard = await page.evaluate(() => ({ sections: document.querySelectorAll('#modular-canvas [data-section]').length, parts: document.querySelectorAll('.modular-rail button').length }));
  check('packaged game opens the real Shipyard (modular yard with the ship\'s sections)', yard.sections >= 3 && yard.parts >= 2, yard);
  await page.screenshot({ path: resolve(output, 'packaged-shipyard.png') });
  await page.keyboard.press('Escape');
  check('Shipyard closes and returns to play', await page.evaluate(() => !shipyard.open && !engine.paused));
  check('no application exceptions', report.errors.length === 0, report.errors);
} finally {
  await browser.close();
  report.passed = report.checks.filter(item => item.ok).length;
  report.failed = report.checks.filter(item => !item.ok).length;
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
process.stdout.write(`${report.passed}/${report.checks.length} checks passed\n`);
if (report.failed) process.exitCode = 1;
