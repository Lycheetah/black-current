// Story/persistence acceptance through the real world order pipeline.
import assert from 'node:assert/strict';
import { createWorld, getPlayer, stepWorld, NEUTRAL_COMMAND } from '../src/sim/world.js';
import { boardFor, testamentRecord } from '../src/sim/jobs.js';
import { serialize, restore, SAVE_VERSION } from '../src/sim/save.js';
import { killShip } from '../src/sim/combat.js';
import { TESTAMENT, TESTAMENT_CHOICES } from '../src/data/story/unowned-testament.js';
import { jobsTab } from '../src/ui/jobs-tab.js';
import { SECTORS } from '../src/world/sectors.js';
import { WORLD } from '../src/core/scale.js';

let cases = 0, reloads = 0;
const test = (name, fn) => { try { fn(); cases++; } catch(e) { e.message = name+': '+e.message; throw e; } };
const tick = (w, orders=[]) => stepWorld(w,{[w.playerId]:{...NEUTRAL_COMMAND,orders}},1/60);
const job = (w) => w.jobs.active.find((j)=>j.id===TESTAMENT.jobId);
function reload(w) {
  const data=JSON.parse(JSON.stringify(serialize(w)));const next=createWorld();restore(next,data);reloads++;return next;
}
function accepted() {
  const w=createWorld({hullId:'cinderwake_heavy_cruiser'});getPlayer(w).docked=true;
  assert.equal(boardFor(w,'naraka').filter((j)=>j.id===TESTAMENT.jobId).length,1);
  tick(w,[{type:'acceptJob',id:TESTAMENT.jobId}]);assert.ok(job(w));return w;
}
function cleared(w) {
  const p=getPlayer(w);p.docked=false;p.pos={...job(w).site.pos};p.prevPos={...p.pos};p.vel={x:0,y:0,z:0};
  tick(w);assert.equal(job(w).enc.stage,'wave');
  const guards=w.entities.filter((e)=>e.encounterId===TESTAMENT.jobId&&!e.dead);
  assert.equal(guards.length,3);assert.ok(guards.every((e)=>e.hull.raceId==='amethyst_angels'));
  for(const e of guards)killShip(w,e,-1);
  tick(w);assert.equal(job(w).enc.stage,'complete');assert.ok(job(w).wreckId);return w;
}
function recovered(w) {
  const j=job(w),p=getPlayer(w),wreck=w.wrecks.find((x)=>x.id===j.wreckId);
  assert.ok(wreck);p.pos={...wreck.pos};p.prevPos={...p.pos};p.vel={x:0,y:0,z:0};p.docked=false;
  tick(w,[{type:'loot',wreckId:wreck.id}]);assert.equal(j.hasBox,true);return w;
}

test('site clears the main operation and station',()=>{
  const w=accepted(),pos=job(w).site.pos,s=SECTORS.naraka;
  const distance=(p)=>Math.hypot(pos.x-p.x,pos.y-p.y,pos.z-p.z);
  assert.ok(distance(s.landmarks.breach.pos)>3600*WORLD+8000);
  for(const l of Object.values(s.landmarks))if(l.solid)assert.ok(distance(l.pos)>l.radius+8000);
});

for(const [choice,ending] of Object.entries(TESTAMENT_CHOICES))test('ending '+choice,()=>{
  let w=recovered(cleared(accepted()));
  const money=w.salvage,research=w.research;
  tick(w,[{type:'resolveTestament',choice}]);assert.equal(testamentRecord(w).status,'active');
  assert.equal(w.salvage,money,'a choice in flight must not settle the archive');
  w=reload(w);getPlayer(w).docked=true;tick(w);
  assert.equal(w.salvage,money,'docking with Ilex must not automatically pay');
  const html=jobsTab(w,getPlayer(w));
  assert.ok(html.includes('data-testament-choice'));assert.ok(html.includes(TESTAMENT.voice));
  assert.equal((html.match(/data-testament-resolve=/g)||[]).length,3);
  tick(w,[{type:'resolveTestament',choice:'__proto__'}]);assert.equal(w.salvage,money);
  tick(w,[{type:'resolveTestament',choice}]);
  assert.equal(w.salvage,money+ending.reward.salvage);assert.equal(w.research,research+ending.reward.research);
  assert.equal(w.jobs.standing.naraka,ending.reward.standing);assert.equal(w.jobs.done,1);
  assert.equal(testamentRecord(w).choice,choice);assert.equal(job(w),undefined);
  w=reload(w);getPlayer(w).docked=true;
  tick(w,[{type:'resolveTestament',choice},{type:'resolveTestament',choice:'sell'},{type:'abandonJob',id:TESTAMENT.jobId}]);
  assert.equal(w.salvage,money+ending.reward.salvage);assert.equal(w.jobs.done,1);
  assert.equal(testamentRecord(w).choice,choice);
  assert.ok(!boardFor(w,'naraka').some((j)=>j.id===TESTAMENT.jobId));
  assert.ok(jobsTab(w,getPlayer(w)).includes(ending.aftermath));
});

test('early and duplicate actions',()=>{
  const w=accepted(),money=w.salvage;
  tick(w,[{type:'acceptJob',id:TESTAMENT.jobId},{type:'resolveTestament',choice:'release'}]);
  assert.equal(w.jobs.active.length,1);assert.equal(w.salvage,money);assert.equal(testamentRecord(w).status,'active');
});

test('guard encounter survives reload',()=>{
  let w=accepted();const p=getPlayer(w);p.docked=false;p.pos={...job(w).site.pos};p.prevPos={...p.pos};tick(w);
  assert.equal(job(w).enc.stage,'wave');w=reload(w);assert.equal(job(w).enc.stage,'travel');
  assert.equal(job(w).enc.alive.length,0);getPlayer(w).pos={...job(w).site.pos};tick(w);
  assert.equal(job(w).enc.stage,'wave');assert.equal(job(w).enc.alive.length,3);
});

test('uncollected archive is restored, not granted',()=>{
  let w=cleared(accepted());w=reload(w);tick(w);
  assert.equal(!!job(w).hasBox,false);assert.ok(w.wrecks.some((x)=>x.id===job(w).wreckId&&!x.looted));
  const wreck=w.wrecks.find((x)=>x.id===job(w).wreckId);wreck.ttl=0;tick(w);tick(w);
  assert.equal(!!job(w).hasBox,false);assert.ok(w.wrecks.some((x)=>x.id===job(w).wreckId&&x.ttl>0));
  recovered(w);assert.equal(job(w).hasBox,true);
});

test('archive loss and recovery',()=>{
  const w=recovered(cleared(accepted()));killShip(w,getPlayer(w),-1);tick(w);
  assert.equal(job(w).hasBox,false);assert.equal(job(w).wreckId,null);
  for(let i=0;i<310;i++)tick(w);
  assert.equal(!!getPlayer(w).dead,false);assert.equal(job(w).hasBox,false);
  assert.ok(w.wrecks.some((x)=>x.id===job(w).wreckId&&!x.looted));
  recovered(w);assert.equal(job(w).hasBox,true);
});

test('abandon and retry',()=>{
  const w=recovered(cleared(accepted()));getPlayer(w).docked=true;
  tick(w,[{type:'abandonJob',id:TESTAMENT.jobId}]);assert.equal(job(w),undefined);
  assert.equal(testamentRecord(w).status,'available');
  assert.ok(boardFor(w,'naraka').some((j)=>j.id===TESTAMENT.jobId));
  tick(w,[{type:'acceptJob',id:TESTAMENT.jobId}]);assert.equal(!!job(w).hasBox,false);
  assert.equal(job(w).enc.stage,'travel');
});

test('ordinary recovery needs a real loot receipt after reload',()=>{
  let w=createWorld();getPlayer(w).docked=false;
  const j={id:'RECOVERY_REGRESSION',type:'recovery',title:'Recovery check',sector:'naraka',
    site:{sector:'naraka',pos:{x:18000,y:0,z:18000}},reward:{salvage:120,research:4,standing:1},enc:{stage:'complete'}};
  w.jobs.active.push(j);tick(w);w=reload(w);tick(w);
  const active=w.jobs.active[0];assert.equal(!!active.hasBox,false,'missing saved wreck is not cargo');
  const p=getPlayer(w),wreck=w.wrecks.find((x)=>x.id===active.wreckId);assert.ok(wreck);
  p.pos={...wreck.pos};p.prevPos={...p.pos};tick(w,[{type:'loot',wreckId:wreck.id}]);assert.equal(active.hasBox,true);
  const money=w.salvage;p.docked=true;tick(w);tick(w);assert.equal(w.salvage,money+120);assert.equal(w.jobs.done,1);
});

test('version 9 jobs migrate without losing identity or money',()=>{
  const source=createWorld({hullId:'nacre_cruiser'});source.salvage=821;
  const old=serialize(source);old.v=9;delete old.jobs.stories;
  const next=createWorld();restore(next,old);assert.equal(next.pilot.civ,'nacre');
  assert.equal(next.salvage,821);assert.deepEqual(next.jobs.stories,{});
  assert.equal(serialize(next).v,SAVE_VERSION);assert.equal(SAVE_VERSION,10);
  assert.ok(boardFor(next,'naraka').some((j)=>j.id===TESTAMENT.jobId));
});

console.log(`PASS: ${cases} story/recovery cases; ${reloads} reloads; 3 endings; once-only rewards; loss/retry; ordinary recovery; v9→v10 migration.`);
