/* GUN MODS (overnight run step 24; Route 2 Stage 4, ship identity). At rank 5 a gun type opens one mod slot, filled at
 * a station for elite cores and metal; every mount carrying that gun shares it, the way ranks are shared:
 *   homing  shots lean toward the hostile nearest your aim (gently, unlike seeker missiles) · damage −10%
 *   pierce  each shot passes through one more hull
 *   split   each shot throws two side shards at 35% damage
 * Changing a mod costs the full price again. Hooks: the shots a fireMountGroup call creates are modified in place;
 * homing shots are steered on the engine tick. The section sits on the upgrade path, under gun ranks. */
(() => {
  'use strict';
  const MODS = {
    homing: { name: 'Homing', line: 'shots lean toward the hostile nearest your aim · damage −10%' },
    pierce: { name: 'Pierce', line: 'each shot passes through one more hull' },
    split: { name: 'Split', line: 'each shot throws two side shards at 35% damage' }
  };
  const CFG = { unlock: 5, cores: 2, metalPerBase: 4, homingSteer: 0.06, homingDamage: 0.9, splitDamage: 0.35, splitAngle: 0.22 };
  let ready = false, notice = '';
  const $ = id => document.getElementById(id);
  function doc() { let d = saveState.doc.gunMods; if (!d || d.v !== 1 || typeof d.mods !== 'object' || Array.isArray(d.mods)) d = saveState.doc.gunMods = { v: 1, mods: {} }; return d; }
  const modOf = w => MODS[doc().mods[w]] ? doc().mods[w] : null;
  const price = w => ({ cores: CFG.cores, metal: Math.round((gunRanks.CFG.base[gunRanks.classOf(w)] || 60) * CFG.metalPerBase) });
  function fit(w, id) {
    if (!MODS[id]) return false; const P = price(w);
    const fail = text => { notice = text; refresh(); return false; };
    if (gunRanks.rank(w) < CFG.unlock) return fail(`${WEAPON_TYPES[w]?.title || w} opens a mod slot at rank ${CFG.unlock}.`);
    if (!hubs.docked) return fail('Dock at a station to fit a gun mod.');
    if (modOf(w) === id) return fail(`${WEAPON_TYPES[w].title} already carries ${MODS[id].name}.`);
    if (window.eliteMarks.cores() < P.cores) return fail(`${MODS[id].name} needs ${P.cores} elite cores.`);
    if (hubs.metal < P.metal) return fail(`${MODS[id].name} needs ${P.metal.toLocaleString()} metal.`);
    const marks = window.eliteMarks.doc?.() || window.gunRanks.doc(), before = { metal: saveState.doc.metal, cores: marks.cores, mod: doc().mods[w] };
    saveState.doc.metal = hubs.metal - P.metal; marks.cores -= P.cores; doc().mods[w] = id;
    if (!saveState.save()) { saveState.doc.metal = before.metal; marks.cores = before.cores; doc().mods[w] = before.mod; return fail('Save failed. Nothing was spent.'); }
    notice = `${WEAPON_TYPES[w].title} fitted with ${MODS[id].name}.`; garage.banner('GUN MOD · ' + notice, 'good'); window.walletHUD?.paint?.(); refresh(); return true;
  }
  function modify(w, from) {
    const id = modOf(w); if (!id) return;
    const P = engine.player, list = engine.projectiles, made = list.slice(from).filter(q => q.isPlayer);
    if (id === 'pierce') for (const q of made) q.pierce = (q.pierce || 1) + 1;
    else if (id === 'homing') { const ax = engine.input?.aimX ?? P.x, ay = engine.input?.aimY ?? P.y; let best = null, bd = Infinity; for (const e of engine.enemies) { if (e.hp <= 0 || e.training) continue; const d = Math.hypot(e.x - ax, e.y - ay); if (d < bd) { bd = d; best = e; } }
      for (const q of made) { q.damage *= CFG.homingDamage; q._modHoming = best; } }
    else if (id === 'split') for (const q of made) { const sp = Math.hypot(q.vx, q.vy), a = Math.atan2(q.vy, q.vx);
      for (const s of [-1, 1]) { const b = new Projectile(q.x, q.y, Math.cos(a + s * CFG.splitAngle) * sp, Math.sin(a + s * CFG.splitAngle) * sp, { color: q.color, damage: q.damage * CFG.splitDamage, radius: Math.max(3, (q.radius || 6) * 0.7), isPlayer: true, type: q.type, life: q.life }); b.splitShard = true; list.push(b); } }
  }
  function steer() {
    for (const q of engine.projectiles) { const t = q._modHoming; if (!t || t.hp <= 0) continue; const dx = t.x - q.x, dy = t.y - q.y, d = Math.hypot(dx, dy), sp = Math.hypot(q.vx, q.vy); if (d > 0) { q.vx += (dx / d * sp - q.vx) * CFG.homingSteer; q.vy += (dy / d * sp - q.vy) * CFG.homingSteer; } }
  }
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function section() {
    const host = el('section', null, 'gun-mods'); host.id = 'gun-mods';
    host.append(el('h3', `Gun mods · one slot per gun at rank ${CFG.unlock}`), el('p', `Bought with elite cores and metal while docked. You hold ${window.eliteMarks?.cores?.() ?? 0} elite cores.`, 'path-note'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    for (const w of gunRanks.fitted()) {
      const row = el('div', null, 'gun-mod-row'); row.dataset.gunModRow = w; const r = gunRanks.rank(w), P = price(w);
      row.append(el('strong', `${WEAPON_TYPES[w].title} · rank ${r}${modOf(w) ? ' · ' + MODS[modOf(w)].name : ''}`));
      if (r < CFG.unlock) row.append(el('small', `Mod slot opens at rank ${CFG.unlock}.`));
      else for (const [id, m] of Object.entries(MODS)) { const b = el('button', `${m.name} · ${P.cores} cores + ${P.metal.toLocaleString()} metal`); b.type = 'button'; b.title = m.line; b.dataset.gunMod = w + ':' + id; b.setAttribute('aria-pressed', String(modOf(w) === id)); b.disabled = modOf(w) === id || !hubs.docked; b.onclick = () => fit(w, id); row.append(b); }
      host.append(row);
    }
    return host;
  }
  function refresh() { try { const old = $('gun-mods'); if (old) old.replaceWith(section()); } catch (e) { } }
  function install() {
    if (!window.gunRanks?.ready || !window.eliteMarks?.ready || !window.upgradePath?.render || typeof engine === 'undefined' || !engine.fireMountGroup) { setTimeout(install, 70); return; }
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, ...a) { const n0 = this.projectiles.length, r = fire.call(this, w, mounts, ...a); try { modify(w, n0); } catch (e) { console.warn('gun mods:', e.message); } return r; };
    const update = engine.update; engine.update = function (...a) { if (!this.paused) try { steer(); } catch (e) { } return update.apply(this, a); };
    const render = upgradePath.render; upgradePath.render = function (...a) { const root = render.apply(this, a); try { notice = ''; root?.append?.(section()); } catch (e) { console.warn('gun mods:', e.message); } return root; };
    ready = true;
  }
  window.gunMods = { MODS, CFG, doc, modOf, price, fit, section, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 380));
})();
