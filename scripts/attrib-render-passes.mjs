import { readFileSync } from 'node:fs';
const playwright = await import(((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));
const fx = readFileSync(new URL('./attrib-fixture.js', import.meta.url), 'utf8').replace(/^\s*const fixture = /, '').replace(/;\s*$/, '');
const browser = await playwright[process.argv[2] || 'firefox'].launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.addInitScript(() => { let s = 0xB1AC; Math.random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8811/', { waitUntil: 'load' });
await page.waitForFunction(() => window.sprites && sprites.ready, null, { polling: 50 });
await page.evaluate(`(${fx})()`);
await page.waitForTimeout(800);
// passes as [label, objectExpr, method]
const passes = [
  ['membrane', 'worldMap', 'drawChamberMembrane'], ['ocean', 'fluidShader', 'drawParallaxOcean'],
  ['ambient', 'particleSystem', 'drawAmbient'], ['drops', 'progression', 'drawDrops'],
  ['particles', 'particleSystem', 'draw'], ['lighting', 'fluidShader', 'drawLightingShader'],
  ['organisms(all ships)', 'fluidShader', 'drawOrganismMembrane'],
];
await page.evaluate(() => {
  window.__r = []; const render = engine.render.bind(engine);
  engine.render = function () { const t = performance.now(); render(); engine.ctx.getImageData(0,0,1,1); __r.push(performance.now() - t); };
});
const measure = async ms => { await page.evaluate(() => { __r.length = 0; }); await page.waitForTimeout(ms);
  return page.evaluate(() => { const a = __r.slice().sort((x, y) => x - y); return { n: a.length, mean: +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2), p95: a[Math.floor(a.length * .95)] }; }); };
const rows = [['BASELINE', await measure(2500)]];
for (const [label, obj, m] of passes) {
  await page.evaluate(([o, m]) => { const O = (0, eval)(o); window.__save = O[m]; O[m] = function () {}; }, [obj, m]);
  rows.push([label + ' OFF', await measure(2500)]);
  await page.evaluate(([o, m]) => { (0, eval)(o)[m] = window.__save; }, [obj, m]);
}
for (const [label, expr] of [['enemies OFF', 'engine.enemies.forEach(e=>{e.__d=e.draw;e.draw=()=>{}})|restore:engine.enemies.forEach(e=>{e.draw=e.__d})'],
  ['projectiles OFF', 'window.__P=Projectile.prototype.draw;Projectile.prototype.draw=function(){}|restore:Projectile.prototype.draw=__P'],
  ['sprites OFF', 'window.__S=sprites.enabled;sprites.enabled=false|restore:sprites.enabled=__S'],
  ['underlay OFF', 'window.__U=sprites.underlay;sprites.underlay=false|restore:sprites.underlay=__U']]) {
  const [on, off] = expr.split('|restore:');
  await page.evaluate(on); rows.push([label, await measure(2500)]); await page.evaluate(off);
}
rows.push(['BASELINE again', await measure(2500)]);
const state = await page.evaluate(() => ({ enemies: engine.enemies.length, proj: engine.projectiles.length, parts: particleSystem.particles.length, zoom: engine.camera.zoom, spritesKeys: Object.keys(sprites).filter(k => typeof sprites[k] !== 'function').join(',') }));
for (const [l, r] of rows) console.log(l.padEnd(24), JSON.stringify(r));
console.log(JSON.stringify(state), 'errors', errs);
await browser.close();
