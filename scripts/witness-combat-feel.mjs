import {firefox} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
process.env.PULSE_SERVER='unix:/nonexistent';
const out='shots/combat-feel';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};
const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});if(!ok)console.log('FAIL '+name+' '+JSON.stringify(data));};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:800},hasTouch:true}),p=await context.newPage();
p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(15000);
const url=process.argv[2]||'http://127.0.0.1:8811/black-current/';
const boot=async page=>{await page.goto(url);await page.waitForFunction(()=>window.combatFeel?.ready&&window.hostileSkins?.ready);await page.locator('#btn-menu-new').tap();await page.locator('#title-callsign').fill('COMBAT FEEL');await page.locator('#btn-title-quick').tap();await page.evaluate(()=>{garage.closeMission();engine.paused=true;worldMap.currentGridX=4;worldMap.currentGridY=0;engine.enterChamber({silent:true});});};
try{
 await boot(p);
 report.data.damage=await p.evaluate(()=>{
  window.__enemy=(tier=3,arch='stalker')=>{const e=new EnemyOrganism(0,0,{tier,archetype:arch});frontierPve.decorate(e);hostileSkins.skin(e);e.shield=e.maxShield=0;return e;};
  window.__damage=(ship,node,amount,crit=false)=>{const r=Math.random;try{Math.random=()=>crit?0:.999;return engine.damageNode(ship,node,amount);}finally{Math.random=r;}};
  const e=__enemy(),n=e.nodes.find(n=>n.type==='cannon'),before=e.hp;
  n.partMax=n.partHp=24;__damage(e,n,10);const chip={before,after:e.hp,partHp:n.partHp,lost:!!n.lost};
  n.partHp=24;const hp=e.hp;__damage(e,n,59);const overkill={before:hp,after:e.hp,lost:n.lost};
  const ce=__enemy(),cn=ce.nodes.find(n=>n.type==='cannon');cn.partHp=cn.partMax=24;const chp=ce.hp;__damage(ce,cn,59,true);const critical={hull:chp-ce.hp,partDamage:24-cn.partHp};
  const plateEnemy=__enemy(),plate=plateEnemy.nodes.find(n=>n.type==='hull');plate.partHp=plate.partMax=24;const plateHp=plateEnemy.hp;__damage(plateEnemy,plate,59,true);const criticalPlate={hull:plateHp-plateEnemy.hp,partHp:plate.partHp,lost:plate.lost};
  const target=__enemy();for(const part of target.nodes.filter(n=>n.type!=='core')){__damage(target,part,60);if(target.hp<=0)break;}
  const boss=new EnemyOrganism(0,0,{tier:3,isBoss:true});boss.hp=boss.maxHp=500;const bn=boss.nodes.find(n=>n.type!=='core');engine.damageNode(boss,bn,10);
  const player=engine.player,pn=player.nodes.find(n=>n.type!=='core'),php=player.hp;engine.damageNode(player,pn,1);
  return{chip,overkill,critical,criticalPlate,killable:target.hp<=0,bossHp:boss.hp,playerBodyUnchanged:player.hp===php};
 });
 const d=report.data.damage;
 check('a10-damage module hit chips2 hull HP and still damages the actual part',d.chip.before-d.chip.after===2&&d.chip.partHp===14&&!d.chip.lost,d.chip);
 check('59-damage hit on24HP part retains35 overkill plus4.8 hull shock',Math.abs(d.overkill.before-d.overkill.after-39.8)<.001&&d.overkill.lost,d.overkill);
 check('native critical part damage carries through without a second critical roll',Math.abs(d.critical.hull-(d.critical.partDamage-24+4.8))<.001&&d.critical.partDamage>59,d.critical);
 check('hull plate loss preserves the same critical excess before clamping part HP',Math.abs(d.criticalPlate.hull-d.critical.hull)<.001&&d.criticalPlate.partHp===0&&d.criticalPlate.lost,d.criticalPlate);
 check('native part damage can kill a normal enemy',d.killable,d);
 check('authored boss and player body damage rules remain unchanged',d.bossHp===500&&d.playerBodyUnchanged,d);
 report.data.repair=await p.evaluate(()=>{
  const a=__enemy(),b=__enemy();a.wingRole='tender';a.wingType='recovery';a.wingKey=b.wingKey='repair-witness';enemyWings.prepare(a);a._aggro=true;b.hp=b.maxHp*.5;
  const player={...engine.player,x:100,y:0},shots=[];b.takeDamage(1);let hp=b.hp;a.wingClock=119;a.update(player,shots,[a,b]);const focused=b.hp-hp;
  b._hullHitAt=performance.now()-3100;hp=b.hp;a.wingClock=239;a.update(player,shots,[a,b]);const afterBreak=b.hp-hp;
  a.nodes.find(n=>n.type==='mender').lost=true;hp=b.hp;a.wingClock=359;a.update(player,shots,[a,b]);return{focused,afterBreak,disarmed:b.hp-hp};
 });
 check('a repair tender cannot heal a freshly hit wingmate',report.data.repair.focused===0,report.data.repair);
 check('repair resumes after3s out of fire and stays bounded to2% /10HP',report.data.repair.afterBreak>0&&report.data.repair.afterBreak<=10,report.data.repair);
 check('destroying the mender still stops repair',report.data.repair.disarmed===0,report.data.repair);
 report.data.recovery=await p.evaluate(()=>[1,3,5,7].map(tier=>{const e=__enemy(tier);e.takeDamage(e.maxHp*.25);const before=e.hp;for(let i=0;i<600;i++)e.update({...engine.player,x:900,y:0},[],[e]);return{tier,before,after:e.hp};}));
 check('four normal hull tiers gain no passive HP over600 native updates',report.data.recovery.every(e=>e.after<=e.before),report.data.recovery);
 report.data.sizes=await p.evaluate(()=>[1,3,5,7].map(tier=>{const e=__enemy(tier,'mote'),m=hostileSkins.model(e);return{tier,cls:e.fleetClass,width:m.W,span:Math.max(...e.nodes.map(n=>n.currentDx))-Math.min(...e.nodes.map(n=>n.currentDx))};}));
 check('the same enemy silhouette grows explicitly through four hull classes',report.data.sizes.every((s,i,a)=>!i||s.width>a[i-1].width*1.25)&&report.data.sizes[3].width>report.data.sizes[0].width*3,report.data.sizes);
 check('physical hardpoint span grows along with enemy art',report.data.sizes[3].span>report.data.sizes[0].span*2,report.data.sizes);
 report.data.shotguns=await p.evaluate(()=>['point','light','medium','heavy','siege','capital'].map((cls,c)=>{
  const id='scatter-'+cls,w=WEAPON_TYPES[id],g=arsenal.GUNS[id];engine.projectiles=[];engine.fireMountGroup(id,[{x:0,y:0,angle:0}],1);engine.projectiles[0].update([]);
  const a=engine.projectiles.map(p=>Math.atan2(p.vy,p.vx)),spread=(Math.max(...a)-Math.min(...a))*180/Math.PI,dps=engine.projectiles.reduce((n,p)=>n+p.damage,0)*60/w.fireRate;
  return{id,pellets:engine.projectiles.length,spread,dps,budget:arsenal.CLASS_DPS[c]*g.role,description:weaponBalance.summary(id),gear:Object.values(modularShips.GEARS).some(g=>g.weapon===id)};
 }));
 check('all six classes produce5–9 real pellets across at least40°',report.data.shotguns.every(g=>g.pellets>=5&&g.pellets<=9&&g.spread>=40),report.data.shotguns);
 check('all six pellet volleys stay within2% of their class DPS budgets',report.data.shotguns.every(g=>Math.abs(g.dps/g.budget-1)<.02),report.data.shotguns);
 check('all six shotguns are native fittings with pellet and spread descriptions',report.data.shotguns.every(g=>g.gear&&g.description.includes('pellets')&&g.description.includes('° spread')),report.data.shotguns);
 check('the original saved Twin Splitter remains a two-projectile gun',await p.evaluate(()=>{engine.projectiles=[];engine.fireMountGroup('twin',[{x:0,y:0,angle:0}],1);for(const s of [...engine.projectiles])s.update([]);return engine.projectiles.length===2;}));
 await p.evaluate(()=>{garage.closeReward();worldMap.getCurrentChamber().isCleared=true;engine.paused=false;engine.enemies=[];engine.player.iFrames=99999;reactor.set('dormant');reactor.charge=reactor.capacity;});await p.keyboard.press('KeyV');
 report.data.cruise=await p.evaluate(()=>{
  const fire=()=>{engine.projectiles=[];engine.fireMountGroup('spitter',[{x:0,y:0,angle:0}],1);return engine.projectiles[0].damage;};
  const on={enabled:combatFeel.cruise,damage:fire(),thrust:reactor.thrustScale(),energy:reactor.charge};
  engine.player._cruising=true;engine.player.vx=16.5;engine.player.vy=0;combatFeel.setCruise(false);engine.readInput();const off={damage:fire(),thrust:reactor.thrustScale(),speed:engine.player.vx};
  combatFeel.setCruise(true);const pool=reactor.charge;for(let i=0;i<600;i++){reactor.thrustScale();reactor.update();}on.sameEnergy=Number.isFinite(pool)&&reactor.charge===pool;on.after=reactor.charge;engine.paused=true;return{on,off};
 });
 check('V toggles real cruise with exactly25% projectile damage',report.data.cruise.on.enabled&&report.data.cruise.on.damage/report.data.cruise.off.damage===.25,report.data.cruise);
 check('cruise supplies65% more thrust without draining the reactor',Math.abs(report.data.cruise.on.thrust/report.data.cruise.off.thrust-1.65)<.0001&&report.data.cruise.on.sameEnergy,report.data.cruise);
 check('disengage removes cruise momentum before full-damage fire',Math.abs(report.data.cruise.off.speed-10)<.0001,report.data.cruise);
 await p.evaluate(()=>{engine.enemies=[1,3,5,7].map((t,i)=>{const e=__enemy(t);e.x=i%2?400:-700;e.y=i<2?0:600;return e;});engine.player.x=-1100;engine.player.y=500;Object.assign(engine.camera,{x:-1200,y:-600,zoom:.5});engine.render();});
 await p.screenshot({path:out+'/hull-classes-desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{garage.closeReward();worldMap.getCurrentChamber().isCleared=true;engine.paused=false;engine.enemies=[];engine.projectiles=[];});
 await p.locator('#btn-cruise').tap();await p.locator('#btn-cruise').tap();
 check('native phone Cruise button is tappable and shows its damage penalty',await p.evaluate(()=>{const b=document.getElementById('btn-cruise'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return combatFeel.cruise&&b.getAttribute('aria-pressed')==='true'&&b.textContent.includes('25% damage')&&r.height>=44&&r.x>=0&&r.right<=innerWidth&&(hit===b||b.contains(hit))&&!engine.mouse.down;}));
 check('phone Cruise occupies its own space beside the reactor controls',await p.evaluate(()=>{const b=document.getElementById('btn-cruise'),r=b.getBoundingClientRect();return ['radar-canvas','btn-reactor-cilia','btn-reactor-membrane','btn-reactor-stingers','btn-reactor-dormant','system-strip'].every(id=>{const el=document.getElementById(id);if(!el)return true;const s=el.getBoundingClientRect();return !s.width||r.right<=s.left||r.left>=s.right||r.bottom<=s.top||r.top>=s.bottom;});}));
 await p.evaluate(()=>{engine.paused=true;engine.render();});await p.screenshot({path:out+'/cruise-phone.png'});
 report.data.audio=await p.evaluate(async()=>{
  const render=async(master,music,state)=>{
   const c=new OfflineAudioContext(2,24000*6,24000),se=new SoundEngine();se.ctx=c;se.muted=false;se.mix={master,music,sfx:0};se.buildBuses();se.state=state;se.biome='REEF';se.applyState(true);
   for(let i=0;i<16;i++){se.step=i;se.scheduleStep(i*.34,se.bed());}
   const b=await c.startRendering();await new Promise(r=>setTimeout(r,0));let energy=0,peak=0;const data=b.getChannelData(0);
   for(const v of data){energy+=v*v;peak=Math.max(peak,Math.abs(v));}
   return{rms:Math.sqrt(energy/data.length),peak,voices:se.currentAmbience.active,peakVoices:se.currentAmbience.peak,notes:se.currentAmbience.played,sources:se.currentAmbience.tones.length+1,samples:master&&music&&state==='REEF'?Array.from(data):null};
  };return{open:await render(1,.7,'REEF'),combat:await render(1,.7,'COMBAT'),musicOff:await render(1,0,'REEF'),masterOff:await render(0,.7,'REEF')};
 });
 const aud=report.data.audio,samples=aud.open.samples;delete aud.open.samples;for(const a of Object.values(aud))delete a.samples;
 const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));writeFileSync(out+'/current-ambience.wav',wav);
 check('real audio graph renders non-silent unclipped ambience and battle layers',aud.open.rms>.002&&aud.combat.rms>.002&&aud.open.peak<.95&&aud.combat.peak<.95,aud);
 check('saved music zero and master zero remain silent',aud.musicOff.peak===0&&aud.masterOff.peak===0,aud);
 check('battle mix has a distinct measured energy from exploration',Math.abs(aud.combat.rms-aud.open.rms)>.0005,aud);
 check('new ambience uses three sustained sources and cleans capped notes',aud.open.sources===3&&aud.open.peakVoices<=6&&aud.open.notes>=4&&aud.open.voices===0&&aud.combat.voices===0,aud);
 // A defective response copy must make the overkill condition fail.
 const control=await context.newPage();const src=readFileSync('js/combat-feel.js','utf8');
 await control.route('**/js/combat-feel.js*',route=>route.fulfill({contentType:'text/javascript',body:src.replace('ship.hp-=Math.max(0,shock-shield)','ship.hp-=0')}));
 await boot(control);const defect=await control.evaluate(()=>{const e=new EnemyOrganism(0,0,{tier:3,archetype:'stalker'});frontierPve.decorate(e);e.shield=0;const n=e.nodes.find(n=>n.type==='cannon');n.partHp=n.partMax=24;const before=e.hp,r=Math.random;try{Math.random=()=>.999;engine.damageNode(e,n,59);}finally{Math.random=r;}return Math.abs(before-e.hp-39.8)<.001;});
 check('known broken scratch response fails the same hull-overkill condition',!defect);await control.close();
 check('all six protected originals remain byte-identical',['engine','hardpoints','shipyard-ui','weapons','fleet','progression'].every(f=>readFileSync('js/'+f+'.js','utf8')===execFileSync('git',['show','HEAD:js/'+f+'.js'],{encoding:'utf8'})));
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack);check('combat feel witness completed',false,e.message);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,checks:report.checks.length,errors:report.errors.map(e=>e.split('\n')[0])}));await browser.close();}
if(report.failed||report.errors.length||report.checks.length!==28)process.exitCode=1;
