// Scanner visuals: uncertainty spheres that shrink as you triangulate, ping waves and bearing lines,
// and a beacon on each signature once it is scanned.
import * as THREE from 'three';

const TYPE_COLOR = { SIGNAL: 0x65f5ff, RUIN: 0xffc56b, ANOMALY: 0xb77cff, RESOURCE: 0xff9a5a, INTERCONNECTOR: 0x8fffd0 };

function sphereMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uActive: { value: 0 }, uInside: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime; uniform float uActive; uniform float uInside; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float f = pow(1.0 - abs(dot(vN, vV)), 2.5);
        float lat = smoothstep(0.96, 1.0, abs(sin(vP.y * 12.0)));
        float lon = smoothstep(0.97, 1.0, abs(sin(atan(vP.z, vP.x) * 8.0)));
        float sweep = smoothstep(0.08, 0.0, abs(fract(vP.y * 0.5 + 0.5 - uTime * 0.25) - 0.5));
        float a = f * 0.35 + (lat + lon) * 0.08 + sweep * 0.12;
        // From inside the sphere only the grid remains, faint, so it never floods the view.
        a = mix(a, (lat + lon) * 0.05, uInside);
        gl_FragColor = vec4(uColor * a * (0.4 + 0.6 * uActive), 1.0);
      }`,
  });
}

export function createAtlasFx(scene, M, world) {
  const items = new Map();
  const waves = [], lines = [];

  function ensure(sig) {
    let it = items.get(sig.id);
    if (it) return it;
    const color = TYPE_COLOR[sig.def.type] || 0x65f5ff;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), sphereMat(0xffc56b));
    scene.add(sphere);
    const beacon = new THREE.Group();
    beacon.position.set(sig.pos.x, sig.pos.y, sig.pos.z);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(14, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4), toneMapped: false }));
    const glow = new THREE.Sprite(M.sprite(color, 0.8)); glow.scale.setScalar(220);
    const rings = [0, 1, 2].map((i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(40 + i * 22, 0.8, 6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 0.7, toneMapped: false }));
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      beacon.add(r);
      return r;
    });
    beacon.add(core, glow);
    beacon.visible = false;
    scene.add(beacon);
    it = { sphere, beacon, core, glow, rings };
    items.set(sig.id, it);
    return it;
  }

  let lastSeq = 0;
  return {
    update(dt, t, playerPos, camera) {
      for (const ev of world.events) {
        if (ev.seq <= lastSeq) continue;
        lastSeq = ev.seq;
        if (ev.type !== 'ping') continue;
        const w = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), sphereMat(0x65f5ff));
        w.position.set(ev.pos.x, ev.pos.y, ev.pos.z);
        w.material.uniforms.uActive.value = 0.5;
        w.material.uniforms.uInside.value = 1;
        scene.add(w);
        waves.push({ m: w, life: 1.6 });
        for (const id of ev.read) {
          const sig = world.atlas.sigs[id];
          const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ev.pos.x, ev.pos.y, ev.pos.z), new THREE.Vector3(sig.center.x, sig.center.y, sig.center.z)]);
          const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0xffc56b).multiplyScalar(2), transparent: true, opacity: 0.9, toneMapped: false }));
          scene.add(l);
          lines.push({ l, life: 2.5 });
        }
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]; w.life -= dt;
        const k = 1 - w.life / 1.6;
        w.m.scale.setScalar(50 + k * 3200);
        w.m.material.uniforms.uActive.value = Math.max(0, 0.5 - k * 0.5);
        if (w.life <= 0) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); }
      }
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i]; l.life -= dt;
        l.l.material.opacity = Math.max(0, l.life / 2.5);
        if (l.life <= 0) { scene.remove(l.l); l.l.geometry.dispose(); l.l.material.dispose(); lines.splice(i, 1); }
      }
      for (const sig of Object.values(world.atlas.sigs)) {
        if (sig.stage === 'hidden') continue;
        const it = ensure(sig);
        const uncertain = sig.stage === 'detected';
        it.sphere.visible = uncertain;
        if (uncertain) {
          it.sphere.position.set(sig.center.x, sig.center.y, sig.center.z);
          it.sphere.scale.setScalar(sig.radius);
          it.sphere.material.uniforms.uTime.value = t;
          it.sphere.material.uniforms.uActive.value = world.atlas.activeId === sig.id ? 1 : 0.3;
          const dc = camera ? camera.position.distanceTo(it.sphere.position) / sig.radius : 2;
          it.sphere.material.uniforms.uInside.value = THREE.MathUtils.clamp((1.15 - dc) / 0.3, 0, 1);
        }
        it.beacon.visible = !uncertain;
        if (!uncertain) {
          const lit = sig.stage === 'resolved' ? 0.35 : 1;
          it.core.rotation.y = t * 0.8; it.core.rotation.x = t * 0.3;
          it.rings.forEach((r, i) => { r.rotation.z += dt * (0.3 + i * 0.2); r.material.opacity = 0.7 * lit; });
          it.glow.material.opacity = 0.8 * lit * (0.75 + 0.25 * Math.sin(t * 3));
          it.core.visible = sig.stage !== 'triangulated' || Math.sin(t * 8) > 0;
        }
      }
    },
  };
}
