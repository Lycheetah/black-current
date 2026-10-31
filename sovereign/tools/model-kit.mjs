// Model kit: turn a model script (tools/models/<name>.js, exporting build() and meta) into a .glb
// in src/data/models/. Runs the script in headless Chromium with three's GLTFExporter.
//   node tools/model-kit.mjs green_seed_hero
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const names = process.argv.slice(2);
if (!names.length) { console.error('usage: node tools/model-kit.mjs <model-script-name> [...]'); process.exit(1); }

const browser = await chromium.launch();
for (const name of names) {
  const entry = `
    import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
    import * as model from './tools/models/${name}.js';
    import * as THREE from 'three';
    import { createFleetCatalog } from './src/data/ships/catalog.js';
    import { blueprintFromHull } from './src/ships/blueprint.js';
    window.__export = () => new Promise((resolve, reject) => {
      const scene = model.build();
      new GLTFExporter().parse(scene, (buf) => {
        const bytes = new Uint8Array(buf); let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        let tris = 0; scene.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
        // A matching blueprint: the catalog hull's generated blueprint, pointed at this model,
        // with nodes from the model's NODE_ markers scaled to the hull's game length.
        let blueprint = null;
        if (model.meta.hull) {
          const hull = createFleetCatalog()[model.meta.hull];
          const bp = blueprintFromHull(hull);
          scene.updateMatrixWorld(true);
          const box = new THREE.Box3(); scene.traverse((o) => { if (o.isMesh) box.expandByObject(o); });
          const k = bp.length / (box.max.z - box.min.z);
          const nodes = [];
          scene.traverse((o) => { const m = /^NODE_(.+)$/.exec(o.name); if (m) { const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
            nodes.push({ bank: m[1], x: 0, z: +(p.z * k / bp.length).toFixed(3), size: 1, local: { x: +(p.x * k).toFixed(3), y: +(p.y * k).toFixed(3), z: +(p.z * k).toFixed(3) } }); } });
          bp.model = { src: model.meta.name };
          bp.nodes = nodes;
          bp.signature.on = false;
          blueprint = bp;
        }
        resolve({ b64: btoa(s), name: model.meta.name, tris: Math.round(tris), blueprint });
      }, reject, { binary: true });
    });`;
  const res = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'js' }, bundle: true, format: 'iife', write: false });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(e.message));
  await page.setContent(`<script>${res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
  const out = await page.evaluate(() => window.__export());
  const file = join(root, 'src/data/models', out.name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(out.b64, 'base64'));
  console.log(`model ${out.name} · ${(out.b64.length * 0.75 / 1024).toFixed(0)} KB · ${out.tris} triangles`);
  if (out.blueprint) {
    const bpFile = join(root, 'src/data/blueprints', out.blueprint.id + '.json');
    writeFileSync(bpFile, JSON.stringify(out.blueprint, null, 2) + '\n');
    console.log(`blueprint ${out.blueprint.id}.json · ${out.blueprint.nodes.length} nodes → list it in src/data/blueprints/index.js`);
  }
  await page.close();
}
await browser.close();
