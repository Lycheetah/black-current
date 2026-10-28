// Master route Stage 6 · capital endgame: citadels, warlords, the Citadel heart and rescaled bosses.
// Writes shots/capital/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/capital';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await p.waitForFunction(()=>window.capitalEndgame?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('CAPITAL');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 await p.evaluate(()=>{garage.closeMission();const c=modularShips.compile(modularShips.factory('athanor'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});engine.player.iFrames=1e9;});
 // 1 · a citadel: sealed core, generators, batteries, hangar; pinned in place
 report.data.citadel=await p.evaluate(()=>{let found=null;for(const s of capitalEndgame.nullSystems()){galaxy.enterSystemById(s.id);const ch=Object.values(worldMap.chambers).find(c=>capitalEndgame.citadelOf(c));if(ch){found=ch;break;}}
  if(!found)return{found:false};worldMap.currentGridX=found.gridX;worldMap.currentGridY=found.gridY;engine.enterChamber({silent:true});const roles=engine.enemies.map(e=>e.capital?.role).filter(Boolean),core=engine.enemies.find(e=>e.capital?.role==='core');
  const P=engine.player;P.x=core.x+3500;P.y=core.y;engine.paused=false;const at=engine.enemies.filter(e=>e.capital).map(e=>[e.x,e.y]);for(let i=0;i<90;i++)engine.update(1/60);engine.paused=true;
  const pinned=engine.enemies.filter(e=>e.capital).every((e,i)=>Math.hypot(e.x-at[i][0],e.y-at[i][1])<1);
  const hp=core.hp;core.takeDamage(1e6);engine.damageNode(core,core.nodes[1],1e6);const sealedHeld=core.hp===hp&&core.capital.sealed;
  return{found:true,danger:found.dangerLevel,count:engine.enemies.length,roles:roles.sort(),pinned,sealedHeld,coreHp:core.maxHp};});
 check('a null-band system holds a citadel: core, two generators, three batteries and a hangar',report.data.citadel.found&&report.data.citadel.danger>=11&&JSON.stringify(report.data.citadel.roles)===JSON.stringify(['battery','battery','battery','core','generator','generator','hangar'])&&report.data.citadel.count<=12,report.data.citadel);
 check('citadel parts hold position and the core shrugs off every hit while sealed',report.data.citadel.pinned&&report.data.citadel.sealedHeld,report.data.citadel);
 await p.evaluate(()=>{const c=engine.enemies.find(e=>e.capital?.role==='core');engine.player.x=c.x+1700;engine.player.y=c.y+900;engine.player.iFrames=1e9;engine.paused=false;});await p.waitForTimeout(1600);await p.screenshot({path:out+'/citadel.png'});
 report.data.breach=await p.evaluate(()=>{engine.paused=true;engine.player.iFrames=1e9;const metal=hubs.metal,hearts=modularShips.hangar().owned['kit:citadelheart']||0;
  for(const g of engine.enemies.filter(e=>e.capital?.role==='generator'))engine.killEnemy(engine.enemies.indexOf(g));engine.paused=false;engine.update(1/60);engine.paused=true;
  const core=engine.enemies.find(e=>e.capital?.role==='core'),open=!core.capital.sealed;core.takeDamage(10);const hurt=core.hp<core.maxHp||core.shield<core.maxShield;
  progression.bubbleDrops=[];engine.killEnemy(engine.enemies.indexOf(core));const gun=progression.bubbleDrops.find(d=>d.part?.type==='cannon');
  return{open,hurt,cleared:Object.keys(saveState.doc.capital.citadels).length,hearts:(modularShips.hangar().owned['kit:citadelheart']||0)-hearts,metal:hubs.metal-metal,gunClass:gun&&modularShips.GEARS['gun-'+gun.part.weapon]?.cls};});
 check('breaking both generators unseals the core, and breaking the core pays a heart, a capital gun and metal',report.data.breach.open&&report.data.breach.hurt&&report.data.breach.cleared===1&&report.data.breach.hearts===1&&report.data.breach.gunClass==='CAPITAL'&&report.data.breach.metal>0,report.data.breach);
 report.data.reenter=await p.evaluate(()=>{engine.enterChamber({silent:true});return engine.enemies.filter(e=>e.capital).length;});
 check('a broken citadel stays broken',report.data.reenter===0,report.data.reenter);
 // 2 · the Citadel heart
 report.data.heart=await p.evaluate(()=>{const M=modularShips,titan=M.factory('athanor'),free=titan.modular.sections.find(s=>s.kind==='utility'&&!titan.modular.fittings.some(f=>f.slot===s.id)&&!(titan.modular.kit||[]).some(k=>k.cell===s.id&&k.mount==='top'));
  titan.modular.kit=[...(titan.modular.kit||[]),{cell:free.id,mount:'top',piece:'citadelheart'}];let one=null,two=null,bs=null;try{M.compile(titan);one='ok';}catch(e){one=e.message;}
  const second=titan.modular.sections.find(s=>s.id!==free.id&&!titan.modular.fittings.some(f=>f.slot===s.id&&M.GEARS[f.gear].kind==='weapon')&&!titan.modular.kit.some(k=>k.cell===s.id&&k.mount==='top'));if(second){titan.modular.kit.push({cell:second.id,mount:'top',piece:'citadelheart'});try{M.compile(titan);two='ok';}catch(e){two=e.message;}}
  const b=M.factory('dreadnought'),u=b.modular.sections.find(s=>s.kind==='utility');b.modular.kit=(b.modular.kit||[]).filter(k=>!(k.cell===u.id&&k.mount==='top'));b.modular.kit.push({cell:u.id,mount:'top',piece:'citadelheart'});try{M.compile(b);bs='ok';}catch(e){bs=e.message;}
  return{one,two,bs,power:M.PIECES.citadelheart.power};});
 check('one owned Citadel heart fits a titan (+8 power); a second needs a second heart; battleships cannot take it',report.data.heart.one==='ok'&&report.data.heart.power===-8&&/broken citadels only/.test(report.data.heart.two||'')&&/supercapital or titan/.test(report.data.heart.bs),report.data.heart);
 // 3 · warlords
 report.data.warlords=await p.evaluate(()=>{const W=capitalEndgame.warlords(),L=capitalEndgame.nullSystems().map(s=>s.id),now=Date.now(),later=now+tuning.ENDGAME.roamMs;
  return{names:W.map(w=>w.name+' · '+w.epithet),inNull:W.every(w=>L.includes(capitalEndgame.warlordSystem(w,now).id)),roam:W.filter(w=>capitalEndgame.warlordSystem(w,now).id!==capitalEndgame.warlordSystem(w,later).id).length};});
 check('six canon-named warlords roam the null band on a schedule',report.data.warlords.names.length===6&&report.data.warlords.inNull&&report.data.warlords.roam>=3,report.data.warlords);
 report.data.hunt=await p.evaluate(()=>{const w=capitalEndgame.warlords()[0],sys=capitalEndgame.warlordSystem(w);galaxy.enterSystemById(sys.id);const ch=Object.values(worldMap.chambers).filter(c=>c.dangerLevel>=tuning.ENDGAME.warlordMinDanger&&!capitalEndgame.citadelOf(c)).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];
  if(!ch)return{found:false,sys:sys.id};worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});engine.paused=true;const flag=engine.enemies.find(e=>e.capital?.role==='warlord');if(!flag)return{found:false,sys:sys.id};
  progression.bubbleDrops=[];const name=flag.name,elite=flag.elite,hp=flag.maxHp;engine.killEnemy(engine.enemies.indexOf(flag));const drop=progression.bubbleDrops.find(d=>d.part?.rarity==='relic'&&d.part.type==='cannon');
  engine.enterChamber({silent:true});const again=engine.enemies.some(e=>e.capital?.role==='warlord');return{found:true,name,elite,hp,relicGun:!!drop,cls:drop&&modularShips.GEARS['gun-'+drop.part.weapon]?.cls,again,defeats:saveState.doc.capital.warlords[w.id]?.defeats};});
 check('a warlord hunts its system; its first defeat drops a relic capital gun and it leaves for this epoch',report.data.hunt.found&&report.data.hunt.elite&&report.data.hunt.relicGun&&report.data.hunt.cls==='CAPITAL'&&!report.data.hunt.again&&report.data.hunt.defeats===1,report.data.hunt);
 // 4 · bosses on the ladder
 report.data.boss=await p.evaluate(()=>{const e=new EnemyOrganism(0,0,{tier:7,isBoss:true,bossType:'SOLAR DREADNOUGHT',archetype:'stalker'});e.update(engine.player,[],[]);return{hp:e.maxHp,shield:e.maxShield,expect:tuning.ROWS[tuning.ENDGAME.boss.tier].hp*tuning.ENDGAME.boss.hp};});
 check('home bosses sit on the fixed tier-5 rung (×3 hull and shields)',report.data.boss.hp===report.data.boss.expect,report.data.boss);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('capital witness completed',false,String(e.message||e));await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
