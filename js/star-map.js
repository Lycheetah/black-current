/* STAR MAP (Route 2 · Stage 1 · map and places). One zoomable canvas replaces the 19×19 label
 * grid and the galaxy dot chart. Two layers share it (the SYSTEM / GALAXY tabs galaxy.js mounts):
 * - SYSTEM: every sector as a tile coloured by danger band (safe · contested · null), with icons
 *   for the station, guardians, citadels, a hunting warlord, jump gates, finished discoveries,
 *   the tracked expedition and your plotted route.
 * - GALAXY: systems, the lanes you know, regions and rules.
 * Drag to pan, wheel or pinch to zoom, tap a tile or system to read it and plot a route
 * (travel.js owns routes). The old grid and chart stay in the DOM for older hooks, hidden. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, $ = id => document.getElementById(id);
  let ready = false, cv = null, ctx = null, card = null, plotBtn = null, clearBtn = null, raf = 0;
  const view = { system: null, galaxy: null }, sel = { system: null, galaxy: null };
  const ptrs = new Map(); let drag = null, pinch = null;
  // Band colours: safe 1–3 teal-green, contested 4–10 gold to ember, null 11–20 red to violet.
  function band(d) {
    if (d <= 3) return ['#3fd6a3', '#6fe08a', '#a6e36a'][Math.max(0, d - 1)];
    if (d <= 10) { const t = (d - 4) / 6; return `hsl(${46 - t * 34},90%,${58 - t * 6}%)`; }
    const t = (Math.min(20, d) - 11) / 9; return `hsl(${352 - t * 72},80%,${54 - t * 4}%)`;
  }
  const bandName = d => d <= 3 ? 'safe' : d <= 10 ? 'contested' : 'null band';
  const layer = () => galaxy.view === 'galaxy' ? 'galaxy' : 'system';
  const key = ch => galaxy.currentId + ':' + ch.gridX + ',' + ch.gridY;

  // ---- what a sector holds ----
  function marks(ch) {
    const out = [], disc = saveState.doc.discoveries || {}, E = window.capitalEndgame;
    if (ch.isHaven) out.push('station');
    if (ch.isBossSector) out.push('boss');
    try { if (E?.citadelOf(ch)) out.push(saveState.doc.capital?.citadels?.[E.citadelOf(ch).key] ? 'citadel-broken' : 'citadel'); } catch { }
    try { if (E?.warlordHere(ch)) out.push('warlord'); } catch { }
    if (ch.portals) out.push('gate');
    const k = key(ch); if (disc[k] || disc[k + ':shoal']) out.push('found');
    const fx = window.firstExpedition;
    if (fx && fx.state().stage === 'recover' && galaxy.currentId === fx.TARGET.sys && ch.gridX === fx.TARGET.gx && ch.gridY === fx.TARGET.gy) out.push('quest');
    return out;
  }
  function describe(ch) {
    if (!ch) return '';
    const m = marks(ch), E = window.capitalEndgame, bits = [`Sector ${ch.gridX},${ch.gridY}`];
    if (ch.isHaven) bits.push(galaxy.current.home ? 'Asterion Forge · home station' : galaxy.current.name + ' anchorage · station');
    else if (ch.isBossSector) bits.push('Guardian · ' + (ch.bossName || 'boss'));
    else bits.push(`danger ${ch.dangerLevel} · ${bandName(ch.dangerLevel)}`);
    if (m.includes('citadel')) bits.push('Citadel: break both generators to unseal the core');
    if (m.includes('citadel-broken')) bits.push('Citadel broken');
    if (m.includes('warlord')) { try { const w = E.warlordHere(ch); bits.push('Warlord ' + w.name + ' hunts here now'); } catch { } }
    if (m.includes('gate')) bits.push('Jump gate to another system');
    if (m.includes('quest')) bits.push('Expedition target');
    if (m.includes('found')) bits.push('Discovery recovered');
    if (ch.isCleared) bits.push('cleared');
    return bits.join(' · ');
  }

  // ---- camera ----
  function fit(l) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (l === 'system') { const n = worldMap.size * 2 + 1; return { x: worldMap.currentGridX, y: worldMap.currentGridY, s: Math.min(w, h) / (n + 1) * 1.6, min: Math.min(w, h) / (n + 1) * 0.9, max: 120 }; }
    return { x: galaxy.current.x / galaxy.CFG.radius, y: galaxy.current.y / galaxy.CFG.radius, s: Math.min(w, h) * 0.46, min: Math.min(w, h) * 0.4, max: Math.min(w, h) * 4 };
  }
  const cam = () => view[layer()] || (view[layer()] = fit(layer()));
  const toScreen = (x, y) => { const c = cam(); return [cv.clientWidth / 2 + (x - c.x) * c.s, cv.clientHeight / 2 + (y - c.y) * c.s]; };
  const toWorld = (sx, sy) => { const c = cam(); return [c.x + (sx - cv.clientWidth / 2) / c.s, c.y + (sy - cv.clientHeight / 2) / c.s]; };
  function zoomAt(sx, sy, k) {
    const c = cam(), [wx, wy] = toWorld(sx, sy);
    c.s = Math.max(c.min, Math.min(c.max, c.s * k));
    const [nx, ny] = toWorld(sx, sy); c.x += wx - nx; c.y += wy - ny; paint();
  }

  // ---- icons (vector, no emoji fonts needed) ----
  function icon(kind, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(1.2, r * 0.16); ctx.lineJoin = 'round';
    switch (kind) {
      case 'station': ctx.fillStyle = '#e8c478'; ctx.strokeStyle = '#2a1d06'; ctx.beginPath(); ctx.rect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#e8c478'; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.stroke(); break;
      case 'boss': ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, q = i % 2 ? r * 0.45 : r * 0.95; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); break;
      case 'citadel': case 'citadel-broken': ctx.fillStyle = kind === 'citadel' ? '#c77dff' : 'rgba(199,125,255,.35)'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#12061c'; ctx.fillRect(-r * 0.18, -r * 0.4, r * 0.36, r * 0.8); break;
      case 'warlord': ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.5); ctx.lineTo(-r * 0.8, -r * 0.3); ctx.lineTo(-r * 0.35, r * 0.1); ctx.lineTo(0, -r * 0.6); ctx.lineTo(r * 0.35, r * 0.1); ctx.lineTo(r * 0.8, -r * 0.3); ctx.lineTo(r * 0.8, r * 0.5); ctx.closePath(); ctx.fill(); break;
      case 'gate': ctx.strokeStyle = '#86ded0'; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.lineTo(r * 0.4, r * 0.3); ctx.lineTo(-r * 0.4, r * 0.3); ctx.closePath(); ctx.stroke(); break;
      case 'found': ctx.fillStyle = '#9fe6ff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, TAU); ctx.fill(); break;
      case 'quest': ctx.fillStyle = '#ffd166'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * TAU / 10, q = i % 2 ? r * 0.38 : r * 0.9; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); break;
    }
    ctx.restore();
  }

  // ---- system layer ----
  function drawSystem(t) {
    const c = cam(), n = worldMap.size, cell = c.s, gap = Math.max(1, cell * 0.07), r = Math.max(4, cell * 0.22);
    const route = window.travelHelper?.target?.(), cur = [worldMap.currentGridX, worldMap.currentGridY];
    for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) {
      const ch = worldMap.chambers[x + ',' + y]; if (!ch) continue;
      const [sx, sy] = toScreen(x - 0.5, y - 0.5); if (sx > cv.clientWidth || sy > cv.clientHeight || sx + cell < 0 || sy + cell < 0) continue;
      ctx.globalAlpha = ch.isCleared ? 0.42 : 0.78;
      ctx.fillStyle = ch.isHaven ? '#3a3220' : ch.isBossSector ? '#4a0f1c' : band(ch.dangerLevel);
      ctx.beginPath(); ctx.roundRect(sx + gap, sy + gap, cell - gap * 2, cell - gap * 2, Math.min(8, cell * 0.14)); ctx.fill();
      ctx.globalAlpha = 1;
      if (sel.system && sel.system[0] === x && sel.system[1] === y) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      const m = marks(ch), [cx, cy] = toScreen(x, y);
      if (m.length) { const main = m.filter(k => k !== 'found' && k !== 'gate'); if (main[0]) icon(main[0], cx, cy, r); if (m.includes('gate')) icon('gate', cx + cell * 0.28, cy - cell * 0.28, r * 0.6); if (m.includes('found')) icon('found', cx - cell * 0.28, cy - cell * 0.28, r * 0.7); }
      if (cell >= 34 && !ch.isHaven && !ch.isBossSector && !m.length) { ctx.fillStyle = 'rgba(6,14,20,.82)'; ctx.font = `600 ${Math.round(cell * 0.26)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch.dangerLevel, cx, cy); }
      if (ch.isCleared && cell >= 22) { ctx.strokeStyle = 'rgba(6,14,20,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + cell * 0.18, cy + cell * 0.26); ctx.lineTo(cx + cell * 0.26, cy + cell * 0.34); ctx.lineTo(cx + cell * 0.38, cy + cell * 0.18); ctx.stroke(); }
    }
    // route line and destination
    if (route) {
      const [ax, ay] = toScreen(cur[0], cur[1]), [bx, by] = toScreen(route.gx, route.gy);
      ctx.strokeStyle = '#e8c478'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 0.02; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#e8c478'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, cell * 0.42, 0, TAU); ctx.stroke();
    }
    // you are here
    const [px, py] = toScreen(cur[0], cur[1]), pulse = cell * 0.42 + Math.sin(t * 0.005) * cell * 0.06;
    ctx.strokeStyle = '#5ef2e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#5ef2e0'; ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r * 0.7, py + r * 0.6); ctx.lineTo(px, py + r * 0.25); ctx.lineTo(px - r * 0.7, py + r * 0.6); ctx.closePath(); ctx.fill();
  }

  // ---- galaxy layer ----
  function drawGalaxy(t) {
    const D = galaxy.data, v = galaxy.doc().visited, R = galaxy.CFG.radius, c = cam();
    const P = s => toScreen(s.x / R, s.y / R);
    galaxy.REGIONS.forEach((reg, i) => { const [ox, oy] = toScreen(0, 0); ctx.strokeStyle = reg.tint; ctx.globalAlpha = 0.16; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, (i + 1) / galaxy.REGIONS.length * c.s, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.fillStyle = reg.tint; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(reg.name.toUpperCase(), ox, oy - (i + 0.55) / galaxy.REGIONS.length * c.s); });
    ctx.globalAlpha = 1;
    for (const s of D.systems) for (const nId of s.links) {
      if (nId < s.id || !(v.includes(s.id) || v.includes(nId))) continue;
      const [ax, ay] = P(s), [bx, by] = P(D.byId[nId]);
      ctx.strokeStyle = v.includes(s.id) && v.includes(nId) ? 'rgba(232,196,120,.65)' : 'rgba(232,196,120,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    const route = saveState.doc.travelRoute, rad = Math.max(3, c.s / 140);
    for (const s of D.systems) {
      const [x, y] = P(s), seen = v.includes(s.id), known = galaxy.known(s.id), tint = galaxy.REGIONS[s.rid].tint, r = rad * (1 + s.size * 0.35);
      ctx.globalAlpha = seen ? 1 : known ? 0.65 : 0.18;
      if (s.hub || s.home) icon('station', x, y, r * 1.3);
      else { ctx.fillStyle = seen ? tint : 'rgba(0,0,0,.4)'; ctx.strokeStyle = tint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); }
      if (s.rule && known) { ctx.strokeStyle = galaxy.RULES[s.rule].tint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); }
      if (known && (seen || c.s > 500)) { ctx.fillStyle = '#e2edee'; ctx.font = `600 ${c.s > 700 ? 12 : 10}px system-ui`; ctx.textAlign = 'left'; ctx.fillText(s.name, x + r + 6, y + 4); }
      if (route && route.id === s.id && route.id !== galaxy.currentId) { ctx.strokeStyle = '#e8c478'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(x, y, r + 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (sel.galaxy === s.id) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 8, 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // the route's jump path
    if (route && route.id !== galaxy.currentId) { const path = window.travelHelper?.path(galaxy.currentId, route.id); if (path) { ctx.strokeStyle = '#e8c478'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 0.02; ctx.beginPath(); path.forEach((id, i) => { const [x, y] = P(D.byId[id]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); } }
    const [cx, cy] = P(galaxy.current); ctx.strokeStyle = '#5ef2e0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, 12 + Math.sin(t * 0.005) * 3, 0, TAU); ctx.stroke();
  }

  // ---- paint + info ----
  function paint() {
    if (!cv || !engine.mapOpen) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7); bg.addColorStop(0, '#0f2633'); bg.addColorStop(1, '#050c12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const t = performance.now();
    layer() === 'galaxy' ? drawGalaxy(t) : drawSystem(t);
    info();
  }
  function info() {
    const l = layer(), text = $('star-map-text');
    if (l === 'system') {
      const s = sel.system, ch = s && worldMap.chambers[s[0] + ',' + s[1]];
      text.textContent = ch ? describe(ch) : `${galaxy.current.name} · you are in sector ${worldMap.currentGridX},${worldMap.currentGridY}. Tap a sector to read it and plot a route.`;
      plotBtn.hidden = !ch || (s[0] === worldMap.currentGridX && s[1] === worldMap.currentGridY);
      plotBtn.textContent = ch?.isHaven ? 'Plot route to the station' : 'Plot route here';
    } else {
      const s = sel.galaxy && galaxy.data.byId[sel.galaxy], known = s && galaxy.known(s.id), path = s && window.travelHelper?.path(galaxy.currentId, s.id);
      text.textContent = !s ? `${galaxy.doc().visited.length} / ${galaxy.data.systems.length} systems visited. Tap a system to read it.` : !known ? 'Uncharted. Jump next door to it to learn what it is.'
        : `${s.name} · ${s.region} · danger ${s.danger} · ${s.size * 2 + 1}×${s.size * 2 + 1} sectors${s.hub ? ' · station' : ''}${s.rule ? ' · ' + galaxy.RULES[s.rule].name : ''}${path ? ' · ' + (path.length - 1) + ' jumps' : ''}`;
      plotBtn.hidden = !s || !known || !path || s.id === galaxy.currentId; plotBtn.textContent = 'Plot route to this system';
    }
    clearBtn.hidden = !saveState.doc.travelRoute;
  }
  function plot() {
    const T = window.travelHelper; if (!T) return;
    if (layer() === 'system' && sel.system) { const ch = worldMap.chambers[sel.system.join(',')]; if (ch?.isHaven) T.station(); else T.sector(sel.system[0], sel.system[1], 'Sector ' + sel.system.join(',')); }
    else if (sel.galaxy) T.destination(sel.galaxy);
    T.paint?.(); paint();
  }
  function pick(sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    if (layer() === 'system') { const gx = Math.round(wx), gy = Math.round(wy); sel.system = worldMap.chambers[gx + ',' + gy] ? [gx, gy] : null; }
    else { let best = null, bd = 22; for (const s of galaxy.data.systems) { const [x, y] = toScreen(s.x / galaxy.CFG.radius, s.y / galaxy.CFG.radius), d = Math.hypot(x - sx, y - sy); if (d < bd) { bd = d; best = s; } } sel.galaxy = best?.id || null; galaxy.select = sel.galaxy; }
    paint();
  }

  // ---- input: drag, wheel, pinch, tap ----
  function bind() {
    const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, local(e)); if (ptrs.size === 1) drag = { at: local(e), moved: 0 }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; } });
    cv.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; const p = local(e); ptrs.set(e.pointerId, p);
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d); pinch.d = d; return; }
      if (drag) { const c = cam(), dx = p[0] - drag.at[0], dy = p[1] - drag.at[1]; drag.moved += Math.abs(dx) + Math.abs(dy); c.x -= dx / c.s; c.y -= dy / c.s; drag.at = p; paint(); }
    });
    const up = e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (drag && drag.moved < 8 && p) pick(p[0], p[1]); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = pinch = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = local(e); zoomAt(x, y, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    cv.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  }

  function mount() {
    const grid = $('matrix-grid-container'), mapCard = document.querySelector('#map-overlay .map-card');
    if (!grid || !mapCard || $('star-map')) return;
    mapCard.classList.add('star-map-card');
    const wrap = document.createElement('section'); wrap.id = 'star-map-wrap';
    cv = document.createElement('canvas'); cv.id = 'star-map'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Zoomable star map');
    const tools = document.createElement('div'); tools.className = 'star-map-tools';
    const btn = (label, aria, run) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', aria); b.onclick = e => { e.stopPropagation(); run(); }; tools.append(b); return b; };
    btn('−', 'Zoom out', () => zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1 / 1.4)).id = 'star-map-out';
    btn('+', 'Zoom in', () => zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1.4)).id = 'star-map-in';
    btn('Centre', 'Centre on your ship', () => { view[layer()] = fit(layer()); paint(); }).id = 'star-map-centre';
    card = document.createElement('div'); card.className = 'star-map-card-info';
    const text = document.createElement('p'); text.id = 'star-map-text';
    plotBtn = document.createElement('button'); plotBtn.type = 'button'; plotBtn.id = 'star-map-plot'; plotBtn.className = 'star-map-primary'; plotBtn.onclick = e => { e.stopPropagation(); plot(); };
    clearBtn = document.createElement('button'); clearBtn.type = 'button'; clearBtn.id = 'star-map-clear'; clearBtn.textContent = 'Clear route'; clearBtn.onclick = e => { e.stopPropagation(); saveState.doc.travelRoute = null; saveState.save(); window.travelHelper?.paint?.(); paint(); };
    card.append(text, plotBtn, clearBtn);
    wrap.append(cv, tools, card);
    (($('chart-tabs')) || grid).after(wrap);
    ctx = cv.getContext('2d'); bind();
    document.body.classList.add('star-map-on');
  }
  function loop() { if (!engine.mapOpen) { raf = 0; document.body.classList.remove('star-map-open'); return; } paint(); raf = requestAnimationFrame(loop); }
  function open() { mount(); if (!raf && engine.mapOpen) { for (const l of ['system', 'galaxy']) if (!view[l] || view[l].sys !== galaxy.currentId) view[l] = Object.assign(fit(l), { sys: galaxy.currentId }); document.body.classList.add('star-map-open'); raf = requestAnimationFrame(loop); } }
  function install() {
    if (!window.galaxy?.data || !window.travelHelper?.ready || !$('chart-tabs') || typeof worldMap === 'undefined') { setTimeout(install, 60); return; }
    mount();
    const grid = worldMap.renderMatrixGridModal.bind(worldMap);
    worldMap.renderMatrixGridModal = (...a) => { const r = grid(...a); try { open(); paint(); } catch (e) { console.warn('star map:', e.message); } return r; };
    const prev = galaxy.onRenderGalaxy; galaxy.onRenderGalaxy = (...a) => { prev?.(...a); try { open(); paint(); } catch (e) { console.warn('star map:', e.message); } };
    ready = true;
  }
  window.starMap = { band, marks, describe, paint, plot, pick, zoomAt, toScreen, get view() { return view; }, get selection() { return sel; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 0));
})();
