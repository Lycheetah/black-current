// Station screen: shown while docked. A top bar (station, wallet, tabs, undock) and one tab at a time:
// Hangar, Shipwright, Research, Contracts, Market, Industry. Reads the world; actions go out as orders.
import { RESEARCH_PROJECTS } from '../data/progression/research.js';
import { MATERIAL_CATALOG, INDUSTRY_RECIPES } from '../data/progression/materials.js';
import { CLASS_CATALOG } from '../data/ships/classes.js';
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { RACE_CATALOG, PANTHEON_CODEX } from '../data/ships/races.js';
import { getPlayer } from '../sim/world.js';
import { researchState } from '../sim/research.js';
import { powergridUsed } from '../sim/shipwright.js';
import { groupForNode } from '../ships/blueprint.js';
import { fleetSection, shipyardTab, marketTab } from './fleet-tabs.js';
import { fittingTab, targetSlot } from './fitting-tab.js';
import { jobsTab } from './jobs-tab.js';

const TABS = [['hangar', 'HANGAR'], ['fitting', 'FITTING'], ['shipwright', 'SHIPWRIGHT'], ['shipyard', 'SHIPYARD'], ['research', 'RESEARCH'], ['contracts', 'JOBS'], ['market', 'EXCHANGE'], ['industry', 'INDUSTRY']];
const CAT_NAMES = { fleet: 'FLEET ARCHITECTURE', combat: 'COMBAT SYSTEMS', ai: 'ARTIFICIAL MINDS', industry: 'INDUSTRY', navigation: 'NAVIGATION' };

export function createStation(world, act) {
  const root = document.getElementById('station');
  const body = root.querySelector('[data-st-body]');
  root.querySelector('[data-st-tabs]').innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('');
  let tab = 'hangar', sig = '';
  const yard = { civ: null };
  const ft = { slot: null, hover: null, filter: 'all', name: '' };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; sig = ''; return; }
    if (e.target.closest('[data-st-undock]')) act({ type: 'undock' });
    const r = e.target.closest('[data-research]');
    if (r) act({ type: 'research', id: r.dataset.research });
    const c = e.target.closest('[data-course]');
    if (c) act({ type: 'courseTo', id: c.dataset.course });
    // dataset key → attribute: 'yardCiv' → data-yard-civ.
    const q = (k) => e.target.closest(`[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`)?.dataset;
    if (q('buy')) act({ type: 'buyHull', hullId: q('buy').buy });
    if (q('board')) act({ type: 'board', uid: q('board').board });
    if (q('cover')) act({ type: 'buyCover' });
    if (q('sell')) act({ type: 'sellHull', uid: q('sell').sell });
    if (q('sellmat')) act({ type: 'sellMat', mat: q('sellmat').sellmat, n: 9999 });
    if (q('buymat')) act({ type: 'buyMat', mat: q('buymat').buymat, n: 1 });
    if (q('yardCiv')) { yard.civ = q('yardCiv').yardCiv; sig = ''; }
    // Fitting window.
    if (q('ftFilter')) { ft.filter = q('ftFilter').ftFilter; sig = ''; }
    if (q('ftUnfit')) { act({ type: 'unfitModule', slot: q('ftUnfit').ftUnfit }); return; }
    if (q('ftSlot')) { const s = q('ftSlot').ftSlot; ft.slot = ft.slot === s ? null : s; sig = ''; }
    if (q('ftMod')) {
      const p = getPlayer(world), id = q('ftMod').ftMod, slot = targetSlot(p, ft, id);
      if (slot) act({ type: 'fitModule', slot, moduleId: id });
    }
    if (q('jobAccept')) act({ type: 'acceptJob', id: q('jobAccept').jobAccept });
    if (q('jobAbandon')) act({ type: 'abandonJob', id: q('jobAbandon').jobAbandon });
    if (q('ftSavefit')) act({ type: 'saveFit', name: ft.name || getPlayer(world).hull.name });
    if (q('ftLoad')) act({ type: 'loadFit', index: Number(q('ftLoad').ftLoad) });
    if (q('ftDel')) act({ type: 'deleteFit', index: Number(q('ftDel').ftDel) });
  });

  root.addEventListener('mouseover', (e) => {
    const m = e.target.closest('[data-ft-mod]');
    const id = m ? m.dataset.ftMod : null;
    if (tab === 'fitting' && id !== ft.hover && (m || !e.target.closest('[data-ft-list]'))) { ft.hover = id; sig = ''; }
  });
  root.addEventListener('input', (e) => { if (e.target.matches('[data-ft-name]')) ft.name = e.target.value; });

  const fmt = (n) => Math.round(n).toLocaleString();
  const hangar = (p) => {
    const h = p.hull, cls = CLASS_CATALOG[h.classId], c = p.combat, f = p.flight;
    const armour = Object.values(c.armour).reduce((s, z) => s + z.max, 0);
    const civ = RACE_CATALOG[world.pilot.civ], god = PANTHEON_CODEX[world.pilot.civ] || {};
    const mats = Object.entries(world.materials).filter(([, v]) => v > 0);
    return `<div class="st-cols">
      <section class="ui-card"><h3>${h.name.toUpperCase()}</h3><div class="ui-sub">${h.raceName} · ${h.className} · ${h.familyRole}</div>
        <table class="ui-table">
          <tr><td>Shield</td><td>${fmt(c.shield.max)}</td></tr><tr><td>Armour (4 zones)</td><td>${fmt(armour)}</td></tr>
          <tr><td>Structure</td><td>${fmt(c.structure.max)}</td></tr><tr><td>Capacitor</td><td>${fmt(c.cap.max)} · +${fmt(c.cap.regen)}/s</td></tr>
          <tr><td>Top speed</td><td>${fmt(f.maxSpeed)} m/s</td></tr><tr><td>Turn rate</td><td>${(f.maxTurn * 57.3).toFixed(0)}°/s</td></tr>
          <tr><td>Powergrid</td><td>${powergridUsed(p.fit, p.modules)} / ${h.powergrid}</td></tr><tr><td>Mass</td><td>${fmt(h.baseMass)} t</td></tr>
          <tr><td>Weapon tier</td><td>up to T${cls.maxWeaponTier}</td></tr><tr><td>Hardpoints</td><td>${p.blueprint.nodes.length}</td></tr>
        </table>
        <h4>FITTED</h4>${p.blueprint.nodes.map((n) => `<div class="ui-row"><span>${n.bank.replace('WPN_', '')} · ${groupForNode(n, p.blueprint.length).toUpperCase()}</span><b>${p.fit[n.bank] ? TURRET_CATALOG[p.fit[n.bank]].name : 'empty node'}</b></div>`).join('')}
        <div class="ui-note">Repaired and recharged on docking.</div></section>
      <section class="ui-card"><h3>PILOT</h3><div class="ui-sub">${world.pilot.name.toUpperCase()} · ${civ?.name || ''} · ${god.godName || ''}</div>
        <table class="ui-table"><tr><td>Salvage</td><td>${fmt(world.salvage)}</td></tr><tr><td>Research</td><td>${fmt(world.research)}</td></tr>
        <tr><td>Projects done</td><td>${world.researched.length} / ${Object.keys(RESEARCH_PROJECTS).length}</td></tr></table>
        ${fleetSection(world, p)}
        <h4>CARGO · MATERIALS</h4>${mats.length ? mats.map(([k, v]) => `<div class="ui-row"><span>${MATERIAL_CATALOG[k]?.name || k}<small>${MATERIAL_CATALOG[k]?.desc || ''}</small></span><b>${v}</b></div>`).join('') : '<div class="ui-note">Empty. Resolve Atlas signatures to recover materials.</div>'}</section>
    </div>`;
  };

  const research = () => {
    const cats = {};
    for (const p of Object.values(RESEARCH_PROJECTS)) (cats[p.cat] ??= []).push(p);
    return `<div class="ui-note top">Research points come from resolving Atlas signatures. Projects unlock in order; Capital Ordnance puts the Siege Beam and Void Torpedo on your weapon rack.</div>
      <div class="st-research">${Object.entries(cats).map(([cat, list]) => `<section class="ui-card"><h3>${CAT_NAMES[cat] || cat.toUpperCase()}</h3>${list.map((p) => {
        const st = researchState(world, p.id);
        const pre = p.prereq.length ? 'needs ' + p.prereq.map((q) => RESEARCH_PROJECTS[q].name).join(', ') : 'foundation';
        return `<div class="rs rs-${st}"><div class="rs-h"><b>${p.name}</b><span>${st === 'done' ? 'DONE' : p.cost + ' RP'}</span></div>
          <div class="rs-d">${p.desc}</div><div class="rs-u">${p.unlocks}</div><div class="rs-p">${pre}</div>
          ${st === 'ready' ? `<button class="ui-btn" data-research="${p.id}">RESEARCH · ${p.cost} RP</button>` : st === 'short' ? `<div class="rs-p">need ${p.cost - world.research} more RP</div>` : ''}</div>`;
      }).join('')}</section>`).join('')}</div>`;
  };

  const contracts = () => jobsTab(world, getPlayer(world));
  const storyOnly = () => {
    const op = world.op;
    const status = op.stage === 'complete' ? 'COMPLETE' : op.stage === 'travel' ? 'OPEN' : 'IN PROGRESS';
    return `<div class="st-cols"><section class="ui-card"><h3>${op.name.toUpperCase()}</h3><div class="ui-sub">${op.type} · ${status}</div>
      <p>${op.desc}</p><table class="ui-table"><tr><td>Location</td><td>${world.sector.landmarks[op.target].name}</td></tr>
      <tr><td>Hostiles</td><td>${op.races.map((r) => RACE_CATALOG[r]?.name).join(', ')}</td></tr><tr><td>Waves</td><td>${op.waves.length}</td></tr><tr><td>Reward</td><td>${op.reward} salvage</td></tr></table>
      ${op.stage !== 'complete' ? `<button class="ui-btn" data-course="${op.target}">SET COURSE ON UNDOCK</button>` : ''}</section>
      <section class="ui-card"><h3>CONTRACT BOARD</h3><div class="ui-note">Agents for each civilisation and the full canon contract list arrive with the Contracts release (R0.21) and the Erebos gate (R0.18).</div></section></div>`;
  };

  const market = () => marketTab(world);
  const shipyard = () => shipyardTab(world, yard);

  const industry = () => `<div class="st-cols"><section class="ui-card wide"><h3>ASTERION FOUNDRY</h3><div class="ui-note">Manufacturing opens with the Industry release (R0.24). These are the foundry's recipes.</div>
    ${Object.values(INDUSTRY_RECIPES).map((r) => `<div class="rs"><div class="rs-h"><b>${r.name}</b><span>${r.duration}s</span></div><div class="rs-d">${r.desc}</div>
      <div class="rs-u">${Object.entries(r.cost).map(([k, v]) => `${v} ${MATERIAL_CATALOG[k]?.name || k}`).join(' + ') || 'no input'} → ${Object.entries(r.output).map(([k, v]) => `${v} ${MATERIAL_CATALOG[k]?.name || k}`).join(' + ')}</div>
      ${r.researchReq ? `<div class="rs-p">needs ${RESEARCH_PROJECTS[r.researchReq]?.name}</div>` : ''}</div>`).join('')}</section></div>`;

  return {
    get tab() { return tab; },
    update() {
      const p = getPlayer(world);
      const open = !!p?.docked;
      root.classList.toggle('show', open);
      document.body.classList.toggle('st-wide', open && !['shipwright', 'hangar'].includes(tab));
      if (!open) { sig = ''; return; }
      root.querySelector('[data-st-name]').innerHTML = `<b>${world.sector.stationName || 'ASTERION FORGE'}</b><span>${world.sector.name} · DOCKED</span>`;
      root.querySelector('[data-st-wallet]').innerHTML = `<span>${world.pilot.name.toUpperCase()}</span><span>SALVAGE <b>${fmt(world.salvage)}</b></span><span>RESEARCH <b>${fmt(world.research)}</b></span>`;
      for (const b of root.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
      body.hidden = tab === 'shipwright';
      const next = JSON.stringify([tab, yard.civ, ft.slot, ft.hover, ft.filter, p.modules, (world.fits || []).length, world.jobs.active.map((j) => j.id + (j.hasBox ? 'b' : '')), Object.values(world.jobs.boards).map((b) => b.length), world.jobs.standing, world.research, world.researched.length, world.salvage, p.hullId, p.fit, world.op.stage, world.materials, world.hangar.length, world.cover.length, Math.round(Object.values(world.market.prices).reduce((a, b) => a + b, 0) * 10)]);
      if (next === sig || tab === 'shipwright') return;
      sig = next;
      // Keep the module list's scroll position across re-renders (hover previews re-render the tab).
      const list = body.querySelector('[data-ft-list]'), scroll = list ? list.scrollTop : 0;
      const focused = document.activeElement?.matches?.('[data-ft-name]');
      body.innerHTML = tab === 'fitting' ? fittingTab(world, p, ft) : { hangar, research, contracts, market, industry, shipyard }[tab](p);
      const list2 = body.querySelector('[data-ft-list]'); if (list2) list2.scrollTop = scroll;
      if (focused) { const inp = body.querySelector('[data-ft-name]'); inp?.focus(); inp?.setSelectionRange(inp.value.length, inp.value.length); }
    },
  };
}
