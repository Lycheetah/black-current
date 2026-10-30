/* Visual scan: every major screen and world scene from the running build, plus a PvE census.
 * Captures land in shots/visual-scan/; sheets/ tiles them four at a time for review.
 * Not a pass/fail gate. Use it before and after a visual or balance batch and compare.
 *   python3 -m http.server 8811   (from the parent of the repo, so /black-current/ resolves)
 *   npm run scan:visual            (PW_BROWSER=firefox to match the other witnesses) */
import {mkdirSync,writeFileSync} from 'node:fs';
const pw=await import('playwright');
const browserType=pw[process.env.PW_BROWSER||'chromium'];
const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const out='shots/visual-scan';mkdirSync(out,{recursive:true});
process.env.PULSE_SERVER='unix:/nonexistent';
const log=[],report={scenes:{},census:null,starter:null,errors:[]};
const browser=await browserType.launch();

async function boot(viewport,touch=false){
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch});const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(()=>window.stationGrid?.ready&&window.renderBudget?.ready&&window.combatScaling?.ready,null,{timeout:90000});
  await page.locator('#btn-menu-new').click();
  return page;
}
async function launch(page,name){
  await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill(name);
  await page.locator('#btn-title-quick').click();await page.waitForTimeout(900);
  await page.evaluate(()=>{try{garage.closeMission();}catch{}});
}
async function shot(page,name,fn,arg,wait=1800){
  try{const info=fn?await page.evaluate(fn,arg):null;await page.waitForTimeout(wait);await page.screenshot({path:`${out}/${name}.png`});report.scenes[name]=info||true;log.push('ok '+name);}
  catch(e){report.scenes[name]={error:e.message.slice(0,200)};log.push('FAIL '+name);}
}
// Place the player beside the first landmark of a sector, make it unkillable for the capture and let it run.
const go=({sys,gx,gy,zoom,live})=>{
  try{hubs.closeDock();}catch{}
  galaxy.enterSystemById(sys);worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});
  try{garage.closeMission();}catch{}
  const ch=worldMap.getCurrentChamber(),m=(sectorField.landmarks(ch)||[]).find(k=>!k.custom)||{x:0,y:300,radius:0};
  Object.assign(engine.player,{x:m.x+m.radius+160,y:m.y+120,vx:0,vy:0});engine.player.maxHp=engine.player.hp=1e8;
  Object.assign(engine.camera,{zoom,targetZoom:zoom});engine.paused=!live;
  return{title:ch.getChamberTitle(),danger:ch.dangerLevel,rule:ch.sys?.rule||null,region:ch.sys?.region||'Asterion',enemies:engine.enemies.length};
};
const fight=({tier,zoom})=>{
  galaxy.enterSystemById('home');worldMap.currentGridX=2;worldMap.currentGridY=2;engine.enterChamber({silent:true});try{garage.closeMission();}catch{}
  Object.assign(engine.player,{x:0,y:0,vx:0,vy:0});engine.player.maxHp=engine.player.hp=1e8;
  engine.enemies=Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/9,d=420+(i%3)*160,e=new EnemyOrganism(Math.cos(a)*d,Math.sin(a)*d,{tier,archetype:['mote','stalker','charger','sniper','hive'][i%5]});frontierPve.decorate(e);return e;});
  Object.assign(engine.camera,{zoom,targetZoom:zoom});engine.paused=false;return{tier};
};

/* ---------- desktop ---------- */
let page=await boot({width:1280,height:760});
await shot(page,'02-new-campaign',null,null,900);
await launch(page,'SCAN');
await shot(page,'03-first-launch',null,null,900);

const census=report.census=await page.evaluate(()=>{
  const S=galaxy.data.systems,count=(f)=>S.reduce((o,s)=>{const k=f(s);o[k]=(o[k]||0)+1;return o;},{});
  const sectorDanger={};
  for(const s of S){galaxy.enterSystemById(s.id);for(const ch of Object.values(worldMap.chambers)){if(ch.isHaven||ch.isBossSector)continue;combatScaling.prepare(ch);sectorDanger[ch.dangerLevel]=(sectorDanger[ch.dangerLevel]||0)+1;}}
  return{systems:S.length,byDanger:count(s=>s.danger),byRule:count(s=>s.rule||'none'),byRegion:count(s=>s.region),sectorDanger,civHome:saveState.doc.civHome,
    list:S.map(s=>({id:s.id,rule:s.rule,danger:s.danger,hub:s.hub,size:s.size,region:s.region}))};
});
const L=census.list,pick=f=>L.find(f);
const scenes=[['10-home-haven','home',0,0,.62,false],['11-home-ring1','home',1,1,.62,true],['12-training-range','home',1,0,.62,true],
  ['13-jelly-shoal','home',-1,1,.55,true],['14-home-ring2','home',2,-1,.55,true],
  ['15-boss-solar','home',-3,3,.45,true],['16-boss-titan','home',-3,-3,.45,true],['17-boss-queen','home',3,-3,.45,true],['18-boss-void','home',3,3,.45,true]];
const add=(name,s,gx,gy)=>{if(s)scenes.push([name,s.id,gx,gy,.48,true]);};
add('20-hub-system',pick(s=>s.hub&&s.id!=='home'&&s.id!==census.civHome),0,0);
for(const rule of ['blacksun','riptide','foundry','swarm'])add('21-rule-'+rule,pick(s=>s.rule===rule),1,0);
const deep=L.filter(s=>!s.rule&&!s.hub).sort((a,b)=>b.danger-a.danger)[0];
add('26-deep-ring1',deep,1,0);add('27-deep-edge',deep,Math.floor((deep.size||7)/2),Math.floor((deep.size||7)/2));
for(const region of ['Erebos','Aion','Chaos Cradle','Deep Current'])add('28-region-'+region.replace(/ /g,''),pick(s=>s.region===region&&!s.rule&&!s.hub),1,-1);
for(const [name,sys,gx,gy,zoom,live] of scenes)await shot(page,name,go,{sys,gx,gy,zoom,live},live?2600:1200);
for(const [name,tier,zoom] of [['30-combat-t1',1,.6],['31-combat-t5',5,.45],['32-combat-t9',9,.38]])await shot(page,name,fight,{tier,zoom},3500);
await shot(page,'33-grave-choir',()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});graveChoir.enter();try{garage.closeMission();}catch{}engine.player.maxHp=engine.player.hp=1e8;engine.paused=false;},null,3000);

await page.evaluate(()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});try{garage.closeMission();}catch{}engine.paused=false;});
report.starter=await page.evaluate(()=>{engine.recalculatePlayerStats();const P=engine.player;return{hp:P.maxHp,dps:Math.round(frontierPve.power())};});
await page.keyboard.press('KeyM');await shot(page,'40-sector-chart',null,null,600);
await page.click('#chart-tab-galaxy').catch(()=>{});await shot(page,'41-galaxy-chart',null,null,600);
await page.keyboard.press('Escape');await page.keyboard.press('Escape');
await shot(page,'42-pause-menu',()=>{menu.pause();},null,600);await page.evaluate(()=>menu.resume());
await shot(page,'43-station',()=>{engine.player.x=40;engine.player.y=0;hubs.openDock();},null,900);
for(const [name,service] of [['44-station-equipment','equipment'],['45-station-captain','captain'],['46-station-fitting','fitting'],['47-station-codex','codex'],['48-station-jobs','missions'],['49-station-progression','upgrades']]){
  await page.evaluate(()=>{for(const ui of [window.hangarUI,window.pilotRpg,window.equipmentCodex,window.modularYard,window.loot])try{ui?.close();}catch{}engine.paused=false;hubs.openDock();});
  await page.locator(`[data-station-service=${service}]`).click().catch(()=>log.push('no service '+service));
  await shot(page,name,null,null,900);
}
await page.context().close();

/* ---------- phone ---------- */
page=await boot({width:390,height:844},true);await launch(page,'PHONE');
await shot(page,'60-phone-ring1',go,{sys:'home',gx:1,gy:1,zoom:.5,live:true},2500);
await shot(page,'61-phone-combat-t5',fight,{tier:5,zoom:.4},3000);
await shot(page,'62-phone-station',()=>{galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});try{garage.closeMission();}catch{}engine.player.x=40;engine.player.y=0;hubs.openDock();},null,900);
await page.evaluate(()=>{hubs.closeDock();engine.paused=false;});await page.waitForTimeout(300);
await page.evaluate(()=>{engine.player.x=40;engine.player.y=0;hubs.openDock();});
await page.locator('[data-station-service=fitting]').tap().catch(()=>{});await shot(page,'63-phone-fitting',null,null,900);
await browser.close();

delete report.census.list;
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
console.log(log.join('\n'));
console.log(JSON.stringify({census:report.census,starter:report.starter,errors:report.errors.slice(0,6)}));
