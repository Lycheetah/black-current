// Sovereign Eclipse · Reforge. Boot: world (sim), renderer (view), input, HUD, fixed-step loop.
import { createWorld, stepWorld, getPlayer, cyclePlayerHull } from './sim/world.js';
import { nearestHostile, findEntity, LOCK_RANGE } from './sim/combat.js';
import { createRenderer } from './render/renderer.js';
import { createInput } from './input/input.js';
import { createHud } from './ui/hud.js';
import { createShipwright } from './ui/shipwright.js';
import { canDock } from './sim/shipwright.js';
import { startLoop } from './core/loop.js';

export const FORGE_VERSION = 'R0.3 · SHIPWRIGHT';

// Any failure is shown on screen: a silent black page tells nobody anything.
function showFatal(msg) {
  let el = document.getElementById('fatal');
  if (!el) { el = document.createElement('div'); el.id = 'fatal'; document.body.appendChild(el); }
  el.textContent = 'SOVEREIGN ECLIPSE hit an error:\n' + msg;
}
addEventListener('error', (e) => showFatal(e.message || String(e)));
addEventListener('unhandledrejection', (e) => showFatal(String(e.reason?.stack || e.reason)));

const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
// A real touch anywhere switches on the touch controls, whatever the device claims.
addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!webglOk()) {
  document.querySelector('[data-boot-err]').textContent = 'This browser has WebGL switched off or unavailable, so the 3D view cannot start. Try Chrome, Safari or Firefox with hardware acceleration on.';
  throw new Error('WebGL unavailable');
}

const world = createWorld({ hullId: params.get('hull') || 'savanah_starter' });
const view = createRenderer(document.getElementById('view'), world, {
  lowPower: isTouch || params.has('low'),
  capture: params.has('capture'),
});
const input = createInput(document.getElementById('view'), document.getElementById('touch'));
const hud = createHud(document.getElementById('hud'), world, view, (a) => input.push(a));
const shipwright = createShipwright(document.getElementById('shipwright'), world, view, (a) => input.push(a));
document.querySelector('[data-dock]').addEventListener('click', () => input.push('dock'));
document.querySelector('[data-version]').textContent = FORGE_VERSION;

let pendingStop = false;
let lastUiSeq = 0;
let orders = [];

/** Preferred engagement range: the longest optimal among fitted guns. */
const engageRange = (p) => Math.max(500, ...p.weapons.map((w) => w.w.optimal * 0.9));

function handleAction(a) {
  const p = getPlayer(world);
  if (p.dead) return;
  if (typeof a === 'object') {
    switch (a.type) {
      case 'undock': case 'fit': case 'moveNode': orders.push(a); return;
      case 'navTarget': return handleAction(a.mode === 'range' ? 'keepRange' : a.mode);
      case 'navLandmark': {
        orders.push({ type: 'nav', mode: 'approach', targetId: a.id, range: 400 });
        hud.toast('APPROACHING ' + world.sector.landmarks[a.id].name.toUpperCase());
        return;
      }
      default: orders.push(a); return;
    }
  }
  if (a.startsWith('group:')) { orders.push({ type: 'group', group: a.slice(6) }); return; }
  if (a.startsWith('groupAuto:')) { orders.push({ type: 'groupAuto', group: a.slice(10) }); return; }
  const target = p.lock.targetId != null ? findEntity(world, p.lock.targetId) : null;
  if (p.docked && !['help', 'chase'].includes(a)) return;
  switch (a) {
    case 'dock':
      if (canDock(world, p)) orders.push({ type: 'dock' });
      else hud.toast('DOCKING REFUSED · COME WITHIN 1.1 KM OF ASTERION, NO HOSTILES NEAR');
      break;
    case 'stop': pendingStop = true; orders.push({ type: 'nav', mode: 'manual' }); hud.toast('ALL STOP'); break;
    case 'chase': view.rig.chase = !view.rig.chase; break;
    case 'help': hud.toggleHelp(); break;
    case 'level': p.autoLevel = !p.autoLevel; hud.toast(p.autoLevel ? 'AUTO-LEVEL ON' : 'AUTO-LEVEL OFF'); break;
    case 'lockNearest': {
      const t = nearestHostile(world, p, LOCK_RANGE);
      if (t) orders.push({ type: 'lock', targetId: t.id }); else hud.toast('NO HOSTILES IN LOCK RANGE');
      break;
    }
    case 'unlock': orders.push({ type: 'unlock' }); break;
    case 'allGroups': orders.push({ type: 'allGroups' }); break;
    case 'orbit': case 'keepRange': case 'approach':
      if (!target) { hud.toast('LOCK A TARGET FIRST'); break; }
      orders.push({ type: 'nav', mode: a === 'keepRange' ? 'range' : a, targetId: target.id, range: a === 'approach' ? 300 : engageRange(p) });
      break;
    case 'hullNext': case 'hullPrev': case 'raceNext': case 'racePrev': {
      const h = cyclePlayerHull(world, a.endsWith('Next') ? 1 : -1, a.startsWith('hull'));
      hud.toast(`FORGE TEST HULL · ${h.name.toUpperCase()} · ${h.className.toUpperCase()}`);
      break;
    }
  }
}

// The sector renders behind the launch screen; the simulation waits for the pilot.
let launched = params.has('capture') || params.has('autolaunch');
const launchBtn = document.querySelector('[data-launch]');
function launch(e) {
  if (e?.pointerType === 'touch') document.body.classList.add('touch');
  launched = true;
  document.getElementById('boot').classList.add('done');
  const canvas = document.getElementById('view');
  canvas.focus({ preventScroll: true });
  try { window.focus(); } catch {}
}
launchBtn.addEventListener('pointerup', launch);
launchBtn.addEventListener('click', () => { if (!launched) launch(); });
launchBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') launch(); });

startLoop({
  step(dt) {
    if (!launched) return;
    for (const a of input.takeActions()) handleAction(a);
    const cmd = input.shipCommand();
    if (pendingStop) { cmd.stop = true; pendingStop = false; }
    if (orders.length) { cmd.orders = orders; orders = []; }
    stepWorld(world, { [world.playerId]: cmd }, dt);
  },
  render(alpha, frameDt) {
    const c = input.takeCamera();
    view.rig.orbit(c.dx, c.dy);
    view.rig.zoom(c.zoom);
    const p = getPlayer(world);
    document.body.classList.toggle('docked', !!p.docked);
    view.rig.showroom = !!p.docked;
    view.render(alpha, frameDt);
    hud.update(frameDt, view.rig);
    shipwright.update();
    const dockable = !p.docked && canDock(world, p);
    document.querySelector('[data-dock]').classList.toggle('show', dockable);
    document.querySelector('[data-dock-touch]').classList.toggle('show', dockable);
    for (const ev of world.events) {
      if (ev.seq <= lastUiSeq) continue;
      lastUiSeq = ev.seq;
      if (ev.type === 'fitRefused') shipwright.showMessage('CANNOT FIT · ' + ev.reason, true);
      else if (ev.type === 'fitted') shipwright.showMessage(ev.turretId ? 'GUN FITTED' : 'NODE CLEARED');
      else if (ev.type === 'nodeMoved') shipwright.showMessage('HARDPOINT MOVED');
      else if (ev.type === 'docked') hud.toast('DOCKED · ASTERION FORGE · REPAIRED');
      else if (ev.type === 'undocked') hud.toast('UNDOCKED · LAUNCH RAIL CLEAR');
    }
  },
});

document.querySelector('[data-boot-status]').textContent = 'NARAKA VEIL · ASTERION FORGE · LAUNCH RAIL READY';
launchBtn.disabled = false;
if (launched) launch();
// Hook for the smoke check and screenshot script.
window.__SE = { world, view, getPlayer: () => getPlayer(world), version: FORGE_VERSION };
