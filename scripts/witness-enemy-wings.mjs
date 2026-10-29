/* Native sector composition, disarmable tactics and the existing commission flow. */
import {firefox} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/enemy-wings';mkdirSync(out,{recursive:true});const report={checks:[],errors:[],data:{}};
const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':': '+JSON.stringify(detail)));};
const source=readFileSync('js/enemy-wings.js','utf8'),planSource=source.slice(source.indexOf('  function plan('),source.indexOf('  function compose('));
const fixture={ready:true,excluded:()=>false,factionFleets:{protectedSector:()=>true},galaxy:{currentId:'home'},WINGS:{recovery:{}},hash:()=>0};
vm.runInNewContext(planSource+'; good=plan({dangerLevel:3,gridX:0,gridY:2});factionFleets.protectedSector=()=>false;bad=plan({dangerLevel:3,gridX:0,gridY:2});',fixture);
check('protection gate rejects home; negative control catches disabled protection',fixture.good===null&&fixture.bad?.id==='recovery');
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message));
const ready=()=>p.waitForFunction(()=>window.enemyWings?.ready&&window.stationGrid?.ready);
try{
 await p.goto(process.argv[2]||'http://127.0.0.1:8811/black-current/');await ready();await p.locator('#btn-menu-new').tap();await p.evaluate(()=>civilisations.choose('savanah'));await p.locator('#title-callsign').fill('TACTICAL WITNESS');await p.locator('#btn-title-quick').tap();await p.evaluate(()=>{garage.closeMission();civilisations.goHome();engine.paused=true;engine.player.iFrames=999999;});
 const safe=await p.evaluate(()=>{const out=[];for(const[x,y]of[[0,1],[0,2],[0,3],[1,0]]){worldMap.currentGridX=x;worldMap.currentGridY=y;engine.enterChamber({silent:true});out.push({x,y,plan:enemyWings.plan(),wings:engine.enemies.filter(e=>e.wingRole).length});}return out;});
 check('home rings, training and their native encounters stay free of tactical wings',safe.every(s=>!s.plan&&!s.wings),safe);
 const points=report.data.points=await p.evaluate(()=>{const found={};for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++){if(Math.max(Math.abs(x),Math.abs(y))<4)continue;worldMap.currentGridX=x;worldMap.currentGridY=y;const q=enemyWings.plan();if(q&&!found[q.id])found[q.id]={x,y};}return found;});
 check('seeded outer sectors offer all three distinct wing plans',Object.keys(points).length===3,points);
 for(const[type,point]of Object.entries(points)){
  const result=await p.evaluate(({type,point})=>{worldMap.currentGridX=point.x;worldMap.currentGridY=point.y;worldMap.getCurrentChamber().isCleared=false;engine.enterChamber({silent:true});engine.paused=true;const m=engine.enemies.filter(e=>e.wingType===type);window.__wing=m;return{count:engine.enemies.length,cap:frontierPve.roomCap(worldMap.getCurrentChamber()),members:m.map(e=>({role:e.wingRole,group:e.wingKey,hp:e.hp,max:e.maxHp,skin:!!hostileSkins.model(e),skinId:hostileSkins.model(e)?.id,mender:e.armed('mender')}))};},{type,point});
  report.data[type]=result;
  check(type+': real sector load composes three marked native actors within the room-scaled actor budget',result.count<=result.cap&&result.cap<=19&&result.members.length===3&&new Set(result.members.map(e=>e.group)).size===1&&result.members.every(e=>e.hp===e.max&&e.skin),result);
  check(type+': specialist has its distinct accepted whole-hull silhouette',result.members[0]?.skinId===({recovery:'hive',torpedo:'sniper',cordon:'charger'}[type]),result.members[0]);
  if(type==='recovery'){
   const heal=await p.evaluate(()=>{const e=__wing.find(e=>e.wingRole==='tender'),a=__wing.find(a=>a!==e);e.x=e.y=a.x=a.y=0;a.hp=a.maxHp-30;e.wingClock=119;e._aggro=true;const before=a.hp;e.update({...engine.player,x:700,y:0},[],__wing);const after=a.hp;e.nodes.find(n=>n.type==='mender').lost=true;e.wingClock=239;e.x=e.y=a.x=a.y=0;e.update({...engine.player,x:700,y:0},[],__wing);const disarmed=a.hp;e.nodes.find(n=>n.type==='mender').lost=false;a.x=3000;e.wingClock=359;e.update({...engine.player,x:700,y:0},[],__wing);return{before,after,disarmed,outside:a.hp,max:a.maxHp};});
   check('tender repairs a damaged wingmate without exceeding its native maximum',heal.after>heal.before&&heal.after<=heal.max,heal);
   check('destroyed mender and out-of-range ally both stop repair',heal.disarmed===heal.after&&heal.outside===heal.after,heal);
  }else{
   const attack=await p.evaluate(type=>{const e=__wing[0],target={...engine.player,x:700,y:0,hp:999},shots=[];e._aggro=true;e.wingCooldown=0;e.wingWindup=0;e.x=e.y=0;e.update(target,shots,__wing);const tell=e.wingWindup,early=shots.length;for(let i=0;i<tell-1;i++){e.x=e.y=0;e.update(target,shots,__wing);}const beforeLaunch=shots.length;e.x=e.y=0;e.update(target,shots,__wing);const volley=shots.map(s=>({type:s.type,enemy:!s.isPlayer,damage:s.damage}));let turns=null;if(type==='torpedo'&&shots[0]){const s=shots[0],angle=Math.atan2(s.vy,s.vx);target.y=300;for(let i=0;i<25;i++)s.update();turns={changed:Math.abs(Math.atan2(s.vy,s.vx)-angle)>.01,speed:Math.hypot(s.vx,s.vy)};}for(const n of e.nodes)if(n.type==='cannon')n.lost=true;e.wingCooldown=0;e.wingWindup=1;const before=shots.length;for(let i=0;i<200;i++){e.x=e.y=0;e.update(target,shots,__wing);}return{tell,early,beforeLaunch,volley,disarmed:shots.length===before,turns};},type);
   report.data[type].attack=attack;
   check(type+': visible windup precedes the actual native projectile volley',attack.tell>30&&attack.early===0&&attack.beforeLaunch===0&&attack.volley.length===(type==='torpedo'?1:3)&&attack.volley.every(s=>s.enemy&&s.damage>0),attack);
   check(type+': losing the guns stops all specialist firing',attack.disarmed,attack);
   if(type==='torpedo')check('torpedo really turns toward its target and retains an evadable speed cap',attack.turns.changed&&attack.turns.speed<=8.501,attack.turns);
  }
  // Render the native actors and module tells in their actual world renderer.
  await p.evaluate(()=>{engine.enemies=__wing;__wing.forEach((e,i)=>{e.x=(i-1)*290;e.y=i===0?-100:100;for(const n of e.nodes)n.lost=false;e.wingWindup=['bomber','flak'].includes(e.wingRole)?30:0;e.wingAim=Math.PI/2;});engine.player.x=0;engine.player.y=420;Object.assign(engine.camera,{zoom:.55,targetZoom:.55,x:-engine.viewportWidth/.55/2,y:-engine.viewportHeight/.55/2});engine.render();});
  await p.screenshot({path:out+'/'+type+'-desktop.png'});
 }
 const guards=await p.evaluate(()=>{const ch=worldMap.getCurrentChamber(),guard=new EnemyOrganism(0,0,{tier:3,name:'Authored guard',archetype:'stalker'}),elite=new EnemyOrganism(100,0,{tier:3,archetype:'stalker'}),boss=new EnemyOrganism(200,0,{tier:3,isBoss:true}),quest=new EnemyOrganism(300,0,{tier:3,archetype:'stalker'});elite.elite=true;quest.firstExpeditionGuard=0;const a=[guard,elite,boss,quest];factionFleets.compose(a,ch);return a.every(e=>!e.wingRole);});
 check('named guards, elites, bosses and quest guard zero retain their roles',guards);
 const groups=await p.evaluate(()=>{const ch=worldMap.getCurrentChamber(),make=()=>{const list=[0,1,2].map(x=>new EnemyOrganism(x*50,0,{tier:3,archetype:'stalker'}));factionFleets.compose(list,ch);return list[0].wingKey;};return[make(),make()];});
 check('separate patrols in one sector have distinct clearance identities',groups[0]&&groups[1]&&groups[0]!==groups[1],groups);
 check('reinforcement spawning refuses to exceed the12-actor wing budget',await p.evaluate(()=>{engine.enemies=Array.from({length:10},()=>new EnemyOrganism(0,0,{tier:3}));engine.paused=false;const r=contactDirector.spawn();engine.paused=true;return r===false&&engine.enemies.length===10;}));
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();pilotRpg.openJournal('commissions');});
 await p.locator('[data-qm-job=wing]').tap();await p.locator('#qm-accept').tap();
 check('real phone commission names a Sanctuary mender and records no free reward',await p.evaluate(()=>quartermaster.missions().active?.id==='wing'&&quartermaster.missions().active.have===0&&quartermaster.missions().active.reward.base==='repair'&&quartermaster.missions().active.reward.quirk==='sanctuary'&&!modularShips.hangar().owned['gear:recovered-repair-sanctuary:1']));
 await p.screenshot({path:out+'/commission-phone.png'});await p.evaluate(()=>pilotRpg.close());
 const clear=await p.evaluate(point=>{hubs.closeDock();worldMap.currentGridX=point.x;worldMap.currentGridY=point.y;worldMap.getCurrentChamber().isCleared=false;engine.enterChamber({silent:true});engine.paused=true;const m=engine.enemies.filter(e=>e.wingRole),progress=[];for(const e of m){e.hp=0;engine.killEnemy(engine.enemies.indexOf(e));progress.push(quartermaster.missions().active.have);}return progress;},points.recovery);
 check('native deaths credit only the complete specialist-plus-escorts wing',JSON.stringify(clear)==='[0,0,1]',clear);
 await p.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();pilotRpg.openJournal('commissions');});
 const before=await p.evaluate(()=>{window.__wingSet=Storage.prototype.setItem;const b=JSON.stringify([hubs.metal,saveState.doc.modularHangar,quartermaster.missions()]);Storage.prototype.setItem=()=>{throw Error('Witness refused wing claim');};return b;});
 await p.locator('#qm-claim').tap();
 check('refused claim save rolls back reward, wallet and commission completion',await p.evaluate(b=>JSON.stringify([hubs.metal,saveState.doc.modularHangar,quartermaster.missions()])===b,before));
 await p.evaluate(()=>Storage.prototype.setItem=window.__wingSet);await p.locator('#qm-claim').tap();
 check('real phone claim awards exactly one native recovered fitting and cannot repeat',await p.evaluate(()=>modularShips.hangar().owned['gear:recovered-repair-sanctuary:1']===1&&!quartermaster.missions().active&&quartermaster.claim()===false));
 const issuer=await p.evaluate(()=>galaxy.currentId);await p.reload();await ready();await p.locator('#btn-title-continue').tap();await p.evaluate(()=>{garage.closeMission();engine.paused=true;});
 const restored=await p.evaluate(()=>({copies:modularShips.hangar().owned['gear:recovered-repair-sanctuary:1'],claimed:quartermaster.missions().claimed,active:quartermaster.missions().active,system:galaxy.currentId}));
 check('claim and once-per-system commission survive real Continue',restored.copies===1&&restored.claimed.includes(issuer+':wing')&&!restored.active&&restored.system===issuer,restored);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('tactical-wing native witness completed',false,e.message);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length||report.checks.length!==25)process.exitCode=1;
