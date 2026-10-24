/* Quirk art: every exotic fitting gets its own emblem on the hull, in the hold, on its shots,
   and its own voice. Pure presentation. Geometry, damage and hitboxes stay in shaders.js and
   quirks.js; nothing here changes what a part does. COLOR is the art palette, and
   witness-night-sprint checks that every shot colour quirks.SHOT sets matches it, so the two
   cannot drift apart silently. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const COLOR = {
    bouncer: '#7fe3ff', scatter: '#ffe08a', chain: '#6fffd2', overclock: '#ff9a3c', thief: '#e9c46a',
    bulwark: '#a9bccd', seeker: '#ff6b9a', lance: '#e8f0ff', mirror: '#c8f4ff', thorn: '#ff8c42',
    grave: '#a78bfa', magnet: '#ffcf5c', ion: '#5ef2e0',
    cryo: '#9fe8ff', plasma: '#ff7a2e', flak: '#ffd36e', nova: '#ff5fd2', arc: '#b9f1ff', needle: '#f4f7ff',
    hydra: '#7dff9b', void: '#8a4dff', leech: '#d6304f', cluster: '#ffb347', reaper: '#c7c7c7', splitter: '#5effc8',
    reactive: '#ffb36b', living: '#8dff7a', phase: '#e0d4ff', comet: '#ffe7a8', venom: '#b6ff3a',
    tithe: '#f3d36b', sanctuary: '#fff2b0',
  };

  /* ── path helpers, unit space: the part's radius is 1 ── */
  const poly = (c, pts, close) => { pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath(); };
  const star = (c, n, ro, ri, rot = -Math.PI / 2) => {
    for (let k = 0; k < n * 2; k++) {
      const a = rot + k * Math.PI / n, r = k % 2 ? ri : ro;
      k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
  };
  const head = (c, x, y, a, s = .2) => { c.moveTo(x + Math.cos(a + 2.5) * s, y + Math.sin(a + 2.5) * s); c.lineTo(x, y); c.lineTo(x + Math.cos(a - 2.5) * s, y + Math.sin(a - 2.5) * s); };
  const arrow = (c, x1, y1, x2, y2) => { c.moveTo(x1, y1); c.lineTo(x2, y2); head(c, x2, y2, Math.atan2(y2 - y1, x2 - x1)); };
  const ring = (c, x, y, r, a0 = 0, a1 = TAU) => { c.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r); c.arc(x, y, r, a0, a1); };
  const flame = (c, s, oy = 0) => {
    c.moveTo(0, -.7 * s + oy);
    c.bezierCurveTo(.35 * s, -.25 * s + oy, .55 * s, .1 * s + oy, .35 * s, .42 * s + oy);
    c.quadraticCurveTo(0, .75 * s + oy, -.35 * s, .42 * s + oy);
    c.bezierCurveTo(-.55 * s, .1 * s + oy, -.1 * s, -.2 * s + oy, 0, -.7 * s + oy); c.closePath();
  };
  const drop = (c, x, y, s) => {
    c.moveTo(x, y - .7 * s);
    c.bezierCurveTo(x + .15 * s, y - .4 * s, x + .5 * s, y - .05 * s, x + .5 * s, y + .22 * s);
    c.arc(x, y + .22 * s, .5 * s, 0, Math.PI);
    c.bezierCurveTo(x - .5 * s, y - .05 * s, x - .15 * s, y - .4 * s, x, y - .7 * s); c.closePath();
  };
  const hex = (c, r, rot = Math.PI / 6) => { for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); };

  /* One pen for every glyph: a dark rim so it reads on any hull, the quirk colour, a pale edge. */
  function pen(c, col) {
    const W = .13, rim = 'rgba(2,6,14,.72)';
    c.lineCap = 'round'; c.lineJoin = 'round';
    return {
      fill(path, body = col) { c.beginPath(); path(c); c.lineWidth = W * 1.5; c.strokeStyle = rim; c.stroke(); c.fillStyle = body; c.fill(); c.lineWidth = W * .4; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); },
      line(path, w = W) { c.beginPath(); path(c); c.lineWidth = w + W; c.strokeStyle = rim; c.stroke(); c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.lineWidth = w * .3; c.strokeStyle = 'rgba(255,255,255,.65)'; c.stroke(); },
      cut(path, w = W * .8) { c.beginPath(); path(c); c.lineWidth = w; c.strokeStyle = rim; c.stroke(); },
      dot(x, y, r, body = '#ffffff') { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = body; c.fill(); },
    };
  }

  const GLYPH = {
    /* the original thirteen */
    bouncer: g => g.line(c => { poly(c, [[-.62, -.42], [-.12, .42], [.5, -.2]]); head(c, .5, -.2, Math.atan2(-.62, .62)); }),
    scatter: g => g.line(c => { arrow(c, -.5, .5, .58, .05); arrow(c, -.5, .5, -.05, -.58); }),
    chain: g => { g.line(c => c.ellipse(-.24, .14, .36, .2, -.6, 0, TAU)); g.line(c => c.ellipse(.24, -.14, .36, .2, -.6, 0, TAU)); },
    overclock: g => { g.line(c => ring(c, 0, .18, .55, Math.PI * 1.08, Math.PI * 1.92)); g.line(c => { c.moveTo(0, .18); c.lineTo(.36, -.28); }); g.dot(0, .18, .12); },
    thief: g => g.line(c => { c.moveTo(.18, -.62); c.lineTo(.18, .12); c.arc(-.1, .12, .28, 0, Math.PI); c.lineTo(-.38, -.08); }, .16),
    bulwark: g => g.line(c => { c.moveTo(0, -.6); c.lineTo(0, .56); c.moveTo(-.3, -.32); c.lineTo(.3, -.32); c.moveTo(-.52, .16); c.quadraticCurveTo(-.42, .6, 0, .56); c.quadraticCurveTo(.42, .6, .52, .16); }, .15),
    seeker: g => { g.line(c => { const a1 = Math.PI * 2.08; c.arc(0, 0, .52, Math.PI * .75, a1); head(c, Math.cos(a1) * .52, Math.sin(a1) * .52, a1 + Math.PI / 2); }); g.dot(0, 0, .13, COLOR.seeker); },
    lance: g => { g.line(c => { c.moveTo(-.7, 0); c.lineTo(.3, 0); }, .12); g.fill(c => poly(c, [[.24, -.2], [.74, 0], [.24, .2]], true)); },
    mirror: g => { g.line(c => { ring(c, -.62, 0, .55, -.75, .75); ring(c, .62, 0, .55, Math.PI - .75, Math.PI + .75); }); g.dot(0, 0, .1); },
    thorn: g => g.fill(c => star(c, 3, .72, .2)),
    grave: g => { g.fill(c => { c.moveTo(-.38, .58); c.lineTo(-.38, -.12); c.arc(0, -.12, .38, Math.PI, 0); c.lineTo(.38, .58); c.closePath(); }); g.cut(c => { c.moveTo(0, -.32); c.lineTo(0, .22); c.moveTo(-.18, -.12); c.lineTo(.18, -.12); }); },
    magnet: g => { g.line(c => { c.moveTo(-.4, -.55); c.lineTo(-.4, 0); c.arc(0, 0, .4, Math.PI, 0, true); c.lineTo(.4, -.55); }, .2); g.dot(-.4, -.55, .11); g.dot(.4, -.55, .11); },
    ion: g => g.line(c => { for (const y of [-.36, 0, .36]) { c.moveTo(-.6, y); c.bezierCurveTo(-.2, y - .2, .15, y + .2, .6, y); } }, .1),
    /* the night-sprint arsenal */
    cryo: g => g.line(c => {
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3, x = Math.cos(a), y = Math.sin(a);
        c.moveTo(0, 0); c.lineTo(x * .66, y * .66);
        for (const s of [-1, 1]) { c.moveTo(x * .4, y * .4); c.lineTo(x * .4 + Math.cos(a + s * .8) * .2, y * .4 + Math.sin(a + s * .8) * .2); }
      }
    }, .09),
    plasma: g => { g.fill(c => flame(c, 1)); g.fill(c => flame(c, .5, .2), '#fff1c2'); },
    flak: g => {
      g.fill(c => {
        for (let k = 0; k < 6; k++) {
          const a = k * Math.PI / 3, px = -Math.sin(a) * .15, py = Math.cos(a) * .15;
          poly(c, [[Math.cos(a) * .72, Math.sin(a) * .72], [Math.cos(a) * .38 + px, Math.sin(a) * .38 + py], [Math.cos(a) * .38 - px, Math.sin(a) * .38 - py]], true);
        }
      });
      g.dot(0, 0, .16, COLOR.flak);
    },
    nova: g => { g.fill(c => star(c, 8, .72, .3)); g.dot(0, 0, .14); },
    arc: g => g.fill(c => poly(c, [[.14, -.74], [-.4, .08], [-.04, .08], [-.16, .74], [.4, -.12], [.04, -.12]], true)),
    needle: g => g.fill(c => { c.save(); c.rotate(-Math.PI / 4); poly(c, [[-.78, 0], [-.1, -.14], [.8, 0], [-.1, .14]], true); c.restore(); }),
    hydra: g => g.line(c => { arrow(c, 0, .6, -.5, -.42); arrow(c, 0, .6, 0, -.64); arrow(c, 0, .6, .5, -.42); }, .11),
    void: g => {
      g.line(c => { for (let k = 0; k <= 48; k++) { const t = k / 48 * Math.PI * 3.4, r = .1 + t * .058; k ? c.lineTo(Math.cos(t) * r, Math.sin(t) * r) : c.moveTo(Math.cos(t) * r, Math.sin(t) * r); } }, .1);
      g.dot(0, 0, .14, '#05010c');
    },
    leech: g => { g.fill(c => drop(c, 0, -.02, 1)); g.dot(-.16, .2, .1, 'rgba(255,255,255,.75)'); },
    cluster: g => { g.line(c => hex(c, .58)); g.dot(0, 0, .2, COLOR.cluster); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; g.dot(Math.cos(a) * .36, Math.sin(a) * .36, .07); } },
    reaper: g => { g.line(c => { c.moveTo(-.38, .66); c.lineTo(.22, -.5); }, .1); g.fill(c => { c.moveTo(.26, -.54); c.quadraticCurveTo(-.2, -.84, -.7, -.26); c.quadraticCurveTo(-.3, -.5, .14, -.3); c.closePath(); }); },
    splitter: g => g.line(c => { c.moveTo(-.62, 0); c.lineTo(-.05, 0); arrow(c, -.05, 0, .55, -.48); arrow(c, -.05, 0, .55, .48); }, .12),
    reactive: g => { g.line(c => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.moveTo(Math.cos(a) * .46, Math.sin(a) * .46); c.lineTo(Math.cos(a) * .72, Math.sin(a) * .72); } }, .11); g.fill(c => c.arc(0, 0, .3, 0, TAU)); },
    living: g => { g.fill(c => { c.moveTo(-.56, .56); c.quadraticCurveTo(-.62, -.52, .6, -.6); c.quadraticCurveTo(.52, .58, -.56, .56); c.closePath(); }); g.cut(c => { c.moveTo(-.46, .46); c.quadraticCurveTo(-.05, .05, .44, -.46); }); },
    phase: g => g.line(c => { for (let k = 0; k < 4; k++) ring(c, 0, 0, .6, k * TAU / 4, k * TAU / 4 + 1); for (let k = 0; k < 3; k++) ring(c, 0, 0, .3, k * TAU / 3 + .5, k * TAU / 3 + 1.6); }, .1),
    comet: g => { g.line(c => { c.moveTo(.05, -.05); c.lineTo(-.62, .62); c.moveTo(.24, .1); c.lineTo(-.3, .66); c.moveTo(-.1, -.24); c.lineTo(-.66, .3); }, .09); g.fill(c => c.arc(.26, -.26, .28, 0, TAU)); },
    venom: g => { g.fill(c => { poly(c, [[-.5, -.5], [-.08, -.5], [-.29, .3]], true); poly(c, [[.08, -.5], [.5, -.5], [.29, .3]], true); }); g.dot(-.29, .52, .11, COLOR.venom); g.dot(.29, .52, .11, COLOR.venom); },
    tithe: g => { g.line(c => { c.moveTo(-.46, -.52); c.quadraticCurveTo(-.46, .08, 0, .1); c.quadraticCurveTo(.46, .08, .46, -.52); c.closePath(); c.moveTo(0, .1); c.lineTo(0, .46); c.moveTo(-.3, .56); c.lineTo(.3, .56); }, .11); g.dot(0, -.24, .1, COLOR.tithe); },
    sanctuary: g => { g.line(c => ring(c, 0, 0, .64), .08); g.fill(c => poly(c, [[-.12, -.46], [.12, -.46], [.12, -.12], [.46, -.12], [.46, .12], [.12, .12], [.12, .46], [-.12, .46], [-.12, .12], [-.46, .12], [-.46, -.12], [-.12, -.12]], true)); },
  };
  /* radians per second; the rest hold still so they stay readable */
  const SPIN = { void: -1.2, reaper: 2.2, flak: .8, nova: .5, cluster: .4, phase: -.6 };

  /* Each emblem is baked once into a sprite: a glow, a dark well, the colour ring, the glyph. */
  const SIZE = 128, UNIT = 40, cache = new Map();
  const rgba = (hex6, a) => { const n = parseInt(hex6.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  function sprite(q) {
    let s = cache.get(q); if (s) return s;
    s = document.createElement('canvas'); s.width = s.height = SIZE;
    const c = s.getContext('2d'), col = COLOR[q] || '#ffffff', h = SIZE / 2;
    c.translate(h, h);
    const glow = c.createRadialGradient(0, 0, UNIT * .8, 0, 0, h);
    glow.addColorStop(0, rgba(col, .42)); glow.addColorStop(1, rgba(col, 0));
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, h, 0, TAU); c.fill();
    c.fillStyle = 'rgba(3,8,16,.62)'; c.beginPath(); c.arc(0, 0, UNIT * .95, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, UNIT * 1.02, 0, TAU); c.stroke();
    c.scale(UNIT, UNIT);
    (GLYPH[q] || (g => g.fill(p => star(p, 4, .6, .22))))(pen(c, col));
    cache.set(q, s); return s;
  }

  /* Hull emblems ride the same wobble as the part under them (shaders.js Pass 2). */
  let drawn = 0, shotsDrawn = 0;
  function emblems(ctx, x, y, angle, nodes) {
    const t = fluidShader.undulationTime || 0, now = performance.now() / 1000;
    const list = nodes.some(n => n.lost) ? nodes.filter(n => !n.lost) : nodes;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    for (let i = 0; i < list.length; i++) {
      const n = list[i]; if (!n.quirk || n.type === 'core') continue;
      const wx = (Number.isFinite(n.currentDx) ? n.currentDx : n.dx) + Math.sin(t + i) * 1.2;
      const wy = (Number.isFinite(n.currentDy) ? n.currentDy : n.dy) + Math.cos(t + i) * 1.2;
      const R = n.radius * 1.6, spin = SPIN[n.quirk];
      ctx.globalAlpha = .86 + .14 * Math.sin(now * 3 + i);
      ctx.save(); ctx.translate(wx, wy); if (spin) ctx.rotate(now * spin);
      ctx.drawImage(sprite(n.quirk), -R, -R, R * 2, R * 2);
      ctx.restore(); drawn++;
    }
    ctx.restore();
  }

  /* Shot art: drawn additively over the plain projectile disc. (c, x, y, heading, speed, radius, colour, seconds) */
  const tail = (c, x, y, a, sp, r, col) => { c.strokeStyle = col; c.globalAlpha = .45; c.lineWidth = r; c.beginPath(); c.moveTo(x - Math.cos(a) * sp * 1.3, y - Math.sin(a) * sp * 1.3); c.lineTo(x, y); c.stroke(); };
  const SHOT_ART = {
    cryo(c, x, y, a, sp, r, col, now) { c.save(); c.translate(x, y); c.rotate(now * 5); c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); poly(c, [[0, -r * 2.2], [r * 1.2, 0], [0, r * 2.2], [-r * 1.2, 0]], true); c.stroke(); c.restore(); },
    plasma(c, x, y, a, sp, r, col) {
      for (let k = 1; k <= 4; k++) {
        c.globalAlpha = .4 - k * .08; c.fillStyle = k % 2 ? col : '#ffd36e'; c.beginPath();
        c.arc(x - Math.cos(a) * k * r * 1.4 + (Math.random() - .5) * r * .6, y - Math.sin(a) * k * r * 1.4 + (Math.random() - .5) * r * .6, r * (1.1 - k * .18), 0, TAU); c.fill();
      }
    },
    flak(c, x, y, a, sp, r, col, now) { c.save(); c.translate(x, y); c.rotate(now * 9); c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); star(c, 3, r * 2, r * .8); c.stroke(); c.restore(); },
    nova(c, x, y, a, sp, r, col, now) { c.globalAlpha = .6; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * (1.9 + Math.sin(now * 12) * .4), 0, TAU); c.stroke(); },
    arc(c, x, y, a, sp, r, col) {
      c.strokeStyle = col; c.lineWidth = 1.2; c.globalAlpha = .8; c.beginPath();
      for (let k = 0; k < 2; k++) { const b = Math.random() * TAU, L = r * 3.2; c.moveTo(x, y); c.lineTo(x + Math.cos(b + .5) * L * .5, y + Math.sin(b + .5) * L * .5); c.lineTo(x + Math.cos(b) * L, y + Math.sin(b) * L); }
      c.stroke();
    },
    needle(c, x, y, a, sp, r, col) { c.strokeStyle = col; c.globalAlpha = .55; c.lineWidth = r * 1.4; c.beginPath(); c.moveTo(x - Math.cos(a) * sp * 2.4, y - Math.sin(a) * sp * 2.4); c.lineTo(x, y); c.stroke(); },
    lance(c, x, y, a, sp, r, col) { c.strokeStyle = col; c.globalAlpha = .5; c.lineWidth = r * .8; c.beginPath(); c.moveTo(x - Math.cos(a) * sp * 2, y - Math.sin(a) * sp * 2); c.lineTo(x, y); c.stroke(); },
    void(c, x, y, a, sp, r, col, now) {
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = .85; c.fillStyle = '#05010c'; c.beginPath(); c.arc(x, y, r * .8, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = col; c.lineWidth = 2;
      for (let k = 0; k < 2; k++) { const b = now * 7 + k * Math.PI; c.beginPath(); c.arc(x, y, r * 2, b, b + 1.7); c.stroke(); }
    },
    leech(c, x, y, a, sp, r, col) {
      const bx = x - Math.cos(a) * r * 4, by = y - Math.sin(a) * r * 4, px = -Math.sin(a) * r * .9, py = Math.cos(a) * r * .9;
      c.globalAlpha = .5; c.fillStyle = col; c.beginPath(); c.moveTo(bx, by); c.lineTo(x + px, y + py); c.lineTo(x - px, y - py); c.closePath(); c.fill();
    },
    cluster(c, x, y, a, sp, r, col, now) {
      const armed = sp < .6;
      c.save(); c.translate(x, y); c.rotate(now * (armed ? .6 : 3)); c.strokeStyle = col; c.lineWidth = 1.5;
      c.globalAlpha = armed ? .6 + .4 * Math.sin(now * 14) : .7; c.beginPath(); hex(c, r * 2.2, 0); c.stroke();
      if (armed) { c.globalAlpha *= .4; c.beginPath(); c.arc(0, 0, r * 5, 0, TAU); c.stroke(); }
      c.restore();
    },
    reaper(c, x, y, a, sp, r, col, now) { const b = now * 14; c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = .75; c.beginPath(); c.arc(x, y, r * 2.2, b, b + 2.2); c.stroke(); },
    splitter(c, x, y, a, sp, r, col) { c.strokeStyle = col; c.lineWidth = 1.5; c.globalAlpha = .6; c.beginPath(); for (const s of [-.45, .45]) { c.moveTo(x, y); c.lineTo(x - Math.cos(a + s) * r * 3.4, y - Math.sin(a + s) * r * 3.4); } c.stroke(); },
    bouncer(c, x, y, a, sp, r, col) { c.strokeStyle = col; c.lineWidth = 1.5; c.globalAlpha = .6; c.beginPath(); c.arc(x, y, r * 1.7, 0, TAU); c.stroke(); },
  };
  function drawShots(ctx, camera) {
    const list = engine.projectiles; if (!list || !list.length) return;
    const now = performance.now() / 1000; let open = false;
    for (const p of list) {
      if (!p.quirk || !p.isPlayer) continue;
      if (!open) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; open = true; }
      ctx.globalAlpha = 1;
      (SHOT_ART[p.quirk] || tail)(ctx, p.x - camera.x, p.y - camera.y, Math.atan2(p.vy, p.vx), Math.hypot(p.vx, p.vy), p.radius || 4, COLOR[p.quirk] || p.color || '#ffffff', now);
      shotsDrawn++;
    }
    if (open) ctx.restore();
  }

  /* Voices: [from Hz, to Hz, seconds, volume, wave, noise], read by soundscape.js voice(). Quiet
     layers over the shared shot sound, so a cryo battery chimes and a void cannon hums. */
  const VOICE = {
    'q:bouncer': [600, 900, .1, .03, 'sine', 0], 'q:scatter': [380, 180, .1, .04, 'square', .05],
    'q:seeker': [800, 1200, .14, .03, 'sine', 0], 'q:lance': [1400, 200, .16, .04, 'sawtooth', .03],
    'q:cryo': [1800, 900, .14, .035, 'sine', .015], 'q:plasma': [180, 90, .2, .05, 'sawtooth', .12],
    'q:flak': [420, 160, .1, .05, 'square', .08], 'q:nova': [110, 55, .35, .06, 'triangle', .05],
    'q:arc': [2400, 600, .09, .03, 'sawtooth', .06], 'q:needle': [3000, 1400, .06, .03, 'sine', .02],
    'q:hydra': [520, 260, .12, .035, 'triangle', .03], 'q:void': [70, 40, .4, .06, 'sine', .02],
    'q:leech': [300, 600, .18, .035, 'sine', .01], 'q:cluster': [900, 1100, .08, .03, 'square', 0],
    'q:reaper': [260, 120, .22, .04, 'sawtooth', .05], 'q:splitter': [700, 350, .1, .035, 'triangle', .02],
    'q:boom': [90, 30, .4, .09, 'triangle', .25], 'q:pop': [500, 150, .08, .04, 'square', .1],
    'q:zap': [2600, 500, .12, .04, 'sawtooth', .08], 'q:frost': [2200, 1500, .12, .03, 'sine', .02],
    'q:burn': [200, 100, .15, .03, 'sawtooth', .1], 'q:reap': [180, 60, .3, .06, 'sawtooth', .08],
    'q:drink': [400, 800, .12, .03, 'sine', 0],
  };
  const HIT_VOICE = { nova: 'q:boom', cluster: 'q:boom', flak: 'q:pop', arc: 'q:zap', cryo: 'q:frost', plasma: 'q:burn', reaper: 'q:reap', leech: 'q:drink' };
  const voice = (kind, at) => { if (typeof soundEngine !== 'undefined' && soundEngine.voice) soundEngine.voice(kind, at ? { x: at.x, y: at.y } : null); };
  if (typeof SoundEngine !== 'undefined') SoundEngine.prototype.extraVoices = VOICE;

  /* ── install: wrap, never replace ── */
  if (typeof fluidShader !== 'undefined') {
    const base = fluidShader.drawOrganismMembrane.bind(fluidShader);
    fluidShader.drawOrganismMembrane = (ctx, x, y, angle, cr, nodes, color, state) => {
      const r = base(ctx, x, y, angle, cr, nodes, color, state);
      if (nodes && nodes.some(n => n.quirk)) emblems(ctx, x, y, angle, nodes);
      return r;
    };
  }
  if (typeof particleSystem !== 'undefined') {
    const render = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { drawShots(ctx, camera); return render(ctx, camera); };
  }
  if (typeof quirks !== 'undefined') {
    const shot = quirks.shot, hit = quirks.hit;
    quirks.shot = (p, q) => { const r = shot(p, q); if (q && VOICE['q:' + q]) voice('q:' + q, p); return r; };
    quirks.hit = (p, e) => { const r = hit(p, e); const k = p && HIT_VOICE[p.quirk]; if (k) voice(k, e); return r; };
  }

  window.quirkArt = {
    COLOR, GLYPH, SHOT_ART, VOICE, SPIN, sprite, emblems, drawShots,
    has: q => !!(COLOR[q] && GLYPH[q]),
    badge(q) {
      const c = document.createElement('canvas'); c.width = c.height = 76; c.className = 'quirk-badge'; c.setAttribute('aria-hidden', 'true');
      c.getContext('2d').drawImage(sprite(q), 0, 0, 76, 76); return c;
    },
    get drawn() { return drawn; },
    get shotsDrawn() { return shotsDrawn; },
  };
})();
