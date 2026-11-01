// Research: spend research points (earned by resolving Atlas signatures) on the canon research tree.
// One owner: this module writes world.researched. Effects are looked up by other modules through
// hasResearch(); weapons are the first to depend on it.
import { RESEARCH_PROJECTS } from '../data/progression/research.js';
import { pushEvent } from './events.js';

export const STARTING_RESEARCH = Object.values(RESEARCH_PROJECTS).filter((p) => p.cost === 0).map((p) => p.id);

/** Weapons a project makes available (the rest come with the starting rack). */
export const RESEARCH_UNLOCKS_TURRETS = { capital_ordnance: ['siege_beam', 'void_torpedo'] };

export const hasResearch = (world, id) => world.researched.includes(id);

export function researchState(world, id) {
  const p = RESEARCH_PROJECTS[id];
  if (hasResearch(world, id)) return 'done';
  if (!p.prereq.every((q) => hasResearch(world, q))) return 'locked';
  return world.research >= p.cost ? 'ready' : 'short';
}

export function applyResearchOrders(world, ship, orders) {
  if (!orders) return orders;
  const rest = [];
  for (const o of orders) {
    if (o.type !== 'research') { rest.push(o); continue; }
    const p = RESEARCH_PROJECTS[o.id];
    if (!p || !ship.docked || researchState(world, o.id) !== 'ready') { pushEvent(world, { type: 'researchRefused', id: o.id }); continue; }
    world.research -= p.cost;
    world.researched.push(o.id);
    pushEvent(world, { type: 'researched', id: o.id, name: p.name, unlocks: p.unlocks });
  }
  return rest;
}
