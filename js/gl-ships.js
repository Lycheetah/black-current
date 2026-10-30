/* WEBGL SHIPS (Route 4 stage 3, "2.5D ships"; Mac, 2026-10-30: "I want the game's ships maybe 2.5D").
 * Hulls move onto the GPU, where each one is lit as a solid object instead of a flat painting:
 *   relief   the shader reads depth from the hull's own shape (its edges bevel) and plating (bright plates stand proud),
 *            so today's art gets a sculpted look; Cael's normal maps can replace the derived relief later
 *   light    one sun fixed across the sector, so a turning ship's lit side changes as it turns, plus a metal glint
 *   shadow   a soft shadow cast onto the space and terrain below, offset away from the sun
 *   bank     a ship rolls into its turns: the hull narrows and its light shifts toward the outside of the turn
 * To sit between the world and what is drawn over ships, a frame now draws in two 2D layers:
 *   #game-under   backdrop extras, terrain, salvage drops (everything below the hulls)
 *   #gl-ships     the hulls (this file)
 *   #game-canvas  everything drawn after the drops: labels, rings, gas over ships, the player, HUD marks
 * The switch happens right after progression.drawDrops, the last thing drawn under ships. Faction hulls (hostile-skins)
 * come first; the player's own hull and modular ships follow. The Canvas path runs whenever this is off: Settings →
 * Graphics → GPU ships, an art pack, no WebGL2 or a software WebGL. */
(() => {
  'use strict';
  let gl = null, cv = null, under = null, uctx = null, top = null, ready = false, lost = false, software = false;
  let on = false, switched = false, passing = false, ship = null, shade = null, vao = null;
  const queue = [], tex = new WeakMap();
  let spin = new WeakMap();   // per hull: last angle and current bank
  const stats = { frames: 0, ships: 0, uploads: 0 };
  // the sun: from the upper left, fairly high (x right, y down, z toward the viewer)
  const SUN = (() => { const v = [-0.55, -0.65, 0.55], l = Math.hypot(...v); return v.map(c => c / l); })();
  const packActive = () => typeof packRenderer !== 'undefined' && packRenderer && packRenderer.active;
  const wanted = () => window.menu?.settings?.().gfxGpuShips !== false;
  const VS = `#version 300 es
layout(location=0) in vec2 corner;            // 0..1 over the sprite
uniform vec2 res, pos, size, anchor, shift; uniform float ang, bank;
out vec2 uv;
void main(){
  uv = corner; vec2 l = (corner - anchor) * size; l.y *= cos(bank);   // a banking hull narrows across its beam
  float c = cos(ang), s = sin(ang); vec2 p = pos + vec2(l.x * c - l.y * s, l.x * s + l.y * c) + shift;
  gl_Position = vec4(p / res * 2.0 - 1.0, 0.0, 1.0); gl_Position.y = -gl_Position.y;
}`;
  const SHIP = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D t; uniform vec2 texel; uniform vec3 sun; uniform float bank, relief;
float height(vec2 p){ vec4 c = texture(t, p); float lum = dot(c.rgb, vec3(.3, .59, .11)) / max(c.a, 1e-3); return c.a * (0.8 + 0.35 * lum); }
void main(){
  vec4 c = texture(t, uv); if (c.a < 0.004) discard;
  vec2 d = texel * 2.0;
  float hx = height(uv + vec2(d.x, 0.0)) - height(uv - vec2(d.x, 0.0)), hy = height(uv + vec2(0.0, d.y)) - height(uv - vec2(0.0, d.y));
  vec3 n = normalize(vec3(-hx * relief, -hy * relief, 1.0));
  float cb = cos(bank), sb = sin(bank); n = vec3(n.x, n.y * cb - n.z * sb, n.y * sb + n.z * cb);   // roll with the bank
  float diff = max(dot(n, sun), 0.0); vec3 h = normalize(sun + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, h), 0.0), 28.0);
  // key light, a cool rim on the edges that face away from the sun, and a metal glint
  float rim = pow(1.0 - n.z, 2.0) * max(0.0, -dot(n.xy, normalize(sun.xy))) * 0.35;
  vec3 rgb = c.rgb * (0.42 + 0.95 * diff) + vec3(0.55, 0.75, 1.0) * rim * c.a + vec3(0.9, 0.95, 1.0) * spec * 0.7 * c.a;
  o = vec4(rgb, c.a);
}`;
  const SHADE = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 texel; uniform float strength;
void main(){ vec2 d = texel * 3.0; float a = (texture(t, uv).a * 2.0 + texture(t, uv + vec2(d.x, 0.0)).a + texture(t, uv - vec2(d.x, 0.0)).a + texture(t, uv + vec2(0.0, d.y)).a + texture(t, uv - vec2(0.0, d.y)).a) / 6.0;
  o = vec4(0.0, 0.0, 0.0, a * strength); }`;
  function program(fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'corner'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  function canvas(id, z) { const c = document.createElement('canvas'); c.id = id; c.setAttribute('aria-hidden', 'true'); c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:none;z-index:${z};pointer-events:none`; return c; }
  function init() {
    // DOM order inside z-index 0: gl-backdrop, game-under, gl-ships (the game canvas and gl-fx sit at z-index 1)
    under = canvas('game-under', 0); cv = canvas('gl-ships', 0);
    (document.getElementById('gl-backdrop') || engine.canvas).after(under); under.after(cv);
    uctx = under.getContext('2d');
    gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    try { const e = gl.getExtension('WEBGL_debug_renderer_info'); software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }, false);
    cv.addEventListener('webglcontextrestored', () => { lost = false; try { build(); } catch (e) { gl = null; } }, false);
    build(); return true;
  }
  function build() {
    ship = program(SHIP); shade = program(SHADE);
    vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  }
  function texture(key, canvas, signature) {
    let t = tex.get(key);
    if (t && t.sig === signature && t.w === canvas.width && t.h === canvas.height) return t.t;
    if (!t) { t = { t: gl.createTexture() }; tex.set(key, t); }
    gl.bindTexture(gl.TEXTURE_2D, t.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    Object.assign(t, { sig: signature, w: canvas.width, h: canvas.height }); stats.uploads++; return t.t;
  }
  /* A hull to draw this frame, in the 2D context's current world transform (zoom and screen shake match).
     key: a stable object for this hull; canvas: its unrotated sprite (+x = forward); signature: changes when it repaints. */
  function push(ctx, key, canvas, signature, x, y, angle, W, H, ax, ay) {
    // only hulls of the main world pass: the phone lens and other inset views draw their own copies in 2D
    if (!on || !passing || ctx !== top || !canvas?.width) return false;
    const T = ctx.getTransform(), k = Math.hypot(T.a, T.b);
    if (Math.abs(k - (engine.camera.zoom || 1)) > 1e-3) return false;
    let sp = spin.get(key); if (!sp) { sp = { a: angle, bank: 0 }; spin.set(key, sp); }
    let da = angle - sp.a; da = Math.atan2(Math.sin(da), Math.cos(da)); sp.a = angle;
    sp.bank += (Math.max(-0.38, Math.min(0.38, da * 9)) - sp.bank) * 0.12;
    queue.push({ key, canvas, signature, x: x * T.a + T.e, y: y * T.d + T.f, angle, w: W * k, h: H * k, ax, ay, bank: sp.bank });
    return true;
  }
  function flush() {
    const W = engine.canvas.width, H = engine.canvas.height;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!queue.length) return;
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindVertexArray(vao); gl.activeTexture(gl.TEXTURE0);
    const items = queue.map(q => ({ q, t: texture(q.key, q.canvas, q.signature) }));
    const common = (prog, q) => { const u = prog.u; gl.uniform2f(u.res, W, H); gl.uniform2f(u.pos, q.x, q.y); gl.uniform2f(u.size, q.w, q.h); gl.uniform2f(u.anchor, q.ax, q.ay); gl.uniform1f(u.ang, q.angle); gl.uniform1f(u.bank, q.bank); gl.uniform2f(u.texel, 1 / q.canvas.width, 1 / q.canvas.height); gl.uniform1i(u.t, 0); };
    // shadows first, cast away from the sun onto whatever lies below
    gl.useProgram(shade.p);
    for (const { q, t } of items) { const off = Math.max(6, Math.min(60, Math.min(q.w, q.h) * 0.2)); common(shade, q); gl.uniform2f(shade.u.shift, -SUN[0] * off, -SUN[1] * off); gl.uniform1f(shade.u.strength, 0.62); gl.bindTexture(gl.TEXTURE_2D, t); gl.drawArrays(gl.TRIANGLES, 0, 6); }
    gl.useProgram(ship.p);
    for (const { q, t } of items) {
      common(ship, q); gl.uniform2f(ship.u.shift, 0, 0);
      // the sun in the sprite's own frame: rotate the world direction by −angle
      const c = Math.cos(q.angle), s = Math.sin(q.angle);
      gl.uniform3f(ship.u.sun, SUN[0] * c + SUN[1] * s, -SUN[0] * s + SUN[1] * c, SUN[2]); gl.uniform1f(ship.u.relief, 4.5);
      gl.bindTexture(gl.TEXTURE_2D, t); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.bindVertexArray(null); stats.ships = queue.length; stats.frames++;
  }
  function switchNow() {
    if (!on || switched) return;
    const T = uctx.getTransform(); top.save(); top.setTransform(T); engine.ctx = top; switched = true; passing = true;
  }
  function install() {
    if (typeof engine === 'undefined' || !engine.canvas || typeof progression === 'undefined' || !window.saveState) { setTimeout(install, 50); return; }
    try { ready = init(); } catch (e) { console.warn('[gl-ships] off:', e); gl = null; ready = false; }
    if (!ready) return;
    top = engine.ctx;
    const render = engine.render; engine.render = function (...a) {
      on = !!gl && !lost && wanted() && (!software || api.allowSoftware) && !packActive();
      under.style.display = cv.style.display = on ? 'block' : 'none';
      queue.length = 0; switched = false;
      if (!on) return render.apply(this, a);
      if (under.width !== engine.canvas.width || under.height !== engine.canvas.height) { under.width = engine.canvas.width; under.height = engine.canvas.height; }
      top.save(); top.setTransform(1, 0, 0, 1, 0, 0); top.clearRect(0, 0, top.canvas.width, top.canvas.height); top.restore();
      this.ctx = uctx;
      try { return render.apply(this, a); }
      finally {
        if (switched) uctx.restore();   // the world pass saved on the under layer and restored on the top one
        passing = false;
        this.ctx = top;
        try { flush(); } catch (e) { on = false; console.warn('[gl-ships]', e); }
      }
    };
    const drops = progression.drawDrops; progression.drawDrops = function (ctx, ...a) { const r = drops.call(this, ctx, ...a); if (ctx === uctx) switchNow(); return r; };
  }
  const api = window.glShips = { push, stats, SUN, allowSoftware: false, settle() { spin = new WeakMap(); }, get on() { return on; }, get ready() { return ready && !!gl && !lost; }, get software() { return software; }, get under() { return under; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
