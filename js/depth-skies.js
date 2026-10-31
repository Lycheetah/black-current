/* DEPTH SKIES (Route 5 item 4, visual pass 2; Mac, 2026-10-30: "simple circles and triangles are not the art this
 * Black Current deserves"). One black sun hung in the same corner of every sector, every system and three of the four
 * guardian fights, so no place looked like anywhere. Each of the Five Depths now has its own sky body:
 *   Naraka        the spectral black sun (canon: "a luminous rim around a dark centre"); Black Sun systems keep it too
 *   Erebos        a cold blue-white star with lens spikes and a dark crescent moon
 *   Aion          a banded gold gas giant inside a tilted ring
 *   Chaos Cradle  a flaring red giant with shards of a broken moon
 *   Deep Current  no star: a violet spiral galaxy far below the current
 * plus a broad wash of the Depth's colour across that sky. Each system sets its own position, size and turn from its
 * id, so neighbouring systems differ. Painted once per Depth/system/screen size, then one drawImage a frame, in the
 * same screen-space slot drawBlackSun used (engine.js world pass, right after the ocean). */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const TINT = { Naraka: [94, 242, 224], Erebos: [143, 166, 255], Aion: [232, 196, 120], 'Chaos Cradle': [255, 140, 66], 'Deep Current': [188, 19, 254] };
  let cached = null, stats = { paints: 0, frames: 0 };

  function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function where() {
    const sys = window.galaxy?.data && galaxy.current;
    if (!sys) return { region: 'Naraka', id: 'home', rule: null };
    return { region: sys.region || 'Naraka', id: sys.id, rule: sys.rule || null };
  }

  /* ── the bodies, each painted around (0,0) at radius R into a canvas of half-size H ── */
  function erebos(g, R, r) {
    const glare = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.6);
    glare.addColorStop(0, 'rgba(255,255,255,1)'); glare.addColorStop(0.08, 'rgba(225,240,255,0.95)');
    glare.addColorStop(0.22, 'rgba(150,185,255,0.35)'); glare.addColorStop(0.6, 'rgba(110,140,255,0.08)'); glare.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glare; g.beginPath(); g.arc(0, 0, R * 2.6, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {   // lens spikes
      const a = i * TAU / 4 + 0.35, L = R * (i % 2 ? 2.2 : 3.2), s = g.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
      s.addColorStop(0, 'rgba(230,240,255,0.7)'); s.addColorStop(1, 'rgba(230,240,255,0)');
      g.strokeStyle = s; g.lineWidth = Math.max(1, R * 0.03); g.beginPath(); g.moveTo(-Math.cos(a) * L, -Math.sin(a) * L); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    // a dark moon off to one side, lit on its star-facing edge
    const mx = R * (1.6 + r() * 0.5), my = R * (0.6 + r() * 0.5), mr = R * 0.42;
    g.fillStyle = '#05070d'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    const lit = g.createRadialGradient(mx - mr * 0.9, my - mr * 0.5, mr * 0.6, mx, my, mr * 1.05);
    lit.addColorStop(0, 'rgba(200,220,255,0)'); lit.addColorStop(0.82, 'rgba(200,220,255,0)'); lit.addColorStop(0.95, 'rgba(210,228,255,0.85)'); lit.addColorStop(1, 'rgba(210,228,255,0)');
    g.save(); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.clip(); g.fillStyle = lit; g.fillRect(mx - mr * 2, my - mr * 2, mr * 4, mr * 4); g.restore();
  }
  function aion(g, R, r) {
    const tilt = -0.35 + r() * 0.3, ringA = R * 2.1, ringB = R * 0.48;
    const ring = (front) => {
      g.save(); g.rotate(tilt);
      for (const [w, a, k] of [[R * 0.16, 0.5, 1], [R * 0.06, 0.35, 1.18], [R * 0.05, 0.25, 0.84]]) {
        g.strokeStyle = `rgba(240,214,160,${a})`; g.lineWidth = w;
        g.beginPath(); g.ellipse(0, 0, ringA * k, ringB * k, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
      }
      g.restore();
    };
    ring(false);
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip(); g.rotate(tilt);
    const bands = g.createLinearGradient(0, -R, 0, R), cols = ['#5a3a1a', '#c8954a', '#e8c478', '#a86d32', '#f0d59a', '#8a5a2a', '#d4a85c', '#6a4220'];
    cols.forEach((c, i) => bands.addColorStop(i / (cols.length - 1), c));
    g.fillStyle = bands; g.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
    const shade = g.createRadialGradient(-R * 0.45, -R * 0.4, R * 0.1, 0, 0, R * 1.05);
    shade.addColorStop(0, 'rgba(255,240,210,0.25)'); shade.addColorStop(0.55, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = shade; g.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
    g.restore();
    ring(true);
  }
  function chaos(g, R, r) {
    const corona = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 2.4);
    corona.addColorStop(0, 'rgba(255,120,50,0.55)'); corona.addColorStop(0.35, 'rgba(255,70,30,0.18)'); corona.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = corona; g.beginPath(); g.arc(0, 0, R * 2.4, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,150,70,0.55)'; g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {   // flare loops
      const a = r() * TAU, s = 0.25 + r() * 0.35, h = R * (1.25 + r() * 0.5);
      g.lineWidth = Math.max(1, R * (0.03 + r() * 0.04));
      g.beginPath(); g.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      g.quadraticCurveTo(Math.cos(a + s / 2) * h, Math.sin(a + s / 2) * h, Math.cos(a + s) * R, Math.sin(a + s) * R); g.stroke();
    }
    const body = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
    body.addColorStop(0, '#ffd28a'); body.addColorStop(0.45, '#ff7a32'); body.addColorStop(0.85, '#c8321c'); body.addColorStop(1, '#7a160c');
    g.fillStyle = body; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(120,20,8,${0.15 + r() * 0.25})`; g.beginPath(); g.arc((r() - 0.5) * R * 1.6, (r() - 0.5) * R * 1.6, R * (0.08 + r() * 0.2), 0, TAU); g.fill(); }
    g.restore();
    for (let i = 0; i < 4; i++) {   // shards of a broken moon
      const a = 0.4 + r() * 1.2, d = R * (1.7 + r() * 0.9), s = R * (0.12 + r() * 0.16), x = Math.cos(a) * d, y = Math.sin(a) * d;
      g.fillStyle = '#0b0705'; g.strokeStyle = 'rgba(255,140,70,0.75)'; g.lineWidth = Math.max(1, R * 0.025);
      g.beginPath(); for (let k = 0; k < 5; k++) { const q = k * TAU / 5 + r() * 0.6, rr = s * (0.6 + r() * 0.6); g[k ? 'lineTo' : 'moveTo'](x + Math.cos(q) * rr, y + Math.sin(q) * rr); }
      g.closePath(); g.fill(); g.stroke();
    }
  }
  function deep(g, R, r) {
    const turn = r() * TAU, arms = 2 + (r() * 2 | 0);
    g.save(); g.scale(1, 0.55); g.rotate(turn);
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.6);
    halo.addColorStop(0, 'rgba(230,200,255,0.55)'); halo.addColorStop(0.15, 'rgba(188,19,254,0.25)'); halo.addColorStop(0.6, 'rgba(90,60,200,0.06)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, R * 2.6, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 1600; i++) {
      const arm = i % arms, t = r(), ang = arm * TAU / arms + t * 5.2 + (r() - 0.5) * 0.5, d = R * 2.4 * t * (0.85 + r() * 0.3);
      const hot = r() < 0.15, c = hot ? [180, 240, 255] : t < 0.25 ? [255, 220, 255] : [170 + r() * 60, 90 + r() * 60, 255];
      g.fillStyle = rgba(c, (1 - t) * 0.55 + 0.1); const s = Math.max(1, R * 0.014 * (hot ? 2 : 1));
      g.fillRect(Math.cos(ang) * d, Math.sin(ang) * d, s, s);
    }
    const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
    core.addColorStop(0, 'rgba(255,245,255,0.95)'); core.addColorStop(1, 'rgba(255,200,255,0)');
    g.fillStyle = core; g.beginPath(); g.arc(0, 0, R * 0.35, 0, TAU); g.fill();
    g.restore();
  }
  const BODY = { Erebos: erebos, Aion: aion, 'Chaos Cradle': chaos, 'Deep Current': deep };
  const SCALE = { Erebos: 1, Aion: 1.1, 'Chaos Cradle': 1.25, 'Deep Current': 2.2 };   // a galaxy is far bigger in the sky than a star

  function paint(W, H, here) {
    const r = rng(hash(here.id) ^ 0x5eed), size = 0.8 + r() * 0.55, R = Math.round(Math.min(W, H) * 0.085 * size * (SCALE[here.region] || 1)), half = Math.round(R * 3.4);
    const body = document.createElement('canvas'); body.width = body.height = half * 2;
    const g = body.getContext('2d'); g.translate(half, half); BODY[here.region](g, R, r);
    // the Depth's colour across its sky, painted small and stretched (a soft gradient survives the scaling)
    const wash = document.createElement('canvas'); wash.width = 160; wash.height = 100;
    // kept right of the quest/contract column and below the top HUD, where nothing covers the sky
    const w = wash.getContext('2d'), tint = TINT[here.region] || TINT.Naraka, bx = 0.4 + r() * 0.45, by = (here.region === 'Deep Current' ? 0.3 : 0.16) + r() * 0.2;
    const glow = w.createRadialGradient(bx * 160, by * 100, 0, bx * 160, by * 100, 150);
    glow.addColorStop(0, rgba(tint, 0.16)); glow.addColorStop(0.45, rgba(tint, 0.06)); glow.addColorStop(1, rgba(tint, 0));
    w.fillStyle = glow; w.fillRect(0, 0, 160, 100);
    stats.paints++;
    return { key: `${here.region}|${here.id}|${W}x${H}`, body, wash, half, bx, by };
  }

  function install() {
    if (typeof fluidShader === 'undefined' || !fluidShader.drawBlackSun || !window.galaxy) { setTimeout(install, 60); return; }
    const sun = fluidShader.drawBlackSun;
    fluidShader.drawBlackSun = function (ctx, camera) {
      const here = where();
      if (here.region === 'Naraka' || here.rule === 'blacksun' || !BODY[here.region] || window.graveChoir?.active) return sun.apply(this, arguments);
      const W = ctx.canvas.width, H = ctx.canvas.height, key = `${here.region}|${here.id}|${W}x${H}`;
      if (!cached || cached.key !== key) cached = paint(W, H, here);
      const c = cached, span = W + c.half * 2, spanY = H + c.half * 2;
      const px = camera ? camera.x * 0.006 : 0, py = camera ? camera.y * 0.006 : 0;
      const sx = ((((W * c.bx - px) + c.half) % span) + span) % span - c.half;
      const sy = ((((H * c.by - py) + c.half) % spanY) + spanY) % spanY - c.half;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(c.wash, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.92; ctx.drawImage(c.body, sx - c.half, sy - c.half);
      ctx.restore(); stats.frames++;
    };
  }
  window.depthSkies = { stats, where, get ready() { return !!cached || stats.frames >= 0; } };
  if (document.readyState === 'complete') setTimeout(install, 500); else window.addEventListener('load', () => setTimeout(install, 500));
})();
