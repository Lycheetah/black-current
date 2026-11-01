// Ship glow lights in one draw call. Ship builders place ordinary sprites (engine plumes, nav lights,
// strobes, signature lights); this collects every sprite on a ship, hides it, and draws them all as one
// point cloud that still follows each sprite's size, colour and animated opacity.
import * as THREE from 'three';

let shared = null;
function material(glowTex) {
  shared ??= new THREE.ShaderMaterial({
    uniforms: { uMap: { value: glowTex }, uScale: { value: 500 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float size; attribute float alpha;
      uniform float uScale; varying vec3 vC; varying float vA;
      void main(){
        vC = color; vA = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * uScale / -mv.z, 0.0, 512.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying vec3 vC; varying float vA;
      void main(){ gl_FragColor = vec4(vC * texture2D(uMap, gl_PointCoord).a * vA, 1.0); }`,
  });
  return shared;
}

/** Pixel scale for world-sized points: screen height × projection focal / 2. Call once per frame. */
export function updateGlowScale(camera, heightPx) {
  if (shared) shared.uniforms.uScale.value = heightPx * camera.projectionMatrix.elements[5] * 0.5;
}

export function createGlowPoints(g, glowTex) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const sprites = [];
  g.traverse((o) => { if (o.isSprite) sprites.push(o); });
  if (!sprites.length) return { sync() {} };
  const n = sprites.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
  const p = new THREE.Vector3(), m = new THREE.Matrix4();
  sprites.forEach((s, i) => {
    m.multiplyMatrices(inv, s.matrixWorld);
    p.setFromMatrixPosition(m);
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    s.visible = false;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const points = new THREE.Points(geo, material(glowTex));
  points.frustumCulled = false;
  points.userData.dynamic = true;
  g.add(points);
  const sync = () => {
    for (let i = 0; i < n; i++) {
      const s = sprites[i], c = s.material.color;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      size[i] = s.scale.x;
      alpha[i] = s.material.opacity;
    }
    geo.attributes.color.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
  };
  sync();
  return { sync, points };
}
