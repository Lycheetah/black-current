// Enemy roles, EVE style. One owner: this module assigns ship.role to hostiles at spawn and each step
// writes the role effects: the player's pin and web state (player.pinnedBy, player.webMult), logistics
// repairs on allies, and a commander's damage buff on its wing (ship.combat.damageMult).
//  - TACKLE   closes in and disrupts your drive: no ZJ jump or gate while it is within range
//  - WEB      closes in and slows you to half speed
//  - SNIPER   hangs back at double range
//  - LOGI     sits behind the line and repairs whoever is hurt most
//  - COMMAND  buffs every ship of its wing (+25% damage) while it lives; kill it first
import { WORLD } from '../core/scale.js';
import { dist3 } from '../core/math.js';
import { pushEvent } from './events.js';

export const ROLES = {
  tackle: { id: 'tackle', label: 'TACKLE', short: 'TCK', range: 0.55, reach: 2600 * WORLD, color: '#ff5a4a', desc: 'Disrupts your drive: no jump or gate while it is close.' },
  web: { id: 'web', label: 'WEB', short: 'WEB', range: 0.65, reach: 1900 * WORLD, color: '#ffb347', desc: 'Webs you to half speed.' },
  sniper: { id: 'sniper', label: 'SNIPER', short: 'SNP', range: 2, color: '#c79bff', desc: 'Fights from double range.' },
  logistics: { id: 'logistics', label: 'LOGI', short: 'LOG', range: 1.5, reach: 2200 * WORLD, color: '#5fe0a0', desc: 'Repairs its allies.' },
  command: { id: 'command', label: 'COMMAND', short: 'CMD', range: 1.2, reach: 3500 * WORLD, color: '#ffd84a', desc: 'Buffs its wing: +25% damage while it lives.' },
};

// Role odds by enemy class (null is a plain line ship).
const POOLS = {
  fighter: ['tackle', null, null, null],
  frigate: ['tackle', 'tackle', 'web', null, null],
  destroyer: ['web', 'sniper', null, null],
  cruiser: ['logistics', 'sniper', 'command', null],
  battleship: ['sniper', 'command', 'logistics', null],
};
const WEB_MULT = 0.5;
const REP_CYCLE = 4;
const REP_FRACTION = 0.12;
const COMMAND_BUFF = 1.25;

/** Give a freshly spawned hostile a role and fold the role into its orbit range. Bosses command. */
export function assignRole(world, ship, enc, forced) {
  const pool = POOLS[ship.enemyClass] || [null];
  let role = forced ?? pool[Math.floor(world.rng.next() * pool.length)];
  // One commander per wing.
  if (role === 'command' && world.entities.some((e) => !e.dead && e.encounterId === enc.id && e.role === 'command')) role = null;
  ship.role = role;
  ship.baseDamageMult = ship.combat.damageMult ?? 1;
  if (!role) return;
  const r = ROLES[role];
  ship.ai.range *= r.range;
  if (role === 'logistics') ship.repTimer = REP_CYCLE * world.rng.next();
}

/** Role effects for one step. */
export function stepRoles(world, player, dt) {
  if (player) {
    player.webMult = 1;
    player.pinnedBy = null;
    player.webbedBy = null;
  }
  const hostiles = world.entities.filter((e) => e.faction === 'hostile' && !e.dead && e.kind === 'ship');
  const commanders = hostiles.filter((e) => e.role === 'command');
  for (const e of hostiles) {
    // Commander buff: allies of the same wing within reach of a living commander.
    const cmd = commanders.find((c) => c !== e && c.encounterId === e.encounterId && dist3(c.pos, e.pos) < ROLES.command.reach);
    e.buffedBy = cmd ? cmd.id : null;
    e.combat.damageMult = (e.baseDamageMult ?? 1) * (cmd ? COMMAND_BUFF : 1);
    if (!e.role) continue;
    const r = ROLES[e.role];
    if (player && !player.dead && !player.docked && e.lock?.targetId === player.id && e.lock.progress >= 1) {
      const d = dist3(e.pos, player.pos);
      if (e.role === 'tackle' && d < r.reach && !player.pinnedBy) player.pinnedBy = e.id;
      if (e.role === 'web' && d < r.reach) { player.webMult = WEB_MULT; player.webbedBy = e.id; }
    }
    if (e.role === 'logistics' && (e.repTimer -= dt) <= 0) {
      e.repTimer = REP_CYCLE;
      let best = null, worst = 0.98;
      for (const a of hostiles) {
        if (a === e || a.encounterId !== e.encounterId || dist3(a.pos, e.pos) > r.reach) continue;
        const c = a.combat, zones = Object.values(c.armour);
        const f = (c.shield.cur + zones.reduce((s, z) => s + z.cur, 0)) / Math.max(1, c.shield.max + zones.reduce((s, z) => s + z.max, 0));
        if (f < worst) { worst = f; best = a; }
      }
      if (best) {
        const c = best.combat;
        c.shield.cur = Math.min(c.shield.max, c.shield.cur + c.shield.max * REP_FRACTION);
        for (const z of Object.values(c.armour)) z.cur = Math.min(z.max, z.cur + z.max * REP_FRACTION * 0.6);
        pushEvent(world, { type: 'logiRep', from: e.id, to: best.id });
      }
    }
  }
  if (!player) return;
  // Tell the pilot when a pin or web lands or lifts.
  const was = world.roleState || (world.roleState = { pinned: null, webbed: null });
  if (!!player.pinnedBy !== !!was.pinned) pushEvent(world, { type: player.pinnedBy ? 'tackled' : 'tackleFree' });
  if (!!player.webbedBy !== !!was.webbed) pushEvent(world, { type: player.webbedBy ? 'webbed' : 'webFree' });
  was.pinned = player.pinnedBy;
  was.webbed = player.webbedBy;
}

/** The role tag a hostile shows in the Overview, brackets and target panel, or ''. */
export const roleLabel = (ship) => (ship?.role ? ROLES[ship.role].label : '');
