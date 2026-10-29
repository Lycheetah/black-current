/* Shared, scalable navigation glyphs. No font/emoji dependency. */
(() => {
 'use strict';
 const paths={
  fitting:'M4 8h16v12H4z M8 8V4h8v4 M8 12v4m-2-2h4m5-2h2m-2 4h2',
  equipment:'M3 9l10-5 8 4-10 5z M3 9v8l8 4 10-5V8 M11 13v8 M7 7l10 5',
  upgrades:'M4 20V4m0 16h16 M7 15l4-5 4 2 5-8m-5 0h5v5',
  missions:'M6 5h12v16H6z M9 5V3h6v2 M9 10h6m-6 4h6m-6 4h4',
  hold:'M4 8l8-5 8 5v9l-8 4-8-4z M4 8l8 4 8-4 M12 12v9',
  codex:'M12 5C8 2 4 3 3 4v15c3-2 6-1 9 1 3-2 6-3 9-1V4c-3-2-6-2-9 1z M12 5v15',
  stock:'M3 8l2-5h14l2 5 M4 8v13h16V8 M3 8c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0 M8 21v-7h5v7',
  captain:'M12 3l9 4-2 10-7 5-7-5L3 7z M9 11l2 2 4-5',
  training:'M12 2v4m0 12v4M2 12h4m12 0h4 M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  Gunnery:'M3 16h7l5-7h6v4h-4l-4 7H3z M5 8h5m-3-3v6',
  Engineering:'M9 3h6l1 4 4 1v8l-4 1-1 4H9l-1-4-4-1V8l4-1z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  Expedition:'M12 3a9 9 0 1 0 9 9 M12 3v9l7-7 M9 15l6-6 M5 12h2m5 5v2',
  chart:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
  settings:'M4 6h10m4 0h2 M4 12h4m4 0h8 M4 18h12m4 0h0 M14 4v4 M8 10v4 M16 16v4',
  help:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6 M12 17h.01',
  resume:'M7 4l13 8-13 8z',
  quit:'M14 4h5v16h-5 M10 8l-4 4 4 4 M6 12h10'
 };
 window.serviceGlyph=id=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',paths[id]||paths.captain);s.append(p);return s;};
})();
