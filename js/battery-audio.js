/* Keep the arsenal's family/class voices; merge simultaneous battery reports
 * and reserve headroom for impacts, warnings and the ambient bed. */
(() => {
  'use strict';
  const GAP={kinetic:.085,rail:.12,beam:.10,missile:.18,ordnance:.20},last={};let ready=false;
  const VOICE={
    kinetic:[190,52,.13,.085,'triangle',.7,{cutoff:3200,noiseCutoff:2400,attack:.003}],
    rail:[2300,240,.21,.055,'sawtooth',.14,{cutoff:4400,noiseCutoff:3300,noiseQ:1.4,harmonic:1.5,harmonicGain:.1}],
    beam:[920,380,.23,.055,'sine',0,{cutoff:3200,attack:.012,harmonic:2.01,harmonicGain:.18}],
    missile:[140,390,.34,.07,'triangle',1.2,{cutoff:1600,noiseType:'lowpass',noiseCutoff:1300,attack:.025}],
    ordnance:[125,32,.42,.10,'triangle',1,{cutoff:1300,noiseType:'lowpass',noiseCutoff:700,attack:.004,harmonic:2.2,harmonicGain:.14}]
  };
  const ARCH={repeater:[1.12,.7],scatter:[.85,1.2],stream:[1.2,.6],rifle:[.85,1.35],bolt:[1.15,.65],pulse:[1,1],lance:[.8,1.5],rocket:[1.15,.75],torpedo:[.7,1.45],mortar:[.8,1.2],flak:[1.2,.65],shell:[.7,1.4]};
  const PITCH=[1.25,1.1,1,.85,.7,.55],LENGTH=[.7,.85,1,1.2,1.4,1.65];
  const stats={played:0,merged:0};
  function install(){
    if(!window.noviceFleet?.ready){setTimeout(install,50);return;}
    soundEngine.extraVoices=soundEngine.extraVoices||{};
    for(const[id,g]of Object.entries(arsenal.GUNS)){const v=VOICE[g.family],[pitch,length]=ARCH[g.arch]||[1,1];soundEngine.extraVoices['w:'+id]=[v[0]*PITCH[g.c]*pitch,v[1]*PITCH[g.c]*pitch,v[2]*LENGTH[g.c]*length,v[3]*(1+g.c*.04),v[4],v[5],{...v[6],cutoff:v[6].cutoff*PITCH[g.c]}];}
    const IMPACT={shield:[1500,400,.22,.055,'sine',.08,{harmonic:1.6,harmonicGain:.13}],hull:[155,42,.13,.075,'triangle',.8,{cutoff:2400,noiseCutoff:1600}],explosion:[100,25,.55,.10,'triangle',1.1,{cutoff:1200,noiseType:'lowpass',noiseCutoff:800,harmonic:2,harmonicGain:.12}],break:[410,55,.3,.075,'sawtooth',.5,{cutoff:2700,noiseCutoff:2200}]};
    for(const[k,v]of Object.entries(IMPACT))soundEngine.extraVoices['bc-impact:'+k]=v;
    const impact=soundEngine.playImpact;soundEngine.playImpact=function(kind,position){return IMPACT[kind]?this.voice('bc-impact:'+kind,position):impact.apply(this,arguments);};
    const shot=soundEngine.playWeaponShot;soundEngine.playWeaponShot=function(type,position){
      const family=arsenal.familyOf(type);if(!family)return shot.apply(this,arguments);
      const now=this.ctx?.currentTime??performance.now()/1000;
      if((last[family]??-Infinity)+(GAP[family]||.1)>now||(this.voiceGroups?.weapon||0)>=6){stats.merged++;return false;}
      const result=shot.call(this,type,position);if(result!==false){last[family]=now;stats.played++;}return result;
    };
    ready=true;
  }
  window.batteryAudio={GAP,stats,reset(){for(const k of Object.keys(last))delete last[k];},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,200));
})();
