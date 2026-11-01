// Player settings, remembered between sessions. Read once at boot; the menu writes through set().
const KEY = 'sovereign_eclipse_settings';

export const DEFAULTS = {
  quality: null,          // null = pick for the device (medium on touch, high elsewhere)
  resolution: 'auto',     // 'auto' (adapts to hold the frame rate) or a fixed scale 0.6 … 1
  glow: 0.6,              // bloom strength multiplier 0 … 1.5
  grain: false,           // film grain
  fringe: false,          // chromatic fringe at the screen edges
  camSensitivity: 1,      // orbit camera drag speed
  invertY: false,
  hudScale: 1,
  volMaster: 0.8,
  volSfx: 0.8,
  volEngine: 0.6,
  volAmbient: 0.5,
  volUi: 0.6,
  muted: false,
};

export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
