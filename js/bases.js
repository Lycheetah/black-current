/* BASES (overnight run step 27; MASTER_PLAN bases). Two or more of your structures in one sector make a base; the
 * star map marks it. Three structures (js/hubs.js KINDS) give a base its work:
 *   REFINERY        while you are in its system, every CFG.refineEvery frames it melts one loose salvage part from
 *                   your hold into metal (3× its sale value), so the hold turns into income.
 *   WINGMAN HANGAR  while you are in its sector, a lost wingman (js/wingmen.js) is rebuilt in the field for the same
 *                   quarter-price a station charges, one at a time.
 *   DEFENCE GRID    gun platforms in its sector fire 50% faster and reach 25% further; your structures there take
 *                   40% less damage (hubs.js asks armour()).
 * Raids now announce themselves: CFG.warn frames ahead you get a banner, a sound and a raid mark on the star map, so
 * you can come home or set up. Forward Docks remain the berth: dock, refit and rebuild there as at a station. */
(() => {
  'use strict';
  const CFG = { refineEvery: 600, refineMult: 3, hangarEvery: 300, gridEvery: 68, gridReach: 1.25, gridArmour: 0.6, warn: 3600 };
  let ready = false, T = 0, warned = null;
  const mine = () => hubs.list().filter(s => !s.public && s.hp > 0);
  const inSector = (s, sys, gx, gy) => s.sys === sys && s.gx === gx && s.gy === gy;
  const hereList = () => { const ch = worldMap.getCurrentChamber(); return mine().filter(s => inSector(s, galaxy.currentId, ch.gridX, ch.gridY)); };
  // sectors holding two or more of your structures: { key: count }
  function bases() { const out = {}; for (const s of mine()) { const k = s.sys + ':' + s.gx + ',' + s.gy; out[k] = (out[k] || 0) + 1; } for (const k of Object.keys(out)) if (out[k] < 2) delete out[k]; return out; }
  function armour(s) { return mine().some(g => g.kind === 'grid' && inSector(g, s.sys, s.gx, s.gy)) ? CFG.gridArmour : 1; }
  function refine() {
    if (!mine().some(s => s.kind === 'refinery' && s.sys === galaxy.currentId)) return false;
    const inv = saveState.doc.inventory || [], i = inv.findIndex(p => p.count > 0 && !p.quirk && (p.rarity || 'common') === 'common'); if (i < 0) return false;
    const p = inv[i], gain = hubs.sellValue(p) * CFG.refineMult; p.count--; if (p.count <= 0) inv.splice(i, 1);
    hubs.metal = hubs.metal + gain; saveState.save(); garage.banner(`REFINERY · ${p.type} part melted · +${gain} metal`, 'good'); return gain;
  }
  function hangar() {
    if (!window.wingmen || !hereList().some(s => s.kind === 'hangar')) return false;
    const lost = wingmen.doc().list.find(r => r.lost); if (!lost) return false;
    const cost = Math.round(lost.price * wingmen.CFG.rebuildPart); if (hubs.metal < cost) return false;
    return wingmen.rebuild(lost.id, { field: true });
  }
  function grid() {
    const here = hereList(); if (!here.some(s => s.kind === 'grid')) return 0; let shots = 0;
    for (const s of here) if (s.kind === 'gun') {
      let best = null, bd = hubs.CFG.gunRange * CFG.gridReach; for (const e of engine.enemies) { const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < bd) { bd = d; best = e; } }
      if (!best) continue; const a = Math.atan2(best.y - s.y, best.x - s.x), spd = typeof weaponSpeed === 'function' ? weaponSpeed('spitter') : 22;
      const q = new Projectile(s.x + Math.cos(a) * 50, s.y + Math.sin(a) * 50, Math.cos(a) * spd, Math.sin(a) * spd, { color: '#ff6ad5', damage: 14, radius: 6, isPlayer: true, type: 'spitter', life: Math.round(60 * CFG.gridReach) });
      q.owner = 'grid'; engine.projectiles.push(q); shots++;
    }
    return shots;
  }
  // a raid comes when hubs.raidT runs out while you are in a sector with your structures: warn CFG.warn frames ahead
  function warnCheck() {
    const ch = worldMap.getCurrentChamber(), key = galaxy.currentId + ':' + ch.gridX + ',' + ch.gridY;
    if (hubs.raid || ch.isHaven || !hereList().length) { if (hubs.raid) warned = null; return; }
    if (hubs.raidT > CFG.warn) { if (warned === key) warned = null; return; }
    if (warned === key) return; warned = key;
    garage.banner(`RAID INBOUND · ${Math.ceil(hubs.raidT / 60)} s · raiders are coming for your structures here`, 'warn');
    try { soundEngine.playAbility('emp'); } catch (e) { }
  }
  const raidWarning = () => warned;
  function tick() {
    if (engine.paused || engine.mapOpen || engine.player.dead || !window.galaxy?.current) return;
    T++;
    if (T % CFG.refineEvery === 0) refine();
    if (T % CFG.hangarEvery === 0) hangar();
    if (T % CFG.gridEvery === 0) grid();
    warnCheck();
  }
  function install() {
    if (!window.hubs?.list || !window.galaxy?.data || typeof engine === 'undefined' || !window.garage) { setTimeout(install, 80); return; }
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { tick(); } catch (e) { console.warn('bases:', e.message); } return r; };
    ready = true;
  }
  window.bases = { CFG, bases, armour, refine, hangar, grid, warnCheck, raidWarning, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 420));
})();
