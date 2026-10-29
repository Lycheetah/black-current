// Sound probe (Route 2 Stage 1 · sound pass). Plays real combat in the live game and measures every
// bus with analysers: level, peaks, compressor pumping, spectral balance and drone steadiness.
// node scripts/probe-sound.mjs [url] → shots/sound/probe.json
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='shots/sound';mkdirSync(out,{recursive:true});
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(url);await p.waitForFunction(()=>window.terrain?.ready&&window.batteryAudio?.ready);
await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('EARS');await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
const seconds=Number(process.env.PROBE_SECONDS||15);
const result=await p.evaluate(async seconds=>{
 garage.closeMission();soundEngine.init();await soundEngine.ctx.resume();
 civilisations.goHome();worldMap.currentGridX=3;worldMap.currentGridY=1;engine.enterChamber({silent:true});engine.player.iFrames=1e9;engine.paused=false;
 const se=soundEngine,c=se.ctx,taps={};
 const tap=(name,node)=>{if(!node)return;const a=c.createAnalyser();a.fftSize=2048;node.connect(a);taps[name]={a,buf:new Float32Array(a.fftSize),rms:[],peak:[]};};
 tap('master',se.compressor||se.master);tap('music',se.musicBus);tap('sfx',se.sfxBus);
 for(const k of ['pad','sub','arp','perc','tension','boss'])tap('music.'+k,se.buses[k]);
 tap('ambience.air',se.currentAmbience?.air);tap('ambience.chime',se.currentAmbience?.chime);
 const spec=new Float32Array(taps.master.a.frequencyBinCount),bands={sub:[0,120],low:[120,500],mid:[500,2000],presence:[2000,5000],air:[5000,12000]},bandSum=Object.fromEntries(Object.keys(bands).map(k=>[k,0]));
 const reduction=[],voices=[];let frames=0;
 const aim=()=>{const P=engine.player;let best=null,bd=1e9;for(const e of engine.enemies){const d=Math.hypot(e.x-P.x,e.y-P.y);if(d<bd){bd=d;best=e;}}
  if(best){engine.mouse.x=(best.x-engine.camera.x)*engine.camera.zoom;engine.mouse.y=(best.y-engine.camera.y)*engine.camera.zoom;}engine.mouse.down=true;};
 const t0=performance.now();
 while(performance.now()-t0<seconds*1000){
  aim();await new Promise(r=>setTimeout(r,100));
  for(const [k,t] of Object.entries(taps)){t.a.getFloatTimeDomainData(t.buf);let s=0,pk=0;for(const v of t.buf){s+=v*v;pk=Math.max(pk,Math.abs(v));}t.rms.push(Math.sqrt(s/t.buf.length));t.peak.push(pk);}
  taps.master.a.getFloatFrequencyData(spec);const hz=c.sampleRate/2/spec.length;
  for(const [k,[lo,hi]] of Object.entries(bands)){let e=0;for(let i=Math.floor(lo/hz);i<Math.min(spec.length,Math.ceil(hi/hz));i++)e+=Math.pow(10,spec[i]/10);bandSum[k]+=e;}
  reduction.push(se.compressor?.reduction||0);voices.push(se.activeVoices||0);frames++;
  if(!engine.enemies.length){engine.enterChamber({silent:true});}
 }
 engine.mouse.down=false;
 const db=v=>v>0?+(20*Math.log10(v)).toFixed(1):-120,mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
 const buses=Object.fromEntries(Object.entries(taps).map(([k,t])=>{const m=mean(t.rms),sd=Math.sqrt(mean(t.rms.map(v=>(v-m)*(v-m))));return[k,{rmsDb:db(m),peakDb:db(Math.max(...t.peak)),steadiness:m?+(1-sd/m).toFixed(2):0}];}));
 const total=Object.values(bandSum).reduce((a,b)=>a+b,0);
 return{state:c.state,sampleRate:c.sampleRate,mix:{...se.mix},musicState:se.state,biome:se.biome,buses,
  compressor:{meanDb:+mean(reduction).toFixed(1),maxDb:+Math.min(...reduction).toFixed(1),over6dBShare:+(reduction.filter(r=>r<-6).length/Math.max(1,reduction.length)).toFixed(2)},
  voices:{mean:+mean(voices).toFixed(1),max:Math.max(...voices),played:se.voiceStats?.played,dropped:se.voiceStats?.dropped},
  bands:Object.fromEntries(Object.entries(bandSum).map(([k,v])=>[k,+(100*v/total).toFixed(1)])),frames};
},seconds);
result.errors=errors;writeFileSync(out+'/probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,1));
await browser.close();
