/* TRADE LANES (Mac, 2026-11-01: "with the large world it sometimes feels so much more dead and less purposed than just
 * blasting … NPC trade routes, a purposeful thing"). Until now every ship in space was hostile, so the only thing to
 * do was shoot. Now there is traffic with a reason to be there:
 *   LANES     each station system (the hubs and home) is joined to its two nearest stations along the jump links. The
 *             chart draws them in trade green.
 *   CONVOYS   in a system on a lane, a freighter and two escorts cross your sector now and then, edge to edge, on
 *             their way to the next station. They are neutral: nobody shoots them unless you do.
 *   ESCORT    stay near a convoy. Sometimes pirates jump it and tear into the freighter; kill them and it pays. If
 *             nothing comes, it pays when it leaves the sector with you alongside.
 *   RAID      shoot the freighter and the escorts turn on you. Break it and its cargo is yours, but the lanes
 *             remember (saveState.doc.trade.heat; Wardens, plan item 11, will read it).
 * Convoys exist only while you can see them (no simulation of the whole galaxy), and never in boss sectors or zones.
 * Dials: tradeLanes.CFG. */
(() => {
  'use strict';
  const CFG = { first: [900, 1500], every: [3600, 6600], crossSeconds: 75, pay: [70, 26], cargo: [90, 40], ambush: 0.55,
    ambushAfter: [480, 840], escortRange: 2400, pirateReach: 700, colour: '#e8dcb0' };
  const TAU = Math.PI * 2, rnd = ([a, b]) => a + Math.random() * (b - a);
  const sec = (id, kind, x, y) => ({ id, kind, x, y });
  let lanes = null, laneSystems = new Set(), convoy = null, timer = 0, bodies = null, roomKey = '';
  const doc = () => saveState.doc.trade || (saveState.doc.trade = { heat: 0, escorts: 0, raids: 0, lost: 0 });
  const banner = (t, tone) => window.garage?.banner(t, tone || 'good');

  /* ── lanes ───────────────────────────────────────────────────────────── */
  function bfs(from, to) {
    const D = galaxy.data, prev = { [from]: null }, q = [from];
    while (q.length) { const id = q.shift(); if (id === to) break; for (const n of D.byId[id].links) if (!(n in prev)) { prev[n] = id; q.push(n); } }
    if (!(to in prev)) return null;
    const path = []; for (let id = to; id; id = prev[id]) path.unshift(id); return path;
  }
  function buildLanes() {
    const D = galaxy.data, hubs = D.systems.filter(s => s.hub || s.home), edges = new Map();
    for (const a of hubs) {
      const near = hubs.filter(b => b !== a).map(b => ({ b, p: bfs(a.id, b.id) })).filter(x => x.p).sort((x, y) => x.p.length - y.p.length).slice(0, 2);
      for (const { p } of near) for (let i = 1; i < p.length; i++) { const k = [p[i - 1], p[i]].sort().join('|'); edges.set(k, [p[i - 1], p[i]]); laneSystems.add(p[i - 1]); laneSystems.add(p[i]); }
    }
    lanes = [...edges.values()];
  }

  /* ── bodies: a hauler and its escorts, built from the accepted hull sections ── */
  function compile(sections, fittings, hull, edge) {
    const d = modularShips.make(hull); d.frame = 'Convoy'; d.color = edge;
    d.modular = { v: 1, hull, sections, fittings, kit: [], livery: { body: '#3a3a36', edge, skin: 'industrial' } };
    const nodes = modularShips.compile(d).design.nodes;
    for (const n of nodes) { n.currentDx = n.targetDx = n.dx; n.currentDy = n.targetDy = n.dy; }
    return nodes;
  }
  function makeBodies() {
    const s = [sec('core', 'bridge', 0, 0), sec('nose', 'plate', 1, 0)], f = [];
    for (let x = -1; x >= -4; x--) { s.push(sec(`keel${x}`, 'spine', x, 0)); for (const y of [-1, 1]) s.push(sec(`pod${x}${y}`, 'utility', x, y)); }
    for (const y of [-1, 0, 1]) { s.push(sec(`drive${y}`, 'drive', -5, y)); f.push({ slot: `drive${y}`, gear: 'engine', mk: 1 }); }
    const escort = [sec('core', 'bridge', 0, 0), sec('gun', 'deck', 1, 0), sec('wl', 'plate', 0, -1), sec('wr', 'plate', 0, 1), sec('drive', 'drive', -1, 0)];
    bodies = {
      hauler: compile(s, f, 'capital', CFG.colour),
      escort: compile(escort, [{ slot: 'drive', gear: 'engine', mk: 1 }], 'cruiser', CFG.colour)
    };
    bodies.haulerR = Math.max(...bodies.hauler.map(n => Math.hypot(n.dx, n.dy) + (n.radius || 20)));
  }

  /* ── convoys ─────────────────────────────────────────────────────────── */
  function eligible() {
    const ch = worldMap.getCurrentChamber();
    if (!ch || ch.isBossSector || !saveState.doc.launched || engine.player.dead) return false;
    if (window.graveChoir?.active || window.hunt?.inZone?.() || window.frontierPve?.isRange?.() || window.bossScenes?.rehearsing) return false;
    return laneSystems.has(window.galaxy?.currentId || 'home');
  }
  const here = () => { const ch = worldMap.getCurrentChamber(); return (window.galaxy?.currentId || 'home') + ':' + ch?.gridX + ',' + ch?.gridY; };
  function spawn() {
    roomKey = here();
    const ch = worldMap.getCurrentChamber(), R = (ch.radius || 5000) * 0.92, a = Math.random() * TAU, b = a + Math.PI + (Math.random() - 0.5) * 0.9;
    const from = { x: Math.cos(a) * R, y: Math.sin(a) * R }, to = { x: Math.cos(b) * R * 1.12, y: Math.sin(b) * R * 1.12 };
    const dist = Math.hypot(to.x - from.x, to.y - from.y), speed = dist / (CFG.crossSeconds * 60), angle = Math.atan2(to.y - from.y, to.x - from.x);
    const d = Math.max(1, ch.dangerLevel || 1);
    convoy = { x: from.x, y: from.y, to, angle, speed, hp: 900 + d * 180, maxHp: 900 + d * 180, danger: d, hostile: false, near: 0, frames: 0,
      ambushAt: Math.random() < CFG.ambush ? rnd(CFG.ambushAfter) : Infinity, pirates: null, paid: false, hitAt: 0,
      escorts: [-1, 1].map(side => ({ side, x: from.x, y: from.y, angle })) };
    const dir = compass(from.x, from.y);
    banner(`CONVOY INBOUND FROM THE ${dir} · escort it for pay`, 'good');
  }
  const compass = (x, y) => { const a = Math.atan2(y, x), k = Math.round(a / (Math.PI / 4) + 8) % 8; return ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'][k]; };

  function step() {
    if (!bodies || engine.paused) return;
    const key = here();
    if (key !== roomKey) { roomKey = key; convoy = null; timer = rnd(CFG.first); }
    if (!convoy) { if (eligible() && --timer <= 0) { spawn(); timer = rnd(CFG.every); } return; }
    const c = convoy, P = engine.player;
    c.frames++;
    c.x += Math.cos(c.angle) * c.speed; c.y += Math.sin(c.angle) * c.speed;
    c.escorts.forEach((e, i) => {   // escorts hold formation off the hauler's flanks, or come for you if you fired
      if (e.live === false) return;
      const tx = c.x + Math.cos(c.angle + e.side * 1.9) * 260, ty = c.y + Math.sin(c.angle + e.side * 1.9) * 260;
      e.x += (tx - e.x) * 0.05; e.y += (ty - e.y) * 0.05; e.angle = c.angle;
    });
    const near = Math.hypot(P.x - c.x, P.y - c.y) < CFG.escortRange;
    if (near) c.near++;
    if (!c.hostile && near && c.near === 1) banner('CONVOY HAILS · stay with us to the edge of the sector', 'good');
    // ambush: pirates jump the hauler while you are escorting it
    if (!c.hostile && !c.pirates && c.frames >= c.ambushAt && c.near > 60) ambush(c);
    if (c.pirates) {
      const live = c.pirates.filter(e => engine.enemies.includes(e) && !e.dead);
      for (const e of live) if (Math.hypot(e.x - c.x, e.y - c.y) < CFG.pirateReach) hurt(c, (0.1 + 0.025 * c.danger) * (e.elite ? 2 : 1));
      if (!live.length && !c.paid && c.hp > 0) { c.paid = true; pay(c, 'CONVOY SAFE'); }
    }
    // your shots hit the hauler (a raid)
    for (let i = engine.projectiles.length - 1; i >= 0; i--) {
      const p = engine.projectiles[i]; if (!p.isPlayer) continue;
      if (Math.hypot(p.x - c.x, p.y - c.y) < bodies.haulerR * 0.7) { engine.projectiles.splice(i, 1); if (!c.hostile) raid(c); hurt(c, p.damage || 10); }
    }
    if (c.hp <= 0) return wreck(c);
    if (Math.hypot(c.x, c.y) > Math.hypot(c.to.x, c.to.y) * 0.98 || c.frames > CFG.crossSeconds * 60 * 1.6) {
      if (!c.hostile && !c.paid && !c.pirates && c.near > c.frames * 0.4 && Math.hypot(P.x - c.x, P.y - c.y) < CFG.escortRange * 1.4) pay(c, 'CONVOY THROUGH');
      convoy = null;
    }
  }
  function hurt(c, n) {
    c.hp -= n;
    if (performance.now() - c.hitAt > 140) { c.hitAt = performance.now(); particleSystem.spawnBubbleBurst?.(c.x + (Math.random() - 0.5) * 160, c.y + (Math.random() - 0.5) * 120, '#ffb36b', 4); }
  }
  function ambush(c) {
    const n = 2 + Math.min(3, Math.floor(c.danger / 3)), a = c.angle + (Math.random() < 0.5 ? 1 : -1) * 1.2, cx = c.x + Math.cos(a) * 900, cy = c.y + Math.sin(a) * 900;
    c.pirates = [];
    for (let i = 0; i < n; i++) {
      const e = new EnemyOrganism(cx + (Math.random() - 0.5) * 220, cy + (Math.random() - 0.5) * 220, { tier: c.danger, archetype: ['charger', 'stalker', 'sniper'][i % 3] });
      e.hunting = true; engine.enemies.push(e); c.pirates.push(e);
      particleSystem.spawnBubbleBurst(e.x, e.y, e.color, 10);
    }
    banner('PIRATES ON THE CONVOY · break them before they break it', 'hunt');
  }
  function raid(c) {
    c.hostile = true; doc().heat++; doc().raids++; saveState.save();
    for (const e of c.escorts) {   // the escorts become real fighters at their posts
      const f = new EnemyOrganism(e.x, e.y, { tier: c.danger + 1, archetype: 'stalker' }); f.hunting = true; engine.enemies.push(f); e.live = false;
      particleSystem.spawnBubbleBurst(e.x, e.y, CFG.colour, 12);
    }
    banner('YOU FIRED ON A CONVOY · its escorts engage. The lanes will remember.', 'bad');
  }
  function pay(c, label) {
    const metal = Math.round(CFG.pay[0] + CFG.pay[1] * c.danger);
    hubs.metal += metal; doc().escorts++; saveState.save();
    banner(`${label} · +${metal} metal`, 'good');
    (typeof soundEngine !== 'undefined') && soundEngine.playPhrase([523.25, 659.25, 783.99], 0.06);
    window.walletHUD?.paint?.();
  }
  function wreck(c) {
    const P = engine.player;
    for (let i = 0; i < 4; i++) particleSystem.spawnBubbleBurst(c.x + (Math.random() - 0.5) * 260, c.y + (Math.random() - 0.5) * 160, i % 2 ? '#ffb36b' : CFG.colour, 18);
    engine.addShake?.(10);
    if (c.hostile && !P.dead) {
      const metal = Math.round(CFG.cargo[0] + CFG.cargo[1] * c.danger); hubs.metal += metal; saveState.save();
      banner(`CARGO TAKEN · +${metal} metal`, 'hunt'); window.walletHUD?.paint?.();
    } else { doc().lost++; saveState.save(); banner('CONVOY LOST', 'bad'); }
    convoy = null;
  }

  /* ── drawing ─────────────────────────────────────────────────────────── */
  function draw(ctx, camera) {
    if (!convoy || !bodies) return;
    const c = convoy, z = camera.zoom || 1, t = performance.now();
    const ship = (nodes, x, y, angle) => fluidShader.drawOrganismMembrane(ctx, x - camera.x, y - camera.y, angle, nodes[0].radius, nodes, CFG.colour, { thrusting: true });
    for (const e of c.escorts) if (e.live !== false) ship(bodies.escort, e.x, e.y, e.angle);
    ship(bodies.hauler, c.x, c.y, c.angle);
    // running lights: amber on the hauler's beam, so it reads as civilian traffic, not a target
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const on = 0.5 + 0.5 * Math.sin(t * 0.005), sx = c.x - camera.x, sy = c.y - camera.y;
    for (const side of [-1, 1]) {
      const x = sx + Math.cos(c.angle + side * Math.PI / 2) * 70 - Math.cos(c.angle) * 120, y = sy + Math.sin(c.angle + side * Math.PI / 2) * 70 - Math.sin(c.angle) * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, `rgba(255,214,140,${0.8 * on})`); g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(11 / z)}px "Space Grotesk", monospace`;
    ctx.fillStyle = c.hostile ? '#ff6a7a' : '#e8dcb0';
    const top = sy - bodies.haulerR * 0.62 - 12 / z;
    ctx.fillText(c.hostile ? 'CONVOY · HOSTILE' : c.pirates && !c.paid ? 'CONVOY · UNDER ATTACK' : 'CONVOY', sx, top);
    if (c.hp < c.maxHp) { const w = 130, k = Math.max(0, c.hp / c.maxHp); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(sx - w / 2, top + 4 / z, w, 6); ctx.fillStyle = k > 0.35 ? '#e8dcb0' : '#ff3366'; ctx.fillRect(sx - w / 2, top + 4 / z, w * k, 6); }
    ctx.restore();
  }
  // The chart: trade lanes in green between known systems.
  function drawChart(ctx, P, visited, t) {
    if (!lanes) return;
    ctx.save(); ctx.strokeStyle = 'rgba(159,232,112,.9)'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 0.01;
    for (const [a, b] of lanes) {
      if (!(visited.includes(a) || visited.includes(b))) continue;
      const [ax, ay] = P(galaxy.data.byId[a]), [bx, by] = P(galaxy.data.byId[b]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.restore();
  }

  function install() {
    if (!window.galaxy?.data || !window.modularShips?.ready || !window.hubs || !window.sectorField?.drawField || typeof EnemyOrganism === 'undefined' || !window.engine?.update) { setTimeout(install, 80); return; }
    buildLanes();
    try { makeBodies(); } catch (e) { console.warn('[trade-lanes] no convoy bodies:', e.message); return; }
    const update = engine.update;
    engine.update = function (...a) { const r = update.apply(this, a); try { step(); } catch (e) { console.warn('[trade-lanes]', e.message); convoy = null; } return r; };
    const field = sectorField.drawField;
    sectorField.drawField = function (ctx, camera) { field.call(this, ctx, camera); try { draw(ctx, camera); } catch (e) { console.warn('[trade-lanes] draw', e.message); } };
    window.tradeLanes.ready = true;
  }
  window.tradeLanes = { ready: false, CFG, drawChart, get lanes() { return lanes; }, get systems() { return laneSystems; }, get convoy() { return convoy; },
    spawn() { spawn(); return convoy; }, doc };
  if (document.readyState === 'complete') setTimeout(install, 600); else window.addEventListener('load', () => setTimeout(install, 600));
})();
