// PROFILE SCENE (night list item 1). Mac measured 17–21 fps on PC in a home terrain sector and a boss fight.
// Rebuilds that scene (a modular battleship, a terrain sector with gas and rocks, a 20-ship fight, guns firing),
// runs the real requestAnimationFrame loop, and reports frame rate plus a CPU profile by self time.
//   node scripts/profile-scene.mjs [url]   (SCENE=boss for the Solar Dreadnought arena, SECONDS=6)
// Headless Chromium is not Mac's Firefox: the ranking is the evidence, the absolute fps is not his number.
import {chromium} from 'playwright';
import {writeFileSync,mkdirSync} from 'node:fs';
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/',SECONDS=+(process.env.SECONDS||6),SCENE=process.env.SCENE||'terrain';
mkdirSync('shots/profile',{recursive:true});
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForFunction(()=>window.terrain?.ready&&window.starterJourney?.ready);
await page.locator('#btn-menu-new').click();await page.locator('#title-callsign').fill('PROFILER');await page.locator('#btn-title-quick').click();await page.waitForTimeout(500);
const setup=await page.evaluate(scene=>{garage.closeMission();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});
  if(scene==='boss'){galaxy.enterSystemById('home');const b=Object.entries(window.BOSS_KEYS||{})[0];}
  else{galaxy.enterSystemById('home');worldMap.currentGridX=-3;worldMap.currentGridY=3;}
  engine.enterChamber({silent:true});const P=engine.player;P.iFrames=1e9;
  const f=terrain.current?.();
  window.__fill=()=>{while(engine.enemies.length<20){const a=Math.random()*6.28,d=500+Math.random()*700;const e=new EnemyOrganism(P.x+Math.cos(a)*d,P.y+Math.sin(a)*d,{tier:5,archetype:['stalker','charger','sniper','hive','mote'][engine.enemies.length%5]});e._aggro=true;engine.enemies.push(e);}};
  window.__fill();const up=engine.update.bind(engine);engine.update=function(dt){P.hp=P.maxHp;P.iFrames=1e9;engine.mouse.down=true;window.__fill();return up(dt);};
  engine.mouse.x=900;engine.mouse.y=300;engine.paused=false;
  return{sector:[worldMap.currentGridX,worldMap.currentGridY],R:worldMap.getCurrentChamber().radius,solids:f?.solids?.length,gas:f?.gas?.length,props:f?.props?.length,landmark:f?.landmark?.kind,enemies:engine.enemies.length};},SCENE);
console.log('SETUP',JSON.stringify(setup));
await page.waitForTimeout(1500);
const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});
await page.evaluate(()=>{window.__frames=[];let last=performance.now();const tick=t=>{window.__frames.push(t-last);last=t;window.__raf=requestAnimationFrame(tick);};window.__raf=requestAnimationFrame(tick);});
await cdp.send('Profiler.start');await page.waitForTimeout(SECONDS*1000);const {profile}=await cdp.send('Profiler.stop');
const frames=await page.evaluate(()=>{cancelAnimationFrame(window.__raf);const a=window.__frames.slice(5).sort((x,y)=>x-y);return{n:a.length,fps:+(1000/(a.reduce((s,v)=>s+v,0)/a.length)).toFixed(1),p50:+a[a.length>>1].toFixed(1),p95:+a[Math.floor(a.length*.95)].toFixed(1),proj:engine.projectiles.length,parts:particleSystem.particles.length,enemies:engine.enemies.length};});
await page.screenshot({path:`shots/profile/${SCENE}.png`});
// self time per function (sampled), grouped by function + file
const byId=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map();const dt=profile.timeDeltas;let total=0;
profile.samples.forEach((id,i)=>{const n=byId.get(id),f=n.callFrame,k=(f.functionName||'(anon)')+' '+(f.url.split('/').pop().split('?')[0]||f.url||'')+':'+(f.lineNumber+1);const d=dt[i]||0;total+=d;self.set(k,(self.get(k)||0)+d);});
const top=[...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,v])=>[k,+(100*v/total).toFixed(1)]);
const byFile=new Map();for(const [k,v] of self){const file=k.split(' ')[1]?.split(':')[0]||'?';byFile.set(file,(byFile.get(file)||0)+v);}
const files=[...byFile.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>[k,+(100*v/total).toFixed(1)]);
const report={scene:SCENE,setup,frames,files,top,errors};writeFileSync(`shots/profile/${SCENE}.json`,JSON.stringify(report,null,1));
console.log('FRAMES',JSON.stringify(frames));console.log('FILES');for(const [k,v] of files)console.log(String(v).padStart(6)+'%  '+k);console.log('TOP');for(const [k,v] of top)console.log(String(v).padStart(6)+'%  '+k);
if(errors.length)console.log('ERRORS',errors.slice(0,5));
await browser.close();
