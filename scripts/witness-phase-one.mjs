/* Timing, raster-work and browser-cadence witnesses for the phase-one repair.
 * No downloaded dependencies. Each run uses a fresh browser profile.
 * PHASE=before records the defective baseline; it is expected to exit nonzero.
 * BROWSER=firefox exercises the installed Playwright Firefox, not Mac's profile.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const playwright = await import(process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));
const browserName = process.env.BROWSER || process.argv[3] || 'chromium';
const phase = process.env.PHASE || process.argv[2] || 'after';
const url = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const out = resolve(process.env.EVIDENCE_DIR || `shots/performance-phase-one/${phase}-${browserName}`);
const baselineDir = process.env.BASELINE_DIR || process.argv[4];
mkdirSync(out, { recursive: true });
const report = { phase, browser: browserName, url, baselineDir, checks: [], errors: [] };
const check = (name, ok, detail) => {
  report.checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
};
const stats = values => {
  const a = values.slice().sort((a, b) => a - b);
  if (!a.length) throw new Error('No samples collected');
  return { n: a.length, mean: a.reduce((s, n) => s + n, 0) / a.length,
    p50: a[Math.floor(a.length * 0.5)], p95: a[Math.floor(a.length * 0.95)] };
};

const browser = await playwright[browserName].launch();
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.route('**/*', route => {
    const target = route.request().url();
    if (baselineDir && target.startsWith(new URL(url).origin)) {
      const path = new URL(target).pathname;
      if (/^\/(js\/[^/]+\.js|css\/[^/]+\.css|index\.html)$/.test(path)) {
        const original = resolve(baselineDir, path.slice(1));
        if (existsSync(original)) return route.fulfill({ status: 200,
          contentType: path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html',
          body: readFileSync(original) });
      }
    }
    return target.startsWith(new URL(url).origin) || /^(data|blob):/.test(target)
      ? route.continue() : route.abort();
  });
  await context.addInitScript(() => {
    let seed = 0xB1AC;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) {
      report.errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    let serial = 0;
    const queue = new Map();
    window.requestAnimationFrame = callback => { queue.set(++serial, callback); return serial; };
    window.cancelAnimationFrame = id => queue.delete(id);
    window.__advanceFrame = stamp => {
      const callbacks = Array.from(queue.values());
      queue.clear();
      for (const callback of callbacks) callback(stamp);
    };
  });

  const boot = async () => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.sprites && sprites.ready && window.garage, null, { polling: 50 });
    await page.evaluate(() => {
      document.getElementById('title-callsign').value = 'WITNESS';
      garage.launch(false);
      garage.closeMission();
      engine.paused = false;
      engine.mapOpen = false;
      engine.enemies = [];
      engine.projectiles = [];
      engine.bioMines = [];
      progression.bubbleDrops = [];
      engine.keys = { KeyD: true };
      engine.mouse.down = false;
      engine.player.x = engine.player.y = engine.player.vx = engine.player.vy = 0;
      engine.player.dead = false;
      engine.player.iFrames = 240;
      engine.player.secCooldownTimer = engine.player.maxSecCooldown = 240;
      engine.mouse.x = 1300;
      engine.mouse.y = 384;
      movementFeel.topSpeed = 18;
      movementFeel.damping = 0.88;
      reactor.mode = 'stingers';
      reactor.charge = 100;
      reactor.lockout = 0;
      const projectile = new Projectile(-1200, -1600, 2, 0, { isPlayer: true });
      projectile.life = 240;
      engine.projectiles.push(projectile);
      window.__clockBase = performance.now();
      window.__actualUpdates = 0;
      const update = engine.update.bind(engine);
      engine.update = function (dt) { window.__actualUpdates++; return update(dt); };
      // Exercise the production RAF callback, with drawing suppressed only in
      // the deterministic simulation test. Separate samples below render it.
      engine.render = () => {};
    });
  };

  report.timing = [];
  for (const hz of [30, 60, 144]) {
    await boot();
    const result = await page.evaluate(hz => {
      __advanceFrame(__clockBase);
      for (let i = 1; i <= hz; i++) __advanceFrame(__clockBase + i * 1000 / hz);
      return { hz, x: engine.player.x, vx: engine.player.vx,
        cooldown: engine.player.secCooldownTimer, invincibility: engine.player.iFrames,
        reactor: reactor.charge, projectileX: engine.projectiles[0]?.x,
        projectileLife: engine.projectiles[0]?.life, updates: __actualUpdates };
    }, hz);
    report.timing.push(result);
  }
  const reference = report.timing[1];
  for (const row of report.timing) {
    for (const key of ['x', 'vx', 'cooldown', 'invincibility', 'reactor', 'projectileX', 'projectileLife']) {
      check(`${key} at ${row.hz}Hz matches 60Hz`, Number.isFinite(row[key])
        && Math.abs(row[key] - reference[key]) < 1e-6, { actual: row[key], expected: reference[key] });
    }
    check(`one second at ${row.hz}Hz runs 60 simulation ticks`, row.updates === 60, row.updates);
  }

  await boot();
  const pause = await page.evaluate(() => {
    __advanceFrame(__clockBase);
    __advanceFrame(__clockBase + 1000 / 60);
    const snapshot = () => JSON.stringify([engine.player.x, engine.player.secCooldownTimer,
      reactor.charge, engine.projectiles[0]?.x, __actualUpdates]);
    const before = snapshot();
    engine.paused = true;
    let renders = 0;
    engine.render = () => { renders++; };
    for (let i = 2; i <= 121; i++) __advanceFrame(__clockBase + i * 1000 / 60);
    const after = snapshot();
    const pausedRenders = renders;
    engine.paused = false;
    const ticks = __actualUpdates;
    __advanceFrame(__clockBase + 122 * 1000 / 60);
    return { unchanged: before === after, renders: pausedRenders, resumedTicks: __actualUpdates - ticks };
  });
  check('pause freezes movement, cooldowns, reactor and projectiles', pause.unchanged, pause);
  check('paused battlefield draws once then idles', pause.renders <= 1, pause.renders);
  check('resume does not catch up paused time', pause.resumedTicks === 1, pause.resumedTicks);

  await boot();
  const stall = await page.evaluate(() => {
    __advanceFrame(__clockBase);
    const start = __actualUpdates;
    __advanceFrame(__clockBase + 5000);
    const caughtUp = __actualUpdates - start;
    const next = __actualUpdates;
    __advanceFrame(__clockBase + 5000 + 1000 / 60);
    return { caughtUp, nextTicks: __actualUpdates - next };
  });
  check('a long stall runs at most five catch-up ticks', stall.caughtUp === 5, stall);
  check('stalled time is discarded rather than replayed on later frames', stall.nextTicks === 1, stall);

  await boot();
  const hidden = await page.evaluate(() => {
    __advanceFrame(__clockBase);
    __advanceFrame(__clockBase + 1000 / 60);
    const ticks = __actualUpdates;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    __advanceFrame(__clockBase + 10000);
    const during = __actualUpdates - ticks;
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    __advanceFrame(__clockBase + 20000);
    const resumed = __actualUpdates - ticks;
    return { during, resumed };
  });
  check('hidden tabs do not run simulation or catch up on return', hidden.during === 0 && hidden.resumed === 0, hidden);

  const blockedAbility = await page.evaluate(() => {
    engine.paused = true;
    engine.player.secCooldownTimer = 0;
    engine.triggerSecondaryAbility();
    return engine.player.secCooldownTimer;
  });
  check('combat abilities cannot activate through a paused menu', blockedAbility === 0, blockedAbility);

  const fixture = () => {
    engine.paused = false;
    engine.mapOpen = false;
    for (const id of ['title-overlay', 'mission-card', 'reward-card']) {
      const element = document.getElementById(id);
      if (element) element.style.display = 'none';
    }
    const nodes = [{ dx: 0, dy: 0, radius: 40, type: 'core' }];
    const add = (dx, dy, radius, type) => {
      nodes.push({ dx, dy, radius, type });
      if (dy) nodes.push({ dx, dy: -dy, radius, type });
    };
    for (let i = 0; i < 4; i++) add(60 + i * 38, 46 + i * 6, 16 + i * 4, 'cannon');
    for (let i = 0; i < 3; i++) add(-20 - i * 34, 58 + i * 8, 20, 'pod');
    for (let i = 0; i < 2; i++) add(10 - i * 46, 100, 22, 'shield');
    for (let i = 0; i < 2; i++) add(-120, 24 + i * 40, 14, 'thruster');
    add(150, 0, 30, 'cannon'); add(-150, 0, 18, 'thruster'); add(100, 0, 24, 'cannon');
    engine.applyDesign({ nodes, color: '#00f3ff', primaryWeapon: 'spitter', secAbility: 'shield' });
    Object.assign(engine.player, { x: 0, y: 0, vx: 0, vy: 0, dead: false, iFrames: 0, shootTimer: 0 });
    // Invulnerability must not use iFrames: its blink can remove the capital
    // from the very render workload being measured.
    engine.playerTakeDamage = () => {};
    Object.assign(engine.camera, { zoom: 0.5, targetZoom: 0.5,
      x: -engine.viewportWidth, y: -engine.viewportHeight,
      targetX: -engine.viewportWidth, targetY: -engine.viewportHeight });
    movementFeel.zoom = 0.5;
    engine.keys = {};
    engine.mouse = { x: 1000, y: 384, down: true };
    engine.projectiles = [];
    engine.bioMines = [];
    engine.enemies = [];
    progression.bubbleDrops = [];
    reactor.mode = 'dormant'; reactor.charge = 100; reactor.lockout = 0;
    particleSystem.particles = [];
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI * 2 / 24;
      const distance = 300 + (i % 4) * 100;
      const enemy = new EnemyOrganism(Math.cos(angle) * distance, Math.sin(angle) * distance,
        { tier: 3, archetype: ['mote', 'stalker', 'charger', 'sniper', 'hive'][i % 5] });
      enemy.hp = enemy.maxHp = 100000;
      engine.enemies.push(enemy);
    }
    engine.updateHUD();
    engine.drawMiniRadar();
    hardpoints.sync(engine.player);
    fleet._paint();
    return { nodes: nodes.length, enemies: engine.enemies.length, zoom: engine.camera.zoom };
  };

  // Fresh, frozen fixture: identical geometry across before/after, including
  // readback cost. This is raster work, not a claim about displayed FPS.
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => sprites.ready, null, { polling: 50 });
  report.fixture = await page.evaluate(fixture);
  await page.evaluate(async () => {
    engine.render();
    await Promise.all(Array.from(sprites._img.values()).map(img => img.decode().catch(() => {})));
    engine.render();
  });
  const painted = await page.evaluate(() => {
    let playerDraws = 0;
    const draw = fluidShader.drawOrganismMembrane;
    fluidShader.drawOrganismMembrane = function (...args) {
      if (args[5] === engine.player.nodes) playerDraws++;
      return draw.apply(this, args);
    };
    engine.render();
    fluidShader.drawOrganismMembrane = draw;
    return { playerDraws, nodes: engine.player.nodes.length, paintedParts: sprites._drawn };
  });
  check('26-node capital actually enters the renderer', painted.playerDraws === 1
    && painted.nodes === 26 && painted.paintedParts >= 20, painted);
  if (browserName !== 'firefox') await page.screenshot({ path: `${out}/combat.png` });
  writeFileSync(`${out}/combat-canvas.png`, Buffer.from(await page.evaluate(() =>
    engine.canvas.toDataURL('image/png').split(',')[1]), 'base64'));
  report.raster = [];
  for (const mode of ['full', 'without-enemies', 'without-underlay']) {
    const values = await page.evaluate(mode => {
      const enemies = engine.enemies;
      const underlay = sprites.underlay;
      if (mode === 'without-enemies') engine.enemies = [];
      if (mode === 'without-underlay') sprites.underlay = false;
      const samples = [];
      for (let i = 0; i < 36; i++) {
        const start = performance.now();
        engine.render();
        engine.ctx.getImageData(0, 0, 1, 1);
        engine.lightingCtx.getImageData(0, 0, 1, 1);
        if (i >= 6) samples.push(performance.now() - start);
      }
      engine.enemies = enemies;
      sprites.underlay = underlay;
      return samples;
    }, mode);
    report.raster.push({ mode, ...stats(values) });
  }
  console.log('RASTER', JSON.stringify(report.raster));

  if (!baselineDir) {
    const memory = await page.evaluate(() => {
      const entry = sprites.byType.cannon[0];
      const image = Array.from(sprites._img.values()).find(img => img.complete && img.naturalWidth);
      if (!image) return null;
      for (let i = 0; i < 500; i++) sprites.scaled(entry, image, 40 + (i % 35) * 4, 40 + Math.floor(i / 35) * 4);
      for (let i = 0; i < 160; i++) gradientDisc('#' + (i * 1021).toString(16).padStart(6, '0'), 0.3, 0.4, '#000000');
      return { scaledEntries: sprites._scaled.size, scaledBytes: sprites._scaledBytes,
        gradientEntries: _discCache.size };
    });
    check('fitting 500 sprite sizes retains at most 192 tiles / 16 MiB', memory
      && memory.scaledEntries <= 192 && memory.scaledBytes <= 16 * 1024 * 1024, memory);
    check('160 part colours retain at most 64 gradient discs', memory && memory.gradientEntries <= 64, memory);
  }

  const live = await context.newPage();
  live.on('pageerror', error => report.errors.push(error.message));
  await live.goto(url, { waitUntil: 'load' });
  await live.waitForFunction(() => sprites.ready, null, { polling: 50 });
  await live.evaluate(fixture);
  await live.waitForTimeout(800);
  await live.evaluate(() => {
    window.__samples = { intervals: [], updates: [], renders: [], ticks: 0 };
    const update = engine.update.bind(engine), render = engine.render.bind(engine);
    let previous = 0;
    engine.update = function (dt) {
      const start = performance.now();
      const value = update(dt);
      __samples.updates.push(performance.now() - start);
      __samples.ticks++;
      return value;
    };
    engine.render = function () {
      const start = performance.now();
      if (previous) __samples.intervals.push(start - previous);
      previous = start;
      const value = render();
      __samples.renders.push(performance.now() - start);
      return value;
    };
  });
  await live.waitForTimeout(4000);
  const samples = await live.evaluate(() => ({ ...__samples,
    enemies: engine.enemies.length, projectiles: engine.projectiles.length,
    particles: particleSystem.particles.length, visible: !document.hidden }));
  report.cadence = { intervals: stats(samples.intervals), updateWork: stats(samples.updates),
    renderWork: stats(samples.renders), ticks: samples.ticks,
    enemies: samples.enemies, projectiles: samples.projectiles, particles: samples.particles,
    visible: samples.visible };
  check('live combat samples are nonempty and retain 24 enemies',
    samples.intervals.length >= 30 && samples.enemies === 24 && samples.visible, report.cadence);
  if (browserName !== 'firefox') await live.screenshot({ path: `${out}/live-combat.png` });
  // Distinguish JS/raster work from browser composition of the moving canvas
  // through frosted HUD panels. This override is confined to this test page.
  await live.addStyleTag({ content: '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }' });
  await live.evaluate(() => {
    __samples.intervals.length = 0; __samples.updates.length = 0; __samples.renders.length = 0; __samples.ticks = 0;
  });
  await live.waitForTimeout(2500);
  const plain = await live.evaluate(() => __samples);
  report.withoutBackdropBlur = { intervals: stats(plain.intervals), updateWork: stats(plain.updates),
    renderWork: stats(plain.renders), ticks: plain.ticks };
  console.log('WITHOUT BACKDROP BLUR', JSON.stringify(report.withoutBackdropBlur));
  report.targets = { rasterP95Ms: 16.7, rasterMet: report.raster[0].p95 < 16.7,
    cadenceP95Ms: 20, cadenceMet: report.cadence.intervals.p95 <= 20 };
  await live.close();

  check('no application errors', report.errors.length === 0, report.errors);
} catch (error) {
  report.errors.push(error.stack || error.message);
  check('witness completed', false, error.message);
  throw error;
} finally {
  await browser.close();
  report.passed = report.checks.filter(c => c.ok).length;
  report.failed = report.checks.filter(c => !c.ok).length;
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(`RESULT ${report.passed} passed / ${report.failed} failed; ${out}/report.json`);
process.exitCode = report.failed ? 1 : 0;
