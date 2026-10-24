/* Flight UI composition. Keeps the DOM ids used by the existing engine. */
(function () {
  'use strict';
  function mountVitals() {
    if (typeof engine === 'undefined') return;
    const hpText = document.getElementById('hud-hp-text');
    const hpFill = document.getElementById('hud-hp-fill');
    const hpRow = hpFill?.closest('.vital-row');
    if (!hpRow || !hpText) return;
    const meters = document.createElement('div'); meters.id = 'flight-vitals';
    meters.setAttribute('role', 'group'); meters.setAttribute('aria-label', 'Hull and shield');
    hpRow.before(meters); meters.append(hpRow);
    hpRow.className = 'flight-meter flight-meter-hull';
    const hpLabel = hpRow.querySelector('.vital-label'); hpLabel.className = 'flight-meter-label'; hpLabel.textContent = 'HP';
    hpText.className = 'flight-meter-value';
    const hpTrack = hpFill.parentElement; hpTrack.classList.add('flight-meter-track');
    hpTrack.id = 'hud-hp-meter'; hpTrack.setAttribute('role', 'progressbar'); hpTrack.setAttribute('aria-label', 'Hull HP'); hpTrack.setAttribute('aria-valuemin', '0');
    const shieldRow = document.createElement('div'); shieldRow.className = 'flight-meter flight-meter-shield';
    shieldRow.innerHTML = '<span class="flight-meter-label">SHIELD</span><span id="hud-shield-text" class="flight-meter-value">0</span><div id="hud-shield-meter" class="bar-track flight-meter-track" role="progressbar" aria-label="Shield HP" aria-valuemin="0"><div id="hud-shield-fill" class="bar-fill"></div></div>';
    meters.append(shieldRow);
    const shieldText = shieldRow.querySelector('#hud-shield-text');
    const shieldTrack = shieldRow.querySelector('#hud-shield-meter');
    const shieldFill = shieldRow.querySelector('#hud-shield-fill');
    let shieldCapacity = 0;
    const finite = value => Number.isFinite(value) ? Math.max(0, value) : 0;
    const write = (el, name, value) => { if (el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value)); };
    function meter(track, fill, text, value, maximum, emptyLabel) {
      const max = finite(maximum), current = Math.min(finite(value), max);
      const count = Math.ceil(current), total = Math.ceil(max);
      const label = total ? `${count} / ${total}` : '0';
      if (text.textContent !== label) text.textContent = label;
      const width = `${max ? current / max * 100 : 0}%`;
      if (fill.style.width !== width) fill.style.width = width;
      write(track, 'aria-valuemax', total || 1); write(track, 'aria-valuenow', count);
      write(track, 'aria-valuetext', current ? label + ' HP' : emptyLabel);
      write(track, 'data-empty', current === 0);
    }
    function paintVitals() {
      const p = engine.player;
      const shield = p.dead ? 0 : finite(p.shieldHp);
      // Learn the real pool from activation; this view never invents shield capacity.
      shieldCapacity = Math.max(shieldCapacity, shield);
      meter(hpTrack, hpFill, hpText, p.dead ? 0 : p.hp, p.maxHp, 'Hull depleted');
      meter(shieldTrack, shieldFill, shieldText, shield, shieldCapacity, shieldCapacity ? 'Shield depleted' : 'Shield inactive');
    }
    const updateHUD = engine.updateHUD.bind(engine);
    engine.updateHUD = (...args) => { const result = updateHUD(...args); paintVitals(); return result; };
    const activate = engine.triggerSecondaryAbility.bind(engine);
    engine.triggerSecondaryAbility = (...args) => {
      const before = finite(engine.player.shieldHp), result = activate(...args);
      if (finite(engine.player.shieldHp) > before) shieldCapacity = finite(engine.player.shieldHp);
      paintVitals(); return result;
    };
    document.documentElement.classList.add('has-flight-vitals'); paintVitals();
  }
  function mount() {
    mountVitals();
    const actions = document.querySelector('.hud-center-actions');
    if (!actions) return;
    document.getElementById('btn-open-designer').textContent = 'Shipyard';
    document.getElementById('btn-open-map').textContent = 'Sector chart';
    document.querySelector('.mass-row .vital-label').textContent = 'RESOURCES';
    const mapTitle = document.querySelector('#map-overlay h2'); if (mapTitle) mapTitle.textContent = 'Sector chart';
    const mapHint = document.querySelector('#map-overlay .modal-header p'); if (mapHint) mapHint.textContent = 'Plan a route. Cross a sector boundary to travel.';
    for (const hint of document.querySelectorAll('.controls-card .ctrl-hint')) if (hint.textContent.includes('Designer')) hint.lastChild.textContent = ' Shipyard';
    function control(id, label, className) {
      const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'btn'; b.textContent = label;
      b.setAttribute('aria-pressed','false'); b.onclick = () => {
        const active = document.body.classList.toggle(className);
        b.setAttribute('aria-pressed',String(active));
      }; actions.append(b); return b;
    }
    control('btn-ui-help','Controls','help-open');
    control('btn-ui-diagnostics','F1','diagnostics-open').setAttribute('aria-label','Toggle flight diagnostics');
    const audio = document.querySelector('.audio-control-widget'); if (audio) actions.append(audio);
    const diagnostics = document.createElement('aside'); diagnostics.id = 'flight-diagnostics';
    diagnostics.setAttribute('aria-label','Flight diagnostics');
    const title = document.createElement('h3'); title.textContent = 'Flight diagnostics · F1 to close'; diagnostics.append(title);
    const stats = document.querySelector('#hud .stats-card'); if (stats) diagnostics.append(stats);
    for (const id of ['sprite-hud','fleet-hud','hardpoint-hud']) {
      const node = document.getElementById(id); if (node) diagnostics.append(node);
    }
    document.body.append(diagnostics);
    const reactorNames = { cilia:'1 PROPULSION', membrane:'2 DEFENCE', stingers:'3 WEAPONS', dormant:'4 RECHARGE' };
    if (window.reactor?.el) {
      for (const [key, node] of Object.entries(reactor.el.pips)) node.textContent = reactorNames[key];
    }
    window.addEventListener('keydown', e => {
      if (e.code === 'F1') { e.preventDefault(); document.getElementById('btn-ui-diagnostics').click(); }
    });
  }
  if (document.readyState === 'complete') mount(); else window.addEventListener('load',mount);
})();
