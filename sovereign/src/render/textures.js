// Procedural textures drawn once at boot. No image assets: the single-file build stays self-contained.
import * as THREE from 'three';

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Hull plating: panel seams, greebles and wear. Returns {map, rough, bump} sharing one layout. */
export function createPlatingTextures(size = 1024, seed = 7) {
  const r = rand(seed);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const albedo = mk(), rough = mk(), bump = mk();
  const a = albedo.getContext('2d'), g = rough.getContext('2d'), b = bump.getContext('2d');

  a.fillStyle = '#6d7178'; a.fillRect(0, 0, size, size);
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, size, size);
  b.fillStyle = '#808080'; b.fillRect(0, 0, size, size);

  // Recursive panel subdivision gives believable plating rhythm.
  const panels = [];
  (function split(x, y, w, h, d) {
    if (d > 5 || (d > 2 && r() < 0.28) || w < 24 || h < 24) { panels.push([x, y, w, h]); return; }
    if (w > h ? r() < 0.8 : r() < 0.2) { const s = Math.floor(w * (0.3 + r() * 0.4)); split(x, y, s, h, d + 1); split(x + s, y, w - s, h, d + 1); }
    else { const s = Math.floor(h * (0.3 + r() * 0.4)); split(x, y, w, s, d + 1); split(x, y + s, w, h - s, d + 1); }
  })(0, 0, size, size, 0);

  for (const [x, y, w, h] of panels) {
    const tone = 108 + Math.floor(r() * 18);
    a.fillStyle = `rgb(${tone},${tone + 2},${tone + 6})`; a.fillRect(x + 1, y + 1, w - 2, h - 2);
    const rv = 80 + Math.floor(r() * 70);
    g.fillStyle = `rgb(${rv},${rv},${rv})`; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    const bv = 120 + Math.floor(r() * 30);
    b.fillStyle = `rgb(${bv},${bv},${bv})`; b.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Seams.
    a.strokeStyle = 'rgba(30,32,36,0.55)'; a.lineWidth = 1.5; a.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    b.strokeStyle = '#303030'; b.lineWidth = 3; b.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // Greebles: vents, bolts, hatches.
    if (r() < 0.45 && w > 50 && h > 30) {
      const n = 3 + Math.floor(r() * 6), gx = x + 8, gy = y + h * 0.3, gw = Math.min(w - 16, n * 8);
      for (let i = 0; i < n; i++) {
        b.fillStyle = '#4a4a4a'; b.fillRect(gx + i * (gw / n), gy, gw / n * 0.5, h * 0.4);
        a.fillStyle = 'rgba(30,32,38,0.7)'; a.fillRect(gx + i * (gw / n), gy, gw / n * 0.5, h * 0.4);
      }
    }
    if (r() < 0.3) {
      for (const [bx, by] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
        b.fillStyle = '#c8c8c8'; b.beginPath(); b.arc(bx, by, 2, 0, 7); b.fill();
      }
    }
    if (r() < 0.12) { a.fillStyle = 'rgba(200,160,70,0.55)'; a.fillRect(x + 4, y + h - 10, w - 8, 4); }
  }
  // Grime and scorch.
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, rad = 8 + r() * 60;
    const grd = a.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(10,10,12,${0.03 + r() * 0.07})`); grd.addColorStop(1, 'rgba(10,10,12,0)');
    a.fillStyle = grd; a.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(albedo, true), rough: tex(rough, false), bump: tex(bump, false) };
}

/** Lit window/strip emissive pattern for station hull. */
export function createWindowTexture(size = 512, seed = 3, sparse = 0.45) {
  const r = rand(seed);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, size, size);
  for (let row = 0; row < size; row += 16) {
    if (r() < sparse) continue;
    for (let col = 0; col < size; col += 8) {
      if (r() < 0.55) continue;
      const warm = r() < 0.7;
      x.fillStyle = warm ? `rgba(255,${190 + r() * 50 | 0},${120 + r() * 60 | 0},${0.5 + r() * 0.5})` : `rgba(120,230,255,${0.5 + r() * 0.5})`;
      x.fillRect(col, row, 5, 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft radial sprite for glows. */
export function createGlowTexture(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
