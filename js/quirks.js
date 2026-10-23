/* Mechanics for recovered fittings past the first six. The registry (names, lines,
   part types) stays in loot.js QUIRKS; this file only makes them do something.
   Every quirk is lateral: a new trick paid for with a named cost.
   Hit effects are queued and resolved in tick(): engine.update is mid-way through
   its enemy loop when quirks.hit runs, so nothing here may kill or splice there. */
(() => {
  const TAU = Math.PI * 2;
  const live = q => (engine.player.nodes || []).filter(n => n.quirk === q && !n.lost);
  const world = n => {
    const P = engine.player, c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0);
    const dx = n.currentDx || 0, dy = n.currentDy || 0;
    return { x: P.x + dx * c - dy * s, y: P.y + dx * s + dy * c };
  };
  const nearest = (x, y, range, skip) => {
    let best = null, bd = range;
    for (const e of engine.enemies) { const d = Math.hypot(e.x - x, e.y - y); if (e !== skip && e.hp > 0 && d < bd) { bd = d; best = e; } }
    return best;
  };
  const hurt = (e, dmg) => {
    if (!e || e.hp <= 0 || engine.enemies.indexOf(e) < 0) return;
    e.takeDamage(dmg); e._hitAt = performance.now(); e._aggro = true;
    if (e.hp <= 0) { const i = engine.enemies.indexOf(e); if (i >= 0) engine.killEnemy(i); }
  };
  const reach = e => e.coreRadius || e.radius || 24;
  let frame = 0, thornCd = 0, pulses = 0, lastHit = -999, phaseReady = 0, topSpeed = 1;
  const mirrorCd = new WeakMap(), reactiveCd = new WeakMap(), wake = [], queue = [], arcs = [], rings = [];
  const later = fn => queue.push(fn);
  const blast = (x, y, r, dmg, color, skip) => {
    rings.push({ x, y, r, life: 14, color });
    later(() => { for (const e of engine.enemies.slice()) if (e !== skip && Math.hypot(e.x - x, e.y - y) < r + reach(e)) hurt(e, dmg); });
  };
  const shard = (x, y, angle, speed, damage, color, life) => engine.projectiles.push(new Projectile(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
    { color, damage, radius: 3, life, isPlayer: true, type: 'spitter' }));

  /* weapon quirks: shot colour is the tell, so each one reads at a glance in a fight */
  const SHOT = {
    seeker: p => { p.vx *= .75; p.vy *= .75; p.damage *= .85; p.seek = true; },
    lance: p => { p.pierce = (p.pierce || 1) + 2; p.damage *= .7; },
    cryo: p => { p.damage *= .8; p.color = '#9fe8ff'; },
    plasma: p => { p.damage *= .7; p.color = '#ff7a2e'; },
    flak: p => { p.damage *= .6; p.life = Math.floor(p.life * .6); p.color = '#ffd36e'; },
    nova: p => { p.vx *= .6; p.vy *= .6; p.damage *= .85; p.color = '#ff5fd2'; p.radius *= 1.3; },
    arc: p => { p.damage *= .8; p.color = '#b9f1ff'; },
    needle: p => { p.vx *= 1.8; p.vy *= 1.8; p.damage *= 1.35; p.radius *= .55; p.color = '#f4f7ff'; },
    hydra: p => {
      p.damage *= .45; p.color = '#7dff9b';
      const speed = Math.hypot(p.vx, p.vy), a = Math.atan2(p.vy, p.vx);
      for (const d of [-.14, .14]) engine.projectiles.push(new Projectile(p.x, p.y, Math.cos(a + d) * speed, Math.sin(a + d) * speed,
        { color: p.color, damage: p.damage, life: p.life, radius: p.radius, isPlayer: true, type: p.type }));
    },
    void: p => { p.damage *= .75; p.color = '#8a4dff'; p.radius *= 1.2; },
    leech: p => { p.damage *= .8; p.color = '#d6304f'; },
    cluster: p => { p.mine = true; p.life = 300; p.color = '#ffb347'; },
    reaper: p => { p.damage *= .8; p.color = '#c7c7c7'; },
    splitter: p => { p.damage *= .9; p.color = '#5effc8'; },
  };
  /* on-hit: called by engine for every player shot that lands, after its damage */
  const HIT = {
    cryo: (p, e) => { e._slowUntil = frame + 120; },
    plasma: (p, e) => { e._burn = { left: 120, dmg: Math.max(1, p.damage * .1) }; },
    flak: p => burst(p),
    nova: (p, e) => blast(p.x, p.y, 90, p.damage * .5, p.color, e),
    arc: (p, e) => later(() => {
      let from = e;
      for (let k = 0; k < 2; k++) {
        const t = nearest(from.x, from.y, 220, from); if (!t || t === e) break;
        arcs.push({ x1: from.x, y1: from.y, x2: t.x, y2: t.y, life: 8 }); hurt(t, p.damage * .5); from = t;
      }
    }),
    leech: p => { const P = engine.player; P.hp = Math.min(P.maxHp, P.hp + p.damage * .08); },
    cluster: (p, e) => blast(p.x, p.y, 80, p.damage * 1.6, p.color, e),
    reaper: (p, e) => { const max = e.maxHp || e.hp; if (e.hp > 0 && e.hp < max * .3) later(() => hurt(e, p.damage)); },
    splitter: (p, e) => {
      if (p.split) return;
      const a = Math.atan2(p.vy, p.vx), speed = Math.hypot(p.vx, p.vy), off = reach(e) + 12;
      for (const d of [-1, 1]) { const b = a + d; shard(e.x + Math.cos(b) * off, e.y + Math.sin(b) * off, b, speed, p.damage * .5, p.color, 40); }
    },
  };
  function burst(p) {
    if (p._burst) return; p._burst = true;
    for (let k = 0; k < 6; k++) shard(p.x, p.y, k * TAU / 6 + Math.random() * .4, 9, p.damage * .45, p.color, 18);
  }

  const quirks = window.quirks = {
    wake, SHOT, HIT,
    /* called once per player projectile from engine.fireMountGroup */
    shot(p, quirk) { if (SHOT[quirk]) { p.quirk = quirk; SHOT[quirk](p); } },
    hit(p, e) { if (HIT[p.quirk]) HIT[p.quirk](p, e); },
  };

  function tick() {
    frame++;
    const P = engine.player;
    while (queue.length) queue.shift()();
    for (let i = engine.projectiles.length - 1; i >= 0; i--) {
      const p = engine.projectiles[i]; if (!p.isPlayer) continue;
      /* seeker: steer toward the nearest hull, at most 0.06 rad a frame */
      if (p.seek) {
        const t = nearest(p.x, p.y, 520);
        if (t) {
          const a = Math.atan2(p.vy, p.vx), want = Math.atan2(t.y - p.y, t.x - p.x), speed = Math.hypot(p.vx, p.vy);
          let d = want - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          const na = a + Math.max(-.06, Math.min(.06, d)); p.vx = Math.cos(na) * speed; p.vy = Math.sin(na) * speed;
        }
      }
      if (p.quirk === 'flak' && p.life <= 2) burst(p);
      /* void: each shot drags nearby hulls toward its path */
      if (p.quirk === 'void') for (const e of engine.enemies) { const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < 140 && d > 1) { e.x += (p.x - e.x) / d * 1.6; e.y += (p.y - e.y) / d * 1.6; } }
      /* cluster: shots coast to a stop and wait as mines */
      if (p.mine) {
        p.vx *= .92; p.vy *= .92;
        const t = nearest(p.x, p.y, 60);
        if (t) { blast(p.x, p.y, 80, p.damage * 1.6, p.color); engine.projectiles.splice(i, 1); }
      }
    }
    /* status on hulls: burn ticks, cryo holds back a share of each frame's travel */
    for (const e of engine.enemies.slice()) {
      if (e._slowUntil > frame && e._px !== undefined) {
        e.x = e._px + (e.x - e._px) * .6; e.y = e._py + (e.y - e._py) * .6;
        if (frame % 12 === 0) particleSystem.spawnSpark(e.x, e.y, '#9fe8ff');
      }
      e._px = e.x; e._py = e.y;
      if (e._burn) {
        if (frame % 10 === 0) { hurt(e, e._burn.dmg); if (e.hp > 0) particleSystem.spawnSpark(e.x + (Math.random() - .5) * reach(e), e.y + (Math.random() - .5) * reach(e), '#ff7a2e'); }
        if ((e._burn.left -= 1) <= 0) e._burn = null;
      }
    }
    /* mirror: each plate turns one enemy shot back every 24 frames */
    for (const n of live('mirror')) {
      if ((mirrorCd.get(n) || 0) > frame) continue;
      const o = world(n);
      for (const p of engine.projectiles) if (!p.isPlayer && Math.hypot(p.x - o.x, p.y - o.y) < n.radius + 12) {
        p.vx = -p.vx; p.vy = -p.vy; p.isPlayer = true; p.damage *= .5; p.color = '#c8f4ff';
        mirrorCd.set(n, frame + 24); particleSystem.spawnSpark(p.x, p.y, '#c8f4ff'); break;
      }
    }
    /* ion wake: a short-lived burning trail behind each ion drive */
    if (frame % 5 === 0) for (const n of live('ion')) { const o = world(n); wake.push({ x: o.x, y: o.y, life: 80 }); }
    for (let i = wake.length - 1; i >= 0; i--) if (--wake[i].life <= 0) wake.splice(i, 1);
    if (wake.length && frame % 3 === 0) for (const e of engine.enemies.slice()) {
      if (wake.some(w => Math.hypot(w.x - e.x, w.y - e.y) < 26 + (e.coreRadius || 0))) hurt(e, .75);
    }
    /* venom ram: hulls touching a venom spike start burning */
    if (frame % 10 === 0) for (const n of live('venom')) {
      const o = world(n);
      for (const e of engine.enemies) if (Math.hypot(e.x - o.x, e.y - o.y) < n.radius + reach(e) + 24) e._burn = { left: 90, dmg: 2.5 };
    }
    /* comet drive: near top speed the hull itself rams */
    const comets = live('comet').length, speed = Math.hypot(P.vx || 0, P.vy || 0);
    topSpeed = Math.max(topSpeed * .9995, speed);
    if (comets && speed > 1 && speed > topSpeed * .6 && frame % 6 === 0) {
      for (const e of engine.enemies.slice()) if (Math.hypot(e.x - P.x, e.y - P.y) < (P.coreRadius || 30) + 40 + reach(e)) { hurt(e, 5 * comets); particleSystem.spawnSpark(e.x, e.y, '#ffe7a8'); }
    }
    /* living plating: knits the hull after three quiet seconds */
    const living = live('living').length;
    if (living && frame - lastHit > 180 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + .01 * living);
    /* menders: grave wounds inside the ring, sanctuary erases enemy shots inside it */
    if (window.roles) {
      if (roles.pulses.length > pulses) {
        const pulse = roles.pulses[roles.pulses.length - 1], graves = live('grave').length, wards = live('sanctuary').length;
        if (pulse && graves) {
          for (const e of engine.enemies.slice()) if (Math.hypot(e.x - pulse.x, e.y - pulse.y) < pulse.r) hurt(e, 18 * graves);
          P.hp = Math.max(1, P.hp - roles.CFG.menderHeal * graves * .125);
        }
        if (pulse && wards) {
          for (let i = engine.projectiles.length - 1; i >= 0; i--) { const p = engine.projectiles[i]; if (!p.isPlayer && Math.hypot(p.x - pulse.x, p.y - pulse.y) < pulse.r) { particleSystem.spawnSpark(p.x, p.y, '#fff3c4'); engine.projectiles.splice(i, 1); } }
          P.hp = Math.max(1, P.hp - roles.CFG.menderHeal * wards * .1);
        }
      }
      pulses = roles.pulses.length;
    }
    /* salvage magnet: wider pickup pull, read by every BubbleDrop each frame */
    if (window.JUICE) {
      if (quirks.baseMagnet === undefined) quirks.baseMagnet = JUICE.magnet || 220;
      JUICE.magnet = quirks.baseMagnet * Math.min(2.2, 1 + .45 * live('magnet').length);
    }
    for (let i = arcs.length - 1; i >= 0; i--) if (--arcs[i].life <= 0) arcs.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) if (--rings[i].life <= 0) rings.splice(i, 1);
    if (thornCd > 0) thornCd--;
  }

  function draw(ctx, camera) {
    if (!wake.length && !arcs.length && !rings.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const w of wake) {
      ctx.fillStyle = `rgba(94,242,224,${.28 * w.life / 80})`;
      ctx.beginPath(); ctx.arc(w.x - camera.x, w.y - camera.y, 10 + (80 - w.life) * .12, 0, TAU); ctx.fill();
    }
    for (const r of rings) {
      ctx.globalAlpha = r.life / 14; ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x - camera.x, r.y - camera.y, r.r * (1.15 - r.life / 28), 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = '#b9f1ff'; ctx.lineWidth = 2;
    for (const a of arcs) {
      ctx.globalAlpha = a.life / 8; ctx.beginPath(); ctx.moveTo(a.x1 - camera.x, a.y1 - camera.y);
      const mx = (a.x1 + a.x2) / 2 + (Math.random() - .5) * 30, my = (a.y1 + a.y2) / 2 + (Math.random() - .5) * 30;
      ctx.lineTo(mx - camera.x, my - camera.y); ctx.lineTo(a.x2 - camera.x, a.y2 - camera.y); ctx.stroke();
    }
    ctx.restore();
  }

  /* max-hull costs, per fitted part */
  const HULL_COST = { thorn: 10, comet: 8, venom: 6, tithe: 8 };
  function install() {
    const update = engine.update.bind(engine);
    engine.update = dt => { const r = update(dt); if (!engine.paused && !engine.mapOpen && !document.hidden && !engine.player.dead) tick(); return r; };
    const render = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { draw(ctx, camera); render(ctx, camera); };
    /* costs: mirror, magnet, reactive and phase plates take extra damage; thorns answer every hit */
    const take = engine.playerTakeDamage.bind(engine);
    engine.playerTakeDamage = (amount, source = 'shot', node = null) => {
      if (node?.quirk === 'mirror') amount *= 1.4;
      if (node?.quirk === 'magnet') amount *= 1.3;
      if (node?.quirk === 'phase') amount *= 1.25;
      if (node?.quirk === 'reactive') {
        amount *= 1.2;
        if ((reactiveCd.get(node) || 0) <= frame) { const o = world(node); blast(o.x, o.y, 110, 22, '#ffb36b'); reactiveCd.set(node, frame + 120); }
      }
      if (amount > 0 && !engine.player.dead) {
        lastHit = frame;
        const phases = live('phase').length;
        if (phases && frame >= phaseReady) { phaseReady = frame + Math.round(360 / phases); particleSystem.spawnSpark(engine.player.x, engine.player.y, '#e0d4ff'); return; }
      }
      const thorns = live('thorn').length;
      if (thorns && amount > 0 && !thornCd && !engine.player.dead) {
        const P = engine.player, t = nearest(P.x, P.y, 600);
        if (t) {
          const a = Math.atan2(t.y - P.y, t.x - P.x), speed = typeof weaponSpeed === 'function' ? weaponSpeed('spitter') : 22;
          engine.projectiles.push(new Projectile(P.x + Math.cos(a) * 30, P.y + Math.sin(a) * 30, Math.cos(a) * speed, Math.sin(a) * speed,
            { color: '#ff8c42', damage: 8 * thorns, radius: 5, isPlayer: true, type: 'spitter' }));
          thornCd = 10;
        }
      }
      return take(amount, source, node);
    };
    const kill = engine.killEnemy.bind(engine);
    engine.killEnemy = i => {
      const tithes = live('tithe').length, P = engine.player;
      if (tithes && engine.enemies[i]) P.hp = Math.min(P.maxHp, P.hp + 5 * tithes);
      return kill(i);
    };
    const recalc = engine.recalculatePlayerStats.bind(engine);
    engine.recalculatePlayerStats = (...a) => {
      const r = recalc(...a);
      const cost = Object.entries(HULL_COST).reduce((sum, [q, per]) => sum + per * live(q).length, 0);
      if (cost) { engine.player.maxHp = Math.max(40, engine.player.maxHp - cost); engine.player.hp = Math.min(engine.player.hp, engine.player.maxHp); }
      return r;
    };
    const core = engine.coreMod.bind(engine);
    engine.coreMod = stat => {
      let v = core(stat);
      if (stat === 'thrust') {
        const drives = (engine.player.nodes || []).filter(n => n.type === 'thruster' && !n.lost).length;
        if (drives) v *= 1 - .12 * live('ion').length / drives;
        v *= 1 - .05 * live('living').length;
      }
      return v;
    };
    const respawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = (...a) => { wake.length = queue.length = arcs.length = rings.length = 0; return respawn(...a); };
  }
  if (document.readyState === 'complete') install(); else window.addEventListener('load', install);
})();
