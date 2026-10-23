/* ============================================================================
   THE SHIPYARD — MAC'S SHIP DESIGN TOOL                          [ Y ] to open
   ============================================================================
   *"i want a proper ship design tool"* — Mac, 2026-08-17.
   Enhanced with full QoL suite: polar guides, right-click removal, scroll-resize,
   keyboard nudge, quick archetype morphers, faction palettes, and node gizmos.

   ⭐⭐ THE ONE LAW THIS FILE EXISTS TO KEEP:
       THE EXPORT FORMAT **IS** THE FILE FORMAT.
   What EXPORT writes is byte-for-byte what `FLEET_HULLS` wants and what
   `engine.applyDesign()` already eats:
       { id, frame, mark, scale, color, primaryWeapon, secAbility, nodes[] }
   If anything here needed hand-massaging before the game could load it, a
   SECOND ship format would exist, and a split roster is the only failure this
   repo actually treats as fatal. So there is no serialiser. The editor mutates
   a real hull object and prints it.
   ========================================================================== */

(function () {
  'use strict';

  const ROSTER_KEY = 'bcforge_shipyard_roster_v1';
  const DRAFT_KEY = 'bcforge_shipyard_draft_v1';

  // The socket ring the designer draws, so an empty hull still frames sensibly.
  const MIN_REACH = 60;
  const GRID = 4;

  const FACTION_SWATCHES = [
    { name: 'Neon Cyan', color: '#00f3ff', glow: 'rgba(0,243,255,0.4)' },
    { name: 'Bio Plasma', color: '#39ff14', glow: 'rgba(57,255,20,0.4)' },
    { name: 'Solar Core', color: '#ffb703', glow: 'rgba(255,183,3,0.4)' },
    { name: 'Void Phase', color: '#bc13fe', glow: 'rgba(188,19,254,0.4)' },
    { name: 'Crimson Titan', color: '#ff3366', glow: 'rgba(255,51,102,0.4)' },
    { name: 'Obsidian Gold', color: '#e0a96d', glow: 'rgba(224,169,109,0.4)' },
    { name: 'Glacial Frost', color: '#00ffcc', glow: 'rgba(0,255,204,0.4)' },
    { name: 'Ghost Silver', color: '#d0d8e8', glow: 'rgba(208,216,232,0.4)' }
  ];

  const QUICK_ARCHETYPES = [
    {
      id: 'interceptor',
      label: '⚡ Interceptor',
      desc: 'Light agile scout with dual prow cannons and twin thrusters.',
      build: () => ({
        color: '#00f3ff',
        primaryWeapon: 'twin',
        secAbility: 'dash',
        nodes: [
          { dx: 0, dy: 0, radius: 18, type: 'core' },
          { dx: 28, dy: -12, radius: 12, type: 'cannon' },
          { dx: 28, dy: 12, radius: 12, type: 'cannon' },
          { dx: -26, dy: -14, radius: 12, type: 'thruster' },
          { dx: -26, dy: 14, radius: 12, type: 'thruster' }
        ]
      })
    },
    {
      id: 'dreadnought',
      label: '🛡️ Dreadnought',
      desc: 'Heavy armored flagship with 4 vitality pods, shield gen & heavy cannons.',
      build: () => ({
        color: '#ff3366',
        primaryWeapon: 'laser',
        secAbility: 'shield',
        nodes: [
          { dx: 0, dy: 0, radius: 30, type: 'core' },
          { dx: 38, dy: -18, radius: 14, type: 'cannon' },
          { dx: 38, dy: 18, radius: 14, type: 'cannon' },
          { dx: -28, dy: -28, radius: 16, type: 'pod' },
          { dx: -28, dy: 28, radius: 16, type: 'pod' },
          { dx: 0, dy: -32, radius: 14, type: 'pod' },
          { dx: 0, dy: 32, radius: 14, type: 'pod' },
          { dx: -42, dy: 0, radius: 16, type: 'shield' }
        ]
      })
    },
    {
      id: 'sniper',
      label: '🎯 Bio Sniper',
      desc: 'Needle chassis with high-caliber railgun and stabilization fins.',
      build: () => ({
        color: '#bc13fe',
        primaryWeapon: 'railgun',
        secAbility: 'emp',
        nodes: [
          { dx: 0, dy: 0, radius: 20, type: 'core' },
          { dx: 44, dy: 0, radius: 16, type: 'cannon' },
          { dx: -20, dy: -18, radius: 10, type: 'spike' },
          { dx: -20, dy: 18, radius: 10, type: 'spike' },
          { dx: -34, dy: 0, radius: 14, type: 'thruster' }
        ]
      })
    },
    {
      id: 'gunship',
      label: '💥 Assault Gunship',
      desc: 'Tri-cannon forward battery with armored pods and booster engine.',
      build: () => ({
        color: '#39ff14',
        primaryWeapon: 'mortar',
        secAbility: 'mine',
        nodes: [
          { dx: 0, dy: 0, radius: 26, type: 'core' },
          { dx: 36, dy: 0, radius: 14, type: 'cannon' },
          { dx: 32, dy: -18, radius: 12, type: 'cannon' },
          { dx: 32, dy: 18, radius: 12, type: 'cannon' },
          { dx: -26, dy: -22, radius: 14, type: 'pod' },
          { dx: -26, dy: 22, radius: 14, type: 'pod' },
          { dx: -38, dy: 0, radius: 14, type: 'thruster' }
        ]
      })
    },
    {
      id: 'rammer',
      label: '🗡️ Chitin Rammer',
      desc: 'Frontal ramming spikes with reinforced armor and max overdrive.',
      build: () => ({
        color: '#ffb703',
        primaryWeapon: 'spitter',
        secAbility: 'dash',
        nodes: [
          { dx: 0, dy: 0, radius: 24, type: 'core' },
          { dx: 32, dy: -14, radius: 12, type: 'spike' },
          { dx: 32, dy: 14, radius: 12, type: 'spike' },
          { dx: 38, dy: 0, radius: 10, type: 'spike' },
          { dx: -24, dy: -18, radius: 12, type: 'pod' },
          { dx: -24, dy: 18, radius: 12, type: 'pod' },
          { dx: -36, dy: 0, radius: 14, type: 'thruster' }
        ]
      })
    }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* A brand-new hull is the SMALL CHASSIS Mac asked for — one core, starter nodes. */
  function blankDesign() {
    const base = (typeof fleet !== 'undefined' && fleet.starterChassis)
      ? fleet.starterChassis()
      : { color: '#00f3ff', primaryWeapon: 'spitter', secAbility: 'shield',
          nodes: [{ dx: 0, dy: 0, radius: 18, type: 'core' }] };
    return {
      id: '',
      frame: '',
      mark: 'I',
      scale: 1,
      color: base.color,
      primaryWeapon: base.primaryWeapon,
      secAbility: base.secAbility,
      nodes: clone(base.nodes)
    };
  }

  const shipyard = {
    open: false,
    design: blankDesign(),
    part: null,        // palette entry armed for placement
    sel: -1,           // selected node index
    hovered: -1,       // hovered node index
    drag: -1,
    dragHandle: false, // true if dragging radius resize ring
    mirror: true,
    guides: true,      // polar guide grid
    angleSnap: false,  // snap to 15°/30°/45° rays
    zoom: 0,           // 0 == AUTO; else real scale
    el: null,
    canvas: null,
    ctx: null,

    // ---- geometry -------------------------------------------------------

    fitScale() {
      if (this.zoom) return this.zoom;
      const half = Math.min(this.canvas.width, this.canvas.height) / 2;
      return Math.max(0.06, Math.min(3, (half - 25) / Math.max(MIN_REACH, this.reach())));
    },

    reach() {
      let r = 0;
      for (const n of this.design.nodes) {
        const d = Math.hypot(n.dx || 0, n.dy || 0) + (n.radius || 0);
        if (d > r) r = d;
      }
      return r;
    },

    cost() {
      let c = 0;
      for (const n of this.design.nodes) {
        c += (window.fleet ? fleet.costOfNode(n.type, n.radius) : 0);
      }
      return c;
    },

    budget() {
      const P = (typeof progression !== 'undefined') ? progression : null;
      const evo = (P && P.getEvolutionData) ? P.getEvolutionData() : null;
      const totalGP = (P && P.getTotalGP) ? P.getTotalGP() : Infinity;
      const usedGP = this.cost();

      let hp = 100;
      let dpsScore = 0;
      let thrustScore = 0;

      for (const n of this.design.nodes) {
        if (n.type === 'pod') hp += 35;
        else if (n.type === 'shield') hp += 30;
        else if (n.type === 'cannon') {
          hp += 10;
          dpsScore += (n.radius >= 16 ? 45 : n.radius >= 14 ? 30 : 20);
        }
        else if (n.type === 'spike') {
          hp += 15;
          dpsScore += 15;
        }
        else if (n.type === 'thruster') {
          thrustScore += (n.radius >= 14 ? 35 : 20);
        }
      }
      if (evo) hp += evo.hpBonus;

      return {
        totalGP: totalGP,
        usedGP: usedGP,
        freeGP: totalGP - usedGP,
        sockets: this.design.nodes.length,
        maxSockets: evo ? evo.maxSockets : Infinity,
        tier: evo ? evo.title : '—',
        hp: hp,
        dpsScore: dpsScore,
        thrustScore: thrustScore,
        overGP: usedGP > totalGP,
        overSockets: evo ? this.design.nodes.length > evo.maxSockets : false
      };
    },

    toLocal(e) {
      const rect = this.canvas.getBoundingClientRect();
      const fit = this.fitScale();
      const sx = this.canvas.width / rect.width;
      const sy = this.canvas.height / rect.height;
      return {
        x: ((e.clientX - rect.left) * sx - this.canvas.width / 2) / fit,
        y: ((e.clientY - rect.top) * sy - this.canvas.height / 2) / fit
      };
    },

    hit(p) {
      for (let i = this.design.nodes.length - 1; i >= 0; i--) {
        const n = this.design.nodes[i];
        if (Math.hypot(p.x - n.dx, p.y - n.dy) <= n.radius + 4) return i;
      }
      return -1;
    },

    hitHandle(p, node) {
      if (!node) return false;
      const d = Math.hypot(p.x - node.dx, p.y - node.dy);
      return Math.abs(d - node.radius) <= 6;
    },

    snapCoords(p) {
      let x = p.x;
      let y = p.y;

      if (this.angleSnap || (window.event && window.event.shiftKey)) {
        const dist = Math.hypot(x, y);
        if (dist > 8) {
          const angle = Math.atan2(y, x);
          const snapStep = Math.PI / 12; // 15 degrees
          const snappedAngle = Math.round(angle / snapStep) * snapStep;
          x = Math.cos(snappedAngle) * dist;
          y = Math.sin(snappedAngle) * dist;
        }
      }

      return {
        x: Math.round(x / GRID) * GRID,
        y: Math.round(y / GRID) * GRID
      };
    },

    // ---- editing --------------------------------------------------------

    mirrorOf(n) {
      return { dx: n.dx, dy: -n.dy, radius: n.radius, type: n.type };
    },

    place(p) {
      if (!this.part) return;
      const pt = this.snapCoords(p);
      const n = { dx: pt.x, dy: pt.y, radius: this.part.radius, type: this.part.type };
      this.design.nodes.push(n);
      if (this.mirror && Math.abs(pt.y) >= GRID) this.design.nodes.push(this.mirrorOf(n));
      this.sel = this.design.nodes.length - 1;
      this.toast('Placed ' + this.part.title + ' (' + this.part.cost + ' GP)');
      this.paint();
    },

    remove(i) {
      if (i < 0 || i >= this.design.nodes.length) return;
      const n = this.design.nodes[i];
      if (!n || n.type === 'core') {
        this.toast('The core hull cannot be deleted.', true);
        return;
      }
      const typeTitle = n.type.toUpperCase();
      const twin = this.design.nodes.findIndex((m, j) =>
        j !== i && m.type === n.type && m.dx === n.dx &&
        m.dy === -n.dy && m.radius === n.radius && Math.abs(n.dy) >= GRID);

      this.design.nodes.splice(i, 1);
      if (this.mirror && twin >= 0) {
        this.design.nodes.splice(twin > i ? twin - 1 : twin, 1);
      }
      this.sel = -1;
      this.toast('Removed ' + typeTitle + ' node.');
      this.paint();
    },

    resizeNode(idx, delta) {
      if (idx < 0 || idx >= this.design.nodes.length) return;
      const n = this.design.nodes[idx];
      if (!n) return;
      const twinIdx = this.design.nodes.findIndex((m, j) =>
        j !== idx && m.type === n.type && m.dx === n.dx && m.dy === -n.dy);
      n.radius = Math.max(6, Math.min(80, n.radius + delta));
      if (this.mirror && twinIdx >= 0) this.design.nodes[twinIdx].radius = n.radius;
      this.paint();
    },

    resizeSel(delta) {
      this.resizeNode(this.sel, delta);
    },

    nudgeSel(dx, dy) {
      if (this.sel < 0 || this.sel >= this.design.nodes.length) return;
      const n = this.design.nodes[this.sel];
      if (n.type === 'core') return;
      const twin = this.design.nodes.findIndex((m, j) =>
        j !== this.sel && m.type === n.type && m.dx === n.dx && m.dy === -n.dy);

      n.dx += dx;
      n.dy += dy;
      if (this.mirror && twin >= 0) {
        this.design.nodes[twin].dx = n.dx;
        this.design.nodes[twin].dy = -n.dy;
      }
      this.paint();
    },

    duplicateSel() {
      if (this.sel < 0 || this.sel >= this.design.nodes.length) return;
      const n = this.design.nodes[this.sel];
      if (n.type === 'core') return;
      const copy = { dx: n.dx + 16, dy: n.dy, radius: n.radius, type: n.type };
      this.design.nodes.push(copy);
      if (this.mirror && Math.abs(copy.dy) >= GRID) this.design.nodes.push(this.mirrorOf(copy));
      this.sel = this.design.nodes.length - 1;
      this.toast('Duplicated ' + n.type + ' node.');
      this.paint();
    },

    cycleWeaponType() {
      if (this.sel < 0 || this.sel >= this.design.nodes.length) return;
      const n = this.design.nodes[this.sel];
      if (n.type !== 'cannon') return;
      // Cycle gun radius to next weapon mount class (10 -> 12 -> 14 -> 16 -> 20 -> 10)
      const steps = [10, 12, 14, 16, 20];
      const cur = steps.indexOf(n.radius);
      const nextR = (cur >= 0 && cur < steps.length - 1) ? steps[cur + 1] : steps[0];
      this.resizeNode(this.sel, nextR - n.radius);
    },

    applyArchetype(arch) {
      const built = arch.build();
      this.design = Object.assign(blankDesign(), built);
      this.sel = -1;
      this.syncFields();
      this.paint();
      this.toast('Loaded ' + arch.label + ' chassis.');
    },

    // ---- render ---------------------------------------------------------

    renderNodes() {
      return this.design.nodes.map(n => ({
        type: n.type,
        radius: n.radius,
        dx: n.dx, dy: n.dy,
        currentDx: n.dx, currentDy: n.dy,
        targetDx: n.dx, targetDy: n.dy
      }));
    },

    paintPolarGuides(c, W, H, fit) {
      if (!this.guides) return;
      c.save();

      // Polar concentric distance rings
      const rings = [25, 50, 75, 100, 150, 200];
      c.lineWidth = 1 / fit;
      for (const r of rings) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.strokeStyle = (r === 100) ? 'rgba(0, 243, 255, 0.18)' : 'rgba(0, 243, 255, 0.07)';
        c.setLineDash([4 / fit, 6 / fit]);
        c.stroke();

        // Distance label
        c.setLineDash([]);
        c.fillStyle = 'rgba(0, 243, 255, 0.22)';
        c.font = (9 / fit) + 'px ui-monospace, monospace';
        c.fillText(r + 'px', r + (4 / fit), -4 / fit);
      }

      // Radial angle rays
      const angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, -150, -135, -120, -90, -60, -45, -30];
      const maxR = 240;
      for (const a of angles) {
        const rad = (a * Math.PI) / 180;
        const x2 = Math.cos(rad) * maxR;
        const y2 = Math.sin(rad) * maxR;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(x2, y2);
        const isMain = (a === 0 || a === 90 || a === -90 || a === 180);
        c.strokeStyle = isMain ? 'rgba(0, 243, 255, 0.15)' : 'rgba(0, 243, 255, 0.05)';
        c.setLineDash(isMain ? [] : [2 / fit, 6 / fit]);
        c.stroke();
      }

      c.setLineDash([]);
      c.restore();
    },

    paint() {
      if (!this.ctx) return;
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#04070e';
      c.fillRect(0, 0, W, H);

      const fit = this.fitScale();
      const core = this.design.nodes.find(n => n.type === 'core');
      const coreR = core ? core.radius : 22;

      c.save();
      c.translate(W / 2, H / 2);
      c.scale(fit, fit);

      // Polar guides background
      this.paintPolarGuides(c, W, H, fit);

      // Centreline
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.lineWidth = 1 / fit;
      c.beginPath();
      c.moveTo(-W / fit, 0); c.lineTo(W / fit, 0);
      c.moveTo(0, -H / fit); c.lineTo(0, H / fit);
      c.stroke();

      // ---- THE SHIP, drawn by the game renderer ----
      const FS = (typeof fluidShader !== 'undefined') ? fluidShader : null;
      let drew = false;
      if (FS && FS.drawOrganismMembrane) {
        try {
          FS.drawOrganismMembrane(
            c, 0, 0, 0, coreR, this.renderNodes(),
            this.design.color || '#00f3ff', {}
          );
          drew = true;
        } catch (e) {
          console.warn('[shipyard] renderer threw, handles only:', e);
        }
      }

      // ---- EDITING HANDLES & GIZMOS ----
      for (let i = 0; i < this.design.nodes.length; i++) {
        const n = this.design.nodes[i];
        let tint = '#8FA6C4';
        if (n.type === 'cannon' && window.fleet) tint = fleet.mountBand(n.radius).tint;
        else if (n.type === 'pod') tint = '#39ff14';
        else if (n.type === 'shield') tint = '#00f3ff';
        else if (n.type === 'thruster') tint = '#ffb347';
        else if (n.type === 'spike') tint = '#ff3366';
        else if (n.type === 'core') tint = '#ffffff';

        const isSel = (i === this.sel);
        const isHover = (i === this.hovered);

        if (!drew) {
          c.beginPath();
          c.arc(n.dx, n.dy, n.radius, 0, Math.PI * 2);
          c.fillStyle = tint + '33';
          c.fill();
        }

        // Main node circle
        c.beginPath();
        c.arc(n.dx, n.dy, n.radius, 0, Math.PI * 2);
        c.strokeStyle = isSel ? '#ffffff' : (isHover ? '#00f3ff' : tint);
        c.globalAlpha = isSel ? 1 : (isHover ? 0.9 : 0.55);
        c.lineWidth = (isSel ? 2.8 : (isHover ? 2.0 : 1.25)) / fit;
        c.stroke();
        c.globalAlpha = 1;

        // Forward tick on a cannon
        if (n.type === 'cannon') {
          c.beginPath();
          c.moveTo(n.dx, n.dy);
          c.lineTo(n.dx + n.radius * 1.5, n.dy);
          c.strokeStyle = tint;
          c.lineWidth = 1.5 / fit;
          c.stroke();
        }

        // Active Gizmo on selected node
        if (isSel) {
          // Dashed outer selection ring with resize handle
          c.beginPath();
          c.arc(n.dx, n.dy, n.radius + (5 / fit), 0, Math.PI * 2);
          c.strokeStyle = 'rgba(0, 243, 255, 0.8)';
          c.lineWidth = 1 / fit;
          c.setLineDash([3 / fit, 3 / fit]);
          c.stroke();
          c.setLineDash([]);

          // Resize handle dot at 45°
          const hAngle = Math.PI / 4;
          const hx = n.dx + Math.cos(hAngle) * n.radius;
          const hy = n.dy + Math.sin(hAngle) * n.radius;
          c.beginPath();
          c.arc(hx, hy, 4 / fit, 0, Math.PI * 2);
          c.fillStyle = '#00f3ff';
          c.fill();
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1 / fit;
          c.stroke();

          // Mini node HUD tag
          const tag = n.type.toUpperCase() + ' (r' + n.radius + ')';
          c.fillStyle = 'rgba(3, 5, 10, 0.85)';
          const tw = c.measureText ? c.measureText(tag).width + 8 : 40;
          c.fillRect(n.dx - tw / 2, n.dy - n.radius - (18 / fit), tw, 14 / fit);
          c.strokeStyle = 'rgba(0, 243, 255, 0.5)';
          c.strokeRect(n.dx - tw / 2, n.dy - n.radius - (18 / fit), tw, 14 / fit);

          c.fillStyle = '#00f3ff';
          c.font = (9 / fit) + 'px ui-monospace, monospace';
          c.textAlign = 'center';
          c.fillText(tag, n.dx, n.dy - n.radius - (8 / fit));
          c.textAlign = 'start';
        }
      }

      c.restore();

      // HUD Overlays
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.font = '11px ui-monospace, monospace';
      c.fillText('FORWARD  →', W - 95, H - 12);

      // Scale bar
      const barPx = 100 * fit;
      const by = H - 30;
      c.strokeStyle = 'rgba(255,255,255,0.45)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(14, by); c.lineTo(14 + barPx, by);
      c.moveTo(14, by - 4); c.lineTo(14, by + 4);
      c.moveTo(14 + barPx, by - 4); c.lineTo(14 + barPx, by + 4);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillText('100px', 14 + barPx + 8, by + 4);

      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillText(
        (this.zoom ? 'zoom x' + fit.toFixed(2) : 'AUTO x' + fit.toFixed(2)) +
        '  ·  ' + Math.round(this.reach() * 2) + 'px across' +
        (this.guides ? '  ·  GUIDES' : '') +
        (this.angleSnap ? '  ·  ANGLE-SNAP' : '') +
        (drew ? '  ·  live membrane' : '  ·  handles only'), 14, H - 12);

      this.paintStats();
    },

    paintStats() {
      const s = this.el && this.el.querySelector('#sy-stats');
      if (!s) return;
      const nodes = this.design.nodes;
      const band = window.fleet ? fleet.hullBand({ nodes }) : { cls: '?' };
      const guns = nodes.filter(n => n.type === 'cannon');
      const bandCount = {};
      for (const g of guns) {
        const b = window.fleet ? fleet.mountBand(g.radius).cls : '?';
        bandCount[b] = (bandCount[b] || 0) + 1;
      }
      const core = nodes.find(n => n.type === 'core');
      const across = Math.round(this.reach() * 2);
      const b = this.budget();
      const gpCol = b.overGP ? '#ff6b8a' : '#39ff14';
      const soCol = b.overSockets ? '#ff6b8a' : 'rgba(207,227,255,.85)';

      const gpPercent = b.totalGP === Infinity ? 0 : Math.min(100, Math.round((b.usedGP / b.totalGP) * 100));

      s.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:700;font-size:14px;color:#00f3ff">${band.cls} CLASS</span>
          <span style="opacity:.6;font-size:11px">${nodes.length} nodes · ${across}px across</span>
        </div>
        <div style="display:flex;gap:8px;font-size:11px;opacity:.9;margin-bottom:6px">
          <span>💚 <b>${b.hp}</b> HP</span>
          <span>💥 <b>${guns.length}</b> Guns</span>
          <span>⚡ <b>${b.dpsScore}</b> Firepower</span>
          <span>🚀 <b>${b.thrustScore}</b> Thrust</span>
        </div>
        <div style="background:rgba(255,255,255,0.06);height:6px;border-radius:3px;overflow:hidden;margin-bottom:6px">
          <div style="background:${b.overGP ? '#ff3366' : '#00f3ff'};width:${Math.max(4, gpPercent)}%;height:100%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span id="sy-budget" style="color:${gpCol};font-weight:600">${b.usedGP} / ${b.totalGP === Infinity ? '∞' : b.totalGP} GP</span>
          <span style="color:${soCol}">${b.sockets} / ${b.maxSockets === Infinity ? '∞' : b.maxSockets} sockets (${b.tier})</span>
        </div>
      `;
    },

    // ---- roster seam ----------------------------------------------------

    savedRoster() {
      try { return JSON.parse(localStorage.getItem(ROSTER_KEY) || '{}'); }
      catch (e) { return {}; }
    },

    register(hull) {
      if (!window.FLEET_HULLS || !window.fleet) return false;
      const h = clone(hull);
      if (fleet.applyScale) fleet.applyScale(h);
      const fresh = !FLEET_HULLS[h.id];
      FLEET_HULLS[h.id] = h;
      if (fresh && fleet.order.indexOf(h.id) < 0) fleet.order.push(h.id);
      return true;
    },

    saveToRoster() {
      const d = this.design;
      if (!d.id) { this.toast('Give it an id first — it is the roster key.', true); return; }
      const store = this.savedRoster();
      store[d.id] = clone(d);
      try { localStorage.setItem(ROSTER_KEY, JSON.stringify(store)); }
      catch (e) { this.toast('localStorage full — NOT saved.', true); return; }
      this.register(d);
      this.toast('“' + d.id + '” saved to roster. Press f / F in flight to reach it.');
      this.refreshRosterList();
    },

    loadRoster() {
      const store = this.savedRoster();
      let n = 0;
      for (const k in store) { if (this.register(store[k])) n++; }
      return n;
    },

    deleteFromRoster(id) {
      const store = this.savedRoster();
      delete store[id];
      try { localStorage.setItem(ROSTER_KEY, JSON.stringify(store)); } catch (e) {}
      if (window.FLEET_HULLS) delete FLEET_HULLS[id];
      if (window.fleet) {
        const i = fleet.order.indexOf(id);
        if (i >= 0) fleet.order.splice(i, 1);
      }
      this.refreshRosterList();
    },

    // ---- import / export ------------------------------------------------

    exportText() {
      const d = clone(this.design);
      d.scale = 1;
      delete d._scaled;
      const body = JSON.stringify(d, null, 2);
      return "  '" + (d.id || 'unnamed') + "': " +
        body.split('\n').join('\n  ') + ',';
    },

    doImport(txt) {
      let raw = txt.trim();
      if (!raw) return;
      const m = raw.match(/^['"]?[\w-]*['"]?\s*:\s*(\{[\s\S]*\})\s*,?$/);
      if (m) raw = m[1];
      let d;
      try { d = JSON.parse(raw); }
      catch (e) { this.toast('Not valid JSON: ' + e.message, true); return; }
      if (!d || !Array.isArray(d.nodes) || !d.nodes.length) {
        this.toast('No `nodes` array — that is not a hull.', true); return;
      }
      if (!d.nodes.some(n => n.type === 'core')) {
        this.toast('No core node — that is not a hull.', true); return;
      }
      if (window.fleet && fleet.applyScale) fleet.applyScale(d);
      d.scale = 1;
      delete d._scaled;
      this.design = Object.assign(blankDesign(), d);
      this.sel = -1;
      this.syncFields();
      this.paint();
      this.toast('Imported “' + (d.id || 'unnamed') + '”.');
    },

    // ---- flight ---------------------------------------------------------

    testFlight() {
      if (!window.engine) { this.toast('Engine not up.', true); return; }

      this.saveDraft();
      engine.applyDesign(clone(this.design));
      this.commitLegacy();
      this.hide();

      // Dismiss title overlay if still present so player enters game immediately
      const title = document.getElementById('title-overlay');
      if (title && title.style.display !== 'none') {
        title.style.display = 'none';
        if (window.saveState) {
          saveState.doc.launched = true;
          saveState.save();
        }
      }

      engine.paused = false;
      this.toast('Flying ' + (this.design.frame || this.design.id || 'ship') + '! Press Y to return to Shipyard.');
    },


    commitLegacy() {
      try {
        localStorage.setItem('biotank_forge_player', JSON.stringify(this.design));
      } catch (e) {}

      const SEC = (typeof SECONDARY_ACTIVES_CATALOG !== 'undefined')
        ? SECONDARY_ACTIVES_CATALOG : null;
      if (!SEC) return;
      const s = SEC.find(x => x.secAbility === this.design.secAbility) || SEC[0];
      const t = document.getElementById('ability-title');
      const i = document.getElementById('ability-icon');
      if (t) t.textContent = s.title;
      if (i) i.textContent = s.icon;
    },

    saveDraft() {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(this.design)); }
      catch (e) {}
    },

    loadDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) this.design = Object.assign(blankDesign(), JSON.parse(raw));
      } catch (e) {}
    },

    // ---- DOM ------------------------------------------------------------

    toast(msg, bad) {
      const t = this.el && this.el.querySelector('#sy-toast');
      if (!t) return;
      t.textContent = msg;
      t.style.color = bad ? '#ff6b8a' : '#39ff14';
      clearTimeout(this._tt);
      this._tt = setTimeout(() => { t.textContent = ''; }, 4000);
    },

    build() {
      if (this.el) return;
      const style = document.createElement('style');
      style.textContent = `
      #shipyard{position:fixed;inset:0;z-index:9500;display:none;
        background:rgba(3,5,10,.97);color:#cfe3ff;
        font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
      #shipyard.on{display:flex}
      #shipyard .sy-left{flex:1;display:flex;flex-direction:column;padding:14px;min-width:0}
      #shipyard .sy-right{width:360px;border-left:1px solid rgba(0,243,255,.2);
        padding:14px;overflow-y:auto;background:rgba(5,9,18,.85)}
      #shipyard h2{margin:0 0 2px;font-size:16px;letter-spacing:.18em;color:#00f3ff;
        display:flex;align-items:center;justify-content:space-between}
      #shipyard .sy-sub{opacity:.5;margin-bottom:10px;font-size:11px}
      #sy-canvas{flex:1;width:100%;border:1px solid rgba(0,243,255,.25);
        border-radius:6px;background:#04070e;cursor:crosshair;touch-action:none;box-shadow:inset 0 0 30px rgba(0,243,255,0.03)}
      #shipyard .sy-row{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}
      #shipyard button{background:rgba(0,243,255,.09);color:#cfe3ff;
        border:1px solid rgba(0,243,255,.35);border-radius:4px;padding:5px 9px;
        cursor:pointer;font:inherit;transition:all .15s ease}
      #shipyard button:hover{background:rgba(0,243,255,.22);border-color:#00f3ff}
      #shipyard button.hot{background:rgba(57,255,20,.18);border-color:#39ff14;color:#eaffea;font-weight:600}
      #shipyard input,#shipyard select,#shipyard textarea{
        background:#080c14;color:#cfe3ff;border:1px solid rgba(0,243,255,.25);
        border-radius:4px;padding:5px 7px;font:inherit;width:100%}
      #shipyard label{display:block;font-size:10px;opacity:.6;margin:8px 0 3px;
        letter-spacing:.1em;font-weight:600;color:#9bc9ff}
      #shipyard .sy-half{display:flex;gap:6px}
      #shipyard .sy-half>div{flex:1}

      #sy-swatches{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}
      .sy-swatch{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,0.2);transition:transform .15s}
      .sy-swatch:hover{transform:scale(1.2);border-color:#ffffff}

      #sy-archetypes{display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:5px;margin:6px 0}
      .sy-arch-btn{padding:5px 4px;font-size:10px;text-align:center;border:1px solid rgba(0,243,255,0.2);border-radius:4px;background:rgba(0,243,255,0.06);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sy-arch-btn:hover{background:rgba(0,243,255,0.2);border-color:#00f3ff}

      #sy-parts,#sy-presets{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
      #sy-parts .grp,#sy-presets .grp{flex:0 0 100%;font-size:9px;
        letter-spacing:.14em;opacity:.5;margin:8px 0 2px;color:#00f3ff}
      #sy-parts .p,#sy-presets .p{border:1px solid rgba(0,243,255,.22);
        border-radius:4px;padding:4px 7px;cursor:pointer;font-size:11px;
        white-space:nowrap;transition:all .15s}
      #sy-parts .p:hover,#sy-presets .p:hover{background:rgba(0,243,255,.18);border-color:#00f3ff}
      #sy-parts .p.on{background:rgba(57,255,20,.22);border-color:#39ff14;color:#ffffff;font-weight:600}
      #sy-stats{margin:8px 0;padding:10px;border:1px solid rgba(0,243,255,.22);
        border-radius:4px;background:rgba(0,243,255,.05);line-height:1.5}
      #sy-io{height:90px;font-size:10px;white-space:pre}
      #sy-toast{min-height:18px;font-size:11px;margin-top:6px;font-weight:600}
      #sy-roster .r{display:flex;justify-content:space-between;gap:6px;
        padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      #sy-roster .r b{font-weight:600;color:#00f3ff}
      #sy-roster .r span{cursor:pointer;opacity:.6}
      #sy-roster .r span:hover{opacity:1;color:#ff6b8a}
      #shipyard .sy-hint{font-size:10px;opacity:.5;margin-top:6px;line-height:1.5}
      `;
      document.head.appendChild(style);

      const el = document.createElement('div');
      el.id = 'shipyard';
      el.innerHTML = `
      <div class="sy-left">
        <h2>
          <span>THE SHIPYARD</span>
          <span style="font-size:11px;font-weight:normal;opacity:.6">Hotkeys: [1-5] Parts · [G] Guides · [M] Mirror · [Space] Fly</span>
        </h2>
        <div class="sy-sub">Drag nodes to position · Right-click node to delete · Scroll wheel to resize node · Arrow keys to nudge</div>
        <canvas id="sy-canvas" width="920" height="640"></canvas>
        <div class="sy-row">
          <button id="sy-mirror" class="hot">MIRROR: ON (M)</button>
          <button id="sy-guides" class="hot">GUIDES: ON (G)</button>
          <button id="sy-snap">SNAP: OFF (S)</button>
          <button id="sy-zin">＋ ZOOM</button>
          <button id="sy-zout">－ ZOOM</button>
          <button id="sy-zfit">FIT</button>
          <button id="sy-z11">1:1</button>
          <button id="sy-grow">NODE + (])</button>
          <button id="sy-shrink">NODE − ([)</button>
          <button id="sy-dup">DUPLICATE (D)</button>
          <button id="sy-del" style="color:#ff6b8a">DELETE (Del)</button>
          <button id="sy-clear">NEW HULL</button>
          <button id="sy-fly" class="hot">TEST FLIGHT (Space)</button>
          <button id="sy-close">CLOSE (Y)</button>
        </div>
      </div>
      <div class="sy-right">
        <div id="sy-stats"></div>

        <label>FACTION PALETTES</label>
        <div id="sy-swatches"></div>

        <label>QUICK ARCHETYPES</label>
        <div id="sy-archetypes"></div>

        <label>PARTS CATALOG [1-5]</label>
        <div id="sy-parts"></div>

        <div class="sy-half">
          <div><label>ID (ROSTER KEY)</label><input id="sy-id" placeholder="e.g. ironwake_cruiser"></div>
          <div><label>MARK</label><input id="sy-mark" value="I"></div>
        </div>
        <label>FRAME NAME</label>
        <input id="sy-frame" placeholder="e.g. Citadel / Interceptor">
        <div class="sy-half">
          <div><label>PRIMARY WEAPON</label><select id="sy-weapon"></select></div>
          <div><label>CUSTOM COLOR</label><input id="sy-color" type="color" value="#00f3ff"></div>
        </div>
        <label>SECONDARY ABILITY</label>
        <select id="sy-sec"></select>
        <label>START FROM PRESET / FLEET</label>
        <div id="sy-presets"></div>
        <div class="sy-row">
          <button id="sy-save" class="hot">SAVE TO ROSTER</button>
          <button id="sy-export">EXPORT</button>
          <button id="sy-copy">COPY</button>
          <button id="sy-import">IMPORT</button>
        </div>
        <textarea id="sy-io" placeholder="EXPORT prints the fleet.js entry here. Paste one and hit IMPORT."></textarea>
        <div id="sy-toast"></div>
        <label>SAVED FLEET ROSTER</label>
        <div id="sy-roster"></div>
      </div>`;
      document.body.appendChild(el);
      this.el = el;
      this.canvas = el.querySelector('#sy-canvas');
      this.ctx = this.canvas.getContext('2d');

      this.buildSwatches();
      this.buildArchetypes();
      this.buildParts();
      this.buildWeapons();
      this.buildSecondaries();
      this.buildPresets();
      this.wire();
    },

    buildSwatches() {
      const host = this.el.querySelector('#sy-swatches');
      if (!host) return;
      host.innerHTML = '';
      for (const s of FACTION_SWATCHES) {
        const d = document.createElement('div');
        d.className = 'sy-swatch';
        d.style.background = s.color;
        d.title = s.name + ' (' + s.color + ')';
        d.onclick = () => {
          this.design.color = s.color;
          const ci = this.el.querySelector('#sy-color');
          if (ci) ci.value = s.color;
          this.toast('Selected ' + s.name + ' palette.');
          this.paint();
        };
        host.appendChild(d);
      }
    },

    buildArchetypes() {
      const host = this.el.querySelector('#sy-archetypes');
      if (!host) return;
      host.innerHTML = '';
      for (const a of QUICK_ARCHETYPES) {
        const b = document.createElement('div');
        b.className = 'sy-arch-btn';
        b.textContent = a.label;
        b.title = a.desc;
        b.onclick = () => this.applyArchetype(a);
        host.appendChild(b);
      }
    },

    buildParts() {
      const host = this.el.querySelector('#sy-parts');
      const list = window.fleet ? fleet.equips() : [];
      host.innerHTML = '';
      let lastGroup = null;
      let keyIdx = 1;
      for (const p of list) {
        const grp = p.type === 'cannon' ? 'MOUNTS — Radius sizes weapon'
                                        : 'SUPPORT — Vitality, Shield, Propulsion, Ram';
        if (grp !== lastGroup) {
          const h = document.createElement('div');
          h.className = 'grp';
          h.textContent = grp;
          host.appendChild(h);
          lastGroup = grp;
        }
        const b = document.createElement('div');
        b.className = 'p';
        const keyTag = keyIdx <= 5 ? '[' + keyIdx + '] ' : '';
        b.textContent = keyTag + p.title.replace(/ · /, ' ');
        b.title = p.desc.replace(/&deg;/g, '°') + '  —  ' + p.cost + ' GP';
        b.onclick = () => {
          if (this.part === p) {
            this.part = null;
            b.classList.remove('on');
            this.toast('Deselected part.');
          } else {
            this.part = p;
            host.querySelectorAll('.p').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            this.toast('Armed: ' + p.title + '. Click canvas to place.');
          }
        };
        host.appendChild(b);
        keyIdx++;
      }
    },

    selectPartByIndex(idx) {
      const host = this.el.querySelector('#sy-parts');
      if (!host) return;
      const btns = host.querySelectorAll('.p');
      if (idx >= 0 && idx < btns.length) {
        btns[idx].click();
      } else {
        this.part = null;
        btns.forEach(x => x.classList.remove('on'));
        this.toast('Part placement cancelled.');
      }
    },

    buildWeapons() {
      const sel = this.el.querySelector('#sy-weapon');
      const WT = (typeof WEAPON_TYPES !== 'undefined') ? WEAPON_TYPES : null;
      const keys = WT ? Object.keys(WT)
                      : ['spitter', 'twin', 'laser', 'homing', 'railgun', 'mortar'];
      sel.innerHTML = keys.map(k =>
        '<option value="' + k + '">' +
        ((WT && WT[k] && WT[k].title) || k) + '</option>').join('');
    },

    buildSecondaries() {
      const sel = this.el.querySelector('#sy-sec');
      const SEC = (typeof SECONDARY_ACTIVES_CATALOG !== 'undefined')
        ? SECONDARY_ACTIVES_CATALOG : null;
      if (!SEC) {
        sel.innerHTML = ['shield', 'emp', 'dash', 'drone', 'mine']
          .map(k => '<option value="' + k + '">' + k + '</option>').join('');
        return;
      }
      sel.innerHTML = SEC.map(s =>
        '<option value="' + s.secAbility + '">' + s.icon + ' ' + s.title +
        '</option>').join('');
    },

    buildPresets() {
      const host = this.el.querySelector('#sy-presets');
      if (!host) return;
      host.innerHTML = '';
      const add = (label, title, get) => {
        const b = document.createElement('div');
        b.className = 'p';
        b.textContent = label;
        b.title = title;
        b.onclick = () => {
          const src = get();
          if (!src) return;
          const keepId = this.design.id, keepFrame = this.design.frame,
                keepMark = this.design.mark;
          this.design = Object.assign(blankDesign(), clone(src));
          if (!this.design.id) this.design.id = keepId;
          if (!this.design.frame) this.design.frame = keepFrame;
          if (!this.design.mark || this.design.mark === 'I') this.design.mark = keepMark;
          this.design.scale = 1;
          this.sel = -1;
          this.syncFields();
          this.paint();
          this.toast('Loaded “' + label + '”.');
        };
        host.appendChild(b);
      };

      const PD = (typeof PRESET_DESIGNS !== 'undefined') ? PRESET_DESIGNS : null;
      if (PD) {
        const h = document.createElement('div');
        h.className = 'grp';
        h.textContent = 'PRESETS';
        host.appendChild(h);
        for (const k of Object.keys(PD)) add(k, 'starter preset', () => PD[k]);
      }

      if (window.fleet && fleet.order && fleet.order.length) {
        const h = document.createElement('div');
        h.className = 'grp';
        h.textContent = 'THE FLEET';
        host.appendChild(h);
        for (const k of fleet.order) {
          const hull = fleet.hulls ? fleet.hulls[k] : null;
          if (!hull) continue;
          add(hull.mark + ' ' + hull.frame, hull.note || k, () => fleet.hulls[k]);
        }
      }
    },

    refreshRosterList() {
      const host = this.el && this.el.querySelector('#sy-roster');
      if (!host) return;
      this.buildPresets();
      const store = this.savedRoster();
      const keys = Object.keys(store);
      if (!keys.length) {
        host.innerHTML = '<div style="opacity:.4;font-size:11px">' +
          'empty — nothing authored yet</div>';
        return;
      }
      host.innerHTML = '';
      for (const k of keys) {
        const d = store[k];
        const row = document.createElement('div');
        row.className = 'r';
        const band = window.fleet ? fleet.hullBand({ nodes: d.nodes }).cls : '';
        row.innerHTML = '<b>' + k + '</b> <span style="opacity:.45;flex:1">' +
          band + ' · ' + d.nodes.length + ' nodes</span>';
        const load = document.createElement('span');
        load.textContent = 'load'; load.style.color = '#00f3ff';
        load.onclick = () => {
          this.design = Object.assign(blankDesign(), clone(d));
          this.sel = -1; this.syncFields(); this.paint();
        };
        const del = document.createElement('span');
        del.textContent = '✕';
        del.onclick = () => this.deleteFromRoster(k);
        row.appendChild(load); row.appendChild(del);
        host.appendChild(row);
      }
    },

    syncFields() {
      const q = id => this.el.querySelector(id);
      q('#sy-id').value = this.design.id || '';
      q('#sy-mark').value = this.design.mark || 'I';
      q('#sy-frame').value = this.design.frame || '';
      q('#sy-color').value = this.design.color || '#00f3ff';
      q('#sy-sec').value = this.design.secAbility || 'shield';
      const w = q('#sy-weapon');
      if (w && this.design.primaryWeapon) w.value = this.design.primaryWeapon;
    },

    wire() {
      const q = id => this.el.querySelector(id);
      const cv = this.canvas;

      // Prevent native context menu on canvas for right-click node actions
      cv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const p = this.toLocal(e);
        const i = this.hit(p);
        if (i >= 0) {
          this.remove(i);
        } else {
          // Deselect & disarm part
          this.sel = -1;
          this.part = null;
          this.el.querySelectorAll('#sy-parts .p').forEach(x => x.classList.remove('on'));
          this.toast('Selection cleared.');
          this.paint();
        }
      });

      // Mouse Wheel for instant node resize or smooth canvas zoom
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const p = this.toLocal(e);
        const i = this.hit(p);
        const delta = e.deltaY < 0 ? 1 : -1;

        if (i >= 0) {
          this.sel = i;
          this.resizeNode(i, delta * 2);
        } else {
          // Zoom canvas smoothly
          const factor = e.deltaY < 0 ? 1.15 : 0.87;
          this.zoom = this.fitScale() * factor;
          this.paint();
        }
      }, { passive: false });

      // Pointer interactions
      cv.addEventListener('pointerdown', (e) => {
        if (e.button === 2) return; // Right-click handled by contextmenu
        const p = this.toLocal(e);
        const i = this.hit(p);
        if (i >= 0) {
          this.sel = i;
          this.drag = i;
          this.dragHandle = (i === this.sel && this.hitHandle(p, this.design.nodes[i]));
          cv.setPointerCapture(e.pointerId);
        } else {
          this.place(p);
        }
        this.paint();
      });

      cv.addEventListener('pointermove', (e) => {
        const p = this.toLocal(e);
        const hitIdx = this.hit(p);
        if (hitIdx !== this.hovered) {
          this.hovered = hitIdx;
          this.paint();
        }

        if (this.drag < 0) return;
        const n = this.design.nodes[this.drag];

        if (this.dragHandle) {
          // Dragging radius ring to resize directly
          const newR = Math.round(Math.hypot(p.x - n.dx, p.y - n.dy));
          const twin = this.design.nodes.findIndex((m, j) =>
            j !== this.drag && m.type === n.type && m.dx === n.dx && m.dy === -n.dy);
          n.radius = Math.max(6, Math.min(80, newR));
          if (this.mirror && twin >= 0) this.design.nodes[twin].radius = n.radius;
          this.paint();
          return;
        }

        if (n.type === 'core') return; // Core stays origin

        const pt = this.snapCoords(p);
        const twin = this.design.nodes.findIndex((m, j) =>
          j !== this.drag && m.type === n.type && m.dx === n.dx && m.dy === -n.dy);

        n.dx = pt.x;
        n.dy = pt.y;
        if (this.mirror && twin >= 0) {
          this.design.nodes[twin].dx = n.dx;
          this.design.nodes[twin].dy = -n.dy;
        }
        this.paint();
      });

      cv.addEventListener('pointerup', () => {
        this.drag = -1;
        this.dragHandle = false;
        this.saveDraft();
      });

      // UI Button Wires
      q('#sy-mirror').onclick = (e) => {
        this.mirror = !this.mirror;
        e.target.textContent = 'MIRROR: ' + (this.mirror ? 'ON (M)' : 'OFF (M)');
        e.target.classList.toggle('hot', this.mirror);
      };
      q('#sy-guides').onclick = (e) => {
        this.guides = !this.guides;
        e.target.textContent = 'GUIDES: ' + (this.guides ? 'ON (G)' : 'OFF (G)');
        e.target.classList.toggle('hot', this.guides);
        this.paint();
      };
      q('#sy-snap').onclick = (e) => {
        this.angleSnap = !this.angleSnap;
        e.target.textContent = 'SNAP: ' + (this.angleSnap ? 'ON (S)' : 'OFF (S)');
        e.target.classList.toggle('hot', this.angleSnap);
        this.paint();
      };

      q('#sy-zin').onclick = () => { this.zoom = this.fitScale() * 1.25; this.paint(); };
      q('#sy-zout').onclick = () => { this.zoom = this.fitScale() / 1.25; this.paint(); };
      q('#sy-zfit').onclick = () => { this.zoom = 0; this.paint(); };
      q('#sy-z11').onclick = () => { this.zoom = 1; this.paint(); };

      q('#sy-grow').onclick = () => this.resizeSel(+2);
      q('#sy-shrink').onclick = () => this.resizeSel(-2);
      q('#sy-dup').onclick = () => this.duplicateSel();
      q('#sy-del').onclick = () => this.remove(this.sel);
      q('#sy-clear').onclick = () => {
        this.design = blankDesign(); this.sel = -1; this.syncFields(); this.paint();
      };
      q('#sy-fly').onclick = () => this.testFlight();
      q('#sy-close').onclick = () => this.hide();
      q('#sy-save').onclick = () => { this.readFields(); this.saveToRoster(); };
      q('#sy-export').onclick = () => {
        this.readFields();
        q('#sy-io').value = this.exportText();
        this.toast('Exported literal js/fleet.js entry.');
      };
      q('#sy-copy').onclick = () => {
        this.readFields();
        const t = q('#sy-io');
        if (!t.value) t.value = this.exportText();
        t.select();
        try { document.execCommand('copy'); this.toast('Copied to clipboard.'); }
        catch (e) { this.toast('Select and copy manually.', true); }
      };
      q('#sy-import').onclick = () => this.doImport(q('#sy-io').value);

      ['#sy-id', '#sy-mark', '#sy-frame', '#sy-color', '#sy-sec', '#sy-weapon']
        .forEach(s => {
          const el = q(s);
          if (el) el.onchange = () => { this.readFields(); this.saveDraft(); this.paint(); };
        });
    },

    readFields() {
      const q = id => this.el.querySelector(id).value;
      this.design.id = q('#sy-id').trim();
      this.design.mark = q('#sy-mark').trim() || 'I';
      this.design.frame = q('#sy-frame').trim();
      this.design.color = q('#sy-color');
      this.design.secAbility = q('#sy-sec').trim() || 'shield';
      this.design.primaryWeapon = q('#sy-weapon');
      this.design.scale = 1;
    },

    // ---- open / close ---------------------------------------------------

    show() {
      this.build();
      this.el.classList.add('on');
      this.open = true;
      if (window.engine) engine.paused = true;
      this.syncFields();
      this.refreshRosterList();
      this.paint();
    },

    hide() {
      if (!this.el) return;
      this.el.classList.remove('on');
      this.open = false;
      this.saveDraft();
      if (window.engine) engine.paused = false;
    },

    toggle() { this.open ? this.hide() : this.show(); }
  };

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      shipyard.toggle();
      return;
    }
    if (!shipyard.open) return;

    if (e.key === 'Escape') {
      shipyard.hide();
    } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      shipyard.remove(shipyard.sel);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      const mb = shipyard.el && shipyard.el.querySelector('#sy-mirror');
      if (mb) mb.click();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      const gb = shipyard.el && shipyard.el.querySelector('#sy-guides');
      if (gb) gb.click();
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      const sb = shipyard.el && shipyard.el.querySelector('#sy-snap');
      if (sb) sb.click();
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      shipyard.duplicateSel();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      shipyard.cycleWeaponType();
    } else if (e.key === ']') {
      e.preventDefault();
      shipyard.resizeSel(+2);
    } else if (e.key === '[') {
      e.preventDefault();
      shipyard.resizeSel(-2);
    } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      shipyard.testFlight();

    } else if (e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      shipyard.selectPartByIndex(parseInt(e.key, 10) - 1);
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      const step = e.shiftKey ? 8 : 2;
      shipyard.nudgeSel(0, -step);
    } else if (e.key === 'ArrowDown' || e.key === 's_nudge') {
      e.preventDefault();
      const step = e.shiftKey ? 8 : 2;
      shipyard.nudgeSel(0, step);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      const step = e.shiftKey ? 8 : 2;
      shipyard.nudgeSel(-step, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 8 : 2;
      shipyard.nudgeSel(step, 0);
    }
  });

  window.addEventListener('load', () => {
    shipyard.loadDraft();
    const n = shipyard.loadRoster();
    if (n) console.log('[shipyard] re-registered ' + n + ' authored hull(s)');
  });

  window.shipyard = shipyard;
})();
