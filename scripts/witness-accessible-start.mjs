/* A fresh pilot's actual build / launch / loot / field-refit path. */
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/accessible-start';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[]};
function check(name,ok,detail){report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':': '+JSON.stringify(detail)));}
const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();let page;
const ready=p=>p.waitForFunction(()=>window.stationGrid?.ready&&window.starterJourney?.ready);
const tap=async(p,s)=>p.locator(s).click();
async function start(p,quick=false){await p.goto(url);await ready(p);await tap(p,'#btn-menu-new');await p.evaluate(()=>civilisations.choose('savanah'));await p.locator('#title-callsign').fill('FIRST FORGE');await tap(p,quick?'#btn-title-quick':'#btn-title-launch');}
async function part(p,kind,port){if(await p.evaluate(()=>document.documentElement.classList.contains('mobile-layout')))await tap(p,'#modular-phone-nav [data-pane=parts]');await tap(p,'[data-hangar-part='+kind+']');await tap(p,'#modular-canvas [data-port="'+port+'"]');}
async function fit(p,x,y,gear){const id=await p.evaluate(([x,y])=>shipyard.design.modular.sections.find(s=>s.x===x&&s.y===y).id,[x,y]);await tap(p,'#modular-canvas [data-section="'+id+'"]');await tap(p,'#hangar-right [data-hangar-item="'+gear+'"]');}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));
 await start(page);
 check('Build my ship opens a paused starter workshop at the home dock',await page.evaluate(()=>starterJourney.active&&engine.paused&&!!hubs.docked&&!document.getElementById('modular-yard').hidden));
 check('the first build starts with a core and supplies two guns',await page.evaluate(()=>shipyard.design.modular.sections.length===1&&modularShips.hangar().owned['gear:gun-repeater-point:1']===2));
 check('starter hull palette contains supplied parts, not advanced locked parts',await page.locator('[data-hangar-part]').count()===4&&await page.locator('[data-hangar-part=heavy]').count()===0);
 check('an unarmed starter offers a free fitting step before launch',await page.locator('#modular-apply').isEnabled()&&await page.locator('#modular-apply').textContent().then(t=>t.includes('Add & fit first gun')));
 await page.screenshot({path:out+'/starter-core-phone.png'});
 await part(page,'novice','1,0');await page.reload();await ready(page);await tap(page,'#btn-title-continue');await page.waitForFunction(()=>starterJourney.active);check('unfinished construction resumes after reload without duplicating its kit',await page.evaluate(()=>shipyard.design.modular.sections.length===2&&modularShips.hangar().owned['gear:gun-repeater-point:1']===2));await part(page,'novice','0,1');await part(page,'drive','-1,0');
 await fit(page,1,0,'gun-repeater-point');await fit(page,0,1,'gun-repeater-point');await fit(page,-1,0,'engine');
 check('real touch construction uses supplied hardware with a zero bill',await page.evaluate(()=>modularShips.quote(shipyard.design).total===0&&!starterJourney.blocker(shipyard.design)));
 await page.screenshot({path:out+'/starter-built-phone.png'});
 const cash=await page.evaluate(()=>hubs.metal);await tap(page,'#modular-apply');
 check('launch flies the player-authored four-section ship with exactly two guns',await page.evaluate(()=>!starterJourney.active&&saveState.doc.design.modular.sections.length===4&&engine.player.nodes.filter(n=>n.type==='cannon').length===2&&!hubs.docked));
 check('starter construction grants no money and charges no fabrication',await page.evaluate(c=>hubs.metal===c,cash));
 await page.evaluate(()=>{engine.paused=true;progression.totalMass=123;saveState.doc.totalMass=123;resourceWallet.open();resourceWallet.close();});
 check('Metal and Biomass are both visible on the main phone HUD',await page.locator('#wallet-metal-value').isVisible()&&await page.locator('#wallet-mass-value').isVisible()&&await page.locator('#wallet-mass-value').textContent()==='123');
 const counters=await page.locator('#wallet-button').boundingBox();check('both resource balances fit inside the phone screen',counters&&counters.x>=0&&counters.x+counters.width<=390,counters);await page.screenshot({path:out+'/hud-balances-phone.png'});
 await page.setViewportSize({width:1214,height:700});await page.waitForTimeout(200);check('Metal and Biomass remain visible on desktop',await page.locator('#wallet-metal-value').isVisible()&&await page.locator('#wallet-mass-value').isVisible());await page.screenshot({path:out+'/hud-balances-desktop.png'});await page.setViewportSize({width:390,height:844});
 const layout=await page.evaluate(()=>JSON.stringify(saveState.doc.design.modular));await page.reload();await ready(page);await tap(page,'#btn-title-continue');await page.evaluate(()=>{garage.closeMission();engine.paused=true;});
 check('Continue keeps the custom first ship and does not reopen the workshop',await page.evaluate(s=>JSON.stringify(saveState.doc.design.modular)===s&&!starterJourney.active,layout));
 check('every civilisation premade has two guns and obeys the four-gun cap',await page.evaluate(()=>Object.keys(noviceFleet.ROWS).every(id=>{const d=noviceFleet.create(id);return d.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon).length===2&&!modularShips.check(d);} )));
 check('a fifth gun is rejected even when power and module capacity allow it',await page.evaluate(()=>{const d=noviceFleet.create('savanah');for(const id of ['utility','star']){d.modular.sections.find(s=>s.id===id).kind='deck';d.modular.fittings.push({slot:id,gear:'gun-spitter',mk:1});}d.modular.sections.push({id:'extra',kind:'deck',x:0,y:1});d.modular.fittings.push({slot:'extra',gear:'gun-spitter',mk:1});return /at most 4/.test(modularShips.check(d));}));
 check('ordinary guns in every family need no research payment',await page.evaluate(()=>['spitter','needler','burst','seeker-point','mortar-point','driver-medium','howitzer'].every(id=>armory.owns(id))));
 check('starter size, power and cheap structure allow a four-gun build path',await page.evaluate(()=>modularShips.HULLS.frigate.sections===10&&modularShips.HULLS.frigate.power===12&&modularShips.SECTIONS.deck.cost===12&&modularShips.GEARS.shield.cost===24));
 check('fifteen ordinary novice weapons cost 4 to 16 metal with no research fee',await page.evaluate(()=>{const guns=Object.values(modularShips.GEARS).filter(g=>g.weapon&&g.cls==='POINT'&&!upgradePath.needsResearch(g.weapon));return guns.length===15&&Math.min(...guns.map(g=>g.cost))===4&&Math.max(...guns.map(g=>g.cost))===16;}));
 check('special and capital discoveries retain their research requirement',await page.evaluate(()=>!armory.owns('flechette')&&!armory.owns('capitalrail')));
 await page.evaluate(()=>{recoveredFittings.grant({type:'cannon',weapon:'spitter',radius:12});worldMap.currentGridX=2;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.player.x=engine.player.y=2000;engine.player.hp=37;engine.player.shieldHp=0;engine.player.iFrames=7;engine.paused=true;bay.show();});
 await fit(page,1,0,'gun-spitter');
 const fieldStatus=await page.evaluate(()=>({docked:!!hubs.docked,near:!!hubs.dockNear(),disabled:document.getElementById('modular-apply').disabled,why:modularShips.fieldReason(shipyard.design)}));check('owned recovered hardware can be applied away from every station',!fieldStatus.docked&&!fieldStatus.near&&!fieldStatus.disabled,fieldStatus);
 const before=await page.evaluate(()=>{window.__journeySave=saveState.save;const s={design:JSON.stringify(saveState.doc.design),metal:hubs.metal,hp:engine.player.hp};saveState.save=()=>false;return s;});await tap(page,'#modular-apply');
 check('failed field persistence keeps the flying design, wallet and damage',await page.evaluate(s=>JSON.stringify(saveState.doc.design)===s.design&&hubs.metal===s.metal&&engine.player.hp===s.hp,before));
 await page.evaluate(()=>saveState.save=window.__journeySave);await tap(page,'#modular-apply');
 check('successful field fitting installs the recovered gun without spending',await page.evaluate(s=>saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-spitter')&&hubs.metal===s.metal,before));
 check('field refitting grants no hull heal, shield refill or invulnerability',await page.evaluate(()=>engine.player.hp===37&&engine.player.shieldHp===0&&engine.player.iFrames===7));
 check('unowned hardware cannot be fabricated in space',await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(saveState.doc.design));d.modular.fittings[0].gear='gun-bolt-point';const before=hubs.metal;return engine.applyDesign(d)===false&&hubs.metal===before;}));
 check('structural rebuilding still requires a station',await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(saveState.doc.design));for(const s of d.modular.sections)s.x=-s.x;return /Dock to rebuild/.test(modularShips.fieldReason(d));}));
 check('vows have no popup, menu door or hidden modifiers',await page.evaluate(()=>vows.retired&&vows.scale('hull')===1&&vows.open()===false&&!document.getElementById('vow-panel')&&!document.getElementById('dock-vow')));
 await tap(page,'#modular-close');await page.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();});
 check('docking presents eight native service tiles and collapsed station details',await page.locator('#station-services [data-station-service]').count()===8&&await page.evaluate(()=>!document.getElementById('station-details').open));
 const boxes=await page.locator('#station-services button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height};}));
 check('phone station grid uses two columns and touch-sized tiles',boxes[0].top===boxes[1].top&&boxes[2].top>boxes[0].top&&boxes.every(b=>b.left>=0&&b.right<=390&&b.height>=44),boxes);
 await page.waitForTimeout(300);await page.screenshot({path:out+'/station-phone.png'});await page.setViewportSize({width:1214,height:700});await page.waitForTimeout(200);await page.screenshot({path:out+'/station-desktop.png'});
 await page.evaluate(()=>hubs.metal=500);await tap(page,'[data-station-service=equipment]');await page.locator('#hangar-picker input[type=search]').fill('Pulse emitter');await tap(page,'#hangar-picker [data-hangar-item=gun-bolt-point]');
 const bill=await page.evaluate(()=>modularShips.quote(shipyard.design).total);await tap(page,'#modular-apply');
 check('ordinary hardware has one fabrication price and no research payment',bill===6&&await page.evaluate(()=>hubs.metal===494&&!armory.doc().licenses.includes('bolt-point')));
 await tap(page,'#modular-apply');check('reapplying owned hardware charges nothing',await page.evaluate(()=>hubs.metal===494));await tap(page,'#modular-close');
 await tap(page,'[data-station-service=missions]');check('the actual Missions tile opens the current journal',await page.evaluate(()=>document.getElementById('captain-panel').style.display==='flex'));
 await page.evaluate(()=>{pilotRpg.close();const d=firstExpedition.state();d.stage='return';d.guards=[true,true];});
 const reward=await page.evaluate(()=>{const count=modularShips.hangar().owned['gear:gun-burst:1']||0,old=saveState.save;saveState.save=()=>false;const failed=firstExpedition.chooseReward('burst');saveState.save=old;const rolledBack=(modularShips.hangar().owned['gear:gun-burst:1']||0)===count;const paid=firstExpedition.chooseReward('burst');return{failed,rolledBack,paid,count:modularShips.hangar().owned['gear:gun-burst:1']-count,again:firstExpedition.chooseReward('burst')};});
 check('first-job hardware reward rolls back on failure and grants exactly once',!reward.failed&&reward.rolledBack&&reward.paid&&reward.count===1&&!reward.again,reward);
 await page.reload();await ready(page);await tap(page,'#btn-title-continue');await page.evaluate(()=>{garage.closeMission();engine.paused=true;});
 check('purchased fitting and mission hardware survive a real reload',await page.evaluate(()=>saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-bolt-point')&&(modularShips.hangar().owned['gear:gun-burst:1']||0)===1));
 await context.close();
 const quickContext=await browser.newContext({viewport:{width:1214,height:700}});page=await quickContext.newPage();page.on('pageerror',e=>report.errors.push(e.message));await start(page,true);
 check('quick launch skips construction and flies a two-gun premade',await page.evaluate(()=>saveState.doc.launched&&!starterJourney.active&&saveState.doc.design.modular.sections.length===6&&engine.player.nodes.filter(n=>n.type==='cannon').length===2));
 await page.evaluate(()=>{const d=noviceFleet.create('savanah');d.modular.fittings=d.modular.fittings.filter(f=>f.slot!=='port');d.modular.sections.find(s=>s.id==='port').kind='spine';saveState.doc.design=modularShips.compile(d).design;saveState.doc.starterFleetVersion=1;saveState.doc.modularHangar.owned['section:deck']=1;saveState.doc.modularHangar.owned['gear:gun-repeater-point:1']=1;saveState.save();});await page.reload();await ready(page);
 check('older one-gun novices get a second kit without replacing their ship',await page.evaluate(()=>saveState.doc.starterFleetVersion===2&&saveState.doc.design.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon).length===1&&modularShips.hangar().owned['section:deck']===2&&modularShips.hangar().owned['gear:gun-repeater-point:1']===2));
 const standalone=await quickContext.newPage();await standalone.goto(new URL('dist/black-current.html',url).href);await ready(standalone);check('standalone contains the same first-ship, station and research policy',await standalone.evaluate(()=>starterJourney.ready&&stationGrid.ready&&upgradePath.needsResearch('capitalrail')&&!upgradePath.needsResearch('spitter')));await standalone.close();await quickContext.close();
 check('no browser application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('new-pilot journey completed',false,e.message);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(s=>s.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
