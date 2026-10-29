/* ROOM SCALE (Route 2 · Stage 1 · map and places).
 * Since Route 1 a titan flies at ~1,840 px, but home sectors, stations and boss arenas kept a
 * 2,600 px radius. Room now follows the frame you fly (decision 4: room, never threat):
 * - every sector is at least tuning.SIZE.room of your ship-lengths in radius (deep sectors keep
 *   their danger size when that is larger; enemy-combat.js applies it after this);
 * - stations grow with you so a capital hull berths alongside (hubs.js reads stationScale);
 * - the camera never zooms in so far that your hull passes tuning.SIZE.fit of the short side.
 * Enemy spawns already spread by chamber.radius, so fleets take the room without new rules. */
(() => {
  'use strict';
  let ready = false;
  const T = () => window.tuning;
  // Measured flying length (blueprint × hull scale), so a stubby titan and a long one each get their own room.
  function shipLength(ship = window.engine?.player) {
    let r = 0;
    for (const n of ship?.nodes || []) r = Math.max(r, Math.hypot(n.currentDx ?? n.dx ?? 0, n.currentDy ?? n.dy ?? 0) + (n.radius || 0));
    if (r > 0) return r * 2;
    const cls = T().classOf(ship);
    return T().SIZE.playerLength[cls] * T().SIZE.hullScale[cls];
  }
  const roomRadius = () => Math.ceil(T().SIZE.room * shipLength() / 100) * 100;
  const stationScale = () => Math.max(1, shipLength() / 900);
  const fitZoom = (w, h) => T().SIZE.fit * Math.min(w, h) / Math.max(1, shipLength());
  function size(ch) {
    if (!ch) return;
    if (ch._baseRadius === undefined) ch._baseRadius = ch.radius;
    ch.radius = Math.max(ch._baseRadius, roomRadius());
  }
  function install() {
    if (!window.engine?.loadChamberEntities || !window.wideDark?.ready || !window.combatScaling?.ready || !window.tuning) { setTimeout(install, 60); return; }
    // Outermost wrapper: room first, then enemy-combat.js raises deep sectors to their danger size.
    const load = engine.loadChamberEntities;
    engine.loadChamberEntities = function (...a) { try { size(worldMap.getCurrentChamber()); } catch (e) { console.warn('room scale:', e.message); } return load.apply(this, a); };
    // A refit to a bigger frame mid-sector widens the room you are in at once.
    const apply = engine.applyDesign;
    engine.applyDesign = function (...a) { const r = apply.apply(this, a); try { const ch = worldMap.getCurrentChamber(); ch.radius = Math.max(ch.radius, roomRadius()); } catch { } return r; };
    ready = true;
  }
  window.roomScale = { shipLength, roomRadius, stationScale, fitZoom, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
