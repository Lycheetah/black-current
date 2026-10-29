/* Focused source-build HUD check. Isolated profile; no real player save is read or changed. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const { firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = 'shots/vitals'; mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [] };
const check = (name, ok, detail = null) => {
  report.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + JSON.stringify(detail)}`);
};
const browser = await firefox.launch();
const url = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await context.route('**/*', route => route.request().url().startsWith(new URL(url).origin) ? route.continue() : route.abort());
const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
const visible = selector => page.locator(selector).evaluate(el => {
  const r = el.getBoundingClientRect(), s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'
    && r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
});
const snapshot = () => page.evaluate(() => ({
  hp: document.getElementById('hud-hp-text').textContent,
  hpWidth: document.getElementById('hud-hp-fill').style.width,
  shield: document.getElementById('hud-shield-text').textContent,
  shieldWidth: document.getElementById('hud-shield-fill').style.width,
  shieldNow: Number(document.getElementById('hud-shield-meter').getAttribute('aria-valuenow')),
  shieldMax: Number(document.getElementById('hud-shield-meter').getAttribute('aria-valuemax')),
}));
try {
  await page.goto(url); await page.waitForFunction(() => typeof engine !== 'undefined' && document.getElementById('flight-vitals'));
  // launch the way a new pilot does now: the first-ship workshop opens over the title, and finishing it (Use premade)
  // takes off. Then let launch-time setup settle (welcome credit, module save sections) before the save snapshot.
  await page.evaluate(() => { document.getElementById('title-callsign').value = 'VITALS'; garage.launch(false); if (window.starterJourney?.active) starterJourney.finish(true); garage.closeMission(); });
  await page.waitForTimeout(2000);   // past menu.js's 1.5 s launch tip, which records itself in the save
  await page.evaluate(() => { garage.closeMission(); engine.paused = true; engine.enemies = []; engine.updateHUD(); });
  const originalSave = await page.evaluate(() => JSON.stringify(saveState.doc));
  await page.evaluate(() => { engine.player.maxHp = 200; engine.player.hp = 50; engine.player.shieldHp = 0; engine.player.dead = false; engine.updateHUD(); });
  let r = await snapshot();
  check('current hull numbers and percentage match combat state', r.hp === '50 / 200' && r.hpWidth === '25%', r);
  check('inactive shield is empty and explicitly labelled', r.shield === '0' && r.shieldWidth === '0%' && await page.locator('#hud-shield-meter').getAttribute('aria-valuetext') === 'Shield inactive', r);
  await page.evaluate(() => { engine.player.secAbility = 'shield'; engine.player.secCooldownTimer = 0; engine.paused = false; engine.triggerSecondaryAbility(); engine.paused = true; engine.updateHUD(); });
  r = await snapshot();
  check('real shield activation displays its full 80 HP pool', r.shield === '80 / 80' && r.shieldWidth === '100%' && r.shieldMax === 80, r);
  const shieldBefore = await page.evaluate(() => engine.player.shieldHp);
  await page.evaluate(() => { engine.paused = false; engine.player.iFrames = 0; engine.playerTakeDamage(20, 'shot'); engine.paused = true; engine.updateHUD(); });
  r = await snapshot();
  const shieldAfter = await page.evaluate(() => engine.player.shieldHp);
  check('real damage lowers shield number and bar together', shieldAfter < shieldBefore && r.shieldNow === Math.ceil(shieldAfter) && Math.abs(parseFloat(r.shieldWidth) - shieldAfter / 80 * 100) < .01, r);
  await page.evaluate(() => { engine.player.shieldHp = 0; engine.player.hp = 0; engine.player.dead = true; engine.updateHUD(); });
  r = await snapshot();
  check('death and depletion show zero without negative bars', r.hp === '0 / 200' && r.hpWidth === '0%' && r.shield === '0 / 80' && r.shieldWidth === '0%', r);
  await page.evaluate(() => { engine.player.dead = false; engine.player.hp = 250; engine.player.shieldHp = 40; engine.updateHUD(); });
  r = await snapshot();
  check('overfull hull is clamped in the view without changing combat state', r.hp === '200 / 200' && r.hpWidth === '100%' && await page.evaluate(() => engine.player.hp === 250), r);
  await page.evaluate(() => { engine.player.hp = 127; engine.updateHUD(); });
  { const now = await page.evaluate(() => JSON.stringify(saveState.doc)), A = JSON.parse(originalSave), B = JSON.parse(now), changed = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    check('display updates never write player save data', originalSave === now, { changed, sample: changed.slice(0, 3).map(k => [k, JSON.stringify(A[k])?.slice(0, 120), JSON.stringify(B[k])?.slice(0, 120)]) }); }
  for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
    const name = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport); await page.waitForTimeout(120);
    check(name + ' both labelled bars and numbers remain visible', await visible('#hud-hp-text') && await visible('#hud-hp-meter') && await visible('#hud-shield-text') && await visible('#hud-shield-meter'));
    const bounds = await page.locator('.organism-card').boundingBox();
    // the phone status card is now a tap target (hud-layout.css: min-height 44px, the touch minimum the phone witnesses
    // enforce), so 'compact' means one row no taller than 48px; the old 38px limit predates the tap target
    check(name + ' status strip stays one compact row (a 44px tap target, at most 48px)', bounds.height <= 48, bounds);
    check(name + ' vitals stay in the existing phone strip', await page.locator('.organism-info #flight-vitals').count() === 1);
    await page.screenshot({ path: `${out}/hud-${name}.png` });
  }
  const defect = await page.addStyleTag({ content: '#flight-vitals { display:none!important }' });
  check('visibility check detects a deliberately hidden meter', !await visible('#hud-hp-meter'));
  await defect.evaluate(el => el.remove());
  await page.setViewportSize({ width:1366,height:768 }); await page.waitForTimeout(120);
  check('desktop restores the same meters beside resources', await page.locator('.vitals-card #flight-vitals').count() === 1 && await visible('#hud-hp-text') && await visible('#hud-shield-text'));
  check('no duplicate HP or shield IDs after layout changes', await page.locator('#hud-hp-text').count() === 1 && await page.locator('#hud-shield-text').count() === 1);
  await page.screenshot({ path: `${out}/hud-desktop.png` });
  check('no application exceptions', report.errors.length === 0, report.errors);
} catch (error) {
  check('focused witness completed', false, String(error));
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
} finally {
  await browser.close(); report.passed = report.checks.filter(c => c.ok).length; report.failed = report.checks.filter(c => !c.ok).length;
  writeFileSync(`${out}/report.json`, JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.passed}/${report.checks.length} passed`);
if (report.failed) process.exitCode = 1;
