// Build: bundle src/main.js with esbuild and inline it and the CSS into one HTML file.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'sovereign-eclipse.html');
const watch = process.argv.includes('--watch');

async function build() {
  const t0 = Date.now();
  const res = await esbuild.build({
    entryPoints: [join(root, 'src/main.js')],
    bundle: true, format: 'iife', minify: !watch, target: 'es2020', write: false, legalComments: 'none',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(join(root, 'src/ui/style.css'), 'utf8');
  const html = readFileSync(join(root, 'index.html'), 'utf8')
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`built ${out} · ${(html.length / 1024).toFixed(0)} KB · ${Date.now() - t0} ms`);
}

await build();
if (watch) {
  const { watch: fsWatch } = await import('node:fs');
  let timer;
  fsWatch(join(root, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => build().catch(console.error), 80); });
  fsWatch(join(root, 'index.html'), () => build().catch(console.error));
  console.log('watching…');
}
