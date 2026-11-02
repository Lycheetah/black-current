// Maps: a full-screen panel with two views. Reads the world; picks go back as actions.
//  - Sector map: top-down plan of the current sector. Landmarks, gates and their routes, your ship and
//    heading, hostiles, wrecks, signatures (uncertain ones as rings), the operation site. Pick a
//    landmark, then APPROACH or ZJ JUMP. Wheel zooms, drag pans.
//  - Universe map: sectors, gate routes, security, operation state, where you are.
import { SECTORS, UNIVERSE } from '../world/sectors.js';
import { getPlayer } from '../sim/world.js';
import { dist3 } from '../core/math.js';
import { jobPoint, jobTypeInfo, jobStatus } from '../sim/jobs.js';

const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
const KIND_COLOR = { station: '#ffc56b', gate: '#65f5ff', site: '#e07bff', beacon: '#65f5ff', wreck: '#ff9a5a', anomaly: '#b79cff' };
const secColor = (l) => (l >= 0.5 ? '#65f5ff' : l >= 0.2 ? '#ffc56b' : '#ff5a5a');

export function createMap(root, world, act) {
  root.innerHTML = `<div class="map-top"><button data-map-view="sector" class="on">SECTOR</button><button data-map-view="universe">UNIVERSE</button>
    <span class="map-title" data-map-title></span><button class="map-x" data-map-close>CLOSE [B]</button></div>
    <canvas data-map-canvas></canvas>
    <div class="map-card" data-map-card></div>
    <div class="map-legend">Wheel zoom · drag pan · click a landmark · <b>[B]</b> close</div>`;
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const card = root.querySelector('[data-map-card]'), titleEl = root.querySelector('[data-map-title]');
  let view = 'sector', open = false, selected = null, zoom = 1, pan = { x: 0, y: 0 }, drag = null, hits = [], cardKey = '';

  root.addEventListener('click', (e) => {
    const v = e.target.closest('[data-map-view]');
    if (v) { view = v.dataset.mapView; for (const b of root.querySelectorAll('[data-map-view]')) b.classList.toggle('on', b === v); selected = null; cardKey = ''; return; }
    if (e.target.closest('[data-map-close]')) { api.toggle(false); return; }
    const a = e.target.closest('[data-map-act]');
    if (a && selected) {
      const kind = a.dataset.mapAct;
      if (kind === 'approach') act({ type: 'navLandmark', id: selected });
      else if (kind === 'zj') act({ type: 'mapJump', id: selected });
      else if (kind === 'sig') act({ type: 'atlasSelect', id: selected.slice(4) });
      api.toggle(false);
    }
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(8, Math.max(0.5, zoom * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (view === 'sector') { pan.x += dx; pan.y += dy; }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = drag; drag = null;
    if (!was || was.moved > 6) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 22;
    for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h; } }
    selected = best ? best.id : null;
    cardKey = '';
  });

  function size() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function drawSector(w, h) {
    const S = world.sector, p = getPlayer(world);
    const pts = Object.values(S.landmarks).map((l) => l.pos);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const q of pts) { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minZ = Math.min(minZ, q.z); maxZ = Math.max(maxZ, q.z); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const k = Math.min(w / (maxX - minX + 1600), h / (maxZ - minZ + 1600)) * zoom;
    const X = (x) => w / 2 + (x - cx) * k + pan.x, Y = (z) => h / 2 + (z - cz) * k + pan.y;
    hits = [];
    // Range rings around the ship.
    ctx.strokeStyle = 'rgba(101,245,255,.08)'; ctx.lineWidth = 1;
    for (const r of [1000, 2500, 5000, 10000]) { ctx.beginPath(); ctx.arc(X(p.pos.x), Y(p.pos.z), r * k, 0, Math.PI * 2); ctx.stroke(); }
    // Grid.
    ctx.strokeStyle = 'rgba(101,245,255,.05)';
    const step = 1000 * k;
    if (step > 12) {
      for (let x = ((X(0) % step) + step) % step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = ((Y(0) % step) + step) % step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    // Gate routes: a dashed line from each gate out to the map edge, toward its destination.
    ctx.setLineDash([6, 6]);
    for (const [gid, g] of Object.entries(S.gates || {})) {
      const lm = S.landmarks[gid]; if (!lm) continue;
      const gx = X(lm.pos.x), gy = Y(lm.pos.z), dx = gx - w / 2, dy = gy - h / 2, d = Math.hypot(dx, dy) || 1;
      const ex = gx + (dx / d) * 120, ey = gy + (dy / d) * 120;
      ctx.strokeStyle = 'rgba(101,245,255,.5)'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#65f5ff'; ctx.font = '10px sans-serif'; ctx.fillText('→ ' + SECTORS[g.to].name, Math.min(w - 130, Math.max(8, ex + 4)), Math.min(h - 40, Math.max(16, ey)));
    }
    ctx.setLineDash([]);
    // Line to nav target.
    const navLm = typeof p.nav.targetId === 'string' ? S.landmarks[p.nav.targetId] : null;
    if (navLm) { ctx.strokeStyle = 'rgba(255,197,107,.6)'; ctx.beginPath(); ctx.moveTo(X(p.pos.x), Y(p.pos.z)); ctx.lineTo(X(navLm.pos.x), Y(navLm.pos.z)); ctx.stroke(); }
    // Landmarks.
    ctx.font = '11px sans-serif';
    for (const [id, lm] of Object.entries(S.landmarks)) {
      const x = X(lm.pos.x), y = Y(lm.pos.z), c = KIND_COLOR[lm.kind] || '#65f5ff';
      const r = Math.max(4, lm.radius * k);
      ctx.strokeStyle = c; ctx.lineWidth = id === selected ? 2.5 : 1.2;
      ctx.beginPath();
      if (lm.kind === 'gate') { ctx.moveTo(x, y - r - 3); ctx.lineTo(x + r + 3, y); ctx.lineTo(x, y + r + 3); ctx.lineTo(x - r - 3, y); ctx.closePath(); }
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (id === world.op.target && world.op.stage !== 'complete') { ctx.strokeStyle = 'rgba(255,90,90,.8)'; ctx.beginPath(); ctx.arc(x, y, r + 8 + Math.sin(performance.now() / 300) * 2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = id === selected ? '#fff' : c;
      ctx.fillText(lm.name.toUpperCase(), x + r + 6, y + 4);
      hits.push({ id, x, y });
    }
    // Signatures in this sector.
    for (const s of Object.values(world.atlas.sigs)) {
      if (s.stage === 'hidden' || (s.sector && s.sector !== S.id)) continue;
      const c = s.stage === 'detected' ? s.center : s.pos, x = X(c.x), y = Y(c.z);
      ctx.strokeStyle = s.stage === 'resolved' ? 'rgba(255,197,107,.3)' : 'rgba(255,197,107,.8)';
      ctx.setLineDash(s.stage === 'detected' ? [3, 4] : []);
      ctx.beginPath(); ctx.arc(x, y, s.stage === 'detected' ? Math.max(6, s.radius * k) : 5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,197,107,.9)'; ctx.fillText(s.def.code, x + 8, y - 6);
      hits.push({ id: 'sig:' + s.id, x, y });
    }
    // Wrecks.
    for (const wk of world.wrecks) {
      if (wk.sector !== S.id) continue;
      const x = X(wk.pos.x), y = Y(wk.pos.z);
      ctx.strokeStyle = wk.looted ? 'rgba(255,154,90,.3)' : '#ff9a5a'; ctx.lineWidth = 1;
      ctx.strokeRect(x - 3, y - 3, 6, 6);
    }
    // Active jobs here: gold squares with their names.
    for (const j of world.jobs.active) {
      const pt = jobPoint(world, 'job:' + j.id);
      if (!pt) continue;
      const x = X(pt.pos.x), y = Y(pt.pos.z), on = selected === 'job:' + j.id;
      ctx.strokeStyle = '#ffc56b'; ctx.lineWidth = on ? 2.5 : 1.5;
      ctx.strokeRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = '#ffc56b'; ctx.fillText(jobTypeInfo(j.type).icon + ' ' + j.title.toUpperCase(), x + 10, y + 4);
      hits.push({ id: 'job:' + j.id, x, y });
    }
    // Ships.
    for (const e of world.entities) {
      if (e.kind !== 'ship' || e.dead || e.id === world.playerId) continue;
      ctx.fillStyle = e.faction === 'hostile' ? '#ff5a5a' : '#ffb35a';
      ctx.beginPath(); ctx.arc(X(e.pos.x), Y(e.pos.z), 3, 0, Math.PI * 2); ctx.fill();
    }
    // You: arrow along your heading.
    const fx = -2 * (p.rot.x * p.rot.z + p.rot.w * p.rot.y), fz = -(1 - 2 * (p.rot.x * p.rot.x + p.rot.y * p.rot.y));
    const a = Math.atan2(fz, fx), px = X(p.pos.x), py = Y(p.pos.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * 10, py + Math.sin(a) * 10);
    ctx.lineTo(px + Math.cos(a + 2.5) * 7, py + Math.sin(a + 2.5) * 7);
    ctx.lineTo(px + Math.cos(a - 2.5) * 7, py + Math.sin(a - 2.5) * 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8f4ff'; ctx.fillText('YOU', px + 12, py - 8);
    // Scale bar.
    ctx.strokeStyle = '#65f5ff'; ctx.beginPath(); ctx.moveTo(24, h - 24); ctx.lineTo(24 + 1000 * k, h - 24); ctx.stroke();
    ctx.fillStyle = '#65f5ff'; ctx.fillText('1 km', 24, h - 30);
  }

  function drawUniverse(w, h) {
    hits = [];
    const P = (n) => ({ x: n.map.x * w, y: n.map.y * h });
    ctx.lineWidth = 1.5;
    for (const n of UNIVERSE) for (const l of n.links) {
      const m = UNIVERSE.find((u) => u.id === l); if (!m || m.id < n.id) continue;
      const a = P(n), b = P(m), live = SECTORS[n.id] && SECTORS[m.id];
      ctx.strokeStyle = live ? 'rgba(101,245,255,.6)' : 'rgba(101,245,255,.15)';
      ctx.setLineDash(live ? [] : [5, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const n of UNIVERSE) {
      const S = SECTORS[n.id], sec = S?.security || n.security, here = world.sector.id === n.id, { x, y } = P(n);
      ctx.fillStyle = S ? secColor(sec.level) : 'rgba(216,244,255,.2)';
      ctx.beginPath(); ctx.arc(x, y, here ? 13 : 10, 0, Math.PI * 2); ctx.fill();
      if (here) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20 + Math.sin(performance.now() / 300) * 2, 0, Math.PI * 2); ctx.stroke(); }
      if (n.id === selected) { ctx.strokeStyle = '#ffc56b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = S ? '#d8f4ff' : 'rgba(216,244,255,.4)'; ctx.font = '13px sans-serif';
      ctx.fillText(S?.name || n.name, x + 18, y - 2);
      ctx.font = '10px sans-serif'; ctx.fillStyle = S ? secColor(sec.level) : 'rgba(216,244,255,.3)';
      ctx.fillText(S ? `${sec.level.toFixed(1)} ${sec.label}${here ? ' · YOU ARE HERE' : ''}` : 'UNCHARTED', x + 18, y + 12);
      hits.push({ id: n.id, x, y });
    }
  }

  function updateCard() {
    const p = getPlayer(world);
    const key = view + ':' + selected + ':' + world.sector.id + ':' + (world.op.stage === 'complete');
    if (key === cardKey) return;
    cardKey = key;
    if (!selected) { card.innerHTML = ''; card.classList.remove('show'); return; }
    card.classList.add('show');
    if (view === 'universe') {
      const n = UNIVERSE.find((u) => u.id === selected), S = SECTORS[selected];
      const op = S ? world.ops[selected] : null;
      card.innerHTML = S ? `<h3>${S.name}</h3><div class="ui-sub">${S.security.level.toFixed(1)} ${S.security.label} · ${S.stationName}</div><p>${S.desc || ''}</p>
        <table class="ui-table"><tr><td>Operation</td><td>${op.name} · ${op.stage === 'complete' ? 'complete' : 'open'}</td></tr>
        <tr><td>Gates</td><td>${Object.values(S.gates || {}).map((g) => SECTORS[g.to].name).join(', ')}</td></tr></table>`
        : `<h3>${n.name}</h3><div class="ui-sub">UNCHARTED</div><p>${n.sealed}</p>`;
      return;
    }
    if (selected.startsWith('sig:')) {
      const s = world.atlas.sigs[selected.slice(4)];
      card.innerHTML = `<h3>${s.def.code} · ${['scanned', 'understood', 'resolved'].includes(s.stage) ? s.def.name : s.def.detectedName}</h3><div class="ui-sub">SIGNATURE · ${s.stage.toUpperCase()}</div>
        <div class="map-acts"><button class="ui-btn" data-map-act="sig">TRACK IN ATLAS</button></div>`;
      return;
    }
    if (selected.startsWith('job:')) {
      const job = world.jobs.active.find((j) => 'job:' + j.id === selected), pt = jobPoint(world, selected);
      if (!job || !pt) { card.innerHTML = ''; card.classList.remove('show'); return; }
      const dj = dist3(p.pos, pt.pos);
      card.innerHTML = `<h3>${jobTypeInfo(job.type).icon} ${job.title.toUpperCase()}</h3><div class="ui-sub">JOB · ${fmtDist(dj)}</div><p>${jobStatus(world, job)}</p>
        <div class="map-acts"><button class="ui-btn" data-map-act="approach">APPROACH</button>${dj > 9000 ? '<button class="ui-btn" data-map-act="zj">ZJ JUMP</button>' : ''}</div>`;
      return;
    }
    const lm = world.sector.landmarks[selected];
    const d = dist3(p.pos, lm.pos);
    const gate = world.sector.gates?.[selected];
    card.innerHTML = `<h3>${lm.name.toUpperCase()}</h3><div class="ui-sub">${lm.kind.toUpperCase()} · ${fmtDist(d)}${gate ? ' · LEADS TO ' + SECTORS[gate.to].name : lm.leadsTo ? ' · ' + lm.leadsTo.toUpperCase() : ''}</div>
      ${selected === world.op.target ? `<p>Operation site: ${world.op.name}.</p>` : ''}
      <div class="map-acts"><button class="ui-btn" data-map-act="approach">APPROACH</button>${d > 1500 ? '<button class="ui-btn" data-map-act="zj">ZJ JUMP</button>' : ''}</div>`;
  }

  const api = {
    get open() { return open; },
    toggle(on = !open) {
      open = on; root.classList.toggle('open', open);
      if (open) { selected = null; cardKey = ''; zoom = 1; pan = { x: 0, y: 0 }; }
    },
    update() {
      if (!open) return;
      const { w, h } = size();
      ctx.clearRect(0, 0, w, h);
      titleEl.textContent = view === 'sector' ? `${world.sector.name} · ${world.sector.security.level.toFixed(1)} ${world.sector.security.label}` : 'KNOWN SPACE';
      if (view === 'sector') drawSector(w, h); else drawUniverse(w, h);
      updateCard();
    },
  };
  return api;
}
