/* ==========================================================================
   F3b · THE WIDER CURRENT. Mac, 2026-10-23: "huge world … jump portals and
   weird systems".
   ==========================================================================
   A seeded GALAXY of ~96 SYSTEMS linked by JUMP PORTALS. Every system is the
   same sector engine as home (js/map.js `worldMap.enterSystem`), so nothing
   about combat, salvage or the Shipyard changes; only WHERE you are does.

     HOME      Asterion Forge's 7×7, untouched (old save keys, bosses, rift)
     SYSTEMS   3×3 / 5×5 / 7×7 grids, danger set by distance from home
     REGIONS   the Five Great Depths, home outward (SE canon): Naraka · Erebos ·
               Aion · Chaos Cradle · the Deep Current
     PORTALS   landmarks in edge sectors; fly in → instant jump (never a wait)
     HUBS      home + 7 anchorages spread by farthest-point; death respawns you
               at the NEAREST hub, never back to the very start
     RULES     weird systems roll one rule (lateral, never a flat buff):
               BLACK SUN · RIPTIDE · FOUNDRY STORM · SWARM
   ⚖ THE GALAXY IS DATA, NOT A SAVE. It is a pure function of one seed
     (`saveState.doc.galaxy.seed`), so the same seed is the same galaxy on every
     machine: the M0 "world code". The save holds only the seed, where you have
     been, and where you are.
   ⚖ SYSTEM NAMES ARE DESIGNATIONS (NARAKA-07) until Mac names them. Never
     invent lore names here (README Law 10 spirit; plan §10.3).
   Dials: `galaxy.CFG` (count, radius), `galaxy.RULES[*]`, `galaxy.RULE_CFG`.
   ========================================================================== */
(() => {
  const TAU = Math.PI * 2;
  const CFG = { count: 96, radius: 1000, minGap: 66, hubs: 7, seed: 0xB1AC4, ruleChance: 0.5 };
  const REGIONS = [
    { name: 'Naraka', code: 'NARAKA', tint: '#5ef2e0' },
    { name: 'Erebos', code: 'EREBOS', tint: '#8fa6ff' },
    { name: 'Aion', code: 'AION', tint: '#e8c478' },
    { name: 'Chaos Cradle', code: 'CHAOS', tint: '#ff8c42' },
    { name: 'Deep Current', code: 'DEEP', tint: '#bc13fe' },
  ];
  const RULES = {
    blacksun: { name: 'BLACK SUN', tint: '#bc13fe', line: 'Dark water. Only your sonar ping shows their hulls.' },
    riptide:  { name: 'RIPTIDE', tint: '#5ef2e0', line: 'A current drags everything one way. Ride it or fight it.' },
    foundry:  { name: 'FOUNDRY STORM', tint: '#ff8c42', line: 'Parts rain from the forge-sky. So does slag.' },
    swarm:    { name: 'SWARM', tint: '#39ff14', line: 'Motes breed here. More targets, longer chains.' },
  };
  const RULE_CFG = { pingEvery: 200, pingRange: 1700, darkSight: 330, drift: 0.45, slagEvery: 200, partEvery: 170, swarmExtra: 6 };

  /* mulberry32: same as sectors.js, so a seed means the same thing everywhere */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Lanes + any extra portals another system adds (F4 jump beacons, js/hubs.js). */
  const portalsOf = (sys) => galaxy.extraPortals ? sys.portals.concat(galaxy.extraPortals(sys.id)) : sys.portals;

  /* ── generation ───────────────────────────────────────────────────────── */
  function generate(seed) {
    const r = rng(seed);
    const S = [{ id: 'home', name: 'ASTERION FORGE', x: 0, y: 0, size: 3, danger: 1, rid: 0, region: 'Naraka',
      rule: null, hub: true, home: true, links: [], portals: [] }];
    for (let tries = 0; S.length < CFG.count && tries < 40000; tries++) {
      const a = r() * TAU, d = Math.sqrt(r()) * CFG.radius;
      if (d < 95) continue;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (S.some(s => Math.hypot(s.x - x, s.y - y) < CFG.minGap)) continue;
      S.push({ x, y, links: [], portals: [] });
    }
    /* sort outward so designations count from the inside of each region */
    const outer = S.slice(1).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    const counters = REGIONS.map(() => 0);
    outer.forEach((s, i) => {
      const d = Math.hypot(s.x, s.y) / CFG.radius;
      s.id = 's' + (i + 1);
      s.rid = Math.min(REGIONS.length - 1, Math.floor(d * REGIONS.length));
      s.region = REGIONS[s.rid].name;
      s.name = `${REGIONS[s.rid].code}-${String(++counters[s.rid]).padStart(2, '0')}`;
      s.danger = Math.max(1, Math.min(6, 1 + Math.floor(d * 5.6)));
      const roll = r();
      s.size = roll < 0.15 ? 1 : roll < 0.65 ? 2 : 3;
      s.rule = null; s.hub = false;
    });
    const all = [S[0], ...outer];
    const byId = Object.fromEntries(all.map(s => [s.id, s]));

    /* links: a minimum spanning tree (everything reachable) + short extra lanes (loops) */
    const link = (a, b) => { if (!a.links.includes(b.id)) { a.links.push(b.id); b.links.push(a.id); } };
    const inTree = new Set([0]), best = all.map((s, i) => i ? [Math.hypot(s.x, s.y), 0] : [Infinity, -1]);
    while (inTree.size < all.length) {
      let k = -1;
      for (let i = 0; i < all.length; i++) if (!inTree.has(i) && (k < 0 || best[i][0] < best[k][0])) k = i;
      inTree.add(k); link(all[k], all[best[k][1]]);
      for (let i = 0; i < all.length; i++) {
        if (inTree.has(i)) continue;
        const d = Math.hypot(all[i].x - all[k].x, all[i].y - all[k].y);
        if (d < best[i][0]) best[i] = [d, k];
      }
    }
    for (const s of all) {
      if (s.links.length >= 4) continue;
      const near = all.filter(o => o !== s && !s.links.includes(o.id) && o.links.length < 4)
        .map(o => [Math.hypot(o.x - s.x, o.y - s.y), o]).sort((a, b) => a[0] - b[0])[0];
      if (near && near[0] < CFG.minGap * 2.3 && r() < 0.55) link(s, near[1]);
    }

    /* hops from home; hubs by farthest-point (spread across the galaxy) */
    const hops = bfs(all, byId, ['home']);
    all.forEach(s => { s.hops = hops[s.id]; });
    const hubs = ['home'];
    for (let h = 0; h < CFG.hubs; h++) {
      const dist = bfs(all, byId, hubs);
      let pick = null;
      for (const s of all) if (!s.hub && (!pick || dist[s.id] > dist[pick.id])) pick = s;
      if (!pick) break;
      pick.hub = true; hubs.push(pick.id);
    }

    /* weird systems: never next door to home, never a hub (an anchorage is calm water) */
    // The rolled rules are fixed: later rules (GRAVEYARD, js/wide-dark.js) are assigned by hash so
    // adding one can never reshuffle an existing galaxy.
    const ruleIds = ['blacksun', 'riptide', 'foundry', 'swarm'];
    for (const s of outer) if (!s.hub && s.hops >= 2 && r() < CFG.ruleChance) s.rule = ruleIds[Math.floor(r() * ruleIds.length)];
    for (const s of outer) if (s.rule === 'riptide') s.drift = r() * TAU;

    /* portals: one per link, in the edge sector facing the neighbour */
    for (const s of all) {
      for (const to of s.links) {
        const o = byId[to], a = Math.atan2(o.y - s.y, o.x - s.x);
        const reach = s.size * 0.75;
        const gx = Math.round(Math.cos(a) * reach), gy = Math.round(Math.sin(a) * reach);
        let pa = a, tries = 0;
        const R = 2600 * 0.5;
        while (tries++ < 6 && s.portals.some(p => p.gx === gx && p.gy === gy && Math.hypot(p.x - Math.cos(pa) * R, p.y - Math.sin(pa) * R) < 700)) pa += 0.9;
        s.portals.push({ to, gx, gy, x: Math.cos(pa) * R, y: Math.sin(pa) * R });
      }
    }
    return { seed, systems: all, byId, hubs };
  }

  function bfs(all, byId, from) {
    const d = Object.fromEntries(all.map(s => [s.id, Infinity]));
    const q = [...from]; from.forEach(id => { d[id] = 0; });
    while (q.length) {
      const id = q.shift();
      for (const n of byId[id].links) if (d[n] === Infinity) { d[n] = d[id] + 1; q.push(n); }
    }
    return d;
  }

  /* ── state ────────────────────────────────────────────────────────────── */
  const galaxy = window.galaxy = {
    CFG, REGIONS, RULES, RULE_CFG, generate, paintStrip: () => paintStrip(),
    data: null, currentId: 'home', armed: true, view: 'system', select: null,
    get current() { return this.data.byId[this.currentId]; },
    rule() { const s = this.current; return s && s.rule ? s.rule : null; },
    doc() {
      const g = saveState.doc.galaxy || (saveState.doc.galaxy = {});
      if (!Number.isFinite(g.seed)) g.seed = CFG.seed;
      if (!Array.isArray(g.visited)) g.visited = ['home'];
      return g;
    },
    portalsOf: (sys) => portalsOf(sys),
    known(id) { const v = this.doc().visited; return v.includes(id) || this.data.byId[id].links.some(n => v.includes(n)); },
    enterSystemById, jump, nearestHub, renderGalaxy,
  };

  function boot() {
    galaxy.data = generate(galaxy.doc().seed);
  }

  /* Swap the world to a system: the grid, its portals, its rule. */
  function enterSystemById(id) {
    const sys = galaxy.data.byId[id] || galaxy.data.byId.home;
    galaxy.currentId = sys.id;
    worldMap.enterSystem(sys.home ? null : sys);
    for (const p of portalsOf(sys)) {
      const ch = worldMap.chambers[`${p.gx},${p.gy}`];
      if (ch) ch.portals = (ch.portals || 0) + 1;
    }
    const v = galaxy.doc().visited;
    if (!v.includes(sys.id)) v.push(sys.id);
    applyRule();
    paintStrip();
    return sys;
  }

  function nearestHub(fromId) {
    const d = bfs(galaxy.data.systems, galaxy.data.byId, [fromId]);
    let best = 'home';
    for (const id of galaxy.data.hubs) if (d[id] < d[best]) best = id;
    return best;
  }

  /* ── jump ─────────────────────────────────────────────────────────────── */
  function jump(toId, fromId = galaxy.currentId) {
    if (typeof graveChoir !== 'undefined' && graveChoir.active) return false;
    const to = enterSystemById(toId);
    const back = portalsOf(to).find(p => p.to === fromId) || { gx: 0, gy: 0, x: 0, y: 420 };
    worldMap.currentGridX = back.gx; worldMap.currentGridY = back.gy;
    const P = engine.player, a = Math.atan2(back.y, back.x) + Math.PI, inward = 340;
    P.x = back.x + Math.cos(a) * inward; P.y = back.y + Math.sin(a) * inward;
    P.vx = Math.cos(a) * 6; P.vy = Math.sin(a) * 6;
    P.iFrames = Math.max(P.iFrames || 0, 60);
    engine.projectiles.length = 0;
    engine.camera.x = P.x - engine.viewportWidth / engine.camera.zoom / 2;
    engine.camera.y = P.y - engine.viewportHeight / engine.camera.zoom / 2;
    galaxy.armed = false;
    engine.enterChamber({ silent: true });
    saveState.save();
    flash(to);
    systemCard(to);
    if (typeof soundEngine !== 'undefined') {
      soundEngine.playAbility('emp');
      soundEngine.playPhrase([196.0, 293.66, 440.0, 659.25], 0.07);
    }
    return true;
  }

  /* ── rules ────────────────────────────────────────────────────────────── */
  let T = 0, streaks = [];
  function applyRule() {
    const rule = galaxy.rule();
    for (const k of Object.keys(RULES)) document.body.classList.toggle('rule-' + k, rule === k);
    streaks = [];
  }

  function tick() {
    const P = engine.player;
    if (!P || P.dead) return;
    T++;
    /* portals: arm once you are clear of every portal, fire on contact */
    const ch = worldMap.getCurrentChamber();
    const sys = galaxy.current;
    if (!(typeof graveChoir !== 'undefined' && graveChoir.active) && sys) {
      let nearest = Infinity, hit = null;
      for (const p of portalsOf(sys)) {
        if (p.gx !== ch.gridX || p.gy !== ch.gridY) continue;
        const d = Math.hypot(P.x - p.x, P.y - p.y);
        if (d < nearest) { nearest = d; hit = p; }
      }
      if (!galaxy.armed && nearest > 450) galaxy.armed = true;
      if (galaxy.armed && hit && nearest < 115) { jump(hit.to); return; }
    }
    const rule = galaxy.rule();
    if (!rule || ch.isHaven) return;
    if (rule === 'riptide') {
      const cx = Math.cos(sys.drift), cy = Math.sin(sys.drift), k = RULE_CFG.drift;
      P.vx += cx * k; P.vy += cy * k;
      /* enemies keep more momentum (damping 0.94 vs your 0.88), so they take a smaller push to drift alike */
      for (const e of engine.enemies) if (!e.isBoss && e.archetype !== 'outpost') { e.vx += cx * k * 0.25; e.vy += cy * k * 0.25; }
      for (const p of engine.projectiles) { p.x += cx * 1.1; p.y += cy * 1.1; }
    } else if (rule === 'foundry') {
      if (T % RULE_CFG.partEvery === 0) {
        const a = Math.random() * TAU, d = 260 + Math.random() * 380;
        const types = ['cannon', 'thruster', 'pod', 'shield', 'spike'];
        progression.spawnSalvage(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d,
          { part: { type: types[Math.random() * types.length | 0], radius: 10 + (Math.random() * 12 | 0) } });
        particleSystem.spawnBubbleBurst(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, '#ff8c42', 8);
      }
      if (T % RULE_CFG.slagEvery === 0) {
        const a = Math.random() * TAU, sx = P.x + Math.cos(a) * 950, sy = P.y + Math.sin(a) * 950;
        const tx = P.x + (Math.random() - 0.5) * 240, ty = P.y + (Math.random() - 0.5) * 240;
        const spd = 9 * (typeof enemyPace === 'function' ? enemyPace() : 2), aa = Math.atan2(ty - sy, tx - sx);
        engine.projectiles.push(new Projectile(sx, sy, Math.cos(aa) * spd, Math.sin(aa) * spd,
          { color: '#ff8c42', damage: 9, radius: 13, isPlayer: false, type: 'mortar', life: 160 }));
      }
    } else if (rule === 'blacksun') {
      if (T % RULE_CFG.pingEvery === 0) {
        particleSystem.particles.push(new Particle(P.x, P.y, { vx: 1e-4, vy: 1e-4, type: 'ring', radius: 30,
          maxRadius: RULE_CFG.pingRange, color: '#bc13fe', decay: 0.018 }));
        for (const e of engine.enemies) if (Math.hypot(e.x - P.x, e.y - P.y) < RULE_CFG.pingRange) e._ping = 1;
        if (typeof soundEngine !== 'undefined' && soundEngine.ctx && !soundEngine.muted) soundEngine.playPhrase([1318.5, 987.8], 0.1);
      }
      for (const e of engine.enemies) if (e._ping) e._ping = Math.max(0, e._ping - 1 / 150);
    }
  }

  /* BLACK SUN: the lighting pass goes nearly black with a small pool, and each
     pinged hull burns a hole in the dark that fades as the echo dies. */
  function darkLight(lightCtx, sx, sy, radius, pixelScale) {
    const w = lightCtx.canvas.width, h = lightCtx.canvas.height;
    const z = engine.camera.zoom, k = w / engine.viewportWidth;
    lightCtx.clearRect(0, 0, w, h);
    lightCtx.fillStyle = 'rgba(0,0,0,0.93)';
    lightCtx.fillRect(0, 0, w, h);
    lightCtx.save();
    lightCtx.globalCompositeOperation = 'destination-out';
    const R = RULE_CFG.darkSight * z * k;
    let g = lightCtx.createRadialGradient(sx, sy, R * 0.2, sx, sy, R);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = g; lightCtx.beginPath(); lightCtx.arc(sx, sy, R, 0, TAU); lightCtx.fill();
    for (const e of engine.enemies) {
      if (!e._ping) continue;
      const ex = (e.x - engine.camera.x) * z * k, ey = (e.y - engine.camera.y) * z * k, er = (e.coreRadius * 2.6 + 30) * z * k;
      g = lightCtx.createRadialGradient(ex, ey, 0, ex, ey, er);
      g.addColorStop(0, `rgba(0,0,0,${0.95 * e._ping})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = g; lightCtx.beginPath(); lightCtx.arc(ex, ey, er, 0, TAU); lightCtx.fill();
    }
    for (const point of window.expeditions?.lights() || []) {
      const px = (point.x - engine.camera.x) * z * k, py = (point.y - engine.camera.y) * z * k, pr = 160 * z * k;
      const glow = lightCtx.createRadialGradient(px, py, 0, px, py, pr);
      glow.addColorStop(0, 'rgba(0,0,0,.9)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      lightCtx.fillStyle = glow; lightCtx.beginPath(); lightCtx.arc(px, py, pr, 0, TAU); lightCtx.fill();
    }
    lightCtx.restore();
  }

  /* RIPTIDE streaks: 40 short lines that ride the current around the camera */
  function drawStreaks(ctx, camera) {
    const sys = galaxy.current;
    if (galaxy.rule() !== 'riptide' || worldMap.getCurrentChamber().isHaven) return;
    const z = camera.zoom || 1, W = engine.viewportWidth / z, H = engine.viewportHeight / z;
    const cx = Math.cos(sys.drift), cy = Math.sin(sys.drift);
    if (streaks.length < 40) for (let i = streaks.length; i < 40; i++) streaks.push({ x: camera.x + Math.random() * W, y: camera.y + Math.random() * H, s: 4 + Math.random() * 6 });
    ctx.save();
    ctx.strokeStyle = 'rgba(94,242,224,0.16)'; ctx.lineWidth = 2 / z;
    ctx.beginPath();
    for (const s of streaks) {
      s.x += cx * s.s; s.y += cy * s.s;
      if (s.x < camera.x - 60 || s.x > camera.x + W + 60 || s.y < camera.y - 60 || s.y > camera.y + H + 60) {
        s.x = camera.x + Math.random() * W; s.y = camera.y + Math.random() * H;
      }
      ctx.moveTo(s.x - camera.x, s.y - camera.y); ctx.lineTo(s.x - camera.x - cx * 70, s.y - camera.y - cy * 70);
    }
    ctx.stroke(); ctx.restore();
  }

  /* ── portals + hubs in the world ──────────────────────────────────────── */
  function marksFor(ch) {
    const sys = galaxy.current, out = [];
    if (!sys || !ch || ch.zoneLayer) return out;
    for (const p of portalsOf(sys)) {
      if (p.gx !== ch.gridX || p.gy !== ch.gridY) continue;
      const to = galaxy.data.byId[p.to];
      const tint = to.rule ? RULES[to.rule].tint : REGIONS[to.rid].tint;
      out.push({ kind: 'jump', custom: true, to: p.to, x: p.x, y: p.y, radius: 130, spin: 0.0006, seed: 0.5, taken: false,
        def: { label: `${p.beacon ? 'BEACON' : 'JUMP'} · ${to.name}`, tint: p.beacon ? '#c9a25c' : tint, weight: 0, r: 130 } });
    }
    if (ch.isHaven) out.push({ kind: 'hub', custom: true, x: 0, y: 0, radius: 230, spin: 0.00008, seed: 0.3, taken: true, quiet: true,
      def: { label: sys.home ? 'ASTERION FORGE' : `${sys.name} ANCHORAGE`, tint: '#c9a25c', weight: 0, r: 230 } });
    return out;
  }

  function drawMarks(ctx, camera) {
    const ch = worldMap.getCurrentChamber(), t = performance.now(), z = camera.zoom || 1;
    for (const m of marksFor(ch)) {
      const sx = m.x - camera.x, sy = m.y - camera.y;
      ctx.save(); ctx.translate(sx, sy);
      if (m.kind === 'jump') {
        const to = galaxy.data.byId[m.to];
        /* a vortex: three counter-turning broken rings around a dark eye */
        ctx.fillStyle = 'rgba(2,4,10,0.85)';
        ctx.beginPath(); ctx.arc(0, 0, m.radius * 0.55, 0, TAU); ctx.fill();
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const rr = m.radius * (0.6 + i * 0.22), sp = (i % 2 ? -1 : 1) * t * (0.0012 - i * 0.0003);
          ctx.strokeStyle = m.def.tint; ctx.globalAlpha = 0.75 - i * 0.2; ctx.lineWidth = (6 - i * 1.5);
          for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(0, 0, rr, sp + j * TAU / 3, sp + j * TAU / 3 + 1.4); ctx.stroke(); }
        }
        ctx.globalAlpha = 0.9 + Math.sin(t * 0.004) * 0.1;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m.radius * 0.5);
        g.addColorStop(0, m.def.tint); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, m.radius * 0.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.textAlign = 'center';
        ctx.fillStyle = '#e8f0ee'; ctx.font = `700 ${Math.round(13 / z)}px "Space Grotesk", monospace`;
        ctx.fillText(`JUMP · ${to.name}`, 0, -m.radius - 34 / z);
        ctx.fillStyle = m.def.tint; ctx.font = `600 ${Math.round(10 / z)}px "Space Grotesk", monospace`;
        const known = galaxy.doc().visited.includes(to.id);
        ctx.fillText(`${to.region.toUpperCase()} · DANGER ${to.danger}${to.rule ? ' · ' + RULES[to.rule].name : ''}${to.hub ? ' · HUB' : ''}${known ? '' : ' · UNCHARTED'}`, 0, -m.radius - 18 / z);
      } else if (m.kind === 'hub') {
        /* an anchorage: a brass ring station with eight docking spokes */
        ctx.rotate(t * m.spin);
        ctx.strokeStyle = 'rgba(201,162,92,0.55)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(201,162,92,0.28)'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.arc(0, 0, m.radius * 0.78, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(201,162,92,0.4)';
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * m.radius * 0.78, Math.sin(a) * m.radius * 0.78);
          ctx.lineTo(Math.cos(a) * m.radius * 1.12, Math.sin(a) * m.radius * 1.12); ctx.stroke();
          ctx.fillStyle = 'rgba(94,242,224,0.6)';
          ctx.beginPath(); ctx.arc(Math.cos(a) * m.radius * 1.12, Math.sin(a) * m.radius * 1.12, 5, 0, TAU); ctx.fill();
        }
        ctx.rotate(-t * m.spin);
        ctx.fillStyle = 'rgba(201,162,92,0.85)'; ctx.textAlign = 'center';
        ctx.font = `700 ${Math.round(12 / z)}px "Space Grotesk", monospace`;
        ctx.fillText(m.def.label, 0, m.radius + 30 / z);
      }
      ctx.restore();
    }
  }

  /* ── chrome: jump flash, system card, system strip ────────────────────── */
  const el = (tag, id, parent = document.body) => { let e = document.getElementById(id); if (!e) { e = document.createElement(tag); e.id = id; parent.append(e); } return e; };
  function flash(to) {
    const f = el('div', 'jump-flash');
    f.style.setProperty('--jf', to.rule ? RULES[to.rule].tint : REGIONS[to.rid].tint);
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }
  let cardTimer = 0;
  function systemCard(sys) {
    const c = el('div', 'system-card');
    c.textContent = '';
    const k = document.createElement('div'); k.className = 'sc-kicker';
    k.textContent = sys.home ? 'HOME · NARAKA' : `${sys.region.toUpperCase()} · DANGER ${sys.danger}${sys.hub ? ' · HUB' : ''}`;
    const n = document.createElement('div'); n.className = 'sc-name'; n.textContent = sys.name;
    const l = document.createElement('div'); l.className = 'sc-line';
    l.textContent = sys.rule ? `${RULES[sys.rule].name} · ${RULES[sys.rule].line}` : sys.hub ? 'An anchorage. Calm water; you wake here if you fall nearby.' : 'Quiet water.';
    if (sys.rule) l.style.color = RULES[sys.rule].tint;
    c.append(k, n, l);
    c.classList.add('on');
    clearTimeout(cardTimer); cardTimer = setTimeout(() => c.classList.remove('on'), 3600);
  }
  function paintStrip() {
    const s = el('div', 'system-strip'), sys = galaxy.current;
    if (!sys || sys.home) { s.classList.remove('on'); return; }
    s.textContent = '';
    const n = document.createElement('b'); n.textContent = sys.name;
    // Stage 4: one danger number on screen, the sector's (the system's base rides along in brackets).
    const ch = worldMap.getCurrentChamber?.(), d = ch?.dangerLevel ?? sys.danger;
    const r = document.createElement('span'); r.textContent = `${sys.region} · sector danger ${d}${d !== sys.danger ? ` (system ${sys.danger})` : ''}${sys.hub ? ' · hub' : ''}`;
    s.append(n, r);
    if (sys.rule) { const u = document.createElement('i'); u.textContent = RULES[sys.rule].name; u.style.color = RULES[sys.rule].tint; s.append(u); }
    s.classList.add('on');
  }

  /* ── the galaxy chart (M → GALAXY) ────────────────────────────────────── */
  function mountChart() {
    const card = document.querySelector('#map-overlay .map-card'), grid = document.getElementById('matrix-grid-container');
    if (!card || !grid || document.getElementById('chart-tabs')) return;
    const tabs = document.createElement('div'); tabs.id = 'chart-tabs';
    const mk = (id, label, view) => {
      const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = label; b.className = 'chart-tab';
      b.addEventListener('click', e => { e.stopPropagation(); galaxy.view = view; renderChart(); });
      tabs.append(b);
    };
    mk('chart-tab-system', 'SYSTEM', 'system');
    mk('chart-tab-galaxy', 'GALAXY', 'galaxy');
    grid.before(tabs);
    const wrap = document.createElement('div'); wrap.id = 'galaxy-wrap';
    const cv = document.createElement('canvas'); cv.id = 'galaxy-canvas'; cv.width = 640; cv.height = 640;
    const info = document.createElement('p'); info.id = 'galaxy-info';
    wrap.append(cv, info); grid.after(wrap);
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
      let best = null, bd = 18;
      for (const s of galaxy.data.systems) { const p = toChart(s, cv); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = s; } }
      galaxy.select = best ? best.id : null; renderGalaxy();
    });
  }
  const toChart = (s, cv) => ({ x: cv.width / 2 + s.x / CFG.radius * cv.width * 0.46, y: cv.height / 2 + s.y / CFG.radius * cv.height * 0.46 });
  function renderChart() {
    const g = galaxy.view === 'galaxy';
    const grid = document.getElementById('matrix-grid-container'), wrap = document.getElementById('galaxy-wrap');
    if (!grid || !wrap) return;
    grid.style.display = g ? 'none' : '';
    wrap.style.display = g ? 'block' : 'none';
    for (const leg of document.querySelectorAll('#map-overlay .map-legend, #danger-legend')) leg.style.display = g ? 'none' : '';
    document.getElementById('chart-tab-system').classList.toggle('on', !g);
    document.getElementById('chart-tab-galaxy').classList.toggle('on', g);
    const title = document.querySelector('#map-overlay h2');
    if (title) title.textContent = g ? 'Galaxy chart' : `Sector chart · ${galaxy.current.name}`;
    const hint = document.querySelector('#map-overlay .modal-header p');
    if (hint) hint.textContent = g ? 'Fly into a jump portal (⟁ on the sector chart) to cross between systems. Tap a system to read it.'
      : 'Plan a route. Cross a sector boundary to travel. ⟁ marks a jump portal.';
    if (g) renderGalaxy(); else worldMap.renderMatrixGridModal();
  }
  function renderGalaxy() {
    const cv = document.getElementById('galaxy-canvas'); if (!cv) return;
    const c = cv.getContext('2d'), t = performance.now(), D = galaxy.data, v = galaxy.doc().visited;
    c.clearRect(0, 0, cv.width, cv.height);
    const bg = c.createRadialGradient(cv.width / 2, cv.height / 2, 10, cv.width / 2, cv.height / 2, cv.width / 2);
    bg.addColorStop(0, 'rgba(20,40,60,0.6)'); bg.addColorStop(1, 'rgba(2,4,10,0.9)');
    c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height);
    /* region rings */
    c.lineWidth = 1;
    REGIONS.forEach((R, i) => {
      c.strokeStyle = R.tint; c.globalAlpha = 0.14;
      c.beginPath(); c.arc(cv.width / 2, cv.height / 2, (i + 1) / REGIONS.length * cv.width * 0.46, 0, TAU); c.stroke();
      c.globalAlpha = 0.5; c.fillStyle = R.tint; c.font = '600 10px "Space Grotesk", monospace'; c.textAlign = 'center';
      c.fillText(R.name.toUpperCase(), cv.width / 2, cv.height / 2 - ((i + 0.55) / REGIONS.length) * cv.width * 0.46);
    });
    c.globalAlpha = 1;
    /* lanes you know */
    for (const s of D.systems) for (const n of s.links) {
      if (n < s.id) continue;
      const known = v.includes(s.id) || v.includes(n);
      if (!known) continue;
      const a = toChart(s, cv), b = toChart(D.byId[n], cv);
      c.strokeStyle = v.includes(s.id) && v.includes(n) ? 'rgba(201,162,92,0.6)' : 'rgba(201,162,92,0.22)';
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
    const wr = saveState.doc.wreck;
    for (const s of D.systems) {
      const p = toChart(s, cv), seen = v.includes(s.id), known = galaxy.known(s.id), tint = REGIONS[s.rid].tint;
      c.globalAlpha = seen ? 1 : known ? 0.6 : 0.16;
      if (s.hub) { c.fillStyle = '#c9a25c'; c.fillRect(p.x - 4, p.y - 4, 8, 8); }
      else { c.fillStyle = seen ? tint : 'rgba(0,0,0,0)'; c.strokeStyle = tint; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, 2.5 + s.size, 0, TAU); c.fill(); c.stroke(); }
      if (s.rule && known) { c.strokeStyle = RULES[s.rule].tint; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, 8 + s.size, 0, TAU); c.stroke(); }
      if (seen && (s.hub || s.id === galaxy.currentId)) { c.fillStyle = '#e8f0ee'; c.font = '600 10px "Space Grotesk", monospace'; c.textAlign = 'left'; c.fillText(s.name, p.x + 10, p.y + 3); }
      if (wr && (wr.sys || 'home') === s.id) { c.strokeStyle = '#e8c478'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 6, p.y - 6); c.lineTo(p.x + 6, p.y + 6); c.moveTo(p.x + 6, p.y - 6); c.lineTo(p.x - 6, p.y + 6); c.stroke(); }
    }
    c.globalAlpha = 1;
    const cur = toChart(galaxy.current, cv), pulse = 10 + Math.sin(t * 0.005) * 3;
    c.strokeStyle = '#5ef2e0'; c.lineWidth = 2; c.beginPath(); c.arc(cur.x, cur.y, pulse, 0, TAU); c.stroke();
    if (galaxy.select) { const p = toChart(D.byId[galaxy.select], cv); c.strokeStyle = '#ffffff'; c.setLineDash([3, 3]); c.beginPath(); c.arc(p.x, p.y, 14, 0, TAU); c.stroke(); c.setLineDash([]); }
    const info = document.getElementById('galaxy-info');
    const s = D.byId[galaxy.select || galaxy.currentId], known = galaxy.known(s.id);
    info.textContent = !known ? 'Uncharted. Jump next door to it to learn what it is.'
      : `${s.name} · ${s.region} · danger ${s.danger} · ${s.size * 2 + 1}×${s.size * 2 + 1} sectors${s.hub ? ' · HUB' : ''}${s.rule ? ' · ' + RULES[s.rule].name + ': ' + RULES[s.rule].line : ''}${s.id === galaxy.currentId ? ' · YOU ARE HERE' : ''}`;
    if (galaxy.onRenderGalaxy) galaxy.onRenderGalaxy(c, x => toChart(x, cv));
    const vis = document.getElementById('galaxy-visited');
    if (vis) vis.textContent = `${v.length} / ${D.systems.length} systems visited`;
  }

  /* ── install ──────────────────────────────────────────────────────────── */
  function install() {
    boot();
    mountChart();
    applyRule();

    /* portals + hubs ride the landmark field (bearing chevrons for free) */
    const baseLM = sectorField.landmarks.bind(sectorField);
    sectorField.landmarks = function (ch) {
      const list = baseLM(ch);
      return this._fieldPass ? list : list.concat(marksFor(ch));
    };
    const baseField = sectorField.drawField.bind(sectorField);
    sectorField.drawField = function (ctx, camera) {
      const was = this._fieldPass; this._fieldPass = true;
      try { baseField(ctx, camera); } finally { this._fieldPass = was; }
      drawMarks(ctx, camera);
    };

    const baseUpdate = engine.update.bind(engine);
    engine.update = (dt) => { baseUpdate(dt); if (!engine.paused && !engine.mapOpen && !document.hidden) tick(); };

    const baseDraw = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { drawStreaks(ctx, camera); baseDraw(ctx, camera); };

    const baseLight = fluidShader.drawLightingShader.bind(fluidShader);
    fluidShader.drawLightingShader = (lightCtx, sx, sy, radius, pixelScale) => {
      if (galaxy.rule() === 'blacksun' && !worldMap.getCurrentChamber().isHaven && !(typeof graveChoir !== 'undefined' && graveChoir.active)) {
        fluidShader._fogKey = null;   // the cached normal mask must repaint when we leave
        return darkLight(lightCtx, sx, sy, radius, pixelScale);
      }
      return baseLight(lightCtx, sx, sy, radius, pixelScale);
    };

    /* SWARM: extra motes in every non-haven sector */
    const baseLoad = engine.loadChamberEntities.bind(engine);
    engine.loadChamberEntities = () => {
      baseLoad();
      const ch = worldMap.getCurrentChamber();
      if (galaxy.rule() !== 'swarm' || !ch || ch.isCleared || ch.isHaven || ch.zoneLayer) return;
      const n = RULE_CFG.swarmExtra + ch.dangerLevel;
      const pts = sectorField.spawnPoints ? sectorField.spawnPoints(ch, n) : [];
      for (let i = 0; i < n; i++) {
        const p = pts[i] || { x: (Math.random() - 0.5) * 2000, y: (Math.random() - 0.5) * 2000 };
        const brood=new EnemyOrganism(p.x + (Math.random() - 0.5) * 120, p.y + (Math.random() - 0.5) * 120,
          { tier: Math.max(1, ch.dangerLevel - 1), archetype: 'mote' });
        brood.swarmBrood=true;engine.enemies.push(brood);
      }
    };

    /* death: wake at the nearest hub (death is relocation, never the long way back) */
    const baseRespawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = () => {
      const hub = nearestHub(galaxy.currentId);
      if (hub !== galaxy.currentId || worldMap.system !== (hub === 'home' ? null : galaxy.data.byId[hub])) enterSystemById(hub);
      const r = baseRespawn();
      if (hub !== 'home' && window.garage) garage.banner(`You wake at ${galaxy.data.byId[hub].name} ANCHORAGE`, 'good');
      return r;
    };

    /* out in the galaxy, first sight of a sector is a banner, not a modal: with
       ~1000 sectors a pause on each would be a second job */
    const baseMission = garage.showMission.bind(garage);
    garage.showMission = (mission, chamber) => {
      if (chamber && chamber.sys) return garage.banner(`${chamber.sys.name} · sector ${chamber.gridX},${chamber.gridY} · danger ${chamber.dangerLevel}`, 'good');
      return baseMission(mission, chamber);
    };
    const baseReward = garage.showReward.bind(garage);
    garage.showReward = (kicker, title, lines) => {
      if (worldMap.system && kicker === 'SECTOR CLEARED') return garage.banner(`SECTOR CLEARED · ${(lines && lines[0]) || ''}`, 'good');
      return baseReward(kicker, title, lines);
    };

    /* the chart opens on the system view, with the tabs */
    const baseToggle = engine.toggleMapModal.bind(engine);
    engine.toggleMapModal = () => { baseToggle(); if (engine.mapOpen) renderChart(); };
    setInterval(() => { if (engine.mapOpen && galaxy.view === 'galaxy') renderGalaxy(); }, 100);
    paintStrip();
  }

  if (window.engine && window.garage && typeof sectorField !== 'undefined' && sectorField._installed) install();
  else window.addEventListener('load', install);
})();
