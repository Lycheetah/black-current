/* FLEET FORMATION (master route Stage 1 · one scale).
 * Native spawning gathers hostiles at landmarks, which stacked capital hulls on top of
 * each other once silhouettes grew. After a sector loads (and after a contact wing
 * arrives) each landmark group forms up: its flagship leads toward the player, escorts
 * fall in behind in a wedge, and a short relaxation pass guarantees no two hulls overlap. */
(() => {
  'use strict';
  let ready = false;
  const GROUP = 1400, GAP = 60, ARRIVAL = 700;
  function radius(e) {
    const m = window.hostileSkins?.model?.(e);
    if (m) return Math.max(m.W, m.H) * 0.5;
    let r = e.coreRadius || 20;
    for (const n of e.nodes || []) r = Math.max(r, Math.hypot(n.currentDx ?? n.dx ?? 0, n.currentDy ?? n.dy ?? 0) + (n.radius || 0));
    return r;
  }
  // Only ordinary fleets move: authored bosses, practice, shoals and broods keep their placement.
  const free = e => e && !e.isBoss && !e.training && !e.jellyShoalKey && !e.swarmBrood && !e.name && !Number.isInteger(e.firstExpeditionGuard);
  function groups(list) {
    const out = [], seen = new Set();
    for (const e of list) {
      if (seen.has(e)) continue;
      const g = [e]; seen.add(e);
      for (let i = 0; i < g.length; i++) for (const o of list) if (!seen.has(o) && Math.hypot(o.x - g[i].x, o.y - g[i].y) < GROUP) { seen.add(o); g.push(o); }
      out.push(g);
    }
    return out;
  }
  function wedge(g, px, py) {
    if (g.length < 2) return;
    g.sort((a, b) => (b.tier || 0) - (a.tier || 0) || radius(b) - radius(a));
    const lead = g[0], rl = radius(lead), a = Math.atan2(py - lead.y, px - lead.x), fx = Math.cos(a), fy = Math.sin(a);
    for (let i = 1; i < g.length; i++) {
      const e = g[i], ri = radius(e), rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1, step = rl + ri + GAP;
      const back = rank * step * 0.75, lateral = side * rank * step * 0.85;
      e.x = lead.x - fx * back - fy * lateral; e.y = lead.y - fy * back + fx * lateral;
      if (e.vx !== undefined) e.vx = e.vy = 0;
    }
  }
  function separate(list, R, player, arrival) {
    for (let pass = 0; pass < 40; pass++) {
      let moved = false;
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j], need = radius(a) + radius(b) + GAP;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= need) continue;
        if (d < 1e-3) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
        const push = need - d, ma = radius(a) ** 2, mb = radius(b) ** 2, sa = mb / (ma + mb), sb = ma / (ma + mb);
        a.x -= dx / d * push * sa; a.y -= dy / d * push * sa; b.x += dx / d * push * sb; b.y += dy / d * push * sb; moved = true;
      }
      for (const e of list) {
        const lim = Math.max(200, R * 0.92 - radius(e)), d = Math.hypot(e.x, e.y);
        if (d > lim) { e.x *= lim / d; e.y *= lim / d; }
        if (arrival && player) {
          const need = radius(e) + arrival, pd = Math.hypot(e.x - player.x, e.y - player.y);
          if (pd < need) { const ux = pd ? (e.x - player.x) / pd : 1, uy = pd ? (e.y - player.y) / pd : 0; e.x = player.x + ux * need; e.y = player.y + uy * need; moved = true; }
        }
      }
      if (!moved) break;
    }
  }
  function form(enemies, { arrival = false } = {}) {
    const ch = window.worldMap?.getCurrentChamber?.(), p = window.engine?.player;
    if (!ch || !p || window.graveChoir?.active) return;
    const list = enemies.filter(free);
    if (list.length < 2 && !arrival) return;
    for (const g of groups(list)) wedge(g, p.x, p.y);
    separate(list, ch.radius || 2600, p, arrival ? ARRIVAL + (window.tuning ? radius(p) : 0) : 0);
  }
  function overlaps(enemies = engine.enemies) {
    const list = enemies.filter(free); let n = 0;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y) < radius(list[i]) + radius(list[j])) n++;
    return n;
  }
  function install() {
    if (!window.combatScaling?.ready || !window.hostileSkins?.ready || !window.contactDirector) { setTimeout(install, 40); return; }
    const load = engine.loadChamberEntities;
    engine.loadChamberEntities = function (...a) { const r = load.apply(this, a); form(this.enemies, { arrival: true }); return r; };
    const spawn = contactDirector.spawn;
    contactDirector.spawn = function (...a) { const before = engine.enemies.length, r = spawn.apply(this, a); if (r && engine.enemies.length > before) form(engine.enemies); return r; };
    ready = true;
  }
  window.fleetFormation = { form, overlaps, radius, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 380));
})();
