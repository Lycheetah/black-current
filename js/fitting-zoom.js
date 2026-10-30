/* FITTING ZOOM (Route 4 item 4; Mac, 2026-10-30: "on mobile you cannot see the ship fitting screen properly … the ship is
 * too zoomed in so we need pinch to zoom"). The yard's stage now opens fitted to the whole hull (its margin grew so engine
 * and prow art are no longer cropped on a narrow phone), and you can look closer:
 *   phone   pinch to zoom (1× to 4×), drag with one finger to pan once zoomed; a drag never counts as a slot tap
 *   desktop the mouse wheel zooms around the cursor, drag pans
 *   both    − / fit / + buttons in the stage corner
 * The view is a CSS transform on the scene, so slot taps, the SVG and the preview keep working unchanged; the zoom is
 * kept across the yard's re-renders while you fit, and reset when you open another ship. */
(() => {
  'use strict';
  const MIN = 0.5, MAX = 4;   // below 1: room around a big build
  let k = 1, tx = 0, ty = 0, ready = false, stage = null, controls = null, lastKey = '';
  const pointers = new Map();
  let pinch = null, drag = null, moved = false;
  const scene = () => stage?.querySelector('.modular-scene');
  function clamp() {
    k = Math.max(MIN, Math.min(MAX, k));
    const W = stage.clientWidth, H = stage.clientHeight;
    // keep the scene covering the stage: no panning off into empty space
    // zoomed in, keep the scene covering the stage; zoomed out, keep it centred
    if (k >= 1) { tx = Math.min(0, Math.max(W - W * k, tx)); ty = Math.min(0, Math.max(H - H * k, ty)); } else { tx = (W - W * k) / 2; ty = (H - H * k) / 2; }
  }
  function apply() {
    const s = scene(); if (!s) return; clamp();
    const tf = k === 1 ? '' : `translate(${tx}px,${ty}px) scale(${k})`; if (s.style.transform !== tf) { s.style.transformOrigin = '0 0'; s.style.transform = tf; }
    const label = k === 1 ? 'Fit' : Math.round(k * 10) / 10 + '×', fit = controls?.querySelector('[data-zoom=fit]');
    if (fit && fit.textContent !== label) fit.textContent = label;   // only on change: the yard observer would loop on every write
  }
  // zoom by factor f around stage point (px, py)
  function zoomAt(f, px, py) { const nk = Math.max(MIN, Math.min(MAX, k * f)), r = nk / k; tx = px - (px - tx) * r; ty = py - (py - ty) * r; k = nk; apply(); }
  const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function down(e) {
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; drag = null; moved = true; }
    else if (pointers.size === 1) { drag = { at: local(e), tx, ty }; moved = false; }
  }
  function move(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const target = pinch.k * d / Math.max(1, pinch.d); zoomAt(target / k, pinch.mid[0], pinch.mid[1]); e.preventDefault();
    } else if (drag && k > 1) {
      const [x, y] = local(e), dx = x - drag.at[0], dy = y - drag.at[1];
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (moved) { tx = drag.tx + dx; ty = drag.ty + dy; apply(); e.preventDefault(); }
    }
  }
  function up(e) { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) drag = null; }
  function wheel(e) { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * 0.0015), x, y); }
  function attach() {
    const st = document.getElementById('modular-stage'); if (!st) return;
    if (st !== stage) {
      stage = st; stage.style.touchAction = 'none'; stage.style.position = stage.style.position || 'relative'; stage.style.overflow = 'hidden';
      stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move, { passive: false });
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) stage.addEventListener(t, up);
      stage.addEventListener('wheel', wheel, { passive: false });
      new MutationObserver(() => { if (scene() && !scene().dataset.zoomed) { scene().dataset.zoomed = '1'; keep(); } }).observe(stage, { childList: true });
    }
    if (!controls || !stage.contains(controls)) {
      if (controls) { stage.append(controls); keep(); return; }
      controls = document.createElement('div'); controls.className = 'fit-zoom'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Zoom the ship');
      for (const [z, label, f] of [['out', '−', 1 / 1.4], ['fit', 'Fit', 0], ['in', '+', 1.4]]) {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.zoom = z; b.textContent = label; b.setAttribute('aria-label', z === 'fit' ? 'Fit the whole ship' : z === 'in' ? 'Zoom in' : 'Zoom out');
        b.addEventListener('pointerdown', e => e.stopPropagation());
        b.addEventListener('click', e => { e.stopPropagation(); if (!f) { k = 1; tx = ty = 0; apply(); } else zoomAt(f, stage.clientWidth / 2, stage.clientHeight / 2); });
        controls.append(b);
      }
      stage.append(controls);   // inside the stage corner; the yard's re-render drops it and the observer puts it back
    }
    keep();
  }
  // a new ship resets the view; re-renders of the same ship keep it
  function keep() { const key = saveState.doc.design?.id || saveState.doc.design?.frame || ''; if (key !== lastKey) { lastKey = key; k = 1; tx = ty = 0; } apply(); }
  // a pan or a pinch is not a tap: swallow the click it would end in, on window in the capture phase so it runs before
  // the phone yard's own capture listener on the panel (which would switch to the Fit tab)
  window.addEventListener('click', e => { if (moved && stage?.contains(e.target)) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
  function install() {
    if (!window.modularYard || !document.getElementById('modular-yard')) { setTimeout(install, 80); return; }
    new MutationObserver(attach).observe(document.getElementById('modular-yard'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    attach(); ready = true;
  }
  window.fittingZoom = { zoomAt, reset: () => { k = 1; tx = ty = 0; apply(); }, get k() { return k; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 420));
})();
