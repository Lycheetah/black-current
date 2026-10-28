import {firefox} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/rookie-supplies';mkdirSync(out,{recursive:true});const report={checks:[],errors:[]};
const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':JSON.stringify(detail)));};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>report.errors.push(e.message));
const ready=()=>p.waitForFunction(()=>window.salvageTides?.ready&&window.stationGrid?.ready);
try{
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await ready();
 check('fresh campaign receives exactly 100 metal',await p.evaluate(()=>hubs.metal===100&&saveState.doc.starterMetalVersion===1));
 await p.reload();await ready();check('reload cannot repeat the allowance',await p.evaluate(()=>hubs.metal===100&&salvageTides.starterCredit()===false));
 check('refused save rolls back both wallet and credit marker',await p.evaluate(()=>{const doc=saveState.doc,save=saveState.save;delete doc.starterMetalVersion;doc.metal=37;saveState.save=()=>false;try{return salvageTides.starterCredit()===false&&doc.metal===37&&!Object.hasOwn(doc,'starterMetalVersion');}finally{saveState.save=save;}}));
 check('existing campaign gets an additive 100, once',await p.evaluate(()=>salvageTides.starterCredit()===true&&hubs.metal===137&&salvageTides.starterCredit()===false));
 await p.reload();await ready();check('existing campaign boost persists through reload',await p.evaluate(()=>hubs.metal===137));
 await p.evaluate(()=>{saveState.doc.metal=100;saveState.save();});
 await p.locator('#btn-menu-new').tap();await p.evaluate(()=>civilisations.choose('savanah'));await p.locator('#title-callsign').fill('ROOKIE SUPPLIES');await p.locator('#btn-title-launch').tap();await p.waitForFunction(()=>starterJourney.active);
 check('real phone Build my ship opens supplied workshop with wallet intact',await p.evaluate(()=>starterJourney.active&&hubs.metal===100&&shipyard.design.modular.sections.length===1));
 const quote=await p.evaluate(()=>{const d=noviceFleet.create('savanah'),s=d.modular.sections.find(s=>s.kind==='utility');s.kind='novice';d.modular.fittings.push({slot:s.id,gear:'gun-spitter',mk:1});shipyard.design=d;shipyard.syncFields();modularYard.refresh();hangarUI.refresh();return {price:modularShips.quote(d).total,why:starterJourney.blocker(d)};});
 check('starter blueprint accepts an affordable third gun',quote.price>0&&quote.price<100&&!quote.why,quote);
 await p.screenshot({path:out+'/starter-extras-phone.png'});
 const before=await p.evaluate(()=>{window.__suppliesSave=saveState.save;const b={metal:hubs.metal,design:JSON.stringify(saveState.doc.design)};saveState.save=()=>false;return b;});
 await p.locator('#modular-apply').tap();
 check('failed launch does not spend money or change flying ship',await p.evaluate(b=>starterJourney.active&&hubs.metal===b.metal&&JSON.stringify(saveState.doc.design)===b.design,before));
 await p.evaluate(()=>saveState.save=window.__suppliesSave);await p.locator('#modular-apply').tap();
 check('real touch launches third gun and charges its exact native quote',await p.evaluate(b=>!starterJourney.active&&hubs.metal===b.metal-b.price&&engine.player.nodes.filter(n=>n.type==='cannon').length===3,{...before,price:quote.price}));
 await p.reload();await ready();check('paid layout and remaining balance survive reload',await p.evaluate(b=>saveState.doc.design.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon).length===3&&hubs.metal===b.metal-b.price,{...before,price:quote.price}));
 check('four-gun maximum and reactor limits remain',await p.evaluate(()=>modularShips.HULLS.frigate.power===12&&modularShips.capacityReason({modules:5,capacity:9,design:{modular:{hull:'frigate',fittings:Array.from({length:5},()=>({gear:'gun-spitter'}))}}})?.includes('at most 4')));
 check('six protected originals remain unchanged',['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].every(f=>readFileSync('js/'+f+'.js','utf8')===execFileSync('git',['show','HEAD:js/'+f+'.js'],{encoding:'utf8'})));
 check('shot-off and elite salvage rates updated',/LOOSE_PART_CHANCE = 0.10, ELITE_FITTING_CHANCE = 0.25/.test(readFileSync('js/loot.js','utf8'))&&/danger <= 1 \? 0.18/.test(readFileSync('js/loot.js','utf8')));
 check('no application exceptions',!report.errors.length,report.errors);
}catch(e){report.errors.push(e.stack);check('rookie supplies flow completed',false,e.message);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
