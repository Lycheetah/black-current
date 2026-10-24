/* ==========================================================================
   2.5 · LIVING WATER. Mac, 2026-10-24: "fully forge all you can". look.js gave
   the abyss depth; this gives every place its own weather and breath:
     · a tint wash from the surface and a darker floor
     · light shafts falling from above (none in Black Sun water)
     · bioluminescent plankton that drifts and pulses
     · embers raining under the Foundry sky
     · a red edge pulse on a hull under 30%, riding soundscape's heartbeat
     · an ambient bed under the music: brown-noise swell, a hum in Black Sun
       water, distant calls from things too big to see, Foundry crackle
   ⚡ Same law as look.js: the wash and shafts are cached canvases, plankton are
   glow blits, embers are one stroked path per colour. An art pack keeps its
   own ocean. `look.cfg.atmosphere = false` stills the water.
   🔊 The bed and calls sit under musicBus, so the Music slider and Mute own them.
   ========================================================================== */
(() => {
  const TAU = Math.PI * 2;
  /* One row per place: galaxy rules first, then campaign BIOMES, then 'haven'
     for Dock Nine and every system hub. tint/pale/wash/shafts/motes/embers
     paint the water; cutoff/level/swell/hum/calls/crackle tune the bed. */
  const PLACES = {
    haven:           { tint: '#5ef2e0', pale: '#c8fbff', wash: .10, shafts: .085, motes: 46,  cutoff: 520,  level: .045, swell: .06 },
    reef:            { tint: '#39ff14', pale: '#b8ffd8', wash: .07, shafts: .07,  motes: 70,  cutoff: 680,  level: .045, swell: .07, calls: true },
    'pressure-line': { tint: '#bc13fe', pale: '#e6c8ff', wash: .09, shafts: .045, motes: 60,  cutoff: 300,  level: .06,  swell: .05, calls: true },
    'black-current': { tint: '#5a7fa8', pale: '#d6e6ff', wash: .11, shafts: .03,  motes: 54,  cutoff: 230,  level: .07,  swell: .045, calls: true, deep: true },
    debt:            { tint: '#ff3366', pale: '#ffc6d2', wash: .10, shafts: .02,  motes: 40,  cutoff: 260,  level: .065, swell: .05 },
    blacksun:        { tint: '#bc13fe', pale: '#f0e0ff', wash: .12, shafts: 0,    motes: 36,  cutoff: 150,  level: .08,  swell: .035, calls: true, deep: true, hum: true },
    riptide:         { tint: '#5ef2e0', pale: '#e6fffb', wash: .08, shafts: .06,  motes: 50,  cutoff: 1100, level: .075, swell: .16, calls: true },
    foundry:         { tint: '#ff8c42', pale: '#ffe0a8', wash: .10, shafts: .05,  motes: 30,  cutoff: 420,  level: .055, swell: .06, embers: 56, crackle: true },
    swarm:           { tint: '#39ff14', pale: '#e0ffb0', wash: .08, shafts: .05,  motes: 110, cutoff: 900,  level: .04,  swell: .09, calls: true },
  };
  const LOW_HULL = 0.3; // soundscape.js starts the heartbeat at the same 30%
  const drawn = { frames: 0, motes: 0, shafts: 0, embers: 0, calls: 0 };

  const hasLook = () => typeof look !== 'undefined' && look && look.cfg;
  const packActive = () => typeof packRenderer !== 'undefined' && packRenderer && packRenderer.active;
  const still = () => document.body.classList.contains('reduced-motion');

  function placeKey() {
    let ch = null;
    try { ch = typeof worldMap !== 'undefined' && worldMap.getCurrentChamber ? worldMap.getCurrentChamber() : null; } catch (e) { /* map not built yet */ }
    if (!ch || ch.isHaven || ch.biome === 'starter-haven') return 'haven';
    const rule = typeof galaxy !== 'undefined' && galaxy && galaxy.rule ? galaxy.rule() : null;
    if (rule && PLACES[rule]) return rule;
    return PLACES[ch.biome] ? ch.biome : 'reef';
  }
  let here = 'haven';

  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const MOTE_TILE = 1200, EMBER_TILE = 1100;
  const MOTES = Array.from({ length: 110 }, () => ({ x: rand() * MOTE_TILE, y: rand() * MOTE_TILE, r: 2.5 + rand() * 4, ph: rand() * TAU, sp: 0.6 + rand() * 1.1, pale: rand() < 0.4 }));
  const EMBERS = Array.from({ length: 60 }, () => ({ x: rand() * EMBER_TILE, y: rand() * EMBER_TILE, ph: rand() * TAU, len: 8 + rand() * 12, hot: rand() < 0.35 }));

  /* Visit every copy of the first n points of a seamless tile that lands in view. */
  function field(size, ox, oy, w, h, pts, n, f) {
    const bx = ((ox % size) + size) % size, by = ((oy % size) + size) % size;
    for (let tx = -bx; tx < w; tx += size) for (let ty = -by; ty < h; ty += size) {
      for (let i = 0; i < n; i++) {
        const p = pts[i], x = tx + p.x, y = ty + p.y;
        if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
        f(p, x, y);
      }
    }
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ── the wash: surface light in the place's colour, a darker floor ─────── */
  const washC = document.createElement('canvas'), washG = washC.getContext('2d');
  let washKey = '';
  function drawWash(ctx, w, h, p) {
    const qw = Math.max(1, Math.ceil(w / 4)), qh = Math.max(1, Math.ceil(h / 4)), key = qw + 'x' + qh + p.tint + p.wash;
    if (key !== washKey) {
      washKey = key; washC.width = qw; washC.height = qh;
      const r = washG.createRadialGradient(qw * 0.5, -qh * 0.2, 0, qw * 0.5, -qh * 0.2, Math.max(qw, qh) * 1.15);
      r.addColorStop(0, rgba(p.tint, p.wash)); r.addColorStop(0.6, rgba(p.tint, p.wash * 0.35)); r.addColorStop(1, rgba(p.tint, 0));
      washG.fillStyle = r; washG.fillRect(0, 0, qw, qh);
      const d = washG.createLinearGradient(0, qh * 0.45, 0, qh);
      d.addColorStop(0, 'rgba(0,2,8,0)'); d.addColorStop(1, 'rgba(0,2,8,0.32)');
      washG.fillStyle = d; washG.fillRect(0, 0, qw, qh);
    }
    ctx.drawImage(washC, 0, 0, w, h);
  }

  /* ── light shafts: one cached fan sprite per colour, five swaying copies ── */
  const shaftSprites = new Map();
  function shaftSprite(color) {
    let c = shaftSprites.get(color);
    if (c) return c;
    c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.beginPath(); g.moveTo(22, 0); g.lineTo(42, 0); g.lineTo(64, 512); g.lineTo(0, 512); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-in';
    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.45, 'rgba(255,255,255,0.4)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(0, 0, 64, 512);
    const s = g.createLinearGradient(0, 0, 64, 0);
    s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = s; g.fillRect(0, 0, 64, 512);
    shaftSprites.set(color, c);
    return c;
  }
  const SHAFTS = [[0.08, 1.0, 0.0], [0.27, 1.6, 1.7], [0.46, 0.8, 3.1], [0.63, 1.3, 4.4], [0.84, 1.1, 5.6]]; // [x share, width, phase]
  function drawShafts(ctx, camera, w, h, p, t) {
    if (!p.shafts) return;
    const img = shaftSprite(p.pale), span = w * 1.5, slide = camera.x * 0.12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [fx, ws, ph] of SHAFTS) {
      const x = (((fx * span - slide) % span) + span) % span - w * 0.25, sw = 90 + 70 * ws;
      ctx.globalAlpha = p.shafts * (0.55 + 0.45 * Math.sin(t * 0.21 + ph));
      ctx.save(); ctx.translate(x, -h * 0.08); ctx.rotate(0.22 + Math.sin(t * 0.13 + ph) * 0.04);
      ctx.drawImage(img, -sw / 2, 0, sw, h * 1.35);
      ctx.restore();
      drawn.shafts++;
    }
    ctx.restore();
  }

  /* ── plankton: glow blits that drift and breathe, thinned when zoomed out ─ */
  function drawMotes(ctx, camera, w, h, p, t, z) {
    if (!p.motes || !hasLook() || !look.glow) return;
    const a = look.glow(p.tint), b = look.glow(p.pale);
    const n = Math.round(Math.min(p.motes, MOTES.length) * Math.min(1, z * 1.2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    field(MOTE_TILE, camera.x * 0.55 + t * 9, camera.y * 0.55 - t * 5, w, h, MOTES, n, (m, x, y) => {
      const k = 0.5 + 0.5 * Math.sin(t * m.sp + m.ph), R = m.r * (2.6 + k);
      ctx.globalAlpha = 0.1 + 0.4 * k * k * k;
      ctx.drawImage(m.pale ? b : a, x + Math.sin(t * 0.4 + m.ph) * 10 - R, y - R, R * 2, R * 2);
      drawn.motes++;
    });
    ctx.restore();
  }

  /* ── Foundry embers: falling sparks, one stroke per colour ─────────────── */
  function drawEmbers(ctx, camera, w, h, p, t) {
    if (!p.embers) return;
    const n = Math.min(p.embers, EMBERS.length);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (const hot of [false, true]) {
      ctx.strokeStyle = hot ? 'rgba(255,226,140,0.7)' : 'rgba(255,128,52,0.5)';
      ctx.beginPath();
      field(EMBER_TILE, camera.x * 0.8, camera.y * 0.8 - t * 70, w, h, EMBERS, n, (e, x, y) => {
        if (e.hot !== hot) return;
        const sx = x + Math.sin(t * 1.3 + e.ph) * 12;
        ctx.moveTo(sx, y); ctx.lineTo(sx - e.len * 0.25, y - e.len);
        drawn.embers++;
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  /* The whole water for one place. Reduced motion freezes it into a still. */
  function paint(ctx, camera, p = PLACES[here] || PLACES.haven) {
    const z = camera.zoom || 1, w = ctx.canvas.width / z, h = ctx.canvas.height / z, t = still() ? 0 : performance.now() / 1000;
    drawWash(ctx, w, h, p);
    drawShafts(ctx, camera, w, h, p, t);
    drawMotes(ctx, camera, w, h, p, t, z);
    drawEmbers(ctx, camera, w, h, p, t);
    drawn.frames++;
  }

  /* ── sound: the bed, the calls, the crackle ─────────────────────────────── */
  function buildAmbience(se) {
    const c = se.ctx, sr = c.sampleRate, len = sr * 4, fade = Math.floor(sr * 0.25);
    /* Brown noise, 4 s, with an equal-power crossfade so the loop has no seam. */
    const raw = new Float32Array(len + fade);
    let last = 0;
    for (let i = 0; i < raw.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; raw[i] = last * 3.5; }
    const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    d.set(raw.subarray(0, len));
    for (let i = 0; i < fade; i++) { const a = (i / fade) * Math.PI / 2; d[i] = raw[i] * Math.sin(a) + raw[len + i] * Math.cos(a); }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 0.7;
    const swell = c.createGain(); swell.gain.value = 0.65;
    const lfo = c.createOscillator(), depth = c.createGain(); lfo.frequency.value = 0.06; depth.gain.value = 0.35;
    lfo.connect(depth); depth.connect(swell.gain);
    const bed = c.createGain(); bed.gain.value = 0;
    src.connect(lp); lp.connect(swell); swell.connect(bed); bed.connect(se.musicBus);
    const hum = c.createGain(), h1 = c.createOscillator(), h2 = c.createOscillator();
    hum.gain.value = 0; h1.frequency.value = 55; h2.type = 'triangle'; h2.frequency.value = 55.6;
    h1.connect(hum); h2.connect(hum); hum.connect(bed);
    /* Calls and crackle get their own fader under musicBus, with a dark echo. */
    const calls = c.createGain(), echo = c.createDelay(1.5), fb = c.createGain(), dark = c.createBiquadFilter();
    echo.delayTime.value = 0.42; fb.gain.value = 0.42; dark.type = 'lowpass'; dark.frequency.value = 900;
    echo.connect(dark); dark.connect(fb); fb.connect(echo); dark.connect(calls); calls.connect(se.musicBus);
    src.start(); lfo.start(); h1.start(); h2.start();
    se.ambience = { src, lp, lfo, bed, hum, calls, echo, buf, key: '' };
  }
  function retune(se) {
    const A = se.ambience, p = PLACES[here], now = se.ctx.currentTime;
    A.key = here;
    A.lp.frequency.setTargetAtTime(p.cutoff, now, 1.2);
    A.lfo.frequency.setTargetAtTime(p.swell, now, 2);
    A.bed.gain.setTargetAtTime(document.hidden ? 0 : p.level, now, 1.5);
    A.hum.gain.setTargetAtTime(p.hum ? 0.18 : 0, now, 2);
  }
  /* A distant call: a slow sine (triangle when deep, so phone speakers carry it) that rises, sags and echoes. */
  function call(se = soundEngine, deep = !!PLACES[here].deep) {
    if (!se || !se.ctx || !se.ambience) return false;
    const c = se.ctx, A = se.ambience, t = c.currentTime + 0.05;
    const f = (deep ? 85 : 180) * (0.85 + Math.random() * 0.3), dur = 2.6 + Math.random() * 1.8;
    const o = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), g = c.createGain();
    o.type = deep ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.4, t + dur * 0.35); o.frequency.exponentialRampToValueAtTime(f * 0.72, t + dur);
    vib.frequency.value = 4 + Math.random() * 2; vg.gain.value = f * 0.025; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(deep ? 0.05 : 0.035, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (c.createStereoPanner) { out = c.createStereoPanner(); out.pan.value = Math.random() * 1.6 - 0.8; g.connect(out); }
    o.connect(g); out.connect(A.calls); out.connect(A.echo);
    o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    o.onended = () => { o.disconnect(); vib.disconnect(); vg.disconnect(); g.disconnect(); if (out !== g) out.disconnect(); };
    drawn.calls++;
    return true;
  }
  function crackle(se) {
    const c = se.ctx, t = c.currentTime, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = se.noise || se.ambience.buf; bp.type = 'bandpass'; bp.frequency.value = 1600 + Math.random() * 2800; bp.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.01 + Math.random() * 0.02, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(bp); bp.connect(g); g.connect(se.ambience.calls);
    s.start(t, Math.random() * 0.8, 0.07);
    s.onended = () => { s.disconnect(); bp.disconnect(); g.disconnect(); };
  }

  /* ── the per-frame tick: place, edge pulse, bed ─────────────────────────── */
  let edge = null, edgeO = -1, beatAt = -1e9, ticks = 0, nextCall = performance.now() + 9000;
  function tick() {
    const now = performance.now(), E = typeof engine !== 'undefined' ? engine : null;
    if (ticks++ % 15 === 0) here = placeKey();
    const P = E && E.player, frac = P && !P.dead && P.maxHp ? P.hp / P.maxHp : 1;
    let o = 0;
    if (frac < LOW_HULL && (!hasLook() || look.cfg.atmosphere !== false)) {
      const k = 0.4 + 0.6 * (1 - Math.max(0, frac) / LOW_HULL), since = now - beatAt;
      const pulse = still() ? 0.2 : since >= 0 && since < 2000 ? Math.exp(-since / 180) : Math.pow(Math.max(0, Math.sin(now * 0.0069)), 8);
      o = k * (0.45 + 0.55 * pulse);
    }
    if (edge && (Math.abs(o - edgeO) > 0.015 || (o === 0 && edgeO !== 0))) { edge.style.opacity = o.toFixed(3); edgeO = o; }
    const se = typeof soundEngine !== 'undefined' ? soundEngine : null;
    if (!se || !se.ctx || !se.musicBus) return;
    if (!se.ambience) buildAmbience(se);
    if (se.ambience.key !== here) retune(se);
    const p = PLACES[here];
    if (se.muted || document.hidden || (E && (E.paused || E.mapOpen))) return;
    if (p.calls && now > nextCall) { nextCall = now + 18000 + Math.random() * 24000; call(se, !!p.deep); }
    if (p.crackle && Math.random() < 0.06) crackle(se);
  }

  function install() {
    if (hasLook() && !('atmosphere' in look.cfg)) look.cfg.atmosphere = true;
    if (typeof fluidShader !== 'undefined' && fluidShader) {
      const baseOcean = fluidShader.drawParallaxOcean.bind(fluidShader);
      fluidShader.drawParallaxOcean = (ctx, camera) => {
        const r = baseOcean(ctx, camera);
        if (hasLook() && look.cfg.atmosphere && !packActive()) paint(ctx, camera);
        return r;
      };
    }
    if (typeof SoundEngine !== 'undefined') {
      /* The edge pulse lands on the heartbeat the audio clock actually scheduled. */
      const baseVoice = SoundEngine.prototype.voice;
      SoundEngine.prototype.voice = function (kind, position = null, when = null) {
        if (kind === 'heartbeat' && this.ctx) beatAt = performance.now() + Math.max(0, ((when ?? this.ctx.currentTime) - this.ctx.currentTime) * 1000);
        return baseVoice.call(this, kind, position, when);
      };
    }
    edge = document.createElement('div'); edge.id = 'atmo-edge'; edge.setAttribute('aria-hidden', 'true');
    const lit = document.getElementById('lighting-canvas');
    if (lit) lit.after(edge); else document.body.append(edge);
    document.addEventListener('visibilitychange', () => {
      const se = typeof soundEngine !== 'undefined' ? soundEngine : null;
      if (se && se.ambience) se.ambience.bed.gain.setTargetAtTime(document.hidden ? 0 : PLACES[here].level, se.ctx.currentTime, 0.3);
    });
    if (typeof engine !== 'undefined' && engine) {
      const baseUpdate = engine.update.bind(engine);
      engine.update = (...a) => { const r = baseUpdate(...a); tick(); return r; };
    }
  }

  window.atmosphere = { PLACES, LOW_HULL, placeKey, paint, tick, call, get here() { return here; }, get drawn() { return drawn; }, get edge() { return edge; } };
  if (typeof engine !== 'undefined' && engine) install(); else window.addEventListener('load', install);
})();
