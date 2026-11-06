// Ship model library: parses embedded .glb files once and hands out clones.
// Markers inside a model (empties, by name) carry game meaning:
//   NODE_<BANK>  hardpoint node (e.g. NODE_WPN_FL)    ENGINE_<n>  drive exhaust (empty scale = nozzle radius)
// Materials named HULL*, TRIM*, GLOW*, GOLD* are swapped for the game's hull plating, trim,
// accent glow and gold so models take each civilisation's palette; any other material is kept as authored.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_FILES } from '../data/models/index.js';
import { addRim } from './materials.js';

const cache = new Map();
const requests = new Map();
const failures = new Map();
const queue = [];
let activeLoads = 0;
const MAX_LOADS = 2;
// Models are quantized by gltfpack (KHR_mesh_quantization): three.js reads that natively, with no
// WebAssembly decoder, so models load even under strict page security policies.
const loader = new GLTFLoader();

function dataUrlToBuffer(url) {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function registerModelBuffer(name, buffer) {
  return new Promise((resolve, reject) => {
    loader.parse(buffer, '', (gltf) => {
      // Authored (baked) materials are kept as they are, plus the rim light every hull gets.
      gltf.scene.traverse((o) => {
        if (o.isMesh && o.material?.isMeshStandardMaterial && !/^(HULL|TRIM|GLOW|GOLD)/i.test(o.material.name) && !o.material.userData.rim) addRim(o.material);
      });
      cache.set(name, gltf.scene);
      resolve(gltf.scene);
    }, reject);
  });
}

/** Model bytes: embedded (data URL, single-file build) or fetched from the file published beside the page. */
async function modelBuffer(url) {
  if (url.startsWith('data:')) return dataUrlToBuffer(url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  // Published as a data file because the artifact host does not serve .glb: { glbz } is the gzipped
  // .glb in base64 (to fit the host's size cap), { glb } the plain one.
  if (url.endsWith('.json')) {
    const j = await r.json();
    if (!j.glbz) return dataUrlToBuffer(',' + j.glb);
    const zipped = new Blob([dataUrlToBuffer(',' + j.glbz)]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(zipped).arrayBuffer();
  }
  return r.arrayBuffer();
}

function pumpModels() {
  while (activeLoads < MAX_LOADS && queue.length) {
    const job = queue.shift();
    job.state = 'loading';
    activeLoads++;
    modelBuffer(MODEL_FILES[job.name]).then((buf) => registerModelBuffer(job.name, buf))
      .then(job.resolve)
      .catch((e) => {
        const message = `${job.name}: ${e.message || e}`;
        failures.set(job.name, message);
        console.warn('model load', message);
        // Failure is sticky until an explicit retry: rendering must not retry every frame.
        job.resolve(null);
      })
      .finally(() => { activeLoads--; pumpModels(); });
  }
}

/** Request one model. Concurrent callers share a job; selected ships can pass queued scenery. */
export function requestModel(name, { priority = false, retry = false } = {}) {
  if (cache.has(name)) return Promise.resolve(cache.get(name));
  if (retry && failures.has(name)) { failures.delete(name); requests.delete(name); }
  const pending = requests.get(name);
  if (pending) {
    const i = priority ? queue.indexOf(pending) : -1;
    if (i > 0) { queue.splice(i, 1); queue.unshift(pending); }
    return pending.promise;
  }
  if (!MODEL_FILES[name]) return Promise.resolve(null);
  const job = { name, state: 'queued' };
  job.promise = new Promise((resolve) => { job.resolve = resolve; });
  requests.set(name, job);
  if (priority) queue.unshift(job); else queue.push(job);
  pumpModels();
  return job.promise;
}

export function modelState(name) {
  if (cache.has(name)) return 'ready';
  if (failures.has(name)) return 'failed';
  return requests.get(name)?.state || (MODEL_FILES[name] ? 'idle' : 'missing');
}

/** Load a chosen set. The no-argument form remains available to existing production tools. */
export async function loadEmbeddedModels(names = Object.keys(MODEL_FILES)) {
  const selected = [...new Set(names.filter(Boolean))];
  await Promise.all(selected.map((name) => requestModel(name, { priority: true })));
  return selected.map((name) => failures.get(name)).filter(Boolean);
}

export const hasModel = (name) => cache.has(name);

// Part pivots in game space (tools/blender/turrets.py: Blender (x, y, z) is game (x, z, -y)).
const TURRET_PIVOT = { BASE: [0, 0, 0], YAW: [0, 0.25, 0], PITCH: [0, 0.55, -0.55], BARREL: [0, 0, 0] };

/**
 * One part of the authored turret set (TUR_<family>_<part>), cloned at its pivot with palette
 * materials swapped (HULL, TRIM, GOLD, GLOW); null until turrets.glb has loaded.
 */
export function turretPart(family, part, mats) {
  const src = cache.get('turrets.glb');
  const node = src?.getObjectByName(`TUR_${family}_${part}`);
  if (!node) return null;
  // The node's transform also carries gltfpack's dequantization, so keep it and only remove the pivot.
  src.updateMatrixWorld(true);
  const c = node.clone(true);
  const pv = TURRET_PIVOT[part] || [0, 0, 0];
  new THREE.Matrix4().makeTranslation(-pv[0], -pv[1], -pv[2]).multiply(node.matrixWorld).decompose(c.position, c.quaternion, c.scale);
  const wrap = new THREE.Group();
  wrap.add(c);
  c.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.material?.name || '').toUpperCase();
    if (n.startsWith('HULL')) o.material = mats.hull;
    else if (n.startsWith('TRIM')) o.material = mats.trim;
    else if (n.startsWith('GLOW')) o.material = mats.glow;
    else if (n.startsWith('GOLD')) o.material = mats.gold;
  });
  return wrap;
}

/** Marker data read from a model: nodes and engines in model space, plus its bounds. */
export function readMarkers(scene) {
  scene.updateMatrixWorld(true);
  const nodes = [], engines = [];
  const p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion();
  scene.traverse((o) => {
    const m = /^NODE_(.+)$/.exec(o.name);
    const e = /^ENGINE/.test(o.name);
    if (!m && !e) return;
    o.matrixWorld.decompose(p, q, s);
    if (m) nodes.push({ bank: m[1], local: { x: p.x, y: p.y, z: p.z } });
    else engines.push({ x: p.x, y: p.y, z: p.z, r: Math.max(s.x, s.y, s.z) });
  });
  const box = new THREE.Box3();
  scene.traverse((o) => { if (o.isMesh) box.expandByObject(o); });
  return { nodes, engines, box };
}

/**
 * A ready-to-place clone scaled so its length along Z equals `length` metres.
 * @returns {{group:THREE.Group, scale:number, markers:ReturnType<typeof readMarkers>}|null}
 */
export function instanceModel(name, length, mats) {
  const src = cache.get(name);
  if (!src) return null;
  const scene = src.clone(true);
  const markers = readMarkers(scene);
  const size = markers.box.getSize(new THREE.Vector3());
  const k = size.z > 0 ? length / size.z : 1;
  scene.scale.setScalar(k);
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.material?.name || '').toUpperCase();
    if (n.startsWith('HULL')) o.material = mats.hull;
    else if (n.startsWith('TRIM')) o.material = mats.trim;
    else if (n.startsWith('GLOW')) o.material = mats.glow;
    else if (n.startsWith('GOLD')) o.material = mats.gold;
  });
  const scaled = {
    nodes: markers.nodes.map((nd) => ({ ...nd, local: { x: nd.local.x * k, y: nd.local.y * k, z: nd.local.z * k } })),
    engines: markers.engines.map((e) => ({ x: e.x * k, y: e.y * k, z: e.z * k, r: e.r * k })),
    box: markers.box.clone().applyMatrix4(new THREE.Matrix4().makeScale(k, k, k)),
  };
  return { group: scene, scale: k, markers: scaled };
}
