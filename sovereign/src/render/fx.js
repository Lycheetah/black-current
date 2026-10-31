// Combat effects drawn from simulation shots and events: tracers, muzzle flashes,
// shield ripples, armour sparks, penetration bursts and capital explosions.
import * as THREE from 'three';

const MAX_PARTICLES = 4000;

export function createFx(scene, M) {
  // --- Tracers: one stretched additive bolt per live shot. ---
  const boltGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).rotateX(Math.PI / 2);
  const boltMats = new Map();
  // Bolt: hot white head, weapon-coloured fading tail, faded out near the camera so passing fire never floods the view.
  const boltMat = (color) => {
    if (!boltMats.has(color)) {
      boltMats.set(color, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying float vAlong; varying float vFade;
          void main(){
            vAlong = position.z + 0.5;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vFade = smoothstep(25.0, 160.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; varying float vAlong; varying float vFade;
          void main(){
            float tail = pow(vAlong, 2.5);
            vec3 col = mix(uColor, vec3(1.0), smoothstep(0.85, 1.0, vAlong));
            gl_FragColor = vec4(col * tail * vFade * 1.3, 1.0);
          }`,
      }));
    }
    return boltMats.get(color);
  };
  const bolts = new Map();

  // --- Flash sprites (muzzle, impacts, fireballs). ---
  const flashes = [];
  function flash(pos, color, size, life, grow = 1.6) {
    const s = new THREE.Sprite(M.sprite(color, 1));
    s.position.copy(pos);
    s.scale.setScalar(size);
    scene.add(s);
    flashes.push({ s, life, max: life, size, grow });
  }

  // --- Shockwave rings. ---
  const rings = [];
  function ring(pos, color, radius, life) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64), new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(2), transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    m.position.copy(pos);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(m);
    rings.push({ m, life, max: life, radius });
  }

  // --- Particles: sparks and debris in one points cloud. ---
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pCol = new Float32Array(MAX_PARTICLES * 3);
  const pSize = new Float32Array(MAX_PARTICLES);
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  const pLife = new Float32Array(MAX_PARTICLES);
  const pMax = new Float32Array(MAX_PARTICLES);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float size; attribute vec3 color; varying vec3 vC;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * 900.0 / -mv.z, 0.0, 48.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
        gl_FragColor = vec4(vC * smoothstep(0.5, 0.0, r) * 2.0, 1.0); }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);
  let pNext = 0;
  const _c = new THREE.Color();
  function sparks(pos, color, count, speed, size, life) {
    _c.set(color);
    for (let i = 0; i < count; i++) {
      const k = pNext; pNext = (pNext + 1) % MAX_PARTICLES;
      pPos[k * 3] = pos.x; pPos[k * 3 + 1] = pos.y; pPos[k * 3 + 2] = pos.z;
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const v = speed * (0.3 + Math.random() * 0.7);
      pVel[k * 3] = r * Math.cos(th) * v; pVel[k * 3 + 1] = u * v; pVel[k * 3 + 2] = r * Math.sin(th) * v;
      pCol[k * 3] = _c.r; pCol[k * 3 + 1] = _c.g; pCol[k * 3 + 2] = _c.b;
      pSize[k] = size * (0.5 + Math.random());
      pLife[k] = pMax[k] = life * (0.5 + Math.random() * 0.5);
    }
  }

  const lights = [];
  function boom(pos, radius) {
    const l = new THREE.PointLight(0xffa25a, 40, radius * 30, 1.5);
    l.position.copy(pos);
    scene.add(l);
    lights.push({ l, life: 0.9, max: 0.9 });
  }

  const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);

  return {
    /** Sync tracers to the simulation's live shots. */
    syncShots(shots, alpha) {
      const live = new Set();
      for (const s of shots) {
        live.add(s.id);
        let b = bolts.get(s.id);
        if (!b) {
          b = new THREE.Mesh(boltGeo, boltMat(s.color));
          scene.add(b);
          bolts.set(s.id, b);
        }
        _p.set(s.prevPos.x + (s.pos.x - s.prevPos.x) * alpha, s.prevPos.y + (s.pos.y - s.prevPos.y) * alpha, s.prevPos.z + (s.pos.z - s.prevPos.z) * alpha);
        _v.set(s.vel.x, s.vel.y, s.vel.z);
        const sp = _v.length() || 1;
        b.position.copy(_p);
        _q.setFromUnitVectors(_z, _v.multiplyScalar(1 / sp));
        b.quaternion.copy(_q);
        const len = Math.min(70, Math.max(12, sp * 0.015), s.age * sp + 1);
        const w = Math.max(0.35, s.size * 2.2);
        b.scale.set(w, w, len);
      }
      for (const [id, b] of bolts) if (!live.has(id)) { scene.remove(b); bolts.delete(id); }
    },

    muzzle(pos, color, size) { flash(pos, color, size, 0.12, 2.2); },

    shieldHit(pos, size) {
      flash(pos, 0x8ff6ff, size * 1.4, 0.25);
      sparks(pos, 0x7fefff, 10, size * 6, size * 0.12, 0.35);
    },
    armourHit(pos, size, penetrated) {
      flash(pos, 0xffa65a, size * 1.2, 0.22);
      sparks(pos, 0xffb070, 18, size * 7, size * 0.1, 0.6);
      if (penetrated) {
        flash(pos, 0xffffff, size * 0.8, 0.12, 2.8);
        sparks(pos, 0xfff1c0, 10, size * 12, size * 0.08, 0.4);
      }
    },
    explode(pos, radius) {
      const p = new THREE.Vector3(pos.x, pos.y, pos.z);
      flash(p, 0xffffff, radius * 3, 0.35, 3.0);
      flash(p, 0xffa04a, radius * 5, 1.4, 2.4);
      flash(p, 0xff5a2a, radius * 7, 2.2, 1.6);
      ring(p, 0xffc890, radius * 9, 1.4);
      ring(p, 0x8ff6ff, radius * 6, 1.0);
      sparks(p, 0xffc070, 160, radius * 9, radius * 0.18, 2.2);
      sparks(p, 0x6a5f58, 90, radius * 4, radius * 0.25, 4.0);
      boom(p, radius);
    },

    update(dt) {
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= dt;
        const k = 1 - f.life / f.max;
        f.s.scale.setScalar(f.size * (1 + k * f.grow));
        f.s.material.opacity = Math.max(0, f.life / f.max);
        if (f.life <= 0) { scene.remove(f.s); f.s.material.dispose(); flashes.splice(i, 1); }
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life -= dt;
        const k = 1 - r.life / r.max;
        r.m.scale.setScalar(r.radius * (0.1 + k));
        r.m.material.opacity = Math.max(0, (1 - k) * 0.8);
        if (r.life <= 0) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); }
      }
      for (let i = lights.length - 1; i >= 0; i--) {
        const l = lights[i];
        l.life -= dt;
        l.l.intensity = 40 * Math.max(0, l.life / l.max);
        if (l.life <= 0) { scene.remove(l.l); lights.splice(i, 1); }
      }
      for (let k = 0; k < MAX_PARTICLES; k++) {
        if (pLife[k] <= 0) { if (pSize[k] !== 0) pSize[k] = 0; continue; }
        pLife[k] -= dt;
        const drag = 1 - dt * 0.8;
        pVel[k * 3] *= drag; pVel[k * 3 + 1] *= drag; pVel[k * 3 + 2] *= drag;
        pPos[k * 3] += pVel[k * 3] * dt; pPos[k * 3 + 1] += pVel[k * 3 + 1] * dt; pPos[k * 3 + 2] += pVel[k * 3 + 2] * dt;
        const f = Math.max(0, pLife[k] / pMax[k]);
        pCol[k * 3] *= 0.985 + 0.015 * f; pCol[k * 3 + 1] *= 0.97 + 0.03 * f; pCol[k * 3 + 2] *= 0.95 + 0.05 * f;
        if (pLife[k] <= 0) pSize[k] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;
      pGeo.attributes.size.needsUpdate = true;
    },
  };
}
