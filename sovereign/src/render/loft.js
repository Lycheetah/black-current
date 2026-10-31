// Lofted hull geometry: a superellipse cross-section swept along the ship's length,
// with width, height and vertical offset driven by profile functions. Gives smooth,
// layered capital-ship forms instead of boxes.
import * as THREE from 'three';

/**
 * @param {object} o
 * @param {number} o.length
 * @param {(t:number)=>number} o.width  half-width at t∈[0,1] (0 = nose, 1 = tail)
 * @param {(t:number)=>number} o.top    deck height above centreline
 * @param {(t:number)=>number} o.bottom keel depth below centreline (positive number)
 * @param {(t:number)=>number} [o.y]    centreline vertical offset
 * @param {number} [o.exp=3]            superellipse exponent (2 round … 6 slab)
 * @param {number} [o.segs=24]          ring vertex count
 * @param {number} [o.rings=48]
 * @param {number} [o.tile=10]          UV world units per texture repeat
 */
export function loftGeometry(o) {
  const segs = o.segs ?? 24, rings = o.rings ?? 48, n = o.exp ?? 3, tile = o.tile ?? 10;
  const pos = [], uv = [], idx = [];
  const yOff = o.y ?? (() => 0);
  for (let i = 0; i <= rings; i++) {
    // Denser rings at the nose where curvature is high.
    const t = Math.pow(i / rings, 1.25);
    const z = -o.length / 2 + t * o.length;
    const w = Math.max(0.001, o.width(t)), ht = Math.max(0.001, o.top(t)), hb = Math.max(0.001, o.bottom(t));
    const yc = yOff(t);
    let arc = 0, px = 0, py = 0;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const yy = (s >= 0 ? ht : hb) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (j > 0) arc += Math.hypot(x - px, yy - py);
      px = x; py = yy;
      pos.push(x, yc + yy, z);
      uv.push(arc / tile, z / tile);
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j, b = a + row;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // Caps.
  const capCenter = (ring, flip) => {
    const t = ring === 0 ? 0 : 1;
    const ci = pos.length / 3;
    pos.push(0, yOff(t), -o.length / 2 + t * o.length);
    uv.push(0, 0);
    for (let j = 0; j < segs; j++) {
      const a = ring * row + j;
      flip ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a);
    }
  };
  capCenter(0, true);
  capCenter(rings, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Smooth step helpers for profiles. */
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const bump = (c, w, x) => Math.exp(-(((x - c) / w) ** 2));

/** Tapered blade/fin from an outline in (x along span, z along chord). */
export function finGeometry(span, rootChord, tipChord, sweep, thickness, tile = 10) {
  const s = new THREE.Shape();
  s.moveTo(0, -rootChord / 2);
  s.lineTo(span, -rootChord / 2 + sweep);
  s.lineTo(span, -rootChord / 2 + sweep + tipChord);
  s.lineTo(0, rootChord / 2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: thickness * 0.3, bevelSize: thickness * 0.3, bevelSegments: 2 });
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness / 2, 0);
  const uvA = g.attributes.uv;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / tile, uvA.getY(i) / tile);
  return g;
}
