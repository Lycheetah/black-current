/* FLIGHT HUD (master route Stage 4 · the interface).
 * - One danger number: the system strip repaints with the sector's danger on every sector load.
 * - Rookie prompts expire: the home-only first-expedition tracker hides outside the home system.
 * - The HUD gets out of the way in a fight: `body.bc-combat` collapses contract rows and dims
 *   the view controls while hostiles are engaged or the guns have fired in the last few seconds.
 * - The sector chart cannot open over the title or new-pilot screens. */
(() => {
  'use strict';
  let ready = false, lastShot = -1e9;
  const home = () => !window.galaxy?.currentId || galaxy.currentId === (saveState.doc.civHome || 'home') || galaxy.currentId === 'home';
  const titleUp = () => { const t = window.garage?.el?.title; return !!t && t.style.display !== 'none'; };
  function inCombat() {
    const p = engine.player; if (!p || p.dead || engine.paused) return false;
    if (performance.now() - lastShot < 3000) return true;
    const reach = 2200 + (window.fleetFormation ? fleetFormation.radius(p) : 0);
    return engine.enemies.some(e => e.hp > 0 && !e.training && (e._aggro || e._hitAt) && Math.hypot(e.x - p.x, e.y - p.y) < reach);
  }
  function tick() {
    const story = document.getElementById('story-contract');
    if (story) story.classList.toggle('away-from-home', !home());
    document.body.classList.toggle('bc-combat', inCombat());
  }
  function install() {
    if (!window.galaxy?.paintStrip || !window.engine?.toggleMapModal || !window.garage) { setTimeout(install, 50); return; }
    const load = engine.loadChamberEntities;
    engine.loadChamberEntities = function (...a) { const r = load.apply(this, a); try { galaxy.paintStrip(); } catch { } tick(); return r; };
    const toggle = engine.toggleMapModal;
    engine.toggleMapModal = function (...a) { if (!this.mapOpen && titleUp()) return; return toggle.apply(this, a); };
    const fire = engine.readInput;
    engine.readInput = function (...a) { const r = fire.apply(this, a); if (this.input?.fire) lastShot = performance.now(); return r; };
    setInterval(tick, 250); tick(); ready = true;
  }
  window.flightHud = { inCombat, tick, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 420));
})();
