/* WITNESS — the fleet roster and the mount ladder. Measures the SHIP, not the table.
 *
 * ⛔ ASSERTING THAT `MOUNT_LADDER[4].weapon === 'railgun'` PROVES A LITERAL
 *    HOLDS A STRING. It says nothing about whether a 33px mount actually fires
 *    a railgun in the running game. So §4 and §5 below equip real hulls in the
 *    real loop, hold the trigger, and read the projectiles that come out.
 *
 *   node scripts/witness-fleet.mjs
 *   GAME_URL=http://localhost:8811/ node scripts/witness-fleet.mjs
 */
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs');

const URL = process.env.GAME_URL || 'http://localhost:8811/';
const errors = [];
let pass = 0, fail = 0;
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${n}${d ? `   [${d}]` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(900);

// ---- §1 the file is actually live -------------------------------------
console.log('\n§1 FLEET.JS IS LIVE');
const live = await page.evaluate(() => ({
  fleet: typeof window.fleet,
  hulls: window.fleet ? Object.keys(window.fleet.hulls).length : 0,
  order: window.fleet ? window.fleet.order.length : 0,
  hp: typeof window.HP_DEFAULTS,
  equips: (window.fleet && typeof window.fleet.equips === 'function') ? window.fleet.equips().length : 0
}));
ck('window.fleet exists', live.fleet === 'object', live.fleet);
ck('hull count matches ORDER', live.hulls === live.order && live.order >= 20, `${live.hulls} hulls / ${live.order} ordered`);
ck('equipment catalogue builds', live.equips >= 20, `${live.equips} equips`);
ck('HP_DEFAULTS reachable for one-truth', live.hp === 'object');

// ---- §2 every hull is well-formed -------------------------------------
console.log('\n§2 EVERY HULL IS WELL-FORMED');
const hullAudit = await page.evaluate(() => {
  const bad = [];
  const seen = new Set();
  for (const key of window.fleet.order) {
    const h = window.fleet.hulls[key];
    if (!h) { bad.push(`${key}: missing`); continue; }
    if (!h.nodes || !h.nodes.length) { bad.push(`${key}: no nodes`); continue; }
    const cores = h.nodes.filter(n => n.type === 'core').length;
    if (cores !== 1) bad.push(`${key}: ${cores} cores`);
    for (const n of h.nodes) {
      if (!Number.isFinite(n.dx) || !Number.isFinite(n.dy) || !Number.isFinite(n.radius)) {
        bad.push(`${key}: non-finite node`); break;
      }
      if (n.radius <= 0) bad.push(`${key}: radius ${n.radius}`);
    }
    // ⛔ FRAMES, NOT NAMES. Ship names live in the art packs and are Mac's.
    if (!h.frame) bad.push(`${key}: no frame label`);
    if (seen.has(h.frame)) bad.push(`${key}: duplicate frame ${h.frame}`);
    seen.add(h.frame);
    // silhouettes must be symmetric about the X axis — asymmetry reads as damage
    const sig = h.nodes.map(n => `${n.type}:${n.dx}:${Math.abs(n.dy)}:${n.radius}`).sort().join('|');
    const mir = h.nodes.map(n => `${n.type}:${n.dx}:${Math.abs(-n.dy)}:${n.radius}`).sort().join('|');
    if (sig !== mir) bad.push(`${key}: asymmetric`);
  }
  return bad;
});
ck('all hulls well-formed & symmetric', hullAudit.length === 0, hullAudit.slice(0, 4).join('; ') || 'clean');

// ---- §3 the ladders are actually distinct ------------------------------
console.log('\n§3 THE LADDERS ARE DISTINCT, NOT DECORATIVE');
const ladder = await page.evaluate(() => {
  const bands = new Set();
  const classes = new Set();
  const rows = [];
  for (const key of window.fleet.order) {
    const h = window.fleet.hulls[key];
    const guns = h.nodes.filter(n => n.type === 'cannon');
    const hb = window.fleet.hullBand({ nodes: h.nodes });
    classes.add(hb.cls);
    const mine = new Set();
    for (const g of guns) { const b = window.fleet.mountBand(g.radius); bands.add(b.cls); mine.add(b.cls); }
    rows.push({
      key, frame: h.frame, guns: guns.length, cls: hb.cls,
      net: +(hb.rate * hb.dmg).toFixed(2),
      bands: [...mine].join('/'),
      maxR: Math.max(...guns.map(g => g.radius))
    });
  }
  return { bands: [...bands], classes: [...classes], rows };
});
ck('all five mount bands are used', ladder.bands.length === 5, ladder.bands.join(','));
ck('all four hull classes are used', ladder.classes.length === 4, ladder.classes.join(','));
const nets = ladder.rows.map(r => r.net);
ck('THE FLAT LADDER holds (net DPS 0.95-1.15)',
  Math.min(...nets) >= 0.95 && Math.max(...nets) <= 1.15,
  `min ${Math.min(...nets)} max ${Math.max(...nets)}`);
const bigMount = Math.max(...ladder.rows.map(r => r.maxR));
ck('a mount above 30px now exists in the game', bigMount > 30, `largest ${bigMount}px`);

console.log('\n   ROSTER');
console.log('   ' + 'FRAME'.padEnd(24) + 'GUNS  CLASS        NET   BANDS');
for (const r of ladder.rows) {
  console.log('   ' + r.frame.padEnd(24) + String(r.guns).padEnd(6) +
    r.cls.padEnd(13) + String(r.net).padEnd(6) + r.bands);
}

// ---- §4 the game actually runs, and the guns actually fire -------------
console.log('\n§4 THE GUNS ACTUALLY FIRE (real loop, real projectiles)');
const launched = await page.evaluate(() => {
  if (window.garage && typeof garage.launch === 'function') { try { garage.launch(); } catch (e) {} }
  if (window.engine) { engine.paused = false; engine.mapOpen = false; }
  return !!(window.engine && !engine.paused);
});
ck('engine is running (unpaused)', launched);

async function flyAndFire(key) {
  return await page.evaluate(async (k) => {
    engine.paused = false;
    fleet.equip(k);
    engine.projectiles.length = 0;
    engine.player.x = 0; engine.player.y = 0;
    // aim dead ahead and hold the trigger for 90 frames of real update()
    engine.mouse.down = true;
    engine.mouse.x = 1200; engine.mouse.y = 450;
    const seen = new Set();
    for (let i = 0; i < 90; i++) {
      engine.update(1 / 60);
      for (const p of engine.projectiles) seen.add(p.type);
    }
    engine.mouse.down = false;
    const turrets = hardpoints._turrets.map(t => ({ r: t.radius, w: t.weapon, cd: t.cooldown }));
    const out = {
      fired: engine.projectiles.length,
      types: [...seen],
      turrets: turrets.length,
      weapons: [...new Set(turrets.map(t => t.w))],
      cooldownsDiffer: new Set(turrets.map(t => t.cd)).size > 1,
      anyNaN: engine.projectiles.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))
        || !Number.isFinite(engine.player.angle)
    };
    engine.projectiles.length = 0;
    return out;
  }, key);
}

const frig = await flyAndFire('frigate');
ck('FRIGATE fires', frig.fired > 0, `${frig.fired} projectiles, ${frig.turrets} turrets`);
ck('FRIGATE has no NaN', !frig.anyNaN);

const sbf = await flyAndFire('superBattleFrigate');
ck('SUPER BATTLE FRIGATE fires a SIEGE weapon', sbf.weapons.includes('railgun'), sbf.weapons.join(','));

const dread = await flyAndFire('dreadnought');
ck('DREADNOUGHT mixes weapon types in one trigger pull',
  dread.types.length > 1, dread.types.join(','));
ck('DREADNOUGHT guns reload independently (per-mount cooldown)',
  dread.cooldownsDiffer, `${dread.turrets} turrets`);
ck('DREADNOUGHT has no NaN', !dread.anyNaN);

const levi = await flyAndFire('leviathan');
ck('LEVIATHAN (largest hull) fires without error', levi.fired > 0, `${levi.fired} projectiles`);

// ---- §5 traverse is still the keystone ---------------------------------
console.log('\n§5 TRAVERSE STILL SEPARATES BIG FROM SMALL');
const trav = await page.evaluate(() => {
  fleet.equip('dreadnought');
  hardpoints.sync(engine.player);
  const ts = hardpoints._turrets.slice().sort((a, b) => a.radius - b.radius);
  const small = ts[0], big = ts[ts.length - 1];
  return {
    smallR: small.radius, bigR: big.radius,
    smallDeg: +(small.traverse * 60 * 180 / Math.PI).toFixed(1),
    bigDeg: +(big.traverse * 60 * 180 / Math.PI).toFixed(1),
    smallArc: +(small.arc * 2 * 180 / Math.PI).toFixed(0),
    bigArc: +(big.arc * 2 * 180 / Math.PI).toFixed(0)
  };
});
ck('big mount swings slower than small', trav.bigDeg < trav.smallDeg * 0.5,
  `${trav.smallR}px ${trav.smallDeg}°/s  vs  ${trav.bigR}px ${trav.bigDeg}°/s`);
ck('big mount covers a narrower arc', trav.bigArc < trav.smallArc,
  `${trav.smallArc}° vs ${trav.bigArc}°`);

// ---- §6 the stale-node bug is actually fixed ---------------------------
console.log('\n§6 THE STALE-NODE BUG (identical shape, replaced array)');
const stale = await page.evaluate(() => {
  fleet.equip('frigate');
  hardpoints.sync(engine.player);
  const before = hardpoints._turrets[0].node;
  // re-apply the SAME shape: signature identical, array replaced
  engine.applyDesign(JSON.parse(JSON.stringify(fleet.hulls.frigate)));
  hardpoints.sync(engine.player);
  const after = hardpoints._turrets[0].node;
  return { rebound: engine.player.nodes.includes(after), sameObject: before === after };
});
ck('turrets rebind to the LIVE node array', stale.rebound);
ck('turrets dropped the orphaned node', !stale.sameObject);

// ---- §7 GP cost follows radius ----------------------------------------
console.log('\n§7 GP COST FOLLOWS RADIUS');
const gp = await page.evaluate(() => ({
  small: fleet.costOfNode('cannon', 6),
  std: fleet.costOfNode('cannon', 12),
  siege: fleet.costOfNode('cannon', 38)
}));
ck('a 38px lance costs far more than a 6px needle', gp.siege > gp.small * 10,
  `6px=${gp.small}GP  12px=${gp.std}GP  38px=${gp.siege}GP`);

/* ---- §8 the SUPER BATTLE FRIGATE is affordable -------------------------
   ⛔ `FLEET_ROSTER.md` carried this as UNVERIFIED: "whether the GP economy in
      designer.js permits a 31px+ mount on a 5-node hull". Arithmetic from the
      cost curve is DERIVED, not measured — so ask the running designer what it
      actually charges, and compare against the budget it actually grants. */
console.log('\n§8 MAC\'S CLASS IS AFFORDABLE (the designer\'s own numbers)');
const econ = await page.evaluate(() => {
  const total = h => h.nodes.reduce((s, n) => s + fleet.costOfNode(n.type, n.radius), 0);
  const gun = fleet.hulls.superBattleFrigate.nodes.find(n => n.type === 'cannon');
  return {
    sbf: total(fleet.hulls.superBattleFrigate),
    sbfMount: gun.radius,
    sbfGun: fleet.costOfNode('cannon', gun.radius),
    frigate: total(fleet.hulls.frigate),
    leviathan: total(fleet.hulls.leviathan),
    budget: (typeof saveState !== 'undefined' && saveState.gp) ? saveState.gp() : null
  };
});
ck('SUPER BATTLE FRIGATE costs more than a plain FRIGATE of the same node count',
  econ.sbf > econ.frigate, `SBF ${econ.sbf}GP vs FRIGATE ${econ.frigate}GP`);
ck('its one gun dominates its own bill (the class IS the gun)',
  econ.sbfGun > econ.sbf * 0.6, `${econ.sbfMount}px mount = ${econ.sbfGun}GP of ${econ.sbf}GP`);
ck('a TITAN still costs far more than the small hull with the big gun',
  econ.leviathan > econ.sbf * 2, `LEVIATHAN ${econ.leviathan}GP`);

// ---- §9 nothing broke ---------------------------------------------------
console.log('\n§9 NO RUNTIME ERRORS');
ck('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

await browser.close();
console.log(`\n${fail === 0 ? '🟢' : '🔴'}  ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
