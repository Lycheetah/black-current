/* FIELD REFIT (Mac, 2026-11-01: "we should add refitting on the move"). Swapping equipment you own already worked
 * away from a station (modular-ships.js fieldReason), but only through the full shipyard, so nobody found it. This is
 * the quick version, in flight: Refit (C, or the Refit button) lists your fitting slots; pick one and it offers only the
 * spares that would apply here (owned, fit the slot, researched). Applying goes through engine.applyDesign, the one
 * refit path, so every rule, save and stat recalculation is the shipyard's. Hull sections and new hardware still need a
 * station or a Forward Dock. Closed while hostiles are near: break contact first. */
(() => {
  'use strict';
  const CFG = { clear: 1600 }, ORDER = ['point', 'light', 'medium', 'heavy', 'siege', 'capital', 'utility', 'engine'];
  const M = () => window.modularShips, $ = id => document.getElementById(id);
  let panel = null, open = null, buttons = [];
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
  const copy = o => JSON.parse(JSON.stringify(o));

  function blocked() {
    const P = engine.player;
    if (!saveState.doc.launched || P.dead) return 'Launch first.';
    if (!saveState.doc.design?.modular) return 'Field refit needs a modular hull.';
    const near = engine.enemies.find(e => !e.dead && !e.training && Math.hypot(e.x - P.x, e.y - P.y) < CFG.clear);
    return near ? 'Hostiles close. Break contact to refit.' : null;
  }
  function slots() {
    const m = saveState.doc.design.modular, S = M().SECTIONS;
    const count = {};
    return m.sections.filter(s => S[s.kind]?.slot).map(s => {
      const type = S[s.kind].slot, f = m.fittings.find(f => f.slot === s.id);
      count[s.kind] = (count[s.kind] || 0) + 1;
      return { id: s.id, type, name: S[s.kind].name + (m.sections.filter(x => x.kind === s.kind).length > 1 ? ' ' + count[s.kind] : ''), gear: f?.gear || null };
    }).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));   // guns first: what you swap most
  }
  // A design with this slot's fitting swapped, if the field rules and the fitting check accept it.
  function candidate(slot, gear) {
    const d = copy(saveState.doc.design), list = d.modular.fittings.filter(f => f.slot !== slot);
    if (gear) list.push({ slot, gear, mk: 1 });
    d.modular.fittings = list;
    try { const c = M().compile(d); if (M().check(c.design) || M().fieldReason(d)) return null; } catch { return null; }
    return d;
  }
  function options(s) {
    return Object.entries(M().GEARS).filter(([id, g]) => id !== s.gear && M().fits(s.type, g)).map(([id, g]) => ({ id, g, d: candidate(s.id, id) })).filter(o => o.d);
  }

  function paint() {
    const list = panel.querySelector('.fr-list'), note = panel.querySelector('.fr-note');
    list.replaceChildren();
    const why = blocked();
    note.textContent = why || 'Swap equipment you own. Hull sections and new hardware need a station or a Forward Dock.';
    note.classList.toggle('bad', !!why);
    if (why) return;
    for (const s of slots()) {
      const row = el('div', null, 'fr-slot' + (open === s.id ? ' open' : ''));
      const head = el('button', null, 'fr-head'); head.type = 'button';
      const A = window.weaponAddons, on = A?.on(s.id), gun = s.gear && M().GEARS[s.gear]?.weapon;
      head.append(el('span', s.name, 'fr-name'), el('span', s.gear ? M().GEARS[s.gear]?.name || s.gear : 'empty', 'fr-gear'));
      if (on && gun) { const chip = el('span', on.name, 'fr-addon'); chip.style.setProperty('--rc', A.RARITY[on.rarity].colour); head.append(chip); }
      head.onclick = () => { open = open === s.id ? null : s.id; paint(); };
      row.append(head);
      if (open === s.id) {
        const opts = options(s), box = el('div', null, 'fr-opts');
        if (!opts.length) box.append(el('p', 'No spare gun or module here fits this slot. Buy hardware at a station.', 'fr-none'));
        for (const o of opts) {
          const b = el('button', null, 'fr-opt'); b.type = 'button';
          b.append(el('strong', o.g.name), el('small', [o.g.cls, o.g.family].filter(Boolean).join(' · ')));
          b.onclick = () => fit(s, o);
          box.append(b);
        }
        if (gun && A) {   // weapon add-ons (js/weapon-addons.js): socket one from the hold, or take it off
          const hold = A.hold();
          if (on || hold.length) box.append(el('p', 'Add-ons', 'fr-sub'));
          if (on) { const b = el('button', null, 'fr-opt fr-addon-opt quiet'); b.type = 'button'; b.style.setProperty('--rc', A.RARITY[on.rarity].colour); b.append(el('strong', 'Remove ' + on.name), el('small', A.describe(on))); b.onclick = () => { A.unsocket(s.id); paint(); }; box.append(b); }
          for (const a of hold) { const b = el('button', null, 'fr-opt fr-addon-opt'); b.type = 'button'; b.style.setProperty('--rc', A.RARITY[a.rarity].colour); b.append(el('strong', a.name), el('small', A.describe(a))); b.onclick = () => { A.socket(s.id, a.id); window.garage?.banner(`ADD-ON SOCKETED · ${a.name} on ${s.name}`, 'good'); open = null; paint(); }; box.append(b); }
        }
        if (s.gear) { const off = candidate(s.id, null); if (off) { const b = el('button', 'Unfit', 'fr-opt quiet'); b.type = 'button'; b.onclick = () => fit(s, { id: null, g: { name: 'nothing' }, d: off }); box.append(b); } }
        row.append(box);
      }
      panel.querySelector('.fr-list').append(row);
    }
  }
  function fit(s, o) {
    const why = blocked(); if (why) { window.garage?.banner(why, 'bad'); paint(); return; }
    if (engine.applyDesign(o.d) === false) { paint(); return; }
    const P = engine.player;
    particleSystem.spawnBubbleBurst?.(P.x, P.y, '#ffd36a', 18);
    (typeof soundEngine !== 'undefined') && soundEngine.playPhrase([392, 523.25, 659.25], 0.05);
    window.garage?.banner(o.id ? `REFIT · ${o.g.name} on ${s.name}` : `REFIT · ${s.name} cleared`, 'good');
    open = null; paint();
  }
  function toggle(force) {
    const show = force ?? panel.hidden;
    panel.hidden = !show;
    document.body.classList.toggle('field-refit-open', show);
    if (show) { open = null; paint(); }
  }

  function install() {
    if (!M()?.ready || !window.hubs || !window.engine?.applyDesign || !$('view-controls') || !$('phone-zoom')) { setTimeout(install, 80); return; }
    panel = el('section', null, 'field-refit'); panel.id = 'field-refit'; panel.hidden = true; panel.setAttribute('aria-label', 'Field refit');
    const top = el('header'), close = el('button', '×', 'fr-close'); close.type = 'button'; close.setAttribute('aria-label', 'Close refit'); close.onclick = () => toggle(false);
    top.append(el('strong', 'Field refit'), close);
    panel.append(top, el('p', null, 'fr-note'), el('div', null, 'fr-list'));
    for (const t of ['pointerdown', 'mousedown', 'touchstart']) panel.addEventListener(t, e => e.stopPropagation(), { passive: true });
    document.body.append(panel);
    for (const [id, host, label] of [['btn-refit', 'phone-zoom', 'Refit'], ['btn-refit-desktop', 'view-controls', 'Refit · C']]) {
      const b = el('button', label, 'refit-button'); b.id = id; b.type = 'button'; b.title = 'Field refit: swap equipment you own, away from a station (C)';
      b.onclick = e => { e.stopPropagation(); toggle(); };
      for (const t of ['pointerdown', 'mousedown', 'touchstart']) b.addEventListener(t, e => e.stopPropagation(), { passive: true });
      $(host).append(b); buttons.push(b);
    }
    document.addEventListener('keydown', e => {
      if (e.code !== 'KeyC' || e.repeat || e.target.closest('input,textarea,select,[contenteditable=true]')) return;
      if (!saveState.doc.launched) return;
      e.preventDefault(); toggle();
    });
    // Contact closes it: the panel stays honest about why.
    setInterval(() => { if (!panel.hidden && blocked() && !panel.querySelector('.fr-note.bad')) paint(); }, 500);
    window.fieldRefit.ready = true;
  }
  window.fieldRefit = { ready: false, CFG, toggle, blocked, slots, options };
  if (document.readyState === 'complete') setTimeout(install, 400); else window.addEventListener('load', () => setTimeout(install, 400));
})();
