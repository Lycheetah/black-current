// Hull Forge: a standalone blueprint builder. Pick a hull, shape it with sliders, drag hardpoint
// nodes on the live model, preview turrets, and export sovereign.hull/1 JSON the game loads.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createFleetCatalog } from '../data/ships/catalog.js';
import { RACE_ORDER, PLAYER_CLASS_ORDER, RACE_CATALOG } from '../data/ships/races.js';
import { CLASS_CATALOG, BANK_IDS, BANK_LABELS } from '../data/ships/classes.js';
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { blueprintFor } from '../ships/registry.js';
import { cloneBlueprint, validateBlueprint, hullProfile, nodeLocal, groupForNode } from '../ships/blueprint.js';
import { createMaterials, ACCENTS } from '../render/materials.js';
import { createSky } from '../render/sky.js';
import { createCameraRig } from '../render/camera.js';
import { buildShipMesh, animateShipMesh } from '../render/ship-mesh.js';

const FLEET = createFleetCatalog();
const $ = (s) => document.querySelector(s);

// --- Renderer: the game's materials and lighting in a studio frame. ---
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
const M = createMaterials(renderer);
const sunDir = new THREE.Vector3(-0.3, 0.45, -0.85).normalize();
const sky = createSky(sunDir);
scene.add(sky.mesh);
{
  const env = new THREE.Scene();
  const s2 = createSky(sunDir); s2.mesh.scale.setScalar(100); env.add(s2.mesh);
  const card = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.45).multiplyScalar(6) }));
  card.position.copy(sunDir).multiplyScalar(80); env.add(card);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
  scene.environmentIntensity = 0.9;
}
const key = new THREE.DirectionalLight(0xffd6a8, 3.2); key.position.copy(sunDir).multiplyScalar(100); scene.add(key);
const rim = new THREE.DirectionalLight(0x8a7cff, 1.4); rim.position.set(0.5, 0.3, 0.8).multiplyScalar(100); scene.add(rim);
const camFill = new THREE.DirectionalLight(0xbcd6ff, 0.7); scene.add(camFill, camFill.target);
scene.add(new THREE.HemisphereLight(0x3a4a66, 0x120a10, 0.6));
const rig = createCameraRig(innerWidth / innerHeight);
rig.yaw = 0.8; rig.pitch = 0.45;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, rig.camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.85));
composer.addPass(new OutputPass());
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  rig.camera.aspect = innerWidth / innerHeight; rig.camera.updateProjectionMatrix();
});

// Orbit: drag on empty space, wheel or pinch to zoom.
{
  let drag = null; const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) rig.zoom(pinch / d); pinch = d; return; }
    if (!drag) return; rig.orbit(e.clientX - drag.x, e.clientY - drag.y); drag = { x: e.clientX, y: e.clientY };
  });
  const up = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) drag = null; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
}

// --- State ---
let bp = null, previewFit = {}, mesh = null, selected = null, dirty = true, baseId = 'savanah_starter';

const CONTROLS = [
  ['HULL', [['length', 'Length m', 8, 400, 0.5], ['hull.exp', 'Section edge', 2, 7, 0.1], ['hull.nose', 'Nose length', 0.12, 0.6, 0.01],
    ['hull.width', 'Beam', 0.08, 0.4, 0.005], ['hull.height', 'Deck height', 0.02, 0.15, 0.002], ['hull.keel', 'Keel depth', 0.02, 0.15, 0.002],
    ['hull.waist', 'Waist pinch', 0, 0.5, 0.01], ['hull.droop', 'Nose droop', -0.6, 1, 0.02], ['hull.tailTaper', 'Tail taper', 0, 0.6, 0.01]]],
  ['CARAPACE', [['carapace.on', 'On'], ['carapace.from', 'From', 0, 0.6, 0.01], ['carapace.to', 'To', 0.5, 1, 0.01], ['carapace.width', 'Width', 0.3, 1.1, 0.01], ['carapace.height', 'Height', 0.1, 1.2, 0.01]]],
  ['KEEL BLADE', [['keelBlade.on', 'On'], ['keelBlade.length', 'Length', 0.2, 0.9, 0.01], ['keelBlade.depth', 'Depth', 0.2, 3, 0.05]]],
  ['SUPERSTRUCTURE', [['superstructure.at', 'Position', 0.3, 0.9, 0.01], ['superstructure.length', 'Length', 0.08, 0.45, 0.01], ['superstructure.height', 'Height', 0.3, 4, 0.05], ['superstructure.width', 'Width', 0.1, 0.5, 0.01], ['superstructure.mast', 'Mast', 0, 4, 0.05]]],
  ['PROW SPIRE', [['spire.on', 'On'], ['spire.at', 'Position', 0.1, 0.6, 0.01], ['spire.height', 'Height', 0.5, 6, 0.1]]],
  ['SPONSONS', [['sponsons.on', 'On'], ['sponsons.length', 'Length', 0.2, 0.7, 0.01], ['sponsons.width', 'Width', 0.1, 0.6, 0.01], ['sponsons.at', 'Mount', 0.5, 0.9, 0.01]]],
  ['DRIVES', [['engines.main', 'Main nozzles (0 auto)', 0, 6, 1], ['engines.scale', 'Nozzle scale', 0.4, 1.6, 0.02]]],
  ['FINISH', [['colors.tint', 'Accent tint', 0, 0.4, 0.01]]],
];
const get = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v; };

function renderControls() {
  const host = $('[data-controls]');
  host.innerHTML = CONTROLS.map(([title, fields]) => `<div class="f-group"><h4>${title}</h4>${fields.map(([path, label, min, max, step]) => {
    const v = get(bp, path);
    if (min === undefined) return `<div class="f-slider"><label>${label}</label><input type="checkbox" data-path="${path}" ${v ? 'checked' : ''}><output></output></div>`;
    return `<div class="f-slider"><label>${label}</label><input type="range" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${v}</output></div>`;
  }).join('')}</div>`).join('') + `<div class="f-group"><h4>FINS <button data-add-fin>+ PAIR</button></h4>${bp.fins.map((f, i) => `
    <div class="f-slider"><label>Pair ${i + 1} at</label><input type="range" data-fin="${i}.at" min="0.2" max="0.95" step="0.01" value="${f.at}"><output>${f.at}</output></div>
    <div class="f-slider"><label>Span</label><input type="range" data-fin="${i}.span" min="0.2" max="2.5" step="0.02" value="${f.span}"><output>${f.span}</output></div>
    <div class="f-slider"><label>Angle</label><input type="range" data-fin="${i}.angle" min="-1.2" max="1.2" step="0.02" value="${f.angle}"><output>${f.angle}</output></div>
    <div class="f-slider"><label>Lift</label><input type="range" data-fin="${i}.lift" min="0" max="1.5" step="0.02" value="${f.lift ?? 0}"><output><button data-del-fin="${i}">✕</button></output></div>`).join('')}</div>`;
}

$('[data-controls]').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.path) { set(bp, t.dataset.path, t.type === 'checkbox' ? t.checked : Number(t.value)); if (t.nextElementSibling && t.type !== 'checkbox') t.nextElementSibling.textContent = t.value; }
  if (t.dataset.fin) { const [i, k] = t.dataset.fin.split('.'); bp.fins[i][k] = Number(t.value); if (t.nextElementSibling && k !== 'lift') t.nextElementSibling.textContent = t.value; }
  changed(false);
});
$('[data-controls]').addEventListener('click', (e) => {
  if (e.target.matches('[data-add-fin]')) { bp.fins.push({ at: 0.6, span: 0.8, angle: -0.1, lift: 0 }); changed(true); }
  if (e.target.dataset.delFin != null) { bp.fins.splice(Number(e.target.dataset.delFin), 1); changed(true); }
});

function renderNodes() {
  $('[data-nodes]').innerHTML = bp.nodes.map((n) => `<div class="f-node${n.bank === selected ? ' sel' : ''}" data-node="${n.bank}">
    <b>${BANK_LABELS[n.bank] || n.bank}</b>
    <select data-preview="${n.bank}"><option value="">— no gun —</option>${Object.values(TURRET_CATALOG).map((w) => `<option value="${w.id}" ${previewFit[n.bank] === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}</select>
    <button data-del-node="${n.bank}">✕</button>
    <em>${groupForNode(n).toUpperCase()} GROUP · x ${n.x.toFixed(2)} · z ${n.z.toFixed(2)} · size <input type="range" min="0.5" max="2" step="0.05" value="${n.size}" data-size="${n.bank}" style="width:90px;vertical-align:middle"></em></div>`).join('');
}
$('[data-nodes]').addEventListener('change', (e) => { if (e.target.dataset.preview != null) { previewFit[e.target.dataset.preview] = e.target.value || undefined; changed(false); } });
$('[data-nodes]').addEventListener('input', (e) => { if (e.target.dataset.size) { bp.nodes.find((n) => n.bank === e.target.dataset.size).size = Number(e.target.value); changed(false); } });
$('[data-nodes]').addEventListener('click', (e) => {
  if (e.target.dataset.delNode) { bp.nodes = bp.nodes.filter((n) => n.bank !== e.target.dataset.delNode); delete previewFit[e.target.dataset.delNode]; changed(true); return; }
  const row = e.target.closest('[data-node]'); if (row && e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') { selected = row.dataset.node; renderNodes(); }
});
$('[data-add-node]').addEventListener('click', () => {
  const free = BANK_IDS.find((id) => !bp.nodes.some((n) => n.bank === id));
  if (!free) return;
  bp.nodes.push({ bank: free, x: 0, z: 0, size: 1 }); selected = free; changed(true);
});

// --- JSON in and out ---
const jsonEl = $('[data-json]'), validEl = $('[data-valid]');
const exportJson = () => JSON.stringify(bp, null, 2);
$('[data-copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(exportJson()); validEl.textContent = 'COPIED'; } catch { jsonEl.select(); validEl.textContent = 'SELECTED · COPY MANUALLY'; } });
$('[data-download]').addEventListener('click', () => {
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })); a.download = bp.id + '.json'; a.click(); }
  catch { validEl.textContent = 'DOWNLOAD BLOCKED · USE COPY'; }
});
$('[data-apply]').addEventListener('click', () => {
  try { bp = validateBlueprint(JSON.parse(jsonEl.value)); validEl.textContent = 'APPLIED'; validEl.className = 'ok'; changed(true); }
  catch (err) { validEl.textContent = err.message; validEl.className = 'bad'; }
});
$('[data-reset]').addEventListener('click', () => loadBase(baseId));
$('[data-name]').addEventListener('input', (e) => { bp.name = e.target.value; changed(false); });
$('[data-accent]').addEventListener('change', (e) => { bp.colors.accent = e.target.value; changed(false); });

// --- Hull picking ---
const raceSel = $('[data-race]'), classSel = $('[data-class]');
raceSel.innerHTML = RACE_ORDER.map((r) => `<option value="${r}">${RACE_CATALOG[r].name}</option>`).join('');
classSel.innerHTML = PLAYER_CLASS_ORDER.map((c) => `<option value="${c}">${CLASS_CATALOG[c].name}</option>`).join('');
$('[data-accent]').innerHTML = Object.keys(ACCENTS).map((a) => `<option>${a}</option>`).join('');
const pick = () => loadBase(raceSel.value + '_' + classSel.value);
raceSel.addEventListener('change', pick); classSel.addEventListener('change', pick);

function loadBase(id) {
  baseId = id;
  const hull = FLEET[id];
  bp = cloneBlueprint(blueprintFor(hull));
  previewFit = {};
  bp.nodes.forEach((n, i) => { previewFit[n.bank] = ['autocannon', 'beam_laser', 'plasma', 'railgun', 'missile', 'shard'][i % 6]; });
  selected = bp.nodes[0]?.bank ?? null;
  raceSel.value = hull.raceId; classSel.value = hull.classId;
  rig.fitHull(bp.length); rig.dist = rig.targetDist;
  changed(true);
}

function changed(structural) {
  dirty = true;
  if (structural) { renderControls(); }
  renderNodes();
  $('[data-name]').value = bp.name || '';
  $('[data-accent]').value = bp.colors.accent;
  jsonEl.value = exportJson();
  try { validateBlueprint(cloneBlueprint(bp)); validEl.textContent = 'VALID'; validEl.className = 'ok'; }
  catch (err) { validEl.textContent = err.message; validEl.className = 'bad'; }
}

// --- Node handles: drag across the deck. ---
const handles = $('[data-handles]');
let drag = null;
const ray = new THREE.Raycaster(), _v = new THREE.Vector3();
function pickDeck(sx, sy) {
  const P = hullProfile(bp);
  ray.setFromCamera(new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1), rig.camera);
  const o = ray.ray.origin, d = ray.ray.direction, py = P.deck(0.5);
  if (Math.abs(d.y) < 1e-4) return null;
  const t = (py - o.y) / d.y; if (t < 0) return null;
  const z = Math.max(-0.46, Math.min(0.46, (o.z + d.z * t) / P.L));
  return { x: Math.max(-1, Math.min(1, (o.x + d.x * t) / (P.width(z + 0.5) || 1))), z };
}
function syncHandles() {
  const P = hullProfile(bp);
  const live = new Set();
  for (const n of bp.nodes) {
    live.add(n.bank);
    let h = handles.querySelector(`[data-h="${n.bank}"]`);
    if (!h) {
      h = document.createElement('div'); h.className = 'f-h'; h.dataset.h = n.bank; h.innerHTML = '<i></i><span></span>';
      h.addEventListener('pointerdown', (e) => { e.preventDefault(); selected = n.bank; drag = { bank: n.bank, id: e.pointerId }; h.setPointerCapture(e.pointerId); renderNodes(); });
      h.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = pickDeck(e.clientX, e.clientY); if (!p) return;
        const node = bp.nodes.find((x) => x.bank === drag.bank); node.x = +p.x.toFixed(3); node.z = +p.z.toFixed(3);
        changed(false);
      });
      h.addEventListener('pointerup', () => { drag = null; });
      handles.appendChild(h);
    }
    const p = nodeLocal(bp, n, P);
    _v.set(p.x, p.y, p.z).project(rig.camera);
    h.style.display = _v.z > 1 ? 'none' : '';
    h.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px, ${(-_v.y * 0.5 + 0.5) * innerHeight}px)`;
    h.classList.toggle('sel', n.bank === selected);
    h.querySelector('span').textContent = n.bank.replace('WPN_', '') + ' · ' + groupForNode(n).toUpperCase();
  }
  for (const h of [...handles.children]) if (!live.has(h.dataset.h)) h.remove();
}

// --- Frame loop ---
let t = 0, last = performance.now();
const zero = new THREE.Vector3(), ident = new THREE.Quaternion();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  if (dirty) {
    dirty = false;
    if (mesh) scene.remove(mesh);
    try { mesh = buildShipMesh(bp, M, { fit: previewFit }); scene.add(mesh); } catch (err) { validEl.textContent = err.message; validEl.className = 'bad'; }
  }
  if (mesh) animateShipMesh(mesh, 0.55, 0.5, t);
  rig.update(zero, ident, dt);
  camFill.position.copy(rig.camera.position).add(new THREE.Vector3(0, rig.dist * 0.6, 0));
  sky.mesh.position.copy(rig.camera.position); sky.uniforms.uCenter.value.copy(rig.camera.position);
  composer.render();
  syncHandles();
  requestAnimationFrame(frame);
}
loadBase(new URLSearchParams(location.search).get('hull') || 'savanah_starter');
requestAnimationFrame(frame);
window.__FORGE = { get blueprint() { return bp; }, loadBase, rig };
