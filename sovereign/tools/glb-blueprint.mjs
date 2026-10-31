// Write a hull blueprint for an existing .glb: reads NODE_ markers and points the blueprint at the model.
//   node tools/glb-blueprint.mjs src/data/models/green_seed_hero.glb savanah_starter
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [file, hullId] = process.argv.slice(2);
if (!file || !hullId) { console.error('usage: node tools/glb-blueprint.mjs <model.glb> <hull id>'); process.exit(1); }

const entry = `
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
  import { createFleetCatalog } from './src/data/ships/catalog.js';
  import { blueprintFromHull } from './src/ships/blueprint.js';
  window.__make = (b64, src, hullId) => new Promise((resolve, reject) => {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(buf.buffer, '', (gltf) => {
      const scene = gltf.scene; scene.updateMatrixWorld(true);
      const box = new THREE.Box3(); scene.traverse((o) => { if (o.isMesh) box.expandByObject(o); });
      const bp = blueprintFromHull(createFleetCatalog()[hullId]);
      const k = bp.length / (box.max.z - box.min.z);
      const nodes = [], engines = [];
      scene.traverse((o) => {
        const m = /^NODE_(.+)$/.exec(o.name);
        if (m) { const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
          nodes.push({ bank: m[1], x: 0, z: +(p.z * k / bp.length).toFixed(3), size: 1, local: { x: +(p.x * k).toFixed(3), y: +(p.y * k).toFixed(3), z: +(p.z * k).toFixed(3) } }); }
        if (/^ENGINE/.test(o.name)) engines.push(o.name);
      });
      bp.model = { src }; bp.nodes = nodes; bp.signature.on = false; bp.structures = false;
      resolve({ bp, engines });
    }, reject);
  });`;
const res = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true, format: 'iife', write: false });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<script>${res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
const out = await page.evaluate(([b64, src, id]) => window.__make(b64, src, id), [readFileSync(file).toString('base64'), basename(file), hullId]);
await browser.close();
const target = join(root, 'src/data/blueprints', hullId + '.json');
writeFileSync(target, JSON.stringify(out.bp, null, 2) + '\n');
console.log(`blueprint ${hullId}.json · ${out.bp.nodes.length} nodes · engines ${out.engines.join(', ')}`);
