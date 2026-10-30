// Master route Stage 1 · one scale: hull ladder, matched enemy sizes, sectors by band,
// camera by frame, hull mass and formation spawning. Writes shots/one-scale/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/one-scale';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data)));};
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(process.argv[2]||'http://127.0.0.1:8811/black-current/');await p.waitForFunction(()=>window.fleetFormation?.ready&&window.combatScaling?.ready&&window.hostileSkins?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('ONE SCALE');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 await p.evaluate(()=>{garage.closeMission();window.__fly=id=>{const d=modularShips.factory(id),c=modularShips.compile(d);saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});engine.player.iFrames=1e9;return c.design;};});
 // 1 · the hull ladder: blueprint spacing scales by frame in flight.
 report.data.hulls=await p.evaluate(()=>['kestrel','lancer','dreadnought','leviathan','sovereign','athanor'].map(id=>{const d=modularShips.compile(modularShips.factory(id)).design;let x0=1e9,x1=-1e9;for(const n of d.nodes){x0=Math.min(x0,n.dx-n.radius);x1=Math.max(x1,n.dx+n.radius);}return{id,hull:d.modular.hull,length:Math.round(x1-x0),scale:tuning.SIZE.hullScale[d.modular.hull]};}));
 const titan=report.data.hulls.find(h=>h.hull==='titan'),frig=report.data.hulls.find(h=>h.hull==='frigate');
 check('titan flies at least 2× its blueprint length and frigates are unchanged',titan.length>=1600&&frig.length<200,report.data.hulls);
 check('gun mount radii are untouched, so weapon classes are unchanged',await p.evaluate(()=>{const f=modularShips.factory('athanor'),a=modularShips.compile(f).design.nodes.filter(n=>n.type==='cannon');return a.length>0&&a.every(n=>modularShips.GEARS['gun-'+n.weapon]?.radius===n.radius||n.weapon.includes('-'));}));
 // 2 · matched enemy sizes per class.
 report.data.enemies=await p.evaluate(()=>{const rows=[];for(const[tier,cls]of[[1,'frigate'],[3,'cruiser'],[5,'battleship'],[7,'capital'],[9,'supercapital'],[10,'titan']]){const e=new EnemyOrganism(0,0,{tier,archetype:'stalker'});e.faction=e.faction||'savanah';e.fleetClass=cls;hostileSkins.skin(e);const m=hostileSkins.model(e);if(!m)continue;const target=tuning.SIZE.playerLength[cls]*tuning.SIZE.hullScale[cls];rows.push({cls,length:Math.round(m.W),player:Math.round(target),ratio:+(m.W/target).toFixed(2)});}return rows;});
 check('every stalker-class enemy is within ±15% of the player frame of its class',report.data.enemies.length>=5&&report.data.enemies.every(r=>Math.abs(r.ratio-1)<=.15),report.data.enemies);
 // 3 · opening protected, sectors grow by danger band.
 report.data.opening=await p.evaluate(()=>{worldMap.currentGridX=0;worldMap.currentGridY=2;engine.enterChamber({silent:true});const ch=worldMap.getCurrentChamber();return{radius:ch.radius,danger:ch.dangerLevel,enemies:engine.enemies.length};});
 check('the protected opening sector keeps its 2,600 px room',report.data.opening.radius===2600,report.data.opening);
 report.data.deep=await p.evaluate(()=>{__fly('athanor');const sys=[...galaxy.data.systems].filter(s=>s.id!=='home'&&s.id!==saveState.doc.civHome&&!s.rule).sort((a,b)=>b.danger+b.size-a.danger-a.size)[0];galaxy.enterSystemById(sys.id);const ch=Object.values(worldMap.chambers).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});engine.player.iFrames=1e9;const c=worldMap.getCurrentChamber(),P=engine.player;
  return{danger:c.dangerLevel,radius:c.radius,count:engine.enemies.length,overlaps:fleetFormation.overlaps(),nearest:Math.round(Math.min(...engine.enemies.map(e=>Math.hypot(e.x-P.x,e.y-P.y)-fleetFormation.radius(e)))),inside:engine.enemies.every(e=>Math.hypot(e.x,e.y)<=c.radius)};});
 check('the deepest sector (danger 10+) is at least 8,000 px in radius',report.data.deep.danger>=10&&report.data.deep.radius>=8000,report.data.deep);
 check('deep fleets spawn with no overlapping hulls, inside the room, clear of the arrival point',report.data.deep.overlaps===0&&report.data.deep.inside&&report.data.deep.nearest>400,report.data.deep);
 // 4 · camera pulls back for big frames.
 await p.evaluate(()=>{engine.player.iFrames=0;});await p.waitForTimeout(1600);
 report.data.camera=await p.evaluate(()=>({dial:movementFeel.zoom,target:engine.camera.targetZoom,cls:tuning.classOf(engine.player),fit:roomScale.fitZoom(engine.viewportWidth,engine.viewportHeight),share:tuning.SIZE.fit}));   // js/room-scale.js fit rule
 check('a titan frames at the dial × 0.78 or closer-fit, its hull within the room-scale share of the short side',report.data.camera.cls==='titan'&&Math.abs(report.data.camera.target-Math.min(report.data.camera.dial*.78,report.data.camera.fit))<1e-6&&titan.length*report.data.camera.target<=768*report.data.camera.share*1.05&&titan.length*report.data.camera.target>=768*.3,{...report.data.camera,onScreen:Math.round(titan.length*report.data.camera.target)});
 await p.screenshot({path:out+'/titan-deep.png'});
 // 5 · hull mass: a titan accelerates and turns slower than a frigate.
 const burn=async id=>{await p.evaluate(id=>{__fly(id);const P=engine.player;P.x=P.y=0;P.vx=P.vy=0;P.angle=0;},id);await p.keyboard.down('d');await p.waitForTimeout(700);const v=await p.evaluate(()=>Math.hypot(engine.player.vx,engine.player.vy));await p.keyboard.up('d');return v;};
 const vf=await burn('kestrel'),vt=await burn('athanor');report.data.mass={frigate:+vf.toFixed(2),titan:+vt.toFixed(2),ratio:+(vt/vf).toFixed(2)};
 check('a titan reaches about half a frigate’s speed',vf>1&&report.data.mass.ratio>.35&&report.data.mass.ratio<.65,report.data.mass);
 report.data.turn=await p.evaluate(()=>{__fly('athanor');const t=hardpoints.steerHull(0,Math.PI);__fly('kestrel');const f=hardpoints.steerHull(0,Math.PI);return{titan:t,frigate:f,ratio:+(t/f).toFixed(2)};});
 check('a titan turns at about a third of a frigate’s rate',Math.abs(report.data.turn.ratio-tuningTurn())<.02,report.data.turn);
 function tuningTurn(){return .36;}
 await p.evaluate(()=>{__fly('kestrel');galaxy.enterSystemById('home');worldMap.currentGridX=0;worldMap.currentGridY=1;engine.enterChamber({silent:true});engine.player.iFrames=0;});await p.waitForTimeout(1200);await p.screenshot({path:out+'/frigate-home.png'});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('one-scale witness completed',false,String(e.message||e));await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,data:report.data}));}
if(report.failed)process.exitCode=1;
