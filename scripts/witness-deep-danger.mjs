// Route 4 item 3 · deep danger (js/deep-danger.js, engine.playerTakeDamage). Mac, 2026-10-30: "danger 7 is no risk for even
// a … carrier", "outranked [enemies] never kill you even when afk". Measured before: an AFK battleship lived three minutes
// at danger 7 and healed. Now the deep sector hunts, part hits strain the hull and contested space buys 4 grace frames,
// while the home rings keep the rookie rules. Writes shots/deep-danger/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/deep-danger';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1100,height:700}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready&&window.deepDanger?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('DEEP');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();});await p.waitForTimeout(400);
 // an AFK battleship (the factory dreadnought) in the first danger-7 sector of a non-home system, for up to three minutes
 report.data.afk=await p.evaluate(()=>{garage.closeMission();garage.closeReward?.();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});
  let at=null;for(const s of galaxy.data.systems||galaxy.data){if(s.home||at)continue;galaxy.enterSystemById(s.id);for(let gx=-6;gx<=6&&!at;gx++)for(let gy=-6;gy<=6&&!at;gy++){worldMap.currentGridX=gx;worldMap.currentGridY=gy;const ch=worldMap.getCurrentChamber();if(!ch||ch.isHaven||ch.isBossSector)continue;engine.enterChamber({silent:true});if(worldMap.getCurrentChamber().dangerLevel===7&&engine.enemies.length>=4)at=[s.id,gx,gy];}}
  if(!at)return{err:'no danger-7 sector'};garage.closeMission();garage.closeReward?.();
  const P=engine.player;engine.recalculatePlayerStats();P.hp=P.maxHp;P.x=P.y=0;P.vx=P.vy=0;const packs0=deepDanger.stats.packs;
  engine.readInput=function(){return this.input={ax:0,ay:0,aimX:P.x+100,aimY:P.y,fire:false};};
  let dead=null;for(let f=0;f<60*180;f++){engine.paused=false;engine.mapOpen=false;garage.closeMission();engine.update(1/60);if(P.dead){dead=+(f/60).toFixed(1);break;}}
  return{at,maxHp:P.maxHp,dead,packs:deepDanger.stats.packs-packs0};});
 check('an AFK battleship in a danger-7 sector is hunted down within three minutes',report.data.afk.dead!==null&&report.data.afk.packs>=1,report.data.afk);
 // the home rings keep the rookie rules: a part hit buys a quarter second and spares the hull
 report.data.home=await p.evaluate(()=>{engine.player.dead=false;galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.paused=false;
  const P=engine.player;engine.recalculatePlayerStats();P.hp=P.maxHp;P.iFrames=0;const node=P.nodes.find(n=>n.type!=='core'&&!n.lost);const hp=P.hp;engine.playerTakeDamage(5,'shot',node);
  return{danger:worldMap.getCurrentChamber().dangerLevel,hullLost:hp-P.hp,iFrames:P.iFrames,hunts:deepDanger.deep(worldMap.getCurrentChamber())};});
 check('home rings keep the rookie rules: a part hit spares the hull, buys a quarter second, and nothing hunts',report.data.home.hullLost===0&&report.data.home.iFrames===15&&!report.data.home.hunts,report.data.home);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('deep danger witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
