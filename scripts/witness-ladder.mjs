// Overnight run step 7 · the nine-rung ladder: destroyer, heavy cruiser and battlecruiser between the old frames,
// old saves mapped onto it, a factory ship per new rung, readable class names, and the heavy deck from the battlecruiser.
// Writes shots/ladder/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/ladder';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.modularShips?.ready&&window.hangarUI?.ready&&window.upgradePath?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('LADDER');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 const D=report.data.ladder=await p.evaluate(()=>{garage.closeMission();const M=modularShips,ids=Object.keys(M.HULLS),start=JSON.parse(JSON.stringify(saveState.doc.design));
  const fly={};for(const [id,hull] of [['corsair','destroyer'],['ironclad','heavycruiser'],['harrier','battlecruiser']]){const c=M.compile(M.factory(id));engine.applyDesign(c.design,{restore:true});engine.recalculatePlayerStats();fly[id]={hull:c.design.modular.hull,cls:tuning.classOf(engine.player),hp:engine.player.maxHp,want:hull};}
  const hp=['frigate','destroyer','cruiser','heavycruiser','battlecruiser','battleship'].map(h=>M.HULLS[h].hullHp||0);
  const keep=saveState.doc.modularHangar,map=[];for(let r=0;r<=6;r++){saveState.doc.modularHangar={v:1,rank:r,owned:{}};map.push(M.hangar().rank);}saveState.doc.modularHangar={v:1,ladder:2,rank:4,owned:{}};const native=M.hangar().rank;saveState.doc.modularHangar=keep;saveState.doc.design=start;engine.applyDesign(start,{restore:true});
  const heavyBC=M.fits?null:null,sec=M.SECTIONS.heavy.hulls;
  return{ids,ranks:ids.map(id=>M.HULLS[id].rank),labels:ids.map(id=>M.HULLS[id].label),fly,hp,map,native,heavy:sec,rankCost:M.RANK_COST,cruise:ids.map(id=>tuning.CRUISE[id]),size:ids.map(id=>tuning.SIZE.playerLength[id])};});
 check('nine rungs in order, ranks 0–8, each with a readable class name',D.ids.join()==='frigate,destroyer,cruiser,heavycruiser,battlecruiser,battleship,capital,supercapital,titan'&&D.ranks.join()==='0,1,2,3,4,5,6,7,8'&&D.labels.join()==='FRIGATE,DESTROYER,CRUISER,HEAVY CRUISER,BATTLECRUISER,BATTLESHIP,DREADNOUGHT,CARRIER,TITAN',D);
 check('each new rung has a factory ship that flies as its own class',Object.values(D.fly).every(f=>f.hull===f.want&&f.cls===f.want),D.fly);
 check('size, cruise and frame hull rise rung by rung through the new classes',D.size.every((v,i,a)=>!i||v>a[i-1])&&D.cruise.every((v,i,a)=>!i||v>=a[i-1])&&D.hp.every((v,i,a)=>!i||v>a[i-1]),{size:D.size,cruise:D.cruise,hp:D.hp});
 check('old saves keep their frames: ranks 0–6 map to frigate, cruiser, heavy cruiser, battleship, dreadnought, carrier, titan; new saves are untouched',D.map.join()==='0,2,3,5,6,7,8'&&D.native===4,{map:D.map,native:D.native});
 check('the battlecruiser is the first frame that takes a heavy battery deck',D.heavy[0]==='battlecruiser'&&!D.heavy.includes('heavycruiser'),D.heavy);
 // the station path offers the destroyer as the frigate's next frame
 await p.evaluate(()=>{civilisations.goHome();engine.paused=false;hubs.openDock();});await p.locator('[data-station-service="upgrades"]').click();
 report.data.path=await p.evaluate(()=>({next:document.querySelector('[data-path-hull]')?.dataset.pathHull,title:document.querySelector('.path-hull-title h3')?.textContent}));
 check('a new pilot\'s next frame is the destroyer, named in words',report.data.path.next==='destroyer'&&/DESTROYER/.test(report.data.path.title||''),report.data.path);
 await p.screenshot({path:`${out}/path.png`});
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('ladder witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
