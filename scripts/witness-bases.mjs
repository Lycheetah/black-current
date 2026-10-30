// Overnight run step 27 · bases (js/bases.js + hubs KINDS refinery / hangar / grid): what a base does, and raid
// warnings. Writes shots/bases/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/bases';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.bases?.ready&&window.wingmen?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('BASER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();terrain.off=true;hubs.metal=60000;saveState.doc.inventory.push({type:'hull',radius:12,count:30});
  window.__go=(gx,gy,x,y)=>{galaxy.enterSystemById('home');worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});engine.enemies=[];const P=engine.player;P.x=x;P.y=y;P.vx=P.vy=0;P.iFrames=1e9;engine.paused=false;};
  window.__build=(kind,x,y)=>{const P=engine.player;P.x=x;P.y=y;return hubs.build(kind)!==false;};
  window.__tick=n=>{for(let i=0;i<n;i++){engine.paused=false;engine.mapOpen=false;engine.update(1/60);}};});
 // 1 · the build panel offers the three base structures
 report.data.panel=await p.evaluate(()=>{__go(2,2,0,0);hubs.openBuild();const names=[...document.querySelectorAll('#build-list strong')].map(s=>s.textContent);hubs.closeBuild();return names;});
 check('the build panel offers a Refinery, a Wingman Hangar and a Defence Grid',['REFINERY','WINGMAN HANGAR','DEFENCE GRID'].every(n=>report.data.panel.some(t=>t.includes(n))),report.data.panel);
 // 2 · two structures in a sector make a base, marked on the star map
 report.data.base=await p.evaluate(()=>{const one=__build('refinery',0,0);const before=Object.keys(bases.bases()).length;const two=__build('grid',700,0);const ch=worldMap.getCurrentChamber();return{one,two,before,after:Object.keys(bases.bases()).length,marks:starMap.marks(ch)};});
 const BA=report.data.base;
 check('two of your structures in one sector make a base, and the star map marks it',BA.one&&BA.two&&BA.before===0&&BA.after===1&&BA.marks.includes('base'),BA);
 // 3 · the refinery melts hold salvage into metal while you are in the system
 report.data.refine=await p.evaluate(()=>{const inv=saveState.doc.inventory,n0=inv.reduce((a,p)=>a+p.count,0),m0=hubs.metal;__tick(bases.CFG.refineEvery+2);const n1=inv.reduce((a,p)=>a+p.count,0);return{parts:n0-n1,metal:hubs.metal-m0,expect:hubs.sellValue({radius:12})*bases.CFG.refineMult};});
 check('the refinery melts one loose part into metal (3× its sale value) on its cycle',report.data.refine.parts===1&&report.data.refine.metal>=report.data.refine.expect,report.data.refine);
 // 4 · the defence grid: faster, longer-reaching guns and armoured structures
 report.data.grid=await p.evaluate(()=>{__build('gun',0,700);const gun=hubs.list().find(s=>s.kind==='gun');const e=new EnemyOrganism(gun.x+hubs.CFG.gunRange*1.15,gun.y,{tier:1,archetype:'mote'});e.update=()=>{};engine.enemies=[e];const shots=bases.grid();
  const ref=hubs.list().find(s=>s.kind==='refinery');const armoured=bases.armour(ref);const hp0=ref.hp;engine.projectiles.push(new Projectile(ref.x,ref.y,0,0,{damage:100,radius:6,isPlayer:false,color:'#f00',life:5}));__tick(1);const took=Math.round(hp0-ref.hp);engine.enemies=[];return{shots,armoured,took};});
 const GR=report.data.grid;
 check('with a defence grid, gun platforms reach 25% further and fire extra shots, and a 100-damage hit costs a structure 60',GR.shots>=1&&GR.armoured===0.6&&GR.took>=59&&GR.took<=61,GR);
 // 5 · the wingman hangar rebuilds a lost wingman in the field
 report.data.hangar=await p.evaluate(()=>{__go(0,0,40,0);hubs.openDock();const o=wingmen.offers()[0];wingmen.hire(o.key);hubs.closeDock();__go(2,2,0,-700);const built=__build('hangar',0,-700);
  const r=wingmen.doc().list[0];r.lost=true;r.hp=0;wingmen.spawnAll();const cost=Math.round(r.price*wingmen.CFG.rebuildPart),m0=hubs.metal;__tick(bases.CFG.hangarEvery+2);return{built,back:!r.lost,spent:m0-hubs.metal,cost,live:wingmen.live.length};});
 const HG=report.data.hangar;
 check('in a hangar sector a lost wingman is rebuilt in the field for the station price',HG.built&&HG.back&&HG.spent>=HG.cost&&HG.live===1,HG);
 // 6 · raids are announced a minute ahead, with a star-map mark, and then arrive
 report.data.raid=await p.evaluate(()=>{const ch=worldMap.getCurrentChamber();hubs.raid=null;hubs.raidT=bases.CFG.warn+120;__tick(30);const early=bases.raidWarning();hubs.raidT=bases.CFG.warn-10;__tick(2);const warned=bases.raidWarning(),marks=starMap.marks(ch);hubs.raidT=5;__tick(10);return{early,warned,marks,raid:!!hubs.raid&&hubs.raid.length};});
 const RD=report.data.raid;
 check('a raid is announced about a minute ahead, marked on the star map, and then comes',RD.early===null&&!!RD.warned&&RD.marks.includes('raid')&&RD.raid>0,RD);
 await p.screenshot({path:`${out}/base.png`});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('bases witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
