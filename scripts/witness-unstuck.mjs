// Unstuck (js/unstuck.js). Mac, 2026-10-30: "if you leave an area, like an arena, or by glitching out of the bubble,
// there's no unstuck button". Pause → Unstuck brings a ship lost outside its sector back to a clear spot inside; the
// safety net does it alone after four seconds well outside; in a rift the first press brings you back in and a second
// within 10 s leaves the rift by its own exit. Writes shots/unstuck/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/unstuck';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1214,height:760}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.unstuck?.ready&&window.rifts?.ready&&window.starterJourney?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('LOST HULL');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'));
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();garage.closeReward?.();civilisations.goHome();worldMap.currentGridX=2;worldMap.currentGridY=1;engine.enterChamber({silent:true});});
 // 1 · the pause button, on a ship far outside the sector's bubble
 await p.evaluate(()=>{const P=engine.player,R=worldMap.getCurrentChamber().radius;P.x=R*2.2;P.y=R*0.4;P.vx=P.vy=0;P.iFrames=0;engine.paused=true;menu.pause();});
 await p.waitForTimeout(200);
 report.data.door=await p.evaluate(()=>{const b=document.getElementById('btn-pause-unstuck');return{doors:[...b.parentElement.children].map(x=>x.id+(x.offsetParent?'':'(hidden)')),shown:!!b&&b.offsetParent!==null,beforeQuit:!!b&&!!(b.compareDocumentPosition(document.getElementById('btn-pause-quit'))&Node.DOCUMENT_POSITION_FOLLOWING)&&b.parentElement===document.getElementById('btn-pause-quit').parentElement};});
 await p.screenshot({path:`${out}/pause.png`});
 check('the pause menu has an Unstuck door among its doors, above Save & quit',report.data.door.shown&&report.data.door.beforeQuit,report.data.door);
 await p.locator('#btn-pause-unstuck').click();await p.waitForTimeout(150);
 report.data.manual=await p.evaluate(()=>{const P=engine.player,ch=worldMap.getCurrentChamber(),R=ch.radius,f=terrain.current?.(),r=Math.max(40,roomScale.shipLength()*0.6);
  return{d:Math.round(Math.hypot(P.x,P.y)),R,v:Math.hypot(P.vx,P.vy),grace:P.iFrames,paused:engine.paused||menu.isPaused(),clear:(f?.solids||[]).every(o=>Math.hypot(o.x-P.x,o.y-P.y)>o.r+r),grid:[worldMap.currentGridX,worldMap.currentGridY]};});
 await p.screenshot({path:`${out}/back-inside.png`});
 const M=report.data.manual;
 check('Unstuck brings the ship back inside the same sector, still, clear of rock, with grace, and play resumes',M.d<M.R*0.75&&M.v===0&&M.grace>=90&&!M.paused&&M.clear&&M.grid.join()==='2,1',M);
 // 2 · the safety net: held outside (as a glitch would) for four seconds
 report.data.auto=await p.evaluate(()=>{const P=engine.player,R=worldMap.getCurrentChamber().radius,a=unstuck.stats.auto;engine.paused=false;let frames=0;
  for(;frames<400&&unstuck.stats.auto===a;frames++){P.x=R*1.6;P.y=0;P.vx=P.vy=0;engine.update(1/60);}
  return{frames,fired:unstuck.stats.auto-a,d:Math.round(Math.hypot(P.x,P.y)),R};});
 const A=report.data.auto;
 check('the safety net brings a ship held well outside back in after about four seconds',A.fired===1&&A.frames>=235&&A.frames<=250&&A.d<A.R,A);
 report.data.edge=await p.evaluate(()=>{const P=engine.player,R=worldMap.getCurrentChamber().radius,a=unstuck.stats.auto;for(let i=0;i<300;i++){P.x=R*1.1;P.y=0;P.vx=P.vy=0;engine.update(1/60);}return{fired:unstuck.stats.auto-a};});
 check('flying just past the edge (where the membrane turns you back) is not touched',report.data.edge.fired===0,report.data.edge);
 // 3 · a rift: the first press brings you back into the arena, the second leaves by the rift's own exit
 report.data.rift=await p.evaluate(()=>{unstuck.run('manual');   // a press out in the sector first: it must not arm leaving the rift entered next
  const s=rifts.riftSector(galaxy.current);worldMap.currentGridX=s.gx;worldMap.currentGridY=s.gy;engine.enterChamber({silent:true});const t=rifts.here();const P=engine.player;P.x=t.x;P.y=t.y;P.vx=P.vy=0;engine.update(1/60);
  rifts.enter();const inRift=!!rifts.active,R=rifts.active?.room.radius;P.x=R*3;P.y=0;
  const first=unstuck.run('manual'),afterFirst={active:!!rifts.active,d:Math.round(Math.hypot(P.x,P.y))};
  const second=unstuck.run('manual');return{inRift,R,first,afterFirst,second,activeAfter:!!rifts.active,grid:[worldMap.currentGridX,worldMap.currentGridY],want:[s.gx,s.gy]};});
 const F=report.data.rift;
 check('in a rift the first Unstuck keeps the run and brings you back inside the arena',F.inRift&&F.afterFirst.active&&F.afterFirst.d<F.R&&F.first.kind==='rift',F);
 check('a second Unstuck within 10 s leaves the rift by its own exit, back in the host sector',F.second?.left&&!F.activeAfter&&F.grid.join()===F.want.join(),F);
}catch(e){check('witness completed',false,e.message);}
const failed=report.checks.filter(c=>!c.ok).length;writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.checks.length-failed,failed,errors:report.errors}));
await browser.close();process.exit(failed||report.errors.length?1:0);
