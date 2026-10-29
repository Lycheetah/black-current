/* Live readouts observe the authoritative wallet. They never grant, spend,
 * reset or save money. Pause must not freeze transaction feedback. */
(() => {
  'use strict';
  let ready=false,queued=false,lastMoney=null;
  const format=n=>Math.round(n).toLocaleString('en-US');
  function paint(){
    const el=document.getElementById('hud-mass-count');if(!el)return;
    const raw=Number(saveState.doc.metal??0),valid=Number.isFinite(raw)&&raw>=0;
    const money=hubs.metal,capacity=window.upgradePath?upgradePath.capacity():progression.getTotalGP(),mass=progression.totalMass;
    const mobile=document.documentElement.classList.contains('mobile-layout');
    const text=!valid?'Wallet unavailable':mobile?`${format(money)} metal · ${format(capacity)} slots`:`${format(money)} metal · ${format(mass)} biomass · ${format(capacity)} slots`;
    if(el.textContent!==text)el.textContent=text;
    el.dataset.wallet=valid?String(money):'invalid';el.dataset.capacity=String(capacity);el.dataset.mass=String(mass);
    const label=valid?`Spendable metal: ${format(money)}. Biomass: ${format(mass)}. Module capacity: ${format(capacity)}.`:'Wallet data is invalid; the saved balance has not been changed.';
    el.title=label;el.setAttribute('aria-label',label);
    if(valid){
      for(const id of['armory-wallet','salvage-wallet','dock-metal','build-metal']){
        const node=document.getElementById(id);if(!node)continue;
        const next=node.textContent.replace(/^[\d,.]+(?=\s+metal\b)/,format(money));if(next!==node.textContent)node.textContent=next;
      }
      if(lastMoney!==money){lastMoney=money;window.dispatchEvent(new CustomEvent('black-current-wallet',{detail:{metal:money}}));}
    }
  }
  function queuePaint(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;paint();});}
  function install(){
    const hud=engine.updateHUD;engine.updateHUD=function(...args){const result=hud.apply(this,args);paint();return result;};
    const property=Object.getOwnPropertyDescriptor(hubs,'metal');
    Object.defineProperty(hubs,'metal',{...property,set(value){property.set.call(this,value);paint();}});
    const save=saveState.save;saveState.save=function(...args){try{return save.apply(this,args);}finally{queuePaint();}};
    new MutationObserver(queuePaint).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',queuePaint);document.addEventListener('visibilitychange',queuePaint);
    ready=true;paint();
  }
  window.walletHUD={get ready(){return ready;},paint};window.addEventListener('load',()=>setTimeout(install,0));
})();
