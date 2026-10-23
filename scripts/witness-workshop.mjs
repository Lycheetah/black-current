/* UI acceptance on the actual app. Fresh profile, one browser, visible parts.
 * node scripts/witness-workshop.mjs chromium | firefox
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));
const browserName = process.argv[2] || 'chromium';
const mapOnly = process.argv[3] === 'map';
const out = resolve(`shots/workshop/${mapOnly ? 'map-' : ''}${browserName}`);
mkdirSync(out, { recursive: true });
const url = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const report = { browser: browserName, checks: [], errors: [], viewports: [] };
function check(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
}
const browser = await ({ chromium, firefox })[browserName].launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.route('**/*', route => route.request().url().startsWith(new URL(url).origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.sprites?.ready && window.shipyard && document.getElementById('flight-diagnostics'));
  await page.evaluate(() => { document.getElementById('title-callsign').value = 'WORKSHOP'; garage.launch(false); garage.closeMission(); });
  await page.waitForTimeout(350);
  if (mapOnly) {
    for (const viewport of [{ width:1366,height:768 }, { width:1024,height:600 }]) {
      await page.setViewportSize(viewport);
      await page.click('#btn-open-map');
      await page.waitForTimeout(200);
      const bounds = await page.locator('#btn-close-map').evaluate(button => {
        const r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { visible:r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
          reachable:hit === button || button.contains(hit) };
      });
      check(`sector chart Close is visible and reachable at ${viewport.width}x${viewport.height}`, bounds.visible && bounds.reachable, bounds);
      await page.screenshot({ path:`${out}/map-${viewport.width}x${viewport.height}.png` });
      await page.click('#btn-close-map');
    }
  } else {
  check('diagnostics are hidden by default', !await page.locator('#flight-diagnostics').isVisible());
  await page.keyboard.press('F1');
  check('F1 opens one diagnostics panel with all four live readouts', await page.locator('#flight-diagnostics').isVisible()
    && await page.locator('#flight-diagnostics > div').count() === 4); // B1: + danger/weapon/FPS card
  await page.keyboard.press('F1');
  await page.screenshot({ path: `${out}/flight.png` });
  await page.click('#btn-open-designer');
  await page.waitForSelector('#shipyard.shipyard-workshop.on');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#sy-parts img')).filter(img => img.complete && img.naturalWidth).length >= 4);
  check('one workshop opens and pauses combat', await page.evaluate(() => shipyard.open && engine.paused && document.querySelectorAll('#shipyard').length === 1));
  check('parts catalogue has real decoded artwork', await page.locator('#sy-parts .part-card').count() >= 20);
  const scale = await page.evaluate(() => ({ scale: shipyard.fitScale(), reach: shipyard.reach(), height: shipyard.canvas.height }));
  check('starter preview uses a useful share of the workbench', scale.scale * scale.reach * 2 > scale.height * 0.55, scale);
  await page.fill('#sy-search', 'siege');
  const siegeResults = await page.locator('#sy-parts .part-card').count();
  check('search finds both siege-class mounts', siegeResults === 2, siegeResults);
  await page.fill('#sy-search', '');
  await page.click('[data-category="thruster"]');
  check('engine category contains only thrusters', await page.evaluate(() => Array.from(document.querySelectorAll('#sy-parts .part-card')).every(b => b.dataset.type === 'thruster')));
  await page.click('[data-category="cannon"]');
  const original = await page.evaluate(() => JSON.stringify(shipyard.design));
  const originalCount = await page.evaluate(() => shipyard.design.nodes.length);
  await page.locator('#sy-parts .part-card').first().click();
  const point = await page.evaluate(() => {
    const r = shipyard.canvas.getBoundingClientRect(), f = shipyard.fitScale();
    return { x: r.left + r.width / 2 - 50 * f, y: r.top + r.height / 2 + 40 * f };
  });
  await page.mouse.click(point.x, point.y);
  check('placement mounts a mirrored pair through the canvas', await page.evaluate(n => shipyard.design.nodes.length === n + 2, originalCount));
  check('selected part opens its inspector', await page.locator('#sy-part-size').isVisible());
  // Negative control: the UI assertion must detect a deliberately inert undo
  // in this isolated page. Never modify the live source to plant a defect.
  await page.evaluate(() => { window.__goodHistory = shipyard.history; shipyard.history = () => {}; });
  await page.click('#sy-undo');
  check('undo witness rejects an intentionally disabled undo', await page.evaluate(s => JSON.stringify(shipyard.design) !== s, original));
  await page.evaluate(() => { shipyard.history = __goodHistory; delete window.__goodHistory; });
  await page.click('#sy-undo');
  check('undo restores the exact pre-placement ship', await page.evaluate(s => JSON.stringify(shipyard.design) === s, original));
  await page.click('#sy-redo');
  check('redo restores the pair', await page.evaluate(n => shipyard.design.nodes.length === n + 2, originalCount));
  await page.evaluate(() => { shipyard.sel = shipyard.design.nodes.length - 2; shipyard.paint(); });
  await page.selectOption('#sy-part-size', '33');
  check('explicit siege class changes the real mount radius', await page.evaluate(() => shipyard.design.nodes[shipyard.sel].radius === 33
    && fleet.mountBand(shipyard.design.nodes[shipyard.sel].radius).weapon === 'railgun'));
  const radius = await page.evaluate(() => shipyard.design.nodes[shipyard.sel].radius);
  const canvas = await page.locator('#sy-canvas').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, -100);
  check('wheel zoom never silently resizes a weapon', await page.evaluate(r => shipyard.design.nodes[shipyard.sel].radius === r, radius));
  const artButton = page.locator('.sy-art-choice').nth(1);
  const art = await artButton.getAttribute('data-file');
  await artButton.click();
  check('casting choice is on the actual node data', await page.evaluate(file => shipyard.design.nodes[shipyard.sel].art === file, art));
  const previewArt = await page.evaluate(() => shipyard.renderNodes()[shipyard.sel].art);
  check('the game renderer receives the chosen casting in the editor', previewArt === art, previewArt);
  await page.fill('#sy-frame', 'Mac Workshop Test');
  await page.click('#sy-save');
  const saved = await page.evaluate(() => ({ design: shipyard.design,
    roster: shipyard.savedRoster()[shipyard.design.id] }));
  check('save generates an id from the ship name', saved.design.id === 'mac_workshop_test', saved.design.id);
  check('saved roster preserves geometry and artwork exactly', JSON.stringify(saved.design) === JSON.stringify(saved.roster));
  const savedDraft = JSON.stringify(saved.design);
  await page.click('#sy-clear');
  check('new ship clears name and armed placement', await page.evaluate(() => !shipyard.design.frame && !shipyard.part));
  await page.click('#sy-undo');
  check('new ship is reversible without losing the saved design', await page.evaluate(s => JSON.stringify(shipyard.design) === s, savedDraft));
  await page.evaluate(() => { shipyard.sel = shipyard.design.nodes.length - 2; shipyard.paint(); });
  await page.screenshot({ path: `${out}/selected-part.png` });
  await page.click('#sy-fly');
  check('fly applies the edited ship and closes the workshop', await page.evaluate(n => !shipyard.open && !engine.paused && engine.player.nodes.length === n, originalCount + 2));
  check('chosen castings survive applying the design', await page.evaluate(file => engine.player.nodes.some(n => n.art === file), art));
  await page.keyboard.press('b');
  check('B opens the same workshop with the live ship, without a second fitting UI', await page.evaluate(() => shipyard.open && !document.getElementById('bay-overlay')));
  await page.click('#sy-close');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => sprites.ready && document.getElementById('flight-diagnostics'));
  await page.click('#btn-title-continue');
  await page.evaluate(() => garage.closeMission());
  check('chosen casting survives refresh and Continue', await page.evaluate(file => engine.player.nodes.some(n => n.art === file), art));
  await page.keyboard.press('y');
  check('draft name and selected artwork survive refresh', await page.evaluate(file => shipyard.design.frame === 'Mac Workshop Test'
    && shipyard.design.nodes.some(n => n.art === file), art));
  const cases = [{ width:1366, height:768 }, { width:1024, height:600 }, { width:1920, height:1080 }, { width:390, height:844 }];
  for (const viewport of cases) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => { shipyard.zoom = 0; shipyard.sel = -1; shipyard.part = null; shipyard.paint(); });
    await page.waitForTimeout(180);
    const bounds = await page.evaluate(() => {
      const inside = id => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.width > 0 && r.height > 0; };
      const r = shipyard.canvas.getBoundingClientRect();
      return { close:inside('sy-close'), save:inside('sy-save'), fly:inside('sy-fly'), canvas:r.width > 150 && r.height > 150,
        overflow:document.documentElement.scrollWidth > innerWidth };
    });
    report.viewports.push({ ...viewport, bounds });
    check(`Save/Fly/Close and canvas fit ${viewport.width}x${viewport.height}`, bounds.close && bounds.save && bounds.fly && bounds.canvas && !bounds.overflow, bounds);
    await page.screenshot({ path:`${out}/workshop-${viewport.width}x${viewport.height}.png` });
  }
  await page.setViewportSize({ width:1366, height:768 });
  await page.click('#sy-close');
  await page.evaluate(() => { engine.paused = true; });
  await page.keyboard.press('y');
  await page.keyboard.press('Escape');
  check('closing a workshop opened from pause preserves the pause', await page.evaluate(() => !shipyard.open && engine.paused));
  }
  check('no application exceptions', report.errors.length === 0, report.errors);
  report.sourceHashes = Object.fromEntries(['js/engine.js','js/shaders.js','js/sprites.js','js/shipyard-ui.js','js/interface.js','css/workshop.css'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
} catch (error) {
  report.errors.push(error.stack || error.message);
  check('UI witness completed', false, error.message);
  throw error;
} finally {
  await browser.close();
  report.passed = report.checks.filter(c => c.ok).length;
  report.failed = report.checks.filter(c => !c.ok).length;
  writeFileSync(`${out}/report.json`, JSON.stringify(report,null,2)+'\n');
}
console.log(`RESULT ${report.passed} passed / ${report.failed} failed; ${out}/report.json`);
process.exitCode = report.failed ? 1 : 0;
