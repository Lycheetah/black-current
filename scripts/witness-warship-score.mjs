// Route 4 item 5 · Warship II sound (js/warship-score.js, js/gun-voices.js). Mac, 2026-10-30: "the sound engine is just a
// monotone whining", "volumes need increasing, as you can always turn it down". The pad walks chords and never holds a
// tritone, the mix is louder behind a limiter and the master fader still silences it, real battery fire reaches the new
// gun voices under battery-audio's merging, Classic gives the old voices back, and Settings → Sound has the choice.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='shots/warship-score';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}),p=await browser.newPage({viewport:{width:1214,height:760}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.warshipScore?.ready&&window.gunVoices?.ready&&window.batteryAudio?.ready);
 // offline renders of a fresh engine: chords by bar, the tritone, loudness and the master fader
 report.data.offline=await p.evaluate(async()=>{
  const goertzel=(x,sr,f)=>{const w=2*Math.PI*f/sr,k=2*Math.cos(w);let s1=0,s2=0;for(let i=0;i<x.length;i++){const s=x[i]+k*s1-s2;s2=s1;s1=s;}return Math.sqrt(Math.max(0,s1*s1+s2*s2-k*s1*s2))/x.length;};
  const render=async master=>{const c=new OfflineAudioContext(1,24000*10,24000),se=new SoundEngine();se.ctx=c;se.buildBuses();se.muted=false;se.setMix({master,music:.7,sfx:.9});se.biome=se.state='PRESSURE';se.applyState(true);
   const bed=se.bed();for(let bar=0;bar<4;bar++){se.step=0;se.scheduleStep(bar*2.5+0.001,bed);}   // four bars of 2.5 s (the chords glide for about a second)
   const b=await c.startRendering(),x=b.getChannelData(0),sr=b.sampleRate,win=s=>x.slice(Math.round((s*2.5+1.8)*sr),Math.round((s*2.5+2.4)*sr));
   const notes=[174.61,196,220,246.94,261.63,293.66,311.13,329.63,392];let peak=0;for(const v of x.subarray(sr/2))peak=Math.max(peak,Math.abs(v));   // after the faders' own 50 ms ramps
   const bars=[0,1,2,3].map(i=>{const w=win(i);return Object.fromEntries(notes.map(f=>[f,+goertzel(w,sr,f).toFixed(5)]));});
   let sq=0;for(const v of x)sq+=v*v;return{bars,peak,rms:Math.sqrt(sq/x.length),pad:[se.padOsc1,se.padOsc2,se.padOsc3].filter(Boolean).length,out:se.out?.constructor?.name,ratio:se.out?.ratio?.value,make:se._score?.make.gain.value};};
  return{on:await render(.8),off:await render(0),prog:warshipScore.PROG};
 });
 const O=report.data.offline,top=b=>Object.entries(b).sort((a,c)=>c[1]-a[1]).slice(0,3).map(([f])=>+f).sort((a,c)=>a-c);
 report.data.tops=O.on.bars.map(top);
 check('the pad is a triad: three voices',O.on.pad===3,O.on.pad);
 check('the pad walks: the loudest notes change from bar to bar (four bars, at least three different chords)',new Set(report.data.tops.map(t=>t.join())).size>=3,report.data.tops);
 check('no chord in any progression holds a tritone',Object.values(O.prog).every(prog=>prog.every(ch=>ch.every(a=>ch.every(b=>Math.abs(a-b)%12!==6)))),O.prog);
 check('the old held tritone (311 Hz over the pressure bed) is never one of the loudest notes',report.data.tops.every(t=>!t.includes(311.13)),report.data.tops);
 check('+10 dB of make-up into a brick-wall limiter after the master fader',O.on.out==='DynamicsCompressorNode'&&O.on.ratio>=20&&Math.abs(O.on.make-3.16)<.01&&O.on.peak<=1,{out:O.on.out,ratio:O.on.ratio,make:O.on.make,peak:O.on.peak});
 check('the master fader still silences everything',O.off.peak<1e-4,O.off.peak);
 // the live game: real battery fire reaches the new voices under battery-audio's merging; Classic gives the old voice back
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('WARSHIP');await p.locator('#btn-title-quick').click();await p.waitForTimeout(600);
 report.data.live=await p.evaluate(async()=>{garage.closeMission();if(starterJourney.active)starterJourney.finish(true);engine.paused=true;soundEngine.init();await soundEngine.ctx.resume();
  const fire=()=>{batteryAudio.reset();const before=engine.projectiles.length;engine.fireMountGroup('spitter',[{x:12,y:34,angle:0},{x:16,y:38,angle:0}],1);return engine.projectiles.length-before;};
  const played=()=>gunVoices.stats.played.kinetic||0,a=played();const shots=fire();const b=played();
  menu.settings().gunVoices='classic';const heard=[],voice=soundEngine.voice;soundEngine.voice=function(kind){heard.push(kind);return voice.apply(this,arguments);};
  try{fire();}finally{soundEngine.voice=voice;menu.settings().gunVoices='warship2';}
  return{shots,newVoices:b-a,afterClassic:played()-b,heard,state:soundEngine.ctx.state};});
 const L=report.data.live;
 check('one battery volley (two guns) is one Warship II report: the hook sits under battery-audio',L.shots===2&&L.newVoices===1,L);
 check('Classic plays the old voice and none of the new',L.afterClassic===0&&L.heard.length===1&&L.heard[0]==='w:spitter',L);
 // Settings → Sound: the choice, saved, and the A/B buttons, after the sliders
 await p.evaluate(()=>{hubs.closeDock?.();});await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.evaluate(()=>{document.getElementById('pause-menu')&&(document.getElementById('pause-menu').style.display='none');});
 await p.evaluate(()=>document.getElementById('btn-pause-settings')?.click()||document.getElementById('btn-menu-settings')?.click());
 await p.waitForSelector('#gun-voices');
 report.data.row=await p.evaluate(()=>{const box=document.getElementById('gun-voices'),prev=box.previousElementSibling;return{choices:box.querySelectorAll('[data-gun-voices]').length,hear:box.querySelectorAll('[data-hear]').length,afterSliders:!!prev&&!/^H3$/.test(prev.tagName),pressed:box.querySelector('[aria-pressed="true"]')?.dataset.gunVoices};});
 await p.locator('[data-gun-voices="classic"]').click();
 report.data.saved=await p.evaluate(()=>({now:menu.settings().gunVoices,saved:JSON.stringify(saveState.doc).includes('"gunVoices":"classic"')||localStorage.getItem('bc-settings')?.includes('classic')||JSON.stringify(localStorage).includes('"gunVoices":"classic"')}));
 await p.locator('#gun-voices').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/settings-sound.png`});
 await p.locator('[data-gun-voices="warship2"]').click();
 check('Settings → Sound: Warship II / Classic and five Hear buttons, below the sliders, Warship II by default',report.data.row.choices===2&&report.data.row.hear===5&&report.data.row.afterSliders&&report.data.row.pressed==='warship2',report.data.row);
 check('choosing Classic takes and is saved',report.data.saved.now==='classic'&&report.data.saved.saved,report.data.saved);
}catch(e){check('witness completed',false,e.message);}
const failed=report.checks.filter(c=>!c.ok).length;writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.checks.length-failed,failed,errors:report.errors}));
await browser.close();process.exit(failed||report.errors.length?1:0);
