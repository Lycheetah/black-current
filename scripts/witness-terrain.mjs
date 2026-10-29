// Route 2 Stage 1 · terrain and landmarks: every sector is a place, and its terrain plays.
// Writes shots/terrain/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/terrain';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('TERRAIN');await p.locator('#btn-title-quick').click();await p.waitForTimeout(300);
 await p.evaluate(()=>{garage.closeMission();for(const w of capitalEndgame.warlords())(saveState.doc.capital||(saveState.doc.capital={v:1,citadels:{},warlords:{}})).warlords[w.id]={defeats:0,lastEpoch:capitalEndgame.epoch()};
  window.__go=(sys,gx,gy)=>{galaxy.enterSystemById(sys);worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});engine.paused=true;return terrain.current();};
  window.__tick=n=>{engine.paused=false;for(let i=0;i<n;i++)engine.update(1/60);engine.paused=true;};});
 // 1 · five regions, five biomes, a landmark everywhere, the same layout every time
 report.data.biomes=await p.evaluate(()=>[0,1,2,3,4].map(rid=>{const s=galaxy.data.systems.find(s=>s.rid===rid&&!s.home&&!s.rule&&s.size>=2);const f=__go(s.id,2,1),again=terrain.generate(worldMap.getCurrentChamber());
  return{rid,biome:f.biome.name,landmark:f.landmark?.name,solids:f.solids.length,gas:f.gas.length,lanes:f.lanes.length,same:JSON.stringify(again.solids.map(o=>[Math.round(o.x),Math.round(o.y),Math.round(o.r)]))===JSON.stringify(f.solids.map(o=>[Math.round(o.x),Math.round(o.y),Math.round(o.r)]))};}));
 const B=report.data.biomes;
 check('the five regions give five biomes, each sector with a named landmark',new Set(B.map(b=>b.biome)).size===5&&B.every(b=>b.landmark&&b.solids>0),B);
 check('terrain is a pure function of system and sector (identical when regenerated)',B.every(b=>b.same),B.map(b=>b.same));
 check('Chaos Cradle is cloudier and Deep Current has current lanes',B[3].gas>B[0].gas&&B[4].lanes>0,B);
 report.data.arena=await p.evaluate(()=>{galaxy.enterSystemById('home');const boss=Object.values(worldMap.chambers).find(c=>c.isBossSector);const f=__go('home',boss.gridX,boss.gridY);return{boss:f.solids.length+f.gas.length+f.lanes.length};});
 check('guardian arenas keep their open floor',report.data.arena.boss===0,report.data.arena);
 // 2 · rock is solid and stops shots
 report.data.solid=await p.evaluate(()=>{const s=galaxy.data.systems.find(s=>s.rid===3&&!s.home&&!s.rule&&s.size>=2);const f=__go(s.id,2,1);engine.enemies=[];const o=f.solids.filter(o=>o.kind==='rock').sort((a,b)=>b.r-a.r)[0];
  const P=engine.player;P.iFrames=1e9;P.x=o.x+o.r*0.3;P.y=o.y;P.vx=P.vy=0;__tick(2);const out=Math.hypot(P.x-o.x,P.y-o.y);
  const shot={x:o.x+o.r*0.5,y:o.y,vx:0,vy:0,life:120,radius:3,damage:0,isPlayer:false,update(){},draw(){},hits(){return false;}};engine.projectiles.push(shot);__tick(1);
  return{r:o.r,out,stopped:shot.life<=0,gone:!engine.projectiles.includes(shot)};});
 check('a ship cannot sit inside a rock: it is pushed to the surface',report.data.solid.out>=report.data.solid.r,report.data.solid);
 check('a shot that reaches a rock is stopped (rock is cover)',report.data.solid.stopped,report.data.solid);
 // 3 · current lanes carry you
 report.data.lane=await p.evaluate(()=>{const s=galaxy.data.systems.find(s=>s.rid===4&&!s.home&&!s.rule&&s.size>=2);const f=__go(s.id,2,1);engine.enemies=[];const l=f.lanes[0];if(!l)return{none:true};
  const P=engine.player;P.x=l.cx;P.y=l.cy;P.vx=P.vy=0;for(const k of Object.keys(engine.keys))engine.keys[k]=false;const x0=P.x,y0=P.y;__tick(60);
  return{moved:(P.x-x0)*l.dir[0]+(P.y-y0)*l.dir[1],across:Math.abs(-(P.x-x0)*l.dir[1]+(P.y-y0)*l.dir[0])};});
 check('a current lane carries an idle ship along it',!report.data.lane.none&&report.data.lane.moved>60,report.data.lane);
 // 4 · gas hides you from hostiles that have not seen you
 report.data.gas=await p.evaluate(()=>{const s=galaxy.data.systems.find(s=>s.rid===3&&!s.home&&!s.rule&&s.size>=2);const f=__go(s.id,2,1);const g=f.gas.sort((a,b)=>b.r-a.r)[0];
  const P=engine.player;P.iFrames=1e9;const test=(px,py)=>{P.x=px;P.y=py;P.vx=P.vy=0;const e=new EnemyOrganism(px+620,py,{tier:5,archetype:'stalker'});e._aggro=false;e._hitAt=0;engine.enemies=[e];for(let i=0;i<90;i++){terrain.current();P._concealed=terrain.inGas(terrain.current(),P.x,P.y);e.update(P,[],[e]);}return e._aggro;};
  const range=window.enemyCombat?.profile(new EnemyOrganism(0,0,{tier:5,archetype:'stalker'}))?.aggro;
  return{range,inGas:test(g.x,g.y),inOpen:test(-f.R*0.05,-f.R*0.05)};});
 check('a stalker 620 px away notices you in the open but not inside a gas cloud',report.data.gas.inOpen===true&&report.data.gas.inGas===false,report.data.gas);
 // 5 · a black hole pulls
 report.data.hole=await p.evaluate(()=>{for(const s of galaxy.data.systems.filter(s=>!s.home&&!s.rule&&s.rid>=3))for(const c of Object.values((galaxy.enterSystemById(s.id),worldMap.chambers))){if(c.isHaven||c.isBossSector)continue;const f=__go(s.id,c.gridX,c.gridY);if(f.landmark?.kind!=='blackhole')continue;
   engine.enemies=[];const L=f.landmark,P=engine.player;P.x=L.x+L.r*2.5;P.y=L.y;P.vx=P.vy=0;for(const k of Object.keys(engine.keys))engine.keys[k]=false;const d0=Math.hypot(P.x-L.x,P.y-L.y);__tick(60);return{sys:s.id,d0,d1:Math.hypot(P.x-L.x,P.y-L.y)};}return{none:true};});
 check('a black-hole landmark pulls a drifting ship in',!report.data.hole.none&&report.data.hole.d1<report.data.hole.d0-40,report.data.hole);
 // 6 · cost in the biggest room
 report.data.cost=await p.evaluate(()=>{const c=modularShips.compile(modularShips.factory('athanor'));engine.applyDesign(c.design,{restore:true});const s=galaxy.data.systems.find(s=>s.rid===4&&!s.home&&!s.rule&&s.size>=2);const f=__go(s.id,3,2);
  engine.paused=false;const n=30;let t0=performance.now();for(let i=0;i<n;i++)engine.render();const render=(performance.now()-t0)/n;t0=performance.now();for(let i=0;i<n;i++)engine.update(1/60);const update=(performance.now()-t0)/n;engine.paused=true;return{R:f.R,solids:f.solids.length,render,update};});
 check('a titan-sized deep sector renders and steps within budget (headless)',report.data.cost.render<14&&report.data.cost.update<10,report.data.cost);
 await p.evaluate(()=>{engine.paused=false;});await p.waitForTimeout(1500);await p.screenshot({path:`${out}/deep-titan.png`});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('terrain witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
