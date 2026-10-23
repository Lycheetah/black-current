// sprites.js — THE ART FINALLY REACHES THE SCREEN
//
// THIS FILE OWNS ITS OWN INPUT, ITS OWN HUD AND ITS OWN LOADING, deliberately —
// the same pattern as `energy.js`, `feel.js`, `hardpoints.js` and `fleet.js`.
// Two seats are live in this repo and `engine.js` is the file most likely to be
// corrupted by both of us editing it at once.
//
// ⭐ IT EDITS `engine.js` NOT AT ALL. `fluidShader.drawOrganismMembrane()` is
//    the SINGLE entry point through which the whole player body is drawn, and
//    it is already handed everything this needs: screen position, hull angle,
//    core radius, the live node array and the firing/thrusting state. So this
//    file WRAPS that one function and keeps the original as the fallback.
//    One seam, reversible with a keypress, and nothing else in the engine has
//    to know sprites exist.
//
// WHAT THIS FIXES
// ---------------
// 🔴 MEASURED 2026-08-17: `art/keyed/` holds 268 finished, keyed sprites and
//    `ctx.drawImage` appeared NOWHERE in `js/`. Every piece of art Mac had
//    generated, sliced and keyed was unreachable by the running game. The
//    engine was 100% procedural not by decision but by omission.
//
// ⭐⭐ THE 🟢 MOUNT DOT IS THE PIVOT. A turret rotates about the point where it
//    bolts to the hull, never about the middle of its own picture. Every sprite
//    carries one reserved pure-green dot; `build-art-manifest.py` measures it
//    and stores it as a fraction of the bitmap. Drawing these centred instead
//    would make every gun on the ship swing like a propeller.
//
// ⚖ THE NODE GRAPH REMAINS THE SHIP. Nothing here changes physics, collision,
//    hit points, cost or class — a sprite is a costume over the same
//    `{dx, dy, radius, type}` the engine already simulates. If the art vanished
//    the game would still play identically, which is the test of whether a
//    render layer has quietly become a second engine. It has not.
//
// NO ES MODULES. Classic script sharing globals. An `export` would defer this
// file and break the load order in index.html.

(function () {
  'use strict';

  const MANIFEST_URL = 'art/manifest.json';

  /* ⭐ DRAW THE MARKER-FREE COPIES. `extract-node-points.py` writes a `clean/`
     sibling with the green dots filled in from the ring of pixels just outside
     them. The manifest measures the ORIGINAL (that is where the dot is) but the
     game must draw the CLEAN one, or every ship wears a rash of green spots. */
  const CLEAN = (p) => p.replace(/\/([^/]+)$/, '/clean/$1');

  /* Draw order. Structure first, weapons last, so a barrel is never buried
     under the pod behind it. `core` sits under the guns but over the hull
     plating for the same reason. */
  const LAYER = { shield: 0, pod: 1, thruster: 2, spike: 3, core: 4, cannon: 5 };

  /* ⚠ FEEL NUMBER — MAC'S VERDICT, NOT MINE, so it is a live dial (`;` / `'`)
     and not a constant I get to be confident about.
     A node radius is a PHYSICS quantity — the collision circle — and a gun that
     exactly filled its own circle reads as a stub, so the art is drawn larger
     than the thing it represents. Too large and a 20-node hull becomes a pile:
     MEASURED 2026-08-17, at 2.35 the DREADNOUGHT lost its prow entirely while
     the 2-node INTERCEPTOR looked correct. Overlap scales with node count, so
     the number that flatters a small hull buries a big one. 1.85 is a
     compromise, not an answer.
     ⭐ It is now the TRIM on the taper below, not the gain itself. */
  const DEFAULT_GAIN = 1.85;

  /* ==========================================================================
     ⭐⭐ THE TAPER — MAC'S RULING, 2026-08-17
     ==========================================================================
     *"the weapons need a adjust size to the model."*

     🔴 THE MEASURED DEFECT. `gain` was FLAT: every part drew at
     `radius x 2 x 1.85`, so drawn size was strictly proportional to radius.
     Across the roster the core grew 18 -> 46 (2.5x) while the guns grew
     6 -> 38 (6.3x) — meaning THE BIGGER THE SHIP, THE MORE ITS OWN GUNS ATE IT.
     On the TITAN a 36px siege mount drew 133px tall against an 84px core: the
     gun was 1.6x the body. That is the pile of barrels Mac photographed.

     ⭐ A flat multiplier cannot express "a turret looks big on a corvette and
     normal on a titan", because that is a RATIO to the hull, not to the node.
     So the multiplier tapers: small mounts are inflated hard so a 6px needle is
     visible at all, large mounts barely at all so a siege gun stays a turret.

         r=6  -> x2.40 -> 29px    r=18 -> x1.92 -> 69px
         r=12 -> x2.16 -> 52px    r=26 -> x1.59 -> 83px
                                  r=38 -> x1.10 -> 84px

     The drawn size now FLATTENS as radius climbs, which is the whole point: the
     biggest guns stop growing while the hull keeps growing past them.

     ⚖ IT CHANGES NO PHYSICS. Collision, hit points, cost, weapon band and
     traverse all still read `node.radius`, untouched. This is a costume.
     ⚠ `;` / `'` still trim the whole curve up and down — feel stays Mac's. */
  /* ⚠ CUT HARD ON 2026-08-17 (was 2.40 / 1.10). Mac, on the first taper:
     *"the hull is still to small and the guns way to bloody big its dumb."*
     A taper that still starts above 2x is still an inflation. */
  const GAIN_SMALL = 1.15;   // multiplier at a 6px needle mount
  const GAIN_BIG   = 0.60;   // multiplier at a 38px spinal lance
  const GAIN_R0    = 6;
  const GAIN_R1    = 38;

  /* ==========================================================================
     ⭐⭐ THE CAP — WHY THE TAPER ALONE WAS NEVER GOING TO BE ENOUGH
     ==========================================================================
     A taper is still a function of the NODE. It cannot know how big the ship
     is, so on any hull whose body happens to be small the guns still swamp it,
     and the only remedy is re-tuning the curve every time a hull changes — the
     definition of incremental.

     ⭐ So the drawn size is CLAMPED to a share of the hull body:

         drawn_height <= hull_core_diameter * MAX_MOUNT_SHARE

     That is a structural guarantee rather than a tuned number. **A gun can
     never again be bigger than half the ship it is bolted to**, on any hull,
     including every hull Mac has not authored yet. The taper still shapes the
     range below the cap; the cap ends the failure mode.

     ⚠ THE CAP MUST NOT DO ALL THE WORK. At 0.50 with the first taper, MEASURED:
     a 12px light and a 26px heavy on the same small hull BOTH landed on exactly
     50% — the cap was clamping everything, so the mount ladder became invisible
     and every gun on a frigate looked identical. A cap that binds constantly is
     not a cap, it is a constant. So the taper sits low enough that the cap
     catches only the genuine extreme (a heavy mount on a hull that should not
     carry it — which is a real class, and clamping it there is correct).

     MEASURED at 0.55, body diameter vs gun:
       core  26 (body  52px)  12px mount ->  25px  (48%, taper)
       core  26 (body  52px)  26px mount ->  29px  (55%, CAPPED — as intended)
       core  18 (body  36px)   6px mount ->  14px  (38%, taper)
       core 105 (body 210px)  36px mount ->  46px  (22%, taper)
     ========================================================================== */
  const MAX_MOUNT_SHARE = 0.55;

  const sprites = {
    ready: false,
    enabled: true,       // sprite mode on by default once the manifest loads
    gain: DEFAULT_GAIN,
    /* ⭐⭐ DEFAULT **ON**, AND IT IS STRUCTURAL, NOT DECORATION. There is no core
       art in the bank and a core node therefore wears no sprite, so the
       procedural membrane IS the hull — the body the painted modules bolt onto.
       Turn it off and the ship becomes a formation of floating parts.
       ⚠ I had this off, having blamed the membrane for a green wedge through
       the DREADNOUGHT. Wrong cause: the wedge was module_096, one of the eight
       whole ships I had misfiled as `core`. The membrane was innocent. */
    underlay: true,
    enemyChassis: false, // true = enemies also get the chassis spars (costs frame time)
    chassis: true,       // the structural spars the painted parts bolt onto (J)
    manifest: null,
    byType: {},          // type -> [entry], sorted small..large so radius can pick
    _img: new Map(),     // path -> Image (lazy; only what a ship actually wears)
    _scaled: new Map(),  // file@width -> pre-resampled canvas (see scaled())
    _pick: new WeakMap(),// node -> entry, so a ship's look is stable frame to frame
    _missing: 0,
    _drawn: 0,

    // ---- loading --------------------------------------------------------

    async load() {
      let m;
      try {
        const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        m = await res.json();
      } catch (e) {
        /* ⛔ A SILENT FALLBACK MUST NOT IMPERSONATE A SUCCESSFUL LOAD. If the
           manifest is missing the game still runs — procedurally — but it says
           so, once, instead of quietly looking like the old build. */
        console.warn('[sprites] no art manifest (' + e.message +
          ') — staying procedural. Run: python3 scripts/build-art-manifest.py');
        this._paint();
        return false;
      }

      this.manifest = m;
      const all = [].concat(m.modules || [], m.ships || [], m.enemies || []);
      for (const e of all) {
        if (!e.usable || !e.mount) continue;
        (this.byType[e.type] || (this.byType[e.type] = [])).push(e);
      }
      // Sorting by drawn area lets `pick()` map a big node to a big painting,
      // so a 38px siege lance does not come out wearing a pistol.
      for (const t in this.byType) {
        this.byType[t].sort((a, b) => (a.box[2] * a.box[3]) - (b.box[2] * b.box[3]));
      }

      this.ready = true;
      const counts = Object.keys(this.byType)
        .map(t => t + ' ' + this.byType[t].length).join(', ');
      console.log('[sprites] ' + all.filter(e => e.usable).length +
        ' usable of ' + all.length + ' — ' + counts + '  (press G to toggle)');
      this._paint();
      return true;
    },

    image(entry) {
      const p = CLEAN(entry.path);
      let img = this._img.get(p);
      if (img) return img.complete && img.naturalWidth ? img : null;
      img = new Image();
      /* ⚠ The clean copy is the one that may not exist — a pack added by hand
         will not have been through the extractor. Fall back to the marked
         original rather than dropping the part, and count it so the HUD can
         say so instead of the ship silently missing a gun. */
      img.onerror = () => {
        if (img.src.indexOf('/clean/') !== -1) img.src = entry.path;
        else this._missing++;
      };
      img.src = p;
      this._img.set(p, img);
      return null;
    },

    /* ⭐⭐ PRE-SCALE ONCE, NOT EVERY FRAME. MEASURED 2026-08-17 on Mac's machine:
       **17 FPS.** The source art is 227–479px on its longest edge and every node
       was drawing it scaled down to ~30px, twenty-plus times a frame, with the
       browser resampling the full bitmap on each call. That is the whole cost.

       So each sprite is resampled ONCE into a small offscreen canvas at roughly
       the size it is actually drawn, and the frame loop then blits something
       already the right size. Target sizes are quantised to 4px so a node
       breathing on its spring does not thrash the cache.

       ⚖ This changes nothing about placement — the pivot is still the mount dot,
       computed in the same normalised space. It is purely how many pixels the
       browser has to touch. */
    scaled(entry, img, w, h) {
      w = Math.max(1, Math.round(w / 4) * 4);
      h = Math.max(1, Math.round(h / 4) * 4);
      const key = entry.file + '@' + w + '@' + h;   // was '@w' only: two heights at one width evicted each other every frame
      let c = this._scaled.get(key);
      if (c && c.width === w && c.height === h) return c;
      c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, w, h);
      /* ⚠ A CANVAS HAS NO `.src`. Tag it, or anything watching `drawImage` — the
         witness, a profiler, a future me — sees anonymous bitmaps and concludes
         nothing is being drawn. It cost one false red the moment the cache
         landed. */
      c._file = entry.file;
      // Quantised sizes still accumulate while fitting different hulls. Keep
      // the resampled working set bounded, independently of the source art.
      const bytes = w * h * 4;
      this._scaledBytes = this._scaledBytes || 0;
      while (this._scaled.size && (this._scaled.size >= 192 || this._scaledBytes + bytes > 16 * 1024 * 1024)) {
        const oldest = this._scaled.keys().next().value;
        const retired = this._scaled.get(oldest);
        this._scaledBytes -= retired.width * retired.height * 4;
        this._scaled.delete(oldest);
      }
      if (bytes <= 16 * 1024 * 1024) {
        this._scaled.set(key, c);
        this._scaledBytes += bytes;
      }
      return c;
    },

    // ---- choosing -------------------------------------------------------

    /* ⭐ THE SAME SHIP MUST LOOK THE SAME EVERY FRAME. Picking at random per
       draw would make the fleet shimmer. The choice is memoised against the
       node OBJECT — and `engine.applyDesign()` replaces those objects wholesale
       on every design change, so a new hull re-rolls its parts for free while a
       flying one never changes. A WeakMap means the orphans are collectable.
       ⚠ This is the same node-identity fact that caused the stale-turret bug in
       hardpoints.js. Here it is the feature. */
    pick(node, idx) {
      /* ⭐ AN AUTHORED CASTING BEATS THE PICKER. `js/bay.js` lets the player
         choose which painting a socket wears; when it has, that choice is the
         answer and the size heuristic below never runs. Checked BEFORE the
         memo, because the bay can change it while the game is paused.
         ⚠ Falls through to the heuristic if the named file is not in the
         bucket — a design saved against an art pack that has since changed
         must still fly, wearing something, rather than losing a gun. */
      if (node.art) {
        const b = this.byType[node.type];
        if (b) for (const e of b) if (e.file === node.art) return e;
      }

      let e = this._pick.get(node);
      if (e !== undefined) return e;

      const bucket = this.byType[node.type];
      if (!bucket || !bucket.length) { this._pick.set(node, null); return null; }

      /* Bigger node -> bigger painting, with a deterministic wobble so two guns
         of identical radius on one hull are not always the same casting. */
      const r = node.radius || 12;
      const band = Math.min(1, Math.max(0, (r - 6) / 34));      // 6px..40px -> 0..1
      const jitter = ((idx * 2654435761) >>> 0) % 3;             // 0,1,2 — stable
      const at = Math.round(band * (bucket.length - 1));
      e = bucket[Math.min(bucket.length - 1, Math.max(0, at + jitter - 1))];
      this._pick.set(node, e);
      return e;
    },

    /* The taper, as a pure function of node radius. `this.gain` divides through
       DEFAULT_GAIN so Mac's live dial is a TRIM on the whole curve rather than
       a replacement for it — at 1.85 the curve is exactly as designed above,
       and every press of `;` or `'` scales all mounts together. */
    gainFor(r) {
      const t = Math.min(1, Math.max(0, (r - GAIN_R0) / (GAIN_R1 - GAIN_R0)));
      return (GAIN_SMALL + (GAIN_BIG - GAIN_SMALL) * t) * (this.gain / DEFAULT_GAIN);
    },

    // ---- drawing --------------------------------------------------------

    /* Turret facing, when hardpoints owns this node. A cannon points where it
       is AIMED; everything else rides the hull. ⚖ ONE TRUTH — the angle is read
       from the live turret, never recomputed here, so the barrel on screen and
       the arc the bullet leaves on are the same number. */
    _angleFor(node, hullAngle) {
      if (node.type !== 'cannon') return hullAngle;
      const ts = (typeof hardpoints !== 'undefined' && hardpoints._turrets) || null;
      if (!ts) return hullAngle;
      for (const t of ts) if (t.node === node) return hullAngle + (t.angle || 0);
      return hullAngle;
    },

    /* ⭐⭐ THE CHASSIS — THE SHIP THE PARTS ARE BOLTED TO.
       MEASURED: with painted modules and nothing else, a 2-node FRIGATE reads as
       a gun and a pod floating near each other. The procedural membrane cannot
       fill this role — under the legacy pack it is translucent cyan bubbles, and
       under a ship pack it is that pack's own body — so at 0.82 alpha it still
       left the small hulls disconnected.

       ⚖ IT IS DERIVED, NOT AUTHORED. Every spar runs from the core to a real
       node at a width taken from that node's own radius. It invents no geometry:
       delete a node and its spar goes with it. That is why this is a renderer
       and not a second ship definition. */
    _drawChassis(ctx, screenX, screenY, hullAngle, coreRadius, nodes) {
      const core = nodes.find(n => n.type === 'core');
      const cr = (core && core.radius) || coreRadius || 18;
      const ca = Math.cos(hullAngle), sa = Math.sin(hullAngle);
      const at = (n) => {
        const dx = (n.currentDx !== undefined ? n.currentDx : n.targetDx) || 0;
        const dy = (n.currentDy !== undefined ? n.currentDy : n.targetDy) || 0;
        return [screenX + dx * ca - dy * sa, screenY + dx * sa + dy * ca];
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const n of nodes) {
        if (n === core || n.type === 'core') continue;
        const [x, y] = at(n);
        const w = Math.max(5, (n.radius || 10) * 1.15);
        ctx.strokeStyle = '#161c24';                 // shadowed underside
        ctx.lineWidth = w + 3;
        ctx.beginPath(); ctx.moveTo(screenX, screenY); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = '#38424f';                 // plate
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(screenX, screenY); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,175,205,0.30)';  // top highlight
        ctx.lineWidth = Math.max(1, w * 0.28);
        ctx.beginPath(); ctx.moveTo(screenX, screenY); ctx.lineTo(x, y); ctx.stroke();
      }
      // the core drum, drawn last so the spars run under it
      ctx.beginPath(); ctx.arc(screenX, screenY, cr * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = '#2b3440'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,190,220,0.35)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(screenX, screenY, cr * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,200,255,0.20)'; ctx.fill();
      ctx.restore();
    },

    /* ⭐⭐ THE HULL BODY IS THE CORE NODE, NOT THE PASSED PARAMETER.
       🔴 THIS WAS THE MISS behind Mac's *"the hull is still to small."* The
       scale ladder in `fleet.js` grows the core NODE — which is what the
       chassis and the collision circle read — but `drawOrganismMembrane` draws
       the body from its `coreRadius` ARGUMENT, and every caller passes a
       separate player-level number that the ladder never touched. So the ship
       Mac could see stayed the old size while everything else grew around it.
       Reading the core node here makes the drawn body, the chassis, the
       hitbox and the gun cap all agree on one radius. */
    hullRadius(coreRadius, nodes) {
      const core = nodes && nodes.find(n => n.type === 'core');
      return (core && core.radius) || coreRadius || 18;
    },

    draw(ctx, screenX, screenY, hullAngle, coreRadius, nodes, glowColor, state) {
      this._drawn = 0;
      const hullR = this.hullRadius(coreRadius, nodes);
      const capH = hullR * 2 * MAX_MOUNT_SHARE;
      const order = [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        order.push({ n, i, z: LAYER[n.type] === undefined ? 3 : LAYER[n.type] });
      }
      order.sort((a, b) => a.z - b.z);

      for (const { n, i } of order) {
        const entry = this.pick(n, i);
        if (!entry) continue;
        const img = this.image(entry);
        if (!img) continue;

        /* The node's own offset is in HULL space, so it rotates with the hull
           exactly the way the procedural renderer already does it. `currentDx`
           is the spring-settled position — using `targetDx` would make the
           art rigid while the physics underneath still wobbled. */
        const dx = (n.currentDx !== undefined ? n.currentDx : n.targetDx) || 0;
        const dy = (n.currentDy !== undefined ? n.currentDy : n.targetDy) || 0;
        const ca = Math.cos(hullAngle), sa = Math.sin(hullAngle);
        const nx = screenX + dx * ca - dy * sa;
        const ny = screenY + dx * sa + dy * ca;

        const W = entry.px[0], H = entry.px[1];
        // Scale from the OPAQUE box, not the bitmap: transparent margin must
        // not shrink the part it surrounds.
        const nr = n.radius || 12;
        /* The taper proposes; the cap disposes. ⛔ The core is exempt — it IS
           the hull, so capping it against itself would shrink the ship. */
        let want = nr * 2 * this.gainFor(nr);
        if (n.type !== 'core' && want > capH) want = capH;
        const s = want / Math.max(1, entry.box[3]);
        const dw = W * s, dh = H * s;
        const bmp = this.scaled(entry, img, dw, dh);   // already the right size
        const mx = entry.mount[0] * bmp.width, my = entry.mount[1] * bmp.height;

        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(this._angleFor(n, hullAngle));
        /* ⭐ THE MOUNT DOT LANDS EXACTLY ON THE NODE CENTRE. Everything else
           about the placement follows from that one alignment. */
        ctx.drawImage(bmp, -mx, -my);

        // Muzzle heat while the trigger is down — the only state this layer
        // reads, and it is read, never invented.
        if (n.type === 'cannon' && state && state.firing) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.28;
          ctx.drawImage(bmp, -mx, -my);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
        this._drawn++;
      }
      return this._drawn;
    },

    // ---- HUD ------------------------------------------------------------

    _hud: null,

    _paint() {
      if (!this._hud) return;
      const on = this.ready && this.enabled;
      const total = this.manifest
        ? [].concat(this.manifest.modules || [], this.manifest.ships || [],
                    this.manifest.enemies || []).filter(e => e.usable).length : 0;
      this._hud.innerHTML =
        '<b style="color:' + (on ? '#9cff9c' : '#8899aa') + '">ART ' +
        (this.ready ? (on ? 'SPRITES' : 'PROCEDURAL') : 'LOADING…') + '</b>' +
        (this.ready ? ' <span style="opacity:.6">' + total + ' parts</span>' : '') +
        (this._missing ? ' <span style="color:#ff8080">' + this._missing + ' missing</span>' : '') +
        '<br><span style="opacity:.55">G sprites &nbsp; H membrane ' +
        (this.underlay ? 'ON' : 'off') + ' &nbsp; J chassis ' +
        (this.chassis ? 'ON' : 'off') + ' &nbsp; ; ′ trim ' +
        this.gain.toFixed(2) + ' <span style="opacity:.6">(x' +
        this.gainFor(6).toFixed(2) + '..x' + this.gainFor(38).toFixed(2) +
        ')</span></span>' +
        '<br><span style="opacity:.4">' + this._drawn + ' parts drawn</span>';
    },

    mount() {
      const el = document.createElement('div');
      el.id = 'sprite-hud';
      el.style.cssText =
        /* ⛔ WAS right/236px AND SAT ON TOP OF `#fleet-hud` — visible in Mac's
           first play screenshot, two panels overprinting each other. The right
           rail is fleet's; this lives on the left. */
        'position:fixed;left:10px;bottom:215px;z-index:60;' +
        'font:11px ui-monospace,Menlo,Consolas,monospace;color:#cfe6ff;' +
        'background:rgba(4,10,14,.72);border:1px solid rgba(140,190,255,.28);' +
        'border-radius:6px;padding:6px 9px;pointer-events:none;line-height:1.5;';
      document.body.appendChild(el);
      this._hud = el;
      this._paint();

      window.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (window.engine && (engine.paused || engine.mapOpen)) return;
        /* ⛔ `g` and `h` chosen because `[`, `]` and `\` are ALREADY double-bound
           in this repo (feel.js zoom + shaders.js fog), and f/F/r (fleet), P
           (packs), digits (reactor), <, >, k (hardpoints) are taken. */
        if (e.key === 'g' || e.key === 'G') this.enabled = !this.enabled;
        else if (e.key === 'h' || e.key === 'H') this.underlay = !this.underlay;
        /* ⚠ THE SCALE IS A FEEL NUMBER AND FEEL IS MAC'S. He dials it on the
           real screen and tells me the number; I do not get to guess it from a
           screenshot. `;` and `'` sit under the right hand, away from WASD. */
        else if (e.key === 'j' || e.key === 'J') this.chassis = !this.chassis;
        else if (e.key === "'") this.gain = Math.min(4, +(this.gain + 0.05).toFixed(2));
        else if (e.key === ';') this.gain = Math.max(0.4, +(this.gain - 0.05).toFixed(2));
        else return;
        this._paint();
        e.preventDefault();
      });

      setInterval(() => this._paint(), 500);
    },

    /* ---- THE SEAM ------------------------------------------------------
       Wrap the one function that draws the player body. ⛔ NOT A COPY OF IT —
       the original stays reachable and is still what draws the hull underlay,
       enemies, and everything else, so there is exactly one procedural
       renderer and this is a layer on top of it, not a fork of it. */
    install() {
      if (typeof fluidShader === 'undefined' || !fluidShader.drawOrganismMembrane) {
        console.warn('[sprites] fluidShader.drawOrganismMembrane missing — not installed');
        return false;
      }
      if (fluidShader._spritesInstalled) return true;
      const original = fluidShader.drawOrganismMembrane.bind(fluidShader);
      const self = this;

      fluidShader.drawOrganismMembrane = function (ctx, sx, sy, angle, coreR, nodes, color, state) {
        if (nodes && nodes.some(n => n.lost)) nodes = nodes.filter(n => !n.lost); // B3
        /* ⭐ SUBSTITUTE THE REAL HULL RADIUS AT THE SEAM. Every caller — the
           engine, the AI, the bay, the designer — passes its own idea of
           `coreR`, and none of them was updated when the scale ladder grew the
           core node. Correcting it HERE fixes the body for all five call sites
           at once, with zero edits to any of them. ⚖ It is not an override:
           `hullRadius` falls back to whatever was passed when a ship genuinely
           has no core node. */
        const hullR = self.hullRadius(coreR, nodes);
        if (!self.ready || !self.enabled) {
          return original(ctx, sx, sy, angle, hullR, nodes, color, state);
        }
        // The chassis goes down FIRST — the parts bolt onto it, not beside it.
        /* ⚡ Enemies (fluidShader._lod, set by Enemy.draw) skip the chassis spars:
           3 strokes per node x 24 ships. MEASURED 8.7 ms of the 83 ms frame with
           them on (profile-fps.mjs). `sprites.enemyChassis = true` restores them. */
        if (self.chassis && (!fluidShader._lod || self.enemyChassis)) self._drawChassis(ctx, sx, sy, angle, hullR, nodes);
        if (self.underlay) {
          /* THE HULL BODY. ⚠ Was 0.42 and MEASURED invisible against black —
             the small hulls (2-3 parts) read as modules floating inside a thin
             ring with nothing joining them. It is not a wash behind the art, it
             is the ship the art is bolted to, so it is drawn nearly solid and
             only held back enough to let the painted parts sit forward. */
          ctx.save();
          ctx.globalAlpha = 0.82;
          original(ctx, sx, sy, angle, hullR, nodes, color, state);
          ctx.restore();
        }
        self.draw(ctx, sx, sy, angle, hullR, nodes, color, state);
      };
      fluidShader._spritesInstalled = true;
      return true;
    }
  };

  window.sprites = sprites;

  function boot() {
    sprites.mount();
    sprites.install();
    sprites.load();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
