// The renderer reads the simulation and draws it. It never writes game state.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createMaterials } from './materials.js';
import { createSky } from './sky.js';
import { createBlackSun } from './blacksun.js';
import { createAsterion, createPillarGate, createWreckfield, createRockField } from './station.js';
import { createDust } from './dust.js';
import { createCameraRig } from './camera.js';
import { buildShipMesh, animateShipMesh, hullLength } from './ship-mesh.js';

// Final grade: subtle vignette, chromatic fringe at the edges and film grain.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c, c);
      vec2 off = c * r2 * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= 1.0 - r2 * 0.9;
      col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createRenderer(canvas, world, opts = {}) {
  const lowPower = opts.lowPower ?? false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const M = createMaterials(renderer);
  const sector = world.sector;
  const sunPos = new THREE.Vector3(sector.blackSun.pos.x, sector.blackSun.pos.y, sector.blackSun.pos.z);
  const home = sector.landmarks.asterion.pos;
  const sunDir = sunPos.clone().sub(new THREE.Vector3(home.x, home.y, home.z)).normalize();

  // Sky + image-based lighting baked from the same sky, so hulls reflect the Veil they fly in.
  const sky = createSky(sunDir);
  scene.add(sky.mesh);
  {
    const envScene = new THREE.Scene();
    const envSky = createSky(sunDir);
    envSky.mesh.scale.setScalar(100);
    envScene.add(envSky.mesh);
    // Bright rim cards in the env so metal catches the black sun's halo.
    const card = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.45).multiplyScalar(6) }));
    card.position.copy(sunDir).multiplyScalar(80);
    envScene.add(card);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.9;
    pmrem.dispose();
  }

  // Key light from the black sun's rim (warm), cool counter-fill, very low ambient: EVE-style contrast.
  const key = new THREE.DirectionalLight(0xffd6a8, 3.2);
  key.position.copy(sunDir).multiplyScalar(1000);
  scene.add(key, key.target);
  const rimLight = new THREE.DirectionalLight(0x8a7cff, 1.4);
  rimLight.position.set(-sunDir.x, 0.4, -sunDir.z).multiplyScalar(1000);
  scene.add(rimLight, rimLight.target);
  const fill = new THREE.DirectionalLight(0x4fd8ff, 0.6);
  fill.position.set(0.3, -1, 0.4).multiplyScalar(1000);
  scene.add(fill, fill.target);
  // Soft light riding with the camera so the hull face you look at always reads.
  const camFill = new THREE.DirectionalLight(0xbcd6ff, 0.7);
  scene.add(camFill, camFill.target);
  scene.add(new THREE.HemisphereLight(0x3a4a66, 0x120a10, 0.6));

  const blackSun = createBlackSun(sector.blackSun, M.textures.glow);
  scene.add(blackSun.group);

  const L = sector.landmarks;
  const asterion = createAsterion(L.asterion.pos, M);
  const pillar = createPillarGate(L.pillar.pos, M);
  const wreck = createWreckfield(L.wreck.pos, M);
  scene.add(asterion.group, pillar.group, wreck.group);
  scene.add(createRockField({ x: (L.asterion.pos.x + L.pillar.pos.x) / 2 - 900, y: L.asterion.pos.y - 200, z: (L.asterion.pos.z + L.pillar.pos.z) / 2 }, 260, 1400, 4, 60, M, 11));
  scene.add(createRockField(L.refinery.pos, 120, 500, 3, 40, M, 23));
  for (const k of ['observatory', 'refinery']) {
    const b = new THREE.Sprite(M.sprite(0xffc56b, 0.9));
    b.position.set(L[k].pos.x, L[k].pos.y, L[k].pos.z);
    b.scale.setScalar(60);
    scene.add(b);
  }

  const dust = createDust();
  scene.add(dust.points);

  const rig = createCameraRig(window.innerWidth / window.innerHeight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, rig.camera));
  const bloomRes = lowPower ? 0.5 : 1;
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth * bloomRes, window.innerHeight * bloomRes), 0.85, 0.55, 0.82);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  // Entity views, keyed by entity id; rebuilt when an entity's hull changes.
  const views = new Map();
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

  function syncEntity(e, alpha, t) {
    let v = views.get(e.id);
    if (!v || v.hullId !== e.hullId) {
      if (v) scene.remove(v.mesh);
      const mesh = buildShipMesh(e.hull, M);
      scene.add(mesh);
      v = { mesh, hullId: e.hullId };
      views.set(e.id, v);
      if (e.id === world.playerId) rig.fitHull(hullLength(e.hull));
    }
    v.mesh.position.set(
      e.prevPos.x + (e.pos.x - e.prevPos.x) * alpha,
      e.prevPos.y + (e.pos.y - e.prevPos.y) * alpha,
      e.prevPos.z + (e.pos.z - e.prevPos.z) * alpha,
    );
    _q.set(e.prevRot.x, e.prevRot.y, e.prevRot.z, e.prevRot.w);
    _q2.set(e.rot.x, e.rot.y, e.rot.z, e.rot.w);
    v.mesh.quaternion.slerpQuaternions(_q, _q2, alpha);
    animateShipMesh(v.mesh, e.throttle, e.speed / e.flight.maxSpeed, t);
    return v.mesh;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    rig.camera.aspect = w / h;
    rig.camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  let t = 0;
  return {
    renderer, scene, rig, M,
    render(alpha, frameDt) {
      t += frameDt;
      let playerMesh = null;
      for (const e of world.entities) {
        const m = syncEntity(e, alpha, t);
        if (e.id === world.playerId) playerMesh = m;
      }
      if (playerMesh) {
        rig.update(playerMesh.position, playerMesh.quaternion, frameDt);
        camFill.position.copy(rig.camera.position).add(new THREE.Vector3(0, rig.dist * 0.6, 0));
        camFill.target.position.copy(playerMesh.position);
      }
      sky.mesh.position.copy(rig.camera.position);
      sky.uniforms.uCenter.value.copy(rig.camera.position);
      sky.uniforms.uTime.value = t;
      blackSun.update(t, rig.camera);
      asterion.update(t); pillar.update(t); wreck.update(t);
      dust.update(rig.camera);
      grade.uniforms.uTime.value = t;
      composer.render();
    },
    /** World → screen pixels; null when behind the camera. */
    project(pos) {
      _p.set(pos.x, pos.y, pos.z).project(rig.camera);
      if (_p.z > 1) return null;
      return { x: (_p.x * 0.5 + 0.5) * window.innerWidth, y: (-_p.y * 0.5 + 0.5) * window.innerHeight, behind: false };
    },
  };
}
