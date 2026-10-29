// Overnight run step 16 · onboarding: a scripted new pilot reaches the first upgrade (a gun rank) inside ten minutes.
// The bot flies the real game through engine.readInput: it follows the plotted beacon and shoots the nearest hostile.
// Every menu step (accept, recover, dock, reward, rank) is charged a fixed human allowance on the clock.
// Writes shots/onboarding/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/onboarding';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
const UI={accept:10,recover:4,dock:6,reward:10,rank:8};   // seconds a new pilot spends on each menu step
try{
 await p.goto(url);await p.waitForFunction(()=>window.onboarding?.ready&&window.firstExpedition?.ready&&window.navigationHud?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ROOKIE');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 await p.evaluate(()=>{garage.closeMission();window.__clock={frames:0,ui:0,log:[]};
  window.__fly=(until,max)=>{const P=engine.player,read=engine.readInput;let f=0;
   engine.readInput=function(){const b=navigationHud.beacon(),foes=engine.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-P.x,e.y-P.y)<900).sort((a,c)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(c.x-P.x,c.y-P.y));
    let ax=0,ay=0;if(b){const dx=b.x-P.x,dy=b.y-P.y,d=Math.hypot(dx,dy)||1;if(d>60){ax=dx/d;ay=dy/d;}}const t=foes[0];
    return this.input={ax,ay,aimX:t?t.x:P.x+Math.cos(P.angle||0)*200,aimY:t?t.y:P.y+Math.sin(P.angle||0)*200,fire:!!t};};
   try{engine.paused=false;for(;f<max&&!until();f++){engine.update(1/60);if(P.dead)break;}}finally{engine.readInput=read;}
   __clock.frames+=f;return{f,dead:!!P.dead};};
  window.__ui=(what,s)=>{__clock.ui+=s;__clock.log.push(what+' @'+((__clock.frames/60+__clock.ui)|0)+'s');};
  window.__closeMap=()=>{if(engine.mapOpen)engine.toggleMapModal();engine.paused=false;};});
 // 1 · the dockkeeper's job: accept at the home dock, then follow the beacon to the recorder and fight the guards
 report.data.out=await p.evaluate(()=>{engine.player.x=40;engine.player.y=0;hubs.openDock();const ok=firstExpedition.accept();__ui('accept',10);firstExpedition.openChart();__closeMap();
  const r=__fly(()=>firstExpedition.state().guards.every(Boolean)&&Math.hypot(engine.player.x-firstExpedition.TARGET.x,engine.player.y-firstExpedition.TARGET.y)<120&&worldMap.currentGridX===1,4*60*60);
  const got=firstExpedition.recover();__ui('recover',4);return{accepted:ok,...r,recovered:got,stage:firstExpedition.state().stage,t:__clock.frames/60|0};});
 check('a new pilot accepts the first expedition, follows the beacon, beats both guards and recovers the recorder',report.data.out.accepted&&report.data.out.recovered&&!report.data.out.dead,report.data.out);
 // 2 · back to the home dock for the reward
 report.data.home=await p.evaluate(()=>{firstExpedition.openChart();__closeMap();const r=__fly(()=>galaxy.currentId==='home'&&worldMap.currentGridX===0&&worldMap.currentGridY===0&&Math.hypot(engine.player.x,engine.player.y)<300,3*60*60);
  hubs.openDock();__ui('dock',6);const rew=firstExpedition.chooseReward('burst');__ui('reward',10);return{...r,docked:!!hubs.docked,reward:rew,metal:hubs.metal,t:(__clock.frames/60+__clock.ui)|0};});
 check('…flies home, docks and claims the reward',report.data.home.docked&&report.data.home.reward&&!report.data.home.dead,report.data.home);
 // 3 · the first upgrade: the dock shows one door for it
 await p.waitForTimeout(700);
 report.data.cue=await p.evaluate(()=>{const d=document.getElementById('onboard-rank-door'),c=document.getElementById('onboard-cue');return{pending:onboarding.pending(),door:!!d&&!d.hidden&&!d.disabled&&d.offsetParent!==null,label:d?.textContent,cue:c?.querySelector('p')?.textContent||''};});
 check('the dock shows a one-tap first-upgrade door naming the gun and its price',report.data.cue.pending&&report.data.cue.door&&/Rank up .+First upgrade · \d+ metal/.test(report.data.cue.label),report.data.cue);
 await p.screenshot({path:`${out}/dock-door.png`});
 await p.locator('#onboard-rank-door').click();
 report.data.rank=await p.evaluate(()=>{__ui('rank',8);const w=onboarding.gun()||gunRanks.fitted()[0],ranks=gunRanks.doc().ranks;return{ranked:Object.values(ranks).some(r=>r>=2),pending:onboarding.pending(),seconds:(__clock.frames/60+__clock.ui)|0,flight:__clock.frames/60|0,log:__clock.log};});
 console.log('timeline',JSON.stringify(report.data.rank));
 check('one tap ranks the gun, and the prompt is gone for good',report.data.rank.ranked&&!report.data.rank.pending&&!(await p.locator('#onboard-rank-door').isVisible()),report.data.rank);
 check('the scripted new pilot reaches the first upgrade inside ten minutes',report.data.rank.seconds<600,report.data.rank);
 // 4 · in flight, before the upgrade, the contracts card carries the NEXT STEP line (desktop)
 report.data.flightCue=await p.evaluate(()=>{const d=onboarding,ranks=gunRanks.doc().ranks,keep={...ranks};for(const k in ranks)ranks[k]=1;saveState.doc.onboarding={v:1,rankedAt:0};hubs.closeDock();d.paint();const c=document.getElementById('onboard-cue'),r={shown:!!c&&!c.hidden,text:c?.textContent||''};Object.assign(ranks,keep);saveState.doc.onboarding.rankedAt=Date.now();d.paint();r.after=!!c&&!c.hidden;return r;});
 check('in flight the contracts card says NEXT STEP: rank up at the dock, until it is done',report.data.flightCue.shown&&/NEXT STEP/.test(report.data.flightCue.text)&&/Dock/.test(report.data.flightCue.text)&&!report.data.flightCue.after,report.data.flightCue);
 // 5 · persistence
 await p.evaluate(()=>saveState.save());await p.reload();await p.waitForFunction(()=>window.onboarding?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(500);
 report.data.reload=await p.evaluate(()=>({pending:onboarding.pending(),rankedAt:!!saveState.doc.onboarding?.rankedAt}));
 check('the finished step stays finished after a reload',!report.data.reload.pending&&report.data.reload.rankedAt,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('onboarding witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
