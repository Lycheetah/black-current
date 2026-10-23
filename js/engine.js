/* ==========================================================================
   BUBBLE TANKS: FORGE EDITION - Master Engine Core (Modules 1–6 Integrated)
   Player HP, Two-Way Combat, Mass Drops, Evolution, Death/Respawn & Shield
   ========================================================================== */

/* ⭐ JUICE (PLAN_WEEKEND_BLITZ B2). Live dials: `JUICE.shake = 0` in the console
   turns shake off, `JUICE.hitStopMs = 0` kills the freeze. Hit-stop freezes the
   SIM accumulator only; the render loop never stops. Shake is a render-pass
   translate, so camera.x/y (and everything the sim reads from it) never move.
   B3: a part's HP = radius × nodeHpPerRadius. */
window.JUICE = { shake: 1, shakeMax: 14, shakePerDamage: 0.35, killShake: 3.5,
  hitStopMs: 55, magnet: 340, nodeHpPerRadius: 4 };

class EngineCore {
  constructor() {
    window.engine = this;

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.lightingCanvas = document.getElementById('lighting-canvas');
    this.lightingCtx = this.lightingCanvas.getContext('2d');

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    /* ⭐ ZOOM. Mac, 2026-08-16: *"we need some better camera like zoomed out as
       these ships are beautiful."* js/feel.js recorded "no camera zoom — the world
       is 1:1", which was true: every draw computed `x - camera.x` and nothing
       scaled. Rather than touch ~40 draw sites, the whole world pass runs inside
       ONE ctx.scale(), so every existing `x - camera.x` keeps working unchanged.
       ⛔ The three places that read canvas.width to size a full-screen effect DO
       need it, because at zoom 0.6 the visible world is 1/0.6 as wide as the
       canvas — they would otherwise paint only the middle of the screen. */
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0, zoom: 0.62, targetZoom: 0.62 };
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.mapOpen = false;

    // Mobile / Touch Virtual Controls State
    this.touch = {
      moveId: null,
      aimId: null,
      moveOrigin: { x: 0, y: 0 },
      moveVector: { x: 0, y: 0 },
      aiming: false,
      isTouchDevice: false
    };

    /* ⚠ THE LOOP STARTS PAUSED. `engine.start()` runs at parse time, before
       garage.js has even been read, so the world must not move until an identity
       exists. `garage.launch()` is the only thing that clears this. */
    this.paused = true;
    this.inCombat = false;

    // Player Organism — now with real HP
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      coreRadius: 18,
      color: '#00f3ff',
      primaryWeapon: 'spitter',
      secAbility: 'shield',
      hp: 140,
      maxHp: 140,
      shieldHp: 0,
      iFrames: 0,        // invincibility frames after taking damage
      shootTimer: 0,
      secCooldownTimer: 0,
      maxSecCooldown: 180,
      regenTimer: 0,
      dead: false,
      respawnTimer: 0,
      /* ⭐ ONE STARTER CHASSIS, defined in js/fleet.js — which loads BEFORE this
         file, so `fleet` is always up by the time the engine is constructed.
         These were four hand-written nodes duplicated byte-for-byte in
         designer.js's `PRESET_DESIGNS.balanced`; editing one silently gave the
         designer a different ship from the one in flight. 3 slots, small core. */
      nodes: fleet.starterChassis().nodes
        .map(n => new SpringNode(n.dx, n.dy, n.radius, n.type))
    };

    this.enemies = [];
    this.projectiles = [];
    this.bioMines = [];
    this.drones = [];

    this.frameCount = 0;
    this.fps = 60;
    this.fpsTimer = performance.now();
    this.damageFlash = 0; // screen flash timer
    this._lastStamp = null;
    this._accumulator = 0;
    this._clockPaused = true;
    this._needsRender = true;
    this._simulationTicks = 0;
    this._droppedSimulationMs = 0;

    this.recalculatePlayerStats();
    this.initWindow();
    this.initInput();
    this.initUI();
    this.loadChamberEntities();
  }

  recalculatePlayerStats() {
    let totalHp = 100;
    this.player.nodes.forEach(node => {
      if (node.type === 'pod') totalHp += 35;
      if (node.type === 'shield') totalHp += 30;
      if (node.type === 'cannon') totalHp += 10;
      if (node.type === 'spike') totalHp += 15;
      if (node.type === 'bay' || node.type === 'wing' || node.type === 'siphon' || node.type === 'mender') totalHp += 10;   // F7 oddities: light
    });

    // Evolution HP bonus
    const evo = progression.getEvolutionData();
    totalHp += evo.hpBonus;

    // Sworn crew hull modifier — THIS is the caller that makes `hpBonus` real.
    totalHp += saveState.crew().hpBonus;

    this.player.maxHp = Math.max(40, Math.round(totalHp * this.coreMod('hull')));
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
  }

  initWindow() {
    const resize = () => {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
      this.canvas.width = this.viewportWidth;
      this.canvas.height = this.viewportHeight;
      // The fog is a smooth mask. Half-resolution avoids repainting and
      // compositing a second full-resolution battlefield every frame.
      this.lightingCanvas.width = Math.ceil(this.viewportWidth / 2);
      this.lightingCanvas.height = Math.ceil(this.viewportHeight / 2);
      this._needsRender = true;
      // Resizing clears the canvas, even when its dimensions are unchanged.
      if (typeof fluidShader !== 'undefined') fluidShader._fogKey = null;
    };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      // A background tab must not replay its absence as combat on return.
      this._lastStamp = null;
      this._accumulator = 0;
      this._needsRender = true;
    });
    resize();
  }

  initInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      if (e.code === 'Tab') {
        e.preventDefault();
        if (!this.player.dead && typeof organismDesigner !== 'undefined') organismDesigner.openDesigner();
      }

      if (e.code === 'KeyM') {
        this.toggleMapModal();
      }

      if (e.code === 'Space' || e.code === 'KeyQ') {
        if (!this.player.dead) this.triggerSecondaryAbility();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    this.canvas.addEventListener('mousedown', e => {
      this.mouse.down = true;
      soundEngine.init();
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });

    // ══ MULTI-TOUCH CONTROLS FOR MOBILE PHONES & TABLETS ══
    const joyBase = document.getElementById('touch-joystick-base');
    const joyKnob = document.getElementById('touch-joystick-knob');
    const aimReticle = document.getElementById('touch-aim-reticle');
    const maxJoyDist = 44;

    const handleTouchStart = e => {
      soundEngine.init();
      if (!this.touch.isTouchDevice) {
        this.touch.isTouchDevice = true;
        document.body.classList.add('is-touch-device');
      }

      // Ignore touches if interacting with modals or buttons
      if (this.paused || this.mapOpen || e.target.closest('.modal-overlay') || e.target.closest('.bc-overlay') || e.target.closest('.mobile-action-bar')) {
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const isLeftHalf = t.clientX < window.innerWidth * 0.5;

        // Left Half = Dynamic Joystick Movement
        if (isLeftHalf && this.touch.moveId === null) {
          this.touch.moveId = t.identifier;
          this.touch.moveOrigin = { x: t.clientX, y: t.clientY };
          this.touch.moveVector = { x: 0, y: 0 };
          if (joyBase && joyKnob) {
            joyBase.style.left = `${t.clientX}px`;
            joyBase.style.top = `${t.clientY}px`;
            joyKnob.style.transform = 'translate(-50%, -50%)';
            joyBase.classList.add('active');
          }
        }
        // Right Half = Touch Aim & Continuous Fire
        else if (!isLeftHalf && this.touch.aimId === null) {
          this.touch.aimId = t.identifier;
          this.touch.aiming = true;
          this.mouse.down = true;
          this.mouse.x = t.clientX;
          this.mouse.y = t.clientY;

          const mouseWorldX = t.clientX / this.camera.zoom + this.camera.x;
          const mouseWorldY = t.clientY / this.camera.zoom + this.camera.y;
          // ⛔ DELIBERATELY DOES NOT WRITE player.angle. It used to, and that was
          // a SECOND aim path that only existed on touch — the hull snapped
          // instantly on a phone while easing with mass on desktop. `update()`
          // derives the angle from this.mouse every frame, which these handlers
          // have already set above, so this write was redundant AND harmful.
          // ONE MECHANISM. Do not restore it.

          if (aimReticle) {
            aimReticle.style.left = `${t.clientX}px`;
            aimReticle.style.top = `${t.clientY}px`;
            aimReticle.classList.add('active');
          }
        }
      }
    };

    const handleTouchMove = e => {
      if (this.paused) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];

        // Update Joystick Vector
        if (t.identifier === this.touch.moveId) {
          const dx = t.clientX - this.touch.moveOrigin.x;
          const dy = t.clientY - this.touch.moveOrigin.y;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const clampedDist = Math.min(dist, maxJoyDist);

          this.touch.moveVector = {
            x: (Math.cos(angle) * clampedDist) / maxJoyDist,
            y: (Math.sin(angle) * clampedDist) / maxJoyDist
          };

          if (joyKnob) {
            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            joyKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
          }
        }
        // Update Aim & Firing
        else if (t.identifier === this.touch.aimId) {
          this.mouse.x = t.clientX;
          this.mouse.y = t.clientY;
          const mouseWorldX = t.clientX / this.camera.zoom + this.camera.x;
          const mouseWorldY = t.clientY / this.camera.zoom + this.camera.y;
          // ⛔ DELIBERATELY DOES NOT WRITE player.angle. It used to, and that was
          // a SECOND aim path that only existed on touch — the hull snapped
          // instantly on a phone while easing with mass on desktop. `update()`
          // derives the angle from this.mouse every frame, which these handlers
          // have already set above, so this write was redundant AND harmful.
          // ONE MECHANISM. Do not restore it.

          if (aimReticle) {
            aimReticle.style.left = `${t.clientX}px`;
            aimReticle.style.top = `${t.clientY}px`;
          }
        }
      }
    };

    const handleTouchEnd = e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];

        // Release Joystick
        if (t.identifier === this.touch.moveId) {
          this.touch.moveId = null;
          this.touch.moveVector = { x: 0, y: 0 };
          if (joyBase) joyBase.classList.remove('active');
        }
        // Release Aim / Fire
        else if (t.identifier === this.touch.aimId) {
          this.touch.aimId = null;
          this.touch.aiming = false;
          this.mouse.down = false;
          if (aimReticle) aimReticle.classList.remove('active');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  }

  initUI() {
    document.getElementById('btn-open-map').addEventListener('click', () => {
      this.toggleMapModal();
    });
    document.getElementById('btn-close-map').addEventListener('click', () => {
      this.toggleMapModal();
    });

    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
      soundEngine.init();
      const isMuted = soundEngine.toggleMute();
      document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    // Mobile Action Button Listeners
    const touchAbilityBtn = document.getElementById('btn-touch-ability');
    if (touchAbilityBtn) {
      touchAbilityBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.player.dead) this.triggerSecondaryAbility();
      });
      touchAbilityBtn.addEventListener('click', () => {
        if (!this.player.dead) this.triggerSecondaryAbility();
      });
    }

    const touchDesignerBtn = document.getElementById('btn-touch-designer');
    if (touchDesignerBtn) {
      touchDesignerBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!this.player.dead && typeof organismDesigner !== 'undefined') organismDesigner.openDesigner();
      });
    }

    const touchMapBtn = document.getElementById('btn-touch-map');
    if (touchMapBtn) {
      touchMapBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleMapModal();
      });
    }
  }

  toggleMapModal() {
    this.mapOpen = !this.mapOpen;
    document.getElementById('map-overlay').style.display = this.mapOpen ? 'flex' : 'none';
    if (this.mapOpen) worldMap.renderMatrixGridModal();
  }

  loadChamberEntities() {
    this.enemies = [];
    this.projectiles = [];
    this.bioMines = [];

    const chamber = worldMap.getCurrentChamber();
    document.getElementById('hud-chamber-title').textContent = chamber.getChamberTitle();
    document.getElementById('hud-danger-lvl').textContent = `Lv. ${chamber.dangerLevel}`;

    if (!chamber.isCleared) {
      if (chamber.isBossSector) {
        /* ⚠ THE BOSS MOVED OUT WITH THE WALL. At -220 in a 2600 px sector it
           spawns inside your arrival bubble; the boss arena should be a place
           you burn TOWARD. */
        this.enemies.push(new EnemyOrganism(0, -900, {
          tier: 7, isBoss: true, bossType: chamber.bossName, archetype: 'stalker'
        }));
      } else {
        /* ⭐ THE SECTOR GOT 12× BIGGER AND THE ROSTER DID NOT.
           *"sectors are to small feel dead"* — but 12× the enemies would be 200
           hostiles in a game already measured at 17 FPS in Firefox, so scaling
           by area is the wrong answer twice over.

           ⚖ WHAT ACTUALLY MAKES SPACE FEEL DEAD IS NOT EMPTINESS, IT IS HAVING
           NOWHERE TO GO. So the count rises modestly and the DISTRIBUTION
           changes: hostiles gather at the sector's landmarks (js/sectors.js),
           which means each cluster is as dense as the whole old sector was,
           there are three or four of them, and the space between them is
           travel with something visible at the end of it rather than filler. */
        const count = chamber.dangerLevel <= 1 ? 7 : 5 + chamber.dangerLevel * 3;   // F2: the learning ground holds 7
        const archetypes = ['mote', 'stalker', 'charger', 'sniper', 'hive'];
        const points = (window.sectorField && sectorField.spawnPoints)
          ? sectorField.spawnPoints(chamber, count)
          : null;

        for (let i = 0; i < count; i++) {
          let px, py;
          if (points && points[i]) {
            px = points[i].x; py = points[i].y;
          } else {
            // Fallback keeps the old behaviour if sectors.js is absent.
            const angle = Math.random() * Math.PI * 2;
            const dist = chamber.radius * (0.18 + Math.random() * 0.55);
            px = Math.cos(angle) * dist; py = Math.sin(angle) * dist;
          }
          const maxArch = Math.min(archetypes.length - 1, Math.floor(Math.random() * (chamber.dangerLevel + 1)));
          this.enemies.push(new EnemyOrganism(
            px, py,
            { tier: chamber.dangerLevel, archetype: archetypes[maxArch] }
          ));
        }
      }
    }
  }

  /**
   * Push the sworn identity into the live tank.
   *
   * ⚠ HULL STANCE MOVES THE CORE RADIUS AND NOTHING ELSE. The `nodes` array
   * stays the mechanical truth — a stance is a silhouette, not a second physics
   * model, which is why swapping it can never invalidate a saved design.
   */
  applyIdentity() {
    const hull = saveState.hull();
    if (hull) {
      this.player.coreRadius = hull.coreRadius;
      const core = this.player.nodes.find(n => n.type === 'core');
      if (core) core.radius = hull.coreRadius;
    }
    const pal = PALETTES[saveState.profile.palette];
    if (pal && !saveState.doc.design) {
      this.player.color = pal.color;
      document.documentElement.style.setProperty('--primary-cyan', pal.color);
    }
    if (saveState.doc.design) this.applyDesign(saveState.doc.design, { restore: true });
    this.recalculatePlayerStats();
    this.player.hp = this.player.maxHp;
    if (window.garage) garage.paintHud();
  }

  /**
   * Arrive in a chamber: reload entities, tell the soundtrack where it is, and
   * show the mission card unless we are told to stay quiet.
   */
  enterChamber(opts = {}) {
    /* ⚠ READ IT BEFORE loadChamberEntities, WHICH IS ALSO WHERE IT GETS SET.
       Whether this is the FIRST time you have ever been here is the whole
       question below, and it stops being answerable one line later. */
    const wasExplored = worldMap.getCurrentChamber().isExplored;

    this.loadChamberEntities();
    const chamber = worldMap.getCurrentChamber();
    chamber.isExplored = true;
    chamber.remember();

    this.inCombat = false;
    soundEngine.setMusicState(chamber.musicTheme);
    if (chamber.isBossSector && !chamber.isCleared) {
      soundEngine.setMusicState('BOSS', { boss: BOSS_KEYS[chamber.bossName] });
    }

    /* 🔴 THE DEFECT MAC FELT: *"have annoying notifcation and your going beteween
       them so ofen its just frustrating."*

       ⛔ THE TWO BRANCHES HERE WERE IDENTICAL. `opts.silent` was accepted,
       tested, branched on — and then both arms called `showMission()` anyway.
       A parameter that is read and cannot change the outcome is not a setting,
       it is a comment. So the mission card, which PAUSES THE GAME and steals
       focus, fired on every single boundary crossing, forever, including the
       sector you just left ninety seconds ago.

       ⚖ THE RULE NOW: a modal is for the first time you ever see a place.
       Coming back is a banner — the same information, no pause, no keystroke
       owed. Re-read it any time from the map (M). */
    if (!window.garage || chamber.isCleared || chamber.zoneLayer) return;   // zones speak through their own card

    if (!wasExplored && !opts.silent) {
      garage.showMission(chamber.mission, chamber);
    } else {
      const place = chamber.sys ? chamber.sys.name : (BIOMES[chamber.biome] || { name: 'Open Water' }).name;   // F3b: name the system
      garage.banner(`${place} · Sector ${chamber.gridX},${chamber.gridY} · Lv.${chamber.dangerLevel}`, 'good');
    }
  }

  applyDesign(design, options = {}) {
    if (!design || !design.nodes) return false;
    const fittingError = !options.restore && window.fitting ? fitting.check(design) : null;
    if (fittingError) { if (window.garage) garage.banner(fittingError, 'bad'); return false; }

    this.player.color = design.color;
    this.player.primaryWeapon = design.primaryWeapon || 'spitter';
    this.player.secAbility = design.secAbility || 'shield';

    document.documentElement.style.setProperty('--primary-cyan', design.color);
    this.player.nodes = design.nodes.map(n => Object.assign(new SpringNode(n.dx, n.dy, n.radius, n.type),
      { ...(n.quirk ? { quirk: n.quirk, rarity: n.rarity } : {}), ...(n.art ? { art: n.art } : {}) }));

    this.recalculatePlayerStats();
    this.player.hp = this.player.maxHp; // Full heal on redesign

    /* ⚠ THE DESIGNER IS THE ONE CHOKE POINT, SO PERSIST HERE.
       `designer.saveAndApply()` still writes the legacy `biotank_forge_player`
       key; this is what puts the same design into the authoritative v2 document,
       so a refresh restores the tank the player actually built. */
    saveState.doc.design = design;
    saveState.save();

    soundEngine.playEvolutionFanfare();
    particleSystem.spawnBubbleBurst(this.player.x, this.player.y, this.player.color, 16);
    return true;
  }

  playerTakeDamage(amount, source = 'shot', node = null) {
    if (this.player.iFrames > 0 || this.player.dead || this.paused) return;

    /* Ironwake's plating is contact-only — it must not quietly become a global
       damage reduction, or the crew card is lying about what it buys. */
    if (source === 'contact') amount *= saveState.crew().contactResist;

    /* The membrane sink is the opposite: it is deliberately global, because
       "power to shields" that only helped against rams would be a lie the
       player could not see. Applied before the shield pool, so the reduction
       makes shield HP go further too. */
    if (typeof reactor !== 'undefined') amount *= reactor.damageTakenScale();

    // Shield absorbs first
    if (this.player.shieldHp > 0) {
      if (this.player.shieldHp >= amount) {
        this.player.shieldHp -= amount;
        soundEngine.playImpact ? soundEngine.playImpact('shield', this.player) : soundEngine.playBubblePop('small');
        return;
      } else {
        amount -= this.player.shieldHp;
        this.player.shieldHp = 0;
      }
    }

    /* ⭐ B3: DAMAGE REMOVES CAPABILITY BEFORE EXISTENCE. A shot that lands on a
       part (past the shield) is that part's problem, not the core's. */
    if (node && !node.lost) {
      this.damageNode(this.player, node, amount);
      this.player.iFrames = 15;
      this.player.regenTimer = 180;
      soundEngine.playBubblePop('small');
      return;
    }

    this.player.hp -= amount;
    this.player._hitAt = performance.now();
    this.addShake(amount * JUICE.shakePerDamage);
    this.player.iFrames = 15; // quarter second of invincibility
    this.player.regenTimer = 180; // 3 seconds before regen starts
    this.damageFlash = 8;

    soundEngine.playBubblePop('medium');
    particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#ff3366', 10);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.playerDeath();
    }
  }

  playerDeath() {
    this.player.dead = true;
    this.player.respawnTimer = 180; // 3 seconds

    soundEngine.playAbility('emp');
    soundEngine.setMusicState('DEATH');
    particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#ff3366', 30);

    progression.applyMassPenalty();
  }

  playerRespawn() {
    this.player.dead = false;
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.iFrames = 90; // 1.5 second spawn protection
    this.player.shieldHp = 0;

    this.recalculatePlayerStats();
    this.player.hp = this.player.maxHp;
    this.repairNodes(this.player);

    // Return to sector (0,0)
    worldMap.currentGridX = 0;
    worldMap.currentGridY = 0;
    this.enterChamber({ silent: true });

    soundEngine.playEvolutionFanfare();
    particleSystem.spawnBubbleBurst(0, 0, this.player.color, 20);
  }

  triggerSecondaryAbility() {
    if (this.paused || this.mapOpen || document.hidden || this.player.dead) return;
    if (this.player.secCooldownTimer > 0) return;

    const ability = this.player.secAbility;
    const def = SECONDARY_ABILITIES[ability] || SECONDARY_ABILITIES.shield;
    /* Neon Veil's recharge edge — the caller that makes `cooldownScale` real. */
    const cd = Math.round(def.cd * (saveState.crew().cooldownScale || 1));
    this.player.secCooldownTimer = cd;
    this.player.maxSecCooldown = cd;

    soundEngine.playAbility(ability);

    if (ability === 'shield') {
      this.player.shieldHp = 80;
      particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#00f3ff', 16);
    } else if (ability === 'emp') {
      particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#bc13fe', 24);
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (!p.isPlayer && Math.hypot(p.x - this.player.x, p.y - this.player.y) < 280) {
          this.projectiles.splice(i, 1);
        }
      }
      this.enemies.forEach(e => {
        if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 280) {
          e.takeDamage(40);
        }
      });
    } else if (ability === 'dash') {
      this.player.vx += Math.cos(this.player.angle) * 20;
      this.player.vy += Math.sin(this.player.angle) * 20;
      this.player.iFrames = Math.max(this.player.iFrames, 20);
      particleSystem.spawnBubbleBurst(this.player.x, this.player.y, this.player.color, 14);
    } else if (ability === 'drone') {
      if (this.drones.length < 3) {
        this.drones.push(new MitosisDrone(this.player));
        particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#39ff14', 14);
      }
    } else if (ability === 'mine') {
      this.bioMines.push(new BioMine(
        this.player.x - Math.cos(this.player.angle) * 35,
        this.player.y - Math.sin(this.player.angle) * 35
      ));
    }
  }

  shootPrimary() {
    // ⭐ THE SHIP FIRES FROM ITS GUNS NOW, NOT FROM ITS CENTRE.
    // An EMPTY ARRAY IS A REAL ANSWER: no gun can bear, so nothing fires. That
    // is exactly the moment a fast ship gets inside a capital's arc and the
    // battery cannot answer it.
    const mounts = hardpoints.readyMounts(this.player);
    if (!mounts.length) return false;
    const dmgScale = hardpoints.damageScale(this.player);

    /* ⭐ PHASE 5 — MOUNT RADIUS PICKS THE WEAPON. Group the guns that can bear
       by what they actually ARE, then run the existing per-weapon branch once
       per group. A dreadnought's siege spine and its point-defence skirt now
       fire different weapons on the same trigger pull, each on its own clock.
       ⛔ Falls back to the ship-wide `primaryWeapon` if fleet.js is absent, so
       an old saved design still shoots exactly as it did before. */
    const groups = new Map();
    for (const m of mounts) {
      const w = (m.turret && m.turret.weapon) || this.player.primaryWeapon;
      if (!groups.has(w)) groups.set(w, []);
      groups.get(w).push(m);
    }
    for (const [w, group] of groups) this.fireMountGroup(w, group, dmgScale);
    return true;
  }

  fireMountGroup(wType, mounts, dmgScale) {
    const def = WEAPON_TYPES[wType] || WEAPON_TYPES.spitter;

    soundEngine.playWeaponShot(wType, mounts[0]);

    // Every weapon-type branch below is UNCHANGED. It simply now happens once
    // per gun that can bear, from that gun's own muzzle, along its own line.
    const spawnProjectile = (angleOffset, opts = {}) => {
      for (const m of mounts) {
        const finalAngle = m.angle + angleOffset;
        const projectile = new Projectile(
          m.x,
          m.y,
          Math.cos(finalAngle) * (opts.speed || weaponSpeed(opts.type || wType)),
          Math.sin(finalAngle) * (opts.speed || weaponSpeed(opts.type || wType)),
          {
            color: opts.color || this.player.color,
            damage: (opts.damage || def.damage) * dmgScale,
            radius: opts.radius || def.radius,
            isPlayer: true,
            type: opts.type || wType,
            pierce: opts.pierce || 1,
            target: opts.target || null
          }
        );
        if (m.turret?.node?.quirk === 'bouncer') {
          projectile.vx *= .8; projectile.vy *= .8;
          projectile.ricochets = 1; projectile.ricochetSeen = new WeakSet();
        }
        if (m.turret?.node?.quirk === 'scatter') {
          const speed = Math.hypot(projectile.vx, projectile.vy), angle = Math.atan2(projectile.vy, projectile.vx);
          projectile.damage *= .55; projectile.life = Math.floor(projectile.life * .5);
          projectile.vx = Math.cos(angle - .18) * speed; projectile.vy = Math.sin(angle - .18) * speed;
          this.projectiles.push(new Projectile(m.x, m.y, Math.cos(angle + .18) * speed, Math.sin(angle + .18) * speed,
            { color: projectile.color, damage: projectile.damage, life: projectile.life, radius: projectile.radius, isPlayer: true, type: projectile.type }));
        }
        if (typeof quirks !== 'undefined') quirks.shot(projectile, m.turret?.node?.quirk);
        this.projectiles.push(projectile);
      }
    };

    if (wType === 'twin') {
      spawnProjectile(-0.2);
      spawnProjectile(0.2);
    } else if (wType === 'mortar') {
      spawnProjectile(-0.3, { color: '#ffb703' });
      spawnProjectile(0, { color: '#ffb703' });
      spawnProjectile(0.3, { color: '#ffb703' });
    } else if (wType === 'laser') {
      spawnProjectile(0, { color: '#bc13fe' });
    } else if (wType === 'homing') {
      let nearest = null, minDist = 600;
      this.enemies.forEach(e => {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < minDist) { minDist = d; nearest = e; }
      });
      spawnProjectile(0, { color: '#39ff14', target: nearest, type: 'homing' });
    } else if (wType === 'railgun') {
      spawnProjectile(0, { color: '#ff3366', pierce: 3 });
    } else {
      spawnProjectile(0);
    }
  }

  update(dt) {
    if (this.paused || this.mapOpen || document.hidden) return;

    // --- DEATH / RESPAWN ---
    if (this.player.dead) {
      this.player.respawnTimer--;
      if (this.player.respawnTimer <= 0) {
        this.playerRespawn();
      }
      // Still update particles for visual effect
      particleSystem.update();
      fluidShader.update();
      return;
    }

    // --- MOVEMENT (Keyboard + Touch Virtual Joystick) ---
    const inp = this.readInput();
    const ax = inp.ax, ay = inp.ay;

    /* --- ENERGY TRIAGE ---
       One reactor tick per simulation step. It lives here, after the dead-player early
       return above, so a corpse does not drain or recharge: the pool holds at
       whatever it was when you died and resumes on respawn. */
    if (typeof reactor !== 'undefined') reactor.update();
    const reactorThrust = ((typeof reactor !== 'undefined') ? reactor.thrustScale() : 1) * this.partScale(this.player, 'thruster') * this.coreMod('thrust');

    const crewAccel = (typeof saveState !== 'undefined' && saveState.crew()) ? saveState.crew().accelScale : 1;
    /* --- MOVEMENT FEEL ---
       Was a hardcoded 0.75 / 0.93 — 41 frames (0.68s) to reach speed and 41
       to shed it, which is the "sluggish" Mac reported while playing. The
       numbers now live in `js/feel.js` behind a live dial so he lands them
       himself; see that file for the arithmetic. Guarded the same way the
       reactor is, so the game still runs if feel.js fails to load. */
    const feelAccel = (typeof movementFeel !== 'undefined') ? movementFeel.accel : 0.75;
    const feelDamping = (typeof movementFeel !== 'undefined') ? movementFeel.damping : 0.93;
    this.player.vx += ax * feelAccel * crewAccel * reactorThrust;
    this.player.vy += ay * feelAccel * crewAccel * reactorThrust;
    this.player.vx *= feelDamping;
    this.player.vy *= feelDamping;
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    const mouseWorldX = inp.aimX;
    const mouseWorldY = inp.aimY;
    // THE ONE AIM PATH. Store the aim POINT (not just the angle) so each turret
    // can aim from its own mount, then EASE the hull toward it — mass in the
    // turn. Safe because movement is absolute: W is world-up (just above), so
    // hull facing drives only gunnery and silhouette, never thrust direction.
    this.player._aimX = mouseWorldX;
    this.player._aimY = mouseWorldY;
    this.player.aimAngle = Math.atan2(mouseWorldY - this.player.y, mouseWorldX - this.player.x);
    this.player.angle = hardpoints.steerHull(this.player.angle, this.player.aimAngle);
    hardpoints.update(this.player);

    // --- INVINCIBILITY FRAMES ---
    if (this.player.iFrames > 0) this.player.iFrames--;
    if (this.damageFlash > 0) this.damageFlash--;

    // --- PASSIVE HP REGEN ---
    if (this.player.regenTimer > 0) {
      this.player.regenTimer--;
    } else if (this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 0.15);
    }

    // --- PORTAL TRANSITION ---
    if (worldMap.checkPortalTransition(this.player)) {
      soundEngine.playAbility('dash');
      this.enterChamber();
    }

    // --- CHAMBER CLEARED ---
    const chamber = worldMap.getCurrentChamber();
    if (!chamber.isCleared && this.enemies.length === 0) {
      chamber.isCleared = true;
      chamber.remember();
      soundEngine.playEvolutionFanfare();
      particleSystem.spawnBubbleBurst(this.player.x, this.player.y, '#39ff14', 24);

      if (typeof saveState !== 'undefined') {
        const result = saveState.completeMission(chamber.mission);
        if (result && window.garage) {
          garage.showReward('SECTOR CLEARED', (BIOMES[chamber.biome] || { name: 'Ocean' }).name, result.lines);
          garage.banner(`Sector (${chamber.gridX},${chamber.gridY}) Cleared!`, 'good');
        }
      }
    }

    // --- PRIMARY SHOOTING ---
    /* ⭐ THE TRIGGER IS NOW POLLED EVERY FRAME AND EACH GUN GATES ITSELF.
       `player.shootTimer` used to be ONE clock the whole ship shared, which is
       why a battleship's point defence could not chatter while its heavy
       turrets reloaded. The interval now lives on the turret
       (`hardpoints._intervalFor`), derived from the weapon its mount radius
       selected and scaled by the hull class. The crew, reactor and floor-of-2
       rules moved there intact.
       ⚠ `shootTimer` is KEPT — it still drives the "firing" HUD tell below. */
    if (this.player.shootTimer > 0) this.player.shootTimer--;
    if (this.input.fire && this.shootPrimary()) {
      this.player.shootTimer = 6;
    }

    // --- SECONDARY COOLDOWN & TOUCH PROGRESS ---
    if (this.player.secCooldownTimer > 0) {
      this.player.secCooldownTimer--;
      const pct = 1 - this.player.secCooldownTimer / this.player.maxSecCooldown;
      const fill = document.getElementById('ability-cd-fill');
      if (fill) fill.style.width = `${pct * 100}%`;
      const cdCircle = document.getElementById('touch-cd-circle');
      if (cdCircle) cdCircle.style.strokeDashoffset = `${(1 - pct) * 144.5}`;
    } else {
      const fill = document.getElementById('ability-cd-fill');
      if (fill) fill.style.width = '100%';
      const cdCircle = document.getElementById('touch-cd-circle');
      if (cdCircle) cdCircle.style.strokeDashoffset = '0';
    }

    const touchIcon = document.getElementById('touch-ability-icon');
    if (touchIcon && SECONDARY_ABILITIES[this.player.secAbility]) {
      touchIcon.textContent = SECONDARY_ABILITIES[this.player.secAbility].icon;
    }

    // --- DRONES ---
    this.drones.forEach(d => d.update(this.projectiles, this.enemies));

    // --- BIO-MINES vs ENEMIES ---
    for (let i = this.bioMines.length - 1; i >= 0; i--) {
      const mine = this.bioMines[i];
      mine.update();
      if (mine.life <= 0) { this.bioMines.splice(i, 1); continue; }
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(mine.x - e.x, mine.y - e.y) < mine.radius + e.coreRadius) {
          e.takeDamage(75);
          soundEngine.playBubblePop('large');
          particleSystem.spawnBubbleBurst(mine.x, mine.y, '#ffb703', 20);
          if (e.hp <= 0) {
            this.killEnemy(j);
          }
          this.bioMines.splice(i, 1);
          break;
        }
      }
    }

    // --- PROJECTILE COLLISIONS ---
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.enemies);

      if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }

      if (p.isPlayer) {
        // Player projectiles vs enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (p.ricochetSeen?.has(e)) continue;
          const hit = this.shipHit(e, p);
          if (hit) {
            if (hit === true || e.shield > 0) e.takeDamage(p.damage);
            else this.damageNode(e, hit, p.damage);
            e._hitAt = performance.now();
            particleSystem.spawnSpark(p.x, p.y, p.color);
            soundEngine.playImpact ? soundEngine.playImpact(e.shield > 0 ? 'shield' : 'hull', e) : soundEngine.playBubblePop('small');
            p.pierce--;

            if (p.thief && window.loot && e.hp <= 0) loot.steal(e);

            if (e.hp <= 0) {
              this.killEnemy(j);
            }

            if (p.ricochets > 0) {
              p.ricochetSeen.add(e);
              const target = this.enemies.filter(other => other !== e && !p.ricochetSeen.has(other) && other.hp > 0)
                .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
              if (target && Math.hypot(target.x - e.x, target.y - e.y) < 600) {
                const angle = Math.atan2(target.y - e.y, target.x - e.x), speed = Math.hypot(p.vx, p.vy);
                p.x = e.x; p.y = e.y; p.prevX = p.x; p.prevY = p.y;
                p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
                p.target = target; p.ricochets--; p.pierce = 1; break;
              }
            }
            if (p.pierce <= 0) { this.projectiles.splice(i, 1); break; }
          }
        }
      } else {
        // ENEMY PROJECTILES vs PLAYER — the missing collision!
        const hit = this.shipHit(this.player, p);
        if (hit) {
          this.playerTakeDamage(p.damage, 'shot', hit === true ? null : hit);
          this.projectiles.splice(i, 1);
        }
      }
    }

    // --- ENEMY CONTACT DAMAGE ---
    this.enemies.forEach(e => {
      e.update(this.player, this.projectiles, this.enemies);

      const contactDist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (contactDist < e.coreRadius + this.player.coreRadius) {
        // Push apart
        const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        this.player.vx += Math.cos(angle) * 3;
        this.player.vy += Math.sin(angle) * 3;

        // Contact damage — chargers hit harder, spikes do extra
        let contactDmg = e.archetype === 'charger' && e.armed('spike') ? 20 : 8;
        if (e.isBoss) contactDmg = 35;
        this.playerTakeDamage(contactDmg, 'contact');
      }
    });

    // --- SPRING PHYSICS ---
    this.player.nodes.forEach(node => {
      if (node.type !== 'core') {
        node.updateSpring(this.player.vx, this.player.vy, this.player.angle);
      }
    });

    this.regrowParts(this.player);

    // --- MASS DROP COLLECTION & EVOLUTION ---
    const levelUp = progression.updateDrops(this.player.x, this.player.y, this.player.coreRadius);
    if (levelUp) {
      this.recalculatePlayerStats();
      this.player.hp = this.player.maxHp; // Full heal on level up
      this.repairNodes(this.player);
      particleSystem.spawnBubbleBurst(this.player.x, this.player.y, this.player.color, 24);
    }

    // --- CAMERA ---
    /* Ease zoom BEFORE centring, or the camera chases a target computed from
       last frame's zoom and the view slides while zooming. */
    if (typeof movementFeel !== 'undefined' && movementFeel && movementFeel.zoom) {
      this.camera.targetZoom = movementFeel.zoom;
    }
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;
    const z = this.camera.zoom;
    this.camera.targetX = this.player.x - (this.viewportWidth / z) / 2;
    this.camera.targetY = this.player.y - (this.viewportHeight / z) / 2;
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

    this.shake = (this.shake || 0) * 0.86;
    if (this.shake < 0.2) this.shake = 0;

    particleSystem.update();
    fluidShader.update();

    // --- HUD UPDATE (throttled) ---
    /* ⚠ `frameCount` resets every second, so `% 4` on it gave an uneven cadence.
       A separate monotonic tick: HUD every 6th frame. */
    this._hudTick = (this._hudTick || 0) + 1;
    if (this._hudTick % 6 === 0) {
      this.updateHUD();
      this.drawMiniRadar();
    }
  }

  addShake(a) {
    this.shake = Math.min(JUICE.shakeMax, (this.shake || 0) + a * JUICE.shake);
  }

  /* ⭐ B3 — ONE HIT RESOLVER FOR EVERY SHIP. Same `nodes[]` for player and enemy.
     Outer parts are tested first, so they shield the core; returns the node hit,
     `true` for the core, or null. Lost parts are not there to hit. */
  shipHit(ship, p) {
    const c = Math.cos(ship.angle || 0), s = Math.sin(ship.angle || 0);
    let core = false;
    for (const n of ship.nodes || []) {
      if (n.lost) continue;
      const dx = n.currentDx || 0, dy = n.currentDy || 0;
      const wx = ship.x + dx * c - dy * s, wy = ship.y + dx * s + dy * c;
      if (!p.hits(wx, wy, n.radius)) continue;
      if (n.type === 'core') core = true; else return n;
    }
    return (core || p.hits(ship.x, ship.y, ship.coreRadius)) ? true : null;
  }

  damageNode(ship, node, amount) {
    if (node.partMax === undefined) node.partMax = node.partHp = Math.max(8, node.radius * JUICE.nodeHpPerRadius) * (ship === this.player ? this.coreMod('parts') : 1);
    node._hitAt = performance.now();
    if (ship === this.player) {
      ship._partHitAt = node._hitAt;
      /* ⛔ THE LAST GUN HOLDS. Stripping every gun left the player with no way
         to fight back (Mac, 2026-10-23: "destructable weapons is to much i had
         no way to defend myself"). Your final working cannon bottoms out at
         1 hp instead of coming off. Enemies can still be stripped bare. */
      if (node.type === 'cannon' && node.partHp - amount <= 0 &&
          !ship.nodes.some(n => n !== node && n.type === 'cannon' && !n.lost)) {
        node.partHp = 1;
        return;
      }
    }
    node.partHp -= amount;
    if (node.partHp <= 0) this.loseNode(ship, node);
  }

  /* Lost parts grow back in the field: one every 4 s once no part has been hit
     for 2.5 s, guns first. A stripped hull recovers by breaking contact, not
     only by dying or levelling up. */
  regrowParts(P) {
    const now = performance.now();
    if (now - (P._partHitAt || 0) < 2500 || now - (P._regrowAt || 0) < 4000) return;
    const lost = (P.nodes || []).filter(n => n.lost);
    if (!lost.length) return;
    const n = lost.find(m => m.type === 'cannon') || lost[0];
    n.lost = false;
    if (n.partMax !== undefined) n.partHp = n.partMax;
    P._regrowAt = now;
    const c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0);
    particleSystem.spawnBubbleBurst(P.x + (n.currentDx || 0) * c - (n.currentDy || 0) * s,
      P.y + (n.currentDx || 0) * s + (n.currentDy || 0) * c, '#39ff14', 8);
    soundEngine.playBubblePop('small');
  }

  /* A lost part is FLAGGED, never spliced: applyDesign, saves and the hardpoint
     signature all still see the same array. hardpoints drops it from
     readyMounts(); the membrane and sprites skip drawing it. */
  loseNode(ship, node) {
    node.lost = true;
    const c = Math.cos(ship.angle || 0), s = Math.sin(ship.angle || 0);
    const wx = ship.x + (node.currentDx || 0) * c - (node.currentDy || 0) * s;
    const wy = ship.y + (node.currentDx || 0) * s + (node.currentDy || 0) * c;
    particleSystem.spawnBubbleBurst(wx, wy, '#c9a25c', 10);
    soundEngine.playBubblePop('large');
    if (ship === this.player) {
      this.addShake(6);
    } else {
      this.addShake(2);
      progression.spawnSalvage(wx, wy, { part: { type: node.type, radius: node.radius } });
    }
  }

  coreMod(stat) {
    return (typeof saveState !== 'undefined' && saveState.coreMod) ? saveState.coreMod(stat) : 1;
  }

  /* B4: the AI-core choice. Two random cores, pick one (or keep yours). The sim
     pauses while the card is up; the card is DOM, so it works on touch. */
  offerAiCore() {
    if (document.getElementById('core-offer') || typeof AI_CORES === 'undefined') return;
    const ids = Object.keys(AI_CORES).filter(id => id !== saveState.doc.aiCore).sort(() => Math.random() - 0.5).slice(0, 2);
    const box = document.createElement('div');
    box.id = 'core-offer';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'AI core found');
    const cur = saveState.doc.aiCore ? AI_CORES[saveState.doc.aiCore].name : 'none';
    box.innerHTML = `<h3>AI CORE RECOVERED</h3><p class="core-cur">Fitted: ${cur}</p>`;
    const close = () => { box.remove(); this.paused = false; };
    for (const id of ids) {
      const c = AI_CORES[id], b = document.createElement('button');
      b.className = 'core-pick';
      b.innerHTML = `<strong>${c.name}</strong><span class="up">${c.up}</span><span class="down">${c.down}</span><em>${c.lore}</em>`;
      b.onclick = () => {
        saveState.setAiCore(id);
        this.recalculatePlayerStats();
        if (window.garage) garage.banner(`${c.name} fitted`, 'good');
        close();
      };
      box.append(b);
    }
    const keep = document.createElement('button');
    keep.className = 'core-keep'; keep.textContent = 'Keep current';
    keep.onclick = close;
    box.append(keep);
    document.body.append(box);
    this.paused = true;
    box.querySelector('button').focus();
  }

  repairNodes(ship) {
    for (const n of ship.nodes || []) { n.lost = false; if (n.partMax !== undefined) n.partHp = n.partMax; }
  }

  /* Share of a part type still attached, floored at half: a ship that lost its
     thrusters limps, it does not stop. */
  partScale(ship, type) {
    let total = 0, alive = 0;
    for (const n of ship.nodes || []) if (n.type === type) { total++; if (!n.lost) alive++; }
    return total ? 0.5 + 0.5 * alive / total : 1;
  }

  /* ⭐ B3 MULTIPLAYER PREP (§6): ONE INPUT STRUCT PER SHIP. The local player's
     keys, stick and pointer compose into `this.input`; the flight code reads
     only that. A remote ship later fills the same shape from the network. */
  readInput() {
    let ax = 0, ay = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) ay -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) ay += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) ax -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) ax += 1;
    if (ax !== 0 && ay !== 0) { ax *= 0.7071; ay *= 0.7071; }
    if (this.touch.moveId !== null) {
      ax += this.touch.moveVector.x;
      ay += this.touch.moveVector.y;
    }
    const inp = this.input || (this.input = {});
    inp.ax = ax; inp.ay = ay;
    inp.aimX = this.mouse.x / this.camera.zoom + this.camera.x;
    inp.aimY = this.mouse.y / this.camera.zoom + this.camera.y;
    inp.fire = !!this.mouse.down;
    return inp;
  }

  /* ⭐ THE SHIP IS ITS OWN HUD (GAME_VISION; PLAN_WEEKEND_BLITZ B1).
     Membrane ring = structure (HP), drawn around the hull's real extent;
     brass arc outside it = EVO. Cracks + flickers under 30%, flashes on hit.
     EVO % is read from the one place updateHUD already writes it. */
  drawShipRing(sx, sy) {
    const p = this.player, ctx = this.ctx, now = performance.now();
    let R = p.coreRadius * 1.6;
    if (p.nodes) for (const n of p.nodes) if (!n.lost) R = Math.max(R, Math.hypot(n.targetDx ?? n.dx ?? 0, n.targetDy ?? n.dy ?? 0) + (n.radius || 0));
    R += 14;
    const hp = Math.max(0, Math.min(1, p.hp / p.maxHp));
    const low = hp < 0.3;
    const hit = p._hitAt ? Math.max(0, 1 - (now - p._hitAt) / 260) : 0;
    const col = hp > 0.6 ? '0,243,200' : (hp > 0.3 ? '255,183,3' : '255,51,102');
    const a0 = -Math.PI / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke();
    const flick = low ? (0.55 + 0.45 * Math.abs(Math.sin(now * 0.012))) : 0.9;
    ctx.strokeStyle = `rgba(${col},${Math.min(1, flick + hit)})`;
    ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 8 + hit * 16;
    if (low) ctx.setLineDash([R * 0.22, R * 0.06]);
    ctx.beginPath(); ctx.arc(sx, sy, R, a0, a0 + Math.PI * 2 * hp); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    if (!this._evoEl) this._evoEl = document.getElementById('hud-evo-fill');
    const evo = this._evoEl ? Math.max(0, Math.min(1, (parseFloat(this._evoEl.style.width) || 0) / 100)) : 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(201,162,92,0.22)';
    ctx.beginPath(); ctx.arc(sx, sy, R + 7, a0, a0 + Math.PI * 2); ctx.stroke();
    if (evo > 0) {
      ctx.strokeStyle = 'rgba(232,196,120,0.95)';
      ctx.beginPath(); ctx.arc(sx, sy, R + 7, a0, a0 + Math.PI * 2 * evo); ctx.stroke();
    }
    ctx.restore();
  }

  killEnemy(index) {
    const e = this.enemies[index];
    soundEngine.playImpact ? soundEngine.playImpact('explosion', e) : soundEngine.playBubblePop('large');
    particleSystem.spawnBubbleBurst(e.x, e.y, e.color, 18);
    particleSystem.particles.push(new Particle(e.x, e.y, { vx: 1e-4, vy: 1e-4, type: 'ring',
      radius: e.coreRadius, maxRadius: e.coreRadius * 3.5, color: '#ffffff', decay: 0.05 }));
    this.addShake(e.isBoss ? JUICE.shakeMax : JUICE.killShake);
    /* Hit-stop is a PUNCH, not a strobe. B7 made kills arrive in chains and
       swarms; a 55 ms freeze on every one froze the game repeatedly (Mac,
       2026-10-23: "its freezing repeatedly"). One stop per 450 ms; bosses always. */
    const stopNow = performance.now();
    if (e.isBoss || !(stopNow - (this._lastHitStop || 0) < 450)) {
      /* A BUDGET, not a deadline. A deadline compared perf.now() against the rAF
         stamp; if those clocks ever disagree the sim holds forever (Mac, 2026-10-23:
         "100% crashing upon the first enemy dying", screen frozen). The budget
         drains on the loop's own clock and can never outlive 200 ms. */
      this._hitStopMs = Math.min(200, Math.max(this._hitStopMs || 0, JUICE.hitStopMs * (e.isBoss ? 3 : 1)));
      this._lastHitStop = stopNow;
    }
    progression.spawnDropsFromEnemy(e);
    /* B4: wrecks pay in shapes. One surviving part may come loose; bosses and
       heavies can drop an AI core. */
    const parts = e.nodes.filter(n => n.type !== 'core' && !n.lost);
    if (parts.length && (e.isBoss || Math.random() < 0.35)) {
      const n = parts[Math.floor(Math.random() * parts.length)];
      progression.spawnSalvage(e.x + 20, e.y, { part: { type: n.type, radius: n.radius } });
    }
    if (e.isBoss || (e.tier >= 3 && Math.random() < 0.08)) progression.spawnSalvage(e.x - 20, e.y, { core: true });

    /* ⚠ BOSS RELIC GRANT — the only path that actually awards relics.
       Previously this just spliced and dropped mass like a mote. */
    const bossIdentifier = e.name || e.bossType;
    if (e.isBoss && bossIdentifier && typeof saveState !== 'undefined') {
      const result = saveState.defeatBoss(bossIdentifier);
      if (result && window.garage) {
        garage.showReward(
          'GUARDIAN FELLED',
          result.bossName,
          result.lines
        );
        garage.banner(`${result.bossName} defeated!`, 'good');
      }
    }

    this.enemies.splice(index, 1);
  }

  updateHUD() {
    const evo = progression.getEvolutionData();
    const next = progression.getNextThreshold();

    // HP bar
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    const hpBar = document.getElementById('hud-hp-fill');
    if (hpBar) {
      hpBar.style.width = `${hpPct * 100}%`;
      hpBar.style.background = hpPct > 0.5 ? '#39ff14' : (hpPct > 0.25 ? '#ffb703' : '#ff3366');
    }

    const hpText = document.getElementById('hud-hp-text');
    if (hpText) hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    // Mass & Evolution & GP
    const totalGP = progression.getTotalGP();
    const massEl = document.getElementById('hud-mass-count');
    if (massEl) massEl.textContent = `${progression.totalMass} Mass (${totalGP} GP)`;

    const evoEl = document.getElementById('hud-evo-title');
    if (evoEl) evoEl.textContent = `Lv.${evo.level} ${evo.title}`;

    const evoBar = document.getElementById('hud-evo-fill');
    if (evoBar && next) {
      const prevMass = evo.mass;
      const pct = Math.min(1, (progression.totalMass - prevMass) / (next.mass - prevMass));
      evoBar.style.width = `${pct * 100}%`;
    } else if (evoBar) {
      evoBar.style.width = '100%';
    }

    // Weapon & FPS
    const weapEl = document.getElementById('hud-weapon-name');
    if (weapEl) weapEl.textContent = (WEAPON_TYPES[this.player.primaryWeapon] || WEAPON_TYPES.spitter).title;

    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) fpsEl.textContent = `${this.fps}`;
  }

  drawMiniRadar() {
    if (!this.radarCtx) return;
    const rCtx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const center = w / 2;
    const radarRadius = center - 4;
    const chamber = worldMap.getCurrentChamber();

    rCtx.clearRect(0, 0, w, h);

    // Radar Background
    rCtx.beginPath();
    rCtx.arc(center, center, radarRadius, 0, Math.PI * 2);
    rCtx.fillStyle = 'rgba(6, 12, 24, 0.9)';
    rCtx.fill();
    rCtx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
    rCtx.lineWidth = 1.5;
    rCtx.stroke();

    // Crosshairs
    rCtx.beginPath();
    rCtx.moveTo(center, 4);
    rCtx.lineTo(center, h - 4);
    rCtx.moveTo(4, center);
    rCtx.lineTo(w - 4, center);
    rCtx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
    rCtx.lineWidth = 1;
    rCtx.stroke();

    const scale = (radarRadius - 6) / chamber.radius;

    // Draw Mass Drops on Radar
    progression.bubbleDrops.forEach(d => {
      const rx = center + (d.x) * scale;
      const ry = center + (d.y) * scale;
      rCtx.beginPath();
      rCtx.arc(rx, ry, 1.5, 0, Math.PI * 2);
      rCtx.fillStyle = '#ffb703';
      rCtx.fill();
    });

    // Draw Enemies on Radar
    this.enemies.forEach(e => {
      const rx = center + (e.x) * scale;
      const ry = center + (e.y) * scale;
      rCtx.beginPath();
      rCtx.arc(rx, ry, e.isBoss ? 4 : 2.5, 0, Math.PI * 2);
      rCtx.fillStyle = e.isBoss ? '#ff3366' : '#bc13fe';
      rCtx.fill();
    });

    // Draw Player on Radar
    const px = center + (this.player.x) * scale;
    const py = center + (this.player.y) * scale;

    rCtx.save();
    rCtx.translate(px, py);
    rCtx.rotate(this.player.angle);

    rCtx.beginPath();
    rCtx.moveTo(4, 0);
    rCtx.lineTo(-3, -3);
    rCtx.lineTo(-1, 0);
    rCtx.lineTo(-3, 3);
    rCtx.closePath();
    rCtx.fillStyle = '#00f3ff';
    rCtx.fill();
    rCtx.restore();
  }

  render() {
    this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    /* ---- WORLD PASS: everything below is drawn in world scale ---- */
    this.ctx.save();
    if (this.shake) this.ctx.translate((Math.random() - 0.5) * 2 * this.shake, (Math.random() - 0.5) * 2 * this.shake);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    /* ⚠ THE OCEAN FIRST. drawParallaxOcean opens with an opaque ground fill, so
       anything drawn before it (membrane, every sectors.js landmark, the Grave
       Choir cathedral) was painted over and never seen. Found 2026-10-23 (B5). */
    fluidShader.drawParallaxOcean(this.ctx, this.camera);
    if (fluidShader.drawBlackSun) fluidShader.drawBlackSun(this.ctx, this.camera);
    worldMap.drawChamberMembrane(this.ctx, this.camera);
    particleSystem.drawAmbient(this.ctx, this.camera);

    // Mass drops
    progression.drawDrops(this.ctx, this.camera);

    this.bioMines.forEach(m => m.draw(this.ctx, this.camera));
    this.enemies.forEach(e => e.draw(this.ctx, this.camera));
    this.projectiles.forEach(p => p.draw(this.ctx, this.camera));
    this.drones.forEach(d => d.draw(this.ctx, this.camera));

    // Player rendering
    if (!this.player.dead) {
      const screenPlayerX = this.player.x - this.camera.x;
      const screenPlayerY = this.player.y - this.camera.y;

      // Shield visual dome
      if (this.player.shieldHp > 0) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(screenPlayerX, screenPlayerY, this.player.coreRadius * 2.2, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 243, 255, ${0.3 + Math.sin(performance.now() * 0.008) * 0.15})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 18;
        this.ctx.stroke();
        this.ctx.restore();
      }

      this.drawShipRing(screenPlayerX, screenPlayerY);

      // Blink during iFrames
      const visible = this.player.iFrames === 0 || Math.floor(this.player.iFrames / 3) % 2 === 0;
      if (visible) {
        fluidShader.drawOrganismMembrane(
          this.ctx,
          screenPlayerX, screenPlayerY,
          this.player.angle,
          this.player.coreRadius,
          this.player.nodes,
          this.player.color,
          /* Transient state an art pack can key layers off: muzzle glow while
             firing, exhaust plume while under thrust. Enemies and the garage
             preview pass nothing, so their conditional layers stay hidden —
             which is correct: a parked ship should not be flaring. */
          {
            firing: this.mouse.down && this.player.shootTimer > 0,
            thrusting: Math.abs(this.player.vx) + Math.abs(this.player.vy) > 0.6,
          }
        );
      }
    }

    particleSystem.draw(this.ctx, this.camera);

    /* ---- END WORLD PASS. Everything below is screen space. ---- */
    this.ctx.restore();

    // Sight lighting — evolution expands sight radius
    const evo = progression.getEvolutionData();
    const sightRadius = (400 + evo.sightBonus) * this.coreMod('sight');
    /* ⚠ The lighting canvas is NOT inside the world transform, so the player's
       position and the sight radius must both be converted to screen pixels or
       the light sits off-centre and the wrong size the moment zoom leaves 1.0. */
    const lightScale = this.lightingCanvas.width / this.viewportWidth;
    fluidShader.drawLightingShader(
      this.lightingCtx,
      (this.player.x - this.camera.x) * this.camera.zoom * lightScale,
      (this.player.y - this.camera.y) * this.camera.zoom * lightScale,
      sightRadius * this.camera.zoom * lightScale,
      lightScale
    );

    // Damage flash overlay
    if (this.damageFlash > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 20, 60, ${this.damageFlash * 0.04})`;
      this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
      this.ctx.restore();
    }

    // Death screen overlay
    if (this.player.dead) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(4, 2, 8, 0.7)';
      this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

      this.ctx.fillStyle = '#ff3366';
      this.ctx.font = '700 48px "Space Grotesk", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#ff3366';
      this.ctx.shadowBlur = 30;
      this.ctx.fillText('MEMBRANE RUPTURED', this.viewportWidth / 2, this.viewportHeight / 2 - 30);

      this.ctx.fillStyle = '#8b9eb7';
      this.ctx.font = '400 18px "Outfit", sans-serif';
      this.ctx.shadowBlur = 0;
      const secs = Math.ceil(this.player.respawnTimer / 60);
      this.ctx.fillText(`Respawning in ${secs}s  ·  Your lost mass waits in your wreck`, this.viewportWidth / 2, this.viewportHeight / 2 + 20);
      this.ctx.restore();
    }
  }

  stepFrame(stamp) {
    const stepMs = 1000 / 60;
    const elapsed = this._lastStamp === null ? 0 : Math.max(0, stamp - this._lastStamp);
    this._lastStamp = stamp;
    const paused = this.paused || this.mapOpen || document.hidden;

    if (paused !== this._clockPaused) this._needsRender = true;
    if (paused) {
      this._accumulator = 0;
      this._clockPaused = true;
      if (this._needsRender && !document.hidden) {
        this.render();
        this._needsRender = false;
      }
      return;
    }

    if (this._clockPaused) {
      this.frameCount = 0;
      this.fpsTimer = stamp;
      this._clockPaused = false;
    }
    // Preserve the existing 60-tick movement, weapons, springs and reactor
    // tuning. Presentation frequency no longer sets the speed of combat.
    const acceptedMs = Math.min(elapsed, 100);
    this._droppedSimulationMs += elapsed - acceptedMs;
    this._accumulator += acceptedMs;
    /* B2 hit-stop: kills only. The sim holds; the frame still renders. */
    const frozen = this._hitStopMs > 0;
    if (frozen) { this._accumulator = 0; this._hitStopMs = Math.max(0, this._hitStopMs - Math.max(elapsed, stepMs)); }
    let steps = 0;
    while (!frozen && this._accumulator + 1e-7 >= stepMs && steps < 5) {
      this.update(stepMs / 1000);
      this._simulationTicks++;
      this._accumulator = Math.max(0, this._accumulator - stepMs);
      steps++;
      if (this.paused || this.mapOpen) {
        this._accumulator = 0;
        break;
      }
    }
    // Bound catch-up after a stall instead of entering an update spiral.
    if (this._accumulator + 1e-7 >= stepMs) {
      const dropped = Math.floor((this._accumulator + 1e-7) / stepMs) * stepMs;
      this._droppedSimulationMs += dropped;
      this._accumulator = Math.max(0, this._accumulator - dropped);
    }
    if (steps || this._needsRender || frozen) {
      this.render();
      this._needsRender = false;
      this.frameCount++;
      const windowMs = stamp - this.fpsTimer;
      if (windowMs >= 1000) {
        this.fps = Math.round(this.frameCount * 1000 / windowMs);
        this.frameCount = 0;
        this.fpsTimer = stamp;
      }
    }
  }

  reportFault(err) {
    const msg = (err && err.message) || String(err);
    const where = ((err && err.stack) || '').split('\n').find(l => /\.js/.test(l)) || '';
    this._faults = this._faults || {};
    if (this._faults[msg]) return;
    this._faults[msg] = true;
    console.error('[engine fault]', err);
    let el = document.getElementById('engine-fault');
    if (!el) {
      el = document.createElement('div'); el.id = 'engine-fault';
      el.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;max-width:90vw;padding:6px 12px;background:rgba(40,0,10,.92);border:1px solid #ff3366;color:#ffd0d8;font:12px monospace;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = 'ENGINE FAULT (game kept running): ' + msg + '  ' + where.trim().slice(0, 120);
    clearTimeout(this._faultT); this._faultT = setTimeout(() => el.remove(), 15000);
  }

  start() {
    /* The next frame is booked BEFORE this one runs: one thrown error in any
       seam used to stop the loop and freeze the screen on its last frame. Now
       the game keeps running and the fault is shown so it can be fixed. */
    const loop = stamp => {
      requestAnimationFrame(loop);
      /* optional frame cap (settings): skip display frames, keep the phase so 60 on 120 Hz stays even */
      if (this.fpsCap > 0) {
        const step = 1000 / this.fpsCap, gap = stamp - (this._capAt || 0);
        if (gap < step - 1) return;
        this._capAt = gap > step * 2 ? stamp : this._capAt + step;
      }
      try { this.stepFrame(stamp); } catch (err) { this.reportFault(err); }
    };
    requestAnimationFrame(loop);
  }
}

const engine = new EngineCore();
engine.start();
