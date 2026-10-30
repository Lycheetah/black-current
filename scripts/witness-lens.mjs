// Route 2 Stage 1 · ship lens: on touch screens a close-up circle over your ship when it is small on screen.
// Writes shots/lens/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/lens';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,600)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const boot=async(viewport,touch)=>{const context=await browser.newContext({viewport,hasTouch:touch}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(url);await p.waitForFunction(()=>window.shipLens?.ready);await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('LENS');await p.locator('#btn-title-quick').click();await p.waitForTimeout(300);
 await p.evaluate(()=>{garage.closeMission();movementFeel.zoom=0.22;civilisations.goHome();worldMap.currentGridX=2;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.player.iFrames=0;engine.paused=false;});await p.waitForTimeout(1500);return{context,p};};
// Mean brightness inside the lens circle versus the same ring just outside it.
const sample=p=>p.evaluate(()=>{const g=shipLens.geometry()||{sx:engine.viewportWidth/2,sy:engine.viewportHeight/2,R:74};const d=engine.ctx.getImageData(Math.round(g.sx-g.R*0.6),Math.round(g.sy-g.R*0.6),Math.round(g.R*1.2),Math.round(g.R*1.2)).data;let lit=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>240)lit++;return{lit,alpha:shipLens.alpha,g:shipLens.geometry()};});
// best of three 20-frame rounds: one scheduler stall in a busy gate run must not read as lens cost
const frameCost=p=>p.evaluate(()=>{let best=1e9;for(let r=0;r<3;r++){const t0=performance.now();for(let i=0;i<20;i++)engine.render();best=Math.min(best,(performance.now()-t0)/20);}return best;});
try{
 {const {context,p}=await boot({width:390,height:844},true);
  const on=report.data.phone=await sample(p);await p.screenshot({path:`${out}/phone-frigate.png`});
  check('phone: a frigate zoomed out gets a lens that magnifies it at least 2×',on.g&&on.g.mag>=2&&on.alpha>0.9,on);
  const t=await frameCost(p);
  await p.evaluate(()=>{menu.settings().shipLens=false;});await p.waitForTimeout(800);
  const off=report.data.phoneOff=await sample(p);const t2=await frameCost(p);
  report.data.cost={withLens:t,without:t2};
  check('phone: the lens draws real ship pixels and Settings turns it off',on.lit>off.lit*1.3&&off.alpha<0.05,{on:on.lit,off:off.lit,alpha:off.alpha});
  check('phone: the lens adds under 4 ms to a frame',t-t2<4,report.data.cost);
  await p.evaluate(()=>{menu.settings().shipLens=true;const c=modularShips.compile(modularShips.factory('athanor'));engine.applyDesign(c.design,{restore:true});movementFeel.zoom=0.4;});await p.waitForTimeout(1500);
  const titan=report.data.titan=await p.evaluate(()=>({g:shipLens.geometry(),onScreen:roomScale.shipLength()*engine.camera.zoom,min:shipLens.CFG.minHull}));
  check('phone: a titan already large on screen gets no lens',!titan.g&&titan.onScreen>=titan.min,titan);
  await context.close();}
 {const {context,p}=await boot({width:1366,height:768},false);
  const desk=report.data.desk=await p.evaluate(()=>({g:!!shipLens.geometry(),enabled:shipLens.enabled(),alpha:shipLens.alpha}));
  check('desktop: no lens (mouse players zoom with the wheel)',!desk.enabled&&desk.alpha<0.05,desk);
  await context.close();}
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('lens witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
