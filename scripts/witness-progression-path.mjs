import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/progression-path';mkdirSync(dir,{recursive:true});
const censusOnly=process.argv.includes('--census'),checks=[],errors=[],data={};
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),page=await context.newPage();
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
try{
 const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
 const ready=()=>page.waitForFunction(census=>window.quartermaster?.ready&&starterJourney.ready&&(census||window.upgradePath?.ready),censusOnly);
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready();
 await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('PROGRESSION');await page.locator('#btn-title-quick').click();await page.evaluate(()=>{garage.closeMission();engine.paused=true;});
 data.census=await page.evaluate(()=>{
  const gears=Object.entries(modularShips.GEARS).filter(([,g])=>g.weapon&&!g.salvageOnly),weapons={};
  for(const [id,g]of gears){const a=weapons[g.cls]??=[];a.push({id,price:g.cost,dps:arsenal.dps(g.weapon),family:g.family,power:g.power});}
  const classes=Object.fromEntries(Object.entries(weapons).map(([cls,a])=>[cls,{count:a.length,min:Math.min(...a.map(g=>g.price)),max:Math.max(...a.map(g=>g.price)),guns:a}]));
  const frames=Object.entries(modularShips.HULLS).map(([id,h])=>({id,...h,training:modularShips.RANK_COST.slice(0,h.rank).reduce((a,b)=>a+b,0),frameAndTraining:h.cost+modularShips.RANK_COST.slice(0,h.rank).reduce((a,b)=>a+b,0)}));
  contracts.state().active.forEach(c=>{c.n=100000;c.have=0;});civilisations.goHome();worldMap.currentGridX=0;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.paused=true;
  let seed=27491;const random=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const kills=[];
  try{for(const[tier,elite,archetype]of[[1,false,'stalker'],[2,false,'stalker'],[3,false,'stalker'],[5,false,'stalker'],[7,false,'stalker'],[3,true,'stalker'],[3,false,'outpost']]){
   const cash=hubs.metal,mass=progression.totalMass;let parts=0;
   for(let i=0;i<20;i++){const e=new EnemyOrganism(1300,1300,{tier,archetype});e.elite=elite;frontierPve.decorate(e);e.hp=0;engine.enemies=[e];progression.bubbleDrops=[];hunt.chain=0;hunt.lastKill=-1e9;engine.killEnemy(0);parts+=progression.bubbleDrops.filter(d=>d.part).length;for(const drop of progression.bubbleDrops)if(!drop.part&&!drop.core)progression.collectDrop(drop);engine.effects=[];}
   kills.push({tier,elite,archetype,count:20,metal:hubs.metal-cash,biomass:progression.totalMass-mass,equipmentDrops:parts});
  }}finally{Math.random=random;}
  return{classes,frames,kills,novicePrices:upgradePath.NOVICE_PRICES,rankCosts:modularShips.RANK_COST,killMethod:'20 isolated native deaths per cohort; all plain biomass collected; no kill chains, field contracts or travel time'};
 });
 if(censusOnly){writeFileSync(`${dir}/baseline.json`,JSON.stringify(data.census,null,2));console.log(JSON.stringify({classes:Object.fromEntries(Object.entries(data.census.classes).map(([k,{count,min,max}])=>[k,{count,min,max}])),frames:data.census.frames.map(({id,frameAndTraining,mass})=>({id,frameAndTraining,mass})),kills:data.census.kills},null,2));}
 else{
  check('runtime census contains six weapon sizes, nine frames and 140 native kills',Object.keys(data.census.classes).length===6&&data.census.frames.length===9&&data.census.kills.reduce((a,k)=>a+k.count,0)===140);
  // Prices and bounties come from js/tuning.js (PRICE_CURVE, BOUNTY); the old recorded-baseline fixture is gone.
  const curve=c=>['LIGHT','MEDIUM','HEAVY','SIEGE','CAPITAL'].every((k,i,a)=>i===0||c[k].min>c[a[i-1]].max),T=await page.evaluate(()=>({gun:tuning.PRICE_CURVE.gun,frame:tuning.PRICE_CURVE.frame,rank:tuning.PRICE_CURVE.rankMetal,bounty:tuning.BOUNTY}));
  check('larger ordinary weapon sizes have successively higher prices',curve(data.census.classes),Object.fromEntries(Object.entries(data.census.classes).map(([k,v])=>[k,{min:v.min,max:v.max}])));
  check('all fifteen novice prices stay 4–16 and Light entry is 48 metal',Object.keys(data.census.novicePrices).length===15&&Object.values(data.census.novicePrices).every(n=>n>=4&&n<=16)&&data.census.classes.LIGHT.min===48);
  check('home-ring bounties pay the native table and later enemies pay more',data.census.kills.slice(0,3).every(k=>k.metal===k.count*T.bounty[k.tier])&&data.census.kills[3].metal>data.census.kills[2].metal&&data.census.kills[4].metal>data.census.kills[3].metal,data.census.kills);
  check('capital guns start at the tuning price and frame investments rise to Titan',data.census.classes.CAPITAL.min>=T.gun.CAPITAL&&data.census.frames.every((h,i,a)=>i===0||h.frameAndTraining>a[i-1].frameAndTraining)&&data.census.frames[1].frameAndTraining===T.frame.destroyer+T.rank[0],data.census.frames.map(({id,frameAndTraining})=>({id,frameAndTraining})));
  // Start a second, genuinely fresh test campaign after the artificial census.
  await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded'});await ready();await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('EARN AND FIT');await page.locator('#btn-title-quick').click();
  // This path starts from an empty wallet: the pilot has already spent the 100-metal welcome credit (witness-rookie-supplies).
  await page.evaluate(()=>{hubs.metal=0;saveState.save();garage.closeMission();civilisations.goHome();worldMap.currentGridX=0;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.paused=true;contracts.state().active.forEach(c=>{c.n=100000;c.have=0;});});
  data.earn=await page.evaluate(()=>{const cash=hubs.metal;for(let i=0;i<6;i++){const e=new EnemyOrganism(1300,1300,{tier:1,archetype:'stalker'});e.hp=0;engine.enemies=[e];hunt.chain=0;hunt.lastKill=-1e9;engine.killEnemy(0);}return{before:cash,after:hubs.metal};});
  check('six fresh rookie kills earn exactly six metal without a grant',data.earn.before===0&&data.earn.after===6,data.earn);
  await page.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();});
  await page.locator('[data-station-service="upgrades"]').click();
  check('station progression door shows next fitting choices and the real hull bill',await page.locator('#progression-path').isVisible()&&await page.locator('[data-path-gear]').count()===3&&await page.evaluate(()=>(()=>{const m=upgradePath.milestone('destroyer');return m.total===modularShips.HULLS.destroyer.cost+modularShips.RANK_COST[0]&&m.remainingMetal===m.total-hubs.metal;})()));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{hangarUI.close();hangarUI.open('path');});
  const controls=await page.locator('#path-plan-frame,#path-training,[data-path-gear]').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return{height:r.height,top:r.top,bottom:r.bottom,width:r.width};}));
  check('phone progression choices and frame actions are visible with 44px targets',controls.length===5&&controls.every(r=>r.top>=0&&r.bottom<=844&&r.height>=44&&r.width>40)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),controls);
  await page.screenshot({path:`${dir}/progression-phone.png`});
  const moneyBefore=await page.evaluate(()=>hubs.metal);await page.locator('[data-path-gear="gun-bolt-point"]').click();
  check('a progression choice opens the native shop without spending',await page.locator('[data-hangar-item="gun-bolt-point"]').isVisible()&&await page.evaluate(()=>hubs.metal)===moneyBefore);
  await page.locator('[data-hangar-item="gun-bolt-point"]').click();await page.locator('#modular-apply').click();
  check('first earned fitting costs exactly six metal and reaches the flying ship',await page.evaluate(()=>hubs.metal===0&&equipmentCodex.owned('gear','gun-bolt-point')===1&&saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-bolt-point')&&engine.player.nodes.some(n=>n.weapon==='bolt-point')));
  data.reuse=await page.evaluate(()=>{const cash=hubs.metal,result=engine.applyDesign(saveState.doc.design);return{result,cashSame:hubs.metal===cash};});check('reusing owned hardware does not charge the new price again',data.reuse.result!==false&&data.reuse.cashSame);
  data.training=await page.evaluate(()=>{const R0=tuning.PRICE_CURVE.rankMetal[0],B0=tuning.PRICE_CURVE.rankBiomass[0];saveState.doc.metal=R0;progression.totalMass=B0-1;const lowMass=modularShips.train(),before=JSON.stringify([saveState.doc.modularHangar,hubs.metal]);progression.totalMass=B0;const set=Storage.prototype.setItem;let refused;try{Storage.prototype.setItem=()=>{throw new Error('Witness: training save refused');};refused=modularShips.train();}finally{Storage.prototype.setItem=set;}return{lowMass,refused,same:before===JSON.stringify([saveState.doc.modularHangar,hubs.metal])};});
  check('training enforces biomass and rolls back a refused save',!data.training.lowMass&&!data.training.refused&&data.training.same,data.training);
  await page.evaluate(()=>{modularYard.refresh();hangarUI.open('path');});await page.locator('#path-training').click();await page.locator('.hangar-picker-body').getByRole('button',{name:'Train rank 1 · '+await page.evaluate(()=>tuning.PRICE_CURVE.rankMetal[0])+' metal',exact:true}).click();
  check('native training spends the rank-1 price once and adds a real module slot',await page.evaluate(()=>hubs.metal===0&&modularShips.hangar().rank===1&&modularShips.quote(saveState.doc.design).capacity===7));
  await page.evaluate(()=>hangarUI.open('path'));const oldLayout=await page.evaluate(()=>JSON.stringify(saveState.doc.design.modular.sections)),oldGuns=await page.evaluate(()=>JSON.stringify(saveState.doc.design.modular.fittings));await page.locator('#path-plan-frame').click();
  check('planning the next frame (destroyer) keeps layout and fittings without changing the flying hull',await page.evaluate(({sections,fittings})=>shipyard.design.modular.hull==='destroyer'&&saveState.doc.design.modular.hull==='frigate'&&JSON.stringify(shipyard.design.modular.sections)===sections&&JSON.stringify(shipyard.design.modular.fittings)===fittings&&modularShips.quote(shipyard.design).total===modularShips.HULLS.destroyer.cost,{sections:oldLayout,fittings:oldGuns}));
  data.frameGates=await page.evaluate(()=>{const H=modularShips.HULLS.destroyer;saveState.doc.metal=H.cost;progression.totalMass=H.mass-1;const lowMass=engine.applyDesign(shipyard.design);progression.totalMass=H.mass;progression.saveProgress();const before=JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal]),set=Storage.prototype.setItem;let refused;try{Storage.prototype.setItem=()=>{throw new Error('Witness: frame save refused');};refused=engine.applyDesign(shipyard.design);}finally{Storage.prototype.setItem=set;}return{lowMass,refused,same:before===JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal])};});
  check('frame purchase enforces its milestone and preserves the old ship on save failure',data.frameGates.lowMass===false&&data.frameGates.refused===false&&data.frameGates.same,data.frameGates);
  await page.evaluate(()=>modularYard.refresh());await page.locator('#modular-apply').click();
  check('native Apply buys only the destroyer frame and retains both guns',await page.evaluate(()=>hubs.metal===0&&saveState.doc.design.modular.hull==='destroyer'&&engine.player.nodes.filter(n=>n.type==='cannon').length===2&&modularShips.hangar().owned['hull:destroyer']===1&&progression.totalMass===modularShips.HULLS.destroyer.mass));
  await page.evaluate(()=>{modularYard.close();saveState.save();});await page.reload({waitUntil:'domcontentloaded'});await ready();await page.locator('#btn-title-continue').click();await page.evaluate(()=>{garage.closeMission();engine.paused=false;hubs.openDock();bay.show();hangarUI.open('path');});
  const reloaded=await page.evaluate(()=>({hull:saveState.doc.design.modular.hull,rank:modularShips.hangar().rank,metal:hubs.metal,mass:progression.totalMass,bolt:equipmentCodex.owned('gear','gun-bolt-point'),training:upgradePath.milestone('battleship').training,expect:tuning.PRICE_CURVE.rankMetal.slice(1,modularShips.HULLS.battleship.rank).reduce((a,b)=>a+b,0)}));
  check('reloaded campaign keeps the purchased hull, biomass, rank, hardware and next milestone',reloaded.hull==='destroyer'&&reloaded.rank===1&&reloaded.metal===0&&reloaded.mass===150&&reloaded.bolt===1&&reloaded.training===reloaded.expect&&await page.locator('[data-path-hull="cruiser"]').isVisible(),reloaded);
  await page.setViewportSize({width:1214,height:800});await page.evaluate(()=>{hangarUI.close();hangarUI.open('path');});await page.screenshot({path:`${dir}/progression-desktop.png`});
  data.practice=await page.evaluate(()=>{hangarUI.close();modularYard.close();if(hubs.docked)hubs.closeDock();worldMap.currentGridX=1;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.paused=true;const cash=hubs.metal,mass=progression.totalMass;for(let i=0;i<10;i++)engine.killEnemy(0);return{metal:hubs.metal-cash,mass:progression.totalMass-mass,loot:progression.bubbleDrops.length};});
  check('training still pays only one metal per ten with no biomass or equipment',data.practice.metal===1&&data.practice.mass===0&&data.practice.loot===0,data.practice);
  check('late threat rewards distinguish ordinary, elite, outpost and boss',await page.evaluate(()=>{const b=hubs.bountyFor;return b({tier:7})===36&&b({tier:7,elite:true})===108&&b({tier:7,archetype:'outpost'})===360&&b({tier:7,isBoss:true})===1080&&b({tier:7,training:true})===0;}));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  if(process.env.STANDALONE_PATH){
   const manifest=JSON.parse(readFileSync('dist/release-candidate/build.json')),receipt=JSON.parse(readFileSync('shots/release-candidate/package.json'));
   check('candidate manifest hashes match all packaged files',Object.keys(manifest.files).length>600&&Object.entries(manifest.files).every(([p,h])=>hash(readFileSync('dist/release-candidate/'+p))===h),{files:Object.keys(manifest.files).length});
   check('versioned, generic and packaged HTML match the build receipt',hash(readFileSync(process.env.STANDALONE_PATH))===receipt.standalone_sha256&&hash(readFileSync('dist/black-current.html'))===receipt.standalone_sha256&&hash(readFileSync('dist/release-candidate/download/black-current.html'))===receipt.standalone_sha256&&manifest.release.version==='2.11.0-rc.2');
   const offline=await browser.newContext({viewport:{width:390,height:844}}),requests=[];await offline.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});const p=await offline.newPage();p.on('pageerror',e=>errors.push('offline: '+e.message));await p.goto(pathToFileURL(resolve(process.env.STANDALONE_PATH)).href,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.upgradePath?.ready);
   check('standalone boots the same progression and prices with networking blocked',await p.evaluate(()=>modularShips.HULLS.cruiser.cost===580&&modularShips.RANK_COST[0]===80&&modularShips.GEARS['gun-cannon-light'].cost===48)&&requests.every(u=>/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)),requests);await offline.close();
  }
  check('no application exceptions',errors.length===0,errors);
 }
}catch(e){errors.push(e.stack);if(!censusOnly){check('progression flow completed',false,e.message);await page.screenshot({path:dir+'/failure.png'}).catch(()=>{});data.failureText=await page.locator('#hangar-picker').textContent().catch(()=>null);}}
finally{await browser.close();if(!censusOnly){const report={checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors}));}if(errors.length||checks.some(c=>!c.ok))process.exitCode=1;}
