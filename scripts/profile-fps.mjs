/* PROFILE — where does the frame go? ABLATION, not guesswork.
 *
 * Runs the real game at Mac's 1366x768, equips the biggest hull in the roster,
 * spawns a fight, holds the trigger, and measures per-frame update+render+raster
 * (a 1px readback each frame forces the canvas to actually rasterise, so the
 * number includes paint cost, not just JS). Then it switches ONE pass off at a
 * time and reports what each pass cost.
 *
 *   node scripts/profile-fps.mjs
 *   GAME_URL=http://localhost:8811/ FRAMES=240 node scripts/profile-fps.mjs
 *
 * ⚠ Headless Chromium on this machine is not Mac's Firefox. The RANKING of
 *   passes is the evidence; the absolute ms is not his number.
 */
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));
const URL = process.env.GAME_URL || 'http://localhost:8811/';
const FRAMES = +(process.env.FRAMES || 180);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const setup = await page.evaluate(() => {
  try { garage.launch(); } catch (e) {}
  engine.paused = false; engine.mapOpen = false;
  /* The roster is empty (FLEET_HULLS = {}), so build the capital Mac described:
     27 parts, symmetric, one core, a gun battery, pods, shields, thrusters. */
  const nodes = [{ dx: 0, dy: 0, radius: 40, type: 'core' }];
  const add = (dx, dy, radius, type) => { nodes.push({ dx, dy, radius, type }); if (dy) nodes.push({ dx, dy: -dy, radius, type }); };
  for (let i = 0; i < 4; i++) add(60 + i * 38, 46 + i * 6, 16 + i * 4, 'cannon');
  for (let i = 0; i < 3; i++) add(-20 - i * 34, 58 + i * 8, 20, 'pod');
  for (let i = 0; i < 2; i++) add(10 - i * 46, 100, 22, 'shield');
  for (let i = 0; i < 2; i++) add(-120, 24 + i * 40, 14, 'thruster');
  add(150, 0, 30, 'cannon'); add(-150, 0, 18, 'thruster'); add(100, 0, 24, 'cannon');
  const best = 'synthetic-capital', bestN = nodes.length;
  engine.applyDesign({ nodes, color: '#00f3ff', primaryWeapon: 'spitter', secAbility: 'shield' });
  // a standing fight: top enemies up to 24 around the player
  while (engine.enemies.length < 24) {
    const a = Math.random() * 6.28, d = 250 + Math.random() * 500;
    engine.enemies.push(new EnemyOrganism(engine.player.x + Math.cos(a) * d, engine.player.y + Math.sin(a) * d,
      { tier: 3, archetype: ['mote', 'stalker', 'charger', 'sniper', 'hive'][engine.enemies.length % 5] }));
  }
  engine.mouse.down = true; engine.mouse.x = 900; engine.mouse.y = 300;
  return { hull: best, nodes: bestN, spritesReady: sprites.ready, enemies: engine.enemies.length,
           worldGone: typeof window.packRenderer };
});
console.log('SETUP', JSON.stringify(setup));

// instrument: one timer around the whole native frame (update+render+readback)
await page.evaluate(() => {
  window.__t = [];
  const ou = engine.update.bind(engine), or = engine.render.bind(engine);
  let t0 = 0;
  engine.update = function (dt) {
    t0 = performance.now();
    // keep the fight alive: refill enemies, keep trigger down, keep player alive
    engine.player.hp = engine.player.maxHp; engine.mouse.down = true;
    while (window.__refill && engine.enemies.length < 24) {
      const a = Math.random() * 6.28, d = 300 + Math.random() * 400;
      engine.enemies.push(new EnemyOrganism(engine.player.x + Math.cos(a) * d, engine.player.y + Math.sin(a) * d,
        { tier: 3, archetype: ['mote', 'stalker', 'charger', 'sniper', 'hive'][engine.enemies.length % 5] }));
    }
    ou(dt);
  };
  engine.render = function () {
    or();
    engine.ctx.getImageData(0, 0, 1, 1);
    engine.lightingCtx.getImageData(0, 0, 1, 1);
    window.__t.push(performance.now() - t0);
  };
  window.__refill = true;
});

async function run(label, on, off) {
  await page.evaluate(on);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__t.length = 0; });
  await page.evaluate(n => new Promise(r => { const iv = setInterval(() => { if (window.__t.length >= n) { clearInterval(iv); r(); } }, 50); }), FRAMES);
  const r = await page.evaluate(() => {
    const a = window.__t.slice().sort((x, y) => x - y);
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    return { mean, p50: a[a.length >> 1], p95: a[Math.floor(a.length * 0.95)], n: a.length,
             proj: engine.projectiles.length, part: particleSystem.particles.length, en: engine.enemies.length };
  });
  await page.evaluate(off);
  return { label, ...r };
}
const noop = () => {};
const stub = (path, ret = '') => `(()=>{const [o,k]=${path};window.__saved=window.__saved||{};window.__saved["${path}"]=[o,k,o[k]];o[k]=function(){${ret}};})()`;
const stubs = {
  'lighting (fog)':     ['fluidShader', 'drawLightingShader'],
  'ocean grid':         ['fluidShader', 'drawParallaxOcean'],
  'ambient spores':     ['particleSystem', 'drawAmbient'],
  'chamber membrane':   ['worldMap', 'drawChamberMembrane'],
  'particles':          ['particleSystem', 'draw'],
  'projectiles draw':   ['Projectile.prototype', 'draw'],
  'enemies draw':       ['EnemyOrganism.prototype', 'draw'],
  'mass drops':         ['progression', 'drawDrops'],
  'HUD+radar':          ['engine', 'drawMiniRadar'],
};
const results = [];
results.push(await run('BASELINE', noop, noop));
for (const [label, [objExpr, key]] of Object.entries(stubs)) {
  const on = `(()=>{const o=${objExpr};window.__s=window.__s||{};window.__s["${label}"]=o["${key}"];o["${key}"]=function(){};})()`;
  const off = `(()=>{const o=${objExpr};o["${key}"]=window.__s["${label}"];})()`;
  results.push(await run('minus ' + label, on, off));
}
// the three dials Mac was told to press
for (const [label, prop] of [['sprites OFF (G)', 'enabled'], ['membrane underlay OFF (H)', 'underlay'], ['chassis OFF (J)', 'chassis']]) {
  results.push(await run(label, `sprites.${prop}=!sprites.${prop}`, `sprites.${prop}=!sprites.${prop}`));
}
results.push(await run('no enemies', `(()=>{window.__refill=false;window.__keep=engine.enemies.slice();engine.enemies.length=0;})()`,
  `(()=>{window.__refill=true;})()`));

const base = results[0].mean;
console.log('\nPASS'.padEnd(34) + 'mean ms  p50    p95    saved   proj part en');
for (const r of results) {
  console.log(r.label.padEnd(33) + r.mean.toFixed(2).padStart(7) + r.p50.toFixed(2).padStart(7) + r.p95.toFixed(2).padStart(7)
    + (r === results[0] ? '' : (base - r.mean).toFixed(2).padStart(8)) + String(r.proj).padStart(6) + String(r.part).padStart(5) + String(r.en).padStart(4));
}
if (errors.length) console.log('\nPAGE ERRORS:', errors.slice(0, 5));
await browser.close();
