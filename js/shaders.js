/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Optimized Shaders & Fluid Renderer
   High-FPS Spring-Damper Physics, Fast Membrane Shading & Sight Lighting
   ========================================================================== */

class SpringNode {
  constructor(localX, localY, radius, type = 'pod') {
    this.targetDx = localX;
    this.targetDy = localY;
    this.currentDx = localX;
    this.currentDy = localY;
    
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.type = type;

    this.stiffness = 0.22;
    this.damping = 0.78;
  }

  updateSpring(parentVx, parentVy, parentRotation) {
    this.vx -= parentVx * 0.18;
    this.vy -= parentVy * 0.18;

    const forceX = (this.targetDx - this.currentDx) * this.stiffness;
    const forceY = (this.targetDy - this.currentDy) * this.stiffness;

    this.vx += forceX;
    this.vy += forceY;

    this.vx *= this.damping;
    this.vy *= this.damping;

    this.currentDx += this.vx;
    this.currentDy += this.vy;
  }
}

class FluidShaderRenderer {
  constructor() {
    this.undulationTime = 0;

    /* ── FOG ──────────────────────────────────────────────────────────────
       Mac's playtest verdict, 2026-08-16: "the fog atm makes it almost
       impossible to see anything." He is the only instrument that can measure
       this, so it is now a dial he owns rather than a constant I guessed.

       Was 0.82 with the falloff only reaching 0.55 at three-quarters of the
       sight radius — meaning most of the screen sat under near-opaque mask.
       0.5 is a starting point, not an answer. `[` and `]` retune it live. */
    /* ⭐ MAC, 2026-10-23: *"increase circle you can see that darkness is lame
       asf and cheap."* The sandbox fog is now an EDGE VIGNETTE: the clear pool
       always reaches ~92% of the screen's half-diagonal (see
       drawLightingShader), so only the corners dim. Darkness as a mechanic
       belongs to the Black Sun March / Deep Current zones, not the sandbox
       (PLAN_WEEKEND_BLITZ_2026-10-23.md B0). New storage key so the old 0.5
       saved under the small-circle look cannot pin it. */
    this.fogDensity = 0.45;
    this.sightScale = 1.25;

    try {
      const saved = parseFloat(localStorage.getItem('biotank_forge_fog_v2'));
      if (!Number.isNaN(saved)) this.fogDensity = Math.min(0.95, Math.max(0, saved));
    } catch (e) { /* private mode — the default is fine */ }
  }

  setFog(v) {
    this.fogDensity = Math.min(0.95, Math.max(0, Math.round(v * 100) / 100));
    try { localStorage.setItem('biotank_forge_fog_v2', String(this.fogDensity)); } catch (e) {}
    return this.fogDensity;
  }

  update() {
    this.undulationTime += 0.05;
  }

  // Multi-layer Translucent Organic Membrane (GPU-accelerated without slow shadowBlur)
  drawOrganismMembrane(ctx, screenX, screenY, angle, coreRadius, nodes, glowColor = '#00f3ff', state = {}) {
    if (nodes && nodes.some(n => n.lost)) nodes = nodes.filter(n => !n.lost); // B3: lost parts leave the silhouette
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(angle);

    const undulate = Math.sin(this.undulationTime * 2) * 2;

    /* ── ART PACK SEAM ──────────────────────────────────────────────────
       An active pack replaces how each part is DRAWN. It never replaces the
       GEOMETRY: node positions, radii and the spring wobble below are engine
       truth and run identically either way. That is the whole safety property
       of this seam — switching packs cannot move a part, resize a hitbox, or
       change what the player collides with. Only the pixels change.

       Every pack call falls back to the legacy path when it returns false, so
       a pack that forgets a part renders the original bubble rather than a
       hole. `packRenderer` may not exist at all (script omitted) — hence the
       typeof guard rather than a truthiness check. */
    const pack = (typeof packRenderer !== 'undefined') ? packRenderer.active : null;
    const drawState = {
      undulation: this.undulationTime,
      firing: !!state.firing,
      thrusting: !!state.thrusting,
    };

    // Pass 1: Outer Bioluminescent Soft Membrane Halo
    /* Skipped under a pack: this halo is explicitly a bio-membrane, and a
       glowing organic bubble around a battleship reads as a rendering bug. A
       pack draws its own outline through its part silhouettes. */
    if (!pack) {
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius * 1.35 + undulate, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 243, 255, 0.06)';
      ctx.fill();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pass 2: Draw Attached Organelle Pods
    const conn = pack && pack.parts.core && pack.parts.core.connector;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === 'core') continue;

      const wobbleX = node.currentDx + Math.sin(this.undulationTime + i) * 1.2;
      const wobbleY = node.currentDy + Math.cos(this.undulationTime + i) * 1.2;

      // Membrane Connector Tendril to core (a "hull spar" under a ship pack)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(wobbleX, wobbleY);
      ctx.strokeStyle = conn ? conn.stroke : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = conn ? conn.width : 3;
      ctx.stroke();

      /* The pack gets first refusal on this part. Returning true means it drew
         the body AND its overlay, so the legacy block below is skipped whole. */
      if (pack && packRenderer.drawPart(ctx, node.type, wobbleX, wobbleY, node.radius, glowColor, drawState)) {
        continue;
      }

      /* Pod body: the gradient fill is a cached per-colour sprite (a fresh
         createRadialGradient per pod per ship per frame was a MEASURED cost,
         profile-fps.mjs 2026-10-23); only the outline stays live. */
      const pr = node.radius;
      ctx.drawImage(gradientDisc(glowColor, 0.35, 0.4, 'rgba(4, 12, 28, 0.8)'),
        wobbleX - pr, wobbleY - pr, pr * 2, pr * 2);
      ctx.beginPath();
      ctx.arc(wobbleX, wobbleY, pr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Weapon / Spike / Thruster Overlay
      if (node.type === 'spike') {
        ctx.beginPath();
        ctx.moveTo(wobbleX, wobbleY - node.radius * 1.5);
        ctx.lineTo(wobbleX - 5, wobbleY);
        ctx.lineTo(wobbleX + 5, wobbleY);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (node.type === 'cannon') {
        ctx.fillStyle = '#090d18';
        ctx.fillRect(wobbleX + node.radius * 0.2, wobbleY - 3, 11, 6);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wobbleX + node.radius * 0.2, wobbleY - 3, 11, 6);
      } else if (node.type === 'thruster') {
        ctx.beginPath();
        ctx.moveTo(wobbleX - node.radius * 0.8, wobbleY - 6);
        ctx.lineTo(wobbleX - node.radius * 1.4, wobbleY);
        ctx.lineTo(wobbleX - node.radius * 0.8, wobbleY + 6);
        ctx.closePath();
        ctx.fillStyle = '#39ff14';
        ctx.fill();
      }
    }

    /* Pass 3 + 4: Core Nucleus Membrane and its eye.
       A pack's `core` part owns both — its layers include whatever it uses for
       the eye — so these two legacy passes are skipped together or not at all.
       Splitting them would let a pack draw a hull with a bio-nucleus on top. */
    if (!(pack && packRenderer.drawPart(ctx, 'core', 0, 0, coreRadius, glowColor, drawState))) {
      // Pass 3: Core Nucleus Membrane (cached gradient disc, live outline)
      ctx.drawImage(gradientDisc(glowColor, 0.3, 0.35, 'rgba(2, 6, 16, 0.9)'),
        -coreRadius, -coreRadius, coreRadius * 2, coreRadius * 2);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pass 4: Inner Nucleus Eye
      ctx.beginPath();
      ctx.arc(coreRadius * 0.3, 0, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    ctx.restore();
  }

  // Fast Abyssal Sight Light-Radius Shader Pass
  drawLightingShader(lightCtx, screenX, screenY, radius = 420, pixelScale = 1) {
    const w = lightCtx.canvas.width;
    const h = lightCtx.canvas.height;

    /* ⚡ The light is pinned to the player's screen position, so most frames
       the inputs are identical. Repainting a full-screen clear + fill + gradient
       is MEASURED 14 ms/frame headless; skip it when nothing changed. */
    const fogKey = w + ',' + h + ',' + screenX.toFixed(1) + ',' + screenY.toFixed(1) + ',' +
      radius + ',' + this.sightScale + ',' + this.fogDensity + ',' + pixelScale + ',' +
      ((typeof packRenderer !== 'undefined') ? packRenderer.ambient('maskAlpha', null) : '');
    if (fogKey === this._fogKey) return;
    this._fogKey = fogKey;

    lightCtx.clearRect(0, 0, w, h);

    /* A pack may set its own `ambient.maskAlpha`, but the player's live dial
       always wins — being unable to see is a playability failure, and no art
       direction gets to override it. */
    const packAlpha = (typeof packRenderer !== 'undefined')
      ? packRenderer.ambient('maskAlpha', null) : null;
    const alpha = (packAlpha === null) ? this.fogDensity
      : Math.min(this.fogDensity, packAlpha);

    // Dark Ocean Ambient Mask
    // Black source-over provides the darkening directly, avoiding CSS's
    // full-screen multiply blend pass over the moving game canvas.
    lightCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    lightCtx.fillRect(0, 0, w, h);

    radius *= this.sightScale;
    /* Vignette floor: the clear pool never ends before ~92% of the half-diagonal,
       so sight upgrades still widen it but the sandbox is never a small circle. */
    radius = Math.max(radius, 0.92 * Math.hypot(w, h) / 2);

    // Cutout Light Cone
    lightCtx.save();
    lightCtx.globalCompositeOperation = 'destination-out';

    const lightGrad = lightCtx.createRadialGradient(
      screenX, screenY, 60 * pixelScale,
      screenX, screenY, radius
    );
    /* The old middle stop cleared only 55% of the mask at 0.75 of the radius,
       so the ring where enemies actually approach stayed the murkiest part of
       the screen. Holding it near-full until 0.8 keeps the pool of light
       genuinely clear and pushes the falloff out to the rim. */
    lightGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    lightGrad.addColorStop(0.62, 'rgba(0, 0, 0, 1)');
    lightGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.7)');
    lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    lightCtx.beginPath();
    lightCtx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    lightCtx.fillStyle = lightGrad;
    lightCtx.fill();

    lightCtx.restore();
  }

  /* ── THE SPECTRAL BLACK SUN ───────────────────────────────────────────
     Sovereign Eclipse canon (Naraka): "a luminous rim around a dark centre",
     "a horizon that watches back". The sandbox's sky omen, replacing darkness
     as atmosphere. Painted once into a cached canvas (gradients per frame cost
     real ms here), then one drawImage per frame in screen space. Parallax is
     tiny and wraps only while fully off-screen, so it never visibly jumps. */
  drawBlackSun(ctx, camera) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const R = Math.round(Math.min(W, H) * 0.085);
    const halo = Math.round(R * 2.8);
    if (!this._sun || this._sunR !== R) {
      const c = document.createElement('canvas');
      c.width = c.height = halo * 2;
      const g = c.getContext('2d');
      const corona = g.createRadialGradient(halo, halo, R * 0.9, halo, halo, halo);
      corona.addColorStop(0, 'rgba(255, 196, 140, 0.30)');
      corona.addColorStop(0.18, 'rgba(176, 110, 255, 0.14)');
      corona.addColorStop(0.5, 'rgba(60, 200, 255, 0.05)');
      corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = corona; g.fillRect(0, 0, halo * 2, halo * 2);
      const rim = g.createRadialGradient(halo, halo, R * 0.86, halo, halo, R * 1.06);
      rim.addColorStop(0, 'rgba(255, 236, 200, 0)');
      rim.addColorStop(0.55, 'rgba(255, 228, 186, 0.95)');
      rim.addColorStop(1, 'rgba(255, 170, 110, 0)');
      g.fillStyle = rim; g.beginPath(); g.arc(halo, halo, R * 1.06, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#010205'; g.beginPath(); g.arc(halo, halo, R * 0.9, 0, Math.PI * 2); g.fill();
      this._sun = c; this._sunR = R;
    }
    const span = W + halo * 2, spanY = H + halo * 2;
    const px = camera ? camera.x * 0.006 : 0, py = camera ? camera.y * 0.006 : 0;
    const sx = ((((W * 0.74 - px) + halo) % span) + span) % span - halo;
    const sy = ((((H * 0.26 - py) + halo) % spanY) + spanY) % spanY - halo;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.86 + 0.1 * Math.sin(performance.now() / 2400);
    ctx.drawImage(this._sun, sx - halo, sy - halo);
    ctx.restore();
  }

  // Fast Parallax Grid Ocean
  drawParallaxOcean(ctx, camera) {
    /* ⛔ At zoom 0.62 the visible world is 1/0.62 wider than the canvas. Using
       raw canvas dimensions here paints the ocean over the middle 62% only and
       leaves bare canvas around it. */
    const z = (camera && camera.zoom) || 1;
    const w = ctx.canvas.width / z;
    const h = ctx.canvas.height / z;

    // Deep Ocean Background — a pack may repaint the world it fights in
    const amb = (k, d) => (typeof packRenderer !== 'undefined') ? packRenderer.ambient(k, d) : d;
    ctx.fillStyle = amb('ground', '#030814');
    ctx.fillRect(0, 0, w, h);

    // Grid Cells
    ctx.save();
    const step = 160;
    const offsetX = (-camera.x * 0.35) % step;
    const offsetY = (-camera.y * 0.35) % step;

    ctx.strokeStyle = amb('gridStroke', 'rgba(0, 243, 255, 0.04)');
    ctx.lineWidth = 1;

    const cross = amb('gridShape', 'circle') === 'cross';

    /* One path, one stroke (was ~110 beginPath/stroke pairs per frame). */
    ctx.beginPath();
    for (let x = offsetX - step; x < w + step; x += step) {
      for (let y = offsetY - step; y < h + step; y += step) {
        if (cross) {
          ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
          ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
        } else {
          ctx.moveTo(x + 26, y);
          ctx.arc(x, y, 26, 0, Math.PI * 2);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

/* A radial-gradient disc (white highlight -> colour -> dark rim) rendered once
   per (colour, highlight offset, mid stop, rim) and drawn scaled. */
const _discCache = new Map();
function gradientDisc(color, off, mid, rim) {
  const key = color + '|' + off + '|' + mid + '|' + rim;
  let c = _discCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  const R = 48;
  const grad = g.createRadialGradient(R - R * off, R - R * off, 2, R, R, R);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(mid, color);
  grad.addColorStop(1, rim);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(R, R, R, 0, Math.PI * 2);
  g.fill();
  if (_discCache.size >= 64) _discCache.delete(_discCache.keys().next().value);
  _discCache.set(key, c);
  return c;
}

const fluidShader = new FluidShaderRenderer();

/* ── THE FOG DIAL ─────────────────────────────────────────────────────────
   `[` clears the fog, `]` thickens it. Persists immediately.
   This exists because visibility is a verdict only the person holding the
   screen can give, and shipping my guess as a constant is what caused the
   problem in the first place. `\` restores the original 0.82 for comparison. */
(function bindFogDial() {
  let el = null;
  const show = (text) => {
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:52px;left:50%;transform:translateX(-50%);'
        + 'padding:7px 14px;border-radius:3px;z-index:60;font:11px ui-monospace,Menlo,monospace;'
        + 'letter-spacing:.16em;pointer-events:none;background:rgba(4,10,20,.92);'
        + 'border:1px solid rgba(255,255,255,.18);color:#00f3ff;transition:opacity .25s';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { if (el) el.style.opacity = '0'; }, 1200);
  };

  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    let v = null;
    if (e.code === 'BracketLeft') v = fluidShader.fogDensity - 0.05;
    else if (e.code === 'BracketRight') v = fluidShader.fogDensity + 0.05;
    else if (e.code === 'Backslash') v = 0.82;
    else return;

    e.preventDefault();
    const set = fluidShader.setFog(v);
    show(`FOG ${set.toFixed(2)}${set === 0 ? '  (off)' : ''}${set === 0.82 ? '  (original)' : ''}`);
  });
})();
