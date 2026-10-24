/* A bounded procedural mix. Shared noise/reverb; short voices clean up on completion. */
(() => {
  'use strict';
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
    this.activeVoices=0;this.voicePeak=0;this._voiceAt={};
  };
  SoundEngine.prototype.voice=function(kind,position=null,when=null) {
    if(!this.ctx||this.muted||!this.noise||document.hidden)return false;
    const c=this.ctx,now=when??c.currentTime;
    const gap=kind==='ui'?.06:kind==='pickup'?.045:.035;
    if((this._voiceAt[kind]??-10)+gap>now||this.activeVoices>=10)return false;
    this._voiceAt[kind]=now;
    const spec={shot:[240,55,.16,.12,'triangle',.1],laser:[900,430,.11,.055,'sine',.01],rail:[140,35,.3,.14,'sawtooth',.16],shield:[1100,360,.23,.065,'sine',.025],hull:[140,38,.16,.12,'triangle',.13],break:[320,44,.32,.12,'triangle',.22],explosion:[80,24,.5,.16,'triangle',.3],pickup:[600+(this.pickupChain||0)*70,1100+(this.pickupChain||0)*60,.19,.055,'sine',0],sonar:[880,660,.55,.065,'sine',0],ui:[720,540,.065,.025,'sine',0],heartbeat:[60,34,.16,.07,'sine',0]}[kind]||this.extraVoices?.[kind]||[240,55,.16,.08,'triangle',.04];
    const [from,to,duration,volume,wave,noiseVolume]=spec;
    const out=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():c.createGain();
    let distance=1;
    if(position&&window.engine){const z=engine.camera.zoom;const screenX=(position.x-engine.camera.x)*z;const screenY=(position.y-engine.camera.y)*z;distance=1/(1+Math.hypot(screenX-innerWidth/2,screenY-innerHeight/2)/600);if(pan.pan)pan.pan.value=Math.max(-1,Math.min(1,(screenX-innerWidth/2)/(innerWidth/2)));}
    out.gain.setValueAtTime(volume*distance,now);out.gain.exponentialRampToValueAtTime(.0001,now+duration);out.connect(pan);pan.connect(this.sfx());
    const osc=c.createOscillator();osc.type=wave;osc.frequency.setValueAtTime(from*(.98+Math.random()*.04),now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);osc.connect(out);
    let noise=null,ng=null;
    if(noiseVolume){noise=c.createBufferSource();noise.buffer=this.noise;ng=c.createGain();ng.gain.value=noiseVolume;noise.connect(ng);ng.connect(out);noise.start(now);noise.stop(now+duration);}
    this.activeVoices++;this.voicePeak=Math.max(this.voicePeak,this.activeVoices);
    osc.onended=()=>{osc.disconnect();noise?.disconnect();ng?.disconnect();out.disconnect();pan.disconnect();this.activeVoices--;};
    osc.start(now);osc.stop(now+duration+.02);return true;
  };
  SoundEngine.prototype.playWeaponShot=function(type='spitter',position){return this.voice(type==='laser'?'laser':['railgun','mortar'].includes(type)?'rail':'shot',position);};
  SoundEngine.prototype.playImpact=function(kind,position){return this.voice(kind,position);};
  const state=SoundEngine.prototype.setMusicState;
  SoundEngine.prototype.setMusicState=function(next,opts={}){if(['HAVEN','REEF','PRESSURE'].includes(next)&&window.galaxy?.rule()==='blacksun'&&!worldMap.getCurrentChamber().isHaven)next='BLACKSUN';return state.call(this,next,opts);};
  const schedule=SoundEngine.prototype.scheduleStep;
  SoundEngine.prototype.scheduleStep=function(when,bed){schedule.call(this,when,bed);if(window.engine&&!engine.paused&&!engine.player.dead&&engine.player.hp<engine.player.maxHp*.3&&this.step%4===0)this.voice('heartbeat',null,when);};
  window.addEventListener('load',()=>{
    const collect=progression.collectDrop.bind(progression);
    progression.collectDrop=drop=>{const result=collect(drop);const now=performance.now();soundEngine.pickupChain=now-(soundEngine.lastPickup||0)<850?Math.min(7,(soundEngine.pickupChain||0)+1):0;soundEngine.lastPickup=now;soundEngine.voice('pickup');return result;};
    document.addEventListener('click',e=>{if(e.target.closest('button'))soundEngine.voice('ui');},true);
  });
})();
