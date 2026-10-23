/* ==========================================================================
   BUBBLE TANKS — ENERGY TRIAGE
   ==========================================================================

   One reactor, three sinks, and you can only feed one.

     1 · CILIA     — engines.  Acceleration ×2.0
     2 · MEMBRANE  — shields.  Incoming damage ×0.55
     3 · STINGERS  — weapons.  Fire interval ×0.60 (≈ +67% rate)
     4 · DORMANT   — off.      The reactor recharges

   Lifted from Dreadnought (YAGER, 2016–2023), which bound these to F1–F4.
   We use Digit1–4: F-keys are browser-owned and a game that fights the
   browser for a key loses.

   ⚠ THIS FILE OWNS ITS OWN INPUT AND ITS OWN HUD, DELIBERATELY.
     It attaches one keydown listener and builds its HUD node from script.
     That keeps the change to `engine.js` down to three one-line multipliers
     and touches neither `index.html`'s markup nor the stylesheet. A mechanic
     that needs edits in five files to be tried once is a mechanic that never
     gets tuned.

   ⚠ NO ES MODULES — classic script sharing globals, same as the rest of js/.

   THE TENSION IS THE DRAIN. A boost with no cost is just a bigger number:
   the player would hold Stingers forever and the choice would evaporate.
   Feeding a sink drains the pool; emptying it forces Dormant and locks the
   reactor out for 1.5s. That lockout is the whole design — it makes
   "when do I stop boosting" the actual decision.
   ========================================================================== */

const ENERGY_MODES = {
  cilia:    { id: 'cilia',    key: 'Digit1', label: 'CILIA',    sink: 'ENGINES', color: '#39ff14', effect: '+100% thrust' },
  membrane: { id: 'membrane', key: 'Digit2', label: 'MEMBRANE', sink: 'SHIELDS', color: '#00f3ff', effect: '−45% damage taken' },
  stingers: { id: 'stingers', key: 'Digit3', label: 'STINGERS', sink: 'WEAPONS', color: '#ff3366', effect: '+67% fire rate' },
  dormant:  { id: 'dormant',  key: 'Digit4', label: 'DORMANT',  sink: 'RECHARGE', color: '#8FA6C4', effect: 'reactor recovers' },
};

class Reactor {
  constructor() {
    this.capacity = 100;
    this.charge = 100;
    this.mode = 'dormant';
    this.lockout = 0;          // frames of forced dormancy after a burnout

    this.drainRate = 0.55;     // per frame while a sink is fed
    this.rechargeRate = 0.9;   // per frame while dormant
    this.lockoutFrames = 90;   // 1.5s at 60fps

    this.el = null;
    this.buildHud();
    this.bindKeys();
  }

  /* ── state ──────────────────────────────────────────────────────────── */

  set(modeId) {
    if (!ENERGY_MODES[modeId]) return false;
    if (this.lockout > 0 && modeId !== 'dormant') {
      this.flash();
      return false;
    }
    if (this.mode === modeId) return false;
    this.mode = modeId;

    /* The sound engine may not have been initialised yet — Web Audio needs a
       gesture, and a keypress before the first click would throw. */
    try {
      if (typeof soundEngine !== 'undefined' && soundEngine.playBubblePop) {
        soundEngine.playBubblePop(modeId === 'dormant' ? 'small' : 'medium');
      }
    } catch (e) { /* silence is better than a broken frame */ }

    this.paint();
    return true;
  }

  update() {
    if (this.lockout > 0) {
      this.lockout--;
      if (this.lockout === 0) this.paint();
    }

    if (this.mode === 'dormant') {
      this.charge = Math.min(this.capacity, this.charge + this.rechargeRate);
    } else {
      this.charge -= this.drainRate;
      if (this.charge <= 0) {
        this.charge = 0;
        this.mode = 'dormant';
        this.lockout = this.lockoutFrames;
        this.flash();
      }
    }

    this.paintBar();
  }

  active(id) { return this.mode === id && this.lockout === 0; }

  /* ── the three multipliers engine.js asks for ───────────────────────── */

  thrustScale()      { return this.active('cilia') ? 2.0 : 1; }
  damageTakenScale() { return this.active('membrane') ? 0.55 : 1; }
  fireIntervalScale(){ return this.active('stingers') ? 0.60 : 1; }

  /* ── hud ────────────────────────────────────────────────────────────── */

  buildHud() {
    const wrap = document.createElement('div');
    wrap.id = 'reactor-hud';
    wrap.setAttribute('aria-hidden', 'true');   /* decorative mirror of game state */
    wrap.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:14px', 'transform:translateX(-50%)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:5px',
      'font-family:ui-monospace,Menlo,Consolas,monospace', 'font-size:10px',
      'letter-spacing:.14em', 'pointer-events:none', 'z-index:40',
      'text-shadow:0 1px 3px rgba(0,0,0,.9)',
    ].join(';');

    const bar = document.createElement('div');
    bar.style.cssText = [
      'width:190px', 'height:4px', 'border-radius:2px',
      'background:rgba(255,255,255,.12)', 'overflow:hidden',
    ].join(';');
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:100%;transition:background-color .18s linear';
    bar.appendChild(fill);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px';

    const pips = {};
    for (const m of Object.values(ENERGY_MODES)) {
      const pip = document.createElement('span');
      pip.textContent = m.label;
      pip.style.cssText = [
        'padding:3px 7px', 'border-radius:2px', 'border:1px solid transparent',
        'transition:all .14s linear', 'white-space:nowrap',
      ].join(';');
      row.appendChild(pip);
      pips[m.id] = pip;
    }

    wrap.append(bar, row);
    document.body.appendChild(wrap);
    this.el = { wrap, bar, fill, pips };
    this.paint();
  }

  paint() {
    if (!this.el) return;
    for (const m of Object.values(ENERGY_MODES)) {
      const on = this.mode === m.id;
      const pip = this.el.pips[m.id];
      /* Brass frames every doctrine; only the live one burns neon. */
      pip.style.color = on ? '#05070c' : 'rgba(255,236,206,.78)';
      pip.style.background = on ? m.color : 'rgba(10,12,18,.72)';
      pip.style.borderColor = on ? m.color : 'rgba(201,162,92,.55)';
      pip.style.fontWeight = on ? '800' : '600';
      pip.style.boxShadow = on ? `0 0 14px ${m.color}, inset 0 0 0 1px rgba(255,255,255,.35)` : 'none';
    }
    this.paintBar();
  }

  paintBar() {
    if (!this.el) return;
    const pct = Math.max(0, this.charge / this.capacity);
    this.el.fill.style.width = `${pct * 100}%`;

    /* Colour the bar by what is DRAINING it, so the player reads cost and
       cause in one glance instead of tracking two widgets. */
    const mode = ENERGY_MODES[this.mode];
    this.el.fill.style.background =
      this.lockout > 0 ? '#ff3366'
      : (pct < 0.25 ? '#ffb703' : (mode ? mode.color : '#8FA6C4'));
  }

  flash() {
    if (!this.el) return;
    this.el.bar.style.boxShadow = '0 0 0 1px #ff3366';
    setTimeout(() => { if (this.el) this.el.bar.style.boxShadow = 'none'; }, 220);
  }

  /* ── input ──────────────────────────────────────────────────────────── */

  bindKeys() {
    window.addEventListener('keydown', e => {
      /* Never steal a key while the player is typing their callsign, and
         never act while a modal has the game paused. */
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (typeof engine !== 'undefined' && engine && engine.paused) return;

      for (const m of Object.values(ENERGY_MODES)) {
        if (e.code === m.key) { e.preventDefault(); this.set(m.id); return; }
      }
    });
  }
}

const reactor = new Reactor();
window.reactor = reactor;
