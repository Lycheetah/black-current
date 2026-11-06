import assert from 'node:assert/strict';
import { sessionModeFor,savePilotSession } from '../src/core/session-mode.js';
import { createWorld } from '../src/sim/world.js';
import { serialize } from '../src/sim/save.js';

let writes=0,snapshots=0;
const slots=new Map([[1,{pilot:'existing',salvage:918}]]);
const write=(data,slot)=>{writes++;slots.set(slot,data);return {ok:true};};
const makeSave=()=>{snapshots++;return serialize(createWorld({hullId:'cinderwake_heavy_cruiser'}));};
const old=JSON.stringify(slots.get(1));
for(const query of ['autolaunch&hull=cinderwake_heavy_cruiser','capture&quality=low','preview','preview&autolaunch']) {
  const mode=sessionModeFor(new URLSearchParams(query));assert.equal(mode,'preview');
  for(const why of ['timer','manual','leave','jobComplete','quit']) {
    const result=savePilotSession({mode,launched:true,dead:false,slot:1,makeSave,write});
    assert.equal(result.skipped,true,why);
  }
}
assert.equal(writes,0);assert.equal(snapshots,0);assert.equal(JSON.stringify(slots.get(1)),old);
for(const query of ['', 'hull=nacre_cruiser', 'quality=low'])assert.equal(sessionModeFor(new URLSearchParams(query)),'pilot');
for(const [launched,dead] of [[false,false],[true,true]])assert.equal(savePilotSession({mode:'pilot',launched,dead,slot:2,makeSave,write}).skipped,true);
assert.equal(writes,0);
const result=savePilotSession({mode:'pilot',launched:true,dead:false,slot:2,makeSave,write});
assert.equal(result.ok,true);assert.equal(writes,1);assert.equal(snapshots,1);
assert.equal(slots.get(2).pilot.hullId,'cinderwake_heavy_cruiser');assert.equal(JSON.stringify(slots.get(1)),old);
const denied=savePilotSession({mode:'pilot',launched:true,dead:false,slot:3,makeSave,write:()=>({ok:false,reason:'STORAGE FULL'})});
assert.equal(denied.ok,false);assert.equal(denied.reason,'STORAGE FULL');
console.log('PASS: 20 preview save attempts skipped; 0 preview snapshots/writes; existing slot intact; normal selected-slot save and storage-failure result preserved.');
