// Station tabs for the economy: Shipyard (buy hulls), Fleet section of the Hangar, and the Exchange.
import { CLASS_CATALOG, BANK_IDS } from '../data/ships/classes.js';
import { RACE_CATALOG, RACE_ORDER, PLAYER_CLASS_ORDER } from '../data/ships/races.js';
import { MATERIAL_CATALOG } from '../data/progression/materials.js';
import { ORES } from '../data/ores.js';
import { hullPrice, hullBlocker, buyPrice, sellPrice, HULL_PRICE } from '../sim/economy.js';
import { COVER, coverPayout, fullCoverCost } from '../sim/loss.js';

const fmt = (n) => Math.round(n).toLocaleString();

export function fleetSection(world, p) {
  const ships = world.hangar;
  const value = hullPrice(world, p.hull), full = world.cover.includes(p.uid);
  const cover = value <= 0 ? '<div class="ui-note">Starter hulls are reissued free by the Covenant. Nothing to cover.</div>'
    : `<div class="ui-row"><span>Covenant cover<small>${full ? 'FULL' : 'BASIC'} · pays ${fmt(coverPayout(world, p))} of ${fmt(value)} if lost</small></span>
      ${full ? '<b>COVERED</b>' : `<button class="ui-btn sm" data-cover="1">FULL ${Math.round(COVER.full * 100)}% · ${fmt(fullCoverCost(world, p))}</button>`}</div>`;
  return `<h4>COVENANT COVER</h4>${cover}<div class="ui-note">A lost hull is gone with its guns. Half the guns' worth stays in the wreck. You wake in your next hangar ship.</div>
    <h4>FLEET · IN YOUR HANGAR</h4>
    <div class="ui-row"><span><b class="hl">${p.hull.name}</b><small>${p.hull.className} · boarded</small></span><b>ACTIVE</b></div>
    ${ships.map((h) => { const hull = world.fleet[h.hullId]; return `<div class="ui-row"><span>${hull.name}<small>${hull.raceName} · ${hull.className}</small></span>
      <span class="ui-acts"><button class="ui-btn sm" data-board="${h.uid}">BOARD</button><button class="ui-btn sm ghost" data-sell="${h.uid}">SELL</button></span></div>`; }).join('')
      || '<div class="ui-note">Buy more hulls at the Shipyard.</div>'}`;
}

export function shipyardTab(world, state) {
  const civ = state.civ || world.pilot.civ;
  const civs = RACE_ORDER.map((r) => `<button class="chip${r === civ ? ' on' : ''}" data-yard-civ="${r}">${RACE_CATALOG[r].name}</button>`).join('');
  const rows = PLAYER_CLASS_ORDER.filter((c) => c !== 'pod').map((cls) => {
    const hull = world.fleet[civ + '_' + cls];
    if (!hull) return '';
    const why = hullBlocker(world, hull);
    const c = CLASS_CATALOG[cls], s = hull.stats;
    return `<div class="yard${why ? ' locked' : ''}">
      <div class="yard-h"><b>${hull.name}</b><span>${hullPrice(world, hull) ? fmt(hullPrice(world, hull)) + ' SALVAGE' : 'FREE'}</span></div>
      <div class="yard-s">${c.name} · ${c.role} · ${c.banks} hardpoint${c.banks > 1 ? 's' : ''} · T${c.maxWeaponTier} guns · ${hull.powergrid} PG</div>
      <div class="yard-bars">${[['SHIELD', s.shield, 1.6], ['ARMOUR', s.armor, 1.6], ['HULL', s.hull, 1.6], ['SPEED', s.maxSpeed, 2.6], ['TURN', s.turn, 2.6]].map(([l, v, m]) =>
        `<span>${l}<u><i style="width:${Math.min(100, (v / m) * 100)}%"></i></u></span>`).join('')}</div>
      ${why ? `<div class="rs-p">${why}</div>` : `<button class="ui-btn" data-buy="${hull.id}">BUY · ${fmt(hullPrice(world, hull))}</button>`}
    </div>`;
  }).join('');
  return `<div class="ui-note top">Classes open through Research. Your own civilisation's line sells at base price; other lines cost 25% more. New hulls come with the free Earned-Light Autocannon on every hardpoint.</div>
    <div class="chips">${civs}</div><div class="yard-grid">${rows}</div>`;
}

export function marketTab(world) {
  const CAT = { ...ORES, ...MATERIAL_CATALOG };
  const rows = [...Object.keys(ORES), ...Object.keys(MATERIAL_CATALOG)].map((k) => {
    const have = world.materials[k] || 0;
    return `<tr><td>${CAT[k].name}<small>${CAT[k].desc}</small></td><td>${have}</td><td>${world.market.stock[k]}</td>
      <td class="pr">${sellPrice(world, k)}</td><td class="pr">${buyPrice(world, k)}</td>
      <td><button class="ui-btn sm" data-sellmat="${k}" ${have ? '' : 'disabled'}>SELL ALL</button><button class="ui-btn sm ghost" data-buymat="${k}">BUY 1</button></td></tr>`;
  }).join('');
  return `<div class="ui-note top">The Asterion Exchange buys and sells materials. Selling pushes a price down; buying pushes it up; prices drift back over time.</div>
    <section class="ui-card wide"><h3>ASTERION EXCHANGE</h3><table class="ui-table mkt"><tr><th>Material</th><th>Held</th><th>Stock</th><th>Sell</th><th>Buy</th><th></th></tr>${rows}</table></section>`;
}
