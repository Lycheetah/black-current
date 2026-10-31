/* DEFENCE FX (Mac, 2026-10-31: "cool shielding effects, armour repair, shield repairs, make it fun").
 * Shields, armour and repairs already worked but were nearly invisible: a shield hit was a sound, the dome was a thin
 * ring the size of the core, repairs ticked silently. This layer only shows what the native systems already do:
 *   bubble    a faint shield shell sized to the whole hull while the shield holds (yours cyan, hostile warm)
 *   ripple    an arc of light where a shot meets that shell, brighter for bigger hits
 *   break     the shell shatters into shards when the shield is knocked down; it re-forms with a pulse when full
 *   armour    metal sparks where a shot reaches the hull, so shield hits and hull hits feel different
 *   repair    welding sparks crawl over your hull while repair modules restore it; motes stream in while shields recharge
 * Seams: engine.shipHit (to learn where a shot landed), engine.playerTakeDamage, EnemyOrganism.takeDamage and
 * particleSystem.draw (world pass, `x - camera.x` convention). No combat numbers change. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, MAX_FX = 48;
  const FRIEND = [95, 244, 255], HOSTILE = [255, 120, 80], METAL = ['#ffb347', '#ffd27a', '#ff7a3d'], WELD = ['#9dffb0', '#fff3b0', '#7fe0ff'];
  const fx = [];                       // live ripples, shatters and re-forms
  const reach = new WeakMap();         // nodes array -> shell radius, measured once a second
  let lastShot = null, lastTarget = null, ready = false, tick = 0;
  const playerShield = { had: 0, full: true };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  // The shell wraps the hull, not the core point: centre on the live parts (ship-local) and reach the farthest one.
  function shape(ship) {
    const nodes = ship.nodes || [], seen = reach.get(nodes);
    if (seen && tick - seen.t < 60) return seen;
    const live = nodes.filter(n => !n.lost), px = n => n.currentDx ?? n.dx ?? 0, py = n => n.currentDy ?? n.dy ?? 0;
    const cx = live.length ? live.reduce((a, n) => a + px(n), 0) / live.length : 0, cy = live.length ? live.reduce((a, n) => a + py(n), 0) / live.length : 0;
    let r = (ship.coreRadius || 18) * 2.2;
    for (const n of live) r = Math.max(r, Math.hypot(px(n) - cx, py(n) - cy) + (n.radius || 8) + 14);
    const v = { r, cx, cy, t: tick }; reach.set(nodes, v); return v;
  }
  const radiusOf = ship => shape(ship).r;
  function centre(ship) {
    const s = shape(ship), c = Math.cos(ship.angle || 0), n = Math.sin(ship.angle || 0);
    return { x: ship.x + s.cx * c - s.cy * n, y: ship.y + s.cx * n + s.cy * c };
  }
  function add(f) { if (fx.length >= MAX_FX) fx.shift(); fx.push(f); }
  function sparks(x, y, colours, n, speed) {
    if (typeof Particle === 'undefined') return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random());
      particleSystem.particles.push(new Particle(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, radius: 1.5 + Math.random() * 2,
        color: colours[i % colours.length], alpha: 0.95, decay: 0.045 + Math.random() * 0.03, friction: 0.9, type: 'trail' }));
    }
  }

  /* ── events ─────────────────────────────────────────────────────────── */
  function shieldHit(ship, colour, amount, pool) {
    const r = radiusOf(ship), p = lastTarget === ship ? lastShot : null;
    const o = centre(ship), a = p ? Math.atan2(p.y - o.y, p.x - o.x) : Math.random() * TAU;
    add({ kind: 'ripple', ship, colour, a, r, life: 1, power: Math.min(1, 0.35 + amount / Math.max(20, pool * 0.25)) });
  }
  function shieldBreak(ship, colour) {
    const r = radiusOf(ship);
    add({ kind: 'shatter', ship, colour, r, life: 1, seed: Math.random() * TAU });
    const o = centre(ship); sparks(o.x, o.y, [rgba(colour, 1), '#ffffff'], 18, 7);
    if (window.engine) engine.addShake?.(4);
  }
  function hullHit(ship) {
    const p = lastTarget === ship ? lastShot : null;
    if (p) sparks(p.x, p.y, METAL, 5, 4);
  }

  /* ── drawing (world pass) ──────────────────────────────────────────── */
  function shell(ctx, cam, ship, colour, frac) {
    if (!(frac > 0)) return;
    const r = radiusOf(ship), o = centre(ship), x = o.x - cam.x, y = o.y - cam.y, z = cam.zoom || 1, t = performance.now() / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.72, x, y, r);
    g.addColorStop(0, rgba(colour, 0)); g.addColorStop(1, rgba(colour, 0.05 + frac * 0.07));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(colour, 0.12 + frac * 0.16 + Math.sin(t * 2.4) * 0.04); ctx.lineWidth = 1.6 / z;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawFx(ctx, cam) {
    const z = cam.zoom || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], o = centre(f.ship), x = o.x - cam.x, y = o.y - cam.y;
      if (f.kind === 'ripple') {
        // A bright arc where the shot met the shell, with two thinner echoes spreading round it.
        const k = 1 - f.life, spread = 0.35 + k * 0.9, a = f.life * f.power;
        ctx.lineCap = 'round';
        for (let j = 0; j < 3; j++) {
          ctx.strokeStyle = rgba(f.colour, a * (j ? 0.45 : 0.95));
          ctx.lineWidth = (j ? 1.5 : 3.5) / z + f.power * 2;
          ctx.beginPath(); ctx.arc(x, y, f.r * (1 + j * 0.06 + k * 0.04), f.a - spread * (1 + j * 0.5), f.a + spread * (1 + j * 0.5)); ctx.stroke();
        }
        ctx.fillStyle = rgba([255, 255, 255], a * 0.8);
        ctx.beginPath(); ctx.arc(x + Math.cos(f.a) * f.r, y + Math.sin(f.a) * f.r, (4 + f.power * 6) * f.life / z + 2, 0, TAU); ctx.fill();
        f.life -= 0.06;
      } else if (f.kind === 'shatter') {
        // The shell breaks into twelve shards that fly outward and fade.
        const k = 1 - f.life;
        ctx.strokeStyle = rgba(f.colour, f.life * 0.9); ctx.lineWidth = 2.5 / z;
        for (let j = 0; j < 12; j++) {
          const a = f.seed + j * TAU / 12, d = f.r * (1 + k * 0.6);
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * k * 30, y + Math.sin(a) * k * 30, d, a - 0.18, a + 0.18); ctx.stroke();
        }
        f.life -= 0.035;
      } else if (f.kind === 'reform') {
        // Full again: a ring tightens onto the shell.
        const k = f.life, r = f.r * (1 + k * 0.5);
        ctx.strokeStyle = rgba(f.colour, (1 - k) * 0.7 + 0.15); ctx.lineWidth = (2 + k * 4) / z;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        f.life -= 0.04;
      }
      if (f.life <= 0) fx.splice(i, 1);
    }
    ctx.restore();
  }
  function draw(ctx, cam) {
    if (!window.engine) return;
    tick++;
    const P = engine.player;
    if (P && !P.dead) {
      const max = Math.max(P.maxShield || 0, P.shieldHp || 0);
      shell(ctx, cam, P, FRIEND, max ? Math.min(1, (P.shieldHp || 0) / max) : 0);
    }
    for (const e of engine.enemies) if (e.maxShield > 0 && e.shield > 0) shell(ctx, cam, e, HOSTILE, e.shield / e.maxShield);
    drawFx(ctx, cam);
    if (!engine.paused) repairs(P);
  }

  /* ── repairs and recharge, read from the native numbers each frame ─── */
  let lastHp = 0, lastShieldHp = 0;
  function repairs(P) {
    if (!P || P.dead) { lastHp = 0; return; }
    const shield = P.shieldHp || 0, max = P.maxShield || 0, r = radiusOf(P);
    // Hull rising outside a dock: repair modules or hull paths at work. A spark every few frames, on a live part.
    if (lastHp && P.hp > lastHp + 1e-6 && !window.hubs?.docked && tick % 5 === 0) {
      const parts = (P.nodes || []).filter(n => !n.lost), n = parts[Math.random() * parts.length | 0];
      if (n) {
        const c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0), dx = n.currentDx ?? n.dx ?? 0, dy = n.currentDy ?? n.dy ?? 0;
        sparks(P.x + dx * c - dy * s, P.y + dx * s + dy * c, WELD, 3, 1.6);
      }
    }
    // Shield recharging: motes drawn in from the shell. Full again after being down: a re-form pulse.
    if (max > 0 && shield > lastShieldHp + 1e-6 && shield < max && tick % 6 === 0 && typeof Particle !== 'undefined') {
      const a = Math.random() * TAU;
      const o = centre(P);
      particleSystem.particles.push(new Particle(o.x + Math.cos(a) * r * 1.1, o.y + Math.sin(a) * r * 1.1,
        { vx: -Math.cos(a) * 2.2, vy: -Math.sin(a) * 2.2, radius: 2, color: '#7ff6ff', alpha: 0.8, decay: 0.03, type: 'trail' }));
    }
    if (max > 0 && shield >= max - 1e-6 && !playerShield.full) { add({ kind: 'reform', ship: P, colour: FRIEND, r, life: 1 }); playerShield.full = true; }
    if (max > 0 && shield < max * 0.98) playerShield.full = false;
    lastHp = P.hp; lastShieldHp = shield;
  }

  /* ── install ──────────────────────────────────────────────────────── */
  function install() {
    if (!window.engine || typeof particleSystem === 'undefined' || typeof EnemyOrganism === 'undefined') { setTimeout(install, 60); return; }
    // Remember which shot just connected, so the effects appear where it landed.
    const hit = engine.shipHit;
    engine.shipHit = function (ship, p) { const r = hit.call(this, ship, p); if (r) { lastShot = { x: p.x, y: p.y }; lastTarget = ship; } return r; };
    const take = engine.playerTakeDamage;
    engine.playerTakeDamage = function (amount, source, node, ...rest) {
      const P = this.player, before = P.shieldHp || 0, hp = P.hp, guarded = P.iFrames > 0 || P.dead || this.paused;
      const r = take.call(this, amount, source, node, ...rest);
      if (!guarded) {
        const after = P.shieldHp || 0, pool = Math.max(P.maxShield || 0, before);
        if (before > 0 && after > 0) shieldHit(P, FRIEND, before - after, pool);
        else if (before > 0) { shieldHit(P, FRIEND, before, pool); shieldBreak(P, FRIEND); }
        if (after <= 0 && (P.hp < hp || node)) hullHit(P);
      }
      if (lastTarget === P) lastTarget = null;
      return r;
    };
    const enemyTake = EnemyOrganism.prototype.takeDamage;
    EnemyOrganism.prototype.takeDamage = function (amount, ...rest) {
      const before = this.shield || 0, r = enemyTake.call(this, amount, ...rest);
      if (before > 0) { shieldHit(this, HOSTILE, before - (this.shield || 0), this.maxShield || before); if (!(this.shield > 0)) shieldBreak(this, HOSTILE); }
      else if (lastTarget === this) hullHit(this);
      if (lastTarget === this) lastTarget = null;
      return r;
    };
    // Part hits on an unshielded enemy go straight to its modules, not through takeDamage.
    const node = engine.damageNode;
    engine.damageNode = function (ship, n, amount, ...rest) {
      if (ship !== this.player && lastTarget === ship) { hullHit(ship); lastTarget = null; }
      return node.call(this, ship, n, amount, ...rest);
    };
    const parts = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { parts(ctx, camera); try { draw(ctx, camera); } catch (e) { /* never kill the frame */ } };
    ready = true;
  }
  window.defenceFx = { get ready() { return ready; }, get live() { return fx.length; } };
  if (document.readyState === 'complete') setTimeout(install, 400); else window.addEventListener('load', () => setTimeout(install, 400));
})();
