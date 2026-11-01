/* WEAPON ADD-ONS (Mac, 2026-11-01: "like Borderlands, once you get past a certain power threshold weapons begin having
 * randomised add-ons"). Hostiles of tier 6 and up (deeper Erebos and beyond) can drop an add-on: a rolled module you
 * socket into one of your gun slots from the Refit panel. Elites drop them often, guardians always.
 *   COMMON   +6–12% damage
 *   RARE     +10–18% damage, +0–10% shot speed
 *   EXOTIC   +14–24% damage and a trick: Searing (burn), Frostbitten (slow), Storm (arcs), Hungry (leech), Grim (reaper),
 *            Shattering (splitter), Blasting (nova) or Shredding (flak). Each trick keeps its named cost (quirks.js).
 *   RELIC    +20–32% damage, +10% shot speed and a trick
 * The trick rides the existing quirk path: the gun's node carries `quirk`, and engine.fireMountGroup hands it to
 * quirks.shot for every shot from that muzzle. Stat bonuses are applied in the same call, matched to the nearest gun
 * to where the shot was born. (Shots keep their weapon family's colour; a rarity tint is a follow-up.)
 * Save: saveState.doc.addons = { hold: [add-on], slots: { sectionId: add-on } }. Dials: weaponAddons.CFG. */
(() => {
  'use strict';
  const CFG = { minTier: 6, chance: 0.045, elite: 0.3, outpost: 0.15, boss: 1, hold: 24 };
  const RARITY = { common: { colour: '#b7ccca', weight: 55, dmg: [0.06, 0.12], speed: [0, 0] },
    rare: { colour: '#70bfff', weight: 30, dmg: [0.10, 0.18], speed: [0, 0.10] },
    exotic: { colour: '#ce91f4', weight: 12, dmg: [0.14, 0.24], speed: [0, 0.06], trick: true },
    relic: { colour: '#edc273', weight: 3, dmg: [0.20, 0.32], speed: [0.10, 0.10], trick: true } };
  const TRICKS = { plasma: ['Searing', 'hits set hulls burning'], cryo: ['Frostbitten', 'hits slow the target'], arc: ['Storm', 'hits arc to two more hulls'],
    leech: ['Hungry', 'hits return hull to you'], reaper: ['Grim', 'hulls under 30% take a second hit'], splitter: ['Shattering', 'hits throw two side shards'],
    nova: ['Blasting', 'shots explode on impact'], flak: ['Shredding', 'shots burst into shards'] };
  const PLAIN = ['Tuned', 'Honed', 'Overcharged', 'Calibrated', 'Hot-wired'];
  const roll = ([a, b]) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0];
  const doc = () => { const d = saveState.doc.addons || (saveState.doc.addons = { hold: [], slots: {} }); d.hold ||= []; d.slots ||= {}; return d; };
  let lastSync = '';

  function make(tier, boost = 0) {
    const w = Object.entries(RARITY).map(([k, r]) => [k, r.weight * (k === 'common' ? 1 : 1 + Math.max(0, tier - 6) * 0.15 + boost)]);
    let x = Math.random() * w.reduce((s, [, v]) => s + v, 0), rarity = 'common';
    for (const [k, v] of w) { if ((x -= v) <= 0) { rarity = k; break; } }
    const R = RARITY[rarity], trick = R.trick ? pick(Object.keys(TRICKS)) : null;
    return { id: 'ao' + Date.now().toString(36) + (Math.random() * 1e5 | 0), rarity, trick, dmg: +roll(R.dmg).toFixed(3), speed: +roll(R.speed).toFixed(3),
      name: (trick ? TRICKS[trick][0] : pick(PLAIN)) + ' ' + rarity[0].toUpperCase() + rarity.slice(1) };
  }
  const describe = a => [`+${Math.round(a.dmg * 100)}% damage`, a.speed ? `+${Math.round(a.speed * 100)}% shot speed` : '', a.trick ? TRICKS[a.trick][1] : ''].filter(Boolean).join(' · ');

  /* ── sockets: an add-on lives on a gun slot; the node for that slot carries it while flying ── */
  function nodeFor(slotId) {
    const m = saveState.doc.design?.modular, P = engine.player; if (!m || !P?.nodes) return null;
    const i = m.fittings.findIndex(f => f.slot === slotId); if (i < 0) return null;
    const n = P.nodes[P.nodes.length - m.fittings.length + i];
    return n && n.weapon ? n : null;
  }
  function sync() {
    const D = doc(), P = engine.player; if (!P?.nodes) return;
    for (const n of P.nodes) if (n._addon) { if (n._addonQuirk) n.quirk = n._baseQuirk; delete n._addon; delete n._addonQuirk; delete n._baseQuirk; }
    for (const [slot, a] of Object.entries(D.slots)) {
      const n = nodeFor(slot);
      if (!n) continue;   // the slot holds no gun now; the add-on waits on the slot
      n._addon = a;
      if (a.trick && !n.quirk) { n._baseQuirk = n.quirk; n.quirk = a.trick; n._addonQuirk = true; }
    }
    lastSync = key();
  }
  const key = () => { const P = engine.player; return (P?.nodes?.length || 0) + '|' + JSON.stringify(saveState.doc.design?.modular?.fittings || []) + '|' + Object.keys(doc().slots).join(','); };
  function socket(slotId, addonId) {
    const D = doc(), i = D.hold.findIndex(a => a.id === addonId); if (i < 0) return false;
    const [a] = D.hold.splice(i, 1);
    if (D.slots[slotId]) D.hold.push(D.slots[slotId]);
    D.slots[slotId] = a; saveState.save(); sync(); return true;
  }
  function unsocket(slotId) {
    const D = doc(), a = D.slots[slotId]; if (!a) return false;
    delete D.slots[slotId]; D.hold.push(a); saveState.save(); sync(); return true;
  }

  /* ── drops ─────────────────────────────────────────────────────────── */
  function drop(e) {
    const tier = e.tier || 1;
    if (e.training || e.holo || (!e.isBoss && tier < CFG.minTier)) return;
    const chance = e.isBoss ? CFG.boss : e.elite ? CFG.elite : e.archetype === 'outpost' ? CFG.outpost : CFG.chance;
    if (Math.random() >= chance) return;
    const D = doc(); if (D.hold.length >= CFG.hold) return;
    const a = make(tier, e.isBoss ? 1.5 : e.elite ? 0.5 : 0);
    D.hold.push(a); saveState.save();
    particleSystem.spawnBubbleBurst?.(e.x, e.y, RARITY[a.rarity].colour, 22);
    particleSystem.particles.push(new Particle(e.x, e.y, { vx: 1e-4, vy: 1e-4, type: 'ring', radius: 16, maxRadius: 180, color: RARITY[a.rarity].colour, decay: 0.03 }));
    window.garage?.banner(`ADD-ON · ${a.name.toUpperCase()} · ${describe(a)} · socket it from Refit`, a.rarity === 'relic' || a.rarity === 'exotic' ? 'hunt' : 'good');
  }

  // The gun a shot left from: the nearest of your weapon nodes to where the shot was born (quirks.shot runs on the
  // frame it is created). Only worth asking while an add-on is socketed.
  function muzzleAddon(p) {
    const P = engine.player; if (!P?.nodes || !Object.keys(doc().slots).length) return null;
    const c = Math.cos(P.angle || 0), s = Math.sin(P.angle || 0);
    let best = null, bd = Infinity;
    for (const n of P.nodes) {
      if (!n.weapon || n.lost) continue;
      const dx = n.currentDx ?? n.dx ?? 0, dy = n.currentDy ?? n.dy ?? 0, d = Math.hypot(P.x + dx * c - dy * s - p.x, P.y + dx * s + dy * c - p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best && bd < 90 ? best._addon || null : null;
  }
  function install() {
    if (!window.engine?.killEnemy || typeof quirks === 'undefined' || !window.fieldRefit?.ready) { setTimeout(install, 80); return; }
    const kill = engine.killEnemy;
    engine.killEnemy = function (i, ...a) { const e = this.enemies[i]; const r = kill.call(this, i, ...a); try { if (e && e.hp <= 0) drop(e); } catch (err) { console.warn('[weapon-addons]', err.message); } return r; };
    const shot = quirks.shot;
    quirks.shot = function (p, q) {
      const a = p.isPlayer ? muzzleAddon(p) : null;
      const r = shot.call(this, p, q);
      if (a) { p.damage *= 1 + a.dmg; if (a.speed) { p.vx *= 1 + a.speed; p.vy *= 1 + a.speed; } }
      return r;
    };
    const update = engine.update;
    engine.update = function (...a) { const r = update.apply(this, a); if (key() !== lastSync) try { sync(); } catch { } return r; };
    sync();
    window.weaponAddons.ready = true;
  }
  window.weaponAddons = { ready: false, CFG, RARITY, TRICKS, make, describe, socket, unsocket, sync, doc,
    hold: () => doc().hold, on: slotId => doc().slots[slotId] || null, grant(tier = 8, boost = 0) { const a = make(tier, boost); doc().hold.push(a); saveState.save(); return a; } };
  if (document.readyState === 'complete') setTimeout(install, 700); else window.addEventListener('load', () => setTimeout(install, 700));
})();
