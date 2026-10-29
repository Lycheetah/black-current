import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/faction-fleets';mkdirSync(dir,{recursive:true});
const checks=[],errors=[],data={},hash=b=>createHash('sha256').update(b).digest('hex');
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const manifest=JSON.parse(readFileSync('art/faction-kit.json'));
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));const missing=[];page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).hostname==='127.0.0.1')missing.push(r.url());});
try{
 const ready=()=>page.waitForFunction(()=>window.factionFleets?.ready&&window.factionArt?.ready&&window.encounterHUD?.ready);
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/',{waitUntil:'domcontentloaded'});await ready();await page.evaluate(()=>factionArt.loaded);
 check('twelve selected alpha assets load without fallback failures',await page.evaluate(()=>factionArt.count===12&&factionArt.failures.length===0));
 check('all accepted files remain byte-identical to their provenance manifest',manifest.assets.length===12&&manifest.assets.every(a=>hash(readFileSync(a.path))===a.sha256));
 const guard=execFileSync('python3',['-c',`import importlib.util,json,tempfile
from pathlib import Path
s=importlib.util.spec_from_file_location('candidate','scripts/build-candidate.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as d:
 p=Path(d);(p/'art/keyed').mkdir(parents=True);(p/'art/keyed/bad.png').write_bytes(b'changed asset')
 (p/'art/faction-kit.json').write_text(json.dumps({'v':1,'assets':[{'id':'bad','path':'art/keyed/bad.png','sha256':'0'*64}]}))
 try:m.faction_inputs(p)
 except ValueError:print('rejected changed art')
 else:raise SystemExit('changed art falsely accepted')`],{encoding:'utf8'}).trim();check('selected-art gate rejects a deliberately incorrect asset digest',guard==='rejected changed art');
 await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('FLEET WITNESS');await page.locator('#btn-title-quick').click();await page.evaluate(()=>{garage.closeMission();engine.paused=true;});
 data.profiles=await page.evaluate(()=>canon.civilisations.map(c=>({id:c.id,...factionFleets.profile(c.id)})));
 check('all fifteen canonical civilisations map to three explicit fleet styles',data.profiles.length===15&&new Set(data.profiles.map(p=>p.skin)).size===3);
 data.models=await page.evaluate(()=>{
  const old=galaxy.currentId,out=[];
  try{for(const civ of canon.civilisations){const sys=galaxy.data.systems.find(s=>factionFleets.civilisation(s.id)===civ.id&&s.id!==saveState.doc.civHome);if(!sys)throw new Error('No system for civilisation '+civ.id);galaxy.currentId=sys.id;for(const tier of[1,3,5,7])for(const archetype of['mote','stalker','charger','sniper','hive']){const e=new EnemyOrganism(310,100,{tier,archetype});frontierPve.decorate(e);out.push({id:civ.id,tier,archetype,model:modularShips.hasModel(e.nodes),shape:JSON.stringify(e.nodes.map(n=>[n.type,n.dx,n.dy])),hp:e.maxHp,skin:e.nodes.find(n=>n.type==='cannon')?.factionSkin});}}}finally{galaxy.currentId=old;}return out;
 });
 check('300 civilisation, class and role combinations compile to modular hulls',data.models.length===300&&data.models.every(m=>m.model));
 const representative=['savanah','human-hunters','ai-gods'].map(id=>data.models.find(m=>m.id===id&&m.tier===3&&m.archetype==='stalker'));
 check('three cruiser doctrines have distinct connected silhouettes',new Set(representative.map(m=>m.shape)).size===3);
 check('doctrine silhouettes add no raw HP bonus to the same role and tier',new Set(representative.map(m=>m.hp)).size===1,representative.map(({id,hp})=>({id,hp})));
 data.home=await page.evaluate(()=>{civilisations.goHome();return[1,2,3].map(gy=>{worldMap.currentGridX=0;worldMap.currentGridY=gy;engine.enterChamber({silent:true});engine.paused=true;return{gy,danger:worldMap.getCurrentChamber().dangerLevel,count:engine.enemies.length,plan:factionFleets.plan(),composed:engine.enemies.filter(e=>e.fleetEncounter).length,patrol:contactDirector.spawn()};});});
 check('first three home rings retain their old pressure and receive no new formations',data.home.every((h,i)=>h.danger===(i<2?1:2)&&h.count<=(i<2?4:6)&&h.plan===null&&h.composed===0&&!h.patrol),data.home);
 data.scenes={};
 for(const [skin,civ]of[['hunt','savanah'],['forge','human-hunters'],['lance','ai-gods']]){
  data.scenes[skin]=await page.evaluate(civ=>{
   const sys=galaxy.data.systems.find(s=>factionFleets.civilisation(s.id)===civ&&s.id!==saveState.doc.civHome&&!s.rule);galaxy.enterSystemById(sys.id);/* ring 4: its own danger is 3+, where doctrine formations apply (entering a sector recomputes danger, so a forced 3 at ring 2 did not stick) */worldMap.currentGridX=4;worldMap.currentGridY=0;const ch=worldMap.getCurrentChamber();ch.isHaven=false;ch.isBossSector=false;ch.dangerLevel=3;ch.isCleared=false;engine.enterChamber({silent:true});engine.paused=true;const plan=factionFleets.plan(),initial={count:engine.enemies.length,cap:frontierPve.roomCap(worldMap.getCurrentChamber()),danger:worldMap.getCurrentChamber().dangerLevel,roles:engine.enemies.filter(e=>e.fleetEncounter).map(e=>e.archetype),wings:engine.enemies.filter(e=>e.fleetEncounter).map(e=>e.wingKey||null)};
   engine.enemies=[];engine.player.x=engine.player.y=0;engine.camera.zoom=.65;engine.paused=false;const spawned=contactDirector.spawn();engine.paused=true;const before=engine.enemies.length;
   for(const e of engine.enemies)e.update(engine.player,engine.projectiles,engine.enemies);engine.paused=false;const repeat=contactDirector.spawn();engine.paused=true;
   const positions=[[-360,-70],[0,-120],[360,-70]];engine.enemies.forEach((e,i)=>{e.x=positions[i%3][0]+(i>=3?35:0);e.y=positions[i%3][1]+(i>=3?35:0);e.angle=Math.atan2(280-e.y,-e.x);if(e.archetype==='sniper'){e.aimT=8;e.aimA=e.angle;}if(e.archetype==='charger')e.chargeT=15;});engine.player.x=0;engine.player.y=280;engine.projectiles=[];Object.assign(engine.camera,{zoom:.65,targetZoom:.65,x:-engine.viewportWidth/.65/2,y:-engine.viewportHeight/.65/2});engine.updateHUD();engine.render();
   const members=engine.enemies.filter(e=>e.fromContactDirector);return{sys:sys.id,plan,initial,spawned,before,repeat,after:members.length,followers:engine.enemies.length-members.length,roles:members.map(e=>e.archetype),wings:members.map(e=>e.wingKey||null),names:members.map(e=>e.name),patterns:members.map(e=>e.fleetPattern),nodes:members.map(e=>e.nodes.length)};
  },civ);
  await page.screenshot({path:`${dir}/${skin}-cruiser-desktop.png`});
  const s=data.scenes[skin];/* enemy-wings.js re-composes a doctrine trio into a wing (witness-enemy-wings): a formation is the doctrine roles or one shared wing of three */
  const formed=(roles,wings,plan)=>roles.length===3&&(roles.every((r,i)=>r===plan.roles[i])||wings.length===3&&wings[0]&&wings.every(w=>w===wings[0]));
  check(`${skin}: native sector load composes its three-role formation without crowding`,s.initial.count<=s.initial.cap&&formed(s.initial.roles,s.initial.wings,s.plan),s.initial);
  check(`${skin}: real patrol spawns three matching hulls and refuses an immediate repeat`,s.spawned&&s.before===3&&!s.repeat&&s.after===3&&formed(s.roles,s.wings,s.plan),s);
  // The same actual renderer at capital scale, with one capital centred on a phone.
  await page.evaluate(()=>{engine.enemies=engine.enemies.filter(e=>e.fromContactDirector).map((old,i)=>{const e=new EnemyOrganism(i===0?0:i===1?-560:560,i===0?0:-220,{tier:7,archetype:old.archetype});frontierPve.decorate(e);e.angle=Math.atan2(350-e.y,-e.x);if(e.archetype==='sniper'){e.aimT=8;e.aimA=e.angle;}return e;});engine.camera.zoom=.3;engine.camera.targetZoom=.3;engine.player.x=0;engine.player.y=350;});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{Object.assign(engine.camera,{zoom:.3,targetZoom:.3,x:-engine.viewportWidth/.3/2,y:-engine.viewportHeight/.3/2});engine.render();});
  await page.waitForFunction(()=>document.querySelector('.event-banner.show')?.getBoundingClientRect().top>=215);
  const cue=await page.locator('.event-banner.show').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.getElementById('phone-reactor').getBoundingClientRect();return{top:a.top,bottom:a.bottom,left:a.left,right:a.right,reactorBottom:b.bottom};});
  check(`${skin}: phone patrol message clears the reactor controls and fits the screen`,cue.top>=cue.reactorBottom&&cue.left>=0&&cue.right<=390&&cue.bottom<844, cue);
  await page.screenshot({path:`${dir}/${skin}-capital-phone.png`});await page.setViewportSize({width:1214,height:800});
 }
 // The lance cruiser's extended keel uses its larger turret skin. Witness a
 // frigate in the real scene as well, so the small solar mount is reached.
 await page.evaluate(()=>{const e=new EnemyOrganism(0,0,{tier:1,archetype:'stalker'});frontierPve.decorate(e);e.angle=Math.PI/2;engine.enemies=[e];engine.player.x=0;engine.player.y=180;Object.assign(engine.camera,{zoom:.8,targetZoom:.8,x:-engine.viewportWidth/.8/2,y:-engine.viewportHeight/.8/2});engine.render();});
 await page.screenshot({path:`${dir}/lance-frigate-desktop.png`});
 check('three doctrines produce three distinct native patrol compositions',new Set(Object.values(data.scenes).map(s=>s.roles.join(','))).size===3);
 data.steering=await page.evaluate(()=>{
  const out=[],original=factionFleets.steer;factionFleets.steer=(e,p)=>{const before=[e.vx,e.vy];original(e,p);out.push({id:e.faction,role:e.archetype,before,after:[e.vx,e.vy]});};
  try{for(const[id,archetype]of[['savanah','stalker'],['human-hunters','stalker'],['ai-gods','hive']]){galaxy.currentId=galaxy.data.systems.find(s=>factionFleets.civilisation(s.id)===id).id;const e=new EnemyOrganism(-180,0,{tier:3,archetype});e._aggro=true;e._fleetLane=-1;e.actionTimer=999;e.update({...engine.player,x:0,y:0},[],[e]);}}finally{factionFleets.steer=original;}return out;
 });
 check('actual AI update reaches all three distinct steering adjustments',data.steering.length===3&&data.steering.every(s=>s.before.some((n,i)=>Math.abs(n-s.after[i])>.1)),data.steering);
 data.firing=await page.evaluate(()=>{const out=[];for(const id of['savanah','human-hunters','ai-gods']){galaxy.currentId=galaxy.data.systems.find(s=>factionFleets.civilisation(s.id)===id).id;const e=new EnemyOrganism(-440,0,{tier:3,archetype:'sniper'});e._aggro=true;const shots=[];for(let i=0;i<180;i++)e.update({...engine.player,x:0,y:0},shots,[e]);const firing=shots.length;for(const n of e.nodes)if(n.type==='cannon')n.lost=true;for(let i=0;i<180;i++)e.update({...engine.player,x:0,y:0},shots,[e]);out.push({id,firing,disarmed:shots.length===firing});}return out;});
 check('all three faction snipers actually shoot and stop when their gun is destroyed',data.firing.length===3&&data.firing.every(s=>s.firing>0&&s.disarmed),data.firing);
 data.named=await page.evaluate(()=>{const entities=[new EnemyOrganism(0,0,{tier:3,archetype:'stalker',name:'Named quest guard'}),new EnemyOrganism(0,0,{tier:3,archetype:'sniper'}),new EnemyOrganism(0,0,{tier:3,archetype:'stalker',isBoss:true}),new EnemyOrganism(0,0,{tier:3,archetype:'mote'})];entities[1].elite=true;entities[3].firstExpeditionGuard=0;const before=entities.map(e=>e.archetype),count=factionFleets.compose(entities,worldMap.getCurrentChamber());return{before,after:entities.map(e=>e.archetype),count};});
 check('named enemies, elites, bosses and quest guard zero are not recomposed',data.named.count===0&&JSON.stringify(data.named.before)===JSON.stringify(data.named.after),data.named);
 check('lock and ram warnings retain priority over doctrine labels',await page.evaluate(()=>{const e=engine.enemies[0];e.archetype='sniper';e.aimT=8;e.fleetPattern='LANCE SCREEN';const lock=encounterHUD.label(e);e.aimT=0;e.chargeT=8;const ram=encounterHUD.label(e);return lock.warning&&lock.detail.includes('LOCKED')&&ram.warning&&ram.detail.includes('RAM');}));
 data.art=await page.evaluate(()=>({count:factionArt.count,stats:factionArt.stats,cache:{entries:topdownKit.flightCache.entries,pixels:topdownKit.flightCache.pixels}}));
 check('all twelve selected sprites are reached by real hull and turret rendering',data.art.stats.sections>0&&data.art.stats.turrets>0&&Object.keys(data.art.stats.used).length===12,data.art);
 check('new fleet hull caches stay within the existing memory bound',data.art.cache.entries<=24&&data.art.cache.pixels<=4194304,data.art.cache);
 if(process.env.STANDALONE_PATH){
  const receipt=JSON.parse(readFileSync('shots/release-candidate/package.json')),build=JSON.parse(readFileSync('dist/release-candidate/build.json'));
  check('all manifested candidate files match their recorded hashes',Object.keys(build.files).length>600&&Object.entries(build.files).every(([p,h])=>hash(readFileSync('dist/release-candidate/'+p))===h),{files:Object.keys(build.files).length});
  check('versioned, generic and packaged standalone bytes match',hash(readFileSync(process.env.STANDALONE_PATH))===receipt.standalone_sha256&&hash(readFileSync('dist/black-current.html'))===receipt.standalone_sha256&&hash(readFileSync('dist/release-candidate/download/black-current.html'))===receipt.standalone_sha256);
  const offline=await browser.newContext({viewport:{width:390,height:844}}),requests=[];await offline.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});const p=await offline.newPage();p.on('pageerror',e=>errors.push('offline: '+e.message));await p.goto(pathToFileURL(resolve(process.env.STANDALONE_PATH)).href,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.factionFleets?.ready&&window.factionArt?.ready);check('standalone loads the twelve sprites and doctrines without network dependencies',await p.evaluate(()=>factionArt.count===12&&factionArt.failures.length===0&&Object.keys(factionFleets.STYLES).length===3)&&requests.every(u=>/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)),requests);await offline.close();
 }
 check('no missing local resources or application exceptions',missing.length===0&&errors.length===0,{missing,errors});
}catch(e){errors.push(e.stack);check('faction encounter witness completed',false,e.message);await page.screenshot({path:`${dir}/failure.png`}).catch(()=>{});}
finally{const report={checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors}));await browser.close();if(report.failed||errors.length)process.exitCode=1;}
