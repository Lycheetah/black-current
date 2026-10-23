/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - World Matrix Grid & Chamber Map (Module 4)
   7x7 Interconnected Sectors, Portal Boundary Transitions & Map Overlay
   ========================================================================== */

class BubbleChamber {
  /* F3b: `sys` is the galaxy system this sector belongs to (js/galaxy.js), or
     null for HOME: Asterion Forge's own 7×7, which keeps its old save keys,
     missions, bosses and the Grave Choir rift exactly as they were. */
  constructor(gridX, gridY, sys = null) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.sys = sys;
    this.sysId = sys ? sys.id : 'home';
    this.key = sys ? `${sys.id}:${gridX},${gridY}` : `${gridX},${gridY}`;
    /* ⭐⭐ SECTOR SCALE — MAC'S MEASUREMENT, 2026-08-17.
       *"sectors are to small feel dead and ... your going beteween them so ofen
       its just frustrating ... im -50% zoomed out to just see everything."*

       He was right and the arithmetic says why. At camera zoom 0.62 on a 1366px
       canvas the visible world is 1366/0.62 = 2203 px across — ±1100 from the
       player. The old radius of 750 made the sector 1500 px wide, so THE WHOLE
       SECTOR WAS SMALLER THAN ONE SCREEN. Zooming out did not reveal more world
       because there was no more world. And at topSpeed 18 px/frame (1080 px/s)
       you crossed it end to end in 1.4 SECONDS — which is the boundary-crossing
       frequency he was complaining about, stated as a number.

       2600 makes the sector 5200 px wide: ~2.4 screens across, ~4.8 seconds of
       hard burn end to end. Still "wee" — you can see a landmark from anywhere
       in it — but it is a place you travel in rather than a plate you fall off. */
    this.radius = 2600;


    /* F2 GENTLE START. Danger scales with distance from home (0,0), but ALL of
       ring 1 (diagonals included) is the learning ground at danger 1. The old
       floor(dist × 1.6) made the diagonals next to home danger 2, so half of the
       first step out was already a jump (bot-measured: 1.7 deaths / 3 min).
       Ring 2 = danger 2–4, ring 3 = 4–5, the corners are the bosses. */
    const distFromCenter = Math.hypot(gridX, gridY);
    const ring = Math.max(Math.abs(gridX), Math.abs(gridY));
    this.dangerLevel = ring <= 1 ? 1 : Math.min(7, Math.max(1, Math.floor(distFromCenter * 1.45)));
    /* F3b: out in the galaxy a system sets the base, and its outer ring runs hotter. */
    if (sys) this.dangerLevel = Math.min(7, Math.max(1, sys.danger + Math.floor(ring / 2)));

    // 4 Corner Mega Boss Arenas (home only)
    this.isBossSector = !sys && (Math.abs(gridX) === 3 && Math.abs(gridY) === 3);
    this.bossName = this.isBossSector ? this.getBossName(gridX, gridY) : null;
    /* A haven is a sector that starts quiet: home's centre, and every hub's centre. */
    this.isHaven = gridX === 0 && gridY === 0 && (!sys || !!sys.hub);

    /* ⚠ AUTHORED METADATA, NOT ROLLED. `missionFor` is a pure function of the
       coordinates, so the launch card can promise a biome, a hazard and a reward
       BEFORE the room is entered and still be telling the truth when it is. */
    this.mission = sys ? systemMission(sys, gridX, gridY, this.dangerLevel) : missionFor(gridX, gridY);
    this.biome = this.mission.biome;
    this.missionId = this.mission.id;
    this.objective = this.mission.objective;
    this.hazard = this.mission.hazard;
    this.reward = this.mission.reward;
    this.musicTheme = (BIOMES[this.biome] || { music: 'HAVEN' }).music;

    /* ⚠ CLEARED/EXPLORED USED TO DIE ON REFRESH. They lived only in memory while
       mass and relics were persisted — so a reload un-explored the whole ocean
       while keeping the tank that explored it. They now restore from the save. */
    const remembered = saveState.chamberState(this.key);
    this.isCleared = remembered ? !!remembered.cleared : this.isHaven;
    this.isExplored = remembered ? !!remembered.explored : this.isHaven;

    this.enemies = [];
    this.nutrients = [];
    this.projectiles = [];
    this.bioMines = [];
  }

  getBossName(x, y) {
    if (x === -3 && y === -3) return 'ABYSSAL TITAN';
    if (x === 3 && y === -3) return 'HIVE QUEEN';
    if (x === -3 && y === 3) return 'SOLAR DREADNOUGHT';
    if (x === 3 && y === 3) return 'VOID LEVIATHAN';
    return null;
  }

  getChamberTitle() {
    const place = (BIOMES[this.biome] || { name: 'Open Water' }).name;
    if (this.isBossSector) return `Sector (${this.gridX},${this.gridY}): ${this.bossName}`;
    if (this.sys) return `${this.sys.name} (${this.gridX},${this.gridY}) · Lv.${this.dangerLevel}`;
    return `Sector (${this.gridX},${this.gridY}): ${place} · Lv.${this.dangerLevel}`;
  }

  /** Persist the two facts that are actually campaign state. */
  remember() {
    saveState.rememberChamber(this.key, {
      cleared: this.isCleared,
      explored: this.isExplored
    });
  }
}

/* F3b: a sector out in the galaxy borrows the generic mission shape; its biome
   follows its danger so a deep system looks and sounds deep. */
function systemMission(sys, gx, gy, danger) {
  const base = missionFor(9, 0);
  const biome = danger >= 5 ? 'black-current' : danger >= 3 ? 'pressure-line' : 'reef';
  return Object.assign({}, base, {
    id: `${sys.id}-${gx}_${gy}`, biome,
    beat: `${sys.region.toUpperCase()} · ${sys.name}`,
    reward: { type: 'mass', id: 'system', label: `System bounty · +${20 + danger * 10} mass` }
  });
}

class WorldMatrixMap {
  constructor() {
    this.chambers = {};
    this.currentGridX = 0;
    this.currentGridY = 0;
    this.system = null;     // F3b: null = home (Asterion Forge); else a galaxy system
    this.size = 3;          // grid half-width: 3 → 7×7, 2 → 5×5, 1 → 3×3
    this.initMatrix();
  }

  initMatrix() {
    this.chambers = {};
    for (let x = -this.size; x <= this.size; x++) {
      for (let y = -this.size; y <= this.size; y++) {
        const key = `${x},${y}`;
        this.chambers[key] = new BubbleChamber(x, y, this.system);
      }
    }
  }

  /** F3b: swap the whole grid for another system's. Home is `null`. */
  enterSystem(sys) {
    this.system = sys || null;
    this.size = sys ? sys.size : 3;
    this.initMatrix();
    this.currentGridX = Math.max(-this.size, Math.min(this.size, this.currentGridX));
    this.currentGridY = Math.max(-this.size, Math.min(this.size, this.currentGridY));
  }

  getCurrentChamber() {
    const key = `${this.currentGridX},${this.currentGridY}`;
    return this.chambers[key] || this.chambers['0,0'];
  }

  checkPortalTransition(player) {
    const chamber = this.getCurrentChamber();
    const distFromCenter = Math.hypot(player.x, player.y);

    // Player crosses the chamber boundary
    if (distFromCenter > chamber.radius) {
      const angle = Math.atan2(player.y, player.x);

      /* ⛔ A CROSSING MUST BE A DECISION, NOT A SCRAPE. The old rule fired the
         instant the boundary was touched at any heading, so drifting along the
         inside of the wall — which is what fighting near the edge looks like —
         threw you into the next sector and back again. Require the ship to
         actually be LEAVING: its velocity must have an outward component.
         Everything else is pushed back below, unchanged. */
      const outward = (player.vx * Math.cos(angle) + player.vy * Math.sin(angle));
      if (outward <= 0.35) {
        player.vx -= Math.cos(angle) * 0.6;
        player.vy -= Math.sin(angle) * 0.6;
        return false;
      }

      let nextX = this.currentGridX;
      let nextY = this.currentGridY;

      if (Math.abs(player.x) > Math.abs(player.y)) {
        nextX += player.x > 0 ? 1 : -1;
      } else {
        nextY += player.y > 0 ? 1 : -1;
      }

      // Clamp grid to this system's size (±3 at home)
      nextX = Math.max(-this.size, Math.min(this.size, nextX));
      nextY = Math.max(-this.size, Math.min(this.size, nextY));

      if (nextX !== this.currentGridX || nextY !== this.currentGridY) {
        this.currentGridX = nextX;
        this.currentGridY = nextY;

        /* Position player on the opposite edge of the new chamber. ⚠ THE INSET
           SCALES WITH THE RADIUS. At 120 px inside a 2600 px sector you arrive
           still touching the wall, and the outward-velocity carried through the
           portal walks you straight back out. 380 puts the arrival a clear
           ship-length inside the membrane. */
        const inset = Math.max(160, chamber.radius * 0.146);   // 380 at r=2600
        player.x = -Math.cos(angle) * (chamber.radius - inset);
        player.y = -Math.sin(angle) * (chamber.radius - inset);

        const newChamber = this.getCurrentChamber();
        newChamber.isExplored = true;
        newChamber.remember();
        saveState.save();

        particleSystem.spawnBubbleBurst(player.x, player.y, player.color, 20);
        return true;
      } else {
        // Push back if edge of outer world matrix
        player.vx -= Math.cos(angle) * 2;
        player.vy -= Math.sin(angle) * 2;
      }
    }
    return false;
  }

  drawChamberMembrane(ctx, camera) {
    const chamber = this.getCurrentChamber();
    const screenX = 0 - camera.x;
    const screenY = 0 - camera.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(screenX, screenY, chamber.radius, 0, Math.PI * 2);
    
    ctx.fillStyle = 'rgba(8, 16, 32, 0.2)';   // now drawn OVER the ocean ground, so lighter
    ctx.strokeStyle = chamber.isBossSector ? 'rgba(255, 51, 102, 0.85)' : 'rgba(0, 243, 255, 0.45)';
    ctx.fill();
    /* ⚠ WAS shadowBlur = 24 ON A SECTOR-SIZED PATH, EVERY FRAME — MEASURED
       2026-10-23 at 48 ms of an 83 ms frame (scripts/profile-fps.mjs). The glow
       is now two wider, fainter strokes under the ring: same colour, no blur. */
    const rgb = chamber.isBossSector ? '255, 51, 102' : '0, 243, 255';
    ctx.strokeStyle = `rgba(${rgb}, 0.06)`; ctx.lineWidth = 40; ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb}, 0.12)`; ctx.lineWidth = 18; ctx.stroke();
    ctx.strokeStyle = chamber.isBossSector ? 'rgba(255, 51, 102, 0.85)' : 'rgba(0, 243, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  renderMatrixGridModal() {
    const container = document.getElementById('matrix-grid-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${this.size * 2 + 1}, 1fr)`;

    for (let y = -this.size; y <= this.size; y++) {
      for (let x = -this.size; x <= this.size; x++) {
        const key = `${x},${y}`;
        const chamber = this.chambers[key];
        const isCurrent = (x === this.currentGridX && y === this.currentGridY);

        const cell = document.createElement('div');
        let classes = 'sector-cell';
        if (isCurrent) classes += ' current';
        else if (chamber.isCleared) classes += ' cleared';
        else if (chamber.isBossSector) classes += ' boss-sector';

        cell.className = classes;
        /* F2: every cell shows its danger, coloured on one ramp, so the chart
           answers "how hard is it over there" before you fly. */
        cell.dataset.danger = chamber.isBossSector ? 'boss' : chamber.dangerLevel;
        cell.title = chamber.isBossSector ? `${chamber.bossName}` : (chamber.isHaven ? (this.system ? `${this.system.name} hub` : 'Asterion Forge · home') : `Danger ${chamber.dangerLevel}`) + (chamber.portals ? ' · jump portal' : '');
        cell.innerHTML = `
          <span class="sec-icon">${isCurrent ? '🛸' : (chamber.isBossSector ? '💀' : (chamber.isCleared ? '✓' : ''))}</span>
          <span class="sec-coords">${x},${y}</span>
          <span class="sec-danger">${chamber.isBossSector ? 'BOSS' : (chamber.isHaven ? (this.system ? 'HUB' : 'HOME') : 'Lv' + chamber.dangerLevel)}</span>
          ${chamber.portals ? `<span class="sec-jump" title="Jump portal">⟁${chamber.portals > 1 ? chamber.portals : ''}</span>` : ''}
        `;

        container.appendChild(cell);
      }
    }
  }
}

const worldMap = new WorldMatrixMap();
