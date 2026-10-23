import { existsSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  || '/home/guestpc/0sol-by-lycheetah/node_modules/playwright/index.mjs');

const URL = process.env.GAME_URL || 'http://localhost:8082/';
const errors = [];
let pass = 0, fail = 0;
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${n}${d ? `   [${d}]` : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);   // packs load via fetch

console.log('\n=== 1. THE API SURFACE garage.js DEPENDS ON ===');
const api = await page.evaluate(() => {
  const p = window.packRenderer;
  if (!p) return { missing: true };
  const t = k => typeof p[k];
  return {
    missing: false,
    packCount: Object.keys(p.packs || {}).length,
    idCount: typeof p.ids === 'function' ? p.ids().length : -1,
    hasAbyssal: 'abyssal-choir' in (p.packs || {}),
    activeId: p.activeId ?? null,
    save: t('save'), persist: t('persist'), use: t('use'),
    cycle: t('cycle'), loadAll: t('loadAll'), restore: t('restore'),
  };
});
if (api.missing) { ck('packRenderer exists', false); }
else {
  ck('packRenderer exists', true);
  // NOT 15. `packs/` holds 15 JSON files, but `abyssal-choir` is defined
  // INLINE at js/packs.js:330 and registered at load, so the runtime carries
  // 16. Every "15 packs" claim in this repo counts files, not packs.
  ck('16 packs loaded (15 JSON + built-in abyssal-choir)',
     api.packCount === 16, `${api.packCount} loaded`);
  // The page cannot stat the disk, so the file side is checked in node.
  ck('abyssal-choir is live in the runtime',
     api.hasAbyssal === true, `loaded=${api.hasAbyssal}`);
  ck('...and has NO json file, so validate-pack.mjs never sees it',
     !existsSync('packs/abyssal-choir.json'),
     `packs/abyssal-choir.json exists = ${existsSync('packs/abyssal-choir.json')}`);
  // ids() prepends 'legacy' — a REAL selectable option (the pre-pack
  // hand-drawn art), not an off-by-one.
  ck('ids() offers 17 options (16 packs + legacy)',
     api.idCount === 17, `${api.idCount} ids`);
  ck('packRenderer.use is a function', api.use === 'function');
  ck('packRenderer.persist is a function', api.persist === 'function');
  ck('garage.js calls .save() — does it EXIST?', api.save === 'function',
     `typeof save = ${api.save}`);
}

console.log('\n=== 2. THE SKIN TILES ARE RENDERED ===');
const tiles = await page.locator('#title-skins .choice-tile').count();
ck('skin tiles present in the DOM', tiles > 0, `${tiles} tiles`);
// renderSkinChoices() iterates Object.values(packs), so 'legacy' — which
// ids() and cycle() both treat as selectable — gets NO tile. Once a player
// picks any pack there is no way back to the legacy look from the grid.
ck('every id ids() offers has a tile', tiles === api.idCount,
   `${tiles} tiles vs ${api.idCount} ids — legacy has no tile`);

console.log('\n=== 3. CLICKING ONE — THE ACTUAL MECHANISM ===');
errors.length = 0;
const before = await page.evaluate(() => ({
  active: window.packRenderer?.activeId ?? null,
  stored: localStorage.getItem('biotank_forge_pack'),
}));
if (tiles > 1) {
  await page.locator('#title-skins .choice-tile').nth(1).click({ force: true });
  await page.waitForTimeout(400);
}
const after = await page.evaluate(() => ({
  active: window.packRenderer?.activeId ?? null,
  stored: localStorage.getItem('biotank_forge_pack'),
  activeTiles: document.querySelectorAll('#title-skins .choice-tile.active').length,
}));
ck('the active pack changed', before.active !== after.active,
   `${before.active} -> ${after.active}`);
ck('NO error thrown on click', errors.length === 0, errors[0]?.slice(0, 110) || 'clean');
ck('the choice PERSISTED to localStorage', after.stored === after.active,
   `stored=${after.stored} active=${after.active}`);
ck('the UI marks the new tile active', after.activeTiles > 0,
   `${after.activeTiles} tiles marked active`);

console.log(`\n${'='.repeat(58)}\n${pass}/${pass + fail} passed`);
if (errors.length) {
  console.log('PAGE ERRORS:');
  [...new Set(errors)].slice(0, 5).forEach(e => console.log('  ✘ ' + e.slice(0, 200)));
}
await browser.close();
process.exit(fail ? 1 : 0);
