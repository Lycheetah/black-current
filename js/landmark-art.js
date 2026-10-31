/* LANDMARK ART (Route 5 item 5, visual pass 3; Mac: "simple circles and triangles are not the art this Black Current
 * deserves"). sectors.js landmarks drew as primitives: reefs as green circles, wrecks as a wireframe arc, caches as three
 * gold rings, beacons as concentric rings. sectors.js now asks this file first and keeps its shapes as the fallback.
 *   reef    a cluster of shaded rocks in the region's rock colours (terrain.js palettes), lit from the upper right
 *   wreck   a broken hull made from the accepted section art (section-art.js), darkened, scorched, trailing debris
 *   beacon  a navigation buoy: hexagonal mast, three fins, a slow blinking light
 *   cache   salvage crates with glowing gold seams; dark and broken open once taken
 * Each landmark is painted once into a canvas (keyed by kind, seed, size and region) and drawn as one image; only the
 * beacon light and crate glow are drawn live. Positions, sizes, spawning and salvage rules are untouched. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, SCALE = 1.5, cache = new Map(), MAX = 64;
  const ROCK = { Naraka: ['#35514c', '#1d2e2b', '#6fa89a'], Erebos: ['#4a5670', '#262d3d', '#a9c4ff'], Aion: ['#5a4d36', '#2e281c', '#e8c478'],
    'Chaos Cradle': ['#5a3524', '#2a1710', '#ff9a5a'], 'Deep Current': ['#3d3456', '#1c1830', '#c49aff'] };
  const stats = { paints: 0, draws: 0 };
  const rng = seed => { let a = (seed * 4294967296) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const region = () => (window.galaxy?.data && galaxy.current?.region) || 'Naraka';

  function canvasFor(R) { const c = document.createElement('canvas'), size = Math.ceil(R * 2 * SCALE); c.width = c.height = size; const g = c.getContext('2d'); g.translate(size / 2, size / 2); g.scale(SCALE, SCALE); return [c, g]; }
  function rock(g, x, y, s, r, pal) {
    const pts = 7 + (r() * 4 | 0);
    g.beginPath();
    for (let i = 0; i < pts; i++) { const a = i * TAU / pts + r() * 0.4, d = s * (0.72 + r() * 0.38); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d); }
    g.closePath();
    const light = g.createRadialGradient(x + s * 0.4, y - s * 0.45, s * 0.1, x, y, s * 1.15);
    light.addColorStop(0, pal[2]); light.addColorStop(0.25, pal[0]); light.addColorStop(1, pal[1]);
    g.fillStyle = light; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; g.stroke();
    g.save(); g.clip();
    for (let i = 0; i < 3; i++) {   // craters: a dark pit with a lit lower-left lip
      const cx = x + (r() - 0.5) * s, cy = y + (r() - 0.5) * s, cr = s * (0.1 + r() * 0.14);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, cr, 1.9, 3.9); g.stroke();
    }
    g.restore();
  }
  function reef(m, R) {
    const [c, g] = canvasFor(R), r = rng(m.seed), pal = ROCK[region()] || ROCK.Naraka, n = 6 + (r() * 4 | 0);
    const list = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + r() * 0.8, d = R * (0.15 + r() * 0.5); return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.16 + r() * 0.2) }; });
    list.sort((a, b) => a.s - b.s);
    for (const p of list) rock(g, p.x, p.y, p.s, r, pal);
    for (let i = 0; i < 18; i++) { g.fillStyle = pal[1]; const a = r() * TAU, d = R * (0.4 + r() * 0.5); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 3, 0, TAU); g.fill(); }
    return c;
  }
  function wreck(m, R) {
    const [c, g] = canvasFor(R), r = rng(m.seed), kinds = ['spine', 'plate', 'deck', 'drive', 'heavy', 'hangar', 'utility', 'bridge'];
    const k = R / 70, pieces = 4 + (r() * 3 | 0), bend = (r() - 0.5) * 0.9;
    g.save(); g.scale(k, k);
    for (let i = 0; i < pieces; i++) {   // a hull that broke along its keel: pieces drift apart and turn
      const along = (i - (pieces - 1) / 2) * 52, drift = (r() - 0.5) * 18 + Math.abs(along) * 0.15;
      const cell = { kind: kinds[r() * kinds.length | 0], px: along * Math.cos(bend) - drift * Math.sin(bend), py: along * Math.sin(bend) + drift * Math.cos(bend), rotation: 0 };
      g.save(); g.translate(cell.px, cell.py); g.rotate((r() - 0.5) * 0.9); g.translate(-cell.px, -cell.py);
      if (!(window.sectionArt && sectionArt.draw(g, cell, [24, 22]))) { g.fillStyle = '#2b333d'; g.fillRect(cell.px - 22, cell.py - 20, 44, 40); }
      g.restore();
    }
    g.restore();
    // dead metal: darken, cool and scorch the art (only where it is painted)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(8,12,20,0.55)'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 5; i++) { const x = c.width * (0.2 + r() * 0.6), y = c.height * (0.3 + r() * 0.4), s = c.width * (0.05 + r() * 0.08), b = g.createRadialGradient(x, y, 0, x, y, s); b.addColorStop(0, 'rgba(0,0,0,0.7)'); b.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = b; g.fillRect(x - s, y - s, s * 2, s * 2); }
    g.restore();
    g.fillStyle = '#3a4350';
    for (let i = 0; i < 16; i++) { const a = r() * TAU, d = R * (0.3 + r() * 0.6), s = 2 + r() * 6; g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(r() * TAU); g.fillRect(-s / 2, -s / 3, s, s * 0.6); g.restore(); }
    return c;
  }
  function beacon(m, R) {
    const [c, g] = canvasFor(R), s = Math.min(R * 0.42, 46);
    for (let i = 0; i < 3; i++) {   // three fins
      const a = i * TAU / 3 - Math.PI / 2; g.save(); g.rotate(a);
      const fin = g.createLinearGradient(0, 0, s * 1.5, 0); fin.addColorStop(0, '#5d6b7c'); fin.addColorStop(1, '#232b36');
      g.fillStyle = fin; g.beginPath(); g.moveTo(s * 0.3, -s * 0.18); g.lineTo(s * 1.5, -s * 0.06); g.lineTo(s * 1.5, s * 0.06); g.lineTo(s * 0.3, s * 0.18); g.closePath(); g.fill();
      g.fillStyle = '#c9a25c'; g.fillRect(s * 1.32, -s * 0.07, s * 0.12, s * 0.14); g.restore();
    }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5); } g.closePath();
    const hull = g.createRadialGradient(s * 0.15, -s * 0.2, 0, 0, 0, s * 0.55); hull.addColorStop(0, '#8a98aa'); hull.addColorStop(1, '#2a323d');
    g.fillStyle = hull; g.fill(); g.strokeStyle = '#11161d'; g.lineWidth = 2; g.stroke();
    return c;
  }
  function crates(m, R) {
    const [c, g] = canvasFor(R), r = rng(m.seed), s = Math.min(R * 0.46, 48);
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + r() * 0.5, x = Math.cos(a) * s * 0.75, y = Math.sin(a) * s * 0.75;
      g.save(); g.translate(x, y); g.rotate(r() * TAU);
      const body = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); body.addColorStop(0, '#6a5a3a'); body.addColorStop(1, '#2a2418');
      g.fillStyle = body; g.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
      g.strokeStyle = '#1a150c'; g.lineWidth = 2; g.strokeRect(-s / 2, -s * 0.35, s, s * 0.7);
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = -2; k <= 2; k++) g.fillRect(k * s * 0.18 - s * 0.04, -s * 0.35, s * 0.06, s * 0.7);
      g.restore();
    }
    return c;
  }
  const PAINT = { reef, wreck, beacon, cache: crates };

  function art(m) {
    const key = `${m.kind}|${m.seed}|${Math.round(m.radius)}|${region()}`;
    let c = cache.get(key);
    if (!c) { if (cache.size >= MAX) cache.delete(cache.keys().next().value); c = PAINT[m.kind](m, m.kind === 'wreck' ? m.radius * 1.4 : m.radius * 1.2); cache.set(key, c); stats.paints++; }
    return c;
  }
  /* Called by sectors.js drawField with the context already at the landmark and turned by its spin. */
  function draw(ctx, m, t) {
    if (!PAINT[m.kind] || m.custom) return false;
    if (m.kind === 'wreck' && !window.sectionArt) return false;
    const c = art(m), w = c.width / SCALE;
    ctx.save();
    if (m.kind === 'cache' && m.taken) ctx.globalAlpha = 0.35;
    ctx.drawImage(c, -w / 2, -w / 2, w, w);
    ctx.globalCompositeOperation = 'lighter';
    if (m.kind === 'beacon') {   // the blinking light
      const pulse = 0.5 + Math.sin(t * 0.003 + m.seed * 9) * 0.5, R = Math.min(m.radius * 0.42, 46) * 0.32;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * (2 + pulse * 2));
      g.addColorStop(0, `rgba(160,250,255,${0.5 + pulse * 0.5})`); g.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * (2 + pulse * 2), 0, TAU); ctx.fill();
    } else if (m.kind === 'cache' && !m.taken) {   // gold seams: there is something worth taking here
      const pulse = 0.55 + Math.sin(t * 0.004 + m.seed * 7) * 0.25, R = m.radius * 0.9;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, `rgba(255,190,60,${0.35 * pulse})`); g.addColorStop(1, 'rgba(255,183,3,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    }
    ctx.restore(); stats.draws++;
    return true;
  }
  window.landmarkArt = { draw, stats, clear() { cache.clear(); } };
})();
