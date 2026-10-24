import {mkdirSync,writeFileSync} from 'node:fs';
const {firefox}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const out='shots/night-sprint';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[]};
const check=(name,ok,detail=null)=>{report.checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok?'':': '+JSON.stringify(detail)}`);};
const browser=await firefox.launch();
const url=process.env.GAME_URL||'http://127.0.0.1:8811/';
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
await context.route('**/*',r=>r.request().url().startsWith(new URL(url).origin)?r.continue():r.abort());
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
async function tap(selector){await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).tap();await page.waitForTimeout(90);}
async function reachable(selector){return page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>=40&&r.height>=40&&r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});}
try{
 await page.goto(url);await page.waitForFunction(()=>window.expeditions&&window.loot&&document.getElementById('btn-phone-hold'));
 await page.waitForTimeout(250);
 for(const [button,title]of[['#btn-menu-settings','Settings'],['#btn-menu-howto','How to play'],['#btn-menu-credits','Credits']]){
  check(title+' title button is reachable',await reachable(button));await tap(button);check(title+' opens',await page.locator('#btn-panel-back').isVisible());await tap('#btn-panel-back');
 }
 check('fullscreen control is reachable',await reachable('#btn-phone-fullscreen'));
 await tap('#btn-phone-fullscreen');await page.waitForTimeout(100);
 const screen=await page.evaluate(()=>({on:!!document.fullscreenElement,message:document.getElementById('phone-screen-notice').textContent,pressed:document.getElementById('btn-phone-fullscreen').getAttribute('aria-pressed')}));
 check('native fullscreen enters or reports browser limitation',screen.on||screen.message.length>10,screen);
 if(screen.on){check('Exit stays reachable while fullscreen',await page.locator('#btn-phone-fullscreen').isVisible());await tap('#btn-phone-fullscreen');await page.waitForTimeout(150);}
 await tap('#btn-menu-builder');check('title Ship builder opens',await page.locator('#shipyard').isVisible());
 check('phone Shipyard exposes three reachable tabs',await reachable('#sy-tab-parts')&&await reachable('#sy-tab-ship')&&await reachable('#sy-tab-details'));
 await tap('#sy-tab-parts');check('parts view exposes real fitting cards',await page.locator('#sy-parts .part-card:visible').count()>6);
 await tap('#sy-parts .part-card[data-type=cannon] >> nth=0');
 check('selecting a part opens the full-width workbench',await page.locator('#shipyard').getAttribute('data-phone-pane')==='ship');
 const before=await page.evaluate(()=>shipyard.design.nodes.length);await tap('#sy-mount-selected');
 check('native Mount tap actually adds a part',await page.evaluate(n=>shipyard.design.nodes.length>n,before));
 await tap('#sy-undo');check('native Undo removes the addition',await page.evaluate(n=>shipyard.design.nodes.length===n,before));
 await tap('#sy-tab-details');check('Details has a usable name field',await page.locator('#sy-frame').isVisible());await tap('#sy-close');
 await page.evaluate(()=>{document.getElementById('title-callsign').value='NIGHT';garage.launch(false);garage.closeMission();});await page.waitForTimeout(200);
 check('top strip is under 38px',await page.locator('.organism-card').evaluate(el=>el.getBoundingClientRect().height<=38));
 for(const id of ['btn-phone-zoom-out','btn-phone-zoom-in','btn-phone-hold','btn-phone-sonar','btn-phone-fullscreen','btn-touch-pause','btn-touch-designer','btn-touch-map','btn-touch-build','btn-touch-ability','btn-phone-contracts'])check('flight '+id+' can be tapped',await reachable('#'+id));
 const z=await page.evaluate(()=>movementFeel.zoom);await tap('#btn-phone-zoom-out');check('Zoom out changes and saves camera framing',await page.evaluate(z=>movementFeel.zoom<z&&JSON.parse(localStorage.getItem('biotank_forge_feel')).zoom===movementFeel.zoom,z));await tap('#btn-phone-zoom-in');
 const move=await page.locator('#phone-move-stick').boundingBox();await page.mouse.move(move.x+54,move.y+54);await page.mouse.down();await page.mouse.move(move.x+88,move.y+54);await page.waitForTimeout(80);
 check('movement stick produces horizontal input',await page.evaluate(()=>engine.readInput().ax>.6&&Math.abs(engine.readInput().ay)<.15));await page.mouse.up();
 check('movement releases cleanly',await page.evaluate(()=>engine.touch.moveId===null));
 const aim=await page.locator('#phone-aim-stick').boundingBox();await page.mouse.move(aim.x+54,aim.y+54);await page.mouse.down();await page.mouse.move(aim.x+88,aim.y+54);await page.waitForTimeout(80);
 check('aim stick aims and holds fire',await page.evaluate(()=>{const i=engine.readInput();return i.fire&&i.aimX>engine.player.x+300&&Math.abs(i.aimY-engine.player.y)<50;}));await page.mouse.up();
 check('aim releases fire',await page.evaluate(()=>!engine.mouse.down&&engine.touch.aimId===null));
 await tap('#btn-touch-pause');check('Pause top action opens the real menu',await page.locator('#pause-menu').isVisible());await tap('#btn-pause-resume');
 await tap('#btn-touch-map');check('Chart opens and close works',await page.locator('#btn-close-map').isVisible());await tap('#btn-close-map');
 await tap('#btn-touch-build');check('Build opens the real structure cards',await page.locator('#build-list .build-card:visible').count()===4);await tap('#build-close');
 const budget=await page.evaluate(()=>{
  const old=JSON.stringify(saveState.doc.design),nodes=engine.player.nodes;
  const huge={color:'#5ef2e0',nodes:[{dx:0,dy:0,radius:20,type:'core'},...Array.from({length:8},(_,i)=>({dx:i*40,dy:40,radius:80,type:'cannon'}))]};
  const reason=fitting.check(huge),result=engine.applyDesign(huge);return{reason,blocked:result===false,unchanged:old===JSON.stringify(saveState.doc.design)&&nodes===engine.player.nodes};
 });check('over-budget fitting is rejected at the engine and preserves the active ship',budget.reason&&budget.blocked&&budget.unchanged,budget);
 await page.evaluate(()=>{progression.totalMass=500;progression.evolutionLevel=progression.getEvolutionData().level;const p=loot.catalog[0];saveState.addPart(p);progression.collectDrop(progression.spawnSalvage(engine.player.x,engine.player.y,{part:p}));});
 await tap('#btn-phone-hold');check('Hold opens a pictured inventory',await page.locator('#salvage-panel').isVisible()&&await page.locator('#salvage-list .loot-card img').count()>0);
 check('Hold shows currency, count and the quirk tradeoff',await page.locator('#salvage-wallet').textContent().then(t=>t.includes('metal')&&t.includes('GP'))&&await page.locator('#salvage-list').textContent().then(t=>t.includes('Ricochet')&&t.includes('slower')));
 await tap('#salvage-list .loot-card button >> nth=0');check('Fit blueprint reaches the Shipyard with metadata',await page.evaluate(()=>shipyard.open&&shipyard.part?.quirk==='bouncer'));
 await tap('#sy-mount-selected');check('Mount preserves the recovered quirk',await page.evaluate(()=>shipyard.design.nodes.some(n=>n.quirk==='bouncer')));
 await tap('#sy-fly');check('an affordable recovered design flies',await page.evaluate(()=>!shipyard.open&&engine.player.nodes.some(n=>n.quirk==='bouncer')));
 const guns=await page.evaluate(()=>{
  engine.enemies=[];const n=engine.player.nodes.find(n=>n.type==='cannon');
  const m={x:engine.player.x,y:engine.player.y,angle:0,turret:{node:{quirk:'bouncer'}}};const i=engine.projectiles.length;engine.fireMountGroup('spitter',[m],1);const p=engine.projectiles[i];
  const out={bounce:p?.ricochets===1,slow:Math.abs(p.vx-weaponSpeed('spitter')*.8)<.01};
  const j=engine.projectiles.length;engine.fireMountGroup('spitter',[{...m,turret:{node:{quirk:'scatter'}}}],1);out.scatter=engine.projectiles.length-j===2;return out;
 });check('ricochet fitting creates a slower bouncing shot',guns.bounce&&guns.slow,guns);check('scatter fitting creates two spread projectiles',guns.scatter,guns);
 const drones=await page.evaluate(()=>{
  const p=loot.catalog.find(p=>p.quirk==='thief');saveState.addPart(p);
  engine.applyDesign({color:'#5ef2e0',nodes:[{dx:0,dy:0,radius:18,type:'core'},{dx:30,dy:0,radius:12,type:'cannon'},{dx:-24,dy:12,radius:12,type:'bay',quirk:'thief',rarity:'rare'}]});
  engine.paused=false;engine.enemies=[];for(let i=0;i<70;i++)engine.update(1000/60);return engine.drones.some(d=>d.fromBay&&d.thief);
 });check('salvager drone bay launches a working drone',drones);
 await page.evaluate(()=>{engine.player.x=40;engine.player.y=0;engine.paused=false;hubs.metal=0;hubs.openDock();});await page.waitForTimeout(100);
 check('dock has three pictured exotic offers',await page.locator('#dock-oddities .loot-card').count()===3);
 check('each exotic offer wears its own fitting emblem',await page.locator('#dock-oddities .loot-card .quirk-badge').count()===3);
 check('unaffordable purchases are disabled',await page.locator('#dock-oddities button').evaluateAll(bs=>bs.every(b=>b.disabled)));
 const failedBuy=await page.evaluate(()=>{const n=saveState.partCount();return !loot.buy(loot.catalog[8])&&hubs.metal===0&&saveState.partCount()===n;});check('insufficient funds cannot mint a blueprint',failedBuy);
 await tap('#dock-vow');check('dock opens three vow choices',await page.locator('[data-vow]:visible').count()===3);await tap('[data-vow=bastion]');
 check('vow saves both its benefit and cost',await page.evaluate(()=>saveState.doc.vow==='bastion'&&vows.scale('parts')>1&&vows.scale('thrust')<1));await tap('#dock-undock');
 // Use the public transition seam rather than relying on hand-written map coordinates.
 const exploration=await page.evaluate(()=>{const black=galaxy.data.systems.find(s=>s.rule==='blacksun');galaxy.enterSystemById(black.id);engine.enterChamber({silent:true});expeditions.setup();engine.paused=false;return{event:!!expeditions.event,ping:expeditions.ping(),lights:expeditions.lights().length};});
 check('Black Sun has a recoverable signal and sonar-lit landmarks',exploration.event&&exploration.ping&&exploration.lights>=1,exploration);
 const audio=await page.evaluate(()=>{soundEngine.init();for(let i=0;i<30;i++)soundEngine.voice('shot',null,soundEngine.ctx.currentTime+i*.04);return{compressor:!!soundEngine.compressor,reverb:!!soundEngine.reverb,voices:soundEngine.activeVoices,peak:soundEngine.voicePeak};});
 check('procedural audio has compression, reverb and a ten-voice ceiling',audio.compressor&&audio.reverb&&audio.voices<=10&&audio.peak<=10,audio);
 await page.evaluate(()=>{galaxy.enterSystemById('home');engine.enterChamber({silent:true});garage.closeMission();engine.paused=false;});await page.waitForTimeout(100);await page.screenshot({path:out+'/flight-portrait.png'});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(180);
 for(const id of ['btn-phone-fullscreen','btn-phone-zoom-out','btn-phone-hold','btn-touch-pause','btn-touch-designer'])check('landscape '+id+' is reachable',await reachable('#'+id));
 await tap('#btn-touch-designer');check('landscape Shipyard has reachable tabs and Fly',await reachable('#sy-tab-parts')&&await reachable('#sy-fly'));await page.screenshot({path:out+'/shipyard-landscape.png'});await tap('#sy-close');
 const fresh=await page.evaluate(()=>{
  const out={catalog:loot.catalog.length,types:Object.values(loot.QUIRKS).every(q=>['cannon','siphon','thruster','bay','pod','shield','spike','mender'].includes(q.type))};
  const p={vx:10,vy:0,damage:10,pierce:1};quirks.shot(p,'seeker');out.seeker=p.seek&&p.vx===7.5;
  const l={vx:10,vy:0,damage:10,pierce:1};quirks.shot(l,'lance');out.lance=l.pierce===3&&Math.abs(l.damage-7)<.01;
  out.sell=hubs.sellValue({radius:16})===6;out.evo=EVOLUTION_THRESHOLDS.length===8&&EVOLUTION_THRESHOLDS[7].mass===5000;return out;});
 check('seven new quirk fittings are catalogued and wired',fresh.catalog===64&&fresh.types&&fresh.seeker&&fresh.lance,fresh);
const arsenal=await page.evaluate(()=>{const P=engine.player;const e=new EnemyOrganism(P.x+400,P.y,{tier:2,archetype:'stalker'});engine.enemies.push(e);const hp0=e.hp+(e.shield||0);
  const p=new Projectile(e.x,e.y,1,0,{damage:20,isPlayer:true});quirks.shot(p,'plasma');quirks.hit(p,e);
  for(let i=0;i<40;i++){engine.paused=false;engine.mapOpen=false;engine.update(1000/60);}
  return {burned:e.hp+(e.shield||0)<hp0,weapons:Object.keys(quirks.SHOT).every(q=>loot.QUIRKS[q]),hits:Object.keys(quirks.HIT).every(q=>loot.QUIRKS[q]),n:Object.keys(loot.QUIRKS).length};});
check('the arsenal wave is registered (32 quirks) and plasma actually burns a hull',arsenal.burned&&arsenal.weapons&&arsenal.hits&&arsenal.n===32,arsenal);
const turn=await page.evaluate(()=>{engine.touchAiming=false;const a=hardpoints.steerHull(0,3);engine.touchAiming=true;const b=hardpoints.steerHull(0,3);engine.touchAiming=false;return {a,b,ratio:b/a};});
check('the phone aim stick turns the hull 2.5x faster than the mouse path',Math.abs(turn.ratio-2.5)<.01,turn);
const art=await page.evaluate(()=>{
  const qs=Object.keys(loot.QUIRKS),out={n:qs.length,missing:qs.filter(q=>!quirkArt.has(q)),blank:[],drift:[]};
  for(const q of qs){const d=quirkArt.sprite(q).getContext('2d').getImageData(0,0,128,128).data;let lit=0;for(let i=3;i<d.length;i+=4)if(d[i]>200)lit++;if(lit<400)out.blank.push(q+':'+lit);}
  const keep=engine.projectiles.length;
  for(const q of Object.keys(quirks.SHOT)){const p={vx:10,vy:0,damage:10,life:60,radius:5,pierce:1,color:'#000001',x:0,y:0,isPlayer:true,type:'spitter'};quirks.SHOT[q](p);if(p.color!=='#000001'&&p.color!==quirkArt.COLOR[q])out.drift.push(q+':'+p.color);}
  engine.projectiles.length=keep;
  const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d'),before=quirkArt.drawn;
  fluidShader.drawOrganismMembrane(x,100,100,0,18,[{type:'core',dx:0,dy:0,currentDx:0,currentDy:0,radius:18},{type:'cannon',quirk:'void',dx:30,dy:0,currentDx:30,currentDy:0,radius:12},{type:'pod',quirk:'living',dx:-30,dy:0,currentDx:-30,currentDy:0,radius:16},{type:'cannon',dx:0,dy:30,currentDx:0,currentDy:30,radius:12}],'#00f3ff',{});
  out.hull=quirkArt.drawn-before;
  const s0=quirkArt.shotsDrawn;engine.projectiles.push(...qs.slice(0,25).map((q,i)=>({x:i*10,y:0,vx:4,vy:1,radius:4,quirk:q,isPlayer:true})));
  quirkArt.drawShots(x,{x:0,y:0});engine.projectiles.length=keep;out.shots=quirkArt.shotsDrawn-s0;
  out.voices=Object.keys(quirks.SHOT).filter(q=>loot.QUIRKS[q]?.type==='cannon'&&!quirkArt.VOICE['q:'+q]);
  return out;});
check('every one of the 32 fittings has its own emblem, palette and hull art',art.n===32&&!art.missing.length&&!art.blank.length&&art.hull===2,art);
check('shot colours in quirks.SHOT match the art palette (no drift)',!art.drift.length,art.drift);
check('quirk shots draw their own trails and every quirk cannon has a voice',art.shots===25&&!art.voices.length,art);
 check('scrap value and the stretched evolution ladder are live',fresh.sell&&fresh.evo,fresh);
 await page.evaluate(()=>{engine.paused=true;menu.openPanel('settings','title');});await page.waitForTimeout(80);
 await tap('#gfx-low');check('Low graphics turns the look layers off and cuts particles',await page.evaluate(()=>!look.cfg.shipGlow&&!look.cfg.nebula&&MAX_PARTICLES<100&&saveState.doc.settings.gfxQuality==='low'));
 await tap('#gfx-ultra');check('Ultra graphics restores every layer and raises the cap',await page.evaluate(()=>look.cfg.shipGlow&&look.cfg.dust&&MAX_PARTICLES===400));
 await tap('#set-gfxFps');check('FPS counter can be shown',await page.locator('#fps-overlay').isVisible());await tap('#set-gfxFps');
await tap('#gfx-cap-30');check('frame limit 30 reaches the engine loop and the saved settings',await page.evaluate(()=>engine.fpsCap===30&&menu.settings().gfxFpsCap===30));
const capped=await page.evaluate(async()=>{let n=0;const sf=engine.stepFrame;engine.stepFrame=function(t){n++;return sf.call(this,t);};await new Promise(r=>setTimeout(r,2000));engine.stepFrame=sf;return n/2;});
check('a 30 fps limit actually holds the loop at or under 31 frames a second',capped<=31&&capped>=10,capped);
await tap('#gfx-cap-0');check('frame limit Off removes the cap',await page.evaluate(()=>engine.fpsCap===0));
 await tap('#gfx-high');await tap('#btn-panel-back');
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.loot&&window.vows);
 check('inventory and vow survive reload',await page.evaluate(()=>saveState.doc.inventory.some(p=>p.quirk==='bouncer')&&saveState.doc.vow==='bastion'));
 const standalone=await context.newPage();standalone.on('pageerror',e=>report.errors.push(e.message));await standalone.goto(new URL('dist/black-current.html',url).href);await standalone.waitForFunction(()=>window.loot&&window.expeditions&&document.getElementById('phone-aim-stick'));
 check('rebuilt HTML includes the complete phone and equipment batch',await standalone.locator('#btn-phone-fullscreen').isVisible());
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(error){check('witness completed',false,String(error));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(`${report.passed}/${report.checks.length} passed`);if(report.failed)process.exitCode=1;
