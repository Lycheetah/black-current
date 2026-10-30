// Overnight run step 4 · enemy placement in big rooms: the hostile cap grows with the sector (rooms grow with your frame),
// and flying in from the edge finds a fight quickly at every class. Home's rookie rings keep their small caps.
// Writes shots/encounters/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/encounters';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.frontierPve?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('SCOUT');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 const D=report.data.classes=await p.evaluate(()=>{garage.closeMission();window.requestAnimationFrame=()=>0;const M=modularShips,out={};
  for(const [ship,lo,hi] of [['hornet',2,2],['lancer',3,4],['dreadnought',5,6],['leviathan',8,9]]){const c=M.compile(M.factory(ship));saveState.doc.design=c.design;engine.applyDesign(c.design,{restore:true});const P=engine.player;P.iFrames=1e9;const res=[];
   for(const s of galaxy.data.systems){if(s.home||s.hub)continue;galaxy.enterSystemById(s.id);for(const ch of Object.values(worldMap.chambers)){if(res.length>=4)break;if(ch.isHaven||ch.isBossSector||ch.dangerLevel<lo||ch.dangerLevel>hi)continue;
     worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});const R=worldMap.getCurrentChamber().radius;P.x=-R*.85;P.y=0;P.vx=P.vy=0;const n=engine.enemies.length;let contact=90;
     for(let f=0;f<60*60;f++){engine.paused=false;engine.keys.KeyD=true;engine.mouse.down=false;engine.update(1/60);if(engine.enemies.some(e=>e.hp>0&&Math.hypot(e.x-P.x,e.y-P.y)<Math.max(900,(P.coreRadius||30)*12))){contact=f/60;break;}if(P.x>R*.8)break;}
     engine.keys.KeyD=false;res.push({R:Math.round(R),n,contact:+contact.toFixed(1)});}if(res.length>=4)break;}
   const sorted=res.map(r=>r.contact).sort((a,b)=>a-b);out[ship]={res,cap:frontierPve.roomCap({radius:res[0]?.R}),median:sorted[sorted.length>>1]};}
  return out;});
 console.log(JSON.stringify(Object.fromEntries(Object.entries(D).map(([k,v])=>[k,{n:v.res.map(r=>r.n),median:v.median}]))));
 check('the hostile cap grows with the room: 12 for a frigate sector, more as rooms grow, never past the 19-actor frame budget',D.hornet.res.every(r=>r.n===12)&&D.lancer.res.every(r=>r.n>12)&&D.dreadnought.res.every(r=>r.n>D.lancer.res[0].n)&&D.leviathan.res.every(r=>r.n>=D.dreadnought.res[0].n&&r.n<=19),Object.fromEntries(Object.entries(D).map(([k,v])=>[k,v.res.map(r=>[r.R,r.n])])));
 check('flying in from the edge meets a fight quickly at every class (median under 12 s)',Object.values(D).every(v=>v.median<=12),Object.fromEntries(Object.entries(D).map(([k,v])=>[k,v.median])));
 report.data.home=await p.evaluate(()=>{galaxy.enterSystemById('home');const caps=[];for(const [x,y] of [[1,1],[3,0]]){worldMap.currentGridX=x;worldMap.currentGridY=y;engine.enterChamber({silent:true});caps.push(engine.enemies.length);}return caps;});
 check('home\'s rookie rings keep their small caps (≤4 inside ring 2, ≤6 at ring 3)',report.data.home[0]<=4&&report.data.home[1]<=6,report.data.home);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('encounters witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
