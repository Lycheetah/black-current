// Asterion Forge: service station, foundry and launch point. A turned central spire, a rotating
// habitat ring on spokes, docking arms, radiator fins, a gold Lycheetah relic crown and the launch rail.
import * as THREE from 'three';
import { boxUV } from './materials.js';

export function createAsterion(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  const tile = 60;
  const anim = [];

  // Central spire from a lathe profile (radius, height).
  const prof = [
    [0, -340], [30, -330], [46, -290], [40, -250], [62, -210], [62, -150], [44, -130], [44, -40],
    [80, -20], [86, 20], [52, 40], [52, 140], [70, 160], [70, 200], [38, 220], [34, 300], [18, 340], [0, 352],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const spire = new THREE.Mesh(boxUV(new THREE.LatheGeometry(prof, 48), tile), M.hullLight);
  g.add(spire);
  const spireLights = new THREE.Mesh(new THREE.CylinderGeometry(53, 53, 96, 48, 1, true), M.windowsMat);
  spireLights.position.y = 90;
  M.textures.windows.repeat.set(6, 2);
  g.add(spireLights);

  // Habitat ring on spokes.
  const ringG = new THREE.Group();
  g.add(ringG);
  const ring = new THREE.Mesh(boxUV(new THREE.TorusGeometry(225, 20, 24, 160), tile), M.hullLight);
  ring.rotation.x = Math.PI / 2;
  ringG.add(ring);
  const ringBand = new THREE.Mesh(new THREE.TorusGeometry(225, 20.6, 8, 160, Math.PI * 2), M.windowsMat);
  ringBand.rotation.x = Math.PI / 2;
  ringBand.scale.set(1, 1, 0.25);
  ringG.add(ringBand);
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(225, 1.4, 6, 160), M.glowCyan);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = -21;
  ringG.add(ringGlow);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(boxUV(new THREE.BoxGeometry(150, 10, 14), tile), M.hullDark);
    spoke.position.set(Math.cos(a) * 130, 0, Math.sin(a) * 130);
    spoke.rotation.y = -a;
    ringG.add(spoke);
    const pod = new THREE.Mesh(boxUV(new THREE.BoxGeometry(34, 46, 40), tile), M.hullDark);
    pod.position.set(Math.cos(a) * 225, 0, Math.sin(a) * 225);
    pod.rotation.y = -a;
    ringG.add(pod);
  }
  anim.push((t) => { ringG.rotation.y = t * 0.02; });

  // Docking arms with bay lights.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Group();
    arm.position.y = -180;
    arm.rotation.y = -a;
    g.add(arm);
    const truss = new THREE.Mesh(boxUV(new THREE.BoxGeometry(300, 16, 26), tile), M.hullDark);
    truss.position.x = 190;
    arm.add(truss);
    const bay = new THREE.Mesh(boxUV(new THREE.BoxGeometry(60, 40, 60), tile), M.hullLight);
    bay.position.x = 350;
    arm.add(bay);
    for (let k = 0; k < 6; k++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 30), k % 2 ? M.glowGold : M.glowCyan);
      lamp.position.set(70 + k * 45, 9, 0);
      arm.add(lamp);
    }
    const tip = new THREE.Sprite(M.sprite(0xff4a4a, 1));
    tip.position.set(384, 26, 0);
    tip.scale.setScalar(26);
    arm.add(tip);
    anim.push((t) => { tip.material.opacity = (t + i * 0.4) % 2 < 0.15 ? 1 : 0.1; });
  }

  // Radiator fins.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(boxUV(new THREE.BoxGeometry(160, 120, 3), tile), M.ferric);
    fin.position.set(Math.cos(a) * 120, 240, Math.sin(a) * 120);
    fin.rotation.y = -a;
    g.add(fin);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(160, 2, 4), M.glowGold);
    edge.position.copy(fin.position).setY(301);
    edge.rotation.y = -a;
    g.add(edge);
  }

  // Lycheetah relic crown.
  const crown = new THREE.Group();
  crown.position.y = 370;
  g.add(crown);
  crown.add(new THREE.Mesh(new THREE.TorusGeometry(70, 5, 12, 96), M.gold).rotateX(Math.PI / 2));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(6, i % 2 ? 50 : 90, 6), M.gold);
    spike.position.set(Math.cos(a) * 70, (i % 2 ? 25 : 45), Math.sin(a) * 70);
    spike.rotation.z = Math.cos(a) * -0.2; spike.rotation.x = Math.sin(a) * 0.2;
    crown.add(spike);
  }
  const relic = new THREE.Mesh(new THREE.OctahedronGeometry(22, 0), M.glowGold);
  relic.position.y = 60;
  crown.add(relic);
  const relicGlow = new THREE.Sprite(M.sprite(0xffc56b, 0.7));
  relicGlow.position.y = 60; relicGlow.scale.setScalar(200);
  crown.add(relicGlow);
  anim.push((t) => { relic.rotation.y = t * 0.4; relic.rotation.x = Math.sin(t * 0.3) * 0.3; });

  // Launch rail toward -Z: a run of cyan gates the player undocks through.
  for (let k = 0; k < 7; k++) {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(46, 0.9, 6, 64), M.glowRail);
    gate.position.set(-40, 20, -110 - k * 46);
    g.add(gate);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(46, 5, 8, 48, Math.PI), M.hullDark);
    frame.position.copy(gate.position);
    g.add(frame);
    anim.push((t) => { gate.material = ((t * 4 - k) % 7 + 7) % 7 < 1 ? M.glowCyan : M.glowRail; });
  }
  const rail = new THREE.Mesh(boxUV(new THREE.BoxGeometry(14, 8, 320), tile), M.hullDark);
  rail.position.set(-40, -30, -250);
  g.add(rail);

  // Station flood lights onto its own hull.
  const flood = new THREE.PointLight(0x9fe8ff, 4, 900, 1.6);
  flood.position.set(0, 120, -260);
  g.add(flood);
  const floodWarm = new THREE.PointLight(0xffb86b, 3, 800, 1.6);
  floodWarm.position.set(260, -60, 120);
  g.add(floodWarm);

  return { group: g, update(t) { for (const f of anim) f(t); } };
}

/** The PILLAR: central warp gate. A vertical ring of four spires around a slow event plane. */
export function createPillarGate(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  g.rotation.y = 0.5;
  const R = 170;
  const ring = new THREE.Mesh(boxUV(new THREE.TorusGeometry(R, 14, 20, 128), 60), M.hullDark);
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(R - 13, 2.2, 8, 128), M.glowCyan);
  g.add(inner);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const spire = new THREE.Mesh(boxUV(new THREE.CylinderGeometry(10, 22, 160, 6), 60), M.hullLight);
    spire.position.set(Math.cos(a) * (R + 60), Math.sin(a) * (R + 60), 0);
    spire.rotation.z = a - Math.PI / 2;
    g.add(spire);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(9), M.glowGold);
    tip.position.set(Math.cos(a) * (R + 145), Math.sin(a) * (R + 145), 0);
    g.add(tip);
  }
  const planeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.y, p.x);
        float swirl = sin(a * 6.0 + r * 18.0 - uTime * 1.2) * 0.5 + 0.5;
        float i = smoothstep(1.0, 0.2, r) * (0.08 + 0.18 * swirl) + smoothstep(0.98, 0.9, r) * smoothstep(0.8, 0.95, r) * 0.6;
        gl_FragColor = vec4(mix(vec3(0.3, 0.9, 1.0), vec3(0.75, 0.55, 1.0), r) * i, 1.0);
      }`,
  });
  const plane = new THREE.Mesh(new THREE.CircleGeometry(R - 14, 96), planeMat);
  g.add(plane);
  return { group: g, update(t) { planeMat.uniforms.uTime.value = t; ring.rotation.z = t * 0.01; } };
}

function rockGeometry(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.7 + seed * 3);
    const n2 = Math.sin(v.x * 9 + seed) * Math.sin(v.y * 8 + seed) * Math.sin(v.z * 7 + seed);
    v.multiplyScalar(1 + n * 0.35 + n2 * 0.08);
    v.y *= 0.75;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Instanced rock field around a centre. */
export function createRockField(center, count, spread, sizeMin, sizeMax, M, seed = 1) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const mesh = new THREE.InstancedMesh(rockGeometry(seed), M.rock, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * spread, h = (r() - 0.5) * spread * 0.3;
    p.set(center.x + Math.cos(a) * rad, center.y + h, center.z + Math.sin(a) * rad);
    q.setFromEuler(e.set(r() * 6, r() * 6, r() * 6));
    const size = sizeMin + Math.pow(r(), 3) * (sizeMax - sizeMin);
    sc.set(size * (0.8 + r() * 0.5), size * (0.8 + r() * 0.4), size * (0.8 + r() * 0.5));
    m.compose(p, q, sc);
    mesh.setMatrixAt(i, m);
  }
  mesh.frustumCulled = false;
  return mesh;
}

/** Ash Wreckfield: broken hull sections drifting among rock. */
export function createWreckfield(pos, M) {
  const g = new THREE.Group();
  g.position.set(pos.x, pos.y, pos.z);
  let s = 99;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) {
    const piece = new THREE.Group();
    const L = 60 + r() * 140;
    const body = new THREE.Mesh(boxUV(new THREE.BoxGeometry(L * 0.3, L * 0.12, L), 40), i % 3 ? M.hullDark : M.ferric);
    piece.add(body);
    const rib = new THREE.Mesh(boxUV(new THREE.BoxGeometry(L * 0.4, L * 0.04, L * 0.08), 40), M.hullVanta);
    rib.position.z = L * 0.4;
    piece.add(rib);
    if (r() < 0.6) {
      const ember = new THREE.Sprite(M.sprite(0xff7a3a, 0.8));
      ember.position.set(0, 0, -L * 0.5);
      ember.scale.setScalar(L * 0.3);
      piece.add(ember);
    }
    piece.position.set((r() - 0.5) * 500, (r() - 0.5) * 140, (r() - 0.5) * 500);
    piece.rotation.set(r() * 3, r() * 3, r() * 3);
    piece.userData.spin = (r() - 0.5) * 0.04;
    piece.userData.baseY = piece.rotation.y;
    g.add(piece);
  }
  g.add(createRockField({ x: 0, y: 0, z: 0 }, 140, 600, 2, 26, M, 5));
  return { group: g, update(t) { for (const c of g.children) if (c.userData.spin) c.rotation.y = c.userData.baseY + c.userData.spin * t; } };
}
