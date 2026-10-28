/* Midrange air, navigation tones and battle pulse through the saved music bus.
 * Three sustained sources per audio graph; sparse notes have a six-voice cap. */
(() => {
  'use strict';
  const build=SoundEngine.prototype.buildBuses;
  SoundEngine.prototype.buildBuses=function(...args){
    const r=build.apply(this,args),c=this.ctx,air=c.createGain(),chime=c.createGain();
    air.gain.value=0;chime.gain.value=.028;air.connect(this.musicBus);chime.connect(this.musicBus);
    const tones=[1,1.5].map(ratio=>{
      const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=261.64*ratio;g.gain.value=.45;
      o.connect(g);g.connect(air);o.start();return o;
    });
    const wind=c.createBufferSource(),filter=c.createBiquadFilter(),windGain=c.createGain();
    wind.buffer=this.noise;wind.loop=true;filter.type='bandpass';filter.frequency.value=850;filter.Q.value=.7;windGain.gain.value=.34;
    wind.connect(filter);filter.connect(windGain);windGain.connect(air);wind.start();
    this.currentAmbience={air,chime,tones,wind,filter,active:0,peak:0,played:0};
    return r;
  };
  const state=SoundEngine.prototype.applyState;
  SoundEngine.prototype.applyState=function(immediate,...args){
    const r=state.call(this,immediate,...args),a=this.currentAmbience;if(!a)return r;
    const t=this.ctx.currentTime,tau=immediate?.01:.7,bed=this.bed();
    const level=this.state==='DEATH'?0:this.state==='BOSS'?.012:this.state==='COMBAT'?.026:this.biome==='GARAGE'?.014:.022;
    a.air.gain.setTargetAtTime(level,t,tau);
    a.tones[0].frequency.setTargetAtTime(bed.root*4,t,tau);a.tones[1].frequency.setTargetAtTime(bed.fifth*4,t,tau);
    a.filter.frequency.setTargetAtTime(this.state==='COMBAT'?1250:this.biome==='PRESSURE'?560:850,t,tau);
    return r;
  };
  function note(se,when,freq,duration,pan,volume){
    const a=se.currentAmbience;if(a.active>=6)return false;
    const c=se.ctx,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
    o.type=se.state==='COMBAT'?'triangle':'sine';o.frequency.setValueAtTime(freq,when);p.pan.value=pan;
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(volume,when+.035);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    o.connect(g);g.connect(p);p.connect(a.chime);a.active++;a.peak=Math.max(a.peak,a.active);a.played++;
    o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();a.active--;};o.start(when);o.stop(when+duration+.02);return true;
  }
  const schedule=SoundEngine.prototype.scheduleStep;
  SoundEngine.prototype.scheduleStep=function(when,bed,...args){
    const r=schedule.call(this,when,bed,...args);if(!this.currentAmbience||['DEATH','VICTORY','BOSS'].includes(this.state))return r;
    // A call/answer navigation motif; combat tightens it into a restrained pulse.
    if(this.step%8===0){
      const i=(this.step/8)%2,notes=bed.arp;
      note(this,when,notes[i],1.65,i?-.45:.45,.65);
      note(this,when+.28,notes[(i+2)%notes.length],1.9,i?.35:-.35,.35);
    }else if(this.state==='COMBAT'&&this.step%4===0)note(this,when,bed.root*4,.28,0,.7);
    return r;
  };
  window.currentSoundscape={get ready(){return !!SoundEngine.prototype.buildBuses;}};
})();
