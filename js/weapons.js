/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Weapon Arsenal & Secondary Abilities (Optimized)
   13 Primary Weapons (2.6.0 armoury), 5 Secondary Actives & Fast Drones/Mines
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
    this.age = 0;
  }

  update(targets = []) {
    const steer = this.type === 'homing' ? 0.18 : 0;
    if (steer && this.target && this.target.hp > 0) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const speed = Math.hypot(this.vx, this.vy);
        this.vx += (dx / dist * speed - this.vx) * steer;
        this.vy += (dy / dist * speed - this.vy) * steer;
      }
    }

    /* 2.6.0 THE ARMOURY: flight behaviours. Each one changes only how the shot
       MOVES, so hits, pierce and quirks keep running through the engine's one path. */
    this.age++;
    if (this.type === 'wave') {
      // Weaves across its own line: the lateral swing integrates to ~30 px either side.
      if (!this.base) this.base = { vx: this.vx, vy: this.vy };
      const w = Math.cos(this.age * 0.3) * 0.28;
      this.vx = this.base.vx - this.base.vy * w;
      this.vy = this.base.vy + this.base.vx * w;
    } else if (this.type === 'boomerang' && this.isPlayer) {
      if (!this.cap) this.cap = Math.hypot(this.vx, this.vy);
      if (this.age <= 26) { this.vx *= 0.95; this.vy *= 0.95; }
      else if (typeof engine !== 'undefined' && engine.player) {
        // The return leg is a fresh pass: every enemy can be hit once more on the way home.
        if (!this.back) { this.back = true; this.hitOnce = new WeakSet(); }
        const dx = engine.player.x - this.x, dy = engine.player.y - this.y, d = Math.hypot(dx, dy) || 1;
        this.vx += dx / d * 1.6; this.vy += dy / d * 1.6;
        const sp = Math.hypot(this.vx, this.vy); if (sp > this.cap) { this.vx *= this.cap / sp; this.vy *= this.cap / sp; }
        if (d < 36) this.life = 0;
      }
    } else if (this.type === 'torpedo') {
      /* It TURNS its nose (0.05 rad/frame) instead of blending velocity: a blend toward
         a target behind it cancelled speed faster than the burn added it, and it crawled. */
      if (!this.cap) this.cap = Math.hypot(this.vx, this.vy) * 3.5;
      let a = Math.atan2(this.vy, this.vx);
      if (this.target && this.target.hp > 0) {
        const d = Math.atan2(this.target.y - this.y, this.target.x - this.x) - a;
        a += Math.max(-0.05, Math.min(0.05, Math.atan2(Math.sin(d), Math.cos(d))));
      }
      const sp = Math.min(this.cap, Math.hypot(this.vx, this.vy) * 1.07);
      this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
    } else if (this.type === 'cluster' && this.age >= 24) {
      this.burst();
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

  /* Cluster shell: eight shards in a ring, on impact or on its own timer. */
  burst() {
    if (this.spent) return;
    this.spent = true; this.life = 0;
    if (typeof engine === 'undefined') return;
    const sp = weaponSpeed('spitter') * 0.75;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + this.age * 0.1;
      engine.projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * sp, Math.sin(a) * sp,
        { color: this.color, damage: this.damage * 0.4, radius: 4, isPlayer: this.isPlayer, type: 'shard', life: 26 }));
    }
    if (typeof particleSystem !== 'undefined') particleSystem.spawnSpark(this.x, this.y, this.color);
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

/* 2.6.0 THE ARMOURY. Mac: "thers honestly a pathetic number of weapons."
   The mount's radius still picks the weapon CLASS (fleet.js MOUNT_LADDER); each
   class now offers two or three weapons, chosen per gun in the shipyard. Inside
   a class the single-target damage per frame stays close (THE FLAT LADDER): the
   choice is a ROLE, not a power upgrade. */
// Display titles were renamed from the bubble-era set (Mac, 2026-10-30): ids are unchanged, so saves and fittings keep working.
const WEAPON_TYPES = {
  spitter: { title: 'Spitter autogun', damage: 20, fireRate: 10, speed: 14, radius: 6, blurb: 'Steady all-rounder.' },
  twin: { title: 'Twin cannon', damage: 16, fireRate: 12, speed: 13, radius: 6, blurb: 'Two shots in a V.' },
  mortar: { title: 'Triple mortar', damage: 25, fireRate: 18, speed: 10, radius: 9, blurb: 'Three heavy shells in a fan.' },
  laser: { title: 'Bolt laser', damage: 12, fireRate: 4, speed: 20, radius: 4, blurb: 'Fast, rapid tendril bolts.' },
  homing: { title: 'Homing Spore Array', damage: 26, fireRate: 16, speed: 9, radius: 7, blurb: 'Spores that chase the nearest enemy.' },
  railgun: { title: 'Needle railgun', damage: 50, fireRate: 25, speed: 26, radius: 5, blurb: 'Very fast needle that pierces.' },
  needler: { title: 'Needle Stream', damage: 7, fireRate: 4, speed: 22, radius: 3, blurb: 'A hail of tiny, very fast needles.' },
  flak: { title: 'Flak Burst', damage: 6, fireRate: 14, speed: 12, radius: 4, blurb: 'Five pellets. Brutal up close, spent by mid range.' },
  wave: { title: 'Wave emitter', damage: 20, fireRate: 10, speed: 13, radius: 7, blurb: 'A weaving bolt that passes through up to 3 enemies.' },
  boomerang: { title: 'Boomerang driver', damage: 26, fireRate: 22, speed: 14, radius: 9, blurb: 'Flies out, slows, comes back. Hits each enemy going and coming.' },
  torpedo: { title: 'Heavy torpedo', damage: 60, fireRate: 32, speed: 6, radius: 10, blurb: 'Launches slow, then accelerates and leans toward a target.' },
  lance: { title: 'Siege lance', damage: 42, fireRate: 28, speed: 22, radius: 10, blurb: 'A wide bolt that runs through up to 8 enemies.' },
  cluster: { title: 'Cluster bombard', damage: 40, fireRate: 30, speed: 11, radius: 9, blurb: 'A shell that bursts into 8 shards on impact or after a moment.' }
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
  railgun: 3.6,   // the fast one. ⚠ ~65 px/frame at topSpeed 18 — needs swept collision
  needler: 3.0,   // fast and light
  flak:    1.7,   // with life 11 it reaches only ~340 px: a close-range weapon by construction
  wave:    1.8,
  boomerang: 2.0, // decays on the way out, so the real range is set by its turn, not its speed
  torpedo: 0.9,   // LAUNCH speed, deliberately slower than you; it accelerates to 3.5x
  lance:   3.0,
  cluster: 1.6
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
