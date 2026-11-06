// Witness surface: the actual game's station DOM. Space rendering is disabled in
// the page's debug hook to keep this UI pass cheap on the software GPU.
// The encounter is seeded clear; acceptance, looting and the decision use live input.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { join,extname } from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();const out=join(root,'captures/testament');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://local').pathname;
    const file=join(root,'dist',path);
    const data=await readFile(file);
    res.writeHead(200,{'content-type':extname(file)==='.html'?'text/html':'application/json'});res.end(data);
  } catch {res.writeHead(404);res.end();}
});
await new Promise((r)=>server.listen(0,'127.0.0.1',r));
let browser;
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',(e)=>errors.push(e.message));
  await page.addInitScript(()=>{
    let current;
    Object.defineProperty(window,'__SE',{configurable:true,get:()=>current,set:(value)=>{
      current=value;value.view.render=()=>{};
    }});
  });
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/sovereign-eclipse.html?capture&quality=low&hull=cinderwake_heavy_cruiser',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__SE?.modelsReady,null,{timeout:20000});
  await page.evaluate(()=>{
    const {world,getPlayer}=window.__SE,p=getPlayer();p.docked=true;
    p.pos={...world.sector.landmarks[world.sector.home].pos};p.prevPos={...p.pos};p.vel={x:0,y:0,z:0};
  });
  await page.locator('[data-tab="contracts"]').click({force:true});
  await page.locator('[data-job-accept="ST_UNOWNED_TESTAMENT"]').click({force:true});
  await page.waitForFunction(()=>window.__SE.world.jobs.active.some((j)=>j.id==='ST_UNOWNED_TESTAMENT'));
  await page.evaluate(()=>{
    const {world,getPlayer}=window.__SE,p=getPlayer(),j=world.jobs.active.find((j)=>j.id==='ST_UNOWNED_TESTAMENT');
    j.enc.stage='complete';j.enc.alive=[];p.docked=false;p.pos={...j.site.pos};p.prevPos={...p.pos};p.vel={x:0,y:0,z:0};p.throttle=0;
  });
  await page.waitForFunction(()=>window.__SE.world.jobs.active.find((j)=>j.id==='ST_UNOWNED_TESTAMENT')?.wreckId);
  await page.locator('#view').focus();await page.keyboard.press('v');
  await page.waitForFunction(()=>window.__SE.world.jobs.active.find((j)=>j.id==='ST_UNOWNED_TESTAMENT')?.hasBox);
  await page.evaluate(()=>{const {world,getPlayer}=window.__SE,p=getPlayer();p.docked=true;p.pos={...world.sector.landmarks[world.sector.home].pos};p.prevPos={...p.pos};});
  await page.locator('[data-testament-choice]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-testament-resolve]').count(),3);
  const choiceBox=await page.locator('[data-testament-choice]').boundingBox();assert.ok(choiceBox);
  await page.screenshot({path:join(out,'choice.png'),clip:choiceBox,animations:'disabled'});
  const before=await page.evaluate(()=>window.__SE.world.salvage);
  await page.locator('[data-testament-resolve="release"]').click({force:true});
  await page.locator('[data-testament-ending="release"]').waitFor({state:'visible'});
  const endingBox=await page.locator('[data-testament-ending]').boundingBox();assert.ok(endingBox);
  await page.screenshot({path:join(out,'aftermath.png'),clip:endingBox,animations:'disabled'});
  const state=await page.evaluate(()=>({salvage:window.__SE.world.salvage,record:window.__SE.world.jobs.stories.unowned_testament,active:window.__SE.world.jobs.active.length}));
  assert.equal(state.salvage-before,140);assert.equal(state.record.choice,'release');assert.equal(state.active,0);assert.deepEqual(errors,[]);
  await writeFile(join(out,'station-witness.json'),JSON.stringify({surface:'production station DOM; 3D rendering disabled',seed:'encounter cleared; docking positions',actions:['accept through JOBS','loot with V','honour refusal through dialogue'],choiceCount:3,payment:140,state,errors},null,2));
  console.log('PASS: production station DOM; accepted, looted, chose release; 3 choices; +140 once; choice and aftermath screenshots saved. Combat was seeded.');
} finally {await browser?.close();await new Promise((r)=>server.close(r));}
