import {firefox} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/menu-forge';mkdirSync(out,{recursive:true});const report={checks:[],errors:[]};
const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});if(!ok)console.log('FAIL '+name+' '+JSON.stringify(data));};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
const url=process.argv[2]||'http://127.0.0.1:8811/black-current/';
async function boot(page){await page.goto(url);await page.waitForFunction(()=>window.combatFeel?.ready&&window.stationGrid?.ready&&window.upgradePath?.ready);await page.locator('#btn-menu-new').tap();await page.locator('#title-callsign').fill('MENU FORGE');await page.locator('#btn-title-quick').tap();await page.evaluate(()=>{garage.closeMission();civilisations.goHome();engine.paused=false;hubs.openDock();});}
async function dock(){await p.evaluate(()=>{hangarUI.close();pilotRpg.close();loot.close();equipmentCodex.close();modularYard.close();bay.close();civilisations.goHome();engine.paused=false;hubs.openDock();});}
try{
 await boot(p);
 check('station renders eight native service tiles and collapsed cargo details',await p.locator('#station-services button').count()===8&&await p.evaluate(()=>!document.getElementById('station-details').open));
 check('station wallet shows both real balances and removes legacy part-count text',await p.evaluate(()=>{const t=document.getElementById('dock-metal').textContent;return t.includes(String(hubs.metal))&&t.includes('Metal')&&t.includes(String(Math.floor(progression.totalMass)))&&t.includes('Biomass')&&!t.includes('recovered parts');}));
 check('station displays the flying modular ship and its native power/slot figures',await p.locator('.station-ship-art canvas').isVisible()&&await p.evaluate(()=>{const q=modularShips.quote(saveState.doc.design),s=document.querySelector('.station-ship-stats').textContent;return s.includes(q.modules+' / '+q.capacity)&&s.includes(q.power+' / '+q.hull.power);}));
 await p.screenshot({path:out+'/station-desktop.png'});
 await p.setViewportSize({width:390,height:844});
 const boxes=await p.locator('#station-services button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,right:r.right,y:r.y,h:r.height};}));
 check('phone station tiles use two columns with touch targets inside the screen',boxes[0].y===boxes[1].y&&boxes[2].y>boxes[0].y&&boxes.every(r=>r.x>=0&&r.right<=390&&r.h>=44),boxes);
 check('all eight phone services and Launch are reachable without scrolling',await p.evaluate(()=>[...document.querySelectorAll('#station-services button,#dock-undock')].every(b=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&(e===b||b.contains(e));})));
 check('phone flying-ship image stays beside its readable capacity figures',await p.evaluate(()=>{const a=document.querySelector('.station-ship-art canvas').getBoundingClientRect(),b=document.querySelector('.station-ship-info').getBoundingClientRect();return a.right<=b.left&&a.width>0&&b.width>0;}));
 await p.screenshot({path:out+'/station-phone.png'});
 await p.locator('[data-station-service=captain]').tap();
 check('Captain service opens Build with actual flying-ship art',await p.locator('#captain-panel').isVisible()&&await p.locator('.captain-identity canvas').isVisible()&&await p.locator('[data-captain-tab=build]').getAttribute('aria-pressed')==='true');
 await p.screenshot({path:out+'/captain-phone.png'});await p.locator('[data-captain-tab=training]').tap();
 const cards=await p.locator('[data-trait]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,right:r.right};}));
 check('phone training presents six pictured perks in two columns',cards.length===6&&cards[0].y===cards[1].y&&cards[2].y>cards[0].y&&cards.every(r=>r.x>=0&&r.right<=390)&&await p.locator('.captain-trait-mark svg').count()===6,cards);
 check('locked training explains the level requirement and cannot charge the player',await p.evaluate(()=>{const cash=hubs.metal;return /level 2/.test(document.querySelector('[data-trait=battery] .captain-requirement').textContent)&&pilotRpg.train('battery')===false&&hubs.metal===cash;}));
 await p.screenshot({path:out+'/training-phone.png'});
 await p.evaluate(()=>{progression.totalMass=100;hubs.metal=200;pilotRpg.refresh();});const before=await p.evaluate(()=>hubs.metal);
 await p.locator('[data-trait=battery] [data-action=train]').tap();
 check('real training button purchases one rank for exactly80 metal',await p.evaluate(before=>pilotRpg.doc().trained.battery===1&&hubs.metal===before-80,before));
 const failedBefore=await p.evaluate(()=>{window.__menuSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('Witness refused training save');};return JSON.stringify([saveState.doc.pilot,hubs.metal]);});
 await p.locator('[data-trait=reach] [data-action=train]').tap();
 check('refused native training save restores ranks and wallet',await p.evaluate(before=>JSON.stringify([saveState.doc.pilot,hubs.metal])===before,failedBefore));await p.evaluate(()=>Storage.prototype.setItem=window.__menuSet);
 await p.locator('#captain-close').tap();check('Captain Close returns to the paused station',await p.evaluate(()=>document.getElementById('dock-panel').style.display==='flex'&&engine.paused));
 await p.locator('[data-station-service=equipment]').tap();
 check('Equipment service reaches the real fitting catalogue and size filters',await p.locator('#hangar-picker').evaluate(e=>e.open)&&await p.locator('#hangar-picker input[type=search]').isVisible()&&await p.locator('#hangar-picker [data-hangar-item]').count()>0);
 await p.screenshot({path:out+'/equipment-phone.png'});await dock();await p.locator('[data-station-service=stock]').tap();
 check('home Station specials explains the rookie anchorage and outer-system stock',await p.locator('#hangar-picker').evaluate(e=>e.open)&&await p.locator('.qm-stock').textContent().then(t=>t.includes('rookie anchorage')));await dock();await p.locator('[data-station-service=upgrades]').tap();
 check('My progression reaches native mount and frame requirements',await p.locator('#progression-path').isVisible()&&await p.locator('#path-light-mount').isVisible());await dock();await p.locator('[data-station-service=missions]').tap();
 check('Jobs service opens the real journal and faction commission tab',await p.locator('[data-journal-view=commissions]').isVisible());await p.locator('[data-journal-view=commissions]').tap();check('faction jobs remain real native commission cards',await p.locator('[data-qm-job]').count()===5);
 await dock();await p.locator('[data-station-service=hold]').tap();check('Hold service opens the native salvage inventory',await p.locator('#salvage-panel').isVisible());await dock();await p.locator('[data-station-service=codex]').tap();check('Codex service opens the real equipment registry',await p.locator('#equipment-codex').evaluate(e=>e.open)&&await p.locator('[data-codex-item]').count()>0);
 await dock();await p.locator('[data-station-service=fitting]').tap();check('Fitting service opens the modular workshop',await p.locator('#modular-yard').isVisible());await dock();await p.locator('#station-training').tap();check('Training range plots the native practice route and undocks',await p.evaluate(()=>saveState.doc.travelRoute?.kind==='training'&&saveState.doc.travelRoute.id===(saveState.doc.civHome||'home')&&!hubs.docked&&!engine.paused));
 await dock();await p.locator('#dock-undock').tap();check('Launch returns to live flight without a stuck station overlay',await p.evaluate(()=>!hubs.docked&&!engine.paused&&document.getElementById('dock-panel').style.display==='none'));
 await dock();await p.setViewportSize({width:844,height:390});
 check('landscape Launch stays visible and tappable',await p.locator('#dock-undock').evaluate(b=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.bottom<=innerHeight&&r.height>=44&&(e===b||b.contains(e));}));await p.screenshot({path:out+'/station-landscape.png'});
 await p.setViewportSize({width:1214,height:800});await p.locator('[data-station-service=captain]').tap();await p.screenshot({path:out+'/captain-desktop.png'});
 const control=await context.newPage();control.setDefaultTimeout(15000);await control.route('**/css/service-menus.css*',r=>r.fulfill({contentType:'text/css',body:readFileSync('css/service-menus.css','utf8')+'\n.station-ship-art{display:none!important}'}));await boot(control);
 check('known broken stylesheet response fails the same visible ship-art condition',!await control.locator('.station-ship-art canvas').isVisible());await control.close();
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('service menu witness completed',false,e.message);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,count:report.checks.length,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length||report.checks.length!==25)process.exitCode=1;
