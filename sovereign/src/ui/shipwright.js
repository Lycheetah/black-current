// Elite Shipwright screen: node list, weapon rack, powergrid, and draggable hardpoint handles on the live hull.
// Reads the world; every change goes back as an order (fit, moveNode, undock).
import { TURRET_CATALOG } from '../data/ships/weapons.js';
import { CLASS_CATALOG, BANK_LABELS } from '../data/ships/classes.js';
import { RANGE_SCALE } from '../sim/combat-model.js';
import { getPlayer } from '../sim/world.js';
import { powergridUsed, fitBlocker, OWNED_TURRETS } from '../sim/shipwright.js';
import { groupForNode } from '../ships/blueprint.js';

const RACK = ['autocannon', 'repeater', 'flak', 'beam_laser', 'plasma', 'missile', 'ion', 'shard', 'railgun', 'void_torpedo', 'siege_beam'];
const TYPE_COLOR = { kinetic: '#d8e2f0', thermal: '#ffb46a', explosive: '#ff7a6a', void: '#c48cff' };

export function createShipwright(root, world, view, act) {
  const el = (s) => root.querySelector(s);
  const nodesEl = el('[data-sw-nodes]'), rackEl = el('[data-sw-rack]'), pgBar = el('[data-sw-pg]'), pgTxt = el('[data-sw-pgtxt]');
  const titleEl = el('[data-sw-title]'), subEl = el('[data-sw-sub]'), handles = el('[data-sw-handles]'), msg = el('[data-sw-msg]');
  el('[data-sw-undock]').addEventListener('click', () => act({ type: 'undock' }));
  let selected = null, drag = null, sig = '';

  nodesEl.addEventListener('click', (e) => { const r = e.target.closest('[data-bank]'); if (r) select(r.dataset.bank); });
  rackEl.addEventListener('click', (e) => {
    const r = e.target.closest('[data-turret]');
    if (!r || !selected) return;
    act({ type: 'fit', bank: selected, turretId: r.dataset.turret === '-' ? null : r.dataset.turret });
  });

  function select(bank) { selected = bank; sig = ''; }

  function handleFor(bank) {
    let h = handles.querySelector(`[data-h="${bank}"]`);
    if (!h) {
      h = document.createElement('div');
      h.className = 'sw-handle';
      h.dataset.h = bank;
      h.innerHTML = '<i></i><span></span>';
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        select(bank);
        drag = { bank, id: e.pointerId };
        h.setPointerCapture(e.pointerId);
        h.classList.add('drag');
      });
      h.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = view.pickNode(world.playerId, e.clientX, e.clientY);
        if (p) { drag.x = p.x; drag.z = p.z; view.previewNode(world.playerId, bank, p.x, p.z); }
      });
      const end = (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        h.classList.remove('drag');
        if (drag.x != null) act({ type: 'moveNode', bank, x: drag.x, z: drag.z });
        drag = null;
      };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      handles.appendChild(h);
    }
    return h;
  }

  return {
    get open() { return root.classList.contains('show'); },
    showMessage(text, bad) { msg.textContent = text; msg.className = 'sw-msg show' + (bad ? ' bad' : ''); clearTimeout(msg._t); msg._t = setTimeout(() => msg.classList.remove('show'), 2600); },
    update() {
      const p = getPlayer(world);
      const open = !!p?.docked;
      root.classList.toggle('show', open);
      if (!open) { handles.innerHTML = ''; selected = null; sig = ''; return; }
      const nodes = p.blueprint.nodes;
      if (!selected || !nodes.some((n) => n.bank === selected)) selected = nodes[0]?.bank ?? null;

      // Handles follow the projected nodes every frame.
      for (const n of nodes) {
        const h = handleFor(n.bank);
        const s = view.nodeScreen(world.playerId, n.bank);
        h.style.display = s ? '' : 'none';
        if (s) h.style.transform = `translate(${s.x}px, ${s.y}px)`;
        h.classList.toggle('sel', n.bank === selected);
        h.querySelector('span').textContent = (p.fit[n.bank] ? TURRET_CATALOG[p.fit[n.bank]].name.split(' ').slice(-1)[0] : 'EMPTY').toUpperCase();
      }

      // Panels redraw only when something they show changed.
      const next = JSON.stringify([selected, p.fit, nodes.map((n) => [n.x, n.z]), p.hullId]);
      if (next === sig) return;
      sig = next;
      const cls = CLASS_CATALOG[p.hull.classId];
      titleEl.textContent = p.hull.name.toUpperCase();
      subEl.textContent = `${p.hull.raceName} · ${p.hull.className} · max weapon tier ${cls.maxWeaponTier}`;
      const used = powergridUsed(p.fit);
      pgBar.style.width = Math.min(100, (used / p.hull.powergrid) * 100) + '%';
      pgTxt.textContent = `${used} / ${p.hull.powergrid} PG`;
      nodesEl.innerHTML = nodes.map((n) => {
        const t = p.fit[n.bank] ? TURRET_CATALOG[p.fit[n.bank]] : null;
        return `<div class="sw-node${n.bank === selected ? ' sel' : ''}" data-bank="${n.bank}">
          <b>${BANK_LABELS[n.bank] || n.bank}</b><em class="grp-${groupForNode(n)}">${groupForNode(n).toUpperCase()} GROUP</em>
          <span>${t ? t.name : 'EMPTY NODE'}</span></div>`;
      }).join('');
      rackEl.innerHTML = RACK.map((id) => {
        const w = TURRET_CATALOG[id];
        const why = fitBlocker(p, selected, id);
        const on = p.fit[selected] === id;
        return `<div class="sw-gun${on ? ' on' : ''}${why && !on ? ' locked' : ''}" data-turret="${id}">
          <div class="sw-gun-h"><b>${w.name}</b><span style="color:${TYPE_COLOR[w.damageType]}">${w.damageType.toUpperCase()}</span></div>
          <div class="sw-gun-s">T${w.tier} ${w.size} · DMG ${w.damage.toFixed(2)} × ${w.rate.toFixed(2)}/s · OPT ${w.optimal * RANGE_SCALE}m +${w.falloff * RANGE_SCALE} · TRK ${w.tracking} · ${w.pg} PG · ${w.cap} CAP</div>
          ${why && !on ? `<div class="sw-why">${why}</div>` : ''}
        </div>`;
      }).join('') + `<div class="sw-gun unfit" data-turret="-"><b>REMOVE GUN FROM NODE</b></div>`;
    },
    isOwned: (id) => OWNED_TURRETS.includes(id),
  };
}
