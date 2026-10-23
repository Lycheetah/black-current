/* ==========================================================================
   BUBBLE TANKS — ART PACK INTERPRETER
   ==========================================================================

   Turns art into data. A pack is a JSON description of how to draw the six
   node types; the renderer becomes an interpreter. Same combat code renders
   bubble organisms or battleships depending on which pack is active.

   ⚠ THIS FILE MUST BE LOADED BEFORE `shaders.js` IN index.html.
     `shaders.js` calls into `packRenderer` at draw time, and a classic script
     that references an undeclared const throws at first frame, not at parse.

   ⚠ DEFAULT IS null — THE LEGACY PATH. With no active pack, `packRenderer`
     reports "not handled" and `shaders.js` draws exactly what it draws today.
     Switching packs on is a deliberate act, never a side effect of loading
     this file. A renderer change that arrives silently is a regression you
     cannot date.

   ⚠ NO ES MODULES. This project loads classic scripts in order and shares
     globals (`fluidShader`, `particleSystem`, `soundEngine`). An `export`
     here would make the file a module, defer it, and break that ordering.

   THE GEOMETRY LAW: every coordinate is normalised to the node radius, and
   forward is +X. `r: 1.0` means "exactly this node's radius", so one pack
   draws correctly at radius 10 and radius 30 without being redrawn. Parts are
   authored facing east because `drawOrganismMembrane` rotates the whole body
   by `angle` and the existing cannon barrel sits at +X (`shaders.js:111`).
   ========================================================================== */

class PackRenderer {
  constructor() {
    this.packs = {};
    this.activeId = null;

    /* Reused across every layer of every node of every entity, every frame.
       Allocating a point object per layer would be ~40 entities × 5 nodes ×
       5 layers = 1000 short-lived objects per frame, which is how a canvas
       game acquires a stutter it cannot profile. */
    this._pt = { x: 0, y: 0 };
  }

  register(pack) {
    if (!pack || typeof pack.id !== 'string' || !pack.parts) {
      console.warn('[packs] refused a pack with no id or no parts');
      return false;
    }
    this.packs[pack.id] = pack;
    return true;
  }

  /* Returns false when the id is unknown, so a typo cannot silently leave the
     player on a pack they did not choose. */
  use(id) {
    if (id === null) { this.activeId = null; return true; }
    if (!this.packs[id]) {
      console.warn(`[packs] no pack "${id}" — staying on ${this.activeId ?? 'legacy'}`);
      return false;
    }
    this.activeId = id;
    return true;
  }

  get active() { return this.activeId ? this.packs[this.activeId] : null; }

  /* Vernacular lookup with a safe identity fallback: a pack that forgets to
     name a part gets the engine's own word rather than `undefined` on screen. */
  word(key, fallback) {
    const p = this.active;
    return (p && p.vernacular && p.vernacular[key]) || fallback || key;
  }

  /* ── paint ──────────────────────────────────────────────────────────────
     Resolves a <paint> from the schema into something ctx.fillStyle accepts.
     `cx/cy/r` are already in SCREEN pixels — the caller has denormalised. */
  paint(ctx, spec, tint, cx, cy, r) {
    if (!spec) return null;
    if (typeof spec === 'string') return spec === 'tint' ? tint : spec;

    if (spec.grad === 'radial') {
      const fx = cx + (spec.fx || 0) * r;
      const fy = cy + (spec.fy || 0) * r;
      const g = ctx.createRadialGradient(fx, fy, Math.max(1, r * 0.04), cx, cy, Math.max(1, r));
      this._stops(g, spec.stops, tint);
      return g;
    }

    if (spec.grad === 'linear') {
      const g = ctx.createLinearGradient(
        cx + (spec.x0 ?? -1) * r, cy + (spec.y0 ?? 0) * r,
        cx + (spec.x1 ?? 1) * r, cy + (spec.y1 ?? 0) * r,
      );
      this._stops(g, spec.stops, tint);
      return g;
    }

    return null;
  }

  _stops(grad, stops, tint) {
    if (!Array.isArray(stops)) return;
    for (const s of stops) {
      if (!Array.isArray(s) || s.length < 2) continue;
      grad.addColorStop(
        Math.min(1, Math.max(0, s[0])),
        s[1] === 'tint' ? tint : s[1],
      );
    }
  }

  /* ── the interpreter ────────────────────────────────────────────────────
     Draws one part's layers at (cx, cy) in screen space, scaled by `r`.

     `state` carries the transient flags a pack can key off:
       { undulation, firing, thrusting }

     Returns true when it drew, false when there is no active pack or the pack
     has no such part — the caller then falls back to the legacy path. A part a
     pack forgot must never render as nothing. */
  drawPart(ctx, partName, cx, cy, r, tint, state = {}) {
    const pack = this.active;
    if (!pack) return false;

    const part = pack.parts[partName];
    if (!part || !Array.isArray(part.layers) || part.layers.length === 0) return false;

    const undulation = state.undulation || 0;

    for (const layer of part.layers) {
      if (layer.onFire && !state.firing) continue;
      if (layer.onThrust && !state.thrusting) continue;

      /* A pulse breathes the layer's scale with the shared undulation clock,
         so a pack inherits the aliveness the hand-written renderer had. */
      let scale = r;
      if (layer.pulse && layer.pulse.on === 'undulation') {
        scale = r * (1 + Math.sin(undulation * 2) * (layer.pulse.amp || 0.04));
      }

      ctx.beginPath();

      switch (layer.shape) {
        case 'circle': {
          const ox = cx + (layer.cx || 0) * scale;
          const oy = cy + (layer.cy || 0) * scale;
          const rr = Math.max(0.5, (layer.r ?? 1) * scale);
          ctx.arc(ox, oy, rr, 0, Math.PI * 2);
          this._fillStroke(ctx, layer, tint, ox, oy, rr, scale);
          break;
        }

        case 'rect': {
          const x = cx + (layer.x || 0) * scale;
          const y = cy + (layer.y || 0) * scale;
          const w = (layer.w || 0) * scale;
          const h = (layer.h || 0) * scale;
          const round = (layer.round || 0) * scale;
          if (round > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, round);
          else ctx.rect(x, y, w, h);
          this._fillStroke(ctx, layer, tint, x + w / 2, y + h / 2, Math.max(w, h) / 2 || 1, scale);
          break;
        }

        case 'poly': {
          const pts = layer.points;
          if (!Array.isArray(pts) || pts.length < 2) { ctx.closePath(); break; }
          ctx.moveTo(cx + pts[0][0] * scale, cy + pts[0][1] * scale);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(cx + pts[i][0] * scale, cy + pts[i][1] * scale);
          }
          if (layer.close !== false) ctx.closePath();
          this._fillStroke(ctx, layer, tint, cx, cy, scale, scale);
          break;
        }

        case 'arcband': {
          const r0 = (layer.r0 ?? 0.8) * scale;
          const r1 = (layer.r1 ?? 1.0) * scale;
          const from = layer.from ?? 0;
          const to = layer.to ?? Math.PI * 2;
          ctx.arc(cx, cy, r1, from, to);
          ctx.arc(cx, cy, r0, to, from, true);
          ctx.closePath();
          this._fillStroke(ctx, layer, tint, cx, cy, r1, scale);
          break;
        }

        default:
          /* An unknown shape is skipped, not thrown. One bad layer in a
             generated pack must not take the whole frame down. */
          ctx.closePath();
          break;
      }
    }

    return true;
  }

  _fillStroke(ctx, layer, tint, cx, cy, r, scale) {
    const fill = this.paint(ctx, layer.fill, tint, cx, cy, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }

    const stroke = this.paint(ctx, layer.stroke, tint, cx, cy, r);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(0.5, (layer.lineWidth ?? 0.06) * scale);
      ctx.stroke();
    }
  }

  /* Ambient/world colours with legacy defaults, so a pack may specify none. */
  ambient(key, fallback) {
    const p = this.active;
    return (p && p.ambient && p.ambient[key] !== undefined) ? p.ambient[key] : fallback;
  }

  threat(archetype, fallback) {
    const p = this.active;
    return (p && p.threat && p.threat[archetype]) || fallback;
  }

  /* ── loading ────────────────────────────────────────────────────────────
     Packs authored as JSON live in packs/. A browser cannot list a directory,
     so packs/index.json is the manifest — a new pack is not loaded until its
     id is added there. That is deliberate: a half-finished pack dropped in the
     folder must not appear in the rotation on the next refresh. */
  async loadAll(manifestUrl = 'packs/index.json') {
    let ids = [];
    try {
      const res = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ids = await res.json();
      if (!Array.isArray(ids)) throw new Error('manifest is not an array');
    } catch (e) {
      /* Loud, because the alternative is a player who chose a pack in a
         previous session silently getting the legacy look back. */
      console.warn(`[packs] manifest unavailable (${e.message}) — built-in packs only`);
      return this.ids();
    }

    /* Parallel, and one bad pack must not take the others down with it. */
    await Promise.all(ids.map(async id => {
      try {
        const r = await fetch(`packs/${id}.json`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const pack = await r.json();
        if (pack.id !== id) console.warn(`[packs] ${id}.json declares id "${pack.id}" — filename wins for the manifest, but fix it`);
        this.register(pack);
      } catch (e) {
        console.warn(`[packs] failed to load "${id}": ${e.message}`);
      }
    }));

    return this.ids();
  }

  /* 'legacy' is a real, selectable option, not the absence of one. */
  ids() { return ['legacy', ...Object.keys(this.packs)]; }

  label() { return this.active ? this.active.name : 'Legacy Bio'; }

  cycle(dir = 1) {
    const all = this.ids();
    const cur = all.indexOf(this.activeId ?? 'legacy');
    const next = all[(cur + dir + all.length) % all.length];
    this.use(next === 'legacy' ? null : next);
    this.persist();
    return this.label();
  }

  persist() {
    try { localStorage.setItem(PACK_STORAGE_KEY, this.activeId ?? 'legacy'); }
    catch (e) { console.warn('[packs] could not persist choice:', e.message); }
  }

  /* ALIAS. `garage.js:186` calls `packRenderer.save()`, which did not exist —
     WITNESSED in a real browser 2026-08-16: every Hull Skin click threw
     `TypeError: packRenderer.save is not a function`. `use()` runs first so the
     pack DID change on screen, which is exactly why this survived a "✅ 100%"
     report: it looked like it worked. The throw killed the rest of the handler,
     so the choice never reached localStorage (stored=null) and the tile never
     got its .active class. Pick a skin, reload, it is gone.

     Aliased here rather than corrected in garage.js because two seats are live
     in this repo and that file belongs to the other one. Converge on ONE name
     when the lanes next sync — an alias is a bridge, not an answer. */
  save() { return this.persist(); }

  restore() {
    let saved = null;
    try { saved = localStorage.getItem(PACK_STORAGE_KEY); }
    catch (e) { return; }
    if (!saved || saved === 'legacy') return;
    /* use() already refuses an unknown id and warns, so a pack deleted between
       sessions drops the player back to legacy instead of throwing. */
    this.use(saved);
  }
}

const PACK_STORAGE_KEY = 'biotank_forge_pack';

const packRenderer = new PackRenderer();
window.packRenderer = packRenderer;

/* ==========================================================================
   PACK B — `abyssal-choir`
   ==========================================================================
   THE REFERENCE IMPLEMENTATION AND THE REGRESSION CHECK.

   This reproduces, as pack data, exactly what `shaders.js` draws by hand
   today. Every value below is transcribed from that file, not invented:

     core gradient    shaders.js:130-137  (offset -0.3,-0.3 · #fff → tint → rgba(2,6,16,.9))
     core stroke      shaders.js:140-141  (rgba(255,255,255,0.75) @ 2px on r≈26 → 0.077)
     nucleus eye      shaders.js:145-148  (r 5.5 at +0.3x → 0.21 of a 26px core)
     pod gradient     shaders.js:86-92    (offset -0.35,-0.35 · #fff → tint → rgba(4,12,28,.8))
     pod stroke       shaders.js:96-97    (rgba(255,255,255,0.6) @ 1.2px on r≈14 → 0.086)
     cannon barrel    shaders.js:110-114  (#090d18 rect 11×6 at +0.2r, tint outline)
     spike            shaders.js:101-107  (white triangle, apex at -1.5r on Y)
     thruster         shaders.js:115-123  (#39ff14 flare, tip at -1.4r on X)

   ⚠ THE SPIKE POINTS -Y, NOT +X. That is what the current code does
     (`wobbleY - node.radius * 1.5`), so a faithful port must keep it even
     though it disagrees with the forward-is-+X law stated above. This is a
     REAL INCONSISTENCY IN THE EXISTING RENDERER, not a transcription error:
     every other part faces east and the spike faces north. Fixing it is a
     visual change and therefore Mac's call, not a silent correction here.
   ========================================================================== */

packRenderer.register({
  id: 'abyssal-choir',
  name: 'Abyssal Choir',
  kind: 'organism',
  tintChannel: 'accent',

  vernacular: {
    core: 'Nucleus', pod: 'Vitality Pod', cannon: 'Cannon Spitter',
    spike: 'Chitin Spike', thruster: 'Plasma Fin', shield: 'Shield Pod',
    connector: 'Membrane Tendril', currency: 'Gene Points', graft: 'Organelle',
  },

  ambient: {
    ground: '#030814',
    gridStroke: 'rgba(0, 243, 255, 0.04)',
    gridShape: 'circle',
    maskAlpha: 0.82,
  },

  threat: {
    mote: '#39ff14', stalker: '#00f3ff', charger: '#ffb703',
    sniper: '#bc13fe', hive: '#ff3366', boss: '#ff3366',
  },

  parts: {
    core: {
      connector: { width: 3, stroke: 'rgba(255, 255, 255, 0.2)', style: 'tendril' },
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.3, fy: -0.3,
                  stops: [[0, '#ffffff'], [0.35, 'tint'], [1, 'rgba(2, 6, 16, 0.9)']] },
          stroke: 'rgba(255, 255, 255, 0.75)', lineWidth: 0.077 },
        { shape: 'circle', cx: 0.3, cy: 0, r: 0.21, fill: '#ffffff' },
      ],
    },

    pod: {
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.35, fy: -0.35,
                  stops: [[0, '#ffffff'], [0.4, 'tint'], [1, 'rgba(4, 12, 28, 0.8)']] },
          stroke: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.086 },
      ],
    },

    shield: {
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.35, fy: -0.35,
                  stops: [[0, '#ffffff'], [0.4, 'tint'], [1, 'rgba(4, 12, 28, 0.8)']] },
          stroke: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.086 },
      ],
    },

    cannon: {
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.35, fy: -0.35,
                  stops: [[0, '#ffffff'], [0.4, 'tint'], [1, 'rgba(4, 12, 28, 0.8)']] },
          stroke: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.086 },
        /* 11×6 px on a radius-12 node → 0.917 × 0.5 normalised, y at -3/12 */
        { shape: 'rect', x: 0.2, y: -0.25, w: 0.917, h: 0.5,
          fill: '#090d18', stroke: 'tint', lineWidth: 0.125 },
      ],
    },

    spike: {
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.35, fy: -0.35,
                  stops: [[0, '#ffffff'], [0.4, 'tint'], [1, 'rgba(4, 12, 28, 0.8)']] },
          stroke: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.086 },
        /* -Y apex: faithful to shaders.js:102-105. See the warning above. */
        { shape: 'poly', points: [[0, -1.5], [-0.5, 0], [0.5, 0]], fill: '#ffffff' },
      ],
    },

    thruster: {
      layers: [
        { shape: 'circle', r: 1.0,
          fill: { grad: 'radial', fx: -0.35, fy: -0.35,
                  stops: [[0, '#ffffff'], [0.4, 'tint'], [1, 'rgba(4, 12, 28, 0.8)']] },
          stroke: 'rgba(255, 255, 255, 0.6)', lineWidth: 0.086 },
        /* 6px half-height on a radius-12 node → 0.5 normalised */
        { shape: 'poly', points: [[-0.8, -0.5], [-1.4, 0], [-0.8, 0.5]], fill: '#39ff14' },
      ],
    },
  },
});

/* ==========================================================================
   BOOTSTRAP
   ==========================================================================
   Fetch the authored packs, then restore the player's saved choice. Order
   matters: restoring before the fetch resolves would always fall back to
   legacy, because the pack it names would not be registered yet.
   ========================================================================== */

packRenderer.loadAll().then(ids => {
  packRenderer.restore();
  if (window.garage && typeof window.garage.renderSkinChoices === 'function') {
    window.garage.renderSkinChoices();
  }
  console.log(`[packs] ${ids.length} available: ${ids.join(', ')} — active: ${packRenderer.label()} (press P to cycle)`);
});

/* ── the switch ──────────────────────────────────────────────────────────
   P cycles packs. This is the whole selection UI for now, and it is honest
   about that: a garage panel is the right home, but a pack you cannot select
   is data nobody can see, and that is the failure this seam exists to avoid. */
(function bindPackSwitch() {
  let toast = null;

  const show = (text) => {
    if (!toast) {
      toast = document.createElement('div');
      toast.style.cssText = [
        'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%)',
        'padding:8px 16px', 'border-radius:3px', 'z-index:60',
        'font-family:ui-monospace,Menlo,Consolas,monospace', 'font-size:11px',
        'letter-spacing:.16em', 'pointer-events:none',
        'background:rgba(4,10,20,.92)', 'border:1px solid rgba(255,255,255,.18)',
        'color:#fff', 'transition:opacity .25s linear',
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { if (toast) toast.style.opacity = '0'; }, 1400);
  };

  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyP') return;
    /* Same guard as the reactor: never steal a key from a text field. The
       title screen focuses the callsign input, so without this, typing a "p"
       in your name would reskin the game. */
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    show(`ART PACK · ${packRenderer.cycle(e.shiftKey ? -1 : 1).toUpperCase()}`);
  });
})();
