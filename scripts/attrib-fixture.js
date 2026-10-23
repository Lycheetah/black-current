  const fixture = () => {
    engine.paused = false;
    engine.mapOpen = false;
    for (const id of ['title-overlay', 'mission-card', 'reward-card']) {
      const element = document.getElementById(id);
      if (element) element.style.display = 'none';
    }
    const nodes = [{ dx: 0, dy: 0, radius: 40, type: 'core' }];
    const add = (dx, dy, radius, type) => {
      nodes.push({ dx, dy, radius, type });
      if (dy) nodes.push({ dx, dy: -dy, radius, type });
    };
    for (let i = 0; i < 4; i++) add(60 + i * 38, 46 + i * 6, 16 + i * 4, 'cannon');
    for (let i = 0; i < 3; i++) add(-20 - i * 34, 58 + i * 8, 20, 'pod');
    for (let i = 0; i < 2; i++) add(10 - i * 46, 100, 22, 'shield');
    for (let i = 0; i < 2; i++) add(-120, 24 + i * 40, 14, 'thruster');
    add(150, 0, 30, 'cannon'); add(-150, 0, 18, 'thruster'); add(100, 0, 24, 'cannon');
    engine.applyDesign({ nodes, color: '#00f3ff', primaryWeapon: 'spitter', secAbility: 'shield' });
    Object.assign(engine.player, { x: 0, y: 0, vx: 0, vy: 0, dead: false, iFrames: 0, shootTimer: 0 });
    // Invulnerability must not use iFrames: its blink can remove the capital
    // from the very render workload being measured.
    engine.playerTakeDamage = () => {};
    Object.assign(engine.camera, { zoom: 0.5, targetZoom: 0.5,
      x: -engine.viewportWidth, y: -engine.viewportHeight,
      targetX: -engine.viewportWidth, targetY: -engine.viewportHeight });
    movementFeel.zoom = 0.5;
    engine.keys = {};
    engine.mouse = { x: 1000, y: 384, down: true };
    engine.projectiles = [];
    engine.bioMines = [];
    engine.enemies = [];
    progression.bubbleDrops = [];
    reactor.mode = 'dormant'; reactor.charge = 100; reactor.lockout = 0;
    particleSystem.particles = [];
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI * 2 / 24;
      const distance = 300 + (i % 4) * 100;
      const enemy = new EnemyOrganism(Math.cos(angle) * distance, Math.sin(angle) * distance,
        { tier: 3, archetype: ['mote', 'stalker', 'charger', 'sniper', 'hive'][i % 5] });
      enemy.hp = enemy.maxHp = 100000;
      engine.enemies.push(enemy);
    }
    engine.updateHUD();
    engine.drawMiniRadar();
    hardpoints.sync(engine.player);
    fleet._paint();
    return { nodes: nodes.length, enemies: engine.enemies.length, zoom: engine.camera.zoom };
  };
