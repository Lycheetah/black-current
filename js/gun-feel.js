/* GUN FEEL (overnight run step 15, the feel pass). Mac wants the guns to feel like a warship's. Hit-stop and screen shake already
 * live in engine.js (JUICE); this adds the rest of the weight, all drawn as batched path fills (no gradients, no image
 * blits) so a software canvas pays almost nothing for it:
 * - MUZZLE FLASH: every gun that fires throws a short cone and a hot core in its family's tint, sized by its class.
 * - RECOIL: shell, rail and ordnance guns push the hull back along the barrel, scaled by gun class and the frame's mass.
 *   Heavy-class guns also kick the camera (through JUICE, so Screen shake and Reduced motion still govern it).
 * - CASINGS: shell guns (electro-kinetic and ordnance) eject a spent casing sideways. It tumbles and drifts out.
 * - KILL DEBRIS: a broken hull sheds spinning plates in its own colour, their torn edges glowing hot before they cool.
 * Reduced motion: flashes are softer, and there is no camera kick or recoil. */
(() => {
  'use strict';
  const CFG = {
    flashFrames: 6, maxFlashes: 64, maxCasings: 140, casingFrames: 100, maxDebris: 64, debrisFrames: 150, hotFrames: 60,
    recoil: { kinetic: 0.05, rail: 0.07, ordnance: 0.06, beam: 0, missile: 0.012 }, recoilCap: 0.32, kickFrom: 3, kickMax: 3,
    shells: ['kinetic', 'ordnance']
  };
  const TAU = Math.PI * 2, BRASS = ['#e7c46a', '#c99a45', '#8a6a34'];
  const flashes = [], casings = [], debris = [];
  let ready = false, stats = { flashes: 0, casings: 0, debris: 0, recoils: 0, kicks: 0 };
  const reduced = () => !!window.menu?.settings?.().reducedMotion;
  const gun = w => window.arsenal?.GUNS?.[w];
  const tint = (fam, w) => window.arsenal?.FAMILIES?.[fam]?.tint || (typeof WEAPON_TYPES !== 'undefined' && WEAPON_TYPES[w]?.color) || '#ffe2a0';
  const massAccel = () => { try { return tuning.MASS[tuning.classOf(engine.player)].accel; } catch (e) { return 1; } };
  const trim = (list, max) => { if (list.length > max) list.splice(0, list.length - max); };

  function fired(w, mounts) {
    if (!mounts?.length || engine.player?.dead) return;
    const g = gun(w), fam = g?.family || 'kinetic', c = g?.c ?? 1, color = tint(fam, w), shell = CFG.shells.includes(fam), P = engine.player;
    let push = 0, ax = 0, ay = 0; const z = Math.max(0.2, engine.camera?.zoom || 1);   // never smaller than a few screen pixels when zoomed out
    for (const m of mounts) {
      const a = m.angle || 0, len = Math.max(10, (m.radius || 8) * (1.6 + c * 0.25), (14 + c * 3) / z), cos = Math.cos(a), sin = Math.sin(a);
      flashes.push({ x: m.x, y: m.y, cos, sin, len, w: len * (fam === 'beam' ? 0.22 : 0.34), color, t: CFG.flashFrames });
      stats.flashes++;
      if (shell) {
        const side = Math.random() < 0.5 ? -1 : 1, v = 1.4 + Math.random() * 1.6;
        casings.push({ x: m.x - cos * len * 0.3, y: m.y - sin * len * 0.3, vx: (P.vx || 0) - sin * side * v - cos * 0.6, vy: (P.vy || 0) + cos * side * v - sin * 0.6,
          a: a + Math.random(), va: (Math.random() - 0.5) * 0.5, len: Math.max(2.4 + c * 1.1, 5 / z), c: Math.min(5, c), t: CFG.casingFrames });
        stats.casings++;
      }
      push += (CFG.recoil[fam] || 0) * (0.5 + c * 0.25); ax += cos; ay += sin;
    }
    trim(flashes, CFG.maxFlashes); trim(casings, CFG.maxCasings);
    if (reduced()) return;
    if (push > 0) {
      const n = Math.hypot(ax, ay) || 1, k = Math.min(CFG.recoilCap, push) * massAccel();
      P.vx = (P.vx || 0) - ax / n * k; P.vy = (P.vy || 0) - ay / n * k; stats.recoils++;
    }
    if (c >= CFG.kickFrom && push > 0 && (engine.shake || 0) < CFG.kickMax) { engine.addShake?.(0.5 * (c - CFG.kickFrom + 1)); stats.kicks++; }
  }

  function shatter(e) {
    if (!e) return;
    const m = window.hostileSkins?.model?.(e), size = Math.max(e.coreRadius || 20, m ? m.W * 0.35 : 0), n = Math.min(12, 5 + Math.round(size / 40));
    const base = e.color || '#7f8a96', z = Math.max(0.2, engine.camera?.zoom || 1);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 0.8 + Math.random() * 2.6, s = Math.max(size * (0.12 + Math.random() * 0.16), (5 + Math.random() * 6) / z), k = 3 + (Math.random() < 0.4 ? 1 : 0), pts = [];
      for (let j = 0; j < k; j++) { const t = j / k * TAU + (Math.random() - 0.5) * 0.9; pts.push([Math.cos(t) * s * (0.6 + Math.random() * 0.6), Math.sin(t) * s * (0.6 + Math.random() * 0.6)]); }
      debris.push({ x: e.x + Math.cos(a) * size * 0.3, y: e.y + Math.sin(a) * size * 0.3, vx: (e.vx || 0) * 0.5 + Math.cos(a) * v, vy: (e.vy || 0) * 0.5 + Math.sin(a) * v,
        a: Math.random() * TAU, va: (Math.random() - 0.5) * 0.12, pts, color: base, t: CFG.debrisFrames });
    }
    stats.debris += n; trim(debris, CFG.maxDebris);
  }

  function step() {
    for (let i = flashes.length - 1; i >= 0; i--) if (--flashes[i].t <= 0) flashes.splice(i, 1);
    for (let i = casings.length - 1; i >= 0; i--) { const q = casings[i]; q.x += q.vx; q.y += q.vy; q.vx *= 0.985; q.vy *= 0.985; q.a += q.va; if (--q.t <= 0) casings.splice(i, 1); }
    for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.x += d.vx; d.y += d.vy; d.vx *= 0.99; d.vy *= 0.99; d.a += d.va; if (--d.t <= 0) debris.splice(i, 1); }
  }

  function draw(ctx, camera) {
    if (!flashes.length && !casings.length && !debris.length) return;
    const z = camera.zoom || 1, W = engine.viewportWidth / z, H = engine.viewportHeight / z, cx = camera.x, cy = camera.y, pad = 200;
    const seen = (x, y) => x > cx - pad && x < cx + W + pad && y > cy - pad && y < cy + H + pad;
    ctx.save();
    // debris: dark plates, then a hot rim while they are fresh
    for (const d of debris) {
      if (!seen(d.x, d.y)) continue;
      const life = d.t / CFG.debrisFrames, cs = Math.cos(d.a), sn = Math.sin(d.a), x = d.x - cx, y = d.y - cy;
      ctx.beginPath(); d.pts.forEach(([px, py], j) => { const X = x + px * cs - py * sn, Y = y + px * sn + py * cs; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
      ctx.globalAlpha = Math.min(1, life * 1.6) * 0.9; ctx.fillStyle = d.color; ctx.fill();
      ctx.globalAlpha *= 0.4; ctx.fillStyle = '#0a0d12'; ctx.fill();
      const hot = d.t - (CFG.debrisFrames - CFG.hotFrames);
      if (hot > 0) { ctx.globalAlpha = hot / CFG.hotFrames; ctx.strokeStyle = '#ffb066'; ctx.lineWidth = 2.2 / z; ctx.stroke(); }
    }
    // casings: one stroke per class and fade band
    ctx.lineCap = 'round';
    for (let band = 0; band < 3; band++) for (let c = 0; c <= 5; c++) {
      let any = false; ctx.beginPath();
      for (const q of casings) {
        if (q.c !== c || Math.min(2, Math.floor((1 - q.t / CFG.casingFrames) * 3)) !== band || !seen(q.x, q.y)) continue;
        const dx = Math.cos(q.a) * q.len * 0.5, dy = Math.sin(q.a) * q.len * 0.5, x = q.x - cx, y = q.y - cy;
        ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); any = true;
      }
      if (any) { ctx.globalAlpha = [0.95, 0.7, 0.35][band]; ctx.strokeStyle = BRASS[band]; ctx.lineWidth = Math.max(2 / z, 1.1 + c * 0.45); ctx.stroke(); }
    }
    // muzzle flashes: additive cone and core
    ctx.globalCompositeOperation = 'lighter';
    const soft = reduced() ? 0.5 : 1;
    for (const f of flashes) {
      if (!seen(f.x, f.y)) continue;
      const k = f.t / CFG.flashFrames, x = f.x - cx, y = f.y - cy, L = f.len * (0.7 + 0.5 * k), w = f.w * (0.6 + 0.4 * k);
      ctx.globalAlpha = 0.55 * k * soft; ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.moveTo(x - f.sin * w, y + f.cos * w); ctx.lineTo(x + f.cos * L, y + f.sin * L); ctx.lineTo(x + f.sin * w, y - f.cos * w); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.8 * k * soft; ctx.fillStyle = '#fff6dc';
      ctx.beginPath(); ctx.arc(x + f.cos * w * 0.4, y + f.sin * w * 0.4, w * 0.75, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function install() {
    if (typeof engine === 'undefined' || !engine.fireMountGroup || typeof particleSystem === 'undefined' || !window.arsenal?.GUNS) { setTimeout(install, 60); return; }
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, ...a) { const r = fire.call(this, w, mounts, ...a); try { fired(w, mounts); } catch (e) { } return r; };
    const kill = engine.killEnemy; engine.killEnemy = function (i, ...a) { const e = this.enemies[i]; try { shatter(e); } catch (er) { } return kill.call(this, i, ...a); };
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); if (!this.paused) try { step(); } catch (e) { } return r; };
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, camera) => { paint(ctx, camera); try { draw(ctx, camera); } catch (e) { } };
    ready = true;
  }
  window.gunFeel = { CFG, flashes, casings, debris, stats, fired, shatter, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 200));
})();
