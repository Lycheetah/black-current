/* THE ARSENAL. Mac, 2026-10-25: "far not enough guns lol 21 guns" · "we have no sub system like
 * eve you can specialize" · "this type of game deserves a good inventory of things to upgrade your numbers".
 *
 * ONE GRID: 5 families x 3 archetypes x 6 size classes. The 19 existing guns that fit keep their engine
 * behaviour and take their slot, and flechette and boomerang stay as specials; every empty slot is
 * generated from its archetype template. Damage is never hand-typed: it is CLASS_DPS x role, divided over
 * the shots a trigger pull fires. Bigger classes hit harder per control point but fly slower (PACE),
 * so a small fast hull can still get inside a capital's guns.
 * Specialisation: each family has a mastery track earned by killing with that family fitted.
 * Shields: shield nodes are real pools with their own recharge profile, and the active membrane stacks on top. */
(() => {
  'use strict';
  const CLS = ['POINT', 'LIGHT', 'MEDIUM', 'HEAVY', 'SIEGE', 'CAPITAL'];
  const CLASS_DPS = [50, 110, 200, 400, 700, 1300];
  const RATE = [1, 1.15, 1.5, 2.1, 2.8, 3.6], SIZE = [1, 1.15, 1.35, 1.6, 1.9, 2.3], PACE = [1.05, 1, .97, .93, .9, .86];
  const COST = [200, 450, 1000, 2400, 4200, 9000];
  const FAMILIES = {
    kinetic: { name: 'Electro-kinetic', tint: '#ffcf7a', line: 'Electromagnetic shell and slug weapons. Direct impact at every range.' },
    rail: { name: 'Rail', tint: '#b8f0ff', line: 'Hypervelocity needles, piercing drivers and long rifles.' },
    beam: { name: 'Beam', tint: '#c4abff', line: 'Energy bolts, pulse bursts and lances that run through a line.' },
    missile: { name: 'Missile', tint: '#8cffc8', line: 'Seekers, rocket fans and torpedoes. They find the target.' },
    ordnance: { name: 'Ordnance', tint: '#ff9e76', line: 'Blast shells, flak and bombards. Area denial.' }
  };
  // [family, archetype, title, template, six names by class; '*id' = an existing gun takes the slot]
  const ARCH = [
    ['kinetic', 'cannon', 'Cannon', { fr: 12, r: 6, ratio: 2.2, role: 1 }, ['*spitter', 'Deck gun', '*heavycannon', 'Battle cannon', 'Siege cannon', 'Titan cannon']],
    ['kinetic', 'repeater', 'Repeater', { fr: 5, r: 4, ratio: 2.4, role: .95, jitter: .08 }, ['Pepper gun', '*autocannon', 'Rotary cannon', 'Megacannon', 'Hurricane battery', 'Storm battery']],
    ['kinetic', 'scatter', 'Shotgun', { fr: 28, r: 5, ratio: 2, shots: 5, fan: .18, role: 1.05, life: 60 }, ['Scattergun', 'Deck shotgun', 'Broad scattergun', 'Grapeshot battery', 'Siege shotgun', 'Broadside shotgun']],
    ['rail', 'stream', 'Stream', { fr: 3, r: 3, ratio: 3, role: 1.05, jitter: .06 }, ['*needler', 'Needle carbine', 'Needle storm', 'Flechette cannon', 'Shard hurricane', 'Needle tempest']],
    ['rail', 'driver', 'Driver', { fr: 16, r: 3, ratio: 3.2, pierce: 2, role: .9 }, ['Pin driver', 'Coil carbine', 'Gauss driver', 'Mass driver', '*railgun', '*capitalrail']],
    ['rail', 'rifle', 'Rifle', { fr: 40, r: 4, ratio: 3.8, role: 1.15, life: 150 }, ['Marksman rail', 'Longshot rail', 'Lancer rifle', 'Starshot rifle', 'Horizon rail', 'Eclipse rail']],
    ['beam', 'bolt', 'Bolt', { fr: 4, r: 4, ratio: 2.8, role: .95 }, ['Pulse emitter', 'Bolt caster', '*laser', 'Heavy bolt array', 'Siege bolter', 'Solar bolter']],
    ['beam', 'pulse', 'Pulse', { fr: 36, r: 4, ratio: 2.9, burst: 3, gap: 5, role: 1 }, ['*burst', 'Pulse rifle', '*burstbeam', 'Pulse battery', 'Pulse bastion', 'Pulse citadel']],
    ['beam', 'lance', 'Lance', { fr: 28, r: 8, ratio: 3, pierce: 4, role: .7 }, ['Light lance', '*wave', 'Ion lance', 'Ion cannon', '*lance', 'Sun lance']],
    ['missile', 'seeker', 'Seeker', { fr: 30, r: 3, ratio: 1.7, burst: 2, gap: 6, seek: .08, role: .9, life: 90 }, ['Micro-missile pod', 'Seeker rack', 'Swarm launcher', '*homing', 'Hellfire salvo', 'Leviathan swarm']],
    ['missile', 'rocket', 'Rocket', { fr: 40, r: 4, ratio: 1.9, shots: 4, fan: .12, role: 1.15, life: 70 }, ['Rocket pod', 'Rocket rack', 'Rocket barrage', 'Thunder rockets', 'Siege rockets', 'Armageddon rockets']],
    ['missile', 'torpedo', 'Torpedo', { fr: 60, r: 6, ratio: .9, seek: .05, accel: 1.06, role: 1.1, life: 120 }, ['Dart torpedo', 'Light torpedo', 'Torpedo tube', '*torpedo', 'Siege torpedo', 'Doomsday torpedo']],
    ['ordnance', 'mortar', 'Mortar', { fr: 24, r: 8, ratio: 1.6, onhit: 'nova', role: .8 }, ['Grenade launcher', 'Pocket mortar', '*mortar', 'Nova mortar', 'Nova siege mortar', 'Cataclysm mortar']],
    ['ordnance', 'flak', 'Flak', { fr: 24, r: 4, ratio: 1.7, shots: 5, fan: .17, life: 14, role: 1.3 }, ['*flak', '*shrapnel', 'Flak cannon', 'Flak battery', 'Flak bastion', 'Flak curtain']],
    ['ordnance', 'shell', 'Bombard', { fr: 60, r: 10, ratio: 1.7, role: 1.15 }, ['Light howitzer', 'Field gun', 'Bombard', '*howitzer', '*cluster', 'Titan bombard']]
  ];
  // Named slots whose identity is more than their archetype.
  const OVERRIDE = {
    'lance-heavy': { onhit: 'cryo' }, 'lance-capital': { onhit: 'plasma', pierce: 8, role: .6 },
    'seeker-medium': { burst: 4, gap: 5, role: .85 }, 'seeker-siege': { burst: 4, gap: 8, seek: .05, role: .95 }, 'seeker-capital': { burst: 10, gap: 4, seek: .06 },
    'scatter-medium': { shots: 7, fan: .14 }, 'scatter-heavy': { shots: 7, fan: .16 },
    'scatter-siege': { shots: 9, fan: .13 }, 'scatter-capital': { shots: 9, fan: .15 }, 'flak-capital': { shots: 9, fan: .12 },
    'shell-capital': { onhit: 'nova', role: .9 }, 'mortar-capital': { r: 9 }
  };
  // Existing guns: their role (single-target share of the class budget) and shots per trigger pull.
  const ROLE = { spitter: 1, heavycannon: 1.05, autocannon: 1, twin: .9, boomerang: .6, needler: 1.05, flechette: 1.1, railgun: .85, capitalrail: .85, laser: .95, burst: 1, burstbeam: .85, wave: .8, lance: .7, homing: .8, torpedo: 1.1, mortar: 1.2, flak: 1.3, shrapnel: .6, howitzer: 1.15, cluster: .5 };
  const SHOTS = { twin: 2, mortar: 3, flak: 5, burst: 3, burstbeam: 3 };
  // The cadence armory tuned for the original guns, kept so each one fires the way players already know it.
  const CADENCE = { spitter: 12, twin: 18, needler: 3, flak: 24, homing: 45, torpedo: 90, railgun: 120, lance: 75, cluster: 120 };

  const GUNS = {};
  for (const [family, arch, archName, template, names] of ARCH) names.forEach((name, c) => {
    if (name[0] === '*') { const id = name.slice(1); GUNS[id] = { family, arch, archName, c, role: ROLE[id] ?? 1, shots: SHOTS[id] || 1 }; return; }
    const id = arch + '-' + CLS[c].toLowerCase(), o = { ...template, ...(OVERRIDE[arch + '-' + CLS[c].toLowerCase()] || {}) };
    GUNS[id] = { family, arch, archName, c, role: o.role, shots: (o.shots || 1) * (o.burst || 1), gen: o, name };
  });
  // Keep the original two-barrel gun and its saved fitting IDs intact.
  GUNS.twin = { family: 'kinetic', arch: 'scatter', archName: 'Twin', c: 1, role: ROLE.twin, shots: 2, special: true };
  GUNS.flechette = { family: 'rail', arch: 'stream', archName: 'Special', c: 0, role: ROLE.flechette, shots: 1, special: true };
  GUNS.boomerang = { family: 'kinetic', arch: 'scatter', archName: 'Special', c: 2, role: ROLE.boomerang, shots: 1, special: true };

  function blurb(g, o) {
    const t = [];
    if (o.shots > 1) t.push(`fires ${o.shots} ${g.arch === 'scatter' ? 'pellets' : 'rounds'} in a ${Math.round((o.shots-1)*o.fan*180/Math.PI)}° fan`);
    if (o.burst > 1) t.push(`${o.burst}-round volley`);
    if (o.pierce) t.push(`pierces ${o.pierce} hulls`);
    if (o.seek) t.push('seeks the nearest hull');
    if (o.accel) t.push('accelerates after launch');
    if (o.jitter) t.push('rapid and slightly loose');
    if (o.onhit === 'cryo') t.push('slows hulls for 2 s');
    if (o.onhit === 'plasma') t.push('sets hulls burning');
    if (o.onhit === 'nova') t.push('blasts everything near impact');
    if (o.life >= 140) t.push('long range');
    if (o.life && o.life <= 20) t.push('point-blank only');
    const s = t.join(', ');
    return `${FAMILIES[g.family].name} ${g.archName.toLowerCase()}${s ? ': ' + s : ''}.`;
  }

  const NEW = armory.NEW, band = c => MOUNT_LADDER.find(b => b.cls === CLS[c]);
  for (const [id, g] of Object.entries(GUNS)) {
    const o = g.gen;
    if (o) {
      const def = { title: g.name, damage: 1, fireRate: Math.round(o.fr * RATE[g.c]), speed: 0, radius: Math.round(o.r * SIZE[g.c]), cls: CLS[g.c], cost: COST[g.c], color: FAMILIES[g.family].tint, blurb: blurb(g, o) };
      if (o.life) def.life = Math.round(o.life * (1 + g.c * .08));
      if (o.pierce) def.pierce = o.pierce + (g.c >= 4 && !OVERRIDE[id]?.pierce ? 1 : 0);
      if (o.burst > 1) { def.burst = o.burst; def.burstGap = o.gap; }
      NEW[id] = def; WEAPON_TYPES[id] = { ...def }; WEAPON_SPEED_RATIO[id] = o.ratio * PACE[g.c];
      armory.PRICES[id] = def.cost;
      const b = band(g.c); if (b && b.weapon !== id && !b.alts.includes(id)) b.alts.push(id);
    }
    const w = WEAPON_TYPES[id];
    if (w && CADENCE[id]) w.fireRate = CADENCE[id];
    if (w) { const damage = CLASS_DPS[g.c] * g.role * w.fireRate / 60 / g.shots; w.damage = g.gen && g.arch === 'scatter' ? Math.round(damage*10)/10 : Math.max(1, Math.round(damage)); }
  }

  /* ---- specialisation: family mastery ---- */
  const STEPS = [0, 60, 180, 420, 840, 1500];
  const mastery = {
    STEPS,
    doc() { let d = saveState.doc.arsenal; if (!d || d.v !== 1 || !d.xp || typeof d.xp !== 'object') d = saveState.doc.arsenal = { v: 1, xp: {} }; return d; },
    xp(f) { return Math.max(0, Number(this.doc().xp[f]) || 0); },
    rank(f) { const x = this.xp(f); let r = 0; while (r < 5 && x >= STEPS[r + 1]) r++; return r; },
    damage(f) { return 1 + .05 * this.rank(f); },
    rate(f) { return 1 - .03 * this.rank(f); },
    fitted() { return [...new Set((engine.player.nodes || []).filter(n => n.type === 'cannon' && !n.lost).map(n => GUNS[fleet.weaponFor(n)]?.family).filter(Boolean))]; },
    gain(xp) {
      const fams = this.fitted(); if (!fams.length || !(xp > 0)) return;
      const d = this.doc(), each = xp / fams.length;
      for (const f of fams) {
        const before = this.rank(f); d.xp[f] = Math.round((this.xp(f) + each) * 10) / 10; const after = this.rank(f);
        if (after > before && typeof garage !== 'undefined') garage.banner(`${FAMILIES[f].name.toUpperCase()} MASTERY ${after} · +${after * 5}% damage · +${after * 3}% fire rate`, 'good');
      }
      saveState.save();
    }
  };

  /* ---- shields: every shield node is a real pool ---- */
  const SHIELD = [
    { below: 10, name: 'Shield emitter', pool: 30, rate: 12, delay: 150 },
    { below: 14, name: 'Shield bud', pool: 40, rate: 16, delay: 110 },
    { below: 17, name: 'Shield pod', pool: 60, rate: 12, delay: 180 },
    { below: 999, name: 'Bastion pod', pool: 100, rate: 9, delay: 270 }
  ];
  const shields = {
    SHIELD,
    of(radius) { return SHIELD.find(s => radius < s.below); },
    profile(nodes) {
      let pool = 0, rate = 0, weighted = 0;
      for (const n of nodes || []) if (n.type === 'shield' && !n.lost) { const s = this.of(n.radius); pool += s.pool; rate += s.rate; weighted += s.delay * s.pool; }
      return { pool, rate, delay: pool ? Math.round(weighted / pool) : 0 };
    }
  };

  /* ---- family voices: one timbre per family, pitched down and stretched by class ---- */
  const VOICE = { kinetic: [300, 70, .14, .12, 'triangle', .12], rail: [1400, 180, .12, .07, 'sawtooth', .04], beam: [1100, 500, .1, .06, 'sine', 0], missile: [200, 420, .26, .08, 'triangle', .22], ordnance: [150, 35, .3, .13, 'triangle', .2] };
  const PITCH = [1.25, 1.1, 1, .8, .65, .5], LEN = [.7, .8, 1, 1.25, 1.5, 2], VOL = [.6, .7, .85, 1, 1.1, 1.25];

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  function render(host) {
    host.replaceChildren();
    const total = Object.keys(GUNS).length, owned = Object.keys(GUNS).filter(id => armory.owns(id)).length;
    host.append(el('p', 'arsenal-intro', `${total} guns in 5 families, ${owned} available to buy or recover. Every family has a gun at every size class. Fly a family to master it: each rank gives that family's guns +5% damage and +3% fire rate, up to rank 5.`));
    const list = el('div', 'arsenal-families');
    for (const [f, fam] of Object.entries(FAMILIES)) {
      const r = mastery.rank(f), x = mastery.xp(f), next = STEPS[r + 1];
      const card = el('section', 'arsenal-family'); card.style.setProperty('--tint', fam.tint); card.dataset.family = f;
      const head = el('div', 'arsenal-family-head');
      head.append(el('h3', null, fam.name), el('span', null, `Mastery ${r} / 5 · ${next ? `${Math.floor(x)} / ${next} XP` : 'Mastered'} · +${r * 5}% dmg · +${r * 3}% rate`));
      const meter = el('div', 'talent-meter'); meter.style.setProperty('--fill', next ? (x - STEPS[r]) / (next - STEPS[r]) : 1);
      const grid = el('div', 'arsenal-grid');
      grid.append(el('span', 'arch'), ...CLS.map(c => el('span', 'cls', c)));
      for (const [family, arch, archName] of ARCH) {
        if (family !== f) continue;
        grid.append(el('span', 'arch', archName));
        for (let c = 0; c < 6; c++) {
          const id = Object.keys(GUNS).find(k => GUNS[k].arch === arch && GUNS[k].c === c && !GUNS[k].special), w = WEAPON_TYPES[id];
          const chip = el('span', 'arsenal-chip' + (armory.owns(id) ? ' owned' : ''), w.title);
          chip.title = `${w.title} · ${CLS[c]} · ${w.damage} dmg / ${(w.fireRate / 60).toFixed(2)} s · ${w.blurb || ''}`;
          chip.append(el('small', null, `${CLS[c]} · ${armory.owns(id) ? 'owned' : (armory.PRICES[id] || 0) + ' metal'}`));
          grid.append(chip);
        }
      }
      card.append(head, meter, el('p', 'arsenal-line', fam.line), grid);
      list.append(card);
    }
    host.append(list);
  }

  const arsenal = window.arsenal = {
    CLS, CLASS_DPS, FAMILIES, ARCH, GUNS, mastery, shields, render,
    familyOf: id => GUNS[id]?.family || null,
    familyName: id => FAMILIES[GUNS[id]?.family]?.name || 'Special',
    count: () => Object.keys(GUNS).length,
    dps: id => { const w = WEAPON_TYPES[id], g = GUNS[id]; return w && g ? Math.round(w.damage * g.shots * 60 / w.fireRate) : 0; },
    get ready() { return ready; }
  };
  let ready = false;

  function rotate(p, a) { const s = Math.hypot(p.vx, p.vy), h = Math.atan2(p.vy, p.vx) + a; p.vx = Math.cos(h) * s; p.vy = Math.sin(h) * s; }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r), 0, Math.PI * 2); ctx.fill(); }

  function install() {
    /* flight: spread, jitter, seeking, acceleration, on-hit effects through the engine's one quirk-hit path */
    const update = Projectile.prototype.update;
    Projectile.prototype.update = function (targets) {
      const g = this.isPlayer ? GUNS[this.type] : null, o = g?.gen;
      if (g && !this._arsenal) {
        this._arsenal = true;
        const child = this._armoryChild || this._arsenalChild;
        if (!child) this.damage *= mastery.damage(g.family);
        if (o) {
          if (NEW[this.type].life) this.life = NEW[this.type].life;
          if (o.jitter) rotate(this, (Math.random() - .5) * o.jitter);
          if (o.onhit && !this.quirk) this.quirk = o.onhit;
          if (o.shots > 1 && !child && typeof engine !== 'undefined') {
            const n = o.shots, speed = Math.hypot(this.vx, this.vy), a0 = Math.atan2(this.vy, this.vx), first = -(n - 1) / 2 * o.fan;
            for (let k = 1; k < n; k++) {
              const a = a0 + first + k * o.fan;
              const p = new Projectile(this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, { damage: this.damage, color: this.color, radius: this.radius, isPlayer: true, type: this.type, pierce: this.pierce, life: this.life });
              p._arsenalChild = true; engine.projectiles.push(p);
            }
            rotate(this, first);
          }
          if (o.accel) this._cap = Math.hypot(this.vx, this.vy) * 3;
        }
      }
      if (o && (o.seek || o.accel)) {
        if (o.seek && typeof engine !== 'undefined') {
          if ((!this._tgt || this._tgt.hp <= 0) && (this.age % 6 === 0)) {
            let best = null, bd = 900;
            for (const e of engine.enemies) { const d = Math.hypot(e.x - this.x, e.y - this.y); if (d < bd && e.hp > 0) { bd = d; best = e; } }
            this._tgt = best;
          }
          if (this._tgt && this._tgt.hp > 0) {
            const a = Math.atan2(this.vy, this.vx), d = Math.atan2(this._tgt.y - this.y, this._tgt.x - this.x) - a;
            rotate(this, Math.max(-o.seek, Math.min(o.seek, Math.atan2(Math.sin(d), Math.cos(d)))));
          }
        }
        if (o.accel && this._cap) { const s = Math.hypot(this.vx, this.vy), k = Math.min(this._cap, s * o.accel) / (s || 1); this.vx *= k; this.vy *= k; }
      }
      return update.call(this, targets);
    };

    /* looks: one silhouette per family; enemy shots keep the classic orb */
    const draw = Projectile.prototype.draw;
    Projectile.prototype.draw = function (ctx, camera) {
      const g = this.isPlayer ? GUNS[this.type] : null;
      if (!g) return draw.call(this, ctx, camera);
      const x = this.x - camera.x, y = this.y - camera.y, r = this.radius, c = this.color, vx = this.vx, vy = this.vy;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = c; ctx.fillStyle = c;
      if (g.family === 'kinetic') {
        ctx.globalAlpha = .5; ctx.lineWidth = r * 1.1; line(ctx, x, y, x - vx * .7, y - vy * .7);
        ctx.globalAlpha = 1; dot(ctx, x, y, r * .85); ctx.fillStyle = '#fff'; dot(ctx, x, y, r * .35);
      } else if (g.family === 'rail') {
        ctx.globalAlpha = .3; ctx.lineWidth = r * 2.2; line(ctx, x, y, x - vx * 1.6, y - vy * 1.6);
        ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * .55); line(ctx, x, y, x - vx * 1.2, y - vy * 1.2);
      } else if (g.family === 'beam') {
        ctx.globalAlpha = .35; ctx.lineWidth = r * 2.6; line(ctx, x, y, x - vx * .9, y - vy * .9);
        ctx.globalAlpha = 1; ctx.lineWidth = r; line(ctx, x, y, x - vx * .8, y - vy * .8);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r * .35; line(ctx, x, y, x - vx * .6, y - vy * .6);
      } else if (g.family === 'missile') {
        const L = r * 2.6, flame = L * (1.1 + Math.random() * .7);
        ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx));
        ctx.globalAlpha = .85; ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-L * .5, -r * .45); ctx.lineTo(-flame, 0); ctx.lineTo(-L * .5, r * .45); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.fillRect(-L * .5, -r * .45, L, r * .9);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(L * .5, -r * .45); ctx.lineTo(L * .85, 0); ctx.lineTo(L * .5, r * .45); ctx.fill();
      } else {
        ctx.fillStyle = '#2a1a14'; dot(ctx, x, y, r * 1.1); ctx.fillStyle = c; dot(ctx, x, y, r * .85);
        ctx.globalAlpha = .3 + .25 * Math.sin(this.age * .4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    };

    /* sound: a family voice per gun, falling back to whatever played before */
    if (typeof soundEngine !== 'undefined') {
      soundEngine.extraVoices = soundEngine.extraVoices || {};
      for (const [id, g] of Object.entries(GUNS)) { const v = VOICE[g.family]; soundEngine.extraVoices['w:' + id] = [v[0] * PITCH[g.c], v[1] * PITCH[g.c], v[2] * LEN[g.c], v[3] * VOL[g.c], v[4], v[5]]; }
      soundEngine.extraVoices['shield-break'] = [600, 90, .4, .12, 'sawtooth', .18];
      soundEngine.extraVoices['shield-up'] = [300, 900, .35, .05, 'sine', 0];
      const shot = soundEngine.playWeaponShot.bind(soundEngine);
      soundEngine.playWeaponShot = (type, position) => GUNS[type] && soundEngine.voice ? soundEngine.voice('w:' + type, Number.isFinite(position?.x) && Number.isFinite(position?.y) ? position : null) : shot(type, position);
    }
    const voice = (k, at) => { if (typeof soundEngine !== 'undefined' && soundEngine.voice) soundEngine.voice(k, at); };

    /* mastery: kill XP goes to the families fitted on the flying ship; fire rate through the one interval path */
    const kill = engine.killEnemy.bind(engine);
    engine.killEnemy = (j, ...rest) => { const e = engine.enemies[j]; if (e && !e._arsenalXp) { e._arsenalXp = true; mastery.gain(6 + (Number(e.maxHp) || 0) / 15); } return kill(j, ...rest); };
    const interval = hardpoints._intervalFor.bind(hardpoints);
    hardpoints._intervalFor = (player, t) => { const v = interval(player, t), f = player === engine.player ? GUNS[t?.weapon]?.family : null; return f ? Math.max(1, Math.round(v * mastery.rate(f))) : v; };

    /* shields: pools refill after a quiet spell; the membrane ability stacks on top of the pool */
    let frame = 0, lastHit = -9999;
    const take = engine.playerTakeDamage.bind(engine);
    engine.playerTakeDamage = (...args) => {
      const p = engine.player, before = p.shieldHp || 0, result = take(...args);
      if ((p.shieldHp || 0) < before) { lastHit = frame; if (p.shieldHp <= 0) { voice('shield-break', p); particleSystem.spawnBubbleBurst(p.x, p.y, '#00f3ff', 22); } }
      return result;
    };
    const trigger = engine.triggerSecondaryAbility.bind(engine);
    engine.triggerSecondaryAbility = (...args) => {
      const p = engine.player, before = p.shieldHp || 0, cd = p.secCooldownTimer, result = trigger(...args);
      if (p.secAbility === 'shield' && cd <= 0 && p.secCooldownTimer > 0) p.shieldHp = before + 80;
      return result;
    };
    const tick = engine.update.bind(engine);
    engine.update = (...args) => {
      const result = tick(...args), p = engine.player;
      if (!engine.paused && !p.dead) {
        frame++;
        const s = shields.profile(p.nodes); p.maxShield = s.pool;
        if (s.pool && frame - lastHit > s.delay && (p.shieldHp || 0) < s.pool) {
          if ((p.shieldHp || 0) <= 0) voice('shield-up', p);
          p.shieldHp = Math.min(s.pool, (p.shieldHp || 0) + s.rate / 60);
        }
      }
      return result;
    };
    ready = true;
  }
  if (document.readyState === 'complete') setTimeout(install, 0); else window.addEventListener('load', () => setTimeout(install, 0));
})();
