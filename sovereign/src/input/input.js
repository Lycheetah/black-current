// Input: keyboard, mouse and touch become a ship order, camera gestures and discrete actions.
// Input never writes the simulation; main.js hands the order to the sim each step.

const KEYMAP = {
  thrustUp: ['KeyW'], thrustDown: ['KeyS'],
  yawLeft: ['KeyA', 'ArrowLeft'], yawRight: ['KeyD', 'ArrowRight'],
  pitchUp: ['KeyR', 'ArrowUp'], pitchDown: ['KeyF', 'ArrowDown'],
  rollLeft: ['KeyQ'], rollRight: ['KeyE'],
};
const ACTIONS = {
  KeyX: 'stop', KeyC: 'chase', KeyH: 'help', KeyL: 'level',
  Tab: 'lockNearest', Escape: 'unlock', Space: 'allGroups', KeyO: 'orbit', KeyK: 'keepRange', KeyT: 'approach',
  Digit1: 'group:fore', Digit2: 'group:mid', Digit3: 'group:aft',
  BracketLeft: 'hullPrev', BracketRight: 'hullNext', Comma: 'racePrev', Period: 'raceNext',
};

export function createInput(canvas, touchRoot) {
  const held = new Set();
  const actions = [];
  const cam = { dx: 0, dy: 0, zoom: 1 };
  const touch = { yaw: 0, pitch: 0, roll: 0, throttleSet: null };

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    held.add(e.code);
    const a = ACTIONS[e.code];
    if (a) actions.push(e.shiftKey && a.startsWith('group:') ? a.replace('group:', 'groupAuto:') : a);
    if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  // Mouse: drag to orbit, wheel to zoom.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerType === 'touch') return;
    cam.dx += e.clientX - drag.x; cam.dy += e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoom *= Math.exp(e.deltaY * 0.0012); }, { passive: false });

  // Touch on the canvas: one finger orbits, two fingers pinch-zoom.
  const pts = new Map();
  let pinch = 0;
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) pts.set(t.identifier, { x: t.clientX, y: t.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = pts.get(t.identifier);
      if (!p) continue;
      if (pts.size === 1) { cam.dx += t.clientX - p.x; cam.dy += t.clientY - p.y; }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) cam.zoom *= pinch / d;
      pinch = d;
    }
  }, { passive: false });
  const endTouch = (e) => { for (const t of e.changedTouches) pts.delete(t.identifier); pinch = 0; };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  if (touchRoot) bindTouchControls(touchRoot, touch, actions);

  const k = (name) => KEYMAP[name].some((c) => held.has(c));
  return {
    /** The pilot's order for this step. */
    shipCommand() {
      const throttleSet = touch.throttleSet;
      touch.throttleSet = null;
      return {
        throttle: (k('thrustUp') ? 1 : 0) - (k('thrustDown') ? 1 : 0),
        throttleSet,
        yaw: clampUnit((k('yawRight') ? 1 : 0) - (k('yawLeft') ? 1 : 0) + touch.yaw),
        pitch: clampUnit((k('pitchUp') ? 1 : 0) - (k('pitchDown') ? 1 : 0) + touch.pitch),
        roll: clampUnit((k('rollRight') ? 1 : 0) - (k('rollLeft') ? 1 : 0) + touch.roll),
        stop: false,
      };
    },
    takeCamera() { const c = { ...cam }; cam.dx = cam.dy = 0; cam.zoom = 1; return c; },
    takeActions() { return actions.splice(0); },
    /** UI clicks and taps join the same queue as keys. */
    push(action) { actions.push(action); },
  };
}

const clampUnit = (v) => Math.max(-1, Math.min(1, v));

/** On-screen flight stick, throttle rail and roll buttons for phones. */
function bindTouchControls(root, touch, actions) {
  const stick = root.querySelector('[data-stick]');
  const knob = root.querySelector('[data-knob]');
  const rail = root.querySelector('[data-throttle]');
  let stickId = null;
  const moveStick = (t) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = (t.clientX - cx) / R, dy = (t.clientY - cy) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    touch.yaw = dx; touch.pitch = -dy;
  };
  stick.addEventListener('touchstart', (e) => { e.preventDefault(); stickId = e.changedTouches[0].identifier; moveStick(e.changedTouches[0]); }, { passive: false });
  stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === stickId) moveStick(t); }, { passive: false });
  const release = (e) => { for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; touch.yaw = touch.pitch = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', release);
  stick.addEventListener('touchcancel', release);

  const setThrottle = (t) => {
    const r = rail.getBoundingClientRect();
    touch.throttleSet = Math.max(0, Math.min(1, 1 - (t.clientY - r.top) / r.height));
  };
  rail.addEventListener('touchstart', (e) => { e.preventDefault(); setThrottle(e.changedTouches[0]); }, { passive: false });
  rail.addEventListener('touchmove', (e) => { e.preventDefault(); setThrottle(e.changedTouches[0]); }, { passive: false });

  for (const btn of root.querySelectorAll('[data-roll]')) {
    const dir = Number(btn.dataset.roll);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); touch.roll = dir; }, { passive: false });
    btn.addEventListener('touchend', () => { touch.roll = 0; });
  }
  for (const btn of root.querySelectorAll('[data-action]')) {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); actions.push(btn.dataset.action); }, { passive: false });
  }
}
