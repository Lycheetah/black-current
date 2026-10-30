/* WEBGL BACKDROP (Route 4 stage 1; Mac, 2026-10-30: "fps is insanely bad … how do we give sick graphics to this game").
 * The far backdrop was the biggest fixed cost of a Canvas frame: a full-screen gradient, a nebula, the place wash and
 * light shafts repainted into a cache 12 times a second and blitted every frame, plus three tiled dust layers. Here they
 * are drawn by the GPU on a canvas under the game canvas, every frame, at full rate:
 *   pass 1  one full-screen quad: ground gradient + nebula (parallax 0.06) + the place's wash + the dark floor
 *   pass 2  light shafts as additive geometry (same five swaying fans as atmosphere.js)
 *   pass 3  dust and current streaks (source-over), flecks (additive): repeating textures, parallax 0.35 / 0.7
 * The 2D canvas then starts each frame transparent and draws only what moves (motes, embers, ships, shots).
 * The look is the Canvas look: same tiles (look.tiles), same colours, same parallax. Anything this does not draw (an art
 * pack, the guardian arena art, the backdrop switched off, no WebGL2) returns false and the Canvas path runs instead.
 * Settings → Graphics → GPU backdrop (on by default) switches it off. */
(() => {
  'use strict';
  let gl = null, cv = null, ready = false, lost = false, shown = false, software = false;
  let far = null, tiled = null, shaft = null, quad = null, shaftBuf = null;
  const tex = new Map();
  const stats = { frames: 0, uploads: 0, fallbacks: 0 };
  const SHAFTS = [[0.08, 1.0, 0.0], [0.27, 1.6, 1.7], [0.46, 0.8, 3.1], [0.63, 1.3, 4.4], [0.84, 1.1, 5.6]];
  const packActive = () => typeof packRenderer !== 'undefined' && packRenderer && packRenderer.active;
  const wanted = () => window.menu?.settings?.().gfxGpu !== false;
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  const VS = `#version 300 es
in vec2 a; out vec2 v; uniform vec2 res;
void main(){ v = a; gl_Position = vec4(a / res * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y; }`;
  // a = screen pixels (top-left origin); v = the same, for the fragment shaders
  const FAR = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform vec2 res, nOff; uniform float z, nebOn, washOn, wash; uniform vec3 tint; uniform sampler2D neb;
vec3 ground(vec2 p){ vec2 d = vec2(res.x * 0.3, res.y); float t = clamp(dot(p, d) / dot(d, d), 0.0, 1.0);
  vec3 a = vec3(6.,18.,36.)/255., b = vec3(3.,10.,22.)/255., c = vec3(2.,5.,12.)/255.;
  return t < 0.55 ? mix(a, b, t / 0.55) : mix(b, c, (t - 0.55) / 0.45); }
void main(){
  vec2 p = v; vec3 col = ground(p);
  if (nebOn > 0.5) { vec4 n = texture(neb, (p / (2.0 * z) + nOff) / 1024.0); col = n.rgb + col * (1.0 - n.a); }
  if (washOn > 0.5) {
    vec2 c = vec2(res.x * 0.5, -res.y * 0.2); float s = length(p - c) / (max(res.x, res.y) * 1.15);
    float a = s < 0.6 ? mix(wash, wash * 0.35, s / 0.6) : s < 1.0 ? mix(wash * 0.35, 0.0, (s - 0.6) / 0.4) : 0.0;
    col = mix(col, tint, a);
    float f = clamp((p.y - res.y * 0.45) / (res.y * 0.55), 0.0, 1.0) * 0.32;
    col = mix(col, vec3(0., 2., 8.) / 255., f);
  }
  o = vec4(col, 1.0);
}`;
  const TILED = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform vec2 off; uniform float scale, T; uniform sampler2D t;
void main(){ o = texture(t, (v / scale + off) / T); }`;
  const SHAFT_VS = `#version 300 es
in vec3 a; out float k; uniform vec2 res;
void main(){ k = a.z; gl_Position = vec4(a.xy / res * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y; }`;
  const SHAFT_FS = `#version 300 es
precision highp float; in float k; out vec4 o; uniform vec3 pale; uniform float alpha;
void main(){ float g = k < 0.45 ? mix(1.0, 0.4, k / 0.45) : mix(0.4, 0.0, (k - 0.45) / 0.55); float a = g * alpha; o = vec4(pale * a, a); }`;

  function program(vs, fs, attrib) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, attrib); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  // a canvas as a repeating, premultiplied texture; re-uploaded only when the source canvas changes
  function texture(key, canvas) {
    let t = tex.get(key);
    if (t && t.src === canvas && t.w === canvas.width) return t.t;
    if (!t) { t = { t: gl.createTexture() }; tex.set(key, t); }
    gl.bindTexture(gl.TEXTURE_2D, t.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    Object.assign(t, { src: canvas, w: canvas.width }); stats.uploads++; return t.t;
  }
  function init() {
    cv = document.createElement('canvas'); cv.id = 'gl-backdrop'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;z-index:0;pointer-events:none';
    engine.canvas.before(cv);
    gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return false;
    /* A software WebGL (SwiftShader, llvmpipe, Microsoft Basic Render: a machine with no usable GPU) runs the GPU's work on
       the CPU and can be slower than Canvas, so it keeps the Canvas path unless glBackdrop.allowSoftware is set. */
    try { const e = gl.getExtension('WEBGL_debug_renderer_info'); software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }, false);
    cv.addEventListener('webglcontextrestored', () => { lost = false; tex.clear(); try { build(); } catch (e) { gl = null; } }, false);
    build(); return true;
  }
  function build() {
    far = program(VS, FAR, 'a'); tiled = program(VS, TILED, 'a'); shaft = program(SHAFT_VS, SHAFT_FS, 'a');
    quad = gl.createBuffer(); shaftBuf = gl.createBuffer();
  }
  function fullscreen(W, H) {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, W, 0, 0, H, 0, H, W, 0, W, H]), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function show(on) { if (on !== shown) { shown = on; cv.style.display = on ? 'block' : 'none'; } }

  /* Draws the whole far + near backdrop for this frame. Returns true when it did (the caller then skips the Canvas
     backdrop), false when the Canvas path must run. */
  function draw(camera) {
    if (!ready || !gl || lost || !wanted() || software && !api.allowSoftware || !look.cfg.backdrop || packActive() || window.bossScenes?.active || !look.tiles?.nebula) { stats.fallbacks++; if (cv) show(false); return false; }
    const W = engine.canvas.width, H = engine.canvas.height, z = camera.zoom || 1;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
    // pass 1 · ground, nebula, wash
    const atmo = window.atmosphere, P = atmo?.PLACES?.[atmo.here] || atmo?.PLACES?.haven, washOn = !!(P && look.cfg.atmosphere);
    gl.useProgram(far.p); const u = far.u;
    gl.uniform2f(u.res, W, H); gl.uniform1f(u.z, z);
    gl.uniform2f(u.nOff, Math.round(camera.x * 0.06), Math.round(camera.y * 0.06));
    gl.uniform1f(u.nebOn, look.cfg.nebula ? 1 : 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture('nebula', look.tiles.nebula)); gl.uniform1i(u.neb, 0);
    gl.uniform1f(u.washOn, washOn ? 1 : 0); gl.uniform1f(u.wash, P?.wash || 0); gl.uniform3fv(u.tint, rgb(P?.tint || '#000000'));
    fullscreen(W, H);
    gl.enable(gl.BLEND);
    // pass 2 · light shafts (additive), in screen pixels: the Canvas path draws them in world units under scale(z)
    if (washOn && P.shafts) {
      const w = W / z, h = H / z, t = document.body.classList.contains('reduced-motion') ? 0 : performance.now() / 1000, span = w * 1.5, slide = camera.x * 0.12, L = h * 1.35;
      gl.useProgram(shaft.p); gl.uniform2f(shaft.u.res, W, H); gl.uniform3fv(shaft.u.pale, rgb(P.pale)); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, shaftBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      for (const [fx, ws, ph] of SHAFTS) {
        const x = (((fx * span - slide) % span) + span) % span - w * 0.25, sw = 90 + 70 * ws, a0 = P.shafts * (0.55 + 0.45 * Math.sin(t * 0.21 + ph));
        const r = 0.22 + Math.sin(t * 0.13 + ph) * 0.04, c = Math.cos(r), s = Math.sin(r), ox = x, oy = -h * 0.08;
        const pt = (lx, ly) => [(ox + lx * c - ly * s) * z, (oy + lx * s + ly * c) * z];
        const verts = [];
        for (const k of [1, 0.62, 0.3]) {
          const [ax, ay] = pt(-sw * 0.16 * k, 0), [bx, by] = pt(sw * 0.16 * k, 0), [cx, cy] = pt(sw / 2 * k, L), [dx, dy] = pt(-sw / 2 * k, L);
          verts.push(ax, ay, 0, bx, by, 0, cx, cy, 1, ax, ay, 0, cx, cy, 1, dx, dy, 1);
        }
        gl.uniform1f(shaft.u.alpha, a0 * 0.34); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW); gl.drawArrays(gl.TRIANGLES, 0, 18);
      }
    }
    // pass 3 · near fields, tiles painted at a zoom bucket so points stay crisp
    if (look.cfg.dust) {
      const px = Math.pow(1.08, Math.round(Math.log(z) / Math.log(1.08)));
      gl.useProgram(tiled.p); gl.uniform2f(tiled.u.res, W, H); gl.uniform1f(tiled.u.scale, z); gl.uniform1i(tiled.u.t, 0);
      for (const [kind, T, par, add] of [['dust', 1200, 0.35, false], ['streaks', 1400, 0.7, false], ['flecks', 1400, 0.7, true]]) {
        gl.bindTexture(gl.TEXTURE_2D, texture(kind, look.tiles.field(kind, T, px)));
        gl.uniform1f(tiled.u.T, T); gl.uniform2f(tiled.u.off, camera.x * par, camera.y * par);
        gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); fullscreen(W, H);
      }
    }
    stats.frames++; show(true); return true;
  }
  function install() {
    if (typeof engine === 'undefined' || !engine.canvas || !window.look || !window.saveState) { setTimeout(install, 50); return; }
    try { ready = init(); } catch (e) { console.warn('[gl-backdrop] off:', e); gl = null; ready = false; }
  }
  const api = window.glBackdrop = { draw, stats, allowSoftware: false, get ready() { return ready && !!gl && !lost; }, get software() { return software; }, get active() { return shown; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
