// Overnight run step 8 · autopilot: Z (or the travel-cue button) flies a plotted route hands-off, across sectors and
// through jump gates into another system, and lets go on contact, on damage or when you take the helm.
// Writes shots/autopilot/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/autopilot';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.autopilot?.ready&&window.travelHelper?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('PILOT');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 // a quiet galaxy: no hostiles, no patrols, so the run measures flying, not fighting
 await p.evaluate(()=>{garage.closeMission();contactDirector.CFG.quietTicks=1e9;window.__quiet=()=>{engine.enemies=[];};const load=engine.loadChamberEntities;engine.loadChamberEntities=function(...a){const r=load.apply(this,a);if(window.__quietLoads)this.enemies=[];return r;};window.__quietLoads=true;const P=engine.player;P.iFrames=1e9;
  const home=galaxy.currentId,two=galaxy.data.byId[home].links.flatMap(n=>galaxy.data.byId[n].links).find(id=>id!==home&&!galaxy.data.byId[home].links.includes(id));
  galaxy.doc().visited.push(...galaxy.data.byId[home].links,two);window.__dest=two;});
 // 1 · with no route, Z explains instead of flying
 await p.keyboard.press('KeyZ');report.data.noRoute=await p.evaluate(()=>({active:autopilot.active,reason:autopilot.reason}));
 check('with no route plotted, Z says to plot one and does not fly',!report.data.noRoute.active&&/plot a route/i.test(report.data.noRoute.reason),report.data.noRoute);
 // 2 · two jumps away, hands off
 report.data.run=await p.evaluate(()=>{const dest=window.__dest;travelHelper.destination(dest);__quiet();const P=engine.player,start=galaxy.currentId,ok=autopilot.engage();const seen=new Set([start]);let f=0;
  for(;f<60*60*6&&autopilot.active;f++){engine.paused=false;engine.mapOpen=false;__quiet();engine.update(1/60);seen.add(galaxy.currentId);}
  return{engaged:ok,frames:f,seconds:+(f/60).toFixed(1),at:galaxy.currentId,dest,systems:[...seen],active:autopilot.active,reason:autopilot.reason};});
 const R=report.data.run;console.log('run',JSON.stringify(R));
 check('Z flies a two-jump route hands-off: through two jump gates into the destination system, then lets go on arrival',R.engaged&&R.at===R.dest&&R.systems.length>=3&&!R.active&&/arrived/i.test(R.reason),R);
 // 3 · it lets go when needed
 report.data.letgo=await p.evaluate(()=>{const out={};const P=engine.player;const back=galaxy.data.byId[galaxy.currentId].links[0];travelHelper.destination(back);
  __quiet();autopilot.engage();engine.keys.KeyW=true;engine.paused=false;engine.update(1/60);engine.keys.KeyW=false;out.helm={active:autopilot.active,reason:autopilot.reason};
  __quiet();autopilot.engage();const e=new EnemyOrganism(P.x+300,P.y,{tier:2,archetype:'stalker'});engine.enemies.push(e);engine.paused=false;engine.update(1/60);out.contact={active:autopilot.active,reason:autopilot.reason};
  __quiet();autopilot.engage();P.iFrames=0;P.hp-=5;engine.paused=false;engine.update(1/60);P.iFrames=1e9;P.hp=P.maxHp;out.damage={active:autopilot.active,reason:autopilot.reason};return out;});
 const L=report.data.letgo;
 check('it lets go when you take the helm, on hostile contact, and when you take damage',!L.helm.active&&/helm/.test(L.helm.reason)&&!L.contact.active&&/hostile/.test(L.contact.reason)&&!L.damage.active&&/fire/.test(L.damage.reason),L);
 // 4 · the travel cue has the button, and it toggles
 await p.evaluate(()=>{__quiet();if(garage.isRewardOpen())garage.closeReward();travelHelper.paint();});await p.locator('#travel-autopilot').click();report.data.button=await p.evaluate(()=>({active:autopilot.active,text:document.getElementById('travel-autopilot').textContent}));
 await p.screenshot({path:`${out}/cue.png`});
 check('the travel cue carries an Autopilot button that engages it',report.data.button.active&&/ON/.test(report.data.button.text),report.data.button);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('autopilot witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
