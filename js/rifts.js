/* RIFTS (Route 2 · Stage 2 · dungeons). Short, timed, replayable runs.
 * A tear in space sits in one sector of every system (the home system's in its third ring; marked on
 * the star map). Fly into it: five escalating waves in a pocket arena, one modifier for this run, and
 * a timer. Clear the fifth wave before the rift collapses and its cache pays metal and Riftwalker
 * hardware (the full cache once per rift per 30 minutes). If the timer runs out the rift throws you
 * back out with metal for the waves you broke. The modifier changes each 20-minute epoch:
 * - OVERCHARGED: everyone hits 50% harder.   - GLASS: every hull, yours too, is halved.
 * - SPLITTERS: kills split into two drones.   - SHIELDLESS: your shields are down for the run.
 * - VOLATILE: wrecks burst; stay clear of what you kill. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const CFG = { waves: 5, seconds: 150, epochMs: 20 * 60 * 1000, lootEveryMs: 30 * 60 * 1000, reach: 320, volatileReach: 280, volatileShare: 0.08 };
  const MODS = {
    overcharged: { name: 'Overcharged', line: 'everyone hits 50% harder' },
    glass: { name: 'Glass', line: 'every hull is halved, yours too' },
    splitters: { name: 'Splitters', line: 'kills split into two drones' },
    shieldless: { name: 'Shieldless', line: 'your shields are down' },
    volatile: { name: 'Volatile', line: 'wrecks burst; stay clear' }
  };
  let ready = false, rift = null, button = null;
  const doc = () => { const d = saveState.doc; if (!d.rifts || d.rifts.v !== 1) d.rifts = { v: 1, looted: {}, cleared: 0, best: {} }; return d.rifts; };
  const epoch = (now = Date.now()) => Math.floor(now / CFG.epochMs);

  // ---- where ----
  function riftSector(sys) {
    if (!sys) return null;
    if (sys.home) return { gx: -3, gy: 2 };
    const n = (sys.size || 2) + 3, h = hash('rift:' + sys.id);
    return { gx: (h % (2 * n - 1)) - n + 1, gy: ((h >>> 9) % (2 * n - 1)) - n + 1 };
  }
  function here(ch = worldMap.getCurrentChamber()) {
    if (rift || !ch || ch.isHaven || ch.isBossSector || ch.isDiveRoom) return null;
    const s = riftSector(galaxy.current); if (!s || s.gx !== ch.gridX || s.gy !== ch.gridY) return null;
    const h = hash('tear:' + galaxy.currentId), a = (h % 360) * Math.PI / 180, d = (ch.radius || 2600) * 0.5;
    return { key: galaxy.currentId + ':' + ch.gridX + ',' + ch.gridY, x: Math.cos(a) * d, y: Math.sin(a) * d, danger: Math.max(1, ch.dangerLevel || 1) };
  }
  const modFor = key => Object.keys(MODS)[hash(key + ':' + epoch()) % Object.keys(MODS).length];
  const nearTear = () => { const t = here(), P = engine.player; return t && !P.dead && Math.hypot(P.x - t.x, P.y - t.y) < CFG.reach * Math.max(1, (window.roomScale?.shipLength?.() || 200) / 400); };

  // ---- the run ----
  function hostile(x, y, tier, archetype) {
    const e = new EnemyOrganism(x, y, { tier: Math.min(20, tier), archetype });
    try { window.frontierPve?.decorate?.(e); window.combatScaling?.enemy?.(e); window.hostileSkins?.skin?.(e); } catch { }
    e._aggro = true; e.rift = true;
    if (rift.mod === 'glass') { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.5)); e.hp = Math.min(e.hp, e.maxHp); }
    if (rift.mod === 'overcharged' && e.combatScale) e.combatScale.damage *= 1.5;
    return e;
  }
  function wave(k) {
    rift.wave = k; const R = rift.room.radius, n = 3 + k + Math.floor(rift.danger / 5), arch = ['stalker', 'charger', 'sniper', 'hive', 'stalker'];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + k, d = R * 0.78; engine.enemies.push(hostile(Math.cos(a) * d, Math.sin(a) * d, rift.danger + Math.floor(k / 2), arch[(i + k) % arch.length])); }
    garage.banner(`RIFT · ${MODS[rift.mod].name}: ${MODS[rift.mod].line} · wave ${k + 1}/${CFG.waves} · ${Math.ceil(rift.timer / 60)} s`, 'hunt');
  }
  function arena(R) {
    const solids = [], props = [];
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; solids.push({ x: Math.cos(a) * R * 0.42, y: Math.sin(a) * R * 0.42, r: 110 * Math.max(1, R / 1700), kind: 'pylon' }); }
    const B = window.terrain.biomeFor(galaxy.current);
    return { biome: { ...B, gasTint: '188,19,254' }, R, solids, gas: [], lanes: [], decor: [], landmark: null, grid: window.terrain.gridOf(solids), cell: 800, tpl: { rock: [], ice: [] }, id: hash('rift-arena'), props };
  }
  function enter() {
    const t = here(); if (!t || !nearTear() || engine.paused) return false;
    const host = worldMap.getCurrentChamber(), R = Math.max(1700, Math.ceil(3.4 * (window.roomScale?.shipLength?.() || 200) / 100) * 100);
    rift = { key: t.key, danger: t.danger, mod: modFor(t.key), host, hostEnemies: engine.enemies, hostDrops: progression.bubbleDrops, back: { x: t.x, y: t.y + 400 }, timer: CFG.seconds * 60, wave: 0, broken: 0 };
    rift.room = { gridX: host.gridX, gridY: host.gridY, sys: host.sys, sysId: host.sysId, key: 'rift:' + t.key, radius: R, dangerLevel: t.danger, biome: host.biome, musicTheme: 'PRESSURE', isHaven: false, isBossSector: false, isCleared: false, mission: null, isDiveRoom: true, isRift: true, remember() { } };
    rift.room.terrain = arena(R);
    engine.enemies = []; engine.projectiles = []; progression.bubbleDrops = progression.bubbleDrops.filter(d => d.part);
    const P = engine.player; P.x = 0; P.y = 0; P.vx = P.vy = 0; P.iFrames = Math.max(P.iFrames || 0, 60);
    applyMod(); document.body.classList.add('in-rift');
    soundEngine.setMusicState('COMBAT', { force: true }); wave(0); paintButton(); return true;
  }
  function applyMod() { const P = engine.player; if (rift.mod === 'glass') { P.maxHp = Math.max(20, Math.round(P.maxHp * 0.5)); P.hp = Math.min(P.hp, P.maxHp); } if (rift.mod === 'shieldless') { P.maxShield = 0; P.shieldHp = 0; P.shield = 0; } }
  function leave(reason) {
    if (!rift) return false; const r = rift; rift = null; document.body.classList.remove('in-rift');
    const carried = progression.bubbleDrops.filter(x => x.part && !r.hostDrops.includes(x)); carried.forEach((x, i) => { x.x = r.back.x + 160 + i * 60; x.y = r.back.y; });
    engine.enemies = r.hostEnemies.filter(e => e.hp > 0); progression.bubbleDrops = r.hostDrops.concat(carried); engine.projectiles = [];
    engine.recalculatePlayerStats(); const P = engine.player;
    if (reason !== 'death') { P.x = r.back.x; P.y = r.back.y; P.vx = P.vy = 0; P.iFrames = Math.max(P.iFrames || 0, 60); P.hp = Math.min(P.hp, P.maxHp); }
    soundEngine.setMusicState(r.host.musicTheme || 'PRESSURE', { force: true }); paintButton(); return r;
  }
  function finish(won) {
    const r = rift, row = window.tuning.ROWS[Math.min(20, r.danger)], rec = doc();
    if (won) {
      rec.cleared++; rec.best[r.key] = Math.min(rec.best[r.key] || Infinity, Math.round((CFG.seconds * 60 - r.timer) / 60));
      const last = rec.looted[r.key] || 0, full = Date.now() - last > CFG.lootEveryMs;
      if (full) { rec.looted[r.key] = Date.now(); hubs.metal += row.bounty * 3; try { window.derelictLoot?.award?.({ key: r.key, danger: r.danger, record: rec }, 'riftwalker'); } catch (e) { console.warn('rift loot:', e.message); } }
      else hubs.metal += row.bounty;
      garage.banner(full ? `RIFT SEALED · ${row.bounty * 3} metal and Riftwalker hardware` : `RIFT SEALED · ${row.bounty} metal · the cache refills in ${Math.ceil((CFG.lootEveryMs - (Date.now() - last)) / 60000)} min`, 'good');
    } else { const pay = Math.round(row.bounty * 0.5 * r.broken); hubs.metal += pay; garage.banner(`THE RIFT COLLAPSES · ${r.broken}/${CFG.waves} waves broken · ${pay} metal`, 'bad'); }
    saveState.save(); leave('done');
  }
  function tick() {
    if (!rift || engine.paused || engine.mapOpen) return;
    const P = engine.player; if (P.dead) return;
    if (rift.mod === 'shieldless') { P.maxShield = 0; P.shieldHp = 0; P.shield = 0; }
    rift.timer--;
    if (rift.timer <= 0) { finish(false); return; }
    if (!engine.enemies.some(e => e.hp > 0)) { rift.broken = rift.wave + 1; if (rift.broken >= CFG.waves) { finish(true); return; } wave(rift.wave + 1); }
    if (rift.timer % 60 === 0) paintButton();
  }

  // ---- drawing ----
  function drawTear(ctx, cam) {
    const t = here(); if (!t) return; const now = performance.now(), k = Math.max(1, (window.roomScale?.shipLength?.() || 200) / 400);
    ctx.save(); ctx.translate(t.x - cam.x, t.y - cam.y); ctx.rotate(Math.sin(now * 0.0005) * 0.2);
    for (let i = 3; i >= 0; i--) { ctx.strokeStyle = `rgba(${i ? '188,19,254' : '255,255,255'},${0.25 + i * 0.12})`; ctx.lineWidth = (6 + i * 10) * k; ctx.beginPath(); ctx.ellipse(0, 0, (60 + i * 18 + Math.sin(now * 0.004 + i) * 8) * k, (220 + i * 24) * k, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,220,255,.85)'; ctx.font = `600 ${Math.round(13 / Math.max(0.05, engine.camera.zoom))}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('RIFT · ' + MODS[modFor(t.key)].name.toUpperCase(), 0, -320 * k);
    ctx.restore();
  }
  function drawArena(ctx, cam) {
    if (!rift) return; const R = rift.room.radius, now = performance.now();
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R); g.addColorStop(0, 'rgba(40,10,60,.85)'); g.addColorStop(1, 'rgba(90,20,120,.55)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.fill();
    for (const o of rift.room.terrain.solids) { ctx.fillStyle = '#3c2b52'; ctx.strokeStyle = 'rgba(220,150,255,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.stroke(); }
    const share = rift.timer / (CFG.seconds * 60); ctx.strokeStyle = share < 0.25 ? 'rgba(255,80,90,.8)' : 'rgba(220,150,255,.7)'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, -Math.PI / 2, -Math.PI / 2 + TAU * share); ctx.stroke();
    ctx.restore();
  }
  function paintButton() {
    if (!button) return; const near = !rift && saveState.doc.launched && !engine.paused && nearTear();
    button.hidden = !near; if (near) button.textContent = 'Enter the rift · E';
  }

  // ---- install ----
  function install() {
    if (typeof worldMap === 'undefined' || !window.derelicts?.ready || !window.terrain?.ready) { setTimeout(install, 60); return; }
    const get = worldMap.getCurrentChamber.bind(worldMap); worldMap.getCurrentChamber = () => rift ? rift.room : get();
    const portal = worldMap.checkPortalTransition.bind(worldMap);
    worldMap.checkPortalTransition = player => { if (!rift) return portal(player); const R = rift.room.radius * 0.92, d = Math.hypot(player.x, player.y); if (d > R) { player.x *= R / d; player.y *= R / d; player.vx *= -0.3; player.vy *= -0.3; } return false; };
    const membrane = worldMap.drawChamberMembrane.bind(worldMap);
    worldMap.drawChamberMembrane = (ctx, cam) => { if (rift) { try { drawArena(ctx, cam); } catch (e) { console.warn('rift:', e.message); } } membrane(ctx, cam); if (!rift) try { drawTear(ctx, cam); } catch (e) { console.warn('rift:', e.message); } };
    const enterCh = engine.enterChamber.bind(engine); engine.enterChamber = (...a) => { if (rift) leave('death'); return enterCh(...a); };
    const kill = engine.killEnemy;
    engine.killEnemy = function (i) { const e = this.enemies[i], r = kill.call(this, i);
      try { if (rift && e?.rift) { const P = engine.player;
        if (rift.mod === 'splitters' && !e.split) for (const s of [-1, 1]) { const m = hostile(e.x + s * 90, e.y, Math.max(1, rift.danger - 1), 'mote'); m.split = true; this.enemies.push(m); }
        if (rift.mod === 'volatile' && Math.hypot(P.x - e.x, P.y - e.y) < CFG.volatileReach && !(P.iFrames > 0)) { P.hp -= P.maxHp * CFG.volatileShare; engine.damageFlash = 8; if (P.hp <= 0) { P.hp = 0; engine.playerDeath(); } } } } catch (err) { console.warn('rift:', err.message); }
      return r; };
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, m, dmg, ...a) { return fire.call(this, w, m, (dmg ?? 1) * (rift?.mod === 'overcharged' ? 1.5 : 1), ...a); };
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { tick(); if (!rift) paintButton(); } catch (e) { console.warn('rift:', e.message); } return r; };
    button = document.createElement('button'); button.id = 'rift-action'; button.type = 'button'; button.hidden = true; button.onclick = e => { e.stopPropagation(); enter(); };
    for (const ev of ['touchstart', 'mousedown']) button.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    document.body.append(button);
    window.addEventListener('keydown', e => { if (e.code === 'KeyE' && !engine.paused && !rift && nearTear()) { e.preventDefault(); e.stopImmediatePropagation(); enter(); } }, true);
    ready = true;
  }
  window.rifts = { CFG, MODS, riftSector, here, modFor, epoch, enter, leave, nearTear, get active() { return rift; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
