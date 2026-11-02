// Smoke check: boots, flies, turns, cycles a hull, and captures screenshots. Fast and headless.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'shots');
mkdirSync(shots, { recursive: true });
// Functional checks run at low quality: the software GPU here is slow, and game time follows frames.
// Serve dist/ over HTTP: the game fetches its ship models from files beside the page, which a file:// page cannot.
const { createServer } = await import('node:http');
const { readFile } = await import('node:fs/promises');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  try { const body = await readFile(join(root, 'dist', path)); res.writeHead(200, { 'content-type': TYPES[path.slice(path.lastIndexOf('.'))] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const url = base + 'sovereign-eclipse.html?capture&quality=low';

// World scale (src/core/scale.js); in-page code reads it from window.W.
const W = 6;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fail = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fail.push(msg); };

async function run(viewport, tag, touch = false) {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch }); await page.addInitScript((w) => { window.W = w; }, W);
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
    p.pos = { x: b.x + 1700 * W, y: b.y + 60 * W, z: b.z + 900 * W }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
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
  // Shipwright: dock, fit a gun, drag a hardpoint aft, undock and see it in flight.
  const { page, errors } = await run({ width: 1600, height: 900 }, 'shipwright');
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__SE.getPlayer().docked, null, { timeout: 10000 });
  await page.click('[data-tab="shipwright"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, 'shipwright-01-docked.png') });
  // Let the showroom camera settle before dragging against it.
  await page.waitForFunction(() => { const r = window.__SE.view.rig; return Math.abs(r.dist - r.targetDist) < 0.5; }, null, { timeout: 10000 });
  await page.click('[data-bank="WPN_FR"]');
  await page.click('[data-turret="railgun"]');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => window.__SE.getPlayer().fit.WPN_FR !== 'railgun'), 'shipwright refuses a tier 3 railgun on a starter frigate');
  await page.click('[data-turret="flak"]');
  await page.waitForFunction(() => window.__SE.getPlayer().fit.WPN_FR === 'flak', null, { timeout: 5000 });
  check(true, 'shipwright fits flak to the fore starboard node');
  const h = await page.locator('[data-h="WPN_FR"]').boundingBox();
  const tail = await page.evaluate(() => { const v = window.__SE.view; const p = window.__SE.getPlayer(); const bp = p.blueprint;
    const m = v.views.get(p.id).mesh; const P = m.userData.profile; const THREE_V = m.position.clone();
    const local = m.localToWorld(m.userData.hardpoints[0].position.clone().set(P.width(0.8) * 0.5, P.deck(0.8), 0.3 * P.L));
    return v.project(local); });
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(tail.x, tail.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__SE.getPlayer().blueprint.nodes.find((n) => n.bank === 'WPN_FR').z > 0.16, null, { timeout: 8000 }).catch(() => {});
  const moved = await page.evaluate(() => { const p = window.__SE.getPlayer(); return { z: p.blueprint.nodes.find((n) => n.bank === 'WPN_FR').z, g: p.weapons.find((w) => w.bank === 'WPN_FR').group }; });
  check(moved.z > 0.16 && moved.g === 'aft', `dragged node moves aft and joins the aft group (z ${moved.z.toFixed(2)}, ${moved.g})`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, 'shipwright-02-refit.png') });
  await page.click('[data-st-undock]');
  await page.waitForFunction(() => !window.__SE.getPlayer().docked, null, { timeout: 5000 });
  await page.waitForTimeout(1500);
  const flying = await page.evaluate(() => { const p = window.__SE.getPlayer(); const m = window.__SE.view.views.get(p.id).mesh;
    return m.userData.hardpoints.find((n) => n.name === 'WPN_FR').userData.turretId; });
  check(flying === 'flak', `the flying ship carries the new flak turret (${flying})`);
  await page.evaluate(() => { const r = window.__SE.view.rig; r.yaw = 0.9; r.pitch = 0.5; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, 'shipwright-03-flying.png') });
  check(errors.length === 0, 'no runtime errors in shipwright ' + errors.join(' | '));
  await page.close();
}
{
  // Scanner Atlas: ping from spread positions, scan, tune the harmonic, resolve, get paid.
  const { page, errors } = await run({ width: 1600, height: 900 }, 'atlas');
  await page.waitForFunction(() => Object.values(window.__SE.world.atlas.sigs).some((s) => s.stage === 'detected'), null, { timeout: 10000 });
  const id = await page.evaluate(() => window.__SE.world.atlas.activeId);
  const until = (fn, arg, ms = 10000) => page.waitForFunction(fn, arg, { timeout: ms }).catch(() => {});
  for (const off of [[0, 0], [1600 * W, 0], [0, 1600 * W]]) {
    await page.evaluate(([dx, dz]) => { const p = window.__SE.getPlayer(); const b = window.__SE.base ??= { ...p.pos };
      p.pos = { x: b.x + dx, y: b.y, z: b.z + dz }; p.prevPos = { ...p.pos }; p.combat.cap.cur = p.combat.cap.max; window.__SE.world.atlas.pingCooldown = 0; }, off);
    const n = await page.evaluate((i) => window.__SE.world.atlas.sigs[i].pings.length, id);
    await page.keyboard.press('KeyP');
    await until(([i, k]) => window.__SE.world.atlas.sigs[i].pings.length > k, [id, n]);
    if (off[0] === 1600 * W) await page.screenshot({ path: join(shots, 'atlas-01-triangulating.png') });
  }
  check(await page.evaluate((i) => window.__SE.world.atlas.sigs[i].stage === 'triangulated', id), 'three spread pings triangulate the signature');
  await page.evaluate((i) => { const p = window.__SE.getPlayer(), s = window.__SE.world.atlas.sigs[i];
    p.pos = { x: s.pos.x + 300 * W, y: s.pos.y + 80 * W, z: s.pos.z + 200 * W }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.throttle = 0; }, id);
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'scanned', id, 60000);
  check(await page.evaluate((i) => window.__SE.world.atlas.sigs[i].stage === 'scanned', id), 'holding slow inside scan range scans it');
  const target = await page.evaluate((i) => window.__SE.world.atlas.sigs[i].tune.target, id);
  await page.$eval('[data-at-tune]', (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, target);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, 'atlas-02-tuning.png') });
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'understood', id, 30000);
  await page.click('[data-at-act="resolve"]');
  await until((i) => window.__SE.world.atlas.sigs[i].stage === 'resolved', id);
  const r = await page.evaluate(() => ({ research: window.__SE.world.research, mats: window.__SE.world.materials }));
  check(r.research > 0, `resolving pays research and materials (${r.research} research, ${JSON.stringify(r.mats)})`);
  await page.evaluate(() => { const rg = window.__SE.view.rig; rg.yaw += 2.4; rg.pitch = 0.2; rg.targetDist *= 2.5; });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, 'atlas-03-resolved.png') });
  check(errors.length === 0, 'no runtime errors in the Atlas ' + errors.join(' | '));
  await page.close();
}
{
  // Real player path: no test flags. Launch screen → click LAUNCH → keys fly the ship.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('capture&', ''));
  await page.waitForSelector('[data-newpilot]:not([disabled])', { timeout: 60000 });
  await page.screenshot({ path: join(shots, 'launch-00-screen.png') });
  const t0 = await page.evaluate(() => window.__SE.world.tick);
  await page.waitForTimeout(500);
  check(t0 === await page.evaluate(() => window.__SE.world.tick), 'sim waits behind the launch screen');
  await page.click('[data-newpilot]');
  await page.fill('[data-pilot-name]', 'Smoke');
  await page.click('[data-civ="blackhole"]');
  await page.click('[data-launch]');
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => window.__SE.getPlayer().docked)), 'clicking LAUNCH does not fall through to the DOCK button');
  check(await page.evaluate(() => window.__SE.world.pilot.name === 'Smoke' && window.__SE.getPlayer().hullId === 'blackhole_starter'), 'new pilot flies their civilisation starter hull');
  check(await page.evaluate(() => document.querySelector('[data-induct]').classList.contains('show') && window.__SE.world.induction.step === 0), 'a new pilot starts the Asterion induction');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Digit1');
  await page.waitForFunction(() => window.__SE.getPlayer().lock.targetId != null, null, { timeout: 8000 }).catch(() => {});
  check(await page.evaluate(() => window.__SE.getPlayer().lock.targetId != null && window.__SE.getPlayer().groups.fore.active), 'pressing 1 with nothing locked locks a drill drone and opens fire');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
  const thr = await page.evaluate(() => window.__SE.getPlayer().throttle);
  check(thr > 0.35, `after LAUNCH, keyboard reaches the ship (throttle ${thr.toFixed(2)})`);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  await page.waitForFunction(() => window.__SE.world.induction.step >= 1, null, { timeout: 15000 }).catch(() => {});
  check(await page.evaluate(() => window.__SE.world.induction.step >= 1), 'flying at half speed completes induction step 1');
  await page.screenshot({ path: join(shots, 'induction-01-tracker.png') });
  check(errors.length === 0, 'launch path has no errors ' + errors.join(' | '));
  await page.close();
}
{
  // Saves: earn and refit, dock (autosave), reload, Continue, and everything is back.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const plain = url.replace('capture&', '');
  await page.goto(plain);
  await page.waitForSelector('[data-newpilot]:not([disabled])', { timeout: 60000 });
  await page.click('[data-newpilot]');
  await page.click('[data-launch]');
  await page.evaluate(() => { window.__SE.world.salvage = 777; window.__SE.world.research = 31; });
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__SE.getPlayer().docked, null, { timeout: 10000 });
  await page.click('[data-tab="shipwright"]');
  await page.click('[data-bank="WPN_FR"]');
  await page.click('[data-turret="flak"]');
  await page.waitForFunction(() => window.__SE.getPlayer().fit.WPN_FR === 'flak', null, { timeout: 8000 });
  // Fitting window: fit the free shield projector; the ship's shield grows.
  await page.click('[data-tab="fitting"]');
  const sh0 = await page.evaluate(() => window.__SE.getPlayer().combat.shield.max);
  await page.click('[data-ft-mod="aegis_projector"]');
  await page.waitForFunction(() => window.__SE.getPlayer().modules.D1 === 'aegis_projector', null, { timeout: 8000 }).catch(() => {});
  const sh1 = await page.evaluate(() => window.__SE.getPlayer().combat.shield.max);
  check(sh1 > sh0, `fitting window fits a module and the shield grows (${sh0} → ${sh1})`);
  await page.click('[data-st-undock]');
  await page.waitForFunction(() => !window.__SE.getPlayer().docked, null, { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForSelector('[data-continue]:not([hidden])', { timeout: 60000 });
  await page.screenshot({ path: join(shots, 'save-01-continue.png') });
  await page.click('[data-continue]');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ s: window.__SE.world.salvage, r: window.__SE.world.research, fit: window.__SE.getPlayer().fit.WPN_FR, mod: window.__SE.getPlayer().modules.D1 }));
  check(r.mod === 'aegis_projector', `continue restores fitted modules (${r.mod})`);
  // 777 salvage − 95 (flak) + 77 (half the beam lance back) = 759
  check(r.s === 759 && r.r === 31 && r.fit === 'flak', `continue restores salvage, research and fit (${JSON.stringify(r)})`);
  check(errors.length === 0, 'save path has no errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // Travel: ZJ jump inside Naraka, the PILLAR refuses while the Current holds, then opens to Erebos.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('capture&', ''));
  await page.waitForSelector('[data-newpilot]:not([disabled])', { timeout: 60000 });
  await page.click('[data-newpilot]');
  await page.click('[data-launch]');
  await page.waitForTimeout(600);
  await page.evaluate(() => { const W = window.__SE.world; W.entities = W.entities.filter((e) => e.faction !== 'drill' || e.id === W.playerId); W.drill.slots.forEach((s) => { s.wait = 999; }); });
  // The overview rebuilds five times a second, so click its row from inside the page.
  await page.evaluate(() => document.querySelector('[data-overview] tr[data-id="pillar"] td').click());
  await page.keyboard.press('KeyJ');
  await page.waitForFunction(() => { const p = window.__SE.getPlayer(); const g = window.__SE.world.sector.landmarks.pillar.pos; return Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < 1200 * W; }, null, { timeout: 30000 }).catch(() => {});
  check(await page.evaluate(() => { const p = window.__SE.getPlayer(); const g = window.__SE.world.sector.landmarks.pillar.pos; return Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < 1200 * W; }), 'ZJ jump [J] lands the ship at the PILLAR');
  await page.waitForTimeout(400);
  const sealed = await page.textContent('[data-jump-label]');
  check(/SEALED/.test(sealed), `PILLAR is sealed until the breach is purged (${sealed})`);
  await page.evaluate(() => { window.__SE.world.ops.naraka.stage = 'complete'; });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-jump]').click());
  await page.waitForFunction(() => window.__SE.world.sector.id === 'erebos', null, { timeout: 30000 }).catch(() => {});
  check(await page.evaluate(() => window.__SE.world.sector.id === 'erebos' && window.__SE.world.op.id === 'mirror_extraction'), 'gate transit reaches Erebos Reach and its Mirror Well operation');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(shots, 'travel-01-erebos.png') });
  await page.evaluate(() => { const v = window.__SE.view.rig; v.yaw = (v.yaw || 0) + 2.2; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(shots, 'travel-02-erebos-gate.png') });
  // Maps: [B] opens the sector plan; picking a landmark offers approach and jump; the universe view lists sectors.
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(500);
  check(await page.evaluate(() => document.querySelector('[data-map]').classList.contains('open')), '[B] opens the map');
  await page.screenshot({ path: join(shots, 'map-01-sector.png') });
  const box = await page.locator('[data-map-canvas]').boundingBox();
  await page.evaluate(() => document.querySelector('[data-map-view="universe"]').click());
  await page.waitForTimeout(400);
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.62);
  await page.waitForTimeout(300);
  check(/NARAKA VEIL/.test(await page.textContent('[data-map-card]')), 'universe map: clicking Naraka shows its card');
  await page.screenshot({ path: join(shots, 'map-02-universe.png') });
  await page.keyboard.press('KeyB');
  // Induction: the last step docks at Helios Bastion and the civilisation's envoy appears.
  await page.evaluate(() => {
    const W = window.__SE.world, p = window.__SE.getPlayer(), b = W.sector.landmarks.bastion.pos;
    W.induction.step = 8; W.entities = W.entities.filter((e) => e.faction !== 'hostile' || e.id === W.playerId);
    p.pos = { x: b.x, y: b.y + 50 * window.W, z: b.z - 500 * window.W }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.throttle = 0;
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => document.querySelector('[data-envoy]').classList.contains('show'), null, { timeout: 15000 }).catch(() => {});
  check(await page.evaluate(() => document.querySelector('[data-envoy]').classList.contains('show') && window.__SE.world.induction.done), 'docking at Helios Bastion ends the induction with the envoy');
  await page.screenshot({ path: join(shots, 'induction-02-envoy.png') });
  await page.click('[data-envoy-ok]');
  await page.reload();
  await page.waitForSelector('[data-continue]:not([hidden])', { timeout: 60000 });
  await page.click('[data-continue]');
  await page.waitForTimeout(800);
  check(await page.evaluate(() => window.__SE.world.sector.id === 'erebos'), 'continue restores the pilot in Erebos');
  check(errors.length === 0, 'travel path has no errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // Loss and wrecks: a kill leaves a wreck, [V] loots it; losing the hull pays cover and reissues a starter.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('capture&', ''));
  await page.waitForSelector('[data-newpilot]:not([disabled])', { timeout: 60000 });
  await page.click('[data-newpilot]');
  await page.click('[data-launch]');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const W = window.__SE.world, p = window.__SE.getPlayer(), b = W.sector.landmarks[W.op.target].pos;
    p.pos = { x: b.x + 300 * window.W, y: b.y, z: b.z + 300 * window.W }; p.prevPos = { ...p.pos };
  });
  await page.waitForFunction(() => window.__SE.world.op.alive.length > 0, null, { timeout: 30000 }).catch(() => {});
  const victim = await page.evaluate(() => { const W = window.__SE.world; const e = W.entities.find((x) => x.faction === 'hostile' && !x.dead); window.__SE.kill(e.id); return e.id; });
  await page.waitForFunction((id) => window.__SE.world.wrecks.some((w) => w.shipId === id), victim, { timeout: 8000 }).catch(() => {});
  const wreck = await page.evaluate((id) => window.__SE.world.wrecks.find((w) => w.shipId === id), victim);
  check(!!wreck && wreck.loot.salvage > 0, `a destroyed hostile leaves a wreck with loot (${wreck ? wreck.loot.salvage : 'none'} salvage)`);
  await page.evaluate((id) => {
    const W = window.__SE.world, p = window.__SE.getPlayer(), w = W.wrecks.find((x) => x.shipId === id);
    W.entities.filter((e) => e.faction === 'hostile').forEach((e) => { e.ai = null; e.weapons = []; });
    p.pos = { x: w.pos.x + 120 * window.W, y: w.pos.y + 40 * window.W, z: w.pos.z + 120 * window.W }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.throttle = 0;
  }, victim);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(shots, 'loss-01-wreck.png') });
  const s0 = await page.evaluate(() => window.__SE.world.salvage);
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(500);
  const s1 = await page.evaluate(() => window.__SE.world.salvage);
  check(s1 === s0 + wreck.loot.salvage, `[V] loots the wreck (${s0} → ${s1})`);
  const uid0 = await page.evaluate(() => window.__SE.getPlayer().uid);
  await page.evaluate(() => window.__SE.kill(window.__SE.world.playerId));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(shots, 'loss-02-hull-lost.png') });
  check(await page.evaluate(() => window.__SE.world.wrecks.some((w) => w.player)), 'losing the hull leaves your wreck');
  await page.waitForFunction(() => !window.__SE.getPlayer().dead, null, { timeout: 30000 }).catch(() => {});
  const after = await page.evaluate(() => ({ uid: window.__SE.getPlayer().uid, hull: window.__SE.getPlayer().hullId, dead: window.__SE.getPlayer().dead }));
  check(!after.dead && after.uid !== uid0 && /_starter$/.test(after.hull), `recovery reissues a new starter hull (${JSON.stringify(after)})`);
  check(errors.length === 0, 'loss path has no errors ' + errors.join(' | '));
  await ctx.close();
}
{
  // Phone path: tap LAUNCH, drag the throttle rail, tap LOCK/FIRE.
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url.replace('capture&', ''));
  await page.waitForSelector('[data-newpilot]:not([disabled])', { timeout: 60000 });
  await page.tap('[data-newpilot]');
  await page.tap('[data-launch]');
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => window.__SE.getPlayer().docked)), 'phone: tapping LAUNCH does not dock');
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
{
  // Hull Forge: loads a hull, a slider reshapes it, a node drags, and the JSON validates.
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }); await page.addInitScript((w) => { window.W = w; }, W);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + 'hull-forge.html?hull=techno_angels_battleship');
  await page.waitForFunction(() => window.__FORGE?.blueprint?.id === 'techno_angels_battleship', null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(shots, 'forge-01-loaded.png') });
  await page.$eval('input[data-path="hull.width"]', (el) => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.$eval('input[data-path="sponsons.on"]', (el) => { el.checked = true; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('[data-add-fin]');
  await page.waitForTimeout(800);
  const bp = await page.evaluate(() => window.__FORGE.blueprint);
  check(bp.hull.width === 0.3 && bp.sponsons.on && bp.fins.length >= 1, 'forge sliders and toggles edit the blueprint');
  const valid = await page.textContent('[data-valid]');
  check(valid === 'VALID', `forge JSON validates (${valid})`);
  const json = JSON.parse(await page.inputValue('[data-json]'));
  check(json.schema === 'sovereign.hull/1' && json.nodes.length === bp.nodes.length, 'forge exports sovereign.hull/1 JSON');
  await page.screenshot({ path: join(shots, 'forge-02-edited.png') });
  check(errors.length === 0, 'no runtime errors in the Hull Forge ' + errors.join(' | '));
  await page.close();
}
{
  // Strict page policy like the Claude artifact viewer (no WebAssembly, inline only):
  // the game must still boot clean with its authored models.
  const { readFileSync, writeFileSync } = await import('node:fs');
  const strict = join(root, 'dist', '_strict-csp.html');
  writeFileSync(strict, readFileSync(join(root, 'dist', 'sovereign-eclipse.html'), 'utf8').replace('<meta charset="utf-8">',
    '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:">'));
  const page = await browser.newPage(); await page.addInitScript((w) => { window.W = w; }, W);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto(base + '_strict-csp.html');
  await page.waitForFunction(() => window.__SE?.modelsReady, null, { timeout: 60000 });
  await page.click('[data-newpilot]');
  await page.click('[data-launch]');
  await page.waitForTimeout(2500);
  check(await page.evaluate(() => !!window.__SE.view.views.get(window.__SE.world.playerId)?.mesh.userData.model), 'strict CSP: Blender hull loads');
  check(errs.length === 0 && !(await page.evaluate(() => document.getElementById('fatal'))), 'strict CSP: no errors ' + errs.join(' | '));
  await page.close();
}
await browser.close();
server.close();
try { (await import('node:fs')).unlinkSync(join(root, 'dist', '_strict-csp.html')); } catch {}
if (fail.length) { console.error(`${fail.length} smoke check(s) failed`); process.exit(1); }
console.log('smoke ok');
