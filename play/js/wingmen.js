/* WINGMEN (overnight run step 18; Route 2 Stage 4). "They make a cruiser feel like a fleet." Hire one to three escort
 * ships at a station, built from your saved builds (the workshop library) or the station's stock hulls, no bigger
 * than the frame you fly. Wingmen fly with you from sector to sector and system to system, shoot with their own fitted
 * guns, take fire, and can be lost; a lost wingman is rebuilt at any station for a quarter of its hire price.
 * Orders (keys 5–8, or tap the WING chip): 5 FOLLOW (formation, engage what comes near), 6 ATTACK (focus the hostile
 * nearest your aim), 7 HOLD (stay where they are and fight from there), 8 GUARD (tight on your hull, only shoot what
 * threatens you). Their shots are player shots tagged owner 'wing'. They are managed in the journal's Wingmen tab;
 * a Wingmen button sits in the dock footer. Not to be confused with roles.js escorts, which come from wing docks. */
(() => {
  'use strict';
  const CFG = { hirePart: 0.5, hireMin: 250, rebuildPart: 0.25, slots: [1, 1, 2, 2, 2, 3, 3, 3, 3], hpBase: 260, hpGrowth: 1.45, dpsPart: 0.55,
    fireEvery: 18, range: 950, guardRange: 700, attackOrbit: 520, maxSpeed: 9.5, accel: 0.32, saveEvery: 180 };
  const ORDERS = ['follow', 'attack', 'hold', 'guard'], ORDER_KEYS = { Digit5: 'follow', Digit6: 'attack', Digit7: 'hold', Digit8: 'guard' };
  const TAU = Math.PI * 2;
  let ready = false, live = [], chip = null, footerBtn = null, notice = '', clock = 0, sprites = new Map();
  const $ = id => document.getElementById(id);
  const M = () => window.modularShips;
  const CLASSES = () => window.tuning?.CLASSES || ['frigate'];
  const clsIdx = hull => Math.max(0, CLASSES().indexOf(hull));
  const playerIdx = () => Math.max(0, CLASSES().indexOf(window.tuning?.classOf?.(engine.player) || 'frigate'));
  const copy = x => JSON.parse(JSON.stringify(x));
  function doc() { let d = saveState.doc.wingmen; if (!d || d.v !== 1 || !Array.isArray(d.list)) d = saveState.doc.wingmen = { v: 1, list: [], order: 'follow', next: 1 }; if (!ORDERS.includes(d.order)) d.order = 'follow'; return d; }
  const slots = () => CFG.slots[Math.min(CFG.slots.length - 1, playerIdx())];
  // ---- what can be hired: your saved builds first, then the station's stock hulls, none above your frame ----
  function compileSafe(design) { try { const c = M().compile(copy(design)); return c?.design?.modular ? c.design : null; } catch (e) { return null; } }
  function offers() {
    const out = [], cap = playerIdx(), seen = new Set();
    for (const [key, b] of Object.entries(saveState.doc.workshop?.builds || {})) { const d = b?.modular && compileSafe(b); if (!d) continue; const i = clsIdx(d.modular.hull); if (i > cap) continue; seen.add(key); out.push({ key: 'build:' + key, name: b.name || b.frame || 'Saved build', design: d, cls: d.modular.hull, source: 'Your build' }); }
    for (const f of M().FACTORY || []) { let d = null; try { d = compileSafe(M().factory(f.id)); } catch (e) { } if (!d) continue; const i = clsIdx(d.modular.hull); if (i > cap) continue; out.push({ key: 'stock:' + f.id, name: f.name || f.id, design: d, cls: d.modular.hull, source: 'Station stock' }); }
    for (const o of out) o.price = price(o.design);
    return out.sort((a, b) => (a.source === b.source ? 0 : a.source === 'Your build' ? -1 : 1) || clsIdx(b.cls) - clsIdx(a.cls) || a.price - b.price);
  }
  function price(design) { let q = 0; try { q = M().quote(design).total || 0; } catch (e) { } const hull = M().HULLS[design.modular.hull]; return Math.max(CFG.hireMin, Math.round((q + (hull?.cost || 0)) * CFG.hirePart)); }
  function statsOf(design) {
    const i = clsIdx(design.modular.hull), guns = design.modular.fittings.map(f => M().GEARS[f.gear]).filter(g => g?.weapon);
    const best = guns.map(g => g.weapon).sort((a, b) => (window.arsenal?.dps?.(b) || 0) - (window.arsenal?.dps?.(a) || 0))[0] || 'spitter';
    const dps = guns.reduce((n, g) => n + (window.arsenal?.dps?.(g.weapon) || 20), 0) * CFG.dpsPart;
    return { max: Math.round(CFG.hpBase * Math.pow(CFG.hpGrowth, i)), dps: Math.max(10, Math.round(dps)), weapon: best, length: window.tuning?.SIZE?.playerLength?.[design.modular.hull] || 170 };
  }
  // ---- hiring and rebuilding (docked only) ----
  function hire(key) {
    const d = doc(), o = offers().find(x => x.key === key);
    if (!hubs.docked) return say('Dock at a station to hire wingmen.', false);
    if (!o) return say('That hull is not on offer for your frame.', false);
    if (d.list.length >= slots()) return say(`Your frame commands ${slots()} wingm${slots() > 1 ? 'en' : 'an'}. Dismiss one, or fly a bigger frame.`, false);
    if (hubs.metal < o.price) return say(`Hiring ${o.name} needs ${o.price.toLocaleString()} metal.`, false);
    const s = statsOf(o.design), rec = { id: 'w' + (d.next++), name: o.name, design: o.design, cls: o.cls, price: o.price, hp: s.max, max: s.max, lost: false };
    hubs.metal = hubs.metal - o.price; d.list.push(rec); saveState.save(); spawnAll(); say(`${o.name} joins your wing (${d.list.length}/${slots()}).`, true); return true;
  }
  function rebuild(id) {
    const r = doc().list.find(x => x.id === id); if (!r || !r.lost) return false;
    if (!hubs.docked) return say('Dock at a station to rebuild a lost wingman.', false);
    const cost = Math.round(r.price * CFG.rebuildPart); if (hubs.metal < cost) return say(`Rebuilding ${r.name} needs ${cost.toLocaleString()} metal.`, false);
    hubs.metal = hubs.metal - cost; r.lost = false; r.hp = r.max; saveState.save(); spawnAll(); say(`${r.name} rebuilt and back on your wing.`, true); return true;
  }
  function dismiss(id) { const d = doc(), i = d.list.findIndex(x => x.id === id); if (i < 0) return false; const [r] = d.list.splice(i, 1); saveState.save(); spawnAll(); say(`${r.name} leaves your wing.`, true); return true; }
  function repairDocked() { let any = false; for (const r of doc().list) if (!r.lost && r.hp < r.max) { r.hp = r.max; any = true; } if (any) { for (const w of live) w.hp = w.rec.hp; saveState.save(); } }
  function order(o) { if (!ORDERS.includes(o)) return false; const d = doc(); d.order = o; const P = engine.player; for (const w of live) { w.holdX = w.x; w.holdY = w.y; } saveState.save(); paintChip(); if (live.length) garage.banner(`WING · ${o.toUpperCase()}`, 'good'); return true; }
  function say(text, ok) { notice = text; try { garage.banner('WINGMEN · ' + text, ok ? 'good' : 'bad'); } catch (e) { } refresh(); return !!ok; }
  // ---- flight ----
  function sprite(rec) {
    let s = sprites.get(rec.id); if (s && s.sig === rec.cls) return s;
    const L = statsOf(rec.design).length, c = window.topdownKit?.thumb?.(rec.design.modular, Math.round(L), Math.round(L * 0.7), rec.design.color || engine.player.color);
    s = { sig: rec.cls, canvas: c, L }; sprites.set(rec.id, s); return s;
  }
  function spawnAll() {
    const P = engine.player; live = doc().list.filter(r => !r.lost).map((rec, k) => { const st = statsOf(rec.design), a = (P.angle || 0) + Math.PI + (k - 1) * 0.7, off = 160 + st.length;
      return { rec, x: P.x + Math.cos(a) * off, y: P.y + Math.sin(a) * off, vx: P.vx || 0, vy: P.vy || 0, angle: P.angle || 0, hp: rec.hp, max: rec.max, st, t: k * 5, slot: k, holdX: P.x, holdY: P.y }; });
    paintChip();
  }
  function formationPoint(w, tight) {
    const P = engine.player, a = P.angle || 0, side = w.slot % 2 ? 1 : -1, row = Math.floor((w.slot + 1) / 2), base = (window.fleetFormation?.radius?.(P) || 120) * (tight ? 0.7 : 1);
    const back = base + w.st.length * 0.4 + row * w.st.length * 0.5, wide = w.slot === 0 ? 0 : side * (base * 0.8 + w.st.length * 0.6);
    return { x: P.x - Math.cos(a) * back + Math.cos(a + Math.PI / 2) * wide, y: P.y - Math.sin(a) * back + Math.sin(a + Math.PI / 2) * wide };
  }
  function pickTarget(w, o) {
    const P = engine.player, list = engine.enemies.filter(e => e.hp > 0 && !e.training);
    if (o === 'attack') { const ax = engine.input?.aimX ?? P.x, ay = engine.input?.aimY ?? P.y; return list.sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay))[0] || null; }
    const from = o === 'guard' ? P : w, reach = o === 'guard' ? CFG.guardRange : CFG.range; let best = null, bd = reach;
    for (const e of list) { const d = Math.hypot(e.x - from.x, e.y - from.y); if (d < bd) { bd = d; best = e; } } return best;
  }
  function tick() {
    if (!live.length || engine.paused || engine.mapOpen || engine.player.dead) return;
    const P = engine.player, o = doc().order;
    for (let k = live.length - 1; k >= 0; k--) {
      const w = live[k], tgt = pickTarget(w, o);
      let goal = o === 'hold' ? { x: w.holdX, y: w.holdY } : formationPoint(w, o === 'guard');
      if (o === 'attack' && tgt) { const a = Math.atan2(w.y - tgt.y, w.x - tgt.x) + 0.02 * (w.slot + 1); goal = { x: tgt.x + Math.cos(a) * (CFG.attackOrbit + w.st.length * 0.5), y: tgt.y + Math.sin(a) * (CFG.attackOrbit + w.st.length * 0.5) }; }
      const dx = goal.x - w.x, dy = goal.y - w.y, d = Math.hypot(dx, dy) || 1, far = d > 2400;
      if (far && o !== 'hold') { w.x = goal.x; w.y = goal.y; w.vx = P.vx || 0; w.vy = P.vy || 0; }   // left far behind (a jump, a gate): catch up
      else { const pull = Math.min(1, d / 200) * CFG.accel; w.vx = (w.vx + dx / d * pull) * 0.95; w.vy = (w.vy + dy / d * pull) * 0.95; const sp = Math.hypot(w.vx, w.vy), cap = Math.max(CFG.maxSpeed, Math.hypot(P.vx || 0, P.vy || 0) * 1.2); if (sp > cap) { w.vx *= cap / sp; w.vy *= cap / sp; } w.x += w.vx; w.y += w.vy; }
      const face = tgt ? Math.atan2(tgt.y - w.y, tgt.x - w.x) : Math.hypot(w.vx, w.vy) > 0.6 ? Math.atan2(w.vy, w.vx) : P.angle || 0;
      w.angle += Math.atan2(Math.sin(face - w.angle), Math.cos(face - w.angle)) * 0.12;
      if (tgt && ++w.t % CFG.fireEvery === 0 && Math.hypot(tgt.x - w.x, tgt.y - w.y) < CFG.range * 1.1) {
        const a = Math.atan2(tgt.y - w.y, tgt.x - w.x), spd = typeof weaponSpeed === 'function' ? weaponSpeed(w.st.weapon) : 20, def = (typeof WEAPON_TYPES !== 'undefined' && WEAPON_TYPES[w.st.weapon]) || {};
        const pr = new Projectile(w.x + Math.cos(a) * w.st.length * 0.45, w.y + Math.sin(a) * w.st.length * 0.45, Math.cos(a) * spd, Math.sin(a) * spd,
          { color: window.arsenal?.FAMILIES?.[window.arsenal?.familyOf?.(w.st.weapon)]?.tint || P.color, damage: w.st.dps * CFG.fireEvery / 60, radius: def.radius || 6, isPlayer: true, type: w.st.weapon });
        pr.owner = 'wing'; engine.projectiles.push(pr);
      }
      const hitR = w.st.length * 0.32;
      for (let i = engine.projectiles.length - 1; i >= 0; i--) { const q = engine.projectiles[i]; if (!q.isPlayer && Math.hypot(q.x - w.x, q.y - w.y) < hitR + (q.radius || 4)) { w.hp -= q.damage || 0; w._hitAt = performance.now(); engine.projectiles.splice(i, 1); } }
      w.rec.hp = Math.max(0, Math.round(w.hp));
      if (w.hp <= 0) { w.rec.lost = true; w.rec.hp = 0; live.splice(k, 1); try { particleSystem.spawnBubbleBurst(w.x, w.y, '#ff9a5a', 30); window.gunFeel?.shatter?.({ x: w.x, y: w.y, vx: w.vx, vy: w.vy, coreRadius: w.st.length * 0.3, color: '#8fa3b0' }); } catch (e) { }
        garage.banner(`WINGMAN LOST · ${w.rec.name} · rebuild at any station`, 'bad'); saveState.save(); paintChip(); }
    }
    if (++clock % CFG.saveEvery === 0) saveState.save();
  }
  function draw(ctx, cam) {
    if (!live.length) return; const z = cam.zoom || 1;
    for (const w of live) {
      const s = sprite(w.rec), x = w.x - cam.x, y = w.y - cam.y;
      if (s.canvas) { ctx.save(); ctx.translate(x, y); ctx.rotate(w.angle); ctx.drawImage(s.canvas, -s.canvas.width / 2, -s.canvas.height / 2); ctx.restore(); }
      else { ctx.fillStyle = engine.player.color; ctx.beginPath(); ctx.arc(x, y, w.st.length * 0.25, 0, TAU); ctx.fill(); }
      const bw = Math.max(40, w.st.length * 0.5); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - bw / 2, y - w.st.length * 0.45, bw, 5 / z); ctx.fillStyle = '#7fe0ff'; ctx.fillRect(x - bw / 2, y - w.st.length * 0.45, bw * Math.max(0, w.hp / w.max), 5 / z);
    }
  }
  // ---- UI: journal tab, dock footer button, HUD order chip ----
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const btn = (text, fn, id) => { const b = el('button', text); b.type = 'button'; b.onclick = fn; if (id) b.id = id; return b; };
  function render() {
    const d = doc(), host = el('section', null, 'wingmen'); host.id = 'wingmen-panel'; host.style.cssText = 'display:grid;gap:8px;margin-bottom:14px';
    host.append(el('small', `WINGMEN · ${d.list.length}/${slots()} for your frame · orders: 5 follow, 6 attack, 7 hold, 8 guard`, 'qm-kicker'));
    if (notice) host.append(el('p', notice, 'qm-notice'));
    const ord = el('div', null, 'qm-actions'); for (const o of ORDERS) { const b = btn(o[0].toUpperCase() + o.slice(1), () => order(o)); b.dataset.wingOrder = o; b.setAttribute('aria-pressed', String(d.order === o)); ord.append(b); } host.append(ord);
    for (const r of d.list) { const row = el('p', `${r.name} · ${r.cls} · ${r.lost ? 'LOST' : `hull ${r.hp}/${r.max}`}`); row.dataset.wingman = r.id; host.append(row);
      const acts = el('div', null, 'qm-actions'); if (r.lost) { const b = btn(`Rebuild · ${Math.round(r.price * CFG.rebuildPart).toLocaleString()} metal`, () => rebuild(r.id)); b.dataset.wingRebuild = r.id; b.disabled = !hubs.docked; acts.append(b); }
      const x = btn('Dismiss', () => dismiss(r.id)); x.dataset.wingDismiss = r.id; acts.append(x); host.append(acts); }
    host.append(el('h4', hubs.docked ? 'Hire' : 'Hire (dock at a station)'));
    if (d.list.length >= slots()) host.append(el('p', 'Your wing is full for this frame.', 'path-note'));
    else for (const o of offers().slice(0, 8)) { const b = btn(`${o.name} · ${o.cls} · ${o.source} · ${o.price.toLocaleString()} metal`, () => hire(o.key)); b.dataset.wingHire = o.key; b.disabled = !hubs.docked || hubs.metal < o.price; host.append(b); }
    return host;
  }
  function refresh() { try { window.pilotRpg?.refresh?.(); } catch (e) { } paintChip(); paintFooter(); }
  function paintChip() {
    if (!chip) return; const n = live.length, d = doc(); chip.hidden = !n; if (!n) return;
    chip.textContent = `WING ×${n} · ${d.order.toUpperCase()}${document.documentElement.classList.contains('mobile-layout') ? '' : ' · 5–8'}`;
  }
  function paintFooter() {
    const footer = document.querySelector('#dock-panel .dock-doors'); if (!footer) return;
    if (!footerBtn) { footerBtn = btn('Wingmen', () => { hubs.closeDock?.(); window.pilotRpg?.openJournal?.('wingmen'); }, 'dock-wingmen'); footerBtn.className = 'tm-door'; footerBtn.dataset.stationService = 'wingmen'; }
    if (footerBtn.parentNode !== footer) { const launch = $('dock-undock'); launch ? launch.before(footerBtn) : footer.append(footerBtn); }
    const d = doc(), lost = d.list.filter(r => r.lost).length; footerBtn.textContent = `Wingmen · ${d.list.length}/${slots()}${lost ? ` · ${lost} to rebuild` : ''}`;
  }
  function install() {
    if (!M()?.compile || !window.pilotRpg?.registerJournalSection || typeof engine === 'undefined' || typeof particleSystem === 'undefined' || !window.hubs?.openDock) { setTimeout(install, 80); return; }
    pilotRpg.registerJournalSection(render, { id: 'wingmen', label: 'Wingmen' });
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { tick(); } catch (e) { console.warn('wingmen:', e.message); } return r; };
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, cam) => { paint(ctx, cam); try { draw(ctx, cam); } catch (e) { } };
    const enter = engine.enterChamber; engine.enterChamber = function (...a) { const r = enter.apply(this, a); try { spawnAll(); } catch (e) { } return r; };
    const respawn = engine.playerRespawn; if (respawn) engine.playerRespawn = function (...a) { const r = respawn.apply(this, a); try { spawnAll(); } catch (e) { } return r; };
    const open = hubs.openDock; hubs.openDock = function (...a) { const r = open.apply(this, a); try { if (this.docked) repairDocked(); paintFooter(); } catch (e) { } return r; };
    window.addEventListener('keydown', e => { const o = ORDER_KEYS[e.code]; if (!o || e.repeat || e.ctrlKey || e.metaKey || e.target?.closest?.('input,textarea,select') || !saveState.doc.launched || window.shipyard?.open || !live.length) return; e.preventDefault(); order(o); });
    chip = btn('', () => order(ORDERS[(ORDERS.indexOf(doc().order) + 1) % ORDERS.length]), 'wing-orders'); chip.hidden = true;
    chip.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(var(--phone-top,10px) + 128px);z-index:40;min-height:36px;padding:6px 14px;border-radius:18px;border:1px solid #7fe0ff88;background:#06141cdd;color:#bdeeff;font:600 12px/1.2 system-ui;letter-spacing:.06em';
    document.body.append(chip); spawnAll(); paintFooter(); ready = true;
  }
  window.wingmen = { CFG, ORDERS, doc, offers, hire, rebuild, dismiss, order, slots, statsOf, spawnAll, render, get live() { return live; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 550));
})();
