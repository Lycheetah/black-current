/* AUTO-FIRE (overnight run step 9). Mac, 2026-10-29: "auto pilots … i reckon even the donation will be auto fire mode".
 * A setting: while you are not aiming (mouse up, right thumb off the screen), your guns lock the nearest hostile in
 * range and fire. On by default on phone (two thumbs are busy steering and zooming), off by default on PC; T toggles it (X is the build menu, js/hubs.js).
 * Built as a normal setting for everyone; whether it becomes a supporter perk is Mac's call (docs/MASTER_PLAN.md §8). */
(() => {
  'use strict';
  const CFG = { range: 1000, hulls: 14 };
  let ready = false, target = null;
  const mobile = () => document.documentElement.classList.contains('mobile-layout');
  const enabled = () => { const s = menu.settings(); return s.autoFire ?? mobile(); };
  function set(on) { menu.settings().autoFire = !!on; saveState.save(); garage.banner('AUTO-FIRE ' + (on ? 'ON · guns lock the nearest hostile while you are not aiming' : 'OFF'), 'good'); return !!on; }
  function nearest() {
    const p = engine.player, r = Math.max(CFG.range, (p.coreRadius || 30) * CFG.hulls); let best = null, bd = r;
    for (const e of engine.enemies) { if (e.hp <= 0 || e.training || e.friendly) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function install() {
    if (typeof engine === 'undefined' || !window.menu?.settings || !engine.readInput) { setTimeout(install, 60); return; }
    const read = engine.readInput; engine.readInput = function (...a) {
      const inp = read.apply(this, a); target = null;
      if (!enabled() || this.paused || this.mapOpen || this.player.dead) return inp;
      const aiming = this.mouse.down || this.touch?.aimId != null; if (aiming) return inp;
      const e = nearest(); if (!e) return inp;
      target = e; inp.aimX = e.x + (e.vx || 0) * 6; inp.aimY = e.y + (e.vy || 0) * 6; inp.fire = true; return inp;
    };
    // first run: store the device default (on for phone, off for PC) so Settings shows the true state
    if (menu.settings().autoFire === undefined) { menu.settings().autoFire = mobile(); saveState.save(); }
    window.addEventListener('keydown', e => { if (e.code === 'KeyT' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.target?.closest?.('input,textarea,select') && saveState.doc.launched) { e.preventDefault(); set(!enabled()); } });
    ready = true;
  }
  window.autoFire = { CFG, enabled, set, get target() { return target; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 200));
})();
