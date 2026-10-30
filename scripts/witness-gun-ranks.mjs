// Overnight run step 5 · gun ranks 1–10: bought with metal at a station, +6% damage a rank, shared by every mount of a gun.
// Writes shots/gun-ranks/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gun-ranks';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.gunRanks?.ready&&window.hangarUI?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('RANKER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 // 1 · prices rise with rank and class; ranks start at 1
 report.data.prices=await p.evaluate(()=>{garage.closeMission();const G=gunRanks,w=G.fitted()[0];const curve=[];for(let r=1;r<10;r++){G.doc().ranks[w]=r;curve.push(G.cost(w));}G.doc().ranks={};
  const byClass=['spitter','autocannon','heavycannon'].filter(x=>WEAPON_TYPES[x]).map(x=>[x,G.classOf(x),G.cost(x)]);return{w,start:G.rank(w),mult:G.mult(w),curve,byClass};});
 const P=report.data.prices;
 check('a new gun is rank 1 with no bonus; each rank costs more than the last',P.start===1&&P.mult===1&&P.curve.every((c,i,a)=>!i||c>a[i-1]),P);
 check('bigger gun classes cost more to rank',P.byClass.length>=2&&P.byClass.every((x,i,a)=>!i||x[2]>a[i-1][2]),P.byClass);
 // 2 · rank up at a station; refused undocked or without metal
 report.data.buy=await p.evaluate(()=>{const G=gunRanks,w=G.fitted()[0];hubs.metal=0;const broke=(civilisations.goHome(),engine.paused=false,hubs.openDock(),G.raise(w));hubs.closeDock();hubs.metal=10000;const undocked=G.raise(w);
  engine.paused=false;hubs.openDock();const m0=hubs.metal,price=G.cost(w),ok=G.raise(w);return{broke,undocked,ok,rank:G.rank(w),spent:m0-hubs.metal,price};});
 const B=report.data.buy;
 check('ranking up needs a dock and the metal, then spends exactly the shown price',B.broke===false&&B.undocked===false&&B.ok===true&&B.rank===2&&B.spent===B.price,B);
 // 3 · damage: every mount of that gun fires +6% per rank
 report.data.damage=await p.evaluate(()=>{const G=gunRanks,w=G.fitted()[0],P=engine.player;engine.enemies=[];terrain.off=true;
  const shot=()=>{engine.projectiles=[];engine.fireMountGroup(w,[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:w}}}],1);return Math.max(...engine.projectiles.map(q=>q.damage));};
  G.doc().ranks[w]=1;const d1=shot();G.doc().ranks[w]=6;const d6=shot();G.doc().ranks[w]=10;const d10=shot();terrain.off=false;return{d1,d6,d10,r6:d6/d1,r10:d10/d1};});
 const D=report.data.damage;
 check('rank 6 hits 1.30× and rank 10 hits 1.54×',Math.abs(D.r6-1.3)<0.02&&Math.abs(D.r10-1.54)<0.02,D);
 report.data.cap=await p.evaluate(()=>{const G=gunRanks,w=G.fitted()[0];G.doc().ranks[w]=10;hubs.metal=1e6;return{cost:G.cost(w),raise:G.raise(w),rank:G.rank(w)};});
 check('rank 10 is the cap; elite marks are the next step',report.data.cap.cost===null&&report.data.cap.raise===false&&report.data.cap.rank===10,report.data.cap);
 // 4 · the station path lists your guns with pips and a working button
 await p.evaluate(()=>{const G=gunRanks,w=G.fitted()[0];G.doc().ranks[w]=3;hubs.metal=50000;});await p.evaluate(()=>{bay.show();hangarUI.open('path');});
 const w=report.data.prices.w;await p.locator(`[data-gun-rank="${w}"]`).click();
 report.data.ui=await p.evaluate(w=>({rows:document.querySelectorAll('[data-gun-rank-row]').length,rank:gunRanks.rank(w),pips:document.querySelector(`[data-gun-rank-row="${w}"] .gun-rank-pips`)?.textContent}),w);
 await p.screenshot({path:`${out}/path.png`});
 check('the station path lists each fitted gun with rank pips and ranks it up in place',report.data.ui.rows>=1&&report.data.ui.rank===4&&report.data.ui.pips==='●●●●○○○○○○',report.data.ui);
 // 5 · persistence
 await p.evaluate(()=>{hangarUI.close?.();bay.close?.();saveState.save();});await p.reload();await p.waitForFunction(()=>window.gunRanks?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(w=>({rank:gunRanks.rank(w),mult:gunRanks.mult(w)}),w);
 check('ranks survive a reload',report.data.reload.rank===4&&Math.abs(report.data.reload.mult-1.18)<1e-9,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gun ranks witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
