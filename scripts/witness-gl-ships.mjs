// Route 4 stage 3 · 2.5D ships (js/gl-ships.js). Mac, 2026-10-30: "I want the game's ships maybe 2.5D". Faction hulls draw
// on the GPU between the world below ships and everything above them, lit by one sun fixed across the sector (so the lit
// side stays toward the sun whichever way a ship faces), with a shadow cast away from the sun; the switch falls back.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gl-ships';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1000,height:700}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(/gl-ships|engine fault/.test(m.text()))report.errors.push(m.text());});
try{
 await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready&&window.hostileSkins?.ready&&window.glShips?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('SHIPS');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 // the test browser's WebGL is software; players without a GPU stay on Canvas, the witness opts in
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();glShips.allowSoftware=true;});await p.waitForTimeout(400);
 // one faction hull alone at the centre of the screen, nothing else moving
 report.data.setup=await p.evaluate(()=>{garage.closeMission();garage.closeReward?.();let e=null;
  for(const s of galaxy.data.systems||galaxy.data){if(s.home||e)continue;galaxy.enterSystemById(s.id);for(let gx=-4;gx<=4&&!e;gx++)for(let gy=-4;gy<=4&&!e;gy++){worldMap.currentGridX=gx;worldMap.currentGridY=gy;const ch=worldMap.getCurrentChamber();if(!ch||ch.isHaven||ch.isBossSector)continue;engine.enterChamber({silent:true});e=engine.enemies.find(x=>x.faction&&hostileSkins.model(x)!==undefined||x.faction)||null;}}
  garage.closeMission();garage.closeReward?.();const P=engine.player;P.x=-5000;P.y=-5000;P.dead=false;e.x=0;e.y=0;e.update=()=>{};engine.enemies=[e];engine.projectiles=[];particleSystem.particles=[];
  const z=1.4;engine.camera.zoom=z;engine.camera.x=-500/z;engine.camera.y=-350/z;document.body.classList.add('reduced-motion');engine.paused=true;window.__e=e;return{faction:e.faction,arch:e.archetype};});
 // three frames per heading: empty, Canvas hull, GPU hull. The hull's own pixels (Canvas vs empty) are split by which side
 // of the hull's centre they lie on along the sun direction; the GPU must brighten the sun side more than the far side.
 await p.addStyleTag({content:'body *{visibility:hidden!important} canvas{visibility:visible!important}'});
 const frame=async(gpu,angle,show)=>{await p.evaluate(([gpu,angle,show])=>{menu.settings().gfxGpuShips=gpu;__e.angle=angle;glShips.settle();engine.enemies=show?[__e]:[];engine.render();engine.render();},[gpu,angle,show]);await p.waitForTimeout(200);return (await p.screenshot({clip:{x:250,y:100,width:500,height:500}})).toString('base64');};
 const light={};
 for(const a of [0,Math.PI/2,Math.PI]){const E=await frame(true,a,false),C=await frame(false,a,true),G=await frame(true,a,true);
  light[a.toFixed(2)]=await p.evaluate(async([E,C,G,sun])=>{const load=async s=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src='data:image/png;base64,'+s;});const c=document.createElement('canvas');c.width=c.height=500;const g=c.getContext('2d');g.drawImage(i,0,0);return g.getImageData(0,0,500,500).data;};
   const e=await load(E),c=await load(C),g=await load(G),L=(d,k)=>d[k]*.3+d[k+1]*.59+d[k+2]*.11;const pts=[];let sx=0,sy=0;
   for(let y=0;y<500;y++)for(let x=0;x<500;x++){const k=(y*500+x)*4;if(Math.abs(c[k]-e[k])+Math.abs(c[k+1]-e[k+1])+Math.abs(c[k+2]-e[k+2])>40){pts.push([x,y,L(g,k)-L(c,k)]);sx+=x;sy+=y;}}
   const cx=sx/pts.length,cy=sy/pts.length,l=Math.hypot(sun[0],sun[1]);let near=0,nn=0,far=0,nf=0;
   for(const [x,y,d] of pts){const s=((x-cx)*sun[0]+(y-cy)*sun[1])/l;if(s>4){near+=d;nn++;}else if(s<-4){far+=d;nf++;}}
   return{hull:pts.length,sunSide:+(near/nn).toFixed(2),farSide:+(far/nf).toFixed(2)};},[E,C,G,await p.evaluate(()=>glShips.SUN)]);}
 report.data.light=light;
 await p.evaluate(()=>{engine.enemies=[__e];menu.settings().gfxGpuShips=true;engine.render();});
 report.data.state=await p.evaluate(()=>({on:glShips.on,stats:glShips.stats}));await p.screenshot({path:`${out}/gpu.png`,clip:{x:300,y:150,width:400,height:400}});
 check('the GPU draws the faction hull',report.data.state.on&&report.data.state.stats.ships>=1,report.data.state);
 // the art's own painted light turns with the hull; at heading 0 it already agrees with the sun, so the gain there is small
 const L=Object.values(light),edge=L.reduce((s,v)=>s+v.sunSide-v.farSide,0)/L.length;
 check('the sun is fixed across the sector: at every heading the sun side gains at least as much light as the far side, and clearly more on average',L.every(v=>v.hull>2000&&v.sunSide>=v.farSide-0.5)&&edge>1,{edge:+edge.toFixed(2),light});
 // the shadow: pixels just beyond the hull, away from the sun, are darker with the GPU (measured on the heading-0 frames)
 const E0=await frame(true,0,false),C0=await frame(false,0,true),G0=await frame(true,0,true);
 report.data.shadow=await p.evaluate(async([E,C,G,sun])=>{const load=async s=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src='data:image/png;base64,'+s;});const c=document.createElement('canvas');c.width=c.height=500;const g=c.getContext('2d');g.drawImage(i,0,0);return g.getImageData(0,0,500,500).data;};
  const e=await load(E),c=await load(C),g=await load(G),L=(d,k)=>d[k]*.3+d[k+1]*.59+d[k+2]*.11;let darker=0,n=0;
  // background pixels (unchanged by the Canvas hull) that the GPU frame changed: the cast shadow
  for(let k=0;k<e.length;k+=4){if(Math.abs(c[k]-e[k])+Math.abs(c[k+1]-e[k+1])+Math.abs(c[k+2]-e[k+2])>12)continue;const d=L(g,k)-L(e,k);if(d<-3){darker++;}n++;}
  return{shadowPixels:darker};},[E0,C0,G0,await p.evaluate(()=>glShips.SUN)]);
 await p.evaluate(()=>{engine.enemies=[__e];});
 check('the hull casts a soft shadow onto the space below it',report.data.shadow.shadowPixels>300,report.data.shadow);
 report.data.off=await p.evaluate(()=>{menu.settings().gfxGpuShips=false;engine.render();return{on:glShips.on,layers:[glShips.under.style.display,document.getElementById('gl-ships').style.display]};});
 check('with the switch off the Canvas path draws and the GPU layers are hidden',!report.data.off.on&&report.data.off.layers.every(d=>d==='none'),report.data.off);
 report.data.setting=await p.evaluate(()=>{menu.settings().gfxGpuShips=true;menu.pause();document.getElementById('btn-pause-settings').click();return !!document.getElementById('set-gfxGpuShips');});
 check('Settings → Graphics has the GPU ships switch',report.data.setting,report.data.setting);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gl ships witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
