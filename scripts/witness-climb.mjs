// Master route Stage 3 · the climb: a progression census from frigate to titan.
// Kill times are MEASURED (native firing at a stationary band enemy); play pace is a MODEL:
// each kill costs OVERHEAD × the measured kill time plus TRAVEL seconds of finding the next fleet.
// Step cost = the native fabrication bill of the next factory flagship + Shipwright training +
// capital research for its capital gun models. Writes shots/climb/report.json.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/climb';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data)));};
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1280,height:800}});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await p.waitForFunction(()=>window.fleetFormation?.ready&&window.upgradePath?.ready&&window.weaponBalance?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('CLIMB');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 report.data=await p.evaluate(()=>{
  garage.closeMission();const M=modularShips,T=tuning,P=T.CLIMB;
  const sys=[...galaxy.data.systems].filter(s=>s.id!=='home'&&s.id!==saveState.doc.civHome&&!s.rule).sort((a,b)=>b.danger-a.danger)[0];galaxy.enterSystemById(sys.id);
  const ch=Object.values(worldMap.chambers).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});engine.paused=true;
  const STEPS=[['kestrel','frigate',2],['lancer','cruiser',4],['dreadnought','battleship',6],['leviathan','capital',8],['sovereign','supercapital',9],['athanor','titan',10]];
  const read=engine.readInput,random=Math.random;Math.random=()=>.999;const rows=[];
  try{for(const[id,hull,tier]of STEPS){
   // The factory steps guns down to a new captain's capacity; the census flies each frame's full intent:
   // every weapon slot gets the strongest roster gun that fits its mount and the reactor budget.
   const d=M.factory(id),limit=M.HULLS[hull].power,sec=k=>d.modular.sections.find(s=>s.id===k);
   const power=()=>d.modular.fittings.reduce((n,f)=>n+(M.GEARS[f.gear].power||0),0)+(d.modular.kit||[]).reduce((n,k)=>n+(M.PIECES[k.piece].power||0),0);
   for(const f of d.modular.fittings.filter(f=>M.GEARS[f.gear].weapon).sort((a,b)=>M.CLASSES?0:0)){
    const slot=M.SECTIONS[sec(f.slot).kind].slot,base=power()-M.GEARS[f.gear].power;
    const best=Object.entries(M.GEARS).filter(([,g])=>g.weapon&&!g.retired&&!g.salvageOnly&&M.fits(slot,g)&&base+g.power<=limit).sort(([,a],[,b])=>arsenal.dps(b.weapon)-arsenal.dps(a.weapon))[0];
    if(best)f.gear=best[0];
   }
   const c=M.compile(d);saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});const pl=engine.player;pl.x=pl.y=0;pl.vx=pl.vy=0;pl.angle=0;pl.iFrames=1e9;
   const e=new EnemyOrganism(0,0,{tier,archetype:'stalker'});frontierPve.decorate(e);combatScaling.enemy(e);hostileSkins.skin(e);const m=hostileSkins.model(e);e.x=Math.max(700,(m?m.W*.6:300)+fleetFormation.radius(pl)+200);e.y=0;e.angle=Math.PI;e.update=()=>{};
   engine.projectiles=[];engine.bioMines=[];progression.bubbleDrops=[];worldMap.getCurrentChamber().isCleared=true;engine.readInput=function(){return this.input={ax:0,ay:0,aimX:e.x,aimY:e.y,fire:true};};
   const bounty=upgradePath.bountyFor(e);let frame=0;engine.paused=false;for(;frame<60*90&&e.hp>0;frame++){engine.enemies=[e];engine.update(1/60);}engine.paused=true;
   const kill=frame/60,perKill=kill*P.overhead+P.travel,metalPerHour=Math.round(3600/perKill*bounty);
   // What it costs to fly this frame from nothing: fabrication bill + training to its rank + capital licences.
   const h={v:1,rank:0,owned:{}},saved=saveState.doc.modularHangar;saveState.doc.modularHangar=h;let bill;try{bill=M.quote(d).total;}finally{saveState.doc.modularHangar=saved;}
   const rank=M.HULLS[hull].rank,training=M.RANK_COST.slice(0,rank).reduce((a,b)=>a+b,0),research=[...new Set(d.modular.fittings.map(f=>M.GEARS[f.gear]).filter(g=>g.weapon&&upgradePath.needsResearch(g.weapon)).map(g=>g.weapon))].reduce((n,w)=>n+(armory.PRICES[w]||0),0);
   rows.push({id,hull,tier,killSeconds:+kill.toFixed(1),killed:e.hp<=0,bounty,metalPerHour,bill,training,research,total:bill+training+research,biomass:M.HULLS[hull].mass});
  }}finally{engine.readInput=read;Math.random=random;}
  // Hours to afford the NEXT frame while flying this one (only the extra cost of the step counts).
  for(let i=1;i<rows.length;i++){const prev=rows[i-1],r=rows[i];r.stepMetal=r.total-prev.total;r.stepHours=+(r.stepMetal/prev.metalPerHour).toFixed(2);}
  const hours=rows.slice(1).reduce((n,r)=>n+r.stepHours,0);
  return{model:P,rows,totalHours:+hours.toFixed(1)};
 });
 const r=report.data.rows;console.table(r.map(x=>({frame:x.hull,tier:x.tier,kill_s:x.killSeconds,bounty:x.bounty,metal_h:x.metalPerHour,total_cost:x.total,step_metal:x.stepMetal,step_h:x.stepHours})));
 console.log('model',JSON.stringify(report.data.model),'total hours',report.data.totalHours);
 check('every frame kills its band enemy through native firing',r.every(x=>x.killed),r.map(x=>[x.hull,x.killSeconds]));
 check('frigate to titan lands in the target window',report.data.totalHours>=report.data.model.targetHours[0]&&report.data.totalHours<=report.data.model.targetHours[1],{hours:report.data.totalHours,target:report.data.model.targetHours});
 const steps=r.slice(1).map(x=>x.stepHours);
 check('no single step is a wall (≤35% of the climb)',steps.every(h=>h<=report.data.totalHours*.35),steps);
 check('each step takes longer than the last, by at most 3×',steps.slice(1).every((h,i)=>h>=steps[i]*.9&&h<=steps[i]*3),steps);
 // Drops: 300 native kills of a deep tier-8 fleet hull. Equipment must stay scarce and useful.
 report.data.drops=await p.evaluate(()=>{const N=300,kinds={part:0,core:0,fitting:0},classes={},random=Math.random;let seed=7;Math.random=()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/4294967296);
  try{for(let i=0;i<N;i++){const e=new EnemyOrganism(0,0,{tier:8,archetype:'stalker'});frontierPve.decorate(e);combatScaling.enemy(e);engine.enemies=[e];progression.bubbleDrops=[];const inv=saveState.doc.inventory.length;engine.killEnemy(0);
   for(const d of progression.bubbleDrops){if(d.core)kinds.core++;if(d.part){kinds.part++;if(d.part.type==='cannon'){const g=modularShips.GEARS[recoveredFittings.gearOf(d.part)];classes[g?.cls+(g?.retired?' (retired)':'')]=(classes[g?.cls+(g?.retired?' (retired)':'')]||0)+1;}}}
   kinds.fitting+=Math.max(0,saveState.doc.inventory.length-inv);}}finally{Math.random=random;}
  return{kills:N,perHundred:Object.fromEntries(Object.entries(kinds).map(([k,v])=>[k,+(v*100/N).toFixed(1)])),cannonClasses:classes};});
 check('equipment stays scarce: under 12 loose parts per 100 ordinary deep kills',report.data.drops.perHundred.part<12,report.data.drops);
 check('recovered guns from deep wrecks are roster guns of the band class (Capital at tier 8)',Object.keys(report.data.drops.cannonClasses).length>0&&Object.keys(report.data.drops.cannonClasses).every(k=>k==='CAPITAL'),report.data.drops);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('climb census completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,hours:report.data.totalHours,drops:report.data.drops}));}
if(report.failed)process.exitCode=1;
