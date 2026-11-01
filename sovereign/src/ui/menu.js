// Pause menu and Settings. Esc or the gear button opens it; the simulation pauses while it is open.
// Display settings apply live; a change of graphics quality reloads (the renderer is built for one level).
import { QUALITY } from '../render/renderer.js';
import { saveSettings } from '../core/settings.js';

export function createMenu({ settings, view, audio, onPause, onSave, onQuit, onQualityChange, onEscape }) {
  const root = document.getElementById('menu');
  const gear = document.querySelector('[data-gear]');
  const panes = { main: root.querySelector('[data-pane="main"]'), settings: root.querySelector('[data-pane="settings"]') };
  let open = false;

  function show(pane) {
    for (const [k, el] of Object.entries(panes)) el.hidden = k !== pane;
  }
  function setOpen(v, pane = 'main') {
    open = v;
    root.classList.toggle('show', v);
    show(pane);
    onPause(v);
    if (v) render();
  }

  const qualityNow = view.qualityName;
  function render() {
    const s = settings;
    panes.settings.querySelector('[data-set-body]').innerHTML = `
      <h3>GRAPHICS</h3>
      <label>Quality <select data-k="quality">${Object.keys(QUALITY).map((k) => `<option value="${k}" ${k === qualityNow ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}</select></label>
      <label>Resolution <select data-k="resolution">
        <option value="auto" ${s.resolution === 'auto' ? 'selected' : ''}>AUTO (holds frame rate)</option>
        ${[1, 0.9, 0.8, 0.7, 0.6].map((v) => `<option value="${v}" ${s.resolution === v ? 'selected' : ''}>${Math.round(v * 100)}%</option>`).join('')}
      </select></label>
      <label>Glow <input type="range" min="0" max="1.5" step="0.05" value="${s.glow}" data-k="glow"><output>${Math.round(s.glow * 100)}%</output></label>
      <label>Film grain <input type="checkbox" data-k="grain" ${s.grain ? 'checked' : ''}></label>
      <label>Edge colour fringe <input type="checkbox" data-k="fringe" ${s.fringe ? 'checked' : ''}></label>
      <h3>SOUND</h3>
      ${[['volMaster', 'Master'], ['volSfx', 'Weapons and impacts'], ['volEngine', 'Engines'], ['volAmbient', 'Ambience'], ['volUi', 'Interface']].map(([k, l]) =>
        `<label>${l} <input type="range" min="0" max="1" step="0.05" value="${s[k]}" data-k="${k}"><output>${Math.round(s[k] * 100)}%</output></label>`).join('')}
      <label>Mute <input type="checkbox" data-k="muted" ${s.muted ? 'checked' : ''}></label>
      <h3>CONTROLS</h3>
      <label>Camera sensitivity <input type="range" min="0.3" max="2.5" step="0.05" value="${s.camSensitivity}" data-k="camSensitivity"><output>${s.camSensitivity.toFixed(2)}×</output></label>
      <label>Invert camera vertical <input type="checkbox" data-k="invertY" ${s.invertY ? 'checked' : ''}></label>
      <label>HUD size <input type="range" min="0.75" max="1.3" step="0.05" value="${s.hudScale}" data-k="hudScale"><output>${Math.round(s.hudScale * 100)}%</output></label>
      <h3>KEYS</h3>
      <div class="keys">
        <span><kbd>W</kbd><kbd>S</kbd> throttle</span><span><kbd>A</kbd><kbd>D</kbd> yaw</span><span><kbd>R</kbd><kbd>F</kbd> pitch</span><span><kbd>Q</kbd><kbd>E</kbd> roll</span>
        <span><kbd>X</kbd> stop</span><span><kbd>Tab</kbd> lock</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> fire groups</span><span><kbd>O</kbd> orbit</span>
        <span><kbd>G</kbd> dock</span><span><kbd>P</kbd> scan ping</span><span><kbd>M</kbd> Atlas</span><span><kbd>C</kbd> chase cam</span>
        <span><kbd>N</kbd> mute</span><span><kbd>H</kbd> help</span><span><kbd>F3</kbd> performance</span><span><kbd>Esc</kbd> menu</span>
      </div>`;
  }

  panes.settings.addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    const t = e.target;
    let v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value;
    if (k === 'resolution' && v !== 'auto') v = Number(v);
    if (k === 'quality') { settings.quality = v; saveSettings(settings); onQualityChange(v); return; }
    settings[k] = v;
    saveSettings(settings);
    if (t.nextElementSibling?.tagName === 'OUTPUT') t.nextElementSibling.textContent = k === 'camSensitivity' ? v.toFixed(2) + '×' : Math.round(v * 100) + '%';
    apply();
  });

  function apply() {
    view.applySettings(settings);
    audio?.applyVolumes();
    if (settings.resolution !== 'auto') view.setResolutionScale(settings.resolution);
    document.documentElement.style.setProperty('--hud-scale', settings.hudScale);
  }
  apply();

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-m]')?.dataset.m;
    if (a) audio?.ui('click');
    if (a === 'resume') setOpen(false);
    if (a === 'settings') show('settings'), render();
    if (a === 'back') show('main');
    if (a === 'save') onSave();
    if (a === 'quit') onQuit();
  });
  gear.addEventListener('click', () => setOpen(!open));
  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    // Esc first lets go of a locked target; with nothing to release it opens or closes the menu.
    if (!open && onEscape?.()) return;
    setOpen(!open);
  });
  return { get open() { return open; }, setOpen };
}
