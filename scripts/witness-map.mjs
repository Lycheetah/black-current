// Route 2 Stage 1 · the star map: one zoomable canvas for sectors and systems, tap to read, plot a route.
// Writes shots/map/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/map';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
try{
 for(const [name,viewport,touch] of [['desk',{width:1366,height:768},false],['phone',{width:390,height:844},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await p.goto(url);await p.waitForFunction(()=>window.starMap?.ready&&window.uiKit?.ready);
  await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('MAP');await p.locator('#btn-title-quick').click();await p.waitForTimeout(300);
  await p.evaluate(()=>{garage.closeMission();galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.toggleMapModal();});await p.waitForTimeout(500);
  const layout=report.data[name+'Layout']=await p.evaluate(()=>{const c=document.getElementById('star-map').getBoundingClientRect(),vis=id=>{const e=document.getElementById(id);return!!e&&e.offsetParent!==null;};
   return{canvas:{w:Math.round(c.width),h:Math.round(c.height),top:Math.round(c.top),bottom:Math.round(c.bottom)},oldGrid:vis('matrix-grid-container'),overflow:document.documentElement.scrollWidth>innerWidth,hudHidden:getComputedStyle(document.getElementById('view-controls')).visibility==='hidden',
    tools:[...document.querySelectorAll('.star-map-tools button')].map(b=>Math.round(b.getBoundingClientRect().height))};});
  check(`${name}: the star map replaces the label grid, fits the screen and hides the flight HUD under it`,layout.canvas.w>300&&layout.canvas.h>=220&&layout.canvas.bottom<=innerHeightOf(viewport)&&!layout.oldGrid&&!layout.overflow&&layout.hudHidden,layout);
  check(`${name}: zoom and centre buttons are ${touch?44:40}px targets`,layout.tools.length===3&&layout.tools.every(h=>h>=(touch?44:40)),layout.tools);
  // the home grid holds the station and the four guardians as icons
  const marks=report.data[name+'Marks']=await p.evaluate(()=>{const all=Object.values(worldMap.chambers);return{station:all.filter(c=>starMap.marks(c).includes('station')).length,boss:all.filter(c=>starMap.marks(c).includes('boss')).length,gates:all.filter(c=>starMap.marks(c).includes('gate')).length,tiles:all.length};});
  check(`${name}: the home system shows its station, four guardians and its gates`,marks.station===1&&marks.boss===4&&marks.gates>=1&&marks.tiles===361,marks);
  // tap a real tile, read it, plot it
  const tile=await p.evaluate(()=>{const r=document.getElementById('star-map').getBoundingClientRect(),[x,y]=starMap.toScreen(2,-1);return{x:r.left+x,y:r.top+y};});
  if(touch)await p.touchscreen.tap(tile.x,tile.y);else await p.mouse.click(tile.x,tile.y);await p.waitForTimeout(200);
  const picked=await p.evaluate(()=>({sel:starMap.selection.system,text:document.getElementById('star-map-text').textContent,plot:!document.getElementById('star-map-plot').hidden}));
  check(`${name}: tapping a sector reads it (danger and band)`,JSON.stringify(picked.sel)==='[2,-1]'&&/Sector 2,-1 · danger \d+ · (safe|contested)/.test(picked.text)&&picked.plot,picked);
  await p.locator('#star-map-plot').click();await p.waitForTimeout(150);
  const route=await p.evaluate(()=>({route:saveState.doc.travelRoute,clear:!document.getElementById('star-map-clear').hidden}));
  check(`${name}: Plot route saves a sector route the flight cue follows`,route.route?.kind==='sector'&&route.route.gx===2&&route.route.gy===-1&&route.clear,route);
  await p.screenshot({path:`${out}/system-${name}.png`});
  // zoom in at the centre, then Centre restores the fitted view
  const z0=await p.evaluate(()=>starMap.view.system.s);await p.locator('#star-map-in').click();await p.locator('#star-map-in').click();const z1=await p.evaluate(()=>starMap.view.system.s);
  if(!touch){const r=await p.locator('#star-map').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.wheel(0,400);}
  const z2=await p.evaluate(()=>starMap.view.system.s);await p.locator('#star-map-centre').click();const z3=await p.evaluate(()=>starMap.view.system.s);
  check(`${name}: + zooms in${touch?'':', the wheel zooms out'} and Centre restores the fitted view`,z1>z0*1.5&&(touch||z2<z1)&&Math.abs(z3-z0)<1e-6,{z0,z1,z2,z3});
  // galaxy layer: tap the home station's neighbour, read and plot it
  await p.locator('#chart-tab-galaxy').click();await p.waitForTimeout(250);
  const n=await p.evaluate(()=>{const id=galaxy.data.byId.home.links[0],s=galaxy.data.byId[id],r=document.getElementById('star-map').getBoundingClientRect(),[x,y]=starMap.toScreen(s.x/galaxy.CFG.radius,s.y/galaxy.CFG.radius);return{id,name:s.name,x:r.left+x,y:r.top+y};});
  if(touch)await p.touchscreen.tap(n.x,n.y);else await p.mouse.click(n.x,n.y);await p.waitForTimeout(200);
  const g=await p.evaluate(()=>({sel:starMap.selection.galaxy,text:document.getElementById('star-map-text').textContent}));
  check(`${name}: the galaxy layer reads a neighbouring system with its jump count`,g.sel===n.id&&g.text.includes(n.name)&&/1 jumps?/.test(g.text),{g,n});
  await p.locator('#star-map-plot').click();await p.waitForTimeout(150);const gr=await p.evaluate(()=>saveState.doc.travelRoute);
  check(`${name}: plotting a system saves a system route`,gr?.kind==='system'&&gr.id===n.id,gr);
  await p.screenshot({path:`${out}/galaxy-${name}.png`});
  // a null-band system shows its citadel corner
  const cit=await p.evaluate(()=>{engine.toggleMapModal();const s=capitalEndgame.nullSystems()[0];galaxy.enterSystemById(s.id);const c=Object.values(worldMap.chambers).filter(c=>starMap.marks(c).some(m=>m.startsWith('citadel')));return{count:c.length,text:c[0]&&starMap.describe(c[0])};});
  check(`${name}: a null-band system marks its citadel and explains how to break it`,cit.count===1&&/Citadel: break both generators/.test(cit.text),cit);
  await context.close();
 }
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('map witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
function innerHeightOf(v){return v.height;}
if(report.failed)process.exitCode=1;
