import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

process.env.PULSE_SERVER='unix:/nonexistent';
const dir='shots/audio-forge';mkdirSync(dir,{recursive:true});
const checks=[],errors=[],data={},samples=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const browser=await firefox.launch(),context=await browser.newContext({viewport:{width:1214,height:700}}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8811/black-current/');
  await page.waitForFunction(()=>window.batteryAudio?.ready&&window.stationGrid?.ready);
  await page.locator('#btn-menu-new').click();await page.evaluate(()=>civilisations.choose('savanah'));
  await page.locator('#title-callsign').fill('AUDIO WITNESS');await page.locator('#btn-title-quick').click();
  await page.evaluate(()=>{
    garage.closeMission();engine.paused=true;
    Object.assign(engine.player,{x:0,y:0});Object.assign(engine.camera,{x:-engine.viewportWidth/1.24,y:-engine.viewportHeight/1.24,zoom:.62});
    window.__audioRender=async({kind='w:spitter',position=null,master=1,sfx=1,stress=false,pops=false})=>{
      const c=new OfflineAudioContext(2,48000,24000),se=new SoundEngine();se.ctx=c;se.buildBuses();se.extraVoices={...soundEngine.extraVoices};se.muted=false;se.setMix({master,music:0,sfx});
      const targets=[],gain=se.musicBus.gain,method=gain.setTargetAtTime.bind(gain);
      gain.setTargetAtTime=(value,...a)=>{targets.push(value);return method(value,...a);};
      let admitted;
      if(stress){const weapons=Array.from({length:100},(_,i)=>se.voice('w:stress-'+i)).filter(Boolean).length,impacts=Array.from({length:100},(_,i)=>se.voice('bc-impact:stress-'+i)).filter(Boolean).length,cues=[se.voice('sonar'),se.voice('heartbeat')],overflow=se.voice('ui');admitted={weapons,impacts,cues,overflow,active:se.activeVoices,groups:{...se.voiceGroups}};}
      else if(pops){for(let i=0;i<100;i++)se.playBubblePop(['small','medium','large'][i%3]);admitted={active:se.activeVoices,groups:{...se.voiceGroups}};}
      else admitted=se.voice(kind,position);
      const buffer=await c.startRendering();await new Promise(r=>setTimeout(r,0));
      const channels=[buffer.getChannelData(0),buffer.getChannelData(1)],N=buffer.length,sr=buffer.sampleRate,energy=[0,0];let peak=0,crossings=0,total=0;
      const mono=new Float32Array(N);
      for(let i=0;i<N;i++){mono[i]=(channels[0][i]+channels[1][i])/2;for(let ch=0;ch<2;ch++){const v=channels[ch][i];energy[ch]+=v*v;peak=Math.max(peak,Math.abs(v));}total+=mono[i]*mono[i];if(i>0&&i<sr*.25&&mono[i]*mono[i-1]<0)crossings++;}
      let sum=0,t95=0;for(let i=0;i<N;i++){sum+=mono[i]*mono[i];if(sum>=total*.95){t95=i/sr;break;}}
      const bytes=new ArrayBuffer(44+N*4),view=new DataView(bytes),put=(at,text)=>[...text].forEach((ch,i)=>view.setUint8(at+i,ch.charCodeAt(0)));
      put(0,'RIFF');view.setUint32(4,36+N*4,true);put(8,'WAVE');put(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sr,true);view.setUint32(28,sr*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);put(36,'data');view.setUint32(40,N*4,true);
      for(let i=0;i<N;i++)for(let ch=0;ch<2;ch++)view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,channels[ch][i]))*32767),true);
      const u8=new Uint8Array(bytes);let binary='';for(let i=0;i<u8.length;i+=16384)binary+=String.fromCharCode(...u8.subarray(i,i+16384));
      return{wav:btoa(binary),peak,rms:Math.sqrt(total/N),energy,zcr:crossings/.5,t95,admitted,peakVoices:se.voicePeak,remaining:se.activeVoices,groups:se.voiceGroups,stats:se.voiceStats,mixTargets:targets};
    };
  });
  data.lexical=await page.evaluate(()=>{const alias=window.engine;delete window.engine;try{return{lexical:typeof engine!=='undefined',normallyExposed:!!alias,spatialWithoutAlias:soundscapeMix.spatial({x:900,y:0})};}finally{window.engine=alias;}});
  check('spatial sound still resolves the lexical engine when its window alias is absent',data.lexical.lexical&&data.lexical.spatialWithoutAlias.pan>0);
  const capture=async(name,opts)=>{const r=await page.evaluate(opts=>__audioRender(opts),opts);writeFileSync(`${dir}/${name}.wav`,Buffer.from(r.wav,'base64'));delete r.wav;samples.push(name);return r;};
  data.families={};
  for(const [family,kind] of [['electro-kinetic','spitter'],['rail','driver-point'],['beam','bolt-point'],['missile','seeker-point'],['ordnance','shell-point']])data.families[family]=await capture(family,{kind:'w:'+kind});
  check('all five weapon families render non-silent finite unclipped stereo audio',Object.values(data.families).every(r=>r.admitted&&Number.isFinite(r.rms)&&r.rms>.0005&&r.peak<.98&&r.energy.every(e=>e>0)),data.families);
  check('rail and beam have measurably brighter reports than ordnance',data.families.rail.zcr>data.families.ordnance.zcr*1.5&&data.families.beam.zcr>data.families.ordnance.zcr*1.5);
  data.capital=await capture('capital-ordnance',{kind:'w:shell-capital'});
  check('capital ordnance has a longer measured energy envelope than novice ordnance',data.capital.t95>data.families.ordnance.t95*1.35,{point:data.families.ordnance.t95,capital:data.capital.t95});
  data.left=await capture('left-beam',{kind:'w:bolt-point',position:{x:-900,y:0}});data.right=await capture('right-beam',{kind:'w:bolt-point',position:{x:900,y:0}});
  check('actual stereo samples pan left and right with the ship position',data.left.energy[0]>data.left.energy[1]*4&&data.right.energy[1]>data.right.energy[0]*4);
  data.spatial=await page.evaluate(()=>{const near=soundscapeMix.spatial({x:100,y:0}),far=soundscapeMix.spatial({x:2500,y:0});engine.camera.zoom=.3;const zoomed=soundscapeMix.spatial({x:2500,y:0});return{near,far,zoomed};});
  check('distance attenuates the sound without changing loudness when zooming',data.spatial.near.gain>data.spatial.far.gain&&data.spatial.far.gain===data.spatial.zoomed.gain);
  data.stress=await capture('full-battery-stress',{stress:true});
  check('a 200-call storm admits six weapons and two impacts, then leaves two cue slots',data.stress.admitted.weapons===6&&data.stress.admitted.impacts===2&&data.stress.admitted.cues.every(Boolean)&&!data.stress.admitted.overflow&&data.stress.peakVoices===10,data.stress.admitted);
  check('the stress mix remains unclipped and every short voice disconnects',data.stress.peak<.98&&data.stress.remaining===0&&Object.values(data.stress.groups).every(n=>n===0),data.stress);
  data.pops=await capture('legacy-hit-stress',{pops:true});
  check('one hundred legacy pop calls share the four-impact ceiling and clean up',data.pops.peakVoices<=4&&data.pops.peakVoices>0&&data.pops.remaining===0&&data.pops.stats.dropped>0);
  data.silent=await capture('effects-muted',{kind:'w:spitter',sfx:0});data.master=await capture('master-muted',{kind:'w:spitter',master:0});
  check('zero effects and zero master produce silent rendered audio',data.silent.peak===0&&data.master.peak===0);
  data.music=await page.evaluate(async()=>{
    const c=new OfflineAudioContext(2,24000,24000),se=new SoundEngine();se.ctx=c;se.buildBuses();se.extraVoices={...soundEngine.extraVoices};se.muted=false;se.setMix({music:.6});
    const targets=[],g=se.musicBus.gain,prior=g.setTargetAtTime.bind(g);g.setTargetAtTime=(v,...a)=>{targets.push(v);return prior(v,...a);};se.voice('w:spitter');await c.startRendering();await new Promise(r=>setTimeout(r,0));return{targets,mix:se.mix};
  });
  check('weapon ducking restores the chosen music level after the report',data.music.targets.some(v=>Math.abs(v-.6*.78)<.0001)&&Math.abs(data.music.targets.at(-1)-.6)<.0001&&data.music.mix.music===.6,data.music);
  data.route=await page.evaluate(()=>{
    const original=soundEngine.voice,heard=[],before=engine.projectiles.length;let merged;
    try{soundEngine.voice=(kind,position)=>{heard.push({kind,x:position?.x,y:position?.y});return true;};batteryAudio.reset();engine.fireMountGroup('spitter',[{x:12,y:34,angle:0},{x:16,y:38,angle:0}],1);for(let i=0;i<50;i++)soundEngine.playWeaponShot('spitter',{x:0,y:0});merged=batteryAudio.stats.merged;}finally{soundEngine.voice=original;}
    return{heard,projectiles:engine.projectiles.length-before,merged};
  });
  check('real engine battery fire reaches one spatial family report while producing both projectiles',data.route.projectiles===2&&data.route.heard.length===1&&data.route.heard[0].kind==='w:spitter'&&data.route.heard[0].x===12&&data.route.merged>=50,data.route);
  data.heartbeat=await page.evaluate(()=>{
    const voice=soundEngine.voice,old={paused:engine.paused,map:engine.mapOpen,hp:engine.player.hp,dead:engine.player.dead,step:soundEngine.step},heard=[];
    try{soundEngine.voice=(kind)=>{heard.push(kind);return true;};engine.paused=false;engine.mapOpen=false;engine.player.dead=false;engine.player.hp=engine.player.maxHp*.2;soundEngine.step=0;soundEngine.scheduleStep(soundEngine.ctx.currentTime+.01,soundEngine.bed());engine.paused=true;soundEngine.scheduleStep(soundEngine.ctx.currentTime+.02,soundEngine.bed());}finally{soundEngine.voice=voice;engine.paused=old.paused;engine.mapOpen=old.map;engine.player.hp=old.hp;engine.player.dead=old.dead;soundEngine.step=old.step;}
    return heard;
  });
  check('low-hull heartbeat is reached in flight and suppressed while paused',data.heartbeat.filter(k=>k==='heartbeat').length===1,data.heartbeat);
  await page.evaluate(()=>menu.openPanel('settings','pause'));
  await page.locator('#set-sfx').fill('35');await page.locator('#set-sfx').dispatchEvent('input');
  check('the native effects slider updates the one saved mix',await page.evaluate(()=>Math.abs(soundEngine.mix.sfx-.35)<.0001&&Math.abs(menu.settings().sfx-.35)<.0001));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/settings-phone.png`});
  check('no application exceptions',errors.length===0,errors);
}catch(e){errors.push(e.stack);check('audio witness completed',false,e.message);}
finally{
  writeFileSync(`${dir}/listen.html`,'<!doctype html><meta name="viewport" content="width=device-width"><title>Black Current audio samples</title><style>body{background:#091722;color:#cee6e6;font:16px system-ui;max-width:650px;margin:24px auto;padding:16px}audio{display:block;width:100%}section{margin:20px 0}</style><h1>Black Current · local audio samples</h1><p>Procedural voices rendered through the actual game audio graph. Start with low playback volume. Sound quality and phone feel need your ears.</p>'+samples.map(name=>`<section><p>${name}</p><audio controls preload="none" src="${name}.wav"></audio></section>`).join(''));
  const report={checks,errors,data,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};writeFileSync(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors}));await browser.close();if(report.failed||errors.length)process.exitCode=1;
}
