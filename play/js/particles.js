/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Particle System
   Handles fluid background floaters, bubble bursts, shockwaves & light particles
   ========================================================================== */

class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 2;
    this.vy = options.vy || (Math.random() - 0.5) * 2;
    this.radius = options.radius || Math.random() * 4 + 2;
    this.color = options.color || '#00f3ff';
    this.alpha = options.alpha !== undefined ? options.alpha : 1;
    this.decay = options.decay || 0.02;
    this.friction = options.friction || 0.98;
    this.type = options.type || 'bubble'; // 'bubble', 'trail', 'ring', 'spore'
    this.maxRadius = options.maxRadius || this.radius * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.friction;
    this.vy *= this.friction;

    if (this.type === 'ring') {
      this.radius += (this.maxRadius - this.radius) * 0.15;
    }

    this.alpha -= this.decay;
  }

  draw(ctx, camera) {
    if (this.alpha <= 0) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    /* Cull against the VISIBLE WORLD (zoom-aware), as drawAmbient does. */
    const zc = (camera && camera.zoom) || 1;
    const r = this.radius + 4;
    if (screenX < -r || screenX > ctx.canvas.width / zc + r ||
        screenY < -r || screenY > ctx.canvas.height / zc + r) return;

    /* ⚡ NO save()/restore() PER PARTICLE, NO shadowBlur, NO PER-FRAME GRADIENT.
       ~500 live particles did all three every frame (profile-fps.mjs, 2026-10-23).
       The caller (ParticleSystem.draw) resets globalAlpha once after the loop. */
    ctx.globalAlpha = Math.max(0, this.alpha);

    if (this.type === 'ring') {
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === 'trail' || this.type === 'spore') {
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    } else {
      // Bubble with radial highlight — drawn from a cached sprite per colour.
      const d = this.radius * 2;
      ctx.drawImage(bubbleSprite(this.color), screenX - this.radius, screenY - this.radius, d, d);
    }
  }
}

let MAX_PARTICLES = 200;   /* Settings → Graphics sets this */
const _bubbleSprites = new Map();
function bubbleSprite(color) {
  let c = _bubbleSprites.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const R = 30;
  g.beginPath();
  g.arc(32, 32, R, 0, Math.PI * 2);
  const grad = g.createRadialGradient(32 - R * 0.3, 32 - R * 0.3, 2, 32, 32, R);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.stroke();
  _bubbleSprites.set(color, c);
  return c;
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ambientSpores = [];
    this.initAmbientSpores();
  }

  initAmbientSpores(count = 80) {
    this.ambientSpores = [];
    for (let i = 0; i < count; i++) {
      this.ambientSpores.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? '#00f3ff' : '#39ff14',
        alpha: Math.random() * 0.5 + 0.1,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseAngle: Math.random() * Math.PI * 2
      });
    }
  }

  spawnBubbleBurst(x, y, color = '#00f3ff', count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 2;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 6 + 3,
        color: color,
        decay: Math.random() * 0.02 + 0.015,
        type: 'bubble'
      }));
    }

    // Expanding shockwave ring
    this.particles.push(new Particle(x, y, {
      vx: 0,
      vy: 0,
      radius: 6,
      maxRadius: 50 + Math.random() * 20,
      color: color,
      decay: 0.04,
      type: 'ring'
    }));
    this._cap();
  }

  /* B2 impact spark: a few short-lived chips in the shot's own colour. */
  spawnSpark(x, y, color = '#ffffff', count = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * 5 + 2;
      this.particles.push(new Particle(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        radius: Math.random() * 2 + 1.5, color, decay: 0.07, type: 'trail' }));
    }
    this._cap();
  }

  /* Oldest particles go first when the pool is full. */
  _cap() {
    const over = this.particles.length - MAX_PARTICLES;
    if (over > 0) this.particles.splice(0, over);
  }

  spawnTrail(x, y, color = '#00f3ff', radius = 3) {
    this.particles.push(new Particle(x, y, {
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: radius,
      color: color,
      decay: 0.035,
      type: 'trail'
    }));
    this._cap();
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let spore of this.ambientSpores) {
      spore.x += spore.vx;
      spore.y += spore.vy;
      spore.pulseAngle += spore.pulseSpeed;
    }
  }

  drawAmbient(ctx, camera) {
    ctx.save();
    for (let spore of this.ambientSpores) {
      const screenX = spore.x - camera.x;
      const screenY = spore.y - camera.y;

      /* Cull against the VISIBLE WORLD, not the canvas — zoomed out, the
         canvas is smaller than what the player can see. */
      const zc = (camera && camera.zoom) || 1;
      if (screenX < -50 || screenX > ctx.canvas.width / zc + 50 ||
          screenY < -50 || screenY > ctx.canvas.height / zc + 50) continue;

      const currentAlpha = spore.alpha + Math.sin(spore.pulseAngle) * 0.2;
      ctx.globalAlpha = Math.max(0.05, Math.min(0.8, currentAlpha));

      ctx.beginPath();
      ctx.arc(screenX, screenY, spore.radius, 0, Math.PI * 2);
      ctx.fillStyle = spore.color;
      ctx.fill();
    }
    ctx.restore();
  }

  draw(ctx, camera) {
    for (let p of this.particles) {
      p.draw(ctx, camera);
    }
    ctx.globalAlpha = 1;
  }
}

const particleSystem = new ParticleSystem();
