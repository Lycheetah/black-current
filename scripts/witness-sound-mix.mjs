// Route 2 Stage 1 · sound pass. Offline renders (any browser): the bed no longer lives in the sub band,
// a gun cuts through the bed, each galaxy region has its own bed, and gun/impact voices are lifted.
// The live in-combat measurement is scripts/probe-sound.mjs (Chromium). Writes shots/sound/report.json.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/sound';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,600)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1214,height:700}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.soundMix?.ready&&window.batteryAudio?.ready&&window.warshipAudio?.ready&&window.terrain?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('EARS');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 report.data=await p.evaluate(async()=>{
  garage.closeMission();engine.paused=true;
  // Goertzel energy at one frequency over a mono buffer
  const tone=(x,sr,f)=>{const w=2*Math.PI*f/sr,k=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<x.length;i++){const s=x[i]+k*s1-s2;s2=s1;s1=s;}return s1*s1+s2*s2-k*s1*s2;};
  const render=async(bed,extra)=>{const c=new OfflineAudioContext(1,48000,24000),se=new SoundEngine();se.ctx=c;se.buildBuses();se.muted=false;se.setMix({master:.8,music:.7,sfx:.9});/* the game's default Settings mix */se.biome=bed;se.state=bed;se.applyState(true);if(extra)extra(se,c);
   const b=await c.startRendering(),x=b.getChannelData(0).slice(12000);let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));
   /* bands, not chosen pitches: the pad walks a chord progression (js/warship-score.js), so the check sums 10 Hz-wide Goertzel bins over 0.1 s windows */const band=(lo,hi)=>{let e=0;const W=Math.round(b.sampleRate/10);for(let i=0;i+W<=x.length;i+=W){const w=x.subarray(i,i+W);for(let f=lo;f<hi;f+=10)e+=tone(w,b.sampleRate,f);}return e;};const sub=band(20,100),body=band(100,3000);return{peak,subShare:sub/(sub+body)};};
  const beds={};for(const name of ['PRESSURE','REEF','NARAKA','EREBOS','AION','CHAOS','DEEP'])beds[name]=await render(name);
  const gun=await render('PRESSURE',(se)=>{se.extraVoices={...soundEngine.extraVoices};se.voice('w:autocannon',null,0.8);});
  // region beds follow the galaxy region outside the home system
  const regions=[];for(const rid of [0,1,2,3,4]){const s=galaxy.data.systems.find(s=>s.rid===rid&&!s.home&&!s.rule);galaxy.enterSystemById(s.id);worldMap.currentGridX=2;worldMap.currentGridY=1;soundEngine.setMusicState('PRESSURE',{force:true});regions.push(soundEngine.biome);}
  galaxy.enterSystemById('home');worldMap.currentGridX=2;worldMap.currentGridY=1;soundEngine.setMusicState('PRESSURE',{force:true});const home=soundEngine.biome;
  const lifted=Object.entries(soundEngine.extraVoices).filter(([k])=>k.startsWith('w:')||k.startsWith('bc-impact:'));
  return{beds,gun,regions,home,lifted:{count:lifted.length,all:lifted.every(([,v])=>v._lifted)}};
 });
 const D=report.data;
 check('no music bed lives in the sub band any more (under 25% of its energy below 100 Hz)',Object.values(D.beds).every(b=>b.subShare<0.25),Object.fromEntries(Object.entries(D.beds).map(([k,v])=>[k,+v.subShare.toFixed(2)])));
 check('a gunshot peaks well above the bed (at least 2×)',D.gun.peak>=D.beds.PRESSURE.peak*2,{gun:D.gun.peak,bed:D.beds.PRESSURE.peak});
 check('the five galaxy regions each play their own bed; home keeps its own',JSON.stringify(D.regions)===JSON.stringify(['NARAKA','EREBOS','AION','CHAOS','DEEP'])&&D.home==='PRESSURE',{regions:D.regions,home:D.home});
 report.data.warship=await p.evaluate(()=>{const E=soundEngine.extraVoices,guns=Object.entries(E).filter(([k])=>k.startsWith('w:'));return{ready:!!window.warshipAudio?.ready,arps:Object.values(MUSIC_BEDS).filter(b=>b.arpGain>0).length,guns:guns.length,layered:guns.filter(([,v])=>v[6]?.war).length,impacts:['hull','shield','explosion','break'].every(k=>E['bc-impact:'+k]?.[6]?.war||k==='shield'&&E['bc-impact:'+k]?.[6]?.war),pickupChime:soundscapeMix.VOICES.pickup[4]==='sine'};});
 check('warship voicing: no bed plays an arpeggio, every gun has a report layer, impacts are metal, pickups are not chimes',report.data.warship.ready&&report.data.warship.arps===0&&report.data.warship.guns>=90&&report.data.warship.layered===report.data.warship.guns&&report.data.warship.impacts&&!report.data.warship.pickupChime,report.data.warship);
 check('every gun and impact voice is lifted once',D.lifted.count>=90&&D.lifted.all,D.lifted);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('sound witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
