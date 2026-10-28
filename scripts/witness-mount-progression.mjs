/* Native Novice -> Light construction, billing, save failure and touch paths.
 * All save seeding happens in an isolated browser context, never Mac's profile. */
import {firefox} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/mount-progression';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],surface:'Firefox 390x844 touch viewport and 1366x900 desktop; not physical phone'};
const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':': '+JSON.stringify(detail)));};
const source=readFileSync('js/modular-ships.js','utf8');
const fits=source.slice(source.indexOf('  function fits('),source.indexOf('  function factory('));
const sandbox={};vm.runInNewContext("const CLASSES=['POINT','LIGHT','MEDIUM','HEAVY','SIEGE','CAPITAL'];"+fits.replace('point:0','point:1')+";bad=fits('point',{kind:'weapon',cls:'LIGHT'});",sandbox);
check('negative control catches a Novice mount deliberately admitting Light guns',sandbox.bad===true);

const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await context.newPage();
p.setDefaultTimeout(10000);p.on('pageerror',e=>report.errors.push(e.message));
const ready=()=>p.waitForFunction(()=>window.upgradePath?.ready&&window.starterJourney?.ready&&window.hangarUI?.ready&&window.salvageTides?.ready);
try{
  await p.goto(process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await ready();
  check('fresh wallet remains 100 metal with no free Light deck',await p.evaluate(()=>hubs.metal===100&&!modularShips.hangar().owned['section:deck']));
  const civs=await p.evaluate(()=>Object.keys(noviceFleet.ROWS).map(id=>{const d=noviceFleet.create(id),guns=d.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon);return{id,guns:guns.length,novice:d.modular.sections.filter(s=>s.kind==='novice').length,classes:guns.map(f=>modularShips.GEARS[f.gear].cls),price:modularShips.quote(d).total};}));
  check('all 15 civilisation starters compile with two Novice guns and two Novice mounts',civs.length===15&&civs.every(d=>d.guns===2&&d.novice===2&&d.classes.every(c=>c==='POINT')),civs);
  check('Novice mount rejects Light, larger, unknown classes and support modules',await p.evaluate(()=>{const gs=Object.values(modularShips.GEARS),fit=gs.filter(g=>modularShips.fits('point',g));return fit.length>10&&fit.every(g=>g.kind==='weapon'&&g.cls==='POINT')&&!modularShips.fits('point',{kind:'weapon',cls:'UNKNOWN'})&&!modularShips.fits('weapon',{kind:'weapon',cls:'LIGHT'});}));
  check('native Apply rejects an injected Light-on-Novice fit without a write',await p.evaluate(()=>{const before=JSON.stringify(saveState.doc),d=noviceFleet.create('savanah');d.modular.fittings[0].gear=Object.keys(modularShips.GEARS).find(id=>modularShips.GEARS[id].cls==='LIGHT');return engine.applyDesign(d)===false&&JSON.stringify(saveState.doc)===before;}));

  await p.locator('#btn-menu-new').tap();await p.evaluate(()=>civilisations.choose('savanah'));
  await p.locator('#title-callsign').fill('MOUNT WITNESS');await p.locator('#btn-title-launch').tap();await p.waitForFunction(()=>starterJourney.active);
  check('real touch opens build-first with a core and free Novice kit',await p.evaluate(()=>shipyard.design.modular.sections.length===1&&hubs.metal===100&&modularShips.hangar().owned['section:novice']===2&&!modularShips.hangar().owned['section:deck']));
  for(let i=0;i<3;i++)await p.locator('#modular-apply').tap();
  check('three real supplied-fitting taps build two guns and one engine at zero cost',await p.evaluate(()=>shipyard.design.modular.fittings.length===3&&shipyard.design.modular.sections.filter(s=>s.kind==='novice').length===2&&modularShips.quote(shipyard.design).total===0&&!starterJourney.blocker(shipyard.design)));
  const slot=await p.evaluate(()=>shipyard.design.modular.sections.find(s=>s.kind==='novice').id);
  await p.locator('#modular-canvas [data-section="'+slot+'"]').tap();
  // The visual inspector deliberately paints on the next animation frame.
  // Observe the selected pane before reading its rows, not the previous engine pane.
  await p.waitForFunction(()=>document.querySelector('#hangar-right .hz-head strong')?.textContent==='Novice weapon deck');
  check('first-ship uses its free kit and cannot preview a Light conversion',await p.locator('#hangar-upgrade-light').count()===0&&await p.evaluate(()=>{const before=JSON.stringify(shipyard.design);return hangarUI.planLightMount()===false&&JSON.stringify(shipyard.design)===before;}));
  const firstRows=await p.locator('#hangar-right .hz-list [data-weapon-class]').evaluateAll(rows=>rows.map(r=>r.dataset.weaponClass));
  check('Novice fitting panel lists only Novice weapon classes',firstRows.length>10&&firstRows.every(c=>c==='POINT'),firstRows);
  await p.screenshot({path:out+'/novice-phone.png'});
  await p.locator('#modular-apply').tap();await p.evaluate(()=>engine.paused=true);
  check('free launch retains 100 metal, two guns, ten-section capacity and four-gun ceiling',await p.evaluate(()=>!starterJourney.active&&hubs.metal===100&&engine.player.nodes.filter(n=>n.type==='cannon').length===2&&modularShips.HULLS.frigate.sections===10&&modularShips.capacityReason({modules:5,capacity:9,design:{modular:{hull:'frigate',fittings:Array.from({length:5},()=>({gear:'gun-spitter'}))}}})?.includes('at most 4')));

  await p.evaluate(()=>{engine.paused=false;hubs.openDock();engine.paused=true;bay.show();});
  await p.locator('#modular-canvas [data-section="'+slot+'"]').tap();
  await p.locator('[data-hangar-action=modular-rotate-module]').tap();
  const original=await p.evaluate(id=>({section:modularShips.copy(shipyard.design.modular.sections.find(s=>s.id===id)),fit:modularShips.copy(shipyard.design.modular.fittings.find(f=>f.slot===id)),wallet:hubs.metal,active:JSON.stringify(saveState.doc.design)}),slot);
  await p.evaluate(()=>hangarUI.open('path'));
  check('progression gives the real 96 mount plus 48 gun price without research',await p.locator('#path-light-mount').textContent().then(t=>t.includes('96')&&t.includes('48')&&t.includes('144')&&t.includes('No research')));
  await p.screenshot({path:out+'/path-phone.png'});
  await p.locator('#path-plan-light').tap();
  const preview=await p.evaluate(({slot,original})=>{const s=shipyard.design.modular.sections.find(s=>s.id===slot),f=shipyard.design.modular.fittings.find(f=>f.slot===slot);return{kind:s.kind,placement:s.x===original.section.x&&s.y===original.section.y,fit:JSON.stringify(f)===JSON.stringify(original.fit),cashSame:hubs.metal===original.wallet,activeSame:JSON.stringify(saveState.doc.design)===original.active};},{slot,original});
  check('real touch Light preview preserves gun, facing, position, wallet and active ship',preview.kind==='deck'&&preview.placement&&preview.fit&&preview.cashSame&&preview.activeSame,preview);
  const primary=await p.locator('#hangar-right .hz-list > [data-weapon-class]').evaluateAll(rows=>rows.map(r=>r.dataset.weaponClass));
  check('Light primary list is Light-only; smaller guns are clearly collapsed fallback fits',primary.length>0&&primary.every(c=>c==='LIGHT')&&await p.locator('.hz-fallback').count()===1&&!await p.locator('.hz-fallback').evaluate(e=>e.open),primary);
  await p.locator('#hangar-browse-equipment').tap();
  check('compatible search defaults to the actual Light mount size',await p.locator('select[aria-label="All sizes"]').inputValue()==='LIGHT'&&await p.locator('.hz-picklist [data-weapon-class]').evaluateAll(rows=>rows.length>0&&rows.every(r=>r.dataset.weaponClass==='LIGHT')));
  const light=await p.evaluate(()=>Object.entries(modularShips.GEARS).filter(([,g])=>g.cls==='LIGHT'&&!g.salvageOnly).sort((a,b)=>a[1].cost-b[1].cost)[0][0]);
  await p.locator('[data-hangar-inspect="'+light+'"]').tap();
  const inspect=await p.locator('.hz-equipment-stats').textContent();
  check('Light inspector shows base DPS, hit, cadence, power and exact copy price',inspect.includes('Base DPS')&&inspect.includes('Base hit / round')&&inspect.includes('Base cycle')&&inspect.includes('Reactor power')&&inspect.includes('48 metal'),inspect);
  await p.screenshot({path:out+'/light-inspector-phone.png'});
  await p.locator('#hangar-inspect-fit').tap();
  check('replacing the gun preserves the mount facing',await p.evaluate(({slot,original})=>shipyard.design.modular.fittings.find(f=>f.slot===slot).rotation===original.fit.rotation,{slot,original}));
  const bill=await p.evaluate(()=>modularShips.quote(shipyard.design).total);
  check('native mount plus Light weapon quote is 144 and cannot use only the 100 starter allowance',bill===144&&await p.locator('#modular-apply').isDisabled(),{bill});
  check('underfunded native Apply leaves active ship and balance unchanged',await p.evaluate(()=>{const before=JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal]);return engine.applyDesign(shipyard.design)===false&&JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal])===before;}));

  // Seed earned funds to test the purchase boundary independently of combat pacing.
  await p.evaluate(()=>{saveState.doc.metal=200;saveState.save();modularYard.refresh();hangarUI.refresh();});
  const before=await p.evaluate(()=>{window.__mountSet=Storage.prototype.setItem;const state=JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal]);Storage.prototype.setItem=()=>{throw new Error('Witness refused mount save');};return state;});
  await p.locator('#modular-apply').tap();
  check('refused purchase save rolls back wallet, Light ownership and flying design',await p.evaluate(before=>JSON.stringify([saveState.doc.design,saveState.doc.modularHangar,hubs.metal])===before,before));
  await p.evaluate(()=>Storage.prototype.setItem=window.__mountSet);await p.locator('#modular-apply').tap();
  check('real touch Apply charges exactly 144 and flies the paid Light gun',await p.evaluate(({slot,light})=>hubs.metal===56&&saveState.doc.design.modular.sections.find(s=>s.id===slot).kind==='deck'&&saveState.doc.design.modular.fittings.find(f=>f.slot===slot).gear===light&&engine.player.nodes.some(n=>n.weapon===modularShips.GEARS[light].weapon),{slot,light}));
  check('replaced Novice hardware stays owned and the paid Light copy is owned once',await p.evaluate(light=>modularShips.hangar().owned['section:novice']===2&&modularShips.hangar().owned['section:deck']===1&&modularShips.hangar().owned['gear:'+light+':1']===1,light));
  await p.screenshot({path:out+'/light-fitted-phone.png'});

  await p.evaluate(()=>{hubs.closeDock();engine.paused=true;bay.show();});await p.locator('#modular-canvas [data-section="'+slot+'"]').tap();
  await p.locator('.hz-fallback > summary').tap();await p.locator('.hz-fallback [data-hangar-item="'+original.fit.gear+'"]').tap();
  check('owned Novice fallback can refit into the Light mount in the field for zero',await p.evaluate(()=>!hubs.docked&&modularShips.quote(shipyard.design).total===0&&!modularShips.fieldReason(shipyard.design)));
  await p.locator('#modular-apply').tap();await p.reload();await ready();
  const restored=await p.evaluate(({slot,light})=>({metal:hubs.metal,section:saveState.doc.design.modular.sections.find(s=>s.id===slot),fit:saveState.doc.design.modular.fittings.find(f=>f.slot===slot),lightCopies:modularShips.hangar().owned['gear:'+light+':1']}),{slot,light});
  check('reload retains paid mount, facing, unspent wallet and the returned Light gun',restored.metal===56&&restored.section.kind==='deck'&&restored.fit.gear===original.fit.gear&&restored.fit.rotation===original.fit.rotation&&restored.lightCopies===1,restored);
  check('phone page has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

  // A pre-change save already used Light decks for starter guns. Never rewrite it.
  await p.evaluate(light=>{const d=noviceFleet.create('savanah');for(const s of d.modular.sections)if(s.kind==='novice')s.kind='deck';d.modular.fittings[0].gear=light;saveState.doc.design=modularShips.compile(d).design;saveState.doc.modularHangar.owned['section:deck']=2;saveState.doc.metal=37;saveState.save();},light);
  await p.reload();await ready();
  check('old Light-deck saves restore without repricing, reset or loadout replacement',await p.evaluate(light=>hubs.metal===37&&saveState.doc.design.modular.sections.filter(s=>s.kind==='deck').length===2&&saveState.doc.design.modular.fittings[0].gear===light&&modularShips.quote(saveState.doc.design).total===0&&!modularShips.check(saveState.doc.design),light));
  await p.setViewportSize({width:1366,height:900});await p.evaluate(()=>{engine.paused=false;hubs.openDock();engine.paused=true;bay.show();});await p.locator('#modular-canvas [data-section=gun]').tap();
  await p.screenshot({path:out+'/legacy-light-desktop.png'});
  check('desktop page has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('native mount progression flow completed',false,e.message);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length||report.checks.length<25)process.exitCode=1;
