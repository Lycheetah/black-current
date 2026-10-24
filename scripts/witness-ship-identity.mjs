/* Native touch controls, isolated saves and the real Canvas renderer. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const {firefox}=await import(process.env.PLAYWRIGHT_PATH||'playwright');
const out='shots/ship-identity';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[]},check=(name,ok,detail=null)=>{report.checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok?'':': '+JSON.stringify(detail)}`);};
const url=process.env.GAME_URL||'http://127.0.0.1:8811/',browser=await firefox.launch();
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
await context.route('**/*',r=>r.request().url().startsWith(new URL(url).origin)?r.continue():r.abort());
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
const tap=async s=>{await page.locator(s).scrollIntoViewIfNeeded();await page.locator(s).tap();await page.waitForTimeout(80);};
async function reachable(ids){return page.evaluate(ids=>ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id,ok:r.width>0&&r.height>=36&&r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight&&(hit===e||e.contains(hit))};}),ids);}
try{
 await page.goto(url);await page.waitForFunction(()=>window.shipIdentity?.ready&&window.workshopLibrary?.ready&&window.armory?.ready&&sprites.ready);
 check('older ships retain their original rendering until styled',await page.evaluate(()=>!shipIdentity.style(saveState.doc.design)));
 await page.evaluate(()=>{document.getElementById('title-callsign').value='SHIPWRIGHT';garage.launch(false);garage.closeMission();engine.paused=true;engine.enemies=[];progression.totalMass=2500;saveState.doc.totalMass=2500;shipyard.show();});
 let reach=await reachable(['sy-style','sy-clear','sy-save','sy-fly','sy-my-builds']);
 check('portrait Style, New, Save, Fly and My builds are all reachable',reach.every(x=>x.ok),reach);
 await page.screenshot({path:out+'/workbench-portrait.png'});await tap('#sy-style');
 check('native Style ship button opens the appearance dialog',await page.locator('#ship-identity').isVisible());
 check('style choices include five finishes, eight paints, five markings and six layouts',await page.evaluate(()=>Object.keys(shipIdentity.SKINS).length===5&&Object.keys(shipIdentity.PAINTS).length===8&&Object.keys(shipIdentity.MARKS).length===5&&Object.keys(shipIdentity.LAYOUTS).length===6));
 await page.evaluate(()=>{shipyard.edit(()=>{shipyard.design.frame='JADE NEEDLE';shipyard.design.nodes=[{type:'core',dx:0,dy:0,radius:18},{type:'cannon',dx:38,dy:25,radius:6,weapon:'spitter'},{type:'cannon',dx:38,dy:-25,radius:6,weapon:'spitter'},{type:'pod',dx:-22,dy:25,radius:12},{type:'pod',dx:-22,dy:-25,radius:12},{type:'thruster',dx:-48,dy:0,radius:10}];shipyard.syncFields();});shipIdentity.update({skin:'swept',paint:'verdant',mark:'chevron'});});
 await page.locator('#identity-skin').selectOption('industrial');await page.locator('#identity-paint').selectOption('ember');await page.locator('#identity-mark').selectOption('bars');
 check('native finish, paint and marking selectors update the actual blueprint',await page.evaluate(()=>{const s=shipyard.design.identity;return s.skin==='industrial'&&s.paint==='ember'&&s.mark==='bars';}));
 await page.locator('#identity-accent').fill('#55ccaa');await page.locator('#identity-accent').dispatchEvent('input');
 check('custom accent is blueprint colour',await page.evaluate(()=>shipyard.design.color==='#55ccaa'));
 const variants=await page.evaluate(()=>{
   const summary=d=>JSON.stringify(d.nodes.map(({dx,dy,...n})=>n)),before=summary(shipyard.design),cash=hubs.metal,gp=progression.getTotalGP(),results=[];
   for(const k of Object.keys(shipIdentity.LAYOUTS)){shipIdentity.arrange(k);const nodes=shipyard.design.nodes;results.push({key:k,same:before===summary(shipyard.design),positions:JSON.stringify(nodes.map(n=>[n.dx,n.dy])),distinct:new Set(nodes.map(n=>`${n.dx},${n.dy}`)).size===nodes.length});}
   return {results,uncharged:cash===hubs.metal&&gp===progression.getTotalGP()};
 });
 check('all six layouts preserve every fitting and weapon',variants.results.every(x=>x.same),variants);
 check('six layouts create six different real node arrangements',new Set(variants.results.map(x=>x.positions)).size===6);
 check('layout tools do not stack parts on the same coordinates',variants.results.every(x=>x.distinct),variants.results);
 check('appearance and rearrangement grant no money or growth points',variants.uncharged);
 const before=await page.evaluate(()=>JSON.stringify(shipyard.design));await page.locator('#identity-layout').selectOption('delta');await tap('#identity-arrange');await tap('#identity-undo');
 check('native Undo restores the complete previous hull',await page.evaluate(before=>JSON.stringify(shipyard.design)===before,before));
 const pixels=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=340;c.height=280;const ctx=c.getContext('2d');
   function draw(nodes){ctx.clearRect(0,0,340,280);fluidShader.drawOrganismMembrane(ctx,170,140,0,18,nodes,'#55ccaa',{});return c.toDataURL();}
   const enemy=[{type:'core',dx:0,dy:0,currentDx:0,currentDy:0,radius:18},{type:'cannon',dx:32,dy:20,currentDx:32,currentDy:20,radius:10}];
   const a=draw(enemy);shipIdentity.update({skin:'organic',paint:'orchid',mark:'cross'});const b=draw(enemy);
   const images=[];for(const skin of Object.keys(shipIdentity.SKINS)){shipIdentity.update({skin});images.push(document.getElementById('identity-preview').toDataURL());}
   return {enemySame:a===b,skinCount:new Set(images).size};
 });
 check('styling the player leaves enemy pixels unchanged',pixels.enemySame);
 check('each of the five finishes produces different rendered pixels',pixels.skinCount===5,pixels);
 const robustness=await page.evaluate(()=>{
   const d={identity:{v:1,skin:'__proto__',paint:'bogus',mark:'constructor',layout:'oops'}};
   const safe=shipIdentity.style(d),draw=sprites.draw,underlay=sprites.underlay,chassis=sprites.chassis;
   let caught=false;sprites.draw=()=>{throw new Error('planted render failure');};
   try{const c=document.createElement('canvas');fluidShader.drawOrganismMembrane(c.getContext('2d'),0,0,0,18,shipyard.renderNodes(),'#55ccaa',{});}catch(e){caught=e.message==='planted render failure';}finally{sprites.draw=draw;}
   return {safe:safe.skin==='faceted'&&safe.paint==='glacier'&&safe.mark==='stripes',restored:caught&&sprites.underlay===underlay&&sprites.chassis===chassis};
 });
 check('unknown imported styles fall back to valid finishes',robustness.safe);
 check('a planted renderer failure restores shared sprite switches',robustness.restored);
 await page.locator('#identity-skin').selectOption('swept');await page.locator('#identity-paint').selectOption('verdant');await page.locator('#identity-mark').selectOption('chevron');await page.locator('#identity-layout').selectOption('needle');await tap('#identity-arrange');
 await page.screenshot({path:out+'/style-portrait.png'});await tap('#identity-save');
 const saved=await page.evaluate(()=>JSON.stringify(shipyard.design));
 check('native Save build stores the full identity and geometry',await page.evaluate(()=>{const d=saveState.doc.workshop.builds[shipyard.design.id];return JSON.stringify(d)===JSON.stringify(shipyard.design)&&d.identity.paint==='verdant';}));
 await tap('#identity-close');await tap('#sy-my-builds');await tap('#my-build-list button:text-is("Load build")');
 check('native library load restores style and real fitting positions',await page.evaluate(d=>JSON.stringify(shipyard.design)===d,saved));
 check('styled build passes the actual fitting limits',await page.evaluate(()=>!fitting.check(shipyard.design)),await page.evaluate(()=>fitting.check(shipyard.design)));
 const flightStats=await page.evaluate(()=>{const d=JSON.parse(JSON.stringify(shipyard.design));delete d.identity;engine.applyDesign(d,{restore:true});const before=[engine.player.maxHp,hardpoints.damageScale(engine.player),progression.getTotalGP()];return before;});
 await tap('#sy-fly');
 check('native Fly applies the chosen identity to the flying ship',await page.evaluate(()=>!shipyard.open&&saveState.doc.design.identity?.paint==='verdant'&&engine.player.nodes.length===6));
 check('cosmetic identity does not change HP, weapon damage or GP',await page.evaluate(before=>JSON.stringify(before)===JSON.stringify([engine.player.maxHp,hardpoints.damageScale(engine.player),progression.getTotalGP()]),flightStats));
 await page.evaluate(()=>{engine.player.x=650;engine.player.y=300;engine.player.vx=0;engine.player.vy=0;engine.camera.x=650-innerWidth/(2*engine.camera.zoom);engine.camera.y=300-innerHeight/(2*engine.camera.zoom);engine.paused=true;});await page.screenshot({path:out+'/flight-portrait.png'});
 await page.reload();await page.waitForFunction(()=>shipIdentity.ready);await tap('#btn-title-continue');
 const restored=await page.evaluate(()=>({paint:saveState.doc.design.identity?.paint,nodes:engine.player.nodes.length}));
 check('flight identity survives reload and native Continue through save sanitization',restored.paint==='verdant'&&restored.nodes===6,restored);
 await page.evaluate(()=>{garage.closeMission();engine.paused=true;shipyard.show();});await tap('#sy-style');
 check('workshop draft preserves identity after reload',await page.evaluate(()=>shipyard.design.identity.paint==='verdant'&&shipyard.design.nodes.length===6));
 await page.keyboard.press('Escape');check('Escape closes appearance while keeping the workbench open',!await page.locator('#ship-identity').isVisible()&&await page.evaluate(()=>shipyard.open));await tap('#sy-style');
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);await page.screenshot({path:out+'/style-landscape.png'});
 let r=await reachable(['identity-close']);check('landscape appearance dialog has a reachable Back control',r.every(x=>x.ok),r);
 await tap('#identity-close');await page.waitForTimeout(100);reach=await reachable(['sy-style','sy-clear','sy-save','sy-fly','sy-my-builds']);
 check('landscape workbench action buttons are reachable',reach.every(x=>x.ok),reach);
 await page.setViewportSize({width:1365,height:900});await tap('#sy-style');await page.screenshot({path:out+'/style-desktop.png'});
 const hidden=await page.evaluate(()=>{const p=document.getElementById('ship-identity'),before=p.hidden;p.hidden=true;return before;});
 check('visibility gate catches a planted hidden appearance dialog',!await page.locator('#ship-identity').isVisible());await page.evaluate(v=>{document.getElementById('ship-identity').hidden=v;},hidden);
 const standalone=await context.newPage();standalone.on('pageerror',e=>report.errors.push(e.message));await standalone.goto(url+'dist/black-current.html');await standalone.waitForFunction(()=>window.shipIdentity?.ready);check('rebuilt standalone installs ship identity',await standalone.evaluate(()=>Object.keys(shipIdentity.PAINTS).length===8));await standalone.close();
 check('six reserved combat and progression sources remain unchanged',['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].every(f=>readFileSync(`js/${f}.js`,'utf8')===execFileSync('git',['show',`HEAD:js/${f}.js`],{encoding:'utf8'})));
 await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='identity-gallery';c.width=1080;c.height=720;c.style.cssText='position:fixed;left:0;top:0;width:1080px;height:720px;z-index:12000';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#08111c';ctx.fillRect(0,0,c.width,c.height);
   const variants=[['needle','swept','glacier'],['delta','faceted','crimson'],['broadside','industrial','ivory'],['crescent','organic','orchid'],['trident','ribbed','ember'],['orbital','faceted','verdant']];
   variants.forEach(([layout,skin,paint],i)=>{shipIdentity.update({skin,paint,mark:i%2?'stripes':'chevron'});shipIdentity.arrange(layout);const x=(i%3)*360,y=Math.floor(i/3)*360;ctx.fillStyle='#10202e';ctx.fillRect(x+8,y+8,344,344);ctx.fillStyle=shipIdentity.PAINTS[paint][2];ctx.font='bold 20px system-ui';ctx.fillText(shipIdentity.LAYOUTS[layout],x+22,y+39);ctx.fillStyle='#9db4c5';ctx.font='13px system-ui';ctx.fillText(shipIdentity.SKINS[skin]+' / '+shipIdentity.PAINTS[paint][0],x+22,y+63);ctx.save();ctx.translate(x+180,y+218);const scale=Math.min(2,98/Math.max(40,shipyard.reach()));ctx.scale(scale,scale);const nodes=shipyard.renderNodes();fluidShader.drawOrganismMembrane(ctx,0,0,0,18,nodes,shipyard.design.color,{});ctx.restore();});
 });await page.locator('#identity-gallery').screenshot({path:out+'/six-ships.png'});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('witness completed',false,e.message);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors}));await browser.close();}
if(report.failed||report.errors.length)process.exitCode=1;
