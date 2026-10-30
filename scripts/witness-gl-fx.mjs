// Route 4 stage 2 · GPU shots and particles (js/gl-fx.js). Mac, 2026-10-30: "how do we give sick graphics to this game".
// A frozen fight frame (shots of both sides, every particle type) drawn by the GPU must look like the Canvas frame, the
// switch must fall back, and Settings must hold the switch. Writes shots/gl-fx/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gl-fx';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const b=await firefox.launch(),p=await b.newPage({viewport:{width:1100,height:700}});const errs=report.errors;p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/gl-fx|engine fault/.test(m.text()))errs.push(m.text());});
try{
await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready&&window.glFx!==undefined);
await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('FX');await p.locator('#btn-title-quick').click();
await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();/* the test browser's WebGL is software; players without a GPU stay on Canvas, the witness opts in */glBackdrop.allowSoftware=true;glFx.allowSoftware=true;});await p.waitForTimeout(500);
await p.evaluate(()=>{garage.closeReward?.();garage.closeMission();galaxy.enterSystemById('home');worldMap.currentGridX=4;worldMap.currentGridY=-2;engine.enterChamber({silent:true});engine.enemies=[];engine.paused=false;document.body.classList.add('reduced-motion');
 const P=engine.player;P.x=P.y=0;engine.camera.x=-550/engine.camera.zoom;engine.camera.y=-350/engine.camera.zoom;
 // a fixed scene: shots of both sides and every particle type
 engine.projectiles=[];for(let i=0;i<14;i++){const a=i/14*6.28;engine.projectiles.push(new Projectile(Math.cos(a)*300,Math.sin(a)*300,Math.cos(a)*8,Math.sin(a)*8,{damage:1,radius:4+i%3*2,color:['#ff6a3d','#7fe0ff','#c4abff','#ffd36a'][i%4],isPlayer:i%2===0,life:200}));}
 particleSystem.particles=[];const T=['flash','ring','trail','spore','bubble'];for(let i=0;i<40;i++){const a=i/40*6.28,r=150+i*9;particleSystem.particles.push(new Particle(Math.cos(a)*r,Math.sin(a)*r,{vx:1e-6,vy:1e-6,radius:6+i%5*4,maxRadius:30,color:['#ff9e76','#5ef2e0','#fff3b0','#ff3366'][i%4],alpha:.9,type:T[i%5]}));}
 engine.paused=true;window.__render=()=>{engine.render();};});
await p.addStyleTag({content:'body *{visibility:hidden!important} canvas{visibility:visible!important}'});
const shot=async(on,bloom=false)=>{await p.evaluate(([on,bloom])=>{menu.settings().gfxGpuFx=on;menu.settings().gfxBloom=bloom;__render();},[on,bloom]);await p.waitForTimeout(250);await p.screenshot({path:`${out}/${on?(bloom?'bloom':'webgl'):'canvas'}.png`});return (await p.screenshot()).toString('base64');};
const g=await shot(true);report.data.gpu=await p.evaluate(()=>({on:glFx.on,instances:glFx.stats.instances,display:document.getElementById('gl-fx').style.display}));
const c=await shot(false);report.data.canvas=await p.evaluate(()=>({on:glFx.on,display:document.getElementById('gl-fx').style.display}));
check('the GPU draws every shot and particle of the frame in its batch',report.data.gpu.on&&report.data.gpu.instances>=60&&report.data.gpu.display==='block',report.data.gpu);
report.data.diff=(await p.evaluate(async([a,b])=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);r(g.getImageData(0,0,i.width,i.height).data);};i.src='data:image/png;base64,'+s;});
 const A=await load(a),B=await load(b);let sum=0,big=0;for(let i=0;i<A.length;i+=4){const d=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));sum+=d;if(d>40)big++;}return{mean:+(sum/(A.length/4)).toFixed(2),over40:big};},[g,c]));
// measured: mean ~0.4/255 (bubble shading differs slightly), outlines and positions identical
check('GPU shots and particles look like the Canvas ones (mean difference under 1.5 of 255)',report.data.diff.mean<1.5,report.data.diff);
check('with the switch off, the Canvas path draws and the GPU canvas is hidden',!report.data.canvas.on&&report.data.canvas.display==='none',report.data.canvas);
report.data.setting=await p.evaluate(()=>{menu.settings().gfxGpuFx=true;menu.pause();document.getElementById('btn-pause-settings').click();return !!document.getElementById('set-gfxGpuFx');});
check('Settings → Graphics has the GPU shots switch',report.data.setting,report.data.setting);
// bloom: the same frame with the halo pass must add light (and only add it)
const bl=await shot(true,true),plain=await shot(true,false);
report.data.bloom=await p.evaluate(async([a,b])=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);r(g.getImageData(0,0,i.width,i.height).data);};i.src='data:image/png;base64,'+s;});
 const A=await load(a),B=await load(b);let lift=0,darker=0;for(let i=0;i<A.length;i+=4){const d=(A[i]+A[i+1]+A[i+2])-(B[i]+B[i+1]+B[i+2]);if(d>0)lift+=d;else if(d<-6)darker++;}return{meanLift:+(lift/(A.length/4)).toFixed(2),darker,pixels:A.length/4};},[bl,plain]);
report.data.bloomRuns=await p.evaluate(()=>glFx.stats.bloom||0);
check('bloom lays a glow around shots and sparks: it only adds light',report.data.bloom.meanLift>1&&report.data.bloom.darker<report.data.bloom.pixels*0.005&&report.data.bloomRuns>0,report.data.bloom);
check('no application exceptions',errs.length===0,errs);
}catch(e){report.errors.push(e.stack||String(e));check('gl fx witness completed',false,String(e.message||e));}
finally{await b.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
