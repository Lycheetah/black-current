/* Witness for the clip-on forge set (js/modular-ships.js PIECES + js/topdown-kit.js CLIP): every piece paints
   real pixels on every mount it claims, the stat pieces compile to the node they promise, the paint-only ones
   compile to nothing, the auxiliary reactor really raises the power budget, and the yard shows each piece's art. */
import { firefox } from 'playwright';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8811/black-current/';
const out = process.argv.slice(2).find(a => a.includes('/'));   // a browser name is not a folder
let pass = 0, fail = 0; const errors = [];
const check = (name, ok, info) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || info === undefined ? '' : ' ' + JSON.stringify(info)}`); };
const browser = await firefox.launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.modularShips?.ready && window.modularYard && window.topdownKit, null, { timeout: 30000 });

const art = await page.evaluate(() => {
    const blank = [], rows = [];
  for (const [id, p] of Object.entries(modularShips.PIECES)) for (const mount of p.mounts) {
    // a lone section in the same box with and without the piece: the piece must add or change ink
    const kind = p.on || 'utility', m = k => ({ sections: [{ id: 'c', kind, x: 0, y: 0 }], fittings: [], kit: k });
    const a = topdownKit.thumb(m([{ cell: 'c', mount, piece: id }]), 160, 100), b = topdownKit.thumb(m([{ cell: 'nowhere', mount, piece: id }]), 160, 100)   // same box, piece dropped (no such cell);
    const da = a.getContext('2d').getImageData(0, 0, 160, 100).data, db = b.getContext('2d').getImageData(0, 0, 160, 100).data;
    let diff = 0; for (let i = 0; i < da.length; i += 4) diff += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60;
    rows.push([id, mount, diff]); if (diff < 25) blank.push(id + '@' + mount);
  }
  return { n: Object.keys(modularShips.PIECES).length, rows, blank };
});
check(`25 clip-on pieces in the catalogue`, art.n === 25, art.n);
check(`every piece paints visibly on every mount it claims (${art.rows.length} piece-mounts)`, art.rows.length === 33 && !art.blank.length, art.blank);

const stats = await page.evaluate(() => {
  const M = modularShips, base = () => ({ v: 1, hull: 'frigate', sections: [{ id: 'core', kind: 'bridge', x: 0, y: 0 }, { id: 'aft', kind: 'spine', x: -1, y: 0 }, { id: 'fore', kind: 'deck', x: 1, y: 0 }, { id: 'drive', kind: 'drive', x: -2, y: 0 }], fittings: [{ slot: 'fore', gear: 'gun-spitter', mk: 1 }, { slot: 'drive', gear: 'engine', mk: 1 }] });
  const design = kit => ({ id: 'clip-test', frame: 'Forge frigate', color: '#5ef2e0', primaryWeapon: 'spitter', secAbility: 'shield', modular: { ...base(), kit }, nodes: [] });
  const res = {};
  const nodesOf = kit => { const c = M.compile(design(kit)); return c.design.nodes.slice(4, c.design.nodes.length - 2).map(n => n.type); };
  const want = { wing: 'pod', cargo: 'pod', blister: 'shield', vane: 'thruster', tines: 'spike', bowshield: 'shield', twinjet: 'thruster', burner: 'thruster', bulwark: 'pod' };
  const mountFor = { wing: ['core', 'port'], cargo: ['core', 'star'], blister: ['core', 'port'], vane: ['aft', 'star'], tines: ['fore', 'prow'], bowshield: ['fore', 'prow'], twinjet: ['drive', 'stern'], burner: ['drive', 'stern'], bulwark: ['aft', 'top'], lattice: ['aft', 'port'], dish: ['fore', 'prow'], fins: ['drive', 'stern'], radar: ['fore', 'top'], mast: ['core', 'top'], hab: ['aft', 'top'], reactor: ['aft', 'top'] };
  res.wrong = [];
  for (const [piece, [cell, mount]] of Object.entries(mountFor)) {
    let got; try { got = nodesOf([{ cell, mount, piece }]); } catch (e) { res.wrong.push(piece + ': ' + e.message); continue; }
    const exp = want[piece] ? [want[piece]] : [];
    if (JSON.stringify(got) !== JSON.stringify(exp)) res.wrong.push(`${piece}: ${JSON.stringify(got)} want ${JSON.stringify(exp)}`);
  }
  const power = kit => M.inspect(design(kit)).power;
  res.reactor = [power([]), power([{ cell: 'aft', mount: 'top', piece: 'reactor' }])];
  // the starter gun and engine, plus 6 power of shields and jets: over the frigate's 8, and the reactor's 2 brings it back
  const heavy = [{ cell: 'core', mount: 'port', piece: 'blister' }, { cell: 'fore', mount: 'prow', piece: 'bowshield' }, { cell: 'drive', mount: 'stern', piece: 'twinjet' }];
  try { M.inspect(design(heavy)); res.over = 'allowed'; } catch (e) { res.over = e.message; }
  try { res.withReactor = M.inspect(design([...heavy, { cell: 'aft', mount: 'top', piece: 'reactor' }])).power; } catch (e) { res.withReactor = e.message; }
  try { M.inspect(design([{ cell: 'fore', mount: 'top', piece: 'hab' }])); res.habOnGun = 'allowed'; } catch (e) { res.habOnGun = e.message; }
  return res;
});
check('stat pieces compile to the node they promise; paint-only pieces compile to nothing', !stats.wrong.length, stats.wrong);
check('the auxiliary reactor lowers power use by 2', stats.reactor[1] === stats.reactor[0] - 2, stats.reactor);
check('power is still enforced, and the reactor makes the same over-budget fit legal', stats.reactor[0] + 6 > 8 && /Power budget exceeded/.test(stats.over) && stats.withReactor === stats.reactor[0] + 4 && stats.withReactor <= 8, stats);
check('deck pieces that need a clear deck refuse a turreted section', /no turret/.test(stats.habOnGun), stats.habOnGun);

// the class ladder: five frames, each strictly bigger, every factory hull legal, capital sections stay on capital frames
const ladder = await page.evaluate(() => {
  const M = modularShips, o = { order: Object.values(M.HULLS).map(h => h.cls + ':' + h.sections + ':' + h.power + ':' + h.rank), bad: [] };
  const H = Object.values(M.HULLS); o.rising = H.every((h, i) => !i || (h.sections > H[i - 1].sections && h.power > H[i - 1].power && h.mass > H[i - 1].mass && h.rank > H[i - 1].rank));
  for (const f of M.FACTORY) try { const d = M.factory(f.id); M.inspect(d); M.compile(d); } catch (e) { o.bad.push(f.id + ': ' + e.message); }
  const refuse = kind => { const d = M.factory('lancer'); d.modular.sections.push({ id: 'zz', kind, x: 0, y: 3 }); try { M.inspect(d); return 'allowed'; } catch (e) { return e.message; } };
  o.spinal = refuse('spinal'); o.heavy = refuse('heavy');
  const sov = M.compile(M.factory('sovereign')).design; o.sections = M.factory('sovereign').modular.sections.length;
  const band = fleet.hullBand({ nodes: sov.nodes }); o.band = band && [band.cls, +(band.rate * band.dmg).toFixed(3)];
  o.ranks = M.RANK_COST.length; const ath = M.factory('athanor'); o.titan = [ath.modular.sections.length, fleet.hullBand({ nodes: M.compile(ath).design.nodes })?.cls]; const r = M.RANK_COST; const step = a => a.map((c, i) => i ? c - a[i - 1] : 0), rm = M.RANK_MASS; o.steep = step(r).at(-1) === Math.max(...step(r)) && step(rm).at(-1) === Math.max(...step(rm)); return o;
});
check('six hull classes, each strictly bigger: frigate, cruiser, battleship, capital, supercapital, titan', ladder.order.map(x => x.split(':')[0]).join() === 'FRIGATE,CRUISER,BATTLESHIP,CAPITAL,SUPERCAPITAL,TITAN' && ladder.rising, ladder.order);
check('every factory hull, capitals included, builds legally', !ladder.bad.length, ladder.bad);
check('spinal mounts and heavy decks refuse a cruiser', /needs a Forge capital/.test(ladder.spinal) && /needs a Forge battleship/.test(ladder.heavy), ladder);
check('the Sovereign flies as a SUPERCAPITAL at the ladder net (never strictly stronger)', ladder.sections >= 40 && ladder.band?.[0] === 'SUPERCAPITAL' && ladder.band[1] > 1 && ladder.band[1] < 1.1, ladder);
check('shipwright training reaches rank 6, and the titan rank is the steepest step', ladder.ranks === 6 && ladder.steep, ladder);
check('the Athanor titan is a 60+ section flying base on the TITAN band', ladder.titan[0] >= 60 && ladder.titan[1] === 'TITAN', ladder.titan);

// the yard: a real hull, the Clip-ons tab, a picture on every button
await page.evaluate(() => { document.getElementById('title-callsign').value = 'CLIPWRIGHT'; garage.launch(false); garage.closeMission?.(); engine.paused = true; if (!saveState.doc.design) engine.applyDesign(engine.starterDesign(), { restore: true }); shipyard.show(); });
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('sy-build-modular')?.click()); await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('modular-new-frigate')?.click()); await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('[data-select-section="aft"]')?.click()); await page.waitForTimeout(300);
await page.evaluate(() => [...document.querySelectorAll('.forge-tabs button')].find(b => /Clip/.test(b.textContent))?.click()); await page.waitForTimeout(300);
const yard = await page.evaluate(() => { const b = [...document.querySelectorAll('#modular-kit .kit-piece')]; return { buttons: b.length, art: b.filter(x => { const i = x.querySelector('img.kit-art'); return i && i.complete && i.naturalWidth > 0; }).length, pieces: [...new Set(b.map(x => x.dataset.piece))] }; });
check('the yard offers the new pieces on a spine section', ['wing', 'vane', 'lattice', 'bulwark', 'reactor', 'hab', 'radar', 'mast'].every(p => yard.pieces.includes(p)), yard);
check('every clip-on button carries its own painted thumbnail', yard.buttons > 10 && yard.art === yard.buttons, yard);
if (out) {
  await page.locator('#modular-kit').screenshot({ path: `${out}/clip-ons-yard.png` }).catch(() => {});
  // a showcase hull dressed in the forge set, painted large by the same kit the flight view uses
  await page.evaluate(() => {
    const s = (id, kind, x, y) => ({ id, kind, x, y });
    const m = { sections: [s('core', 'bridge', 0, 0), s('a', 'spine', -1, 0), s('f', 'battery', 1, 0), s('d', 'drive', -2, 0), s('p', 'plate', 0, -1), s('q', 'plate', 0, 1), s('u', 'utility', -1, -1), s('v', 'utility', -1, 1), s('g', 'deck', 2, 0), s('e', 'drive', -2, -1), s('h', 'drive', -2, 1)],
      fittings: [{ slot: 'f', gear: 'gun-heavycannon' }, { slot: 'g', gear: 'gun-spitter' }],
      kit: [['p', 'port', 'wing'], ['q', 'star', 'wing'], ['u', 'port', 'blister'], ['v', 'star', 'cargo'], ['g', 'prow', 'tines'], ['e', 'stern', 'twinjet'], ['h', 'stern', 'twinjet'], ['d', 'stern', 'burner'], ['a', 'top', 'reactor'], ['core', 'top', 'radar'], ['p', 'top', 'hab'], ['q', 'top', 'bulwark'], ['u', 'top', 'mast'], ['v', 'top', 'radar'], ['e', 'port', 'vane'], ['h', 'star', 'lattice'], ['f', 'port', 'vane'], ['f', 'star', 'vane']].map(([cell, mount, piece]) => ({ cell, mount, piece })) };
    const c = topdownKit.thumb(modularShips.factory('athanor').modular, 1100, 640, '#ffd36a'); c.id = 'clip-showcase'; Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 99999, background: '#05090d' }); document.body.append(c);
    const sheet = document.createElement('div'); sheet.id = 'clip-sheet'; Object.assign(sheet.style, { position: 'fixed', left: '0', top: '0', zIndex: 99999, background: '#05090d', display: 'grid', gridTemplateColumns: 'repeat(8, 160px)', gap: '6px', padding: '8px', color: '#cfe', font: '11px sans-serif' });
    for (const [id, p] of Object.entries(modularShips.PIECES)) for (const mount of p.mounts) { if (mount === 'star' && p.mounts.includes('port')) continue; const cell = document.createElement('div'); cell.append(topdownKit.thumb({ sections: [{ id: 'c', kind: p.on || 'deck', x: 0, y: 0 }], fittings: [], kit: [{ cell: 'c', mount, piece: id }] }, 160, 96, '#5ef2e0'), Object.assign(document.createElement('div'), { textContent: `${p.name} · ${mount}` })); sheet.append(cell); }
    sheet.style.display = 'none'; document.body.append(sheet);
  });
  await page.locator('#clip-showcase').screenshot({ path: `${out}/clip-ons-showcase.png` });
  await page.evaluate(() => { document.getElementById('clip-showcase').remove(); document.getElementById('clip-sheet').style.display = 'grid'; });
  await page.locator('#clip-sheet').screenshot({ path: `${out}/clip-ons-sheet.png` });
}
check('no page errors', !errors.length, errors);
await browser.close();
console.log(`RESULT ${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);
