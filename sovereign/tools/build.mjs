// Build: bundle src/main.js with esbuild and inline it and the CSS into one HTML file.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

// Each page: an entry script, a stylesheet and an HTML shell, bundled into one self-contained file.
const PAGES = [
  { entry: 'src/main.js', css: 'src/ui/style.css', shell: 'index.html', out: 'dist/sovereign-eclipse.html' },
  { entry: 'src/forge/main.js', css: 'src/forge/forge.css', shell: 'forge.html', out: 'dist/hull-forge.html' },
];

async function buildPage(pg) {
  const t0 = Date.now();
  const res = await esbuild.build({
    entryPoints: [join(root, pg.entry)],
    bundle: true, format: 'iife', minify: !watch, target: 'es2020', write: false, legalComments: 'none',
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

const build = () => Promise.all(PAGES.map(buildPage));

await build();
if (watch) {
  const { watch: fsWatch } = await import('node:fs');
  let timer;
  fsWatch(join(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => build().catch(console.error), 80); });
  for (const pg of PAGES) fsWatch(join(root, pg.shell), () => build().catch(console.error));
  console.log('watching…');
}
