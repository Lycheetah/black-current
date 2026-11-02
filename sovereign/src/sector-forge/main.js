// Sector Forge: edit sector files (sovereign.sector/1) on a plan and a side view, with an inspector,
// live checks, undo and redo. Edits save in this browser; PLAY IN GAME opens the game with them.
// Export gives the JSON to put in src/data/sectors/ so the edit ships with the game.
import { SECTOR_FILES } from '../world/sectors.js';
import { SECTOR_SCHEMA, BUILDS, KINDS, STAR_KINDS, sectorProblems } from '../world/sector-schema.js';
import { WORLD } from '../core/scale.js';

const $ = (s) => document.querySelector(s);
const STORE = 'sovereign.forge.sectors', PLAY_FLAG = 'sovereign.forge.play';
const IDS = Object.keys(SECTOR_FILES);
const clone = (o) => JSON.parse(JSON.stringify(o));
const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
const store = (all) => { try { localStorage.setItem(STORE, JSON.stringify(all)); } catch {} };

// ---- state ----------------------------------------------------------------------------------------
let saved = load();
let sectorId = IDS[0];
let doc = clone(saved[sectorId] || SECTOR_FILES[sectorId]);
let sel = { type: 'sector' };
let view = 'top';
let undo = [], redo = [];
const cam = { x: 0, y: 0, k: 0.01 };   // world metres → px: screen = (w - cam) * k + centre

function commit(before) {
  undo.push(before); redo = [];
  if (undo.length > 100) undo.shift();
  saved[sectorId] = doc; store(saved);
  render();
}
const snapshot = () => JSON.stringify(doc);
function change(fn) { const b = snapshot(); fn(doc); commit(b); }

// ---- canvas: plan (x,z) and side (x,y) views -----------------------------------------------------
const canvas = $('[data-canvas]'), ctx = canvas.getContext('2d');
const axes = () => (view === 'top' ? ['x', 'z'] : ['x', 'y']);
function size() {
  const dpr = Math.min(2, devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
function toScreen(p, w, h) {
  const [a, b] = axes();
  return { x: w / 2 + (p[a] - cam.x) * cam.k, y: h / 2 + (view === 'top' ? 1 : -1) * (p[b] - cam.y) * cam.k };
}
function toWorld(sx, sy, w, h) {
  const [a, b] = axes();
  return { [a]: cam.x + (sx - w / 2) / cam.k, [b]: cam.y + (view === 'top' ? 1 : -1) * (sy - h / 2) / cam.k };
}
function fit() {
  const pts = [...doc.landmarks.map((l) => l.pos), ...(doc.belts || []).map((b) => b.center)];
  const [a, b] = axes();
  const mn = (k) => Math.min(...pts.map((p) => p[k])), mx = (k) => Math.max(...pts.map((p) => p[k]));
  cam.x = (mn(a) + mx(a)) / 2; cam.y = (mn(b) + mx(b)) / 2;
  const { w, h } = size();
  cam.k = Math.min(w / (mx(a) - mn(a) + 8000), h / (mx(b) - mn(b) + 8000));
}
const KIND_COL = { station: '#ffc56b', gate: '#65f5ff', site: '#e07bff', wreck: '#ff9a5a', beacon: '#9fe8ff' };

function draw() {
  const { w, h } = size();
  ctx.clearRect(0, 0, w, h);
  // Grid: 1 km lines, 5 km stronger.
  const step = 1000 * cam.k;
  if (step > 6) {
    const o = toScreen({ x: 0, y: 0, z: 0 }, w, h);
    for (let i = Math.floor(-o.x / step); i * step + o.x < w; i++) {
      ctx.strokeStyle = i % 5 ? 'rgba(101,245,255,.05)' : 'rgba(101,245,255,.12)';
      ctx.beginPath(); ctx.moveTo(o.x + i * step, 0); ctx.lineTo(o.x + i * step, h); ctx.stroke();
    }
    for (let i = Math.floor(-o.y / step); i * step + o.y < h; i++) {
      ctx.strokeStyle = i % 5 ? 'rgba(101,245,255,.05)' : 'rgba(101,245,255,.12)';
      ctx.beginPath(); ctx.moveTo(0, o.y + i * step); ctx.lineTo(w, o.y + i * step); ctx.stroke();
    }
  }
  ctx.font = '11px sans-serif';
  // Star.
  const st = doc.star, sp = toScreen(st.pos, w, h);
  ctx.fillStyle = st.kind === 'cold' ? 'rgba(191,230,255,.25)' : 'rgba(30,10,40,.6)';
  ctx.strokeStyle = sel.type === 'star' ? '#fff' : st.kind === 'cold' ? '#bfe6ff' : '#ffb35a';
  ctx.lineWidth = sel.type === 'star' ? 2.5 : 1.5;
  ctx.beginPath(); ctx.arc(sp.x, sp.y, Math.max(8, st.radius * cam.k), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd9a0'; ctx.fillText('★ ' + st.name.toUpperCase(), sp.x + 10, sp.y - 10);
  // Belts.
  for (const [i, b] of (doc.belts || []).entries()) {
    const p = toScreen(b.center, w, h), r = Math.max(6, b.spread * 0.5 * cam.k);
    ctx.setLineDash([4, 5]); ctx.strokeStyle = sel.type === 'belt' && sel.i === i ? '#fff' : 'rgba(200,170,130,.7)'; ctx.lineWidth = sel.type === 'belt' && sel.i === i ? 2 : 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 14; k++) { const a = k * 2.4, d = r * (0.2 + 0.75 * ((k * 37) % 10) / 10); ctx.fillStyle = 'rgba(200,170,130,.6)'; ctx.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 2, 2); }
    ctx.fillStyle = 'rgba(220,190,150,.9)'; ctx.fillText((b.id || 'belt').toUpperCase() + ` · ${b.count} rocks`, p.x + r + 4, p.y);
  }
  // Gate routes.
  for (const [gid, g] of Object.entries(doc.gates || {})) {
    const lm = doc.landmarks.find((l) => l.id === gid); if (!lm) continue;
    const p = toScreen(lm.pos, w, h);
    ctx.fillStyle = '#65f5ff'; ctx.fillText(`→ ${(SECTOR_FILES[g.to]?.name || g.to)}${g.requires ? ' (sealed until ' + g.requires + ')' : ''}`, p.x + 14, p.y + 16);
  }
  // Landmarks.
  for (const [i, lm] of doc.landmarks.entries()) {
    const p = toScreen(lm.pos, w, h), r = Math.max(5, lm.radius * cam.k), on = sel.type === 'lm' && sel.i === i;
    ctx.strokeStyle = on ? '#fff' : KIND_COL[lm.kind] || '#65f5ff'; ctx.lineWidth = on ? 2.5 : 1.3;
    ctx.beginPath();
    if (lm.kind === 'gate') { ctx.moveTo(p.x, p.y - r - 3); ctx.lineTo(p.x + r + 3, p.y); ctx.lineTo(p.x, p.y + r + 3); ctx.lineTo(p.x - r - 3, p.y); ctx.closePath(); }
    else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (lm.solid) { ctx.fillStyle = 'rgba(255,197,107,.12)'; ctx.fill(); }
    if (lm.id === doc.home) {
      const l = toScreen({ x: lm.pos.x + doc.launch.offset.x, y: lm.pos.y + doc.launch.offset.y, z: lm.pos.z + doc.launch.offset.z }, w, h);
      ctx.strokeStyle = 'rgba(109,255,160,.7)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(l.x, l.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#6dffa0'; ctx.fillText('UNDOCK', l.x + 5, l.y);
    }
    ctx.fillStyle = on ? '#fff' : KIND_COL[lm.kind] || '#65f5ff';
    ctx.fillText(lm.name.toUpperCase(), p.x + r + 6, p.y + 4);
  }
  // Scale bar.
  ctx.strokeStyle = '#65f5ff'; ctx.lineWidth = 1;
  const km = cam.k * 1000 > 40 ? 1 : cam.k * 5000 > 40 ? 5 : 20;
  ctx.beginPath(); ctx.moveTo(20, h - 20); ctx.lineTo(20 + km * 1000 * cam.k, h - 20); ctx.stroke();
  ctx.fillStyle = '#65f5ff'; ctx.fillText(`${km} km`, 20, h - 26);
  ctx.fillText(view === 'top' ? 'TOP VIEW · x across, z forward' : 'SIDE VIEW · x across, y up', 20, 20);
}

// Picking and dragging.
function pick(sx, sy) {
  const { w, h } = size();
  let best = null, bd = 14;
  doc.landmarks.forEach((lm, i) => { const p = toScreen(lm.pos, w, h); const d = Math.hypot(p.x - sx, p.y - sy) - Math.max(0, lm.radius * cam.k - 6); if (d < bd) { bd = d; best = { type: 'lm', i }; } });
  (doc.belts || []).forEach((b, i) => { const p = toScreen(b.center, w, h); const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd) { bd = d; best = { type: 'belt', i }; } });
  const sp = toScreen(doc.star.pos, w, h);
  if (!best && Math.hypot(sp.x - sx, sp.y - sy) < Math.max(12, doc.star.radius * cam.k)) best = { type: 'star' };
  return best;
}
const posOf = (s) => (s.type === 'lm' ? doc.landmarks[s.i].pos : s.type === 'belt' ? doc.belts[s.i].center : s.type === 'star' ? doc.star.pos : null);
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  const hit = e.button === 0 ? pick(sx, sy) : null;
  canvas.setPointerCapture(e.pointerId);
  if (hit) { sel = hit; drag = { kind: 'move', before: snapshot(), moved: false }; renderPanels(); }
  else drag = { kind: 'pan', x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
  draw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect(), { w, h } = size();
  if (drag.kind === 'pan') {
    cam.x = drag.cx - (e.clientX - drag.x) / cam.k;
    cam.y = drag.cy - (view === 'top' ? 1 : -1) * (e.clientY - drag.y) / cam.k;
  } else {
    const p = posOf(sel), wp = toWorld(e.clientX - r.left, e.clientY - r.top, w, h);
    const snap = e.shiftKey ? 1 : 100;
    for (const k of Object.keys(wp)) p[k] = Math.round(wp[k] / snap) * snap;
    drag.moved = true;
    renderInspector();
  }
  draw();
});
canvas.addEventListener('pointerup', () => { if (drag?.kind === 'move' && drag.moved) commit(drag.before); drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), { w, h } = size();
  const before = toWorld(e.clientX - r.left, e.clientY - r.top, w, h);
  cam.k = Math.min(0.5, Math.max(0.0005, cam.k * Math.exp(-e.deltaY * 0.0015)));
  const after = toWorld(e.clientX - r.left, e.clientY - r.top, w, h);
  const [a, b] = axes();
  cam.x += before[a] - after[a]; cam.y += before[b] - after[b];
  draw();
}, { passive: false });

// ---- inspector -------------------------------------------------------------------------------------
const hexOf = (rgb) => '#' + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const rgbOf = (hex) => [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
const F = (label, type, get, set, extra = {}) => ({ label, type, get, set, ...extra });
const xyz = (getP, label = 'Position') => ['x', 'y', 'z'].map((k) => F(`${label} ${k} (m)`, 'num', () => getP()[k], (v) => { getP()[k] = v; }));

function fields() {
  if (sel.type === 'lm') {
    const lm = doc.landmarks[sel.i];
    const out = [
      F('Name', 'text', () => lm.name, (v) => { lm.name = v; }),
      F('Id', 'text', () => lm.id, (v) => { const old = lm.id; lm.id = v; if (doc.home === old) doc.home = v; if (doc.gates?.[old]) { doc.gates[v] = doc.gates[old]; delete doc.gates[old]; } }),
      F('Kind', 'sel', () => lm.kind, (v) => { lm.kind = v; }, { options: KINDS.map((k) => [k, k]) }),
      F('Scenery', 'sel', () => lm.build, (v) => { lm.build = v; }, { options: Object.entries(BUILDS) }),
      ...xyz(() => lm.pos),
      F('Radius (m)', 'num', () => lm.radius, (v) => { lm.radius = v; }),
      F('Solid (ships cannot fly through)', 'chk', () => !!lm.solid, (v) => { if (v) lm.solid = true; else delete lm.solid; }),
    ];
    if (lm.build === 'beacon') {
      out.push(F('Light colour', 'color', () => lm.opts?.color || '#ffc56b', (v) => { lm.opts = { ...lm.opts, color: v }; }));
      out.push(F('Light size (m)', 'num', () => lm.opts?.size ?? 60 * WORLD, (v) => { lm.opts = { ...lm.opts, size: v }; }));
    }
    if (lm.build === 'pillar_gate') {
      out.push(F('Facing (radians)', 'num', () => lm.opts?.yaw ?? 0.5, (v) => { lm.opts = { ...lm.opts, yaw: v }; }, { step: 0.05 }));
      out.push(F('Inner glow', 'color', () => lm.opts?.inner || '#4de6ff', (v) => { lm.opts = { ...lm.opts, inner: v }; }));
      out.push(F('Outer glow', 'color', () => lm.opts?.outer || '#bf8cff', (v) => { lm.opts = { ...lm.opts, outer: v }; }));
      out.push(F('Looks sealed', 'chk', () => !!lm.opts?.sealed, (v) => { lm.opts = { ...lm.opts, sealed: v }; }));
    }
    if (lm.build === 'asterion') out.push(F('Bastion fins instead of a ring', 'chk', () => !!lm.opts?.bastion, (v) => { lm.opts = { ...lm.opts, bastion: v }; }));
    if (lm.kind === 'gate') {
      const g = () => doc.gates?.[lm.id];
      out.push(F('Gate leads to', 'sel', () => g()?.to || '', (v) => { doc.gates = { ...(doc.gates || {}) }; if (!v) delete doc.gates[lm.id]; else doc.gates[lm.id] = { ...(g() || {}), to: v, arrive: g()?.arrive || 'gate' }; }, { options: [['', '(nowhere)'], ...IDS.filter((i) => i !== doc.id).map((i) => [i, SECTOR_FILES[i].name])] }));
      if (g()) {
        out.push(F('Arrive beside (landmark id there)', 'text', () => g().arrive, (v) => { g().arrive = v; }));
        out.push(F('Sealed until operation done', 'text', () => g().requires || '', (v) => { if (v) g().requires = v; else delete g().requires; }));
      }
      out.push(F('Overview note', 'text', () => lm.leadsTo || '', (v) => { if (v) lm.leadsTo = v; else delete lm.leadsTo; }));
    }
    return out;
  }
  if (sel.type === 'belt') {
    const b = doc.belts[sel.i];
    return [
      F('Name', 'text', () => b.id || '', (v) => { b.id = v; }),
      ...xyz(() => b.center, 'Centre'),
      F('Rocks', 'num', () => b.count, (v) => { b.count = Math.round(v); }),
      F('Spread (m)', 'num', () => b.spread, (v) => { b.spread = v; }),
      F('Smallest rock (m)', 'num', () => b.size[0], (v) => { b.size = [v, b.size[1]]; }),
      F('Largest rock (m)', 'num', () => b.size[1], (v) => { b.size = [b.size[0], v]; }),
      F('Shape seed', 'num', () => b.seed ?? 1, (v) => { b.seed = Math.round(v); }),
    ];
  }
  if (sel.type === 'star') {
    const st = doc.star;
    return [
      F('Name', 'text', () => st.name, (v) => { st.name = v; }),
      F('Kind', 'sel', () => st.kind, (v) => { st.kind = v; }, { options: Object.entries(STAR_KINDS) }),
      ...xyz(() => st.pos),
      F('Radius (m)', 'num', () => st.radius, (v) => { st.radius = v; }),
      F('Colour (cold star)', 'color', () => st.color || '#bfe6ff', (v) => { st.color = v; }),
    ];
  }
  // The sector itself: name, security, home, sky.
  return [
    F('Sector name', 'text', () => doc.name, (v) => { doc.name = v; }),
    F('Station name', 'text', () => doc.stationName || '', (v) => { doc.stationName = v; }),
    F('Description', 'area', () => doc.desc || '', (v) => { doc.desc = v; }),
    F('Security (0 lawless … 1 safe)', 'num', () => doc.security.level, (v) => { doc.security.level = Math.max(0, Math.min(1, v)); }, { step: 0.1 }),
    F('Security label', 'text', () => doc.security.label, (v) => { doc.security.label = v; }),
    F('Home station', 'sel', () => doc.home, (v) => { doc.home = v; }, { options: doc.landmarks.filter((l) => l.kind === 'station').map((l) => [l.id, l.name]) }),
    ...xyz(() => doc.launch.offset, 'Undock offset'),
    F('Sky colour A (teal)', 'color', () => hexOf(doc.sky.a), (v) => { doc.sky.a = rgbOf(v); }),
    F('Sky colour B (violet)', 'color', () => hexOf(doc.sky.b), (v) => { doc.sky.b = rgbOf(v); }),
    F('Sky warm (near the star)', 'color', () => hexOf(doc.sky.warm), (v) => { doc.sky.warm = rgbOf(v); }),
    F('Drill drones near the station', 'chk', () => !!doc.drill, (v) => { doc.drill = v; }),
  ];
}

function renderInspector() {
  const title = sel.type === 'lm' ? doc.landmarks[sel.i].name : sel.type === 'belt' ? (doc.belts[sel.i].id || 'Asteroid belt') : sel.type === 'star' ? 'Star' : 'Sector · ' + doc.name;
  $('[data-insp-title]').textContent = title.toUpperCase();
  const fs = fields();
  const box = $('[data-inspector]');
  box.innerHTML = fs.map((f, i) => {
    const v = f.get();
    let input;
    if (f.type === 'sel') input = `<select data-f="${i}">${f.options.map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    else if (f.type === 'chk') input = `<input type="checkbox" data-f="${i}"${v ? ' checked' : ''}>`;
    else if (f.type === 'area') input = `<textarea data-f="${i}" rows="3">${v}</textarea>`;
    else input = `<input data-f="${i}" type="${f.type === 'num' ? 'number' : f.type === 'color' ? 'color' : 'text'}" ${f.step ? `step="${f.step}"` : ''} value="${String(v).replace(/"/g, '&quot;')}">`;
    return `<label class="sf-f${f.type === 'chk' ? ' chk' : ''}"><span>${f.label}</span>${input}</label>`;
  }).join('') + (sel.type === 'lm' || sel.type === 'belt' ? `<div class="sf-acts"><button data-dup>DUPLICATE</button><button data-del class="bad">DELETE</button></div>` : '');
  box.onchange = (e) => {
    const i = e.target.dataset.f; if (i == null) return;
    const f = fs[i];
    const v = f.type === 'num' ? Number(e.target.value) : f.type === 'chk' ? e.target.checked : e.target.value;
    if (f.type === 'num' && !Number.isFinite(v)) return;
    change(() => f.set(v));
  };
}

function renderList() {
  const row = (s, label, sub) => `<div class="sf-item${sel.type === s.type && sel.i === s.i ? ' on' : ''}" data-sel='${JSON.stringify(s)}'><b>${label}</b><small>${sub}</small></div>`;
  $('[data-list]').innerHTML = row({ type: 'sector' }, 'Sector', `${doc.name} · ${doc.security.level.toFixed(1)} ${doc.security.label}`)
    + row({ type: 'star' }, '★ ' + doc.star.name, STAR_KINDS[doc.star.kind] || doc.star.kind)
    + doc.landmarks.map((l, i) => row({ type: 'lm', i }, l.name, `${l.kind} · ${BUILDS[l.build] || l.build}${l.id === doc.home ? ' · HOME' : ''}`)).join('')
    + (doc.belts || []).map((b, i) => row({ type: 'belt', i }, '◌ ' + (b.id || 'belt'), `${b.count} rocks · ${(b.spread / 1000).toFixed(1)} km`)).join('');
}

function renderChecks() {
  const probs = sectorProblems(doc, IDS);
  $('[data-checks]').innerHTML = probs.length ? probs.map((p) => `<div class="bad">✕ ${p}</div>`).join('') : '<div class="ok">✓ Valid. The game will load this sector.</div>';
  $('[data-play]').disabled = probs.length > 0;
}
function renderPanels() { renderList(); renderInspector(); renderChecks(); }
function render() { renderPanels(); draw(); $('[data-hint]').textContent = saved[sectorId] ? 'Edited · saved in this browser' : 'Built-in sector · edits save in this browser'; }

// ---- toolbar -------------------------------------------------------------------------------------
$('[data-sector]').innerHTML = IDS.map((id) => `<option value="${id}">${SECTOR_FILES[id].name}</option>`).join('');
$('[data-sector]').onchange = (e) => { sectorId = e.target.value; doc = clone(saved[sectorId] || SECTOR_FILES[sectorId]); sel = { type: 'sector' }; undo = []; redo = []; fit(); render(); };
document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b)); fit(); draw(); });
$('[data-list]').onclick = (e) => { const it = e.target.closest('[data-sel]'); if (it) { sel = JSON.parse(it.dataset.sel); renderPanels(); draw(); } };
$('[data-add-build]').innerHTML = Object.entries(BUILDS).filter(([k]) => k !== 'none').map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
$('[data-add-landmark]').onclick = () => {
  const build = $('[data-add-build]').value;
  const kind = { asterion: 'station', pillar_gate: 'gate', breach: 'site', wreckfield: 'wreck', beacon: 'beacon' }[build] || 'site';
  change((d) => {
    let n = 1; while (d.landmarks.some((l) => l.id === build + n)) n++;
    d.landmarks.push({ id: build + n, name: `${BUILDS[build]} ${n}`, kind, pos: { x: Math.round(cam.x), y: 0, z: Math.round(cam.y) }, radius: 120 * WORLD, build });
    sel = { type: 'lm', i: d.landmarks.length - 1 };
  });
};
$('[data-add-belt]').onclick = () => change((d) => {
  d.belts = d.belts || [];
  d.belts.push({ id: 'belt' + (d.belts.length + 1), center: { x: Math.round(cam.x), y: 0, z: Math.round(cam.y) }, count: 150, spread: 800 * WORLD, size: [3 * WORLD, 40 * WORLD], seed: d.belts.length + 41, kind: 'rock' });
  sel = { type: 'belt', i: d.belts.length - 1 };
});
$('[data-inspector]').addEventListener('click', (e) => {
  if (e.target.closest('[data-del]')) {
    change((d) => { if (sel.type === 'lm') { const id = d.landmarks[sel.i].id; d.landmarks.splice(sel.i, 1); if (d.gates) delete d.gates[id]; } else d.belts.splice(sel.i, 1); sel = { type: 'sector' }; });
  } else if (e.target.closest('[data-dup]')) {
    change((d) => {
      if (sel.type === 'lm') { const c = clone(d.landmarks[sel.i]); c.id += '_copy'; c.name += ' copy'; c.pos.x += 2000; d.landmarks.push(c); sel = { type: 'lm', i: d.landmarks.length - 1 }; }
      else { const c = clone(d.belts[sel.i]); c.id = (c.id || 'belt') + '_copy'; c.center.x += 3000; d.belts.push(c); sel = { type: 'belt', i: d.belts.length - 1 }; }
    });
  }
});
function doUndo() { if (!undo.length) return; redo.push(snapshot()); doc = JSON.parse(undo.pop()); saved[sectorId] = doc; store(saved); sel = { type: 'sector' }; render(); }
function doRedo() { if (!redo.length) return; undo.push(snapshot()); doc = JSON.parse(redo.pop()); saved[sectorId] = doc; store(saved); render(); }
$('[data-undo]').onclick = doUndo; $('[data-redo]').onclick = doRedo;
addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
  if (e.key === 'Delete' && (sel.type === 'lm' || sel.type === 'belt')) $('[data-inspector] [data-del]')?.click();
});
$('[data-revert]').onclick = () => {
  if (!confirm(`Throw away your edits to ${SECTOR_FILES[sectorId].name} and go back to the built-in sector?`)) return;
  delete saved[sectorId]; store(saved); doc = clone(SECTOR_FILES[sectorId]); undo = []; redo = []; sel = { type: 'sector' }; render();
};
// Play: the game reads the edits when opened with ?forge (or within ten minutes of pressing PLAY).
const gamePage = /\/dist\/|^file:/.test(location.href) || location.port ? 'sovereign-eclipse.html' : 'index.html';
$('[data-back]').onclick = () => { location.href = gamePage; };
$('[data-play]').onclick = () => {
  saved[sectorId] = doc; store(saved);
  try { localStorage.setItem(PLAY_FLAG, String(Date.now())); } catch {}
  location.href = gamePage + '?forge';
};

// Export / import.
const modal = $('[data-modal]'), text = $('[data-modal-text]');
function openModal(title, note, value, apply) {
  $('[data-modal-title]').textContent = title; $('[data-modal-note]').textContent = note;
  text.value = value; modal.hidden = false;
  $('[data-modal-ok]').hidden = !apply;
  $('[data-modal-ok]').onclick = () => { try { const d = JSON.parse(text.value); if (d.schema !== SECTOR_SCHEMA) throw new Error('not a sector file'); const b = snapshot(); doc = d; sectorId = IDS.includes(d.id) ? d.id : sectorId; $('[data-sector]').value = sectorId; commit(b); fit(); render(); modal.hidden = true; } catch (err) { $('[data-modal-note]').textContent = 'Could not read that: ' + err.message; } };
}
$('[data-export]').onclick = () => openModal('EXPORT · ' + doc.name, `Copy this into src/data/sectors/${doc.id}.json to ship it with the game.`, JSON.stringify(doc, null, 2) + '\n', null);
$('[data-import]').onclick = () => openModal('IMPORT A SECTOR FILE', 'Paste a sovereign.sector/1 file and press APPLY.', '', true);
$('[data-modal-close]').onclick = () => { modal.hidden = true; };
$('[data-modal-copy]').onclick = async () => { text.select(); try { await navigator.clipboard.writeText(text.value); $('[data-modal-note]').textContent = 'Copied.'; } catch { document.execCommand?.('copy'); $('[data-modal-note]').textContent = 'Selected: press Ctrl+C to copy.'; } };

addEventListener('resize', draw);
fit(); render();
window.__SF = { get doc() { return doc; }, get sel() { return sel; } };
