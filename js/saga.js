/* THE CAMPAIGN (Route 2 Stage 3; overnight run step 13). Three acts over the places that already exist, told by roles
 * from Mac's Sovereign Eclipse canon (no invented personal names): the Asterion dockkeeper, and an envoy for each of the
 * fifteen civilisations, named for its pantheon epithet. Most steps are checks on the save, so anything you already did
 * counts the moment the story reaches it. Act II adds three set pieces (a Riptide convoy, a siege of your banner's
 * anchorage, a Black Sun chase) and Act III closes on citadels, warlords and the Grave Choir.
 * Station jobs (bounty, escort, defence, courier) rotate every two hours per station and pay metal and reputation.
 * Reputation per civilisation has tiers: Hostile (no jobs), Known (+10% job pay), Trusted (10% back at its
 * quartermasters), Honoured (its livery in Ship identity), Exalted (+25% job pay). Rivals come from the canon's
 * Galactic Relations: pledging to a banner costs you standing with its rival. Spec: docs/PLAN.md Stage 3. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, $ = id => document.getElementById(id);
  const civ = id => canon.civilisations.find(c => c.id === id);
  // Rivals and the canon line that makes them rivals (docs/canon, Galactic Relations).
  const RIVAL = {
    savanah: ['human-hunters', 'Human Hunters admire Savanah pursuit capability and hate being hunted by them.'],
    'sol-symbiots': ['ai-human-gods', 'Sol and AI Human Gods share ancestry in human-machine integration yet diverged radically.'],
    chaos: ['ai', 'Chaos and Pure AI are philosophical opposites who trade constantly.'],
    'cosmic-darkness': ['cosmic-light', 'Their closest philosophical rival is Cosmic Light. Darkness argues some truths require shadow.'],
    'cosmic-light': ['cosmic-darkness', "Cosmic Light's oldest philosophical counterpart is Cosmic Darkness: visibility versus shadow."],
    blackhole: ['hybrid-fused', 'Hybrid Fused thinkers are their philosophical mirror: Blackhole asks which transformations destroy return.'],
    'hybrid-fused': ['ai-hunters', 'AI Hunters historically distrusted uncontrolled hybridisation, producing several infamous frontier purges.'],
    'human-hunters': ['savanah', 'Human Hunters admire Savanah pursuit capability and hate being hunted by them.'],
    'ai-hunters': ['hybrid-fused', 'They historically clashed with Hybrid Fused civilisation because Fused adaptation resembles uncontrolled system drift.'],
    'amethyst-angels': ['techno-angels', 'Techno Angels are their closest cultural cousins and most frequent rivals.'],
    'techno-angels': ['amethyst-angels', 'Amethyst Angels share their celestial aesthetic but differ philosophically.'],
    'ai-gods': ['sol-symbiots', 'Sol Symbiots admire their concern with legitimacy and distrust their scale of authority.'],
    'pagan-ai': ['ai-hunters', 'AI Hunters regularly argue that some Pagan systems are impossible to audit safely.'],
    ai: ['chaos', 'Chaos is their philosophical opposite and favourite engineering customer.'],
    'ai-human-gods': ['ai-gods', 'AI Gods share their divine imagery but place divinity in authority; AI Human Gods place it in embodiment.']
  };
  // Civilisation palettes from docs/ART_CODEX_BRIEF.md §3: [base, accent, plate].
  const PAL = { savanah: ['#0b0d0a', '#2fd27a', '#c9a24a'], 'sol-symbiots': ['#2a3a3a', '#4fd8ff', '#d8b45a'], chaos: ['#3a1b5c', '#f2c230', '#e8752a'], 'cosmic-darkness': ['#2a1846', '#c9cfe0', '#8f96b8'], 'cosmic-light': ['#5a5440', '#f0d78a', '#7fe8ff'], blackhole: ['#0d1224', '#ff8a2a', '#3a3f52'], 'hybrid-fused': ['#5b6066', '#8a4fd6', '#e3dccb'], 'human-hunters': ['#3a3f3a', '#ff7a1a', '#5d6b3a'], 'ai-hunters': ['#121212', '#e0262f', '#3a3a3a'], 'amethyst-angels': ['#0c0a10', '#9b4dff', '#d6b25e'], 'techno-angels': ['#3b7fd0', '#8fd3ff', '#f2f8ff'], 'ai-gods': ['#5a5f66', '#d9b45b', '#e8edf2'], 'pagan-ai': ['#2b2420', '#ff8a2b', '#8a5a2b'], ai: ['#3a4048', '#39e5ff', '#6e7781'], 'ai-human-gods': ['#5a2a2e', '#d8b45a', '#f3ead8'] };
  const TIERS = [[-Infinity, 'Hostile'], [-150, 'Stranger'], [100, 'Known'], [300, 'Trusted'], [700, 'Honoured'], [1500, 'Exalted']];
  const CFG = { jobEpochMs: 2 * 60 * 60 * 1000, trustedRefund: 0.1, pledge: 100, rivalPledge: -100, stepRep: 60, rivalStep: -40, jobRep: 25, courierRep: 15, rivalJob: -10 };
  const ROW = d => window.tuning.ROWS[Math.max(1, Math.min(20, d | 0))];
  let ready = false, scene = null, notice = '', tracker = null, clock = 0, pendingStart = 0;
  const words = s => s.toLowerCase().replace(/(^|[\s,-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bThe\b/g, 'the').replace(/^the/, 'the');
  const envoyName = id => { const c = civ(id); return c ? 'Envoy of ' + words(c.epithet) : 'An envoy'; };
  function doc() {
    let d = saveState.doc.saga;
    if (!d || d.v !== 1) d = saveState.doc.saga = { v: 1, step: 0, log: [], banner: null, rival: null, bannerSys: null, rep: {}, docked: {}, choir: false, job: null, jobsDone: {}, acts: [] };
    for (const k of ['rep', 'docked', 'jobsDone']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
    if (!Array.isArray(d.log)) d.log = []; if (!Array.isArray(d.acts)) d.acts = [];
    return d;
  }
  const rep = id => Number(doc().rep[id]) || 0;
  const tier = id => { const r = rep(id); let t = TIERS[0][1]; for (const [min, name] of TIERS) if (r >= min) t = name; return t; };
  function addRep(id, n) { if (!id || !n) return; doc().rep[id] = rep(id) + n; syncLiveries(); }
  const homeId = () => saveState.doc.civHome || 'home';
  const stationCiv = (sys = galaxy.current) => window.quartermaster?.faction?.(sys)?.id || window.factionFleets?.civilisation?.(sys.id);
  function say(who, text) { const d = doc(); d.log.unshift({ at: Date.now(), who, text }); d.log.length = Math.min(d.log.length, 30); }
  function speaker(who) {
    const d = doc();
    if (who === 'dock') return { name: 'The Asterion dockkeeper', role: 'Asterion Forge · Naraka', colors: ['#1b2733', '#d8b45a', '#7fa3b8'] };
    const id = who === 'banner' ? d.banner : who === 'rival' ? d.rival : who === 'here' ? stationCiv() : who;
    const c = civ(id); return { name: envoyName(id), role: c ? c.name : 'Unknown', colors: PAL[id] || ['#222', '#ccc', '#888'], id };
  }
  function pay(metal, why) { if (!metal) return; hubs.metal = hubs.metal + metal; garage.banner(`${why} · +${metal.toLocaleString()} metal`, 'good'); }
  // ---- places for set pieces ----
  function nearest(rule, from = 'home') {
    const seen = new Set([from]), q = [from];
    while (q.length) { const id = q.shift(), s = galaxy.data.byId[id]; if (s && s.rule === rule && !s.hub) return s; for (const n of s?.links || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    return null;
  }
  const STEPS = [
    { id: 'expedition', act: 0, who: 'dock', title: 'The first expedition', goal: 'Recover the survey recorder in home sector 1,0 and hand it in at the dock.',
      say: () => 'Asterion is a door, not a harbour. Bring me that recorder and I will show you where the Current starts.',
      done: () => window.firstExpedition?.state?.().stage === 'done', metal: 120 },
    { id: 'anchorage', act: 0, who: 'dock', title: 'Beyond Asterion', goal: 'Jump out of the home system and dock at another anchorage.',
      say: () => 'The routes outward are older than any of us. Find another anchorage and dock there. You will see who holds it.',
      done: () => Object.keys(doc().docked).some(id => id !== 'home' && id !== homeId() && galaxy.data.byId[id]?.hub), route: () => { const h = galaxy.data.systems.filter(s => s.hub && !s.home).sort((a, b) => a.hops - b.hops)[0]; return h && { sys: h.id, kind: 'station' }; }, metal: 250 },
    { id: 'derelict', act: 0, who: 'dock', title: 'A titan that died with its lights on', goal: 'Board a derelict titan (◇ on the star map), break its warden and open the hold.',
      say: () => 'Dead titans drift in the dark between the rings. Their holds still pay. Their wardens still answer.',
      done: () => (saveState.doc.dives?.cleared || 0) >= 1, metal: 400 },
    { id: 'rift', act: 0, who: 'dock', title: 'Seal the tear', goal: 'Enter a rift and break all five waves before it collapses.',
      say: () => 'Every system has a tear in it. Seal one and you will have done something most captains only talk about.',
      done: () => (saveState.doc.rifts?.cleared || 0) >= 1, route: () => { const s = window.rifts?.riftSector?.(galaxy.current); return s && { sys: galaxy.currentId, gx: s.gx, gy: s.gy, name: 'Rift' }; }, metal: 400 },
    { id: 'banner', act: 1, who: 'here', title: 'Choose a banner', goal: 'Dock at an anchorage and pledge to the civilisation that holds it (Campaign journal).',
      say: () => { const c = civ(stationCiv()); return c ? `"${c.motto}" That is our creed, captain. Fly under it and the Current opens for you. Its enemies will notice.` : 'Dock at an anchorage to hear its envoy.'; },
      done: () => !!doc().banner, metal: 300 },
    { id: 'convoy', act: 1, who: 'banner', title: 'The Riptide convoy', scene: 'convoy', goal: 'Escort three freighters across a Riptide sector. Raiders of your rival will strike.',
      say: () => `Our freighters run the Riptide tonight. ${civ(doc().rival)?.name || 'Our rival'} will try to sink them. Keep them alive to the far side.`,
      place: () => { const s = nearest('riptide', homeId()); return s && { sys: s.id, gx: 1, gy: 0 }; }, metal: 900 },
    { id: 'siege', act: 1, who: 'banner', title: 'Siege of the anchorage', scene: 'siege', goal: 'Hold your banner\'s anchorage through four waves. Keep the station shield up.',
      say: () => `They answered the convoy with a siege. Our anchorage at ${galaxy.data.byId[doc().bannerSys]?.name || 'home'} is under their guns. Hold it.`,
      place: () => ({ sys: doc().bannerSys || homeId(), gx: 0, gy: 0 }), metal: 1200 },
    { id: 'chase', act: 1, who: 'rival', title: 'The Black Sun chase', scene: 'chase', goal: 'In a Black Sun system, run down the rival courier before it reaches the far rim. Follow its transponder.',
      say: () => `${RIVAL[doc().banner]?.[1] || ''} You have cost us twice, captain. Our courier carries the answer. You will not catch it under the black sun.`,
      place: () => { const s = nearest('blacksun', homeId()); return s && { sys: s.id, gx: 0, gy: 1 }; }, metal: 1500 },
    { id: 'citadel', act: 2, who: 'banner', title: 'Break a citadel', goal: 'Break a citadel in the null band (its corner sector): two shield generators, then the core.',
      say: () => 'Out past the contested band the warlords keep fortresses. Break one and the Current will know your hull.',
      done: () => Object.keys(saveState.doc.capital?.citadels || {}).length >= 1, metal: 4000 },
    { id: 'warlord', act: 2, who: 'banner', title: 'The warlord hunt', goal: 'Find a roaming warlord titan in the null band and bring it down.',
      say: () => 'Six titans roam the deep under their own banners. Bring one down and they will speak your name on every route.',
      done: () => Object.values(saveState.doc.capital?.warlords || {}).some(w => (w?.defeats || 0) > 0), metal: 6000 },
    { id: 'choir', act: 2, who: 'dock', title: 'The Grave Choir', goal: 'Descend the Grave Choir (the violet rift in the home system) and silence its guardian.',
      say: () => 'There is a tomb under Asterion that still expects an enemy. You are ready to be one.',
      done: () => !!doc().choir, route: () => ({ sys: 'home', gx: 0, gy: 0, x: 1250, y: -900, name: 'Grave Choir' }), metal: 8000 }
  ];
  const ACTS = ['Act I · The Forge at the Edge', 'Act II · The Banner War', 'Act III · Warlords and Citadels'];
  const current = () => STEPS[doc().step] || null;
  function complete(step) {
    const d = doc(), who = speaker(step.who);
    say(who.name, step.id === 'choir' ? 'The Current is open, captain. Every road in it is yours to take.' : `${step.title}: done. ${step.act === 0 ? 'Asterion remembers who comes back.' : 'Our banner flies further for it.'}`);
    pay(step.metal, step.title.toUpperCase());
    if (step.act >= 1 && d.banner && step.id !== 'banner') { addRep(d.banner, CFG.stepRep); addRep(d.rival, CFG.rivalStep); }
    d.step++;
    const next = STEPS[d.step];
    if (!next || next.act !== step.act) actComplete(step.act);
    if (next) say(speaker(next.who).name, next.say());
    saveState.save(); refresh();
  }
  function actComplete(act) {
    const d = doc(); if (d.acts.includes(act)) return; d.acts.push(act);
    try { const r = window.quartermaster?.reward?.('elite', galaxy.data.byId[d.bannerSys] || galaxy.current), g = r && modularShips.GEARS[r.base];
      if (g) recoveredFittings.grant({ type: g.type, radius: g.radius, ...(g.weapon ? { weapon: g.weapon } : {}), quirk: r.quirk, rarity: 'rare' }); } catch (e) { }
    if (act >= 1) window.eliteMarks?.grant?.(act === 1 ? 2 : 4, ACTS[act]);
    garage.banner(`${ACTS[act].toUpperCase()} · COMPLETE · a named fitting is in your hold`, 'good');
  }
  function pledge() {
    const d = doc(), step = current(); if (!step || step.id !== 'banner' || !hubs.docked || !galaxy.current?.hub) { notice = 'Dock at an anchorage (a hub system) to pledge.'; return false; }
    const id = stationCiv(); if (!id) return false;
    d.banner = id; d.rival = RIVAL[id]?.[0] || null; d.bannerSys = galaxy.currentId;
    addRep(id, CFG.pledge); addRep(d.rival, CFG.rivalPledge);
    say(envoyName(id), `Then fly under ${civ(id).name}. ${civ(d.rival)?.name || 'Our rival'} will hear of it before you undock.`);
    complete(step); return true;
  }
  // ---- route guidance ----
  function routeTo(t) {
    if (!t) return false; const sys = galaxy.data.byId[t.sys]; if (!sys) return false;
    if (t.sys === galaxy.currentId) { if (t.kind === 'station') return travelHelper.station(); return travelHelper.sector(t.gx, t.gy, t.name || 'Mission'); }
    if (galaxy.known(t.sys) && travelHelper.path(galaxy.currentId, t.sys)) { if (t.kind === 'station') return travelHelper.destination(t.sys); return travelHelper.sectorInSystem(t.sys, t.gx, t.gy, t.name || 'Mission', t.x || 0, t.y || 0, 'MISSION'); }
    const p = travelHelper.path(galaxy.currentId, t.sys); const edge = p && [...p].reverse().find(id => galaxy.known(id) && id !== galaxy.currentId);
    if (edge) { travelHelper.destination(edge); garage.banner('Route plotted to the edge of the known Current · keep going', 'good'); return true; }
    return false;
  }
  function stepRoute(step = current()) { if (!step) return null; if (step.place) { const p = step.place(); return p && { ...p, name: step.title }; } return step.route?.() || null; }
  // ---- set pieces ----
  const FREIGHTER = [{ dx: 0, dy: 0, radius: 22, type: 'core' }, { dx: 30, dy: 0, radius: 16, type: 'pod' }, { dx: -30, dy: 0, radius: 16, type: 'pod' }, { dx: -54, dy: 0, radius: 12, type: 'thruster' }, { dx: 0, dy: 20, radius: 12, type: 'shield' }, { dx: 0, dy: -20, radius: 12, type: 'shield' }]
    .map(n => ({ currentDx: n.dx, currentDy: n.dy, targetDx: n.dx, targetDy: n.dy, radius: n.radius, type: n.type }));
  function hostile(x, y, d, arch, civId) {
    const e = new EnemyOrganism(x, y, { tier: Math.max(1, Math.min(20, d)), archetype: arch });
    if (civId) e.faction = civId;
    try { window.frontierPve?.decorate?.(e); window.combatScaling?.enemy?.(e); window.hostileSkins?.skin?.(e); } catch (err) { }
    e._aggro = true; e.hunting = true; e.saga = true; engine.enemies.push(e); return e;
  }
  const alive = s => s.hp > 0;
  function startScene(kind, src, place) {
    const ch = worldMap.getCurrentChamber(), R = ch.radius || 3200, k = R / 3200, d = Math.max(1, ch.dangerLevel || 1), foe = doc().rival || stationCiv() || null;
    const s = { kind, src, sys: galaxy.currentId, gx: ch.gridX, gy: ch.gridY, R, k, d, foe, t: 0, enemies: [] };
    if (kind === 'convoy') { const hp = 400 + 120 * d; s.ships = [0, 1, 2].map(i => ({ x: -0.8 * R - i * 170 * k, y: (i - 1) * 60 * k, hp, max: hp, a: 0 })); s.speed = 1.6 * R / (75 * 60); s.waves = [6, 28, 50]; s.wave = 0; }
    if (kind === 'siege') { s.shield = s.max = 800 + 250 * d; s.waves = src === 'job' ? 3 : 4; s.wave = 0; s.next = 60; s.hitR = 200 * Math.max(1, window.roomScale?.stationScale?.() || 1); }
    if (kind === 'chase') { const P = engine.player, m = Math.hypot(P.x, P.y), ex = m > 100 ? -P.x / m : 1, ey = m > 100 ? -P.y / m : 0; s.escape = { x: ex * R * 0.92, y: ey * R * 0.92 };
      const sx = P.x + (s.escape.x - P.x) * 0.3, sy = P.y + (s.escape.y - P.y) * 0.3; const c = hostile(sx, sy, d, 'stalker', foe); c.elite = true; c.maxHp *= 4; c.hp = c.maxHp; c.sagaCourier = true; s.courier = c; s.enemies.push(c);
      for (let i = 0; i < 2; i++) s.enemies.push(hostile(sx + (i ? 160 : -160) * k, sy + 120 * k, d, i ? 'charger' : 'sniper', foe)); s.speed = Math.hypot(s.escape.x - sx, s.escape.y - sy) / (45 * 60); }
    if (kind === 'bounty') { const P = engine.player, a = Math.random() * TAU; const t = hostile(P.x + Math.cos(a) * R * 0.45, P.y + Math.sin(a) * R * 0.45, d, 'hive', place?.civ || foe); t.elite = true; t.maxHp *= 3; t.hp = t.maxHp; s.target = t; s.enemies.push(t);
      for (let i = 0; i < 2; i++) s.enemies.push(hostile(t.x + (i ? 180 : -180) * k, t.y + 150 * k, d, 'stalker', place?.civ || foe)); }
    scene = s; garage.banner({ convoy: 'CONVOY · keep the freighters alive to the far side', siege: 'SIEGE · hold the station shield through every wave', chase: 'CHASE · the courier is running for the rim · follow its transponder', bounty: 'BOUNTY · the marked hull is in this sector' }[kind], 'hunt');
    return s;
  }
  function endScene(won, why) {
    const s = scene; if (!s) return; scene = null;
    for (const e of s.enemies) e.sagaTarget = null;
    if (s.src === 'story') {
      const step = current();
      if (won && step?.scene === s.kind) complete(step);
      else if (!won) { garage.banner(`${step?.title?.toUpperCase() || 'MISSION'} FAILED · ${why} · return to the marked sector to try again`, 'bad'); say(speaker(step?.who || 'dock').name, 'That went badly. Regroup, refit, and try again.'); }
    } else if (s.src === 'job') { const j = doc().job; if (won && j) finishJob(j, s.kind === 'convoy' ? s.ships.filter(alive).length / 3 : 1); else if (!won) garage.banner(`JOB FAILED · ${why} · go back to the job sector to try again`, 'bad'); }
    saveState.save(); refresh();
  }
  function proxyFor(e) { const t = e.sagaTarget; if (!t) return null; if (t.hp !== undefined && t.hp <= 0) { e.sagaTarget = null; return null; } return t; }
  function tickScene() {
    const s = scene; if (!s) return;
    const ch = worldMap.getCurrentChamber(), P = engine.player;
    if (galaxy.currentId !== s.sys || ch.gridX !== s.gx || ch.gridY !== s.gy) return endScene(false, 'you left the sector');
    if (P.dead) return endScene(false, 'ship lost');
    s.t++;
    const shots = engine.projectiles;
    const hit = (o, r) => { for (let i = shots.length - 1; i >= 0; i--) { const p = shots[i]; if (p.isPlayer) continue; if (Math.hypot(p.x - o.x, p.y - o.y) < r) { o.hp -= p.damage; shots.splice(i, 1); } } };
    if (s.kind === 'convoy') {
      for (const f of s.ships) if (alive(f)) { f.x += s.speed; hit(f, 40 * s.k); }
      const lead = s.ships.filter(alive);
      if (!lead.length) return endScene(false, 'the convoy was destroyed');
      if (s.wave < s.waves.length && s.t >= s.waves[s.wave] * 60) { const front = lead[0], n = 2 + s.wave + Math.floor(s.d / 5);
        for (let i = 0; i < n; i++) { const a = (i / n - 0.5) * 2.2 + (i % 2 ? Math.PI : 0), e = hostile(front.x + 700 * s.k + Math.cos(a) * 300 * s.k, front.y + Math.sin(a) * 700 * s.k, s.d, ['stalker', 'charger', 'sniper'][i % 3], s.foe); if (i % 2 === 0) e.sagaTarget = lead[i % lead.length]; s.enemies.push(e); }
        s.wave++; garage.banner(`CONVOY · raiders, wave ${s.wave}/${s.waves.length}`, 'hunt'); }
      if (Math.max(...lead.map(f => f.x)) >= 0.8 * s.R) return endScene(true);
    } else if (s.kind === 'siege') {
      hit({ x: 0, y: 0, get hp() { return s.shield; }, set hp(v) { s.shield = v; } }, s.hitR);
      if (s.shield <= 0) return endScene(false, 'the station shield fell');
      const live = s.enemies.filter(e => e.hp > 0 && engine.enemies.includes(e));
      if (s.wave < s.waves && (--s.next <= 0 || !live.length)) { const n = 3 + s.wave + Math.floor(s.d / 4), a0 = Math.random() * TAU;
        for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 1.6, e = hostile(Math.cos(a) * s.R * 0.85, Math.sin(a) * s.R * 0.85, s.d, ['charger', 'stalker', 'sniper', 'hive'][i % 4], s.foe); if (i % 5 < 3) e.sagaTarget = { x: 0, y: 0 }; s.enemies.push(e); }
        s.wave++; s.next = 25 * 60; garage.banner(`SIEGE · wave ${s.wave}/${s.waves}`, 'hunt'); }
      else if (s.wave >= s.waves && !live.length) return endScene(true);
    } else if (s.kind === 'chase') {
      const c = s.courier;
      if (c.hp <= 0 || !engine.enemies.includes(c)) return endScene(true);
      if (Math.hypot(c.x - s.escape.x, c.y - s.escape.y) < 160 * s.k) { const i = engine.enemies.indexOf(c); if (i >= 0) engine.enemies.splice(i, 1); return endScene(false, 'the courier reached the rim'); }
    } else if (s.kind === 'bounty') {
      if (s.target.hp <= 0 || !engine.enemies.includes(s.target)) return endScene(true);
    }
  }
  function maybeStart() {
    if (scene || engine.paused || engine.mapOpen || hubs.docked || engine.player.dead || window.derelicts?.active || window.rifts?.active) { pendingStart = 0; return; }
    const ch = worldMap.getCurrentChamber(), at = p => p && p.sys === galaxy.currentId && p.gx === ch.gridX && p.gy === ch.gridY;
    const step = current(), j = doc().job;
    let want = null;
    if (step?.scene && at(step.place?.())) want = ['story', step.scene, null];
    else if (j && j.kind !== 'courier' && at(j)) want = ['job', j.kind === 'defence' ? 'siege' : j.kind === 'escort' ? 'convoy' : 'bounty', j];
    if (!want) { pendingStart = 0; return; }
    if (++pendingStart < 90) return; pendingStart = 0;
    startScene(want[1], want[0], want[2]);
  }
  // ---- jobs ----
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  function offers(sys = galaxy.current) {
    const epoch = Math.floor(Date.now() / CFG.jobEpochMs), id = stationCiv(sys), out = [];
    let seed = hash(sys.id + ':' + epoch) || 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = sys.home ? 3 : sys.size + 3, kinds = ['bounty', 'escort', 'courier', ...(sys.hub || sys.home ? ['defence'] : [])], hubs2 = galaxy.data.systems.filter(s => (s.hub || s.home) && s.id !== sys.id);
    for (let i = 0; i < 3; i++) {
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      let gx = 0, gy = 0; if (kind === 'bounty' || kind === 'escort') do { gx = Math.floor(rnd() * (2 * n + 1)) - n; gy = Math.floor(rnd() * (2 * n + 1)) - n; } while (gx === 0 && gy === 0 || (sys.home || sys.id === homeId()) && Math.max(Math.abs(gx), Math.abs(gy)) <= 3);
      const ring = Math.max(Math.abs(gx), Math.abs(gy)), d = Math.max(1, Math.min(20, (sys.danger || 1) + Math.floor(ring / 2))), dest = kind === 'courier' ? hubs2[Math.floor(rnd() * hubs2.length)] : null;
      const hops = dest ? (travelHelper.path(sys.id, dest.id)?.length || 4) - 1 : 0;
      const base = kind === 'courier' ? 150 * hops * (1 + (dest?.danger || 1)) : ROW(d).bounty * (kind === 'bounty' ? 6 : 8);
      out.push({ i, kind, sys: sys.id, gx, gy, d, civ: id, dest: dest?.id || null, pay: Math.max(60, Math.round(base)), key: `${sys.id}:${epoch}:${i}` });
    }
    return out;
  }
  const payScale = id => { const r = rep(id); return r >= 1500 ? 1.25 : r >= 100 ? 1.1 : 1; };
  function takeJob(o) {
    const d = doc(); if (d.job) { notice = 'You already have a job. Finish or abandon it first.'; return false; }
    if (!hubs.docked) { notice = 'Dock to take a job.'; return false; }
    if (tier(o.civ) === 'Hostile') { notice = `${civ(o.civ)?.name || 'They'} will not hire you.`; return false; }
    if (d.jobsDone[o.key]) { notice = 'That job is done. New jobs post every two hours.'; return false; }
    d.job = { ...o }; saveState.save();
    if (o.kind === 'courier') { routeTo({ sys: o.dest, kind: 'station' }); notice = `Courier run to ${galaxy.data.byId[o.dest]?.name}. Dock there to deliver.`; }
    else if (o.kind === 'defence') notice = 'Undock and hold the station. The attack starts when you are out.';
    else { routeTo({ sys: o.sys, gx: o.gx, gy: o.gy, name: o.kind === 'bounty' ? 'Bounty' : 'Escort' }); notice = 'Route plotted to the job sector.'; }
    refresh(); return true;
  }
  function finishJob(j, share = 1) {
    const d = doc(), metal = Math.round(j.pay * share * payScale(j.civ));
    d.jobsDone[j.key] = true; d.job = null;
    pay(metal, `JOB DONE · ${j.kind.toUpperCase()}`); addRep(j.civ, j.kind === 'courier' ? CFG.courierRep : CFG.jobRep); addRep(RIVAL[j.civ]?.[0], CFG.rivalJob);
    say(envoyName(j.civ), j.kind === 'courier' ? 'Delivered sealed. We will remember the hull that carried it.' : 'Clean work. There will be more.');
    saveState.save(); refresh();
  }
  function abandonJob() { const d = doc(); if (!d.job) return false; if (scene?.src === 'job') endScene(false, 'job abandoned'); d.job = null; notice = 'Job abandoned. No pay, no penalty.'; saveState.save(); refresh(); return true; }
  // ---- reputation effects ----
  function syncLiveries() {
    const P = window.shipIdentity?.PAINTS; if (!P) return;
    for (const [id, [base, accent, plate]] of Object.entries(PAL)) P['civ-' + id] = [civ(id)?.name + ' livery', base, accent, plate];
    const sel = $('identity-paint'); if (!sel) return;
    for (const id of Object.keys(PAL)) { const key = 'civ-' + id, has = [...sel.options].find(o => o.value === key), ok = rep(id) >= 700;
      if (ok && !has) sel.add(new Option(P[key][0] + ' · Honoured', key)); else if (!ok && has && sel.value !== key) has.remove(); }
  }
  // ---- UI ----
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const btn = (text, run, id) => { const b = el('button', text); b.type = 'button'; b.onclick = () => { run(); }; if (id) b.id = id; return b; };
  function portrait(sp) {
    const c = el('canvas'); c.width = c.height = 64; c.className = 'saga-portrait'; const g = c.getContext('2d'), [base, accent, plate] = sp.colors;
    const bg = g.createRadialGradient(28, 24, 4, 32, 32, 34); bg.addColorStop(0, plate); bg.addColorStop(1, base); g.fillStyle = bg; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
    g.strokeStyle = accent; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 29, 0, TAU); g.stroke();
    g.fillStyle = accent; g.font = '600 26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sp.name === 'The Asterion dockkeeper' ? '⚓' : (civ(sp.id)?.name || '?')[0], 32, 34);
    c.style.cssText = 'width:56px;height:56px;flex:none;border-radius:50%'; return c;
  }
  function render() {
    const d = doc(), step = current(), host = el('section', null, 'saga'); host.id = 'saga-journal';
    host.style.cssText = 'display:grid;gap:10px;margin-bottom:14px';
    host.append(el('small', step ? ACTS[step.act].toUpperCase() : 'THE CURRENT IS YOURS', 'qm-kicker'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    if (step) {
      const sp = speaker(step.who), card = el('article', null, 'saga-card'); card.style.cssText = 'display:flex;gap:12px;align-items:flex-start';
      const body = el('div'); body.append(el('h3', step.title), el('strong', `${sp.name} · ${sp.role}`), el('p', '"' + step.say() + '"'), el('p', 'Goal: ' + step.goal, 'path-note'));
      const acts = el('div', null, 'qm-actions');
      if (step.id === 'banner') { const id = stationCiv(), ok = hubs.docked && galaxy.current?.hub; if (ok && id) { acts.append(btn(`Pledge to ${civ(id).name}`, pledge, 'saga-pledge')); body.append(el('p', `Rival: ${civ(RIVAL[id]?.[0])?.name || 'none'}. ${RIVAL[id]?.[1] || ''}`, 'path-note')); } else body.append(el('p', 'Dock at an anchorage (a hub system) to pledge to its civilisation.', 'path-note')); }
      const r = stepRoute(step); if (r) acts.append(btn('Plot route', () => { routeTo(r); window.pilotRpg?.close?.(); if (hubs.docked) hubs.closeDock(); }, 'saga-route'));
      if (scene?.src === 'story') body.append(el('p', sceneLine(), 'qm-progress'));
      body.append(acts); card.append(portrait(sp), body); host.append(card);
    } else host.append(el('p', 'All three acts are done. Jobs and reputation keep the Current moving.'));
    // jobs
    const jobs = el('section', null, 'saga-jobs'); jobs.id = 'saga-jobs'; jobs.append(el('h4', 'Station jobs'));
    if (d.job) { const j = d.job; jobs.append(el('p', `Active: ${j.kind} for ${civ(j.civ)?.name || 'the station'} · ${j.kind === 'courier' ? 'deliver to ' + galaxy.data.byId[j.dest]?.name : galaxy.data.byId[j.sys]?.name + ' sector ' + j.gx + ',' + j.gy} · ${j.pay.toLocaleString()} metal`), btn('Abandon job', abandonJob, 'saga-abandon')); }
    else if (!hubs.docked) jobs.append(el('p', 'Dock at any station to see its jobs (they rotate every two hours).', 'path-note'));
    else if (tier(stationCiv()) === 'Hostile') jobs.append(el('p', `${civ(stationCiv())?.name} will not hire you.`));
    else for (const o of offers()) { const done = d.jobsDone[o.key], b = btn(done ? `✓ ${o.kind} · done` : `${o.kind.toUpperCase()} · ${o.kind === 'courier' ? 'to ' + galaxy.data.byId[o.dest]?.name : 'sector ' + o.gx + ',' + o.gy + ' · danger ' + o.d} · ${Math.round(o.pay * payScale(o.civ)).toLocaleString()} metal`, () => takeJob(o)); b.dataset.sagaJob = o.i; b.disabled = !!done; jobs.append(b); }
    host.append(jobs);
    // reputation
    const known = Object.keys(d.rep).filter(id => d.rep[id]);
    if (known.length) { const rr = el('section', null, 'saga-rep'); rr.append(el('h4', 'Standing')); for (const id of known.sort((a, b) => rep(b) - rep(a))) rr.append(el('p', `${civ(id)?.name}: ${tier(id)} (${rep(id)})${id === d.banner ? ' · your banner' : id === d.rival ? ' · your rival' : ''}`)); host.append(rr); }
    if (d.log.length) { const lg = el('section', null, 'saga-log'); lg.append(el('h4', 'Voices')); for (const l of d.log.slice(0, 5)) lg.append(el('p', `${l.who}: "${l.text}"`, 'path-note')); host.append(lg); }
    return host;
  }
  function sceneLine() {
    const s = scene; if (!s) return '';
    if (s.kind === 'convoy') return `Freighters ${s.ships.filter(alive).length}/3 · ${Math.round(Math.max(0, Math.min(1, (Math.max(...s.ships.filter(alive).map(f => f.x), -s.R) + 0.8 * s.R) / (1.6 * s.R))) * 100)}% across · wave ${s.wave}/${s.waves.length}`;
    if (s.kind === 'siege') return `Station shield ${Math.max(0, Math.round(s.shield / s.max * 100))}% · wave ${s.wave}/${s.waves}`;
    if (s.kind === 'chase') return `Courier ${Math.round(Math.hypot(s.courier.x - s.escape.x, s.courier.y - s.escape.y) / s.R * 100)}% from the rim · run it down`;
    return 'Marked hull in the sector';
  }
  function paintTracker() {
    const host = $('contracts'); if (!host) return;
    if (!tracker || !host.contains(tracker)) { tracker = el('section'); tracker.id = 'saga-tracker'; tracker.style.cssText = 'padding:6px 0 10px;margin-bottom:6px;border-bottom:1px solid #70623e;font:12px/1.45 system-ui;color:#ead29d'; tracker.append(el('strong'), el('p')); tracker.querySelector('p').style.cssText = 'font:11px/1.45 system-ui;color:#b5c9bd;margin:2px 0 0'; tracker.onclick = () => window.pilotRpg?.openJournal?.('main'); tracker.style.cursor = 'pointer'; host.prepend(tracker); }
    const step = current(), j = doc().job, hideForExpedition = step?.id === 'expedition';
    tracker.hidden = !step && !j || hideForExpedition && !scene && !j;
    const head = scene ? (scene.src === 'story' ? step?.title : 'Job · ' + scene.kind) : step ? `${ACTS[step.act].split(' · ')[0]} · ${step.title}` : 'Job · ' + j?.kind;
    const line = scene ? sceneLine() : step ? step.goal : '';
    tracker.querySelector('strong').textContent = head || ''; tracker.querySelector('p').textContent = line + (j && !scene ? (line ? ' · ' : '') + `Job: ${j.kind}` : '');
  }
  function refresh() { paintTracker(); try { window.pilotRpg?.refresh?.(); } catch (e) { } }
  function drawWorld(ctx, cam) {
    const s = scene; if (!s) return; const z = cam.zoom || 1, now = performance.now() / 1000;
    if (s.kind === 'convoy') for (const f of s.ships) { if (!alive(f)) continue; ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y); ctx.scale(1.6 * s.k, 1.6 * s.k);
      fluidShader.drawOrganismMembrane(ctx, 0, 0, 0, 22, FREIGHTER, PAL[doc().banner]?.[1] || '#5ef2e0', {}); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(f.x - cam.x - 40 * s.k, f.y - cam.y - 70 * s.k, 80 * s.k, 7 / z); ctx.fillStyle = '#5ef2a0'; ctx.fillRect(f.x - cam.x - 40 * s.k, f.y - cam.y - 70 * s.k, 80 * s.k * Math.max(0, f.hp / f.max), 7 / z); }
    if (s.kind === 'siege') { const a = Math.max(0, s.shield / s.max); ctx.save(); ctx.strokeStyle = `rgba(94,242,224,${0.25 + 0.5 * a})`; ctx.lineWidth = 6 / z; ctx.beginPath(); ctx.arc(-cam.x, -cam.y, s.hitR, -Math.PI / 2, -Math.PI / 2 + TAU * a); ctx.stroke(); ctx.restore(); }
    if (s.kind === 'chase' && s.courier.hp > 0) { const c = s.courier, p = (now % 1.2) / 1.2; ctx.save(); ctx.strokeStyle = `rgba(255,90,90,${1 - p})`; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.arc(c.x - cam.x, c.y - cam.y, 80 + p * 220, 0, TAU); ctx.stroke();
      ctx.setLineDash([20 / z, 20 / z]); ctx.strokeStyle = 'rgba(255,90,90,.35)'; ctx.beginPath(); ctx.moveTo(c.x - cam.x, c.y - cam.y); ctx.lineTo(s.escape.x - cam.x, s.escape.y - cam.y); ctx.stroke(); ctx.restore(); }
  }
  function install() {
    if (!window.pilotRpg?.registerJournalSection || !window.travelHelper?.ready || !window.galaxy?.data || typeof canon === 'undefined' || typeof engine === 'undefined') { setTimeout(install, 80); return; }
    doc();
    pilotRpg.registerJournalSection(render, { id: 'main', label: 'Campaign' });
    // set-piece targets: an enemy given a sagaTarget hunts it instead of you
    const up = EnemyOrganism.prototype.update; EnemyOrganism.prototype.update = function (player, ...a) { const t = proxyFor(this); if (!t) return up.call(this, player, ...a); const proxy = Object.create(player); proxy.x = t.x; proxy.y = t.y; proxy.vx = 0; proxy.vy = 0; return up.call(this, proxy, ...a); };
    // chase courier runs for the rim
    const courier = EnemyOrganism.prototype.update; EnemyOrganism.prototype.update = function (...a) { const r = courier.apply(this, a); if (this.sagaCourier && scene?.kind === 'chase') { const s = scene, dx = s.escape.x - this.x, dy = s.escape.y - this.y, dd = Math.hypot(dx, dy) || 1, j = Math.sin(s.t * 0.05) * 0.4; this.vx = (dx / dd + (-dy / dd) * j) * s.speed; this.vy = (dy / dd + (dx / dd) * j) * s.speed; this.x += this.vx; this.y += this.vy; } return r; };
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { if (!this.paused && !this.mapOpen) { tickScene(); maybeStart(); } if (++clock % 30 === 0) check(); } catch (e) { console.warn('saga:', e.message); } return r; };
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, cam) => { paint(ctx, cam); try { drawWorld(ctx, cam); } catch (e) { } };
    // docking: records anchorages, delivers couriers, refuses during a siege
    const open = hubs.openDock; hubs.openDock = function (...a) { if (scene?.kind === 'siege') { garage.banner('SIEGE · the berth is sealed until the station is safe', 'bad'); return; } const r = open.apply(this, a); if (this.docked) { doc().docked[galaxy.currentId] = Date.now(); const j = doc().job; if (j?.kind === 'courier' && j.dest === galaxy.currentId) finishJob(j); notice = ''; saveState.save(); refresh(); } return r; };
    // Grave Choir guardian
    const boss = saveState.defeatBoss; saveState.defeatBoss = function (name, ...a) { if (name === 'GRAVE CHOIR GUARDIAN') { doc().choir = true; saveState.save(); } return boss.call(this, name, ...a); };
    // Trusted: 10% back at that civilisation's quartermasters
    if (window.quartermaster?.buy) { const buy = quartermaster.buy; quartermaster.buy = function (...a) { const id = stationCiv(), m0 = hubs.metal, r = buy.apply(this, a); if (r && rep(id) >= 300) { const back = Math.round((m0 - hubs.metal) * CFG.trustedRefund); if (back > 0) { hubs.metal = hubs.metal + back; saveState.save(); garage.banner(`TRUSTED · ${civ(id)?.name} returns ${back} metal`, 'good'); } } return r; }; }
    if (window.shipIdentity?.open) { const o = shipIdentity.open; shipIdentity.open = function (...a) { const r = o.apply(this, a); syncLiveries(); return r; }; }
    syncLiveries();
    // the Station jobs door on the dock
    const doors = document.querySelector('#dock-panel .dock-doors'); if (doors && !$('saga-jobs-door')) { const b = btn('Station jobs', () => { hubs.closeDock?.(); window.pilotRpg?.openJournal?.('main'); }, 'saga-jobs-door'); b.dataset.service = 'jobs'; b.dataset.sub = 'Bounties, escorts, defence and courier runs'; doors.append(b); }
    paintTracker(); ready = true;
  }
  // story progress: steps that are checks on the save complete as soon as they are true (one per tick, so each gets its banner)
  function check() { const step = current(); if (!step || step.scene || step.id === 'banner') { paintTracker(); return; } if (step.done?.()) complete(step); else paintTracker(); }
  window.saga = { RIVAL, PAL, TIERS, STEPS, ACTS, CFG, doc, rep, tier, addRep, pledge, offers, takeJob, abandonJob, finishJob, startScene, endScene, routeTo, stepRoute, check, envoyName, get scene() { return scene; }, get current() { return current(); }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 400));
})();
