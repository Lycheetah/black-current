/* HULL PATHS (overnight run step 23; Route 2 Stage 4, ship identity). Every frame can be specialised down one of five
 * paths, bought on the upgrade path while docked and remembered per frame (your cruiser can be an interceptor while
 * your battleship is a siege ship). Each path is a clear trade, a few multipliers, never a free lunch:
 *   interceptor  thrust +20%, hull −12%, shield −10%                       get in, get out
 *   assault      gun damage +12%, thrust −5%                               trade blows
 *   logistics    hull +15%, shield +25%, hull repairs 0.3%/s, damage −10%  outlast
 *   carrier      +1 wingman slot, wingmen hit 30% harder, damage −10%      the fleet is the weapon
 *   siege        gun damage +8%, shot range +25%, thrust −15%              reach
 * Hooks: thrust and hull through saveState.coreMod, damage and range around engine.fireMountGroup, shields around
 * arsenal.shields.profile, repair on the engine tick, and wingmen.js asks extraWingmen()/wingDamage(). */
(() => {
  'use strict';
  const PATHS = {
    interceptor: { name: 'Interceptor', line: 'Thrust +20% · hull −12% · shield −10%', thrust: 1.2, hull: 0.88, shield: 0.9 },
    assault: { name: 'Assault', line: 'Gun damage +12% · thrust −5%', damage: 1.12, thrust: 0.95 },
    logistics: { name: 'Logistics', line: 'Hull +15% · shield +25% · hull repairs 0.3%/s · damage −10%', hull: 1.15, shield: 1.25, regen: 0.003, damage: 0.9 },
    carrier: { name: 'Carrier', line: '+1 wingman slot · wingmen hit 30% harder · damage −10%', wingmen: 1, wingDamage: 1.3, damage: 0.9 },
    siege: { name: 'Siege', line: 'Gun damage +8% · shot range +25% · thrust −15%', damage: 1.08, range: 1.25, thrust: 0.85 }
  };
  const CFG = { base: 150, framePart: 0.2 };
  let ready = false, notice = '';
  const $ = id => document.getElementById(id);
  function doc() { let d = saveState.doc.hullPaths; if (!d || d.v !== 1 || typeof d.byHull !== 'object' || Array.isArray(d.byHull)) d = saveState.doc.hullPaths = { v: 1, byHull: {} }; return d; }
  const hull = () => saveState.doc.design?.modular?.hull || 'frigate';
  const current = () => { const id = doc().byHull[hull()]; return PATHS[id] ? id : null; };
  const mod = key => { const p = PATHS[current()]; return p && p[key] != null ? p[key] : (key === 'wingmen' || key === 'regen' ? 0 : 1); };
  const price = (h = hull()) => Math.round(CFG.base + CFG.framePart * (window.tuning?.PRICE_CURVE?.frame?.[h] || 0));
  function choose(id) {
    if (!PATHS[id]) return false;
    if (!hubs.docked) { notice = 'Dock at a station to refit your frame to a path.'; refresh(); return false; }
    if (current() === id) { notice = `Your ${hull()} already flies the ${PATHS[id].name} path.`; refresh(); return false; }
    const cost = price(); if (hubs.metal < cost) { notice = `Refitting to ${PATHS[id].name} needs ${cost.toLocaleString()} metal.`; refresh(); return false; }
    const before = { metal: saveState.doc.metal, path: doc().byHull[hull()] };
    saveState.doc.metal = hubs.metal - cost; doc().byHull[hull()] = id;
    if (!saveState.save()) { saveState.doc.metal = before.metal; doc().byHull[hull()] = before.path; notice = 'Save failed. Nothing was spent.'; refresh(); return false; }
    apply(); notice = `${hull()} refitted: ${PATHS[id].name} (${PATHS[id].line}).`; garage.banner('HULL PATH · ' + notice, 'good'); window.walletHUD?.paint?.(); refresh(); return true;
  }
  function apply() { try { engine.recalculatePlayerStats(); window.wingmen?.spawnAll?.(); } catch (e) { } }
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function section() {
    const host = el('section', null, 'hull-paths'); host.id = 'hull-paths';
    host.append(el('h3', `Hull path · ${hull()}`), el('p', `One path per frame, remembered when you change ships. Refit: ${price().toLocaleString()} metal${hubs.docked ? '' : ' (dock to refit)'}.`, 'path-note'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    for (const [id, p] of Object.entries(PATHS)) {
      const on = current() === id, b = el('button', null, 'hull-path'); b.type = 'button'; b.dataset.hullPath = id; b.setAttribute('aria-pressed', String(on));
      b.append(el('strong', (on ? '✓ ' : '') + p.name), el('small', p.line)); b.disabled = on || !hubs.docked || hubs.metal < price(); b.onclick = () => choose(id); host.append(b);
    }
    return host;
  }
  function refresh() { try { const old = $('hull-paths'); if (old) old.replaceWith(section()); } catch (e) { } }
  function install() {
    // wait for combat-scaling: its class hull bonus must sit inside the hull wrapper below
    if (!window.upgradePath?.render || !window.arsenal?.shields?.profile || !window.combatScaling?.ready || typeof engine === 'undefined' || !engine.fireMountGroup || !saveState.coreMod) { setTimeout(install, 70); return; }
    const core = saveState.coreMod.bind(saveState); saveState.coreMod = stat => core(stat) * (stat === 'thrust' ? mod('thrust') : 1);
    // hull scales the finished figure (after combat-scaling's class bonus), keeping the damage you have taken
    const recalc = engine.recalculatePlayerStats; engine.recalculatePlayerStats = function (...a) { const r = recalc.apply(this, a), k = mod('hull'); if (k !== 1) { const P = this.player, missing = P.maxHp - P.hp; P.maxHp = Math.max(40, Math.round(P.maxHp * k)); P.hp = Math.max(0, Math.min(P.maxHp, P.maxHp - missing)); } return r; };
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, dmg, ...a) { const n0 = this.projectiles.length, r = fire.call(this, w, mounts, (dmg ?? 1) * mod('damage'), ...a), k = mod('range'); if (k !== 1) for (let i = n0; i < this.projectiles.length; i++) { const q = this.projectiles[i]; if (q.isPlayer && q.life) q.life = Math.round(q.life * k); } return r; };
    const prof = arsenal.shields.profile; arsenal.shields.profile = function (...a) { const s = prof.apply(this, a), k = mod('shield'); if (s && k !== 1) { s.pool *= k; s.rate *= k; } return s; };
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { const P = this.player, g = mod('regen'); if (g > 0 && !this.paused && !P.dead && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * g / 60); } catch (e) { } return r; };
    const render = upgradePath.render; upgradePath.render = function (...a) { const root = render.apply(this, a); try { notice = ''; root?.append?.(section()); } catch (e) { console.warn('hull paths:', e.message); } return root; };
    const applyDesign = engine.applyDesign; engine.applyDesign = function (...a) { const r = applyDesign.apply(this, a); try { this.recalculatePlayerStats(); } catch (e) { } return r; };
    apply(); ready = true;
  }
  window.hullPaths = { PATHS, CFG, doc, current, mod, price, choose, section, extraWingmen: () => mod('wingmen'), wingDamage: () => mod('wingDamage'), get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 350));
})();
