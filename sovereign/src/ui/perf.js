// Performance readout (F9 or ?perf): frame rate, frame time, draw calls, triangles, memory.
export function createPerfOverlay(view, enabled = false) {
  const el = document.createElement('div');
  el.className = 'perf';
  el.hidden = !enabled;
  document.body.appendChild(el);
  let acc = 0;
  addEventListener('keydown', (e) => { if (e.code === 'F9') { e.preventDefault(); el.hidden = !el.hidden; } });
  return {
    update(dt) {
      if (el.hidden || (acc += dt) < 0.25) return;
      acc = 0;
      const s = view.stats;
      el.innerHTML = `<b>${s.fps.toFixed(0)}</b> FPS · ${s.ms.toFixed(1)} ms render<br>${s.calls} draw calls · ${(s.triangles / 1000).toFixed(0)}k tris<br>${s.geometries} geo · ${s.textures} tex · ${s.programs} shaders · ×${s.pixelRatio.toFixed(2)} · ${(view.qualityName || '').toUpperCase()}`;
    },
  };
}
