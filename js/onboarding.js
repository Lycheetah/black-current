/* ONBOARDING · first upgrade (overnight run step 16). The first ten minutes: build (starter-journey.js), first fight
 * and dock (first-expedition.js), first upgrade (here), first jump (saga.js Act I, "Beyond Asterion"). Each has one
 * clear prompt. The gap was the first upgrade: nothing pointed a new pilot at the upgrade path, so the first gun rank
 * (20 metal for a Novice gun) could wait hours. Once the first expedition is done and no gun has been ranked, a
 * NEXT STEP line sits on top of the contracts card, and the dock shows a one-tap "Rank up" door. Both vanish for good
 * after the first rank-up. */
(() => {
  'use strict';
  let ready = false, cue = null, door = null, sig = '';
  const $ = id => document.getElementById(id);
  const doc = () => { let d = saveState.doc.onboarding; if (!d || d.v !== 1) d = saveState.doc.onboarding = { v: 1, rankedAt: 0 }; return d; };
  const ranked = () => Object.values(window.gunRanks?.doc?.().ranks || {}).some(r => r >= 2);
  const expeditionDone = () => window.firstExpedition?.state?.().stage === 'done';
  // the gun to rank first: the cheapest one you fly (normally the Novice gun)
  function gun() { const list = gunRanks.fitted().filter(w => gunRanks.cost(w) != null); return list.sort((a, b) => gunRanks.cost(a) - gunRanks.cost(b))[0] || null; }
  function pending() { if (doc().rankedAt || !saveState.doc.launched || !expeditionDone()) return false; if (ranked()) { doc().rankedAt = Date.now(); saveState.save(); return false; } return !!gun(); }
  function rankNow() {
    const w = gun(); if (!w) return false;
    if (!hubs.docked) { garage.banner('FIRST UPGRADE · dock at a station (E at the berth) to rank up your gun', 'bad'); return false; }
    const ok = gunRanks.raise(w); if (ok) { doc().rankedAt = Date.now(); saveState.save(); garage.banner(`FIRST UPGRADE · ${WEAPON_TYPES[w].title} rank 2 · more ranks on the upgrade path, up to 10`, 'good'); }
    else garage.banner(`FIRST UPGRADE · needs ${gunRanks.cost(w)} metal; kills and the first expedition pay it`, 'bad');
    paint(); return ok;
  }
  function paint() {
    const on = pending(), w = on && gun(), price = w ? gunRanks.cost(w) : 0, name = w ? WEAPON_TYPES[w].title : '';
    const now = [on, w, price, hubs.docked, hubs.metal >= price].join('|'); if (now === sig && (!cue || cue.isConnected)) return; sig = now;
    const host = $('contracts');
    if (host && (!cue || !host.contains(cue))) {
      cue = document.createElement('section'); cue.id = 'onboard-cue';
      cue.style.cssText = 'padding:6px 0 10px;margin-bottom:6px;border-bottom:1px solid #70623e;font:12px/1.45 system-ui;color:#ead29d;cursor:pointer';
      cue.append(document.createElement('strong'), document.createElement('p'));
      cue.querySelector('p').style.cssText = 'font:11px/1.45 system-ui;color:#b5c9bd;margin:2px 0 0';
      cue.onclick = rankNow; host.prepend(cue);
    }
    if (cue) {
      cue.hidden = !on;
      cue.querySelector('strong').textContent = 'NEXT STEP · your first upgrade';
      cue.querySelector('p').textContent = on ? `Rank up your ${name} at the dock: ${price} metal, +6% damage.${hubs.docked ? ' Tap here.' : ' Dock (E at the berth), then tap here.'}` : '';
    }
    // a gold tile at the front of the station services grid (station-grid.js), the first thing a docked pilot sees
    const grid = $('station-services');
    if (grid && (!door || !grid.contains(door))) {
      door = document.createElement('button'); door.type = 'button'; door.id = 'onboard-rank-door'; door.dataset.stationService = 'first-upgrade'; door.onclick = rankNow;
      door.style.cssText = 'border-color:#f0c860;box-shadow:0 0 0 1px #f0c86055 inset';
      const icon = document.createElement('span'); icon.className = 'station-icon'; icon.textContent = '▲';
      door.append(icon, document.createElement('strong'), document.createElement('small')); grid.prepend(door);
    }
    if (door) {
      door.hidden = !on; door.disabled = on && hubs.metal < price;
      door.querySelector('strong').textContent = on ? `Rank up ${name}` : ''; door.querySelector('small').textContent = on ? `First upgrade · ${price} metal · +6% damage` : '';
      door.setAttribute('aria-label', on ? `Rank up ${name} for ${price} metal` : '');
    }
  }
  function install() {
    if (!window.gunRanks?.ready || !window.firstExpedition?.ready || typeof engine === 'undefined' || !$('contracts')) { setTimeout(install, 80); return; }
    const open = hubs.openDock; hubs.openDock = function (...a) { const r = open.apply(this, a); try { paint(); } catch (e) { } return r; };
    const close = hubs.closeDock; hubs.closeDock = function (...a) { const r = close.apply(this, a); try { paint(); } catch (e) { } return r; };
    new MutationObserver(() => { if (cue && !$('contracts').contains(cue)) { cue = null; sig = ''; paint(); } }).observe($('contracts'), { childList: true });
    setInterval(() => { try { paint(); } catch (e) { } }, 500);
    paint(); ready = true;
  }
  window.onboarding = { pending, rankNow, paint, gun, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 450));
})();
