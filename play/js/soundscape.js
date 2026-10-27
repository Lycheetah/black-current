/* A bounded procedural mix. Shared noise/reverb; short voices clean up on completion. */
(() => {
  'use strict';
  const LIMITS={total:10,ordinary:8,weapon:6,impact:4};
  const VOICES={
    shot:[240,55,.16,.10,'triangle',.18],laser:[900,430,.11,.05,'sine',.01],rail:[140,35,.3,.10,'sawtooth',.16],
    shield:[1100,360,.23,.06,'sine',.025],hull:[140,38,.16,.09,'triangle',.25],break:[320,44,.32,.09,'triangle',.3],explosion:[80,24,.5,.12,'triangle',.4],
    pickup:[600,1100,.16,.045,'sine',0],sonar:[880,660,.55,.06,'sine',0],ui:[720,540,.065,.025,'sine',0],heartbeat:[85,48,.19,.075,'sine',0,{harmonic:2,harmonicGain:.12}],
    'legacy-pop:small':[420,250,.065,.035,'sine',.06],
    'legacy-pop:medium':[230,90,.12,.055,'triangle',.18,{cutoff:1800,noiseCutoff:1000}],
    'legacy-pop:large':[110,35,.28,.08,'triangle',.32,{cutoff:1200,noiseCutoff:700}]
  };
  const groupOf=kind=>kind.startsWith('w:')?'weapon':kind.startsWith('bc-impact:')||kind.startsWith('legacy-pop:')||['shot','laser','rail','hull','shield','break','explosion'].includes(kind)?'impact':'cue';
  function spatial(position){
    if(!Number.isFinite(position?.x)||!Number.isFinite(position?.y)||typeof engine==='undefined')return{pan:0,gain:1};
    const E=engine,W=E.viewportWidth||innerWidth,sx=(position.x-E.camera.x)*(E.camera.zoom||1);
    return{pan:Math.max(-1,Math.min(1,(sx-W/2)/(W/2))),gain:1/(1+Math.hypot(position.x-E.player.x,position.y-E.player.y)/900)};
  }
  MUSIC_BEDS.BLACKSUN = { root:41.2, fifth:61.74, cutoff:135, arp:[164.81,196,246.94,293.66], arpRate:8, perc:.025, pad:.11, sub:.08, arpGain:.018 };
  const build = SoundEngine.prototype.buildBuses;
  SoundEngine.prototype.buildBuses = function() {
    build.call(this);
    const c=this.ctx, compressor=c.createDynamicsCompressor();
    compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=5;compressor.attack.value=.005;compressor.release.value=.2;
    this.master.disconnect();this.master.connect(compressor);compressor.connect(c.destination);this.compressor=compressor;
    const reverb=c.createConvolver(),impulse=c.createBuffer(2,Math.floor(c.sampleRate*.65),c.sampleRate);
    for(let ch=0;ch<2;ch++){const a=impulse.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);}
    reverb.buffer=impulse;const send=c.createGain();send.gain.value=.1;this.sfxBus.connect(send);send.connect(reverb);reverb.connect(this.master);
    this.reverb=reverb;this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const n=this.noise.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;
    this.activeVoices=0;this.voicePeak=0;this._voiceAt={};this.voiceGroups={weapon:0,impact:0,cue:0};this.voiceStats={played:0,dropped:0};
  };
  SoundEngine.prototype.voice=function(kind,position=null,when=null) {
    if(!this.ctx||this.ctx.state==='closed'||this.muted||this.mix.master===0||this.mix.sfx===0||!this.noise||document.hidden)return false;
    const c=this.ctx,now=Math.max(c.currentTime,when??c.currentTime),group=groupOf(kind),groups=this.voiceGroups;
    if(c.state==='suspended'&&typeof c.startRendering!=='function')c.resume().catch(()=>{this.voiceStats.resumeDenied=(this.voiceStats.resumeDenied||0)+1;});
    const gap=kind==='heartbeat'?.65:kind==='pickup'?.09:kind==='ui'?.06:group==='impact'?.06:.035;
    if((this._voiceAt[kind]??-10)+gap>now||this.activeVoices>=LIMITS.total||group!=='cue'&&this.activeVoices>=LIMITS.ordinary||group!=='cue'&&groups[group]>=LIMITS[group]){this.voiceStats.dropped++;return false;}
    this._voiceAt[kind]=now;
    const spec=VOICES[kind]||this.extraVoices?.[kind]||VOICES.shot;
    let [from,to,duration,volume,wave,noiseVolume,shape={}]=spec;
    if(kind==='pickup'){from+=(this.pickupChain||0)*70;to+=(this.pickupChain||0)*60;}
    const out=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():c.createGain();
    const at=spatial(position);if(pan.pan)pan.pan.value=at.pan;
    out.gain.setValueAtTime(.0001,now);out.gain.linearRampToValueAtTime(volume*at.gain,now+Math.min(duration*.2,shape.attack||.004));out.gain.exponentialRampToValueAtTime(.0001,now+duration);out.connect(pan);pan.connect(this.sfx());
    const osc=c.createOscillator(),tone=c.createBiquadFilter();tone.type='lowpass';tone.frequency.value=shape.cutoff||7000;tone.Q.value=shape.q||.7;
    osc.type=wave;osc.frequency.setValueAtTime(from*(.985+Math.random()*.03),now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);osc.connect(tone);tone.connect(out);
    let noise=null,ng=null,nf=null,harmonic=null,hg=null;
    if(noiseVolume){noise=c.createBufferSource();noise.buffer=this.noise;nf=c.createBiquadFilter();nf.type=shape.noiseType||'bandpass';nf.frequency.value=shape.noiseCutoff||1800;nf.Q.value=shape.noiseQ||.7;ng=c.createGain();ng.gain.value=noiseVolume;noise.connect(nf);nf.connect(ng);ng.connect(out);noise.start(now);noise.stop(now+duration);}
    if(shape.harmonic){harmonic=c.createOscillator();harmonic.type='sine';harmonic.frequency.setValueAtTime(from*shape.harmonic,now);harmonic.frequency.exponentialRampToValueAtTime(to*shape.harmonic,now+duration);hg=c.createGain();hg.gain.value=shape.harmonicGain||.12;harmonic.connect(hg);hg.connect(out);harmonic.start(now);harmonic.stop(now+duration);}
    this.activeVoices++;groups[group]++;this.voiceStats.played++;this.voicePeak=Math.max(this.voicePeak,this.activeVoices);
    if(group==='weapon'&&groups.weapon===1)this.setMix();
    osc.onended=()=>{osc.disconnect();tone.disconnect();noise?.disconnect();nf?.disconnect();ng?.disconnect();harmonic?.disconnect();hg?.disconnect();out.disconnect();pan.disconnect();this.activeVoices=Math.max(0,this.activeVoices-1);groups[group]=Math.max(0,groups[group]-1);if(group==='weapon'&&!groups.weapon&&c.state!=='closed')this.setMix();};
    osc.start(now);osc.stop(now+duration+.02);return true;
  };
  const mix=SoundEngine.prototype.setMix;
  SoundEngine.prototype.setMix=function(...a){const r=mix.apply(this,a);if(this.ctx&&this.ctx.state!=='closed'&&this.musicBus)this.musicBus.gain.setTargetAtTime(this.mix.music*(this.ducked ? .45 : 1)*(this.voiceGroups?.weapon ? .78 : 1),this.ctx.currentTime,.12);return r;};
  // Legacy hit/pickup callers now share the same limiter and cleanup path.
  SoundEngine.prototype.playBubblePop=function(size='small'){return this.voice('legacy-pop:'+(['small','medium','large'].includes(size)?size:'small'));};
  SoundEngine.prototype.playWeaponShot=function(type='spitter',position){return this.voice(['laser','needler','wave'].includes(type)?'laser':['railgun','mortar','lance','torpedo','cluster'].includes(type)?'rail':'shot',position);};
  SoundEngine.prototype.playImpact=function(kind,position){return this.voice(kind,position);};
  const state=SoundEngine.prototype.setMusicState;
  SoundEngine.prototype.setMusicState=function(next,opts={}){if(['HAVEN','REEF','PRESSURE'].includes(next)&&window.galaxy?.rule()==='blacksun'&&!worldMap.getCurrentChamber().isHaven)next='BLACKSUN';return state.call(this,next,opts);};
  const schedule=SoundEngine.prototype.scheduleStep;
  SoundEngine.prototype.scheduleStep=function(when,bed){schedule.call(this,when,bed);if(typeof engine!=='undefined'&&!engine.paused&&!engine.mapOpen&&!engine.player.dead&&engine.player.hp<engine.player.maxHp*.3&&this.step%4===0)this.voice('heartbeat',null,when);};
  window.addEventListener('load',()=>{
    const collect=progression.collectDrop.bind(progression);
    progression.collectDrop=drop=>{const result=collect(drop);const now=performance.now();soundEngine.pickupChain=now-(soundEngine.lastPickup||0)<850?Math.min(7,(soundEngine.pickupChain||0)+1):0;soundEngine.lastPickup=now;soundEngine.voice('pickup');return result;};
    document.addEventListener('click',e=>{if(e.target.closest('button'))soundEngine.voice('ui');},true);
  });
  window.soundscapeMix={LIMITS,VOICES,groupOf,spatial};
})();
