import {firefox} from 'playwright';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/release-candidate';mkdirSync(dir,{recursive:true});
const checks=[],errors=[],data={};
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const packageRoot=resolve('dist/release-candidate'),manifest=JSON.parse(readFileSync(join(packageRoot,'build.json')));
const receipt=JSON.parse(readFileSync(`${dir}/package.json`)),version=JSON.parse(readFileSync('package.json')).version;
const files=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]);
const verify=(m)=>Object.entries(m.files).filter(([p,h])=>sha(readFileSync(join(packageRoot,p)))!==h).map(([p])=>p);
let browser;
try{
  data.packageFiles=Object.keys(manifest.files).length;
  check('package manifest covers every generated file with matching bytes',data.packageFiles>500&&files(packageRoot).length===data.packageFiles+1&&verify(manifest).length===0,{files:data.packageFiles+1});
  const broken=structuredClone(manifest),first=Object.keys(broken.files)[0];broken.files[first]='0'.repeat(64);
  check('artifact verifier rejects a deliberately wrong digest',verify(broken).includes(first));
  const referenceGuard=execFileSync('python3',['-c',`import importlib.util,tempfile
from pathlib import Path
s=importlib.util.spec_from_file_location('candidate','scripts/build-candidate.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as d:
 p=Path(d);(p/'index.html').write_text('<script src="js/missing.js?v=test"></script>')
 try: m.game_references(p)
 except ValueError: print('rejected missing reference')
 else: raise SystemExit('missing script falsely accepted')`],{encoding:'utf8'}).trim();
  check('candidate builder rejects missing scripts instead of silently skipping them',referenceGuard==='rejected missing reference');
  check('selected source hashes still match the working tree',Object.keys(receipt.selected_inputs).length>500&&Object.entries(receipt.selected_inputs).every(([p,h])=>sha(readFileSync(p))===h));
  const protectedFiles=['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].map(n=>`js/${n}.js`);
  const html=readFileSync(receipt.standalone,'utf8');
  data.embeddedImages=(html.match(/data:image\/png;base64,/g)||[]).length;
  check('versioned, generic and packaged standalone are identical and embed their game assets',sha(Buffer.from(html))===receipt.standalone_sha256&&sha(readFileSync('dist/black-current.html'))===receipt.standalone_sha256&&sha(readFileSync(join(packageRoot,'download/black-current.html')))===receipt.standalone_sha256&&data.embeddedImages>=150&&!/(?:src|href)="(?:js|css|art)\//.test(html),{embeddedImages:data.embeddedImages});
  check('version and cache agree across package, source and lockfile',manifest.release.version===version&&new Set([...readFileSync('index.html','utf8').matchAll(/\?v=([^"&]+)/g)].map(m=>m[1])).size===1&&readFileSync('index.html','utf8').includes('?v='+manifest.release.cache_token)&&JSON.parse(readFileSync('package-lock.json')).version===version&&html.includes(`id="build-version">${version}`));
  check('incoming unselected art stays outside the candidate',receipt.excluded_untracked_keyed_assets>0&&Object.keys(manifest.files).filter(p=>p.startsWith('play/art/keyed/')).every(p=>Object.hasOwn(receipt.selected_inputs,p.slice(5))),{excluded:receipt.excluded_untracked_keyed_assets});
  browser=await firefox.launch();
  for(const surface of ['package','offline']){
    const offline=surface==='offline',network=[],badResponses=[],unexpectedFiles=[];
    const context=await browser.newContext({viewport:offline?{width:1214,height:800}:{width:390,height:844},hasTouch:!offline});
    if(offline)await context.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(`${surface}: ${e.message}`));
    page.on('response',r=>{if(r.status()>=400&&!r.url().includes('fonts.googleapis.com'))badResponses.push([r.status(),r.url()]);});
    if(offline)page.on('request',r=>{if(r.url().startsWith('file:')&&r.url()!==pathToFileURL(resolve(receipt.standalone)).href)unexpectedFiles.push(r.url());});
    const url=offline?pathToFileURL(resolve(receipt.standalone)).href:(process.env.CANDIDATE_URL||'http://127.0.0.1:8811/black-current/dist/release-candidate/play/');
    const ready=()=>page.waitForFunction(()=>window.quartermaster?.ready&&window.equipmentCodex?.ready&&starterJourney.ready);
    await page.goto(url);await ready();
    check(`${surface}: main menu visibly identifies the candidate`,await page.locator('#build-version').isVisible()&&await page.locator('#build-version').textContent().then(t=>t.includes(version)));
    if(!offline)await page.screenshot({path:`${dir}/menu-phone.png`});
    await page.locator('#btn-menu-credits').click();await page.locator('#btn-release-notes').click();
    check(`${surface}: in-game release notes describe this build`,await page.locator('#menu-panel h3').textContent().then(t=>t.includes(version))&&await page.locator('#menu-panel').textContent().then(t=>t.includes('Faction commissions')&&t.includes('Equipment Codex')));
    if(!offline)await page.screenshot({path:`${dir}/release-notes-phone.png`});
    await page.locator('#btn-panel-back').click();await page.locator('#btn-menu-new').click();await page.locator('#title-callsign').fill('CANDIDATE');
    await page.locator(offline?'#btn-title-quick':'#btn-title-launch').click();
    if(!offline){for(let i=0;i<4;i++)await page.locator('#modular-apply').click();}
    await page.evaluate(async()=>{garage.closeMission();engine.paused=true;await sectionArt.loaded;await turretArt.loaded;});
    check(`${surface}: ${offline?'premade':'build-first'} launches two guns with loaded modular art`,await page.evaluate(()=>engine.player.nodes.filter(n=>n.type==='cannon').length===2&&sectionArt.count===9&&turretArt.count===9&&!starterJourney.active&&!saveState.doc.firstShipWorkshop?.active));
    await page.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();});
    await page.locator('[data-station-service="codex"]').click();
    check(`${surface}: real station door opens the rendered equipment catalogue`,await page.locator('#equipment-codex').evaluate(e=>e.open)&&await page.locator('[data-codex-item]').count()>0&&await page.evaluate(()=>equipmentCodex.entries().length>=167));
    await page.screenshot({path:`${dir}/${surface}-codex.png`});await page.locator('#codex-close').click();
    await page.evaluate(()=>pilotRpg.showBuild());
    await page.evaluate(async()=>{const c=document.querySelector('#captain-panel .armory-sheet');await Promise.all(c.getAnimations({subtree:true}).filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
    check(`${surface}: packaged Captain menu settles opaque with real ship art`,await page.evaluate(()=>{const c=document.querySelector('#captain-panel .armory-sheet'),s=getComputedStyle(c);return Number(s.opacity)===1&&s.backgroundColor==='rgb(11, 27, 39)'&&!!c.querySelector('.captain-identity canvas');}));
    await page.screenshot({path:`${dir}/${surface}-captain.png`});await page.locator('#captain-close').click();
    data[surface]=await page.evaluate(()=>{hubs.closeDock();const s=galaxy.data.systems.find(s=>s.id!==saveState.doc.civHome&&s.id!=='home'&&s.danger<=2);galaxy.enterSystemById(s.id);worldMap.currentGridX=worldMap.currentGridY=0;engine.player.x=0;engine.player.y=200;engine.paused=false;engine.enterChamber({silent:true});hubs.openDock();bay.show();hangarUI.open('stock');saveState.save();return{sys:s.id,stock:quartermaster.market(),sections:sectionArt.count,turrets:turretArt.count};});
    check(`${surface}: packaged station specials render through the native shop`,await page.locator('[data-qm-offer]').count()===3&&await page.locator('[data-qm-buy]').count()===3&&data[surface].stock.offers.length===3);
    await page.reload();await ready();await page.locator('#btn-title-continue').click();
    await page.evaluate(()=>{garage.closeMission();engine.paused=true;});
    check(`${surface}: Continue preserves the outer system and saved stock`,await page.evaluate(({sys,stock})=>galaxy.currentId===sys&&JSON.stringify(quartermaster.market())===JSON.stringify(stock),data[surface]));
    await page.screenshot({path:`${dir}/${surface}-flight.png`});
    check(`${surface}: assets load without missing resources or application exceptions`,badResponses.length===0&&unexpectedFiles.length===0&&!errors.some(e=>e.startsWith(surface+':')),{badResponses,unexpectedFiles});
    if(offline)check('offline: gameplay requires no network beyond optional fonts',network.every(u=>/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)),network);
    await context.close();
  }
}catch(e){errors.push(e.stack);check('release candidate journey completed',false,e.message);}
finally{
  await browser?.close();const report={version,checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};
  writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors}));
  if(report.failed||errors.length||checks.length!==24)process.exitCode=1;
}
