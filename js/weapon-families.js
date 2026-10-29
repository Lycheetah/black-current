/* WEAPON FAMILIES (Mac, 2026-10-30: "our weapons and modules need work"). Inside a class the guns had near-identical DPS,
 * so the family was mostly a colour. Each family now has one job, felt in the fight and shown in the shop. The jobs only
 * reach beyond the target (or interrupt it), so single-target damage stays on the arsenal's budget:
 *   kinetic   STAGGER  a hit worth 4%+ of the target's hull shoves it back and breaks a charger's ram or a sniper's lock
 *   rail      PIERCE   every round passes through one more hull
 *   beam      ARC      each hit arcs to the nearest other hostile within reach for 30%
 *   missile   SEEK     missiles lean toward the hostile nearest your aim, and splash 25% around the impact
 *   ordnance  BLAST    each hit throws 40% to every other hostile around the impact
 * Hooks: engine.js calls weaponFamilies.hit(p, e, damage) on every player hit; shots are tagged as they are fired. */
(() => {
  'use strict';
  const CFG = {
    stagger: { share: 0.04, push: 5 },
    pierce: 1,
    arc: { reach: 220, share: 0.30 },
    seek: { steer: 0.05, splash: 80, share: 0.25 },
    blast: { radius: 120, share: 0.40 }
  };
  const JOBS = {
    kinetic: { name: 'Stagger', line: 'Heavy hits shove the target and break a ram or a sniper lock' },
    rail: { name: 'Pierce', line: 'Every round passes through one more hull' },
    beam: { name: 'Arc', line: 'Each hit arcs to a nearby second hostile for 30%' },
    missile: { name: 'Seek', line: 'Leans toward your target and splashes 25% around the impact' },
    ordnance: { name: 'Blast', line: 'Each hit throws 40% to every hostile around the impact' }
  };
  let ready = false, stats = { stagger: 0, arc: 0, splash: 0, blast: 0 }, inSplash = false;
  const doomed = new Set();
  function sweep() { if (!doomed.size) return; for (const e of doomed) { const j = engine.enemies.indexOf(e); if (j >= 0 && e.hp <= 0) engine.killEnemy(j); } doomed.clear(); }
  const familyOf = type => window.arsenal?.GUNS?.[type]?.family || null;
  // damage that spills to other hulls; it does not trigger further jobs, and kills go through the engine as usual
  function spill(from, e0, radius, amount, kind, limit = 99) {
    if (amount <= 0) return 0; let n = 0;
    inSplash = true;
    try {
      const list = engine.enemies.filter(e => e !== e0 && e.hp > 0 && !e.training && Math.hypot(e.x - from.x, e.y - from.y) < radius + (e.coreRadius || 20))
        .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y)).slice(0, limit);
      // kills are deferred to after the engine tick: killing here would shift the enemy list the hit loop is walking
      for (const e of list) { e.takeDamage(amount); e._hitAt = performance.now(); n++; if (e.hp <= 0) doomed.add(e); }
    } finally { inSplash = false; }
    stats[kind] += n; return n;
  }
  function hit(p, e, damage) {
    if (inSplash || !p?.isPlayer || p.splitShard) return;
    const fam = p.family || familyOf(p.type);
    if (fam === 'kinetic') {
      if (damage >= (e.maxHp || 1) * CFG.stagger.share && !e.isBoss) {
        const a = Math.atan2(p.vy, p.vx); e.vx = (e.vx || 0) + Math.cos(a) * CFG.stagger.push; e.vy = (e.vy || 0) + Math.sin(a) * CFG.stagger.push;
        if (e.chargeT) e.chargeT = 0; if (e.aimT) e.aimT = 0; e._staggered = performance.now(); stats.stagger++;
      }
    } else if (fam === 'beam') {
      const n = spill(e, e, CFG.arc.reach, damage * CFG.arc.share, 'arc', 1);
      if (n) { const t = engine.enemies.find(x => x !== e && x._hitAt && performance.now() - x._hitAt < 5); if (t) arcs.push({ x1: e.x, y1: e.y, x2: t.x, y2: t.y, t: 6, color: p.color }); }
    } else if (fam === 'missile') spill(p, e, CFG.seek.splash, damage * CFG.seek.share, 'splash');
    else if (fam === 'ordnance') { spill(p, e, CFG.blast.radius, damage * CFG.blast.share, 'blast'); rings.push({ x: p.x, y: p.y, r: CFG.blast.radius, t: 8 }); }
  }
  // fire-time tagging: rail pierce, missile seek target
  function fired(w, from) {
    const fam = familyOf(w); if (!fam) return;
    const made = engine.projectiles.slice(from).filter(q => q.isPlayer && !q.family);
    let target = null;
    if (fam === 'missile') { const P = engine.player, ax = engine.input?.aimX ?? P.x, ay = engine.input?.aimY ?? P.y; let bd = Infinity; for (const e of engine.enemies) { if (e.hp <= 0 || e.training) continue; const d = Math.hypot(e.x - ax, e.y - ay); if (d < bd) { bd = d; target = e; } } }
    for (const q of made) { q.family = fam; if (fam === 'rail') q.pierce = (q.pierce || 1) + CFG.pierce; if (fam === 'missile' && target && !q._modHoming) q._seek = target; }
  }
  function steer() {
    for (const q of engine.projectiles) { const t = q._seek; if (!t || t.hp <= 0) continue; const dx = t.x - q.x, dy = t.y - q.y, d = Math.hypot(dx, dy), sp = Math.hypot(q.vx, q.vy); if (d > 0) { q.vx += (dx / d * sp - q.vx) * CFG.seek.steer; q.vy += (dy / d * sp - q.vy) * CFG.seek.steer; } }
    for (let i = arcs.length - 1; i >= 0; i--) if (--arcs[i].t <= 0) arcs.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) if (--rings[i].t <= 0) rings.splice(i, 1);
  }
  const arcs = [], rings = [];
  function draw(ctx, cam) {
    if (!arcs.length && !rings.length) return; const z = cam.zoom || 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of arcs) { ctx.globalAlpha = a.t / 6; ctx.strokeStyle = a.color || '#c4abff'; ctx.lineWidth = 2.5 / z; ctx.beginPath(); const mx = (a.x1 + a.x2) / 2 + (Math.random() - 0.5) * 30, my = (a.y1 + a.y2) / 2 + (Math.random() - 0.5) * 30; ctx.moveTo(a.x1 - cam.x, a.y1 - cam.y); ctx.lineTo(mx - cam.x, my - cam.y); ctx.lineTo(a.x2 - cam.x, a.y2 - cam.y); ctx.stroke(); }
    for (const r of rings) { ctx.globalAlpha = r.t / 8 * 0.6; ctx.strokeStyle = '#ff9e76'; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.arc(r.x - cam.x, r.y - cam.y, r.r * (1.1 - r.t / 16), 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function install() {
    if (!window.arsenal?.GUNS || typeof engine === 'undefined' || !engine.fireMountGroup || typeof particleSystem === 'undefined') { setTimeout(install, 60); return; }
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, ...a) { const n0 = this.projectiles.length, r = fire.call(this, w, mounts, ...a); try { fired(w, n0); } catch (e) { } return r; };
    const update = engine.update; engine.update = function (...a) { if (!this.paused) try { steer(); } catch (e) { } const r = update.apply(this, a); try { sweep(); } catch (e) { } return r; };
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, cam) => { paint(ctx, cam); try { draw(ctx, cam); } catch (e) { } };
    // the shop and codex read WEAPON_TYPES blurbs: each gun names its family's job
    for (const [w, def] of Object.entries(WEAPON_TYPES)) { const J = JOBS[familyOf(w)]; if (J && def.blurb && !def.blurb.includes(J.name + ':')) def.blurb += ` ${J.name}: ${J.line.toLowerCase()}.`; }
    ready = true;
  }
  window.weaponFamilies = { CFG, JOBS, hit, familyOf, stats, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 340));
})();
