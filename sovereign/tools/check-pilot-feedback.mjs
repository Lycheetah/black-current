import assert from 'node:assert/strict';
import { createWorld,getPlayer } from '../src/sim/world.js';
import { createShip } from '../src/sim/ship.js';
import { initPlayerCombat,fitWeapons,applyOrders,stepShipCombat,weaponBlocker,weaponCapCost,firingTarget } from '../src/sim/combat.js';
import { groupFeedback,combatFeedback,sortieGuidance,sortieMarkup } from '../src/ui/pilot-feedback.js';
import { boardFor,applyJobOrders } from '../src/sim/jobs.js';
import { TESTAMENT } from '../src/data/story/unowned-testament.js';
import { SECTORS } from '../src/world/sectors.js';
import { LOOT_RANGE } from '../src/sim/loss.js';
import { editableBlueprintFor } from '../src/ships/registry.js';

let cases=0;
const test=(name,fn)=>{try{fn();cases++;}catch(e){e.message=name+': '+e.message;throw e;}};
function fixture(){
  const w=createWorld({hullId:'cinderwake_heavy_cruiser'}),p=getPlayer(w);
  p.pos={x:0,y:0,z:0};p.vel={x:0,y:0,z:0};p.rot={x:0,y:0,z:0,w:1};
  fitWeapons(p,{[p.blueprint.nodes[0].bank]:'beam_laser'});
  const gun=p.weapons[0];p.groups[gun.group].active=true;
  const t=createShip({id:99,hull:w.fleet.amethyst_angels_frigate,faction:'hostile',pos:{x:0,y:0,z:-gun.w.optimal*.8}});
  t.blueprint=editableBlueprintFor(t.hull);initPlayerCombat(t);t.vel={x:0,y:0,z:0};w.entities.push(t);p.lock={targetId:t.id,progress:1};
  return {w,p,t,gun};
}
for(const mult of [.5,1,2])test('actual capacitor cost '+mult,()=>{
  const {w,p,t,gun}=fixture();p.weaponCapUse=mult;const cost=weaponCapCost(p,gun);
  p.combat.cap.cur=cost-.001;
  assert.equal(weaponBlocker(p,gun,t),'capacitor');stepShipCombat(w,p,0);assert.equal(w.shots.length,0);
  assert.ok(p.combat.cap.cur>=0);p.combat.cap.cur=cost;
  assert.equal(weaponBlocker(p,gun,t),null);stepShipCombat(w,p,0);
  assert.equal(w.shots.length,1);assert.ok(Math.abs(p.combat.cap.cur)<1e-8);
});
test('manual lock and automatic targeting',()=>{
  const {w,p,t,gun}=fixture();p.lock.progress=.4;
  assert.equal(firingTarget(w,p,gun),null);assert.equal(groupFeedback(w,p,gun.group).label,'LOCKING');
  assert.equal(combatFeedback(w,p,t).label,'ACQUIRING TARGET');
  p.groups[gun.group].auto=true;assert.equal(firingTarget(w,p,gun),t);
  p.groups[gun.group].auto=false;p.groups[gun.group].active=false;
  assert.equal(groupFeedback(w,p,gun.group).label,'READY');assert.equal(firingTarget(w,p,gun),null);
});
test('cooldown and low cap match the firing policy',()=>{
  const {w,p,t,gun}=fixture();gun.cooldown=1;
  assert.equal(groupFeedback(w,p,gun.group).label,'CYCLING');assert.equal(weaponBlocker(p,gun,t),'cycling');
  gun.cooldown=0;p.combat.cap.cur=0;
  assert.equal(groupFeedback(w,p,gun.group).label,'LOW CAP');assert.equal(combatFeedback(w,p,t).label,'CAPACITOR LOW');
});
test('range and tracking advice use actual fitted weapons',()=>{
  const {w,p,t,gun}=fixture();t.pos.z=-(gun.w.optimal+gun.w.falloff*3);
  assert.equal(weaponBlocker(p,gun,t),'range');assert.equal(groupFeedback(w,p,gun.group).label,'OUT OF RANGE');
  assert.equal(combatFeedback(w,p,t).label,'OUTSIDE FIRING RANGE');
  t.pos.z=-(gun.w.optimal+gun.w.falloff*1.5);assert.equal(combatFeedback(w,p,t).label,'RANGE REDUCING ACCURACY');
  t.pos.z=-gun.w.optimal*.8;t.vel.x=100000;assert.equal(combatFeedback(w,p,t).label,'TARGET HARD TO TRACK');
});
test('empty guns are distinct from ready guns',()=>{
  const {w,p,t}=fixture();fitWeapons(p,{});
  assert.equal(groupFeedback(w,p,'fore').label,'NO GUNS');assert.equal(combatFeedback(w,p,t).label,'NO WEAPONS FITTED');
});
function contract(){
  const w=createWorld({hullId:'cinderwake_heavy_cruiser'}),p=getPlayer(w);p.docked=true;
  boardFor(w,'naraka');applyJobOrders(w,p,[{type:'acceptJob',id:TESTAMENT.jobId}]);
  return {w,p,j:w.jobs.active[0]};
}
test('sortie progresses from departure to a particular guard',()=>{
  const {w,p,j}=contract();assert.equal(sortieGuidance(w,p).action.type,'undock');
  p.docked=false;assert.equal(sortieGuidance(w,p).action.id,'job:'+j.id);
  const t=createShip({id:99,hull:w.fleet.amethyst_angels_frigate,faction:'hostile',pos:{...p.pos,z:p.pos.z-1000}});
  t.blueprint=editableBlueprintFor(t.hull);initPlayerCombat(t);t.encounterId=j.id;w.entities.push(t);j.enc.stage='wave';
  const lock=sortieGuidance(w,p);assert.equal(lock.action.type,'lock');assert.equal(lock.action.targetId,t.id);
  applyOrders(w,p,[lock.action]);assert.equal(sortieGuidance(w,p).action,null);
  p.lock.progress=1;const fire=sortieGuidance(w,p);assert.equal(fire.action.type,'allGroups');
  applyOrders(w,p,[fire.action]);assert.equal(sortieGuidance(w,p).action.type,'navTarget');
});
test('archive action addresses the mission wreck and then the station',()=>{
  const {w,p,j}=contract();p.docked=false;j.enc.stage='complete';j.wreckId='archive';
  const wreck={id:'archive',sector:'naraka',looted:false,radius:40,pos:{...j.site.pos}};
  w.wrecks.push(wreck);assert.equal(sortieGuidance(w,p).action.type,'navWreck');
  p.pos={...wreck.pos};assert.deepEqual(sortieGuidance(w,p).action,{type:'loot',wreckId:'archive'});
  j.hasBox=true;assert.equal(sortieGuidance(w,p).action.type,'navLandmark');
  p.pos={...w.sector.landmarks[w.sector.home].pos};assert.equal(sortieGuidance(w,p).action,'dock');
  p.docked=true;assert.equal(sortieGuidance(w,p).action.type,'openJobs');
});
test('courier guidance follows its destination sector',()=>{
  const w=createWorld(),p=getPlayer(w);
  w.jobs.active.push({id:'courier',type:'courier',sector:'naraka',dest:'erebos',site:{name:'Helios'},title:'Courier'});
  assert.equal(sortieGuidance(w,p).action,'map');w.sector=SECTORS.erebos;
  assert.equal(sortieGuidance(w,p).action.type,'navLandmark');
  w.sector=SECTORS.naraka;p.docked=true;assert.equal(sortieGuidance(w,p).action.type,'undock');
});
test('presentation escapes labels and leaves state untouched',()=>{
  const {w,p,t,gun}=fixture();const before=JSON.stringify(w);
  groupFeedback(w,p,gun.group);combatFeedback(w,p,t);sortieGuidance(w,p);
  assert.equal(JSON.stringify(w),before);
  const html=sortieMarkup({title:'<img src=x>',stage:'<unsafe>',hint:'a & b',label:'Go',action:{type:'undock'}});
  assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('a &amp; b'));
  assert.equal(sortieMarkup(null),'');
});
console.log(`PASS: ${cases} pilot-feedback cases; real weapon fire/capacitor multipliers; range/tracking/lock blockers; sortie actions; courier routing; read-only escaped presentation.`);
