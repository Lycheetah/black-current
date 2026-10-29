// Route 2 Stage 1 · room scale: zones sized for the frame you fly, stations a titan can berth at,
// a camera that keeps your hull on screen, and cruise that crosses the room in seconds. Writes shots/zones/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/zones';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
try{
 for(const [name,viewport,touch] of [['desk',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await p.goto(url);await p.waitForFunction(()=>window.roomScale?.ready&&window.capitalEndgame?.ready);
  await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ZONES');await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
  const data=report.data[name]=await p.evaluate(async()=>{
   garage.closeMission();for(const w of capitalEndgame.warlords())(saveState.doc.capital||(saveState.doc.capital={v:1,citadels:{},warlords:{}})).warlords[w.id]={defeats:0,lastEpoch:capitalEndgame.epoch()};
   const fly=id=>{const c=modularShips.compile(modularShips.factory(id));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});};
   const settle=n=>{engine.paused=false;for(let i=0;i<n;i++)engine.update(1/60);engine.paused=true;};
   const home=(x,y)=>{civilisations.goHome();worldMap.currentGridX=x;worldMap.currentGridY=y;engine.enterChamber({silent:true});settle(240);};
   const out={};
   // a frigate keeps the classic tight home sector and the zoom dial
   fly('kestrel');home(1,0);out.frigate={len:roomScale.shipLength(),radius:worldMap.getCurrentChamber().radius,zoom:engine.camera.zoom,dial:movementFeel.zoom};
   // a titan gets room everywhere: home rings, the station and a deep sector
   fly('athanor');home(2,2);const len=roomScale.shipLength();   // an ordinary home sector, not the training range
   out.titan={len,room:tuning.SIZE.room,radius:worldMap.getCurrentChamber().radius,zoom:engine.camera.zoom,onScreen:len*engine.camera.zoom,short:Math.min(innerWidth,innerHeight),fit:tuning.SIZE.fit};
   const spread=engine.enemies.map(e=>Math.hypot(e.x,e.y));out.titan.spread=spread.length?Math.max(...spread):0;
   home(0,0);const ch=worldMap.getCurrentChamber(),k=roomScale.stationScale();
   engine.player.x=(hubs.CFG.dockRange+60)*k-40;engine.player.y=0;engine.player.vx=engine.player.vy=0;engine.paused=false;hubs.openDock();const docked=!!hubs.docked;hubs.closeDock?.();
   engine.player.x=(hubs.CFG.dockRange+60)*k+400;engine.paused=false;hubs.openDock();const tooFar=!!hubs.docked;hubs.closeDock?.();
   out.station={haven:ch.isHaven,radius:ch.radius,scale:k,docked,tooFar};
   const deep=galaxy.data.systems.filter(s=>!s.home&&s.rid>=3)[0];galaxy.enterSystemById(deep.id);const dc=Object.values(worldMap.chambers).filter(c=>!c.isHaven&&!c.isBossSector&&!capitalEndgame.citadelOf(c)).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];
   worldMap.currentGridX=dc.gridX;worldMap.currentGridY=dc.gridY;engine.enterChamber({silent:true});engine.paused=true;
   out.deep={danger:dc.dangerLevel,radius:worldMap.getCurrentChamber().radius,dangerSize:tuning.sectorRadius(dc.dangerLevel),room:roomScale.roomRadius()};
   // refitting up mid-sector widens the room at once
   fly('kestrel');home(2,0);const before=worldMap.getCurrentChamber().radius;fly('athanor');out.refit={before,after:worldMap.getCurrentChamber().radius,room:roomScale.roomRadius()};
   // cruise crosses a titan's room in seconds
   home(2,2);engine.paused=false;const cruising=combatFeel.setCruise(true);engine.player.vx=engine.player.vy=0;engine.keys['KeyD']=true;settle(300);const v=Math.abs(engine.player.vx);engine.keys['KeyD']=false;combatFeel.setCruise(false);
   out.cruise={cruising,speed:v,seconds:worldMap.getCurrentChamber().radius/(v*60)};
   return out;
  });
  check(`${name}: a frigate keeps the classic 2,600 px home sector and the zoom dial`,data.frigate.radius===2600&&Math.abs(data.frigate.zoom-data.frigate.dial)<0.02,data.frigate);
  check(`${name}: a titan's home sector is at least ${data.titan.room} hull-lengths in radius, and its fleets spread into it`,data.titan.radius>=data.titan.room*data.titan.len-100&&data.titan.radius>=4*2600&&data.titan.spread>2600,data.titan);
  check(`${name}: the camera keeps the titan within ${data.titan.fit} of the short side`,data.titan.onScreen<=data.titan.fit*data.titan.short*1.05&&data.titan.onScreen>=data.titan.short*0.25,data.titan);
  check(`${name}: the station grows for a titan, which berths from its hull edge but not from far off`,data.station.haven&&data.station.scale>2&&data.station.docked&&!data.station.tooFar,data.station);
  check(`${name}: a deep sector keeps its danger size when that is larger than the room`,data.deep.radius===Math.max(data.deep.dangerSize,data.deep.room,2600)||data.deep.radius>=Math.max(data.deep.dangerSize,data.deep.room),data.deep);
  check(`${name}: refitting to a titan mid-sector widens the room at once`,data.refit.before<data.refit.room&&data.refit.after>=data.refit.room,data.refit);
  check(`${name}: titan cruise crosses its home sector radius in under 8 seconds`,data.cruise.seconds<8&&data.cruise.seconds>1,data.cruise);
  await p.evaluate(()=>{const c=modularShips.compile(modularShips.factory('athanor'));engine.applyDesign(c.design,{restore:true});civilisations.goHome();worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.player.x=1200;engine.player.y=300;engine.paused=false;});
  await p.waitForTimeout(1500);await p.screenshot({path:`${out}/titan-station-${name}.png`});
  await context.close();
 }
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('zones witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
