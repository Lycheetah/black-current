// Plain-number vector and quaternion math for the simulation.
// The sim never touches Three.js; these are {x,y,z} and {x,y,z,w} objects.

/** @typedef {{x:number,y:number,z:number}} Vec3 */
/** @typedef {{x:number,y:number,z:number,w:number}} Quat */

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const copy3 = (o, a) => { o.x = a.x; o.y = a.y; o.z = a.z; return o; };
export const add3 = (o, a, b) => { o.x = a.x + b.x; o.y = a.y + b.y; o.z = a.z + b.z; return o; };
export const sub3 = (o, a, b) => { o.x = a.x - b.x; o.y = a.y - b.y; o.z = a.z - b.z; return o; };
export const scale3 = (o, a, s) => { o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; return o; };
export const addScaled3 = (o, a, b, s) => { o.x = a.x + b.x * s; o.y = a.y + b.y * s; o.z = a.z + b.z * s; return o; };
export const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len3 = (a) => Math.hypot(a.x, a.y, a.z);
export const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const lerp3 = (o, a, b, t) => { o.x = a.x + (b.x - a.x) * t; o.y = a.y + (b.y - a.y) * t; o.z = a.z + (b.z - a.z) * t; return o; };

export const quat = (x = 0, y = 0, z = 0, w = 1) => ({ x, y, z, w });
export const copyQ = (o, q) => { o.x = q.x; o.y = q.y; o.z = q.z; o.w = q.w; return o; };

export function normalizeQ(q) {
  const l = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  q.x /= l; q.y /= l; q.z /= l; q.w /= l;
  return q;
}

/** o = a * b */
export function mulQ(o, a, b) {
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  o.x = x; o.y = y; o.z = z; o.w = w;
  return o;
}

/** Rotate vector v by quaternion q into o. */
export function rotate3(o, v, q) {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  o.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
  o.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
  o.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
  return o;
}

/** Apply a body-frame angular step (radians about local x=pitch, y=yaw, z=roll). */
export function rotateLocal(q, ax, ay, az) {
  const angle = Math.hypot(ax, ay, az);
  if (angle < 1e-9) return q;
  const s = Math.sin(angle / 2) / angle;
  const d = quat(ax * s, ay * s, az * s, Math.cos(angle / 2));
  mulQ(q, q, d);
  return normalizeQ(q);
}

export function slerpQ(o, a, b, t) {
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  let cos = a.x * bx + a.y * by + a.z * bz + a.w * bw;
  if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  let k0, k1;
  if (cos > 0.9995) { k0 = 1 - t; k1 = t; }
  else {
    const th = Math.acos(cos), s = Math.sin(th);
    k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s;
  }
  o.x = a.x * k0 + bx * k1; o.y = a.y * k0 + by * k1; o.z = a.z * k0 + bz * k1; o.w = a.w * k0 + bw * k1;
  return normalizeQ(o);
}

/** Exponential approach factor, frame-rate independent. */
export const approach = (rate, dt) => 1 - Math.exp(-rate * dt);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Ship body axes: forward is -Z (Three.js convention), up is +Y, right is +X.
export const FORWARD = Object.freeze(v3(0, 0, -1));
export const UP = Object.freeze(v3(0, 1, 0));
export const RIGHT = Object.freeze(v3(1, 0, 0));
