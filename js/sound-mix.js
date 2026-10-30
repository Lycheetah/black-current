/* SOUND MIX (Route 2 · Stage 1 · sound pass). Mac, 2026-10-29: "the soundscape is wrecked".
 * Measured in combat before this file (scripts/probe-sound.mjs): 94% of the energy sat below 120 Hz,
 * 0% in the presence band, and effects ran ~25 dB under the music. The pad was two sines at 55/78 Hz
 * and the sub at 27.5 Hz: a constant rumble that buries your guns and vanishes on phone speakers.
 * - Music: the pad moves up two octaves on triangles behind an open filter; the sub rises an octave
 *   and drops in level; a 70 Hz high-pass clears the rumble; arpeggio and percussion carry the bed.
 * - Each galaxy region gets its own bed (key, tempo, colour) and its own ambience.
 * - Gun and impact voices (battery-audio.js) come forward, so the fight sits in front of the music. */
(() => {
  'use strict';
  // 1 · rebalance every bed: less pad and sub, more arpeggio and percussion
  for (const b of Object.values(MUSIC_BEDS)) { b.pad *= 0.3; b.sub *= 0.35; b.arpGain *= 5; b.perc *= 3; }
  // 2 · one bed per galaxy region (exploration outside the home system)
  Object.assign(MUSIC_BEDS, {
    NARAKA: { root: 73.42, fifth: 110.00, cutoff: 340, arp: [293.66, 369.99, 440.00, 554.37], arpRate: 4, perc: 0.08, pad: 0.025, sub: 0.012, arpGain: 0.18 },
    EREBOS: { root: 61.74, fifth: 92.50, cutoff: 420, arp: [493.88, 587.33, 739.99, 987.77], arpRate: 2, perc: 0.04, pad: 0.025, sub: 0.01, arpGain: 0.144 },
    AION: { root: 65.41, fifth: 98.00, cutoff: 300, arp: [261.63, 329.63, 392.00, 493.88], arpRate: 4, perc: 0.09, pad: 0.028, sub: 0.015, arpGain: 0.162 },
    CHAOS: { root: 58.27, fifth: 82.41, cutoff: 260, arp: [233.08, 277.18, 329.63, 466.16], arpRate: 8, perc: 0.12, pad: 0.025, sub: 0.018, arpGain: 0.144 },
    DEEP: { root: 51.91, fifth: 77.78, cutoff: 200, arp: [207.65, 246.94, 311.13, 415.30], arpRate: 2, perc: 0.06, pad: 0.03, sub: 0.008, arpGain: 0.126 }
  });
  const REGION_BED = ['NARAKA', 'EREBOS', 'AION', 'CHAOS', 'DEEP'];
  const AMBIENCE = { NARAKA: { cutoff: 1300, wind: 0.26 }, EREBOS: { cutoff: 2600, wind: 0.42 }, AION: { cutoff: 900, wind: 0.3 }, CHAOS: { cutoff: 520, wind: 0.5 }, DEEP: { cutoff: 320, wind: 0.36 } };
  const set = SoundEngine.prototype.setMusicState;
  SoundEngine.prototype.setMusicState = function (next, opts = {}) {
    const name = String(next || '').toUpperCase();
    try {
      const sys = window.galaxy?.current, ch = typeof worldMap !== 'undefined' ? worldMap.getCurrentChamber() : null;
      if (['REEF', 'PRESSURE'].includes(name) && sys && !sys.home && !ch?.isHaven && galaxy.rule() !== 'blacksun') next = REGION_BED[sys.rid || 0];
    } catch { }
    return set.call(this, next, opts);
  };
  // 3 · the graph: high-pass the music, lift the pad into the mids
  const build = SoundEngine.prototype.buildBuses;
  SoundEngine.prototype.buildBuses = function (...a) {
    const r = build.apply(this, a), c = this.ctx;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; hp.Q.value = 0.7;
    this.musicBus.disconnect(); this.musicBus.connect(hp); hp.connect(this.master); this.musicHighpass = hp;
    for (const o of [this.padOsc1, this.padOsc2]) if (o) o.type = 'triangle';
    if (this.padFilter) this.padFilter.Q.value = 0.5;
    // current-soundscape.js sustains two triangles under everything; sines keep the air without the buzz.
    for (const o of this.currentAmbience?.tones || []) o.type = 'sine';
    return r;
  };
  const apply = SoundEngine.prototype.applyState;
  SoundEngine.prototype.applyState = function (immediate, ...a) {
    const r = apply.call(this, immediate, ...a);
    if (!this.ctx || !this.padOsc1) return r;
    const t = this.ctx.currentTime, tau = immediate ? 0.01 : 0.7, bed = this.bed(), combat = this.state === 'COMBAT' || this.state === 'BOSS';
    this.padOsc1.frequency.setTargetAtTime(bed.root * 4, t, tau); this.padOsc2?.frequency.setTargetAtTime(bed.fifth * 4, t, tau);
    this.subOsc?.frequency.setTargetAtTime(bed.root, t, tau);
    this.padFilter?.frequency.setTargetAtTime(Math.max(700, bed.cutoff * 4) + (combat ? 400 : 0), t, tau);
    const amb = this.currentAmbience, look = AMBIENCE[this.biome];
    if (amb && look) { amb.filter.frequency.setTargetAtTime(combat ? look.cutoff * 1.4 : look.cutoff, t, tau); }
    return r;
  };
  // 4 · guns and impacts forward: battery-audio.js owns the family/class voices; this lifts them.
  const GUN_LIFT = 2.6, IMPACT_LIFT = 2.0;
  function lift() {
    if (!window.batteryAudio?.ready || !soundEngine.extraVoices) { setTimeout(lift, 100); return; }
    for (const [k, v] of Object.entries(soundEngine.extraVoices)) if (!v._lifted && (k.startsWith('w:') || k.startsWith('bc-impact:'))) { v[3] *= k.startsWith('w:') ? GUN_LIFT : IMPACT_LIFT; v._lifted = true; }
  }
  window.addEventListener('load', () => setTimeout(lift, 300));
  // While your guns speak, the music steps back further (soundscape.js ducks to 0.78; this takes it to 0.6).
  const mix = SoundEngine.prototype.setMix;
  SoundEngine.prototype.setMix = function (...a) { const r = mix.apply(this, a); if (this.ctx && this.ctx.state !== 'closed' && this.musicBus && this.voiceGroups?.weapon) this.musicBus.gain.setTargetAtTime(this.mix.music * (this.ducked ? .45 : 1) * 0.6, this.ctx.currentTime, .08); return r; };
  window.soundMix = { REGION_BED, AMBIENCE, GUN_LIFT, IMPACT_LIFT, ready: true };
})();
