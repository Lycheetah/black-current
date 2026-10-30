// Route 4 item 4 · fitting zoom (js/fitting-zoom.js). Mac, 2026-10-30: "on mobile you cannot see the ship fitting screen
// properly … the ship is too zoomed in so we need pinch to zoom". Pinch zooms, one finger pans, a pan is never a slot tap,
// a plain tap still picks a section, the buttons work, and the desktop wheel zooms. Writes shots/fitting-zoom/.
import {firefox,devices} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/fitting-zoom';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const open=async opts=>{const c=await browser.newContext(opts),p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.fittingZoom?.ready&&window.starterJourney?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ZOOM');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();});await p.waitForTimeout(400);
 await p.evaluate(()=>{garage.closeMission();garage.closeReward?.();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});bay.show();});await p.waitForTimeout(700);return{c,p};};
// synthetic pointers on the stage (two fingers at once, which the test runner's tap cannot do)
const ptr=(p,type,id,x,y)=>p.evaluate(([type,id,x,y])=>{const s=document.getElementById('modular-stage'),r=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:r.left+x,clientY:r.top+y,bubbles:true,cancelable:true,pointerType:'touch'}));},[type,id,x,y]);
try{
 const {c,p}=await open({...devices['iPhone 13'],hasTouch:true});
 report.data.start=await p.evaluate(()=>({k:fittingZoom.k,controls:document.querySelectorAll('#modular-stage .fit-zoom button').length}));
 check('the stage opens fitted to the whole hull, with − / Fit / + in its corner',report.data.start.k===1&&report.data.start.controls===3,report.data.start);
 // pinch out: two fingers from 60 px apart to 180 px apart
 await ptr(p,'pointerdown',1,150,150);await ptr(p,'pointerdown',2,210,150);
 for(let i=1;i<=6;i++){await ptr(p,'pointermove',1,150-i*10,150);await ptr(p,'pointermove',2,210+i*10,150);}
 await ptr(p,'pointerup',1,90,150);await ptr(p,'pointerup',2,270,150);
 report.data.pinch=await p.evaluate(()=>({k:+fittingZoom.k.toFixed(2),transform:document.querySelector('.modular-scene').style.transform}));
 await p.screenshot({path:`${out}/pinched.png`});
 check('pinching out zooms the ship in (about 3×)',report.data.pinch.k>2.5&&/scale/.test(report.data.pinch.transform),report.data.pinch);
 // pan with one finger: the view moves and the click it ends in does not pick a section
 const before=await p.evaluate(()=>document.querySelector('.modular-scene').style.transform);
 await p.evaluate(()=>{window.__picked=0;const st=document.getElementById('modular-stage');st.addEventListener('click',e=>{if(e.target.closest('[data-section]'))window.__picked++;});});
 await ptr(p,'pointerdown',3,180,160);for(let i=1;i<=5;i++)await ptr(p,'pointermove',3,180-i*12,160-i*6);await ptr(p,'pointerup',3,120,130);
 await p.evaluate(()=>{const s=document.querySelector('#modular-stage [data-section]');s.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});
 report.data.pan={moved:before!==await p.evaluate(()=>document.querySelector('.modular-scene').style.transform),picked:await p.evaluate(()=>window.__picked)};
 check('one finger pans the zoomed ship, and the pan is not a slot tap',report.data.pan.moved&&report.data.pan.picked===0,report.data.pan);
 // the buttons
 await p.locator('#modular-stage .fit-zoom [data-zoom=fit]').click();const fit=await p.evaluate(()=>fittingZoom.k);
 await p.locator('#modular-stage .fit-zoom [data-zoom=in]').click();const zin=await p.evaluate(()=>fittingZoom.k);
 report.data.buttons={fit,zin};check('Fit returns to the whole hull and + zooms in',fit===1&&zin>1.3,report.data.buttons);
 // a plain tap still picks a section (on phone it then opens the Fit tab)
 report.data.tap=await p.evaluate(()=>{const s=[...document.querySelectorAll('#modular-stage [data-section]')].at(-1),id=s.dataset.section;s.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return{id,picked:window.__picked,sel:document.querySelector(`#modular-stage [data-section="${id}"] rect`)?.getAttribute('stroke')};});
 check('a plain tap still picks a section',report.data.tap.picked===1&&report.data.tap.sel==='#f4deaa',report.data.tap);
 await c.close();
 // desktop: the wheel zooms around the cursor
 const d=await open({viewport:{width:1366,height:768}});const box=await d.p.locator('#modular-stage').boundingBox();
 await d.p.mouse.move(box.x+box.width/2,box.y+box.height/2);await d.p.mouse.wheel(0,-400);await d.p.waitForTimeout(200);
 report.data.wheel=await d.p.evaluate(()=>fittingZoom.k);check('desktop: the mouse wheel zooms',report.data.wheel>1.3,report.data.wheel);
 await d.c.close();
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('fitting zoom witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
