/* ==========================================================================
   BLACK CURRENT — B5: GRAVE CHOIR, THE FIRST SPECIAL ZONE
   ==========================================================================

   Sovereign Eclipse canon (plan §B5): a Pagan-AI war cathedral threaded
   through dead capital hulls. Three short layers, then a tomb that still
   expects an enemy.

     ⚖ ONE SEAM, LIKE sectors.js. This file WRAPS what already exists:
        · worldMap.getCurrentChamber / checkPortalTransition: a zone layer is
          just "the current chamber" while you are inside it
        · sectorField.landmarks / drawField: zone landmarks feed the SAME
          spawn points, salvage and bearing chevrons as the open ocean
        · engine.loadChamberEntities / update / playerRespawn
        · saveState.addPart / completeMission / defeatBoss
       No second engine, no second drop system, no second save.

     ⚖ THE ZONE LOOT LAW. Parts salvaged inside go to an UNBANKED buffer.
       The exit rift banks them into the hold. Death inside loses them and
       relocates you to the hub (death is relocation, never a wipe). AI cores
       fit at once and are never at risk.

     ⚖ CANON NAMES ONLY (plan §B5, SE bible Pagan-AI lineage):
       TOTEM SEED · RUNE KNIFE · SKULL HOUND · ANCESTOR ARK. The guardian has
       no canon name yet, so it is named by what it is.

   The rift into the Choir sits in the home sector so the zone is one burn away.
   ========================================================================== */

(function () {
  'use strict';

  const PAL = { veil: '188,19,254', bone: '232,224,207', glitch: '255,51,102', brass: '201,162,92' };
  const GUARDIAN = 'GRAVE CHOIR GUARDIAN';
  const RIFT = { gx: 0, gy: 0, x: 1250, y: -900, radius: 120 };
  const R = 1900;

  const CANON = { mote: 'TOTEM SEED', charger: 'RUNE KNIFE', stalker: 'SKULL HOUND', hive: 'ANCESTOR ARK' };
  const TINT  = { mote: '#c77dff', charger: '#efe6d6', stalker: '#bc13fe', hive: '#9d4edd' };

  const LAYERS = [
    { title: 'THE VEIL NAVE',         sub: 'Violet veils. Something under them is singing.', tier: 2, count: 9,  roster: ['mote', 'mote', 'charger', 'stalker'], capitals: 1, ribs: 4 },
    { title: 'THE RIB CHOIR',         sub: 'The ribs of dead capitals. Strip them.',          tier: 3, count: 12, roster: ['charger', 'stalker', 'hive', 'mote'], capitals: 3, ribs: 6 },
    { title: 'THE TOMB THAT EXPECTS', sub: 'A tomb that still expects an enemy.',            tier: 4, boss: true, roster: ['stalker'],                         capitals: 0, ribs: 8 },
  ];

  const music = (Object.values(BIOMES).find(b => b.music === 'PRESSURE') || { music: 'HAVEN' }).music;
  BOSS_KEYS[GUARDIAN] = 'void';

  /* mulberry32, same as sectors.js: the cathedral is authored by its seed. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const mark = (kind, x, y, radius, label, tint, extra) =>
    Object.assign({ kind, x, y, radius, spin: 0, seed: 0, taken: false, custom: kind !== 'wreck',
      def: { label, tint, weight: 0, r: radius } }, extra);

  function buildLayer(depth) {
    const L = LAYERS[depth];
    const rand = rng(0x6C0 + depth * 7919);
    const marks = [];
    const exit = mark('rift-exit', 0, R * 0.72, RIFT.radius, 'EXIT · BANK', '#e8c478');
    marks.push(exit);
    if (!L.boss) marks.push(mark('rift-down', 0, -R * 0.72, RIFT.radius, 'SEALED', '#6b5a7a'));
    else marks.push(mark('tomb', 0, -R * 0.42, 260, 'THE TOMB', '#bc13fe'));
    const n = L.capitals + L.ribs;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4 + (rand() - 0.5) * 0.5;
      const d = R * (0.34 + rand() * 0.4);
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (i < L.capitals) {
        /* A dead capital: a sectors.js wreck (same draw, same spawn weight), much
           bigger, with salvage still bolted inside it. */
        marks.push(mark('wreck', x, y, 320 + rand() * 120, 'DEAD CAPITAL', '#e8e0cf',
          { capital: true, custom: false, spin: (rand() - 0.5) * 0.00012, seed: rand(),
            def: { label: 'DEAD CAPITAL', tint: '#e8e0cf', weight: 1.4, r: 380 } }));
      } else {
        marks.push(mark('rib', x, y, 150 + rand() * 90, 'RIBS', '#e8e0cf',
          { rot: rand() * Math.PI, seed: rand(), quiet: true, def: { label: 'RIBS', tint: '#e8e0cf', weight: 1, r: 180 } }));
      }
    }
    return {
      zoneLayer: true, depth, gridX: 'gc', gridY: depth, radius: R,
      dangerLevel: L.tier + 2, isBossSector: !!L.boss, bossName: L.boss ? GUARDIAN : null,
      biome: 'grave-choir', mission: { gc: true, id: 'gc-' + depth }, musicTheme: music,
      isCleared: false, isExplored: true, announced: false, marks,
      getChamberTitle() { return `GRAVE CHOIR · ${L.title} · ${depth + 1}/3`; },
      remember() {}
    };
  }

  const gc = window.graveChoir = {
    active: false, depth: 0, layers: null, loot: [],
    overRift: mark('rift', RIFT.x, RIFT.y, RIFT.radius, 'RIFT · GRAVE CHOIR', '#bc13fe'),
    layer() { return this.layers[this.depth]; },
    LAYERS, CANON, GUARDIAN, RIFT
  };

  /* ── the card: the zone's cinematic voice ───────────────────────────── */
  let cardTimer = 0;
  function card(kicker, title, sub, ms = 2600) {
    let el = document.getElementById('gc-card');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gc-card'; el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    el.innerHTML = `<div class="gc-card-in"><span class="k">${kicker}</span><h2 data-t="${title}">${title}</h2><i class="rule"></i><p>${sub}</p></div>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(cardTimer); cardTimer = setTimeout(() => el.classList.remove('on'), ms);
  }

  function chrome(on) {
    document.body.classList.toggle('gc-zone', on);
    if (!on) document.body.classList.remove('gc-glitch');
    let veil = document.getElementById('gc-veil');
    if (!veil) {
      veil = document.createElement('div'); veil.id = 'gc-veil';
      veil.innerHTML = '<i class="gc-scan"></i><i class="gc-tear"></i>';
      document.body.append(veil);
      const hold = document.createElement('div'); hold.id = 'gc-hold'; document.body.append(hold);
    }
    paintHold();
  }

  function paintHold() {
    const el = document.getElementById('gc-hold'); if (!el) return;
    const L = gc.active ? LAYERS[gc.depth] : null;
    el.innerHTML = L ? `<b>${L.title}</b><span>${gc.depth + 1} / 3</span><em>${gc.loot.length ? `${gc.loot.length} UNBANKED · reach the gold rift to keep` : 'salvage here is unbanked until you extract'}</em>` : '';
  }

  /* ── moving through the Choir ───────────────────────────────────────── */
  function place(x, y) {
    const p = engine.player; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.iFrames = 60;
    if (engine.camera) { engine.camera.x = x - engine.viewportWidth / 2 / (engine.camera.zoom || 1); engine.camera.y = y - engine.viewportHeight / 2 / (engine.camera.zoom || 1); }
  }

  gc.enter = function () {
    this.active = true; this.depth = 0; this.loot = []; this.layers = LAYERS.map((_, i) => buildLayer(i));
    place(0, R * 0.72 - 320);
    engine.enterChamber({ silent: true });
    chrome(true);
    soundEngine.playAbility('dash');
    particleSystem.spawnBubbleBurst(engine.player.x, engine.player.y, '#bc13fe', 30);
    card('SOVEREIGN ECLIPSE · SPECIAL ZONE', 'GRAVE CHOIR', `${LAYERS[0].title}: ${LAYERS[0].sub}`, 3400);
  };

  gc.descend = function () {
    this.depth++;
    place(0, R * 0.72 - 320);
    engine.enterChamber({ silent: true });
    paintHold();
    soundEngine.playAbility('dash');
    const L = LAYERS[this.depth];
    card(`LAYER ${this.depth + 1} / 3`, L.title, L.sub);
  };

  gc.exit = function (banked) {
    const parts = this.loot; this.loot = []; this.active = false;
    if (banked) for (const p of parts) baseAddPart(p);
    worldMap.currentGridX = RIFT.gx; worldMap.currentGridY = RIFT.gy;
    place(RIFT.x, RIFT.y + 320);
    engine.enterChamber({ silent: true });
    chrome(false);
    if (banked) {
      if (parts.length) saveState.save();
      card('EXTRACTED', 'GRAVE CHOIR', parts.length ? `${parts.length} part${parts.length > 1 ? 's' : ''} banked to the hold · hold ${saveState.partCount()}` : 'You came back with nothing but the song.');
    }
    return parts.length;
  };

  /* ── wraps ──────────────────────────────────────────────────────────── */
  const baseGet = worldMap.getCurrentChamber.bind(worldMap);
  worldMap.getCurrentChamber = () => gc.active ? gc.layer() : baseGet();

  const basePortal = worldMap.checkPortalTransition.bind(worldMap);
  worldMap.checkPortalTransition = (p) => {
    if (!gc.active) return basePortal(p);
    const d = Math.hypot(p.x, p.y);
    if (d > R) { const a = Math.atan2(p.y, p.x); p.vx -= Math.cos(a) * 1.2; p.vy -= Math.sin(a) * 1.2; }
    return false;    // the only ways out are the rifts
  };

  const baseLM = sectorField.landmarks.bind(sectorField);
  sectorField.landmarks = function (ch) {
    let list;
    if (ch && ch.zoneLayer) list = ch.marks;
    else {
      list = baseLM(ch);
      if (ch && !ch.sys && ch.gridX === RIFT.gx && ch.gridY === RIFT.gy) list = list.concat(gc.overRift);
    }
    return this._fieldPass ? list.filter(m => !m.custom) : list;
  };
  const baseField = sectorField.drawField.bind(sectorField);
  sectorField.drawField = function (ctx, camera) {
    this._fieldPass = true;
    try { baseField(ctx, camera); } finally { this._fieldPass = false; }
    drawCustom(ctx, camera);
  };

  /* The ring lives on the prototype; sectors.js binds it on `load` (after this
     file parses), so patching the prototype puts the cathedral UNDER its field. */
  const innerMembrane = WorldMatrixMap.prototype.drawChamberMembrane;
  WorldMatrixMap.prototype.drawChamberMembrane = function (ctx, camera) {
    if (gc.active) drawCathedral(ctx, camera); else innerMembrane.call(this, ctx, camera);
  };
  if (sectorField._installed) worldMap.drawChamberMembrane = (ctx, camera) => {
    WorldMatrixMap.prototype.drawChamberMembrane.call(worldMap, ctx, camera);
    try { sectorField.drawField(ctx, camera); } catch (e) { /* never kill the frame */ }
  };

  const baseLoad = engine.loadChamberEntities.bind(engine);
  engine.loadChamberEntities = function () {
    if (!gc.active) return baseLoad();
    this.enemies = []; this.projectiles = []; this.bioMines = [];
    const ch = gc.layer(), L = LAYERS[gc.depth];
    document.getElementById('hud-chamber-title').textContent = ch.getChamberTitle();
    document.getElementById('hud-danger-lvl').textContent = `Lv. ${ch.dangerLevel}`;
    if (ch.isCleared) return;
    if (L.boss) {
      const g = new EnemyOrganism(0, -R * 0.42, { tier: 7, isBoss: true, bossType: GUARDIAN, archetype: 'stalker' });
      g.color = '#bc13fe'; g.canon = GUARDIAN;
      this.enemies.push(g);
      for (const x of [-420, 420]) this.enemies.push(dress(new EnemyOrganism(x, -R * 0.3, { tier: 4, archetype: 'stalker' }), 'stalker'));
      return;
    }
    const pts = sectorField.spawnPoints(ch, L.count) || [];
    for (let i = 0; i < L.count; i++) {
      const arch = L.roster[i % L.roster.length], pt = pts[i] || { x: 0, y: 0 };
      this.enemies.push(dress(new EnemyOrganism(pt.x, pt.y, { tier: L.tier, archetype: arch }), arch));
    }
  };
  function dress(e, arch) { e.canon = CANON[arch]; e.color = TINT[arch]; return e; }

  const baseRespawn = engine.playerRespawn.bind(engine);
  engine.playerRespawn = function () {
    if (!gc.active) return baseRespawn();
    const lost = gc.loot.length;
    gc.active = false; gc.loot = []; chrome(false);
    baseRespawn();
    card('THE CHOIR KEEPS WHAT YOU DROP', 'RELOCATED', lost ? `${lost} unbanked part${lost > 1 ? 's' : ''} lost in the Choir · your hold and designs are safe` : 'Back at Dock Nine. The rift is still open.', 3200);
  };

  const baseUpdate = engine.update.bind(engine);
  engine.update = function (dt) { baseUpdate(dt); try { tick(); } catch (e) { console.warn('[gravechoir]', e); } };

  const baseAddPart = saveState.addPart.bind(saveState);
  saveState.addPart = function (part) {
    if (!gc.active) return baseAddPart(part);
    gc.loot.push(part); paintHold();
    return `Unbanked: ${part.type} (${Math.round(part.radius)}) · ${gc.loot.length} in the Choir`;
  };
  const baseMission = saveState.completeMission.bind(saveState);
  saveState.completeMission = (m) => (m && m.gc) ? null : baseMission(m);
  const baseBoss = saveState.defeatBoss.bind(saveState);
  saveState.defeatBoss = (name) => name === GUARDIAN
    ? { bossName: GUARDIAN, lines: ['The tomb stops expecting.', 'Its core is yours. Ascend the gold rift to bank the rest.'] }
    : baseBoss(name);

  /* ── per frame ──────────────────────────────────────────────────────── */
  function tick() {
    if (engine.paused || engine.mapOpen || document.hidden) return;
    const p = engine.player; if (!p || p.dead) return;
    if (!gc.active) {
      if (worldMap.currentGridX !== RIFT.gx || worldMap.currentGridY !== RIFT.gy || worldMap.system) return;
      if (Math.hypot(p.x - RIFT.x, p.y - RIFT.y) < RIFT.radius * 0.6) gc.enter();
      return;
    }
    const ch = gc.layer();
    for (const m of ch.marks) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (m.kind === 'rift-exit' && d < m.radius * 0.6) return void gc.exit(true);
      if (m.kind === 'rift-down' && ch.isCleared && d < m.radius * 0.6) return void gc.descend();
      if (m.capital && !m.taken && d < m.radius * 0.6) crack(m);
    }
    if (ch.isCleared && !ch.announced) {
      ch.announced = true;
      const down = ch.marks.find(m => m.kind === 'rift-down');
      if (down) { down.def.label = 'DESCENT'; down.def.tint = '#bc13fe'; card('THE CHOIR FALLS SILENT', 'THE DESCENT OPENS', 'Burn for the violet rift. Or take the gold one home.', 2400); }
      else ch.marks[0].def.label = 'ASCEND · BANK';
    }
    let near = Infinity;
    for (const e of engine.enemies) near = Math.min(near, Math.hypot(e.x - p.x, e.y - p.y) - (e.isBoss ? 300 : 0));
    document.body.classList.toggle('gc-glitch', near < 520);
  }

  function crack(m) {
    m.taken = true; m.def.label = 'STRIPPED'; m.def.tint = '#6b6458';
    const types = ['cannon', 'thruster', 'spike', 'cannon'];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      progression.spawnSalvage(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60,
        { part: { type: types[(i + Math.floor(m.seed * 4)) % 4], radius: 14 + Math.round(m.seed * 10) + i * 2 } });
    }
    particleSystem.spawnBubbleBurst(m.x, m.y, '#e8e0cf', 26);
    engine.addShake(4);
    garage.banner('Dead capital stripped: 3 parts spill out', 'good');
  }

  /* ── drawing: the cathedral (UNDER everything, world pass) ──────────── */
  const motes = (() => { const r = rng(42); return Array.from({ length: 70 }, () => ({ x: (r() * 2 - 1) * R, y: (r() * 2 - 1) * R, s: 1 + r() * 2.5, v: 0.2 + r() * 0.5, p: r() * 6 })); })();

  function drawCathedral(ctx, camera) {
    const t = performance.now();
    const cx = -camera.x, cy = -camera.y;
    const boss = gc.layer().isBossSector;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(26, 8, 38, 0.72)'); g.addColorStop(1, 'rgba(8, 2, 14, 0.9)');
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();

    // the veils: slow violet curtains, wide strokes, no blur
    for (let i = 0; i < 6; i++) {
      const y0 = -R + (i + 0.5) * (2 * R / 6);
      ctx.beginPath();
      for (let x = -R; x <= R; x += 190) {
        const y = y0 + Math.sin(x * 0.0014 + t * 0.00022 + i * 1.7) * 210 + Math.sin(t * 0.0004 + i) * 60;
        x === -R ? ctx.moveTo(cx + x, cy + y) : ctx.lineTo(cx + x, cy + y);
      }
      ctx.strokeStyle = `rgba(${PAL.veil}, ${0.035 + 0.02 * Math.sin(t * 0.0007 + i)})`; ctx.lineWidth = 260; ctx.stroke();
      ctx.strokeStyle = `rgba(${PAL.veil}, 0.16)`; ctx.lineWidth = 2; ctx.stroke();
    }
    // bone dust rising
    ctx.fillStyle = `rgba(${PAL.bone}, 0.4)`;
    for (const m of motes) {
      const y = ((m.y - t * 0.02 * m.v + R) % (2 * R) + 2 * R) % (2 * R) - R;
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 0.002 + m.p);
      ctx.fillRect(cx + m.x + Math.sin(t * 0.001 + m.p) * 14, cy + y, m.s, m.s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // the wall: violet (crimson in the tomb), triple stroke like the ocean ring
    const rgb = boss ? PAL.glitch : PAL.veil;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb}, 0.07)`; ctx.lineWidth = 46; ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb}, 0.16)`; ctx.lineWidth = 18; ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb}, 0.8)`; ctx.lineWidth = 3; ctx.setLineDash([60, 18, 6, 18]); ctx.lineDashOffset = -t * 0.02; ctx.stroke();
    ctx.restore();
  }

  function drawCustom(ctx, camera) {
    const ch = worldMap.getCurrentChamber();
    const t = performance.now();
    const z = camera.zoom || 1;
    for (const m of sectorField.landmarks(ch)) {
      const sx = m.x - camera.x, sy = m.y - camera.y;
      ctx.save(); ctx.translate(sx, sy);
      if (m.kind === 'rib') drawRibs(ctx, m);
      else if (m.capital) drawCapital(ctx, m, t);
      else if (m.kind === 'tomb') drawTomb(ctx, m, t);
      else if (m.kind.startsWith('rift')) drawRift(ctx, m, t, z, m.kind === 'rift-down' && !ch.isCleared);
      ctx.restore();
    }
    if (gc.active) drawNames(ctx, camera, z);
  }

  function drawRibs(ctx, m) {
    const L = m.radius, h = m.radius * 0.8;
    ctx.rotate(m.rot);
    ctx.strokeStyle = `rgba(${PAL.bone}, 0.5)`; ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.lineWidth = 5;
    for (let k = -3; k <= 3; k++) {
      const x = k * L / 3.6, hh = h * (1 - Math.abs(k) * 0.16);
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + hh * 0.55, s * hh * 0.9, x + hh * 0.12, s * hh);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = `rgba(${PAL.veil}, 0.25)`; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(-L * 0.9, 0); ctx.lineTo(L * 0.9, 0); ctx.stroke();
  }

  function drawCapital(ctx, m, t) {
    // sectors.js drew the broken ring; the Choir adds its bone ribs and, until
    // stripped, a brass salvage glint inside.
    ctx.rotate(t * m.spin + m.seed * 6);
    ctx.strokeStyle = `rgba(${PAL.bone}, 0.42)`; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const a = -1.1 + k * 0.28;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * m.radius * 0.25, Math.sin(a) * m.radius * 0.25);
      ctx.lineTo(Math.cos(a) * m.radius * 0.95, Math.sin(a) * m.radius * 0.95);
      ctx.stroke();
    }
    ctx.lineWidth = 10; ctx.strokeStyle = `rgba(${PAL.bone}, 0.3)`;
    ctx.beginPath(); ctx.arc(0, 0, m.radius * 0.95, -1.2, 1.3); ctx.stroke();
    if (!m.taken) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.004 + m.seed * 9);
      ctx.strokeStyle = `rgba(${PAL.brass}, ${0.35 + pulse * 0.5})`; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 2.1) * 50, Math.sin(i * 2.1) * 50, 14 + pulse * 6, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  function drawTomb(ctx, m, t) {
    const w = m.radius * 1.1, h = m.radius * 1.5;
    ctx.fillStyle = 'rgba(14, 6, 22, 0.85)';
    ctx.strokeStyle = `rgba(${PAL.bone}, 0.55)`; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2, -h * 0.15);
    ctx.quadraticCurveTo(-w / 2, -h / 2, 0, -h * 0.62); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h * 0.15);
    ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.15 + k * h * 0.13); ctx.lineTo(w / 2, -h * 0.15 + k * h * 0.13); ctx.globalAlpha = 0.4; ctx.stroke(); }
    ctx.globalAlpha = 1;
    const cleared = gc.active && gc.layer().isCleared;
    const pulse = cleared ? 0.15 : 0.55 + 0.45 * Math.sin(t * 0.003);
    ctx.fillStyle = `rgba(${PAL.veil}, ${pulse})`;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.22, w * 0.22, w * 0.08 + pulse * 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${PAL.bone}, ${pulse})`;
    ctx.beginPath(); ctx.arc(0, -h * 0.22, 9, 0, Math.PI * 2); ctx.fill();
  }

  function drawRift(ctx, m, t, z, sealed) {
    const gold = m.kind === 'rift-exit';
    const rgb = sealed ? '120,104,140' : gold ? '232,196,120' : PAL.veil;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m.radius * 1.35);
    g.addColorStop(0, sealed ? 'rgba(20,16,26,0.9)' : 'rgba(4,0,8,0.98)');
    g.addColorStop(0.55, `rgba(${rgb}, ${sealed ? 0.08 : 0.22})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, m.radius * 1.35, 0, Math.PI * 2); ctx.fill();
    const spin = sealed ? 0 : t * 0.0012;
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(spin * (i % 2 ? -1 : 1) * (1 + i * 0.4));
      ctx.strokeStyle = `rgba(${rgb}, ${0.75 - i * 0.18})`; ctx.lineWidth = 4 - i;
      ctx.setLineDash(sealed ? [8, 16] : [40 - i * 8, 14 + i * 6]);
      ctx.beginPath(); ctx.arc(0, 0, m.radius * (0.45 + i * 0.27), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (!sealed) {
      ctx.strokeStyle = `rgba(${rgb}, 0.5)`; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let s = 0; s < 1; s += 0.08) {
          const a = k * Math.PI / 2 + s * 4 - t * 0.003, r = m.radius * (0.15 + s * 0.85);
          s === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = `rgba(${rgb}, 0.95)`;
    ctx.font = `600 ${Math.round(12 / z)}px "Courier New", monospace`; ctx.textAlign = 'center';
    ctx.fillText(m.def.label, 0, m.radius * 1.35 + 18 / z);
  }

  function drawNames(ctx, camera, z) {
    const p = engine.player;
    ctx.save();
    ctx.font = `${Math.round(10 / z)}px "Courier New", monospace`; ctx.textAlign = 'center';
    for (const e of engine.enemies) {
      if (!e.canon || Math.hypot(e.x - p.x, e.y - p.y) > 900) continue;
      ctx.fillStyle = e.isBoss ? 'rgba(255,51,102,0.9)' : `rgba(${PAL.bone}, 0.62)`;
      ctx.fillText(e.canon, e.x - camera.x, e.y - camera.y + e.coreRadius + 26 / z);
    }
    ctx.restore();
  }
})();
