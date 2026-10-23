/* ==========================================================================
   B11 · THE LOOK. Mac, 2026-10-23: "work on the engine so it feels visually
   appealing." The world was a flat navy fill under a 4%-alpha circle grid,
   bullets were flat dots (their "glow" ring only worked for rgb() colours and
   every bullet is hex), and nothing emitted light. This layer gives the abyss
   depth and makes every source of danger and reward glow.
   ⚡ Everything costly is painted ONCE into cached canvases (the same law
   shaders.js learned: per-frame gradients cost real ms). Per frame it is blits.
   Seams only, and an art pack (packRenderer.active) keeps the legacy ocean.
     · backdrop: gradient ground + nebula (0.12) + far dust (0.35) + near
       flecks and current lines (0.7) parallax, all seamless tiles
     · additive glow under every ship membrane
     · bullets: glow sprite + motion streak + hot core, culled off-screen
     · particles drawn additive; kill flash; player engine wake
   ========================================================================== */
(() => {
  const TAU = Math.PI * 2;
  /* Every layer is a switch: `look.cfg.dust = false` in the console, for A/B and for slow machines. */
  const look = window.look = { cfg: { backdrop: true, nebula: true, dust: true, shipGlow: true, bullets: true, additive: true } };
  const packActive = () => typeof packRenderer !== 'undefined' && packRenderer && packRenderer.active;

  /* Soft glow sprite for ANY css colour: fill the colour, then mask it with a
     white radial falloff (destination-in), so hex, rgb and rgba all work. */
  const glows = new Map();
  function glow(color) {
    let c = glows.get(color);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'destination-in';
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,0.9)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    if (glows.size > 48) glows.delete(glows.keys().next().value);
    glows.set(color, c);
    return c;
  }

  /* ── backdrop tiles (painted once) ─────────────────────────────────────── */
  let rng = 7;
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
  function tile(size, paint) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size);
    return c;
  }
  /* Draw at (x,y) and at every wrapped copy so the tile edges are seamless. */
  function wrapped(size, x, y, r, f) {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const px = x + ox, py = y + oy;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      f(px, py);
    }
  }
  const NEBULA = [[22, 96, 118], [66, 38, 120], [18, 44, 104], [12, 80, 92], [112, 62, 34]];
  const nebula = tile(1024, (g, S) => {
    for (let i = 0; i < 18; i++) {
      const x = rand() * S, y = rand() * S, r = 140 + rand() * 300;
      const [R, G, B] = NEBULA[i === 7 || i === 13 ? 4 : (rand() * 4) | 0];
      const a = 0.1 + rand() * 0.14;
      wrapped(S, x, y, r, (px, py) => {
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, `rgba(${R},${G},${B},${a})`);
        gr.addColorStop(0.55, `rgba(${R},${G},${B},${a * 0.4})`);
        gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
        g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
  });
  /* Dust is a POINT FIELD, not a tile: a full-screen blit of mostly-empty
     pixels cost ~5 ms each on a software canvas (MEASURED: three tiled layers
     took p50 17 → 65 ms headless). Points cost only the pixels they light. */
  const far = [], near = [], lines = [];
  for (let i = 0; i < 110; i++) far.push({ x: rand() * 1200, y: rand() * 1200, s: rand() < 0.85 ? 1.2 : 2.2,
    c: `rgba(${rand() < 0.3 ? '180,220,255' : '120,200,210'},${(0.16 + rand() * 0.34).toFixed(2)})` });
  for (let i = 0; i < 22; i++) near.push({ x: rand() * 1400, y: rand() * 1400, r: 5 + rand() * 9, a: 0.25 + rand() * 0.35 });
  for (let i = 0; i < 8; i++) lines.push({ x: rand() * 1400, y: rand() * 1400, len: 70 + rand() * 170, ang: -0.35 + rand() * 0.2, a: 0.05 + rand() * 0.05 });
  const fleck = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(220,250,255,1)'); gr.addColorStop(0.25, 'rgba(130,225,245,0.35)'); gr.addColorStop(1, 'rgba(130,225,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
  /* Visit every on-screen copy of a point in a wrapped field of size T. */
  function field(T, ox, oy, w, h, pts, f) {
    const bx = ((ox % T) + T) % T, by = ((oy % T) + T) % T;
    for (const p of pts) {
      let x0 = p.x - bx; if (x0 < -T) x0 += T;
      let y0 = p.y - by; if (y0 < -T) y0 += T;
      for (let x = x0 < -40 ? x0 + T : x0; x < w + 40; x += T)
        for (let y = y0 < -40 ? y0 + T : y0; y < h + 40; y += T) f(p, x, y);
    }
  }

  /* Far layer (gradient + nebula) is composited at HALF resolution into one
     canvas and re-painted only when its parallax offset moves a pixel; the
     main canvas pays a single upscaled blit, the same cost as the old fill. */
  const farC = document.createElement('canvas'), farG = farC.getContext('2d');
  let farKey = '';
  function layer(ctx, img, size, ox, oy, w, h) {
    const sx = -(((ox % size) + size) % size), sy = -(((oy % size) + size) % size);
    for (let x = sx; x < w; x += size) for (let y = sy; y < h; y += size) ctx.drawImage(img, x, y, size, size);
  }
  function drawBackdrop(ctx, camera) {
    const z = camera.zoom || 1, w = ctx.canvas.width / z, h = ctx.canvas.height / z;
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
    const nx = Math.round(camera.x * 0.06), ny = Math.round(camera.y * 0.06);
    const key = hw + 'x' + hh + ':' + nx + ',' + ny;
    if (key !== farKey) {
      if (farC.width !== hw || farC.height !== hh) { farC.width = hw; farC.height = hh; }
      farKey = key;
      const gr = farG.createLinearGradient(0, 0, hw * 0.3, hh);
      gr.addColorStop(0, '#061224'); gr.addColorStop(0.55, '#030a16'); gr.addColorStop(1, '#02050c');
      farG.fillStyle = gr; farG.fillRect(0, 0, hw, hh);
      if (look.cfg.nebula) layer(farG, nebula, 1024, nx, ny, hw, hh);
    }
    ctx.drawImage(farC, 0, 0, w, h);
    if (!look.cfg.dust) return;
    field(1200, camera.x * 0.35, camera.y * 0.35, w, h, far, (p, x, y) => { ctx.fillStyle = p.c; ctx.fillRect(x, y, p.s, p.s); });
    ctx.save();
    ctx.lineCap = 'round';
    field(1400, camera.x * 0.7, camera.y * 0.7, w, h, lines, (p, x, y) => {
      ctx.strokeStyle = `rgba(110,210,230,${p.a})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(p.ang) * p.len, y + Math.sin(p.ang) * p.len); ctx.stroke();
    });
    ctx.globalCompositeOperation = 'lighter';
    field(1400, camera.x * 0.7, camera.y * 0.7, w, h, near, (p, x, y) => { ctx.globalAlpha = p.a; ctx.drawImage(fleck, x - p.r, y - p.r, p.r * 2, p.r * 2); });
    ctx.restore();
  }

  /* ── bullets ───────────────────────────────────────────────────────────── */
  const baseProj = Projectile.prototype.draw;
  Projectile.prototype.draw = function (ctx, camera) {
    if (!look.cfg.bullets) return baseProj.call(this, ctx, camera);
    const sx = this.x - camera.x, sy = this.y - camera.y, r = this.radius;
    const zc = camera.zoom || 1, m = r * 5 + 60;
    if (sx < -m || sy < -m || sx > ctx.canvas.width / zc + m || sy > ctx.canvas.height / zc + m) return;
    const sp = Math.hypot(this.vx, this.vy), len = Math.min(sp * 2.4, 64);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const G = r * 4.4;
    ctx.globalAlpha = this.isPlayer ? 0.5 : 0.8;
    ctx.drawImage(glow(this.color), sx - G, sy - G, G * 2, G * 2);
    if (len > 5) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = this.color; ctx.lineWidth = r * 1.25; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - this.vx / sp * len, sy - this.vy / sp * len); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = this.color; ctx.fill();
    /* Enemy shots get a pale rim: danger must read on top of any glow. */
    if (!this.isPlayer) { ctx.lineWidth = 1.5 / zc; ctx.strokeStyle = 'rgba(255,240,235,0.85)'; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(sx, sy, r * 0.48, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  };

  /* ── particles: additive, plus the kill flash ─────────────────────────── */
  const basePart = Particle.prototype.draw;
  Particle.prototype.draw = function (ctx, camera) {
    if (this.alpha <= 0) return;
    if (!look.cfg.additive && this.type !== 'flash') return basePart.call(this, ctx, camera);
    ctx.globalCompositeOperation = 'lighter';
    if (this.type === 'flash') {
      const R = this.radius * (1.7 - this.alpha * 0.7);
      ctx.globalAlpha = Math.min(1, this.alpha);
      ctx.drawImage(glow(this.color), this.x - camera.x - R, this.y - camera.y - R, R * 2, R * 2);
    } else basePart.call(this, ctx, camera);
    ctx.globalCompositeOperation = 'source-over';
  };
  function push(p) { if (particleSystem.particles.length < MAX_PARTICLES) particleSystem.particles.push(p); }
  function flash(x, y, color, r) {
    push(new Particle(x, y, { vx: 1e-6, vy: 1e-6, radius: r, color, alpha: 1, decay: 0.07, type: 'flash' }));
    push(new Particle(x, y, { vx: 1e-6, vy: 1e-6, radius: r * 0.3, maxRadius: r * 1.3, color: '#ffffff', alpha: 0.7, decay: 0.05, type: 'ring' }));
  }

  look.glow = glow; look.flash = flash;

  function install() {
    /* backdrop */
    const baseOcean = fluidShader.drawParallaxOcean.bind(fluidShader);
    fluidShader.drawParallaxOcean = (ctx, camera) => packActive() || !look.cfg.backdrop ? baseOcean(ctx, camera) : drawBackdrop(ctx, camera);

    /* ship glow: light under the membrane, never on top of it */
    const baseMem = fluidShader.drawOrganismMembrane.bind(fluidShader);
    fluidShader.drawOrganismMembrane = (ctx, x, y, angle, cr, nodes, color, state) => {
      if (!packActive() && look.cfg.shipGlow) {
        const R = cr * 3.6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42;
        ctx.drawImage(glow(color || '#00f3ff'), x - R, y - R, R * 2, R * 2);
        ctx.restore();
      }
      return baseMem(ctx, x, y, angle, cr, nodes, color, state);
    };

    const baseKill = engine.killEnemy.bind(engine);
    engine.killEnemy = (i) => {
      const e = engine.enemies[i];
      if (e) flash(e.x, e.y, e.color, (e.coreRadius || 20) * (e.isBoss ? 7 : 4));
      return baseKill(i);
    };

    /* engine wake: a fading ribbon of light behind the hull under thrust */
    const baseUpdate = engine.update.bind(engine);
    let wakeT = 0;
    engine.update = (...a) => {
      const r = baseUpdate(...a);
      const P = engine.player;
      if (P && !P.dead) {
        const sp = Math.hypot(P.vx, P.vy);
        if (sp > 4 && (++wakeT & 1)) {
          const bx = P.x - P.vx / sp * P.coreRadius * 1.3, by = P.y - P.vy / sp * P.coreRadius * 1.3;
          push(new Particle(bx + (Math.random() - 0.5) * 6, by + (Math.random() - 0.5) * 6, {
            vx: -P.vx * 0.08 + (Math.random() - 0.5) * 0.6, vy: -P.vy * 0.08 + (Math.random() - 0.5) * 0.6,
            radius: 2.5 + Math.random() * 2.5, color: P.color || '#5ef2e0', alpha: 0.55, decay: 0.03, friction: 0.94, type: 'trail'
          }));
        }
      }
      return r;
    };
  }

  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
