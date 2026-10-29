/* DERELICT DIVES (Route 2 · Stage 2 · dungeons).
 * Dead titans drift in the wide dark (terrain.js landmarks; two more are seeded per system, one in the
 * home system's second ring). Fly to one and board it: a chain of themed rooms inside the hull,
 * each with walls and its own rule, then the warden, then the hold.
 * - CORRIDOR: a walled run past turrets in their alcoves.
 * - HANGAR: two launch bays keep putting out drones until you break them.
 * - REACTOR: the core pulses every few seconds; only a wall or pillar between you and it keeps you safe.
 * - VAULT: three locks are sealed until their guards fall; break the locks to open the door.
 * - WARDEN: the derelict's last guardian calls escorts at two-thirds and one-third hull.
 * The door opens when a room is clear; fly through it. The hold pays a gun of the derelict's class with
 * a relic trait and metal (the full haul once per derelict per 30 minutes). Leaving early, or dying,
 * puts you back beside the hull. Rooms are a stand-in chamber (worldMap.getCurrentChamber) with their
 * own terrain; the sector you boarded from is untouched underneath. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const CFG = { lootEveryMs: 30 * 60 * 1000, pulseEvery: 7 * 60, pulseWarn: 100, pulseShare: 0.18, bayEvery: 4 * 60, bayMax: 6, doorReach: 300, boardReach: 1.15 };
  const THEMES = {
    corridor: { name: 'Corridor', hint: 'Run the corridor past the turrets' },
    hangar: { name: 'Hangar', hint: 'Break both launch bays' },
    reactor: { name: 'Reactor', hint: 'Keep a wall between you and the core when it pulses' },
    vault: { name: 'Vault', hint: 'The locks are sealed until their guards fall' },
    warden: { name: 'Warden', hint: 'Break the warden' }
  };
  let ready = false, dive = null, button = null;
  const doc = () => { const d = saveState.doc; if (!d.dives || d.dives.v !== 1) d.dives = { v: 1, looted: {}, cleared: 0 }; return d.dives; };

  // ---- where derelicts are ----
  function forced(sys, ch) {
    if (!sys || ch.isHaven || ch.isBossSector) return false;
    const ring = Math.max(Math.abs(ch.gridX), Math.abs(ch.gridY));
    if (sys.home) return ch.gridX === 2 && ch.gridY === -2;
    if (ring < 2) return false;
    const n = (sys.size || 2) + 3, h = hash('derelict:' + sys.id);
    const at = i => { const k = hash(sys.id + ':d' + i + ':' + h); return [(k % (2 * n - 1)) - n + 1, ((k >>> 8) % (2 * n - 1)) - n + 1]; };
    return [at(0), at(1)].some(([x, y]) => x === ch.gridX && y === ch.gridY);
  }
  const keyOf = ch => galaxy.currentId + ':' + ch.gridX + ',' + ch.gridY;
  function entrance() {
    if (dive) return null;
    const f = window.terrain?.current?.(), L = f?.landmark;
    return L?.kind === 'titan' ? L : null;
  }
  function nameFor(key) {
    const all = Object.values(window.canon?.hulls || {}).flat().filter(h => /Titan|Dreadnought|Battleship/.test(h.cls));
    return all.length ? all[hash(key) % all.length].name : 'Unnamed hulk';
  }
  const nearEntrance = () => { const L = entrance(), P = engine.player; return L && !P.dead && Math.hypot(P.x - L.x, P.y - L.y) < L.r * CFG.boardReach * (L.scale || 1); };

  // ---- rooms ----
  function plan(key, danger) {
    const rand = rng(hash('dive:' + key)), n = Math.min(6, 2 + Math.floor(danger / 4)), pool = ['corridor', 'hangar', 'reactor', 'vault'], rooms = [];
    for (let i = 0; i < n; i++) rooms.push(pool[Math.floor(rand() * pool.length)]);
    rooms.push('warden');
    return rooms;
  }
  function roomRadius() { return Math.max(1500, Math.ceil(3.2 * (window.roomScale?.shipLength?.() || 200) / 100) * 100); }
  function plate(solids, x1, y1, x2, y2, thick) {
    const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), r = thick / 2;
    solids.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, r: len / 2, kind: 'wreck', w: len, h: thick, rot: a, ghost: true });
    for (let d = 0; d <= len; d += r * 1.2) solids.push({ x: x1 + Math.cos(a) * d, y: y1 + Math.sin(a) * d, r, kind: 'hull' });
  }
  function build(theme, R, danger, index, total, rand) {
    const solids = [], props = [], s = R / 1500;
    // the hull you are inside: plates around the rim, leaving the hatch and the door clear
    for (let i = 0; i < 24; i++) { const a0 = i * TAU / 24 + 0.02, a1 = (i + 1) * TAU / 24 - 0.02, mid = (a0 + a1) / 2; if (Math.abs(Math.cos(mid)) > 0.97) continue;
      plate(solids, Math.cos(a0) * R * 0.93, Math.sin(a0) * R * 0.93, Math.cos(a1) * R * 0.93, Math.sin(a1) * R * 0.93, 90 * s); }
    if (theme === 'corridor') { for (const y of [-1, 1]) { plate(solids, -R * 0.62, y * R * 0.24, -R * 0.12, y * R * 0.24, 70 * s); plate(solids, R * 0.08, y * R * 0.24, R * 0.62, y * R * 0.24, 70 * s); } }
    if (theme === 'hangar') for (let i = 0; i < 6; i++) { const x = (rand() - 0.5) * R * 1.0, y = (rand() - 0.5) * R * 1.0; plate(solids, x - 120 * s, y, x + 120 * s, y, 120 * s); }
    if (theme === 'reactor') { solids.push({ x: 0, y: 0, r: 180 * s, kind: 'pylon' }); props.push({ kind: 'core', x: 0, y: 0, r: 180 * s });
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; plate(solids, Math.cos(a) * R * 0.42 - Math.sin(a) * 160 * s, Math.sin(a) * R * 0.42 + Math.cos(a) * 160 * s, Math.cos(a) * R * 0.42 + Math.sin(a) * 160 * s, Math.sin(a) * R * 0.42 - Math.cos(a) * 160 * s, 90 * s); } }
    if (theme === 'vault') { plate(solids, R * 0.35, -R * 0.55, R * 0.35, -R * 0.12, 80 * s); plate(solids, R * 0.35, R * 0.12, R * 0.35, R * 0.55, 80 * s); }
    if (theme === 'warden') for (let i = 0; i < 3; i++) { const a = i * TAU / 3; plate(solids, Math.cos(a) * R * 0.5 - 140 * s, Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.5 + 140 * s, Math.sin(a) * R * 0.5, 100 * s); }
    const B = window.terrain.biomeFor(galaxy.current);
    return { biome: { ...B, gasTint: '120,90,60' }, R, solids, gas: [], lanes: [], decor: [], landmark: null, grid: window.terrain.gridOf(solids), cell: 800, tpl: { rock: [], ice: [] }, id: hash('room:' + index + ':' + theme), props };
  }
  function hostile(x, y, tier, archetype, name, extra = {}) {
    const e = new EnemyOrganism(x, y, { tier, archetype, ...(name ? { name } : {}) });
    if (!name) { try { window.frontierPve?.decorate?.(e); window.combatScaling?.enemy?.(e); window.hostileSkins?.skin?.(e); } catch { } }
    else { const row = window.tuning.ROWS[Math.max(1, Math.min(20, tier))]; e.maxHp = e.hp = Math.round(row.hp * (extra.hp || 1)); e.maxShield = e.shield = Math.round(row.shield * (extra.shield ?? 1));
      e.combatScale = { tier, damage: row.damage, bounty: Math.round(row.bounty * (extra.bounty || 1)), parts: row.parts }; }
    e._aggro = true; e.derelict = extra.role || 'crew';
    if (extra.pinned) e.capital = { role: extra.role, anchor: { x, y }, sealed: !!extra.sealed };
    return e;
  }
  function populate(theme, R, danger, rand) {
    const out = [], arch = ['stalker', 'charger', 'sniper', 'stalker', 'hive'], n = 3 + Math.floor(danger / 4);
    const crew = k => { for (let i = 0; i < k; i++) { const a = rand() * TAU, d = R * (0.25 + rand() * 0.45); out.push(hostile(R * 0.25 + Math.cos(a) * d * 0.6, Math.sin(a) * d, danger, arch[Math.floor(rand() * arch.length)])); } };
    if (theme === 'corridor') { crew(Math.max(2, n - 2)); for (const y of [-1, 1]) for (const x of [-0.3, 0.3]) out.push(hostile(R * x, y * R * 0.5, danger, 'sniper', 'Corridor turret', { role: 'turret', pinned: true, hp: 0.8 })); }
    if (theme === 'hangar') { crew(Math.max(1, n - 3)); for (const y of [-1, 1]) out.push(hostile(R * 0.3, y * R * 0.55, danger, 'hive', 'Launch bay', { role: 'bay', pinned: true, hp: 2.5 })); }
    if (theme === 'reactor') crew(n);
    if (theme === 'vault') { crew(Math.max(2, n - 1)); for (let i = 0; i < 3; i++) out.push(hostile(R * 0.62, (i - 1) * R * 0.32, danger, 'stalker', 'Vault lock', { role: 'lock', pinned: true, sealed: true, hp: 1.2, shield: 0 })); }
    if (theme === 'warden') { const w = hostile(R * 0.15, 0, Math.min(20, danger + 1), 'stalker', 'Warden of the ' + dive.name, { role: 'warden', hp: 6, shield: 3, bounty: 8 }); w.elite = true; out.push(w); crew(2); }
    return out;
  }
  function enterRoom(i) {
    const theme = dive.rooms[i], R = roomRadius(), rand = rng(hash(dive.key + ':room' + i));
    const room = { gridX: dive.host.gridX, gridY: dive.host.gridY, sys: dive.host.sys, sysId: dive.host.sysId, key: 'dive:' + dive.key + ':' + i, radius: R, dangerLevel: dive.danger, biome: dive.host.biome, musicTheme: 'PRESSURE',
      isHaven: false, isBossSector: false, isCleared: false, mission: null, isDiveRoom: true, remember() { }, theme };
    room.terrain = build(theme, R, dive.danger, i, dive.rooms.length, rand);
    dive.index = i; dive.room = room; dive.pulseT = CFG.pulseEvery; dive.bayT = CFG.bayEvery; dive.escorts = 0;
    engine.enemies = populate(theme, R, dive.danger, rand); engine.projectiles = []; progression.bubbleDrops = progression.bubbleDrops.filter(d => d.part);
    const P = engine.player; P.x = -R * 0.78; P.y = 0; P.vx = P.vy = 0; P.iFrames = Math.max(P.iFrames || 0, 60);
    engine.camera.x = P.x - engine.viewportWidth / engine.camera.zoom / 2; engine.camera.y = P.y - engine.viewportHeight / engine.camera.zoom / 2;
    soundEngine.setMusicState(theme === 'warden' ? 'BOSS' : 'COMBAT', theme === 'warden' ? { boss: 'solar', force: true } : { force: true });
    garage.banner(`DERELICT · ${dive.name} · ${THEMES[theme].name} ${i + 1}/${dive.rooms.length} · ${THEMES[theme].hint}`, 'hunt');
    paintButton();
  }

  // ---- start, finish, leave ----
  function board() {
    const L = entrance(); if (!L || !nearEntrance() || engine.paused) return false;
    const ch = worldMap.getCurrentChamber(), key = keyOf(ch), danger = Math.max(1, ch.dangerLevel || 1);
    dive = { key, name: nameFor(key), host: ch, hostEnemies: engine.enemies, hostDrops: progression.bubbleDrops, back: { x: L.x + (L.r * (L.scale || 1)) * 1.2, y: L.y }, danger, rooms: plan(key, danger), index: 0, done: false };
    document.body.classList.add('in-derelict');
    enterRoom(0); return true;
  }
  function leave(reason = 'left') {
    if (!dive) return false;
    const d = dive; dive = null; document.body.classList.remove('in-derelict');
    // Uncollected hardware from the rooms comes out with you, beside the hull.
    const carried = progression.bubbleDrops.filter(x => x.part && !d.hostDrops.includes(x));
    carried.forEach((x, i) => { x.x = d.back.x + 160 + i * 60; x.y = d.back.y; });
    engine.enemies = d.hostEnemies.filter(e => e.hp > 0); progression.bubbleDrops = d.hostDrops.concat(carried);
    engine.projectiles = [];
    if (reason !== 'death') { const P = engine.player; P.x = d.back.x; P.y = d.back.y; P.vx = P.vy = 0; P.iFrames = Math.max(P.iFrames || 0, 60); }
    soundEngine.setMusicState(d.host.musicTheme || 'PRESSURE', { force: true });
    if (reason === 'left') garage.banner('You leave the ' + d.name + ' · its rooms reset behind you', 'good');
    paintButton(); return true;
  }
  function claim() {
    const d = dive, rec = doc(), last = rec.looted[d.key] || 0, full = Date.now() - last > CFG.lootEveryMs, row = window.tuning.ROWS[Math.min(20, d.danger)];
    rec.cleared++; const P = engine.player;
    if (full) {
      rec.looted[d.key] = Date.now();
      const cls = window.combatScaling?.gunClass?.({ tier: d.danger }) || 'LIGHT', pool = Object.entries(modularShips.GEARS).filter(([, g]) => g.weapon && g.cls === cls && !g.retired && !g.salvageOnly);
      const quirks = Object.entries(loot.QUIRKS || {}).filter(([, q]) => q.type === 'cannon').map(([k]) => k);
      if (pool.length) { const [, g] = pool[hash(d.key) % pool.length]; progression.spawnSalvage(P.x + 120, P.y, { promised: true, part: { type: 'cannon', radius: g.radius, weapon: g.weapon, ...(quirks.length ? { quirk: quirks[hash(d.key + 'q') % quirks.length], rarity: 'relic' } : {}) } }); }
      hubs.metal += row.bounty * 4;
      try { window.derelictLoot?.award?.(d, P); } catch (e) { console.warn('derelict loot:', e.message); }
      garage.banner(`THE HOLD · a relic ${cls.toLowerCase()} gun and ${row.bounty * 4} metal · fly through the hatch to leave`, 'good');
    } else { hubs.metal += row.bounty; garage.banner(`THE HOLD · already stripped · ${row.bounty} metal in the dust · back in ${Math.ceil((CFG.lootEveryMs - (Date.now() - last)) / 60000)} min`, 'good'); }
    saveState.save(); d.done = true;
  }

  // ---- per frame ----
  const doorOf = () => ({ x: dive.room.radius * 0.84, y: 0 });
  function blocked(ax, ay, bx, by) {
    const f = dive.room.terrain, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (const o of f.solids) { if (o.ghost || o.kind === 'pylon') continue; const t = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.y - ay) * dy) / (len * len))), px = ax + dx * t, py = ay + dy * t; if (Math.hypot(o.x - px, o.y - py) < o.r) return true; }
    return false;
  }
  function tick() {
    if (!dive || engine.paused || engine.mapOpen) return;
    const P = engine.player, room = dive.room, theme = room.theme;
    if (P.dead) return;
    if (theme === 'reactor') { dive.pulseT--; if (dive.pulseT <= 0) { dive.pulseT = CFG.pulseEvery; if (!blocked(0, 0, P.x, P.y) && !(P.iFrames > 0)) { const dmg = P.maxHp * CFG.pulseShare; P.hp -= dmg; engine.damageFlash = 10; if (P.hp <= 0) { P.hp = 0; engine.playerDeath(); } } dive.lastPulse = performance.now(); } }
    if (theme === 'hangar') { const bays = engine.enemies.filter(e => e.derelict === 'bay' && e.hp > 0); if (bays.length && --dive.bayT <= 0) { dive.bayT = CFG.bayEvery; if (engine.enemies.filter(e => e.derelict === 'drone').length < CFG.bayMax) for (const b of bays) { const e = hostile(b.x - 120, b.y, Math.max(1, dive.danger - 1), 'mote'); e.derelict = 'drone'; engine.enemies.push(e); } } }
    if (theme === 'vault') { const guards = engine.enemies.some(e => e.derelict === 'crew' && e.hp > 0); for (const e of engine.enemies) if (e.derelict === 'lock' && e.capital) e.capital.sealed = guards; }
    if (theme === 'warden') { const w = engine.enemies.find(e => e.derelict === 'warden'); if (w) { const k = 1 - w.hp / w.maxHp; while (dive.escorts < 2 && k >= (dive.escorts + 1) / 3) { dive.escorts++; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; engine.enemies.push(hostile(w.x + Math.cos(a) * 500, w.y + Math.sin(a) * 500, dive.danger, 'charger')); } garage.banner('The warden calls its escorts', 'hunt'); } } }
    // the door
    const door = doorOf(), atDoor = Math.hypot(P.x - door.x, P.y - door.y) < CFG.doorReach * Math.max(1, room.radius / 1500);
    if (room.isCleared && theme === 'warden' && !dive.done) claim();
    if (room.isCleared && atDoor) { if (dive.index + 1 < dive.rooms.length) enterRoom(dive.index + 1); else leave('done'); }
    paintButton();
  }

  // ---- drawing ----
  function drawRoom(ctx, cam) {
    if (!dive) return; const room = dive.room, R = room.radius, t = performance.now();
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = '#0c1318'; ctx.beginPath(); ctx.arc(0, 0, R * 0.93, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,150,.08)'; ctx.lineWidth = 3; const step = 220 * Math.max(1, R / 1500);
    for (let x = -R; x <= R; x += step) { ctx.beginPath(); ctx.moveTo(x, -R); ctx.lineTo(x, R); ctx.stroke(); } for (let y = -R; y <= R; y += step) { ctx.beginPath(); ctx.moveTo(-R, y); ctx.lineTo(R, y); ctx.stroke(); }
    for (const p of room.terrain.props) if (p.kind === 'core') { const since = dive.lastPulse ? (t - dive.lastPulse) / 1000 : 9, warn = dive.pulseT < CFG.pulseWarn;
      ctx.fillStyle = warn ? `rgba(255,${80 + Math.sin(t * 0.03) * 60},60,.95)` : '#ff9d3c'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      if (since < 0.8) { ctx.strokeStyle = `rgba(255,170,90,${0.8 - since})`; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(0, 0, R * since * 1.2, 0, TAU); ctx.stroke(); } }
    const door = doorOf(), open = room.isCleared, k = Math.max(1, R / 1500);
    ctx.fillStyle = open ? 'rgba(94,242,160,.85)' : 'rgba(255,80,90,.75)'; ctx.fillRect(door.x - 30 * k, door.y - 160 * k, 60 * k, 320 * k);
    ctx.fillStyle = 'rgba(134,222,208,.5)'; ctx.fillRect(-R * 0.86 - 30 * k, -120 * k, 50 * k, 240 * k);
    ctx.restore();
  }
  function paintButton() {
    if (!button) return;
    const inside = !!dive, near = !inside && saveState.doc.launched && !engine.paused && nearEntrance(), firstRoom = inside && dive.index === 0 && Math.hypot(engine.player.x + dive.room.radius * 0.78, engine.player.y) < 500 * Math.max(1, dive.room.radius / 1500);
    button.hidden = !(near || firstRoom);
    button.textContent = near ? 'Board the derelict · E' : 'Leave the derelict';
  }

  // ---- install ----
  function install() {
    if (typeof worldMap === 'undefined' || !window.terrain?.ready || !window.roomScale?.ready || !window.garage || !window.uiKit?.ready) { setTimeout(install, 60); return; }
    const get = worldMap.getCurrentChamber.bind(worldMap);
    worldMap.getCurrentChamber = () => dive ? dive.room : get();
    const portal = worldMap.checkPortalTransition.bind(worldMap);
    worldMap.checkPortalTransition = player => { if (!dive) return portal(player); const R = dive.room.radius * 0.9, d = Math.hypot(player.x, player.y); if (d > R) { player.x *= R / d; player.y *= R / d; player.vx *= -0.3; player.vy *= -0.3; } return false; };
    if (window.sectorField) { const lm = sectorField.landmarks.bind(sectorField); sectorField.landmarks = ch => ch?.isDiveRoom ? [] : lm(ch); }
    const membrane = worldMap.drawChamberMembrane.bind(worldMap);
    worldMap.drawChamberMembrane = (ctx, cam) => { if (dive) { try { drawRoom(ctx, cam); } catch (e) { console.warn('derelict:', e.message); } } membrane(ctx, cam); };
    const enter = engine.enterChamber.bind(engine);
    engine.enterChamber = (...a) => { if (dive) leave('death'); return enter(...a); };
    const update = engine.update;
    engine.update = function (...a) { const r = update.apply(this, a); try { tick(); if (!dive) paintButton(); } catch (e) { console.warn('derelict:', e.message); } return r; };
    button = document.createElement('button'); button.id = 'dive-action'; button.type = 'button'; button.hidden = true;
    button.onclick = e => { e.stopPropagation(); dive ? leave('left') : board(); };
    for (const ev of ['touchstart', 'mousedown']) button.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    document.body.append(button);
    window.addEventListener('keydown', e => { if (e.code === 'KeyE' && !engine.paused && !dive && nearEntrance()) { e.preventDefault(); e.stopImmediatePropagation(); board(); } }, true);
    ready = true;
  }
  window.derelicts = { CFG, THEMES, forced, entrance, nearEntrance, board, leave, plan, nameFor, goRoom: i => dive && enterRoom(i), get active() { return dive; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
