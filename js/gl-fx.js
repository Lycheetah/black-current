/* WEBGL EFFECTS (Route 4 stage 2; Mac, 2026-10-30: "how do we give sick graphics to this game"). Shots and particles
 * were hundreds of small Canvas draws a frame (a glow blit, a streak stroke and two arcs per bullet; an arc or a sprite
 * blit per particle). Here each one is a GPU quad whose shape is drawn by the fragment shader, batched into two draw
 * calls a frame on a transparent canvas just above the game canvas:
 *   additive pass  bullet glows and tracer streaks, flashes, rings, trails, spores, bubbles (as look.js composited them)
 *   solid pass     bullet cores, enemy-shot rims, the white-hot centres
 * look.js still decides what a shot or particle looks like; it hands the shapes here instead of drawing them, so the
 * look is the same and later stages (bloom, heat, lighting) have one place to grow. Anything this cannot draw keeps the
 * Canvas path: an art pack, look.cfg.bullets/additive off, no WebGL2, a software WebGL, or Settings → GPU effects off. */
(() => {
  'use strict';
  let gl = null, cv = null, ready = false, lost = false, software = false, prog = null, vao = null, inst = null, on = false, drew = false;
  const FLOATS = 12;   // x, y, hx, hy, angle, r, g, b, a, kind, param, blend
  let data = new Float32Array(FLOATS * 2048), n = 0;
  const stats = { frames: 0, instances: 0, peak: 0 };
  const KIND = { glow: 0, disc: 1, ring: 2, streak: 3, bubble: 4 };
  const packActive = () => typeof packRenderer !== 'undefined' && packRenderer && packRenderer.active;
  const wanted = () => window.menu?.settings?.().gfxGpuFx !== false;

  // any CSS colour → [r,g,b,a] 0..1, cached (shots and particles reuse a handful of colours)
  const colours = new Map(), probe = document.createElement('canvas').getContext('2d');
  function rgba(c) {
    let v = colours.get(c); if (v) return v;
    probe.fillStyle = '#000'; probe.fillStyle = c; const s = probe.fillStyle;
    if (s[0] === '#') { const k = parseInt(s.slice(1), 16); v = [(k >> 16) / 255, ((k >> 8) & 255) / 255, (k & 255) / 255, 1]; }
    else { const m = s.match(/[\d.]+/g) || [0, 0, 0, 1]; v = [m[0] / 255, m[1] / 255, m[2] / 255, m[3] === undefined ? 1 : +m[3]]; }
    if (colours.size > 256) colours.clear(); colours.set(c, v); return v;
  }
  const VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 posSize;   // x, y, hx, hy (screen px)
layout(location=2) in vec4 col;
layout(location=3) in vec4 extra;     // angle, kind, param, -
uniform vec2 res;
out vec2 q; out vec4 c; flat out float kind; out float param; out vec2 hsz;
void main(){
  float a = extra.x, ca = cos(a), sa = sin(a);
  vec2 l = corner * posSize.zw, p = posSize.xy + vec2(l.x * ca - l.y * sa, l.x * sa + l.y * ca);
  gl_Position = vec4(p / res * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y;
  q = corner; c = col; kind = extra.y; param = extra.z; hsz = posSize.zw;
}`;
  const FS = `#version 300 es
precision highp float;
in vec2 q; in vec4 c; flat in float kind; in float param; in vec2 hsz; out vec4 o;
void main(){
  float d = length(q), a = 0.0; vec3 rgb = c.rgb;
  if (kind < 0.5) {                       // glow: look.js's falloff (0 .9 · .25 .45 · .6 .12 · 1 0)
    a = d < 0.25 ? mix(0.9, 0.45, d / 0.25) : d < 0.6 ? mix(0.45, 0.12, (d - 0.25) / 0.35) : d < 1.0 ? mix(0.12, 0.0, (d - 0.6) / 0.4) : 0.0;
  } else if (kind < 1.5) {                // disc, antialiased
    float aa = 1.2 / max(hsz.x, 1.0); a = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  } else if (kind < 2.5) {                // ring: centre line at param (0..1 of the quad), hsz-thickness from the quad edge
    float h = 1.0 - param, aa = 1.0 / max(hsz.x, 1.0); a = 1.0 - smoothstep(h - aa, h + aa, abs(d - param));
  } else if (kind < 3.5) {                // streak: a capsule along x
    vec2 p = q * hsz; float L = hsz.x - hsz.y, dist = length(vec2(max(abs(p.x) - L, 0.0), p.y));
    a = 1.0 - smoothstep(hsz.y - 1.0, hsz.y, dist);
  } else {                                // bubble: highlight, body colour, dark rim, coloured edge
    float s = clamp(distance(q, vec2(-0.3)) / 1.3, 0.0, 1.0);
    vec4 hi = vec4(1.0, 1.0, 1.0, 0.9), body = vec4(rgb, 1.0), rim = vec4(0.0, 0.0, 0.0, 0.25);
    vec4 g = s < 0.5 ? mix(hi, body, s / 0.5) : mix(body, rim, (s - 0.5) / 0.5);
    float edge = 1.0 - smoothstep(0.0, 2.0 / max(hsz.x, 1.0), abs(d - 0.97));
    g = mix(g, body, edge); rgb = g.rgb; a = g.a * (1.0 - smoothstep(0.98, 1.0, d));
  }
  a *= c.a; o = vec4(rgb * a, a);
}`;
  function init() {
    cv = document.createElement('canvas'); cv.id = 'gl-fx'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;z-index:1;pointer-events:none';
    engine.canvas.after(cv);
    gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    try { const e = gl.getExtension('WEBGL_debug_renderer_info'); software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }, false);
    cv.addEventListener('webglcontextrestored', () => { lost = false; try { build(); } catch (e) { gl = null; } }, false);
    build(); return true;
  }
  function build() {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    prog = { p, res: gl.getUniformLocation(p, 'res') };
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const corners = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, corners); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    // packed instance: x y hx hy | angle kind param 0 | r g b a  → posSize @0, extra @16, col @32
    const B = FLOATS * 4;
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, B, 16); gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, 32); gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }
  /* Queue one shape in the 2D context's current world transform (so zoom and screen shake match the Canvas frame).
     x, y, hx, hy are in that context's units; blend 1 = additive, 0 = solid. */
  function push(ctx, kind, x, y, hx, hy, angle, colour, alpha, blend, param = 0) {
    const T = ctx.getTransform(), k = T.a;
    if (n * FLOATS + FLOATS > data.length) { const d = new Float32Array(data.length * 2); d.set(data); data = d; }
    const c = rgba(colour), o = n * FLOATS;
    data[o] = x * k + T.e; data[o + 1] = y * T.d + T.f; data[o + 2] = hx * k; data[o + 3] = hy * k; data[o + 4] = angle;
    data[o + 5] = c[0]; data[o + 6] = c[1]; data[o + 7] = c[2]; data[o + 8] = c[3] * alpha; data[o + 9] = kind; data[o + 10] = param; data[o + 11] = blend; n++;
  }
  // push() records x y hx hy angle r g b a kind param blend; flush() repacks into the shader's layout, additive first
  let packed = new Float32Array(FLOATS * 2048);
  function flush() {
    if (!drew && !n) return;
    const W = engine.canvas.width, H = engine.canvas.height;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    drew = n > 0;
    if (n) {
      if (packed.length < data.length) packed = new Float32Array(data.length);
      let w = 0; const add = [], solid = [];   // two passes, additive first
      for (let i = 0; i < n; i++) (data[i * FLOATS + 11] ? add : solid).push(i);
      for (const i of add.concat(solid)) {
        const s = i * FLOATS;
        packed[w] = data[s]; packed[w + 1] = data[s + 1]; packed[w + 2] = data[s + 2]; packed[w + 3] = data[s + 3];
        packed[w + 4] = data[s + 4]; packed[w + 5] = data[s + 9]; packed[w + 6] = data[s + 10]; packed[w + 7] = 0;
        packed[w + 8] = data[s + 5]; packed[w + 9] = data[s + 6]; packed[w + 10] = data[s + 7]; packed[w + 11] = data[s + 8];
        w += FLOATS;
      }
      gl.useProgram(prog.p); gl.uniform2f(prog.res, W, H); gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, inst); gl.bufferData(gl.ARRAY_BUFFER, packed.subarray(0, n * FLOATS), gl.STREAM_DRAW);
      gl.enable(gl.BLEND);
      if (add.length) { gl.blendFunc(gl.ONE, gl.ONE); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, add.length); }
      if (solid.length) {
        // instances are packed additive-first; draw the solid run from its offset
        const B = FLOATS * 4, base = add.length * B;
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, base); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, B, base + 16); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, base + 32);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, solid.length);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, 0); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, B, 16); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, 32);
      }
      gl.bindVertexArray(null);
      stats.instances = n; stats.peak = Math.max(stats.peak, n);
    }
    stats.frames++; n = 0;
  }
  function install() {
    if (typeof engine === 'undefined' || !engine.canvas || !window.look || !window.saveState) { setTimeout(install, 50); return; }
    try { ready = init(); } catch (e) { console.warn('[gl-fx] off:', e); gl = null; ready = false; }
    if (!ready) return;
    const render = engine.render; engine.render = function (...a) {
      on = !!gl && !lost && wanted() && (!software || api.allowSoftware) && !packActive();
      cv.style.display = on ? 'block' : 'none'; n = 0;
      const r = render.apply(this, a);
      if (on) try { flush(); } catch (e) { on = false; cv.style.display = 'none'; console.warn('[gl-fx]', e); }
      return r;
    };
  }
  const api = window.glFx = { push, KIND, stats, allowSoftware: false, get on() { return on; }, get ready() { return ready && !!gl && !lost; }, get software() { return software; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
