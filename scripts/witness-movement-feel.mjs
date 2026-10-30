/* WITNESS — movement feel. Measures the SHIP, not the constants.
 *
 * The point of this file is the ramp test in §4. Asserting that
 * `movementFeel.accel === 1.15` proves a variable holds a number; it says
 * nothing about whether engine.js reads it. So §4 holds a key down in the
 * real game loop and counts the frames the ship actually takes to reach 95%
 * of terminal velocity, then checks that against the arithmetic.
 *
 *   node scripts/witness-movement-feel.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || ((await import('node:fs')).existsSync('/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs') ? '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs' : 'playwright'));

const URL = process.env.GAME_URL || 'http://localhost:8082/';
const errors = [];
let pass = 0, fail = 0;
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${n}${d ? `   [${d}]` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('\n=== 1. THE FILE LOADED AND OWNS ITS STATE ===');
const base = await page.evaluate(() => {
  if (typeof movementFeel === 'undefined') return { missing: true };
  return {
    missing: false,
    accel: movementFeel.accel,
    topSpeed: movementFeel.topSpeed,
    damping: movementFeel.damping,
    terminal: movementFeel.terminal(),
    ramp: movementFeel.rampFrames(),
    cross: movementFeel.screenCrossMs(),
  };
});
ck('movementFeel exists', !base.missing);
if (base.missing) { console.log('\nFATAL — feel.js did not load.'); await browser.close(); process.exit(1); }
ck('default TOP SPEED is 18 px/frame', Math.abs(base.topSpeed - 18) < 1e-9, String(base.topSpeed));
ck('default damping is 0.88', Math.abs(base.damping - 0.88) < 1e-9, String(base.damping));
// accel is DERIVED now: topSpeed*(1-d)/d = 18*0.12/0.88
ck('accel is derived, not stored', Math.abs(base.accel - 2.4545) < 0.001, base.accel.toFixed(4));
ck('terminal == the dialled top speed', Math.abs(base.terminal - 18) < 1e-9, base.terminal.toFixed(3));
ck('screen crossed in ~1.2s (was 2.1s)', Math.abs(base.cross - 1185) < 40, base.cross + 'ms');
ck('ramp ≈ 23 frames (was 41)', Math.round(base.ramp) === 23, base.ramp.toFixed(1));

console.log('\n=== 2. THE DIAL MOVES AND PERSISTS ===');
errors.length = 0;
/* The callsign field is focused on the title screen, and feel.js deliberately
   ignores keys while an input has focus. Click the canvas first — that is
   what a player does before they start steering, and without it this section
   measures the guard rather than the dial. */
await page.locator('canvas').first().click({ force: true, position: { x: 20, y: 20 } });
await page.keyboard.press('Equal');
await page.keyboard.press('Equal');
const up = await page.evaluate(() => ({
  accel: movementFeel.topSpeed,
  stored: JSON.parse(localStorage.getItem('biotank_forge_feel') || '{}'),
}));
ck('"=" raised TOP SPEED by 2 steps', Math.abs(up.accel - 20) < 1e-9, String(up.accel));
ck('the change PERSISTED to localStorage', Math.abs(up.stored.topSpeed - up.accel) < 1e-9,
   `stored=${up.stored.topSpeed}`);
await page.keyboard.press('Quote');
const damp = await page.evaluate(() => movementFeel.damping);
ck("\"'\" raised damping by 1 step", Math.abs(damp - 0.89) < 1e-9, String(damp));
ck('no float dust in the value', String(damp).length <= 5, String(damp));

await page.keyboard.press('Digit0');
const reset = await page.evaluate(() => ({ a: movementFeel.topSpeed, d: movementFeel.damping }));
ck('"0" resets both to default', Math.abs(reset.a - 18) < 1e-9 && Math.abs(reset.d - 0.88) < 1e-9,
   `${reset.a} / ${reset.d}`);

console.log('\n=== 3. THE BOUNDS HOLD (damping 1.0 = a ship that never stops) ===');
const clamped = await page.evaluate(() => {
  for (let i = 0; i < 40; i++) movementFeel.nudge('damping', +1);
  const hi = movementFeel.damping;
  for (let i = 0; i < 60; i++) movementFeel.nudge('damping', -1);
  const lo = movementFeel.damping;
  movementFeel.reset();
  return { hi, lo };
});
ck('damping cannot reach 1.0', clamped.hi <= 0.98 + 1e-9, `max reached ${clamped.hi.toFixed(2)}`);
ck('damping cannot go below 0.70', clamped.lo >= 0.70 - 1e-9, `min reached ${clamped.lo.toFixed(2)}`);
const corrupt = await page.evaluate(() => {
  localStorage.setItem('biotank_forge_feel', '{ this is not json');
  const m = new MovementFeel();
  const r = { a: m.topSpeed, d: m.damping };
  movementFeel.save();   // put a valid value back
  return r;
});
ck('corrupt localStorage falls back to defaults, does not brick movement',
   Math.abs(corrupt.a - 18) < 1e-9 && Math.abs(corrupt.d - 0.88) < 1e-9,
   `${corrupt.a} / ${corrupt.d}`);

console.log('\n=== 4. THE SHIP ITSELF — does engine.js actually READ this? ===');
/* This is the check that matters. Everything above passes even if engine.js
   still has 0.75/0.93 hardcoded. */
const ramp = await page.evaluate(async () => {
  if (typeof engine === 'undefined') return { noEngine: true };

  // Reach a playing state. The title screen does not step the player.
  // A new pilot needs a callsign before launch; the mission card then pauses the sim.
  try {
    const cs = document.getElementById('title-callsign'); if (cs) cs.value = 'FEEL';
    if (typeof garage !== 'undefined' && garage.launch) garage.launch(false);
    if (garage.closeMission) garage.closeMission();
    engine.paused = false; engine.player.iFrames = 1e9;
  } catch (e) {}
  await new Promise(r => setTimeout(r, 800));
  if (!engine.player) return { noPlayer: true };

  /* Count SIMULATION steps, not render frames: the sim runs on a fixed 60 Hz step and
     a headless render loop can deliver several steps per frame (or none). */
  const measure = (topSpeed, damping) => new Promise(resolve => {
    movementFeel.topSpeed = topSpeed;
    movementFeel.damping = damping;
    const terminal = topSpeed, update = engine.update;
    engine.keys['KeyA'] = false; engine.keys['KeyW'] = false; engine.keys['KeyS'] = false;
    let frames = 0, hit = null, peak = 0, started = false;
    engine.update = function (...a) {
      if (!started) { started = true; engine.player.vx = 0; engine.player.vy = 0; engine.keys['KeyD'] = true; }
      const r = update.apply(this, a);
      frames++;
      const v = Math.abs(engine.player.vx);
      if (v > peak) peak = v;
      if (hit === null && v >= terminal * 0.95) hit = frames;
      if (frames >= 140) { engine.update = update; engine.keys['KeyD'] = false; resolve({ hit, peak, terminal }); }
      return r;
    };
  });

  const fast = await measure(18, 0.88);      // the new defaults
  const slow = await measure(9.96, 0.93);   // the ORIGINAL hardcoded feel
  movementFeel.reset();
  return { fast, slow };
});

if (ramp.noEngine) ck('engine global reachable', false, 'no `engine`');
else if (ramp.noPlayer) ck('reached a playing state', false, 'engine.player missing — could not launch');
else {
  ck('the ship REACHES the predicted top speed (new)',
     Math.abs(ramp.fast.peak - ramp.fast.terminal) / ramp.fast.terminal < 0.06,
     `peak ${ramp.fast.peak.toFixed(2)} vs predicted ${ramp.fast.terminal.toFixed(2)}`);
  ck('measured ramp matches the arithmetic (~23 frames)',
     ramp.fast.hit !== null && Math.abs(ramp.fast.hit - 23) <= 4,
     `${ramp.fast.hit} frames`);
  ck('OLD numbers really were ~41 frames',
     ramp.slow.hit !== null && Math.abs(ramp.slow.hit - 41) <= 5,
     `${ramp.slow.hit} frames`);
  ck('THE SHIP IS MEASURABLY MORE RESPONSIVE',
     ramp.fast.hit !== null && ramp.slow.hit !== null && ramp.fast.hit < ramp.slow.hit * 0.7,
     `${ramp.slow.hit} -> ${ramp.fast.hit} frames  (${Math.round((1 - ramp.fast.hit / ramp.slow.hit) * 100)}% faster)`);
}

console.log('\n=== 5. NOTHING BROKE ===');
ck('no page errors across the whole run', errors.length === 0,
   errors[0]?.slice(0, 120) || 'clean');

console.log(`\n${'='.repeat(60)}\n${pass}/${pass + fail} passed`);
if (errors.length) {
  console.log('PAGE ERRORS:');
  [...new Set(errors)].slice(0, 5).forEach(e => console.log('  ✘ ' + e.slice(0, 200)));
}
await browser.close();
process.exit(fail ? 1 : 0);
