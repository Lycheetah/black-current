// hardpoints.js — THE SHIP BECOMES ITS GUNS
//
// THIS FILE OWNS ITS OWN INPUT AND ITS OWN HUD, DELIBERATELY — the same pattern
// as `energy.js` and `feel.js`. That keeps the change to `engine.js` down to
// three small reads. Two seats are live in this repo and `engine.js` is the one
// file most likely to be corrupted by both of us editing it at once.
//
// WHAT THIS FIXES
// ---------------
// `shootPrimary()` fired ONE bullet from the CORE CENTRE at `player.angle`.
// Six cannons shot identically to zero cannons. The node graph was already
// there, already correct, and nothing read it.
//
// THE GEOMETRY IS NOT REBUILT HERE. `SpringNode` remains the one ship format.
// This file only ASKS THE EXISTING GRAPH QUESTIONS IT WAS NEVER ASKED.
//
// ⭐ TRAVERSE IS DERIVED FROM THE GUN'S OWN RADIUS, so the keystone stat needs
//    no new authoring and no new data format. A bigger barrel is automatically
//    a slower one — every ship in the game, every preset, retroactively.
//
// NO ES MODULES. Classic script sharing globals. An `export` would defer this
// file and break the load order in index.html.

(function () {
  'use strict';

  const HP_DEFAULTS = {
    // Hull rotation, degrees/second. The vision's "turning takes real time".
    turnRate: 120,

    // Traverse: a `traverseRef`-pixel gun swings `traverseBase` rad/frame.
    // 12px gun -> 0.052 rad/f  = ~180 deg/s
    // 30px gun -> 0.0208 rad/f = ~71 deg/s
    traverseBase: 0.052,
    traverseRef: 12,

    // Firing arc HALF-width, radians: arcA - radius * arcB, floored at arcMin.
    // 12px -> 1.86 rad half (107 deg), ~213 deg total  — light mount, wide
    // 30px -> 1.05 rad half (60 deg),  ~120 deg total  — capital, narrow
    arcA: 2.4,
    arcB: 0.045,
    arcMin: 0.6,

    // ⛔ SIX GUNS MUST NOT BE SIX TIMES THE DPS or stacking cannons becomes the
    //    only build and customization dies. damage/gun scales 1/n^dpsExponent.
    //    At 0.5 that is 1/sqrt(n): six guns deliver 2.45x one gun, not 6x.
    //    What extra guns actually buy is COVERAGE and SURVIVABILITY.
    dpsExponent: 0.5,

    showArcs: false
  };

  const TAU = Math.PI * 2;

  function norm(a) {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  }

  const hardpoints = {
    turnRate: HP_DEFAULTS.turnRate,
    dpsExponent: HP_DEFAULTS.dpsExponent,
    showArcs: HP_DEFAULTS.showArcs,

    _turrets: [],
    _sig: '',

    // ---- geometry -------------------------------------------------------

    // Rebuild only when the node graph actually changes. The designer, a
    // level-up and a save-load all mutate nodes[]; polling a cheap signature
    // is how this stays correct without engine.js having to tell us.
    sync(player) {
      if (!player || !player.nodes) { this._turrets = []; this._sig = ''; return; }
      let sig = '';
      for (const n of player.nodes) sig += n.type + (n.lost ? '!' : '') + ':' + n.targetDx + ',' + n.targetDy + ',' + n.radius + ';';
      /* ⛔ THE SIGNATURE ALONE WAS NOT ENOUGH. `engine.applyDesign()` REPLACES
         `player.nodes` with fresh SpringNode objects. Re-applying a design of
         the same SHAPE produced an identical signature, so this returned early
         and every turret kept a reference to an ORPHANED node the spring
         physics no longer updates — guns firing from frozen positions on a hull
         that had moved. Comparing the ARRAY IDENTITY too is what catches a
         swap the shape cannot see. */
      if (sig === this._sig && this._nodesRef === player.nodes) return;
      this._sig = sig;
      this._nodesRef = player.nodes;

      this._turrets = [];
      player.nodes.forEach((n, i) => {
        if (n.type !== 'cannon' || n.lost) return;
        const r = Math.max(4, n.radius);
        // Where it faces at rest: outward along its own mount vector.
        // A cannon sitting exactly on the core has no vector, so it faces forward.
        const mountAngle = (n.targetDx === 0 && n.targetDy === 0) ? 0 : Math.atan2(n.targetDy, n.targetDx);
        // ⭐ PHASE 5: THE MOUNT'S RADIUS DECIDES WHAT WEAPON IT IS. Same trick
        //    as traverse — ask the existing graph a question it was never asked.
        //    Guarded so hardpoints still works if fleet.js fails to load.
        const band = (typeof window !== 'undefined' && window.fleet) ? window.fleet.mountBand(r) : null;
        this._turrets.push({
          node: n,
          index: i,
          radius: r,
          mountAngle: mountAngle,
          arc: Math.max(HP_DEFAULTS.arcMin, HP_DEFAULTS.arcA - r * HP_DEFAULTS.arcB),
          traverse: HP_DEFAULTS.traverseBase * (HP_DEFAULTS.traverseRef / r),
          // ⚠ SEEDED AT ITS OWN MOUNT ANGLE, NOT 0. A rear turret seeded facing
          //    forward had to swing a full 180 deg the instant it spawned.
          angle: mountAngle, // current LOCAL facing, relative to hull
          bearing: false,    // did it reach the target this frame
          flash: 0,
          weapon: band ? band.weapon : null,
          mountClass: band ? band.cls : 'LIGHT',
          cooldown: 0        // ⭐ EACH GUN NOW KEEPS ITS OWN CLOCK
        });
      });
    },

    count(player) {
      this.sync(player);
      return this._turrets.length;
    },

    // World position of a mount. Uses the LIVE spring offsets, not the target
    // ones, so the guns wobble with the hull instead of floating rigidly.
    _mountWorld(player, t) {
      const dx = t.node.currentDx, dy = t.node.currentDy;
      const c = Math.cos(player.angle), s = Math.sin(player.angle);
      return {
        x: player.x + (dx * c - dy * s),
        y: player.y + (dx * s + dy * c)
      };
    },

    // ---- per-frame ------------------------------------------------------

    // ⭐ EACH TURRET AIMS FROM ITS OWN MOUNT, NOT FROM THE CORE. On a wide hull
    //    that is a real difference: the far battery leads the near one, and a
    //    target close aboard can sit inside one gun's arc and outside another's.
    update(player) {
      if (!player || player.dead) return;
      this.sync(player);
      const aim = (player.aimAngle === undefined) ? player.angle : player.aimAngle;

      for (const t of this._turrets) {
        if (t.flash > 0) t.flash--;
        if (t.cooldown > 0) t.cooldown--;

        const w = this._mountWorld(player, t);
        const worldWant = Math.atan2(player._aimY - w.y, player._aimX - w.x);

        // Into hull-local space, then clamp into the arc around the mount.
        let want = norm(worldWant - player.angle);
        let off = norm(want - t.mountAngle);
        if (off > t.arc) off = t.arc;
        else if (off < -t.arc) off = -t.arc;
        const clamped = norm(t.mountAngle + off);

        // Swing toward it at the gun's own traverse. THE KEYSTONE.
        const delta = norm(clamped - t.angle);
        const step = Math.min(Math.abs(delta), t.traverse) * Math.sign(delta);
        t.angle = norm(t.angle + step);

        // "Bearing" means it is actually pointed at the target, not merely at
        // the edge of its arc. A gun that cannot bear does not fire.
        t.bearing = Math.abs(norm(t.angle - want)) < 0.12 && Math.abs(off) < t.arc - 0.001;
      }
      void aim;
    },

    // Ease the hull. ⭐ THIS IS FREE AND SAFE: movement is ABSOLUTE in this
    // engine — W is world-up, not ship-forward — so hull facing drives ONLY
    // gunnery and silhouette, never thrust. Slowing the turn adds all of the
    // weight and costs none of the responsiveness.
    steerHull(current, target) {
      const max = (this.turnRate * Math.PI / 180) / 60;
      const d = norm(target - current);
      if (Math.abs(d) <= max) return norm(target);
      return norm(current + Math.sign(d) * max);
    },

    // ---- firing ---------------------------------------------------------

    // Returns world spawn points + world angles for every gun that can bear.
    // An EMPTY ARRAY IS A REAL ANSWER: nothing bears, so nothing fires. That
    // is the moment a fast ship gets inside a capital's arc and is untouchable.
    /* ⭐ PER-MOUNT RELOAD. The weapon the mount's radius selected supplies the
       base interval; the HULL CLASS scales it. That is Mac's PHASE 5 ruling in
       one line: a titan's small guns still pop off, just slower, and they hit
       harder to pay for it. ⛔ Net DPS stays ~flat across the ladder ON
       PURPOSE — see THE FLAT LADDER in GAME_VISION.md. */
    _intervalFor(player, t) {
      const def = (typeof WEAPON_TYPES !== 'undefined' && t.weapon) ? WEAPON_TYPES[t.weapon] : null;
      const base = def ? def.fireRate : 10;
      const hb = (typeof window !== 'undefined' && window.fleet) ? window.fleet.hullBand(player) : { rate: 1 };
      const crew = (typeof saveState !== 'undefined' && saveState.crew()) ? saveState.crew().fireRateScale : 1;
      const rf = (typeof reactor !== 'undefined') ? reactor.fireIntervalScale() : 1;
      return Math.max(2, Math.round(base / Math.max(0.05, hb.rate) * crew * rf));
    },

    readyMounts(player) {
      this.sync(player);
      const out = [];
      for (const t of this._turrets) {
        if (!t.bearing) continue;
        if (t.cooldown > 0) continue;   // ⭐ this gun specifically is reloading
        const w = this._mountWorld(player, t);
        const worldAngle = norm(player.angle + t.angle);
        out.push({
          x: w.x + Math.cos(worldAngle) * t.radius,
          y: w.y + Math.sin(worldAngle) * t.radius,
          angle: worldAngle,
          radius: t.radius,
          turret: t
        });
        t.flash = 4;
        t.cooldown = this._intervalFor(player, t);
      }
      return out;
    },

    damageScale(player) {
      const n = this.count(player);
      const spread = n <= 1 ? 1 : 1 / Math.pow(n, this.dpsExponent);
      // ⭐ THE HULL CLASS PAYS BACK WHAT THE RATE TOOK. Slower guns hit harder.
      const hb = (typeof window !== 'undefined' && window.fleet) ? window.fleet.hullBand(player) : { dmg: 1 };
      return spread * hb.dmg;
    },

    // ---- overlay --------------------------------------------------------

    // Called inside engine.js's world pass, so it is already in world space.
    drawArcs(ctx, player) {
      if (!this.showArcs || !player || player.dead) return;
      this.sync(player);
      ctx.save();
      for (const t of this._turrets) {
        const w = this._mountWorld(player, t);
        const base = norm(player.angle + t.mountAngle);
        const reach = 40 + t.radius * 12;

        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.arc(w.x, w.y, reach, base - t.arc, base + t.arc);
        ctx.closePath();
        ctx.fillStyle = t.bearing ? 'rgba(80,255,180,0.10)' : 'rgba(255,120,120,0.07)';
        ctx.fill();
        ctx.strokeStyle = t.bearing ? 'rgba(80,255,180,0.35)' : 'rgba(255,120,120,0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const a = norm(player.angle + t.angle);
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x + Math.cos(a) * reach, w.y + Math.sin(a) * reach);
        ctx.strokeStyle = t.bearing ? 'rgba(140,255,210,0.7)' : 'rgba(255,160,160,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    },

    // ---- HUD + input ----------------------------------------------------

    _hud: null,

    _paint() {
      if (!this._hud) return;
      const n = window.engine && window.engine.player ? this.count(window.engine.player) : 0;
      const scale = n <= 1 ? 1 : 1 / Math.pow(n, this.dpsExponent);
      this._hud.innerHTML =
        '<b>TURN</b> ' + this.turnRate.toFixed(0) + '&deg;/s &nbsp; ' +
        '<b>GUNS</b> ' + n + ' &nbsp; ' +
        '<b>DMG/GUN</b> &times;' + scale.toFixed(2) +
        ' &nbsp; <b>FLEET</b> &times;' + (n * scale).toFixed(2) +
        '<br><span style="opacity:.55">&lt; &gt; turn rate &nbsp; k arcs &nbsp; \\ reset</span>';
    },

    mount() {
      const el = document.createElement('div');
      el.id = 'hardpoint-hud';
      el.style.cssText =
        'position:fixed;right:10px;bottom:96px;z-index:60;' +
        'font:11px ui-monospace,Menlo,Consolas,monospace;color:#9fe8d0;' +
        'background:rgba(4,10,14,.72);border:1px solid rgba(120,220,190,.28);' +
        'border-radius:6px;padding:6px 9px;pointer-events:none;line-height:1.5;';
      document.body.appendChild(el);
      this._hud = el;
      this._paint();

      window.addEventListener('keydown', (e) => {
        // ⚠ `[` and `]` are ALREADY DOUBLE-BOUND in this repo (feel.js zoom and
        //    shaders.js fog both listen on window). Deliberately staying clear
        //    of them — and of the digits, which select weapons.
        let hit = true;
        if (e.key === '<' || (e.shiftKey && e.code === 'Comma')) {
          this.turnRate = Math.max(20, this.turnRate - 10);
        } else if (e.key === '>' || (e.shiftKey && e.code === 'Period')) {
          this.turnRate = Math.min(720, this.turnRate + 10);
        } else if (e.key === 'k' || e.key === 'K') {
          this.showArcs = !this.showArcs;
        } else if (e.key === '\\') {
          this.turnRate = HP_DEFAULTS.turnRate;
          this.dpsExponent = HP_DEFAULTS.dpsExponent;
        } else {
          hit = false;
        }
        if (hit) this._paint();
      });

      setInterval(() => this._paint(), 500);
    }
  };

  window.hardpoints = hardpoints;
  window.HP_DEFAULTS = HP_DEFAULTS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hardpoints.mount());
  } else {
    hardpoints.mount();
  }
})();
