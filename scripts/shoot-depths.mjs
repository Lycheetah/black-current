// Screenshot one terrain-rich sector in each of the Five Depths (visual rehaul before/after). node scripts/shoot-depths.mjs <tag>
import {chromium} from 'playwright';
const tag=process.argv[2]||'now',url=process.env.GAME_URL||'http://127.0.0.1:8811/';
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1366,height:768}});await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready);
await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ARTIST');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
for(let rid=0;rid<5;rid++){
 const info=await p.evaluate(rid=>{garage.closeMission();const sys=galaxy.data.systems.filter(s=>s.rid===rid&&!s.hub&&!s.home&&!s.rule);
  for(const s of sys){galaxy.enterSystemById(s.id);for(const ch of Object.values(worldMap.chambers)){if(ch.isHaven||ch.isBossSector)continue;worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});const f=terrain.current();if(f&&f.solids.length>14&&f.gas.length>=2){
   engine.enemies=[];const rocks=f.solids.filter(o=>o.kind==='rock'||o.kind==='ice'||o.kind==='wreck');let best=rocks[0],bn=-1;for(const o of rocks){const n=rocks.filter(q=>Math.hypot(q.x-o.x,q.y-o.y)<1500).length;if(n>bn){bn=n;best=o;}}const P=engine.player;P.x=best.x+best.r+260;P.y=best.y+120;P.iFrames=0;P.vx=P.vy=0;engine.paused=false;for(let i=0;i<30;i++){engine.enemies=[];engine.update(1/60);}engine.paused=true;engine.render();return{sys:s.name,sec:[ch.gridX,ch.gridY],solids:f.solids.length,gas:f.gas.length,biome:f.biome.name};}}}return null;},rid);
 await p.waitForTimeout(300);await p.screenshot({path:`shots/rehaul/${tag}-depth${rid}.png`});console.log(rid,JSON.stringify(info));
}
await b.close();
