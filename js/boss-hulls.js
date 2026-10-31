/* BOSS HULLS AND ARENAS (Route 5 item 7, visual pass 5). The Solar Dreadnought got a capital modular hull and a painted
 * arena (boss-scenes.js); the other three corner guardians still flew the old round organism, smaller on screen than a
 * tier-5 cruiser, over empty space. Each now gets a capital hull of its own, built the same way, and an arena of
 * painted landmarks (landmark-art.js) round its corner sector:
 *   ABYSSAL TITAN    a supercapital iron block, siege batteries and a spinal rail · a graveyard of wrecks
 *   HIVE QUEEN       a wide crimson carrier: drone bays down both flanks, seeker racks · a living hive reef
 *   VOID LEVIATHAN   a long violet serpent spine, lance batteries fore and aft · black rubble and violet rock
 * Boss health, shields, patterns and rewards (bosses.js) are unchanged; the hull is the guardian's body and its parts.
 * The Grave Choir guardian shares the Leviathan's pattern key but keeps its own body (matched by name, not key). */
(() => {
  'use strict';
  const done = new WeakSet(), stats = { hulls: 0, arenas: 0 };
  const sec = (id, kind, x, y) => ({ id, kind, x, y });

  const BUILD = {
    'ABYSSAL TITAN': () => {
      const s = [], f = [];
      for (let x = -3; x <= 3; x++) for (let y = -1; y <= 1; y++) s.push(sec(x || y ? `hull-${x}-${y}` : 'core', x || y ? (Math.abs(y) === 1 ? 'plate' : 'spine') : 'bridge', x, y));
      for (const x of [-2, 0, 2]) for (const y of [-2, 2]) { const id = `bat-${x}-${y}`; s.push(sec(id, 'heavy', x, y)); if (x !== 0) f.push({ slot: id, gear: 'gun-cannon-heavy', mk: 1 }); }
      s.push(sec('prow', 'spinal', 4, 0)); f.push({ slot: 'prow', gear: 'gun-capitalrail', mk: 1 });
      for (const y of [-1, 0, 1]) { s.push(sec(`drive${y}`, 'drive', -4, y)); f.push({ slot: `drive${y}`, gear: 'engine', mk: 1 }); }
      return { frame: 'supercapital', color: '#ff8c42', sections: s, fittings: f, livery: { body: '#3b4048', edge: '#ff8c42', skin: 'industrial' } };
    },
    'HIVE QUEEN': () => {
      const s = [], f = [];
      for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
        if (Math.abs(x) + Math.abs(y) > 3) continue;
        const id = x || y ? `body-${x}-${y}` : 'core', flank = Math.abs(y) === 2;
        s.push(sec(id, !x && !y ? 'bridge' : flank ? 'utility' : 'plate', x, y));
        if (flank) f.push({ slot: id, gear: 'drone-bay', mk: 1 });
      }
      for (const y of [-1, 1]) { const id = `rack${y}`; s.push(sec(id, 'heavy', 3, y)); f.push({ slot: id, gear: 'gun-rocket-heavy', mk: 1 }); }
      s.push(sec('drive', 'drive', -3, 0)); f.push({ slot: 'drive', gear: 'engine', mk: 1 });
      return { frame: 'capital', color: '#ff3366', sections: s, fittings: f, livery: { body: '#4a1626', edge: '#ff3366', skin: 'organic' } };
    },
    'VOID LEVIATHAN': () => {
      const s = [], f = [];
      for (let x = -5; x <= 4; x++) {
        s.push(sec(x ? `spine${x}` : 'core', x ? 'spine' : 'bridge', x, 0));
        if (x % 2 === 0 && x !== 4) for (const y of [-1, 1]) s.push(sec(`fin${x}${y}`, 'plate', x, y));
      }
      for (const x of [-3, 3]) for (const y of [-1, 1]) { const id = `lance${x}${y}`; s.push(sec(id, 'heavy', x, y)); f.push({ slot: id, gear: 'gun-lance-heavy', mk: 1 }); }
      s.push(sec('drive', 'drive', -6, 0)); f.push({ slot: 'drive', gear: 'engine', mk: 1 });
      return { frame: 'capital', color: '#a77bff', sections: s, fittings: f, livery: { body: '#1c1430', edge: '#a77bff', skin: 'swept' } };
    }
  };

  function hull(e) {
    if (!e?.isBoss || done.has(e) || e._solarHull || !BUILD[e.name]) return;
    done.add(e);
    try {
      const plan = BUILD[e.name](), d = modularShips.make(plan.frame);
      d.frame = e.name; d.color = plan.color;
      d.modular = { v: 1, hull: plan.frame, sections: plan.sections, fittings: plan.fittings, kit: [], livery: plan.livery };
      e.nodes = modularShips.compile(d).design.nodes; e.nodes[0].radius = e.coreRadius;
      for (const n of e.nodes) { n.currentDx = n.targetDx = n.dx; n.currentDy = n.targetDy = n.dy; }
      stats.hulls++;
    } catch (err) { console.warn('[boss-hulls] kept the native body:', err.message); }
  }

  /* Arenas: painted landmarks in a ring round the corner sector's centre. Quiet (no bearing markers), weight 0 (never
     spawn points), drawn by landmark-art in the guardian's palette. */
  const ARENA = { 'ABYSSAL TITAN': ['wreck', 'titan'], 'HIVE QUEEN': ['reef', 'hive'], 'VOID LEVIATHAN': ['reef', 'void'] };
  const arenas = new Map();
  function arenaFor(ch) {
    const plan = ch && ch.isBossSector && ARENA[ch.bossName];
    if (!plan) return [];
    let list = arenas.get(ch.key);
    if (list) return list;
    const [kind, palette] = plan, n = 10;
    list = Array.from({ length: n }, (_, i) => {
      const a = i * Math.PI * 2 / n + (i % 2) * 0.2, d = 1100 + (i % 3) * 260, alt = ch.bossName === 'VOID LEVIATHAN' && i % 3 === 0;
      return { kind: alt ? 'wreck' : kind, palette, quiet: true, taken: true, x: Math.cos(a) * d, y: -450 + Math.sin(a) * d * 0.8,
        radius: 150 + (i * 37 % 90), spin: (i % 2 ? 1 : -1) * 0.00008, seed: ((i + 1) * 0.6180339887) % 1,
        def: { label: 'ARENA', tint: '#888', weight: 0, r: 160 } };
    });
    arenas.set(ch.key, list); stats.arenas++;
    return list;
  }

  function install() {
    if (!window.modularShips?.ready || typeof EnemyOrganism === 'undefined' || !window.sectorField) { setTimeout(install, 60); return; }
    const update = EnemyOrganism.prototype.update;
    EnemyOrganism.prototype.update = function (...a) { hull(this); return update.apply(this, a); };
    const marks = sectorField.landmarks.bind(sectorField);
    sectorField.landmarks = function (ch) { const list = marks(ch); return ch?.isBossSector ? list.concat(arenaFor(ch)) : list; };
  }
  window.bossHulls = { stats, BUILD };
  if (document.readyState === 'complete') setTimeout(install, 450); else window.addEventListener('load', () => setTimeout(install, 450));
})();
