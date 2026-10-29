/* ONE MENU KIT (Route 2 · Stage 1). css/ui-kit.css owns the look; this file owns layout.
 * - Every service panel root gets `uk-panel`, so frames, headers and close buttons read as one family.
 * - The pause menu is regrouped, not rebuilt: the same buttons (same ids, same handlers, added by nine
 *   scripts) move into a header, an objective strip, Resume, six pictured tiles, a row of small extras
 *   and a quiet footer. Anything unknown lands in the extras, so a new door is never lost. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let ready = false;
  const PANELS = ['#pause-menu > .menu-card', '#dock-panel > .menu-card', '#build-panel > .menu-card', '#menu-panel > .menu-card',
    '#salvage-panel > .menu-card', '#captain-panel > .menu-card', '#build-library > .menu-card', '#map-overlay > .modal-card',
    'dialog#hangar-picker', 'dialog#equipment-codex', 'dialog#wallet-panel', 'dialog#boss-scene-menu'];
  // [match, glyph, label, detail]. Labels are what a new player reads; ids and handlers are untouched.
  const TILES = [
    [b => b.id === 'btn-pause-shipyard', 'fitting', 'Ship fitting', 'Fit, rotate & build'],
    [b => /^Captain/.test(b.dataset.ukLabel || b.textContent.trim()), 'captain', 'Captain', 'Build, perks & jobs'],
    [b => b.id === 'btn-pause-chart', 'chart', 'Sector chart', 'Plan a route · M'],
    [b => b.id === 'btn-equipment-codex', 'codex', 'Equipment Codex', 'Stats & compatible slots'],
    [b => b.id === 'btn-pause-settings', 'settings', 'Settings', 'Sound, feel & graphics'],
    [b => b.id === 'btn-pause-howto', 'help', 'How to play', 'Controls & the basics']
  ];
  // Duplicates of a tile: the modular yard is what Ship fitting opens.
  const DUPLICATE = b => b.dataset.service === 'modular';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  function tile(b, glyph, label, detail) {
    if (b.dataset.ukTile) return;
    b.dataset.ukLabel = b.textContent.trim(); b.dataset.ukTile = glyph;
    const icon = el('span', 'uk-tile-icon'); icon.append(window.serviceGlyph ? serviceGlyph(glyph) : '');
    b.replaceChildren(icon, el('strong', null, label), el('small', null, detail));
    b.setAttribute('aria-label', label);
  }
  function organizePause() {
    const card = document.querySelector('#pause-menu > .menu-card'), doors = card?.querySelector('.tm-doors');
    if (!card || !doors) return;
    let head = card.querySelector('.uk-head');
    if (!head) {
      head = el('header', 'uk-head');
      for (const n of [card.querySelector('.tm-kicker'), $('pause-title'), $('pause-where')]) if (n) head.append(n);
      card.prepend(head);
    }
    const tiles = card.querySelector('.uk-tiles') || el('nav', 'uk-tiles'), extras = card.querySelector('.uk-extras') || el('nav', 'uk-extras'), foot = card.querySelector('.uk-foot') || el('footer', 'uk-foot');
    tiles.setAttribute('aria-label', 'Ship and captain'); extras.setAttribute('aria-label', 'More');
    const all = [...card.querySelectorAll('.tm-doors button, .uk-tiles button, .uk-extras button, .uk-foot button')];
    const resume = $('btn-pause-resume'), quit = $('btn-pause-quit'), next = $('journey-next');
    for (const [match, glyph, label, detail] of TILES) { const b = all.find(match); if (b) { tile(b, glyph, label, detail); tiles.append(b); } }
    for (const b of all) {
      if (b === resume || b === quit || b === next || b.dataset.ukTile) continue;
      if (DUPLICATE(b)) { b.hidden = true; continue; }
      if (!b.hidden) extras.append(b);
    }
    if (next) next.classList.add('uk-objective');
    if (resume) resume.classList.add('uk-resume');
    if (quit) foot.append(quit);
    doors.classList.add('uk-doors');
    doors.replaceChildren(...[next, resume].filter(Boolean));
    if (!tiles.isConnected) doors.after(tiles);
    if (!extras.isConnected) tiles.after(extras);
    if (!foot.isConnected) card.append(foot);
    card.classList.add('uk-pause');
  }
  function tagPanels() { for (const sel of PANELS) for (const n of document.querySelectorAll(sel)) n.classList.add('uk-panel'); }
  function install() {
    // The pause doors arrive from nine scripts; wait for the last of them before the first regroup.
    if (!window.stationGrid?.ready || !window.equipmentCodex?.ready || !$('btn-boss-scenes') || !window.serviceGlyph) { setTimeout(install, 80); return; }
    tagPanels(); organizePause();
    // Late doors (and panels built on first open) are folded in whenever pause or a panel opens.
    const pause = $('pause-menu');
    new MutationObserver(() => { if (pause.style.display !== 'none') { organizePause(); tagPanels(); } }).observe(pause, { attributes: true, attributeFilter: ['style'] });
    document.addEventListener('toggle', tagPanels, true);
    const build = document.getElementById('btn-open-build'); if (build) build.textContent = 'Structures';   // station construction, not the shipyard
    ready = true;
  }
  window.uiKit = { organizePause, tagPanels, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
