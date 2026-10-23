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

    /* F6: the hull skin replaces the halo, the tendrils and the part bubbles. */
    const skin = !pack && this.hullSkinOn !== false;
    if (skin) {
      const m = ctx.getTransform ? ctx.getTransform() : null;
      const S = hullSkin(nodes, coreRadius, glowColor, m ? Math.hypot(m.a, m.b) : 1);
      ctx.drawImage(S.canvas, S.x, S.y, S.w, S.h);
    }

    // Pass 1: Outer Bioluminescent Soft Membrane Halo
    /* Skipped under a pack: this halo is explicitly a bio-membrane, and a
       glowing organic bubble around a battleship reads as a rendering bug. A
       pack draws its own outline through its part silhouettes. */
    if (!pack && !skin) {
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

      if (skin) { drawSkinPart(ctx, node, wobbleX, wobbleY, glowColor); continue; }

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
    if (skin) {
      /* the core becomes the reactor: a dark well, a neon ring, the eye */
      ctx.beginPath(); ctx.arc(0, 0, coreRadius * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(4,8,14,0.92)'; ctx.fill();
      ctx.strokeStyle = glowColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, coreRadius * 0.62 + 3, -0.6, 0.6); ctx.strokeStyle = '#c9a25c'; ctx.stroke();
      ctx.beginPath(); ctx.arc(coreRadius * 0.24, 0, Math.max(3, coreRadius * 0.16), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    } else if (!(pack && packRenderer.drawPart(ctx, 'core', 0, 0, coreRadius, glowColor, drawState))) {
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

/* ⭐⭐ F6 · THE HULL SKIN. Mac, 2026-10-23: "the ability to make ships is sort of
   janky cos everything is bubbles". Every part used to draw as its own glowing
   disc on a tendril, so a ship read as a cluster, not a machine.

   Now each design bakes ONE continuous plated hull: a compact metaball field
   over the core and every part, bridged along the ship's structure (each part
   joins the nearest part closer to the core, so the hull follows the frame
   instead of a starburst), shaded in FACETS (quantised normals read as machined
   plate, not jelly), with panel seams, a brass edge and a neon inner line.
   ⚡ Baked once per design into an offscreen canvas and LRU-cached; per frame a
   ship is one drawImage instead of N gradient discs + strokes. A shot-off part
   changes the key, so the hull rebakes without it: damage you can read.
   ⚖ Same nodes[], same hitboxes, same format (Law 3); a renderer, not data.
   Switch: `fluidShader.hullSkinOn = false` restores the bubbles. Dials: SKIN. */
const SKIN = { maxPixels: 260000, cacheMax: 96, reach: 1.63, bridge: 0.62, T: 0.25, seam: 17 };
const _skinCache = new Map();
function _rgb(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || ''));
  const n = m ? parseInt(m[1], 16) : 0x00f3ff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hullSkin(nodes, coreRadius, color, viewScale = 1) {
  const pts = [];
  let core = null;
  for (const n of nodes) {
    if (n.lost) continue;
    const x = n.targetDx ?? n.dx ?? n.currentDx ?? 0, y = n.targetDy ?? n.dy ?? n.currentDy ?? 0;
    const p = { x, y, r: n.radius || 8, type: n.type };
    if (n.type === 'core' && !core) core = p;
    pts.push(p);
  }
  if (!core) { core = { x: 0, y: 0, r: coreRadius || 16, type: 'core' }; pts.unshift(core); }
  /* bake at the resolution it is shown at, in half-steps, so the Shipyard's
     close-up is crisp and flight (zoom 0.5) bakes small */
  const bake = Math.max(0.625, Math.min(5, Math.ceil(viewScale * 1.25 * 8) / 8));
  const key = bake + '|' + color + '|' + pts.map(p => `${p.type ? p.type[0] : 'x'}${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.r)}`).join(';');
  const hit = _skinCache.get(key);
  if (hit) { _skinCache.delete(key); _skinCache.set(key, hit); return hit; }

  /* the frame: each part bridges to its nearest neighbour that sits closer to the core */
  const segs = [];
  for (const p of pts) {
    if (p === core) continue;
    const d0 = Math.hypot(p.x - core.x, p.y - core.y);
    let best = core, bd = d0;
    for (const q of pts) {
      if (q === p || q === core) continue;
      if (Math.hypot(q.x - core.x, q.y - core.y) >= d0 - 1) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bd) { bd = d; best = q; }
    }
    segs.push({ ax: p.x, ay: p.y, bx: best.x, by: best.y, R: (Math.min(p.r, best.r) * SKIN.bridge + 3) * SKIN.reach });
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    const R = p.r * SKIN.reach + 4;
    minX = Math.min(minX, p.x - R); maxX = Math.max(maxX, p.x + R);
    minY = Math.min(minY, p.y - R); maxY = Math.max(maxY, p.y + R);
  }
  let s = bake;
  let W = Math.ceil((maxX - minX) * s), H = Math.ceil((maxY - minY) * s);
  if (W * H > SKIN.maxPixels) { s *= Math.sqrt(SKIN.maxPixels / (W * H)); W = Math.ceil((maxX - minX) * s); H = Math.ceil((maxY - minY) * s); }
  W = Math.max(2, W); H = Math.max(2, H);

  /* pass 1: the field (Wyvill kernel: compact, so far parts never bloat the hull).
     ⚡ SPLATTED: each ball and bridge adds into only the pixels inside its own
     reach, so cost follows the hull's area, not pixels × parts. A 25-gun titan
     went 54–72 ms → single digits; a frigate is ~1 ms. */
  const F = new Float32Array(W * H);
  for (const p of pts) {
    const R = p.r * SKIN.reach, R2 = R * R;
    const i0 = Math.max(0, Math.floor((p.x - R - minX) * s)), i1 = Math.min(W - 1, Math.ceil((p.x + R - minX) * s));
    const j0 = Math.max(0, Math.floor((p.y - R - minY) * s)), j1 = Math.min(H - 1, Math.ceil((p.y + R - minY) * s));
    for (let j = j0; j <= j1; j++) {
      const dy = minY + (j + 0.5) / s - p.y, dy2 = dy * dy, row = j * W;
      if (dy2 >= R2) continue;
      for (let i = i0; i <= i1; i++) {
        const dx = minX + (i + 0.5) / s - p.x, d2 = dx * dx + dy2;
        if (d2 < R2) { const k = 1 - d2 / R2; F[row + i] += k * k; }
      }
    }
  }
  for (const g of segs) {
    const vx = g.bx - g.ax, vy = g.by - g.ay, L2 = vx * vx + vy * vy || 1, R2 = g.R * g.R;
    const i0 = Math.max(0, Math.floor((Math.min(g.ax, g.bx) - g.R - minX) * s)), i1 = Math.min(W - 1, Math.ceil((Math.max(g.ax, g.bx) + g.R - minX) * s));
    const j0 = Math.max(0, Math.floor((Math.min(g.ay, g.by) - g.R - minY) * s)), j1 = Math.min(H - 1, Math.ceil((Math.max(g.ay, g.by) + g.R - minY) * s));
    for (let j = j0; j <= j1; j++) {
      const wy = minY + (j + 0.5) / s, row = j * W;
      for (let i = i0; i <= i1; i++) {
        const wx = minX + (i + 0.5) / s;
        let t = ((wx - g.ax) * vx + (wy - g.ay) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = wx - g.ax - vx * t, ey = wy - g.ay - vy * t, d2 = ex * ex + ey * ey;
        if (d2 < R2) { const k = 1 - d2 / R2; F[row + i] += k * k; }
      }
    }
  }

  /* pass 2: plate shading */
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'), img = cx.createImageData(W, H), D = img.data;
  const [cr, cg, cb] = _rgb(color);
  const base = [26 * 0.82 + cr * 0.18, 38 * 0.82 + cg * 0.18, 51 * 0.82 + cb * 0.18];
  const T = SKIN.T, LX = -0.5, LY = -0.85;
  for (let j = 1; j < H - 1; j++) {
    const wy = minY + (j + 0.5) / s;
    for (let i = 1; i < W - 1; i++) {
      const o = j * W + i, f = F[o];
      if (f < T - 0.04) continue;
      const a = Math.min(1, (f - (T - 0.04)) / 0.06);
      /* outward normal, quantised into 8 facets by comparisons (no trig per
         pixel): machined plate, not jelly */
      const ox = F[o - 1] - F[o + 1], oy = F[o - W] - F[o + W];
      const ax = ox < 0 ? -ox : ox, ay = oy < 0 ? -oy : oy;
      let nx, ny;
      if (ay < ax * 0.4142) { nx = ox < 0 ? -1 : 1; ny = 0; }
      else if (ax < ay * 0.4142) { nx = 0; ny = oy < 0 ? -1 : 1; }
      else { nx = ox < 0 ? -0.7071 : 0.7071; ny = oy < 0 ? -0.7071 : 0.7071; }
      const depth = Math.min(1, (f - T) / 0.55);              // 0 at the edge, 1 deep inside
      const lit = 0.5 + 0.5 * -(nx * LX + ny * LY);
      let k = 0.62 + (1 - depth) * (lit - 0.5) * 0.9 + depth * 0.22;
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      const wx = minX + (i + 0.5) / s;
      /* panel seams + rivets in ship space, only away from the edge */
      if (depth > 0.55) {
        const mx = ((wx % SKIN.seam) + SKIN.seam) % SKIN.seam, my = ((wy % SKIN.seam) + SKIN.seam) % SKIN.seam;
        if (mx < 0.9 / s * 1.4 || my < 0.9 / s * 1.4) { r *= 0.68; g *= 0.68; b *= 0.7; }
        else if (Math.hypot(mx - SKIN.seam / 2, my - SKIN.seam / 2) < 0.9) { r += 30; g += 26; b += 18; }
      }
      if (f < T + 0.05) {                                       // brass edge
        const e = 0.75 + 0.35 * lit; r = 201 * e; g = 162 * e; b = 92 * e;
      } else if (Math.abs(f - (T + 0.16)) < 0.018) {            // neon inner line
        r = r * 0.3 + cr * 0.7; g = g * 0.3 + cg * 0.7; b = b * 0.3 + cb * 0.7;
      }
      const q = o * 4;
      D[q] = r > 255 ? 255 : r; D[q + 1] = g > 255 ? 255 : g; D[q + 2] = b > 255 ? 255 : b; D[q + 3] = 255 * a;
    }
  }
  cx.putImageData(img, 0, 0);
  const out = { canvas: cv, x: minX, y: minY, w: W / s, h: H / s };
  _skinCache.set(key, out);
  if (_skinCache.size > SKIN.cacheMax) _skinCache.delete(_skinCache.keys().next().value);
  return out;
}

/* Parts mounted ON the skin: machined housings instead of bubbles. */
function drawSkinPart(ctx, node, x, y, color) {
  const r = node.radius;
  ctx.lineWidth = 1.3;
  if (node.type === 'cannon') {
    const bw = Math.max(3, r * 0.34);
    ctx.fillStyle = '#0b121a'; ctx.strokeStyle = color;
    ctx.fillRect(x + r * 0.2, y - bw / 2, r * 1.15, bw); ctx.strokeRect(x + r * 0.2, y - bw / 2, r * 1.15, bw);
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a25c'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.stroke();
  } else if (node.type === 'thruster') {
    ctx.fillStyle = '#0b121a'; ctx.strokeStyle = '#c9a25c';
    ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.45); ctx.lineTo(x - r * 1.05, y - r * 0.75);
    ctx.lineTo(x - r * 1.05, y + r * 0.75); ctx.lineTo(x + r * 0.3, y + r * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.globalAlpha *= 0.85;
    ctx.beginPath(); ctx.ellipse(x - r * 1.12, y, r * 0.22, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha /= 0.85;
  } else if (node.type === 'spike') {
    const a = Math.atan2(y, x);
    ctx.fillStyle = '#d9e2e8'; ctx.strokeStyle = '#c9a25c';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
    ctx.lineTo(x + Math.cos(a + 2.2) * r * 0.7, y + Math.sin(a + 2.2) * r * 0.7);
    ctx.lineTo(x + Math.cos(a - 2.2) * r * 0.7, y + Math.sin(a - 2.2) * r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (node.type === 'bay') {
    /* F7 drone bay: a hangar with door slits */
    ctx.fillStyle = '#0b121a'; ctx.strokeStyle = '#c9a25c';
    ctx.fillRect(x - r * 0.75, y - r * 0.6, r * 1.5, r * 1.2); ctx.strokeRect(x - r * 0.75, y - r * 0.6, r * 1.5, r * 1.2);
    ctx.strokeStyle = color; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + k * r * 0.3); ctx.lineTo(x + r * 0.5, y + k * r * 0.3); ctx.stroke(); }
  } else if (node.type === 'siphon') {
    /* F7 laser siphon: twin prongs around a lens */
    ctx.strokeStyle = '#c9a25c'; ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.5); ctx.lineTo(x + r * 1.2, y - r * 0.3); ctx.moveTo(x - r * 0.4, y + r * 0.5); ctx.lineTo(x + r * 1.2, y + r * 0.3); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.fillStyle = '#ff3366';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
  } else if (node.type === 'wing') {
    /* F7 wing dock: a docking clamp chevron */
    ctx.fillStyle = '#0b121a'; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x + r * 0.9, y); ctx.lineTo(x - r * 0.6, y - r * 0.8); ctx.lineTo(x - r * 0.2, y); ctx.lineTo(x - r * 0.6, y + r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (node.type === 'mender') {
    /* F7 mender: a green cross in a brass ring */
    ctx.fillStyle = 'rgba(8,14,22,0.92)'; ctx.strokeStyle = '#c9a25c';
    ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5ef2a0'; const w = r * 0.22;
    ctx.fillRect(x - w, y - r * 0.5, w * 2, r); ctx.fillRect(x - r * 0.5, y - w, r, w * 2);
  } else if (node.type === 'shield') {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); }
    ctx.closePath(); ctx.fillStyle = 'rgba(94,242,224,0.14)'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(8,14,22,0.92)'; ctx.strokeStyle = '#c9a25c';
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha /= 0.6;
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
