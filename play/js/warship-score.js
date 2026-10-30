/* WARSHIP II · the score and the mix (Route 4 item 5, sound pass 3). Mac, 2026-10-30: "the sound engine is just a
 * monotone whining", "volumes need increasing, as you can always turn it down, but some stuff is super lacking".
 * Measured before this file (12 s captures of the master in the live game): a held pad carried most of the steady
 * energy (one 223 Hz note alone was 35% of everything while exploring), the pressure bed held a tritone (220 and
 * 311 Hz) without end, and in a fight 73% sat in 120-400 Hz from pitched percussion ticks. The mix ran at about
 * -42 dBFS exploring and -34 in combat.
 * - The pad moves: three voices play a triad that walks a progression, one chord a bar (16 steps, 5.4 s), gliding
 *   between chords. Minor while out in the Current, a driving loop in a fight, a darker turn for a guardian, major
 *   at a haven. The ambience tones follow the chord. The pad sits lower, so it is a bed and not a whine.
 * - Loudness: +10 dB of make-up after the master fader into a brick-wall limiter, so Settings still turn it all
 *   down; effects sit a further 3 dB ahead of the music.
 * (sound.js's percussion tick and warship-audio.js's war drum lost their pitch in the same pass.) */
(() => {
  'use strict';
  const PROG = {
    explore: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],   // i  VI  III  VII
    combat: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]],     // i  i  VI  VII
    boss: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],        // i  ♭II  i  VII
    calm: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [-5, -1, 2]]      // I  IV  vi  V
  };
  const MIX = { loud: 3.16, sfx: 1.41, pad: 0.45 };   // +10 dB, +3 dB, -7 dB
  const stats = { chords: 0, bar: 0 };
  let ready = false;
  const semis = (f, n) => f * Math.pow(2, n / 12);
  function mode(se) {
    if (se.state === 'BOSS') return 'boss';
    if (se.state === 'COMBAT') return 'combat';
    return ['GARAGE', 'HAVEN'].includes(se.biome) ? 'calm' : 'explore';
  }
  function voices(se) { return [se.padOsc1, se.padOsc2, se.padOsc3].filter(Boolean); }
  // glide every pad voice, and the ambience tones, onto the chord for this bar
  function chord(se, at, tau) {
    if (!se.ctx || !se.padOsc1) return;
    const prog = PROG[mode(se)], c = prog[(se._bar || 0) % prog.length], base = se.bed().root * 4;
    voices(se).forEach((o, i) => o.frequency.setTargetAtTime(semis(base, c[i]), at, tau));
    const tones = se.currentAmbience?.tones || [];
    tones.forEach((o, i) => o.frequency.setTargetAtTime(semis(base, c[i * 2] ?? c[0]), at, tau));
    stats.chords++;
  }
  const P = SoundEngine.prototype;
  const build = P.buildBuses;
  P.buildBuses = function (...a) {
    const r = build.apply(this, a), c = this.ctx;
    if (this._score) return r;
    // a third pad voice for the triad, slightly detuned against the others for width
    if (this.padFilter && this.padOsc1) {
      const o = c.createOscillator(); o.type = this.padOsc1.type; o.frequency.value = this.padOsc1.frequency.value; o.detune.value = 7;
      o.connect(this.padFilter); o.start(); this.padOsc3 = o;
      if (this.padOsc2) this.padOsc2.detune.value = -5;
      // the pad trimmed under everything else
      const trim = c.createGain(); trim.gain.value = MIX.pad; this.padFilter.disconnect(); this.padFilter.connect(trim); trim.connect(this.buses.pad);
    }
    // effects forward of the music
    const lift = c.createGain(); lift.gain.value = MIX.sfx; this.sfxBus.disconnect(); this.sfxBus.connect(lift); lift.connect(this.master);
    // make-up and a limiter after the master fader
    const make = c.createGain(), lim = c.createDynamicsCompressor();
    make.gain.value = MIX.loud;
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
    this.master.disconnect(); this.master.connect(make); make.connect(lim); lim.connect(c.destination);
    this.out = lim; this._score = { make, lim, lift };
    chord(this, c.currentTime, 0.01);
    return r;
  };
  const apply = P.applyState;
  P.applyState = function (immediate, ...a) {
    const r = apply.call(this, immediate, ...a);
    if (this.ctx) chord(this, this.ctx.currentTime, immediate ? 0.01 : 0.6);
    return r;
  };
  const step = P.scheduleStep;
  P.scheduleStep = function (when, bed, ...a) {
    const r = step.call(this, when, bed, ...a);
    if (this.step === 0 && this.ctx) { this._bar = (this._bar || 0) + 1; stats.bar++; chord(this, when, 0.35); }
    return r;
  };
  window.warshipScore = { PROG, MIX, stats, get ready() { return ready; } };
  ready = true;
})();
