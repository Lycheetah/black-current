/* Keep the arsenal's family/class voices; merge simultaneous battery reports
 * and reserve headroom for impacts, warnings and the ambient bed. */
(() => {
  'use strict';
  const GAP={kinetic:.085,rail:.12,beam:.10,missile:.18,ordnance:.20},last={};let ready=false;
  const VOICE={kinetic:[210,48,.12,.08,'triangle',.22],rail:[2100,260,.16,.06,'sawtooth',.015],beam:[880,360,.22,.05,'sine',0],missile:[125,340,.30,.055,'triangle',.30],ordnance:[100,28,.38,.10,'triangle',.28]};
  const PITCH=[1.25,1.1,1,.85,.7,.55],LENGTH=[.7,.85,1,1.2,1.4,1.65];
  const stats={played:0,merged:0};
  function install(){
    if(!window.noviceFleet?.ready){setTimeout(install,50);return;}
    soundEngine.extraVoices=soundEngine.extraVoices||{};
    for(const[id,g]of Object.entries(arsenal.GUNS)){const v=VOICE[g.family];soundEngine.extraVoices['w:'+id]=[v[0]*PITCH[g.c],v[1]*PITCH[g.c],v[2]*LENGTH[g.c],v[3],v[4],v[5]];}
    const IMPACT={shield:[1400,280,.23,.05,'sine',.03],hull:[120,40,.10,.07,'triangle',.2],explosion:[75,22,.45,.09,'triangle',.40],break:[280,40,.22,.08,'sawtooth',.15]};
    for(const[k,v]of Object.entries(IMPACT))soundEngine.extraVoices['bc-impact:'+k]=v;
    const impact=soundEngine.playImpact;soundEngine.playImpact=function(kind,position){return IMPACT[kind]?this.voice('bc-impact:'+kind,position):impact.apply(this,arguments);};
    const shot=soundEngine.playWeaponShot;soundEngine.playWeaponShot=function(type,position){
      const family=arsenal.familyOf(type);if(!family)return shot.apply(this,arguments);
      const now=this.ctx?.currentTime??performance.now()/1000;
      if((last[family]??-Infinity)+(GAP[family]||.1)>now||(this.activeVoices||0)>=6){stats.merged++;return false;}
      const result=shot.call(this,type,position);if(result!==false){last[family]=now;stats.played++;}return result;
    };
    ready=true;
  }
  window.batteryAudio={GAP,stats,reset(){for(const k of Object.keys(last))delete last[k];},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,200));
})();
