/* WARSHIP AUDIO (Route 2 · sound pass 2). Mac, 2026-10-29: "i wanted real battle ship sounds … right now it
 * sounds like im in fairy land". The fairy came from four places: a bright sine arpeggio over every bed (lifted
 * ×5 by sound-mix.js), long sine navigation chimes (current-soundscape.js), major-key sine phrases on every
 * dock, buy and warp (playPhrase), and guns voiced as pitched chirps over a little noise (battery-audio.js).
 * This file re-voices all of it as a warship, still pure arithmetic (no samples, no network):
 * - Guns: noise carries the report, a low sine is the thump under it, and each family adds its own layer:
 *   a muzzle crack (kinetic), a metal ring (rail), an electric sizzle (beam), a launch roar (missile) or a
 *   rolling tail (ordnance). Bigger classes are lower and longer.
 * - Impacts: hull hits clank with inharmonic metal partials, shields crackle, wrecks tear and explosions roll.
 * - UI and pickups: relay clicks, clamp clunks and console blips in place of the chimes.
 * - Music: no arpeggio and no chime motif. A low brass drone breathes under war drums, which only march when
 *   you are out in the Current and pound in combat.
 * The voice limiter, spatial pan and cleanup are unchanged (js/soundscape.js): extra layers play only on a
 * voice the limiter admitted, and every layer node disconnects when it ends. */
(() => {
  'use strict';
  const PITCH = [1.25, 1.1, 1, .85, .7, .55], LENGTH = [.7, .85, 1, 1.2, 1.4, 1.65];
  const ARCH = { repeater: [1.12, .7], scatter: [.85, 1.2], stream: [1.2, .6], rifle: [.85, 1.35], bolt: [1.15, .65], pulse: [1, 1], lance: [.8, 1.5], rocket: [1.15, .75], torpedo: [.7, 1.45], mortar: [.8, 1.2], flak: [1.2, .65], shell: [.7, 1.4] };
  // [from Hz, to Hz, seconds, volume, wave, noise, shape]; shape.war = the extra layers below.
  function gun(family, p, l) {
    switch (family) {
      case 'rail': return [900 * p, 120 * p, .2 * l, .07, 'sawtooth', .5, { cutoff: 3800, noiseType: 'highpass', noiseCutoff: 3000, attack: .002, war: { crack: { f: 4000, d: .05, g: .7 }, ring: { fs: [620 * p, 1710 * p, 3350 * p], d: .45 * l, g: .25 }, tail: { f: 1400, d: .25 * l, g: .2 } } }];
      case 'beam': return [110 * p, 90 * p, .26 * l, .06, 'sawtooth', .55, { cutoff: 1800, noiseType: 'bandpass', noiseCutoff: 2600, noiseQ: 2, attack: .01, war: { crack: { f: 5000, d: .03, g: .3 }, ring: { fs: [1200 * p, 1215 * p], d: .18 * l, g: .12 } } }];
      case 'missile': return [70 * p, 40 * p, .3 * l, .08, 'sine', .9, { noiseType: 'bandpass', noiseCutoff: 900, attack: .004, war: { sweep: { from: 500, to: 2400, d: .45 * l, g: .5 }, tail: { f: 600, d: .35 * l, g: .25 } } }];
      case 'ordnance': return [95 * p, 28 * p, .45 * l, .11, 'sine', 1.1, { noiseType: 'lowpass', noiseCutoff: 700 * p, attack: .003, war: { crack: { f: 1800, d: .04, g: .35 }, tail: { f: 500 * p, d: .9 * l, g: .5 } } }];
      default: return [150 * p, 45 * p, .16 * l, .09, 'sine', 1, { noiseType: 'lowpass', noiseCutoff: 3500 * p, attack: .002, war: { crack: { f: 2800, d: .04, g: .75 }, tail: { f: 900 * p, d: .28 * l, g: .35 } } }];
    }
  }
  const HULL = [180, 60, .14, .1, 'square', .6, { cutoff: 1400, noiseType: 'bandpass', noiseCutoff: 1500, noiseQ: 2.5, war: { ring: { fs: [310, 845, 1490, 2210], d: .32, g: .22 } } }];
  const SHIELD = [70, 55, .16, .06, 'sawtooth', .5, { cutoff: 1200, noiseType: 'highpass', noiseCutoff: 3500, war: { crack: { f: 5000, d: .06, g: .4 } } }];
  const EXPLOSION = [70, 22, .6, .12, 'sine', 1.1, { noiseType: 'lowpass', noiseCutoff: 900, attack: .003, war: { crack: { f: 2400, d: .05, g: .4 }, tail: { f: 600, d: 1.4, g: .55 } } }];
  const BREAK = [220, 50, .35, .09, 'sawtooth', .7, { cutoff: 1600, noiseType: 'bandpass', noiseCutoff: 1100, noiseQ: 1.5, war: { ring: { fs: [190, 530, 1180], d: .6, g: .18 }, tail: { f: 800, d: .5, g: .3 } } }];
  const IMPACT = { hull: HULL, shield: SHIELD, explosion: EXPLOSION, break: BREAK };
  const CUES = {
    shot: gun('kinetic', 1.1, .8), laser: gun('beam', 1.1, .8), rail: gun('rail', 1.1, .8), ...IMPACT,
    'legacy-pop:small': [400, 120, .06, .05, 'square', .4, { cutoff: 2000, noiseType: 'bandpass', noiseCutoff: 2200, noiseQ: 2 }],
    'legacy-pop:medium': HULL,
    'legacy-pop:large': [80, 26, .4, .1, 'sine', 1, { noiseType: 'lowpass', noiseCutoff: 800, attack: .003, war: { tail: { f: 600, d: .7, g: .45 } } }],
    pickup: [260, 180, .07, .05, 'square', .35, { cutoff: 1500, noiseType: 'bandpass', noiseCutoff: 2500, noiseQ: 3, war: { ring: { fs: [1320, 1980], d: .12, g: .06 } } }],
    ui: [320, 300, .035, .03, 'square', .4, { cutoff: 1800, noiseType: 'highpass', noiseCutoff: 3000 }],
    sonar: [1180, 1150, 1.1, .05, 'sine', 0],
  };
  const KLAXON = [330, 300, .55, .05, 'square', 0, { cutoff: 1100, war: { ring: { fs: [262], d: .5, g: .15 } } }];
  const spatial = p => window.soundscapeMix ? soundscapeMix.spatial(p) : { pan: 0, gain: 1 };
  function env(c, g, at, peak, decay, attack = .002) { g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(peak, at + attack); g.gain.exponentialRampToValueAtTime(.0001, at + decay); }
  function noiseInto(se, at, d, filterType, f, q, peak, dest, f2) {
    const c = se.ctx, n = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    n.buffer = se.noise; fl.type = filterType; fl.frequency.setValueAtTime(f, at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + d); fl.Q.value = q;
    env(c, g, at, peak, d, filterType === 'bandpass' && f2 ? Math.min(.08, d * .3) : .002);
    n.connect(fl); fl.connect(g); g.connect(dest); n.onended = () => { n.disconnect(); fl.disconnect(); g.disconnect(); };
    n.start(at, Math.random() * .5); n.stop(at + d + .02);
  }
  function tone(se, at, d, type, f, f2, peak, dest) {
    const c = se.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + d);
    env(c, g, at, peak, d); o.connect(g); g.connect(dest); o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(at); o.stop(at + d + .02);
  }
  // The extra layers of one admitted voice, on their own panner into the effects bus.
  function layers(se, L, position, when, volume) {
    const c = se.ctx, at = Math.max(c.currentTime, when ?? c.currentTime), s = spatial(position), out = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    if (pan.pan) pan.pan.value = s.pan; out.gain.value = volume * s.gain; out.connect(pan); pan.connect(se.sfx());
    let longest = 0;
    if (L.crack) { noiseInto(se, at, L.crack.d, 'highpass', L.crack.f, .7, L.crack.g, out); longest = Math.max(longest, L.crack.d); }
    if (L.tail) { noiseInto(se, at, L.tail.d, 'lowpass', L.tail.f, .5, L.tail.g, out, L.tail.f * .35); longest = Math.max(longest, L.tail.d); }
    if (L.sweep) { noiseInto(se, at, L.sweep.d, 'bandpass', L.sweep.from, 1.2, L.sweep.g, out, L.sweep.to); longest = Math.max(longest, L.sweep.d); }
    if (L.ring) { L.ring.fs.forEach((f, i) => tone(se, at, L.ring.d * (1 - i * .12), 'sine', f, f * .995, L.ring.g / (i + 1), out)); longest = Math.max(longest, L.ring.d); }
    setTimeout(() => { try { out.disconnect(); pan.disconnect(); } catch { } }, (at - c.currentTime + longest + .3) * 1000 + 50);
  }
  const voice = SoundEngine.prototype.voice;
  SoundEngine.prototype.voice = function (kind, position = null, when = null) {
    const ok = voice.call(this, kind, position, when);
    if (!ok || !this.ctx) return ok;
    const spec = window.soundscapeMix?.VOICES[kind] || this.extraVoices?.[kind] || window.soundscapeMix?.VOICES.shot, L = spec?.[6]?.war;
    if (L) try { layers(this, L, position, when, spec[3]); } catch (e) { /* a layer never costs the shot */ }
    return ok;
  };
  // UI phrases: a clamp clunk, then up to three low console blips. Never a chime.
  SoundEngine.prototype.playPhrase = function (freqs, spacing = 0.1) {
    if (!this.ctx || this.muted || !this.noise) return;
    const c = this.ctx, now = c.currentTime, dest = this.buses.ui || this.sfx();
    noiseInto(this, now, .06, 'lowpass', 600, .7, .35, dest); tone(this, now, .08, 'sine', 90, 50, .3, dest);
    const step = Math.max(spacing, .09);
    (freqs || []).slice(0, 3).forEach((f, i) => {
      const at = now + .05 + i * step, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(Math.max(180, Math.min(560, f * .5)), at); fl.type = 'lowpass'; fl.frequency.value = 1300;
      env(c, g, at, .07, .07); o.connect(fl); fl.connect(g); g.connect(dest); o.onended = () => { o.disconnect(); fl.disconnect(); g.disconnect(); };
      o.start(at); o.stop(at + .09);
    });
  };
  SoundEngine.prototype.playAbility = function (type = 'shield') {
    if (!this.ctx || this.muted || !this.noise) return;
    const now = this.ctx.currentTime, dest = this.sfx();
    if (type === 'shield') { tone(this, now, .4, 'sawtooth', 60, 120, .12, dest); noiseInto(this, now, .3, 'bandpass', 2600, 2, .12, dest, 4200); }
    else if (type === 'emp') { noiseInto(this, now, .35, 'highpass', 2500, .7, .3, dest); tone(this, now, .32, 'square', 750, 90, .12, dest); }
    else { noiseInto(this, now, .3, 'lowpass', 1400, .7, .3, dest, 400); tone(this, now, .2, 'sine', 140, 60, .2, dest); }
  };
  // Music: no arpeggio, a quieter tick, war drums on their own bus, a breathing brass drone.
  const tuned = new WeakSet();
  function retune() { for (const b of Object.values(MUSIC_BEDS)) if (!tuned.has(b)) { b.arpGain = 0; b.perc *= .35; b.pad *= .45; b.sub *= .35; tuned.add(b); } }
  retune();
  const DRUMS = { explore: { 0: 1, 8: .6 }, combat: { 0: 1, 3: .5, 6: .7, 8: 1, 11: .5, 12: .6, 14: .8 }, boss: { 0: 1, 2: .5, 3: .5, 6: .7, 8: 1, 10: .5, 11: .5, 12: .7, 14: .8, 15: .6 } };
  const CLANK = { combat: [4, 12], boss: [4, 12] };
  const build = SoundEngine.prototype.buildBuses;
  SoundEngine.prototype.buildBuses = function (...a) {
    const r = build.apply(this, a), c = this.ctx;
    retune();
    const drum = c.createGain(); drum.gain.value = 0; drum.connect(this.musicBus); this.buses.drum = drum;
    for (const o of [this.padOsc1, this.padOsc2]) if (o) o.type = 'sawtooth';
    if (this.padFilter) { const lfo = c.createOscillator(), depth = c.createGain(); lfo.frequency.value = .07; depth.gain.value = 120; lfo.connect(depth); depth.connect(this.padFilter.frequency); lfo.start(); this.padBreath = lfo; }
    if (this.currentAmbience?.chime) this.currentAmbience.chime.gain.value = 0;
    return r;
  };
  const apply = SoundEngine.prototype.applyState;
  SoundEngine.prototype.applyState = function (immediate, ...a) {
    const r = apply.call(this, immediate, ...a);
    if (!this.ctx || !this.padOsc1) return r;
    const t = this.ctx.currentTime, tau = immediate ? .01 : .7, bed = this.bed(), combat = this.state === 'COMBAT', boss = this.state === 'BOSS', calm = ['GARAGE', 'HAVEN'].includes(this.biome) && !combat && !boss;
    this.padOsc1.frequency.setTargetAtTime(bed.root * 4, t, tau); this.padOsc2?.frequency.setTargetAtTime(bed.fifth * 4, t, tau);
    this.padFilter?.frequency.setTargetAtTime(combat || boss ? 650 : 420, t, tau);
    for (const o of this.currentAmbience?.tones || []) o.frequency.setTargetAtTime(o === this.currentAmbience.tones[0] ? bed.root * 4 : bed.fifth * 4, t, tau);
    if (this.currentAmbience?.chime) this.currentAmbience.chime.gain.setTargetAtTime(0, t, .01);
    const drum = ['DEATH', 'VICTORY'].includes(this.state) ? 0 : boss ? .26 : combat ? .22 : calm ? 0 : .1;
    this.buses.drum?.gain.setTargetAtTime(drum, t, tau);
    return r;
  };
  // a kick, not a tone: the old 190→108 Hz sweep over 0.3 s sang a pitch on every beat (Mac: "a monotone whining")
  function drumHit(se, when, v) { const dest = se.buses.drum; tone(se, when, .2, 'sine', 140, 40, .95 * v, dest); noiseInto(se, when, .012, 'highpass', 2500, .7, .35 * v, dest); noiseInto(se, when, .11, 'lowpass', 380, .7, .6 * v, dest); }
  function clank(se, when) { const dest = se.buses.drum; noiseInto(se, when, .07, 'bandpass', 1800, 3, .35, dest); tone(se, when, .22, 'sine', 410, 405, .12, dest); tone(se, when, .18, 'sine', 1130, 1125, .06, dest); }
  const schedule = SoundEngine.prototype.scheduleStep;
  SoundEngine.prototype.scheduleStep = function (when, bed, ...a) {
    const r = schedule.call(this, when, bed, ...a);
    if (!this.buses.drum || !this.noise || ['DEATH', 'VICTORY'].includes(this.state)) return r;
    const mode = this.state === 'BOSS' ? 'boss' : this.state === 'COMBAT' ? 'combat' : 'explore', v = DRUMS[mode][this.step];
    if (v) drumHit(this, when, v);
    if (CLANK[mode]?.includes(this.step)) clank(this, when);
    return r;
  };
  let ready = false;
  function install() {
    const E = soundEngine.extraVoices;
    if (!window.batteryAudio?.ready || !window.soundMix || !E?.['w:spitter']?._lifted || !window.soundscapeMix) { setTimeout(install, 50); return; }
    for (const [id, g] of Object.entries(arsenal.GUNS)) {
      const v = E['w:' + id]; if (!v) continue;
      const [ap, al] = ARCH[g.arch] || [1, 1], spec = gun(g.family, PITCH[g.c] * ap, LENGTH[g.c] * al);
      spec[3] *= v._lifted ? soundMix.GUN_LIFT : 1; v.splice(0, v.length, ...spec);
    }
    for (const [k, spec] of Object.entries(IMPACT)) { const v = E['bc-impact:' + k]; if (!v) continue; const s = JSON.parse(JSON.stringify(spec)); s[3] *= v._lifted ? soundMix.IMPACT_LIFT : 1; v.splice(0, v.length, ...s); }
    Object.assign(soundscapeMix.VOICES, CUES);
    E.patrol = KLAXON;
    if (soundEngine.isInitialized) soundEngine.applyState(true);
    ready = true;
  }
  window.warshipAudio = { CUES, IMPACT, DRUMS, gun, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 350));
})();
