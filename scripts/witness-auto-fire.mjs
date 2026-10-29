// Overnight run step 9 · auto-fire: a setting (on by default on phone, off on PC, X toggles) that locks the nearest hostile
// in range and fires while you are not aiming. Writes shots/auto-fire/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/auto-fire';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,600)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const boot=async(viewport,touch)=>{const c=await browser.newContext({viewport,hasTouch:touch}),p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.autoFire?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('GUNNER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);await p.evaluate(()=>garage.closeMission());return{c,p};};
try{
 {const {c,p}=await boot({width:1366,height:768},false);
  report.data.pc=await p.evaluate(()=>({on:autoFire.enabled(),setting:menu.settings().autoFire}));
  check('PC: auto-fire is off by default',report.data.pc.on===false&&report.data.pc.setting===false,report.data.pc);
  await p.keyboard.press('KeyX');
  report.data.fire=await p.evaluate(()=>{const P=engine.player;engine.enemies=[];const e=new EnemyOrganism(P.x+500,P.y+200,{tier:2,archetype:'stalker'});e.update=()=>{};engine.enemies.push(e);engine.mouse.down=false;engine.paused=false;terrain.off=true;engine.projectiles=[];
   for(let i=0;i<40;i++)engine.update(1/60);const shots=engine.projectiles.filter(q=>q.isPlayer);const a=shots.length?Math.atan2(shots[0].vy,shots[0].vx):null,want=Math.atan2(e.y-P.y,e.x-P.x);terrain.off=false;return{on:autoFire.enabled(),shots:shots.length,aimErr:a==null?null:Math.abs(Math.atan2(Math.sin(a-want),Math.cos(a-want))),target:autoFire.target===e};});
  check('X turns it on; with the mouse up, the guns lock the nearest hostile and fire at it',report.data.fire.on&&report.data.fire.shots>0&&report.data.fire.aimErr<0.35&&report.data.fire.target,report.data.fire);
  report.data.manual=await p.evaluate(()=>{const P=engine.player;engine.mouse.down=true;engine.mouse.x=0;engine.mouse.y=0;engine.update(1/60);const t=autoFire.target;engine.mouse.down=false;return{tookOver:t===null};});
  check('aiming yourself always takes over',report.data.manual.tookOver,report.data.manual);
  report.data.none=await p.evaluate(()=>{engine.enemies=[];engine.projectiles=[];for(let i=0;i<20;i++)engine.update(1/60);return{shots:engine.projectiles.filter(q=>q.isPlayer).length};});
  check('with nothing in range it holds fire',report.data.none.shots===0,report.data.none);
  await c.close();}
 {const {c,p}=await boot({width:390,height:844},true);
  report.data.phone=await p.evaluate(()=>({on:autoFire.enabled(),mobile:document.documentElement.classList.contains('mobile-layout')}));
  check('phone: auto-fire is on by default',report.data.phone.mobile&&report.data.phone.on===true,report.data.phone);
  await p.evaluate(()=>menu.pause?.());await p.waitForTimeout(200);
  await c.close();}
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('auto-fire witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
