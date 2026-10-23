/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Enemy AI & Boss Engine (Module 4)
   5 Enemy Archetypes & 4 Corner Mega Bosses with Multi-Phase Mechanics
   ========================================================================== */

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

    // AI Behavior by Archetype
    if (this.archetype === 'mote') {
      if (dist < 180) {
        this.vx -= (dx / dist) * 0.25;
        this.vy -= (dy / dist) * 0.25;
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
            Math.cos(this.angle) * 8,
            Math.sin(this.angle) * 8,
            { color: this.color, damage: 14, isPlayer: false, type: 'spitter' }
          ));
          this.shootTimer = 50;
        }
      }
    } else if (this.archetype === 'charger') {
      // Charge & ram player
      if (dist < 380) {
        this.vx += (dx / dist) * 0.85;
        this.vy += (dy / dist) * 0.85;
      }
    } else if (this.archetype === 'sniper') {
      if (dist < 350) {
        this.vx -= (dx / dist) * 0.5;
        this.vy -= (dy / dist) * 0.5;
      }
      if (this.shootTimer > 0) this.shootTimer--;
      if (this.shootTimer === 0 && dist < 650 && this.armed('cannon')) {
        projectiles.push(new Projectile(
          this.x + Math.cos(this.angle) * this.coreRadius,
          this.y + Math.sin(this.angle) * this.coreRadius,
          Math.cos(this.angle) * 18,
          Math.sin(this.angle) * 18,
          { color: '#bc13fe', damage: 32, radius: 8, isPlayer: false, type: 'railgun' }
        ));
        this.shootTimer = 75;
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
            Math.cos(finalAngle) * 9,
            Math.sin(finalAngle) * 9,
            { color: '#ff3366', damage: 20, isPlayer: false, type: 'mortar' }
          ));
        });
        this.shootTimer = this.phase === 2 ? 25 : 45;
      }
    }

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.x += this.vx;
    this.y += this.vy;
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
