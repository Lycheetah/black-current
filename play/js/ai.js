/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Enemy AI & Boss Engine (Module 4)
   5 Enemy Archetypes & 4 Corner Mega Bosses with Multi-Phase Mechanics
   ========================================================================== */

/* B7 THE HUNT: ENEMY PACE IS A RATIO OF THE PLAYER'S TOP SPEED.
   The same lesson weapons.js already learned (WEAPON_SPEED_RATIO): raising the
   movement dial to 18 left every enemy (terminal 5-14 px/frame) and every enemy
   shot (8-9) slower than the player. Nothing could reach you, so nothing mattered.
   At topSpeed 18 the pace is 2; at the old 8.43 it is 1 (unchanged). */
function enemyPace() {
  const t = (typeof movementFeel !== 'undefined' && movementFeel && movementFeel.topSpeed) || 18;
  return Math.max(1, Math.min(2.4, t / 9));
}

/* F2 GENTLE START: low tiers move, shoot and wind up slower, and only engage
   inside a range, so ring 1 comes at you a few at a time instead of the whole
   sector converging. Index = tier − 1; tier 4+ and bosses are full B7 pace.
   Dials, live in the console: GENTLE_PACE[0] = 0.5 makes danger 1 gentler still. */
const GENTLE_PACE = [0.74, 0.86, 0.94, 1];
const GENTLE_AGGRO = [1050, 1300, 1600];   // px; beyond the list = the whole sector
function enemyGentle(e) {
  if (e.isBoss) return 1;
  return GENTLE_PACE[Math.min(GENTLE_PACE.length - 1, Math.max(0, (e.tier || 1) - 1))];
}

class EnemyOrganism {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.tier = options.tier || 1;
    this.isBoss = options.isBoss || false;
    this.bossType = options.bossType || null;
    this.name = options.name || options.bossType || null;
    
    this.archetype = options.archetype || 'mote'; // 'mote', 'stalker', 'charger', 'sniper', 'hive'

    this.coreRadius = this.isBoss ? 48 : 16 + this.tier * 5;
    this.maxHp = this.isBoss ? 600 : 30 + this.tier * 35;
    this.hp = this.maxHp;
    this.shield = this.isBoss ? 200 : (this.tier >= 4 ? 50 : 0);
    this.maxShield = this.shield;
    if (this.archetype === 'outpost') {
      this.coreRadius = 58;
      this.maxHp = this.hp = 650 + this.tier * 150;
      this.shield = this.maxShield = 120;
    }

    this.color = this.getArchetypeColor();
    this.shootTimer = 0;
    this.actionTimer = 0;
    this.phase = 1;

    this.nodes = [];
    this.setupNodes();
  }

  getArchetypeColor() {
    if (this.isBoss) return '#ff3366';
    switch (this.archetype) {
      case 'mote': return '#39ff14';
      case 'stalker': return '#00f3ff';
      case 'charger': return '#ffb703';
      case 'sniper': return '#bc13fe';
      case 'hive': return '#ff3366';
      case 'outpost': return '#ff8c42';
      default: return '#39ff14';
    }
  }

  setupNodes() {
    this.nodes = [{ currentDx: 0, currentDy: 0, radius: this.coreRadius, type: 'core' }];

    if (this.archetype === 'stalker' || this.archetype === 'sniper' || this.isBoss) {
      const count = this.isBoss ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const a = (i - (count - 1) / 2) * 0.5;
        this.nodes.push({
          currentDx: Math.cos(a) * (this.coreRadius + 12),
          currentDy: Math.sin(a) * (this.coreRadius + 12),
          radius: 11,
          type: 'cannon'
        });
      }
    }

    if (this.archetype === 'charger') {
      [-0.4, 0.4].forEach(a => {
        this.nodes.push({
          currentDx: Math.cos(a) * (this.coreRadius + 10),
          currentDy: Math.sin(a) * (this.coreRadius + 10),
          radius: 10,
          type: 'spike'
        });
      });
    }
    if (this.archetype === 'outpost') {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        this.nodes.push({
          currentDx: Math.cos(a) * (this.coreRadius + 16),
          currentDy: Math.sin(a) * (this.coreRadius + 16),
          radius: 14,
          type: 'cannon'
        });
      }
    }
  }

  /* B3: does a part of this type still hang on the hull? */
  armed(type) {
    for (const n of this.nodes) if (n.type === type && !n.lost) return true;
    return false;
  }

  takeDamage(amount) {
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    if (amount > 0) {
      this.hp -= amount;
      particleSystem.spawnBubbleBurst(this.x, this.y, this.color, 6);
    }
  }

  update(player, projectiles, enemyList) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.angle = Math.atan2(dy, dx);
    const gentle = enemyGentle(this);
    const pace = enemyPace() * gentle;

    /* F2: out of range and unprovoked, a low-tier ship drifts at its post. */
    if (!this._aggro) {
      const range = this.isBoss || this.hunting || this.archetype === 'outpost' ? Infinity
        : (GENTLE_AGGRO[(this.tier || 1) - 1] || Infinity);
      if (dist < range || this._hitAt) this._aggro = true;
      else {
        this.vx = (this.vx + (Math.random() - 0.5) * 0.2) * 0.94;
        this.vy = (this.vy + (Math.random() - 0.5) * 0.2) * 0.94;
        this.x += this.vx; this.y += this.vy;
        return;
      }
    }

    // AI Behavior by Archetype
    if (this.archetype === 'mote') {
      if (dist < 620) {
        /* B7: motes SWARM. They used to flee, which made the commonest enemy
           a thing you chased rather than a thing that pressed you. */
        const pull = dist > 90 ? 0.32 : -0.1;
        this.vx += (dx / dist) * pull + (Math.random() - 0.5) * 0.5;
        this.vy += (dy / dist) * pull + (Math.random() - 0.5) * 0.5;
      } else {
        this.vx += (Math.random() - 0.5) * 0.3;
        this.vy += (Math.random() - 0.5) * 0.3;
      }
    } else if (this.archetype === 'stalker') {
      // Circle strafe
      if (dist > 220) {
        this.vx += (dx / dist) * 0.45;
        this.vy += (dy / dist) * 0.45;
      }
      this.vx += Math.cos(this.angle + Math.PI / 2) * 0.3;
      this.vy += Math.sin(this.angle + Math.PI / 2) * 0.3;

      if (dist < 450 && this.armed('cannon')) {
        if (this.shootTimer > 0) this.shootTimer--;
        if (this.shootTimer === 0) {
          projectiles.push(new Projectile(
            this.x + Math.cos(this.angle) * this.coreRadius,
            this.y + Math.sin(this.angle) * this.coreRadius,
            Math.cos(this.angle) * 8 * pace,
            Math.sin(this.angle) * 8 * pace,
            { color: this.color, damage: 14, isPlayer: false, type: 'spitter' }
          ));
          this.shootTimer = Math.round(50 / gentle);
        }
      }
    } else if (this.archetype === 'charger') {
      /* B7: WIND-UP, THEN LUNGE. 34 frames of tell (it stops and swells), then a
         dash faster than you fly. Sidestep the tell and it overshoots. */
      if (this.chargeT > 0) {
        this.chargeT--;
        this.vx *= 0.8; this.vy *= 0.8;
        if (this.chargeT === 0) {
          this.vx = Math.cos(this.angle) * 13;
          this.vy = Math.sin(this.angle) * 13;
          this.actionTimer = 80;
        }
      } else {
        if (this.actionTimer > 0) this.actionTimer--;
        if (dist < 460 && this.actionTimer === 0) this.chargeT = this.chargeMax = Math.round(34 / gentle);
        else if (dist < 700) {
          this.vx += (dx / dist) * 0.35;
          this.vy += (dy / dist) * 0.35;
        }
      }
    } else if (this.archetype === 'sniper') {
      if (dist < 350) {
        this.vx -= (dx / dist) * 0.5;
        this.vy -= (dy / dist) * 0.5;
      }
      /* B7: THE SNIPER PAINTS YOU FIRST. A 40-frame laser tracks you, locks for
         the last 12, then a fast needle follows the locked line. Move on the lock. */
      if (this.shootTimer > 0) this.shootTimer--;
      if (this.aimT > 0) {
        this.aimT--;
        if (this.aimT > 12) this.aimA = this.angle;
        if (this.aimT === 0 && this.armed('cannon')) {
          projectiles.push(new Projectile(
            this.x + Math.cos(this.aimA) * this.coreRadius,
            this.y + Math.sin(this.aimA) * this.coreRadius,
            Math.cos(this.aimA) * 18 * pace,
            Math.sin(this.aimA) * 18 * pace,
            { color: '#bc13fe', damage: 32, radius: 8, isPlayer: false, type: 'railgun' }
          ));
        }
      } else if (this.shootTimer === 0 && dist < 650 && this.armed('cannon')) {
        this.aimT = 40; this.aimA = this.angle; this.shootTimer = Math.round(95 / gentle);
      }
    } else if (this.archetype === 'outpost') {
      /* B7: a PIRATE OUTPOST. Static and slowly turning; its ring of cannons fires
         in sequence with a little lead, and every gun you shoot off (B3 parts) is
         one fewer. It calls defenders while you are near. */
      this.vx = 0; this.vy = 0;
      this.spin = (this.spin || 0) + 0.005;
      this.angle = this.spin;
      if (dist < 820) {
        if (this.shootTimer > 0) this.shootTimer--;
        const guns = this.nodes.filter(n => n.type === 'cannon' && !n.lost);
        if (this.shootTimer === 0 && guns.length) {
          this.gunIdx = ((this.gunIdx || 0) + 1) % guns.length;
          const g = guns[this.gunIdx];
          const c = Math.cos(this.angle), s = Math.sin(this.angle);
          const gx = this.x + g.currentDx * c - g.currentDy * s;
          const gy = this.y + g.currentDx * s + g.currentDy * c;
          const spd = 7 * pace;
          const lead = Math.hypot(player.x - gx, player.y - gy) / spd * 0.5;
          const a = Math.atan2(player.y + (player.vy || 0) * lead - gy, player.x + (player.vx || 0) * lead - gx);
          projectiles.push(new Projectile(gx, gy, Math.cos(a) * spd, Math.sin(a) * spd,
            { color: this.color, damage: 9, isPlayer: false, type: 'spitter' }));
          this.shootTimer = Math.round(Math.max(12, 30 - guns.length * 3) / gentle);
        }
        if (this.actionTimer > 0) this.actionTimer--;
        if (this.actionTimer === 0) {
          if (enemyList.filter(e => e._home === this).length < 3) {
            const kid = new EnemyOrganism(
              this.x + (Math.random() - 0.5) * 90, this.y + (Math.random() - 0.5) * 90,
              { tier: Math.max(1, this.tier), archetype: Math.random() < 0.5 ? 'charger' : 'stalker' });
            kid._home = this; kid.hunting = true;
            enemyList.push(kid);
          }
          this.actionTimer = 360;
        }
      }
    } else if (this.archetype === 'hive') {
      if (dist > 300) {
        this.vx += (dx / dist) * 0.3;
        this.vy += (dy / dist) * 0.3;
      }
      if (this.actionTimer > 0) this.actionTimer--;
      if (this.actionTimer === 0 && enemyList.length < 12) {
        enemyList.push(new EnemyOrganism(
          this.x + (Math.random() - 0.5) * 40,
          this.y + (Math.random() - 0.5) * 40,
          { tier: 1, archetype: 'mote' }
        ));
        this.actionTimer = 180;
      }
    }

    // Boss Phase Logic
    if (this.isBoss) {
      if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
        this.phase = 2;
        particleSystem.spawnBubbleBurst(this.x, this.y, '#ff3366', 30);
      }

      if (this.shootTimer > 0) this.shootTimer--;
      if (this.shootTimer === 0 && this.armed('cannon')) {
        [-0.3, 0, 0.3].forEach(aOff => {
          const finalAngle = this.angle + aOff;
          projectiles.push(new Projectile(
            this.x + Math.cos(finalAngle) * this.coreRadius,
            this.y + Math.sin(finalAngle) * this.coreRadius,
            Math.cos(finalAngle) * 9 * pace,
            Math.sin(finalAngle) * 9 * pace,
            { color: '#ff3366', damage: 20, isPlayer: false, type: 'mortar' }
          ));
        });
        this.shootTimer = this.phase === 2 ? 25 : 45;
      }
    }

    /* B7: wings and outpost defenders come FOR you instead of idling at range. */
    if (this.hunting && dist > 420) {
      this.vx += (dx / dist) * 0.42;
      this.vy += (dy / dist) * 0.42;
    }

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.x += this.vx * pace;
    this.y += this.vy * pace;
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    /* Cull ships wholly off-screen (zoom-aware visible world, generous margin). */
    const zc = (camera && camera.zoom) || 1;
    const m = Math.max(400, this.coreRadius * 6);
    if (screenX < -m || screenX > ctx.canvas.width / zc + m ||
        screenY < -m || screenY > ctx.canvas.height / zc + m) return;

    fluidShader._lod = true;
    fluidShader.drawOrganismMembrane(
      ctx,
      screenX,
      screenY,
      this.angle,
      this.coreRadius,
      this.nodes,
      this.color
    );
    fluidShader._lod = false;

    // B2 hit flash
    const hf = this._hitAt ? 1 - (performance.now() - this._hitAt) / 120 : 0;
    if (hf > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${0.45 * hf})`;
      ctx.beginPath(); ctx.arc(screenX, screenY, this.coreRadius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // HP Bar for Bosses & Heavy Enemies
    if (this.isBoss || this.tier >= 3) {
      const hpPct = Math.max(0, this.hp / this.maxHp);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(screenX - 30, screenY - this.coreRadius - 16, 60, 6);
      ctx.fillStyle = this.color;
      ctx.fillRect(screenX - 30, screenY - this.coreRadius - 16, 60 * hpPct, 6);
      ctx.restore();
    }
  }
}
