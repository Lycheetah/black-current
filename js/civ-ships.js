/* CIVILISATION SHIPS (Mac, 2026-10-30: "design a ton of premade ships", "people will be able to have some cool combos or
 * pure bloodline ships"). Every one of the fifteen canon civilisations gets a factory hull on every frame, frigate to titan:
 * 135 ready-to-fly, fully rebuildable designs beside the Forge yard's own thirteen.
 * ⚖ Names, mottos and doctrine are canon text only (js/canon.js, from docs/canon): each ship takes its civilisation's hull
 *   name for that class (Savanah's Eye Knife, Harpy Claw, Watcher Dread …). Nothing here invents lore.
 * Shape: a growth grammar per civilisation, read from its canon fleet DNA (predatory hooks, spear forms, crystalline wings,
 *   a radial disc, gravitational claws, deliberate asymmetry …). The hull grows cell by cell from the command core,
 *   always connected, mirrored unless the canon says asymmetric.
 * Kit: guns follow the canon weapon line (Savanah repeaters and tracking, AI Hunters railguns, Blackhole torpedoes …),
 *   utilities the doctrine (shield supremacy, armour-first, regenerative), and the rest goes through modularShips.factory,
 *   which fits what the captain's power and guns allow. */
(() => {
  'use strict';
  // frame → the canon class whose hull name it carries, how many sections it grows, and its kit counts
  const FRAMES = {
    frigate: { cls: 'Frigate', n: 7, guns: ['deck', 'deck'], drives: 1, engines: 1, util: 0 },
    destroyer: { cls: 'Destroyer', n: 10, guns: ['deck', 'deck', 'novice'], drives: 2, engines: 2, util: 0 },
    cruiser: { cls: 'Cruiser', n: 12, guns: ['battery', 'deck', 'deck'], drives: 2, engines: 2, util: 1 },
    heavycruiser: { cls: 'Heavy Cruiser', n: 16, guns: ['battery', 'battery', 'battery', 'deck'], drives: 3, engines: 2, util: 1 },
    battlecruiser: { cls: 'Battlecruiser', n: 18, guns: ['heavy', 'battery', 'battery', 'deck'], drives: 3, engines: 3, util: 1 },
    battleship: { cls: 'Battleship', n: 20, guns: ['heavy', 'battery', 'battery', 'battery', 'deck'], drives: 3, engines: 3, util: 2 },
    capital: { cls: 'Dreadnought', n: 30, guns: ['spinal', 'heavy', 'heavy', 'battery', 'battery', 'battery'], drives: 5, engines: 3, util: 2, hangar: 1 },
    supercapital: { cls: 'Carrier', n: 44, guns: ['spinal', 'spinal', 'heavy', 'heavy', 'heavy', 'battery', 'battery', 'battery'], drives: 6, engines: 4, util: 3, hangar: 3 },
    titan: { cls: 'Titan', n: 60, guns: ['spinal', 'spinal', 'spinal', 'heavy', 'heavy', 'heavy', 'heavy', 'battery', 'battery', 'battery', 'battery'], drives: 8, engines: 5, util: 3, hangar: 4 }
  };
  const SLOT_CLS = { novice: 'POINT', deck: 'LIGHT', battery: 'MEDIUM', heavy: 'HEAVY', spinal: 'CAPITAL' };
  const SIZE = { frigate: '', destroyer: '', cruiser: '-light', heavycruiser: '-medium', battlecruiser: '-medium', battleship: '-heavy', capital: '-heavy', supercapital: '-capital', titan: '-capital' };
  // growth score per form: higher grows first (x is fore, y is beam)
  const FORM = {
    spear: (x, y) => -Math.abs(y) * 2.6 - Math.abs(x) * 0.45 + (x > 0 ? 0.2 : 0),
    hook: (x, y) => -Math.abs(y) * 1.7 - Math.abs(x) * 0.7 + (x >= 1 && Math.abs(y) >= 2 ? 1.6 : 0),
    wing: (x, y) => -Math.abs(y) * 0.55 - Math.abs(x) * 1.5 - (Math.abs(y) > 1 && x > 0 ? 0.6 : 0),
    block: (x, y) => -Math.max(Math.abs(x) * 0.9, Math.abs(y) * 1.25),
    ring: (x, y) => -Math.abs(Math.hypot(x * 0.85, y) - 2.3) * 2 - Math.hypot(x, y) * 0.12,
    fork: (x, y) => x > 0 ? -Math.abs(Math.abs(y) - 2) * 2 - x * 0.4 : -Math.abs(y) * 1.4 - Math.abs(x) * 0.6,
    cross: (x, y) => -Math.min(Math.abs(y) * 2.4 + Math.abs(x) * 0.45, Math.abs(x) * 2.4 + Math.abs(y) * 0.45),
    claw: (x, y) => -Math.abs(Math.hypot(x - 0.5, y) - 2.4) * 1.6 + (x > 0 ? 0.5 : 0) - Math.abs(y) * 0.1,
    disc: (x, y) => -Math.hypot(x, y * 1.05),
    spire: (x, y) => -Math.abs(y) * 1.1 - Math.abs(x) * 0.9 + (x === 0 ? 1.1 : 0),
    asym: (x, y) => -Math.abs(x) * 0.7 - (y < 0 ? Math.abs(y) * 2.6 : Math.abs(y) * 0.8),
    // fractured beast armour, spikes: a jagged, lopsided mass (a fixed hash per cell, so the same every time)
    shard: (x, y) => -Math.hypot(x * 0.8, y) * 0.9 + (((Math.imul(x + 17, 73856093) ^ Math.imul(y + 29, 19349663)) >>> 0) % 1000) / 1000 * 2.2 - (y < 0 ? 0.5 : 0),
    // flowing protective shells: an arc that wraps the bow
    shell: (x, y) => -Math.abs(Math.hypot(x + 1.2, y) - 2.6) * 1.7 - Math.abs(y) * 0.15 + (x >= 0 ? 0.3 : 0),
    // cloaked wings swept aft
    swept: (x, y) => -Math.abs(y) * 0.6 - Math.abs(x + Math.abs(y) * 0.7) * 1.5,
    // feather arrays: parallel vanes joined by one spar
    feather: (x, y) => (y % 2 === 0 || x === -1 ? 0 : -3) - Math.abs(x) * 0.45 - Math.abs(y) * 0.55,
    // fortress silhouettes and horned skulls: a block with two horns forward
    horned: (x, y) => -Math.max(Math.abs(x) * 0.9, Math.abs(y) * 1.25) + (x >= 2 && Math.abs(y) === 2 ? 2.2 : 0)
  };
  // per civilisation, read from its canon weapon line, doctrine and fleet DNA
  const CIV = {
    'savanah': { form: 'hook', arch: ['repeater', 'cannon', 'seeker'], util: 'shield', armour: 0.3 },
    'sol-symbiots': { form: 'shell', arch: ['lance', 'bolt', 'pulse'], util: 'shield', armour: 0.2 },
    'chaos': { form: 'shard', arch: ['repeater', 'mortar', 'scatter', 'rocket'], util: 'repair', armour: 0.35 },
    'cosmic-darkness': { form: 'swept', arch: ['rifle', 'driver', 'lance'], util: 'shield', armour: 0.15 },
    'cosmic-light': { form: 'cross', arch: ['lance', 'pulse', 'shell'], util: 'shield', armour: 0.2 },
    'blackhole': { form: 'claw', arch: ['torpedo', 'mortar', 'shell'], util: 'armour', armour: 0.45 },
    'hybrid-fused': { form: 'asym', arch: ['stream', 'repeater', 'cannon'], util: 'repair', armour: 0.35 },
    'human-hunters': { form: 'block', arch: ['repeater', 'stream', 'seeker', 'cannon'], util: 'armour', armour: 0.5, drives: 1.5 },
    'ai-hunters': { form: 'spear', arch: ['driver', 'rifle', 'stream'], util: 'shield', armour: 0.15 },
    'amethyst-angels': { form: 'spire', arch: ['pulse', 'lance', 'bolt'], util: 'shield', armour: 0.3 },
    'techno-angels': { form: 'feather', arch: ['bolt', 'lance', 'seeker'], util: 'shield', armour: 0.1 },
    'ai-gods': { form: 'disc', arch: ['lance', 'pulse', 'bolt'], util: 'shield', armour: 0.25 },
    'pagan-ai': { form: 'horned', arch: ['seeker', 'rocket', 'stream'], util: 'armour', armour: 0.55 },
    'ai': { form: 'ring', arch: ['bolt', 'repeater', 'cannon'], util: 'shield', armour: 0.2 },
    'ai-human-gods': { form: 'fork', arch: ['lance', 'bolt', 'cannon'], util: 'shield', armour: 0.25 }
  };
  const stats = { built: 0, failed: [] };
  let ready = false;
  const key = (x, y) => x + ',' + y;
  // grow n connected cells from the core: the best-scoring free neighbour each step (and its mirror, unless asymmetric)
  function grow(form, n) {
    const score = FORM[form], mirror = form !== 'asym' && form !== 'shard', cells = new Map([[key(0, 0), [0, 0]]]);
    const ok = (x, y) => Math.abs(x) <= 8 && Math.abs(y) <= 8 && !cells.has(key(x, y));
    while (cells.size < n) {
      let best = null;
      for (const [x, y] of cells.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!ok(nx, ny)) continue;
        const s = score(nx, ny) + (mirror && ny < 0 ? -1e-6 : 0);
        if (!best || s > best.s + 1e-9 || Math.abs(s - best.s) < 1e-9 && (nx > best.x || nx === best.x && Math.abs(ny) < Math.abs(best.y))) best = { s, x: nx, y: ny };
      }
      if (!best) break;
      cells.set(key(best.x, best.y), [best.x, best.y]);
      if (mirror && best.y !== 0 && cells.size < n && ok(best.x, -best.y)) cells.set(key(best.x, -best.y), [best.x, -best.y]);
    }
    return [...cells.values()];
  }
  function gunList(slotKind, arches) {
    const M = window.modularShips, A = window.arsenal, cls = SLOT_CLS[slotKind], order = ['CAPITAL', 'SIEGE', 'HEAVY', 'MEDIUM', 'LIGHT', 'POINT'];
    const guns = Object.entries(M.GEARS).filter(([, g]) => g.weapon && !g.retired && !g.salvageOnly && A.GUNS[g.weapon] && !A.GUNS[g.weapon].special);
    const out = [];
    // this class first (the civilisation's archetypes in order, then the rest), then each smaller class the same way
    for (const c of order.slice(order.indexOf(cls))) {
      const here = guns.filter(([, g]) => g.cls === c);
      for (const a of arches) for (const [id, g] of here) if (A.GUNS[g.weapon].arch === a && !out.includes(id)) out.push(id);
      for (const [id] of here) if (!out.includes(id)) out.push(id);
    }
    return out;
  }
  function utilList(frame, kind) {
    const s = SIZE[frame], base = kind === 'armour' ? ['armour' + (s || '-light')] : [kind + s, kind];
    return [...new Set([...base, 'shield' + s, 'shield', 'repair', 'armour-light'])].filter(g => window.modularShips.GEARS[g]);
  }
  function design(civ, frame, extra = 0) {
    const F = FRAMES[frame], C = CIV[civ.id], M = window.modularShips, H = M.HULLS[frame];
    const n = Math.min(H.sections, F.n + extra), cells = grow(C.form, n);
    const used = new Set([key(0, 0)]), sections = [{ id: 'core', kind: 'bridge', x: 0, y: 0 }], fittings = [];
    const take = (pick, kind, id) => { const c = pick(); if (!c) return null; used.add(key(c[0], c[1])); const s = { id, kind, x: c[0], y: c[1] }; sections.push(s); return s; };
    const free = () => cells.filter(c => !used.has(key(c[0], c[1])));
    const nearCore = () => free().sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || b[0] - a[0])[0];
    // drives at the stern: the aft-most cells, nearest the keel first
    const drives = Math.max(1, Math.round(F.drives * (C.drives || 1))), driveSec = [];
    for (let i = 0; i < drives; i++) { const s = take(() => free().sort((a, b) => a[0] - b[0] || Math.abs(a[1]) - Math.abs(b[1]))[0], 'drive', 'drive-' + i); if (s) driveSec.push(s); }
    // guns: the biggest mount on the forward keel, the rest forward and out to the flanks
    const gunSec = [];
    F.guns.forEach((kind, i) => {
      const s = take(() => free().sort((a, b) => (i === 0 ? Math.abs(a[1]) - Math.abs(b[1]) : 0) || b[0] - a[0] || Math.abs(b[1]) - Math.abs(a[1]))[0], kind, 'gun-' + i);
      if (s) gunSec.push(s);
    });
    // utilities and hangars near the core
    const utilSec = [];
    for (let i = 0; i < (F.util || 0); i++) { const s = take(nearCore, 'utility', 'util-' + i); if (s) utilSec.push(s); }
    for (let i = 0; i < (F.hangar || 0); i++) take(nearCore, 'hangar', 'hangar-' + i);
    // the rest: armour on the outside (the civilisation's share), spine within
    const rest = free().sort((a, b) => Math.hypot(b[0], b[1] * 1.2) - Math.hypot(a[0], a[1] * 1.2));
    const plates = Math.round(rest.length * C.armour);
    rest.forEach((c, i) => { sections.push({ id: (i < plates ? 'plate-' : 'spine-') + i, kind: i < plates ? 'plate' : 'spine', x: c[0], y: c[1] }); });
    // the kit, in priority order: guns, the core's utility, engines, utilities
    gunSec.forEach(s => fittings.push([s.id, gunList(s.kind, C.arch)]));
    fittings.push(['core', utilList(frame, C.util)]);
    const engines = ['engine' + SIZE[frame], 'engine-medium', 'engine-light', 'engine'].filter((g, i, a) => M.GEARS[g] && a.indexOf(g) === i);
    driveSec.slice(0, F.engines).forEach(s => fittings.push([s.id, engines]));
    utilSec.forEach((s, i) => fittings.push([s.id, utilList(frame, i % 2 ? 'repair' : C.util)]));
    return { sections: sections.map(s => [s.id, s.kind, s.x, s.y]), fittings: fittings.slice(0, H.slots) };
  }
  const nameFor = (civ, frame) => (canon.hulls?.[civ.id] || []).find(h => h.cls === FRAMES[frame].cls)?.name || `${civ.name} ${FRAMES[frame].cls}`;
  function install() {
    const M = window.modularShips;
    if (!M?.FACTORY || !window.canon?.civilisations || !window.arsenal?.GUNS || !window.civilisations?.byId || !M.GEARS['active-booster']) { setTimeout(install, 50); return; }
    if (M.FACTORY.some(f => f.civ)) { ready = true; return; }
    const taken = {};
    for (const civ of canon.civilisations) {
      if (!CIV[civ.id]) continue;
      for (const frame of Object.keys(FRAMES)) {
        try {
          // a small frame leaves few shapes: a silhouette another line already flies grows a section or two more
          const seen = taken[frame] || (taken[frame] = new Set()), sig = d => d.sections.map(x => x[2] + ',' + x[3]).sort().join(' ');
          let d = design(civ, frame);
          for (let extra = 1; seen.has(sig(d)) && extra <= 4; extra++) d = design(civ, frame, extra);
          seen.add(sig(d));
          M.FACTORY.push({ id: civ.id + '-' + frame, civ: civ.id, name: nameFor(civ, frame), hull: frame, role: `${civ.name} · ${FRAMES[frame].cls}`, color: tintOf(civ), blurb: `${civ.fleetDoctrine}. "${civ.motto}"`, sections: d.sections, fittings: d.fittings });
          stats.built++;
        } catch (e) { stats.failed.push(civ.id + '-' + frame + ': ' + e.message); }
      }
    }
    ready = true;
  }
  // the civilisation's first canon colour word, as civilisations.js reads it
  const INK = [['EMERALD', '#3fd28b'], ['AMETHYST', '#b58cff'], ['VIOLET', '#a070ff'], ['PURPLE', '#a070ff'], ['CRIMSON', '#ff5a6a'], ['RED', '#ff5a5a'], ['CYAN', '#5ef2e0'], ['ORANGE', '#ff8c42'], ['OLIVE', '#a7b46a'], ['BLUE', '#6fa0ff'], ['BONE', '#e6d8b8'], ['IVORY', '#f2e6c8'], ['SILVER', '#c8d2dc'], ['WHITE', '#eef4ff'], ['GOLD', '#e8c478'], ['GREY', '#9aa7b2'], ['BLACK', '#7f8c99']];
  const tintOf = c => (INK.find(([w]) => (c.fleetDNA || '').toUpperCase().includes(w)) || [0, '#8fd8cc'])[1];
  window.civShips = { FRAMES, CIV, FORM, stats, grow, design, nameFor, get ready() { return ready; } };
  if (document.readyState === 'complete') install(); else window.addEventListener('load', () => setTimeout(install, 0));
})();
