/* ==========================================================================
   B7 · THE HUNT. Mac, 2026-10-23: "its boring asf".
   MEASURED cause: the player's top speed is 18 px/frame; enemies topped out
   near 5-14 and their shots flew at 8-9, so nothing could reach you, and a
   cleared sector stayed dead forever. ai.js now paces enemies off the movement
   dial (enemyPace). This file adds the reasons to fight:
     CHAIN    kills inside 2.8 s chain; x3+ spills gold mass; x8 = OVERDRIVE (guns hot)
     WINGS    a hostile wing warps in every ~45-75 s, cleared sectors included
     OUTPOSTS one pirate outpost per non-home sector; break it for a loot fountain
     ELITES   gold-ringed heavies: 2.4x hull, double loot, a guaranteed part
   Seam: wraps engine instance methods exactly like gravechoir.js. Wings,
   outposts and elites stay out of the Grave Choir; the chain works everywhere.
   ========================================================================== */
(() => {
  const CHAIN_MS = 2800, OVERDRIVE_AT = 8, GOLD = '#e8c478', RUST = '#ff8c42';

  const hunt = window.hunt = {
    chain: 0, best: 0, lastKill: 0, overdrive: false, wing: null, wingT: 2100,
    inZone() { return typeof graveChoir !== 'undefined' && graveChoir.active; },
    spawnWing() { spawnWing(worldMap.getCurrentChamber()); },
  };

  /* ── chain UI ─────────────────────────────────────────────────────────── */
  const ui = document.createElement('div');
  ui.id = 'hunt-chain';
  ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = '<b class="hc-n">x0</b><span class="hc-l">CHAIN</span><i class="hc-bar"><i></i></i>';
  document.body.appendChild(ui);
  const nEl = ui.querySelector('.hc-n'), lEl = ui.querySelector('.hc-l'), barEl = ui.querySelector('.hc-bar > i');
  let shown = false;

  function banner(t) { if (window.garage) garage.banner(t, 'hunt'); }

  function paintChain(punch) {
    const left = CHAIN_MS - (performance.now() - hunt.lastKill);
    if (left <= 0 && hunt.chain) hunt.chain = 0;
    const live = hunt.chain >= 2;
    const od = live && hunt.chain >= OVERDRIVE_AT;
    if (od !== hunt.overdrive) {
      hunt.overdrive = od;
      document.body.classList.toggle('hunt-overdrive', od);
      lEl.textContent = od ? 'OVERDRIVE' : 'CHAIN';
    }
    if (live !== shown) { shown = live; ui.classList.toggle('on', live); }
    if (!live) return;
    barEl.style.transform = `scaleX(${Math.max(0, left / CHAIN_MS)})`;
    if (punch) {
      nEl.textContent = 'x' + hunt.chain;
      ui.classList.remove('punch'); void ui.offsetWidth; ui.classList.add('punch');
    }
  }

  function spill(x, y, n, mass, color) {
    if (typeof BubbleDrop === 'undefined') return;
    for (let i = 0; i < n; i++) {
      progression.bubbleDrops.push(new BubbleDrop(x + (Math.random() - 0.5) * 70, y + (Math.random() - 0.5) * 70, mass, color));
    }
  }

  function onKill(e) {
    const now = performance.now();
    hunt.chain = now - hunt.lastKill < CHAIN_MS ? hunt.chain + 1 : 1;
    hunt.lastKill = now;
    hunt.best = Math.max(hunt.best, hunt.chain);
    if (hunt.chain >= 3) spill(e.x, e.y, Math.min(6, Math.floor(hunt.chain / 2)), 3 + (e.tier || 1) * 2, GOLD);
    if (hunt.chain === OVERDRIVE_AT) { banner('OVERDRIVE · CHAIN x8 · GUNS HOT'); soundEngine.playAbility('emp'); }
    else if (hunt.chain > OVERDRIVE_AT && hunt.chain % 10 === 0) banner(`CHAIN x${hunt.chain}`);
    paintChain(true);
  }

  function makeElite(e) {
    e.elite = true;
    e.maxHp = Math.round(e.maxHp * 2.4); e.hp = e.maxHp;
    e.shield += 40; e.maxShield = e.shield;
  }

  function breakOutpost(e) {
    progression.spawnDropsFromEnemy(e); progression.spawnDropsFromEnemy(e);
    spill(e.x, e.y, 8, 10, GOLD);
    for (let i = 0; i < 3; i++) {
      progression.spawnSalvage(e.x + Math.cos(i * 2.1) * 50, e.y + Math.sin(i * 2.1) * 50, { part: { type: 'cannon', radius: 14 } });
    }
    if (Math.random() < 0.35) progression.spawnSalvage(e.x, e.y - 40, { core: true });
    particleSystem.spawnBubbleBurst(e.x, e.y, RUST, 40);
    particleSystem.particles.push(new Particle(e.x, e.y, { vx: 1e-4, vy: 1e-4, type: 'ring',
      radius: 40, maxRadius: 420, color: RUST, decay: 0.025 }));
    engine.addShake(JUICE.shakeMax);
    banner('PIRATE OUTPOST BROKEN · SALVAGE SPILLED');
  }

  function placeOutpost(ch) {
    const R = ch.radius || 2600;
    const marks = sectorField.landmarks(ch);
    const m = marks.find(k => k.kind === 'wreck' || k.kind === 'beacon') || marks[0];
    let x = R * 0.5, y = 0;
    if (m) {
      const a = Math.atan2(m.y, m.x);
      x = m.x + Math.cos(a) * m.radius * 2.2; y = m.y + Math.sin(a) * m.radius * 2.2;
    }
    const r = Math.hypot(x, y);
    if (r > R * 0.84) { x *= R * 0.84 / r; y *= R * 0.84 / r; }
    engine.enemies.push(new EnemyOrganism(x, y, { archetype: 'outpost', tier: Math.max(1, ch.dangerLevel || 1) }));
  }

  const COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

  function spawnWing(ch) {
    if (!ch) return;
    const home = ch.gridX === 0 && ch.gridY === 0;
    const d = Math.max(1, ch.dangerLevel || 1);
    const n = home ? 2 + (Math.random() * 2 | 0) : 3 + Math.floor(d / 2) + (Math.random() * 3 | 0);
    const pool = home ? ['mote', 'charger'] : ['mote', 'charger', 'stalker', 'charger', 'sniper', 'stalker'].slice(0, 2 + d);
    const p = engine.player, R = ch.radius || 2600;
    const a = Math.random() * Math.PI * 2;
    let cx = p.x + Math.cos(a) * 1050, cy = p.y + Math.sin(a) * 1050;
    const r = Math.hypot(cx, cy);
    if (r > R * 0.88) { cx *= R * 0.88 / r; cy *= R * 0.88 / r; }
    const wing = [];
    for (let i = 0; i < n; i++) {
      const e = new EnemyOrganism(cx + (Math.random() - 0.5) * 170, cy + (Math.random() - 0.5) * 170,
        { tier: home ? 1 : d, archetype: pool[Math.random() * pool.length | 0] });
      e.hunting = true;
      if (!home && Math.random() < 0.15) makeElite(e);
      engine.enemies.push(e); wing.push(e);
      particleSystem.spawnBubbleBurst(e.x, e.y, e.color, 10);
    }
    particleSystem.particles.push(new Particle(cx, cy, { vx: 1e-4, vy: 1e-4, type: 'ring',
      radius: 30, maxRadius: 280, color: RUST, decay: 0.02 }));
    hunt.wing = wing;
    const bearing = COMPASS[Math.round(Math.atan2(cy - p.y, cx - p.x) / (Math.PI / 4)) & 7];
    banner(`HOSTILE WING INBOUND · ${n} CONTACTS · ${bearing}`);
    soundEngine.playAbility('dash');
  }

  function tick() {
    paintChain(false);
    if (engine.player.dead || hunt.inZone()) return;
    const ch = worldMap.getCurrentChamber();
    if (!ch || ch.isBossSector) return;
    if (hunt.wing) {
      if (!hunt.wing.some(e => engine.enemies.includes(e))) { banner('WING BROKEN'); hunt.wing = null; if (hunt.onWingBroken) hunt.onWingBroken(); }
      return;
    }
    if (--hunt.wingT > 0 || engine.enemies.length > 14) return;
    spawnWing(ch);
    hunt.wingT = 2700 + Math.random() * 1800;
  }

  /* ── world-space tells, drawn over the base enemy ─────────────────────── */
  const baseDraw = EnemyOrganism.prototype.draw;
  EnemyOrganism.prototype.draw = function (ctx, camera) {
    baseDraw.call(this, ctx, camera);
    if (!this.elite && this.archetype !== 'outpost' && !this.chargeT && !this.aimT) return;
    const sx = this.x - camera.x, sy = this.y - camera.y, t = performance.now(), z = camera.zoom || 1;
    const R = this.coreRadius;
    ctx.save();
    if (this.aimT) {
      const locked = this.aimT <= 12;
      ctx.strokeStyle = locked ? 'rgba(255,60,90,0.95)' : `rgba(188,19,254,${0.25 + (1 - this.aimT / 40) * 0.5})`;
      ctx.lineWidth = (locked ? 3 : 1.2) / z;
      ctx.setLineDash(locked ? [] : [14 / z, 8 / z]);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(this.aimA) * 1400, sy + Math.sin(this.aimA) * 1400); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.chargeT) {
      const k = this.chargeT / 34;
      ctx.strokeStyle = `rgba(255,183,3,${0.9 - k * 0.5})`; ctx.lineWidth = 3 / z;
      ctx.beginPath(); ctx.arc(sx, sy, R + 8 + k * 60, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.elite) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2 / z; ctx.shadowColor = GOLD; ctx.shadowBlur = 10;
      ctx.setLineDash([10 / z, 6 / z]); ctx.lineDashOffset = -t * 0.02;
      ctx.beginPath(); ctx.arc(sx, sy, R + 20, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = GOLD; ctx.font = `700 ${Math.round(10 / z)}px "Space Grotesk", monospace`; ctx.textAlign = 'center';
      ctx.fillText('ELITE', sx, sy - R - 30);
    }
    if (this.archetype === 'outpost') {
      ctx.strokeStyle = 'rgba(255,140,66,0.55)'; ctx.lineWidth = 2 / z;
      ctx.setLineDash([22 / z, 12 / z]); ctx.lineDashOffset = t * 0.03;
      ctx.beginPath(); ctx.arc(sx, sy, R * 2.1, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const w = 140, hp = Math.max(0, this.hp / this.maxHp), sh = this.maxShield ? this.shield / this.maxShield : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sx - w / 2, sy - R * 2.1 - 26, w, 7);
      ctx.fillStyle = RUST; ctx.fillRect(sx - w / 2, sy - R * 2.1 - 26, w * hp, 7);
      if (sh > 0) { ctx.fillStyle = '#5ef2e0'; ctx.fillRect(sx - w / 2, sy - R * 2.1 - 17, w * sh, 3); }
      ctx.fillStyle = 'rgba(255,194,143,0.95)'; ctx.font = `700 ${Math.round(11 / z)}px "Space Grotesk", monospace`; ctx.textAlign = 'center';
      ctx.fillText('PIRATE OUTPOST', sx, sy - R * 2.1 - 34);
    }
    ctx.restore();
  };

  /* ── B8 THE HIT: damage numbers + crits ───────────────────────────────── */
  const CRIT = 0.12, nums = hunt.nums = [];
  function pop(target, amount, crit, shield) {
    const now = performance.now(), last = nums[nums.length - 1];
    /* Rapid fire on one target STACKS into one climbing number instead of a smear. */
    if (last && last.target === target && !crit && !last.crit && now - last.t < 140) { last.v += amount; last.t = now; return; }
    if (nums.length > 60) nums.shift();
    nums.push({ target, x: target.x + (Math.random() - 0.5) * 30, y: target.y - (target.coreRadius || 20), v: amount, crit, shield, t: now });
  }
  function critRoll(amount) { return Math.random() < CRIT ? [amount * 2, true] : [amount, false]; }
  function critFx(x, y) {
    for (let i = 0; i < 3; i++) particleSystem.spawnSpark(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, GOLD);
    engine.addShake(1.2);
  }
  function drawNums(ctx, camera) {
    if (!nums.length) return;
    const now = performance.now(), z = camera.zoom || 1;
    ctx.save(); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i], k = (now - n.t) / (n.crit ? 900 : 650);
      if (k >= 1) { nums.splice(i, 1); continue; }
      const sx = n.x - camera.x, sy = n.y - camera.y - k * 46 / z;
      const sc = n.crit ? 1 + Math.max(0, 0.6 - k * 3) : 1;
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.font = `800 ${Math.round((n.crit ? 22 : 13) * sc / z)}px "Outfit", system-ui, sans-serif`;
      ctx.lineWidth = 3 / z; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const txt = Math.round(n.v) + (n.crit ? '!' : '');
      ctx.strokeText(txt, sx, sy);
      ctx.fillStyle = n.crit ? GOLD : (n.shield ? '#5ef2e0' : '#f2f5f4');
      ctx.fillText(txt, sx, sy);
    }
    ctx.restore();
  }
  const baseTake = EnemyOrganism.prototype.takeDamage;
  EnemyOrganism.prototype.takeDamage = function (amount) {
    const [a, crit] = critRoll(amount);
    pop(this, a, crit, this.shield > 0);
    if (crit) critFx(this.x, this.y);
    return baseTake.call(this, a);
  };

  /* ── engine seams ─────────────────────────────────────────────────────── */
  function install() {
    const baseKill = engine.killEnemy.bind(engine);
    engine.killEnemy = (index) => {
      const e = engine.enemies[index];
      if (e) {
        onKill(e);
        if (e.elite) {
          progression.spawnDropsFromEnemy(e);
          const parts = e.nodes.filter(n => n.type !== 'core' && !n.lost);
          if (parts.length) progression.spawnSalvage(e.x, e.y + 24, { part: { type: parts[0].type, radius: parts[0].radius } });
        }
        if (e.archetype === 'outpost') breakOutpost(e);
      }
      return baseKill(index);
    };

    const baseLoad = engine.loadChamberEntities.bind(engine);
    engine.loadChamberEntities = () => {
      baseLoad();
      hunt.wing = null;
      hunt.wingT = 1800 + Math.random() * 900;
      if (hunt.inZone()) return;
      const ch = worldMap.getCurrentChamber();
      if (!ch || ch.isCleared || ch.isBossSector) return;
      if ((ch.dangerLevel || 0) >= 1) for (const e of engine.enemies) if (!e.isBoss && Math.random() < 0.12) makeElite(e);
      const home = ch.gridX === 0 && ch.gridY === 0;
      if (!home && typeof sectorField !== 'undefined') placeOutpost(ch);
    };

    const baseNode = engine.damageNode.bind(engine);
    engine.damageNode = (ship, node, amount) => {
      if (ship === engine.player) return baseNode(ship, node, amount);
      const [a, crit] = critRoll(amount);
      pop(ship, a, crit, false);
      if (crit) critFx(ship.x, ship.y);
      return baseNode(ship, node, a);
    };

    const baseParticles = particleSystem.draw.bind(particleSystem);
    particleSystem.draw = (ctx, camera) => { baseParticles(ctx, camera); drawNums(ctx, camera); };

    const baseUpdate = engine.update.bind(engine);
    engine.update = (dt) => {
      baseUpdate(dt);
      if (!engine.paused && !engine.mapOpen && !document.hidden) tick();
    };

    /* OVERDRIVE: guns cycle 35% faster while the chain holds at x8+. */
    if (typeof reactor !== 'undefined' && reactor.fireIntervalScale) {
      const baseFire = reactor.fireIntervalScale.bind(reactor);
      reactor.fireIntervalScale = () => baseFire() * (hunt.overdrive ? 0.65 : 1);
    }
  }
  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
