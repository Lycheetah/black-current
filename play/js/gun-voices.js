/* GUN VOICES · Warship II (Route 4 item 5; Mac, 2026-10-30: "the sound scape's terrible … eve's weapons is sort of what we
 * want … I love the sound of auto cannons, people love lasers"). Each family is voiced in layers, still pure synthesis:
 *   kinetic   autocannon chug: a hard transient, a punchy body and thump, the bolt cycling (two clacks), brass ringing out
 *   beam      laser zap: a resonant saw that dives, an electric crackle on the front and a short hum behind it
 *   rail      a capacitor whine that snaps into a sharp report and a ringing metal tail
 *   missile   a launch thump, then a rocket hiss sweeping away
 *   ordnance  a deep boom with a crack on the front and a rolling echo behind
 * Bigger classes are lower, longer and louder; repeaters are tighter, lances longer. Settings → Sound → Gun sounds picks
 * Warship II (default) or Classic, and "Hear the guns" plays each family in both, so the choice is made by ear. */
(() => {
  'use strict';
  const PITCH = [1.25, 1.1, 1, .85, .7, .55], LENGTH = [.7, .85, 1, 1.2, 1.4, 1.65], LOUD = [.75, .85, 1, 1.1, 1.2, 1.3];
  const FAMILIES = ['kinetic', 'beam', 'rail', 'missile', 'ordnance'];
  const NAMES = { kinetic: 'Autocannon', beam: 'Laser', rail: 'Railgun', missile: 'Missiles', ordnance: 'Artillery' };
  const SAMPLE = { kinetic: 'autocannon', beam: 'pulse-light', rail: 'rifle-heavy', missile: 'seeker-light', ordnance: 'mortar-heavy' };
  const stats = { played: {}, dropped: 0, active: 0 };
  let ready = false, lastAt = {};
  const set = () => window.menu?.settings?.().gunVoices || 'warship2';
  const se = () => typeof soundEngine !== 'undefined' ? soundEngine : null;
  function where(position) {
    if (!position || typeof engine === 'undefined' || !Number.isFinite(position.x)) return { pan: 0, gain: 1 };
    const P = engine.player, cam = engine.camera, z = cam?.zoom || 1, half = (engine.viewportWidth || innerWidth) / 2;
    const dx = (position.x - P.x) * z, d = Math.hypot(position.x - P.x, position.y - P.y);
    return { pan: Math.max(-0.8, Math.min(0.8, dx / half * 0.8)), gain: 1 / (1 + d / 1600) };
  }
  // one shot: build the layers into `out`, return the time the last one ends
  function noise(c, s, t, dur, type, freq, q, gain, out, sweepTo) {
    const n = c.createBufferSource(); n.buffer = s.noise; n.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.004, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.02); return t + dur;
  }
  function tone(c, t, dur, wave, from, to, gain, out, filter) {
    const o = c.createOscillator(); o.type = wave; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.003, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let head = o; if (filter) { const f = c.createBiquadFilter(); f.type = filter[0]; f.frequency.setValueAtTime(filter[1], t); if (filter[3]) f.frequency.exponentialRampToValueAtTime(filter[3], t + dur); f.Q.value = filter[2] || 0.7; o.connect(f); head = f; }
    head.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); return t + dur;
  }
  const VOICE = {
    kinetic(c, s, t, p, l, out, arch) {
      const tight = arch === 'repeater' ? 0.7 : arch === 'scatter' || arch === 'flak' ? 1.2 : 1;
      let end = noise(c, s, t, 0.018, 'highpass', 2200, 0.7, 1, out);                            // the crack
      end = Math.max(end, noise(c, s, t, 0.045 * l * tight, 'bandpass', 1700 * p, 1.2, 0.6, out)); // the bark
      end = Math.max(end, noise(c, s, t, 0.07 * l * tight, 'bandpass', 900 * p, 1.1, 0.7, out));   // the body
      end = Math.max(end, tone(c, t, 0.07 * l * tight, 'sine', 125 * p, 45 * p, 0.7, out));         // the thump
      for (const dt of [0.045, 0.072]) end = Math.max(end, tone(c, t + dt * l * tight, 0.012, 'square', 1900 * p, 1300 * p, 0.12, out, ['bandpass', 2400, 3]));   // the bolt cycling
      if (Math.random() < 0.35) for (const [f, dt] of [[4200, 0.13], [5650, 0.19]]) end = Math.max(end, tone(c, t + dt * l, 0.12, 'sine', f, f * 0.99, 0.035, out));   // brass
      return end;
    },
    beam(c, s, t, p, l, out, arch) {
      const long = arch === 'lance' ? 1.6 : arch === 'pulse' ? 0.85 : 1;
      let end = tone(c, t, 0.13 * l * long, 'sawtooth', 2600 * p, 320 * p, 0.32, out, ['bandpass', 3200 * p, 7, 600 * p]);   // the zap
      end = Math.max(end, tone(c, t, 0.13 * l * long, 'sawtooth', 2640 * p, 330 * p, 0.18, out, ['bandpass', 3100 * p, 7, 580 * p]));   // a second saw, detuned, for width
      end = Math.max(end, noise(c, s, t, 0.03, 'highpass', 5200, 0.7, 0.28, out));                 // the crackle
      end = Math.max(end, tone(c, t + 0.02, 0.2 * l * long, 'square', 110 * p, 104 * p, 0.09, out, ['lowpass', 700]));   // the hum
      return end;
    },
    rail(c, s, t, p, l, out) {
      let end = tone(c, t, 0.028, 'sine', 900 * p, 2600 * p, 0.08, out);                            // the capacitor whine
      const snap = t + 0.024;
      end = Math.max(end, noise(c, s, snap, 0.01, 'highpass', 3200, 0.7, 1, out));                 // the snap
      end = Math.max(end, tone(c, snap, 0.08 * l, 'sine', 190 * p, 60 * p, 0.7, out));             // the kick
      for (const f of [620, 1710, 2950]) end = Math.max(end, tone(c, snap, 0.38 * l, 'sine', f * p, f * p * 0.985, 0.045, out));   // the ringing rails
      return end;
    },
    missile(c, s, t, p, l, out, arch) {
      const heavy = arch === 'torpedo' ? 1.5 : 1;
      let end = tone(c, t, 0.11 * l * heavy, 'sine', 95 * p, 40 * p, 0.7, out);                    // the launch thump
      end = Math.max(end, noise(c, s, t + 0.01, 0.45 * l * heavy, 'bandpass', 600 / heavy, 1.4, 0.38, out, 2600 / heavy));   // the hiss sweeping away
      end = Math.max(end, noise(c, s, t, 0.02, 'highpass', 2500, 0.7, 0.4, out));                   // the ignition pop
      return end;
    },
    ordnance(c, s, t, p, l, out) {
      let end = noise(c, s, t, 0.025, 'highpass', 1800, 0.7, 0.55, out);                           // the crack
      end = Math.max(end, tone(c, t, 0.42 * l, 'sine', 72 * p, 24 * p, 1, out));                   // the boom
      end = Math.max(end, noise(c, s, t, 0.6 * l, 'lowpass', 650 * p, 0.7, 0.8, out));
      for (const [dt, g] of [[0.19, 0.3], [0.4, 0.15]]) end = Math.max(end, noise(c, s, t + dt * l, 0.35 * l, 'lowpass', 420 * p, 0.7, g, out));   // the rolling echo
      return end;
    }
  };
  function play(type, position, force) {
    const s = se(); if (!s?.ctx || s.ctx.state === 'closed' || s.muted || !s.noise || (!force && document.hidden)) return false;
    const g = window.arsenal?.GUNS?.[type], family = g?.family || 'kinetic', arch = g?.arch, cls = Math.max(0, Math.min(5, Number(g?.c ?? 1)));
    const c = s.ctx, t = c.currentTime;
    // the limiter: one voice per family every 35 ms, at most ten gun voices at once
    if (!force && ((lastAt[family] ?? -1) + 0.035 > t || stats.active >= 10)) { stats.dropped++; return 'dropped'; }
    lastAt[family] = t;
    const at = where(position), out = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    out.gain.value = 0.3 * LOUD[cls] * at.gain; if (pan.pan) pan.pan.value = at.pan;
    out.connect(pan); pan.connect(s.sfx ? s.sfx() : s.sfxBus);
    const p = PITCH[cls] * (0.97 + Math.random() * 0.06), l = LENGTH[cls];
    const end = VOICE[family](c, s, t, p, l, out, arch);
    stats.active++; stats.played[family] = (stats.played[family] || 0) + 1;
    setTimeout(() => { try { out.disconnect(); pan.disconnect(); } catch (e) { } stats.active = Math.max(0, stats.active - 1); }, (end - t) * 1000 + 120);
    return true;
  }
  // Settings → Sound: the choice and a row of A/B buttons
  function settingsRow() {
    const panel = document.getElementById('menu-panel'); if (!panel || panel.style.display === 'none' || document.getElementById('gun-voices')) return;
    const heads = [...panel.querySelectorAll('h3,h4,.settings-h')].filter(h => /^sound/i.test(h.textContent.trim())); if (!heads.length) return;
    const box = document.createElement('section'); box.id = 'gun-voices'; box.className = 'gun-voices';
    const label = document.createElement('p'); label.className = 'gfx-cap-label'; label.textContent = 'Gun sounds';
    const pick = document.createElement('div'); pick.className = 'gfx-presets'; pick.setAttribute('role', 'group'); pick.setAttribute('aria-label', 'Gun sounds');
    for (const [id, name] of [['warship2', 'Warship II'], ['classic', 'Classic']]) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.gunVoices = id; b.textContent = name; b.setAttribute('aria-pressed', String(set() === id));
      b.onclick = () => { menu.settings().gunVoices = id; saveState.save(); for (const x of pick.children) x.setAttribute('aria-pressed', String(x.dataset.gunVoices === id)); };
      pick.append(b);
    }
    const hearLabel = document.createElement('p'); hearLabel.className = 'gfx-cap-label'; hearLabel.textContent = 'Hear the guns · new, then classic';
    const hear = document.createElement('div'); hear.className = 'gun-hear';
    for (const f of FAMILIES) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.hear = f; b.textContent = NAMES[f];
      b.onclick = () => { const s = se(); s?.init?.(); s?.ctx?.resume?.(); play(SAMPLE[f], null, true); setTimeout(() => { classic(SAMPLE[f]); }, 650); };
      hear.append(b);
    }
    box.append(label, pick, hearLabel, hear);
    // after the Sound sliders, before the next heading
    let next = heads[0].nextElementSibling; while (next && !/^H[34]$/.test(next.tagName)) next = next.nextElementSibling;
    if (next) next.before(box); else heads[0].parentElement.append(box);
  }
  let classic = () => { };
  // Hooked at the 'w:<gun>' voice, under battery-audio.js, so its merging of a battery's simultaneous reports still
  // decides what is heard; Warship II only changes how an admitted report sounds.
  function install() {
    const s = se(); if (!s || !window.arsenal?.GUNS || !window.menu || !window.batteryAudio?.ready || !window.warshipAudio?.ready) { setTimeout(install, 80); return; }
    const P = Object.getPrototypeOf(s), voice = P.voice;
    classic = type => voice.call(s, 'w:' + type, null);
    P.voice = function (kind, position, when) {
      if (set() !== 'classic' && when == null && typeof kind === 'string' && kind.startsWith('w:') && this === s && typeof this.ctx?.createGain === 'function') { const r = play(kind.slice(2), position); if (r) return r; }
      return voice.apply(this, arguments);
    };
    new MutationObserver(settingsRow).observe(document.getElementById('menu-panel') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    ready = true;
  }
  window.gunVoices = { play, FAMILIES, SAMPLE, stats, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 600));
})();
