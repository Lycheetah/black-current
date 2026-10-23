/* ==========================================================================
   BLACK CURRENT — THE FITTING BAY
   ==========================================================================

   MAC, 2026-08-17: *"we need a ship custimzition bay."*

   ⭐ SEARCH BEFORE SPECIFICATION — WHAT ALREADY EXISTED, AND WHY IT IS NOT THIS.
     `js/designer.js` (Tab) is the ORGANISM designer inherited from Bubble Tanks:
     a 340 px ring you attach organelles to, priced in GP. It is a good tool and
     it stays. But it predates the dreadnought turn and it cannot see any of it —
     it knows nothing about mount bands, traverse speed, firing arcs, hull class,
     the nine fleet hulls, or the 99 drawable sprites. Fitting a ship in it is
     like buying an engine by its paint.
     `js/garage.js` picks a hull ONCE, at the title screen, before you have a
     reason to prefer one.

     So this is NEW, not a replacement: the room where the dreadnought language
     is actually legible and editable. Tab still opens the organism designer.

   ⚖ IT IS AN ADAPTER OVER LIVE TRUTH, NOT A SECOND RULE SET. Every number on
     screen is computed at paint time by the code that fights with it:

       · mount class + weapon   `fleet.mountBand(radius)`
       · traverse °/s, arc°     `window.HP_DEFAULTS`, hardpoints.js's own constants
       · hull class, rate, dmg  `fleet.hullBand(ship)`
       · GP cost of a socket    `fleet.costOfNode(type, radius)`
       · GP available           `progression.getTotalGP()`
       · socket ceiling         `progression.getEvolutionData().maxSockets`
       · the ship you are looking at   `fluidShader.drawOrganismMembrane`,
         the single call the real player body draws through — so the preview is
         not a diagram OF the ship, it is the ship's own renderer.

     If any of those constants change, this screen changes with them. There is
     no number typed into this file that the engine does not already own.

   ⭐⭐ THE ONE LEVER WORTH UNDERSTANDING IS MOUNT RADIUS.
     A socket's RADIUS is what picks its weapon, and traverse is `1/radius`, so
     making a gun bigger makes it hit harder AND swing slower — a 31 px siege
     mount turns at a third the rate of a 10 px light one. That is Mac's keystone
     stat, and this screen exists mostly so you can feel it while you build:
     drag a mount up two bands and watch the arc close.

   ⛔ COMMITS THROUGH `engine.applyDesign()` AND NOWHERE ELSE. That is the one
     choke point that already writes `saveState.doc.design` and persists. This
     file never touches the save document directly.

   ⚠ SELF-OWNING, AS THIS CODEBASE DOES IT (feel.js, hardpoints.js, energy.js,
     sprites.js): it builds its own DOM, injects its own stylesheet, owns its own
     key, and requires ZERO edits to engine.js, index.html markup or the CSS
     files — only one script tag. Two seats work in this repo and `engine.js` is
     the file most likely to be corrupted by both editing it at once.

   Key: B
   ========================================================================== */

(function () {
  'use strict';

  const TYPES = ['cannon', 'pod', 'spike', 'thruster', 'shield'];
  const TYPE_LABEL = {
    cannon: 'CANNON', pod: 'POD', spike: 'RAM SPIKE',
    thruster: 'THRUSTER', shield: 'SHIELD EMITTER'
  };
  const R_MIN = 6, R_MAX = 40;

  const bay = {
    open: false,
    ship: null,        // { color, primaryWeapon, secAbility, nodes:[...] }
    sel: -1,           // index into ship.nodes
    _wasPaused: false,

    /* ── the model ──────────────────────────────────────────────────────── */

    /** A plain, editable copy of whatever the player is flying right now. */
    _snapshot() {
      const p = engine.player;
      return {
        color: p.color,
        primaryWeapon: p.primaryWeapon || 'spitter',
        secAbility: p.secAbility || 'shield',
        nodes: p.nodes.map(n => ({
          dx: n.dx, dy: n.dy, radius: n.radius, type: n.type,
          art: n.art || null
        }))
      };
    },

    /** Load one of the nine authored hulls into the bay without equipping it. */
    _loadHull(key) {
      const h = window.FLEET_HULLS && FLEET_HULLS[key];
      if (!h) return;
      this.ship = {
        color: h.color,
        primaryWeapon: h.primaryWeapon || 'spitter',
        secAbility: h.secAbility || 'shield',
        nodes: h.nodes.map(n => ({
          dx: n.dx, dy: n.dy, radius: n.radius, type: n.type, art: null
        }))
      };
      this.hullKey = key;
      this.sel = this.ship.nodes.findIndex(n => n.type !== 'core');
      this.paint();
    },

    usedGP() {
      if (!this.ship || !window.fleet) return 0;
      return this.ship.nodes.reduce(
        (s, n) => s + (n.type === 'core' ? 0 : fleet.costOfNode(n.type, n.radius)), 0);
    },

    sockets() { return this.ship ? this.ship.nodes.filter(n => n.type !== 'core').length : 0; },

    maxSockets() {
      return (typeof progression !== 'undefined')
        ? progression.getEvolutionData().maxSockets : 8;
    },

    /* ── the read-outs, all derived ─────────────────────────────────────── */

    /** Traverse and arc for one mount, from hardpoints.js's own constants. */
    gunnery(radius) {
      const D = window.HP_DEFAULTS || {
        traverseBase: 0.052, traverseRef: 12, arcA: 2.4, arcB: 0.045, arcMin: 0.6
      };
      const radPerFrame = D.traverseBase * (D.traverseRef / Math.max(2, radius));
      const degPerSec = radPerFrame * 60 * 180 / Math.PI;
      const arcRad = Math.max(D.arcMin, D.arcA - D.arcB * radius);
      return { degPerSec, arcDeg: arcRad * 180 / Math.PI };
    },

    /* ── DOM ────────────────────────────────────────────────────────────── */

    _style() {
      if (document.getElementById('bay-style')) return;
      const s = document.createElement('style');
      s.id = 'bay-style';
      s.textContent = `
#bay-overlay{position:fixed;inset:0;z-index:400;display:none;background:rgba(3,7,14,.94);
  backdrop-filter:blur(6px);font-family:"Courier New",monospace;color:#cfe6f2}
#bay-overlay.on{display:flex;flex-direction:column}
.bay-top{display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid rgba(0,243,255,.22);flex:0 0 auto}
.bay-top h2{margin:0;font-size:17px;letter-spacing:3px;color:#00f3ff}
.bay-top .hint{font-size:11px;opacity:.55;letter-spacing:1px}
.bay-hulls{display:flex;gap:6px;overflow-x:auto;padding:8px 20px;flex:0 0 auto;
  border-bottom:1px solid rgba(0,243,255,.12)}
.bay-hulls button{background:rgba(0,243,255,.06);border:1px solid rgba(0,243,255,.3);
  color:#9fd9e8;padding:5px 11px;font:11px "Courier New",monospace;letter-spacing:1px;
  cursor:pointer;white-space:nowrap;border-radius:3px}
.bay-hulls button:hover{background:rgba(0,243,255,.16)}
.bay-hulls button.on{background:#00f3ff;color:#04121a;border-color:#00f3ff;font-weight:bold}
.bay-body{flex:1 1 auto;display:flex;min-height:0}
.bay-view{flex:1 1 58%;position:relative;display:flex;align-items:center;justify-content:center;
  border-right:1px solid rgba(0,243,255,.16);min-width:0}
#bay-canvas{max-width:100%;max-height:100%;cursor:crosshair}
.bay-side{flex:0 0 380px;display:flex;flex-direction:column;min-height:0;overflow-y:auto}
.bay-sec{padding:12px 16px;border-bottom:1px solid rgba(0,243,255,.12)}
.bay-sec h3{margin:0 0 8px;font-size:11px;letter-spacing:2px;color:#00f3ff;opacity:.85}
.bay-row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
.bay-row span{opacity:.6}
.bay-row strong{color:#e8f6fb;font-weight:normal}
.bay-band{font-size:15px;letter-spacing:2px;font-weight:bold}
.bay-ctl{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
.bay-ctl button{flex:1 1 auto;background:rgba(0,243,255,.07);border:1px solid rgba(0,243,255,.28);
  color:#9fd9e8;padding:6px 8px;font:11px "Courier New",monospace;cursor:pointer;border-radius:3px}
.bay-ctl button:hover{background:rgba(0,243,255,.18);color:#fff}
.bay-ctl button.bad{border-color:rgba(255,51,102,.45);color:#ff8fa8}
.bay-types{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}
.bay-types button{background:rgba(0,243,255,.05);border:1px solid rgba(0,243,255,.2);
  color:#8fb4c4;padding:5px 2px;font:10px "Courier New",monospace;cursor:pointer;border-radius:3px}
.bay-types button.on{background:#00f3ff;color:#04121a;font-weight:bold}
.bay-art{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px;
  max-height:190px;overflow-y:auto}
.bay-art div{aspect-ratio:1;border:1px solid rgba(0,243,255,.18);border-radius:3px;
  background:rgba(0,20,30,.55) center/contain no-repeat;cursor:pointer}
.bay-art div:hover{border-color:#00f3ff}
.bay-art div.on{border-color:#ffb703;box-shadow:0 0 8px rgba(255,183,3,.5)}
.bay-foot{flex:0 0 auto;display:flex;align-items:center;gap:16px;padding:11px 20px;
  border-top:1px solid rgba(0,243,255,.22);font-size:12px}
.bay-foot .grow{flex:1 1 auto}
.bay-foot .over{color:#ff3366}
.bay-foot button{background:#00f3ff;color:#04121a;border:0;padding:9px 22px;font:bold 12px "Courier New",monospace;
  letter-spacing:2px;cursor:pointer;border-radius:3px}
.bay-foot button.ghost{background:transparent;color:#9fd9e8;border:1px solid rgba(0,243,255,.35);font-weight:normal}
.bay-foot button:disabled{opacity:.35;cursor:not-allowed}
`;
      document.head.appendChild(s);
    },

    _build() {
      if (this.el) return;
      this._style();
      const d = document.createElement('div');
      d.id = 'bay-overlay';
      d.innerHTML = `
<div class="bay-top">
  <h2>FITTING BAY</h2>
  <span class="hint">click a socket &middot; [ ] resize &middot; ESC / B to leave</span>
</div>
<div class="bay-hulls" id="bay-hulls"></div>
<div class="bay-body">
  <div class="bay-view"><canvas id="bay-canvas" width="720" height="720"></canvas></div>
  <div class="bay-side">
    <div class="bay-sec" id="bay-mount"></div>
    <div class="bay-sec">
      <h3>SOCKET TYPE</h3>
      <div class="bay-types" id="bay-types"></div>
    </div>
    <div class="bay-sec">
      <h3>PLATING &mdash; the casting bolted to this socket</h3>
      <div class="bay-art" id="bay-art"></div>
    </div>
  </div>
</div>
<div class="bay-foot">
  <span id="bay-budget"></span>
  <span id="bay-class"></span>
  <span class="grow"></span>
  <button class="ghost" id="bay-revert">REVERT</button>
  <button id="bay-commit">COMMIT REFIT</button>
</div>`;
      document.body.appendChild(d);

      this.el = {
        root: d,
        hulls: d.querySelector('#bay-hulls'),
        canvas: d.querySelector('#bay-canvas'),
        mount: d.querySelector('#bay-mount'),
        types: d.querySelector('#bay-types'),
        art: d.querySelector('#bay-art'),
        budget: d.querySelector('#bay-budget'),
        klass: d.querySelector('#bay-class'),
        commit: d.querySelector('#bay-commit'),
        revert: d.querySelector('#bay-revert')
      };
      this.ctx = this.el.canvas.getContext('2d');

      this.el.commit.addEventListener('click', () => this.commit());
      this.el.revert.addEventListener('click', () => { this.ship = this._snapshot(); this.hullKey = null; this.paint(); });
      this.el.canvas.addEventListener('click', e => this._pick(e));
      this.el.canvas.addEventListener('contextmenu', e => { e.preventDefault(); this._remove(); });
    },

    /* ── interaction ────────────────────────────────────────────────────── */

    /** Canvas -> world, then nearest socket. Click empty space to add one. */
    _pick(e) {
      const r = this.el.canvas.getBoundingClientRect();
      const scale = this.el.canvas.width / r.width;
      const x = (e.clientX - r.left) * scale - this.el.canvas.width / 2;
      const y = (e.clientY - r.top) * scale - this.el.canvas.height / 2;
      const wx = x / this.view, wy = y / this.view;

      let best = -1, bestD = Infinity;
      this.ship.nodes.forEach((n, i) => {
        if (n.type === 'core') return;
        const dd = Math.hypot(wx - n.dx, wy - n.dy);
        if (dd < n.radius + 10 && dd < bestD) { bestD = dd; best = i; }
      });

      if (best >= 0) { this.sel = best; this.paint(); return; }

      // Empty space beyond the core: mount a new socket there.
      const core = this.ship.nodes.find(n => n.type === 'core');
      const cr = (core && core.radius) || 18;
      const d = Math.hypot(wx, wy);
      if (d < cr * 0.9 || d > cr * 5.5) return;
      if (this.sockets() >= this.maxSockets()) {
        this._flash(`Socket ceiling reached — ${this.maxSockets()} at ${progression.getEvolutionData().title}`);
        return;
      }
      this.ship.nodes.push({ dx: wx, dy: wy, radius: 12, type: 'cannon', art: null });
      this.sel = this.ship.nodes.length - 1;
      this.paint();
    },

    _remove() {
      const n = this.ship.nodes[this.sel];
      if (!n || n.type === 'core') return;
      this.ship.nodes.splice(this.sel, 1);
      this.sel = this.ship.nodes.findIndex(m => m.type !== 'core');
      this.paint();
    },

    _resize(step) {
      const n = this.ship.nodes[this.sel];
      if (!n || n.type === 'core') return;
      n.radius = Math.max(R_MIN, Math.min(R_MAX, n.radius + step));
      n.art = null;          // the casting is chosen by size; a resize re-picks
      this.paint();
    },

    _flash(text) { if (window.garage) garage.banner(text, 'bad'); },

    /* ── painting ───────────────────────────────────────────────────────── */

    paint() {
      if (!this.open || !this.ship) return;
      this._paintHulls();
      this._paintShip();
      this._paintMount();
      this._paintTypes();
      this._paintArt();
      this._paintFoot();
    },

    _paintHulls() {
      const h = this.el.hulls;
      h.innerHTML = '';
      const add = (label, key, on) => {
        const b = document.createElement('button');
        b.textContent = label;
        if (on) b.className = 'on';
        b.addEventListener('click', () => {
          if (key === null) { this.ship = this._snapshot(); this.hullKey = null; this.sel = this.ship.nodes.findIndex(n => n.type !== 'core'); this.paint(); }
          else this._loadHull(key);
        });
        h.appendChild(b);
      };
      add('MY SHIP', null, !this.hullKey);
      if (window.fleet && fleet.order) {
        for (const k of fleet.order) {
          const hull = FLEET_HULLS[k];
          add(`${hull.mark || ''} ${hull.frame || k}`.trim(), k, this.hullKey === k);
        }
      }
    },

    _paintShip() {
      const c = this.el.canvas, ctx = this.ctx;
      ctx.clearRect(0, 0, c.width, c.height);

      /* Fit the whole hull in view: the reach of the furthest socket, plus its
         own radius, plus margin. ⚠ COMPUTED, NOT A CONSTANT — a leviathan and a
         two-node frigate must BOTH fill the frame or the bay lies about scale
         by making everything look the same size. */
      let reach = 40;
      for (const n of this.ship.nodes) reach = Math.max(reach, Math.hypot(n.dx, n.dy) + n.radius);
      this.view = (c.width * 0.40) / reach;

      const cx = c.width / 2, cy = c.height / 2;

      // Range rings, in world px, so the size of the ship is readable.
      ctx.save();
      ctx.strokeStyle = 'rgba(0,243,255,.10)';
      ctx.lineWidth = 1;
      for (let r = 40; r <= reach * 1.2; r += 40) {
        ctx.beginPath(); ctx.arc(cx, cy, r * this.view, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // Forward is +X, as the hull schema defines it. Say so.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,183,3,.35)';
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + reach * this.view * 1.15, cy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,183,3,.6)';
      ctx.font = '12px "Courier New",monospace';
      ctx.fillText('PROW', cx + reach * this.view * 1.15 - 34, cy - 8);
      ctx.restore();

      /* ⭐ THE SHIP IS DRAWN BY THE GAME'S OWN RENDERER, scaled. Anything else
         would be a diagram that could disagree with the thing you fly. */
      const scaled = this.ship.nodes.map(n => ({
        dx: n.dx, dy: n.dy, x: 0, y: 0, radius: n.radius, type: n.type, art: n.art
      }));
      const core = this.ship.nodes.find(n => n.type === 'core');

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(this.view, this.view);
      ctx.translate(-cx / this.view, -cy / this.view);
      try {
        fluidShader.drawOrganismMembrane(
          ctx, cx / this.view, cy / this.view, 0,
          (core && core.radius) || 18, scaled, this.ship.color, {}
        );
      } catch (err) { /* a bad frame must never trap the player in the bay */ }
      ctx.restore();

      // Socket furniture ON TOP: selection, band tint, and the firing arc.
      this.ship.nodes.forEach((n, i) => {
        if (n.type === 'core') return;
        const sx = cx + n.dx * this.view, sy = cy + n.dy * this.view;
        const band = window.fleet ? fleet.mountBand(n.radius) : null;
        const on = i === this.sel;

        if (n.type === 'cannon' && band) {
          const g = this.gunnery(n.radius);
          const half = (g.arcDeg / 2) * Math.PI / 180;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.fillStyle = band.tint;
          ctx.globalAlpha = on ? 0.16 : 0.06;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, n.radius * this.view * 4.2, -half, half);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = band ? band.tint : '#8FA6C4';
        ctx.globalAlpha = on ? 1 : 0.45;
        ctx.lineWidth = on ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, n.radius * this.view, 0, Math.PI * 2);
        ctx.stroke();
        if (on) {
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(sx, sy, n.radius * this.view + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });
    },

    _paintMount() {
      const n = this.ship.nodes[this.sel];
      const box = this.el.mount;
      if (!n) { box.innerHTML = '<h3>NO SOCKET SELECTED</h3><div class="bay-row"><span>click a socket, or click empty space to mount a new one</span></div>'; return; }

      const band = window.fleet ? fleet.mountBand(n.radius) : { cls: '?', weapon: '?', tint: '#8FA6C4' };
      const g = this.gunnery(n.radius);
      const cost = window.fleet ? fleet.costOfNode(n.type, n.radius) : 0;
      const gun = n.type === 'cannon';

      box.innerHTML = `
<h3>SOCKET ${this.sel + 1} &mdash; ${TYPE_LABEL[n.type] || n.type.toUpperCase()}</h3>
<div class="bay-row"><span>class</span><strong class="bay-band" style="color:${band.tint}">${band.cls}</strong></div>
<div class="bay-row"><span>mount radius</span><strong>${n.radius.toFixed(0)} px</strong></div>
${gun ? `
<div class="bay-row"><span>weapon</span><strong>${band.weapon}</strong></div>
<div class="bay-row"><span>traverse</span><strong>${g.degPerSec.toFixed(0)}&deg;/s</strong></div>
<div class="bay-row"><span>firing arc</span><strong>&plusmn;${(g.arcDeg / 2).toFixed(0)}&deg;</strong></div>` : `
<div class="bay-row"><span>gunnery</span><strong style="opacity:.5">not a weapon mount</strong></div>`}
<div class="bay-row"><span>cost</span><strong>${cost} GP</strong></div>
<div class="bay-ctl">
  <button data-a="-4">&laquo; &minus;4</button>
  <button data-a="-1">&minus;1</button>
  <button data-a="1">+1</button>
  <button data-a="4">+4 &raquo;</button>
  <button class="bad" data-a="x">UNMOUNT</button>
</div>
${gun ? `<div class="bay-row" style="margin-top:8px"><span style="line-height:1.5">a bigger mount hits harder and swings slower &mdash; traverse is 1/radius, so this is the whole trade</span></div>` : ''}`;

      box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'x') this._remove(); else this._resize(parseInt(a, 10));
      }));
    },

    _paintTypes() {
      const n = this.ship.nodes[this.sel];
      this.el.types.innerHTML = '';
      for (const t of TYPES) {
        const b = document.createElement('button');
        b.textContent = TYPE_LABEL[t];
        if (n && n.type === t) b.className = 'on';
        b.addEventListener('click', () => {
          if (!n || n.type === 'core') return;
          n.type = t; n.art = null; this.paint();
        });
        this.el.types.appendChild(b);
      }
    },

    _paintArt() {
      const n = this.ship.nodes[this.sel];
      const box = this.el.art;
      box.innerHTML = '';
      if (!n || !window.sprites || !sprites.byType) {
        box.innerHTML = '<div style="grid-column:1/-1;opacity:.5;font-size:11px;border:0">no art library loaded</div>';
        return;
      }
      const bucket = sprites.byType[n.type] || [];
      if (!bucket.length) {
        box.innerHTML = `<div style="grid-column:1/-1;opacity:.5;font-size:11px;border:0">no castings indexed for ${n.type}</div>`;
        return;
      }
      for (const e of bucket) {
        const cell = document.createElement('div');
        // Same clean/ rule sprites.js uses: insert the folder before the file.
        const p = e.path.replace(/\/([^/]+)$/, '/clean/$1');
        cell.style.backgroundImage = `url("${p}"), url("${e.path}")`;
        cell.title = e.file;
        if (n.art === e.file) cell.className = 'on';
        cell.addEventListener('click', () => { n.art = (n.art === e.file ? null : e.file); this.paint(); });
        box.appendChild(cell);
      }
    },

    _paintFoot() {
      const have = (typeof progression !== 'undefined') ? progression.getTotalGP() : 0;
      const used = this.usedGP();
      const over = used > have;
      this.el.budget.innerHTML =
        `<span style="opacity:.6">GP</span> <strong class="${over ? 'over' : ''}">${used} / ${have}</strong>` +
        `&nbsp;&nbsp;<span style="opacity:.6">SOCKETS</span> <strong>${this.sockets()} / ${this.maxSockets()}</strong>`;

      const hb = window.fleet ? fleet.hullBand({ nodes: this.ship.nodes }) : null;
      this.el.klass.innerHTML = hb
        ? `<span style="opacity:.6">HULL</span> <strong style="letter-spacing:2px">${hb.cls}</strong>` +
          `&nbsp;<span style="opacity:.45">rate &times;${hb.rate.toFixed(2)} &middot; dmg &times;${hb.dmg.toFixed(2)}</span>`
        : '';

      this.el.commit.disabled = over || this.sockets() > this.maxSockets();
      this.el.commit.textContent = over ? 'OVER BUDGET' : 'COMMIT REFIT';
    },

    /* ── commit ─────────────────────────────────────────────────────────── */

    commit() {
      if (!this.ship) return;
      const design = {
        color: this.ship.color,
        primaryWeapon: this.ship.primaryWeapon,
        secAbility: this.ship.secAbility,
        nodes: this.ship.nodes.map(n => ({
          dx: n.dx, dy: n.dy, radius: n.radius, type: n.type, art: n.art || null
        }))
      };

      /* ⛔ THE ONE CHOKE POINT. applyDesign rebuilds the node array, recalculates
         stats, heals, and writes `saveState.doc.design`. Anything this file did
         to the save directly would be a second path to the same truth. */
      engine.applyDesign(design);

      /* `applyDesign` maps through `new SpringNode(dx, dy, radius, type)`, whose
         signature has no room for a casting — so the plating is re-attached to
         the live nodes here, by index. It IS persisted: the object above is what
         `saveState.doc.design` stores, and `_restoreArt()` puts it back on load. */
      this._restoreArt();

      if (window.fleet) fleet.index = -1;      // this is your own ship again
      if (window.garage) garage.banner('Refit committed', 'good');
      this.close();
    },

    /** Re-attach saved castings to the live node objects, by index. */
    _restoreArt() {
      const d = (typeof saveState !== 'undefined') && saveState.doc && saveState.doc.design;
      if (!d || !d.nodes || !engine.player) return;
      engine.player.nodes.forEach((n, i) => {
        const src = d.nodes[i];
        if (src && src.art) n.art = src.art;
      });
      if (window.sprites && sprites._pick) sprites._pick = new WeakMap();
    },

    /* ── open / close ───────────────────────────────────────────────────── */

    show() {
      if (!window.engine || !engine.player || engine.player.dead) return;
      this._build();
      this.ship = this._snapshot();
      this.hullKey = null;
      this.sel = this.ship.nodes.findIndex(n => n.type !== 'core');
      this.open = true;
      this._wasPaused = engine.paused;
      engine.paused = true;
      this.el.root.classList.add('on');
      this.paint();
    },

    close() {
      if (!this.open) return;
      this.open = false;
      this.el.root.classList.remove('on');
      engine.paused = this._wasPaused;
    },

    toggle() { this.open ? this.close() : this.show(); }
  };

  window.bay = bay;

  window.addEventListener('keydown', e => {
    const tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.code === 'KeyB' && !e.repeat) { e.preventDefault(); bay.toggle(); return; }
    if (!bay.open) return;

    if (e.code === 'Escape') { e.preventDefault(); bay.close(); }
    else if (e.code === 'BracketLeft') { e.preventDefault(); bay._resize(-1); }
    else if (e.code === 'BracketRight') { e.preventDefault(); bay._resize(1); }
    else if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); bay._remove(); }
  }, true);   /* ⚠ CAPTURE. `[` and `]` are already bound by feel.js (zoom) and
                 shaders.js (fog); inside the bay they must mean mount size and
                 nothing else, and capture is the only way to say so without
                 editing two files that are not mine. */

  window.addEventListener('load', () => {
    if (window.bay) bay._restoreArt();
    console.log('[bay] fitting bay ready — B');
  });
})();
