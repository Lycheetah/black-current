/* ==========================================================================
   B10 · BOSS PATTERNS. The four corner bosses all fired the same three-shot
   arc and died in ~40 hits: a big stalker, not a fight. Each now speaks its own
   readable bullet language, telegraphs every big move, has a third phase, and
   owns a top-screen bar. Names come from BOSS_KEYS (campaign.js); none invented.
     TITAN · rings with a gap: find the hole. Enraged: aimed slam between rings.
     QUEEN · twin spiral + brood calls. Phase 3 the spiral reverses.
     SOLAR · four-arm sun spiral + locked flare fans. Phase 3 adds sun rings.
     VOID  · blinks beside you (tell at the destination), arrives in a ring.
   Seams only: wraps EnemyOrganism.prototype.update/draw and engine.update.
   ========================================================================== */
(() => {
  const HUE = { titan: '#ff8c42', queen: '#ff3366', solar: '#e8c478', void: '#a77bff' };
  const HP = 1800, SHIELD = 300, ADDS_MAX = 8, WAKE = 1150, TAU = Math.PI * 2;
  const keyOf = e => (typeof BOSS_KEYS !== 'undefined' && BOSS_KEYS[e.name || e.bossType]) || 'titan';

  function forge(e) {
    if (e._bk) return e;
    e._bk = keyOf(e); e._t = 0; e._spin = 0; e._tell = 0; e._q = []; e._lastPhase = 1; e._awake = false;
    e.maxHp = e.hp = HP; e.shield = e.maxShield = SHIELD;
    e.color = HUE[e._bk];
    return e;
  }

  function shot(list, e, a, spd, o = {}) {
    const r = e.coreRadius + 6;
    list.push(new Projectile(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, Math.cos(a) * spd, Math.sin(a) * spd, {
      color: o.color || HUE[e._bk], damage: o.damage || 11, isPlayer: false,
      type: 'spitter', radius: o.radius || 7, life: o.life || 170
    }));
  }
  /* A ring with a hole. The hole is the lesson: read it, fly to it. */
  function ring(list, e, n, spd, gapAt, gapW, o) {
    const off = Math.random() * TAU / n;
    for (let i = 0; i < n; i++) {
      const a = off + i / n * TAU;
      if (gapW && Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt))) < gapW) continue;
      shot(list, e, a, spd, o);
    }
  }
  function tell(e, frames, kind, act) { e._tell = e._tellMax = frames; e._tellKind = kind; e._act = act; }
  function later(e, frames, f) { e._q.push({ at: e._t + frames, f }); }

  function brood(e, enemies, n) {
    const mine = enemies.filter(x => x._queen === e).length;
    for (let i = 0; i < Math.min(n, ADDS_MAX - mine); i++) {
      const a = Math.random() * TAU;
      const m = new EnemyOrganism(e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, { tier: 2, archetype: 'mote' });
      m._queen = e; m.hunting = true;
      enemies.push(m);
    }
    particleSystem.spawnBubbleBurst(e.x, e.y, HUE.queen, 14);
  }

  function pattern(e, P, list, enemies) {
    const p = enemyPace(), ph = e.phase, t = ++e._t;
    const aim = Math.atan2(P.y - e.y, P.x - e.x);
    for (let i = e._q.length - 1; i >= 0; i--) if (e._q[i].at <= t) { const q = e._q.splice(i, 1)[0]; q.f(); }
    if (e._tell > 0 && --e._tell === 0 && e._act) { const f = e._act; e._act = null; f(); }
    const free = !e._tell;

    if (e._bk === 'titan') {
      if (free && t % [0, 150, 105, 80][ph] === 0) tell(e, 40, 'ring', () => {
        const gap = aim + (Math.random() - 0.5) * 1.4;
        ring(list, e, 24, 4.2 * p, gap, 0.34, { damage: 14, radius: 9 });
        if (ph >= 2) later(e, 22, () => ring(list, e, 24, 3.4 * p, gap + Math.PI * 0.5, 0.34, { damage: 14, radius: 9 }));
        engine.addShake(4);
      });
      if (ph >= 3 && t % 60 === 30) for (let i = -2; i <= 2; i++) shot(list, e, aim + i * 0.1, 6 * p, { damage: 12 });
    } else if (e._bk === 'queen') {
      const arms = ph >= 2 ? 3 : 2, dir = ph >= 3 && (t / 120 | 0) % 2 ? -1 : 1;
      e._spin += 0.09 * dir;
      if (t % 7 === 0) for (let k = 0; k < arms; k++) shot(list, e, e._spin + k * TAU / arms, 3.8 * p, { damage: 9, radius: 6 });
      if (free && t % 240 === 0) tell(e, 36, 'ring', () => brood(e, enemies, ph + 1));
    } else if (e._bk === 'solar') {
      const arms = ph >= 2 ? 6 : 4;
      e._spin += 0.045;
      if (t % 8 === 0) for (let k = 0; k < arms; k++) shot(list, e, e._spin + k * TAU / arms, 3.4 * p, { damage: 9, radius: 6, color: k % 2 ? '#ffb347' : HUE.solar });
      if (free && t % [0, 190, 150, 120][ph] === 0) {
        e._aimA = aim;
        tell(e, 32, 'fan', () => { for (let i = -3; i <= 3; i++) shot(list, e, e._aimA + i * 0.12, 7 * p, { damage: 13 }); });
      }
      if (ph >= 3 && t % 210 === 105) ring(list, e, 30, 3 * p, 0, 0, { damage: 10 });
    } else {
      if (free && t % [0, 70, 55, 45][ph] === 0) for (let i = -1; i <= 1; i++) shot(list, e, aim + i * 0.09, 6.5 * p, { damage: 12 });
      if (free && t % [0, 260, 190, 150][ph] === 0) {
        /* Bias the blink toward the sector centre so it never lands past the wall. */
        const a = Math.atan2(-P.y, -P.x) + (Math.random() - 0.5) * 2.4;
        e._dest = { x: P.x + Math.cos(a) * 380, y: P.y + Math.sin(a) * 380 };
        tell(e, 48, 'blink', () => {
          particleSystem.spawnBubbleBurst(e.x, e.y, HUE.void, 16);
          e.x = e._dest.x; e.y = e._dest.y; e.vx = e.vy = 0;
          particleSystem.spawnBubbleBurst(e.x, e.y, HUE.void, 16);
          ring(list, e, ph >= 3 ? 24 : 14, 4 * p, Math.random() * TAU, 0.4, { damage: 12 });
          soundEngine.playAbility('dash');
        });
      }
    }
  }

  function phaseCheck(e) {
    if (e.phase === 2 && e.hp < e.maxHp * 0.25) e.phase = 3;
    if (e.phase === e._lastPhase) return;
    e._lastPhase = e.phase;
    if (window.garage) garage.banner(`${e.name} · ${e.phase === 3 ? 'ENRAGED' : 'PHASE II'}`, 'hunt');
    engine.addShake(JUICE.shakeMax);
    particleSystem.spawnBubbleBurst(e.x, e.y, HUE[e._bk], 30);
    soundEngine.playAbility('emp');
    e._tell = 0; e._act = null;
  }

  const baseUpdate = EnemyOrganism.prototype.update;
  EnemyOrganism.prototype.update = function (player, projectiles, enemyList) {
    if (!this.isBoss) return baseUpdate.call(this, player, projectiles, enemyList);
    forge(this);
    this.shootTimer = 9999; /* the old three-shot arc stays silent; the boss speaks its own language */
    const r = baseUpdate.call(this, player, projectiles, enemyList);
    if (!this._awake && Math.hypot(player.x - this.x, player.y - this.y) < WAKE) {
      this._awake = true;
      if (window.garage) garage.banner(`${this.name} · ENGAGED`, 'hunt');
    }
    if (this._awake && this.hp > 0) { phaseCheck(this); pattern(this, player, projectiles, enemyList); }
    return r;
  };

  const baseDraw = EnemyOrganism.prototype.draw;
  EnemyOrganism.prototype.draw = function (ctx, camera) {
    baseDraw.call(this, ctx, camera);
    if (!this.isBoss || !this._tell) return;
    const z = camera.zoom || 1, sx = this.x - camera.x, sy = this.y - camera.y;
    const k = 1 - this._tell / this._tellMax, c = HUE[this._bk];
    ctx.save();
    ctx.strokeStyle = c; ctx.lineWidth = 3 / z; ctx.globalAlpha = 0.35 + 0.6 * k;
    if (this._tellKind === 'fan') {
      ctx.setLineDash([12 / z, 8 / z]);
      for (let i = -3; i <= 3; i++) {
        const a = this._aimA + i * 0.12;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 560, sy + Math.sin(a) * 560); ctx.stroke();
      }
    } else if (this._tellKind === 'blink' && this._dest) {
      const dx = this._dest.x - camera.x, dy = this._dest.y - camera.y;
      ctx.setLineDash([10 / z, 7 / z]);
      ctx.beginPath(); ctx.arc(dx, dy, this.coreRadius * (1.8 - k), 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha *= 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, this.coreRadius * (1 + k * 0.6), 0, TAU); ctx.stroke();
    } else {
      /* Contracting ring: when it reaches the hull, the move fires. */
      ctx.lineWidth = 4 / z;
      ctx.beginPath(); ctx.arc(sx, sy, this.coreRadius + (1 - k) * 150, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  /* ── top-screen bar ───────────────────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'boss-bar'; bar.hidden = true;
  bar.innerHTML = '<div class="bb-name"><span></span><b></b></div><div class="bb-track"><i class="bb-hp"></i><i class="bb-sh"></i><s style="left:50%"></s><s style="left:25%"></s></div>';
  const nameEl = bar.querySelector('.bb-name span'), phEl = bar.querySelector('.bb-name b');
  const hpEl = bar.querySelector('.bb-hp'), shEl = bar.querySelector('.bb-sh');
  let shownPhase = 0, shownBoss = null;
  function paintBar() {
    const b = engine.enemies.find(e => e.isBoss && e._awake && e.hp > 0);
    if (!b) { if (!bar.hidden) { bar.hidden = true; shownPhase = 0; shownBoss = null; } return; }
    if (b !== shownBoss) { shownBoss = b; shownPhase = 0; bar.hidden = false; bar.style.setProperty('--bb', HUE[b._bk]); nameEl.textContent = b.name; }
    if (shownPhase !== b.phase) { shownPhase = b.phase; phEl.textContent = ['', 'I', 'II', 'III · ENRAGED'][b.phase]; }
    hpEl.style.width = `${Math.max(0, b.hp / b.maxHp * 100)}%`;
    shEl.style.width = `${Math.max(0, b.shield / (b.maxShield || 1) * 100)}%`;
  }

  window.bosses = {
    /* Witness hook: summon a corner boss beside you (console: bosses.spawn('solar')). */
    spawn(key) {
      const name = Object.keys(BOSS_KEYS).find(n => BOSS_KEYS[n] === key) || 'ABYSSAL TITAN';
      const P = engine.player;
      const e = forge(new EnemyOrganism(P.x, P.y - 560, { tier: 7, isBoss: true, bossType: name, archetype: 'stalker' }));
      engine.enemies.push(e);
      return e;
    }
  };

  function install() {
    (document.getElementById('hud') || document.body).appendChild(bar);
    const base = engine.update.bind(engine);
    engine.update = (...a) => { const r = base(...a); paintBar(); return r; };
  }
  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
