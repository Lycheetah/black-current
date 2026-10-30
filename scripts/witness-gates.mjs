// Overnight run step 10 · buildable jump gates: build two, they link, fly in to cross (across systems or within one);
// a broken gate unlinks its partner. Writes shots/gates/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gates';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,600)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.jumpGates?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('BUILDER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();hubs.metal=50000;saveState.doc.inventory.push({type:'hull',radius:12,count:12});window.__go=(sys,gx,gy,x,y)=>{if(galaxy.currentId!==sys)galaxy.enterSystemById(sys);worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});engine.enemies=[];const P=engine.player;P.x=x;P.y=y;P.vx=P.vy=0;P.iFrames=1e9;};
  window.__tick=n=>{for(let i=0;i<n;i++){engine.paused=false;engine.mapOpen=false;engine.enemies=[];engine.update(1/60);}};});
 // 1 · the build panel offers a Jump Gate; one gate alone waits for a partner
 report.data.panel=await p.evaluate(()=>{__go('home',2,2,0,0);hubs.openBuild();const has=[...document.querySelectorAll('#build-list strong')].some(s=>/JUMP GATE/.test(s.textContent));hubs.closeBuild();return{has};});
 check('the build panel offers a Jump Gate',report.data.panel.has,report.data.panel);
 report.data.one=await p.evaluate(()=>{const r=hubs.build('gate');__tick(31);const g=jumpGates.gates();return{built:r!==false,count:g.length,linked:!!g[0]?.link};});
 check('one gate stands unlinked, waiting for a partner',report.data.one.built&&report.data.one.count===1&&!report.data.one.linked,report.data.one);
 // 2 · a second gate in another system links to it
 report.data.two=await p.evaluate(()=>{const far=galaxy.data.systems.filter(s=>!s.home&&!s.hub&&s.danger<=3&&s.hops>=2).sort((a,b)=>a.hops-b.hops)[0].id;galaxy.doc().visited.push(far);__go(far,1,0,0,0);const r=hubs.build('gate');__tick(31);const g=jumpGates.gates();return{far,built:r!==false,linked:g.length===2&&g[0].link===g[1].id&&g[1].link===g[0].id,sys:g.map(x=>x.sys)};});
 check('a second gate, in another system, links to the first',report.data.two.built&&report.data.two.linked,report.data.two);
 // 3 · fly into the gate: you come out beside its partner in the other system, and do not bounce straight back
 report.data.cross=await p.evaluate(()=>{const g=jumpGates.gates(),here=g.find(x=>x.sys===galaxy.currentId),there=g.find(x=>x!==here);const P=engine.player;P.x=here.x-300;P.y=here.y;P.vx=6;P.vy=0;P.iFrames=1e9;
  let f=0;engine.keys.KeyD=true;for(;f<300&&galaxy.currentId!==there.sys;f++)__tick(1);engine.keys.KeyD=false;const arrived=galaxy.currentId===there.sys&&worldMap.currentGridX===there.gx&&worldMap.currentGridY===there.gy,d=Math.hypot(P.x-there.x,P.y-there.y);__tick(120);
  return{arrived,frames:f,distance:Math.round(d),stayed:galaxy.currentId===there.sys,jumps:jumpGates.jumps};});
 check('flying into a linked gate brings you out beside its partner in the other system, and you do not bounce straight back',report.data.cross.arrived&&report.data.cross.distance<600&&report.data.cross.stayed&&report.data.cross.jumps===1,report.data.cross);
 await p.screenshot({path:`${out}/arrival.png`});
 // 3b · routes: from home, the far system is one jump through your gate (lanes need two or more), and autopilot flies it
 report.data.route=await p.evaluate(()=>{const g=jumpGates.gates(),home=g.find(x=>x.sys==='home'),far=g.find(x=>x.sys!=='home').sys;__go('home',home.gx,home.gy,home.x+900,home.y);
  const lanes=galaxy.data.byId[far].hops;travelHelper.destination(far);const t=travelHelper.target();
  const ok=autopilot.engage();let f=0;for(;f<3000&&galaxy.currentId!==far;f++)__tick(1);return{lanes,name:t?.name,jumps:t?.jumps,at:t&&[t.gx,t.gy],gate:[home.gx,home.gy],engaged:ok,arrived:galaxy.currentId===far,frames:f};});
 const RT=report.data.route;
 check('a route to the far system runs through your gate in one jump, and autopilot flies into it',RT.lanes>=2&&RT.jumps===1&&/^Gate to /.test(RT.name||'')&&RT.at?.join()===RT.gate.join()&&RT.engaged&&RT.arrived,RT);
 // 3c · the star map marks your gate's sector and draws the link between systems
 report.data.chart=await p.evaluate(()=>{const g=jumpGates.gates().find(x=>x.sys===galaxy.currentId);const ch=worldMap.chambers[g.gx+','+g.gy];return{marks:starMap.marks(ch),edges:jumpGates.edges().length};});
 check('the star map marks the sector holding your gate, and the gate link is a route edge',report.data.chart.marks.includes('yourgate')&&report.data.chart.edges===1,report.data.chart);
 // 3d · upkeep: paid on docking; unpaid gates go dark (no route, no crossing) until you dock with the metal
 report.data.upkeep=await p.evaluate(()=>{const G=jumpGates,d=G.upkeepDoc(),dock=()=>{__go('home',0,0,40,0);hubs.openDock();hubs.closeDock();};
  d.paidDay-=2;hubs.metal=5000;let m0=hubs.metal;dock();const paid=m0-hubs.metal,lit=!G.dark();
  d.paidDay-=3;hubs.metal=10;dock();const dark=G.dark(),edges=G.edges().length,toward=G.toward(G.gates().find(x=>x.sys!=='home').sys);
  const g=G.gates().find(x=>x.sys==='home');__go('home',g.gx,g.gy,g.x-300,g.y);const P=engine.player;P.vx=6;engine.keys.KeyD=true;__tick(120);engine.keys.KeyD=false;const blocked=galaxy.currentId==='home';
  hubs.metal=5000;m0=hubs.metal;dock();return{paid,expect:2*G.CFG.upkeep*2,lit,dark,edges,toward,blocked,relit:!G.dark(),repaid:m0-hubs.metal};});
 const UK=report.data.upkeep;
 check('gate upkeep is paid on docking (40 metal a gate a day); unpaid gates go dark, drop out of routes and cannot be crossed, and light again when paid',UK.paid===UK.expect&&UK.lit&&UK.dark&&UK.edges===0&&UK.toward===null&&UK.blocked&&UK.relit&&UK.repaid>0,UK);
 await p.evaluate(()=>{const g=jumpGates.gates().find(x=>x.sys!=='home');__go(g.sys,g.gx,g.gy,0,0);});
 // 4 · a broken gate unlinks its partner; a new gate re-pairs it
 report.data.broken=await p.evaluate(()=>{const g=jumpGates.gates();const victim=g.find(x=>x.sys!==galaxy.currentId);victim.hp=0;const L=hubs.list();L.splice(L.indexOf(victim),1);__tick(31);const left=jumpGates.gates();return{count:left.length,linked:!!left[0]?.link};});
 check('when a gate is destroyed its partner unlinks and waits for a new partner',report.data.broken.count===1&&!report.data.broken.linked,report.data.broken);
 // 5 · persistence
 await p.evaluate(()=>saveState.save());await p.reload();await p.waitForFunction(()=>window.jumpGates?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(()=>({gates:jumpGates.gates().length}));
 check('gates survive a reload',report.data.reload.gates===1,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gates witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
