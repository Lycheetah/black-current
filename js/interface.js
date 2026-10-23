/* Flight UI composition. Keeps the DOM ids used by the existing engine. */
(function () {
  'use strict';
  function mount() {
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
