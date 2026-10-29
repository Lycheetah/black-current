import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';
mkdirSync('shots/first-fit',{recursive:true});
const checks=[],errors=[],data={},check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(ok||detail===undefined?'':' '+JSON.stringify(detail)));};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
const url=process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const ready=()=>page.waitForFunction(()=>window.stationGrid?.ready&&starterJourney.ready);
const click=s=>page.locator(s).click();
try{
 await page.goto(url);await ready();await click('#btn-menu-new');await page.locator('#title-callsign').fill('FIT FIRST');await click('#btn-title-launch');data.wallet=await page.evaluate(()=>hubs.metal);   // the 100-metal welcome credit (witness-rookie-supplies)
 check('Build my ship immediately opens its first free fitting step',await page.locator('#modular-apply').isEnabled()&&await page.locator('#modular-apply').textContent().then(t=>t.includes('first gun')));
 await page.screenshot({path:'shots/first-fit/first-step-phone.png'});
 await click('#modular-apply');check('one tap attaches a deck and fits the first supplied gun',await page.evaluate(()=>shipyard.design.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon).length===1&&starterJourney.active));
 await click('#modular-apply');check('the next tap fits the second gun',await page.evaluate(()=>shipyard.design.modular.fittings.filter(f=>modularShips.GEARS[f.gear].weapon).length===2&&starterJourney.active));
 await click('#modular-apply');check('the next tap fits the engine and offers Launch',await page.evaluate(()=>shipyard.design.modular.fittings.some(f=>f.gear==='engine')&&modularShips.quote(shipyard.design).total===0)&&await page.locator('#modular-apply').textContent().then(t=>t.startsWith('Launch')));
 await page.screenshot({path:'shots/first-fit/ready-phone.png'});await click('#modular-apply');
 data.launch=await page.evaluate(()=>({active:starterJourney.active,guns:engine.player.nodes.filter(n=>n.type==='cannon').length,metal:hubs.metal}));check('Launch flies the fitted two-gun ship without charging money',!data.launch.active&&data.launch.guns===2&&data.launch.metal===data.wallet,{...data.launch,wallet:data.wallet});
 // Reproduce a returning browser with an unfinished workshop, then choose
 // Quick launch through the real new-campaign confirmation and reload.
 await page.evaluate(()=>{saveState.doc.firstShipWorkshop={v:1,active:true};saveState.save();});await page.reload();await ready();await click('#btn-menu-new');await page.locator('#title-callsign').fill('PREMADE');page.once('dialog',d=>d.accept());
 await Promise.all([page.waitForEvent('load'),click('#btn-title-quick')]);await ready();
 check('premade from an unfinished returning save bypasses the workshop',await page.evaluate(()=>saveState.doc.launched&&!saveState.doc.firstShipWorkshop?.active&&!starterJourney.active&&document.getElementById('modular-yard').hidden));
 await page.reload();await ready();await click('#btn-menu-new');await page.locator('#title-callsign').fill('CUSTOM');page.once('dialog',d=>d.accept());
 await Promise.all([page.waitForEvent('load'),click('#btn-title-launch')]);await ready();await page.waitForFunction(()=>starterJourney.active);
 data.build={enabled:await page.locator('#modular-apply').isEnabled(),text:await page.locator('#modular-apply').textContent()};check('Build from a returning save opens construction with a usable fitting button',data.build.enabled&&data.build.text.includes('first gun'),data.build);
 check('the premade fallback launches directly from the workshop',await click('#modular-close').then(()=>page.evaluate(()=>!starterJourney.active&&saveState.doc.design.modular.sections.length===6)));
 check('no application exceptions',errors.length===0);
}catch(e){errors.push(e.stack);check('first-fit flow completed',false);await page.screenshot({path:'shots/first-fit/failure.png'}).catch(()=>{});}
finally{const r={passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,checks,errors};writeFileSync('shots/first-fit/report.json',JSON.stringify(r,null,2));console.log(JSON.stringify({passed:r.passed,failed:r.failed,errors:errors.map(s=>s.split('\n')[0])}));await browser.close();if(r.failed||errors.length)process.exitCode=1;}
