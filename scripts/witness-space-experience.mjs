import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

process.env.PULSE_SERVER='unix:/nonexistent';
const phase=process.argv.includes('--baseline')?'baseline':'candidate';
const dir=`shots/space-experience/${phase}`;
mkdirSync(dir,{recursive:true});
const checks=[],errors=[],data={};
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await firefox.launch();
const context=await browser.newContext({viewport:{width:1214,height:700}});
await context.addInitScript(()=>{let seed=0xB1AC;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');
  await page.waitForFunction(()=>window.stationGrid?.ready&&window.renderBudget?.ready&&(typeof encounterHUD==='undefined'||encounterHUD.ready));
  await page.locator('#btn-menu-new').click();
  await page.evaluate(()=>civilisations.choose('savanah'));
  await page.locator('#title-callsign').fill('SPACE WITNESS');
  await page.locator('#btn-title-quick').click();
  await page.evaluate(async()=>{garage.closeMission();engine.paused=true;await sectionArt.loaded;await turretArt.loaded;});
  // Frozen actual engine scenes: no browser time is misreported as combat FPS.
  for(const [name,tier,count,zoom] of [['rookie',1,4,.62],['skirmish',3,12,.5],['capital',7,12,.4]]){
    data[name]=await page.evaluate(({tier,count,zoom})=>{
      civilisations.goHome();worldMap.currentGridX=worldMap.currentGridY=4;engine.enterChamber({silent:true});engine.paused=true;
      Object.assign(engine.player,{x:0,y:260,vx:0,vy:0,angle:-Math.PI/2,iFrames:0});
      engine.projectiles=[];engine.drones=[];engine.bioMines=[];progression.bubbleDrops=[];particleSystem.particles=[];
      engine.enemies=Array.from({length:count},(_,i)=>{
        const a=i*Math.PI*2/count,dist=i>=6?2200:350+i*30;
        const e=new EnemyOrganism(Math.cos(a)*dist,Math.sin(a)*dist-100,{tier,archetype:['mote','stalker','charger','sniper','hive'][i%5]});
        frontierPve.decorate(e);e.angle=Math.atan2(engine.player.y-e.y,engine.player.x-e.x);return e;
      });
      Object.assign(engine.camera,{zoom,targetZoom:zoom,x:-engine.viewportWidth/zoom/2,y:-engine.viewportHeight/zoom/2});
      saveState.doc.settings.gfxQuality='medium';renderBudget.invalidate();
      const sample=()=>{for(let n=0;n<8;n++)engine.render();const times=[];for(let n=0;n<30;n++){const start=performance.now();engine.render();engine.ctx.getImageData(0,0,1,1);times.push(performance.now()-start);}times.sort((a,b)=>a-b);return{n:times.length,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)]};};
      engine.updateHUD();engine.drawMiniRadar();document.getElementById('dock-prompt').classList.toggle('on',!!hubs.dockNear());
      const full=sample(),original=topdownKit.flightHull;let withoutHull,uncached;
      try{topdownKit.flightHull=()=>{};withoutHull=sample();}finally{topdownKit.flightHull=original;}
      if(topdownKit.flightCache){try{topdownKit.flightCache.enabled=false;uncached=sample();}finally{topdownKit.flightCache.enabled=true;}}
      engine.render();return{full,withoutHull,uncached,enemies:engine.enemies.length,nodes:engine.enemies.map(e=>e.nodes.length),zoom,quality:'medium',canvas:[engine.canvas.width,engine.canvas.height],contacts:window.encounterHUD?.contacts,cache:topdownKit.flightCache?.stats};
    },{tier,count,zoom});
    await page.waitForTimeout(2400);
    if(phase==='candidate')data[name].contacts=await page.evaluate(()=>{engine.render();return encounterHUD.contacts;});
    await page.screenshot({path:`${dir}/${name}-desktop.png`});
    console.log(name,JSON.stringify(data[name]));
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{engine.camera.zoom=.4;engine.camera.x=-engine.viewportWidth/.4/2;engine.camera.y=-engine.viewportHeight/.4/2;engine.render();});
  await page.screenshot({path:`${dir}/capital-phone.png`});
  check('three populated scenes were rendered and sampled',Object.keys(data).length===3&&Object.values(data).every(s=>s.full.n===30&&s.enemies>=4));
  if(phase==='candidate'){
    data.shapes=await page.evaluate(()=>[1,3,5,7].flatMap(tier=>['mote','stalker','charger','sniper','hive'].map(archetype=>{const e=new EnemyOrganism(211,100,{tier,archetype});frontierPve.decorate(e);return{tier,archetype,model:modularShips.hasModel(e.nodes),count:e.nodes.length};})));
    check('all twenty role/class combinations compile to physical modular ships',data.shapes.length===20&&data.shapes.every(s=>s.model));
    data.cache=await page.evaluate(()=>{
      const e=engine.enemies.find(e=>e.archetype==='stalker'),original=topdownKit.flightHull;let info;
      try{topdownKit.flightHull=function(ctx,x,y,a,n,i){if(n===e.nodes)info=i;return original.apply(this,arguments);};engine.render();}finally{topdownKit.flightHull=original;}
      if(!info)throw new Error('Actual flight hull not reached');
      const fc=topdownKit.flightCache,c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
      const paint=()=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1024,1024);original(ctx,512,512,0,e.nodes,info);return ctx.getImageData(0,0,1024,1024).data;};
      fc.clear();fc.enabled=true;const cached=paint(),built=fc.stats.paints;paint();const reused=fc.stats.paints===built;
      fc.enabled=false;const raw=paint();fc.enabled=true;let error=0;for(let i=0;i<raw.length;i++)error+=Math.abs(raw[i]-cached[i]);
      const node=e.nodes[1];node.lost=true;const damaged=paint(),damagePaint=fc.stats.paints>built;node.lost=false;
      let changed=0;for(let i=3;i<raw.length;i+=4)if(raw[i]!==damaged[i])changed++;
      paint();let before=fc.stats.paints;info.color='#ff3355';paint();const recolored=fc.stats.paints>before;
      before=fc.stats.paints;e.nodes[1].currentDx+=2;paint();const moved=fc.stats.paints>before;e.nodes[1].currentDx-=2;
      before=fc.stats.paints;ctx.scale(.5,.5);original(ctx,512,512,0,e.nodes,info);const zoomed=fc.stats.paints>before;
      fc.clear();for(let i=0;i<40;i++)original(ctx,512,512,0,e.nodes.map(n=>({...n})),info);
      return{reused,pixelError:error/raw.length/255,damagePaint,changed,recolored,moved,zoomed,entries:fc.entries,pixels:fc.pixels,evictions:fc.stats.evictions};
    });
    check('unchanged flight hulls reuse their raster while preserving artwork',data.cache.reused&&data.cache.pixelError<.01,data.cache);
    check('destroying a section invalidates the cache and visibly removes pixels',data.cache.damagePaint&&data.cache.changed>20,data.cache);
    check('colour, physical offsets and zoom changes invalidate cached artwork',data.cache.recolored&&data.cache.moved&&data.cache.zoomed,data.cache);
    check('flight cache remains within 24 entries and 16 MiB RGBA',data.cache.entries<=24&&data.cache.pixels<=4194304&&data.cache.evictions>0,data.cache);
    check('actual encounter frames expose role and class labels',data.rookie.contacts?.length>0&&data.capital.contacts?.some(c=>c.title.includes('CAPITAL')),data.capital.contacts);
    check('contact labels avoid the live contract and event panels',await page.evaluate(()=>{engine.render();const rects=[...document.querySelectorAll('#contracts,#story-contract,#system-strip,.event-banner.show')].map(e=>e.getBoundingClientRect());return encounterHUD.contacts.every(c=>rects.every(r=>!r.width||!r.height||c.x+c.w/2<=r.left||c.x-c.w/2>=r.right||c.y+c.h/2<=r.top||c.y-c.h/2>=r.bottom));}));
    data.warnings=await page.evaluate(()=>{const e=engine.enemies.find(e=>e.archetype==='sniper'),normal=encounterHUD.label(e);e.aimT=8;const locked=encounterHUD.label(e);e.aimT=0;return{normal,locked};});
    check('sniper windup labels become an explicit locked warning',!data.warnings.normal.warning&&data.warnings.locked.warning&&data.warnings.locked.detail.includes('EVADE'));
    data.route=await page.evaluate(()=>{
      worldMap.currentGridX=3;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.paused=true;travelHelper.station();
      const exit=navigationHud.beacon();worldMap.currentGridX=worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.paused=true;
      const station=navigationHud.beacon();return{exit,station};
    });
    check('distant station guidance points to a real cardinal sector exit',data.route.exit.label==='EXIT WEST'&&data.route.exit.gx===2&&data.route.exit.gy===2&&!data.route.exit.local,data.route);
    check('station-sector guidance resolves to the actual refit landmark',data.route.station.local&&data.route.station.label==='REFIT STATION'&&data.route.station.x===0&&data.route.station.y===0);
    await page.evaluate(()=>{engine.player.x=650;engine.player.y=300;engine.camera.x=engine.player.x-engine.viewportWidth/.4/2;engine.camera.y=engine.player.y-engine.viewportHeight/.4/2;engine.enemies=[];engine.drawMiniRadar();travelHelper.paint();engine.render();});
    await page.waitForTimeout(4200);await page.screenshot({path:`${dir}/station-route-phone.png`});
    data.routeCard=await page.locator('#travel-cue').evaluate(e=>{const r=e.getBoundingClientRect(),buttons=[...e.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>({id:b.id,h:b.getBoundingClientRect().height}));return{h:r.height,top:r.top,right:r.right,buttons};});
    check('phone route card stays compact (two rows) with four usable touch controls: close, approach, autopilot, chart',data.routeCard.h<=106&&data.routeCard.top>=210&&data.routeCard.buttons.length===4&&data.routeCard.buttons.every(b=>b.h>=44),data.routeCard);
    await page.locator('#travel-dismiss').click();
    check('the route close button removes both banner and in-space beacon',await page.evaluate(()=>!navigationHud.beacon()&&document.getElementById('travel-cue').hidden));
    check('phone viewport has no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  check('no application exceptions',errors.length===0,errors);
}catch(e){errors.push(e.stack);check('space witness completed',false,e.message);}
finally{
  const report={phase,checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};
  writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({phase,passed:report.passed,failed:report.failed,errors}));
  await browser.close();if(report.failed||errors.length)process.exitCode=1;
}
