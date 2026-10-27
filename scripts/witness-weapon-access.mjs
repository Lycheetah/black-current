import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/weapon-access';mkdirSync(dir,{recursive:true});
const report={checks:[],errors:[]},check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name);};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>report.errors.push(e.message));
const tap=id=>p.locator(id).tap();
try{
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await p.waitForFunction(()=>window.stationGrid?.ready&&window.upgradePath?.ready);await tap('#btn-menu-new');await p.evaluate(()=>civilisations.choose('savanah'));await p.locator('#title-callsign').fill('WEAPON ACCESS');await tap('#btn-title-quick');await p.evaluate(()=>garage.closeMission());
 for(const[name,id,visible,close]of[
 ['Pause','#btn-touch-pause',()=>document.getElementById('pause-menu').style.display==='flex',()=>menu.resume()],
 ['Chart','#btn-touch-map',()=>engine.mapOpen,()=>engine.toggleMapModal()],
 ['Hold','#btn-phone-hold',()=>document.getElementById('salvage-panel').style.display==='flex',()=>loot.close()],
 ['Jobs','#btn-phone-contracts',()=>document.body.classList.contains('phone-contracts-open'),()=>document.getElementById('btn-phone-contracts').click()],
 ['Build','#btn-touch-build',()=>document.getElementById('build-panel').style.display==='flex',()=>hubs.closeBuild()],
 ['Shipyard','#btn-touch-designer',()=>!document.getElementById('modular-yard').hidden,()=>modularYard.close()]
 ]){await tap(id);check('real phone tap opens '+name,await p.evaluate(visible));await p.evaluate(close);}
 await tap('#btn-touch-pause');await tap('#btn-pause-settings');check('phone Pause opens Settings',await p.locator('#menu-panel').isVisible());await tap('#btn-panel-back');await tap('#btn-pause-resume');
 await p.evaluate(()=>{engine.paused=false;hubs.openDock();hubs.metal=100;});await tap('[data-station-service=equipment]');check('phone station Equipment opens the shop',await p.locator('#hangar-picker').evaluate(e=>e.open));await tap('#hangar-picker>header button');
 const before=await p.evaluate(()=>({design:JSON.stringify(saveState.doc.design),money:hubs.metal,mass:progression.totalMass}));
 await tap('#modular-phone-nav [data-pane=hulls]');await tap('[data-hangar-hull=titan]');await p.evaluate(()=>hangarUI.open('gear',true));
 const novice=await p.locator('#hangar-picker [data-hangar-item=gun-spitter]').textContent();check('Titan preview does not lock a novice gun behind Titan biomass',!/requires|20000|20,000|249,/.test(novice),novice);
 check('future hull requirements are labelled separately from weapons',await p.locator('#hangar-picker .hangar-draft-context').textContent().then(t=>t.includes('20,000')&&t.includes('not flying')));
 check('new Titan fabrication remains locked for a rookie',await p.evaluate(()=>!!modularShips.check(shipyard.design)&&engine.applyDesign(shipyard.design)===false&&saveState.doc.design.modular.hull==='frigate'));
 await p.screenshot({path:dir+'/titan-preview-phone.png'});await tap('#hangar-picker [data-return-active]');
 check('Fit flying ship restores the frigate without resetting progress or losing the Titan plan',await p.evaluate(b=>shipyard.design.modular.hull==='frigate'&&JSON.stringify(saveState.doc.design)===b.design&&hubs.metal===b.money&&progression.totalMass===b.mass&&saveState.doc.workshop.blueprintDraft?.modular?.hull==='titan',before));
 await p.locator('#hangar-picker input[type=search]').fill('Pulse emitter');await tap('[data-hangar-inspect=gun-bolt-point]');await tap('#hangar-inspect-fit');await tap('#modular-apply');
 check('a rookie buys and flies a six-metal gun at zero biomass',await p.evaluate(()=>progression.totalMass===0&&hubs.metal===94&&saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-bolt-point')&&engine.player.nodes.some(n=>n.weapon==='bolt-point')));
 const owned=await p.evaluate(()=>{const d=modularShips.copy(saveState.doc.workshop.blueprintDraft),before=modularShips.copy(saveState.doc.modularHangar),h=modularShips.hangar();h.rank=6;h.owned['hull:titan']=1;saveState.doc.modularHangar=h;const why=modularShips.check(d);saveState.doc.modularHangar=before;return why;});check('an already-owned Titan can be refitted after losing biomass',!owned,owned);
 await tap('#modular-close');await tap('[data-station-service=missions]');check('phone station Missions opens the journal',await p.locator('#captain-panel').isVisible());await tap('#captain-close');await tap('[data-station-service=codex]');check('phone station Codex opens its modal',await p.locator('#equipment-codex').evaluate(e=>e.open));await tap('#codex-close');
 await tap('[data-station-service=upgrades]');check('phone station progression opens its native view',await p.locator('#progression-path').isVisible());await tap('#hangar-picker>header button');
 for(const [pane,selector]of[['parts','#hangar-left'],['fit','#hangar-right'],['hulls','#hangar-picker'],['training','#hangar-picker']]){await tap('#modular-phone-nav [data-pane='+pane+']');check('phone fitting '+pane+' view opens',await p.locator(selector).isVisible());if(pane==='hulls'||pane==='training')await tap('#hangar-picker>header button');}
 await p.screenshot({path:dir+'/fitting-phone.png'});
 check('six protected source files remain unchanged',['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].every(f=>readFileSync('js/'+f+'.js','utf8')===execFileSync('git',['show','HEAD:js/'+f+'.js'],{encoding:'utf8'})));
 check('no application exceptions',!report.errors.length,report.errors);
}catch(e){report.errors.push(e.stack);check('weapon access and phone flow completed',false,e.message);await p.screenshot({path:dir+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
