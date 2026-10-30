/* PHONE TIDY (Mac's playtest list, 2026-10-30, items 33-38: the dock prompt covered controls and said "· E" on a touch
 * screen, the pause hint showed a broken glyph, and too many buttons squeezed the play area: zoom −/+, Hold, Sonar,
 * Lock, four doctrines, Cruise, six actions and two sticks). On phones:
 *   - the four ship-system doctrines show only the one in use; tap it to pick another (the four open, then close)
 *   - Hold, Sonar and Lock live in a "⋯" tray next to the zoom; one tap opens it
 *   - the dock prompt reads "tap to dock" (hubs.js; it always was a button), the pause hint says "the Pause button" (menu.js)
 * Every control is still one tap away; desktop is unchanged. */
(() => {
  'use strict';
  const TRAY = ['btn-phone-hold', 'btn-phone-sonar', 'btn-target-lock'];
  let ready = false, more = null;
  const phone = () => document.documentElement.classList.contains('mobile-layout');
  function tray() {
    const host = document.getElementById('phone-zoom'); if (!host) return;
    if (!more) {
      more = document.createElement('button'); more.type = 'button'; more.id = 'btn-phone-more'; more.textContent = '⋯';
      more.setAttribute('aria-label', 'More: hold, sonar, target lock'); more.setAttribute('aria-expanded', 'false');
      for (const t of ['pointerdown', 'mousedown', 'touchstart']) more.addEventListener(t, e => e.stopPropagation(), { passive: true });
      more.addEventListener('click', e => { e.stopPropagation(); setTray(!host.classList.contains('tray-open')); });
      const zin = document.getElementById('btn-phone-zoom-in'); (zin || host.lastChild)?.after(more);
    }
    for (const id of TRAY) { const b = document.getElementById(id); if (b && !b.classList.contains('phone-tray-item')) { b.classList.add('phone-tray-item'); b.addEventListener('click', () => setTimeout(() => setTray(false), 0)); } }
  }
  // the tray drops down as a column under ⋯, above the HUD, and closes after a pick
  function setTray(open) {
    const host = document.getElementById('phone-zoom'); if (!host || !more) return;
    host.classList.toggle('tray-open', open); more.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('phone-tray-open', open);   // the dock prompt steps aside while the tray is open
    if (!open) return; const r = more.getBoundingClientRect();
    TRAY.forEach((id, i) => { const b = document.getElementById(id); if (b) { b.style.left = r.left + 'px'; b.style.top = (r.bottom + 4 + i * 48) + 'px'; } });
  }
  function doctrines() {
    const hud = document.getElementById('phone-reactor'); if (!hud || hud.dataset.tidy) return;
    hud.dataset.tidy = '1';
    // capture: the first tap on the doctrine in use opens the picker instead of re-selecting it
    hud.addEventListener('click', e => {
      if (!phone()) return; const b = e.target.closest('button[id^=btn-reactor-]'); if (!b) return;
      if (!hud.classList.contains('picking') && b.getAttribute('aria-pressed') === 'true') { e.stopImmediatePropagation(); e.preventDefault(); hud.classList.add('picking'); return; }
      setTimeout(() => hud.classList.remove('picking'), 0);
    }, true);
  }
  function install() {
    if (!document.getElementById('phone-zoom') || !document.getElementById('phone-reactor') || typeof engine === 'undefined') { setTimeout(install, 80); return; }
    tray(); doctrines();
    // late controls: Hold, Sonar and Lock are added by their own modules
    let n = 0; const step = engine.update; engine.update = function (...a) { const r = step.apply(this, a); if (++n % 30 === 0) tray(); return r; };
    ready = true;
  }
  window.phoneTidy = { get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 450));
})();
