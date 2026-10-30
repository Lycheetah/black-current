// Overnight run step 24 · gun mods (js/gun-mods.js): a mod slot per gun type at rank 5, bought with elite cores.
// Writes shots/gun-mods/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gun-mods';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.gunMods?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('MODDER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();terrain.off=true;
  window.__dock=()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.enemies=[];engine.player.x=40;engine.player.y=0;engine.paused=false;hubs.openDock();};
  window.__w=gunRanks.fitted()[0];
  window.__fire=()=>{const P=engine.player;engine.projectiles=[];engine.fireMountGroup(__w,[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:__w}}}],1);return engine.projectiles.filter(q=>q.isPlayer);};});
 // 1 · the slot opens at rank 5 and costs elite cores and metal, docked
 report.data.buy=await p.evaluate(()=>{const G=gunRanks,M=gunMods,w=__w;__dock();hubs.metal=50000;G.doc().cores=10;G.doc().ranks[w]=4;const low=M.fit(w,'pierce');G.doc().ranks[w]=5;G.doc().cores=1;const poor=M.fit(w,'pierce');G.doc().cores=10;hubs.closeDock();const undocked=M.fit(w,'pierce');__dock();
  const P=M.price(w),m0=hubs.metal,c0=G.doc().cores,ok=M.fit(w,'pierce');return{low,poor,undocked,ok,spentMetal:m0-hubs.metal,spentCores:c0-G.doc().cores,price:P,mod:M.modOf(w),same:M.fit(w,'pierce')};});
 const B=report.data.buy;
 check('a mod slot opens at rank 5; fitting needs a dock and the elite cores, spends exactly its price, and the same mod twice is refused',!B.low&&!B.poor&&!B.undocked&&B.ok&&B.spentMetal===B.price.metal&&B.spentCores===B.price.cores&&B.mod==='pierce'&&!B.same,B);
 // 2 · each mod changes the shot as stated
 report.data.shots=await p.evaluate(()=>{const M=gunMods,w=__w,set=id=>{if(id)M.doc().mods[w]=id;else delete M.doc().mods[w];return __fire();};
  const base=set(null),pierce=set('pierce'),split=set('split');const P=engine.player,e=new EnemyOrganism(P.x+600,P.y+400,{tier:1,archetype:'mote'});e.update=()=>{};engine.enemies=[e];engine.input={aimX:e.x,aimY:e.y};
  const homing=set('homing');const qh=homing[0],y0=qh.y;for(let i=0;i<20;i++){engine.paused=false;engine.update(1/60);}const leaned=engine.projectiles.includes(qh)?qh.y-y0:null;engine.enemies=[];delete M.doc().mods[w];
  return{base:{n:base.length,d:base[0].damage,pierce:base[0].pierce||1},pierce:pierce[0].pierce||1,split:{n:split.length,shard:+(split.filter(q=>q.splitShard).map(q=>q.damage)[0]/split.find(q=>!q.splitShard).damage).toFixed(2)},homing:{d:+(homing[0].damage/base[0].damage).toFixed(2),leaned}};});
 const S=report.data.shots;
 check('pierce: one more hull per shot',S.pierce===S.base.pierce+1,S);
 check('split: each shot throws two shards at 35% damage',S.split.n===S.base.n*3&&S.split.shard===0.35,S);
 check('homing: shots lean toward the hostile nearest your aim, at 90% damage',S.homing.d===0.9&&S.homing.leaned>5,S);
 // 3 · changing a mod costs the full price again
 report.data.swap=await p.evaluate(()=>{const M=gunMods,G=gunRanks,w=__w;M.doc().mods[w]='pierce';const c0=G.doc().cores,ok=M.fit(w,'split');return{ok,spent:c0-G.doc().cores,mod:M.modOf(w)};});
 check('swapping to another mod costs the full price again',report.data.swap.ok&&report.data.swap.spent===2&&report.data.swap.mod==='split',report.data.swap);
 // 4 · the upgrade path lists the mod row
 await p.evaluate(()=>{bay.show();hangarUI.open('path');});await p.waitForTimeout(250);
 report.data.ui=await p.evaluate(()=>({section:!!document.getElementById('gun-mods'),rows:document.querySelectorAll('[data-gun-mod-row]').length,buttons:document.querySelectorAll('[data-gun-mod]').length}));
 await p.screenshot({path:`${out}/path.png`});
 check('the upgrade path has a Gun mods section with a row per fitted gun and the three mods',report.data.ui.section&&report.data.ui.rows>=1&&report.data.ui.buttons>=3,report.data.ui);
 // 5 · persistence
 await p.evaluate(()=>{hangarUI.close?.();bay.close?.();saveState.save();});await p.reload();await p.waitForFunction(()=>window.gunMods?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(()=>gunMods.modOf(gunRanks.fitted()[0]));
 check('mods survive a reload',report.data.reload==='split',report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gun mods witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
