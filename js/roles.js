/* ==========================================================================
   F7 · ROLES + ODDITIES. Mac, 2026-10-23: "a variety of oddities to customise
   into like drone ship, laser siphon, companion ships … healers heal and
   droners be droners … lets make some magic".
   ==========================================================================
   Four new part types in the ONE hull format (`type` on a node), so the
   Shipyard, the hull skin, node destruction and saves all work unchanged:
     bay     DRONE BAY   each bay keeps one combat drone alive (relaunch 6 s)
     siphon  LASER SIPHON hold fire: a 280 px beam drains hull, heals you 50%
     wing    WING DOCK   each dock keeps one escort ship flying formation
     mender  MENDER      pulse every 3 s: regrow a part, heal escorts + structures
   Shoot the part off and its gift goes with it (B3 rules). Lateral, never a
   buff: every oddity costs GP that could have been guns (Flat Ladder).
   The ROLE is read from the parts: CARRIER · SIPHON · WING LEADER · MENDER ·
   GUNSHIP, shown in the Shipyard and the pause card.
   Dials: `roles.CFG`.
   ========================================================================== */
(() => {
  const TAU = Math.PI * 2;
  const CFG = { droneHp: 45, relaunch: 360, siphonRange: 280, siphonDps: 0.9, siphonHeal: 0.5, escortHp: 140, escortEvery: 28, menderEvery: 180, menderRange: 420, menderHeal: 45 };
  const alive = (type) => (engine.player.nodes || []).filter(n => n.type === type && !n.lost);
  const roles = window.roles = { CFG, escorts: [], beams: [], pulses: [], roleOf, label };

  function roleOf(nodes) {
    const c = t => (nodes || []).filter(n => n.type === t && !n.lost).length;
    if (c('mender') >= 2) return 'MENDER';
    if (c('bay') >= 2) return 'CARRIER';
    if (c('siphon') >= 2) return 'SIPHON';
    if (c('wing') >= 1) return 'WING LEADER';
    return 'GUNSHIP';
  }
  function label() { return roleOf(engine.player.nodes); }

  const world = (n) => {
    const P = engine.player, c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0);
    const dx = n.currentDx || 0, dy = n.currentDy || 0;
    return { x: P.x + dx * c - dy * s, y: P.y + dx * s + dy * c };
  };

  /* Bay fighters (tickBays sets `fighter`): fly to the nearest threat near the carrier, circle it and
     shoot; enemy fire that touches one hurts it, and at 0 HP it is `dead` for the bay to relaunch. */
  MitosisDrone.prototype.sortie = function (projectiles, targets) {
    const o = this.owner;
    if (this.vx === undefined) { this.x = o.x; this.y = o.y; this.vx = 0; this.vy = 0; }
    let tgt = null, best = 520;
    for (const t of targets) { if (t.hp <= 0) continue; const d = Math.hypot(t.x - o.x, t.y - o.y); if (d < best) { best = d; tgt = t; } }
    this.orbitAngle += tgt ? 0.045 : 0.03;
    const R = tgt ? (tgt.radius || 20) + 70 : this.orbitRadius, cx = tgt ? tgt.x : o.x, cy = tgt ? tgt.y : o.y;
    this.vx = (this.vx + (cx + Math.cos(this.orbitAngle) * R - this.x) * 0.02) * 0.86;
    this.vy = (this.vy + (cy + Math.sin(this.orbitAngle) * R - this.y) * 0.02) * 0.86;
    const sp = Math.hypot(this.vx, this.vy); if (sp > 7.5) { this.vx *= 7.5 / sp; this.vy *= 7.5 / sp; }
    this.x += this.vx; this.y += this.vy; if (sp > 0.3) this.heading = Math.atan2(this.vy, this.vx);
    if (this.shootTimer > 0) this.shootTimer--;
    if (tgt && this.shootTimer === 0 && Math.hypot(tgt.x - this.x, tgt.y - this.y) < 420) {
      const a = Math.atan2(tgt.y - this.y, tgt.x - this.x); this.heading = a;
      projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * weaponSpeed('spitter'), Math.sin(a) * weaponSpeed('spitter'), { color: this.color, damage: 14, isPlayer: true, radius: 4 }));
      this.shootTimer = 30;
    }
    if (this.hitT > 0) this.hitT--;
    for (const p of projectiles) {
      if (p.isPlayer || p.life <= 0 || Math.hypot(p.x - this.x, p.y - this.y) > this.radius + p.radius) continue;
      this.hp -= p.damage; p.life = 0; this.hitT = 8; if (this.hp <= 0) { this.dead = true; break; }
    }
  };
  { const update = MitosisDrone.prototype.update; MitosisDrone.prototype.update = function (projectiles, targets) { return this.fighter ? this.sortie(projectiles, targets) : update.apply(this, arguments); }; }

  /* ── drones: one per bay ──────────────────────────────────────────────── */
  let bayT = 0;
  function tickBays() {
    const shot = engine.drones.filter(d => d.dead);
    if (shot.length) { for (const d of shot) particleSystem.spawnBubbleBurst(d.x, d.y, d.color, 10); engine.drones = engine.drones.filter(d => !d.dead); roles._bayLost = true; bayT = 0; }
    const bayNodes = alive('bay'), bays = bayNodes.length, mine = engine.drones.filter(d => d.fromBay);
    while (mine.length > bays) { const d = mine.pop(); engine.drones.splice(engine.drones.indexOf(d), 1); roles._bayLost = true; bayT = 0; }
    /* a fresh bay launches fast; a drone lost to a regrown bay waits the relaunch */
    if (mine.length < bays && ++bayT >= (roles._bayLost ? CFG.relaunch : 30)) {
      roles._bayLost = false;
      bayT = 0;
      const d = new MitosisDrone(engine.player); d.fromBay = true; d.fighter = true; d.hp = d.maxHp = CFG.droneHp; d.color = engine.player.color;
      d.orbitRadius = 70 + mine.length * 22; d.orbitAngle = Math.random() * TAU;
      engine.drones.push(d);
      particleSystem.spawnBubbleBurst(engine.player.x, engine.player.y, engine.player.color, 8);
    }
    engine.drones.filter(d => d.fromBay).forEach((d, i) => { d.thief = bayNodes[i]?.quirk === 'thief'; });
  }

  /* ── siphon: a beam while the trigger is held ─────────────────────────── */
  function tickSiphon() {
    roles.beams.length = 0;
    const sip = alive('siphon');
    if (!sip.length || !engine.input || !engine.input.fire) return;
    const P = engine.player;
    for (const n of sip) {
      const o = world(n), a = Math.atan2((P._aimY ?? P.y) - o.y, (P._aimX ?? P.x + 1) - o.x);
      const ex = o.x + Math.cos(a) * CFG.siphonRange, ey = o.y + Math.sin(a) * CFG.siphonRange;
      let hit = null, best = Infinity;
      for (const e of engine.enemies) {
        const vx = ex - o.x, vy = ey - o.y, t = Math.max(0, Math.min(1, ((e.x - o.x) * vx + (e.y - o.y) * vy) / (vx * vx + vy * vy)));
        const d = Math.hypot(o.x + vx * t - e.x, o.y + vy * t - e.y);
        if (d < e.coreRadius + 6 && t < best) { best = t; hit = e; }
      }
      const end = hit ? { x: o.x + (ex - o.x) * best, y: o.y + (ey - o.y) * best } : { x: ex, y: ey };
      roles.beams.push({ x: o.x, y: o.y, ex: end.x, ey: end.y, hit: !!hit, r: n.radius });
      if (!hit) continue;
      const chained = n.quirk === 'chain';
      const dmg = CFG.siphonDps * (n.radius / 12) * (chained ? .75 : 1);
      hit.takeDamage(dmg); hit._hitAt = performance.now(); hit._aggro = true;
      P.hp = Math.min(P.maxHp, P.hp + dmg * CFG.siphonHeal * (chained ? .5 : 1));
      if (chained) {
        const other = engine.enemies.find(e => e !== hit && e.hp > 0 && Math.hypot(e.x - hit.x, e.y - hit.y) < 220);
        if (other) {
          other.takeDamage(dmg); other._aggro = true; other._hitAt = performance.now();
          roles.beams.push({ x: hit.x, y: hit.y, ex: other.x, ey: other.y, hit: true, r: n.radius });
          if (other.hp <= 0) { const i = engine.enemies.indexOf(other); if (i >= 0) engine.killEnemy(i); }
        }
      }
      if (hit.hp <= 0) { const i = engine.enemies.indexOf(hit); if (i >= 0) engine.killEnemy(i); }
    }
  }

  /* ── escorts: one per wing dock ───────────────────────────────────────── */
  const ESCORT_NODES = [{ currentDx: 0, currentDy: 0, targetDx: 0, targetDy: 0, radius: 11, type: 'core' },
    { currentDx: 14, currentDy: -8, targetDx: 14, targetDy: -8, radius: 7, type: 'cannon' },
    { currentDx: 14, currentDy: 8, targetDx: 14, targetDy: 8, radius: 7, type: 'cannon' },
    { currentDx: -12, currentDy: 0, targetDx: -12, targetDy: 0, radius: 7, type: 'thruster' }];
  let escortT = 0;
  function tickEscorts() {
    const P = engine.player, docks = alive('wing').length, E = roles.escorts;
    while (E.length > docks) E.pop();
    if (E.length < docks && ++escortT >= (E.length ? CFG.relaunch * 1.5 : 30)) {
      escortT = 0;
      E.push({ x: P.x, y: P.y, vx: 0, vy: 0, angle: P.angle || 0, hp: CFG.escortHp, t: 0, slot: E.length });
      particleSystem.spawnBubbleBurst(P.x, P.y, P.color, 10);
    }
    for (let k = E.length - 1; k >= 0; k--) {
      const e = E[k];
      const side = e.slot % 2 ? 1 : -1, back = 70 + Math.floor(e.slot / 2) * 50, a = P.angle || 0;
      const fx = P.x - Math.cos(a) * back + Math.cos(a + Math.PI / 2) * side * 80, fy = P.y - Math.sin(a) * back + Math.sin(a + Math.PI / 2) * side * 80;
      e.vx = (e.vx + (fx - e.x) * 0.02) * 0.86; e.vy = (e.vy + (fy - e.y) * 0.02) * 0.86;
      e.x += e.vx; e.y += e.vy;
      let tgt = null, bd = 620;
      for (const en of engine.enemies) { const d = Math.hypot(en.x - e.x, en.y - e.y); if (d < bd) { bd = d; tgt = en; } }
      e.angle = tgt ? Math.atan2(tgt.y - e.y, tgt.x - e.x) : a;
      if (tgt && ++e.t % CFG.escortEvery === 0) {
        const spd = typeof weaponSpeed === 'function' ? weaponSpeed('spitter') : 22;
        engine.projectiles.push(new Projectile(e.x + Math.cos(e.angle) * 16, e.y + Math.sin(e.angle) * 16, Math.cos(e.angle) * spd, Math.sin(e.angle) * spd,
          { color: P.color, damage: 12, radius: 5, isPlayer: true, type: 'spitter' }));
      }
      for (let i = engine.projectiles.length - 1; i >= 0; i--) {
        const p = engine.projectiles[i];
        if (!p.isPlayer && Math.hypot(p.x - e.x, p.y - e.y) < 16) { e.hp -= p.damage; e._hitAt = performance.now(); engine.projectiles.splice(i, 1); }
      }
      if (e.hp <= 0) { particleSystem.spawnBubbleBurst(e.x, e.y, '#ff3366', 18); E.splice(k, 1); escortT = 0; }
    }
  }

  /* ── mender: the healer's pulse ───────────────────────────────────────── */
  let menderT = 0;
  function tickMender() {
    const m = alive('mender');
    if (!m.length || ++menderT < CFG.menderEvery) return;
    menderT = 0;
    const P = engine.player, range = CFG.menderRange * (1 + (m.length - 1) * 0.25), heal = CFG.menderHeal * m.length;
    roles.pulses.push({ x: P.x, y: P.y, r: range, at: performance.now() });
    const lost = P.nodes.find(n => n.lost);
    if (lost) { lost.lost = false; if (lost.partMax !== undefined) lost.partHp = lost.partMax; }
    for (const e of roles.escorts) if (Math.hypot(e.x - P.x, e.y - P.y) < range) e.hp = Math.min(CFG.escortHp, e.hp + heal);
    if (window.hubs) for (const s of hubs.here()) if (Math.hypot(s.x - P.x, s.y - P.y) < range) s.hp = Math.min(hubs.KINDS[s.kind].hp, s.hp + heal * 2);
    P.hp = Math.min(P.maxHp, P.hp + heal * 0.25);
    if (typeof soundEngine !== 'undefined' && soundEngine.ctx && !soundEngine.muted) soundEngine.playPhrase([523.25, 659.25], 0.05);
  }

  /* ── draw ─────────────────────────────────────────────────────────────── */
  function draw(ctx, camera) {
    const z = camera.zoom || 1, now = performance.now();
    for (const b of roles.beams) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,51,102,0.35)'; ctx.lineWidth = b.r * 0.9;
      ctx.beginPath(); ctx.moveTo(b.x - camera.x, b.y - camera.y); ctx.lineTo(b.ex - camera.x, b.ey - camera.y); ctx.stroke();
      ctx.strokeStyle = b.hit ? '#ffd0dc' : 'rgba(255,120,150,0.7)'; ctx.lineWidth = 2 / z + Math.sin(now * 0.05) * 0.8;
      ctx.beginPath(); ctx.moveTo(b.x - camera.x, b.y - camera.y); ctx.lineTo(b.ex - camera.x, b.ey - camera.y); ctx.stroke();
      ctx.restore();
    }
    for (const e of roles.escorts) {
      fluidShader._lod = true;
      fluidShader.drawOrganismMembrane(ctx, e.x - camera.x, e.y - camera.y, e.angle, 11, ESCORT_NODES, engine.player.color, {});
      fluidShader._lod = false;
      if (e.hp < CFG.escortHp) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - camera.x - 16, e.y - camera.y - 26, 32, 4); ctx.fillStyle = '#5ef2a0'; ctx.fillRect(e.x - camera.x - 16, e.y - camera.y - 26, 32 * e.hp / CFG.escortHp, 4); }
    }
    for (let i = roles.pulses.length - 1; i >= 0; i--) {
      const p = roles.pulses[i], k = (now - p.at) / 700;
      if (k >= 1) { roles.pulses.splice(i, 1); continue; }
      ctx.save(); ctx.strokeStyle = `rgba(94,242,160,${0.6 * (1 - k)})`; ctx.lineWidth = 4 / z;
      ctx.beginPath(); ctx.arc(p.x - camera.x, p.y - camera.y, p.r * k, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }

  /* ── role label in the Shipyard header + pause card ───────────────────── */
  function paintRole() {
    const yardOpen = window.shipyard && shipyard.open;
    const nodes = yardOpen && shipyard.design ? shipyard.design.nodes : engine.player.nodes;
    const r = roleOf(nodes);
    let chip = document.getElementById('role-chip');
    const host = document.querySelector('#shipyard .sy-header, #shipyard header') || null;
    if (yardOpen && host) {
      if (!chip || chip.parentElement !== host) { chip && chip.remove(); chip = document.createElement('span'); chip.id = 'role-chip'; host.append(chip); }
      chip.textContent = `ROLE · ${r}`;
    }
    const where = document.getElementById('pause-where');
    if (where && menu && menu.isPaused && menu.isPaused() && !where.textContent.includes('ROLE')) where.textContent += ` · ROLE ${r}`;
  }

  function install() {
    const baseUpdate = engine.update.bind(engine);
    engine.update = (dt) => {
      baseUpdate(dt);
      if (engine.paused || engine.mapOpen || document.hidden || engine.player.dead) return;
      tickBays(); tickSiphon(); tickEscorts(); tickMender();
    };
    const baseDraw = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { baseDraw(ctx, camera); draw(ctx, camera); };
    const baseRespawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = () => { roles.escorts.length = 0; engine.drones = engine.drones.filter(d => !d.fromBay); return baseRespawn(); };
    setInterval(paintRole, 400);
  }
  if (window.engine && window.particleSystem) install(); else window.addEventListener('load', install);
})();
