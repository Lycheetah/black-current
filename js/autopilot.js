/* AUTOPILOT (overnight run step 8). Mac, 2026-10-29: "let's also add auto pilot". Flies the plotted route
 * (js/travel.js) hands-off: across sectors through their exits, into each jump gate, system after system, then
 * docks if the route ends at a station. It steers through the normal input (engine.readInput), so mass, terrain,
 * cruise and gates all behave as they do for a pilot. It lets go the moment anything needs you: hostile contact,
 * taking damage, any movement input, the chart opening, or arrival. Key: Z. Button: on the travel cue. */
(() => {
  'use strict';
  const CFG = { contactRange: 900, contactHulls: 10, arriveRange: 220, cruiseAbove: 1600, stuckFrames: 90, sidestepFrames: 70 };
  const stats = { avoided: 0 };
  let active = false, reason = '', button = null, ready = false, lastHp = null, stuck = 0, side = 0, sideT = 0, lastPos = null;
  const $ = id => document.getElementById(id);
  const P = () => engine.player;
  function say(text, tone = 'good') { reason = text; garage.banner(text, tone); paint(); }
  function engage() {
    const t = window.travelHelper?.target();
    if (!t) { say('AUTOPILOT · plot a route on the chart first (or plot a job route)', 'bad'); return false; }
    if (t.arrived) { say('AUTOPILOT · you are already at ' + t.name, 'good'); return false; }
    if (hostileNear()) { say('AUTOPILOT · hostiles close · clear them first', 'bad'); return false; }
    active = true; lastHp = P().hp; stuck = 0; sideT = 0; lastPos = null; reason = ''; say('AUTOPILOT ENGAGED · ' + t.name); return true;
  }
  function disengage(why, tone = 'good') { if (!active) return false; active = false; window.combatFeel?.setCruise?.(false); say('AUTOPILOT OFF · ' + why, tone); return true; }
  function toggle() { return active ? disengage('manual') : engage(); }
  function hostileNear() { const p = P(), r = Math.max(CFG.contactRange, (p.coreRadius || 30) * CFG.contactHulls); return engine.enemies.some(e => e.hp > 0 && !e.training && Math.hypot(e.x - p.x, e.y - p.y) < r); }
  const userMoving = () => ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => engine.keys[k]) || engine.touch?.moveId != null;
  // the point to fly at this frame: the route beacon (a local target, or the exit toward the next sector)
  function aim() {
    const t = travelHelper.target(); if (!t) return null; if (t.arrived) return { arrived: true, t };
    const b = window.navigationHud?.beacon?.(); if (!b) return null;
    return { x: b.x, y: b.y, local: b.local, t };
  }
  function tick() {
    if (!active) return;
    if (engine.paused || engine.mapOpen || document.hidden) return;
    const p = P();
    if (p.dead) return disengage('ship lost', 'bad');
    if (userMoving()) return disengage('you took the helm');
    if (p.hp < (lastHp ?? p.hp) - 0.5) return disengage('taking fire', 'bad');
    lastHp = p.hp;
    if (hostileNear()) return disengage('hostile contact', 'bad');
    const a = aim();
    if (!a) return disengage('route lost', 'bad');
    if (a.arrived) return disengage('arrived · ' + a.t.name.replace(/^Destination reached: /, ''));
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (a.local && a.t.station && d < 1500 && worldMap.currentGridX === 0 && worldMap.currentGridY === 0) { active = false; window.combatFeel?.setCruise?.(false); travelHelper.approach(); say('AUTOPILOT · docking approach'); return; }
    if (a.local && !a.t.station && !/^Gate to /.test(a.t.name) && d < CFG.arriveRange * Math.max(1, (p.coreRadius || 30) / 30)) return disengage('arrived · ' + a.t.name);
    const far = d > CFG.cruiseAbove; if (window.combatFeel && combatFeel.cruise !== far) combatFeel.setCruise(far);
    // unstick: if 1.5 s of thrust has not closed the distance (rock or wreck in the way), slide sideways for a second,
    // alternating sides, so the hull works round the obstacle the way a pilot would
    if (!sideT && ++stuck >= CFG.stuckFrames) { if (lastPos && d > lastPos.d * 0.97) { sideT = CFG.sidestepFrames; side = side === 1 ? -1 : 1; } stuck = 0; lastPos = { d }; }
    if (!lastPos) lastPos = { d };
  }
  // look ahead: the first rock on the line to the beacon is passed on the side the line already leans to. The larger
  // zones (2026-10-30) brought larger rocks, and the blind sidestep below alone could loop round one for minutes.
  function avoid(p, dx, dy, d) {
    const solids = window.terrain?.current?.()?.solids; if (!solids?.length) return null;
    const clear = Math.max(30, (window.roomScale?.shipLength?.() || 200) * 0.22) + 60, look = Math.min(d, 2600);
    let best = null;
    for (const o of solids) {
      if (o.ghost) continue;
      const ox = o.x - p.x, oy = o.y - p.y, along = ox * dx + oy * dy, across = -ox * dy + oy * dx;
      if (along < -o.r || along > look || Math.abs(across) > o.r + clear) continue;
      if (!best || along < best.along) best = { o, along, across };
    }
    if (!best) return null;
    const s = best.across >= 0 ? -1 : 1, nx = -dy * s, ny = dx * s, R = best.o.r + clear * 1.4;
    const wx = best.o.x + nx * R + dx * Math.min(R, best.o.r) - p.x, wy = best.o.y + ny * R + dy * Math.min(R, best.o.r) - p.y, w = Math.hypot(wx, wy) || 1;
    stats.avoided++; return [wx / w, wy / w];
  }
  function steer(inp) {
    if (!active || engine.paused || engine.mapOpen) return inp;
    const a = aim(); if (!a || a.arrived) return inp;
    const p = P(); let dx = a.x - p.x, dy = a.y - p.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const round = avoid(p, dx, dy, d); if (round) [dx, dy] = round;
    if (sideT > 0) { sideT--; const sx = -dy * side, sy = dx * side; dx = sx - dx * 0.25; dy = sy - dy * 0.25; }
    inp.ax = dx; inp.ay = dy; return inp;
  }
  function paint() {
    if (!button) return; const t = window.travelHelper?.target();
    const keys = !document.documentElement.classList.contains('mobile-layout'); button.textContent = (active ? 'Autopilot ON' : 'Autopilot') + (keys ? ' · Z' : ''); button.setAttribute('aria-pressed', String(active));
    button.disabled = !t || !!t.arrived; button.classList.toggle('active', active);
  }
  function install() {
    if (!window.travelHelper?.ready || !window.navigationHud?.ready || typeof engine === 'undefined') { setTimeout(install, 60); return; }
    const read = engine.readInput; engine.readInput = function (...args) { const inp = read.apply(this, args); return steer(inp); };
    const update = engine.update; engine.update = function (...args) { const r = update.apply(this, args); try { tick(); } catch (e) { active = false; console.warn('autopilot:', e.message); } return r; };
    const cue = $('travel-cue');
    if (cue) { button = document.createElement('button'); button.id = 'travel-autopilot'; button.type = 'button'; button.onclick = e => { e.stopPropagation(); toggle(); }; const chart = $('travel-chart'); (chart || cue.lastChild).before(button); }
    window.addEventListener('keydown', e => { if (e.code === 'KeyZ' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.target?.closest?.('input,textarea,select') && saveState.doc.launched && !engine.mapOpen && !document.querySelector('dialog[open], .menu-overlay[style*="flex"]')) { e.preventDefault(); toggle(); } });
    const paintCue = travelHelper.paint; travelHelper.paint = function (...a) { const r = paintCue.apply(this, a); paint(); return r; };
    paint(); ready = true;
  }
  window.autopilot = { CFG, stats, engage, disengage, toggle, get active() { return active; }, get reason() { return reason; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 250));
})();
