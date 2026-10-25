/* THE TOP-DOWN KIT. Mac, 2026-10-25: "we need real ship hulls … or parts to make the hull properly" ·
 * "the weapons should be top down" · "theres no scale to the weapon only the hull area gets bigger".
 *
 * ONE painter for every place a ship is seen from above: flight, the modular slip, factory cards and
 * part icons. Guns become turrets seen from above (archetype decides the barrels, family the tint,
 * class x ship size the scale). Modular sections become hull plates that read their neighbours, so a
 * lone front cell grows a prow, an outer cell sweeps like a wing, a drive at the back shows its bells.
 * It draws only: positions, aim and hit circles stay with the engine, hardpoints and modular-ships. */
(() => {
  'use strict';
  const STEEL_HI = '#455366', STEEL_LO = '#1d2630', EDGE = '#05090d', SEAM = '#0d141b';
  const extent = new WeakMap();   // core node -> hull extent, written by the modular hull pass

  // ---- turrets ----------------------------------------------------------------------------------
  // barrel: [offset across, width, length] in turret radii; tip: brake | flare | glow | prong
  const ARCH = {
    cannon: { b: [[0, .42, 1.9]], tip: 'brake' },
    repeater: { b: [[-.25, .19, 1.75], [0, .19, 1.9], [.25, .19, 1.75]], tip: 'band' },
    scatter: { b: [[-.3, .3, 1.5], [.3, .3, 1.5]], tip: 'flare' },
    stream: { b: [[0, .18, 2.1]], tip: 'coil' },
    driver: { b: [[-.22, .13, 2.3], [.22, .13, 2.3]], tip: 'rail' },
    rifle: { b: [[0, .22, 2.7]], tip: 'scope' },
    bolt: { b: [[0, .4, 1.3]], tip: 'glow' },
    pulse: { b: [[-.32, .2, 1.15], [0, .2, 1.3], [.32, .2, 1.15]], tip: 'glow' },
    lance: { b: [[-.26, .15, 2.2], [.26, .15, 2.2]], tip: 'prong' },
    seeker: { pod: [1.3, 1.3], tubes: [2, 2] },
    rocket: { pod: [1.45, 1.6], tubes: [2, 3] },
    torpedo: { b: [[0, .7, 1.8]], tip: 'glow' },
    mortar: { b: [[0, .82, 1.1]], tip: 'bore' },
    flak: { b: [[-.45, .16, 1.3], [-.17, .16, 1.4], [.17, .16, 1.4], [.45, .16, 1.3]], tip: 'band' },
    shell: { b: [[0, .6, 2.2]], tip: 'sleeve' }
  };
  const CLS = ['POINT', 'LIGHT', 'MEDIUM', 'HEAVY', 'SIEGE', 'CAPITAL'];

  function gunInfo(id, fallbackTint) {
    const A = typeof arsenal !== 'undefined' ? arsenal : null, g = A && A.GUNS[id];
    const w = typeof WEAPON_TYPES !== 'undefined' && WEAPON_TYPES[id];
    const c = g ? g.c : Math.max(0, CLS.indexOf(w && w.cls));
    return { arch: (g && ARCH[g.arch]) ? g.arch : 'cannon', tint: (g && A.FAMILIES[g.family].tint) || (w && w.color) || fallbackTint || '#9fd8ff', c: c < 0 ? 0 : c, known: !!(g || w) };
  }
  // Turret radius: class sets the base, the ship's size multiplies it. One formula for flight and slip.
  function shipScale(E) { return Math.min(2.6, Math.max(.8, Math.sqrt((E || 40) / 40))); }
  function turretR(c, E) { return (8 + c * 2.4) * shipScale(E); }

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function barrel(ctx, x0, y, len, w) {
    rr(ctx, x0, y - w / 2, len - x0, w, Math.min(w / 2, 2)); ctx.fillStyle = '#4c5a69'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.fillStyle = 'rgba(170,190,210,.35)'; ctx.fillRect(x0, y - w / 2 + .6, len - x0, Math.max(.6, w * .22));
  }
  function turret(ctx, id, R, firing, fallbackTint) {
    const g = gunInfo(id, fallbackTint), a = ARCH[g.arch], tips = [];
    ctx.save();
    if (a.pod) {
      const [pl, pw] = a.pod, L = pl * R, W = pw * R; rr(ctx, -R * .2, -W / 2, L + R * .2, W, R * .2);
      ctx.fillStyle = '#3c4958'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = EDGE; ctx.stroke();
      const [nx, ny] = a.tubes, cw = L / nx, ch = W / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const cx = -R * .2 + cw * (i + .5) + R * .1, cy = -W / 2 + ch * (j + .5);
        ctx.beginPath(); ctx.arc(cx, cy, Math.min(cw, ch) * .32, 0, 7); ctx.fillStyle = '#070b0f'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, Math.min(cw, ch) * .14, 0, 7); ctx.fillStyle = g.tint; ctx.globalAlpha = .7; ctx.fill(); ctx.globalAlpha = 1;
        if (i === nx - 1) tips.push([L, cy, ch * .5]);
      }
    } else {
      for (const [o, w, l] of a.b) {
        const y = o * R, W = w * R, Lx = l * R; barrel(ctx, 0, y, Lx, W);
        if (a.tip === 'brake' || a.tip === 'flare' || a.tip === 'sleeve') { const k = a.tip === 'flare' ? 1.5 : 1.3, bl = R * (a.tip === 'sleeve' ? .7 : .3); rr(ctx, Lx - bl, y - W * k / 2, bl, W * k, 1.5); ctx.fillStyle = '#5b6979'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.stroke(); }
        if (a.tip === 'band' || a.tip === 'coil') { ctx.fillStyle = '#26303b'; for (let k = 0; k < (a.tip === 'coil' ? 3 : 1); k++) ctx.fillRect(Lx * (.55 + k * .14), y - W * .8, R * .12, W * 1.6); }
        if (a.tip === 'scope') { rr(ctx, R * .5, y - W * 2.2, R * 1.1, W * .9, 1); ctx.fillStyle = '#2e3945'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.stroke(); }
        if (a.tip === 'bore') { ctx.beginPath(); ctx.arc(Lx - W * .3, y, W * .32, 0, 7); ctx.fillStyle = '#05080b'; ctx.fill(); }
        if (a.tip === 'glow' || a.tip === 'prong') { ctx.beginPath(); ctx.arc(Lx, y, W * (a.tip === 'glow' ? .45 : .7), 0, 7); ctx.fillStyle = g.tint; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1; }
        tips.push([Lx, y, W]);
      }
      if (a.tip === 'rail' || a.tip === 'prong') { ctx.strokeStyle = g.tint; ctx.globalAlpha = .75; ctx.lineWidth = Math.max(1, R * .1); ctx.beginPath(); ctx.moveTo(R * .7, 0); ctx.lineTo(a.b[0][2] * R * .97, 0); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // housing over the barrel roots: dark ring, lit dome, family rim
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = '#18202a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = EDGE; ctx.stroke();
    const dome = ctx.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R * .8); dome.addColorStop(0, '#6d7d8f'); dome.addColorStop(1, '#2c3743');
    ctx.beginPath(); ctx.arc(0, 0, R * .76, 0, 7); ctx.fillStyle = dome; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * .9, 0, 7); ctx.strokeStyle = g.tint; ctx.globalAlpha = .7; ctx.lineWidth = Math.max(1, R * .1); ctx.stroke();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(R * .15, 0, R * .16, 0, 7); ctx.fillStyle = g.tint; ctx.fill();
    if (firing) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g.tint; for (const [x, y, w] of tips) { ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(x + w * .4, y, w * 1.1 + 1.5, 0, 7); ctx.fill(); } }
    ctx.restore();
  }

  // ---- hull plates ------------------------------------------------------------------------------
  // half-extents along the ship (x) and across (y); cells sit 48 apart and overlap into one silhouette
  const BODY = { bridge: [24, 20], spine: [24, 12], plate: [24, 22], deck: [24, 19], battery: [24, 22], drive: [24, 18], utility: [22, 17] };
  function cellPath(ctx, c, nb) {
    let [hx, hy] = BODY[c.kind] || [24, 18];
    if (c.kind === 'spine' && (c.rotation || 0) % 180) [hx, hy] = [hy, hx];
    const R = nb.f ? 26 : hx, L = nb.b ? -26 : -hx, T = nb.l ? -Math.max(hy, c.kind === 'spine' ? 8 : hy) : -hy, B = hy;
    const tipF = !nb.f && !nb.l && !nb.r, tailB = !nb.b && !nb.l && !nb.r && c.kind !== 'drive';
    const cFT = nb.f ? 0 : (!nb.l ? 13 : 5), cFB = nb.f ? 0 : (!nb.r ? 13 : 5), cBT = nb.b ? 0 : (tailB ? 10 : 5), cBB = nb.b ? 0 : (tailB ? 10 : 5);
    ctx.beginPath(); ctx.moveTo(c.px + L + cBT, c.py + T);
    if (tipF) { ctx.lineTo(c.px + R - 8, c.py + T); ctx.lineTo(c.px + R + 13, c.py); ctx.lineTo(c.px + R - 8, c.py + B); }
    else { ctx.lineTo(c.px + R - cFT, c.py + T); ctx.lineTo(c.px + R, c.py + T + cFT); ctx.lineTo(c.px + R, c.py + B - cFB); ctx.lineTo(c.px + R - cFB, c.py + B); }
    ctx.lineTo(c.px + L + cBB, c.py + B); ctx.lineTo(c.px + L, c.py + B - cBB); ctx.lineTo(c.px + L, c.py + T + cBT); ctx.closePath();
    // vertical neighbours join through a strut so wings read as attached, not stacked
    if (nb.l) ctx.rect(c.px - 9, c.py - 26, 18, 26 - hy + 2);
    if (nb.r) ctx.rect(c.px - 9, c.py + hy - 2, 18, 26 - hy + 2);
  }
  function neighbours(cells) {
    const at = new Set(cells.map(c => c.x + ',' + c.y));
    return cells.map(c => ({ f: at.has((c.x + 1) + ',' + c.y), b: at.has((c.x - 1) + ',' + c.y), l: at.has(c.x + ',' + (c.y - 1)), r: at.has(c.x + ',' + (c.y + 1)) }));
  }
  // Clip-on shapes in hull space. Flank and bow/stern pieces join the silhouette; casings and the
  // command post sit on top of it.
  const PIECE_SILO = { silo: 4, rockets: 6, torpedo: 1 };  // hatch count per silo
  // The forge set: one entry per piece, its silhouette (edge mounts only) and its painted detail.
  // P = cell centre x,y, half-extents hx,hy, flank sign sg (port -1, starboard 1) and flank edge e.
  function rp(ctx, x, y, w, h, r) { ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function flame(ctx, fx, fy, r, tint) { const fl = ctx.createRadialGradient(fx, fy, 0, fx, fy, r); fl.addColorStop(0, '#f2fdff'); fl.addColorStop(.35, tint); fl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill(); }
  function line(ctx, pts, col, w, alpha = 1) { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1; }
  function dot(ctx, x, y, r, col, alpha = 1) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1; }
  const NAV = s => s < 0 ? '#ff6b6b' : '#6bff9a';   // port red, starboard green, as at sea
  function geom(k, c) { const [hx, hy] = BODY[c.kind] || [24, 18], sg = k.mount === 'port' ? -1 : 1; return { x: c.px, y: c.py, hx, hy, sg, e: c.py + sg * hy }; }
  const CLIP = {
    vane: {
      path(ctx, { x, e, sg }) { ctx.moveTo(x + 8, e - sg * 2); ctx.lineTo(x - 12, e + sg * 19); ctx.lineTo(x - 21, e + sg * 19); ctx.lineTo(x - 10, e - sg * 2); ctx.closePath(); },
      detail(ctx, { x, e, sg }, t) { line(ctx, [[x + 6, e], [x - 13, e + sg * 17]], t, 1.4, .8); dot(ctx, x - 18, e + sg * 18, 1.6, NAV(sg)); }
    },
    wing: {
      path(ctx, { x, e, sg }) { ctx.moveTo(x + 20, e - sg * 3); ctx.lineTo(x - 2, e + sg * 25); ctx.lineTo(x - 21, e + sg * 27); ctx.lineTo(x - 22, e - sg * 3); ctx.closePath(); },
      detail(ctx, { x, e, sg }, t) { line(ctx, [[x + 8, e + sg * 6], [x - 18, e + sg * 6]], SEAM, 1, .8); line(ctx, [[x - 2, e + sg * 15], [x - 19, e + sg * 16]], SEAM, 1, .8); line(ctx, [[x + 18, e - sg], [x - 1, e + sg * 23]], t, 1.5, .6); dot(ctx, x - 16, e + sg * 25, 2, NAV(sg)); }
    },
    blister: {
      path(ctx, { x, e, sg }) { ctx.arc(x, e - sg * 2, 14, sg < 0 ? Math.PI : 0, sg < 0 ? Math.PI * 2 : Math.PI); ctx.closePath(); },
      detail(ctx, { x, e, sg }) { ctx.beginPath(); ctx.arc(x, e - sg * 2, 9, sg < 0 ? Math.PI * 1.1 : Math.PI * .1, sg < 0 ? Math.PI * 1.9 : Math.PI * .9); ctx.strokeStyle = '#8fe8ff'; ctx.lineWidth = 2; ctx.globalAlpha = .75; ctx.stroke(); ctx.globalAlpha = 1; dot(ctx, x, e + sg * 4, 2.6, '#dffaff'); }
    },
    cargo: {
      path(ctx, { x, e, sg }) { const y0 = sg < 0 ? e - 13 : e - 1; rp(ctx, x - 21, y0, 19, 14, 6); rp(ctx, x + 1, y0, 19, 14, 6); },
      detail(ctx, { x, e, sg }, t) { const y0 = sg < 0 ? e - 13 : e - 1; ctx.fillStyle = '#e7bb75'; for (const ox of [-21, 1]) { ctx.fillRect(x + ox + 5, y0, 2, 14); ctx.fillRect(x + ox + 12, y0, 2, 14); } dot(ctx, x - 1, y0 + 7, 1.5, t); }
    },
    lattice: {
      path(ctx, { x, e, sg }) { rp(ctx, x - 19, sg < 0 ? e - 15 : e + 11, 38, 4, 2); ctx.rect(x - 15, sg < 0 ? e - 13 : e, 3, 13); ctx.rect(x + 12, sg < 0 ? e - 13 : e, 3, 13); },
      detail(ctx, { x, e, sg }, t) { line(ctx, [[x - 12, e + sg], [x - 6, e + sg * 12], [x, e + sg], [x + 6, e + sg * 12], [x + 12, e + sg]], '#8d9cad', 1); for (const ox of [-17, 0, 17]) dot(ctx, x + ox, e + sg * 13, 2, t, .9); }
    },
    tines: {
      path(ctx, { x, y, hx }) { const f = x + hx; ctx.moveTo(f - 3, y - 15); ctx.lineTo(f + 27, y - 9); ctx.lineTo(f + 9, y - 4); ctx.lineTo(f + 9, y + 4); ctx.lineTo(f + 27, y + 9); ctx.lineTo(f - 3, y + 15); ctx.closePath(); },
      detail(ctx, { x, y, hx }, t) { const f = x + hx; line(ctx, [[f, y - 12], [f + 24, y - 9]], '#9fb0c2', 1.3); line(ctx, [[f, y + 12], [f + 24, y + 9]], '#9fb0c2', 1.3); dot(ctx, f + 11, y, 2.4, t, .85); }
    },
    dish: {
      path(ctx, { x, y, hx }) { const f = x + hx; ctx.moveTo(f - 3, y - 11); ctx.quadraticCurveTo(f + 22, y - 13, f + 22, y); ctx.quadraticCurveTo(f + 22, y + 13, f - 3, y + 11); ctx.closePath(); },
      detail(ctx, { x, y, hx }, t) { const f = x + hx; for (const r of [4, 8]) { ctx.beginPath(); ctx.arc(f + 8, y, r, -1.1, 1.1); ctx.strokeStyle = t; ctx.globalAlpha = .7; ctx.lineWidth = 1.2; ctx.stroke(); } ctx.globalAlpha = 1; dot(ctx, f + 8, y, 2, '#e9fbff'); }
    },
    bowshield: {
      path(ctx, { x, y, hx }) { const f = x + hx; ctx.moveTo(f - 2, y - 17); ctx.quadraticCurveTo(f + 24, y, f - 2, y + 17); ctx.lineTo(f - 2, y + 10); ctx.quadraticCurveTo(f + 11, y, f - 2, y - 10); ctx.closePath(); },
      detail(ctx, { x, y, hx }) { const f = x + hx; ctx.beginPath(); ctx.moveTo(f + 1, y - 14); ctx.quadraticCurveTo(f + 21, y, f + 1, y + 14); ctx.strokeStyle = '#8fe8ff'; ctx.lineWidth = 2; ctx.globalAlpha = .8; ctx.stroke(); ctx.globalAlpha = 1; dot(ctx, f + 7, y, 2, '#dffaff'); }
    },
    twinjet: {
      path(ctx, { x, y, hx }) { const b = x - hx; rp(ctx, b - 19, y - 16, 22, 11, 4); rp(ctx, b - 19, y + 5, 22, 11, 4); },
      detail(ctx, { x, y, hx }, t) { const b = x - hx; ctx.fillStyle = '#121a22'; ctx.fillRect(b - 12, y - 16, 2, 11); ctx.fillRect(b - 12, y + 5, 2, 11); flame(ctx, b - 22, y - 10.5, 9, t); flame(ctx, b - 22, y + 10.5, 9, t); }
    },
    burner: {
      path(ctx, { x, y, hx }) { const b = x - hx; rp(ctx, b - 25, y - 12, 28, 24, 8); },
      detail(ctx, { x, y, hx }, t) { const b = x - hx; ctx.fillStyle = '#26303b'; for (const o of [-18, -11]) ctx.fillRect(b + o, y - 12, 3, 24); ctx.beginPath(); ctx.arc(b - 25, y, 9, Math.PI * .5, Math.PI * 1.5); ctx.fillStyle = '#05080b'; ctx.fill(); flame(ctx, b - 30, y, 15, t); }
    },
    fins: {
      path(ctx, { x, y, hx }) { const b = x - hx; ctx.moveTo(b + 2, y - 8); ctx.lineTo(b - 14, y - 23); ctx.lineTo(b - 22, y - 21); ctx.lineTo(b - 9, y); ctx.lineTo(b - 22, y + 21); ctx.lineTo(b - 14, y + 23); ctx.lineTo(b + 2, y + 8); ctx.closePath(); },
      detail(ctx, { x, y, hx }, t) { const b = x - hx; line(ctx, [[b - 2, y - 7], [b - 15, y - 20]], t, 1.5, .7); line(ctx, [[b - 2, y + 7], [b - 15, y + 20]], t, 1.5, .7); dot(ctx, b - 18, y - 21, 1.6, NAV(-1)); dot(ctx, b - 18, y + 21, 1.6, NAV(1)); }
    },
    bulwark: {
      detail(ctx, { x, y }, t) {
        rr(ctx, x - 16, y - 14, 32, 28, 3); ctx.fillStyle = '#56657a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = EDGE; ctx.stroke();
        line(ctx, [[x - 9, y - 8], [x + 3, y], [x - 9, y + 8]], '#7d8c9c', 2); line(ctx, [[x - 1, y - 8], [x + 11, y], [x - 1, y + 8]], t, 1.4, .6);
        ctx.fillStyle = '#8d9cad'; for (const [a, b] of [[-13, -11], [13, -11], [-13, 11], [13, 11]]) ctx.fillRect(x + a - 1, y + b - 1, 2, 2);
      }
    },
    reactor: {
      detail(ctx, { x, y }, t) {
        dot(ctx, x, y, 14, '#2a3542'); ctx.lineWidth = 1.5; ctx.strokeStyle = EDGE; ctx.stroke(); ctx.fillStyle = '#0c151d';
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.save(); ctx.translate(x + Math.cos(a) * 10, y + Math.sin(a) * 10); ctx.rotate(a); ctx.fillRect(-3, -1.2, 6, 2.4); ctx.restore(); }
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, '#ffffff'); g.addColorStop(.4, t); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
      }
    },
    radar: {
      detail(ctx, { x, y }, t) {
        const cx = x - 11, cy = y - 9; dot(ctx, cx, cy, 7, '#3a4756'); ctx.lineWidth = 1.2; ctx.strokeStyle = EDGE; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 6, -.9, .1); ctx.closePath(); ctx.fillStyle = t; ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1; dot(ctx, cx, cy, 1.4, '#e9fbff');
      }
    },
    mast: {
      detail(ctx, { x, y }, t) {
        const bx = x - 13, by = y + 9; rr(ctx, bx - 3, by - 3, 6, 6, 1); ctx.fillStyle = '#56667a'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1; ctx.stroke();
        line(ctx, [[bx, by], [bx + 22, by - 20]], '#a8b8c8', 1.2); for (const s of [.35, .65]) line(ctx, [[bx + 22 * s - 3, by - 20 * s - 3], [bx + 22 * s + 3, by - 20 * s + 3]], '#a8b8c8', 1); dot(ctx, bx + 22, by - 20, 2, t);
      }
    },
    hab: {
      detail(ctx, { x, y }, t) {
        ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.arc(x, y, 7, 0, 7, true); ctx.fillStyle = '#4a5869'; ctx.fill('evenodd'); ctx.lineWidth = 1.3; ctx.strokeStyle = EDGE; ctx.stroke();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; dot(ctx, x + Math.cos(a) * 10.5, y + Math.sin(a) * 10.5, 1.2, '#ffe2a8', .9); }
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; line(ctx, [[x + Math.cos(a) * 3, y + Math.sin(a) * 3], [x + Math.cos(a) * 7, y + Math.sin(a) * 7]], '#8d9cad', 1.5); } dot(ctx, x, y, 3, t);
      }
    }
  };
  function clipPath(ctx, k, c) {
    const [hx, hy] = BODY[c.kind] || [24, 18], x = c.px, y = c.py; ctx.beginPath();
    if (CLIP[k.piece]) { if (CLIP[k.piece].path) CLIP[k.piece].path(ctx, geom(k, c)); return; }
    if (k.piece === 'bay' && k.mount !== 'stern') { const sg = k.mount === 'port' ? -1 : 1; rr(ctx, x - 18, sg < 0 ? y - hy - 13 : y + hy - 3, 36, 16, 4); }
    else if (k.piece === 'bay') rr(ctx, x - hx - 19, y - 13, 22, 26, 5);
    else if (k.mount === 'port' || k.mount === 'star') { const sg = k.mount === 'port' ? -1 : 1, y0 = y + sg * (hy - 3), y1 = y + sg * (hy + 7); ctx.moveTo(x - 20, y0); ctx.lineTo(x + 20, y0); ctx.lineTo(x + 15, y1); ctx.lineTo(x - 17, y1); ctx.closePath(); }
    else if (k.mount === 'prow') { ctx.moveTo(x + hx - 3, y - 15); ctx.lineTo(x + hx + 24, y); ctx.lineTo(x + hx - 3, y + 15); ctx.closePath(); }
    else if (k.mount === 'stern') rr(ctx, x - hx - 20, y - 8, 23, 16, 6);
  }
  function clipDetail(ctx, k, c, tint) {
    const [hx, hy] = BODY[c.kind] || [24, 18], x = c.px, y = c.py;
    if (CLIP[k.piece]) { CLIP[k.piece].detail(ctx, geom(k, c), tint); return; }
    if (k.piece === 'bay') {
      const flank = k.mount !== 'stern', sg = k.mount === 'port' ? -1 : 1, mx = flank ? x - 12 : x - hx - 17, my = flank ? (sg < 0 ? y - hy - 10 : y + hy + 3) : y - 8, mw = flank ? 24 : 8, mh = flank ? 7 : 16;
      ctx.fillStyle = '#081016'; ctx.fillRect(mx, my, mw, mh); ctx.fillStyle = '#e7bb75';
      for (let i = 0; i < 3; i++) flank ? ctx.fillRect(mx + 3 + i * 8, my + (sg < 0 ? 0 : mh - 1.5), 4, 1.5) : ctx.fillRect(mx, my + 2 + i * 5, 1.5, 3);
      ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(flank ? x + 13 : x - hx - 6, flank ? my + mh / 2 : y + 10, 1.8, 0, 7); ctx.fill();
    }
    else if (PIECE_SILO[k.piece]) {
      const n = PIECE_SILO[k.piece]; rr(ctx, x - 13, y - 11, 26, 22, 4); ctx.fillStyle = '#2d3a48'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = EDGE; ctx.stroke();
      ctx.fillStyle = '#0c151d'; ctx.lineWidth = 1; ctx.strokeStyle = tint;
      if (n === 1) { rr(ctx, x - 10, y - 4, 20, 8, 4); ctx.fill(); ctx.stroke(); }
      else if (n === 6) for (let i = 0; i < 6; i++) ctx.fillRect(x - 10 + (i % 3) * 7.5, y - 7 + Math.floor(i / 3) * 8, 4.5, 6);
      else for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 5.5 + (i % 2) * 11, y - 5 + Math.floor(i / 2) * 10, 3.4, 0, 7); ctx.fill(); ctx.stroke(); }
    }
    else if (k.mount === 'port' || k.mount === 'star') { const yy = y + (k.mount === 'port' ? -1 : 1) * (hy + 2); ctx.fillStyle = '#8d9cad'; for (const o of [-12, 0, 12]) ctx.fillRect(x + o - 1, yy - 1, 2, 2); }
    else if (k.mount === 'prow') { ctx.strokeStyle = '#9fb0c2'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + hx + 2, y - 10); ctx.lineTo(x + hx + 20, y); ctx.lineTo(x + hx + 2, y + 10); ctx.stroke(); }
    else if (k.mount === 'stern') { const fl = ctx.createRadialGradient(x - hx - 22, y, 0, x - hx - 22, y, 10); fl.addColorStop(0, '#f2fdff'); fl.addColorStop(.35, tint); fl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(x - hx - 22, y, 10, 0, 7); ctx.fill(); }
    else if (k.piece === 'casing') { ctx.lineWidth = 6; ctx.strokeStyle = EDGE; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI * .3, Math.PI * 1.7); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#5d6c7e'; ctx.stroke(); }
    else if (k.piece === 'command') {
      rr(ctx, x - 17, y - 11, 19, 22, 4); ctx.fillStyle = '#56667a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = EDGE; ctx.stroke();
      ctx.fillStyle = '#bff4ff'; ctx.fillRect(x - 3, y - 8, 3, 16); ctx.strokeStyle = '#a8b8c8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x - 21, y - 15); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 21, y - 15, 1.6, 0, 7); ctx.fillStyle = tint; ctx.fill();
    }
  }
  function hull(ctx, cells, tint, kit) {
    if (!cells.length) return;
    const nb = neighbours(cells), by = new Map(cells.map(c => [c.id, c])), clips = (kit || []).map(k => [k, by.get(k.cell)]).filter(([, c]) => c), edge = clips.filter(([k]) => k.mount !== 'top');
    let y0 = Infinity, y1 = -Infinity; for (const c of cells) { y0 = Math.min(y0, c.py - 26); y1 = Math.max(y1, c.py + 26); }
    ctx.save(); ctx.lineJoin = 'round';
    cells.forEach((c, i) => { cellPath(ctx, c, nb[i]); ctx.lineWidth = 5; ctx.strokeStyle = EDGE; ctx.stroke(); });
    for (const [k, c] of edge) { clipPath(ctx, k, c); ctx.lineWidth = 5; ctx.strokeStyle = EDGE; ctx.stroke(); }
    const steel = ctx.createLinearGradient(0, y0, 0, y1); steel.addColorStop(0, STEEL_HI); steel.addColorStop(1, STEEL_LO);
    cells.forEach((c, i) => { cellPath(ctx, c, nb[i]); ctx.fillStyle = steel; ctx.fill(); });
    for (const [k, c] of edge) { clipPath(ctx, k, c); ctx.fillStyle = k.mount === 'port' || k.mount === 'star' ? '#4a5869' : steel; ctx.fill(); }
    cells.forEach((c, i) => detail(ctx, c, nb[i], tint));
    for (const [k, c] of clips) clipDetail(ctx, k, c, tint);
    ctx.restore();
  }
  function socket(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#0c1319'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#6b7a8c'; ctx.stroke(); }
  function detail(ctx, c, nb, tint) {
    const x = c.px, y = c.py; ctx.lineWidth = 1; ctx.strokeStyle = SEAM;
    ctx.beginPath(); ctx.moveTo(x - 20, y - 9); ctx.lineTo(x + 18, y - 9); ctx.moveTo(x - 20, y + 9); ctx.lineTo(x + 18, y + 9); ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1;
    switch (c.kind) {
      case 'bridge': {
        const g = ctx.createLinearGradient(x, y - 6, x + 16, y + 6); g.addColorStop(0, '#bff4ff'); g.addColorStop(1, '#14495c');
        ctx.beginPath(); ctx.ellipse(x + 9, y, 11, 6.5, 0, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.stroke(); break;
      }
      case 'spine': ctx.strokeStyle = '#2a3542'; ctx.lineWidth = 2; for (const k of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(x + k, y - 9); ctx.lineTo(x + k, y + 9); ctx.stroke(); } break;
      case 'plate': {
        rr(ctx, x - 17, y - 15, 34, 30, 4); ctx.fillStyle = '#4d5c6e'; ctx.fill(); ctx.strokeStyle = '#141c24'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#7d8c9c'; for (const [a, b] of [[-13, -11], [13, -11], [-13, 11], [13, 11]]) ctx.fillRect(x + a - 1, y + b - 1, 2, 2); break;
      }
      case 'deck': socket(ctx, x, y, 9); break;
      case 'battery': rr(ctx, x - 14, y - 22, 28, 6, 2); ctx.fillStyle = '#2b3642'; ctx.fill(); rr(ctx, x - 14, y + 16, 28, 6, 2); ctx.fill(); socket(ctx, x, y, 12); break;
      case 'drive':
        ctx.strokeStyle = '#121a22'; ctx.lineWidth = 1.5; for (const k of [-4, 1, 6]) { ctx.beginPath(); ctx.moveTo(x + k, y - 12); ctx.lineTo(x + k, y + 12); ctx.stroke(); }
        if (!nb.b) for (const o of [-8, 8]) {
          rr(ctx, x - 31, y + o - 5, 10, 10, 2); ctx.fillStyle = '#323d4a'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.2; ctx.stroke();
          const fl = ctx.createRadialGradient(x - 33, y + o, 0, x - 33, y + o, 9); fl.addColorStop(0, '#e9fbff'); fl.addColorStop(.35, tint); fl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(x - 33, y + o, 9, 0, 7); ctx.fill();
        }
        break;
      case 'utility': ctx.beginPath(); ctx.arc(x - 2, y, 7, 0, 7); ctx.fillStyle = '#6a7a8b'; ctx.fill(); ctx.strokeStyle = EDGE; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 2, y, 2, 0, 7); ctx.fillStyle = tint; ctx.fill();
        ctx.strokeStyle = '#8b9aab'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 16, y - 6); ctx.stroke(); break;
    }
    if (c.kind === 'spine' || c.kind === 'bridge') { ctx.strokeStyle = tint; ctx.globalAlpha = .45; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 22, y + (c.kind === 'bridge' ? 12 : 0)); ctx.lineTo(x + 20, y + (c.kind === 'bridge' ? 12 : 0)); ctx.stroke(); ctx.globalAlpha = 1; }
  }

  // ---- a whole modular ship from its blueprint (slip, cards, icons) -------------------------------
  function cellsOf(m) { return m.sections.map(s => ({ ...s, px: s.x * 48, py: s.y * 48 })); }
  function cellsExtent(cells) { let E = 0; for (const c of cells) E = Math.max(E, Math.hypot(c.px, c.py) + 20); return E; }
  function gear(ctx, m, cells, E, tint) {
    const G = typeof modularShips !== 'undefined' ? modularShips.GEARS : {}, by = new Map(cells.map(c => [c.id, c]));
    for (const f of m.fittings) {
      const c = by.get(f.slot), g = G[f.gear]; if (!c || !g) continue;
      ctx.save(); ctx.translate(c.px, c.py); ctx.rotate((f.rotation || 0) * Math.PI / 180);
      if (g.weapon) turret(ctx, g.weapon, turretR(gunInfo(g.weapon).c, E), false, tint);
      else if (g.kind !== 'engine') { ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fillStyle = '#26313d'; ctx.fill(); ctx.strokeStyle = g.kind === 'shield' || f.gear === 'shield' ? '#8fe8ff' : '#86ded0'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
    }
  }
  function ship(ctx, m, tint) { const cells = cellsOf(m), E = cellsExtent(cells); hull(ctx, cells, tint, m.kit); gear(ctx, m, cells, E, tint); }
  // Paint a blueprint into a box (canvas units), fitted and centred.
  function fit(ctx, m, W, H, tint, pad = .88) {
    const cells = cellsOf(m); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of cells) { x0 = Math.min(x0, c.px - 34); x1 = Math.max(x1, c.px + 40); y0 = Math.min(y0, c.py - 28); y1 = Math.max(y1, c.py + 28); }
    if (m.kit && m.kit.length) { x0 -= 24; x1 += 24; y0 -= 22; y1 += 22; }   // clip-ons reach past the plates
    const k = Math.min(W / (x1 - x0), H / (y1 - y0)) * pad; ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2); ship(ctx, m, tint);
  }
  function canvas(W, H) { const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(W * d); c.height = Math.round(H * d); c.style.width = W + 'px'; c.style.height = H + 'px'; const x = c.getContext('2d'); x.scale(d, d); return [c, x]; }
  const kit = window.topdownKit = {
    on: true, ARCH, turret, turretR, shipScale, hull, ship,
    thumb(m, W, H, tint = '#7fd8ff') { const [c, x] = canvas(W, H); fit(x, m, W, H, tint); return c; },
    // The slip's art layer: the same ship, in the SVG's own viewBox coordinates, as an image.
    slip(m, minX, minY, w, h, tint = '#7fd8ff') {
      try { const S = 3, c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S); const x = c.getContext('2d'); x.scale(S, S); x.translate(-minX, -minY); ship(x, m, tint); return c.toDataURL(); } catch { return ''; }
    },
    icon(id, W = 96, H = 72) { const [c, x] = canvas(W, H), R = Math.min(H * .3, W / 3.6); x.translate(W * .3, H / 2); turret(x, id, R, false); return c; },
    flightHull(ctx, x, y, angle, nodes, info) {
      const cells = []; info.sections.forEach((s, i) => { const n = nodes[i]; if (n && !n.lost) cells.push({ ...s, px: n.currentDx ?? n.dx, py: n.currentDy ?? n.dy }); });
      if (nodes[0]) extent.set(nodes[0], cellsExtent(cells));
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); hull(ctx, cells, info.color || (typeof engine !== 'undefined' && engine.player && engine.player.color) || '#7fd8ff', info.model && info.model.kit); ctx.restore();
    }
  };

  // ---- flight: guns draw as turrets, sized by class x ship ---------------------------------------
  function install() {
    if (typeof sprites === 'undefined' || !sprites.draw) { setTimeout(install, 40); return; }
    const original = sprites.draw;
    sprites.draw = function (ctx, sx, sy, hullAngle, coreRadius, nodes, glow, state) {
      if (!kit.on || !nodes) return original.apply(this, arguments);
      const guns = [], rest = [];
      for (const n of nodes) (n.type === 'cannon' ? guns : rest).push(n);
      const core = nodes.find(n => n.type === 'core'), modular = !!(core && extent.has(core));
      if (!guns.length && !modular) return original.apply(this, arguments);
      const drawn = original.call(this, ctx, sx, sy, hullAngle, coreRadius, modular ? rest.filter(n => n !== core) : rest, glow, state);
      let E = core && extent.get(core);
      if (!E) { E = 0; for (const n of nodes) E = Math.max(E, Math.hypot(n.currentDx ?? n.targetDx ?? n.dx ?? 0, n.currentDy ?? n.targetDy ?? n.dy ?? 0) + (n.type === 'cannon' ? 0 : (n.radius || 10))); }
      const ca = Math.cos(hullAngle), sa = Math.sin(hullAngle);
      for (const n of guns) {
        const dx = n.currentDx ?? n.targetDx ?? n.dx ?? 0, dy = n.currentDy ?? n.targetDy ?? n.dy ?? 0, info = gunInfo(n.weapon, glow);
        const R = Math.min(info.known ? turretR(info.c, E) : Math.max(4, (n.radius || 8) * .62) * shipScale(E), E * .3);
        ctx.save(); ctx.translate(sx + dx * ca - dy * sa, sy + dx * sa + dy * ca); ctx.rotate(this._angleFor(n, hullAngle));
        turret(ctx, n.weapon, R, !!(state && state.firing), glow); ctx.restore();
      }
      this._drawn = (this._drawn || 0) + guns.length;   // the renderer's part count includes turrets
      return drawn + guns.length;
    };
  }
  // A bay fighter is a small delta in the carrier's colour; it flashes white when hit and shows HP once hurt.
  function fighterArt(ctx, x, y, a, tint, hit, hp) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(140,230,255,.55)'; ctx.beginPath(); ctx.arc(-6, 0, 3.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath();
    ctx.fillStyle = hit ? '#ffffff' : '#7d8e9f'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.fillStyle = tint; ctx.fillRect(-3, -1.5, 10, 3); ctx.restore();
    if (hp < 1) { ctx.fillStyle = '#0008'; ctx.fillRect(x - 9, y - 16, 18, 3); ctx.fillStyle = hp > .4 ? '#7fe3a0' : '#ff7a6b'; ctx.fillRect(x - 9, y - 16, 18 * Math.max(0, hp), 3); }
  }
  function installFighters() {
    if (typeof MitosisDrone === 'undefined') { setTimeout(installFighters, 40); return; }
    const draw = MitosisDrone.prototype.draw;
    MitosisDrone.prototype.draw = function (ctx, camera) {
      if (!kit.on || !this.fighter) return draw.apply(this, arguments);
      fighterArt(ctx, this.x - camera.x, this.y - camera.y, this.heading || 0, this.color, this.hitT > 0, this.hp / (this.maxHp || 1));
    };
  }
  install(); installFighters();
})();
