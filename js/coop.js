/* CO-OP · first slice (Route 2 Stage 5). Mac, 2026-10-30: "the connection to connection is better … not sure we need the
 * relays at all". Two browsers connect directly (WebRTC data channel) by swapping two codes by hand: the host makes an
 * invite code, the friend pastes it and sends back an answer code, the host pastes that, and they are linked. No relay,
 * no account, no server. On one network that is all it takes; across the internet a browser first has to learn its own
 * public address, which needs a STUN server (it only answers "this is your address"; no game data passes through it):
 * the "Find each other across networks" switch turns on a public one. Off by default.
 *
 * The host's browser runs the game. The friend's ship flies in the host's world from the friend's controls (input at
 * 30 Hz), shoots with its own fitted guns, takes fire and is rebuilt beside the host if it breaks. Enemies go for the
 * nearer ship. The host streams the scene (15 Hz): enemies, both ships, shots and the sector. Loot is personal: a kill the
 * friend lands pays the friend's own save, not the host's. Revive and reconnect come in the next slice.
 * Pause menu → Co-op. */
(() => {
  'use strict';
  const CFG = { snapEvery: 4, inputEvery: 2, stun: 'stun:stun.l.google.com:19302', accel: 0.7, damping: 0.93, fireEvery: 14, rebuildFrames: 300, iceWaitMs: 3000 };
  const PREFIX = 'BCO1.';
  let role = null, pc = null, dc = null, ready = false, status = 'Not connected', panel = null;
  let ally = null, guestIn = { ax: 0, ay: 0, aimX: 0, aimY: 0, fire: false }, frame = 0, nextId = 1;
  let snap = null, proxies = new Map(), remote = null, shots = [], sprites = new Map(), stats = { sent: 0, got: 0, rewards: 0 };
  const $ = id => document.getElementById(id);
  const settings = () => window.menu?.settings?.() || {};
  const connected = () => dc?.readyState === 'open';
  // ---- codes: the session description, base64 with a version prefix ----
  const encode = desc => PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ type: desc.type, sdp: desc.sdp }))));
  function decode(code) { const c = String(code || '').trim(); if (!c.startsWith(PREFIX)) throw new Error('That is not a Black Current co-op code.'); return JSON.parse(decodeURIComponent(escape(atob(c.slice(PREFIX.length))))); }
  function newPeer() {
    close(false);
    pc = new RTCPeerConnection({ iceServers: settings().coopStun ? [{ urls: CFG.stun }] : [] });
    pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc?.connectionState)) say('Connection lost.'); };
    return pc;
  }
  const iceDone = p => new Promise(res => { if (p.iceGatheringState === 'complete') return res(); const t = setTimeout(res, CFG.iceWaitMs); p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
  async function host() {
    role = 'host'; const p = newPeer(); wire(p.createDataChannel('black-current', { ordered: true }));
    await p.setLocalDescription(await p.createOffer()); await iceDone(p);
    say('Invite code ready: send it to your friend, then paste their answer code.'); return encode(p.localDescription);
  }
  async function acceptAnswer(code) { if (!pc || role !== 'host') throw new Error('Make an invite first.'); await pc.setRemoteDescription(decode(code)); say('Connecting…'); return true; }
  async function join(code) {
    role = 'guest'; const p = newPeer(); p.ondatachannel = e => wire(e.channel);
    await p.setRemoteDescription(decode(code)); await p.setLocalDescription(await p.createAnswer()); await iceDone(p);
    say('Answer code ready: send it back to the host.'); return encode(p.localDescription);
  }
  function wire(ch) {
    dc = ch;
    ch.onopen = () => { say(role === 'host' ? 'Connected: your friend is in your sector.' : 'Connected: you are flying in the host\'s game.'); if (role === 'guest') send({ t: 'hello', design: saveState.doc.design, name: saveState.doc.callsign || saveState.doc.profile?.callsign || 'Wing' }); };
    ch.onclose = () => { say('Disconnected.'); if (role === 'host') ally = null; else { proxies.clear(); snap = null; remote = null; } };
    ch.onmessage = e => { stats.got++; try { receive(JSON.parse(e.data)); } catch (err) { console.warn('coop:', err.message); } };
  }
  function send(m) { if (connected()) { dc.send(JSON.stringify(m)); stats.sent++; } }
  function close(announce = true) { try { dc?.close(); } catch (e) { } try { pc?.close(); } catch (e) { } dc = null; pc = null; ally = null; snap = null; proxies.clear(); remote = null; if (announce) { role = null; say('Not connected'); } }
  function say(text) { status = text; const s = $('coop-status'); if (s) s.textContent = text; try { if (/Connected|Disconnected|lost/.test(text)) garage.banner('CO-OP · ' + text, /lost|Disconnected/.test(text) ? 'bad' : 'good'); } catch (e) { } }
  function receive(m) {
    if (role === 'host') {
      if (m.t === 'hello') { const P = engine.player; ally = { x: P.x + 160, y: P.y + 120, vx: 0, vy: 0, angle: P.angle || 0, hp: 0, max: 0, design: m.design, name: String(m.name || 'Wing').slice(0, 24), t: 0, down: 0 }; fitAlly(); }
      else if (m.t === 'in') guestIn = { ax: clamp(m.ax), ay: clamp(m.ay), aimX: +m.aimX || 0, aimY: +m.aimY || 0, fire: !!m.fire };
    } else {
      if (m.t === 'snap') snap = m.s;
      else if (m.t === 'reward') { const metal = Math.max(0, Math.round(+m.metal || 0)); hubs.metal = hubs.metal + metal; stats.rewards += metal; saveState.save(); garage.banner(`CO-OP KILL · +${metal} metal`, 'good'); }
    }
  }
  const clamp = v => Math.max(-1, Math.min(1, +v || 0));
  // ---- host: the friend's ship ----
  function fitAlly() {
    const d = ally?.design?.modular, G = window.modularShips?.GEARS || {}; const guns = (d?.fittings || []).map(f => G[f.gear]).filter(g => g?.weapon).map(g => g.weapon);
    ally.guns = guns.length ? guns : ['spitter']; const cls = d?.hull || 'frigate'; const i = Math.max(0, (window.tuning?.CLASSES || ['frigate']).indexOf(cls));
    ally.max = ally.hp = Math.round(140 * Math.pow(1.5, i)); ally.length = window.tuning?.SIZE?.playerLength?.[cls] || 170;
  }
  function hostTick() {
    if (!ally) return;
    const P = engine.player;
    if (ally.down > 0) { if (--ally.down === 0) { ally.hp = ally.max; ally.x = P.x + 160; ally.y = P.y + 120; ally.vx = ally.vy = 0; send({ t: 'event', what: 'rebuilt' }); } }
    else {
      ally.vx = (ally.vx + guestIn.ax * CFG.accel) * CFG.damping; ally.vy = (ally.vy + guestIn.ay * CFG.accel) * CFG.damping; ally.x += ally.vx; ally.y += ally.vy;
      ally.angle = Math.atan2(guestIn.aimY - ally.y, guestIn.aimX - ally.x);
      if (guestIn.fire && ++ally.t % CFG.fireEvery === 0) for (const w of ally.guns) {
        const def = WEAPON_TYPES[w] || {}, spd = typeof weaponSpeed === 'function' ? weaponSpeed(w) : 18, a = ally.angle, dmg = (window.arsenal?.dps?.(w) || 40) * CFG.fireEvery / 60;
        const q = new Projectile(ally.x + Math.cos(a) * ally.length * 0.4, ally.y + Math.sin(a) * ally.length * 0.4, Math.cos(a) * spd, Math.sin(a) * spd, { color: '#7fe0ff', damage: dmg, radius: def.radius || 6, isPlayer: true, type: w });
        q.owner = 'guest'; engine.projectiles.push(q);
      }
      const r = ally.length * 0.3;
      for (let i = engine.projectiles.length - 1; i >= 0; i--) { const q = engine.projectiles[i]; if (!q.isPlayer && Math.hypot(q.x - ally.x, q.y - ally.y) < r + (q.radius || 4)) { ally.hp -= q.damage || 0; engine.projectiles.splice(i, 1); } }
      if (ally.hp <= 0) { ally.hp = 0; ally.down = CFG.rebuildFrames; try { particleSystem.spawnBubbleBurst(ally.x, ally.y, '#7fe0ff', 30); } catch (e) { } send({ t: 'event', what: 'down' }); }
    }
    if (++frame % CFG.snapEvery === 0) sendSnap();
  }
  function sendSnap() {
    const P = engine.player, ch = worldMap.getCurrentChamber();
    const en = engine.enemies.filter(e => e.hp > 0).map(e => { if (!e._cid) e._cid = nextId++; return [e._cid, Math.round(e.x), Math.round(e.y), +(e.angle || 0).toFixed(2), Math.round(e.hp), Math.round(e.maxHp || e.hp), e.tier || 1, e.archetype || 'stalker']; });
    const pr = engine.projectiles.slice(-120).map(q => [Math.round(q.x), Math.round(q.y), +(q.vx || 0).toFixed(1), +(q.vy || 0).toFixed(1), q.radius || 5, q.color || '#fff', q.isPlayer ? 1 : 0]);
    send({ t: 'snap', s: { sec: [galaxy.currentId, ch.gridX, ch.gridY], me: { x: Math.round(ally.x), y: Math.round(ally.y), a: +ally.angle.toFixed(2), hp: Math.round(ally.hp), max: ally.max, down: ally.down }, host: { x: Math.round(P.x), y: Math.round(P.y), a: +(P.angle || 0).toFixed(2), design: frame % 120 === 0 ? saveState.doc.design : undefined }, en, pr } });
  }
  // ---- guest: show the host's world, fly by sending input ----
  function guestTick() {
    if (!snap) return;
    const P = engine.player, s = snap;
    if (s.sec && (s.sec[0] !== galaxy.currentId || s.sec[1] !== worldMap.currentGridX || s.sec[2] !== worldMap.currentGridY)) { if (s.sec[0] !== galaxy.currentId) galaxy.enterSystemById(s.sec[0]); worldMap.currentGridX = s.sec[1]; worldMap.currentGridY = s.sec[2]; engine.enterChamber({ silent: true }); try { garage.closeMission?.(); } catch (e) { } engine.paused = false; }   // a sector card must not pause the friend: the host's game runs on
    P.x += (s.me.x - P.x) * 0.5; P.y += (s.me.y - P.y) * 0.5; P.vx = P.vy = 0; P.angle = s.me.a; P.iFrames = 2;
    const seen = new Set();
    for (const [id, x, y, a, hp, max, tier, arch] of s.en) {
      let e = proxies.get(id);
      if (!e) { e = new EnemyOrganism(x, y, { tier, archetype: arch }); e.update = () => { }; e._coopProxy = true; try { window.hostileSkins?.skin?.(e); } catch (err) { } proxies.set(id, e); }
      e.x += (x - e.x) * 0.5; e.y += (y - e.y) * 0.5; e.angle = a; e.hp = hp; e.maxHp = max; seen.add(id);
    }
    for (const id of [...proxies.keys()]) if (!seen.has(id)) proxies.delete(id);
    engine.enemies = [...proxies.values()]; engine.projectiles = [];
    shots = s.pr; if (s.host.design) remote = { design: s.host.design }; remote = { ...(remote || {}), x: s.host.x, y: s.host.y, a: s.host.a };
    if (++frame % CFG.inputEvery === 0) { const i = engine.input || {}; send({ t: 'in', ax: i.ax || 0, ay: i.ay || 0, aimX: i.aimX ?? P.x, aimY: i.aimY ?? P.y, fire: !!i.fire }); }
  }
  // ---- drawing: the other ship and (guest) the host's shots ----
  function spriteFor(key, design) { if (!design?.modular) return null; let s = sprites.get(key); if (s?.design === design) return s.c; const L = window.tuning?.SIZE?.playerLength?.[design.modular.hull] || 170; const c = window.topdownKit?.thumb?.(design.modular, Math.round(L), Math.round(L * 0.7), design.color || '#7fe0ff'); sprites.set(key, { design, c }); return c; }
  function drawShip(ctx, cam, x, y, a, design, label, key) {
    const c = spriteFor(key, design), z = cam.zoom || 1;
    ctx.save(); ctx.translate(x - cam.x, y - cam.y);
    if (c) { ctx.save(); ctx.rotate(a); ctx.drawImage(c, -c.width / 2, -c.height / 2); ctx.restore(); } else { ctx.fillStyle = '#7fe0ff'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = `600 ${12 / z}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#bdeeff'; ctx.fillText(label, 0, -(c ? c.height / 2 : 30) - 8 / z); ctx.restore();
  }
  function draw(ctx, cam) {
    if (role === 'host' && ally && !ally.down) drawShip(ctx, cam, ally.x, ally.y, ally.angle, ally.design, ally.name, 'ally');
    if (role === 'guest' && snap) {
      if (remote) drawShip(ctx, cam, remote.x, remote.y, remote.a, remote.design, 'HOST', 'host');
      ctx.save(); for (const [x, y, , , r, color] of shots) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x - cam.x, y - cam.y, r, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
    }
  }
  // ---- panel ----
  function el(tag, text, attrs = {}) { const e = document.createElement(tag); if (text != null) e.textContent = text; Object.assign(e, attrs); return e; }
  function openPanel() {
    if (!panel) {
      panel = el('dialog', null, { id: 'coop-panel' }); panel.className = 'menu-card';
      panel.style.cssText = 'max-width:min(560px,94vw);width:100%;color:#e2edee;background:#0b1820;border:1px solid #36505d;border-radius:8px;padding:18px';
      const stun = el('label'); const box = el('input', null, { type: 'checkbox', id: 'coop-stun' }); box.onchange = () => { settings().coopStun = box.checked; saveState.save(); }; stun.append(box, ' Find each other across networks (asks a public STUN server for your address; no game data passes through it)');
      const code = el('textarea', null, { id: 'coop-code', rows: 4, placeholder: 'Codes appear here, or paste the code you were sent' }); code.style.cssText = 'width:100%;font:11px monospace;margin:8px 0';
      const row = el('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
      const b = (t, id, fn) => { const x = el('button', t, { id, type: 'button' }); x.onclick = async () => { try { await fn(); } catch (err) { say(err.message); } }; row.append(x); return x; };
      b('Host: make invite', 'coop-host', async () => { code.value = await host(); });
      b('Host: paste answer and connect', 'coop-accept', async () => acceptAnswer(code.value));
      b('Join: paste invite, make answer', 'coop-join', async () => { code.value = await join(code.value); });
      b('Copy code', 'coop-copy', async () => { await navigator.clipboard?.writeText(code.value); say('Code copied.'); });
      b('Leave', 'coop-leave', async () => close());
      b('Close', 'coop-close', async () => panel.close());
      panel.append(el('h2', 'Co-op · connection codes'), el('p', 'Host: make an invite and send it to your friend; paste their answer back. Friend: paste the invite, make an answer, send it back. Browser to browser, no relay.'), stun, code, row, el('p', status, { id: 'coop-status' }));
      document.body.append(panel);
    }
    $('coop-stun').checked = !!settings().coopStun; $('coop-status').textContent = status; if (!panel.open) panel.showModal();
  }
  function install() {
    if (typeof engine === 'undefined' || typeof particleSystem === 'undefined' || !window.garage || !document.querySelector('#pause-menu .tm-doors')) { setTimeout(install, 80); return; }
    const door = el('button', 'Co-op · play with a friend', { id: 'btn-coop', type: 'button' }); door.className = 'tm-door'; door.onclick = () => { try { menu.resume?.(); } catch (e) { } openPanel(); };
    document.querySelector('#pause-menu .tm-doors').append(door);
    const update = engine.update; engine.update = function (...a) {
      if (role === 'guest' && connected()) { try { guestTick(); } catch (e) { console.warn('coop guest:', e.message); } }
      const r = update.apply(this, a);
      if (role === 'host' && connected() && !this.paused) { try { hostTick(); } catch (e) { console.warn('coop host:', e.message); } }
      return r;
    };
    // the guest's guns fire in the host's game, not locally
    const fire = engine.fireMountGroup; engine.fireMountGroup = function (...a) { if (role === 'guest' && connected()) return; return fire.apply(this, a); };
    // enemies go for the nearer ship
    const up = EnemyOrganism.prototype.update; EnemyOrganism.prototype.update = function (player, ...a) {
      if (role === 'host' && ally && !ally.down && connected() && Math.hypot(ally.x - this.x, ally.y - this.y) < Math.hypot(player.x - this.x, player.y - this.y)) { const proxy = Object.create(player); proxy.x = ally.x; proxy.y = ally.y; proxy.vx = ally.vx; proxy.vy = ally.vy; return up.call(this, proxy, ...a); }
      return up.call(this, player, ...a);
    };
    // personal loot: a kill the friend lands pays the friend's save, not the host's
    if (window.weaponFamilies?.hit) { const hit = weaponFamilies.hit; weaponFamilies.hit = function (p, e, ...a) { if (e && p?.isPlayer) e._lastBy = p.owner === 'guest' ? 'guest' : 'host'; return hit.call(this, p, e, ...a); }; }
    const kill = engine.killEnemy; engine.killEnemy = function (i, ...a) {
      const e = this.enemies[i], guestKill = role === 'host' && connected() && e?._lastBy === 'guest', before = hubs.metal, r = kill.call(this, i, ...a);
      if (guestKill) { const pay = Math.max(0, hubs.metal - before); hubs.metal = before; send({ t: 'reward', metal: pay || window.hubs?.bountyFor?.(e) || 0 }); }
      return r;
    };
    // while linked, cards must not freeze the shared world: the host's cards no longer pause, and the friend gets none
    // (their kills and rewards come from the host's game)
    for (const k of ['showReward', 'showMission']) { const f = garage[k]; if (typeof f !== 'function') continue; garage[k] = function (...a) { if (connected() && role === 'guest') return; const r = f.apply(this, a); if (connected()) engine.paused = false; return r; }; }
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, cam) => { paint(ctx, cam); try { draw(ctx, cam); } catch (e) { } };
    ready = true;
  }
  window.coop = { CFG, host, join, acceptAnswer, close, openPanel, encode, decode, get role() { return role; }, get connected() { return connected(); }, get ally() { return ally; }, get snap() { return snap; }, get proxies() { return proxies; }, get status() { return status; }, stats, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 600));
})();
