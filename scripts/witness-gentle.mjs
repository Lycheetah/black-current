/* F2 witness: a bot plays 3 simulated minutes in each test sector and reports
 * deaths, damage taken and kills, so "the start is too hard" is a number.
 * node scripts/witness-gentle.mjs [chromium|firefox] [--report]   (--report: print only, no pass/fail)
 * The bot aims at the nearest hostile, holds fire, kites at ~380 px and hunts
 * toward the nearest contact when nothing is close. It is a mediocre pilot on purpose. */
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium, firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browserName = process.argv[2] || 'chromium';
const reportOnly = process.argv.includes('--report');
const URL = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const out = `shots/gentle/${browserName}`; mkdirSync(out, { recursive: true });
const b = await ({ chromium, firefox })[browserName].launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
await page.waitForFunction(() => window.engine && window.garage && window.hunt);
await page.evaluate(() => { document.getElementById('title-callsign').value = 'BOT'; garage.launch(false); garage.closeMission(); });

const SECONDS = 180;
async function play(gx, gy, seed) {
  return page.evaluate(({ gx, gy, SECONDS, seed }) => {
    let s = seed; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);   // same dice every run
    garage.showReward = () => {}; garage.showMission = () => {}; engine.offerAiCore = () => {};
    const stats = { deaths: 0, dmg: 0, kills: 0, maxEnemies: 0, wings: 0 };
    const baseDeath = engine.playerDeath.bind(engine);
    engine.playerDeath = () => { stats.deaths++; baseDeath(); };
    const baseKill = engine.killEnemy; engine.killEnemy = (i) => { stats.kills++; return baseKill(i); };
    const place = () => {
      worldMap.currentGridX = gx; worldMap.currentGridY = gy;
      engine.player.x = (gx || gy) ? -1900 : 0; engine.player.y = 0; engine.player.vx = engine.player.vy = 0;
      engine.enterChamber({ silent: true });
    };
    const baseRespawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = () => { baseRespawn(); place(); };
    progression.totalMass = 0;
    saveState.doc.chambers = {}; worldMap.initMatrix();   // every run starts on a fresh map
    place();
    /* A HUMAN-ISH PILOT: decides every 14 frames (~230 ms reaction), aims where the
       target WAS with a wobble, and only strafes half the time. */
    const seen = []; let move = { ax: 0, ay: 0 }, tick = 0;
    engine.readInput = () => {
      const p = engine.player; let near = null, d = 1e9;
      for (const e of engine.enemies) { const k = Math.hypot(e.x - p.x, e.y - p.y); if (k < d) { d = k; near = e; } }
      seen.push(near ? { x: near.x, y: near.y } : null); if (seen.length > 14) seen.shift();
      if (tick++ % 14 === 0) {
        move = { ax: 0, ay: 0 };
        if (near) {
          const ux = (near.x - p.x) / d, uy = (near.y - p.y) / d;
          if (d < 300) { move.ax = -ux; move.ay = -uy; } else if (d > 520) { move.ax = ux; move.ay = uy; }
          if (Math.random() < 0.5) { const side = Math.random() < 0.5 ? 1 : -1; move.ax += -uy * 0.7 * side; move.ay += ux * 0.7 * side; }
        }
      }
      /* stay in the test sector: steer home before the portal ring */
      const r = Math.hypot(p.x, p.y);
      if (r > 2050) { move = { ax: -p.x / r, ay: -p.y / r }; }
      const old = seen[0], w = Math.sin(tick * 0.09) * 60;
      return (engine.input = { ax: move.ax, ay: move.ay, aimX: old ? old.x + w : p.x + 100, aimY: old ? old.y - w : p.y,
        fire: !!near && d < 800, ability: false });
    };
    const baseTake = engine.playerTakeDamage.bind(engine);
    engine.playerTakeDamage = (amount, source, node) => {
      if (!(engine.player.iFrames > 0 || engine.player.dead)) stats.dmg += amount * (typeof reactor !== 'undefined' ? reactor.damageTakenScale() : 1);
      return baseTake(amount, source, node);
    };
    for (let t = 0; t < SECONDS * 60; t++) {
      engine.paused = false; engine.mapOpen = false;
      engine.update(1000 / 60);
      if (!engine.player.dead && (worldMap.currentGridX !== gx || worldMap.currentGridY !== gy)) place();
      stats.maxEnemies = Math.max(stats.maxEnemies, engine.enemies.length);
    }
    engine.playerDeath = baseDeath; engine.killEnemy = baseKill; engine.playerRespawn = baseRespawn; engine.playerTakeDamage = baseTake;
    stats.dmgPerMin = Math.round(stats.dmg / (SECONDS / 60));
    stats.danger = worldMap.chambers[`${gx},${gy}`].dangerLevel;
    return stats;
  }, { gx, gy, SECONDS, seed });
}

const R = {};
for (const [gx, gy] of [[0, 0], [1, 0], [1, 1], [2, 0], [2, 2]]) {
  const runs = [];
  for (const seed of [7, 1234, 98765]) runs.push(await play(gx, gy, seed));
  const avg = k => Math.round(runs.reduce((a, r) => a + r[k], 0) / runs.length * 10) / 10;
  R[`${gx},${gy}`] = { danger: runs[0].danger, deaths: avg('deaths'), dmgPerMin: avg('dmgPerMin'), kills: avg('kills'), maxEnemies: avg('maxEnemies') };
  console.log(`sector ${gx},${gy} danger ${runs[0].danger}:`, JSON.stringify(R[`${gx},${gy}`]));
}
writeFileSync(`${out}/report.json`, JSON.stringify({ R, errors }, null, 1));
if (reportOnly) { await b.close(); process.exit(0); }
let pass = 0, fail = 0;
const check = (name, ok, v) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + JSON.stringify(v)}`); ok ? pass++ : fail++; };
check('home: the bot never dies in 3 minutes', R['0,0'].deaths === 0, R['0,0']);
check('ring 1 straight (1,0) is danger 1 and the bot never dies', R['1,0'].danger === 1 && R['1,0'].deaths === 0, R['1,0']);
check('ring 1 diagonal (1,1) is danger 1 and the bot never dies', R['1,1'].danger === 1 && R['1,1'].deaths === 0, R['1,1']);
check('danger climbs: ring 2 (2,0) hurts more than ring 1 (1,0)', R['2,0'].dmgPerMin > R['1,0'].dmgPerMin * 1.5, [R['1,0'], R['2,0']]);
check('danger 4 is still a real fight (bot takes 300+ dmg/min)', R['2,2'].dmgPerMin >= 300, R['2,2']);
check('no page errors', errors.length === 0, errors);
console.log(`RESULT ${pass} passed / ${fail} failed`);
await b.close(); process.exit(fail ? 1 : 0);
