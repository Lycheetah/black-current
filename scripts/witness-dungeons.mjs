// Route 2 Stage 2 · derelict dives: board a dead titan, clear themed rooms, beat the warden, open the hold.
// Writes shots/dungeons/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/dungeons';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.derelicts?.ready&&window.starMap?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('DIVER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
 await p.evaluate(()=>{garage.closeMission();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});
  window.__tick=n=>{engine.paused=false;for(let i=0;i<n;i++)engine.update(1/60);};
  window.__clear=()=>{for(const e of engine.enemies)if(e.capital)e.capital.sealed=false;for(let k=engine.enemies.length-1;k>=0;k--){engine.enemies[k].hp=0;engine.killEnemy(k);}__tick(2);};
  window.__door=()=>{const d=derelicts.active;engine.player.x=d.room.radius*0.84;engine.player.y=0;engine.player.vx=engine.player.vy=0;__tick(2);};});
 // 1 · the home derelict: marked, reachable, boarded with E
 report.data.entrance=await p.evaluate(()=>{galaxy.enterSystemById(saveState.doc.civHome||'home');worldMap.currentGridX=2;worldMap.currentGridY=-2;engine.enterChamber({silent:true});const L=derelicts.entrance(),ch=worldMap.getCurrentChamber();
  const marked=starMap.marks(ch).includes('derelict');engine.player.x=L.x+L.r*0.9;engine.player.y=L.y;engine.player.iFrames=1e9;__tick(1);const b=document.getElementById('dive-action');
  return{entrance:!!L,marked,near:derelicts.nearEntrance(),button:!b.hidden&&b.textContent,hostEnemies:engine.enemies.length,back:[L.x,L.y]};});
 check('the home system holds a derelict on the star map, and the board prompt shows beside it',report.data.entrance.entrance&&report.data.entrance.marked&&report.data.entrance.near&&/Board the derelict/.test(report.data.entrance.button),report.data.entrance);
 await p.keyboard.press('KeyE');await p.waitForTimeout(150);
 report.data.boarded=await p.evaluate(()=>{const d=derelicts.active;if(!d)return{active:false};const room=worldMap.getCurrentChamber();
  return{active:true,rooms:d.rooms,last:d.rooms[d.rooms.length-1],isRoom:room.isDiveRoom,walls:room.terrain.solids.length,enemies:engine.enemies.length,inside:Math.hypot(engine.player.x,engine.player.y)<room.radius};});
 check('E boards it: a chain of rooms ending in the warden, with walls and crew',report.data.boarded.active&&report.data.boarded.last==='warden'&&report.data.boarded.rooms.length>=3&&report.data.boarded.isRoom&&report.data.boarded.walls>20&&report.data.boarded.enemies>0&&report.data.boarded.inside,report.data.boarded);
 await p.screenshot({path:`${out}/room-1.png`});
 // 2 · you cannot leave through the hull, and the door holds until the room is clear
 report.data.hull=await p.evaluate(()=>{const R=worldMap.getCurrentChamber().radius,P=engine.player;P.x=R*0.89;P.y=R*0.2;P.vx=60;P.vy=0;__tick(3);const out=Math.hypot(P.x,P.y);const d=derelicts.active,before=d.index;__door();const shut=d.index===before;return{R,out,shut};});
 check('the hull keeps you in, and the door stays shut while crew remain',report.data.hull.out<=report.data.hull.R&&report.data.hull.shut,report.data.hull);
 // 3 · each room's rule
 report.data.vault=await p.evaluate(()=>{const d=derelicts.active;d.rooms=['vault','reactor','hangar','warden'];derelicts.goRoom(0);__tick(2);const lock=engine.enemies.find(e=>e.derelict==='lock'),hp=lock.hp;lock.takeDamage(1e6);const sealed=lock.hp===hp;
  for(let k=engine.enemies.length-1;k>=0;k--)if(engine.enemies[k].derelict==='crew'){engine.enemies[k].hp=0;engine.killEnemy(k);}__tick(2);const open=!engine.enemies.find(e=>e.derelict==='lock').capital.sealed;return{sealed,open};});
 check('vault: the locks shrug off hits until their guards fall',report.data.vault.sealed&&report.data.vault.open,report.data.vault);
 await p.evaluate(()=>{__clear();__door();});
 report.data.reactor=await p.evaluate(()=>{const d=derelicts.active,P=engine.player;engine.enemies=[];const R=d.room.radius;P.iFrames=0;P.hp=P.maxHp;
  const pulse=(x,y)=>{P.x=x;P.y=y;P.vx=P.vy=0;P.hp=P.maxHp;P.iFrames=0;d.pulseT=1;__tick(1);return P.maxHp-P.hp;};
  const wall=d.room.terrain.solids.find(o=>o.kind==='hull'&&Math.hypot(o.x,o.y)>R*0.3&&Math.hypot(o.x,o.y)<R*0.55),a=Math.atan2(wall.y,wall.x);
  return{theme:d.room.theme,open:pulse(Math.cos(a+0.6)*R*0.6,Math.sin(a+0.6)*R*0.6),behind:pulse(Math.cos(a)*(Math.hypot(wall.x,wall.y)+wall.r*2.2),Math.sin(a)*(Math.hypot(wall.x,wall.y)+wall.r*2.2))};});
 check('reactor: the pulse hurts in the open and a wall between you and the core keeps you safe',report.data.reactor.theme==='reactor'&&report.data.reactor.open>0&&report.data.reactor.behind===0,report.data.reactor);
 await p.evaluate(()=>{__clear();__door();});
 report.data.hangar=await p.evaluate(()=>{const d=derelicts.active;const before=engine.enemies.filter(e=>e.derelict==='drone').length;engine.player.iFrames=1e9;d.bayT=1;__tick(2);const after=engine.enemies.filter(e=>e.derelict==='drone').length;return{theme:d.room.theme,bays:engine.enemies.filter(e=>e.derelict==='bay').length,before,after};});
 check('hangar: two launch bays put out drones',report.data.hangar.theme==='hangar'&&report.data.hangar.bays===2&&report.data.hangar.after>report.data.hangar.before,report.data.hangar);
 await p.evaluate(()=>{__clear();__door();});
 report.data.warden=await p.evaluate(()=>{const d=derelicts.active,w=engine.enemies.find(e=>e.derelict==='warden');const n0=engine.enemies.length;w.hp=w.maxHp*0.6;__tick(1);const n1=engine.enemies.length;w.hp=w.maxHp*0.3;__tick(1);const n2=engine.enemies.length;
  return{theme:d.room.theme,name:w.name,elite:w.elite,n0,n1,n2};});
 check('warden: the derelict\'s guardian calls three escorts at two-thirds and again at one-third',report.data.warden.theme==='warden'&&report.data.warden.elite&&report.data.warden.n1===report.data.warden.n0+3&&report.data.warden.n2===report.data.warden.n1+3,report.data.warden);
 await p.screenshot({path:`${out}/warden.png`});
 // 4 · the hold, leaving, and the 30-minute haul
 report.data.hold=await p.evaluate(back=>{const metal=hubs.metal;progression.bubbleDrops=progression.bubbleDrops.filter(d=>!d.part);__clear();const drop=progression.bubbleDrops.find(d=>d.part?.rarity==='relic');const paid=hubs.metal-metal;
  __door();const P=engine.player;return{relic:!!drop,cls:drop&&modularShips.GEARS['gun-'+drop.part.weapon]?.cls,paid,active:!!derelicts.active,looted:Object.keys(saveState.doc.dives.looted).length,host:engine.enemies.length,isRoom:!!worldMap.getCurrentChamber().isDiveRoom,beside:Math.hypot(P.x-back[0],P.y-back[1])};},report.data.entrance.back);
 check('the hold pays a relic gun and metal; the last door puts you back beside the hull with the sector as you left it',report.data.hold.relic&&report.data.hold.paid>0&&!report.data.hold.active&&report.data.hold.looted===1&&!report.data.hold.isRoom&&report.data.hold.host===report.data.entrance.hostEnemies&&report.data.hold.beside<2500,report.data.hold);
 report.data.again=await p.evaluate(()=>{const L=derelicts.entrance();engine.player.x=L.x+L.r*0.9;engine.player.y=L.y;derelicts.board();const d=derelicts.active;d.rooms=['warden'];derelicts.goRoom(0);const metal=hubs.metal;progression.bubbleDrops=progression.bubbleDrops.filter(d=>!d.part);__clear();
  return{relic:progression.bubbleDrops.some(d=>d.part?.rarity==='relic'),paid:hubs.metal-metal};});
 check('a second run inside 30 minutes finds the hold stripped (a little metal, no relic)',!report.data.again.relic&&report.data.again.paid>0,report.data.again);
 // 5 · dying in a dive ends it safely
 report.data.death=await p.evaluate(()=>{const P=engine.player;P.iFrames=0;P.hp=0;engine.playerDeath();P.respawnTimer=1;__tick(5);return{active:!!derelicts.active,isRoom:!!worldMap.getCurrentChamber().isDiveRoom,dead:P.dead};});
 check('dying in a dive ends it and respawns you normally',!report.data.death.active&&!report.data.death.isRoom&&!report.data.death.dead,report.data.death);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('dungeons witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
