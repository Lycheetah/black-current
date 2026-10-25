/* Touch editing, panel geometry, real fabrication and cancellable navigation. */
import {firefox} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/phone-fitting';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],layouts:[]};
function check(name,ok,detail){report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':': '+JSON.stringify(detail)));}
const separate=(a,b)=>a.bottom<=b.top+1||b.bottom<=a.top+1||a.right<=b.left+1||b.right<=a.left+1;
check('overlap control rejects a canvas covered by a footer',!separate({top:0,bottom:200,left:0,right:300},{top:150,bottom:240,left:0,right:300}));
const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(10000);
const ready=()=>page.waitForFunction(()=>window.modularPhone?.ready&&window.navigationHud?.ready&&window.noviceFleet?.ready);
const tap=async s=>{await page.locator(s).scrollIntoViewIfNeeded();await page.locator(s).tap();};
const pane=async name=>{await tap(`#modular-phone-nav [data-pane="${name}"]`);await page.waitForFunction(n=>modularPhone.pane===n,name);await page.waitForTimeout(90);};
const actions=async()=>{if(!await page.locator('#modular-phone-actions').evaluate(e=>e.open))await tap('#modular-phone-actions summary');};
const layout=()=>page.evaluate(()=>{
 const $=s=>document.querySelector(s),box=s=>{const r=$(s).getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
 const shown=s=>getComputedStyle($(s)).display!=='none',hit=s=>{const e=$(s),r=e.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return t===e||e.contains(t);};
 return{width:innerWidth,height:innerHeight,canvas:box('#modular-stage'),footer:box('.modular-shell footer'),header:box('.modular-top'),nav:box('#modular-phone-nav'),close:box('#modular-close'),apply:box('#modular-apply'),tabs:[...$('#modular-phone-nav').children].map(b=>({height:b.getBoundingClientRect().height,hit:hit(`[data-pane="${b.dataset.pane}"]`)})),shown:{ship:shown('.modular-preview'),rail:shown('.modular-rail'),fit:shown('.modular-inspector')},closeHit:hit('#modular-close'),applyHit:hit('#modular-apply'),overflow:document.documentElement.scrollWidth>innerWidth};
});
async function checkShip(v){
 await page.setViewportSize(v);await pane('ship');const l=await layout();report.layouts.push(l);
 check(v.width+'px ship canvas clears the header, navigation and footer',l.canvas.height>=100&&separate(l.canvas,l.footer)&&separate(l.canvas,l.header)&&separate(l.canvas,l.nav),l);
 check(v.width+'px has one pane and reachable 44px navigation/actions',l.shown.ship&&!l.shown.rail&&!l.shown.fit&&!l.overflow&&l.closeHit&&l.applyHit&&l.close.height>=44&&l.apply.height>=44&&l.tabs.every(t=>t.height>=44&&t.hit),l);
 await page.screenshot({path:`${out}/ship-${v.width}.png`});
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready();
 await tap('#btn-menu-new');await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('PHONE FORGE');await tap('#btn-title-launch');await page.evaluate(()=>garage.closeMission());
 await page.evaluate(()=>{hubs.metal=1000;engine.player.x=0;engine.player.y=260;engine.player.vx=engine.player.vy=0;saveState.save();});
 await tap('#btn-touch-designer');await page.waitForFunction(()=>!document.getElementById('modular-yard').hidden);
 check('actual phone Shipyard door opens the modular current ship',await page.evaluate(()=>modularPhone.pane==='ship'&&shipyard.design.frame===saveState.doc.design.frame&&shipyard.design.modular.civ==='savanah'&&getComputedStyle(shipyard.el).display==='none'));
 await checkShip({width:390,height:844});
 const mutationCount=await page.evaluate(()=>new Promise(resolve=>{let n=0;const o=new MutationObserver(m=>n+=m.length);o.observe(document.getElementById('modular-yard'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});setTimeout(()=>{o.disconnect();resolve(n);},250);}));
 check('paused fitting settles without a perpetual observer redraw',mutationCount<8,mutationCount);
 await tap('#modular-canvas [data-section="port"]');await page.waitForFunction(()=>modularPhone.pane==='fit');
 check('tapping a real hull section opens its matching Fit panel',await page.locator('#modular-phone-section').inputValue()==='port'&&await page.locator('#modular-selected').textContent().then(t=>t.includes('port')));
 await actions();await tap('#modular-remove-section');await page.waitForFunction(()=>modularPhone.pane==='ship');
 check('section removal returns to the ship without automatic duplication',await page.evaluate(()=>shipyard.design.modular.sections.length===5&&!shipyard.design.modular.sections.some(s=>s.id==='port')));
 await pane('parts');check('Parts shows a separate catalogue with hull limits',await page.locator('#modular-phone-parts').isVisible()&&await page.locator('[data-phone-part="plate"]').isVisible()&&await page.locator('[data-phone-part="spinal"]').isDisabled());
 await page.screenshot({path:out+'/parts-390.png'});await tap('[data-phone-part="plate"]');await page.waitForFunction(()=>modularPhone.pane==='ship');await tap('#modular-canvas [data-port="0,-1"]');
 check('one attachment tap adds exactly one armour plate',await page.evaluate(()=>shipyard.design.modular.sections.length===6&&shipyard.design.modular.sections.filter(s=>s.kind==='plate').length===1));
 await tap('#modular-undo');check('phone Undo restores five sections',await page.evaluate(()=>shipyard.design.modular.sections.length===5));await tap('#modular-redo');
 check('phone Redo restores the single plate',await page.evaluate(()=>shipyard.design.modular.sections.length===6&&shipyard.design.modular.sections.filter(s=>s.kind==='plate').length===1));
 const before=await page.evaluate(()=>({hp:engine.player.maxHp,cash:hubs.metal,quote:modularShips.quote(shipyard.design).total}));await tap('#modular-apply');
 const applied=await page.evaluate(()=>({hp:engine.player.maxHp,cash:hubs.metal,docked:!!hubs.docked,plate:saveState.doc.design.modular.sections.filter(s=>s.kind==='plate').length,same:JSON.stringify(saveState.doc.design.modular)===JSON.stringify(shipyard.design.modular)}));
 check('actual station Apply charges 180 metal and flies the edited hull',before.quote===180&&applied.cash===before.cash-180&&applied.hp>before.hp&&applied.plate===1&&applied.same&&applied.docked,{before,applied});
 await tap('#modular-canvas [data-section="gun"]');await page.waitForFunction(()=>modularPhone.pane==='fit');await page.screenshot({path:out+'/fit-390.png'});await tap('[data-fit-gear="gun-repeater-point"]');await page.waitForFunction(()=>modularPhone.pane==='ship');await tap('#modular-apply');
 check('fitting an owned gun returns to Ship and reuses its hardware',await page.evaluate(()=>hubs.metal===820&&saveState.doc.design.modular.fittings.find(f=>f.slot==='gun').gear==='gun-repeater-point'&&engine.player.nodes.some(n=>n.weapon==='repeater-point')));
 await pane('fit');await page.locator('#modular-phone-section').selectOption('engine');
 check('large section selector reaches a specific slot without canvas precision',await page.locator('#modular-selected').textContent().then(t=>t.includes('engine')));
 await actions();await tap('#modular-rotate-module');await page.waitForFunction(()=>modularPhone.pane==='ship');
 check('rotate is available as a deliberate section action',await page.evaluate(()=>shipyard.design.modular.fittings.find(f=>f.slot==='engine').rotation===90));await tap('#modular-undo');
 for(const name of ['hulls','training']){await pane(name);const data=await page.evaluate(()=>{const r=document.querySelector('.modular-rail'),f=document.querySelector('.modular-shell footer').getBoundingClientRect(),n=document.getElementById('modular-phone-nav').getBoundingClientRect(),b=r.getBoundingClientRect();r.scrollTop=r.scrollHeight;return{fits:b.top>=n.bottom-1&&b.bottom<=f.top+1,scroll:r.scrollHeight>r.clientHeight? r.scrollTop>0:true,shown:getComputedStyle(r).display!=='none'};});check(name+' has its own scrolling panel clear of Apply',data.fits&&data.scroll&&data.shown,data);}
 await checkShip({width:844,height:390});await pane('fit');await page.screenshot({path:out+'/fit-844.png'});await pane('parts');await page.screenshot({path:out+'/parts-844.png'});
 await page.setViewportSize({width:1366,height:900});await page.waitForTimeout(150);check('desktop restores the three-column yard and section tools',await page.evaluate(()=>document.getElementById('modular-phone-nav').hidden&&getComputedStyle(document.querySelector('.modular-columns')).display==='grid'&&document.querySelector('.modular-section-tools').parentElement.classList.contains('modular-inspector')));
 await page.setViewportSize({width:390,height:844});await pane('ship');await tap('#modular-close');await page.evaluate(()=>{if(hubs.docked)hubs.closeDock();if(menu.isPaused())menu.resume();engine.paused=false;});
 await page.evaluate(()=>{travelHelper.station();engine.drawMiniRadar();});await page.waitForFunction(()=>!document.getElementById('travel-cue').hidden);
 check('radar caption identifies the current system and sector',await page.locator('#radar-location').textContent().then(t=>t.includes('0,0')&&t.includes('Tap for chart')));
 await page.screenshot({path:out+'/route-390.png'});await tap('#travel-dismiss');check('route X clears the persisted target and cancels approach',await page.evaluate(()=>saveState.doc.travelRoute===null&&!travelHelper.approaching&&document.getElementById('travel-cue').hidden));
 await tap('.radar-box');check('tapping the minimap opens the real chart and route controls',await page.evaluate(()=>engine.mapOpen&&document.getElementById('travel-controls').open&&!!document.getElementById('navigation-legend')));await page.screenshot({path:out+'/chart-390.png'});
 await page.evaluate(()=>{if(engine.mapOpen)engine.toggleMapModal();engine.paused=false;travelHelper.station();engine.player.x=0;engine.player.y=260;hubs.openDock();});check('successful docking automatically clears refit guidance',await page.evaluate(()=>!!hubs.docked&&saveState.doc.travelRoute===null&&document.getElementById('travel-cue').hidden));
 await page.evaluate(()=>{hubs.closeDock();engine.paused=false;pilotRpg.openJournal();});await page.waitForTimeout(350);await page.locator('#captain-panel .armory-sheet').evaluate(e=>e.scrollTop=e.scrollHeight);
 const journal=await page.locator('#captain-close').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{top:r.top,bottom:r.bottom,width:r.width,height:r.height,hit:e===hit||e.contains(hit),viewport:innerHeight};});check('journal X stays on screen after scrolling to the final entry',journal.top>=0&&journal.bottom<=journal.viewport&&journal.width>=44&&journal.height>=44&&journal.hit,journal);
 await page.screenshot({path:out+'/journal-390.png'});await page.locator('#captain-close').tap();check('journal X closes and restores gameplay',await page.evaluate(()=>getComputedStyle(document.getElementById('captain-panel')).display==='none'&&!engine.paused));
 const saved=await page.evaluate(()=>({design:JSON.stringify(saveState.doc.design.modular),cash:hubs.metal}));await page.reload({waitUntil:'domcontentloaded'});await ready();await tap('#btn-title-continue');await page.evaluate(()=>garage.closeMission());
 check('new progress survives reload without another development reset',await page.evaluate(s=>JSON.stringify(saveState.doc.design.modular)===s.design&&hubs.metal===s.cash,saved));
 const single=await context.newPage();single.on('pageerror',e=>report.errors.push(e.message));await single.goto(new URL('dist/black-current.html',url).href,{waitUntil:'domcontentloaded'});await single.waitForFunction(()=>window.modularPhone?.ready&&window.navigationHud?.ready);check('standalone boots both phone and navigation adapters',await single.evaluate(()=>!!document.getElementById('travel-dismiss')&&!!document.getElementById('modular-phone-nav')));await single.close();
 check('six protected combat/editor sources remain byte-identical',['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].every(f=>readFileSync('js/'+f+'.js','utf8')===execFileSync('git',['show','HEAD:js/'+f+'.js'],{encoding:'utf8'})));
 check('no application exceptions',!report.errors.length,report.errors);
}catch(e){report.errors.push(e.stack);check('focused phone flow completed',false,e.message);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;report.sourceSHA256=Object.fromEntries(['index.html','js/modular-phone.js','css/modular-phone.css','js/navigation-hud.js','js/travel.js','js/pilot.js','dist/black-current.html'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
