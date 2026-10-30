// Route 4 item 8 · art drops (js/art-drop.js). Mac, 2026-10-30: "I'm going to have Cael generate an absolute boat load of
// art". Art listed in art/cael/manifest.json must replace the matching section and gun art with no code change, and a
// broken entry must leave the old art in place. The drop is served by the test itself (no files are written).
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/art-drop';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1100,height:700}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 // a solid magenta square stands in for Cael's art: easy to find in pixels
 const make=await browser.newPage();await make.setContent('<canvas id=c width=256 height=256></canvas>');
 const png=Buffer.from((await make.evaluate(()=>{const c=document.getElementById('c'),g=c.getContext('2d');g.fillStyle='#ff00ff';g.beginPath();g.arc(128,128,100,0,7);g.fill();return c.toDataURL('image/png');})).split(',')[1],'base64');await make.close();
 const manifest={v:1,items:[{kind:'section',id:'drive',path:'art/cael/sections/drive.png'},{kind:'gun',id:'spitter',path:'art/cael/guns/spitter.png'},{kind:'section',id:'plate',path:'art/cael/sections/missing.png'}]};
 await p.route('**/art/cael/manifest.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
 await p.route('**/art/cael/sections/drive.png',r=>r.fulfill({status:200,contentType:'image/png',body:png}));
 await p.route('**/art/cael/guns/spitter.png',r=>r.fulfill({status:200,contentType:'image/png',body:png}));
 await p.goto(url);await p.waitForFunction(()=>window.artDrop?.ready,null,{timeout:20000});
 report.data.stats=await p.evaluate(()=>JSON.parse(JSON.stringify(artDrop.stats)));
 check('the drop manifest is read: two images load, the broken entry is skipped',report.data.stats.listed===3&&report.data.stats.loaded===2&&report.data.stats.failed.length===1,report.data.stats);
 // draw a drive section and a spitter turret into a scratch canvas and look for the magenta
 report.data.drawn=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=200;const g=c.getContext('2d');
  const mag=()=>{const d=g.getImageData(0,0,200,200).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]<60&&d[i+2]>200)n++;return n;};
  sectionArt.draw(g,{kind:'drive',px:100,py:100,rotation:0},[40,40],null);const section=mag();g.clearRect(0,0,200,200);
  g.save();g.translate(100,100);turretArt.draw(g,'spitter',40,false);g.restore();const gun=mag();g.clearRect(0,0,200,200);
  g.save();g.translate(100,100);turretArt.draw(g,'autocannon',40,false);g.restore();const other=mag();
  sectionArt.draw(g,{kind:'plate',px:100,py:100,rotation:0},[40,40],null);const plate=mag();
  return{section,gun,other,plate};});
 const D=report.data.drawn;
 check('the dropped section art replaces the drive plate',D.section>500,D);
 check('the dropped gun art replaces that gun only (another gun keeps its own art)',D.gun>500&&D.other===0,D);
 check('a broken entry leaves the old art in place',D.plate===0,D);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('art drop witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
