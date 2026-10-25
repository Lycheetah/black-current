/* CIVILISATIONS AT THE START (docs/PLAN.md #1). Mac, 2026-10-25: "implement the civilizations at the start
   screen ... everyone can start in different zones".
   - The title screen offers the 15 canon civilisations (js/canon.js) plus UNALIGNED (the classic Asterion start).
   - Each civilisation owns one home system: a calm system (danger <= 3, no weird rule) in its own slice of the
     galaxy, picked from the seed, so the same seed gives the same homes and no two civilisations share one.
   - That system becomes a hub for this save: an anchorage to dock at and wake at.
   - The choice leans the starter hull toward the civilisation's fleet (you can still pick another hull).
   Save: `saveState.profile.civ` (the remembered pick), `saveState.doc.civ` + `saveState.doc.civHome` (this run).
   ⚖ Lore is canon text only (docs/canon). System names stay designations (galaxy.js law). */
(function () {
  const HULL = { 'savanah': 'crimson_blood', 'sol-symbiots': 'cosmic_light', 'chaos': 'chaos', 'cosmic-darkness': 'black_hole',
    'cosmic-light': 'cosmic_light', 'blackhole': 'black_hole', 'hybrid-fused': 'ironwake', 'human-hunters': 'crimson_blood',
    'ai-hunters': 'ai_hunters', 'amethyst-angels': 'techno_angels', 'techno-angels': 'techno_angels', 'ai-gods': 'ai_hunters',
    'pagan-ai': 'black_hole', 'ai': 'ironwake', 'ai-human-gods': 'cosmic_light' };
  const INK = [['EMERALD', '#3fd28b'], ['GOLD', '#e8c478'], ['AMETHYST', '#b58cff'], ['VIOLET', '#a070ff'], ['PURPLE', '#a070ff'],
    ['CRIMSON', '#ff5a6a'], ['RED', '#ff5a5a'], ['BLOOD', '#ff5a5a'], ['CYAN', '#5ef2e0'], ['TEAL', '#5ef2e0'], ['WHITE', '#eef4ff'],
    ['SILVER', '#c8d2dc'], ['BLUE', '#6fa0ff'], ['ORANGE', '#ff8c42'], ['AMBER', '#ffb347'], ['GREEN', '#39ff14'], ['CHROME', '#d0d8e0']];
  const tint = c => (INK.find(([w]) => (c.fleetDNA || '').toUpperCase().includes(w)) || [0, '#8fd8cc'])[1];
  const list = () => (window.canon && canon.civilisations) || [];
  const byId = id => list().find(c => c.id === id) || null;

  /* one calm home per civilisation, spread round the galaxy by canon order */
  let homesFor = null, homes = {};
  function computeHomes() {
    if (!window.galaxy || !galaxy.data) return {};
    if (homesFor === galaxy.data) return homes;
    const R = galaxy.CFG.radius, used = new Set(), out = {};
    const pool = galaxy.data.systems.filter(s => !s.home && !s.rule && s.danger <= 3);
    const civs = list().slice().sort((a, b) => a.order - b.order);
    civs.forEach((c, i) => {
      const want = (i / civs.length) * Math.PI * 2;
      let best = null, cost = Infinity;
      for (const s of pool) {
        if (used.has(s.id)) continue;
        let da = Math.abs(Math.atan2(s.y, s.x) - want); if (da > Math.PI) da = Math.PI * 2 - da;
        const k = da + (s.danger - 1) * 0.35 + Math.abs(Math.hypot(s.x, s.y) / R - 0.3);
        if (k < cost) { cost = k; best = s; }
      }
      if (best) { used.add(best.id); out[c.id] = best.id; }
    });
    homesFor = galaxy.data; homes = out;
    return out;
  }

  /* the home system is a hub for this save: dock at its anchorage, wake there */
  function claimHub(id) {
    const s = galaxy.data && galaxy.data.byId[id];
    if (!s || s.home) return;
    s.hub = true; s.civHome = saveState.doc.civ;
    if (!galaxy.data.hubs.includes(id)) galaxy.data.hubs.push(id);
  }

  function goHome() {
    const id = saveState.doc.civHome;
    if (!id || !galaxy.data || !galaxy.data.byId[id]) return false;
    claimHub(id);
    galaxy.enterSystemById(id);
    worldMap.currentGridX = 0; worldMap.currentGridY = 0;
    const P = engine.player;
    Object.assign(P, { x: 0, y: 260, vx: 0, vy: 0, iFrames: Math.max(P.iFrames || 0, 60) });
    engine.projectiles.length = 0;
    engine.camera.x = P.x - engine.viewportWidth / engine.camera.zoom / 2;
    engine.camera.y = P.y - engine.viewportHeight / engine.camera.zoom / 2;
    engine.enterChamber({ silent: true });
    const c = byId(saveState.doc.civ), s = galaxy.current;
    if (c && window.garage) garage.banner(`${c.name} home · ${s.name} anchorage · ${c.motto}`, 'good');
    return true;
  }

  function render() {
    const box = document.getElementById('title-civs'), note = document.getElementById('title-civ-note');
    if (!box || !list().length) return;
    const pick = currentPick(), H = computeHomes();
    box.innerHTML = '';
    const tile = (id, name, sub, ink) => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'choice-tile civ' + (pick === id ? ' active' : '');
      b.dataset.civ = id || ''; b.setAttribute('aria-pressed', String(pick === id));
      b.style.setProperty('--tile-accent', ink);
      const n = document.createElement('strong'); n.textContent = name;
      const e = document.createElement('span'); e.className = 'tile-feel'; e.textContent = sub;
      b.append(n, e);
      b.addEventListener('click', () => choose(id));
      box.append(b);
    };
    tile(null, 'Unaligned', 'Asterion Forge', '#8fd8cc');
    list().forEach(c => tile(c.id, c.name, c.epithet, tint(c)));
    if (!note) return;
    const c = byId(pick);
    if (!c) { note.textContent = 'No banner. You launch from Asterion Forge, the classic start.'; return; }
    const s = galaxy.data && galaxy.data.byId[H[c.id]];
    note.innerHTML = '';
    const m = document.createElement('strong'); m.textContent = `“${c.motto}”`;
    const d = document.createElement('span'); d.textContent = ` ${c.fleetDoctrine}. Weapons: ${c.weapon}.`;
    const h = document.createElement('em'); h.textContent = s ? ` You begin at ${s.name} in ${s.region}, danger ${s.danger}.` : '';
    note.append(m, d, h);
  }

  /* The pick lives in the profile AND in its own key: a NEW CAMPAIGN (fresh-campaign.js) rebuilds the profile
     without it and relaunches as Continue after a reload. */
  const PICK = 'blackCurrent.civPick';
  function currentPick() {
    let id = saveState.profile.civ;
    if (id === undefined) { try { id = localStorage.getItem(PICK); } catch (e) { id = null; } }
    return byId(id) ? id : null;
  }
  function choose(id) {
    saveState.profile.civ = id;
    try { id ? localStorage.setItem(PICK, id) : localStorage.removeItem(PICK); } catch (e) { /* the profile still holds it */ }
    const hull = id && HULL[id];
    if (hull && typeof HULL_STYLES !== 'undefined' && HULL_STYLES[hull] && saveState.profile.hullStyle !== hull) {
      const btn = [...document.querySelectorAll('#title-hulls .choice-tile')][Object.keys(HULL_STYLES).indexOf(hull)];
      if (btn) btn.click(); else saveState.profile.hullStyle = hull;
    }
    try { soundEngine.init(); soundEngine.playBubblePop('small'); } catch (e) { /* sound is optional */ }
    render();
  }

  function install() {
    if (typeof garage === 'undefined' || !garage.launch || !window.galaxy || !galaxy.data || typeof engine === 'undefined' || !engine.player || !window.canon) { setTimeout(install, 60); return; }
    const launch = garage.launch;
    garage.launch = function (continuing) {
      const r = launch.apply(this, arguments);
      const title = garage.el && garage.el.title;
      if (!saveState.doc.launched || (title && title.style.display !== 'none')) return r;   // the launch was refused or deferred
      if (!continuing || !('civ' in saveState.doc)) {   // a new run, or a fresh campaign relaunching after its reload
        const civ = currentPick();
        saveState.doc.civ = civ; saveState.doc.civHome = civ ? computeHomes()[civ] || null : null;
        saveState.save();
      }
      if (saveState.doc.civHome && goHome()) saveState.save();
      return r;
    };
    if (saveState.doc.civHome) claimHub(saveState.doc.civHome);
    render();
    window.civilisations = { list, byId, homes: computeHomes, goHome, choose, render, HULL };
  }
  install();
})();
