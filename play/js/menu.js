/* ==========================================================================
   F1 · PAUSE + REAL MENUS. Mac, 2026-10-23: "you cant even pause atm".
   ==========================================================================
   One pause flag, `engine.paused`, exactly as before. This file only adds the
   doors to it:
     PAUSE   Esc / P / the ⏸ button / tab hidden → #pause-menu over the frozen world
     TITLE   #title-menu is the front door; the old picker sits behind "New game"
     PANEL   #menu-panel: settings, how to play, credits (from title or pause)
     WHERE   the save remembers sector + position, so Continue lands where you left
   ⚖ Esc closes whatever window is open FIRST (Shipyard, chart, cards), and only
     pauses when nothing else wants it. Other handlers that use Escape mark it with
     preventDefault or stop it outright; this listener loads last and respects both.
   ⚖ A window opened FROM the pause menu (Shipyard, chart, settings) returns to the
     pause menu when it closes, unless it unpaused the game itself (Shipyard "Fly").
   Settings live in the one save doc: `saveState.doc.settings`.
   ========================================================================== */
(() => {
  const $ = id => document.getElementById(id);
  const SETTINGS_DEFAULTS = { master: 0.8, music: 0.7, sfx: 0.9, shake: 1, numbers: true, reducedMotion: false,
    gfxQuality: 'high', gfxParticles: .45, gfxBackdrop: true, gfxNebula: true, gfxDust: true, gfxShipGlow: true,
    gfxBullets: true, gfxAdditive: true, gfxImpact: true, gfxAtmosphere: true, gfxFps: false, gfxFpsCap: 0 };
  /* Graphics presets set the look.js layer switches and the particle cap. */
  const GFX_ON = { gfxBackdrop: true, gfxNebula: true, gfxDust: true, gfxShipGlow: true, gfxBullets: true, gfxAdditive: true, gfxImpact: true, gfxAtmosphere: true };
  const GFX_PRESETS = {
    low:    { gfxParticles: .1,  gfxBackdrop: false, gfxNebula: false, gfxDust: false, gfxShipGlow: false, gfxBullets: false, gfxAdditive: false, gfxImpact: false, gfxAtmosphere: false },
    medium: { gfxParticles: .3,  gfxBackdrop: true,  gfxNebula: false, gfxDust: true,  gfxShipGlow: true,  gfxBullets: true,  gfxAdditive: false, gfxImpact: true,  gfxAtmosphere: true },
    high:   { gfxParticles: .45, ...GFX_ON },
    ultra:  { gfxParticles: 1,   ...GFX_ON },
  };
  const GFX_LOOK = { gfxBackdrop: 'backdrop', gfxNebula: 'nebula', gfxDust: 'dust', gfxShipGlow: 'shipGlow', gfxBullets: 'bullets', gfxAdditive: 'additive', gfxImpact: 'impact', gfxAtmosphere: 'atmosphere' };
  const particleCap = v => Math.round(40 + v * 360);
  const WHERE_SAVE_MS = 5000;

  const menu = window.menu = {
    returnTo: null,          // 'pause' | 'title' while a child window is open
    settings() {
      const s = saveState.doc.settings || (saveState.doc.settings = {});
      for (const k in SETTINGS_DEFAULTS) if (!(k in s)) s[k] = SETTINGS_DEFAULTS[k];
      return s;   /* one object, mutated in place: every slider holds the same one */
    },
    isPaused() { return $('pause-menu').style.display === 'flex'; },
    pause, resume, showTitle, openPanel, closePanel, applySettings, saveWhere,
  };

  /* ── what else is on screen ───────────────────────────────────────────── */
  const shown = id => { const el = $(id); return !!el && el.style.display !== 'none' && el.style.display !== ''; };
  const titleUp = () => shown('title-overlay');
  function otherWindowOpen() {
    return titleUp() || shown('mission-card') || shown('reward-card') || shown('designer-overlay') ||
      engine.mapOpen || (window.shipyard && shipyard.open) || !!$('core-offer') || shown('menu-panel') ||
      shown('dock-panel') || shown('build-panel');
  }
  /* Is the player actually out flying (the only time a pause means anything)? */
  const inFlight = () => !!(saveState.doc.launched && !titleUp());

  /* ── pause ────────────────────────────────────────────────────────────── */
  function paintWhere() {
    const ch = worldMap.getCurrentChamber();
    const zone = typeof graveChoir !== 'undefined' && graveChoir.active;
    const place = zone ? 'Grave Choir' : ch.sys ? `${ch.sys.name} · ${ch.sys.region}` : (typeof BIOMES !== 'undefined' && BIOMES[ch.biome] ? BIOMES[ch.biome].name : 'Open Water');
    const mass = Math.floor(progression.totalMass || 0);
    $('pause-where').textContent = `${place} · Sector ${ch.gridX},${ch.gridY} · Danger ${ch.dangerLevel} · ${mass} mass`;
  }

  function pause() {
    if (!inFlight()) return;
    engine.paused = true;
    engine.mouse.down = false;
    paintWhere();
    $('pause-menu').style.display = 'flex';
    document.body.classList.add('game-paused');
    if (typeof soundEngine !== 'undefined' && soundEngine.duck) soundEngine.duck(true);
    saveWhere(true);
    setTimeout(() => $('btn-pause-resume').focus(), 30);
  }

  function hidePause() {
    $('pause-menu').style.display = 'none';
    document.body.classList.remove('game-paused');
  }

  function resume() {
    hidePause();
    menu.returnTo = null;
    if (typeof soundEngine !== 'undefined' && soundEngine.duck) soundEngine.duck(false);
    if (!otherWindowOpen()) engine.paused = false;
  }

  /* Leave the pause menu for a child window that should come back to it. */
  function fromPause(open) {
    hidePause();
    menu.returnTo = 'pause';
    open();
  }

  /* The watcher: brings the pause menu or title back when a child window closes.
     A 150 ms poll, not a hook into every window, because four different files own
     those windows and each closes itself its own way. Cheap: a few style reads. */
  setInterval(() => {
    /* a window opened over the pause menu (M, Y, Tab): step aside, come back after */
    if (menu.isPaused() && otherWindowOpen()) { hidePause(); menu.returnTo = 'pause'; return; }
    if (!titleUp() && document.body.classList.contains('at-title')) document.body.classList.remove('at-title');
    if (!menu.returnTo || otherWindowOpen()) return;
    if (menu.returnTo === 'pause') {
      if (engine.paused) { menu.returnTo = null; pause(); }
      else { menu.returnTo = null; hidePause(); }   // the window unpaused the game itself (Fly)
    } else if (menu.returnTo === 'title') {
      menu.returnTo = null;
      if (!saveState.doc.launched || engine.paused) showTitle();
    }
  }, 150);

  /* ── title ────────────────────────────────────────────────────────────── */
  function paintContinue() {
    const d = saveState.doc, p = saveState.profile;
    const returning = !!(d.launched && p.callsign);
    $('btn-title-continue').style.display = returning ? '' : 'none';
    const card = $('title-continue-card');
    card.style.display = returning ? '' : 'none';
    $('btn-menu-new').classList.toggle('primary', !returning);
    if (!returning) return;
    card.textContent = '';
    const crew = (typeof CREWS !== 'undefined' && (CREWS[p.crew] || CREWS.ironwake)) || { name: '' };
    const w = d.where || { gx: 0, gy: 0 };
    const ship = d.design && (d.design.id || d.design.frame) ? (d.design.id || d.design.frame) : 'starter hull';
    const rows = [
      ['PILOT', `${p.callsign} · ${crew.name}`],
      ['SHIP', String(ship).replace(/[_-]+/g, ' ').toUpperCase()],
      ['WHERE', w.sys && w.sys !== 'home' && window.galaxy && galaxy.data && galaxy.data.byId[w.sys]
        ? `${galaxy.data.byId[w.sys].name} · ${w.gx},${w.gy}` : `${w.gx},${w.gy}${w.gx === 0 && w.gy === 0 ? ' · Asterion Forge' : ' · home system'}`],
      ['MASS', `${Math.floor(d.totalMass || 0)} · Lv.${d.evolutionLevel || 1}`],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      const dt = document.createElement('span'); dt.textContent = k;
      const dd = document.createElement('strong'); dd.textContent = v;
      row.append(dt, dd); card.append(row);
    }
  }

  function showTitle() {
    hidePause();
    engine.paused = true;
    engine.mouse.down = false;
    $('title-overlay').style.display = 'flex';
    $('title-overlay').classList.add('menu-mode');
    document.body.classList.add('at-title');
    $('title-menu').style.display = '';
    $('title-newgame').style.display = 'none';
    paintContinue();
    if (typeof soundEngine !== 'undefined' && soundEngine.duck) soundEngine.duck(true);
    setTimeout(() => { const b = $('btn-title-continue').style.display === 'none' ? $('btn-menu-new') : $('btn-title-continue'); b.focus(); }, 40);
  }

  function showNewGame() {
    $('title-menu').style.display = 'none';
    $('title-newgame').style.display = '';
    $('title-overlay').classList.remove('menu-mode');
    $('title-newgame-note').style.display = saveState.doc.launched ? '' : 'none';
    setTimeout(() => $('title-callsign').focus(), 40);
  }

  /* ── where you are: saved, so Continue lands there ────────────────────── */
  let lastWhere = 0;
  function saveWhere(force) {
    if (!saveState.doc.launched || engine.player.dead) return;
    if (typeof graveChoir !== 'undefined' && graveChoir.active) return;   // a zone is a run; you resume outside it
    const now = performance.now();
    if (!force && now - lastWhere < WHERE_SAVE_MS) return;
    lastWhere = now;
    saveState.doc.where = { gx: worldMap.currentGridX, gy: worldMap.currentGridY,
      x: Math.round(engine.player.x), y: Math.round(engine.player.y),
      sys: (window.galaxy && galaxy.currentId) || 'home' };
    saveState.save();
  }

  /* ── panels: settings / how to play / credits ─────────────────────────── */
  let panelFrom = null;
  function openPanel(kind, from) {
    panelFrom = from;
    const body = $('menu-panel-body');
    body.textContent = '';
    $('menu-panel-title').textContent = { settings: 'Settings', howto: 'How to play', credits: 'Credits', changelog: "What's new" }[kind];
    ({ settings: buildSettings, howto: buildHowTo, credits: buildCredits, changelog: buildChangelog })[kind](body);
    $('menu-panel').style.display = 'flex';
    setTimeout(() => $('btn-panel-back').focus(), 30);
  }
  function closePanel() {
    $('menu-panel').style.display = 'none';
    /* from pause, the watcher brings the pause menu back; the title never left */
    if (panelFrom === 'pause') menu.returnTo = 'pause';
    panelFrom = null;
  }

  function slider(host, key, label, fmt) {
    const s = menu.settings();
    const row = document.createElement('label'); row.className = 'set-row';
    const name = document.createElement('span'); name.textContent = label;
    const input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 100; input.step = 5; input.value = Math.round(s[key] * 100);
    input.id = 'set-' + key;
    const out = document.createElement('output'); out.textContent = fmt(s[key]);
    input.addEventListener('input', () => {
      s[key] = input.value / 100; out.textContent = fmt(s[key]);
      applySettings(); saveState.save();
      if (key === 'sfx' && typeof soundEngine !== 'undefined') soundEngine.playBubblePop('small');
    });
    row.append(name, input, out); host.append(row);
  }
  function toggle(host, key, label, hint) {
    const s = menu.settings();
    const row = document.createElement('label'); row.className = 'set-row toggle';
    const name = document.createElement('span'); name.textContent = label;
    if (hint) { const h = document.createElement('em'); h.textContent = hint; name.append(h); }
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!s[key]; input.id = 'set-' + key;
    input.addEventListener('change', () => { s[key] = input.checked; applySettings(); saveState.save(); });
    row.append(name, input); host.append(row);
  }
  const pct = v => Math.round(v * 100) + '%';

  function buildSettings(body) {
    const h = t => { const e = document.createElement('h3'); e.className = 'set-head'; e.textContent = t; body.append(e); };
    h('Sound');
    slider(body, 'master', 'Master', pct);
    slider(body, 'music', 'Music', pct);
    slider(body, 'sfx', 'Effects', pct);
    h('Feel');
    slider(body, 'shake', 'Screen shake', v => v === 0 ? 'off' : pct(v));
    toggle(body, 'numbers', 'Damage numbers');
    toggle(body, 'reducedMotion', 'Reduced motion', 'no shake, no kill freeze, softer flashes');
    h('Graphics');
    const s = menu.settings();
    const presets = document.createElement('div'); presets.className = 'gfx-presets'; presets.setAttribute('role', 'group'); presets.setAttribute('aria-label', 'Graphics quality');
    for (const q of ['low', 'medium', 'high', 'ultra']) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'gfx-' + q; b.dataset.gfx = q;
      b.textContent = q[0].toUpperCase() + q.slice(1); b.setAttribute('aria-pressed', String(s.gfxQuality === q));
      b.onclick = () => { Object.assign(s, GFX_PRESETS[q], { gfxQuality: q }); applySettings(); saveState.save(); body.textContent = ''; buildSettings(body); };
      presets.append(b);
    }
    body.append(presets);
    const custom = key => { const el = $('set-' + key); if (el) el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
      s.gfxQuality = 'custom'; for (const b of presets.children) b.setAttribute('aria-pressed', 'false'); saveState.save(); }); };
    slider(body, 'gfxParticles', 'Particles', v => particleCap(v) + ' max'); custom('gfxParticles');
    for (const [key, label, hint] of [['gfxShipGlow', 'Ship glow'], ['gfxBullets', 'Glowing shots'], ['gfxAdditive', 'Additive light', 'brighter sparks and trails'],
      ['gfxImpact', 'Impact flashes'], ['gfxBackdrop', 'Deep backdrop'], ['gfxNebula', 'Nebula'], ['gfxDust', 'Drifting dust'], ['gfxAtmosphere', 'Living water', 'light shafts, plankton, weather']]) { toggle(body, key, label, hint); custom(key); }
    toggle(body, 'gfxFps', 'Show FPS');
    const capLabel = document.createElement('p'); capLabel.className = 'gfx-cap-label'; capLabel.textContent = 'Frame limit · lower saves battery and heat';
    const caps = document.createElement('div'); caps.className = 'gfx-presets'; caps.setAttribute('role', 'group'); caps.setAttribute('aria-label', 'Frame limit');
    for (const cap of [0, 30, 60, 120]) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'gfx-cap-' + cap; b.textContent = cap ? cap + ' fps' : 'Off';
      b.setAttribute('aria-pressed', String((s.gfxFpsCap || 0) === cap));
      b.onclick = () => { s.gfxFpsCap = cap; applySettings(); saveState.save(); for (const c of caps.children) c.setAttribute('aria-pressed', String(c === b)); };
      caps.append(b);
    }
    body.append(capLabel, caps);
    /* 2.5.1: a way out when an old save loads a ship wrong. Two taps, so a stray thumb cannot do it. */
    h('Ship');
    const resetNote = document.createElement('p'); resetNote.className = 'gfx-cap-label';
    resetNote.textContent = 'For a ship that loads wrong from an old save. Mounted fittings go back to your hold; mass and progress stay.';
    const reset = document.createElement('button'); reset.type = 'button'; reset.id = 'set-reset-ship'; reset.className = 'set-reset';
    reset.textContent = 'Reset ship to starter';
    let armedAt = 0;
    reset.onclick = () => {
      if (Date.now() - armedAt > 4000) { armedAt = Date.now(); reset.textContent = 'Tap again to reset your ship'; return; }
      armedAt = 0;
      reset.textContent = engine.resetToStarter() ? 'Ship reset ✓ fittings are in your hold' : 'Reset failed: no starter hull found';
    };
    body.append(resetNote, reset);
  }

  function buildHowTo(body) {
    const touch = engine.touch && engine.touch.isTouchDevice;
    const keys = touch ? [
      ['Left thumb', 'move (the stick appears where you touch)'],
      ['Right thumb', 'aim and fire'],
      ['Ability button', 'your secondary ability'],
      ['⏸', 'pause'],
    ] : [
      ['W A S D', 'move (W is always up)'],
      ['Mouse', 'aim · hold to fire. Every gun aims from its own mount'],
      ['Space / Q', 'secondary ability'],
      ['1 2 3 4', 'reactor: propulsion · defence · weapons · recharge'],
      ['Y / Tab', 'Shipyard: build your ship'],
      ['M', 'sector chart'],
      ['Esc / P', 'pause'],
    ];
    const dl = document.createElement('dl'); dl.className = 'howto-keys';
    for (const [k, v] of keys) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.append(dt, dd);
    }
    body.append(dl);
    const lines = [
      ['Travel between systems.', 'Open Chart, expand Travel & docking, choose a known destination and Plot gate route. Close the chart and follow the bearing to the named sector; fly into its jump gate to cross systems.'],
      ['Find a refit station.', 'Chart → Travel & docking → Find local refit station. Every visited normal system has a public refit berth at sector 0,0; hubs have their anchorage there. In that sector use Approach & dock. Move manually to cancel.'],
      ['Understand fitting.', 'Metal is spendable currency. GP is fitting capacity, not gold. A blueprint is a preview: review its fabrication bill and Apply at a station to change your flying ship.'],
      ['Danger is distance.', 'Home is Asterion Forge at sector 0,0. The ring around it is the learning ground; every ring further out is harder. The chart (M) colours each sector by danger.'],
      ['Shoot the parts off.', 'Ships lose guns, spikes and thrusters before they die, and so do you. Shot-off parts drop as salvage you can build with.'],
      ['Death is a trip home.', 'You wake at the Forge with your ship. The mass you lost waits in your wreck: fly back and touch it.'],
      ['Chain your kills.', 'Kill fast to chain. At x8 your guns run hot (OVERDRIVE).'],
    ];
    for (const [b, t] of lines) {
      const p = document.createElement('p'); p.className = 'howto-line';
      const s = document.createElement('strong'); s.textContent = b + ' ';
      p.append(s, document.createTextNode(t)); body.append(p);
    }
  }

  function buildCredits(body) {
    const updates=document.createElement('button');updates.type='button';updates.id='btn-release-notes';updates.className='btn';updates.style.minHeight='44px';updates.textContent="What's new in 2.10.1";updates.onclick=()=>openPanel('changelog',panelFrom);body.append(updates);
    const lines = [
      ['BLACK CURRENT', 'title'],
      ['Game direction, design and authorship', 'k'],
      ['Mackenzie Conor James Clark', 'v'],
      ['World and lore', 'k'],
      ['his Sovereign Eclipse canon', 'v'],
      ['Built with', 'k'],
      ['AI collaborators, working to his calls', 'v'],
      ['Sound', 'k'],
      ['every note synthesised live; no samples', 'v'],
    ];
    for (const [t, c] of lines) { const p = document.createElement('p'); p.className = 'credit-' + c; p.textContent = t; body.append(p); }
  }

  function buildChangelog(body) {
    const heading=document.createElement('h3');heading.textContent='2.10.1 · Rookie waters · 26 October 2026';body.append(heading);
    const list=document.createElement('ul');
    for(const text of[
      'The gold starter button now adds and fits both guns and the engine before Launch. Home sectors have gentler fights, and local charts have three extra rings.',
      'Enemy roles have distinct layouts and larger outer hulls. Light weapons have stronger base DPS, and equipment drops are rarer while boss/quest rewards remain.',
      'Build your first ship from a supplied kit, or quick launch a civilisation premade. Both start with two guns; the starter frame allows ten sections and four weapons.',
      'Fifteen novice guns cost 4–16 metal. Ordinary weapons are bought once, with no separate research charge. Special discoveries and capital technology retain research.',
      'Swap owned weapons and modules in the field. Stations sell new hardware and rebuild hull sections. Field refits preserve damage.',
      'The station has a compact service grid. The first recovery job pays a real pulse gun, and the automatic vow system has been retired.',
      'Your ship lists every slot and its installed fitting. Choose a slot to see everything that fits it; tap once to fit.',
      'Equipment and armour use compact scrolling rows with art, power, prices and ownership. The shop filters by family, size and ownership.',
      'Ship frames show section, slot and power limits plus their biomass, rank and frame-price requirements. Armour casings can fit over a weapon deck.',
      'Metal and Biomass are both visible on the main HUD. The wallet also shows unspent talent/reactor points and actual module capacity with distinct symbols.',
      'Phone fitting has separate Ship, Parts, Fit, Ships and Training panels. The ship stays clear of the equip list and Apply controls.',
      'Tap a hull section to fit it, or select it from Your ship. Turn, move, remove and unfit controls remain visible.',
      'Tap the minimap for the chart. Gate and refit markers, sector coordinates and a route bearing help you navigate.',
      'Navigation has an X to clear a route; docking clears refit guidance. The quest journal has an explicit Close button.',
      'This update preserves your new modular campaign. No further development reset.',
      'Fifteen canon-named two-gun novice frigates are available for quick launch; building your own ship is the primary path.',
      'Modular fitting is the shipyard. The old freeform screen is retired. Nine new turret sprites and nine supplied section sprites share the menu, fitting and flight renderer.',
      'Scouts, pursuers, armoured chargers, artillery and drone tenders fly faction hulls. Real gates lead into the 96-system galaxy.',
      'Training grounds at sector 1,0 of your home system scale to your fitted guns. Ten targets pay one metal; no loot, mastery or quest farming.',
      'Recovered modules and rare weapon traits reach the modular hangar. Owned variants are limited by recovered copies. Select a compatible slot to fit them.',
      'Battery sounds merge repeated same-family reports and leave room for warnings. Phone feel and sustained frame pacing still need your playtest.',
    ]){const item=document.createElement('li');item.textContent=text;item.style.marginBottom='12px';list.append(item);}body.append(list);
    const next=document.createElement('p');next.textContent='Next: combat FPS, early-game pacing, hull specialisations and richer PvE encounters.';body.append(next);
    const link=document.createElement('a');link.href='https://github.com/Lycheetah/black-current/blob/main/CHANGELOG.md';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Full changelog';link.style.cssText='color:#a2ece1;display:inline-block;min-height:44px;padding:10px 0';body.append(link);
  }

  /* ── F2 first-run tips: three, once each, never a modal ─────────────────── */
  const TIPS = {
    fly:     'WASD to move · aim with the mouse · hold to fire. Esc pauses.',
    part:    'You shot a part off. Ships lose guns before they die, and so do you. Grab the salvage.',
    wreck:   'Your lost mass waits in your wreck. Follow the gold bearing and touch it to take it back.',
    touchfly:'Left thumb moves · right thumb aims and fires · ⏸ pauses.',
  };
  let tipEl = null, tipTimer = 0;
  function tip(key, delay = 0) {
    const seen = saveState.doc.tips || (saveState.doc.tips = {});
    if (key === 'fly' && engine.touch && engine.touch.isTouchDevice) key = 'touchfly';
    if (seen[key]) return;
    seen[key] = true; saveState.save();
    setTimeout(() => {
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'first-tip'; tipEl.setAttribute('role', 'status'); document.body.append(tipEl); }
      tipEl.textContent = TIPS[key];
      tipEl.classList.add('on');
      clearTimeout(tipTimer); tipTimer = setTimeout(() => tipEl.classList.remove('on'), 7000);
    }, delay);
  }
  menu.tip = tip;

  /* ── apply settings ───────────────────────────────────────────────────── */
  const baseHitStop = (window.JUICE && JUICE.hitStopMs) || 55;
  function applySettings() {
    const s = menu.settings();
    if (typeof soundEngine !== 'undefined' && soundEngine.setMix) soundEngine.setMix({ master: s.master, music: s.music, sfx: s.sfx });
    if (window.JUICE) {
      JUICE.shake = s.reducedMotion ? 0 : s.shake;
      JUICE.hitStopMs = s.reducedMotion ? 0 : baseHitStop;
    }
    if (window.hunt) hunt.showNumbers = s.numbers;
    document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
    if (window.look) for (const [key, layer] of Object.entries(GFX_LOOK)) look.cfg[layer] = !!s[key];
    if (typeof MAX_PARTICLES !== 'undefined') MAX_PARTICLES = particleCap(s.gfxParticles);
    let fps = $('fps-overlay');
    if (s.gfxFps && !fps) {
      fps = document.createElement('div'); fps.id = 'fps-overlay'; fps.setAttribute('aria-hidden', 'true'); document.body.append(fps);
      fps._t = setInterval(() => { fps.textContent = engine.fps + ' fps'; }, 500);
    } else if (!s.gfxFps && fps) { clearInterval(fps._t); fps.remove(); }
    engine.fpsCap = s.gfxFpsCap || 0;
    engine._needsRender = true;
  }

  /* ── wiring ───────────────────────────────────────────────────────────── */
  function click(id, fn) { const el = $(id); if (el) el.addEventListener('click', e => { e.stopPropagation(); ui(); fn(); }); }
  const ui = () => { if (typeof soundEngine !== 'undefined') { soundEngine.init(); soundEngine.playBubblePop('small'); } };

  function install() {
    applySettings();

    /* Continue lands where the save left off: put the ship there BEFORE the
       garage enters the chamber. A new game starts at the Forge. */
    const baseLaunch = garage.launch.bind(garage);
    garage.launch = (isContinue) => {
      const w = saveState.doc.where;
      const G = window.galaxy && galaxy.data ? galaxy : null;
      if (G) G.enterSystemById(isContinue && w && w.sys ? w.sys : 'home');   // F3b: back into the right system first
      if (isContinue && w && Number.isFinite(w.gx) && Math.abs(w.gx) <= worldMap.size && Math.abs(w.gy) <= worldMap.size) {
        worldMap.currentGridX = w.gx; worldMap.currentGridY = w.gy;
        engine.player.x = w.x || 0; engine.player.y = w.y || 0;
        engine.player.vx = engine.player.vy = 0;
        engine.camera.x = engine.player.x - engine.viewportWidth / engine.camera.zoom / 2;
        engine.camera.y = engine.player.y - engine.viewportHeight / engine.camera.zoom / 2;
      } else if (!isContinue) {
        worldMap.currentGridX = worldMap.currentGridY = 0;
        engine.player.x = engine.player.y = 0;
        delete saveState.doc.where;
      }
      const r = baseLaunch(isContinue);
      if (!titleUp()) tip('fly', 1500);
      if (!titleUp()) {
        $('title-overlay').classList.remove('menu-mode');
        document.body.classList.remove('at-title');
        if (typeof soundEngine !== 'undefined' && soundEngine.duck) soundEngine.duck(false);
        saveWhere(true);
      }
      return r;
    };

    /* where: on every sector entry, every few seconds of flight, and on the way out */
    const baseEnter = engine.enterChamber.bind(engine);
    engine.enterChamber = (opts) => { const r = baseEnter(opts); saveWhere(true); return r; };
    const baseUpdate = engine.update.bind(engine);
    engine.update = (dt) => { baseUpdate(dt); if (!engine.paused) saveWhere(false); };
    window.addEventListener('pagehide', () => saveWhere(true));

    /* the other two tips fire on the moment they explain */
    if (engine.loseNode) {
      const baseLose = engine.loseNode.bind(engine);
      engine.loseNode = (ship, node, ...rest) => { const r = baseLose(ship, node, ...rest); if (ship !== engine.player) tip('part', 400); return r; };
    }
    const baseRespawn = engine.playerRespawn.bind(engine);
    engine.playerRespawn = () => { const r = baseRespawn(); if (saveState.doc.wreck) tip('wreck', 1800); return r; };

    /* title doors */
    /* ⚖ ONE Continue: the original button (garage.js already wires it to
       launch(true), witnesses click it) moves to the front door. */
    const cont = $('btn-title-continue'), doors = document.querySelector('#title-menu .tm-doors');
    if (cont && doors) { cont.className = 'tm-door primary'; cont.textContent = 'Continue'; doors.prepend(cont); }
    click('btn-menu-new', showNewGame);
    click('btn-newgame-back', showTitle);
    click('btn-menu-builder', () => {
      $('title-overlay').style.display = 'none';
      menu.returnTo = 'title';
      if (window.bay && bay.show) bay.show(); else if (window.shipyard) shipyard.show();
    });
    click('btn-menu-settings', () => openPanel('settings', 'title'));
    click('btn-menu-howto', () => openPanel('howto', 'title'));
    click('btn-menu-credits', () => openPanel('credits', 'title'));

    /* pause doors */
    click('btn-pause-resume', resume);
    click('btn-pause-shipyard', () => fromPause(() => { if (window.bay && bay.show) bay.show(); else shipyard.show(); }));
    click('btn-pause-chart', () => fromPause(() => engine.toggleMapModal()));
    click('btn-pause-settings', () => { hidePause(); openPanel('settings', 'pause'); });
    click('btn-pause-howto', () => { hidePause(); openPanel('howto', 'pause'); });
    click('btn-pause-quit', () => { saveWhere(true); menu.returnTo = null; showTitle(); });
    click('btn-panel-back', closePanel);
    click('btn-touch-pause', () => menu.isPaused() ? resume() : pause());

    /* a visible Menu door on the HUD, beside Shipyard and Chart */
    const actions = document.querySelector('.hud-center-actions');
    if (actions && !$('btn-open-menu')) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'btn-open-menu'; b.className = 'btn'; b.textContent = 'Menu';
      b.title = 'Pause (Esc / P)';
      b.addEventListener('click', e => { e.stopPropagation(); pause(); });
      actions.prepend(b);
    }

    window.addEventListener('keydown', e => {
      const field = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox';
      const isEsc = e.code === 'Escape', isP = e.code === 'KeyP' && !field && !e.ctrlKey && !e.metaKey;
      if (!isEsc && !isP) return;
      if (e.defaultPrevented) return;                        // another window already used this key
      if (shown('menu-panel')) { e.preventDefault(); closePanel(); return; }
      if (menu.isPaused()) { e.preventDefault(); resume(); return; }
      if (titleUp()) {
        if (isEsc && $('title-newgame').style.display !== 'none') { e.preventDefault(); showTitle(); }
        return;
      }
      if (engine.mapOpen) { if (isEsc) { e.preventDefault(); engine.toggleMapModal(); } return; }
      if (otherWindowOpen()) return;
      e.preventDefault();
      pause();
    });

    /* leaving the tab pauses with the menu up, so you come back to a choice, not a corpse */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !engine.paused && !otherWindowOpen()) pause();
    });

    /* the front door replaces the old title on boot */
    if (titleUp()) showTitle();
  }

  if (window.garage && window.engine) install(); else window.addEventListener('load', install);
})();
