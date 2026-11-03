// Title screen: Continue, New Pilot (callsign and civilisation of origin), Load (three slots),
// Settings and Credits. The sector renders behind it; choosing a civilisation previews its starter hull.
import { RACE_CATALOG, RACE_ORDER, PANTHEON_CODEX } from '../data/ships/races.js';
import { listSlots, readSave, clearSave, SLOTS } from '../core/storage.js';
import { accentColor } from '../render/materials.js';

export function createTitle({ world, onPreviewCiv, onNewPilot, onContinue, onOpenSettings, onShowcase }) {
  const root = document.getElementById('boot');
  const $ = (s) => root.querySelector(s);
  const panes = [...root.querySelectorAll('[data-tpane]')];
  const show = (name) => {
    panes.forEach((p) => { p.hidden = p.dataset.tpane !== name; });
    // Pilot creation clears the upper screen so the chosen civilisation's hull is on display.
    root.classList.toggle('piloting', name === 'pilot');
    onShowcase?.(name === 'pilot');
  };
  let civ = world.pilot.civ || 'savanah';
  let ready = false;

  function refreshMain() {
    const { latest } = listSlots();
    const cont = $('[data-continue]');
    cont.hidden = !latest;
    if (latest) {
      const d = latest.data;
      cont.textContent = `CONTINUE · ${(d.pilot?.name || 'PILOT').toUpperCase()}`;
      cont.dataset.slot = latest.slot;
      const hull = world.fleet[d.pilot?.hullId]?.name || '';
      $('[data-boot-save]').textContent = `SLOT ${latest.slot} · ${RACE_CATALOG[d.pilot?.civ]?.name || ''} · ${hull.toUpperCase()} · ${d.wallet?.salvage ?? 0} SALVAGE · ${d.wallet?.research ?? 0} RESEARCH · ${new Date(d.savedAt).toLocaleString()}`;
    } else $('[data-boot-save]').textContent = '';
  }

  function renderSlots() {
    $('[data-slot-list]').innerHTML = listSlots().slots.map(({ slot, data: d }) => d
      ? `<div class="t-slot" data-load="${slot}"><b>${slot}</b><span>${(d.pilot?.name || 'PILOT').toUpperCase()} · ${RACE_CATALOG[d.pilot?.civ]?.name || ''}<small>${(world.fleet[d.pilot?.hullId]?.name || '').toUpperCase()} · ${d.wallet?.salvage ?? 0} salvage · ${d.wallet?.research ?? 0} research · ${new Date(d.savedAt).toLocaleString()}</small></span><button class="del" data-del="${slot}">ERASE</button></div>`
      : `<div class="t-slot" data-fresh="${slot}"><b>${slot}</b><span>EMPTY<small>start a new pilot here</small></span><span></span></div>`).join('');
  }

  function renderCivs() {
    $('[data-civ-list]').innerHTML = RACE_ORDER.map((r) => {
      const c = RACE_CATALOG[r], g = PANTHEON_CODEX[r] || {};
      return `<button class="t-civ${r === civ ? ' sel' : ''}" data-civ="${r}" style="--acc:#${accentColor(c.accent).toString(16).padStart(6, '0')}"><i style="color:var(--acc)">${g.glyph || '◆'}</i><b>${c.name.toUpperCase()}</b></button>`;
    }).join('');
    const c = RACE_CATALOG[civ], g = PANTHEON_CODEX[civ] || {};
    const hull = world.fleet[civ + '_starter'];
    $('[data-civ-detail]').innerHTML = `<h4>${c.name.toUpperCase()} · ${(g.godName || '').toUpperCase()}</h4>
      <em>${g.domain || ''}</em> · ${c.doctrine}<br>Starter hull: <b>${hull?.name || ''}</b>${g.quote ? `<q>${g.quote}</q>` : ''}`;
  }

  let slotForNew = 1;
  function openNewPilot(slot) {
    const { slots } = listSlots();
    slotForNew = slot ?? (slots.find((s) => !s.data)?.slot || 1);
    const taken = slots.find((s) => s.slot === slotForNew)?.data;
    $('[data-slot-note]').textContent = taken ? `SLOT ${slotForNew} · this replaces ${(taken.pilot?.name || 'the pilot').toUpperCase()}` : `SLOT ${slotForNew}`;
    renderCivs();
    onPreviewCiv(civ);
    show('pilot');
    $('[data-pilot-name]').focus();
  }

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-tback]')) { refreshMain(); show('main'); return; }
    if (t.closest('[data-newpilot]')) return openNewPilot();
    if (t.closest('[data-slots-open]')) { renderSlots(); show('slots'); return; }
    if (t.closest('[data-credits-open]')) return show('credits');
    if (t.closest('[data-title-settings]')) return onOpenSettings();
    const del = t.closest('[data-del]');
    if (del) { e.stopPropagation(); if (confirmErase(del)) { clearSave(Number(del.dataset.del)); renderSlots(); } return; }
    const load = t.closest('[data-load]');
    if (load && ready) return onContinue(Number(load.dataset.load), readSave(Number(load.dataset.load)), e);
    const fresh = t.closest('[data-fresh]');
    if (fresh) return openNewPilot(Number(fresh.dataset.fresh));
    const c = t.closest('[data-civ]');
    if (c) { civ = c.dataset.civ; renderCivs(); onPreviewCiv(civ); return; }
    if (t.closest('[data-continue]') && ready) { const slot = Number($('[data-continue]').dataset.slot); return onContinue(slot, readSave(slot), e); }
    if (t.closest('[data-launch]') && ready) return onNewPilot({ name: $('[data-pilot-name]').value.trim() || 'Pilot', civ, slot: slotForNew }, e);
  });
  // Erase needs a second click within three seconds (no browser dialogs).
  function confirmErase(btn) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1'; btn.textContent = 'CONFIRM';
    setTimeout(() => { delete btn.dataset.armed; btn.textContent = 'ERASE'; }, 3000);
    return false;
  }

  refreshMain();
  return {
    setReady() {
      ready = true;
      for (const b of root.querySelectorAll('[data-newpilot],[data-slots-open],[data-launch],[data-continue]')) b.disabled = false;
    },
    setStatus(text) { $('[data-boot-status]').textContent = text; },
    slotsAvailable: SLOTS.length,
  };
}
