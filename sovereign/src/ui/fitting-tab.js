// Fitting window (station tab): module browser · slot rack · live stats, EVE-style.
// Hovering a module previews every stat change before you fit it. Reads the world; fitting goes out as orders.
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { SLOT_TYPES, slotsFor, slotType, fitSummary, moduleBlocker, moduleCost, FITTABLE, MODULE_CATALOG, RUNTIME } from '../sim/fitting.js';

const fmt = (n) => Math.round(n).toLocaleString();
const TYPE_ICON = { weapon: '◎', defense: '⬡', drive: '➤', utility: '✦' };

/** Where a click on this module would put it: the selected slot if it matches, else the first empty matching slot. */
export function targetSlot(p, state, moduleId) {
  const m = MODULE_CATALOG[moduleId];
  const slots = slotsFor(p.hull).filter((s) => slotType(s) === m.slot);
  if (state.slot && slots.includes(state.slot)) return state.slot;
  return slots.find((s) => !p.modules[s]) || slots[0] || null;
}

function bar(label, used, max, unit = '') {
  const f = Math.min(1, used / Math.max(1, max)), over = used > max;
  return `<div class="ft-bar${over ? ' over' : f > 0.9 ? ' warn' : ''}"><span>${label}</span><u><i style="width:${(f * 100).toFixed(1)}%"></i></u><b>${fmt(used)} / ${fmt(max)}${unit}</b></div>`;
}

function delta(now, next, better = 'up', digits = 0) {
  if (next == null || Math.abs(next - now) < 0.05) return '';
  const up = next > now, good = better === 'up' ? up : !up;
  const d = next - now;
  return ` <em class="${good ? 'good' : 'bad'}">${up ? '▲' : '▼'} ${up ? '+' : ''}${digits ? d.toFixed(digits) : fmt(d)}</em>`;
}

export function fittingTab(world, p, state) {
  const slots = slotsFor(p.hull);
  const sum = fitSummary(p.hull, p.fit, p.modules);
  // Hover preview: the same summary with the hovered module dropped into its target slot.
  let prev = null;
  if (state.hover && MODULE_CATALOG[state.hover]) {
    const slot = targetSlot(p, state, state.hover);
    if (slot) prev = fitSummary(p.hull, p.fit, { ...p.modules, [slot]: state.hover });
  }
  const P = (k, f = (s) => s[k]) => (prev ? f(prev) : null);
  const capLine = (s) => (s.cap.lasts == null ? 'STABLE' : `LASTS ${s.cap.lasts}s`);

  // Module browser.
  const filter = state.filter || 'all';
  const chips = ['all', ...SLOT_TYPES.map((t) => t.type)].map((f) => `<button class="chip${f === filter ? ' on' : ''}" data-ft-filter="${f}">${f === 'all' ? 'ALL' : TYPE_ICON[f] + ' ' + f.toUpperCase()}</button>`).join('');
  const list = FITTABLE.map((id) => MODULE_CATALOG[id]).filter((m) => filter === 'all' || m.slot === filter)
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.cost - b.cost)
    .map((m) => {
      const slot = targetSlot(p, state, m.id);
      const why = slot ? moduleBlocker(world, p, slot, m.id) : 'NO SLOT ON THIS HULL';
      const cost = slot ? moduleCost(p.modules[slot], m.id) : m.cost;
      const active = RUNTIME[m.id];
      return `<div class="ft-mod${why ? ' blocked' : ''}${state.hover === m.id ? ' hov' : ''}" data-ft-mod="${m.id}">
        <div class="ft-mod-h"><b>${TYPE_ICON[m.slot]} ${m.name}</b><span>${m.cost ? fmt(m.cost) + ' SALVAGE' : 'FREE'}</span></div>
        <div class="ft-mod-s">${m.pg} PG · ${m.mass} t${active ? ` · <i>ACTIVE · ${active.label}</i>` : ''}</div>
        <div class="ft-mod-e">${m.effect || m.desc}</div>
        ${why ? `<div class="ft-why">${why}</div>` : `<div class="ft-go">FIT TO ${slot}${cost > 0 ? ' · −' + fmt(cost) : cost < 0 ? ' · +' + fmt(-cost) : ''}</div>`}
      </div>`;
    }).join('');

  // Slot rack.
  const rack = SLOT_TYPES.map((t) => {
    const mine = slots.filter((s) => slotType(s) === t.type);
    if (!mine.length) return '';
    return `<div class="ft-group"><h4>${TYPE_ICON[t.type]} ${t.name}</h4>${mine.map((s) => {
      const id = p.modules[s], m = id && MODULE_CATALOG[id];
      return `<div class="ft-slot${state.slot === s ? ' sel' : ''}${m ? ' full' : ''}" data-ft-slot="${s}">
        <span class="ft-slot-k">${s}</span><span class="ft-slot-n">${m ? m.name : 'EMPTY'}</span>
        ${m ? `<button class="ft-x" data-ft-unfit="${s}" title="Remove (half its price back)">✕</button>` : ''}</div>`;
    }).join('')}</div>`;
  }).join('');
  const guns = Object.entries(p.fit).filter(([, id]) => id).map(([bank, id]) => `<span>${bank.replace('WPN_', '')} · ${TURRET_CATALOG[id].name}</span>`).join('');

  // Saved fits for this hull.
  const fits = (world.fits || []).map((f, i) => ({ f, i })).filter(({ f }) => f.hullId === p.hullId);

  return `<div class="ft">
    <section class="ui-card ft-browser"><h3>MODULES</h3><div class="chips">${chips}</div><div class="ft-list" data-ft-list>${list}</div></section>
    <section class="ui-card ft-rack"><h3>${p.hull.name.toUpperCase()}</h3><div class="ui-sub">${p.hull.raceName} · ${p.hull.className} · ${slots.length} module slots</div>
      ${rack}
      <div class="ft-group"><h4>◉ TURRETS</h4><div class="ft-guns">${guns || '<span>No guns fitted</span>'}</div><div class="ui-note">Turrets are fitted and moved in the SHIPWRIGHT tab; they share the power grid and mass budgets.</div></div>
      <div class="ft-group"><h4>SAVED FITS</h4>
        <div class="ft-save"><input data-ft-name maxlength="32" placeholder="Fit name" value="${state.name || ''}"><button class="ui-btn sm" data-ft-savefit>SAVE FIT</button></div>
        ${fits.map(({ f, i }) => `<div class="ui-row"><span>${f.name}<small>${Object.values(f.modules).length} modules</small></span><span class="ui-acts"><button class="ui-btn sm" data-ft-load="${i}">LOAD</button><button class="ui-btn sm ghost" data-ft-del="${i}">✕</button></span></div>`).join('') || '<div class="ui-note">No saved fits for this hull yet.</div>'}
      </div>
    </section>
    <section class="ui-card ft-stats"><h3>SHIP ${prev ? '<span class="ft-prev">PREVIEW · ' + MODULE_CATALOG[state.hover].name.toUpperCase() + '</span>' : ''}</h3>
      ${bar('POWER GRID', prev ? prev.pg.used : sum.pg.used, sum.pg.max)}
      ${bar('MASS', prev ? prev.mass.used : sum.mass.used, sum.mass.max, ' t')}
      <h4>CAPACITOR</h4>
      <table class="ui-table">
        <tr><td>Capacity</td><td>${fmt(sum.cap.max)}${delta(sum.cap.max, P('cap', (s) => s.cap.max))}</td></tr>
        <tr><td>Recharge</td><td>${sum.cap.regen}/s${delta(sum.cap.regen, P('cap', (s) => s.cap.regen), 'up', 1)}</td></tr>
        <tr><td>Use in a fight</td><td>${sum.cap.drain}/s${delta(sum.cap.drain, P('cap', (s) => s.cap.drain), 'down', 1)}</td></tr>
        <tr><td>All guns and modules on</td><td class="${sum.cap.lasts == null ? 'ok' : 'bad'}">${capLine(sum)}${prev && capLine(prev) !== capLine(sum) ? ` <em class="${prev.cap.lasts == null ? 'good' : 'bad'}">→ ${capLine(prev)}</em>` : ''}</td></tr>
      </table>
      <h4>DEFENSE</h4>
      <table class="ui-table">
        <tr><td>Effective HP</td><td>${fmt(sum.ehp)}${delta(sum.ehp, P('ehp'))}</td></tr>
        <tr><td>Shield</td><td>${fmt(sum.shield)}${delta(sum.shield, P('shield'))}</td></tr>
        <tr><td>Armour</td><td>${fmt(sum.armour)}${delta(sum.armour, P('armour'))}</td></tr>
        <tr><td>Structure</td><td>${fmt(sum.structure)}${delta(sum.structure, P('structure'))}</td></tr>
        <tr><td>Active repair</td><td>${sum.repair}/s${delta(sum.repair, P('repair'), 'up', 1)}</td></tr>
      </table>
      <h4>OFFENSE</h4>
      <table class="ui-table"><tr><td>Turret DPS</td><td>${sum.dps}${delta(sum.dps, P('dps'), 'up', 1)}</td></tr></table>
      <h4>MINING</h4>
      <table class="ui-table"><tr><td>Ore per 5 s cycle</td><td>${sum.mining}${delta(sum.mining, P('mining'))}</td></tr><tr><td>Ore hold</td><td>${fmt(sum.hold)} units</td></tr></table>
      <h4>NAVIGATION</h4>
      <table class="ui-table">
        <tr><td>Top speed</td><td>${fmt(sum.speed)} m/s${delta(sum.speed, P('speed'))}</td></tr>
        <tr><td>Burners on</td><td>${fmt(sum.burn)} m/s${delta(sum.burn, P('burn'))}</td></tr>
        <tr><td>Acceleration</td><td>${fmt(sum.accel)} m/s²${delta(sum.accel, P('accel'))}</td></tr>
        <tr><td>Turn rate</td><td>${sum.turn}°/s${delta(sum.turn, P('turn'), 'up', 1)}</td></tr>
        <tr><td>Agility (mass load)</td><td>${sum.agility}%${delta(sum.agility, P('agility'))}</td></tr>
      </table>
    </section>
  </div>`;
}
