// Route 4 stage 1 · the WebGL backdrop (js/gl-backdrop.js). Mac, 2026-10-30: "fps is insanely bad … how do we give sick
// graphics to this game". The far and near backdrop moves to the GPU, on a canvas under the game canvas; the look must
// stay the Canvas look, and the Canvas path must still run when the switch is off. Writes shots/gl-backdrop/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gl-backdrop';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1100,height:700}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
p.on('console',m=>{if(/gl-backdrop|engine fault/.test(m.text()))report.errors.push(m.text());});
try{
 await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready&&window.glBackdrop!==undefined);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('GPU');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();});await p.waitForTimeout(500);
 // the test browser's WebGL is software (SwiftShader); real players without a GPU stay on Canvas, the witness opts in
 report.data.software=await p.evaluate(()=>{const s=glBackdrop.software;glBackdrop.allowSoftware=true;return s;});
 // only the canvases are compared: the HUD and cards are DOM
 await p.addStyleTag({content:'body *{visibility:hidden!important} canvas{visibility:visible!important}'});
 const shot=async gpu=>{await p.evaluate(gpu=>{garage.closeReward?.();garage.closeMission();menu.settings().gfxGpu=gpu;document.body.classList.add('reduced-motion');
   galaxy.enterSystemById('home');worldMap.currentGridX=4;worldMap.currentGridY=-2;engine.enterChamber({silent:true});engine.enemies=[];engine.projectiles=[];engine.paused=false;},gpu);
  await p.waitForTimeout(500);
  await p.evaluate(()=>{garage.closeReward?.();garage.closeMission();engine.paused=true;const P=engine.player;P.x=P.y=0;P.vx=P.vy=0;engine.camera.x=-260;engine.camera.y=-320;engine._needsRender=true;});await p.waitForTimeout(400);
  const png=await p.screenshot();await p.screenshot({path:`${out}/${gpu?'webgl':'canvas'}.png`});
  return{png:png.toString('base64'),state:await p.evaluate(()=>({ready:glBackdrop.ready,active:glBackdrop.active,frames:glBackdrop.stats.frames,display:document.getElementById('gl-backdrop')?.style.display}))};};
 const gl=await shot(true),cv=await shot(false);
 report.data.gl=gl.state;report.data.canvas=cv.state;
 check('the GPU backdrop is ready and draws the backdrop under the game canvas',gl.state.ready&&gl.state.active&&gl.state.frames>0&&gl.state.display==='block',gl.state);
 // compare the two frames: the same backdrop, give or take the drifting motes
 report.data.diff=await p.evaluate(async([a,b])=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);r(g.getImageData(0,0,i.width,i.height).data);};i.src='data:image/png;base64,'+s;});
  const A=await load(a),B=await load(b);let sum=0,big=0;for(let i=0;i<A.length;i+=4){const d=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));sum+=d;if(d>24)big++;}
  return{mean:+(sum/(A.length/4)).toFixed(2),over24:+(big/(A.length/4)).toFixed(4)};},[gl.png,cv.png]);
 // measured: mean ~5/255, from the GPU blending the light shafts and dust a touch brighter; outlines and layout identical
 check('the GPU backdrop looks like the Canvas backdrop (mean difference under 7 of 255, under 3% of pixels differ by more than 24)',report.data.diff.mean<7&&report.data.diff.over24<0.03,report.data.diff);
 check('with the switch off, the Canvas path draws and the GPU canvas is hidden',!cv.state.active&&cv.state.display==='none',cv.state);
 await p.evaluate(()=>{menu.settings().gfxGpu=true;});
 report.data.setting=await p.evaluate(()=>{menu.pause();document.getElementById('btn-pause-settings').click();return !!document.getElementById('set-gfxGpu');});
 check('Settings → Graphics has the GPU backdrop switch',report.data.setting,report.data.setting);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gl backdrop witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
