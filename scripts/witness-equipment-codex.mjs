import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/equipment-codex';mkdirSync(dir,{recursive:true});
const checks=[],errors=[],data={};
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),page=await context.newPage();
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');await page.waitForFunction(()=>window.equipmentCodex?.ready);
  await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));await page.locator('#title-callsign').fill('CODEX WITNESS');await page.locator('#btn-title-quick').click();
  await page.evaluate(async()=>{garage.closeMission();civilisations.goHome();hubs.openDock();hubs.metal=100;saveState.save();await sectionArt.loaded;await turretArt.loaded;});
  data.catalog=await page.evaluate(()=>{const entries=equipmentCodex.entries();return{count:entries.length,unique:new Set(entries.map(e=>e.key)).size,weapons:entries.filter(e=>e.type==='gear'&&e.data.weapon).length,traits:entries.filter(e=>e.type==='trait').length,expected:Object.values(modularShips.GEARS).filter(g=>!g.salvageOnly).length+Object.keys(modularShips.SECTIONS).length+Object.keys(modularShips.PIECES).length+Object.keys(loot.QUIRKS).length};});
  check('one shared catalogue indexes every weapon, system, hull part, clip-on and trait',data.catalog.count===data.catalog.expected&&data.catalog.unique===data.catalog.count&&data.catalog.weapons>=40&&data.catalog.traits>=30,data.catalog);
  const snapshot=()=>page.evaluate(()=>JSON.stringify([hubs.metal,progression.totalMass,saveState.doc.modularHangar?.owned,saveState.doc.armory,saveState.doc.design]));
  const beforeBrowse=await snapshot();await page.locator('[data-station-service="codex"]').click();
  check('native station door opens the Codex and retains eight service tiles',await page.locator('#equipment-codex').evaluate(e=>e.open)&&await page.locator('#station-services [data-station-service]').count()===8);   // the eight grid tiles; Training and Launch sit in the footer
  await page.screenshot({path:`${dir}/desktop-grid.png`});
  check('desktop catalogue shows nine full cards with a visible Close control',await page.locator('[data-codex-item]').count()===9&&await page.locator('#codex-close').isVisible()&&await page.locator('#codex-grid').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
  const firstPage=await page.locator('[data-codex-item]').first().getAttribute('data-codex-item');await page.locator('#codex-next').click();
  check('page controls actually change the cards',await page.locator('[data-codex-item]').first().getAttribute('data-codex-item')!==firstPage);
  await page.locator('[data-codex-category="weapons"]').click();await page.locator('#codex-family').selectOption('Beam');await page.locator('#codex-size').selectOption('POINT');
  check('family and size filters show only matching weapons',await page.locator('[data-codex-item]').count()>0&&await page.evaluate(()=>[...document.querySelectorAll('[data-codex-item]')].every(b=>{const e=equipmentCodex.entries().find(e=>e.key===b.dataset.codexItem);return e.category==='weapons'&&e.family==='Beam'&&e.size==='POINT';})));
  await page.locator('#codex-close').click();await page.evaluate(()=>equipmentCodex.open('gear:shield'));
  data.shield=await page.evaluate(()=>equipmentCodex.details(equipmentCodex.entries().find(e=>e.key==='gear:shield')));
  check('shield guide exposes real shield pool, recharge and utility mounts',data.shield.stats.some(([k,v])=>k==='Shield pool'&&v==='30')&&data.shield.stats.some(([k,v])=>k==='Recharge'&&v==='12 / s')&&data.shield.fits.includes('Command core'),data.shield);
  await page.screenshot({path:`${dir}/desktop-shield.png`});await page.locator('#codex-close').click();
  check('browsing and inspecting grant no hardware, currency, technology or applied build',await snapshot()===beforeBrowse);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>equipmentCodex.open());
  await page.screenshot({path:`${dir}/phone-grid.png`});
  check('phone grid uses six cards, contained scrolling and no automatic search keyboard focus',await page.locator('[data-codex-item]').count()===6&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.activeElement.id!=='codex-search'));
  await page.locator('[data-codex-category="traits"]').click();await page.locator('[data-codex-item]').first().click();
  check('undiscovered traits show silhouettes and source hints without revealing the trait',await page.locator('#codex-detail h3').textContent().then(t=>t.startsWith('Unidentified'))&&await page.locator('#codex-detail .codex-silhouette').count()>0&&await page.locator('#codex-detail .codex-source').textContent().then(t=>t.includes('no specific trait is guaranteed')));
  await page.screenshot({path:`${dir}/phone-unknown-trait.png`});await page.locator('#codex-back').click();
  check('phone Back returns to the collection cards without closing the Codex',await page.locator('#equipment-codex').evaluate(e=>e.open&&e.dataset.detail==='false')&&await page.locator('#codex-grid').isVisible());
  await page.keyboard.press('Escape');check('Escape closes only the Codex and preserves the dock and pause state',await page.evaluate(()=>!document.getElementById('equipment-codex').open&&!!hubs.docked&&engine.paused));
  await page.evaluate(()=>equipmentCodex.open('gear:gun-lance-capital'));
  const capitalCost=await page.evaluate(()=>modularShips.GEARS['gun-lance-capital'].cost.toLocaleString()+' metal');   // priced by tuning.PRICE_CURVE
  check('capital weapon requirements expose a capital frame and real hardware cost',await page.locator('#codex-detail').textContent().then(t=>t.includes(capitalCost)&&t.includes('Smallest frame: Forge capital')&&t.includes('research')));
  await page.locator('#codex-close').click();await page.evaluate(()=>equipmentCodex.open('kit:radar'));
  check('cosmetic sensors explicitly promise no combat stats',await page.locator('#codex-detail').textContent().then(t=>t.includes('Cosmetic only')));await page.locator('#codex-close').click();
  await page.evaluate(()=>equipmentCodex.open());const cheapName=await page.evaluate(()=>modularShips.GEARS['gun-bolt-point'].name);await page.locator('#codex-search').fill(cheapName);await page.locator('[data-codex-item="gear:gun-bolt-point"]').click();
  await page.screenshot({path:`${dir}/phone-weapon.png`});const money=await page.evaluate(()=>hubs.metal);await page.locator('#codex-open-fitting').click();
  check('guide hands off to the native filtered shop without spending or applying',await page.locator('#hangar-picker').evaluate(e=>e.open)&&await page.locator('[data-hangar-item="gun-bolt-point"]').isVisible()&&await page.evaluate(()=>hubs.metal)===money);
  await page.locator('[data-hangar-item="gun-bolt-point"]').click();await page.locator('#modular-apply').click();
  data.purchase=await page.evaluate(()=>({metal:hubs.metal,owned:equipmentCodex.owned('gear','gun-bolt-point'),seen:saveState.doc.equipmentCodex.seen.includes('gear:gun-bolt-point'),fitted:saveState.doc.design.modular.fittings.some(f=>f.gear==='gun-bolt-point')}));
  check('native purchase charges exactly six metal and records only real acquired hardware',data.purchase.metal===money-6&&data.purchase.owned===1&&data.purchase.seen&&data.purchase.fitted,data.purchase);
  await page.evaluate(()=>{if(!document.getElementById('modular-yard').hidden)modularYard.close();});
  data.failedSave=await page.evaluate(()=>{
    const before=JSON.stringify([saveState.doc.modularHangar,saveState.doc.equipmentCodex]),set=Storage.prototype.setItem;let result;
    try{Storage.prototype.setItem=()=>{throw new Error('Witness: refused storage');};result=recoveredFittings.grant({type:'shield',radius:6,quirk:'phase',rarity:'relic'});}finally{Storage.prototype.setItem=set;}
    return{result,unchanged:before===JSON.stringify([saveState.doc.modularHangar,saveState.doc.equipmentCodex]),collected:equipmentCodex.entries().some(e=>e.key==='trait:phase'&&e.collected)};
  });
  check('refused salvage save rolls back hardware and collection rather than falsely discovering',data.failedSave.result===false&&data.failedSave.unchanged&&!data.failedSave.collected,data.failedSave);
  data.salvage=await page.evaluate(()=>{const result=recoveredFittings.grant({type:'cannon',radius:12,weapon:'spitter',quirk:'bouncer',rarity:'rare'}),id='recovered-gun-spitter-bouncer';return{result,owned:equipmentCodex.owned('gear',id),trait:equipmentCodex.entries().find(e=>e.key==='trait:bouncer')};});
  check('real recovered variant reveals its canonical trait and counts one physical copy',!!data.salvage.result&&data.salvage.owned===1&&data.salvage.trait.collected&&!data.salvage.trait.unknown,data.salvage);
  await page.evaluate(()=>equipmentCodex.open('trait:bouncer'));check('discovered trait detail shows the actual upside and downside',await page.locator('#codex-detail').textContent().then(t=>t.includes('Ricochet cannon')&&t.includes('20% slower')));await page.screenshot({path:`${dir}/phone-found-trait.png`});await page.locator('#codex-close').click();
  await page.evaluate(()=>{const h=modularShips.hangar();h.owned['gear:recovered-gun-spitter-bouncer:1']=0;saveState.doc.modularHangar=h;saveState.save();});await page.reload();await page.waitForFunction(()=>window.equipmentCodex?.ready);await page.locator('#btn-title-continue').click();await page.evaluate(()=>{garage.closeMission();equipmentCodex.open('trait:bouncer');});
  check('collection survives reload and keeps a trait after its last owned copy is gone',await page.evaluate(()=>equipmentCodex.owned('gear','recovered-gun-spitter-bouncer')===0&&equipmentCodex.entries().find(e=>e.key==='trait:bouncer').collected)&&await page.locator('#codex-detail h3').textContent().then(t=>t==='Ricochet cannon'));
  await page.locator('#codex-close').click();await page.evaluate(()=>{engine.paused=false;equipmentCodex.open();});await page.locator('#codex-close').click();check('closing a field-opened Codex resumes flight',await page.evaluate(()=>!engine.paused));
  check('no application exceptions',errors.length===0,errors);
}catch(e){errors.push(e.stack);check('Codex journey completed',false,e.message);await page.screenshot({path:`${dir}/failure.png`}).catch(()=>{});}
finally{const report={checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,catalog:data.catalog,errors}));await browser.close();if(report.failed||errors.length)process.exitCode=1;}
