// Focused acceptance for the production model queue, using the real GLTFLoader.
// Tiny glTF fixtures keep this a queue test; this does not attest to ship appearance.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const bundle = await build({
  entryPoints: ['src/render/model-library.js'], bundle: true, write: false,
  format: 'iife', globalName: 'modelLibrary',
  plugins: [{ name: 'fixture-model-urls', setup(b) {
    b.onLoad({ filter: /data\/models\/index\.js$/ }, () => ({
      contents: `export const MODEL_FILES = Object.fromEntries(['a','b','c','d','bad'].map(n=>[n,'/models/'+n+'.gltf']));`,
    }));
  } }],
});
const fixture = JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 });
let active = 0, peak = 0, fail = true;
const seen = [];
const server = createServer((req, res) => {
  if (!req.url.startsWith('/models/')) { res.end('<!doctype html><title>Model streaming acceptance</title>'); return; }
  seen.push(req.url); active++; peak = Math.max(peak, active);
  setTimeout(() => {
    const rejected = req.url === '/models/bad.gltf' && fail;
    res.writeHead(rejected ? 404 : 200, { 'Content-Type': 'model/gltf+json' });
    res.end(rejected ? 'deliberate missing asset' : fixture); active--;
  }, 70);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(async () => {
    const m = window.modelLibrary;
    const a = m.requestModel('a');
    const duplicate = m.requestModel('a');
    const b = m.requestModel('b');
    const c = m.requestModel('c');
    const d = m.requestModel('d', { priority: true });
    const shared = a === duplicate;
    await Promise.all([a,b,c,d]);
    const cached = await m.requestModel('a');
    const errors = await m.loadEmbeddedModels(['bad']);
    for (let i=0;i<20;i++) await m.requestModel('bad');
    return { shared, cached: !!cached, states: ['a','b','c','d','bad'].map(m.modelState), errors };
  });
  assert.equal(result.shared, true, 'concurrent callers must share a request');
  assert.equal(result.cached, true);
  assert.equal(peak, 2, 'no more than two model jobs may be active');
  assert.deepEqual(seen.slice(0,4), ['/models/a.gltf','/models/b.gltf','/models/d.gltf','/models/c.gltf']);
  assert.deepEqual(result.states, ['ready','ready','ready','ready','failed']);
  assert.equal(result.errors.length, 1, 'deliberate 404 must be reported');
  assert.equal(seen.filter((s) => s === '/models/bad.gltf').length, 1, 'render callers must not retry a failure');
  fail = false;
  assert.equal(await page.evaluate(async () => !!await modelLibrary.requestModel('bad', { retry: true })), true);
  assert.equal(seen.length, 6, 'five initial requests plus one explicit retry');
  console.log('PASS: 6 model requests; concurrency 2; deduplication, priority, cache, deliberate failure and explicit retry.');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
