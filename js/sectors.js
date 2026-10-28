/* ==========================================================================
   BLACK CURRENT — THE SECTOR FIELD: LANDMARKS, SALVAGE AND BEARING
   ==========================================================================

   MAC, 2026-08-17: *"sectors are to small feel dead ... im -50% zoomed out to
   just see everything meaning we have a fuck ton of room to work with."*

   `js/map.js` answered the first half by taking the sector radius from 750 to
   2600. THIS FILE EXISTS BECAUSE THAT CHANGE, ON ITS OWN, WOULD HAVE MADE THE
   SECOND HALF WORSE.

   ⭐⭐ EMPTINESS IS NOT WHAT MADE IT FEEL DEAD. HAVING NOWHERE TO GO IS.
      At radius 750 the boundary membrane was always on screen. It was doing
      three jobs nobody had named: it proved you were moving, it told you where
      you were, and it gave you something to steer at. Move the wall out to 2600
      and all three vanish at once — you get a bigger room that is emptier, with
      no proof of motion and no destination. That is a downgrade, and it is the
      exact trap a "just make the number bigger" fix walks into.

   SO THE SECTOR GETS LANDMARKS, AND THEY ARE NOT DECORATION:

     ⚖ THE LANDMARK IS WHERE THE CONTENT IS. `engine.loadChamberEntities()`
       asks this file for its spawn points, so hostiles gather AT the landmarks.
       Each cluster is about as dense as the whole old sector was; there are
       three to five of them; and the space between them is travel toward
       something visible rather than filler. A landmark that only looked like a
       place would be exactly the "decorative depth" this project forbids.

     ⚖ SALVAGE IS THE EXISTING DROP SYSTEM, NOT A NEW ONE. A cache pushes real
       `BubbleDrop`s into `progression.bubbleDrops` — the same objects an enemy
       death produces, collected by the same `updateDrops()` magnet, worth the
       same mass toward the same evolution thresholds. No second economy.

     ⚖ BEARING IS WHAT MAKES 5200 px NAVIGABLE. Off-screen landmarks get a
       chevron at the edge of view with a range in metres. Without it a big
       sector is a maze; with it, it is a chart.

   ⭐⭐ ONE SEAM, ZERO `engine.js` EDITS — the same discipline `js/sprites.js`
      uses. This file WRAPS two functions the render loop already calls:
        · `worldMap.drawChamberMembrane` — landmarks go UNDER everything
        · `particleSystem.draw`          — bearing chevrons go OVER everything
      Both are called inside the world pass, after `ctx.scale(zoom)` and with
      the `x - camera.x` convention, so this file uses that convention too.

   ⚠ THE LAYOUT IS AUTHORED BY THE COORDINATES, NOT ROLLED. Every landmark is a
     pure function of (gridX, gridY) via a seeded PRNG, exactly as `missionFor`
     already is. Sector (2,-1) has the same three wrecks in the same places
     every session on every machine, so it can become a place you KNOW. Nothing
     here is written to the save document.

   Keys: N toggles the bearing chevrons.
   ========================================================================== */

(function () {
  'use strict';

  /* ── deterministic layout ─────────────────────────────────────────────── */

  /** mulberry32 — small, fast, and identical everywhere. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* The four kinds. `weight` is the share of the sector's hostiles that gather
     here — a wreck is picked over, a beacon is guarded, a reef is where things
     hide, a cache is bait. */
  const KINDS = {
    wreck:  { label: 'WRECK',  tint: '#8FA6C4', weight: 1.3, r: 150 },
    beacon: { label: 'BEACON', tint: '#00f3ff', weight: 1.6, r: 110 },
    reef:   { label: 'REEF',   tint: '#2E8B57', weight: 0.9, r: 190 },
    cache:  { label: 'CACHE',  tint: '#ffb703', weight: 0.5, r:  90 }
  };

  const sectorField = {
    show: true,
    _cache: new Map(),      // "x,y" -> landmark[]

    /**
     * The landmarks of a chamber. Pure function of its coordinates, memoised.
     * ⚠ A CACHE THAT OUTLIVES THE ANSWER IS A BUG, so this is keyed by the system, grid
     *   position and room radius.
     */
    landmarks(chamber) {
      const key = `${chamber.sysId||'home'}:${chamber.key||`${chamber.gridX},${chamber.gridY}`}:${chamber.radius||2600}`;
      const had = this._cache.get(key);
      if (had) return had;

      const R = chamber.radius || 2600;
      // Distinct seed per cell; the offsets keep (0,0) from seeding zero.
      // F3b: a galaxy system mixes its id in, so each system has its own layout.
      let sysHash = 0;
      const sid = chamber.sysId && chamber.sysId !== 'home' ? chamber.sysId : '';
      for (let i = 0; i < sid.length; i++) sysHash = Math.imul(sysHash ^ sid.charCodeAt(i), 2654435761);
      const rand = rng((((chamber.gridX + 8) * 73856093) ^ ((chamber.gridY + 8) * 19349663)) ^ sysHash);

      /* The home sector is deliberately the quietest — it is where you learn
         the controls, not where you learn the map. */
      const home = chamber.gridX === 0 && chamber.gridY === 0;
      const n = home ? 2 : (chamber.radius>6000?7:chamber.radius>2600?5:3) + Math.floor(rand() * 3);      // 3..9, more in larger rooms

      const out = [];
      const kinds = ['wreck', 'reef', 'beacon', 'wreck', 'reef', 'cache'];
      // A guaranteed cache in every non-home sector: travel must always pay.
      const cacheAt = home ? -1 : Math.floor(rand() * n);

      for (let i = 0; i < n; i++) {
        /* Spread by ANGLE FIRST so two landmarks can never stack, then vary the
           range. 0.22R..0.86R keeps them off the spawn point and off the wall. */
        const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * (Math.PI / n);
        const d = R * (0.22 + rand() * 0.64);
        const kind = i === cacheAt ? 'cache' : kinds[Math.floor(rand() * kinds.length)];
        const def = KINDS[kind];

        out.push({
          kind, def,
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          radius: def.r * (0.75 + rand() * 0.6),
          spin: (rand() - 0.5) * 0.0004,
          seed: rand(),
          /* Salvage state is per-session and lives on the landmark, NOT in the
             save document. Re-entering re-arms it, which is deliberate: this is
             a travel reward, not a farm — the mass is small and the trip is the
             cost. Persisting it would need a save-schema change to solve a
             problem nobody has reported. */
          taken: false
        });
      }

      this._cache.set(key, out);
      return out;
    },

    /**
     * Where `engine.loadChamberEntities()` should put its hostiles.
     * Returns `count` world points, gathered at the landmarks by weight.
     */
    spawnPoints(chamber, count) {
      const marks = this.landmarks(chamber);
      if (!marks.length) return null;

      const total = marks.reduce((s, m) => s + m.def.weight, 0);
      const pts = [];
      let cursor = 0;

      for (const m of marks) {
        const share = Math.round(count * (m.def.weight / total));
        for (let i = 0; i < share && pts.length < count; i++) {
          /* sqrt keeps the scatter AREA-uniform inside the ring. Without it
             everything piles at the centre of the cluster. */
          const a = Math.random() * Math.PI * 2;
          const d = m.radius * (0.6 + Math.sqrt(Math.random()) * 1.5);
          pts.push({ x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d });
        }
        cursor++;
      }
      // Rounding can leave a couple short — hang them off the busiest mark.
      while (pts.length < count) {
        const m = marks[pts.length % marks.length];
        const a = Math.random() * Math.PI * 2;
        pts.push({
          x: m.x + Math.cos(a) * m.radius * 1.6,
          y: m.y + Math.sin(a) * m.radius * 1.6
        });
      }
      return pts;
    },

    /* ── salvage ────────────────────────────────────────────────────────── */

    /**
     * Called each frame from the draw wrap (the one place already guaranteed to
     * run per frame without touching engine.js). Reaching a cache spills real
     * drops — same class, same collector, same mass as an enemy's.
     */
    _checkSalvage(chamber, player) {
      if (!player || player.dead) return;
      if (typeof progression === 'undefined' || typeof BubbleDrop === 'undefined') return;

      for (const m of this.landmarks(chamber)) {
        if (m.kind !== 'cache' || m.taken) continue;
        if (Math.hypot(player.x - m.x, player.y - m.y) > m.radius) continue;

        m.taken = true;
        const worth = 4 + (chamber.dangerLevel || 1) * 3;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          progression.bubbleDrops.push(new BubbleDrop(
            m.x + Math.cos(a) * 26, m.y + Math.sin(a) * 26, worth, '#ffb703'
          ));
        }
        if (typeof particleSystem !== 'undefined') {
          particleSystem.spawnBubbleBurst(m.x, m.y, '#ffb703', 18);
        }
        if (window.garage) garage.banner(`Salvage cache broken — ${worth * 6} mass`, 'good');
      }
    },

    /* ── drawing: the landmarks themselves, under everything ────────────── */

    drawField(ctx, camera) {
      const chamber = worldMap.getCurrentChamber();
      const t = performance.now();

      for (const m of this.landmarks(chamber)) {
        const sx = m.x - camera.x;
        const sy = m.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * m.spin);

        if (m.kind === 'reef') {
          /* A drifting rock cluster. Eight lumps on a ring, sized off the seed,
             so it reads as mass rather than as a symbol. */
          ctx.fillStyle = 'rgba(24, 46, 40, 0.85)';
          ctx.strokeStyle = 'rgba(46, 139, 87, 0.55)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + m.seed * 6;
            const d = m.radius * (0.35 + ((i * 7 + m.seed * 40) % 10) / 14);
            const rr = m.radius * (0.12 + ((i * 3 + m.seed * 20) % 7) / 26);
            ctx.beginPath();
            ctx.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (m.kind === 'wreck') {
          /* A dead hull: a broken ring with a spine through it. Deliberately
             NOT a ship sprite — a wreck read as a live ship would be a lie the
             player acts on. */
          ctx.strokeStyle = 'rgba(143, 166, 196, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, m.radius * 0.62, 0.7, Math.PI * 1.55);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, m.radius * 0.62, Math.PI * 1.75, Math.PI * 2.4);
          ctx.stroke();
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(143, 166, 196, 0.32)';
          ctx.beginPath();
          ctx.moveTo(-m.radius * 0.8, 0);
          ctx.lineTo(m.radius * 0.55, 0);
          ctx.stroke();
        } else if (m.kind === 'beacon') {
          const pulse = 0.55 + Math.sin(t * 0.0022 + m.seed * 9) * 0.35;
          ctx.strokeStyle = `rgba(0, 243, 255, ${0.28 * pulse})`;
          ctx.lineWidth = 2;
          for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, m.radius * (0.35 * i), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = `rgba(0, 243, 255, ${pulse})`;
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // cache — a gold cluster that visibly empties once taken
          const alive = !m.taken;
          ctx.strokeStyle = alive ? 'rgba(255, 183, 3, 0.75)' : 'rgba(255, 183, 3, 0.14)';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = alive ? '#ffb703' : 'transparent';
          ctx.shadowBlur = alive ? 16 : 0;
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + t * 0.0006;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * m.radius * 0.4, Math.sin(a) * m.radius * 0.4,
              m.radius * 0.22, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    },

    /* ── drawing: bearing, over everything ──────────────────────────────── */

    /**
     * Chevrons at the edge of view for landmarks you cannot see, with range.
     * ⚠ DRAWN IN WORLD UNITS. This runs inside the world pass, so "the edge of
     *   the screen" is `viewport / 2 / zoom` world px from the camera centre —
     *   using screen pixels here would put the ring in the wrong place at every
     *   zoom except 1.0, which is the mistake shaders.js already documents.
     */
    drawBearing(ctx, camera) {
      if (!this.show || !window.engine || engine.paused) return;
      const chamber = worldMap.getCurrentChamber();
      const z = camera.zoom || 1;
      const halfW = engine.viewportWidth / 2 / z;
      const halfH = engine.viewportHeight / 2 / z;
      const ring = Math.min(halfW, halfH) * 0.86;

      const cx = camera.x + halfW;      // camera.x is the LEFT edge in world px
      const cy = camera.y + halfH;

      const marks = this.landmarks(chamber).slice();
      // The sector edge is a landmark too — it is the thing you must not cross
      // by accident, and at 2600 px it is off screen most of the time.
      const px = engine.player.x, py = engine.player.y;
      const outRange = Math.hypot(px, py);

      for (const m of marks) {
        const dx = m.x - cx, dy = m.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < ring || m.quiet) continue;            // in view, or scenery that needs no bearing
        const a = Math.atan2(dy, dx);
        const ex = cx + Math.cos(a) * ring - camera.x;
        const ey = cy + Math.sin(a) * ring - camera.y;
        const metres = Math.round(Math.hypot(m.x - px, m.y - py));

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = m.def.tint;
        ctx.globalAlpha = m.kind === 'cache' && m.taken ? 0.22 : 0.8;
        ctx.beginPath();
        ctx.moveTo(9, 0); ctx.lineTo(-6, 5); ctx.lineTo(-6, -5);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(-a);
        ctx.globalAlpha = 0.62;
        ctx.font = `${Math.round(11 / z * 1)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${m.def.label} ${metres}`, 0, 20);
        ctx.restore();
      }

      // Proximity warning on the sector wall, which now sits far out of view.
      const toEdge = chamber.radius - outRange;
      if (toEdge < 700) {
        const warn = Math.max(0, Math.min(1, 1 - toEdge / 700));
        ctx.save();
        ctx.globalAlpha = 0.15 + warn * 0.45;
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 3 / z;
        ctx.setLineDash([14, 12]);
        ctx.beginPath();
        ctx.arc(0 - camera.x, 0 - camera.y, chamber.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      this._checkSalvage(chamber, engine.player);
    },

    /* ── installation ───────────────────────────────────────────────────── */

    install() {
      if (this._installed) return;

      /* UNDER everything: wrap the membrane, which is the first world-pass call. */
      const membrane = worldMap.drawChamberMembrane.bind(worldMap);
      worldMap.drawChamberMembrane = (ctx, camera) => {
        membrane(ctx, camera);
        try { this.drawField(ctx, camera); } catch (e) { /* never kill the frame */ }
      };

      /* OVER everything: wrap particles, which is the last world-pass call. */
      const parts = particleSystem.draw.bind(particleSystem);
      particleSystem.draw = (ctx, camera) => {
        parts(ctx, camera);
        try { this.drawBearing(ctx, camera); } catch (e) { /* never kill the frame */ }
      };

      window.addEventListener('keydown', e => {
        if (e.code === 'KeyN' && !e.repeat) {
          const tag = (document.activeElement || {}).tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          this.show = !this.show;
          if (window.garage) garage.banner(`Bearing ${this.show ? 'ON' : 'OFF'}`, 'good');
        }
      });

      this._installed = true;
      console.log('[sectors] landmark field installed — N toggles bearing');
    }
  };

  window.sectorField = sectorField;

  /* ⚠ INSTALLS ON `load`, NOT AT PARSE TIME. This file is listed before
     engine.js so `spawnPoints` exists when the first chamber populates, but the
     two functions it wraps belong to objects that must already be constructed —
     and `particleSystem.draw` is only safe to wrap once. `load` is after both. */
  if (document.readyState === 'complete') sectorField.install();
  else window.addEventListener('load', () => sectorField.install());
})();
