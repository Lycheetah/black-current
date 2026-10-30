// Route 2 Stage 2 · rifts: five timed waves in a pocket arena, one modifier per epoch, Riftwalker hardware.
// Writes shots/rifts/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/rifts';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.rifts?.ready&&window.starMap?.ready&&window.derelictLoot?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('RIFTER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
 await p.evaluate(()=>{garage.closeMission();const c=modularShips.compile(modularShips.factory('dreadnought'));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});engine.player.iFrames=1e9;
  window.__tick=n=>{engine.paused=false;for(let i=0;i<n;i++)engine.update(1/60);};
  window.__kill=()=>{for(let k=engine.enemies.length-1;k>=0;k--){engine.enemies[k].hp=0;engine.killEnemy(k);}};
  // go to the home rift at an epoch whose modifier is `mod`
  window.__go=mod=>{const real=window.__realNow||(window.__realNow=Date.now),start=real();galaxy.enterSystemById(saveState.doc.civHome||'home');const s=rifts.riftSector(galaxy.current);worldMap.currentGridX=s.gx;worldMap.currentGridY=s.gy;engine.enterChamber({silent:true});
   const key=galaxy.currentId+':'+s.gx+','+s.gy;if(mod){let k=0;for(;k<60;k++){const t=start+k*rifts.CFG.epochMs;Date.now=()=>t;if(rifts.modFor(key)===mod)break;}}
   const t=rifts.here();engine.player.x=t.x;engine.player.y=t.y;engine.player.vx=engine.player.vy=0;engine.player.iFrames=1e9;__tick(1);return t;};});
 // 1 · the home rift: marked, prompted, entered with E
 report.data.entry=await p.evaluate(()=>{const t=__go(null),ch=worldMap.getCurrentChamber(),b=document.getElementById('rift-action');return{tear:!!t,marked:starMap.marks(ch).includes('rift'),prompt:!b.hidden&&b.textContent,hostEnemies:engine.enemies.length};});
 check('the home system has a rift on the star map, with an Enter prompt at the tear',report.data.entry.tear&&report.data.entry.marked&&/Enter the rift/.test(report.data.entry.prompt),report.data.entry);
 await p.keyboard.press('KeyE');await p.waitForTimeout(100);
 report.data.run=await p.evaluate(()=>{const r=rifts.active;if(!r)return{active:false};const w0=engine.enemies.length;/* a Splitters rift answers each kill with two drones, so clear until the wave turns */for(let k=0;k<3&&r.wave===0;k++){__kill();__tick(2);}const w1=engine.enemies.length,wave=r.wave;return{active:true,mod:r.mod,timer:r.timer,w0,w1,wave,inside:worldMap.getCurrentChamber().isRift};});
 check('E opens the run: wave 1 arrives, the clock runs, and each cleared wave brings a bigger one',report.data.run.active&&report.data.run.inside&&report.data.run.w0>=3&&report.data.run.wave===1&&report.data.run.w1>report.data.run.w0&&report.data.run.timer>140*60,report.data.run);
 await p.screenshot({path:`${out}/run.png`});
 // 2 · seal it: cache pays metal and the first Riftwalker piece; the sector is as you left it
 report.data.won=await p.evaluate(()=>{const metal=hubs.metal;for(let k=0;k<12&&rifts.active;k++){__kill();__tick(2);}const P=engine.player;
  return{active:!!rifts.active,paid:hubs.metal-metal,vane:derelictLoot.owned('set-riftwalker-vane'),cleared:saveState.doc.rifts.cleared,host:engine.enemies.length,isRift:!!worldMap.getCurrentChamber().isRift};});
 check('breaking all five waves seals the rift: metal and the Riftwalker vane, and you are back in the sector',!report.data.won.active&&report.data.won.paid>0&&report.data.won.vane===1&&report.data.won.cleared===1&&!report.data.won.isRift&&report.data.won.host===report.data.entry.hostEnemies,report.data.won);
 report.data.again=await p.evaluate(()=>{__go(null);rifts.enter();const metal=hubs.metal;for(let k=0;k<12&&rifts.active;k++){__kill();__tick(2);}return{paid:hubs.metal-metal,lattice:derelictLoot.owned('set-riftwalker-lattice')};});
 check('sealing it again inside 30 minutes pays a little metal and no hardware',report.data.again.paid>0&&report.data.again.lattice===0,report.data.again);
 // 3 · the clock: collapse pays for the waves you broke
 report.data.collapse=await p.evaluate(()=>{__go(null);rifts.enter();for(let k=0;k<3&&rifts.active.wave===0;k++){__kill();__tick(2);}const metal=hubs.metal;rifts.active.timer=1;__tick(2);return{active:!!rifts.active,paid:hubs.metal-metal};});
 check('if the clock runs out the rift collapses, throws you out and pays for the waves broken',!report.data.collapse.active&&report.data.collapse.paid>0,report.data.collapse);
 // 4 · each modifier changes the run
 report.data.mods=await p.evaluate(()=>{const out={},P=engine.player;
  __go('glass');engine.recalculatePlayerStats();const hp0=engine.player.maxHp;rifts.enter();out.glass={mod:rifts.active.mod,hp:engine.player.maxHp/hp0,enemy:engine.enemies[0].hp/engine.enemies[0].maxHp>0};rifts.leave('left');out.glass.restored=engine.player.maxHp===hp0;
  __go('shieldless');rifts.enter();__tick(3);out.shieldless={mod:rifts.active.mod,shield:engine.player.maxShield};rifts.leave('left');
  __go('splitters');rifts.enter();const n0=engine.enemies.length;engine.enemies[0].hp=0;engine.killEnemy(0);out.splitters={mod:rifts.active.mod,added:engine.enemies.length-(n0-1)};rifts.leave('left');
  __go('volatile');rifts.enter();P.iFrames=0;P.hp=P.maxHp;const e=engine.enemies[0];e.x=P.x+100;e.y=P.y;e.hp=0;engine.killEnemy(0);out.volatile={mod:rifts.active.mod,lost:P.maxHp-P.hp};P.iFrames=1e9;rifts.leave('left');
  const g=modularShips.GEARS['gun-autocannon'],shot=()=>{engine.projectiles=[];engine.fireMountGroup(g.weapon,[{x:P.x,y:P.y,angle:0,radius:g.radius,turret:{node:{type:'cannon',radius:g.radius,weapon:g.weapon}}}],1);return Math.max(...engine.projectiles.map(q=>q.damage));};
  const base=shot();__go('overcharged');rifts.enter();out.overcharged={mod:rifts.active.mod,ratio:shot()/base};rifts.leave('left');
  Date.now=window.__realNow;return out;});
 const M=report.data.mods;
 check('Glass halves your hull for the run and gives it back after',M.glass.mod==='glass'&&Math.abs(M.glass.hp-0.5)<0.02&&M.glass.restored,M.glass);
 check('Shieldless drops your shield pool to zero',M.shieldless.mod==='shieldless'&&M.shieldless.shield===0,M.shieldless);
 check('Splitters: a kill splits into two drones',M.splitters.mod==='splitters'&&M.splitters.added===2,M.splitters);
 check('Volatile: a wreck that bursts beside you hurts',M.volatile.mod==='volatile'&&M.volatile.lost>0,M.volatile);
 check('Overcharged: your guns hit 50% harder',M.overcharged.mod==='overcharged'&&Math.abs(M.overcharged.ratio-1.5)<0.02,M.overcharged);
 // 5 · the Riftwalker set
 report.data.set=await p.evaluate(()=>{const G=modularShips.GEARS,ok=d=>d.modular.fittings.filter(f=>G[f.gear].kind==='utility').length>=2&&d.modular.fittings.some(f=>G[f.gear].kind==='engine');
  const base=['warden','aegis','lancer','dreadnought','leviathan','sovereign','athanor'].map(id=>modularShips.compile(modularShips.factory(id)).design).find(ok);
  const fit=(a,b,c)=>{const d=JSON.parse(JSON.stringify(base)),F=d.modular.fittings,u=F.filter(f=>G[f.gear].kind==='utility'),e=F.find(f=>G[f.gear].kind==='engine');u[0].gear=a;u[1].gear=b;e.gear=c;const cc=modularShips.compile(d).design;saveState.doc.design=cc;engine.applyDesign(cc,{restore:true});engine.recalculatePlayerStats();
   reactor.mode='dormant';const thrust=reactor.thrustScale();engine.player.secCooldownTimer=0;engine.paused=false;engine.triggerSecondaryAbility();return{thrust,cd:engine.player.secCooldownTimer,bonuses:engine.player.setBonuses};};
  const plain=fit('shield','armour','engine'),full=fit('set-riftwalker-lattice','set-riftwalker-keel','set-riftwalker-vane');return{plain,full};});
 const S=report.data.set;
 check('the Riftwalker set: +15% thrust and ability cooldowns 20% shorter with all three fitted',S.full.bonuses.includes('riftwalker')&&Math.abs(S.full.thrust/S.plain.thrust-1.15)<0.01&&S.full.cd<S.plain.cd&&Math.abs(S.full.cd/S.plain.cd-0.8)<0.05,S);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('rifts witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
