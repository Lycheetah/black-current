/* ==========================================================================
   BUBBLE TANKS — MOVEMENT FEEL
   ==========================================================================

   Mac, playing, 2026-08-16: "physics feels so sluggish."
   Mac, playing the first fix:  "the feel of it is so slow."

   TWO CORRECTIONS ARE RECORDED HERE. Both were caught by evidence rather
   than by reasoning, and both are easy to make again.

   ── 1. THE FORMULA ─────────────────────────────────────────────────────
   engine.js does `v += a` and THEN `v *= d` in the same frame, so the
   steady state solves v = (v + a)·d:

       terminal = a·d / (1 − d)        NOT   a / (1 − d)

   I shipped `a/(1−d)`, predicted 10.7 px/frame, and the witness measured
   the ship topping out at 8.43 — exactly a·d/(1−d). The ship was right.

   ── 2. THE DIAL EXPOSED THE WRONG TWO KNOBS ────────────────────────────
   The first version let Mac tune `accel` and `damping`. Those are the
   engine's variables, not the player's, and they are COUPLED: because
   terminal = a·d/(1−d), lowering damping to make the ship snappier also
   lowers its top speed. You cannot ask that dial for "fast AND responsive"
   — the two knobs fight, and Mac hit the wall immediately.

   ⭐ **A tuning dial must expose what the player FEELS, not what the
      integrator stores.** So this version dials:

       TOP SPEED   px/frame — how fast the ship actually goes
       RESPONSE    damping  — how quickly it gets there and sheds it

   and DERIVES acceleration from them:

       accel = topSpeed · (1 − d) / d

   Now raising response never costs speed, and raising speed never costs
   response. `accel` remains a getter so engine.js needs no change.

   ── WHY THE OLD NUMBERS FELT SLOW ──────────────────────────────────────
   MEASURED: there is no camera zoom and no speed clamp — the world is 1:1
   with screen pixels. So the original 0.75/0.93 pair meant:

       top speed  0.75·0.93/0.07  =  9.96 px/frame  =  598 px/sec
       a 1280px screen crossed in  ~2.1 seconds
       the hull is 52px across, so the ship moved under 1/5 of its own
       body length per frame

   That reads as slow no matter how snappy the ramp is, and the first fix
   deliberately held top speed constant while halving the ramp — which
   fixed the lateness and left the slowness untouched. Hence Mac's second
   report, which was correct.

   ── THE DEFAULTS NOW ───────────────────────────────────────────────────
       TOP SPEED  18 px/frame  =  1080 px/sec  — screen crossed in ~1.2s
       RESPONSE   0.88         —  ~24 frames (0.39s) to 95% of top speed
       (derived accel = 18 · 0.12 / 0.88 = 2.45)

   ⚠ STILL A STARTING POINT, NOT AN ANSWER. Feel is Mac's verdict and no
     gate's. The range goes to 45 px/frame deliberately — he has now twice
     said it is too slow, so the dial must have headroom well past whatever
     I would have guessed.

       −  /  =     TOP SPEED  down / up
       ;  /  '     RESPONSE   down / up   (higher = snappier)
       0           reset to the defaults above

   ⚠ THIS FILE OWNS ITS OWN INPUT AND ITS OWN HUD, DELIBERATELY — the same
     pattern as `energy.js`. That keeps the change to `engine.js` down to two
     one-line reads and touches neither the markup nor the stylesheet. Two
     seats are live in this repo and `engine.js` is the one file most likely
     to be corrupted by both of us editing it at once.

   ⚠ NO ES MODULES — classic script sharing globals, same as the rest of js/.
     An `export` here would defer the file and break the load order.
   ========================================================================== */

/* ⭐⭐ ZOOM OUT. MAC'S RULING, 2026-08-17, AND IT REVERSES MY LAST CHANGE.
   *"can we please solve this zoom out more to its better to see a big world
   with a small ship even if its huge."*

   I had taken this 0.62 -> 0.9 that same morning to make the ship BIGGER on
   screen, reading his *"the ship bases are far to small"* as a framing problem.
   It was not. It was a RATIO problem — the guns had outgrown the hull — and the
   fix for that lives in `js/fleet.js` (the scale ladder) and `js/sprites.js`
   (the gain taper), not in the camera.

   ⭐ THE CAMERA MUST NOT COMPENSATE FOR HULL SIZE. That is the trap worth
   naming, because it is the obvious "fix": zoom out for capitals, in for
   frigates. Do that and every ship occupies the same fraction of the screen —
   which destroys the exact thing Mac is asking for. A titan only reads as huge
   because the frigate beside it reads as small AT THE SAME ZOOM. So the zoom is
   FIXED and low, and scale is communicated by ships against each other and
   against the sector, never by how much screen one ship fills.

   MEASURED at 0.5 on his 1366px canvas: visible world = 2732 px, about half a
   sector; a FRIGATE reads ~52 px across, a TITAN ~368 px, a LEVIATHAN ~500 px.
   `[` and `]` still tune it live — this is only where the dial starts. */
const FEEL_DEFAULTS = { topSpeed: 18, damping: 0.88, zoom: 0.5 };

/* ⚠ A STORED VALUE OUTRANKS A NEW DEFAULT, WHICH IS USUALLY RIGHT AND IS WRONG
   HERE. Whatever Mac last tuned is in localStorage from before the hulls
   changed size, so without this the new default would never reach the one
   machine it was measured on. Bumping the version lets the new default through
   exactly once; anything he tunes after that is his and persists normally.
   ⚠ BUMPED TO 3 on 2026-08-17 for the zoom-out ruling above. */
const FEEL_VERSION = 3;

/* Bounds exist so a stray key-repeat cannot make the game unplayable and then
   persist that to localStorage. Damping is the dangerous one: at 1.0 the ship
   never stops, and above it velocity runs away to infinity. */
const FEEL_LIMITS = {
  topSpeed: { min: 4, max: 45, step: 1 },
  /* ⭐ ZOOM IS A FRAMING DIAL, NOT A SETTING. The floor was 0.30 and is now
     0.22, because the hulls got up to 3x bigger and Mac has asked twice for
     more world on screen — a floor that stops above where he wants to sit is a
     dial that does not reach. Framing is his verdict and no gate's, the same
     reason topSpeed goes to 45. */
  zoom: { min: 0.22, max: 1.4, step: 0.04 },
  damping:  { min: 0.70, max: 0.97, step: 0.01 },
};

class MovementFeel {
  constructor() {
    this.topSpeed = FEEL_DEFAULTS.topSpeed;
    this.damping = FEEL_DEFAULTS.damping;
    this.zoom = FEEL_DEFAULTS.zoom;
    this.hud = null;
    this.hideAt = 0;
    this.load();
  }

  /* engine.js reads `.accel` and `.damping`. Keeping accel a derived getter
     means the decoupling above cost engine.js nothing. */
  get accel() {
    return (this.topSpeed * (1 - this.damping)) / this.damping;
  }

  /* ---- persistence ------------------------------------------------------
     A corrupt or hand-edited value must not brick movement, so every field is
     validated against the same bounds the dial enforces. Falling back to the
     default is the safe direction: the worst case is that Mac's tuning is
     lost, not that the ship cannot move. */
  load() {
    try {
      const raw = localStorage.getItem('biotank_forge_feel');
      if (!raw) return;
      const v = JSON.parse(raw);
      this.damping = this.clamp('damping', parseFloat(v.damping));
      if (v.zoom !== undefined && v.v === FEEL_VERSION) {
        this.zoom = this.clamp('zoom', parseFloat(v.zoom));
      }
      if (v.topSpeed !== undefined) {
        this.topSpeed = this.clamp('topSpeed', parseFloat(v.topSpeed));
      } else if (v.accel !== undefined) {
        /* Migrate a save from the accel/damping version rather than throwing
           away whatever Mac had already tuned. */
        const a = parseFloat(v.accel);
        this.topSpeed = this.clamp('topSpeed', (a * this.damping) / (1 - this.damping));
      }
    } catch (e) {
      this.topSpeed = FEEL_DEFAULTS.topSpeed;
      this.damping = FEEL_DEFAULTS.damping;
    }
  }

  save() {
    try {
      localStorage.setItem('biotank_forge_feel',
        JSON.stringify({ v: FEEL_VERSION, topSpeed: this.topSpeed, damping: this.damping, zoom: this.zoom }));
    } catch (e) {}
  }

  clamp(field, value) {
    const lim = FEEL_LIMITS[field];
    if (!isFinite(value)) return FEEL_DEFAULTS[field];
    return Math.min(lim.max, Math.max(lim.min, value));
  }

  /* ---- the derived numbers ---------------------------------------------- */
  terminal() { return this.topSpeed; }

  /* frames for velocity to reach 95% of top speed under geometric decay */
  rampFrames() { return Math.log(0.05) / Math.log(this.damping); }

  /* The number that actually answers "does this feel fast": how long the ship
     takes to cross a 1280px screen at top speed. */
  screenCrossMs() { return Math.round((1280 / this.topSpeed / 60) * 1000); }

  nudge(field, dir) {
    const lim = FEEL_LIMITS[field];
    /* Snap to the step AND to 2dp. Snapping to the step alone is not enough:
       1.35 + 0.05 still lands on 1.4000000000000001, which then persists to
       localStorage and prints in the readout. */
    const snapped = Math.round((this[field] + dir * lim.step) / lim.step) * lim.step;
    this[field] = this.clamp(field, parseFloat(snapped.toFixed(2)));
    this.save();
    this.show();
  }

  reset() {
    this.topSpeed = FEEL_DEFAULTS.topSpeed;
    this.damping = FEEL_DEFAULTS.damping;
    this.zoom = FEEL_DEFAULTS.zoom;
    this.save();
    this.show();
  }

  /* ---- the readout ------------------------------------------------------
     Built from script and hidden by default. A tuning HUD that is always on
     screen is clutter during play; one that only appears while you are
     actually turning a dial is a tool. */
  ensureHud() {
    if (this.hud) return this.hud;
    const el = document.createElement('div');
    el.id = 'feel-dial';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:28px', 'transform:translateX(-50%)',
      'z-index:60', 'pointer-events:none',
      'font:12px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
      'letter-spacing:.08em', 'text-transform:uppercase',
      'color:#8FA6C4', 'background:rgba(8,12,20,.88)',
      'border:1px solid #22304A', 'padding:10px 16px',
      'white-space:pre', 'text-align:center',
      'opacity:0', 'transition:opacity .18s ease',
    ].join(';');
    document.body.appendChild(el);
    this.hud = el;
    return el;
  }

  show() {
    const el = this.ensureHud();
    const f = Math.round(this.rampFrames());
    el.textContent =
      `TOP SPEED ${String(this.topSpeed).padStart(2)}  −/=       RESPONSE ${this.damping.toFixed(2)}  ;/'\n` +
      `${Math.round(this.topSpeed * 60)} px/sec · screen in ${this.screenCrossMs()}ms     ` +
      `to speed ${f}f     0 = RESET`;
    el.style.opacity = '1';
    this.hideAt = performance.now() + 2600;
    if (!this._ticking) {
      this._ticking = true;
      const tick = () => {
        if (performance.now() >= this.hideAt) {
          el.style.opacity = '0';
          this._ticking = false;
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
}

const movementFeel = new MovementFeel();

window.addEventListener('keydown', e => {
  /* The garage has a callsign field. A dial that fires while you are typing
     your name into an input is a bug, not a feature. */
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

  switch (e.code) {
    /* NOTE the sign on RESPONSE: higher damping = snappier, so "'" raises it. */
    case 'Minus':      movementFeel.nudge('topSpeed', -1); break;
    case 'Equal':      movementFeel.nudge('topSpeed', +1); break;
    /* [ and ] frame the shot. The engine reads movementFeel.zoom each frame. */
    case 'BracketLeft':  movementFeel.nudge('zoom', -1); break;
    case 'BracketRight': movementFeel.nudge('zoom', +1); break;
    case 'Semicolon':  movementFeel.nudge('damping', -1); break;
    case 'Quote':      movementFeel.nudge('damping', +1); break;
    case 'Digit0':     movementFeel.reset(); break;
    default: return;
  }
  e.preventDefault();
});
