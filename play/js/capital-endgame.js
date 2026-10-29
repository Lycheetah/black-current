/* CAPITAL ENDGAME (master route Stage 6).
 * - CITADELS: every null-band system holds a fortress in its deepest corner sector: a core, two shield
 *   generators, three batteries and a hangar, each a real hull. The core is sealed until both generators
 *   fall. Breaking it pays a capital roster gun, a CITADEL HEART (unique +8-power titan clip-on) and metal.
 * - WARLORDS: six roaming titan flagships named from the canon (each civilisation's Titan + epithet).
 *   Each roams the null band on a real-time schedule (tuning.ENDGAME.roamMs) and hunts sectors at
 *   danger ≥ warlordMinDanger. Its first defeat pays a relic-trait capital gun; later defeats pay metal.
 * Threat stays fixed by place (tuning.ROWS); nothing here reads the player's power. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const E = () => window.tuning.ENDGAME, ROW = d => window.tuning.ROWS[Math.max(1, Math.min(20, d))];
  let ready = false, active = null;
  const doc = () => { const d = saveState.doc; if (!d.capital || d.capital.v !== 1) d.capital = { v: 1, citadels: {}, warlords: {} }; return d.capital; };
  const IMG = {};
  for (const [k, path] of Object.entries({ slab: 'art/keyed/armor/citadel_slab-v1.png', crown: 'art/keyed/precursor_blocks/solar_citadel-v1.png', keel: 'art/keyed/precursor_blocks/obsidian_keel-v1.png' })) { const i = new Image(); i.onload = () => IMG[k] = i; i.src = window.__ART?.[path] || path; }

  // ---- where ----
  function citadelOf(ch) {
    if (!ch?.sys || ch.isHaven || ch.isBossSector || (ch.dangerLevel || 0) < window.tuning.BANDS.null[0]) return null;
    const n = worldMap.size, h = hash('citadel:' + ch.sys.id), cx = (h & 1 ? 1 : -1) * n, cy = (h & 2 ? 1 : -1) * n;
    return ch.gridX === cx && ch.gridY === cy ? { key: ch.sys.id + ':' + cx + ',' + cy, danger: ch.dangerLevel } : null;
  }
  const CIVS = ['savanah', 'chaos', 'blackhole', 'cosmic-darkness', 'ai-gods', 'amethyst-angels'];
  function warlords() {
    return CIVS.map((id, index) => { const civ = canon.civilisations.find(c => c.id === id), t = (canon.hulls[id] || []).find(h => h.cls === 'Titan'); return { id, index, name: t?.name || civ.name + ' Titan', epithet: civ.epithet, civ: civ.name }; });
  }
  const nullSystems = () => galaxy.data.systems.filter(s => !s.home && s.rid >= 3).sort((a, b) => a.id < b.id ? -1 : 1);
  const epoch = (now = Date.now()) => Math.floor(now / E().roamMs);
  function warlordSystem(w, now = Date.now()) { const L = nullSystems(); return L[(hash(w.id) + epoch(now) * (w.index * 2 + 1)) % L.length]; }
  function warlordHere(ch) {
    if (!ch?.sys || (ch.dangerLevel || 0) < E().warlordMinDanger || citadelOf(ch)) return null;
    return warlords().find(w => warlordSystem(w).id === ch.sys.id && doc().warlords[w.id]?.lastEpoch !== epoch()) || null;
  }

  // ---- build ----
  function hull(x, y, tier, archetype, name, role, extra = {}) {
    const e = new EnemyOrganism(x, y, { tier, archetype, name });
    const row = ROW(tier), mult = extra.hp || 1;
    e.maxHp = e.hp = Math.round(row.hp * mult); e.maxShield = e.shield = Math.round(row.shield * (extra.shield ?? 1));
    e.combatScale = { tier, damage: row.damage, bounty: Math.round(row.bounty * (extra.bounty || 1)), parts: row.parts };
    e.capital = { role, anchor: extra.pinned ? { x, y } : null }; e._aggro = true;
    return e;
  }
  function buildCitadel(c, enemies) {
    const d = c.danger, C = E().citadel, ring = 1100;
    const core = hull(0, 0, d, 'stalker', 'Citadel core', 'core', { hp: C.core, shield: 3, bounty: C.bounty, pinned: true });
    core.capital.sealed = true;
    const parts = [core,
      ...[0, 1].map(i => hull(Math.cos(i * Math.PI + 0.4) * ring, Math.sin(i * Math.PI + 0.4) * ring, d, 'stalker', 'Shield generator', 'generator', { hp: C.generator, shield: 2, pinned: true })),
      ...[0, 1, 2].map(i => hull(Math.cos(i * TAU / 3 + 1.2) * ring * 1.5, Math.sin(i * TAU / 3 + 1.2) * ring * 1.5, Math.max(1, d - 1), 'sniper', 'Citadel battery', 'battery', { hp: C.battery, pinned: true })),
      hull(-ring * 1.6, ring * 0.3, Math.max(1, d - 2), 'hive', 'Citadel hangar', 'hangar', { hp: C.hangar, pinned: true })];
    const screens = enemies.filter(e => !e.isBoss && !e.name).slice(0, 12 - parts.length);
    active = { kind: 'citadel', key: c.key, danger: d, core };
    garage.banner('CITADEL · break both shield generators to unseal the core', 'hunt');
    return [...parts, ...screens];
  }
  function buildWarlord(w, ch, enemies) {
    const d = Math.max(ch.dangerLevel, E().warlord.tier), P = engine.player, a = Math.atan2(-P.y, -P.x), R = (ch.radius || 9000) * 0.45;
    const flag = hull(Math.cos(a) * R, Math.sin(a) * R, d, 'stalker', w.name, 'warlord', { hp: E().warlord.hp, shield: 2, bounty: E().warlord.bounty });
    flag.elite = true; flag.warlord = w;
    const escorts = [-1, 1].map(s => hull(flag.x + Math.cos(a + s * 2.4) * 1400, flag.y + Math.sin(a + s * 2.4) * 1400, Math.max(1, d - 2), 'stalker', w.civ + ' escort', 'escort', { hp: 1.5 }));
    const screens = enemies.filter(e => !e.isBoss && !e.name).slice(0, 12 - 3);
    active = { kind: 'warlord', key: w.id, danger: d, flag, warlord: w };
    garage.banner('WARLORD · ' + w.name + ' · ' + w.epithet + ' hunts this sector', 'hunt');
    return [flag, ...escorts, ...screens];
  }

  // ---- rewards ----
  function capitalGun(seed, quirk) {
    const pool = Object.entries(modularShips.GEARS).filter(([, g]) => g.weapon && g.cls === 'CAPITAL' && !g.retired && !g.salvageOnly), [, g] = pool[hash(seed) % pool.length];
    return { type: 'cannon', radius: g.radius, weapon: g.weapon, ...(quirk ? { quirk, rarity: 'relic' } : {}) };
  }
  function citadelFallen(e) {
    const a = active; if (!a) return;
    doc().citadels[a.key] = Date.now();
    progression.spawnSalvage(e.x, e.y, { promised: true, part: capitalGun('citadel:' + a.key) });
    const h = modularShips.hangar(); h.owned['kit:citadelheart'] = Math.min(64, (Number(h.owned['kit:citadelheart']) || 0) + 1); saveState.doc.modularHangar = h;
    hubs.metal += ROW(a.danger).bounty * E().citadel.reward;
    saveState.save(); active = null;
    garage.banner('CITADEL BROKEN · Citadel heart recovered (+8 power titan clip-on) · capital gun in the wreck', 'good');
  }
  function warlordFallen(e) {
    const w = e.warlord, rec = doc().warlords[w.id] || { defeats: 0 }, first = !rec.defeats;
    rec.defeats++; rec.lastEpoch = epoch(); doc().warlords[w.id] = rec;
    if (first) { const quirks = Object.entries(loot.QUIRKS).filter(([, q]) => q.type === 'cannon').map(([k]) => k); progression.spawnSalvage(e.x, e.y, { part: capitalGun('warlord:' + w.id, quirks[hash(w.id) % quirks.length]) }); }
    hubs.metal += ROW(20).bounty * E().warlord.reward;
    saveState.save(); active = null;
    garage.banner('WARLORD FALLEN · ' + w.name + (first ? ' · its relic gun drifts free' : ' · bounty paid'), 'good');
  }

  // ---- runtime ----
  const generatorsUp = () => engine.enemies.some(e => e.capital?.role === 'generator' && e.hp > 0);
  function install() {
    if (!window.wideDark?.ready || !window.combatScaling?.ready || !window.canon) { setTimeout(install, 60); return; }
    const load = engine.loadChamberEntities;
    engine.loadChamberEntities = function (...a) {
      const r = load.apply(this, a); active = null;
      try {
        const ch = worldMap.getCurrentChamber(), c = citadelOf(ch);
        if (c && !doc().citadels[c.key]) this.enemies = buildCitadel(c, this.enemies);
        else { const w = warlordHere(ch); if (w) this.enemies = buildWarlord(w, ch, this.enemies); }
      } catch (err) { console.warn('capital endgame:', err.message); }
      return r;
    };
    const update = EnemyOrganism.prototype.update;
    EnemyOrganism.prototype.update = function (...a) {
      const r = update.apply(this, a), c = this.capital;
      if (c?.anchor) { this.x = c.anchor.x; this.y = c.anchor.y; this.vx = this.vy = 0; }
      if (c?.role === 'core' && c.sealed && !generatorsUp()) { c.sealed = false; garage.banner('CITADEL SHIELD DOWN · the core is open', 'good'); }
      return r;
    };
    // A sealed core shrugs off every hit, shield or hull.
    const take = EnemyOrganism.prototype.takeDamage;
    EnemyOrganism.prototype.takeDamage = function (amount) { if (this.capital?.sealed) return; return take.call(this, amount); };
    const node = engine.damageNode;
    engine.damageNode = function (ship, ...a) { if (ship?.capital?.sealed) return; return node.call(this, ship, ...a); };
    const kill = engine.killEnemy;
    engine.killEnemy = function (i) { const e = this.enemies[i]; const r = kill.call(this, i); try { if (e?.capital?.role === 'core') citadelFallen(e); else if (e?.capital?.role === 'warlord') warlordFallen(e); } catch (err) { console.warn('capital reward:', err.message); } return r; };
    const membrane = worldMap.drawChamberMembrane.bind(worldMap);
    worldMap.drawChamberMembrane = (ctx, camera) => { membrane(ctx, camera); try { drawCitadel(ctx, camera); } catch { } };
    ready = true;
  }
  function drawCitadel(ctx, camera) {
    if (active?.kind !== 'citadel') return;
    const t = performance.now(), k = 2400;
    ctx.save(); ctx.translate(-camera.x, -camera.y);
    if (IMG.slab) { ctx.save(); ctx.rotate(t * 0.00002); ctx.globalAlpha = 0.85; ctx.drawImage(IMG.slab, -k / 2, -k / 2, k, k); ctx.restore(); }
    if (IMG.crown) { const s = 1000; ctx.drawImage(IMG.crown, -s / 2, -s / 2, s, s); }
    if (active.core.capital.sealed) { ctx.strokeStyle = 'rgba(134,222,208,.55)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, 0, 640 + Math.sin(t * 0.004) * 12, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  window.capitalEndgame = { citadelOf, warlords, warlordSystem, warlordHere, epoch, nullSystems, get active() { return active; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 520));
})();
