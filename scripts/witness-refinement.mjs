/* End-of-sprint checks for the actual touch help, shop and journal paths. */
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.env.PULSE_SERVER='unix:/nonexistent';
const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const out='shots/refinement';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[]};
const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);};
const browser=await firefox.launch();let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.stationGrid?.ready&&window.upgradePath?.ready);
 await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('REFINED FLIGHT');await page.locator('#btn-title-launch').click();
 await page.waitForTimeout(1800);
 check('launch help waits until the first workshop is finished',await page.evaluate(()=>starterJourney.active&&!document.querySelector('#first-tip.on')&&!saveState.doc.tips?.touchfly));
 await page.locator('#modular-close').click();await page.evaluate(()=>garage.closeMission());
 await page.locator('#first-tip.on').waitFor();
 check('coarse input gets touch help before a canvas touch',await page.locator('#first-tip-text').textContent().then(t=>t.includes('Left thumb')&&!t.includes('WASD')));
 const tip=await page.locator('#first-tip').boundingBox(),buttons=await page.locator('.mobile-action-bar button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
 check('flight help clears the touch action buttons',tip&&buttons.length>0&&buttons.every(b=>tip.x+tip.width<=b.x||b.x+b.width<=tip.x||tip.y+tip.height<=b.y||b.y+b.height<=tip.y),{tip,buttons});
 check('tip dismissal has a 44px touch target',await page.locator('#first-tip-dismiss').evaluate(e=>e.clientHeight>=44&&e.clientWidth>=44));await page.screenshot({path:out+'/flight-phone.png'});await page.locator('#first-tip-dismiss').tap();
 check('dismissing a tip does not start the movement joystick',await page.evaluate(()=>engine.touch.moveId===null&&!document.querySelector('#first-tip.on')));
 const research=await page.evaluate(()=>{const money=hubs.metal;return{blocked:pilotRpg.claim('research')===false,money:money===hubs.metal};});check('ordinary starting technology cannot claim the research milestone',research.blocked&&research.money,research);
 await page.evaluate(()=>{engine.paused=false;hubs.openDock();bay.show();});await page.locator('#modular-canvas [data-section=gun]').tap();await page.waitForFunction(()=>modularPhone.pane==='fit');
 await page.evaluate(()=>hangarUI.open('gear',true));
 check('the ordinary catalogue remains visible with an empty wallet',await page.locator('#hangar-picker [data-hangar-item]').count()>=15);
 await page.locator('#hangar-picker input[type=search]').fill('Pulse emitter');const before=await page.evaluate(()=>{hubs.metal=0;/* an empty wallet: the preview below must be unaffordable (new pilots now start with a welcome credit) */return{money:hubs.metal,design:JSON.stringify(saveState.doc.design)};});
 await page.locator('[data-hangar-inspect=gun-bolt-point]').click();
 check('inspection shows base stats, physical copies and the complete bill',await page.locator('.hz-equipment-stats').isVisible()&&await page.locator('.hz-copy-count').textContent().then(t=>t.includes('owned'))&&await page.locator('.hz-inspect-bill').textContent().then(t=>t.includes('6 metal')));
 check('inspecting equipment changes neither money nor the flying ship',await page.evaluate(s=>hubs.metal===s.money&&JSON.stringify(saveState.doc.design)===s.design,before));await page.screenshot({path:out+'/inspect-phone.png'});
 await page.locator('#hangar-inspect-fit').click();
 {const pv=await page.evaluate(s=>({draft:shipyard.design.modular.fittings.some(f=>f.gear==='gun-bolt-point'),flying:JSON.stringify(saveState.doc.design)===s.design,money:hubs.metal===s.money,applyDisabled:document.getElementById('modular-apply').disabled,metal:hubs.metal,apply:document.getElementById('modular-apply').textContent}),before);check('previewing unaffordable equipment changes only the draft',pv.draft&&pv.flying&&pv.money&&pv.applyDisabled,pv);}
 await page.evaluate(()=>{document.getElementById('modular-active').click();const d=modularShips.copy(shipyard.design),f=d.modular.fittings.find(f=>f.slot==='gun'),h=modularShips.hangar();f.mk=2;f.rotation=90;h.owned['gear:'+f.gear+':2']=1;saveState.doc.modularHangar=h;shipyard.design=modularShips.compile(d).design;modularYard.refresh();hangarUI.refresh();});
 await page.locator('#modular-canvas [data-section=gun]').tap();const gear=await page.evaluate(()=>shipyard.design.modular.fittings.find(f=>f.slot==='gun').gear);await page.locator('#hangar-right [data-hangar-item="'+gear+'"]').click();
 check('selecting the fitted gun retains its mark and facing',await page.evaluate(()=>{const f=shipyard.design.modular.fittings.find(f=>f.slot==='gun');return f.mk===2&&f.rotation===90;}));
 await page.evaluate(()=>{document.getElementById('modular-active').click();hangarUI.open('gear',true);});await page.locator('#hangar-picker input[type=search]').fill('Compact engine');
 check('global shopping checks the actual compatible engine slot',await page.locator('[data-hangar-item=engine]').textContent().then(t=>!t.includes('Needs a compatible slot')));await page.evaluate(()=>{hangarUI.close();modularYard.close();pilotRpg.openJournal();});
 check('journal opens one readable section instead of stacking jobs',await page.locator('#first-expedition-journal').isVisible()&&await page.locator('#qm-jobs').count()===0&&await page.evaluate(()=>{const v=[...document.querySelectorAll('[data-journal-view]')].map(b=>b.dataset.journalView);return ['main','commissions','milestones','contracts'].every(k=>v.includes(k))&&v.length===new Set(v).size;}));   // the four built-in tabs, plus one tab per registered section (Wingmen, Daily board)
 await page.screenshot({path:out+'/journal-phone.png'});await page.locator('[data-journal-view=commissions]').click();check('faction jobs remain reachable in the same journal',await page.locator('#qm-jobs').isVisible()&&await page.locator('#first-expedition-journal').count()===0);
 await page.locator('[data-journal-view=main]').click();await page.locator('#story-accept').click();await page.locator('#story-route').click();
 check('the main job plots the real recorder route and returns to flight',await page.evaluate(()=>saveState.doc.travelRoute?.id===saveState.doc.civHome&&saveState.doc.travelRoute.gx===1&&saveState.doc.travelRoute.x===firstExpedition.TARGET.x&&!engine.paused&&document.getElementById('captain-panel').style.display==='none'));
 for(const [width,height]of [[844,390],[1214,700]]){await page.setViewportSize({width,height});await page.evaluate(()=>{engine.paused=true;bay.show();hangarUI.open('gear',true);});await page.locator('#hangar-picker input[type=search]').fill('Pulse emitter');await page.locator('[data-hangar-inspect=gun-bolt-point]').click();check(width+'px inspection keeps the modal on screen',await page.locator('#hangar-picker').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1;}));await page.screenshot({path:out+'/inspect-'+width+'.png'});await page.evaluate(()=>{hangarUI.close();modularYard.close();});}
 check('no browser exceptions',!report.errors.length,report.errors);
}catch(e){report.errors.push(e.stack);check('refinement playthrough completed',false,e.message);if(page)await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;report.hashes=Object.fromEntries(['js/menu.js','js/hangar-ui.js','js/pilot.js','js/quartermaster.js','js/first-expedition.js'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(s=>s.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
