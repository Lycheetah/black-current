/* ACTIVES (Route 4 item 3; Mac, 2026-10-30: "I think we may need actives to make this game fun"). EVE-style active modules:
 * buttons you press in a fight, each on its own cooldown, scaled in percentages so they matter from frigate to titan.
 *   G  Afterburner      built into every ship: +80% thrust (and so top speed) for 5 s · 18 s
 *   H/J/K  up to three fitted active modules, in fitting order (utility slots, bought in the equipment shop):
 *      Shield booster   a burst of shield worth 60% of the pool, at least 20% of hull · 22 s
 *      Hull repairer    repairs 20% of hull over 5 s · 30 s
 *      EMP burst        clears enemy shots near you, stuns hulls in reach for 2.5 s and burns 4% of their hull · 32 s
 *      Overload         guns hit 35% harder and cycle 25% faster for 6 s · 36 s
 * Keys: one free row, G H J K (Z autopilot, X structures, C/R/F captain talents and V cruise keep theirs; H's guardian
 * rehearsal moved behind ?dev). The Space/Q membrane ability is unchanged. Phone: the same buttons, on screen. */
(() => {
  'use strict';
  const DEFS = {
    afterburner: { name: 'Afterburner', glyph: '»', cd: 18 * 60, dur: 5 * 60, color: '#ffb36b', line: '+80% thrust and top speed for 5 s' },
    booster: { name: 'Shield booster', glyph: '◈', cd: 22 * 60, dur: 0, color: '#7fe0ff', line: 'A burst of shield: 60% of your pool, at least 20% of hull', cost: 260, power: 2 },
    repairer: { name: 'Hull repairer', glyph: '✚', cd: 30 * 60, dur: 5 * 60, color: '#9fe870', line: 'Repairs 20% of hull over 5 s', cost: 300, power: 2 },
    emp: { name: 'EMP burst', glyph: '✺', cd: 32 * 60, dur: 0, color: '#c4abff', line: 'Clears enemy shots near you, stuns hulls in reach for 2.5 s and burns 4% of their hull', cost: 420, power: 3 },
    overload: { name: 'Overload', glyph: '⚡', cd: 36 * 60, dur: 6 * 60, color: '#ff6a3d', line: 'Guns hit 35% harder and cycle 25% faster for 6 s', cost: 520, power: 3 }
  };
  const KEYS = ['KeyG', 'KeyH', 'KeyJ', 'KeyK'], LABEL = ['G', 'H', 'J', 'K'];
  const gearId = id => 'active-' + id;
  let ready = false, frame = 0, bar = null;
  const state = {};   // id → { readyAt, until }
  const stats = { fired: {} };
  const M = () => window.modularShips;
  // the bar: the built-in afterburner, then the fitted active modules in fitting order (at most three)
  function slots() {
    const fitted = (saveState.doc.design?.modular?.fittings || []).map(f => M()?.GEARS?.[f.gear]?.active).filter(Boolean);
    return ['afterburner', ...[...new Set(fitted)].slice(0, 3)];
  }
  const s = id => state[id] || (state[id] = { readyAt: 0, until: 0 });
  const on = id => s(id).until > frame;
  function fire(id) {
    const P = engine.player, D = DEFS[id];
    if (!D || engine.paused || engine.mapOpen || P.dead || s(id).readyAt > frame || !slots().includes(id)) return false;
    s(id).readyAt = frame + D.cd; s(id).until = frame + D.dur;
    stats.fired[id] = (stats.fired[id] || 0) + 1;
    if (id === 'booster') { const pool = P.maxShield || 0; P.shieldHp = (P.shieldHp || 0) + Math.max(pool * 0.6, P.maxHp * 0.2); }
    else if (id === 'emp') {
      const R = 300 + (P.coreRadius || 20) * 3;
      for (let i = engine.projectiles.length - 1; i >= 0; i--) { const q = engine.projectiles[i]; if (!q.isPlayer && Math.hypot(q.x - P.x, q.y - P.y) < R) engine.projectiles.splice(i, 1); }
      for (const e of engine.enemies) if (!e.training && Math.hypot(e.x - P.x, e.y - P.y) < R + (e.coreRadius || 20)) { e._stunUntil = frame + 150; if (!e.isBoss) e.takeDamage((e.maxHp || 100) * 0.04); e._hitAt = performance.now(); }
      particleSystem.particles.push(new Particle(P.x, P.y, { vx: 1e-4, vy: 1e-4, type: 'ring', radius: 40, maxRadius: R, color: D.color, decay: 0.03 }));
    }
    particleSystem.spawnBubbleBurst(P.x, P.y, D.color, 14);
    if (typeof soundEngine !== 'undefined') soundEngine.playAbility?.(id === 'afterburner' ? 'dash' : id === 'emp' ? 'emp' : 'shield');
    paint(); return true;
  }
  function tick() {
    frame++;
    const P = engine.player;
    if (on('repairer') && !P.dead) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.2 / DEFS.repairer.dur);
    if (on('afterburner') && frame % 3 === 0 && !P.dead) particleSystem.particles.push(new Particle(P.x - Math.cos(P.angle) * (P.coreRadius || 20), P.y - Math.sin(P.angle) * (P.coreRadius || 20), { vx: -Math.cos(P.angle) * 3, vy: -Math.sin(P.angle) * 3, radius: 4 + Math.random() * 4, color: DEFS.afterburner.color, alpha: 0.8, decay: 0.05, type: 'trail' }));
    if (frame % 10 === 0) paint();
  }
  // the HUD bar: one button per slot with its key, glyph and a cooldown sweep
  function paint() {
    if (!bar) return;
    const ids = slots(), mobile = document.documentElement.classList.contains('mobile-layout');
    if (bar.dataset.ids !== ids.join()) {
      bar.dataset.ids = ids.join(); bar.replaceChildren();
      ids.forEach((id, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'active-btn'; b.dataset.active = id; b.style.setProperty('--c', DEFS[id].color);
        b.title = `${DEFS[id].name} (${LABEL[i]}): ${DEFS[id].line}`; b.setAttribute('aria-label', `${DEFS[id].name}, key ${LABEL[i]}`);
        b.innerHTML = `<span class="active-glyph"></span><span class="active-key"></span><span class="active-cd"></span>`;
        b.querySelector('.active-glyph').textContent = DEFS[id].glyph; b.querySelector('.active-key').textContent = LABEL[i];
        b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fire(id); });
        bar.append(b);
      });
    }
    for (const b of bar.children) {
      const st = s(b.dataset.active), D = DEFS[b.dataset.active], left = Math.max(0, st.readyAt - frame);
      b.classList.toggle('on', st.until > frame); b.classList.toggle('cooling', left > 0);
      b.querySelector('.active-cd').style.height = (left / D.cd * 100).toFixed(1) + '%';
      b.querySelector('.active-key').hidden = mobile;
    }
  }
  function addGear() {
    const G = M()?.GEARS; if (!G) return;
    for (const [id, D] of Object.entries(DEFS)) {
      if (!D.cost || G[gearId(id)]) continue;
      G[gearId(id)] = { name: D.name, type: 'pod', radius: 9, power: D.power, cost: D.cost, kind: 'utility', active: id, description: `Active module (H, J or K; a button on phone). ${D.line}. Cooldown ${D.cd / 60} s.` };
    }
  }
  function install() {
    if (typeof engine === 'undefined' || !M()?.GEARS || !window.hardpoints || typeof EnemyOrganism === 'undefined' || !window.saveState) { setTimeout(install, 50); return; }
    addGear();
    const coreMod = engine.coreMod.bind(engine); engine.coreMod = stat => coreMod(stat) * (stat === 'thrust' && on('afterburner') ? 1.8 : 1);
    const scale = hardpoints.damageScale.bind(hardpoints); hardpoints.damageScale = p => scale(p) * (p === engine.player && on('overload') ? 1.35 : 1);
    const interval = hardpoints._intervalFor.bind(hardpoints); hardpoints._intervalFor = (p, t) => { const v = interval(p, t); return p === engine.player && on('overload') ? Math.max(1, Math.round(v * 0.75)) : v; };
    // a stunned hull drifts: no steering, no fire
    const update = EnemyOrganism.prototype.update; EnemyOrganism.prototype.update = function (...a) {
      if (this._stunUntil > frame) { this.vx *= 0.94; this.vy *= 0.94; this.x += this.vx; this.y += this.vy; return; }
      return update.apply(this, a);
    };
    const step = engine.update; engine.update = function (...a) { const r = step.apply(this, a); if (!this.paused && !this.mapOpen) try { tick(); } catch (e) { } return r; };
    window.addEventListener('keydown', e => {
      if (e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) return;
      const i = KEYS.indexOf(e.code); if (i < 0) return; const id = slots()[i]; if (id && fire(id)) e.preventDefault();
    });
    bar = document.createElement('div'); bar.id = 'active-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Active modules');
    document.body.append(bar); paint();
    ready = true;
  }
  if (window.modularShips?.GEARS) addGear(); else window.addEventListener('DOMContentLoaded', addGear);
  window.actives = { DEFS, fire, slots, on, stats, gearId, get ready() { return ready; }, get frame() { return frame; } };
  window.addEventListener('load', () => setTimeout(install, 380));
})();
