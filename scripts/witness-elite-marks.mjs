// Overnight run step 6 · elite cores and elite marks Mk I–III, plus Mac's duel: an elite cruiser (rank 10, Mk III guns)
// holds its own against the battleship band. Writes shots/elite-marks/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/elite-marks';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.eliteMarks?.ready&&window.gunRanks?.ready&&window.derelictLoot?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ELITE');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 // 1 · cores: holds, rifts, citadel cores and warlords pay them
 report.data.cores=await p.evaluate(()=>{garage.closeMission();saveState.doc.dives={v:1,looted:{},cleared:0};const E=eliteMarks,c0=E.cores();derelictLoot.award({key:'home:9,9',danger:5});const hold=E.cores()-c0;derelictLoot.award({key:'home:9,8',danger:5},'riftwalker');const rift=E.cores()-c0-hold;
  const mk=role=>{const e=new EnemyOrganism(engine.player.x+3000,engine.player.y,{tier:8,archetype:'stalker'});e.capital={role};engine.enemies.push(e);e.hp=0;engine.killEnemy(engine.enemies.indexOf(e));};
  const c1=E.cores();mk('core');const citadel=E.cores()-c1;const c2=E.cores();mk('warlord');const warlord=E.cores()-c2;return{hold,rift,citadel,warlord};});
 const C=report.data.cores;
 check('elite cores: +1 for a derelict hold or a rift seal, +3 for a citadel core or a warlord',C.hold===1&&C.rift===1&&C.citadel===3&&C.warlord===3,C);
 // 2 · refit rules
 report.data.refit=await p.evaluate(()=>{const E=eliteMarks,G=gunRanks,w=G.fitted()[0];civilisations.goHome();engine.paused=false;hubs.openDock();hubs.metal=1e6;
  G.doc().ranks[w]=9;const low=E.refit(w);G.doc().ranks[w]=10;G.doc().cores=0;const broke=E.refit(w);G.doc().cores=20;hubs.closeDock();const undocked=E.refit(w);engine.paused=false;hubs.openDock();
  const p1=E.price(w),m0=hubs.metal,c0=E.cores(),ok=E.refit(w);return{low,broke,undocked,ok,mark:E.mark(w),spentMetal:m0-hubs.metal,spentCores:c0-E.cores(),p1};});
 const R=report.data.refit;
 check('a refit needs rank 10, the cores, a dock, then spends exactly its price',R.low===false&&R.broke===false&&R.undocked===false&&R.ok===true&&R.mark===1&&R.spentMetal===R.p1.metal&&R.spentCores===R.p1.cores,R);
 // 3 · damage on top of rank 10
 report.data.damage=await p.evaluate(()=>{const E=eliteMarks,G=gunRanks,w=G.fitted()[0],P=engine.player;terrain.off=true;engine.enemies=[];
  const shot=()=>{engine.projectiles=[];engine.fireMountGroup(w,[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:w}}}],1);return Math.max(...engine.projectiles.map(q=>q.damage));};
  const keep={r:{...G.doc().ranks},m:{...G.doc().marks}};G.doc().ranks[w]=1;G.doc().marks[w]=0;const base=shot();G.doc().ranks[w]=10;const out=[];for(let m=0;m<=3;m++){G.doc().marks[w]=m;out.push(+(shot()/base).toFixed(3));}G.doc().ranks=keep.r;G.doc().marks=keep.m;terrain.off=false;return out;});
 check('rank 10 is 1.54×; Mk I/II/III take it to ~1.93×, ~2.39×, ~2.93×',[1.54,1.925,2.387,2.926].every((v,i)=>Math.abs(report.data.damage[i]-v)<0.03),report.data.damage);
 // 4 · Mac's duel: time to kill a battleship-band hull (tier 6)
 report.data.duel=await p.evaluate(()=>{hubs.closeDock();const M=modularShips,G=gunRanks;terrain.off=true;
  /* fight where the battleship band lives: a danger-6 sector, so combat scaling uses that sector's threat row */
  for(const s of [...galaxy.data.systems].filter(s=>!s.home&&!s.hub&&!s.rule).sort((a,b)=>a.danger-b.danger)){galaxy.enterSystemById(s.id);const ch=Object.values(worldMap.chambers).find(c=>c.dangerLevel===6&&!c.isHaven&&!c.isBossSector);if(ch){worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});break;}}
  const band=worldMap.getCurrentChamber().dangerLevel;const read=engine.readInput,random=Math.random;Math.random=()=>.999;
  const outfit=id=>{const d=M.factory(id),limit=M.HULLS[d.modular.hull].power,sec=k=>d.modular.sections.find(s=>s.id===k),power=()=>d.modular.fittings.reduce((n,f)=>n+(M.GEARS[f.gear].power||0),0);
   for(const f of d.modular.fittings.filter(f=>M.GEARS[f.gear].weapon)){const slot=M.SECTIONS[sec(f.slot).kind].slot,base=power()-M.GEARS[f.gear].power;const best=Object.entries(M.GEARS).filter(([k,g])=>g.weapon&&!g.retired&&!g.salvageOnly&&!k.startsWith('unique-')&&M.fits(slot,g)&&base+g.power<=limit).sort(([,a],[,b])=>arsenal.dps(b.weapon)-arsenal.dps(a.weapon))[0];if(best)f.gear=best[0];}return d;};
  const ttk=(id,elite)=>{const d=outfit(id),c=M.compile(d);saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});const pl=engine.player;pl.x=pl.y=0;pl.vx=pl.vy=0;pl.angle=0;pl.iFrames=1e9;
   const guns=[...new Set(c.design.modular.fittings.map(f=>M.GEARS[f.gear]).filter(g=>g.weapon).map(g=>g.weapon))];const keep={r:{...G.doc().ranks},m:{...G.doc().marks}};for(const w of guns){G.doc().ranks[w]=elite?10:1;G.doc().marks[w]=elite?3:0;}
   const e=new EnemyOrganism(0,0,{tier:6,archetype:'stalker'});frontierPve.decorate(e);combatScaling.enemy(e);hostileSkins.skin(e);const m=hostileSkins.model(e);e.x=Math.max(700,(m?m.W*.6:300)+fleetFormation.radius(pl)+200);e.y=0;e.angle=Math.PI;e.update=()=>{};
   engine.projectiles=[];engine.readInput=function(){return this.input={ax:0,ay:0,aimX:e.x,aimY:e.y,fire:true};};let f=0;engine.paused=false;for(;f<60*120&&e.hp>0;f++){engine.enemies=[e];engine.update(1/60);}engine.paused=true;
   G.doc().ranks=keep.r;G.doc().marks=keep.m;return{id,hull:c.design.modular.hull,guns:guns.length,seconds:+(f/60).toFixed(1),killed:e.hp<=0};};
  try{return{band,stockCruiser:ttk('lancer',false),eliteCruiser:ttk('lancer',true),stockBattleship:ttk('dreadnought',false)};}finally{engine.readInput=read;Math.random=random;terrain.off=false;}});
 const U=report.data.duel;console.log('duel',JSON.stringify(U));
 check('Mac\'s elite cruiser: rank 10 Mk III guns kill a battleship-band hull at least 2.5× faster than the stock cruiser',U.band===6&&U.eliteCruiser.killed&&U.eliteCruiser.seconds*2.5<=U.stockCruiser.seconds,U);
 check('…and within 1.25× of a stock battleship (it holds its own one band up; the battleship still has the hull)',U.eliteCruiser.seconds<=U.stockBattleship.seconds*1.25,U);
 // 5 · gilded trim on marked mounts, and persistence
 report.data.trim=await p.evaluate(()=>{const G=gunRanks;const w=G.fitted()[0];G.doc().ranks[w]=10;G.doc().marks[w]=2;engine.player.iFrames=0;let gold=0;const arc=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...a){if(this.strokeStyle==='#f0c860')gold++;return arc.apply(this,a);};engine.paused=false;engine.render();CanvasRenderingContext2D.prototype.stroke=arc;return{gold};});
 await p.screenshot({path:`${out}/trim.png`});
 check('marked mounts wear gilded rings (one per mark)',report.data.trim.gold>=2,report.data.trim);
 await p.evaluate(()=>saveState.save());await p.reload();await p.waitForFunction(()=>window.eliteMarks?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(()=>{const w=gunRanks.fitted()[0];return{mark:eliteMarks.mark(w),cores:eliteMarks.cores()};});
 check('marks and cores survive a reload',report.data.reload.mark===2&&report.data.reload.cores>0,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('elite marks witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
