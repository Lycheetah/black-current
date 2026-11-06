// Focused acceptance for new civilisation IDs, authored hulls and save continuity.
import assert from 'node:assert/strict';
import { RACE_ORDER, RACE_CATALOG, PANTHEON_CODEX, PLAYER_CLASS_ORDER } from '../src/data/ships/races.js';
import { createFleetCatalog } from '../src/data/ships/catalog.js';
import { blueprintFromHull, validateBlueprint } from '../src/ships/blueprint.js';
import { blueprintFor } from '../src/ships/registry.js';
import { createWorld, getPlayer, startPilot } from '../src/sim/world.js';
import { serialize, restore, migrate } from '../src/sim/save.js';

const original = ['savanah','sol_symbiots','chaos','cosmic_darkness','cosmic_light','blackhole','hybrid_fused','human_hunters','ai_hunters','amethyst_angels','techno_angels','ai_gods','pagan_ai','ai'];
assert.deepEqual(RACE_ORDER.slice(0,14), original, 'existing civilisation order must survive');
assert.equal(new Set(RACE_ORDER).size, 16);
const fleet = createFleetCatalog();
assert.equal(Object.keys(fleet).length,16*PLAYER_CLASS_ORDER.length);
let generated = 0, roundTrips = 0;
for (const race of ['cinderwake','nacre']) {
  assert.ok(RACE_CATALOG[race] && PANTHEON_CODEX[race]?.god && PANTHEON_CODEX[race]?.ships);
  for (const cls of PLAYER_CLASS_ORDER) {
    const h = fleet[`${race}_${cls}`];
    assert.ok(Object.values(h.stats).every((v) => Number.isFinite(v) && v > 0));
    const bp = validateBlueprint(blueprintFromHull(h));
    assert.equal(bp.race,race);assert.ok(bp.length>0);generated++;
  }
}
function roundTrip(world, expectedCiv, expectedHull) {
  const data = JSON.parse(JSON.stringify(serialize(world)));
  const next = createWorld();restore(next,data);
  assert.equal(next.pilot.civ,expectedCiv);
  assert.equal(getPlayer(next).hullId,expectedHull);
  assert.deepEqual(getPlayer(next).blueprint,getPlayer(world).blueprint);
  assert.deepEqual(getPlayer(next).fit,getPlayer(world).fit);
  assert.equal(next.salvage,world.salvage);roundTrips++;
}
for (const [race,id,model] of [
  ['cinderwake','cinderwake_heavy_cruiser','oathbreaker_hero.glb'],
  ['nacre','nacre_cruiser','wake_eater_hero.glb'],
]) {
  const bp = blueprintFor(fleet[id]);
  assert.equal(bp.model?.src,model,'the hero must use its authored GLB');
  assert.equal(new Set(bp.nodes.map((n)=>n.bank)).size,4);
  const world = createWorld({hullId:id});world.salvage=713;
  roundTrip(world,race,id);
  startPilot(world,{name:'Frontier check',civ:race});
  roundTrip(world,race,`${race}_starter`);
}
roundTrip(createWorld(),'savanah','savanah_starter');
assert.throws(()=>migrate({kind:'deliberately-invalid-save',v:9}),/Not a Sovereign Eclipse save/);
console.log(`PASS: ${generated} new generated hulls; 2 authored four-bank heroes; ${roundTrips} save round trips; 16 civilisations / ${Object.keys(fleet).length} hulls; invalid save rejected.`);
