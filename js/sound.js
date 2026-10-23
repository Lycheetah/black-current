/* ==========================================================================
   BUBBLE TANKS: BLACK CURRENT — Soundtrack Director (zero dependency)
   ==========================================================================

   ⚠ NODES ARE BUILT ONCE AND THEN ONLY THEIR GAIN MOVES. The pads, the sub and
     the boss layer are oscillators started a single time at `init()` and left
     running forever; a music STATE change is a set of `setTargetAtTime` ramps on
     six gain nodes. Nothing in this file may be called from the render loop, and
     nothing in this file creates an oscillator per frame.

   ⚠ RHYTHM IS SCHEDULED AHEAD, NOT TRIGGERED LIVE. Percussion and arpeggios are
     short one-shot notes, so they cannot be sustained nodes — but scheduling
     them from `requestAnimationFrame` would tie musical time to frame rate and
     drop notes the moment the ocean got busy. A 25 ms lookahead scheduler owns
     the clock instead: musical time comes from `AudioContext.currentTime`, which
     does not stutter when the canvas does.

   ⚠ THE BED NEVER RESTARTS. `setMusicState('BOSS')` twice in a row is a no-op,
     and entering combat does not rebuild the biome underneath it — COMBAT is the
     current biome PLUS a tension layer, which is why the transition sounds like
     something arriving rather than the world being swapped out.

   ⚠ NO SAMPLES, NO NETWORK, NO COPYRIGHTED MATERIAL. Every sound is arithmetic.
   ========================================================================== */

/** biome bed → the two drone pitches and the arpeggio the reef plays over them */
const MUSIC_BEDS = {
  GARAGE:   { root: 55.00, fifth: 82.41, cutoff: 260, arp: [174.61, 220.00, 261.63, 349.23], arpRate: 4, perc: 0.07, pad: 0.075, sub: 0.05, arpGain: 0.035 },
  HAVEN:    { root: 65.41, fifth: 98.00, cutoff: 200, arp: [261.63, 329.63, 392.00, 523.25], arpRate: 8, perc: 0.02, pad: 0.09,  sub: 0.05, arpGain: 0.022 },
  REEF:     { root: 73.42, fifth: 110.00, cutoff: 320, arp: [293.66, 349.23, 440.00, 587.33], arpRate: 2, perc: 0.045, pad: 0.06, sub: 0.04, arpGain: 0.045 },
  PRESSURE: { root: 55.00, fifth: 77.78, cutoff: 150, arp: [220.00, 261.63, 311.13, 415.30], arpRate: 4, perc: 0.055, pad: 0.085, sub: 0.075, arpGain: 0.02 }
};

/**
 * ⚠ A TINY MOTIF, NOT A SONG. Each guardian gets a shape the ear can name after
 * one hearing: descending weight, clipped question-and-answer, a rising flare,
 * an interval that will not resolve. `null` is a rest, and rests are what make
 * the Queen sound like she is waiting for you to answer.
 */
const BOSS_MOTIFS = {
  titan: { wave: 'triangle', step: 0.42, detune: 0, notes: [98.00, 87.31, 73.42, null] },
  queen: { wave: 'square', step: 0.17, detune: 0, notes: [440.00, null, 392.00, null, 440.00, 523.25, null, null] },
  solar: { wave: 'sawtooth', step: 0.16, detune: 0, notes: [261.63, 329.63, 392.00, 493.88, 659.25, null, null, null] },
  void:  { wave: 'sine', step: 0.55, detune: 22, notes: [155.56, 233.08] }
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isInitialized = false;

    this.state = 'GARAGE';
    this.biome = 'GARAGE';
    this.bossKey = null;

    this.buses = {};
    this.mix = { master: 1, music: 1, sfx: 1 };   /* F1 settings faders, 0..1 */
    this.scheduler = null;
    this.nextNoteTime = 0;
    this.step = 0;
    this.motifStep = 0;
    this.nextMotifTime = 0;

    /* the mute preference is part of the save, so it survives a refresh */
    try {
      this.muted = !!(window.saveState && saveState.doc.audio.muted);
    } catch (e) { this.muted = false; }
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this.buildBuses();
      this.applyState(true);
      this.startScheduler();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /* ── the bus tree: master → six layers → destination ────────────────────── */
  buildBuses() {
    const now = this.ctx.currentTime;

    const master = this.ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : this.mix.master, now);
    master.connect(this.ctx.destination);
    this.master = master;

    /* F1: two group faders under the master, so Settings can set music and
       effects apart. The music layers below feed `musicBus`; SFX feed `sfxBus`. */
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.setValueAtTime(this.mix.music * (this.ducked ? 0.45 : 1), now);
    this.musicBus.connect(master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.setValueAtTime(this.mix.sfx, now);
    this.sfxBus.connect(master);

    const makeBus = (name, initial = 0, parent = this.musicBus) => {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(initial, now);
      g.connect(parent);
      this.buses[name] = g;
      return g;
    };

    makeBus('pad');
    makeBus('sub');
    makeBus('arp');
    makeBus('perc');
    makeBus('tension');
    makeBus('boss');
    makeBus('ui', 1, this.sfxBus);

    /* PAD — two sustained sines through one lowpass. Started once, forever. */
    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.setValueAtTime(200, now);
    this.padFilter.connect(this.buses.pad);

    this.padOsc1 = this.ctx.createOscillator();
    this.padOsc1.type = 'sine';
    this.padOsc1.frequency.setValueAtTime(65.41, now);
    this.padOsc1.connect(this.padFilter);
    this.padOsc1.start(now);

    this.padOsc2 = this.ctx.createOscillator();
    this.padOsc2.type = 'sine';
    this.padOsc2.frequency.setValueAtTime(98.00, now);
    this.padOsc2.connect(this.padFilter);
    this.padOsc2.start(now);

    /* SUB — one octave-down triangle that gives the deep rooms their weight */
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.setValueAtTime(32.70, now);
    this.subOsc.connect(this.buses.sub);
    this.subOsc.start(now);

    /* TENSION — a slow detuned pair that only exists to make combat feel close */
    this.tensionOsc = this.ctx.createOscillator();
    this.tensionOsc.type = 'sawtooth';
    this.tensionOsc.frequency.setValueAtTime(58.27, now);
    this.tensionFilter = this.ctx.createBiquadFilter();
    this.tensionFilter.type = 'lowpass';
    this.tensionFilter.frequency.setValueAtTime(420, now);
    this.tensionOsc.connect(this.tensionFilter);
    this.tensionFilter.connect(this.buses.tension);
    this.tensionOsc.start(now);

    this.tensionOsc2 = this.ctx.createOscillator();
    this.tensionOsc2.type = 'sawtooth';
    this.tensionOsc2.frequency.setValueAtTime(58.27, now);
    this.tensionOsc2.detune.setValueAtTime(14, now);
    this.tensionOsc2.connect(this.tensionFilter);
    this.tensionOsc2.start(now);

    this.nextNoteTime = now;
    this.nextMotifTime = now;
  }

  /* ── state ─────────────────────────────────────────────────────────────── */

  /**
   * @param {string} next one of GARAGE HAVEN REEF PRESSURE COMBAT BOSS VICTORY DEATH
   * @param {object} opts `{ boss: 'titan' }` when entering BOSS
   *
   * ⚠ COMBAT AND BOSS DO NOT REPLACE THE BIOME, THEY SIT ON IT. Only the four
   * bed names move `this.biome`, so leaving combat returns to the room the
   * player is actually standing in rather than to whatever played last.
   */
  setMusicState(next, opts = {}) {
    if (!next) return;
    const name = String(next).toUpperCase();
    if (opts.boss) this.bossKey = opts.boss;

    if (MUSIC_BEDS[name]) this.biome = name;
    if (this.state === name && !opts.force) return;

    this.state = name;
    if (name === 'BOSS') { this.motifStep = 0; this.nextMotifTime = this.ctx ? this.ctx.currentTime : 0; }
    this.applyState();
  }

  /** Current bed, whichever overlay is on top of it. */
  bed() { return MUSIC_BEDS[this.biome] || MUSIC_BEDS.HAVEN; }

  applyState(immediate = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bed = this.bed();
    /* a slow constant makes a state change read as a crossfade, not a cut */
    const tau = immediate ? 0.01 : 0.55;

    const target = {
      pad: bed.pad, sub: bed.sub, arp: bed.arpGain, perc: bed.perc, tension: 0, boss: 0
    };
    let cutoff = bed.cutoff;

    if (this.state === 'COMBAT') {
      target.tension = 0.085;
      target.perc = bed.perc + 0.05;
      target.arp = bed.arpGain * 0.55;
      cutoff = bed.cutoff * 1.6;
    } else if (this.state === 'BOSS') {
      target.boss = 0.11;
      target.tension = 0.05;
      target.sub = bed.sub + 0.05;
      target.perc = bed.perc + 0.06;
      target.arp = 0;
      target.pad = bed.pad * 0.5;
      cutoff = bed.cutoff * 1.3;
    } else if (this.state === 'VICTORY') {
      target.tension = 0;
      target.boss = 0;
      target.pad = bed.pad * 1.25;
      target.perc = 0;
      cutoff = bed.cutoff * 2.2;
    } else if (this.state === 'DEATH') {
      /* ⚠ NEVER A BLAST ON DEATH. Everything ducks and the filter closes. */
      target.pad = 0.03; target.sub = 0.02; target.arp = 0; target.perc = 0;
      target.tension = 0; target.boss = 0;
      cutoff = 90;
    }

    this.padOsc1.frequency.setTargetAtTime(bed.root, now, tau);
    this.padOsc2.frequency.setTargetAtTime(bed.fifth, now, tau);
    this.subOsc.frequency.setTargetAtTime(bed.root / 2, now, tau);
    this.tensionOsc.frequency.setTargetAtTime(bed.root * 0.89, now, tau);
    this.tensionOsc2.frequency.setTargetAtTime(bed.root * 0.89, now, tau);
    this.padFilter.frequency.setTargetAtTime(cutoff, now, tau);

    Object.keys(target).forEach(name => {
      if (this.buses[name]) this.buses[name].gain.setTargetAtTime(target[name], now, tau);
    });

    /* VICTORY is a phrase, then the room comes back on its own */
    if (this.state === 'VICTORY') {
      this.playPhrase([392.00, 493.88, 587.33, 783.99], 0.11);
      clearTimeout(this._victoryTimer);
      this._victoryTimer = setTimeout(() => {
        if (this.state === 'VICTORY') this.setMusicState(this.biome, { force: true });
      }, 2600);
    }
  }

  /* ── the lookahead scheduler ────────────────────────────────────────────── */
  startScheduler() {
    if (this.scheduler) return;
    this.scheduler = setInterval(() => this.tick(), 25);
  }

  tick() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const horizon = this.ctx.currentTime + 0.12;
    const bed = this.bed();
    const beat = 0.34;

    while (this.nextNoteTime < horizon) {
      this.scheduleStep(this.nextNoteTime, bed);
      this.nextNoteTime += beat;
      this.step = (this.step + 1) % 16;
    }

    if (this.state === 'BOSS' && this.bossKey && BOSS_MOTIFS[this.bossKey]) {
      const motif = BOSS_MOTIFS[this.bossKey];
      while (this.nextMotifTime < horizon) {
        const note = motif.notes[this.motifStep % motif.notes.length];
        if (note) this.motifNote(this.nextMotifTime, note, motif);
        this.nextMotifTime += motif.step;
        this.motifStep++;
      }
    } else {
      this.nextMotifTime = this.ctx.currentTime;
    }
  }

  scheduleStep(when, bed) {
    if (this.state === 'DEATH' || this.state === 'VICTORY') return;

    /* percussion — a filtered noise-ish click built from a fast pitch drop */
    const percOn = (this.step % 4 === 0) || (this.state === 'COMBAT' && this.step % 2 === 0);
    if (percOn && this.buses.perc) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(this.step % 8 === 0 ? 120 : 190, when);
      o.frequency.exponentialRampToValueAtTime(42, when + 0.09);
      g.gain.setValueAtTime(0.9, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
      o.connect(g); g.connect(this.buses.perc);
      o.start(when); o.stop(when + 0.12);
    }

    /* arpeggio — only where the bed asks for one, and never during a boss */
    if (this.state !== 'BOSS' && bed.arpRate && this.step % bed.arpRate === 0) {
      const note = bed.arp[(this.step / bed.arpRate) % bed.arp.length | 0];
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(note, when);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.9, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.5);
      o.connect(g); g.connect(this.buses.arp);
      o.start(when); o.stop(when + 0.55);
    }
  }

  motifNote(when, freq, motif) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = motif.wave;
    o.frequency.setValueAtTime(freq, when);
    if (motif.detune) o.detune.setValueAtTime(motif.detune, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.85, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, when + motif.step * 0.95);
    o.connect(g); g.connect(this.buses.boss);
    o.start(when); o.stop(when + motif.step);
  }

  playPhrase(freqs, spacing = 0.1) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now + i * spacing);
      g.gain.setValueAtTime(0, now + i * spacing);
      g.gain.linearRampToValueAtTime(0.22, now + i * spacing + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * spacing + 0.5);
      o.connect(g); g.connect(this.buses.ui || this.ctx.destination);
      o.start(now + i * spacing); o.stop(now + i * spacing + 0.55);
    });
  }

  /* ── mix (F1 settings) ──────────────────────────────────────────────────── */
  setMix(mix = {}) {
    for (const k of ['master', 'music', 'sfx']) {
      if (typeof mix[k] === 'number') this.mix[k] = Math.max(0, Math.min(1, mix[k]));
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.mix.master, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.mix.music * (this.ducked ? 0.45 : 1), now, this.ducked ? 0.25 : 0.05);
    this.sfxBus.gain.setTargetAtTime(this.mix.sfx, now, 0.05);
  }

  /** Menus and pause sit the music back under glass; flight brings it forward. */
  duck(on) {
    this.ducked = !!on;
    this.setMix();
  }

  /* ── mute ───────────────────────────────────────────────────────────────── */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.mix.master, this.ctx.currentTime, 0.08);
    }
    try {
      saveState.doc.audio.muted = this.muted;
      saveState.save();
    } catch (e) { /* storage refused; the toggle still works this session */ }
    return this.muted;
  }

  /* ── SFX — unchanged contract, now routed through the UI bus ────────────── */
  sfx() { return this.buses.ui || (this.ctx && this.ctx.destination); }

  playBubblePop(size = 'small') {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    let baseFreq = 580, dur = 0.07, volume = 0.2;
    if (size === 'medium') { baseFreq = 360; dur = 0.1; volume = 0.25; }
    else if (size === 'large') { baseFreq = 200; dur = 0.15; volume = 0.35; }

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + dur);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.01);
    osc.connect(gain); gain.connect(this.sfx());
    osc.start(now); osc.stop(now + dur + 0.02);
  }

  playWeaponShot(type = 'spitter') {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (type === 'mortar') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    } else if (type === 'homing') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    } else if (type === 'railgun') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }

    osc.connect(gain); gain.connect(this.sfx());
    osc.start(now); osc.stop(now + 0.25);
  }

  playAbility(type = 'shield') {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'shield') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else if (type === 'emp') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.15);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    }

    osc.connect(gain); gain.connect(this.sfx());
    osc.start(now); osc.stop(now + 0.35);
  }

  playEvolutionFanfare() {
    this.playPhrase([261.63, 329.63, 392.00, 523.25, 659.25], 0.07);
  }

  /** the identity stinger the garage plays when a crew is chosen */
  playCrewStinger(crewId) {
    const shapes = {
      ironwake: [98.00, 130.81, 98.00],
      neonVeil: [659.25, 880.00, 1174.66],
      redlineBloom: [220.00, 329.63, 220.00, 440.00],
      crownlessChoir: [261.63, 311.13, 392.00, 466.16]
    };
    this.playPhrase(shapes[crewId] || shapes.ironwake, 0.09);
  }
}

const soundEngine = new SoundEngine();

// Auto-unlock Web Audio on first user interaction (touch, click, keydown)
const unlockAudio = () => {
  soundEngine.init();
  soundEngine.resume();
  window.removeEventListener('touchstart', unlockAudio, true);
  window.removeEventListener('touchend', unlockAudio, true);
  window.removeEventListener('pointerdown', unlockAudio, true);
  window.removeEventListener('click', unlockAudio, true);
  window.removeEventListener('keydown', unlockAudio, true);
};

window.addEventListener('touchstart', unlockAudio, true);
window.addEventListener('touchend', unlockAudio, true);
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('click', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);
