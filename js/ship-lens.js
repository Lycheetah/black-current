/* SHIP LENS (Route 2 · Stage 1 · Mac, 2026-10-29: "a telescoping effect in a small radius over
 * your ship so you can be really zoomed out and still see your ship properly").
 * On touch screens, when your hull is small on screen, a soft-edged circle around it is redrawn
 * at close zoom: your ship, nearby hostiles and shots. The wide view stays as it is.
 * Cost is bounded: only actors inside the lens are drawn, there is no ocean or particle pass,
 * and the hull bake is cached per zoom step by shaders.js like any other view. Settings → Ship lens. */
(() => {
  'use strict';
  let ready = false, last = null;
  const CFG = { minHull: 132, fill: 1.7, share: 0.19, minR: 62, maxR: 112, minMag: 1.3, fade: 0.12 };
  let alpha = 0;
  const enabled = () => menu.settings().shipLens !== false && document.documentElement.classList.contains('mobile-layout');
  // Lens geometry for this frame, or null when the lens should not show.
  function geometry() {
    const P = engine.player, z = engine.camera.zoom;
    if (!P || P.dead || !window.roomScale?.ready || !z) return null;
    const len = roomScale.shipLength(), onScreen = len * z;
    if (onScreen >= CFG.minHull) return null;
    const R = Math.max(CFG.minR, Math.min(CFG.maxR, CFG.share * Math.min(engine.viewportWidth, engine.viewportHeight)));
    const lz = CFG.fill * R / len;
    if (lz < z * CFG.minMag) return null;
    return { R, lz, sx: (P.x - engine.camera.x) * z, sy: (P.y - engine.camera.y) * z, mag: lz / z };
  }
  function draw() {
    const g = enabled() && !engine.paused && !engine.mapOpen ? geometry() : null;
    alpha += ((g ? 1 : 0) - alpha) * CFG.fade;
    if (g) last = g;
    if (alpha < 0.02 || !last) { if (!g) last = null; return; }
    const { R, lz, sx, sy } = g || last, ctx = engine.ctx, P = engine.player;
    // A camera whose origin puts the player at (sx, sy) on screen at lens zoom.
    const cam = { ...engine.camera, x: P.x - sx / lz, y: P.y - sy / lz, zoom: lz };
    const reach = (R / lz) * 1.2, near = e => Math.hypot(e.x - P.x, e.y - P.y) < reach + (e.coreRadius || 40) * 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.clip();
    const bg = ctx.createRadialGradient(sx, sy, R * 0.2, sx, sy, R);
    bg.addColorStop(0, 'rgba(8,24,34,.9)'); bg.addColorStop(1, 'rgba(4,12,20,.78)');
    ctx.fillStyle = bg; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.save(); ctx.scale(lz, lz);
    try {
      for (const e of engine.enemies) if (near(e)) e.draw(ctx, cam);
      for (const p of engine.projectiles) if (near(p)) p.draw(ctx, cam);
      const visible = P.iFrames === 0 || Math.floor(P.iFrames / 3) % 2 === 0;
      if (visible) fluidShader.drawOrganismMembrane(ctx, P.x - cam.x, P.y - cam.y, P.angle, P.coreRadius, P.nodes, P.color,
        { firing: engine.mouse.down && P.shootTimer > 0, thrusting: Math.abs(P.vx) + Math.abs(P.vy) > 0.6 });
    } catch (err) { console.warn('ship lens:', err.message); }
    ctx.restore();
    // Soft rim: a dark falloff inside the edge and a thin cyan ring, so it reads as glass, not a box.
    const rim = ctx.createRadialGradient(sx, sy, R * 0.78, sx, sy, R);
    rim.addColorStop(0, 'rgba(2,8,14,0)'); rim.addColorStop(1, 'rgba(2,8,14,.55)');
    ctx.fillStyle = rim; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = alpha * 0.8; ctx.strokeStyle = 'rgba(134,222,208,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function install() {
    if (!window.engine?.render || !window.menu?.settings || !window.roomScale?.ready || typeof fluidShader === 'undefined') { setTimeout(install, 60); return; }
    const render = engine.render;
    engine.render = function (...a) { const r = render.apply(this, a); try { draw(); } catch (err) { console.warn('ship lens:', err.message); } return r; };
    ready = true;
  }
  window.shipLens = { CFG, geometry, enabled, get alpha() { return alpha; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
