// Build: bundle src/main.js with esbuild and inline it and the CSS into one HTML file.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
// Ship models ship as separate files next to the page (dist/models/), fetched at load: a page with
// several hero hulls would pass the artifact's 16 MB page limit if they were embedded.
// SINGLE=1 embeds them instead, for a one-file offline copy.
const SINGLE = !!process.env.SINGLE;

// Each page: an entry script, a stylesheet and an HTML shell, bundled into one self-contained file.
const PAGES = [
  { entry: 'src/main.js', css: 'src/ui/style.css', shell: 'index.html', out: 'dist/sovereign-eclipse.html' },
  { entry: 'src/forge/main.js', css: 'src/forge/forge.css', shell: 'forge.html', out: 'dist/hull-forge.html' },
  { entry: 'src/sector-forge/main.js', css: 'src/sector-forge/forge.css', shell: 'sector-forge.html', out: 'dist/sector-forge.html' },
];

// Each .glb becomes dist/models/<name>-<hash>.json ({ "glb": base64 }): the artifact host serves data
// files but not .glb, and the game decodes the bytes on load (src/render/model-library.js).
const modelFiles = {
  name: 'model-files',
  setup(b) {
    b.onResolve({ filter: /\.glb$/ }, (a) => ({ path: join(a.resolveDir, a.path), namespace: 'model' }));
    b.onLoad({ filter: /.*/, namespace: 'model' }, async (a) => {
      const { createHash } = await import('node:crypto');
      const bytes = readFileSync(a.path);
      const name = a.path.split('/').pop().replace(/\.glb$/, '') + '-' + createHash('sha1').update(bytes).digest('hex').slice(0, 8) + '.json';
      mkdirSync(join(root, 'dist', 'models'), { recursive: true });
      writeFileSync(join(root, 'dist', 'models', name), JSON.stringify({ glb: bytes.toString('base64') }));
      return { contents: `export default ${JSON.stringify('models/' + name)};`, loader: 'js' };
    });
  },
};

async function buildPage(pg) {
  const t0 = Date.now();
  const res = await esbuild.build({
    entryPoints: [join(root, pg.entry)],
    bundle: true, format: 'iife', minify: !watch && !process.env.NOMIN, target: 'es2020', write: false, legalComments: 'none',
    loader: SINGLE ? { '.glb': 'dataurl' } : {},
    plugins: SINGLE ? [] : [modelFiles],
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(join(root, pg.css), 'utf8');
  const html = readFileSync(join(root, pg.shell), 'utf8')
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  const file = join(root, pg.out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`built ${pg.out} · ${(html.length / 1024).toFixed(0)} KB · ${Date.now() - t0} ms`);
}

const build = async () => {
  // Fresh model files each build (their names carry a content hash).
  const { rmSync } = await import('node:fs');
  if (!SINGLE) rmSync(join(root, 'dist', 'models'), { recursive: true, force: true });
  return Promise.all(PAGES.map(buildPage));
};

await build();
if (watch) {
  const { watch: fsWatch } = await import('node:fs');
  let timer;
  fsWatch(join(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => build().catch(console.error), 80); });
  for (const pg of PAGES) fsWatch(join(root, pg.shell), () => build().catch(console.error));
  console.log('watching…');
}
