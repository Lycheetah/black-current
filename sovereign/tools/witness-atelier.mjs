// Focused witness for the three new hulls: actual GLB contracts, known-bad controls,
// then the real game renderer, authored-model selection, flight and camera views.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'captures','atelier');
mkdirSync(out,{recursive:true});
const { chromium }=createRequire(import.meta.url)('playwright');
const ships=[
  {slug:'nightglass',id:'cosmic_darkness_specialist_frigate',name:'Nightglass',banks:2,engines:3,length:75},
  {slug:'cinder_cathedral',id:'pagan_ai_dreadnought',name:'Cinder Cathedral',banks:6,engines:5,length:3000},
  {slug:'open_hand',id:'sol_symbiots_carrier',name:'Open Hand',banks:4,engines:4,length:3200},
];
const checks=[];
function check(ok,label){checks.push({label,ok:!!ok});console.log(`${ok?'PASS':'FAIL'} ${label}`);assert.ok(ok,label);}
function glb(bytes){
  assert.equal(bytes.readUInt32LE(0),0x46546c67,'GLB magic');
  assert.equal(bytes.readUInt32LE(4),2,'GLB version');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB declared length');
  assert.equal(bytes.readUInt32LE(16),0x4e4f534a,'JSON chunk');
  return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
}
function contract(data,ship){
  const banks=data.nodes.filter(n=>/^NODE_WPN_/.test(n.name||'')).map(n=>n.name);
  assert.equal(new Set(banks).size,ship.banks,'distinct hardpoints');
  assert.equal(banks.length,ship.banks,'hardpoint count');
  const expected=['FL','FR','ML','MR','AL','AR'].slice(0,ship.banks).map(x=>'NODE_WPN_'+x);
  assert.deepEqual([...banks].sort(),expected.sort(),'bank identity');
  assert.equal(data.nodes.filter(n=>/^ENGINE_/.test(n.name||'')).length,ship.engines,'drive markers');
  const triangles=data.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+data.accessors[p.indices??p.attributes.POSITION].count/3,0);
  assert.ok(triangles>10000 && triangles<=70000,`hero geometry budget: ${triangles}`);
  assert.ok(!data.extensionsRequired?.includes('EXT_meshopt_compression'),'no WebAssembly decoder required');
  assert.ok(data.images?.length>=4,'embedded PBR texture set');
  assert.ok(data.images.every(i=>Number.isInteger(i.bufferView)),'textures embedded');
  const mat=data.materials.find(m=>m.name==='BAKED_HULL');
  assert.ok(mat?.pbrMetallicRoughness?.baseColorTexture,'baked colour');
  assert.ok(mat?.pbrMetallicRoughness?.metallicRoughnessTexture,'baked metal/roughness');
  assert.ok(mat?.normalTexture,'baked normal');
  assert.ok(mat?.emissiveTexture,'baked emission');
  return {triangles,images:data.images.length,hardpoints:banks.length,engines:ship.engines};
}
const receipt={source:'7a437c926568394b477f817acc64f17e53f6b0c9',date:new Date().toISOString(),bake:{atlas:2048,dataSamples:1,aoSamples:4,studioSamples:32},ships:[],checks};
for(const ship of ships){
  const bytes=readFileSync(join(root,'src','data','models',ship.slug+'_hero.glb'));
  const data=glb(bytes);
  const stats=contract(data,ship);
  check(true,ship.name+': GLB geometry, markers and embedded baked PBR');
  const broken=structuredClone(data);
  broken.nodes=broken.nodes.filter(n=>n.name!=='NODE_WPN_FL');
  assert.throws(()=>contract(broken,ship));
  const untextured=structuredClone(data);
  delete untextured.materials.find(m=>m.name==='BAKED_HULL').normalTexture;
  assert.throws(()=>contract(untextured,ship));
  check(true,ship.name+': validator rejects a missing hardpoint and missing normal map');
  receipt.ships.push({...ship,...stats,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}

const types={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.css':'text/css'};
const server=createServer(async(req,res)=>{
  const requestPath=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const review=requestPath.startsWith('/atelier/');
  const folder=review?out:join(root,'dist');
  const relative=review?requestPath.slice('/atelier'.length):requestPath.replace(/^\/dist\//,'/');
  const path=resolve(folder,'.'+relative);
  if(!path.startsWith(folder+'/')){res.writeHead(403);res.end();return;}
  try{const body=await readFile(path);res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
});
let browser;
try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const base=origin+'/sovereign-eclipse.html';
  browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const ship of ships){
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];
    const transfers=[];
    page.on('response',response=>{
      if(response.url().includes('/models/'+ship.slug+'_hero-')){
        transfers.push(response.json().then(data=>createHash('sha256').update(Buffer.from(data.glb,'base64')).digest('hex')).catch(error=>({error:String(error)})));
      }
    });
    page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER_ERROR',ship.name,e.message);});
    page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&/^model load/.test(m.text()))){errors.push(m.text());console.log('BROWSER_CONSOLE',ship.name,m.text());}});
    await page.goto(`${base}?capture&quality=low&hull=${ship.id}`);
    await page.waitForFunction(()=>window.__SE?.modelsReady&&window.__SE.world.tick>3,null,{timeout:180000});
    const hashes=await Promise.all(transfers);
    check(hashes.length===1&&hashes[0]===receipt.ships.find(s=>s.id===ship.id).sha256,ship.name+': browser received the exact baked GLB bytes');
    const selected=await page.evaluate(()=>{
      const s=window.__SE,p=s.getPlayer(),m=s.view.views.get(p.id)?.mesh;
      return {id:p.hullId,name:p.hull.name,model:p.blueprint.model?.src,authored:!!m?.userData.model,
        length:m?.userData.length,banks:p.blueprint.nodes.length,hardpoints:m?.userData.hardpoints.length,
        drives:m?.userData.engines.length,pos:{...p.pos},throttle:p.throttle,tick:s.world.tick};
    });
    check(selected.id===ship.id&&selected.name===ship.name&&selected.model===ship.slug+'_hero.glb'&&selected.authored,ship.name+': real game uses authored hull, without procedural fallback');
    check(selected.length===ship.length&&selected.banks===ship.banks&&selected.hardpoints===ship.banks&&selected.drives===ship.engines,ship.name+': scale, live turrets and engine effects agree with blueprint');
    receipt.ships.find(s=>s.id===ship.id).runtime={...selected,errors};
    console.log('FLIGHT_START',ship.name,JSON.stringify(selected));
    await page.bringToFront();
    await page.locator('#view').focus();
    await page.evaluate(()=>{window.__atelierKey=null;addEventListener('keydown',e=>{window.__atelierKey=e.code;});});
    const direction=selected.throttle>.8?-1:1;
    const key=direction>0?'KeyW':'KeyS';
    await page.keyboard.down(key);
    try{
      await page.waitForFunction(([tick,throttle,direction])=>window.__SE.world.tick>tick+3&&(window.__SE.getPlayer().throttle-throttle)*direction>.01,[selected.tick,selected.throttle,direction],{timeout:30000});
    }catch(error){
      console.log('FLIGHT_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{const p=window.__SE.getPlayer();return {tick:window.__SE.world.tick,throttle:p.throttle,speed:p.speed,dead:p.dead,docked:p.docked,key:window.__atelierKey,focus:document.hasFocus(),active:document.activeElement?.tagName,body:document.body.className};})));
      console.log('FLIGHT_ERRORS',ship.name,JSON.stringify(errors));
      await page.screenshot({path:join(out,ship.slug+'-flight-probe.png'),timeout:5000}).catch(()=>{});
      throw error;
    }
    await page.keyboard.up(key);
    const flown=await page.evaluate(()=>{const p=window.__SE.getPlayer();return {pos:{...p.pos},speed:p.speed,throttle:p.throttle,tick:window.__SE.world.tick};});
    const distance=Math.hypot(...['x','y','z'].map(a=>flown.pos[a]-selected.pos[a]));
    check(flown.tick>selected.tick&&distance>1&&Number.isFinite(flown.speed)&&(flown.throttle-selected.throttle)*direction>.01,ship.name+': throttle input advances flight with finite position and speed');
    await page.keyboard.press('KeyX');
    for(const [tag,yaw,pitch,dist] of [['game',.88,.48,1.75],['game-rear',3.8,.36,1.8]]){
      await page.evaluate(([yaw,pitch,dist])=>{const r=window.__SE.view.rig;r.yaw=yaw;r.pitch=pitch;r.targetDist=r.minDist*dist;r.dist=r.targetDist;},[yaw,pitch,dist]);
      await page.waitForTimeout(800);
      await page.screenshot({path:join(out,ship.slug+'-'+tag+'.png')});
    }
    check(errors.length===0,ship.name+': no browser errors or model-load warnings');
    receipt.ships.find(s=>s.id===ship.id).runtime={...selected,flightDistance:distance,errors};
    await page.close();
  }
  const gallery=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1});
  await gallery.goto(origin+'/atelier/index.html');
  await gallery.waitForFunction(()=>[...document.images].length===3&&[...document.images].every(i=>i.complete&&i.naturalWidth>100));
  await gallery.screenshot({path:join(out,'collection.png'),fullPage:true});
  for(const ship of ships){
    await gallery.locator(`[data-slug="${ship.slug}"] [data-view="game"]`).click();
  }
  await gallery.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>100&&i.src.endsWith('-game.png')));
  await gallery.screenshot({path:join(out,'collection-in-game.png'),fullPage:true});
  check(true,'visual collection: all three studio and game views load, and view controls work');
  await gallery.close();
  receipt.status='passed';
}catch(error){receipt.status='failed';receipt.error=String(error.stack||error);throw error;}
finally{
  await browser?.close();server.close();
  writeFileSync(join(out,'witness.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(`${checks.filter(c=>c.ok).length}/${checks.length} checks; ${receipt.ships.length} GLBs examined; ${receipt.status}`);
}
