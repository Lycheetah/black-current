// Overnight run step 15 · the feel pass (js/gun-feel.js): muzzle flashes, recoil and gun kick, spent casings, kill
// debris. Proves each effect fires from the real hooks, stays inside its pool, respects Reduced motion and stays cheap
// to draw. Writes shots/gun-feel/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/gun-feel';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.gunFeel?.ready&&window.arsenal?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('RECOIL');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();engine.paused=false;engine.enemies=[];terrain.off=true;});
 const pick=`const pick=(fam,c)=>Object.keys(arsenal.GUNS).find(k=>{const g=arsenal.GUNS[k];return g.family===fam&&g.c===c&&!g.retired&&!g.special&&WEAPON_TYPES[k];});
  const shoot=(w,angle=0,n=1)=>{const P=engine.player;engine.fireMountGroup(w,Array.from({length:n},(_,i)=>({x:P.x,y:P.y+i*20,angle,radius:10,turret:{node:{type:'cannon',weapon:w}}})),1);};
  const clear=()=>{const F=gunFeel;F.flashes.length=F.casings.length=F.debris.length=0;engine.projectiles=[];};`;
 const run=body=>p.evaluate(`(()=>{${pick}${body}})()`);
 // 1 · flashes and casings, by family
 report.data.fire=await run(`;clear();const shell=pick('kinetic',3),beam=pick('beam',3);shoot(shell,0,3);const a={flashes:gunFeel.flashes.length,casings:gunFeel.casings.length,color:gunFeel.flashes[0]?.color};clear();shoot(beam,0,3);const b={flashes:gunFeel.flashes.length,casings:gunFeel.casings.length};clear();return{shell,beam,a,b};`);
 const F=report.data.fire;
 check('every gun that fires throws a muzzle flash in its family tint; shell guns eject a casing, beams do not',F.a.flashes===3&&F.a.casings===3&&F.a.color==='#ffcf7a'&&F.b.flashes===3&&F.b.casings===0,F);
 // 2 · effects age out on the sim clock
 report.data.age=await run(`;clear();shoot(pick('kinetic',2),0,2);const P=engine.player;const n0=gunFeel.flashes.length;for(let i=0;i<6;i++)engine.update(1/60);const flash=gunFeel.flashes.length;for(let i=0;i<gunFeel.CFG.casingFrames;i++)engine.update(1/60);return{n0,flash,casings:gunFeel.casings.length};`);
 check('flashes last a few frames and casings drift out within their life',report.data.age.n0===2&&report.data.age.flash===0&&report.data.age.casings===0,report.data.age);
 // 3 · recoil: along the barrel, scaled by gun class and frame mass; none under Reduced motion
 report.data.recoil=await run(`;const P=engine.player,kick=(w,ang)=>{P.vx=P.vy=0;gunFeel.fired(w,[{x:P.x,y:P.y,angle:ang,radius:10}]);return{vx:P.vx,vy:P.vy};};
  const light=kick(pick('kinetic',1),0),heavy=kick(pick('kinetic',4),0),up=kick(pick('rail',3),Math.PI/2),beam=kick(pick('beam',4),0);
  const hb=fleet.hullBand;fleet.hullBand=()=>({cls:'TITAN'});const titan=kick(pick('kinetic',4),0);fleet.hullBand=()=>({cls:'FRIGATE'});const frigate=kick(pick('kinetic',4),0);fleet.hullBand=hb;
  const s=menu.settings;menu.settings=()=>({...s(),reducedMotion:true});const calm=kick(pick('kinetic',4),0);menu.settings=s;P.vx=P.vy=0;return{light,heavy,up,beam,titan,frigate,calm};`);
 const R=report.data.recoil;
 check('recoil pushes the hull back along the barrel, harder for heavier guns; beams have none',R.light.vx<0&&R.heavy.vx<R.light.vx&&R.up.vy<0&&Math.abs(R.up.vx)<1e-9&&R.beam.vx===0,R);
 check('a titan feels half the shove a frigate does, and Reduced motion removes it',Math.abs(R.titan.vx/R.frigate.vx-0.5)<0.01&&R.calm.vx===0,R);
 // 4 · heavy guns kick the camera, through JUICE
 report.data.kick=await run(`;const P=engine.player;engine.shake=0;gunFeel.fired(pick('kinetic',1),[{x:P.x,y:P.y,angle:0,radius:10}]);const light=engine.shake;engine.shake=0;gunFeel.fired(pick('ordnance',4),[{x:P.x,y:P.y,angle:0,radius:10}]);const heavy=engine.shake;
  const j=JUICE.shake;JUICE.shake=0;engine.shake=0;gunFeel.fired(pick('ordnance',4),[{x:P.x,y:P.y,angle:0,radius:10}]);const off=engine.shake;JUICE.shake=j;engine.shake=0;P.vx=P.vy=0;return{light,heavy,off};`);
 check('heavy-class guns kick the camera and light guns do not; Screen shake off silences it',report.data.kick.light===0&&report.data.kick.heavy>0&&report.data.kick.off===0,report.data.kick);
 // 5 · kill debris
 report.data.debris=await run(`;clear();const P=engine.player,e=new EnemyOrganism(P.x+400,P.y,{tier:5,archetype:'stalker'});engine.enemies.push(e);e.hp=0;engine.killEnemy(engine.enemies.indexOf(e));
  const n=gunFeel.debris.length,near=gunFeel.debris.every(d=>Math.hypot(d.x-e.x,d.y-e.y)<600),hot=gunFeel.debris[0]?.t;for(let i=0;i<gunFeel.CFG.debrisFrames;i++)engine.update(1/60);return{n,near,hot,left:gunFeel.debris.length};`);
 check('a kill sheds 5–12 spinning plates at the wreck, and they are gone within their life',report.data.debris.n>=5&&report.data.debris.n<=12&&report.data.debris.near&&report.data.debris.left===0,report.data.debris);
 // 6 · bounded pools under a long barrage, and the draw stays cheap
 report.data.load=await run(`;clear();const w=pick('kinetic',3),o=pick('ordnance',3);for(let i=0;i<400;i++){shoot(i%2?w:o,i*.1,6);}
  for(let i=0;i<40;i++){const e=new EnemyOrganism(engine.player.x+300,engine.player.y,{tier:4,archetype:'stalker'});engine.enemies.push(e);e.hp=0;engine.killEnemy(engine.enemies.indexOf(e));}
  const sizes={flashes:gunFeel.flashes.length,casings:gunFeel.casings.length,debris:gunFeel.debris.length};
  engine.player.iFrames=0;for(let i=0;i<10;i++)engine.render();
  /* alternate full and empty pools, best of three 20-frame rounds each, so warm-up and scheduler stalls do not read as cost */
  const keep=[[...gunFeel.flashes],[...gunFeel.casings],[...gunFeel.debris]],fill=on=>{gunFeel.flashes.length=gunFeel.casings.length=gunFeel.debris.length=0;if(on){gunFeel.flashes.push(...keep[0]);gunFeel.casings.push(...keep[1]);gunFeel.debris.push(...keep[2]);}};
  const round=()=>{const t0=performance.now();for(let i=0;i<20;i++)engine.render();return(performance.now()-t0)/20;};let full=1e9,bare=1e9;
  for(let r=0;r<3;r++){fill(true);full=Math.min(full,round());fill(false);bare=Math.min(bare,round());}fill(true);engine.render();return{sizes,full:+full.toFixed(2),bare:+bare.toFixed(2),extra:+(full-bare).toFixed(2)};`);
 await p.screenshot({path:`${out}/barrage.png`});
 const L=report.data.load;console.log('load',JSON.stringify(L));
 check('pools stay bounded under a 2,400-shot barrage and 40 kills',L.sizes.flashes<=64&&L.sizes.casings<=140&&L.sizes.debris<=64,L);
 check('full pools add under 4 ms a frame to the render',L.extra<4,L);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('gun feel witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
