/* ART DROP (Route 4 item 8; Mac, 2026-10-30: "I'm going to have Cael generate an absolute boat load of art"). New art
 * lands without code: put PNGs under art/cael/, list them in art/cael/manifest.json (scripts/import-art.py writes the
 * rows and checks each file), and they replace the matching art in every view (flight, slip, cards, icons):
 *   { "kind": "section", "id": "drive" }                          a hull section kind (docs/ART_CAEL_BRIEF.md lists them)
 *   { "kind": "gun", "id": "rifle-heavy", "pivot": [x, y], "radius": r }   one gun; or "kind": "arch" for a whole archetype
 * Every image is top-down with the nose UP, on a transparent background. A missing or broken file is skipped and the
 * art that was there stays; nothing else changes (positions, slots, hit circles stay with the engine). */
(() => {
  'use strict';
  const MANIFEST = 'art/cael/manifest.json';
  const stats = { listed: 0, loaded: 0, failed: [], kinds: {} };
  let ready = false;
  const load = path => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = window.__ART?.[path] || path; });
  async function readManifest() {
    if (window.__ART?.[MANIFEST]) { try { return JSON.parse(atob(window.__ART[MANIFEST].split(',')[1])); } catch (e) { } }
    try { const r = await fetch(MANIFEST, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; }
  }
  async function install() {
    if (!window.sectionArt?.use || !window.turretArt?.use) { setTimeout(install, 80); return; }
    const m = await readManifest(), items = Array.isArray(m?.items) ? m.items : [];
    stats.listed = items.length;
    await Promise.all(items.map(async it => {
      if (!it?.id || !it?.path || !/^art\/cael\/[\w\-/.]+\.png$/.test(it.path)) { stats.failed.push(it?.path || '?'); return; }
      const img = await load(it.path); if (!img) { stats.failed.push(it.path); return; }
      if (it.kind === 'section') sectionArt.use(it.id, img);
      else if (it.kind === 'gun' || it.kind === 'arch') { const S = img.naturalWidth, [x, y] = it.pivot || [S / 2, S / 2]; turretArt.use(it.id, img, x, y, it.radius); }
      else { stats.failed.push(it.path + ' (kind ' + it.kind + ' not wired yet)'); return; }
      stats.loaded++; stats.kinds[it.kind] = (stats.kinds[it.kind] || 0) + 1;
    }));
    // repaint what already drew with the old art
    try { window.topdownKit?.flightCache?.clear?.(); window.modularYard?.refresh?.(); window.noviceFleet?.paint?.(); } catch (e) { }
    ready = true;
  }
  window.artDrop = { stats, MANIFEST, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
