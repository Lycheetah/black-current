/* JUMP GATES (overnight run step 10). Mac, 2026-10-29: "add auto pilot and jump gates … and buildable jump gates".
 * A JUMP GATE is a structure (js/hubs.js KINDS.gate) you build anywhere outside a hub. Each new gate links to your oldest
 * unlinked gate; a linked pair is a private road. Fly into either gate and you come out beside the other, in another
 * system or across the same one. Gates are ordinary structures, so raids can break them (a broken gate unlinks its
 * partner, which then waits for your next gate). The swirl and a label show where each one leads. */
(() => {
  'use strict';
  const CFG = { enter: 120, exitOffset: 360, rearm: 260 };
  let ready = false, armed = true, jumps = 0;
  const TAU = Math.PI * 2;
  const gates = () => hubs.list().filter(s => s.kind === 'gate' && s.hp > 0);
  const byId = id => gates().find(g => g.id === id);
  const sysName = id => window.galaxy?.data?.byId[id]?.name || (id === 'home' ? 'ASTERION FORGE' : id);
  const scale = () => Math.max(1, window.roomScale?.stationScale?.() || 1);
  function relink() {
    // drop links to gates that no longer exist, then pair the oldest unlinked gates
    let changed = false; const all = gates();
    for (const g of all) if (g.link && !byId(g.link)) { delete g.link; changed = true; }
    const free = all.filter(g => !g.link);
    for (let i = 0; i + 1 < free.length; i += 2) { free[i].link = free[i + 1].id; free[i + 1].link = free[i].id; changed = true;
      garage.banner(`GATE LINKED · ${sysName(free[i].sys)} ${free[i].gx},${free[i].gy} ⇄ ${sysName(free[i + 1].sys)} ${free[i + 1].gx},${free[i + 1].gy}`, 'good'); }
    if (changed) saveState.save();
    return changed;
  }
  function here() { const ch = worldMap.getCurrentChamber(), sys = galaxy.currentId; return gates().filter(g => g.sys === sys && g.gx === ch.gridX && g.gy === ch.gridY); }
  function cross(g) {
    const to = byId(g.link); if (!to) return false;
    const P = engine.player;
    if (to.sys !== galaxy.currentId) galaxy.enterSystemById(to.sys);
    worldMap.currentGridX = to.gx; worldMap.currentGridY = to.gy;
    engine.enterChamber({ silent: true });
    // come out on the inward side of the partner gate, drifting away from it
    const a = Math.atan2(-to.y, -to.x) || 0, off = CFG.exitOffset * scale();
    P.x = to.x + Math.cos(a) * off; P.y = to.y + Math.sin(a) * off; P.vx = Math.cos(a) * 5; P.vy = Math.sin(a) * 5;
    P.iFrames = Math.max(P.iFrames || 0, 60); engine.projectiles.length = 0;
    engine.camera.x = P.x - engine.viewportWidth / engine.camera.zoom / 2; engine.camera.y = P.y - engine.viewportHeight / engine.camera.zoom / 2;
    armed = false; jumps++; saveState.save();
    try { soundEngine.playAbility('emp'); } catch (e) { }
    garage.banner(`GATE · ${sysName(to.sys)} · sector ${to.gx},${to.gy}`, 'good');
    return true;
  }
  let sig = '', clock = 0;
  function tick() {
    // new or broken gates relink (the build panel calls hubs' own build; raids remove structures directly)
    if (++clock % 30 === 0) { const now = gates().map(g => g.id + ':' + (g.link || '')).join('|'); if (now !== sig) { relink(); sig = gates().map(g => g.id + ':' + (g.link || '')).join('|'); } }
    if (engine.paused || engine.mapOpen || engine.player.dead || window.derelicts?.active || window.rifts?.active) return;
    const P = engine.player, list = here(); if (!list.length) { armed = true; return; }
    const reach = CFG.enter * scale(), d = Math.min(...list.map(g => Math.hypot(g.x - P.x, g.y - P.y)));
    if (!armed) { if (d > CFG.rearm * scale()) armed = true; return; }
    const g = list.find(g => g.link && Math.hypot(g.x - P.x, g.y - P.y) < reach); if (g) cross(g);
  }
  function draw(ctx, camera) {
    const list = here(); if (!list.length) return; const now = performance.now() / 1000, z = camera.zoom || 1, k = scale();
    for (const g of list) {
      const x = g.x - camera.x, y = g.y - camera.y, to = g.link && byId(g.link), R = 96 * k;
      ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = to ? `rgba(255,211,106,${0.5 - i * 0.12})` : 'rgba(150,150,150,.25)'; ctx.lineWidth = (3 - i) / z; ctx.beginPath(); ctx.arc(0, 0, R * (1 - i * 0.18), now * (0.8 + i * 0.5), now * (0.8 + i * 0.5) + TAU * 0.78); ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.font = `600 ${12 / z}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = to ? '#ffd36a' : '#9aa5ad';
      ctx.fillText(to ? `GATE → ${sysName(to.sys)} ${to.gx},${to.gy}` : 'GATE · build a second to link', x, y - R - 14 / z); ctx.restore();
    }
  }
  function install() {
    if (!window.hubs?.list || !window.galaxy?.data || typeof engine === 'undefined' || typeof particleSystem === 'undefined') { setTimeout(install, 60); return; }
    const update = engine.update; engine.update = function (...a) { const r = update.apply(this, a); try { tick(); } catch (e) { console.warn('gates:', e.message); } return r; };
    const paint = particleSystem.draw.bind(particleSystem); particleSystem.draw = (ctx, camera) => { paint(ctx, camera); try { draw(ctx, camera); } catch (e) { } };
    relink(); ready = true;
  }
  window.jumpGates = { CFG, gates, relink, cross, here, get jumps() { return jumps; }, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 300));
})();
