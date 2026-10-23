/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Weapon Arsenal & Secondary Abilities (Optimized)
   High-FPS 6 Primary Weapons, 5 Secondary Actives & Fast Drones/Mines
   ========================================================================== */

class Projectile {
  constructor(x, y, vx, vy, options = {}) {
    this.x = x;
    this.y = y;
    /* Previous position, for swept collision. A projectile moving faster than
       its own diameter can pass a target completely between two frames, so the
       hit test walks the SEGMENT it travelled, never just its end point. */
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = options.radius || 6;
    this.damage = options.damage || 18;
    this.color = options.color || '#00f3ff';
    this.isPlayer = options.isPlayer !== undefined ? options.isPlayer : true;
    this.type = options.type || 'spitter';
    this.life = options.life || 110;
    this.target = options.target || null;
    this.pierce = options.pierce || 1;
  }

  update(targets = []) {
    if (this.type === 'homing' && this.target && this.target.hp > 0) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const speed = Math.hypot(this.vx, this.vy);
        this.vx += (dx / dist * speed - this.vx) * 0.18;
        this.vy += (dy / dist * speed - this.vy) * 0.18;
      }
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    if (Math.random() < 0.25) {
      particleSystem.spawnTrail(this.x, this.y, this.color, this.radius * 0.5);
    }
  }

  /* Swept hit test: closest approach of THIS FRAME'S TRAVEL SEGMENT to a circle.
     ⛔ A point-distance test only asks "where did it land", which silently
     misses every target the bullet flew straight through. At 18 px/frame that
     was survivable; at the ratio speeds below a railgun covers ~65 px in a
     frame and would phase through a 30 px enemy about half the time. */
  hits(cx, cy, r) {
    const reach = this.radius + r;
    const sx = this.prevX, sy = this.prevY;
    const dx = this.x - sx, dy = this.y - sy;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(cx - this.x, cy - this.y) < reach;
    let t = ((cx - sx) * dx + (cy - sy) * dy) / len2;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return Math.hypot(cx - (sx + dx * t), cy - (sy + dy * t)) < reach;
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    // Glowing Outer Ring
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(')', ', 0.25)').replace('rgb', 'rgba');
    ctx.fill();

    // Bullet Core
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Hot Core Highlight
    ctx.beginPath();
    ctx.arc(screenX - this.radius * 0.25, screenY - this.radius * 0.25, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}

class BioMine {
  constructor(x, y, color = '#ffb703') {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.color = color;
    this.life = 450;
    this.pulse = 0;
  }

  update() {
    this.life--;
    this.pulse += 0.08;
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    const r = this.radius + Math.sin(this.pulse) * 2.5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 183, 3, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screenX, screenY, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3366';
    ctx.fill();
    ctx.restore();
  }
}

class MitosisDrone {
  constructor(owner) {
    this.owner = owner;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = 65;
    this.radius = 10;
    this.color = '#39ff14';
    this.shootTimer = 0;
  }

  update(projectiles, targets) {
    this.orbitAngle += 0.05;
    this.x = this.owner.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = this.owner.y + Math.sin(this.orbitAngle) * this.orbitRadius;

    if (this.shootTimer > 0) this.shootTimer--;

    if (this.shootTimer === 0 && targets.length > 0) {
      let nearest = null;
      let minDist = 500;
      targets.forEach(t => {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = t;
        }
      });

      if (nearest) {
        const angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(angle) * weaponSpeed('spitter') * 0.8,
          Math.sin(angle) * weaponSpeed('spitter') * 0.8,
          { color: this.color, damage: 14, isPlayer: true }
        ));
        this.shootTimer = 35;
      }
    }
  }

  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

const WEAPON_TYPES = {
  spitter: { title: 'Bubble Spitter', damage: 20, fireRate: 10, speed: 14, radius: 6 },
  twin: { title: 'Twin Splitter', damage: 16, fireRate: 12, speed: 13, radius: 6 },
  mortar: { title: 'Tri-Spread Mortar', damage: 25, fireRate: 18, speed: 10, radius: 9 },
  laser: { title: 'Bio-Laser Tendril', damage: 12, fireRate: 4, speed: 20, radius: 4 },
  homing: { title: 'Homing Spore Array', damage: 26, fireRate: 16, speed: 9, radius: 7 },
  railgun: { title: 'Bio-Needle Railgun', damage: 50, fireRate: 25, speed: 26, radius: 5 }
};

/* ==========================================================================
   PROJECTILE SPEED IS A RATIO OF THE PLAYER'S TOP SPEED, NOT A CONSTANT
   --------------------------------------------------------------------------
   Mac, 2026-08-16, after raising the movement dial: *"the projectile speed
   feels sluggish, movement feels good."*

   🔴 MEASURED at the default topSpeed of 18, FOUR OF THE SIX WEAPONS WERE
   SLOWER THAN THE PLAYER — homing 9 (0.50x), mortar 10 (0.56x), twin 13
   (0.72x), spitter 14 (0.78x). You outran your own ammunition. The old ship
   topped out at 8.43 (see js/feel.js), and against THAT every weapon outran
   the player comfortably. Nothing about the weapons changed.

   ⭐ **RAISING THE PLAYER'S SPEED SILENTLY INVERTED EVERY RELATIONSHIP TUNED
      AGAINST IT.** An absolute constant is a hidden ratio to whatever it was
      balanced against. The dial did not break the weapons; it revealed that
      their speeds were never independent numbers in the first place.

   So the ratio is the real design value and it is what is stored here. The
   dial now moves the whole fight together instead of tearing it apart.
   ========================================================================== */
const WEAPON_SPEED_RATIO = {
  spitter: 2.2,   // standard: clearly outruns you
  twin:    2.0,   // slightly slower, fires two
  mortar:  1.6,   // lobbed AoE — deliberately laggy, but never slower than you
  laser:   2.8,   // fast piercing line
  homing:  1.5,   // slow because it TRACKS; speed is not its job
  railgun: 3.6    // the fast one. ⚠ ~65 px/frame at topSpeed 18 — needs swept collision
};

function weaponSpeed(type) {
  const dial = (typeof movementFeel !== 'undefined' && movementFeel && movementFeel.topSpeed)
    ? movementFeel.topSpeed
    : 18;
  const ratio = WEAPON_SPEED_RATIO[type] || 2.0;
  return dial * ratio;
}

const SECONDARY_ABILITIES = {
  shield: { title: 'Force Membrane Shield', cd: 160, icon: '🛡️' },
  emp: { title: 'Bio-Electric EMP', cd: 180, icon: '⚡' },
  dash: { title: 'Hydro-Dash Burst', cd: 75, icon: '💨' },
  drone: { title: 'Mitosis Drone Pod', cd: 260, icon: '🦠' },
  mine: { title: 'Bio-Mine Layer', cd: 100, icon: '💣' }
};
