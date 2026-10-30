// Overnight run step 28 · HUD pass 2: the WING order chip never covers a button, a stick, the route card, the status
// card or the contracts, at five desktop and phone sizes, and it hides under menus. Writes shots/hud/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/hud';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
try{
 for(const vp of [{width:1366,height:768},{width:390,height:844},{width:844,height:390},{width:360,height:740},{width:740,height:360}]){
  const name=vp.width+'x'+vp.height,c=await browser.newContext({viewport:vp,hasTouch:vp.width<900}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await p.goto(url);await p.waitForFunction(()=>window.wingmen?.ready);
  await p.evaluate(()=>{document.getElementById('btn-menu-new').click();document.getElementById('title-callsign').value='HUD';document.getElementById('btn-title-quick').click();});await p.waitForTimeout(500);
  await p.evaluate(()=>{garage.closeMission();const d=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=d.design;engine.applyDesign(d.design,{restore:true});galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.player.x=40;engine.player.y=0;hubs.metal=1e6;hubs.openDock();const o=wingmen.offers();for(let i=0;i<3;i++)wingmen.hire(o[i].key);hubs.closeDock();
   worldMap.currentGridX=2;worldMap.currentGridY=0;engine.enterChamber({silent:true});travelHelper.sector(3,1,'Patrol');engine.paused=false;for(let i=0;i<5;i++)engine.update(1/60);engine.render();});
  await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const box=e=>{const q=e.getBoundingClientRect();return[q.left,q.top,q.right,q.bottom];};const chip=document.getElementById('wing-orders');if(!chip||chip.hidden)return{shown:false};const a=box(chip),hits=[];
   for(const el of document.querySelectorAll('button,#travel-cue,#phone-move-stick,#phone-aim-stick,.organism-info,#contracts')){if(el===chip||el.offsetParent===null)continue;const b=box(el);if(b[2]-b[0]<2)continue;if(a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3])hits.push(String(el.id||el.className||el.textContent).slice(0,30));}
   return{shown:true,chip:a.map(Math.round),inside:a[0]>=0&&a[2]<=innerWidth&&a[1]>=0&&a[3]<=innerHeight,hits};});
  await p.screenshot({path:`${out}/${name}.png`});
  const paused=await p.evaluate(()=>new Promise(res=>{engine.paused=true;setTimeout(()=>res(document.getElementById('wing-orders').hidden),450);}));
  report.data[name]={...r,hiddenWhenPaused:paused};
  check(`${name}: the WING chip shows, fits the screen, covers no control or card, and hides when paused`,r.shown&&r.inside&&r.hits.length===0&&paused,report.data[name]);
  await c.close();
 }
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('hud witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
