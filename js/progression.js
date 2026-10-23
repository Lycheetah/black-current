/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Progression & Gene Point Economy (Module 6 & 7)
   Bubble Mass Drops, Gene Points (GP), Evolution Levels, Relic Drops & Save
   ========================================================================== */

class BubbleDrop {
  constructor(x, y, mass, color) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.color = color;
    this.radius = 4 + mass * 0.8;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 600; // 10 seconds at 60fps
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(playerX, playerY) {
    this.life--;
    this.pulsePhase += 0.06;

    this.vx *= 0.97;
    this.vy *= 0.97;

    // Magnetic pull toward player when close
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    const M = (window.JUICE && JUICE.magnet) || 220; // B2 pickup magnet dial
    if (dist < M && dist > 0) {
      const pull = (M - dist) / M * 0.8;
      this.vx += (dx / dist) * pull;
      this.vy += (dy / dist) * pull;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx, camera) {
    if (this.collected) return;

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    const pulseR = this.radius + Math.sin(this.pulsePhase) * 1.5;

    const fadeAlpha = this.life < 120 ? this.life / 120 : 1;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Outer glow
    ctx.beginPath();
    ctx.arc(screenX, screenY, pulseR * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(')', ', 0.12)').replace('rgb', 'rgba');
    ctx.fill();

    // Core orb
    ctx.beginPath();
    ctx.arc(screenX, screenY, pulseR, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(
      screenX - pulseR * 0.3, screenY - pulseR * 0.3, 1,
      screenX, screenY, pulseR
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');

    ctx.fillStyle = grad;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.restore();
  }
}

const EVOLUTION_THRESHOLDS = [
  { level: 1, mass: 0,    title: 'Microbe',        hpBonus: 0,   sightBonus: 0,   maxSockets: 4  },
  { level: 2, mass: 50,   title: 'Proto-Cell',     hpBonus: 30,  sightBonus: 30,  maxSockets: 6  },
  { level: 3, mass: 150,  title: 'Bio-Cluster',    hpBonus: 60,  sightBonus: 60,  maxSockets: 8  },
  { level: 4, mass: 350,  title: 'Macro-Organism', hpBonus: 100, sightBonus: 90,  maxSockets: 12 },
  { level: 5, mass: 700,  title: 'Apex Predator',  hpBonus: 150, sightBonus: 120, maxSockets: 16 },
  { level: 6, mass: 1200, title: 'Leviathan',      hpBonus: 220, sightBonus: 160, maxSockets: 24 }
];

class ProgressionSystem {
  constructor() {
    this.totalMass = 0;
    this.evolutionLevel = 1;
    this.bubbleDrops = [];
    this.unlockedRelics = {
      titan: false,
      queen: false,
      solar: false,
      void: false
    };

    this.loadProgress();
  }

  getEvolutionData() {
    let current = EVOLUTION_THRESHOLDS[0];
    for (const thresh of EVOLUTION_THRESHOLDS) {
      if (this.totalMass >= thresh.mass) {
        current = thresh;
      }
    }
    return current;
  }

  getNextThreshold() {
    for (const thresh of EVOLUTION_THRESHOLDS) {
      if (this.totalMass < thresh.mass) {
        return thresh;
      }
    }
    return null;
  }

  getTotalGP() {
    // Base 60 GP + 45% of collected Mass, then the sworn crew's economy modifier.
    // (The old comment above this said 40% while the code said 45% — the code was
    //  and remains the truth; the comment is now corrected rather than obeyed.)
    const crewScale = (typeof saveState !== 'undefined') ? saveState.crew().gpScale : 1;
    return Math.floor((60 + Math.floor(this.totalMass * 0.45)) * crewScale);
  }

  unlockBossRelic(bossType) {
    if (bossType === 'ABYSSAL TITAN') this.unlockedRelics.titan = true;
    if (bossType === 'HIVE QUEEN') this.unlockedRelics.queen = true;
    if (bossType === 'SOLAR DREADNOUGHT') this.unlockedRelics.solar = true;
    if (bossType === 'VOID LEVIATHAN') this.unlockedRelics.void = true;
    this.saveProgress();
  }

  spawnDropsFromEnemy(enemy) {
    const dropCount = enemy.isBoss ? 10 : Math.max(1, Math.floor(enemy.tier * 0.8) + 1);
    const massPerDrop = enemy.isBoss ? 30 : 3 + enemy.tier * 2;

    for (let i = 0; i < dropCount; i++) {
      this.bubbleDrops.push(new BubbleDrop(
        enemy.x + (Math.random() - 0.5) * 30,
        enemy.y + (Math.random() - 0.5) * 30,
        massPerDrop,
        enemy.color
      ));
    }
  }

  collectDrop(drop) {
    drop.collected = true;
    this.totalMass += drop.mass;

    soundEngine.playBubblePop('small');

    const newEvo = this.getEvolutionData();
    if (newEvo.level > this.evolutionLevel) {
      this.evolutionLevel = newEvo.level;
      soundEngine.playEvolutionFanfare();
      this.saveProgress();
      return newEvo;
    }

    return null;
  }

  updateDrops(playerX, playerY, playerCoreRadius) {
    let levelUp = null;

    for (let i = this.bubbleDrops.length - 1; i >= 0; i--) {
      const drop = this.bubbleDrops[i];
      drop.update(playerX, playerY);

      const dist = Math.hypot(drop.x - playerX, drop.y - playerY);
      if (dist < playerCoreRadius + drop.radius + 14) {
        const result = this.collectDrop(drop);
        if (result) levelUp = result;
        this.bubbleDrops.splice(i, 1);
        continue;
      }

      if (drop.life <= 0) {
        this.bubbleDrops.splice(i, 1);
      }
    }

    return levelUp;
  }

  drawDrops(ctx, camera) {
    for (const drop of this.bubbleDrops) {
      drop.draw(ctx, camera);
    }
  }

  applyMassPenalty() {
    const prev = this.getEvolutionData();
    this.totalMass = Math.max(prev.mass, Math.floor(this.totalMass * 0.8));
    this.saveProgress();
  }

  /* ⚠ ONE SAVE DOCUMENT. This class used to own `biotank_forge_progress` while
     the designer separately owned `biotank_forge_player` — two keys, two writers,
     neither aware of the other, so a design could persist while the progression
     that paid for it did not. Both now read and write through `saveState`, which
     migrates the old keys once and never deletes them. */
  saveProgress() {
    saveState.doc.totalMass = this.totalMass;
    saveState.doc.evolutionLevel = this.evolutionLevel;
    saveState.doc.unlockedRelics = this.unlockedRelics;
    saveState.save();
  }

  loadProgress() {
    this.totalMass = saveState.doc.totalMass || 0;
    this.evolutionLevel = saveState.doc.evolutionLevel || 1;
    if (saveState.doc.unlockedRelics) this.unlockedRelics = saveState.doc.unlockedRelics;
  }
}

const progression = new ProgressionSystem();
