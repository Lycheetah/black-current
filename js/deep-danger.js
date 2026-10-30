/* DEEP DANGER (Route 4 item 3; Mac, 2026-10-30: "danger 7 is no risk for even a … carrier", "outranked [enemies] never
 * kill you even when afk"). Measured first: an AFK battleship sat three minutes in a danger-7 sector, lost 600 of 1,720
 * hull and healed; an AFK carrier lost 400 of 4,525. Nineteen hulls idled ~3,000 px out with 1,300-2,500 px aggro, so
 * nothing ever came. In danger 5+ sectors outside the home system the sector now hunts you: after 10 s, the nearest group (its closest hull and up to three wingmates) turns on you, and another every 15 s while fewer
 * than eight hunters are on you, so a ship that only sits there is worn down. combat-scaling.js also fields the screens one and two tiers under the sector, not two and four. */
(() => {
  'use strict';
  const CFG = { from: 5, near: 1400, first: 600, again: 900, group: 4, wing: 900, engaged: 8 };
  let ready = false, key = '', quiet = 0, wait = CFG.first;
  const stats = { packs: 0, hulls: 0 };
  const deep = ch => ch && !ch.isHaven && !ch.isBossSector && (ch.dangerLevel || 0) >= CFG.from && galaxy.currentId !== (saveState.doc.civHome || 'home')
    && !window.factionFleets?.protectedSector?.(ch) && !window.frontierPve?.isRange?.() && !window.holoTest?.active && !window.bossScenes?.rehearsing;
  const live = e => e.hp > 0 && !e.training && !e.holo && !e.isBoss && !e.raidTarget;
  function hunt() {
    const P = engine.player, d = e => Math.hypot(e.x - P.x, e.y - P.y);
    const idle = engine.enemies.filter(e => live(e) && !e.hunting).sort((a, b) => d(a) - d(b));
    if (!idle.length) return false;
    const lead = idle[0], pack = [lead, ...idle.slice(1).filter(e => Math.hypot(e.x - lead.x, e.y - lead.y) < CFG.wing).slice(0, CFG.group - 1)];
    for (const e of pack) { e.hunting = true; e._aggro = true; }
    stats.packs++; stats.hulls += pack.length;
    garage.banner(`HUNTERS · ${pack.length} hull${pack.length > 1 ? 's' : ''} turn toward you`, 'hunt');
    if (typeof soundEngine !== 'undefined') soundEngine.voice?.('patrol', { x: lead.x, y: lead.y });
    return true;
  }
  function tick() {
    const ch = worldMap.getCurrentChamber(), k = `${galaxy.currentId}:${ch?.gridX},${ch?.gridY}`;
    if (k !== key) { key = k; quiet = 0; wait = CFG.first; }
    if (!deep(ch) || engine.player.dead) { quiet = 0; return; }
    const P = engine.player, close = engine.enemies.filter(e => live(e) && Math.hypot(e.x - P.x, e.y - P.y) < CFG.near);
    // only hunters count: an idle hull parked beside you (measured: one sat 42 px from a carrier) must not stall the hunt
    quiet = close.filter(e => e.hunting).length >= CFG.engaged ? 0 : quiet + 1;
    if (quiet >= wait && hunt()) { quiet = 0; wait = CFG.again; }
  }
  function install() {
    if (typeof engine === 'undefined' || !window.combatScaling?.ready || !window.galaxy || !window.garage) { setTimeout(install, 50); return; }
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); if (!this.paused && !this.mapOpen) try { tick(); } catch (e) { } return r; };
    ready = true;
  }
  window.deepDanger = { CFG, stats, hunt, deep, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 200));
})();
