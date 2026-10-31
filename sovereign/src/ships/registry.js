// Blueprint lookup: an authored blueprint (src/data/blueprints) wins over the generated one for the same hull id.
import { blueprintFromHull, validateBlueprint, cloneBlueprint } from './blueprint.js';
import { AUTHORED_BLUEPRINTS } from '../data/blueprints/index.js';

const authored = new Map(AUTHORED_BLUEPRINTS.map((bp) => [bp.id, validateBlueprint(bp)]));
const cache = new Map();

/** Shared, read-only blueprint for a fleet hull. Clone before editing. */
export function blueprintFor(hull) {
  if (authored.has(hull.id)) return authored.get(hull.id);
  if (!cache.has(hull.id)) cache.set(hull.id, validateBlueprint(blueprintFromHull(hull)));
  return cache.get(hull.id);
}

export const editableBlueprintFor = (hull) => cloneBlueprint(blueprintFor(hull));
