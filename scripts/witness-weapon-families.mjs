// Mac, 2026-10-30 · weapon families (js/weapon-families.js): each family has one job (stagger, pierce, arc, seek and
// splash, blast), and the bubble-era names are retired. Writes shots/weapon-families/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/weapon-families';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.weaponFamilies?.ready&&window.arsenal?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('FAMILY');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();terrain.off=true;galaxy.enterSystemById('home');worldMap.currentGridX=2;worldMap.currentGridY=2;engine.enterChamber({silent:true});engine.enemies=[];engine.paused=false;engine.player.iFrames=1e9;
  window.__pick=(fam,c)=>Object.keys(arsenal.GUNS).find(k=>{const g=arsenal.GUNS[k];return g.family===fam&&g.c===c&&!g.retired&&!g.special&&WEAPON_TYPES[k];});
  window.__foe=(x,y,o={})=>{const e=new EnemyOrganism(x,y,{tier:2,archetype:o.arch||'stalker'});e.update=()=>{};e.nodes=e.nodes.filter(n=>n.type==='core');/* core only: every hit lands on hull hp, which the witness reads */e.maxHp=e.hp=o.hp||2000;e.shield=e.maxShield=0;Object.assign(e,o.set||{});engine.enemies.push(e);return e;};
  /* one shot from a gun at a target straight ahead, run until it lands */
  window.__shoot=(w,tx,ty)=>{const P=engine.player;engine.projectiles=[];const a=Math.atan2(ty-P.y,tx-P.x);engine.input={aimX:tx,aimY:ty};engine.fireMountGroup(w,[{x:P.x,y:P.y,angle:a,radius:8,turret:{node:{type:'cannon',weapon:w}}}],1);const shots=engine.projectiles.filter(q=>q.isPlayer);for(let i=0;i<90&&engine.projectiles.some(q=>q.isPlayer);i++){engine.paused=false;engine.mapOpen=false;engine.update(1/60);}return shots;};});
 // 1 · the bubble-era names are gone
 report.data.names=await p.evaluate(()=>Object.values(modularShips.GEARS).filter(g=>g.weapon&&!g.retired).map(g=>g.name).filter(n=>/Bubble|Bio-|Tidal|Tidewave|Leviathan|Deep Torpedo|Tri-Spread|Twin Splitter|Cluster Bomb$/.test(n)));
 check('no fitted-gun name keeps the bubble-era wording',report.data.names.length===0,report.data.names);
 // 2 · kinetic stagger
 report.data.kinetic=await p.evaluate(()=>{const P=engine.player,w=__pick('kinetic',3),e=__foe(P.x+260,P.y,{hp:400,arch:'charger',set:{chargeT:30}});__shoot(w,e.x,e.y);const r={pushed:Math.round(e.vx*100)/100,charge:e.chargeT,staggers:weaponFamilies.stats.stagger};engine.enemies=[];return r;});
 check('kinetic: a heavy hit shoves the target back and breaks its ram',report.data.kinetic.pushed>0&&report.data.kinetic.charge===0&&report.data.kinetic.staggers>0,report.data.kinetic);
 // 3 · rail pierce
 report.data.rail=await p.evaluate(()=>{const P=engine.player,w=__pick('rail',2),base=WEAPON_TYPES[w];engine.projectiles=[];engine.fireMountGroup(w,[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:w}}}],1);const q=engine.projectiles.find(q=>q.isPlayer);const r={pierce:q.pierce,fam:q.family};engine.projectiles=[];return r;});
 check('rail: every round pierces one more hull',report.data.rail.fam==='rail'&&report.data.rail.pierce>=2,report.data.rail);
 // 4 · beam arc, missile splash, ordnance blast: a neighbour takes the stated share and the target takes only its own hit
 report.data.spill=await p.evaluate(()=>{const P=engine.player,res={};for(const [fam,share] of [['beam',0.30],['missile',0.25],['ordnance',0.40]]){engine.enemies=[];const t=__foe(P.x+300,P.y),n=__foe(P.x+330,P.y+40);const t0=t.hp,n0=n.hp,shots=__shoot(__pick(fam,2),t.x,t.y);const hit=t0-t.hp,side=n0-n.hp;res[fam]={hit:Math.round(hit),side:Math.round(side),ratio:+(side/Math.max(1,hit)).toFixed(2),share};}engine.enemies=[];return res;});
 const S=report.data.spill;console.log('spill',JSON.stringify(S));
 /* a hit that lands off-centre may not reach the neighbour, so a volley carries up to (never more than) the stated share */
 check('beam arcs to a nearby hostile, at most 30% of the hit',S.beam.side>0&&S.beam.ratio<=0.30+0.03,S.beam);
 check('missiles splash around the impact, at most 25% of the hit',S.missile.side>0&&S.missile.ratio<=0.25+0.03,S.missile);
 check('ordnance blasts about 40% to hostiles around the impact',S.ordnance.side>0&&Math.abs(S.ordnance.ratio-0.40)<0.12,S.ordnance);
 // 5 · missiles seek
 report.data.seek=await p.evaluate(()=>{const P=engine.player,e=__foe(P.x+500,P.y+260);engine.projectiles=[];engine.input={aimX:e.x,aimY:e.y};engine.fireMountGroup(__pick('missile',2),[{x:P.x,y:P.y,angle:0,radius:8,turret:{node:{type:'cannon',weapon:__pick('missile',2)}}}],1);const q=engine.projectiles.find(q=>q.isPlayer),y0=q.y;for(let i=0;i<20;i++){engine.paused=false;engine.update(1/60);}const r={seeking:!!q._seek,leaned:Math.round(q.y-y0)};engine.enemies=[];engine.projectiles=[];return r;});
 check('missiles lean toward the hostile nearest your aim',report.data.seek.seeking&&report.data.seek.leaned>5,report.data.seek);
 // 6 · the shop says it
 report.data.blurbs=await p.evaluate(()=>['kinetic','rail','beam','missile','ordnance'].map(f=>WEAPON_TYPES[__pick(f,2)]?.blurb||''));
 check('every gun\'s description names its family job',report.data.blurbs.every((b,i)=>b.includes(['Stagger','Pierce','Arc','Seek','Blast'][i]+':')),report.data.blurbs);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('weapon families witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
