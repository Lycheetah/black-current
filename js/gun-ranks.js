/* GUN RANKS (overnight run step 5). Mac, 2026-10-29: "we add say 10 ranks to each gun … so people can fly a really
 * elite cruiser … and still defend itself". Every gun type you own has a rank from 1 to 10, shared by every mount
 * that carries it. Each rank adds RANK damage, so rank 10 hits 1.54×. Ranks are bought with metal at a station
 * (the upgrade path), priced by the gun's class, so between frames there is always a next step within minutes.
 * Elite marks (Mk I–III, overnight step 6) build on rank 10: js/elite-marks.js. */
(() => {
  'use strict';
  const CLASSES = ['POINT', 'LIGHT', 'MEDIUM', 'HEAVY', 'SIEGE', 'CAPITAL'];
  // base = metal for rank 1→2; each later rank costs `growth` × base more (rank 9→10 = 5.8 × base).
  const CFG = { max: 10, perRank: 0.06, growth: 0.6, base: { POINT: 20, LIGHT: 60, MEDIUM: 200, HEAVY: 650, SIEGE: 2000, CAPITAL: 6000 } };
  let ready = false, notice = '';
  const $ = id => document.getElementById(id);
  function doc() { let d = saveState.doc.gunRanks; if (!d || d.v !== 1 || typeof d.ranks !== 'object' || Array.isArray(d.ranks)) d = saveState.doc.gunRanks = { v: 1, ranks: {} }; return d; }
  const known = w => !!(typeof WEAPON_TYPES !== 'undefined' && WEAPON_TYPES[w] && window.arsenal?.GUNS?.[w]);
  function rank(w) { const r = Math.floor(Number(doc().ranks[w]) || 1); return Math.max(1, Math.min(CFG.max, r)); }
  const mult = w => 1 + CFG.perRank * (rank(w) - 1);
  const classOf = w => CLASSES[arsenal.GUNS[w]?.c ?? 0] || 'POINT';
  function cost(w) { const r = rank(w); if (!known(w) || r >= CFG.max) return null; return Math.round(CFG.base[classOf(w)] * (1 + CFG.growth * (r - 1))); }
  function raise(w) {
    const price = cost(w);
    if (price == null) { notice = known(w) ? 'Already rank 10. Elite marks are the next step.' : 'Unknown gun.'; return false; }
    if (!hubs.docked) { notice = 'Dock at a station to rank up a gun.'; return false; }
    if (hubs.metal < price) { notice = `Needs ${price.toLocaleString()} metal.`; return false; }
    const before = { metal: saveState.doc.metal, ranks: JSON.stringify(doc().ranks) };
    saveState.doc.metal = hubs.metal - price; doc().ranks[w] = rank(w) + 1;
    if (!saveState.save()) { saveState.doc.metal = before.metal; doc().ranks = JSON.parse(before.ranks); notice = 'Save failed. Nothing was spent.'; return false; }
    notice = `${WEAPON_TYPES[w].title} is now rank ${rank(w)} (+${Math.round((mult(w) - 1) * 100)}% damage).`;
    window.walletHUD?.paint?.(); garage.banner(notice, 'good'); return true;
  }
  // The gun types on the ship you fly, strongest class first.
  function fitted() {
    const ids = new Set();
    for (const n of engine.player.nodes || []) if (n.type === 'cannon' && !n.lost) { const w = n.weapon || window.fleet?.weaponFor?.(n); if (known(w)) ids.add(w); }
    return [...ids].sort((a, b) => (arsenal.GUNS[b].c - arsenal.GUNS[a].c) || a.localeCompare(b));
  }
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function section() {
    const host = el('section', null, 'gun-ranks'); host.id = 'gun-ranks';
    host.append(el('h3', 'Gun ranks · +6% damage a rank, up to 10'), el('p', 'Every mount carrying the same gun shares its rank. Rank 10 opens elite marks.', 'path-note'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    const list = fitted();
    if (!list.length) host.append(el('p', 'Fit a gun to rank it up.'));
    for (const w of list) {
      const r = rank(w), price = cost(w), row = el('div', null, 'gun-rank-row'); row.dataset.gunRankRow = w;
      const name = el('strong', `${WEAPON_TYPES[w].title} · ${classOf(w)}`), pips = el('span', '●'.repeat(r) + '○'.repeat(CFG.max - r), 'gun-rank-pips');
      pips.setAttribute('aria-label', `Rank ${r} of ${CFG.max}`); pips.style.cssText = 'letter-spacing:2px;color:#f0d78a;margin:0 8px';
      const b = el('button', price == null ? 'Rank 10 · elite marks next' : `Rank up · ${price.toLocaleString()} metal`); b.type = 'button'; b.dataset.gunRank = w;
      b.disabled = price == null || !hubs.docked || hubs.metal < price;
      b.onclick = () => { raise(w); refresh(); };
      row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0';
      row.append(name, pips, b); host.append(row);
    }
    if (!hubs.docked) host.append(el('p', 'Dock at a station to buy ranks.', 'path-note'));
    return host;
  }
  function refresh() { const old = $('gun-ranks'); if (old) old.replaceWith(section()); }
  function install() {
    if (!window.upgradePath?.render || !window.arsenal?.GUNS || typeof engine === 'undefined' || !engine.fireMountGroup) { setTimeout(install, 60); return; }
    const render = upgradePath.render; upgradePath.render = function (...a) { const root = render.apply(this, a); try { notice = ''; root.append(section()); } catch (e) { console.warn('gun ranks:', e.message); } return root; };
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (w, mounts, dmg, ...a) { return fire.call(this, w, mounts, (dmg ?? 1) * (known(w) ? mult(w) : 1), ...a); };
    window.addEventListener('black-current-wallet', refresh);
    ready = true;
  }
  window.gunRanks = { CFG, doc, rank, mult, cost, raise, fitted, classOf, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
