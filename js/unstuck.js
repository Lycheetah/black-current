/* UNSTUCK (Mac, 2026-10-30: "if you leave an area, like an arena, or by glitching out of the bubble, there's no unstuck
 * button"). Pause → Unstuck puts your ship back inside the area you are in, at a clear spot: a sector, a rift arena, a
 * derelict room or a Grave Choir layer. Nothing is forfeit. Pressed again within 10 s inside a rift, a dive, the Grave
 * Choir or a training run, it leaves that area the way its own exit does (a rift or dive run ends and the hardware you
 * carry comes with you; the Grave Choir banks your haul). Velocity is zeroed and you get 2 s of grace.
 * The safety net does the first step on its own: a ship that has been well outside its bubble (25% past the edge) for
 * four seconds is brought back in. */
(() => {
  'use strict';
  const CFG = { outside: 1.25, holdFrames: 240, again: 10000, grace: 120 };
  const stats = { manual: 0, auto: 0, left: 0, last: null };
  let ready = false, outFrames = 0, lastAt = 0, lastKind = null;
  // the area you are in, and how to leave it
  function area() {
    if (window.holoTest?.active) return { kind: 'training', name: 'the training run', leave: () => holoTest.end() };
    if (window.rifts?.active) return { kind: 'rift', name: 'the rift', leave: () => rifts.leave('stuck') };
    if (window.derelicts?.active) return { kind: 'dive', name: 'the derelict', leave: () => derelicts.leave('stuck') };
    if (window.graveChoir?.active) return { kind: 'choir', name: 'the Grave Choir', leave: () => graveChoir.exit(true) };
    return { kind: 'sector', name: 'the sector', leave: null };
  }
  const shipR = () => Math.max(40, (window.roomScale?.shipLength?.() || 200) * 0.6);
  // a clear spot inside the bubble: toward the centre along your own bearing first, then round the ring
  function clearSpot(R) {
    const P = engine.player, f = window.terrain?.current?.(), solids = f?.solids || [], r = shipR();
    const free = (x, y) => solids.every(o => Math.hypot(o.x - x, o.y - y) > o.r + r * 1.5);
    const a0 = Math.atan2(P.y, P.x) || 0;
    for (const k of [0.55, 0.4, 0.25, 0.7, 0.1]) for (let i = 0; i < 16; i++) {
      const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, x = Math.cos(a) * R * k, y = Math.sin(a) * R * k;
      if (free(x, y)) return { x, y };
    }
    return { x: 0, y: 0 };
  }
  function settle(spot) {
    const P = engine.player; P.x = spot.x; P.y = spot.y; P.vx = P.vy = 0; P.iFrames = Math.max(P.iFrames || 0, CFG.grace);
    window.combatFeel?.setCruise?.(false);
    if (engine.camera) { engine.camera.x = P.x; engine.camera.y = P.y; }
  }
  function unstuck(why = 'manual') {
    if (typeof engine === 'undefined' || !engine.player || engine.player.dead) return false;
    // a second press counts only in the same area: a press out in the sector does not arm leaving a rift entered after it
    const A = area(), now = performance.now(), again = why === 'manual' && A.leave && lastKind === A.kind && now - lastAt < CFG.again;
    if (why === 'manual') { lastAt = now; lastKind = A.kind; }
    if (again) {
      A.leave(); stats.left++; stats.last = { why, kind: A.kind, left: true }; lastAt = 0; lastKind = null;
      engine.player.iFrames = Math.max(engine.player.iFrames || 0, CFG.grace);
      window.garage?.banner?.(`Unstuck: you left ${A.name}.`, 'good');
      return stats.last;
    }
    const ch = worldMap.getCurrentChamber(), R = ch?.radius || 2600, spot = clearSpot(R);
    settle(spot); stats[why === 'auto' ? 'auto' : 'manual']++; stats.last = { why, kind: A.kind, x: Math.round(spot.x), y: Math.round(spot.y), R };
    window.garage?.banner?.(why === 'auto' ? `You drifted out of ${A.name}'s bubble: brought back inside.`
      : A.leave ? `Unstuck: back inside ${A.name}. Still stuck? Press Unstuck again within 10 s to leave it.` : 'Unstuck: back inside the sector.', 'good');
    return stats.last;
  }
  // the safety net
  function tick() {
    const P = engine.player; if (P.dead || engine.mapOpen) { outFrames = 0; return; }
    const ch = worldMap.getCurrentChamber(), R = ch?.radius; if (!R) return;
    outFrames = Math.hypot(P.x, P.y) > R * CFG.outside ? outFrames + 1 : 0;
    if (outFrames >= CFG.holdFrames) { outFrames = 0; unstuck('auto'); }
  }
  function install() {
    if (typeof engine === 'undefined' || !engine.update || !window.menu || typeof worldMap === 'undefined') { setTimeout(install, 60); return; }
    const step = engine.update; engine.update = function (...a) { const r = step.apply(this, a); if (!this.paused) try { tick(); } catch (e) { } return r; };
    const quit = document.getElementById('btn-pause-quit');
    if (quit && !document.getElementById('btn-pause-unstuck')) {
      const b = document.createElement('button'); b.id = 'btn-pause-unstuck'; b.type = 'button'; b.className = 'tm-door quiet'; b.textContent = 'Unstuck';
      b.title = 'Back inside the area you are in, at a clear spot. Press again within 10 s in a rift, a dive or the Grave Choir to leave it.';
      b.onclick = () => { menu.resume(); unstuck('manual'); };
      quit.before(b);
    }
    ready = true;
  }
  window.unstuck = { CFG, stats, area, run: unstuck, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 300));
})();
