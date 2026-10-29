/* ==========================================================================
   F4 · HUBS + BUILDING. GAME_VISION: Sovereign Hubs ("dock, repair, every hub
   is a market") and THE LOOP. Mac, 2026-10-23: "maybe we add building".
   ==========================================================================
     METAL     the spending currency. MASS stays growth (evolution reads it),
               so spending never levels you down. Earned by kills (tier-scaled),
               outposts, bosses, drills, and selling salvage at a dock.
     DOCK  E   at any hub's anchorage or your own Forward Dock: repair, sell
               salvage, buy part blueprints, open the Shipyard. The sim pauses.
     BUILD X   plant a structure where you are. A STATION IS A SHIP WITH NO
               THRUSTERS: each one is a nodes[] hull drawn by the one renderer
               (hull skin and all). Law 3 holds: no second format.
                 FORWARD DOCK  your own hub: dock + respawn point, out deep
                 SALVAGE DRILL metal + the odd part while you are in its system
                 GUN PLATFORM  shoots hostiles near it
                 JUMP BEACON   a two-way gate between its system and home
     RAIDS     while you are in a system with your structures, pirates come for
               them. Structures are never touched while you are away: no
               offline loss, no guilt loop (README Law 8).
   Save: `saveState.doc.metal`, `saveState.doc.structures[]`.
   Dials: `hubs.COST`, `hubs.CFG`.
   ========================================================================== */
(() => {
  const TAU = Math.PI * 2;
  const CFG = { dockRange: 320, raidEvery: [9000, 14400], drillEvery: 720, gunEvery: 34, gunRange: 720, maxStructures: 14, maxDocks: 3, maxBeacons: 3, maxGates: 6, spacing: 520 };
  const KINDS = {
    dock:   { name: 'FORWARD DOCK', cost: 360, parts: 3, hp: 900, color: '#c9a25c', line: 'Your own hub out here: dock, repair, trade, and wake here if you fall nearby.',
              nodes: [{ dx: 0, dy: 0, radius: 44, type: 'core' }, ...Array.from({ length: 6 }, (_, i) => ({ dx: Math.cos(i * TAU / 6) * 70, dy: Math.sin(i * TAU / 6) * 70, radius: 18, type: 'pod' }))] },
    drill:  { name: 'SALVAGE DRILL', cost: 160, parts: 1, hp: 380, color: '#ff8c42', line: 'Pulls metal while you are in this system (more in deep water), and the odd part.',
              nodes: [{ dx: 0, dy: 0, radius: 28, type: 'core' }, { dx: 44, dy: 0, radius: 14, type: 'spike' }, { dx: -22, dy: 38, radius: 14, type: 'spike' }, { dx: -22, dy: -38, radius: 14, type: 'spike' }, { dx: -30, dy: 0, radius: 16, type: 'pod' }] },
    gun:    { name: 'GUN PLATFORM', cost: 220, parts: 2, hp: 520, color: '#5ef2e0', line: 'Shoots hostiles that come near it. Raiders go for it first.',
              nodes: [{ dx: 0, dy: 0, radius: 24, type: 'core' }, ...Array.from({ length: 4 }, (_, i) => ({ dx: Math.cos(i * TAU / 4) * 40, dy: Math.sin(i * TAU / 4) * 40, radius: 14, type: 'cannon' }))] },
    beacon: { name: 'JUMP BEACON', cost: 300, parts: 2, hp: 420, color: '#bc13fe', line: 'A two-way gate between this system and Asterion Forge.',
              nodes: [{ dx: 0, dy: 0, radius: 22, type: 'core' }, ...Array.from({ length: 4 }, (_, i) => ({ dx: Math.cos(i * TAU / 4 + 0.78) * 38, dy: Math.sin(i * TAU / 4 + 0.78) * 38, radius: 13, type: 'shield' }))] },
    // Overnight run step 10 (Mac: "buildable jump gates"): two gates link, and flying into one crosses to the other,
    // across systems or within one. Linking, jumps and the swirl live in js/jump-gates.js.
    gate:   { name: 'JUMP GATE', cost: 900, parts: 3, hp: 900, color: '#ffd36a', line: 'Build two anywhere and they link: fly in to cross between them. Raiders will try to break it.',
              nodes: [{ dx: 0, dy: 0, radius: 26, type: 'core' }, ...Array.from({ length: 8 }, (_, i) => ({ dx: Math.cos(i * TAU / 8) * 64, dy: Math.sin(i * TAU / 8) * 64, radius: 14, type: i % 2 ? 'shield' : 'pod' }))] },
  };
  // A public service berth in each visited non-hub system; not player property.
  function ensurePublicDock() {
    if(!window.galaxy||!galaxy.data||!galaxy.current||galaxy.current.hub||(typeof graveChoir!=='undefined'&&graveChoir.active))return;
    const id='public-refit-'+galaxy.currentId,list=hubs.list();
    if(list.some(s=>s.id===id))return;
    list.push({id,kind:'dock',sys:galaxy.currentId,gx:0,gy:0,x:0,y:0,hp:KINDS.dock.hp,public:true});
    saveState.save();
  }

  const stationArtPath='art/keyed/structures/refit-station-v1.png',stationArt=new Image();
  stationArt.onload=()=>{if(typeof engine!=='undefined')engine._needsRender=true;};
  stationArt.src=window.__ART?.[stationArtPath]||stationArtPath;
  // Stations grow with the frame you fly (js/room-scale.js), so a titan berths alongside instead of on top.
  const berth=()=>window.roomScale?.stationScale?.()||1;
  function drawStationArt(ctx,x,y){if(!stationArt.complete||!stationArt.naturalWidth)return false;const k=420*berth();ctx.save();ctx.drawImage(stationArt,x-k/2,y-k/2,k,k);ctx.restore();return true;}

  /* blueprints for sale: access to a part shape in the Shipyard, never a stat (Flat Ladder) */
  const MARKET = [
    { type: 'cannon', radius: 10 }, { type: 'cannon', radius: 16 }, { type: 'cannon', radius: 24 }, { type: 'cannon', radius: 32 },
    { type: 'thruster', radius: 14 }, { type: 'thruster', radius: 20 }, { type: 'pod', radius: 18 }, { type: 'pod', radius: 26 },
    { type: 'shield', radius: 16 }, { type: 'spike', radius: 12 },
  ];
  const price = p => 16 + p.radius * 5;
  /* Spares were worth 4-6x the metal of the kills that dropped them (measured 2026-10-24),
     so the hold was the real wallet. Scrap is now a top-up, not the economy. */
  const sellValue = p => 2 + Math.round(p.radius * 0.25);
  const metalFor = e => window.upgradePath?.bountyFor ? upgradePath.bountyFor(e) : e.isBoss ? 120 : e.archetype === 'outpost' ? 36 : (e.tier || 1) * (e.elite ? 3 : 1);

  const $ = id => document.getElementById(id);
  const hubs = window.hubs = {
    CFG, KINDS, MARKET, sellValue, bountyFor:metalFor, stationArt, docked: null, raid: null, raidT: 0,
    get metal() { const n=Number(saveState.doc.metal??0);return Number.isFinite(n)?Math.max(0,Math.round(n)):0; },
    set metal(v) { const n=Number(v);if(Number.isFinite(n))saveState.doc.metal=Math.max(0,Math.round(n)); },
    list() { return saveState.doc.structures || (saveState.doc.structures = []); },
    here() { ensurePublicDock(); const ch = worldMap.getCurrentChamber(), sys = window.galaxy ? galaxy.currentId : 'home';
      return this.list().filter(s => s.sys === sys && s.gx === ch.gridX && s.gy === ch.gridY); },
    inSystem(id) { return this.list().filter(s => s.sys === id); },
    build, canBuild, openDock, closeDock, openBuild, closeBuild, dockNear,
  };

  /* ── the structures' ship bodies (one hull format, one renderer) ──────── */
  const bodies = {};
  for (const [k, def] of Object.entries(KINDS)) bodies[k] = def.nodes.map(n => ({ currentDx: n.dx, currentDy: n.dy, targetDx: n.dx, targetDy: n.dy, radius: n.radius, type: n.type }));

  function canBuild(kind) {
    const def = KINDS[kind], ch = worldMap.getCurrentChamber(), P = engine.player, L = hubs.list().filter(s => !s.public);
    if (!def) return 'Unknown structure.';
    if (typeof graveChoir !== 'undefined' && graveChoir.active) return 'Nothing can be built inside a zone.';
    if (ch.isHaven) return 'This is a hub already. Build out in open water.';
    if (L.length >= CFG.maxStructures) return `You have ${CFG.maxStructures} structures; that is the fleet's limit.`;
    if (kind === 'dock' && L.filter(s => s.kind === 'dock').length >= CFG.maxDocks) return `${CFG.maxDocks} Forward Docks already.`;
    if (kind === 'beacon' && L.filter(s => s.kind === 'beacon').length >= CFG.maxBeacons) return `${CFG.maxBeacons} Jump Beacons already.`;
    if (kind === 'beacon' && (!window.galaxy || galaxy.currentId === 'home')) return 'A beacon links a far system back home; build it away from home.';
    if (kind === 'gate' && L.filter(s => s.kind === 'gate').length >= CFG.maxGates) return `${CFG.maxGates} Jump Gates already.`;
    if (hubs.here().some(s => Math.hypot(s.x - P.x, s.y - P.y) < CFG.spacing)) return 'Too close to another of your structures.';
    if (window.galaxy && galaxy.portalsOf(galaxy.current).some(p => p.gx === ch.gridX && p.gy === ch.gridY && Math.hypot(p.x - P.x, p.y - P.y) < CFG.spacing)) return 'Too close to a jump portal.';
    if (hubs.metal < def.cost) return `Needs ${def.cost} metal (you have ${hubs.metal}).`;
    if (saveState.partCount() < def.parts) return `Needs ${def.parts} salvaged part${def.parts > 1 ? 's' : ''} in the hold.`;
    return null;
  }

  function spendParts(n) {
    const inv = saveState.doc.inventory;
    /* spend from the deepest stacks first, never the last of a shape (that is your blueprint) */
    while (n > 0) {
      const stack = inv.filter(p => p.count > 1).sort((a, b) => b.count - a.count)[0] || inv.filter(p => p.count > 0)[0];
      if (!stack) break;
      stack.count--; n--;
      if (stack.count <= 0) inv.splice(inv.indexOf(stack), 1);
    }
  }

  function build(kind) {
    const why = canBuild(kind);
    if (why) { banner(why, 'warn'); return false; }
    const def = KINDS[kind], ch = worldMap.getCurrentChamber(), P = engine.player;
    const a = P.angle || 0;
    const s = { id: 'st' + Date.now().toString(36) + (Math.random() * 1e4 | 0), kind, sys: window.galaxy ? galaxy.currentId : 'home',
      gx: ch.gridX, gy: ch.gridY, x: Math.round(P.x + Math.cos(a) * 170), y: Math.round(P.y + Math.sin(a) * 170), hp: def.hp, spin: Math.random() * TAU };
    hubs.metal -= def.cost; spendParts(def.parts);
    hubs.list().push(s);
    saveState.save();
    particleSystem.spawnBubbleBurst(s.x, s.y, def.color, 30);
    particleSystem.particles.push(new Particle(s.x, s.y, { vx: 1e-4, vy: 1e-4, type: 'ring', radius: 20, maxRadius: 260, color: def.color, decay: 0.03 }));
    if (typeof soundEngine !== 'undefined') soundEngine.playPhrase([196, 261.63, 392, 523.25], 0.08);
    banner(`${def.name} BUILT`, 'good');
    if (kind === 'beacon' && window.galaxy) worldMap.getCurrentChamber().portals = (worldMap.getCurrentChamber().portals || 0) + 1;
    closeBuild();
    return true;
  }

  function destroy(s, why) {
    if(s.public)return;
    const L = hubs.list(), i = L.indexOf(s);
    if (i < 0) return;
    L.splice(i, 1);
    const def = KINDS[s.kind];
    particleSystem.spawnBubbleBurst(s.x, s.y, def.color, 40);
    engine.addShake(JUICE.shakeMax * 0.6);
    hubs.metal += Math.round(def.cost * 0.25);
    saveState.save();
    banner(`${def.name} ${why || 'DESTROYED'} · ${Math.round(def.cost * 0.25)} metal salvaged`, 'warn');
  }

  /* ── beacons are portals (galaxy.extraPortals) ────────────────────────── */
  function beaconPortals(sysId) {
    const out = [], beacons = hubs.list().filter(s => s.kind === 'beacon');
    if (sysId === 'home') beacons.forEach((b, i) => {
      const a = -Math.PI / 2 + (i - (beacons.length - 1) / 2) * 0.7;
      out.push({ to: b.sys, gx: 0, gy: 0, x: Math.round(Math.cos(a) * 760), y: Math.round(Math.sin(a) * 760), beacon: true });
    });
    for (const b of beacons) if (b.sys === sysId) out.push({ to: 'home', gx: b.gx, gy: b.gy, x: b.x, y: b.y + 150, beacon: true });
    return out;
  }

  /* ── docking ──────────────────────────────────────────────────────────── */
  function dockNear() {
    const ch = worldMap.getCurrentChamber(), P = engine.player;
    if (!ch || P.dead || (typeof graveChoir !== 'undefined' && graveChoir.active)) return null;
    if (ch.isHaven && Math.hypot(P.x, P.y) < (CFG.dockRange + 60) * berth()) {
      const sys = window.galaxy ? galaxy.current : null;
      return { name: !sys || sys.home ? 'ASTERION FORGE' : `${sys.name} ANCHORAGE`, hub: true };
    }
    const d = hubs.here().find(s => s.kind === 'dock' && Math.hypot(s.x - P.x, s.y - P.y) < CFG.dockRange * berth());
    return d ? { name: d.public ? 'PUBLIC REFIT STATION' : 'FORWARD DOCK', dock: d } : null;
  }

  // Modules append their doors to .dock-doors; the station lays them out as service
  // tiles and leaves Undock alone in the footer.
  const DOCK_SERVICES = {
    'Modular shipyard': ['modular', 'Snap hull sections together, fit their slots, pay in metal'],
    'Shipyard': ['shipyard', 'Freeform workshop: place parts, paint, save builds'],
    'Armoury / upgrades': ['armoury', 'Research weapons and raise their marks'],
    'Captain / build': ['captain', 'Your captain, journal and skills'],
    'Choose vow · free': ['vow', 'Swear one vow for this run'],
  };
  const DOCK_ORDER = ['modular', 'shipyard', 'armoury', 'captain', 'vow'];
  function arrangeDock() {
    const doors = document.querySelector('#dock-panel .dock-doors'), tiles = document.querySelector('#dock-panel .dock-services');
    if (!doors || !tiles) return;
    for (const b of [...doors.children]) if (b.id !== 'dock-undock') tiles.append(b);
    for (const b of tiles.children) { const s = DOCK_SERVICES[b.textContent.trim()]; if (s) { b.dataset.service = s[0]; b.dataset.sub = s[1]; } }
    const rank = b => DOCK_ORDER.includes(b.dataset.service) ? DOCK_ORDER.indexOf(b.dataset.service) : 99;
    [...tiles.children].sort((a, b) => rank(a) - rank(b)).forEach(b => tiles.append(b));
  }
  function openDock() {
    const near = dockNear();
    if (!near || engine.paused) return;
    hubs.docked = near;
    engine.paused = true; engine.mouse.down = false;
    /* docking repairs: hull, parts, and a forward dock's own plating */
    engine.recalculatePlayerStats(); engine.player.hp = engine.player.maxHp; engine.repairNodes(engine.player);
    if (near.dock) near.dock.hp = KINDS.dock.hp;
    if (typeof soundEngine !== 'undefined') { soundEngine.playPhrase([392, 523.25, 659.25], 0.09); if (soundEngine.duck) soundEngine.duck(true); }
    paintDock();
    arrangeDock();
    $('dock-panel').style.display = 'flex';
    setTimeout(() => $('dock-undock').focus(), 30);
  }
  function closeDock() {
    if ($('dock-panel').style.display === 'none') return;
    $('dock-panel').style.display = 'none';
    hubs.docked = null;
    if (typeof soundEngine !== 'undefined' && soundEngine.duck) soundEngine.duck(false);
    engine.paused = false;
  }

  function paintDock() {
    const near = hubs.docked; if (!near) return;
    $('dock-title').textContent = near.name;
    $('dock-metal').textContent = `${hubs.metal} metal · ${saveState.partCount()} parts in the hold · hull repaired`;
    const hold = $('dock-hold'); hold.textContent = '';
    const inv = saveState.doc.inventory.slice().sort((a, b) => a.type.localeCompare(b.type) || a.radius - b.radius);
    if (!inv.length) { const p = document.createElement('p'); p.className = 'dock-empty'; p.textContent = 'Your hold is empty. Shoot parts off ships to fill it.'; hold.append(p); }
    for (const it of inv) {
      const row = document.createElement('div'); row.className = 'dock-row';
      const n = document.createElement('span'); n.textContent = `${it.type} · r${it.radius} × ${it.count}`;
      const b = document.createElement('button'); b.type = 'button';
      const spare = it.count - 1;
      b.textContent = spare > 0 ? `Sell ${spare} · +${sellValue(it) * spare}` : 'Blueprint';
      b.disabled = spare <= 0; b.title = spare > 0 ? 'Keeps one as your blueprint' : 'The last one is your blueprint; it stays';
      b.onclick = () => { hubs.metal += sellValue(it) * spare; it.count = 1; saveState.save(); sound('sell'); paintDock(); };
      row.append(n, b); hold.append(row);
    }
    const mk = $('dock-market'); mk.textContent = '';
    for (const it of MARKET) {
      const owned = saveState.doc.inventory.some(p => p.type === it.type && p.radius === it.radius && !p.quirk);
      const row = document.createElement('div'); row.className = 'dock-row';
      const n = document.createElement('span'); n.textContent = `${it.type} · r${it.radius}`;
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = owned ? 'Owned' : `Buy · ${price(it)}`;
      b.disabled = owned || hubs.metal < price(it);
      b.onclick = () => {
        if (hubs.metal < price(it) || saveState.doc.inventory.some(p => p.type === it.type && p.radius === it.radius && !p.quirk)) return;
        hubs.metal -= price(it); saveState.addPart(it); sound('buy'); paintDock();
      };
      row.append(n, b); mk.append(row);
    }
  }

  /* ── build menu ───────────────────────────────────────────────────────── */
  function openBuild() {
    if (engine.paused || engine.player.dead || !saveState.doc.launched) return;
    engine.paused = true; engine.mouse.down = false;
    paintBuild();
    $('build-panel').style.display = 'flex';
    setTimeout(() => $('build-close').focus(), 30);
  }
  function closeBuild() {
    if ($('build-panel').style.display === 'none') return;
    $('build-panel').style.display = 'none';
    engine.paused = false;
  }
  function paintBuild() {
    $('build-metal').textContent = `${hubs.metal} metal · ${saveState.partCount()} parts · ${hubs.list().filter(s => !s.public).length} / ${CFG.maxStructures} owned structures`;
    const box = $('build-list'); box.textContent = '';
    for (const [k, def] of Object.entries(KINDS)) {
      const why = canBuild(k);
      const card = document.createElement('div'); card.className = 'build-card';
      card.style.setProperty('--bc', def.color);
      const cv = document.createElement('canvas'); cv.width = cv.height = 120; cv.className = 'build-pic';
      const c = cv.getContext('2d'); c.translate(60, 60); c.scale(0.62, 0.62);
      fluidShader.drawOrganismMembrane(c, 0, 0, 0, def.nodes[0].radius, bodies[k], def.color, {});
      const t = document.createElement('div'); t.className = 'build-text';
      const h = document.createElement('strong'); h.textContent = def.name;
      const l = document.createElement('p'); l.textContent = def.line;
      const c2 = document.createElement('em'); c2.textContent = `${def.cost} metal · ${def.parts} part${def.parts > 1 ? 's' : ''}`;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = why ? 'Can\'t build' : 'Build here';
      b.disabled = !!why; b.title = why || '';
      b.onclick = () => build(k);
      t.append(h, l, c2);
      if (why) { const w = document.createElement('small'); w.textContent = why; t.append(w); }
      t.append(b);
      card.append(cv, t); box.append(card);
    }
  }

  /* ── per tick: prompts, drills, guns, raids ───────────────────────────── */
  let T = 0;
  function tick() {
    T++;
    const P = engine.player;
    const near = !P.dead ? dockNear() : null;
    const prompt = $('dock-prompt');
    if (near) { prompt.textContent = `DOCK · ${near.name} · E`; prompt.classList.add('on'); } else prompt.classList.remove('on');
    if (P.dead) return;
    const sysId = window.galaxy ? galaxy.currentId : 'home', ch = worldMap.getCurrentChamber();
    const mine = hubs.inSystem(sysId);
    if (!mine.length) return;
    /* drills pay while you are anywhere in their system */
    if (T % CFG.drillEvery === 0) for (const s of mine) if (s.kind === 'drill') {
      const d = window.galaxy ? galaxy.current.danger || 1 : 1, gain = 6 + d * 3;
      hubs.metal += gain;
      if (s.gx === ch.gridX && s.gy === ch.gridY) {
        floatText(s.x, s.y - 60, `+${gain} metal`);
        if (Math.random() < 0.18) progression.spawnSalvage(s.x + 60, s.y, { part: { type: ['cannon', 'pod', 'thruster', 'shield'][Math.random() * 4 | 0], radius: 10 + (Math.random() * 14 | 0) } });
      }
    }
    const here = mine.filter(s => s.gx === ch.gridX && s.gy === ch.gridY);
    /* guns: nearest hostile in range */
    if (T % CFG.gunEvery === 0) for (const s of here) if (s.kind === 'gun') {
      let best = null, bd = CFG.gunRange;
      for (const e of engine.enemies) { const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < bd) { bd = d; best = e; } }
      if (!best) continue;
      const a = Math.atan2(best.y - s.y, best.x - s.x), spd = typeof weaponSpeed === 'function' ? weaponSpeed('spitter') : 22;
      s.aim = a;
      engine.projectiles.push(new Projectile(s.x + Math.cos(a) * 50, s.y + Math.sin(a) * 50, Math.cos(a) * spd, Math.sin(a) * spd,
        { color: '#5ef2e0', damage: 14, radius: 6, isPlayer: true, type: 'spitter' }));
    }
    /* hostile shots and rams hit structures */
    for (let i = engine.projectiles.length - 1; i >= 0; i--) {
      const p = engine.projectiles[i]; if (p.isPlayer) continue;
      for (const s of here) if (!s.public && Math.hypot(p.x - s.x, p.y - s.y) < 62) {
        s.hp -= p.damage; s._hitAt = performance.now(); engine.projectiles.splice(i, 1);
        if (s.hp <= 0) destroy(s);
        break;
      }
    }
    for (const s of here) {
      if (s.hp < KINDS[s.kind].hp && (!hubs.raid || !hubs.raid.some(e => engine.enemies.includes(e)))) s.hp = Math.min(KINDS[s.kind].hp, s.hp + 0.25);
    }
    /* raids: only on structures in your sector, only while you are here */
    if (hubs.raid) {
      if (!hubs.raid.some(e => engine.enemies.includes(e))) { hubs.raid = null; banner('RAID BROKEN · YOUR STRUCTURES STAND', 'good'); hubs.metal += 40; }
    } else if (here.some(s => !s.public) && !ch.isHaven && --hubs.raidT <= 0) {
      hubs.raidT = CFG.raidEvery[0] + Math.random() * (CFG.raidEvery[1] - CFG.raidEvery[0]);
      const owned = here.filter(s => !s.public);
      const target = owned[Math.random() * owned.length | 0], d = Math.max(1, ch.dangerLevel || 1);
      const a = Math.random() * TAU, n = 3 + Math.floor(d / 2);
      hubs.raid = [];
      for (let i = 0; i < n; i++) {
        const e = new EnemyOrganism(target.x + Math.cos(a) * 900 + (Math.random() - 0.5) * 200, target.y + Math.sin(a) * 900 + (Math.random() - 0.5) * 200,
          { tier: d, archetype: ['stalker', 'charger', 'mote', 'sniper'][i % (d >= 3 ? 4 : 3)] });
        e.raidTarget = target; e._aggro = true; e.hunting = true;
        engine.enemies.push(e); hubs.raid.push(e);
      }
      const COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
      banner(`RAID ON YOUR ${KINDS[target.kind].name} · ${n} CONTACTS · ${COMPASS[Math.round(a / (Math.PI / 4)) & 7]}`, 'warn');
      if (typeof soundEngine !== 'undefined') soundEngine.playAbility('emp');
    }
  }

  /* raiders fly at the structure unless you are right on top of them */
  const baseEnemyUpdate = EnemyOrganism.prototype.update;
  EnemyOrganism.prototype.update = function (player, projectiles, list) {
    const s = this.raidTarget;
    if (s && hubs.list().includes(s) && Math.hypot(player.x - this.x, player.y - this.y) > 480) {
      return baseEnemyUpdate.call(this, { x: s.x, y: s.y, vx: 0, vy: 0, coreRadius: 50 }, projectiles, list);
    }
    return baseEnemyUpdate.call(this, player, projectiles, list);
  };

  /* ── drawing (under ships, with the landmark field) ───────────────────── */
  const floats = [];
  function floatText(x, y, t) { floats.push({ x, y, t, at: performance.now() }); if (floats.length > 12) floats.shift(); }
  function drawStructures(ctx, camera) {
    const z = camera.zoom || 1, now = performance.now();
    if(worldMap.getCurrentChamber().isHaven)drawStationArt(ctx,-camera.x,-camera.y);
    for (const s of hubs.here()) {
      const def = KINDS[s.kind], sx = s.x - camera.x, sy = s.y - camera.y;
      s.spin = (s.spin || 0) + (s.kind === 'gun' ? 0 : 0.002);
      const angle = s.kind === 'gun' ? (s.aim || 0) : s.spin;
      if(!s.public||!drawStationArt(ctx,sx,sy))fluidShader.drawOrganismMembrane(ctx, sx, sy, angle, def.nodes[0].radius, bodies[s.kind], def.color, {});
      if (s._hitAt && now - s._hitAt < 110) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(sx, sy, def.nodes[0].radius * 1.6, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.textAlign = 'center';
      ctx.fillStyle = def.color; ctx.font = `700 ${Math.round(11 / z)}px "Space Grotesk", monospace`;
      ctx.fillText(s.public?'PUBLIC REFIT STATION':def.name, sx, sy - (s.public?220:def.nodes[0].radius * 2.6) - 10 / z);
      if (s.hp < def.hp) {
        const w = 110, k = Math.max(0, s.hp / def.hp);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(sx - w / 2, sy - def.nodes[0].radius * 2.6 - 4 / z, w, 6);
        ctx.fillStyle = k > 0.35 ? def.color : '#ff3366'; ctx.fillRect(sx - w / 2, sy - def.nodes[0].radius * 2.6 - 4 / z, w * k, 6);
      }
      ctx.restore();
    }
    ctx.save(); ctx.textAlign = 'center';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i], k = (now - f.at) / 1400;
      if (k >= 1) { floats.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#e8c478'; ctx.font = `800 ${Math.round(14 / z)}px "Outfit", sans-serif`;
      ctx.fillText(f.t, f.x - camera.x, f.y - camera.y - k * 40 / z);
    }
    ctx.restore();
  }

  function banner(t, tone) { if (window.garage) garage.banner(t, tone || 'good'); }
  function sound(kind) {
    if (typeof soundEngine === 'undefined') return;
    if (kind === 'sell') soundEngine.playPhrase([659.25, 523.25], 0.06); else soundEngine.playPhrase([523.25, 783.99], 0.06);
  }

  /* ── install ──────────────────────────────────────────────────────────── */
  function install() {
    if (window.galaxy) {
      galaxy.extraPortals = beaconPortals;
      galaxy.onRenderGalaxy = (c, toChart) => {
        const by = {};
        for (const s of hubs.list()) by[s.sys] = (by[s.sys] || 0) + 1;
        for (const [id, n] of Object.entries(by)) {
          const sys = galaxy.data.byId[id]; if (!sys) continue;
          const p = toChart(sys);
          c.fillStyle = '#c9a25c'; c.beginPath(); c.moveTo(p.x, p.y - 15); c.lineTo(p.x - 5, p.y - 7); c.lineTo(p.x + 5, p.y - 7); c.closePath(); c.fill();
          if (n > 1) { c.font = '600 9px "Space Grotesk", monospace'; c.textAlign = 'center'; c.fillText(n, p.x, p.y - 17); }
        }
      };
      /* portal counts on the chart include beacons; refresh the current grid's marks */
      galaxy.enterSystemById(galaxy.currentId);
    }

    /* metal on every kill */
    const baseKill = engine.killEnemy.bind(engine), paid = new WeakSet();
    engine.killEnemy = (i) => { const e = engine.enemies[i]; if(e&&e.hp<=0&&!paid.has(e)){hubs.metal+=metalFor(e);paid.add(e);}return baseKill(i); };

    /* resources card shows metal */
    const baseHud = engine.updateHUD.bind(engine);
    engine.updateHUD = (...a) => {
      const r = baseHud(...a);
      const el = $('hud-mass-count');
      if (el && !el.textContent.includes('metal')) el.textContent += ` · ${hubs.metal} metal`;
      return r;
    };

    const baseField = sectorField.drawField.bind(sectorField);
    sectorField.drawField = function (ctx, camera) { baseField(ctx, camera); drawStructures(ctx, camera); };

    const baseUpdate = engine.update.bind(engine);
    engine.update = (dt) => { baseUpdate(dt); if (!engine.paused && !engine.mapOpen && !document.hidden) tick(); };

    /* death: a Forward Dock in reach beats the hub if it is as close or closer */
    const baseRespawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = () => {
      const from = window.galaxy ? galaxy.currentId : 'home';
      const r = baseRespawn();
      const docks = hubs.list().filter(s => s.kind === 'dock' && !s.public);
      if (!docks.length || !window.galaxy) return r;
      const D = galaxy.data, hop = {}; hop[from] = 0; const q = [from];
      while (q.length) { const id = q.shift(); for (const n of D.byId[id].links) if (!(n in hop)) { hop[n] = hop[id] + 1; q.push(n); } }
      const hubHop = hop[galaxy.currentId] ?? Infinity;
      const best = docks.sort((a, b) => (hop[a.sys] ?? 1e9) - (hop[b.sys] ?? 1e9))[0];
      if ((hop[best.sys] ?? 1e9) <= hubHop) {
        galaxy.enterSystemById(best.sys);
        worldMap.currentGridX = best.gx; worldMap.currentGridY = best.gy;
        engine.player.x = best.x + 140; engine.player.y = best.y; engine.player.vx = engine.player.vy = 0;
        engine.enterChamber({ silent: true });
        banner('You wake at your FORWARD DOCK', 'good');
      }
      return r;
    };

    window.addEventListener('keydown', e => {
      const field = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName);
      if (field || e.ctrlKey || e.metaKey) return;
      if ($('dock-panel').style.display !== 'none') { if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); closeDock(); } return; }
      if ($('build-panel').style.display !== 'none') { if (e.code === 'Escape' || e.code === 'KeyX') { e.preventDefault(); closeBuild(); } return; }
      if (e.code === 'KeyE' && !engine.paused && dockNear()) { e.preventDefault(); openDock(); }
      else if (e.code === 'KeyX' && !engine.paused) { e.preventDefault(); openBuild(); }
    });
    $('dock-prompt').addEventListener('click', e => { e.stopPropagation(); openDock(); });
    $('dock-undock').addEventListener('click', e => { e.stopPropagation(); closeDock(); });
    $('dock-shipyard').addEventListener('click', e => { e.stopPropagation(); closeDock(); if (window.bay && bay.show) bay.show(); });
    $('build-close').addEventListener('click', e => { e.stopPropagation(); closeBuild(); });
    const actions = document.querySelector('.hud-center-actions');
    if (actions && !$('btn-open-build')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-open-build'; b.className = 'btn'; b.textContent = 'Build';
      b.title = 'Build a structure here (X)';
      b.addEventListener('click', e => { e.stopPropagation(); openBuild(); });
      const menuBtn = $('btn-open-menu'); if (menuBtn) menuBtn.after(b); else actions.prepend(b);
    }
    const bar = document.querySelector('.mobile-action-bar');
    if (bar && !$('btn-touch-build')) {
      const t = document.createElement('button'); t.id = 'btn-touch-build'; t.className = 'touch-action-btn tool-touch-btn'; t.setAttribute('aria-label', 'Build');
      t.innerHTML = '<span class="touch-btn-icon">⚒</span>';
      t.addEventListener('click', e => { e.stopPropagation(); openBuild(); });
      bar.append(t);
    }
    hubs.raidT = CFG.raidEvery[0];
  }

  if (window.engine && window.galaxy && galaxy.data && sectorField._installed) install();
  else window.addEventListener('load', install);
})();
