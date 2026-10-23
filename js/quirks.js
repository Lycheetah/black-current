/* Mechanics for the second wave of recovered fittings. The registry (names, lines,
   part types) stays in loot.js QUIRKS; this file only makes them do something.
   Every quirk is lateral: a new trick paid for with a named cost. */
(() => {
  const TAU = Math.PI * 2;
  const live = q => (engine.player.nodes || []).filter(n => n.quirk === q && !n.lost);
  const world = n => {
    const P = engine.player, c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0);
    const dx = n.currentDx || 0, dy = n.currentDy || 0;
    return { x: P.x + dx * c - dy * s, y: P.y + dx * s + dy * c };
  };
  const nearest = (x, y, range) => {
    let best = null, bd = range;
    for (const e of engine.enemies) { const d = Math.hypot(e.x - x, e.y - y); if (e.hp > 0 && d < bd) { bd = d; best = e; } }
    return best;
  };
  const hurt = (e, dmg) => {
    e.takeDamage(dmg); e._hitAt = performance.now(); e._aggro = true;
    if (e.hp <= 0) { const i = engine.enemies.indexOf(e); if (i >= 0) engine.killEnemy(i); }
  };
  let frame = 0, thornCd = 0, pulses = 0;
  const mirrorCd = new WeakMap(), wake = [];

  const quirks = window.quirks = {
    wake,
    /* called once per player projectile from engine.fireMountGroup */
    shot(p, quirk) {
      if (quirk === 'seeker') { p.vx *= .75; p.vy *= .75; p.damage *= .85; p.seek = true; }
      if (quirk === 'lance') { p.pierce = (p.pierce || 1) + 2; p.damage *= .7; }
    },
  };

  function tick() {
    frame++;
    const P = engine.player;
    /* seeker: steer toward the nearest hull, at most 0.06 rad a frame */
    for (const p of engine.projectiles) if (p.seek && p.isPlayer) {
      const t = nearest(p.x, p.y, 520); if (!t) continue;
      const a = Math.atan2(p.vy, p.vx), want = Math.atan2(t.y - p.y, t.x - p.x), speed = Math.hypot(p.vx, p.vy);
      let d = want - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      const na = a + Math.max(-.06, Math.min(.06, d)); p.vx = Math.cos(na) * speed; p.vy = Math.sin(na) * speed;
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
    /* grave mender: a new mender pulse also wounds every hull inside its ring */
    if (window.roles) {
      if (roles.pulses.length > pulses) {
        const graves = live('grave').length, pulse = roles.pulses[roles.pulses.length - 1];
        if (graves && pulse) {
          for (const e of engine.enemies.slice()) if (Math.hypot(e.x - pulse.x, e.y - pulse.y) < pulse.r) hurt(e, 18 * graves);
          P.hp = Math.max(1, P.hp - roles.CFG.menderHeal * graves * .125);
        }
      }
      pulses = roles.pulses.length;
    }
    /* salvage magnet: wider pickup pull, read by every BubbleDrop each frame */
    if (window.JUICE) {
      if (quirks.baseMagnet === undefined) quirks.baseMagnet = JUICE.magnet || 220;
      JUICE.magnet = quirks.baseMagnet * Math.min(2.2, 1 + .45 * live('magnet').length);
    }
    if (thornCd > 0) thornCd--;
  }

  function draw(ctx, camera) {
    if (!wake.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const w of wake) {
      ctx.fillStyle = `rgba(94,242,224,${.28 * w.life / 80})`;
      ctx.beginPath(); ctx.arc(w.x - camera.x, w.y - camera.y, 10 + (80 - w.life) * .12, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function install() {
    const update = engine.update.bind(engine);
    engine.update = dt => { const r = update(dt); if (!engine.paused && !engine.mapOpen && !document.hidden && !engine.player.dead) tick(); return r; };
    const render = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { draw(ctx, camera); render(ctx, camera); };
    /* costs: mirror and magnet plates take extra damage; thorns answer every hit */
    const take = engine.playerTakeDamage.bind(engine);
    engine.playerTakeDamage = (amount, source = 'shot', node = null) => {
      if (node?.quirk === 'mirror') amount *= 1.4;
      if (node?.quirk === 'magnet') amount *= 1.3;
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
    const recalc = engine.recalculatePlayerStats.bind(engine);
    engine.recalculatePlayerStats = (...a) => {
      const r = recalc(...a), thorns = live('thorn').length;
      if (thorns) { engine.player.maxHp = Math.max(40, engine.player.maxHp - 10 * thorns); engine.player.hp = Math.min(engine.player.hp, engine.player.maxHp); }
      return r;
    };
    const core = engine.coreMod.bind(engine);
    engine.coreMod = stat => {
      let v = core(stat);
      if (stat === 'thrust') {
        const drives = (engine.player.nodes || []).filter(n => n.type === 'thruster' && !n.lost).length;
        if (drives) v *= 1 - .12 * live('ion').length / drives;
      }
      return v;
    };
    const respawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = (...a) => { wake.length = 0; return respawn(...a); };
  }
  if (document.readyState === 'complete') install(); else window.addEventListener('load', install);
})();
