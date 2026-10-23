/* Phone presentation only: reuse the existing buttons, game state and menu owners. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function mount() {
    const root = document.documentElement;
    const mass = document.querySelector('.mass-row');
    const originalMassParent = mass?.parentNode;
    const originalMassNext = mass?.nextSibling;
    const info = document.querySelector('.organism-info');
    const bar = document.querySelector('.mobile-action-bar');
    if (!bar || !mass || !info) return;

    const labels = {
      'btn-touch-ability': 'Ability', 'btn-touch-pause': 'Pause',
      'btn-touch-designer': 'Shipyard', 'btn-touch-map': 'Chart', 'btn-touch-build': 'Build',
    };
    for (const [id, text] of Object.entries(labels)) {
      const button = $(id);
      if (!button) continue;
      const label = document.createElement('span');
      label.className = 'phone-action-label'; label.textContent = text;
      button.append(label);
      button.setAttribute('title', text);
    }
    $('btn-touch-map')?.setAttribute('aria-label', 'Open sector and galaxy chart');

    const contracts = document.createElement('button');
    contracts.id = 'btn-phone-contracts'; contracts.type = 'button';
    contracts.className = 'touch-action-btn tool-touch-btn';
    contracts.setAttribute('aria-label', 'Show contracts');
    contracts.setAttribute('aria-controls', 'contracts');
    contracts.setAttribute('aria-expanded', 'false');
    const icon = document.createElement('span'); icon.className = 'touch-btn-icon'; icon.textContent = '≡';
    const label = document.createElement('span'); label.className = 'phone-action-label'; label.textContent = 'Jobs';
    contracts.append(icon, label);
    contracts.addEventListener('click', () => {
      const open = document.body.classList.toggle('phone-contracts-open');
      contracts.setAttribute('aria-expanded', String(open));
      contracts.setAttribute('aria-label', open ? 'Hide contracts' : 'Show contracts');
    });
    bar.append(contracts);

    // Scroll/read a HUD drawer without also starting the world joystick.
    for (const id of ['contracts', 'flight-diagnostics']) {
      $(id)?.addEventListener('touchstart', event => {
        if (root.classList.contains('mobile-layout')) event.stopPropagation();
      }, { passive: true });
    }

    const pips = typeof reactor !== 'undefined' ? reactor.el?.pips : null;
    const fullLabels = pips ? Object.fromEntries(Object.entries(pips).map(([id, node]) => [id, node.textContent])) : {};
    const shortLabels = { cilia: 'DRIVE', membrane: 'GUARD', stingers: 'GUNS', dormant: 'CHARGE' };
    let active = null;
    let queued = false;
    function layout() {
      queued = false;
      const width = innerWidth;
      const height = innerHeight;
      const coarse = matchMedia('(pointer: coarse)').matches;
      const phone = width <= 700 || (coarse && Math.min(width, height) <= 600 && Math.max(width, height) <= 1400)
        || (height <= 520 && width <= 1000);
      const visibleHeight = Math.round(window.visualViewport?.height || height);
      root.style.setProperty('--phone-height', `${Math.max(160, visibleHeight)}px`);
      if (phone === active) return;
      active = phone;
      root.classList.toggle('mobile-layout', phone);
      if (phone) info.append(mass);
      else if (originalMassNext?.parentNode === originalMassParent) originalMassParent.insertBefore(mass, originalMassNext);
      else originalMassParent.append(mass);
      for (const [id, node] of Object.entries(pips || {})) node.textContent = phone ? shortLabels[id] : fullLabels[id];
      if (!phone) {
        document.body.classList.remove('phone-contracts-open');
        contracts.setAttribute('aria-expanded', 'false');
        contracts.setAttribute('aria-label', 'Show contracts');
      }
    }
    function requestLayout() {
      if (!queued) { queued = true; requestAnimationFrame(layout); }
    }
    window.addEventListener('resize', requestLayout);
    window.addEventListener('orientationchange', requestLayout);
    window.visualViewport?.addEventListener('resize', requestLayout);
    layout();
  }
  if (document.readyState === 'complete') mount(); else window.addEventListener('load', mount);
})();
