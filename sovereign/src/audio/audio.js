// Procedural audio: every sound is synthesised with Web Audio, so the single-file game ships no audio files.
// Reads the simulation's event log and the player's state; never writes game state.
//
// Buses: master → compressor → out; sfx, engine, ambient and ui feed master with their own volumes.

const MAX_VOICES = 28;

export function createAudio(world, view, settings) {
  let ctx = null, bus = null, noise = null, engine = null, ambient = null;
  let lastSeq = 0, voices = 0, lockBeep = 0;
  const lastPlayed = new Map();

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    const master = ctx.createGain(); master.connect(comp);
    bus = { master };
    for (const k of ['sfx', 'engine', 'ambient', 'ui']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
    // Two seconds of white noise, reused by every noisy sound.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
    engine = createEngineVoice();
    ambient = createAmbient();
  }

  function applyVolumes() {
    if (!bus) return;
    const v = (x) => Math.max(0, x);
    bus.master.gain.value = settings.muted ? 0 : v(settings.volMaster ?? 0.8);
    bus.sfx.gain.value = v(settings.volSfx ?? 0.8);
    bus.engine.gain.value = v(settings.volEngine ?? 0.6);
    bus.ambient.gain.value = v(settings.volAmbient ?? 0.5);
    bus.ui.gain.value = v(settings.volUi ?? 0.6);
  }

  // ---------- building blocks
  const now = () => ctx.currentTime;
  function envGain(dest, peak, attack, decay, t0 = now()) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(dest);
    return g;
  }
  function noiseSrc(t0, dur, rate = 1) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = rate;
    s.start(t0, Math.random() * 1.5, dur + 0.05);
    return s;
  }
  function osc(type, freq, t0, dur) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  function filter(type, freq, q = 1) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }

  /** A positioned voice: gain from distance to the camera, stereo pan from screen side. */
  function spatial(pos, base = 1, range = 4000, busName = 'sfx') {
    if (voices >= MAX_VOICES) return null;
    let gain = base, pan = 0;
    if (pos) {
      const cam = view.rig.camera.position;
      const d = Math.hypot(pos.x - cam.x, pos.y - cam.y, pos.z - cam.z);
      gain *= 1 / (1 + (d / (range * 0.25)) ** 2);
      if (gain < 0.01) return null;
      const s = view.project(pos);
      if (s) pan = Math.max(-0.9, Math.min(0.9, (s.x / innerWidth) * 2 - 1));
    }
    const out = ctx.createGain(); out.gain.value = gain;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; out.connect(p); p.connect(bus[busName]); } else out.connect(bus[busName]);
    voices++;
    setTimeout(() => { voices--; out.disconnect(); p?.disconnect(); }, 1600);
    return out;
  }
  /** Rate-limit a sound kind per source so rapid fire does not stack into noise. */
  function allow(key, gap) {
    const t = performance.now(), last = lastPlayed.get(key) || 0;
    if (t - last < gap * 1000) return false;
    lastPlayed.set(key, t);
    return true;
  }

  // ---------- weapons: each turret family has its own voice
  const WEAPONS = {
    autocannon(out, t) { // punchy kinetic thump
      noiseSrc(t, 0.12, 0.7).connect(filter('lowpass', 1400)).connect(envGain(out, 0.7, 0.002, 0.12, t));
      const o = osc('sine', 120, t, 0.15); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); o.connect(envGain(out, 0.6, 0.002, 0.14, t));
    },
    repeater(out, t) { // fast dry clicks
      noiseSrc(t, 0.05, 1.4).connect(filter('bandpass', 2600, 1.5)).connect(envGain(out, 0.5, 0.001, 0.05, t));
    },
    railgun(out, t) { // sharp crack, falling zap, sub thump
      noiseSrc(t, 0.05, 2).connect(filter('highpass', 3000)).connect(envGain(out, 0.6, 0.001, 0.05, t));
      const z = osc('sawtooth', 2400, t, 0.35); z.frequency.exponentialRampToValueAtTime(140, t + 0.3); z.connect(filter('lowpass', 3500)).connect(envGain(out, 0.25, 0.002, 0.32, t));
      const s = osc('sine', 70, t, 0.3); s.frequency.exponentialRampToValueAtTime(30, t + 0.28); s.connect(envGain(out, 0.8, 0.003, 0.28, t));
    },
    plasma(out, t) { // wobbling hot discharge
      const o = osc('sawtooth', 220, t, 0.3); const lfo = osc('sine', 38, t, 0.3); const lg = ctx.createGain(); lg.gain.value = 90;
      lfo.connect(lg).connect(o.frequency); o.frequency.exponentialRampToValueAtTime(90, t + 0.28);
      o.connect(filter('lowpass', 1200, 4)).connect(envGain(out, 0.35, 0.005, 0.28, t));
    },
    beam_laser(out, t) { // bright descending sweep
      const o = osc('square', 1800, t, 0.22); o.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      o.connect(filter('bandpass', 2000, 2)).connect(envGain(out, 0.18, 0.003, 0.2, t));
      const h = osc('sine', 3600, t, 0.2); h.frequency.exponentialRampToValueAtTime(1200, t + 0.18); h.connect(envGain(out, 0.1, 0.003, 0.18, t));
    },
    flak(out, t) { // short pops
      noiseSrc(t, 0.07, 1.1).connect(filter('bandpass', 900, 0.8)).connect(envGain(out, 0.55, 0.001, 0.07, t));
    },
    missile(out, t) { // launch thump and rising whoosh
      noiseSrc(t, 0.6, 0.9).connect(filter('bandpass', 500, 0.7)).connect(envGain(out, 0.35, 0.05, 0.5, t));
      const s = osc('sine', 90, t, 0.2); s.frequency.exponentialRampToValueAtTime(40, t + 0.18); s.connect(envGain(out, 0.5, 0.003, 0.18, t));
    },
    ion(out, t) { // zappy square chirp
      const o = osc('square', 900, t, 0.18); o.frequency.exponentialRampToValueAtTime(2200, t + 0.06); o.frequency.exponentialRampToValueAtTime(400, t + 0.16);
      o.connect(filter('lowpass', 3000)).connect(envGain(out, 0.16, 0.002, 0.16, t));
    },
    shard(out, t) { // metallic ring
      noiseSrc(t, 0.1, 1).connect(filter('bandpass', 1800, 6)).connect(envGain(out, 0.5, 0.001, 0.1, t));
      for (const f of [523, 811, 1307]) osc('sine', f, t, 0.5).connect(envGain(out, 0.06, 0.002, 0.45, t));
    },
    void_torpedo(out, t) { // deep sucking launch
      const o = osc('sine', 55, t, 0.8); o.frequency.exponentialRampToValueAtTime(25, t + 0.7); o.connect(envGain(out, 0.8, 0.02, 0.7, t));
      noiseSrc(t, 0.8, 0.5).connect(filter('lowpass', 400)).connect(envGain(out, 0.3, 0.1, 0.6, t));
    },
    siege_beam(out, t) { // charged lance
      const o = osc('sawtooth', 110, t, 0.6); o.frequency.exponentialRampToValueAtTime(55, t + 0.55); o.connect(filter('lowpass', 900, 6)).connect(envGain(out, 0.4, 0.01, 0.55, t));
      const h = osc('sine', 1760, t, 0.4); h.frequency.exponentialRampToValueAtTime(880, t + 0.35); h.connect(envGain(out, 0.12, 0.01, 0.35, t));
    },
  };

  // ---------- impacts and events
  function shieldHit(out, t) {
    noiseSrc(t, 0.25, 0.6).connect(filter('lowpass', 600)).connect(envGain(out, 0.45, 0.005, 0.22, t));
    const s = osc('sine', 1400, t, 0.3); s.frequency.exponentialRampToValueAtTime(2400, t + 0.25); s.connect(envGain(out, 0.06, 0.01, 0.25, t));
  }
  function armourHit(out, t, pen) {
    noiseSrc(t, 0.12, 1).connect(filter('bandpass', 1400, 3)).connect(envGain(out, 0.5, 0.001, 0.12, t));
    for (const f of [347, 563, 911]) osc('triangle', f, t, 0.3).connect(envGain(out, 0.07, 0.001, 0.25, t));
    if (pen) noiseSrc(t, 0.25, 0.5).connect(filter('lowpass', 500)).connect(envGain(out, 0.6, 0.002, 0.25, t));
  }
  function explosion(out, t, big) {
    const n = noiseSrc(t, big ? 3 : 1.6, 0.5); const lp = filter('lowpass', 1800);
    lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(120, t + (big ? 2.5 : 1.3));
    n.connect(lp).connect(envGain(out, 1.0, 0.005, big ? 2.6 : 1.4, t));
    const s = osc('sine', 60, t, 1.2); s.frequency.exponentialRampToValueAtTime(22, t + 1.0); s.connect(envGain(out, 0.9, 0.005, 1.0, t));
  }
  function ui(kind) {
    if (!ctx) return;
    const t = now(), out = bus.ui;
    const tone = (f, d, g = 0.12, type = 'sine') => osc(type, f, t, d).connect(envGain(out, g, 0.004, d, t));
    switch (kind) {
      case 'lockTick': tone(1200, 0.05, 0.06, 'square'); break;
      case 'locked': tone(880, 0.08); setTimeout(() => ctx && osc('sine', 1320, now(), 0.12).connect(envGain(out, 0.12, 0.004, 0.12)), 90); break;
      case 'click': tone(1500, 0.03, 0.05, 'triangle'); break;
      case 'toast': tone(660, 0.12, 0.06); break;
      case 'stage': tone(740, 0.1); setTimeout(() => ctx && osc('sine', 988, now(), 0.16).connect(envGain(out, 0.1, 0.004, 0.16)), 110); break;
      case 'reward': for (const [f, dl] of [[523, 0], [659, 90], [784, 180], [1047, 270]]) setTimeout(() => ctx && osc('sine', f, now(), 0.25).connect(envGain(out, 0.1, 0.004, 0.25)), dl); break;
      case 'warn': tone(220, 0.3, 0.12, 'sawtooth'); break;
    }
  }
  function ping(t) {
    // Sonar ping with a decaying echo.
    const out = bus.sfx;
    const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.45;
    delay.connect(fb).connect(delay); delay.connect(out);
    const g = envGain(out, 0.35, 0.005, 0.9, t); g.connect(delay);
    const o = osc('sine', 1180, t, 1.0); o.frequency.exponentialRampToValueAtTime(980, t + 0.9); o.connect(g);
    setTimeout(() => { delay.disconnect(); fb.disconnect(); }, 3500);
  }
  function dockClunk(t) {
    const out = bus.sfx;
    noiseSrc(t, 0.3, 0.4).connect(filter('lowpass', 300)).connect(envGain(out, 0.8, 0.005, 0.3, t));
    noiseSrc(t + 0.15, 0.9, 1).connect(filter('highpass', 2000)).connect(envGain(out, 0.15, 0.2, 0.7, t + 0.15));
  }

  // ---------- continuous voices
  function createEngineVoice() {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(bus.engine);
    const lp = filter('lowpass', 300, 1.5); lp.connect(out);
    const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 40; a.connect(lp); a.start();
    const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = 40.7; b.connect(lp); b.start();
    const rumble = ctx.createBufferSource(); rumble.buffer = noise; rumble.loop = true; rumble.playbackRate.value = 0.35;
    const rg = ctx.createGain(); rg.gain.value = 0; rumble.connect(filter('lowpass', 220)).connect(rg).connect(bus.engine); rumble.start();
    return {
      update(throttle, speedFrac, size, dt) {
        const base = 26 + 40 * (1 - size);     // bigger hulls hum lower
        const f = base * (1 + throttle * 0.6 + speedFrac * 0.25);
        const k = 1 - Math.exp(-dt * 3);
        a.frequency.value += (f - a.frequency.value) * k;
        b.frequency.value += (f * 1.012 - b.frequency.value) * k;
        lp.frequency.value += (180 + 900 * throttle - lp.frequency.value) * k;
        out.gain.value += ((0.05 + 0.18 * throttle) - out.gain.value) * k;
        rg.gain.value += ((0.02 + 0.3 * throttle * throttle) - rg.gain.value) * k;
      },
      silence(dt) { const k = 1 - Math.exp(-dt * 4); out.gain.value -= out.gain.value * k; rg.gain.value -= rg.gain.value * k; },
    };
  }
  function createAmbient() {
    // A slow pad: detuned low voices through a drifting filter, plus faint space wind.
    const out = ctx.createGain(); out.gain.value = 0; out.connect(bus.ambient);
    const lp = filter('lowpass', 500, 0.8); lp.connect(out);
    for (const f of [55, 82.4, 110.3, 164.8]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12; const g = ctx.createGain(); g.gain.value = 0.18; o.connect(g).connect(lp); o.start(); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(lp.frequency); lfo.start();
    const wind = ctx.createBufferSource(); wind.buffer = noise; wind.loop = true; wind.playbackRate.value = 0.25;
    const wg = ctx.createGain(); wg.gain.value = 0.05; wind.connect(filter('bandpass', 700, 0.5)).connect(wg).connect(out); wind.start();
    out.gain.linearRampToValueAtTime(0.35, now() + 4);
    return { out };
  }

  // ---------- per frame
  return {
    start,
    applyVolumes,
    ui,
    update(dt) {
      if (!ctx || ctx.state !== 'running') return;
      const p = world.entities.find((e) => e.id === world.playerId);
      if (p && !p.dead && !p.docked) engine.update(p.throttle, Math.min(1, p.speed / p.flight.maxSpeed), Math.min(1, p.hull.radius / 26), dt);
      else engine.silence(dt);
      if (p && p.lock.targetId != null && p.lock.progress < 1 && (lockBeep -= dt) <= 0) { lockBeep = 0.18; ui('lockTick'); }
      const t = now();
      for (const ev of world.events) {
        if (ev.seq <= lastSeq) continue;
        lastSeq = ev.seq;
        const mine = ev.shipId === world.playerId || ev.ownerId === world.playerId;
        switch (ev.type) {
          case 'fire': {
            const ship = world.entities.find((e) => e.id === ev.shipId);
            if (!ship || !allow('f' + ev.shipId + ev.bank, 0.05)) break;
            const out = spatial(ship.pos, mine ? 0.55 : 0.4);
            if (out) (WEAPONS[ev.weaponId] || WEAPONS.autocannon)(out, t);
            break;
          }
          case 'hit': {
            if (!allow('h' + ev.shipId, 0.06)) break;
            const out = spatial(ev.pos, ev.shipId === world.playerId ? 0.8 : 0.5);
            if (!out) break;
            if (ev.armour || ev.structure) armourHit(out, t, ev.penetrated && ev.structure > 0); else shieldHit(out, t);
            break;
          }
          case 'destroyed': { const out = spatial(ev.pos, 1, 9000); if (out) explosion(out, t, ev.radius > 14); break; }
          case 'locked': if (ev.shipId === world.playerId) ui('locked'); break;
          case 'ping': ping(t); break;
          case 'sigStage': ui('stage'); break;
          case 'sigResolved': case 'opComplete': case 'researched': ui('reward'); break;
          case 'opWave': ui('warn'); break;
          case 'docked': case 'undocked': dockClunk(t); break;
          case 'fitted': case 'nodeMoved': case 'sold': case 'bought': case 'boarded': ui('click'); break;
          case 'hullBought': case 'hullSold': ui('reward'); break;
          case 'tradeRefused': case 'jumpRefused': ui('warn'); break;
          case 'jumpSpool': ui('stage'); break;
          case 'looted': case 'covered': ui('reward'); break;
          case 'lootRefused': ui('warn'); break;
          case 'jumped': case 'sectorChanged': dockClunk(t); ui('reward'); break;
          case 'fitRefused': case 'pingRefused': case 'dockRefused': ui('warn'); break;
        }
      }
    },
  };
}
