/* Phone presentation only: reuse the existing buttons, game state and menu owners. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function mount() {
    const root = document.documentElement;
    const fullscreen = document.createElement('button');
    fullscreen.id = 'btn-phone-fullscreen'; fullscreen.type = 'button';
    fullscreen.setAttribute('aria-label', 'Enter fullscreen');
    fullscreen.setAttribute('aria-pressed', 'false');
    const notice = document.createElement('p');
    notice.id = 'phone-screen-notice'; notice.setAttribute('role', 'status'); notice.hidden = true;
    document.body.append(fullscreen, notice);
    let noticeTimer;
    function screenState() {
      const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
      fullscreen.textContent = on ? '↙ Exit' : '⛶ Full';
      fullscreen.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
      fullscreen.setAttribute('aria-pressed', String(on));
      root.classList.toggle('is-fullscreen', on);
    }
    function screenNotice(text) {
      notice.textContent = text; notice.hidden = false;
      clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 8000);
    }
    fullscreen.addEventListener('click', async event => {
      event.stopPropagation();
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) await exit.call(document);
        } else {
          const enter = root.requestFullscreen || root.webkitRequestFullscreen;
          if (!enter) {
            screenNotice('For fullscreen on iPhone: open in Safari, tap Share → Add to Home Screen, then launch the saved game.');
            return;
          }
          await enter.call(root);
        }
        screenState();
      } catch (_) { screenNotice('Fullscreen was blocked. Try opening this page directly in your browser and tap Full again.'); }
    });
    fullscreen.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });
    document.addEventListener('fullscreenchange', screenState);
    document.addEventListener('webkitfullscreenchange', screenState);
    screenState();
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

    const flight = $('mobile-controls');
    const zoom = document.createElement('div'); zoom.id = 'phone-zoom'; zoom.setAttribute('aria-label', 'Camera zoom');
    const zoomReadout = document.createElement('span'); zoomReadout.id = 'phone-zoom-value';
    const updateZoom = () => { zoomReadout.textContent = Math.round(movementFeel.zoom * 100) + '%'; };
    for (const [direction, text, title] of [[-1, '−', 'Zoom out'], [1, '+', 'Zoom in']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.id = direction < 0 ? 'btn-phone-zoom-out' : 'btn-phone-zoom-in';
      button.setAttribute('aria-label', title);
      button.onclick = event => {
        event.stopPropagation();
        movementFeel.zoom = movementFeel.clamp('zoom', Number((movementFeel.zoom + direction * .08).toFixed(2)));
        movementFeel.save(); updateZoom();
      };
      zoom.append(button); if (direction < 0) zoom.append(zoomReadout);
    }
    zoom.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });
    zoom.addEventListener('mousedown', event => event.stopPropagation());
    flight.append(zoom); updateZoom();

    // Fixed twin sticks feed the existing movement and aim path; hull and turret turn rates still apply.
    const sticks = [];
    const aim = { active: false, x: 0, y: 0 };
    const readInput = engine.readInput.bind(engine);
    engine.readInput = () => {
      const input = readInput();
      if (aim.active) {
        input.aimX = engine.player.x + aim.x * 900;
        input.aimY = engine.player.y + aim.y * 900;
        input.fire = Math.hypot(aim.x, aim.y) > .16;
      }
      return input;
    };
    for (const kind of ['move', 'aim']) {
      const stick = document.createElement('div'); stick.id = 'phone-' + kind + '-stick'; stick.className = 'phone-stick';
      stick.setAttribute('role', 'group'); stick.setAttribute('aria-label', kind === 'move' ? 'Movement joystick' : 'Aim and fire joystick');
      const knob = document.createElement('span'); knob.className = 'phone-stick-knob';
      const caption = document.createElement('span'); caption.className = 'phone-stick-caption'; caption.textContent = kind === 'move' ? 'MOVE' : 'AIM / FIRE';
      stick.append(knob, caption); flight.append(stick);
      let pointer = null;
      const reset = () => {
        if (pointer === null) return;
        pointer = null; stick.classList.remove('engaged'); knob.style.transform = 'translate(-50%, -50%)';
        if (kind === 'move') { engine.touch.moveId = null; engine.touch.moveVector = { x: 0, y: 0 }; }
        else { aim.active = false; aim.x = aim.y = 0; engine.touch.aimId = null; engine.touch.aiming = false; engine.mouse.down = false; }
      };
      const move = event => {
        if (event.pointerId !== pointer) return;
        const rect = stick.getBoundingClientRect(), radius = rect.width * .34;
        let x = (event.clientX - rect.left - rect.width / 2) / radius;
        let y = (event.clientY - rect.top - rect.height / 2) / radius;
        const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
        if (length < .12) x = y = 0;
        knob.style.transform = `translate(calc(-50% + ${x * radius}px), calc(-50% + ${y * radius}px))`;
        if (kind === 'move') { engine.touch.moveId = 'phone-move'; engine.touch.moveVector = { x, y }; }
        else { aim.active = true; aim.x = x; aim.y = y; engine.touch.aimId = 'phone-aim'; engine.touch.aiming = true; engine.mouse.down = Math.hypot(x, y) > .16; }
      };
      stick.addEventListener('pointerdown', event => {
        event.stopPropagation(); event.preventDefault();
        if (engine.paused || engine.mapOpen || engine.player.dead || pointer !== null) return;
        pointer = event.pointerId; stick.setPointerCapture(pointer); stick.classList.add('engaged'); move(event);
      });
      stick.addEventListener('pointermove', move);
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, event => {
        if (pointer === event.pointerId) reset();
      });
      for (const name of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup']) stick.addEventListener(name, event => event.stopPropagation(), { passive: true });
      sticks.push(reset);
    }
    const releaseSticks = () => { for (const reset of sticks) reset(); };
    window.addEventListener('blur', releaseSticks);
    document.addEventListener('visibilitychange', releaseSticks);
    new MutationObserver(() => {
      if (engine.paused || engine.mapOpen || !root.classList.contains('mobile-layout')) releaseSticks();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

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
