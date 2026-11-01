// Sovereign Eclipse · Reforge. Boot: world (sim), renderer (view), input, HUD, fixed-step loop.
import { createWorld, stepWorld, getPlayer, cyclePlayerHull, startPilot } from './sim/world.js';
import { nearestHostile, findEntity, LOCK_RANGE, killShip } from './sim/combat.js';
import { createRenderer, QUALITY } from './render/renderer.js';
import { createInput } from './input/input.js';
import { createHud } from './ui/hud.js';
import { createShipwright } from './ui/shipwright.js';
import { createStation } from './ui/station.js';
import { createAtlasPanel } from './ui/atlas.js';
import { createPerfOverlay } from './ui/perf.js';
import { createMenu } from './ui/menu.js';
import { createAudio } from './audio/audio.js';
import { loadSettings, saveSettings } from './core/settings.js';
import { canDock } from './sim/shipwright.js';
import { nearbyGate, gateBlocker } from './sim/travel.js';
import { nearestWreck } from './sim/loss.js';
import { SECTORS } from './world/sectors.js';
import { serialize, restore } from './sim/save.js';
import { writeSave, exportSave } from './core/storage.js';
import { createTitle } from './ui/title.js';
import { loadEmbeddedModels } from './render/model-library.js';
import { startLoop } from './core/loop.js';

export const FORGE_VERSION = 'R0.17 · WRECKS';

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
// Graphics quality: ?quality= overrides, else the saved setting, else medium on touch and high elsewhere.
const settings = loadSettings();
const quality = [params.get('quality'), settings.quality, isTouch ? 'medium' : 'high'].find((k) => k && QUALITY[k]);
const view = createRenderer(document.getElementById('view'), world, { quality, capture: params.has('capture') });

// Dynamic resolution: drop render resolution when frames run slow, recover when there is headroom.
// Starts after a warm-up (first frames compile shaders and would read as slow).
const autoRes = { target: isTouch ? 30 : 50, slow: 0, fast: 0, acc: 0, frames: 0, warm: 6 };
function stepAutoRes(dt) {
  if (params.has('capture') || settings.resolution !== 'auto' || menu?.open) return;
  if ((autoRes.warm -= dt) > 0) return;
  autoRes.acc += dt; autoRes.frames++;
  if (autoRes.acc < 0.5) return;
  const fps = autoRes.frames / autoRes.acc;
  autoRes.acc = 0; autoRes.frames = 0;
  if (fps < autoRes.target - 4) { autoRes.fast = 0; if (++autoRes.slow >= 2) { autoRes.slow = 0; view.setResolutionScale(view.resolutionScale * 0.88); } }
  else if (fps > autoRes.target + 6) { autoRes.slow = 0; if (++autoRes.fast >= 6) { autoRes.fast = 0; view.setResolutionScale(view.resolutionScale + 0.06); } }
  else { autoRes.slow = 0; autoRes.fast = 0; }
}
addEventListener('keydown', (e) => {
  if (e.code !== 'F4') return;
  e.preventDefault();
  const keys = Object.keys(QUALITY);
  changeQuality(keys[(keys.indexOf(quality) + 1) % keys.length]);
});
const input = createInput(document.getElementById('view'), document.getElementById('touch'));
const hud = createHud(document.getElementById('hud'), world, view, (a) => input.push(a));
const perf = createPerfOverlay(view, params.has('perf'));
const atlas = createAtlasPanel(document.querySelector('[data-atlas]'), world, (a) => input.push(a));
const station = createStation(world, (a) => input.push(a));
const shipwright = createShipwright(document.getElementById('shipwright'), world, view, (a) => input.push(a), () => station.tab === 'shipwright');
document.querySelector('[data-dock]').addEventListener('click', () => input.push('dock'));
document.querySelector('[data-jump]').addEventListener('click', () => input.push('jump'));
document.querySelector('[data-loot]').addEventListener('click', () => input.push('loot'));
const stationLabel = () => world.sector.stationName || 'ASTERION FORGE';
document.querySelector('[data-version]').textContent = FORGE_VERSION;

function changeQuality(next) {
  settings.quality = next;
  saveSettings(settings);
  hud.toast(`GRAPHICS · ${next.toUpperCase()} · RELOADING`);
  setTimeout(() => { saveNow('quality'); location.reload(); }, 600);
}

let pendingStop = false;
let pendingCourse = null;
let lastUiSeq = 0;
let orders = [];

/** Preferred engagement range: the longest optimal among fitted guns. */
const engageRange = (p) => Math.max(500, ...p.weapons.map((w) => w.w.optimal * 0.9));

function handleAction(a) {
  const p = getPlayer(world);
  if (p.dead) return;
  if (typeof a === 'object') {
    switch (a.type) {
      case 'undock': case 'fit': case 'moveNode': case 'atlasSelect': case 'tune': case 'research':
      case 'buyHull': case 'board': case 'sellHull': case 'sellMat': case 'buyMat': case 'buyCover': orders.push(a); return;
      case 'navWreck': {
        const w = world.wrecks.find((x) => x.id === a.id);
        if (!w) return;
        orders.push({ type: 'nav', mode: 'approach', targetId: a.id, range: 200 });
        hud.toast(`APPROACHING WRECK · ${w.name.toUpperCase()} · LOOT WITH [V]`);
        return;
      }
      case 'courseTo': pendingCourse = a.id; hud.toast('COURSE SET · AUTOPILOT ENGAGES ON UNDOCK'); return;
      case 'navTarget': return handleAction(a.mode === 'range' ? 'keepRange' : a.mode);
      case 'navLandmark': {
        orders.push({ type: 'nav', mode: 'approach', targetId: a.id, range: 400 });
        hud.toast('APPROACHING ' + world.sector.landmarks[a.id].name.toUpperCase());
        return;
      }
      default: orders.push(a); return;
    }
  }
  // Firing with nothing locked locks the nearest target first, then fires once the lock completes.
  if ((a.startsWith('group:') || a === 'allGroups') && !p.docked) {
    const g = a === 'allGroups' ? null : a.slice(6);
    const locked = p.lock.targetId != null && findEntity(world, p.lock.targetId);
    if (!locked) {
      const t = nearestHostile(world, p, LOCK_RANGE);
      if (!t) { hud.toast(world.sector.drill ? 'NO TARGETS IN RANGE · DRILL DRONES NEAR ASTERION · HOSTILES AT THE CURRENT BREACH' : `NO TARGETS IN RANGE · HOSTILES AT THE ${world.sector.landmarks[world.op.target]?.name.toUpperCase() || 'OPERATION SITE'}`); return; }
      orders.push({ type: 'lock', targetId: t.id });
      if (g) orders.push({ type: 'group', group: g, active: true });
      else orders.push({ type: 'allGroups', active: true });
      hud.toast('LOCKING · GUNS FIRE WHEN LOCKED');
      return;
    }
    orders.push(g ? { type: 'group', group: g } : { type: 'allGroups' });
    return;
  }
  if (a.startsWith('groupAuto:')) { orders.push({ type: 'groupAuto', group: a.slice(10) }); return; }
  const target = p.lock.targetId != null ? findEntity(world, p.lock.targetId) : null;
  if (p.docked && !['help', 'chase'].includes(a)) return;
  switch (a) {
    case 'ping': orders.push({ type: 'ping' }); break;
    case 'atlas': {
      const el = document.querySelector('[data-atlas]');
      if (document.body.classList.contains('touch')) { el.classList.add('open'); el.classList.toggle('phone-open'); } else el.classList.toggle('open');
      break;
    }
    case 'dock':
      if (canDock(world, p)) orders.push({ type: 'dock' });
      else hud.toast(`DOCKING REFUSED · COME WITHIN 1.1 KM OF ${stationLabel()}, NO HOSTILES NEAR`);
      break;
    case 'loot': orders.push({ type: 'loot' }); break;
    case 'jump': {
      if (p.jump) { orders.push({ type: 'cancelJump' }); hud.toast('JUMP CANCELLED'); break; }
      const gate = nearbyGate(world, p);
      if (gate) { orders.push({ type: 'gateJump' }); break; }
      // The nav pick may still be queued this frame (click then J), so read the newest order first.
      const queued = [...orders].reverse().find((o) => o.type === 'nav' && typeof o.targetId === 'string');
      const navId = queued?.targetId ?? (typeof p.nav.targetId === 'string' ? p.nav.targetId : null);
      if (navId && world.sector.landmarks[navId]) orders.push({ type: 'zjJump', targetId: navId });
      else hud.toast('PICK A LANDMARK IN THE OVERVIEW, THEN JUMP [J] · OR FLY TO A GATE');
      break;
    }
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

let lootUiKey = '';
function updateLootButton(p) {
  const w = !p.docked && !p.dead ? nearestWreck(world, p) : null;
  const mats = w ? Object.values(w.loot.materials).reduce((a, b) => a + b, 0) : 0;
  const label = w ? `LOOT ${w.player ? 'YOUR WRECK' : 'WRECK'} · ${w.loot.salvage} SALVAGE${mats ? ` + ${mats} MAT` : ''}` : '';
  if (label === lootUiKey) return;
  lootUiKey = label;
  document.querySelector('[data-loot]').classList.toggle('show', !!w);
  document.querySelector('[data-loot-touch]').classList.toggle('show', !!w);
  document.querySelector('[data-loot-label]').textContent = label;
}
let jumpUiKey = '';
function updateJumpButton(p) {
  const btn = document.querySelector('[data-jump]'), touch = document.querySelector('[data-jump-touch]');
  let label = '', show = false;
  if (!p.docked && !p.dead) {
    if (p.jump) { show = true; label = 'CANCEL JUMP'; }
    else {
      const gate = nearbyGate(world, p);
      if (gate) { show = true; const why = gateBlocker(world, gate); label = why ? `${gate.lm.name.toUpperCase()} · ${why}` : `JUMP THROUGH ${gate.lm.name.toUpperCase()} → ${SECTORS[gate.to].name}`; }
      else if (typeof p.nav.targetId === 'string' && world.sector.landmarks[p.nav.targetId]) { show = true; label = `ZJ JUMP · ${world.sector.landmarks[p.nav.targetId].name.toUpperCase()}`; }
    }
  }
  const k = show + label + world.sector.id;
  if (k === jumpUiKey) return;
  jumpUiKey = k;
  btn.classList.toggle('show', show);
  btn.classList.toggle('spooling', !!p.jump);
  touch.classList.toggle('show', show);
  btn.querySelector('[data-jump-label]').textContent = label;
  document.querySelector('[data-dock-label]').textContent = 'DOCK AT ' + stationLabel().split(' ')[0];
  document.querySelector('[data-ov-sector]').textContent = world.sector.name;
  document.querySelector('[data-death-station]').textContent = stationLabel();
}

// The sector renders behind the title screen; the simulation waits for the pilot.
let launched = params.has('capture') || params.has('autolaunch');
let activeSlot = 1;
function launch(e) {
  if (e?.pointerType === 'touch') document.body.classList.add('touch');
  launched = true;
  audio.start();
  view.rig.showcase = false;
  document.body.classList.remove('titling');
  document.getElementById('boot').classList.add('done');
  const canvas = document.getElementById('view');
  canvas.focus({ preventScroll: true });
  try { window.focus(); } catch {}
}

const title = createTitle({
  world,
  onPreviewCiv: (civ) => { if (!launched) startPilot(world, { name: world.pilot.name, civ }); },
  onNewPilot: ({ name, civ, slot }, e) => {
    startPilot(world, { name, civ });
    activeSlot = slot;
    launch(e);
    saveNow('new');
    hud.toast(`WELCOME, ${world.pilot.name.toUpperCase()} · ${world.fleet[civ + '_starter'].name.toUpperCase()} READY`);
  },
  onContinue: (slot, data, e) => {
    try { restore(world, data); activeSlot = slot; launch(e); hud.toast(`PILOT RESTORED · ${world.pilot.name.toUpperCase()}`); }
    catch (err) { document.querySelector('[data-boot-save]').textContent = 'SAVE COULD NOT LOAD: ' + err.message; }
  },
  onOpenSettings: () => menu.setOpen(true, 'settings'),
  onShowcase: (on) => { view.rig.showcase = on; },
});
document.body.classList.toggle('titling', !launched);
// Touch is detected on the first tap of any title button.
document.getElementById('boot').addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch'); });
document.querySelector('[data-import]').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try { restore(world, JSON.parse(await f.text())); launch(); hud.toast('SAVE IMPORTED'); saveNow('import'); }
  catch (err) { document.querySelector('[data-boot-save]').textContent = 'IMPORT FAILED: ' + err.message; }
});

const savedEl = document.querySelector('[data-saved]'), warnEl = document.querySelector('[data-save-warn]');
let saveTimer = 60;
function saveNow(why) {
  if (!launched || params.has('capture') || getPlayer(world).dead) return;
  const res = writeSave(serialize(world), activeSlot);
  saveTimer = 60;
  if (res.ok) {
    warnEl.classList.remove('show');
    savedEl.textContent = 'SAVED';
    savedEl.style.opacity = 1;
    setTimeout(() => { savedEl.style.opacity = 0.35; }, 1500);
  } else {
    warnEl.querySelector('span').textContent = `SAVE NOT STORED · ${res.reason}`;
    warnEl.classList.add('show');
  }
}
document.querySelector('[data-save-now]').addEventListener('click', () => saveNow('manual'));
document.querySelector('[data-export]').addEventListener('click', async () => hud.toast(await exportSave(serialize(world))));
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); saveNow('manual'); } });
addEventListener('pagehide', () => saveNow('leave'));

let paused = false;
const audio = createAudio(world, view, settings);
// Browsers allow sound only after a gesture: start on the first tap or key, resume if suspended.
addEventListener('pointerdown', () => launched && audio.start());
addEventListener('keydown', (e) => {
  if (!launched) return;
  audio.start();
  if (e.code === 'KeyN') { settings.muted = !settings.muted; saveSettings(settings); audio.applyVolumes(); hud.toast(settings.muted ? 'SOUND OFF' : 'SOUND ON'); }
});
const menu = createMenu({
  settings, view, audio,
  onPause: (v) => { paused = v; },
  onSave: () => { saveNow('manual'); hud.toast('SAVED'); },
  onQuit: () => { saveNow('quit'); location.reload(); },
  onQualityChange: changeQuality,
  onEscape: () => {
    const p = getPlayer(world);
    if (p.lock?.targetId == null || p.docked) return false;
    input.push('unlock');
    return true;
  },
});

startLoop({
  step(dt) {
    if (!launched || paused) return;
    for (const a of input.takeActions()) handleAction(a);
    const cmd = input.shipCommand();
    if (pendingStop) { cmd.stop = true; pendingStop = false; }
    if (orders.length) { cmd.orders = orders; orders = []; }
    stepWorld(world, { [world.playerId]: cmd }, dt);
  },
  render(alpha, frameDt) {
    const c = input.takeCamera();
    view.rig.orbit(c.dx * settings.camSensitivity, c.dy * settings.camSensitivity * (settings.invertY ? -1 : 1));
    view.rig.zoom(c.zoom);
    const p = getPlayer(world);
    document.body.classList.toggle('docked', !!p.docked);
    view.rig.showroom = !!p.docked;
    view.render(alpha, frameDt);
    if (!paused) audio.update(frameDt);
    stepAutoRes(frameDt);
    perf.update(frameDt);
    hud.update(frameDt, view.rig);
    station.update();
    shipwright.update();
    atlas.update(performance.now() / 1000);
    const dockable = !p.docked && canDock(world, p);
    document.querySelector('[data-dock]').classList.toggle('show', dockable);
    document.querySelector('[data-dock-touch]').classList.toggle('show', dockable);
    updateJumpButton(p);
    updateLootButton(p);
    if (launched && (saveTimer -= frameDt) <= 0) saveNow('timer');
    for (const ev of world.events) {
      if (ev.seq <= lastUiSeq) continue;
      lastUiSeq = ev.seq;
      if (['docked', 'undocked', 'opComplete', 'sigResolved', 'recovered', 'sectorChanged', 'looted', 'covered'].includes(ev.type)) saveNow(ev.type);
      if (ev.type === 'fitRefused') shipwright.showMessage('CANNOT FIT · ' + ev.reason, true);
      else if (ev.type === 'fitted') shipwright.showMessage(ev.turretId ? 'GUN FITTED' : 'NODE CLEARED');
      else if (ev.type === 'nodeMoved') shipwright.showMessage('HARDPOINT MOVED');
      else if (ev.type === 'docked') hud.toast(`DOCKED · ${stationLabel()} · REPAIRED`);
      else if (ev.type === 'jumpSpool') hud.toast(ev.kind === 'gate' ? `GATE TRANSIT · ${ev.name} · ${Math.round(ev.spool)}s` : `ZJ DRIVE SPOOLING · ${ev.name.toUpperCase()} · ${ev.spool.toFixed(1)}s`);
      else if (ev.type === 'looted') hud.toast(`LOOTED ${ev.name.toUpperCase()} · +${ev.salvage} SALVAGE${Object.keys(ev.materials).length ? ' · ' + Object.entries(ev.materials).map(([k, n]) => `${n} ${k.replace('_', ' ').toUpperCase()}`).join(' · ') : ''}`);
      else if (ev.type === 'lootRefused') hud.toast('LOOT · ' + ev.reason);
      else if (ev.type === 'hullLost') hud.toast(ev.payout ? `${ev.name.toUpperCase()} LOST WITH ITS GUNS · COVENANT ${ev.covered ? 'FULL' : 'BASIC'} COVER PAYS ${ev.payout}` : `${ev.name.toUpperCase()} LOST · THE COVENANT REISSUES STARTER HULLS FREE`);
      else if (ev.type === 'covered') hud.toast(`${ev.name.toUpperCase()} FULLY COVERED · −${ev.cost} SALVAGE`);
      else if (ev.type === 'jumped') hud.toast(`ZJ JUMP COMPLETE · ${ev.name.toUpperCase()}`);
      else if (ev.type === 'jumpRefused') hud.toast('JUMP · ' + ev.reason);
      else if (ev.type === 'sectorChanged') hud.toast(`ENTERED ${ev.name} · SECURITY ${SECTORS[ev.sector].security.level.toFixed(1)} ${ev.security}`);
      else if (ev.type === 'undocked') {
        hud.toast('UNDOCKED · LAUNCH RAIL CLEAR');
        if (pendingCourse) { orders.push({ type: 'nav', mode: 'approach', targetId: pendingCourse, range: 400 }); pendingCourse = null; }
      }
      else if (ev.type === 'researched') hud.toast(`RESEARCH COMPLETE · ${ev.name.toUpperCase()}`);
      else if (ev.type === 'hullBought') hud.toast(`${ev.name.toUpperCase()} DELIVERED TO YOUR HANGAR · −${ev.price} SALVAGE`);
      else if (ev.type === 'boarded') hud.toast(`BOARDED ${ev.name.toUpperCase()}`);
      else if (ev.type === 'hullSold') hud.toast(`${ev.name.toUpperCase()} SOLD · +${ev.value} SALVAGE`);
      else if (ev.type === 'sold') hud.toast(`SOLD ${ev.n} · +${ev.total} SALVAGE`);
      else if (ev.type === 'bought') hud.toast(`BOUGHT ${ev.n} · −${ev.total} SALVAGE`);
      else if (ev.type === 'tradeRefused') hud.toast(ev.reason);
      else if (ev.type === 'sigStage') hud.toast(`SIGNATURE ${world.atlas.sigs[ev.id].def.code} · ${ev.stage.toUpperCase()}${ev.name ? ' · ' + ev.name : ''}`);
      else if (ev.type === 'sigResolved') hud.toast(`${ev.name} RESOLVED · +${ev.research} RESEARCH`);
      else if (ev.type === 'pingRefused') hud.toast('PING · ' + ev.reason);
      else if (ev.type === 'drillKill') hud.toast(`DRILL DRONE DOWN · +${ev.reward} SALVAGE`);
    }
  },
});

// Ship models parse before launch so every hull flies with its authored model from the first frame.
title.setStatus('ASSEMBLING HULLS…');
loadEmbeddedModels().then((errs) => {
  if (errs.length) console.warn('model load', errs);
  title.setStatus('NARAKA VEIL · ASTERION FORGE · LAUNCH RAIL READY');
  title.setReady();
  window.__SE.modelsReady = true;
  if (launched) launch();
});
// Hook for the smoke check and screenshot script.
window.__SE = { world, view, getPlayer: () => getPlayer(world), version: FORGE_VERSION, kill: (id) => killShip(world, findEntity(world, id), -1) };
