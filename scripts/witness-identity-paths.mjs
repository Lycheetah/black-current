// Overnight run step 23 · hull paths (js/hull-paths.js): five paths per frame, each a measured trade, remembered per
// frame. Writes shots/identity-paths/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/identity-paths';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
const near=(a,b,t=0.01)=>Math.abs(a-b)<t;
try{
 await p.goto(url);await p.waitForFunction(()=>window.hullPaths?.ready&&window.wingmen?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('PATHS');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();terrain.off=true;
  window.__fly=id=>{const c=modularShips.compile(modularShips.factory(id));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});};
  window.__dock=()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.enemies=[];engine.player.x=40;engine.player.y=0;engine.paused=false;hubs.openDock();};
  /* one representative shot from the first fitted gun: its damage and its life */
  window.__shot=()=>{const P=engine.player,w=gunRanks.fitted()[0];engine.projectiles=[];engine.fireMountGroup(w,[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:w}}}],1);const q=engine.projectiles.filter(q=>q.isPlayer);return{damage:Math.max(...q.map(q=>q.damage)),life:Math.max(...q.map(q=>q.life||0))};};
  window.__stats=()=>{engine.recalculatePlayerStats();const P=engine.player,s=arsenal.shields.profile(P.nodes);return{thrust:engine.coreMod('thrust'),hull:P.maxHp,shield:s.pool,slots:wingmen.slots(),...__shot()};};});
 // 1 · five paths with a refit price, bought only while docked and paid for
 report.data.buy=await p.evaluate(()=>{__fly('lancer');__dock();const H=hullPaths,price=H.price();hubs.metal=price-1;const poor=H.choose('assault');hubs.metal=50000;hubs.closeDock();const undocked=H.choose('assault');__dock();const m0=hubs.metal,ok=H.choose('assault');
  return{paths:Object.keys(H.PATHS),price,poor,undocked,ok,spent:m0-hubs.metal,current:H.current(),again:H.choose('assault')};});
 const B=report.data.buy;
 check('a frame offers five paths; a refit needs a dock and the metal, spends exactly its price, and the same path twice is refused',B.paths.join()==='interceptor,assault,logistics,carrier,siege'&&B.price>0&&!B.poor&&!B.undocked&&B.ok&&B.spent===B.price&&B.current==='assault'&&!B.again,B);
 // 2 · each path is its measured trade against no path
 report.data.trade=await p.evaluate(()=>{const H=hullPaths,set=id=>{if(id)H.doc().byHull[saveState.doc.design.modular.hull]=id;else delete H.doc().byHull[saveState.doc.design.modular.hull];return __stats();};
  const base=set(null),out={base};for(const id of Object.keys(H.PATHS))out[id]=set(id);set('assault');return out;});
 const T=report.data.trade,b=T.base,r=(k,id)=>T[id][k]/b[k];
 report.data.ratios=Object.fromEntries(Object.keys(T).filter(k=>k!=='base').map(id=>[id,{thrust:+r('thrust',id).toFixed(3),hull:+r('hull',id).toFixed(3),shield:b.shield?+r('shield',id).toFixed(3):null,damage:+r('damage',id).toFixed(3),life:+r('life',id).toFixed(3),slots:T[id].slots-b.slots}]));
 console.log('ratios',JSON.stringify(report.data.ratios));
 const R=report.data.ratios;
 check('interceptor: thrust ×1.2, hull ×0.88 (±rounding)',near(R.interceptor.thrust,1.2)&&near(R.interceptor.hull,0.88,0.02)&&near(R.interceptor.damage,1),R.interceptor);
 check('assault: gun damage ×1.12, thrust ×0.95',near(R.assault.damage,1.12)&&near(R.assault.thrust,0.95),R.assault);
 check('logistics: hull ×1.15, shield ×1.25, damage ×0.9',near(R.logistics.hull,1.15,0.02)&&(R.logistics.shield===null||near(R.logistics.shield,1.25))&&near(R.logistics.damage,0.9),R.logistics);
 check('carrier: one more wingman slot, damage ×0.9',R.carrier.slots===1&&near(R.carrier.damage,0.9),R.carrier);
 check('siege: damage ×1.08, shot life ×1.25, thrust ×0.85',near(R.siege.damage,1.08)&&near(R.siege.life,1.25,0.05)&&near(R.siege.thrust,0.85),R.siege);
 // 3 · logistics repairs the hull over time; no path never does
 report.data.regen=await p.evaluate(()=>{const H=hullPaths,h=saveState.doc.design.modular.hull,P=engine.player;hubs.closeDock();engine.paused=false;engine.enemies=[];const run=id=>{if(id)H.doc().byHull[h]=id;else delete H.doc().byHull[h];engine.recalculatePlayerStats();P.hp=P.maxHp*0.5;const h0=P.hp;for(let i=0;i<300;i++)engine.update(1/60);return{gain:P.hp-h0,max:P.maxHp};};
  /* the ship's own repair is a flat amount a tick; logistics adds 0.3% of its hull a second on top */
  const none=run(null),logi=run('logistics');H.doc().byHull[h]='assault';engine.recalculatePlayerStats();return{none:+none.gain.toFixed(2),logi:+logi.gain.toFixed(2),extra:+((logi.gain-none.gain)/logi.max).toFixed(4)};});
 check('logistics adds about 1.5% of the hull in 5 s on top of the ship\'s own repair',near(report.data.regen.extra,0.015,0.003),report.data.regen);
 // 4 · remembered per frame
 report.data.frames=await p.evaluate(()=>{const H=hullPaths;__fly('dreadnought');const big=H.current();__dock();H.choose('siege');const siege=H.current();__fly('lancer');const back=H.current();__fly('dreadnought');return{big,siege,back,again:H.current()};});
 const FR=report.data.frames;
 check('a path belongs to its frame: the battleship starts with none, takes siege, and the cruiser keeps assault',FR.big===null&&FR.siege==='siege'&&FR.back==='assault'&&FR.again==='siege',FR);
 // 5 · the upgrade path shows the five refits
 await p.evaluate(()=>{__dock();bay.show();hangarUI.open('path');});await p.waitForTimeout(250);
 report.data.ui=await p.evaluate(()=>({section:!!document.getElementById('hull-paths'),buttons:document.querySelectorAll('[data-hull-path]').length,on:document.querySelector('[data-hull-path][aria-pressed=true]')?.dataset.hullPath}));
 await p.screenshot({path:`${out}/paths.png`});
 check('the upgrade path lists the five refits for the frame you fly, with yours marked',report.data.ui.section&&report.data.ui.buttons===5&&report.data.ui.on==='siege',report.data.ui);
 // 6 · persistence
 await p.evaluate(()=>{hangarUI.close?.();bay.close?.();saveState.save();});await p.reload();await p.waitForFunction(()=>window.hullPaths?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(500);
 report.data.reload=await p.evaluate(()=>({byHull:hullPaths.doc().byHull,current:hullPaths.current()}));
 check('paths survive a reload',report.data.reload.byHull.cruiser==='assault'&&report.data.reload.current==='siege',report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('identity paths witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
