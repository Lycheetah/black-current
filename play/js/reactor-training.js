/* Small initial reactor benefits; level-earned points specialise their growth. */
(() => {
  'use strict';
  const NAMES={cilia:'Drive',membrane:'Shield resistance',stingers:'Fire rate'};
  const earned=()=>Math.max(0,progression.getEvolutionData().level-1);
  function ranks(){const source=saveState.doc.reactorTraining?.ranks||{},result={};let left=earned();for(const id of Object.keys(NAMES)){result[id]=Math.min(left,Math.max(0,Math.min(5,Math.floor(Number(source[id])||0))));left-=result[id];}return result;}
  const bonus=id=>.05+.05*ranks()[id];
  function refresh(){for(const id of Object.keys(NAMES)){const effect=(id==='membrane'?'−':'+')+Math.round(bonus(id)*100)+'% '+(id==='cilia'?'thrust':id==='membrane'?'damage taken':'fire rate');ENERGY_MODES[id].effect=effect;const b=document.getElementById('btn-reactor-'+id);if(b){const small=b.querySelector('small');if(small)small.textContent=effect;b.setAttribute('aria-label',NAMES[id]+': '+effect);}if(reactor.el?.pips[id])reactor.el.pips[id].title=effect;}}
  function train(id){if(!Object.hasOwn(NAMES,id))return false;const r=ranks();if(r[id]>=5||Object.values(r).reduce((a,b)=>a+b,0)>=earned())return false;const before=saveState.doc.reactorTraining;r[id]++;saveState.doc.reactorTraining={v:1,ranks:r};if(!saveState.save()){if(before===undefined)delete saveState.doc.reactorTraining;else saveState.doc.reactorTraining=before;return false;}refresh();return true;}
  const oldThrust=reactor.thrustScale,oldShield=reactor.damageTakenScale,oldRate=reactor.fireIntervalScale;
  reactor.thrustScale=function(...args){const raw=oldThrust.apply(this,args);return this.active('cilia')?1+(raw-1)*bonus('cilia'):raw;};
  reactor.damageTakenScale=function(...args){const raw=oldShield.apply(this,args);return this.active('membrane')?1+(raw-1)*bonus('membrane')/.45:raw;};
  reactor.fireIntervalScale=function(...args){const raw=oldRate.apply(this,args);return this.active('stingers')?1/(1+(1/raw-1)*bonus('stingers')/(2/3)):raw;};
  const paint=reactor.paint;reactor.paint=function(...args){const r=paint.apply(this,args);refresh();return r;};
  window.reactorTraining={NAMES,ranks,bonus,earned,train,refresh};window.addEventListener('load',()=>setTimeout(refresh,0));
})();
