/* TERRAIN AND LANDMARKS (Route 2 · Stage 1 · map and places).
 * Mac, 2026-10-29: "the maps seem really bland … we need environments."
 * Every sector now has seeded terrain that plays, and one landmark you can name:
 * - ROCKS and ICE are solid: ships slide off them and they stop shots, so they are cover.
 * - WRECKAGE (and a dead titan) is solid hull you can hide behind.
 * - GAS CLOUDS hide you: unalerted hostiles do not notice you inside one, and alerted ones lose
 *   you after a few seconds if you stay out of close range.
 * - CURRENT LANES push everything along them: ride them to travel, fight across them carefully.
 * - A BLACK HOLE pulls; a RING RUIN or GATE RUIN is cover and a place to meet.
 * The galaxy region sets the biome (Naraka reef shallows, Erebos ice, Aion wreck fields, Chaos
 * Cradle ember clouds, Deep Current lanes); a system rule tilts it (riptide → lanes, foundry → hot
 * rock, swarm → reef, black sun → dark gas, graveyard → wreckage). Owned systems set out their
 * civilisation's buoys. Layout is a pure function of system + sector + room size; nothing is saved. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  let ready = false, field = null, fieldKey = '', off = false;   // `off`: witnesses that measure gun maths switch terrain out
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // Per biome: how much of each terrain (per 2,600 px room), its colours, and which landmarks it favours.
  const BIOMES = {
    naraka: { name: 'Reef shallows', rock: 1, ice: 0, wreck: 0.2, gas: 0.6, lane: 0, rockTint: ['#35514c', '#1d2e2b'], gasTint: '63,214,163', landmarks: ['ring', 'gate', 'beacon'] },
    erebos: { name: 'Ice shelf', rock: 0.5, ice: 1.2, wreck: 0.2, gas: 0.3, lane: 0.3, rockTint: ['#4a5670', '#262d3d'], gasTint: '143,166,255', landmarks: ['ring', 'gate', 'titan'] },
    aion: { name: 'Wreck fields', rock: 0.6, ice: 0, wreck: 1.4, gas: 0.3, lane: 0, rockTint: ['#5a4d36', '#2e281c'], gasTint: '232,196,120', landmarks: ['titan', 'ring', 'gate'] },
    chaos: { name: 'Ember clouds', rock: 0.9, ice: 0, wreck: 0.4, gas: 1.3, lane: 0.3, rockTint: ['#5a3524', '#2a1710'], gasTint: '255,140,66', landmarks: ['blackhole', 'titan', 'ring'] },
    deep: { name: 'Deep current', rock: 0.6, ice: 0.3, wreck: 0.4, gas: 0.7, lane: 1.4, rockTint: ['#3a2c52', '#1b1428'], gasTint: '188,19,254', landmarks: ['blackhole', 'gate', 'titan'] }
  };
  const REGION = ['naraka', 'erebos', 'aion', 'chaos', 'deep'];
  const RULE_TILT = { riptide: { lane: 1.6 }, foundry: { rock: 1.5, rockTint: ['#6b3a1e', '#2f160a'] }, swarm: { gas: 0.4, rock: 1.3 }, blacksun: { gas: 1.6, gasTint: '40,20,70' }, graveyard: { wreck: 2.2, gas: 0.6 } };
  const LANDMARK = { titan: 'Dead titan', ring: 'Broken ring station', gate: 'Gate ruin', blackhole: 'Black-hole edge', beacon: 'Faction beacon' };

  function biomeFor(sys) {
    const b = { ...BIOMES[REGION[sys?.rid || 0]] || BIOMES.naraka }, tilt = RULE_TILT[sys?.rule];
    if (tilt) for (const [k, v] of Object.entries(tilt)) b[k] = typeof v === 'number' ? b[k] * v : v;
    return b;
  }

  // ---- generation ----
  const GATE_CLEAR = 380;
  function generate(ch) {
    const sys = galaxy.current, R = ch.radius || 2600;
    // Guardian arenas, the training range and the Grave Choir keep their authored, open floor.
    if (ch.isBossSector || window.frontierPve?.isRange?.() || (typeof graveChoir !== 'undefined' && graveChoir.active)) return { biome: biomeFor(sys), R, solids: [], gas: [], lanes: [], decor: [], landmark: null, grid: new Map(), cell: 800, tpl: { rock: [], ice: [] }, id: 0 };
    const rand = rng(hash(`terrain:${sys.id}:${ch.gridX},${ch.gridY}`)), B = biomeFor(sys);
    const rolled = B.landmarks[Math.floor(rand() * B.landmarks.length)];   // first draw, so landmarkKind() can predict it cheaply
    const k = R / 2600, area = Math.min(9, k * k), big = Math.sqrt(k);   // more terrain in bigger rooms, bigger pieces too
    const solids = [], gas = [], lanes = [], decor = [], quiet = ch.isHaven ? 1500 * Math.max(1, window.roomScale?.stationScale?.() || 1) : Math.max(900, R * 0.14);
    const free = (x, y, r) => Math.hypot(x, y) > quiet + r && Math.hypot(x, y) < R - r - 120 && solids.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r + 40);
    const spot = (r, tries = 24) => { for (let i = 0; i < tries; i++) { const a = rand() * TAU, d = Math.sqrt(rand()) * R; const x = Math.cos(a) * d, y = Math.sin(a) * d; if (free(x, y, r)) return [x, y]; } return null; };
    // A dozen unit-radius outlines per sector, shared by every rock and floe (one cached sprite each).
    const poly = (n, rough) => Array.from({ length: n }, (_, i) => { const rr = 1 - rough + rand() * rough * 2; return [Math.cos(i * TAU / n) * rr, Math.sin(i * TAU / n) * rr]; });
    const tpl = { rock: Array.from({ length: 10 }, () => poly(9 + Math.floor(rand() * 4), 0.22)), ice: Array.from({ length: 6 }, () => poly(6 + Math.floor(rand() * 3), 0.3)) };
    // the landmark first, so terrain arranges around it
    const kind = ch.isHaven ? 'beacon' : window.derelicts?.forced?.(sys, ch) ? 'titan' : rolled;
    let landmark = null;
    { const r = { titan: 1000, ring: 900, gate: 650, blackhole: 380, beacon: 220 }[kind] * big;
      const at = ch.isHaven ? [R * 0.45, -R * 0.2] : spot(r, 40) || [R * 0.5, 0];
      landmark = { kind, name: LANDMARK[kind], x: at[0], y: at[1], r, a: rand() * TAU, seed: rand() };
      if (kind === 'titan') { const c = modularShips.compile(modularShips.factory('athanor')).design; landmark.nodes = c.nodes.map(n => ({ ...n, currentDx: n.dx, currentDy: n.dy, targetDx: n.dx, targetDy: n.dy }));
        landmark.scale = big; const ca = Math.cos(landmark.a), sa = Math.sin(landmark.a);
        for (const n of landmark.nodes) if (n.radius >= 6) solids.push({ x: landmark.x + (n.dx * ca - n.dy * sa) * big, y: landmark.y + (n.dx * sa + n.dy * ca) * big, r: Math.max(26, n.radius * 1.6) * big, kind: 'hull' }); }
      else if (kind === 'ring') { for (let i = 0; i < 36; i++) { if (i % 9 < 2) continue; const a = landmark.a + i * TAU / 36; solids.push({ x: landmark.x + Math.cos(a) * r, y: landmark.y + Math.sin(a) * r, r: 70 * big, kind: 'ring' }); } }
      else if (kind === 'gate') { for (const s of [-1, 1]) solids.push({ x: landmark.x + Math.cos(landmark.a) * r * s, y: landmark.y + Math.sin(landmark.a) * r * s, r: 120 * big, kind: 'pylon' }); }
      else if (kind === 'beacon') solids.push({ x: landmark.x, y: landmark.y, r: 70 * big, kind: 'pylon' });
    }
    // asteroid / hot-rock clusters
    const clusters = Math.round(B.rock * 3 * area);
    for (let c = 0; c < clusters; c++) { const cr = (260 + rand() * 420) * big, at = spot(cr * 0.3); if (!at) continue; const n = 4 + Math.floor(rand() * 7);
      for (let i = 0; i < n; i++) { const r = (36 + rand() * rand() * 220) * big, a = rand() * TAU, d = rand() * cr, x = at[0] + Math.cos(a) * d, y = at[1] + Math.sin(a) * d; if (free(x, y, r)) solids.push({ x, y, r, kind: 'rock', tpl: Math.floor(rand() * 10), spin: (rand() - 0.5) * 0.0003, rot: rand() * TAU }); } }
    // ice floes
    for (let i = 0, n = Math.round(B.ice * 5 * area); i < n; i++) { const r = (120 + rand() * 260) * big, at = spot(r); if (at) solids.push({ x: at[0], y: at[1], r, kind: 'ice', tpl: Math.floor(rand() * 6), rot: rand() * TAU }); }
    // wreckage plates
    for (let i = 0, n = Math.round(B.wreck * 6 * area); i < n; i++) { const r = (60 + rand() * 160) * big, at = spot(r); if (at) solids.push({ x: at[0], y: at[1], r, kind: 'wreck', w: r * (1.4 + rand()), h: r * (0.5 + rand() * 0.4), rot: rand() * TAU, seed: rand() }); }
    // gas clouds (not solid)
    for (let i = 0, n = Math.round(B.gas * 3 * area); i < n; i++) { const r = (420 + rand() * 600) * big, a = rand() * TAU, d = (0.25 + rand() * 0.65) * R; gas.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r, seed: rand() }); }
    // current lanes
    for (let i = 0, n = Math.round(B.lane * 1.5 * Math.sqrt(area)); i < n; i++) { const a = rand() * TAU, off = (rand() - 0.5) * R * 1.1, dir = [Math.cos(a), Math.sin(a)], nx = -dir[1], ny = dir[0];
      lanes.push({ cx: nx * off, cy: ny * off, dir, half: R * 1.05, w: (260 + rand() * 260) * big, push: 0.22 + rand() * 0.18, phase: rand() }); }
    if (kind === 'blackhole') landmark.pull = { reach: landmark.r * 5, power: 0.5 };
    // faction buoys around owned systems
    const civ = window.factionFleets?.civilisation?.(sys.id), hue = civ ? hash(civ) % 360 : null;
    if (civ && !sys.home) for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; decor.push({ kind: 'buoy', x: Math.cos(a) * R * 0.9, y: Math.sin(a) * R * 0.9, hue }); }
    // Jump gates stay reachable (overnight run step 8): a ring-ruin arc was found wrapped round a gate, walling it off
    // from one side. Any solid within GATE_CLEAR of a gate in this sector is removed after placement, so the seeded
    // layout (and the landmark prediction on the star map) is otherwise unchanged.
    try { const gates = (window.galaxy?.portalsOf?.(galaxy.data?.byId[sys.id] || sys) || []).filter(g => g.gx === ch.gridX && g.gy === ch.gridY);
      if (gates.length) for (let i = solids.length - 1; i >= 0; i--) { const o = solids[i]; if (gates.some(g => Math.hypot(o.x - g.x, o.y - g.y) < o.r + GATE_CLEAR)) solids.splice(i, 1); } } catch (e) { }
    const cell = 800, grid = gridOf(solids, cell);
    return { biome: B, R, solids, gas, lanes, decor, landmark, grid, cell, civ, tpl, id: hash(`${sys.id}:${ch.gridX},${ch.gridY}:${R}`) };
  }
  // A spatial grid for solids so collision stays cheap in titan rooms.
  function gridOf(solids, cell = 800) {
    const grid = new Map();
    for (const o of solids) { const x0 = Math.floor((o.x - o.r) / cell), x1 = Math.floor((o.x + o.r) / cell), y0 = Math.floor((o.y - o.r) / cell), y1 = Math.floor((o.y + o.r) / cell);
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const key = gx + ',' + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(o); } }
    return grid;
  }
  // The landmark a sector will hold, without generating it (the star map asks for every tile).
  function landmarkKind(sys, ch) {
    if (!sys || ch.isBossSector) return null; if (ch.isHaven) return 'beacon';
    if (window.derelicts?.forced?.(sys, ch)) return 'titan';
    const B = biomeFor(sys), rand = rng(hash(`terrain:${sys.id}:${ch.gridX},${ch.gridY}`));
    return B.landmarks[Math.floor(rand() * B.landmarks.length)];
  }
  function current() {
    const ch = worldMap.getCurrentChamber(); if (off || !ch || !window.galaxy?.data) return null;
    if (ch.terrain) return ch.terrain;   // a derelict room brings its own walls (js/derelicts.js)
    const key = `${galaxy.currentId}:${ch.gridX},${ch.gridY}:${ch.radius}`;
    if (key !== fieldKey) { field = generate(ch); fieldKey = key; }
    return field;
  }
  const near = (f, x, y) => f.grid.get(Math.floor(x / f.cell) + ',' + Math.floor(y / f.cell)) || [];

  // ---- physics ----
  function collide(f, e, rr) {
    for (const o of near(f, e.x, e.y)) {
      if (o.ghost) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1, min = o.r + rr;
      if (d >= min) continue;
      const nx = dx / d, ny = dy / d; e.x = o.x + nx * min; e.y = o.y + ny * min;
      const vn = (e.vx || 0) * nx + (e.vy || 0) * ny; if (vn < 0) { e.vx -= nx * vn * 1.4; e.vy -= ny * vn * 1.4; }
    }
  }
  function inGas(f, x, y) { return f.gas.some(g => Math.hypot(g.x - x, g.y - y) < g.r * 0.8); }
  function push(f, e) {
    for (const l of f.lanes) { const rx = e.x - l.cx, ry = e.y - l.cy, along = rx * l.dir[0] + ry * l.dir[1], across = Math.abs(-rx * l.dir[1] + ry * l.dir[0]);
      if (across < l.w && Math.abs(along) < l.half) { const k = l.push * (1 - across / l.w); e.vx = (e.vx || 0) + l.dir[0] * k; e.vy = (e.vy || 0) + l.dir[1] * k; } }
    const L = f.landmark; if (L?.pull) { const dx = L.x - e.x, dy = L.y - e.y, d = Math.hypot(dx, dy); if (d < L.pull.reach && d > 1) { const k = L.pull.power * (1 - d / L.pull.reach); e.vx = (e.vx || 0) + dx / d * k; e.vy = (e.vy || 0) + dy / d * k; } }
  }
  function step() {
    const f = current(); if (!f || engine.paused || engine.mapOpen) return;
    const P = engine.player;
    if (P && !P.dead) { push(f, P); collide(f, P, Math.max(30, (window.roomScale?.shipLength?.() || 200) * 0.22)); P._concealed = inGas(f, P.x, P.y); }
    for (const e of engine.enemies) { if (e.capital?.anchor) continue; push(f, e); collide(f, e, Math.max(24, (e.coreRadius || 18) * 2)); }
    for (let i = engine.projectiles.length - 1; i >= 0; i--) { const p = engine.projectiles[i];
      for (const o of near(f, p.x, p.y)) if (!o.ghost && Math.hypot(p.x - o.x, p.y - o.y) < o.r) { p.life = 0; if (Math.random() < 0.35) particleSystem.spawnBubbleBurst?.(p.x, p.y, o.kind === 'ice' ? '#bfe6ff' : '#c9a25c', 3); break; } }
  }

  // ---- drawing ----
  // Visual rehaul pass 1 (overnight step 12): rocks were flat two-tone polygons ("bland", Mac). Each is now
  // lit from one fixed screen direction (upper left), speckled, cratered with lit rims, rimmed on the lit side,
  // cracked, and drops a soft shadow. Sprites are baked at 4 orientations and drawn unrotated: rotated blits were
  // the slowest path in a software canvas (night item 1), and a fixed light only reads right if the sprite does not spin.
  const sprites = new Map(), ROT_BUCKETS = 4;
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  function rockSprite(f, o) {
    const rb = ((Math.round(((o.rot || 0) % TAU + TAU) % TAU / (TAU / ROT_BUCKETS))) % ROT_BUCKETS), key = f.id + ':' + o.kind + ':' + o.tpl + ':' + rb, had = sprites.get(key); if (had) return had;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), u = S / 2.6, tint = f.biome.rockTint, ice = o.kind === 'ice';
    let seed = (o.tpl + 1) * 9301 + rb * 49297; const rnd = () => ((seed = (seed * 233280 + 49297) % 2147483647) / 2147483647);
    const shape = () => { g.beginPath(); f.tpl[o.kind][o.tpl].forEach(([x, y], i) => { const a = rb * TAU / ROT_BUCKETS, X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); };
    g.translate(S / 2, S / 2); g.scale(u, u);
    // soft cast shadow, down and right
    g.save(); g.translate(0.09, 0.12); shape(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); g.restore();
    shape();
    const base = ice ? ['#bfe3f7', '#5f93bd', '#173352'] : [shade(tint[0], 1.45), tint[0], shade(tint[1], 0.7)];
    const lit = g.createRadialGradient(-0.42, -0.42, 0.05, -0.1, -0.1, 1.25); lit.addColorStop(0, base[0]); lit.addColorStop(0.45, base[1]); lit.addColorStop(1, base[2]);
    g.fillStyle = lit; g.fill();
    g.save(); g.clip();
    // speckled surface
    for (let i = 0; i < 140; i++) { const x = rnd() * 2.2 - 1.1, y = rnd() * 2.2 - 1.1, r = 0.004 + rnd() * 0.02; g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.16)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    if (ice) {
      // crystal facets: faces fan from an off-centre point to each vertex, lit faces toward the upper left
      const pts = f.tpl[o.kind][o.tpl].map(([x, y]) => { const a = rb * TAU / ROT_BUCKETS; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; }), cx = -0.12, cy = -0.1;
      for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], mx = (x1 + x2) / 2, my = (y1 + y2) / 2, facing = -(mx + my);
        g.fillStyle = facing > 0 ? `rgba(225,245,255,${0.10 + Math.min(0.25, facing * 0.2)})` : `rgba(4,18,40,${Math.min(0.35, -facing * 0.25)})`; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(220,245,255,.35)'; g.lineWidth = 0.012; for (const [x, y] of pts) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(cx - 0.18, cy - 0.16, 0.05, 0, TAU); g.fill();
    }
    else {
      // craters: dark bowl, lit lower-right lip (light from upper left)
      for (let i = 0; i < 6; i++) { const a = rnd() * TAU, d = rnd() * 0.6, x = Math.cos(a) * d, y = Math.sin(a) * d, r = 0.05 + rnd() * 0.11;
        g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,240,220,.22)'; g.lineWidth = r * 0.28; g.beginPath(); g.arc(x, y, r * 0.92, -0.4, 1.9); g.stroke(); }
      // cracks
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.012; for (let i = 0; i < 3; i++) { let x = rnd() - 0.5, y = rnd() - 0.5; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 0.35; y += (rnd() - 0.5) * 0.35; g.lineTo(x, y); } g.stroke(); }
    }
    // terminator: the far side falls into shadow
    const dark = g.createLinearGradient(-0.9, -0.9, 0.9, 0.9); dark.addColorStop(0.45, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = dark; g.fillRect(-1.3, -1.3, 2.6, 2.6);
    g.restore();
    // rim light on the lit edge, dark line on the shadow edge
    shape(); g.lineWidth = 0.03; const rim = g.createLinearGradient(-1, -1, 1, 1); rim.addColorStop(0, ice ? 'rgba(235,250,255,.95)' : 'rgba(255,236,205,.55)'); rim.addColorStop(0.5, 'rgba(0,0,0,.15)'); rim.addColorStop(1, 'rgba(0,0,0,.55)'); g.strokeStyle = rim; g.stroke();
    sprites.set(key, c); if (sprites.size > 64) sprites.delete(sprites.keys().next().value);
    return c;
  }
  function visible(o, cam, pad) { const z = cam.zoom || engine.camera.zoom, w = engine.viewportWidth / z, h = engine.viewportHeight / z; return o.x + pad > cam.x && o.x - pad < cam.x + w && o.y + pad > cam.y && o.y - pad < cam.y + h; }
  function drawUnder(ctx, cam) {
    const f = current(); if (!f) return; const t = performance.now(), B = f.biome;
    // current lanes: flowing streaks
    for (const l of f.lanes) { ctx.save(); ctx.translate(l.cx - cam.x, l.cy - cam.y); ctx.rotate(Math.atan2(l.dir[1], l.dir[0]));
      const band = ctx.createLinearGradient(0, -l.w * 0.6, 0, l.w * 0.6); band.addColorStop(0, `rgba(${B.gasTint},0)`); band.addColorStop(0.5, `rgba(${B.gasTint},.10)`); band.addColorStop(1, `rgba(${B.gasTint},0)`);
      ctx.fillStyle = band; ctx.fillRect(-l.half, -l.w * 0.6, l.half * 2, l.w * 1.2);
      ctx.strokeStyle = `rgba(${B.gasTint},.38)`; ctx.lineWidth = 3; ctx.lineCap = 'round'; const off = ((t * 0.12 + l.phase * 400) % 400);
      for (let y = -l.w * 0.7; y <= l.w * 0.7; y += l.w * 0.35) { ctx.beginPath(); for (let x = -l.half + off; x < l.half; x += 400) { ctx.moveTo(x, y); ctx.lineTo(x + 140, y); } ctx.stroke(); }
      ctx.restore(); }
    // landmark
    const L = f.landmark;
    if (L && visible(L, cam, L.r * 3)) {
      ctx.save(); ctx.translate(L.x - cam.x, L.y - cam.y);
      if (L.kind === 'titan') { const glow = ctx.createRadialGradient(0, 0, L.r * 0.2, 0, 0, L.r * 1.3 * L.scale); glow.addColorStop(0, 'rgba(232,196,120,.10)'); glow.addColorStop(1, 'rgba(232,196,120,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, L.r * 1.3 * L.scale, 0, TAU); ctx.fill();
        ctx.save(); ctx.scale(L.scale, L.scale); fluidShader.drawOrganismMembrane(ctx, 0, 0, L.a, 18, L.nodes, '#7a828e', {}); ctx.restore();
        const p = 0.5 + Math.sin(t * 0.004) * 0.5; ctx.fillStyle = `rgba(255,190,90,${0.5 + p * 0.5})`; ctx.beginPath(); ctx.arc(0, 0, 26 / Math.max(0.2, cam.zoom || engine.camera.zoom) * 0.4, 0, TAU); ctx.fill(); }
      else if (L.kind === 'ring') { ctx.rotate(L.a); ctx.strokeStyle = '#5b6672'; ctx.lineWidth = 120 * Math.sqrt(L.r / 900); ctx.lineCap = 'butt';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, L.r, i * TAU / 4 + 0.35, (i + 1) * TAU / 4 - 0.05); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(232,196,120,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, L.r, 0, TAU); ctx.stroke(); }
      else if (L.kind === 'gate') { ctx.rotate(L.a); const pulse = 0.5 + Math.sin(t * 0.002) * 0.25; ctx.strokeStyle = `rgba(134,222,208,${pulse})`; ctx.lineWidth = 24; ctx.beginPath(); ctx.arc(0, 0, L.r, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        ctx.fillStyle = '#4a5560'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(L.r * s, 0, 120 * Math.sqrt(L.r / 650), 0, TAU); ctx.fill(); } }
      else if (L.kind === 'blackhole') { const g = ctx.createRadialGradient(0, 0, L.r * 0.2, 0, 0, L.r * 3); g.addColorStop(0, '#000'); g.addColorStop(0.3, 'rgba(0,0,0,.95)'); g.addColorStop(0.36, 'rgba(255,170,90,.55)'); g.addColorStop(0.5, 'rgba(120,40,160,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L.r * 3, 0, TAU); ctx.fill(); }
      else if (L.kind === 'beacon') { ctx.fillStyle = '#5a6470'; ctx.beginPath(); ctx.arc(0, 0, 70 * Math.sqrt(L.r / 220), 0, TAU); ctx.fill(); const p = (t * 0.001) % 1; ctx.strokeStyle = `rgba(232,196,120,${1 - p})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 80 + p * 500, 0, TAU); ctx.stroke(); }
      // the name, at a steady on-screen size
      const z = Math.max(0.05, engine.camera.zoom), label = L.kind === 'titan' ? 'DERELICT · ' + (window.derelicts?.nameFor?.(galaxy.currentId + ':' + worldMap.getCurrentChamber().gridX + ',' + worldMap.getCurrentChamber().gridY) || L.name) : L.name.toUpperCase();
      ctx.fillStyle = L.kind === 'titan' ? 'rgba(255,205,120,.9)' : 'rgba(210,225,230,.6)'; ctx.font = `600 ${Math.round(13 / z)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(label, 0, -L.r * (L.kind === 'blackhole' ? 3.1 : 1.15) * (L.scale || 1));
      ctx.restore();
    }
    // solids
    for (const o of f.solids) {
      if (!visible(o, cam, o.r * 1.6) || o.kind === 'hull' || o.kind === 'ring' || o.kind === 'pylon') continue;
      ctx.save(); ctx.translate(o.x - cam.x, o.y - cam.y);
      if (o.kind === 'wreck') { ctx.rotate(o.rot); ctx.fillStyle = '#3b4048'; ctx.strokeStyle = '#7d5a2c'; ctx.lineWidth = Math.max(2, o.r * 0.04); ctx.beginPath(); ctx.rect(-o.w / 2, -o.h / 2, o.w, o.h); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = Math.max(1, o.r * 0.02); for (let x = -o.w / 2 + o.w / 5; x < o.w / 2; x += o.w / 5) { ctx.beginPath(); ctx.moveTo(x, -o.h / 2); ctx.lineTo(x, o.h / 2); ctx.stroke(); } }
      else { const s = rockSprite(f, o), size = o.r * 2.6; ctx.drawImage(s, -size / 2, -size / 2, size, size); }
      ctx.restore();
    }
    for (const d of f.decor) if (visible(d, cam, 200)) { const p = 0.5 + Math.sin(t * 0.003 + d.x) * 0.5; ctx.fillStyle = `hsla(${d.hue},80%,60%,${0.5 + p * 0.5})`; ctx.beginPath(); ctx.arc(d.x - cam.x, d.y - cam.y, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = `hsla(${d.hue},80%,70%,${0.3 * p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x - cam.x, d.y - cam.y, 60 + p * 40, 0, TAU); ctx.stroke(); }
  }
  // Gas is soft, so it is drawn into a quarter-resolution layer and composited once: in titan rooms many
  // clouds cover the screen, and full-resolution radial fills cost more than the rest of the frame.
  const gasLayer = document.createElement('canvas'), gasCtx = gasLayer.getContext('2d'), blobs = new Map();
  // Visual rehaul pass 1: a cloud is a cluster of soft puffs with a brighter core and a pale fringe (3 variants per
  // tint), not one flat disc. Still composited on the quarter-resolution layer, so it costs the same.
  function blob(tint, v = 0) {
    const key = tint + '|' + v; if (blobs.has(key)) return blobs.get(key);
    const S = 192, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); let seed = 7 + v * 131; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const [r0, g0, b0] = tint.split(',').map(Number), pale = `${Math.min(255, r0 + 90)},${Math.min(255, g0 + 90)},${Math.min(255, b0 + 90)}`;
    for (let i = 0; i < 22; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * S * 0.28, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, r = S * (0.12 + rnd() * 0.16);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); const core = d < S * 0.14; gr.addColorStop(0, `rgba(${core ? tint : pale},${core ? 0.22 : 0.12})`); gr.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    blobs.set(key, c); return c;
  }
  function drawOver(ctx, cam) {
    const f = current(); if (!f || !f.gas.length) return; const t = performance.now(), z = engine.camera.zoom, q = 0.25;
    const w = Math.max(1, Math.ceil(engine.viewportWidth * q)), h = Math.max(1, Math.ceil(engine.viewportHeight * q));
    if (gasLayer.width !== w || gasLayer.height !== h) { gasLayer.width = w; gasLayer.height = h; }
    gasCtx.clearRect(0, 0, w, h); let drawn = 0;
    for (const g of f.gas) { if (!visible(g, cam, g.r)) continue; const wob = 1 + Math.sin(t * 0.0004 + g.seed * 9) * 0.05, r = g.r * wob * z * q;
      gasCtx.drawImage(blob(f.biome.gasTint, Math.floor((g.seed || 0) * 3) % 3), (g.x - cam.x) * z * q - r, (g.y - cam.y) * z * q - r, r * 2, r * 2); drawn++; }
    if (!drawn) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(gasLayer, 0, 0, engine.viewportWidth, engine.viewportHeight); ctx.restore();
  }

  // ---- install ----
  function install() {
    if (typeof worldMap === 'undefined' || typeof fluidShader === 'undefined' || !window.galaxy?.data || !window.roomScale?.ready || typeof EnemyOrganism === 'undefined') { setTimeout(install, 60); return; }
    const membrane = worldMap.drawChamberMembrane.bind(worldMap);
    worldMap.drawChamberMembrane = (ctx, cam) => { membrane(ctx, cam); try { drawUnder(ctx, cam); } catch (e) { console.warn('terrain:', e.message); } };
    const parts = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, cam) => { parts(ctx, cam); try { if (cam === engine.camera) drawOver(ctx, cam); } catch (e) { console.warn('terrain:', e.message); } };
    const update = engine.update;
    engine.update = function (...a) { const r = update.apply(this, a); try { step(); } catch (e) { console.warn('terrain:', e.message); } return r; };
    // Gas hides you: unalerted hostiles beyond 450 px do not notice you, alerted ones beyond 900 px lose you after 3 s.
    const think = EnemyOrganism.prototype.update;
    EnemyOrganism.prototype.update = function (player, ...rest) {
      if (player?._concealed && !this.isBoss && !this.capital) {
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (!this._aggro && d > 450) return think.call(this, { ...player, x: this.x + 1e7, y: this.y }, ...rest);
        if (this._aggro && d > 900) { this._lostFor = (this._lostFor || 0) + 1; if (this._lostFor > 180) { this._aggro = false; this._hitAt = 0; this._lostFor = 0; } }
        else this._lostFor = 0;
      }
      return think.call(this, player, ...rest);
    };
    ready = true;
  }
  window.terrain = { BIOMES, biomeFor, generate, current, inGas, gridOf, landmarkKind, get off() { return off; }, set off(v) { off = !!v; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
