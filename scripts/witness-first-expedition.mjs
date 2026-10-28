/* Real dialogue/interaction buttons with seeded travel and combat state; isolated saves. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const {firefox}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const out='shots/first-expedition';mkdirSync(out,{recursive:true});const report={checks:[],errors:[]};
const check=(name,ok,detail=null)=>{report.checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok?'':': '+JSON.stringify(detail)}`);};
const url=process.env.GAME_URL||'http://127.0.0.1:8811/',browser=await firefox.launch();
let context,page;
async function fresh(width=390,height=844,path=url){
 context=await browser.newContext({viewport:{width,height},hasTouch:true});
 await context.route('**/*',r=>r.request().url().startsWith(new URL(url).origin)?r.continue():r.abort());page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(path);await page.waitForFunction(()=>window.firstExpedition?.ready&&window.pilotRpg?.ready);return page;
}
async function tap(selector){await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).tap();await page.waitForTimeout(100);}
async function homeDock(returning=false){await page.evaluate(returning=>{document.getElementById('title-callsign').value='RECORDER';garage.launch(returning);garage.closeMission();galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.player.x=40;engine.player.y=0;engine.paused=false;engine.enemies=[];hubs.openDock();},returning);}
async function target(){await page.evaluate(()=>{engine.mapOpen=false;document.getElementById('map-overlay').style.display='none';engine.paused=false;worldMap.currentGridX=1;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.paused=true;});}
try{
 await fresh();
 check('new saves start with an optional offer, not an awarded reward',await page.evaluate(()=>firstExpedition.state().stage==='offer'&&!firstExpedition.carrying&&firstExpedition.state().reward===null));
 check('acceptance is rejected away from the home dock',await page.evaluate(()=>!firstExpedition.accept()));
 await homeDock();await tap('#dock-story-talk');
 check('native dock contact opens authored dialogue in the journal',await page.locator('#captain-panel').isVisible()&&await page.locator('#first-expedition-journal').textContent().then(t=>t.includes('Dockkeeper')&&t.includes('scavengers')));
 await tap('#story-ask-pay');check('dialogue explains the two rewards and duplicate compensation',await page.locator('#first-expedition-journal').textContent().then(t=>t.includes('40 metal')&&t.includes('Drone operator')));
 const failAccept=await page.evaluate(()=>{const save=saveState.save;saveState.save=()=>false;const accepted=firstExpedition.accept();saveState.save=save;return !accepted&&firstExpedition.state().stage==='offer';});
 check('failed storage leaves the job unaccepted',failAccept);
 await tap('#story-accept');check('native acceptance records the recovery stage',await page.evaluate(()=>firstExpedition.state().stage==='recover'));
 await tap('#story-show-chart');await page.waitForTimeout(100);
 check('chart marks the actual destination sector',await page.locator('.story-target .sec-coords').textContent()==='1,0'&&await page.locator('.story-star').count()===1);
 await tap('#chart-tab-galaxy');await page.locator('#chart-tabs button:not(#chart-tab-galaxy)').tap();await page.waitForTimeout(100);
 check('quest marker survives switching chart views',await page.locator('.story-target .sec-coords').textContent()==='1,0');
 await page.screenshot({path:out+'/chart-portrait.png'});await tap('#btn-close-map');await target();
 const guards=await page.evaluate(()=>engine.enemies.filter(e=>e.firstExpeditionGuard===0||e.firstExpeditionGuard===1).map(e=>({id:e.firstExpeditionGuard,role:e.archetype})));
 check('the target sector contains exactly two distinct quest guards',guards.length===2&&new Set(guards.map(g=>g.id)).size===2,guards);
 check('guarded recorder cannot be recovered early',await page.evaluate(()=>{engine.player.x=520;engine.player.y=-240;engine.paused=false;const rejected=!firstExpedition.recover();engine.paused=true;return rejected;}));
 await page.evaluate(()=>{const i=engine.enemies.findIndex(e=>e.firstExpeditionGuard===0);engine.enemies[i].hp=0;engine.killEnemy(i);});
 check('real enemy death records one guard defeat',await page.evaluate(()=>firstExpedition.state().guards[0]&&!firstExpedition.state().guards[1]));
 await page.reload();await page.waitForFunction(()=>firstExpedition.ready);check('guard progress survives reload',await page.evaluate(()=>firstExpedition.state().guards[0]&&!firstExpedition.state().guards[1]));
 await page.evaluate(()=>{garage.launch(true);garage.closeMission();});await target();
 const remaining=await page.evaluate(()=>engine.enemies.filter(e=>e.firstExpeditionGuard===0||e.firstExpeditionGuard===1).map(e=>e.firstExpeditionGuard));
 check('defeated guards do not respawn',remaining.length===1&&remaining[0]===1,remaining);
 await page.evaluate(()=>{const i=engine.enemies.findIndex(e=>e.firstExpeditionGuard===1);engine.enemies[i].hp=0;engine.killEnemy(i);engine.enemies=[];engine.projectiles=[];worldMap.getCurrentChamber().isCleared=true;engine.player.x=520;engine.player.y=-240;engine.player.iFrames=9999;engine.camera.x=520-innerWidth/(2*engine.camera.zoom);engine.camera.y=-240-innerHeight/(2*engine.camera.zoom);engine.paused=false;for(let i=0;i<3;i++)engine.update(1000/60);});
 check('clear recorder exposes a native touch interaction',await page.locator('#story-action').isVisible()&&!await page.locator('#story-action').isDisabled());
 check('the nearby generic encounter prompt yields to the story action',!await page.locator('#expedition-action').isVisible());await page.screenshot({path:out+'/recorder-world.png'});
 await tap('#story-action');check('recovery creates persistent cargo and a return objective',await page.evaluate(()=>firstExpedition.carrying&&firstExpedition.state().stage==='return'));
 check('recorder recovery cannot repeat',await page.evaluate(()=>!firstExpedition.recover()));
 await tap('#btn-phone-hold');check('the hold shows mission cargo without a sell action',await page.locator('#salvage-list .story-cargo').count()===1&&await page.locator('#salvage-list .story-cargo button').count()===0);await page.screenshot({path:out+'/cargo-hold.png'});await tap('#salvage-close');
 check('reward cannot be claimed in the field',await page.evaluate(()=>!firstExpedition.chooseReward('burst')));
 await page.reload();await page.waitForFunction(()=>firstExpedition.ready);check('cargo and return objective survive a complete reload',await page.evaluate(()=>firstExpedition.carrying&&firstExpedition.state().stage==='return'));
 await homeDock(true);await tap('#dock-story-talk');
 const rollback=await page.evaluate(()=>{const cash=hubs.metal,owned=armory.owns('burst'),save=saveState.save;saveState.save=()=>false;const result=firstExpedition.chooseReward('burst');saveState.save=save;return !result&&firstExpedition.state().stage==='return'&&hubs.metal===cash&&armory.owns('burst')===owned;});
 check('failed reward storage rolls back the quest and the grant',rollback);
 await tap('#story-reward-burst');check('native reward choice unlocks pulse technology and completes the quest',await page.evaluate(()=>firstExpedition.state().stage==='done'&&firstExpedition.state().reward==='burst'&&armory.owns('burst')&&!firstExpedition.carrying));
 check('reward completion cannot be replayed for money',await page.evaluate(()=>{const cash=hubs.metal;return !firstExpedition.chooseReward('burst')&&hubs.metal===cash;}));
 check('completed quest tracker steps out of Jobs',await page.locator('#story-contract').getAttribute('hidden')!==null);await page.screenshot({path:out+'/reward-portrait.png'});
 await page.reload();await page.waitForFunction(()=>firstExpedition.ready);check('chosen reward and completed state survive reload',await page.evaluate(()=>firstExpedition.state().stage==='done'&&firstExpedition.state().reward==='burst'&&armory.owns('burst')));
 await context.close();
 await fresh(844,390);
 await page.evaluate(()=>{document.getElementById('title-callsign').value='SUPPORT';garage.launch(false);garage.closeMission();saveState.doc.firstExpedition={v:1,stage:'return',guards:[true,true],reward:null};saveState.doc.metal=123;saveState.save();});
 await homeDock(true);await tap('#dock-story-talk');
 check('landscape dialogue shows both reward choices',await page.locator('#story-reward-burst').isVisible()&&await page.locator('#story-reward-support').isVisible());
 await tap('#story-reward-support');const support=await page.evaluate(()=>({done:firstExpedition.state().stage,rank:pilotRpg.doc().trained.support,active:pilotRpg.doc().active.includes('support'),cash:hubs.metal,heal:roles.CFG.menderHeal}));
 check('support reward teaches and equips the captain perk without charging metal',support.done==='done'&&support.rank===1&&support.active&&support.cash===123&&support.heal>45,support);
 await page.screenshot({path:out+'/reward-landscape.png'});await context.close();
 await fresh();await page.evaluate(()=>{document.getElementById('title-callsign').value='RETURNER';garage.launch(false);garage.closeMission();saveState.doc.firstExpedition={v:1,stage:'return',guards:[true,true],reward:null};armory.doc().licenses.push('burst');saveState.doc.metal=123;saveState.save();});
 await homeDock(true);await tap('#dock-story-talk');await tap('#story-reward-burst');
 check('an already-owned reward pays exactly 40 metal once',await page.evaluate(()=>hubs.metal===163&&!firstExpedition.chooseReward('burst')&&hubs.metal===163));
 const defect=await page.addStyleTag({content:'#first-expedition-journal{display:none!important}'});check('dialogue visibility gate catches a planted hidden panel',!await page.locator('#first-expedition-journal').isVisible());await defect.evaluate(e=>e.remove());await context.close();
 await fresh(390,844,new URL('dist/black-current.html',url).href);check('rebuilt standalone installs the story and journal integration',await page.evaluate(()=>firstExpedition.ready&&firstExpedition.state().stage==='offer'));await context.close();
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(error){check('story witness completed',false,String(error));await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(`${report.passed}/${report.checks.length} passed`);if(report.failed)process.exitCode=1;
