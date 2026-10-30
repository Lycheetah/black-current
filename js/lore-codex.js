/* THE PANTHEON (Mac, 2026-10-30: "do up the lore and civilizations"). One codex for the fifteen canon civilisations:
 * each one's epithet, traits, motto, fleet doctrine and DNA, favoured weapon and relic; its hull ladder, with the nine
 * classes this game flies marked (js/civ-ships.js builds them); and its full authored codex text (js/canon-lore.js,
 * generated from docs/canon). ⚖ Every word shown is canon text; nothing here is written for it.
 * Door: the title menu (Civilisations). The pause menu keeps its three extras (Mac's short-pause rule, witness-menu-kit). */
(() => {
  'use strict';
  let dialog = null, current = null, ready = false;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const civs = () => (window.canon?.civilisations || []).slice().sort((a, b) => a.order - b.order);
  const tint = id => (window.modularShips?.FACTORY || []).find(f => f.civ === id)?.color || '#8fd8cc';
  const FLOWN = { Frigate: 'frigate', Destroyer: 'destroyer', Cruiser: 'cruiser', 'Heavy Cruiser': 'heavycruiser', Battlecruiser: 'battlecruiser', Battleship: 'battleship', Dreadnought: 'capital', Carrier: 'supercapital', Titan: 'titan' };
  function build() {
    dialog = el('dialog'); dialog.id = 'lore-codex'; dialog.setAttribute('aria-labelledby', 'lore-codex-title');
    const head = el('header', 'lc-head'), title = el('h2', null, 'The Pantheon · fifteen civilisations'); title.id = 'lore-codex-title';
    const close = el('button', 'lc-close', '× Close'); close.type = 'button'; close.id = 'lore-codex-close'; close.onclick = () => hide();
    head.append(title, close);
    const nav = el('nav', 'lc-nav'); nav.setAttribute('aria-label', 'Civilisations');
    for (const c of civs()) {
      const b = el('button', 'lc-civ'); b.type = 'button'; b.dataset.civ = c.id; b.style.setProperty('--civ', tint(c.id));
      b.append(el('strong', null, c.name), el('small', null, c.epithet)); if (c.id === saveState.doc?.civ) b.classList.add('yours');
      b.onclick = () => show(c.id); nav.append(b);
    }
    const page = el('article', 'lc-page'); page.id = 'lore-codex-page'; page.tabIndex = -1;
    dialog.append(head, el('div', 'lc-body')); dialog.lastChild.append(nav, page);
    dialog.addEventListener('cancel', e => { e.preventDefault(); hide(); });
    document.body.append(dialog);
  }
  function render(id) {
    const c = civs().find(x => x.id === id) || civs()[0]; if (!c) return; current = c.id;
    for (const b of dialog.querySelectorAll('.lc-civ')) b.setAttribute('aria-pressed', String(b.dataset.civ === c.id));
    const page = dialog.querySelector('.lc-page'); page.style.setProperty('--civ', tint(c.id)); page.replaceChildren();
    page.append(el('p', 'lc-kicker', String(c.order).padStart(2, '0') + ' · ' + c.epithet), el('h3', 'lc-name', c.name), el('p', 'lc-traits', c.traits), el('blockquote', 'lc-motto', c.motto));
    const facts = el('dl', 'lc-facts');
    for (const [k, v] of [['Fleet doctrine', c.fleetDoctrine], ['Fleet DNA', c.fleetDNA], ['Doctrine', c.doctrine], ['Favoured weapon', c.weapon], ['Relic', c.relic]]) if (v) facts.append(el('dt', null, k), el('dd', null, v));
    page.append(facts);
    // the hull ladder: all eighteen canon classes, the nine this game flies marked
    const hulls = window.canon?.hulls?.[c.id] || [];
    if (hulls.length) {
      const h = el('section', 'lc-ladder'); h.append(el('h4', null, 'Hull lineage'));
      const list = el('ol');
      for (const x of hulls) { const li = el('li', FLOWN[x.cls] ? 'flown' : null); li.append(el('span', 'lc-cls', x.cls), el('b', null, x.name)); if (FLOWN[x.cls]) { li.title = 'In the shipyard: Ready-built ships → ' + c.name; li.append(el('em', null, 'in the shipyard')); } list.append(li); }
      h.append(list); page.append(h);
    }
    if (c.frontier) { const f = el('section', 'lc-frontier'); f.append(el('h4', null, 'Black Current · frontier'), el('p', null, c.frontier.replace(/\s*-{3,}\s*$/, ''))); page.append(f); }
    // the authored codex
    const lore = window.canonLore?.[c.id];
    if (lore) lore.sections.filter(s => !['Overview', 'Doctrine', 'Weapon', 'Relic', 'Fleet DNA'].includes(s.title)).forEach((s, i) => {
      const d = el('details', 'lc-section'); if (i < 2) d.open = true; d.append(el('summary', null, s.title));
      for (const p of s.p) d.append(el(p.q ? 'blockquote' : 'p', null, p.t));
      page.append(d);
    });
    page.scrollTop = 0;
  }
  function show(id) {
    if (!dialog) build();
    render(id || current || saveState.doc?.civ || civs()[0]?.id);
    if (!dialog.open) { try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); } }
  }
  function hide() { if (dialog?.open) dialog.close(); }
  function door(after, id, cls) {
    if (!after || document.getElementById(id)) return;
    const b = el('button', cls, 'Civilisations'); b.type = 'button'; b.id = id; b.onclick = () => show(); after.after(b);
  }
  function install() {
    if (!window.canon?.civilisations || !window.canonLore || !window.saveState) { setTimeout(install, 60); return; }
    door(document.getElementById('btn-menu-howto'), 'btn-menu-lore', 'tm-door');
    ready = true;
  }
  window.loreCodex = { show, hide, get open() { return !!dialog?.open; }, get current() { return current; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 250));
})();
