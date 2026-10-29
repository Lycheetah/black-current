/* DUNGEON LOOT (Route 2 · Stage 2). Only the hold of a derelict pays these.
 * - NAMED UNIQUES: five guns, one per family, each a roster gun with a signature relic trait and
 *   +25% damage. Each exists at every class from Light to Capital; the hold pays the derelict's class.
 * - THE WARDEN'S BULWARK: a three-piece set (plate, heart, drive). With all three fitted your hull
 *   gains 15% and your shield pool 25%.
 * Every full haul (derelicts.js) alternates: a set piece you are missing, then a unique.
 * Hardware lands in the modular hangar like any recovered fitting and is never sold in shops. */
(() => {
  'use strict';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const UNIQUES = {
    stormcaller: { name: 'Stormcaller', family: 'kinetic', quirk: 'arc', line: 'Hits arc to two more hulls.' },
    widowslance: { name: "Widow's Lance", family: 'rail', quirk: 'lance', line: 'Shots pierce two extra hulls.' },
    frostbrand: { name: 'Frostbrand', family: 'beam', quirk: 'cryo', line: 'Hits slow the target.' },
    huntersoath: { name: "Hunter's Oath", family: 'missile', quirk: 'seeker', line: 'Shots curve toward the nearest hull.' },
    gravechorus: { name: 'Grave Chorus', family: 'ordnance', quirk: 'nova', line: 'Shells burst against every hull nearby.' }
  };
  const CLASSES = ['LIGHT', 'MEDIUM', 'HEAVY', 'SIEGE', 'CAPITAL'];
  const SET = { id: 'warden', name: "Warden's Bulwark", bonus: { hull: 1.15, shield: 1.25 },
    pieces: [['plate', 'armour', 'Warden plate'], ['heart', 'shield', 'Warden heart'], ['drive', 'engine', 'Warden drive']] };
  const UNIQUE_DAMAGE = 1.25;
  let ready = false;
  const M = () => modularShips;
  const uid = (key, cls) => 'unique-' + key + '-' + cls.toLowerCase();
  function register() {
    const G = M().GEARS;
    for (const [key, u] of Object.entries(UNIQUES)) for (const cls of CLASSES) {
      const base = Object.entries(G).find(([, g]) => g.weapon && g.cls === cls && !g.retired && !g.salvageOnly && arsenal.GUNS[g.weapon]?.family === u.family);
      if (!base) continue;
      G[uid(key, cls)] = { ...base[1], name: `${u.name} · ${cls[0]}${cls.slice(1).toLowerCase()}`, quirk: u.quirk, rarity: 'unique', unique: key, salvageOnly: true,
        description: `${base[1].description || ''} Derelict unique: ${u.line} +25% damage.`.trim() };
    }
    for (const [part, base, name] of SET.pieces) if (G[base]) G['set-' + SET.id + '-' + part] = { ...G[base], name, set: SET.id, rarity: 'set', salvageOnly: true,
      description: `${G[base].description || ''} ${SET.name} (1 of 3): with all three fitted, +15% hull and +25% shield pool.`.trim() };
  }
  function owned(id) { return Number(M().hangar().owned['gear:' + id + ':1']) || 0; }
  function grant(id) {
    const h = M().hangar(), key = 'gear:' + id + ':1'; h.owned[key] = Math.min(64, (Number(h.owned[key]) || 0) + 1);
    h.recoveries = [...(saveState.doc.modularHangar?.recoveries || [])]; if (!h.recoveries.some(i => i.id === id)) h.recoveries.push({ id, dungeon: true });
    saveState.doc.modularHangar = h; saveState.save(); return M().GEARS[id].name;
  }
  function award(d) {
    const rec = saveState.doc.dives; rec.hauls = (rec.hauls || 0) + 1;
    const missing = SET.pieces.map(([p]) => 'set-' + SET.id + '-' + p).find(id => !owned(id));
    let id;
    if (missing && rec.hauls % 2 === 1) id = missing;
    else { let cls = window.combatScaling?.gunClass?.({ tier: d.danger }) || 'LIGHT'; if (!CLASSES.includes(cls)) cls = 'LIGHT';
      const keys = Object.keys(UNIQUES); id = uid(keys[hash(d.key + ':' + rec.hauls) % keys.length], cls); }
    const name = grant(id);
    garage.banner((id.startsWith('set-') ? `SET PIECE · ${name} (${SET.name})` : `UNIQUE · ${name}`) + ' → modular hangar', 'good');
    return id;
  }
  function setBonus(design = saveState.doc.design) {
    const fitted = new Set((design?.modular?.fittings || []).map(f => f.gear).filter(g => M().GEARS[g]?.set === SET.id));
    return fitted.size === SET.pieces.length;
  }
  function install() {
    if (!window.modularShips?.GEARS || !window.arsenal?.GUNS || !window.derelicts?.ready || typeof engine === 'undefined') { setTimeout(install, 60); return; }
    if (!registered) register();
    const recalc = engine.recalculatePlayerStats.bind(engine);
    engine.recalculatePlayerStats = (...a) => { const r = recalc(...a); try { const P = engine.player; P.setBonus = setBonus() ? SET.id : null;
      if (P.setBonus) { P.maxHp = Math.round(P.maxHp * SET.bonus.hull); if (P.maxShield) P.maxShield = Math.round(P.maxShield * SET.bonus.shield); } } catch { } return r; };
    const fire = engine.fireMountGroup;
    engine.fireMountGroup = function (w, mounts, dmg, ...a) { const u = mounts?.some(m => m.turret?.node?.rarity === 'unique'); return fire.call(this, w, mounts, (dmg ?? 1) * (u ? UNIQUE_DAMAGE : 1), ...a); };
    ready = true;
  }
  // Register at once: a saved design that fits a unique must compile the moment the game restores it.
  let registered = false;
  try { if (window.modularShips?.GEARS && window.arsenal?.GUNS) { register(); registered = true; } } catch (e) { console.warn('derelict loot:', e.message); }
  window.derelictLoot = { UNIQUES, SET, CLASSES, UNIQUE_DAMAGE, uid, award, setBonus, owned, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
