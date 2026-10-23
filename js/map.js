/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - World Matrix Grid & Chamber Map (Module 4)
   7x7 Interconnected Sectors, Portal Boundary Transitions & Map Overlay
   ========================================================================== */

class BubbleChamber {
  constructor(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
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


    // Danger level scales with distance from center (0,0)
    const distFromCenter = Math.hypot(gridX, gridY);
    this.dangerLevel = Math.min(7, Math.max(1, Math.floor(distFromCenter * 1.6)));

    // 4 Corner Mega Boss Arenas
    this.isBossSector = (Math.abs(gridX) === 3 && Math.abs(gridY) === 3);
    this.bossName = this.getBossName(gridX, gridY);

    /* ⚠ AUTHORED METADATA, NOT ROLLED. `missionFor` is a pure function of the
       coordinates, so the launch card can promise a biome, a hazard and a reward
       BEFORE the room is entered and still be telling the truth when it is. */
    this.mission = missionFor(gridX, gridY);
    this.biome = this.mission.biome;
    this.missionId = this.mission.id;
    this.objective = this.mission.objective;
    this.hazard = this.mission.hazard;
    this.reward = this.mission.reward;
    this.musicTheme = (BIOMES[this.biome] || { music: 'HAVEN' }).music;

    /* ⚠ CLEARED/EXPLORED USED TO DIE ON REFRESH. They lived only in memory while
       mass and relics were persisted — so a reload un-explored the whole ocean
       while keeping the tank that explored it. They now restore from the save. */
    const remembered = saveState.chamberState(`${gridX},${gridY}`);
    this.isCleared = remembered ? !!remembered.cleared : (gridX === 0 && gridY === 0);
    this.isExplored = remembered ? !!remembered.explored : (gridX === 0 && gridY === 0);

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
    return `Sector (${this.gridX},${this.gridY}): ${place} · Lv.${this.dangerLevel}`;
  }

  /** Persist the two facts that are actually campaign state. */
  remember() {
    saveState.rememberChamber(`${this.gridX},${this.gridY}`, {
      cleared: this.isCleared,
      explored: this.isExplored
    });
  }
}

class WorldMatrixMap {
  constructor() {
    this.chambers = {};
    this.currentGridX = 0;
    this.currentGridY = 0;
    this.initMatrix();
  }

  initMatrix() {
    this.chambers = {};
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        const key = `${x},${y}`;
        this.chambers[key] = new BubbleChamber(x, y);
      }
    }
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

      // Clamp grid to (-3 to +3)
      nextX = Math.max(-3, Math.min(3, nextX));
      nextY = Math.max(-3, Math.min(3, nextY));

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
    
    ctx.fillStyle = 'rgba(8, 16, 32, 0.45)';
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

    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        const key = `${x},${y}`;
        const chamber = this.chambers[key];
        const isCurrent = (x === this.currentGridX && y === this.currentGridY);

        const cell = document.createElement('div');
        let classes = 'sector-cell';
        if (isCurrent) classes += ' current';
        else if (chamber.isCleared) classes += ' cleared';
        else if (chamber.isBossSector) classes += ' boss-sector';

        cell.className = classes;
        cell.innerHTML = `
          <span class="sec-icon">${isCurrent ? '🛸' : (chamber.isBossSector ? '💀' : (chamber.isCleared ? '✓' : ''))}</span>
          <span class="sec-coords">${x},${y}</span>
        `;

        container.appendChild(cell);
      }
    }
  }
}

const worldMap = new WorldMatrixMap();
