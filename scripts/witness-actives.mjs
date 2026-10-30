// Route 4 item 3 · actives (js/actives.js). Mac, 2026-10-30: "I think we may need actives to make this game fun".
// Every ship has an afterburner on G; up to three fitted active modules fire on H, J and K (buttons on phone).
// Each is a measured effect on the real ship. Writes shots/actives/.
import {firefox,devices} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/actives';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const start=async(ctx,name)=>{const p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));await p.goto(url);await p.waitForFunction(()=>window.actives?.ready&&window.starterJourney?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ACTIVE');await p.locator('#btn-title-quick').click();
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();});await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeReward?.();garage.closeMission();galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=0;engine.enterChamber({silent:true});engine.enemies=[];engine.paused=false;contactDirector.pace=()=>({quietTicks:1e9,minimumGap:1e9,hulls:0});});return p;};
const step=(p,n)=>p.evaluate(n=>{for(let i=0;i<n;i++){engine.paused=false;engine.mapOpen=false;engine.update(1/60);}},n);
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:700}}),p=await start(ctx,'desk');
 // 1 · the built-in afterburner on Z
 const t0=await p.evaluate(()=>engine.coreMod('thrust'));await p.keyboard.press('KeyG');await step(p,2);
 report.data.burn={before:t0,during:await p.evaluate(()=>engine.coreMod('thrust')),slots:await p.evaluate(()=>actives.slots())};
 await p.keyboard.press('KeyG');report.data.burn.fired=await p.evaluate(()=>actives.stats.fired.afterburner);
 await step(p,5*60+5);report.data.burn.after=await p.evaluate(()=>engine.coreMod('thrust'));
 check('every ship has an afterburner on G: +80% thrust for 5 s, then a cooldown',report.data.burn.slots[0]==='afterburner'&&Math.abs(report.data.burn.during/t0-1.8)<0.01&&report.data.burn.fired===1&&Math.abs(report.data.burn.after-t0)<1e-9,report.data.burn);
 // 2 · fitted active modules join the bar on X, C, V in fitting order; the shop sells them
 report.data.fit=await p.evaluate(()=>{const M=modularShips,d=saveState.doc.design,u=d.modular.fittings;
  const slotsFree=M.compile(d).design;const ids=['active-booster','active-emp','active-overload'];
  /* the starter has few utility slots: fit the three actives in place of its fittings for the test, as the yard would */
  d.modular.fittings=[...u.filter(f=>!/^active-/.test(f.gear)),...ids.map((gear,i)=>({slot:'test-'+i,gear,mk:1}))];
  return{slots:actives.slots(),shop:ids.every(id=>!!M.GEARS[id]?.cost)};});
 check('fitted active modules join the bar on H, J and K in fitting order, and the shop sells them',JSON.stringify(report.data.fit.slots)===JSON.stringify(['afterburner','booster','emp','overload'])&&report.data.fit.shop,report.data.fit);
 // 3 · each fitted active does its job
 report.data.fx=await p.evaluate(()=>{const P=engine.player;P.shieldHp=0;const sh0=P.shieldHp;
  /* an empty sector shows its reward card, which pauses the game: close it before each key */
  const go=()=>{garage.closeReward?.();garage.closeMission();engine.paused=false;engine.mapOpen=false;};go();
  const kx=new KeyboardEvent('keydown',{code:'KeyH'});window.dispatchEvent(kx);const boost=P.shieldHp-sh0;
  for(let i=0;i<3;i++){const e=new EnemyOrganism(P.x+200+i*40,P.y,{tier:3,archetype:'stalker'});engine.enemies.push(e);}
  for(let i=0;i<4;i++)engine.projectiles.push(new Projectile(P.x+150,P.y+i*20,0,0,{damage:5,radius:4,isPlayer:false,life:300}));
  const hp=engine.enemies.map(e=>e.hp);go();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyJ'}));
  const shotsLeft=engine.projectiles.filter(q=>!q.isPlayer).length,stunned=engine.enemies.filter(e=>e._stunUntil>actives.frame).length,burned=engine.enemies.filter((e,i)=>e.hp<hp[i]).length;
  const d0=hardpoints.damageScale(P),i0=hardpoints._intervalFor(P,P.nodes.find(n=>n.type==='cannon')||{weapon:P.primaryWeapon});
  go();window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyK'}));
  const d1=hardpoints.damageScale(P),i1=hardpoints._intervalFor(P,P.nodes.find(n=>n.type==='cannon')||{weapon:P.primaryWeapon});
  return{boost:Math.round(boost),hull:P.maxHp,shotsLeft,stunned,burned,overload:+(d1/d0).toFixed(3),interval:[i0,i1]};});
 const F=report.data.fx;
 check('Shield booster (H) adds a burst of shield worth at least 20% of hull',F.boost>=F.hull*0.2-1,F);
 check('EMP burst (J) clears enemy shots near you, stuns the hulls in reach and burns them',F.shotsLeft===0&&F.stunned===3&&F.burned===3,F);
 check('Overload (K) makes the guns hit 35% harder and cycle faster',F.overload===1.35&&F.interval[1]<F.interval[0],F);
 report.data.stun=await p.evaluate(()=>{garage.closeReward?.();garage.closeMission();const e=engine.enemies[0],x=e.x,y=e.y;for(let i=0;i<30;i++){engine.paused=false;engine.update(1/60);}return{moved:Math.round(Math.hypot(e.x-x,e.y-y)),shots:engine.projectiles.filter(q=>!q.isPlayer).length};});
 check('a stunned hull drifts without firing',report.data.stun.shots===0,report.data.stun);
 // 4 · the HUD bar
 report.data.bar=await p.evaluate(()=>[...document.querySelectorAll('#active-bar .active-btn')].map(b=>({id:b.dataset.active,key:b.querySelector('.active-key').textContent,vis:b.offsetParent!==null})));
 await p.screenshot({path:`${out}/desktop.png`});
 check('the HUD shows the four actives with their keys',report.data.bar.length===4&&report.data.bar.every(b=>b.vis)&&report.data.bar.map(b=>b.key).join('')==='GHJK',report.data.bar);
 await ctx.close();
 // 5 · phone: the same buttons, tappable
 const phone=await browser.newContext({...devices['iPhone 13'],hasTouch:true}),q=await start(phone,'phone');
 const box=await q.locator('#active-bar .active-btn').first().boundingBox();await q.locator('#active-bar .active-btn').first().tap();
 report.data.phone={box,fired:await q.evaluate(()=>actives.stats.fired.afterburner||0),inView:box&&box.y+box.height<=await q.evaluate(()=>innerHeight)};
 await q.screenshot({path:`${out}/phone.png`});
 check('phone: the afterburner is a 44 px button that fires on a tap',report.data.phone.fired===1&&box.width>=44&&report.data.phone.inView,report.data.phone);
 await phone.close();
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('actives witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
