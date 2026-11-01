/* STRUCTURE ART (Mac, 2026-11-01: "look at the old buildings you can build, it's all old graphics and old use, update
 * them"). hubs.js drew every structure as the first-generation bubble organism: small blobs, smaller than your ship
 * and hard to tell apart. Each kind is now a station built from the accepted modular hull sections (the same art as
 * ships and the guardians), one silhouette per job:
 *   FORWARD DOCK   a cross of hangar decks round a command core, docking arms out on four sides
 *   SALVAGE DRILL  a long boom ending in a drill head
 *   GUN PLATFORM   four battery decks, flak and lance turrets
 *   JUMP BEACON    a cross of spines with relay pods
 *   JUMP GATE      an open ring you fly through
 *   REFINERY       tanks and pipes round a core
 *   WINGMAN HANGAR three hangar decks
 *   DEFENCE GRID   a core with emitter pods on the diagonals
 * Positions, costs, rules, HP and raids stay in hubs.js; this file owns the bodies, their size and a live accent
 * (a slow pulse in each station's colour so it reads as yours). hubs.js falls back to its own bodies until this is ready. */
(() => {
  'use strict';
  const sec = (id, kind, x, y) => ({ id, kind, x, y }), body = {}, size = {}, lights = {};
  const PLAN = {
    dock: { color: '#c9a25c', skin: 'industrial', scale: 0.58, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0));
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.push(sec(`bay${x}${y}`, 'hangar', x, y));
      for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) s.push(sec(`hull${x}${y}`, 'plate', x, y));
      for (const [x, y] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) s.push(sec(`arm${x}${y}`, 'spine', x, y));
      for (const [x, y] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) s.push(sec(`berth${x}${y}`, 'utility', x, y));
    } },
    drill: { color: '#ff8c42', skin: 'industrial', scale: 0.72, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0), sec('a', 'plate', 0, -1), sec('b', 'plate', 0, 1), sec('c', 'plate', -1, 0));
      for (const x of [1, 2]) s.push(sec(`boom${x}`, 'spine', x, 0));
      s.push(sec('head', 'utility', 3, 0));
    } },
    gun: { color: '#5ef2e0', skin: 'swept', scale: 0.74, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0));
      [[1, 0, 'gun-flak-medium'], [-1, 0, 'gun-flak-medium'], [0, 1, 'gun-lance-medium'], [0, -1, 'gun-lance-medium']].forEach(([x, y, gear]) => {
        const id = `bat${x}${y}`; s.push(sec(id, 'battery', x, y)); f.push({ slot: id, gear, mk: 1 });
      });
      for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) s.push(sec(`hull${x}${y}`, 'plate', x, y));
    } },
    beacon: { color: '#bc13fe', skin: 'swept', scale: 0.62, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0));
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.push(sec(`arm${x}${y}`, 'spine', x, y), sec(`relay${x}${y}`, 'utility', x * 2, y * 2));
    } },
    gate: { color: '#ffd36a', skin: 'industrial', scale: 0.62, build: (s, f) => {   // a ring on four spokes; the jump swirl sits on the core
      s.push(sec('core', 'bridge', 0, 0));
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.push(sec(`spoke${x}${y}`, 'spine', x, y));
      for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== 2) continue;
        s.push(sec(`ring${x}${y}`, Math.abs(x) === 2 && Math.abs(y) === 2 ? 'utility' : 'plate', x, y));
      }
    } },
    refinery: { color: '#9fe870', skin: 'industrial', scale: 0.64, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0), sec('tl', 'utility', -1, 0), sec('tr', 'utility', 1, 0), sec('pipe', 'spine', 0, 1),
        sec('tank', 'utility', 0, 2), sec('pl', 'plate', -1, 1), sec('pr', 'plate', 1, 1), sec('stack', 'spine', 0, -1));
    } },
    hangar: { color: '#7fe0ff', skin: 'swept', scale: 0.74, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0), sec('h1', 'hangar', -1, 0), sec('h2', 'hangar', 1, 0), sec('h3', 'hangar', 0, 1),
        sec('pl', 'plate', -1, 1), sec('pr', 'plate', 1, 1), sec('mast', 'spine', 0, -1));
    } },
    grid: { color: '#ff6ad5', skin: 'swept', scale: 0.76, build: (s, f) => {
      s.push(sec('core', 'bridge', 0, 0));
      for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.push(sec(`hull${x}${y}`, 'plate', x, y));
      for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) s.push(sec(`emit${x}${y}`, 'utility', x, y));
    } }
  };
  const stats = { built: 0, failed: [] };

  function compile(kind) {
    const plan = PLAN[kind], s = [], f = [];
    plan.build(s, f);
    const d = modularShips.make('capital');
    d.frame = 'Station'; d.color = plan.color;
    d.modular = { v: 1, hull: 'capital', sections: s, fittings: f, kit: [], livery: { body: '#2c3440', edge: plan.color, skin: plan.skin } };
    const nodes = modularShips.compile(d).design.nodes;
    for (const n of nodes) { n.currentDx = n.targetDx = n.dx; n.currentDy = n.targetDy = n.dy; }
    return nodes;
  }
  function install() {
    if (!window.modularShips?.ready || !window.hubs || typeof fluidShader === 'undefined') { setTimeout(install, 60); return; }
    for (const kind of Object.keys(PLAN)) {
      try {
        const nodes = compile(kind);
        body[kind] = nodes;
        const k = PLAN[kind].scale || 0.7;
        size[kind] = k * Math.max(...nodes.map(n => Math.hypot(n.dx, n.dy) + (n.radius || 20)));
        lights[kind] = nodes.filter(n => Math.hypot(n.dx, n.dy) > size[kind] / k * 0.55).map(n => [n.dx * k, n.dy * k]);
        stats.built++;
      } catch (err) { stats.failed.push(kind + ': ' + err.message); console.warn('[structure-art] kept the old body for', kind, err.message); }
    }
    window.structureArt.ready = true;
  }
  /* Draw one structure at screen (sx, sy). Returns false when hubs.js should draw its old body. */
  function draw(ctx, kind, sx, sy, angle, z, t) {
    const nodes = body[kind]; if (!nodes) return false;
    const R = size[kind], colour = PLAN[kind].color, pulse = 0.5 + 0.5 * Math.sin(t * 0.0021 + R);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';   // a soft pool of the station's colour under it: yours, and alive
    const g = ctx.createRadialGradient(sx, sy, R * 0.2, sx, sy, R * 1.25);
    g.addColorStop(0, hexA(colour, 0.16 + pulse * 0.08)); g.addColorStop(1, hexA(colour, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const k = PLAN[kind].scale || 0.7;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k);
    fluidShader.drawOrganismMembrane(ctx, 0, 0, angle, nodes[0].radius, nodes, colour, {});
    ctx.restore();
    // Running lights on the outer sections, in the station's colour, blinking in a slow wave round the hull.
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle); ctx.globalCompositeOperation = 'lighter';
    const L = lights[kind], r = Math.max(4, 3.2 / (z || 1));
    L.forEach(([x, y], i) => {
      const on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.004 - i * 0.9));
      const l = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      l.addColorStop(0, hexA(colour, 0.9 * on)); l.addColorStop(0.35, hexA(colour, 0.35 * on)); l.addColorStop(1, hexA(colour, 0));
      ctx.fillStyle = l; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    return true;
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  window.structureArt = { ready: false, stats, PLAN, draw, nodes: k => body[k] || null, radius: k => size[k] || 0 };
  if (document.readyState === 'complete') setTimeout(install, 500); else window.addEventListener('load', () => setTimeout(install, 500));
})();
