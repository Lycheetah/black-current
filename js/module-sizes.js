/* MODULE SIZES (Mac, 2026-10-30: "our weapons and modules need work"). Modules used to come in one size, so a titan fitted
 * the same 18-metal Compact engine and flat +35-hull armour as a frigate. Each module family now comes in four more
 * sizes, unlocked by frame: Light (destroyer up), Medium (cruiser up), Heavy (battleship up), Capital (capital up).
 * They are ordinary modular gear (bought, owned and fitted like any other); this file adds them and gives them effects
 * that scale with the size:
 *   engine   +6 / +12 / +18 / +25% thrust      the best engine fitted counts
 *   shield   +15 / +35 / +60 / +100% shield    each sized emitter adds (pool and recharge)
 *   armour   +5 / +10 / +15 / +20% hull        each sized plate adds, up to three
 *   repair   0.1 / 0.2 / 0.3 / 0.45% hull/s    the best repair module counts
 * The originals stay as the entry modules. The yard refuses a module bigger than the frame (check() reason). */
(() => {
  'use strict';
  const SIZES = [
    { id: 'light', label: 'Light', cls: 'LIGHT', min: 'destroyer', power: 2 },
    { id: 'medium', label: 'Medium', cls: 'MEDIUM', min: 'cruiser', power: 3 },
    { id: 'heavy', label: 'Heavy', cls: 'HEAVY', min: 'battleship', power: 4 },
    { id: 'capital', label: 'Capital', cls: 'CAPITAL', min: 'capital', power: 6 }
  ];
  const FAMILIES = {
    engine: { base: 'engine', noun: 'engine', costs: [120, 450, 1500, 4800], values: [0.06, 0.12, 0.18, 0.25], line: v => `+${Math.round(v * 100)}% thrust (the best engine fitted counts)` },
    shield: { base: 'shield', noun: 'shield emitter', costs: [140, 520, 1700, 5400], values: [0.15, 0.35, 0.6, 1.0], line: v => `+${Math.round(v * 100)}% shield pool and recharge (each one adds)` },
    armour: { base: 'armour', proto: { type: 'pod', radius: 12, kind: 'utility' }, noun: 'armour module', costs: [300, 900, 2500, 7000], values: [0.05, 0.10, 0.15, 0.20], line: v => `+${Math.round(v * 100)}% hull (each adds, up to three)` },
    repair: { base: 'repair', noun: 'repair module', costs: [160, 600, 1900, 6000], values: [0.001, 0.002, 0.003, 0.0045], line: v => `repairs ${(v * 100).toFixed(2).replace(/0$/, '')}% of hull a second (the best one counts)` }
  };
  const CFG = { armourMax: 3 };
  let ready = false;
  const M = () => window.modularShips;
  const CLASSES = () => window.tuning?.CLASSES || ['frigate', 'destroyer', 'cruiser', 'heavycruiser', 'battlecruiser', 'battleship', 'capital', 'supercapital', 'titan'];
  const id = (fam, size) => `${fam}-${size}`;
  // add the sized gear to modularShips.GEARS (the shop, fitting and quotes all read that table)
  function addGear() {
    const G = M().GEARS;
    for (const [fam, F] of Object.entries(FAMILIES)) {
      const base = G[F.base] || F.proto; if (!base) continue;   // armour's entry module is added later by recovered-fittings.js
      SIZES.forEach((S, i) => {
        const key = id(fam, S.id); if (G[key]) return;
        G[key] = { ...base, name: `${S.label} ${F.noun}`, cost: F.costs[i], power: S.power, cls: S.cls, moduleSize: S.id, moduleFamily: fam, sizeValue: F.values[i],
          description: `${S.label} ${F.noun}: ${F.line(F.values[i])}. Fits a ${S.min} frame or larger.` };
      });
    }
  }
  const fitted = () => (saveState.doc.design?.modular?.fittings || []).map(f => M().GEARS[f.gear]).filter(g => g?.moduleSize);
  const best = fam => Math.max(0, ...fitted().filter(g => g.moduleFamily === fam).map(g => g.sizeValue));
  const sum = (fam, cap = 99) => fitted().filter(g => g.moduleFamily === fam).map(g => g.sizeValue).sort((a, b) => b - a).slice(0, cap).reduce((a, b) => a + b, 0);
  const effects = () => ({ thrust: 1 + best('engine'), shield: 1 + sum('shield'), hull: 1 + sum('armour', CFG.armourMax), regen: best('repair') });
  // the yard refuses a module bigger than the frame
  function sizeReason(design) {
    const m = design?.modular; if (!m) return null; const hull = CLASSES().indexOf(m.hull);
    for (const f of m.fittings || []) { const g = M().GEARS[f.gear]; if (!g?.moduleSize) continue; const S = SIZES.find(s => s.id === g.moduleSize); if (hull < CLASSES().indexOf(S.min)) return `${g.name} needs a ${S.min} frame or larger.`; }
    return null;
  }
  function install() {
    if (!M()?.GEARS || !window.arsenal?.shields?.profile || !window.combatScaling?.ready || typeof engine === 'undefined' || !saveState.coreMod) { setTimeout(install, 50); return; }
    const check = M().check; M().check = function (design, ...a) { const r = check.call(this, design, ...a); return r || (a[0]?.restore ? null : sizeReason(design)); };
    const core = saveState.coreMod.bind(saveState); saveState.coreMod = stat => core(stat) * (stat === 'thrust' ? effects().thrust : 1);
    const prof = arsenal.shields.profile; arsenal.shields.profile = function (...a) { const s = prof.apply(this, a), k = effects().shield; if (s && k !== 1) { s.pool *= k; s.rate *= k; } return s; };
    const recalc = engine.recalculatePlayerStats; engine.recalculatePlayerStats = function (...a) { const r = recalc.apply(this, a), k = effects().hull; if (k !== 1) { const P = this.player, missing = P.maxHp - P.hp; P.maxHp = Math.round(P.maxHp * k); P.hp = Math.max(0, Math.min(P.maxHp, P.maxHp - missing)); } return r; };
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { const g = effects().regen, P = this.player; if (g > 0 && !this.paused && !P.dead && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * g / 60); } catch (e) { } return r; };
    try { engine.recalculatePlayerStats(); } catch (e) { }
    ready = true;
  }
  // the gear must exist before the yard and the shop first read the table
  if (window.modularShips?.GEARS) addGear(); else window.addEventListener('DOMContentLoaded', addGear);
  window.moduleSizes = { SIZES, FAMILIES, CFG, effects, sizeReason, id, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 360));
})();
