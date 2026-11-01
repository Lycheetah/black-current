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

/** Parse every embedded model; resolves when all are ready (failures are reported, not fatal). */
export async function loadEmbeddedModels() {
  const errors = [];
  await Promise.all(Object.entries(MODEL_FILES).map(([name, url]) =>
    registerModelBuffer(name, dataUrlToBuffer(url)).catch((e) => errors.push(`${name}: ${e.message || e}`))));
  return errors;
}

export const hasModel = (name) => cache.has(name);

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
