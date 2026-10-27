/* One saved starter allowance for fresh and existing campaigns. */
(() => {
  'use strict';
  let ready=false;
  function starterCredit(){
    const doc=saveState.doc;if(doc.starterMetalVersion===1)return false;
    const hadMetal=Object.hasOwn(doc,'metal'),metal=doc.metal,hadVersion=Object.hasOwn(doc,'starterMetalVersion'),version=doc.starterMetalVersion;
    doc.metal=(Number.isFinite(metal)?Math.max(0,metal):0)+100;doc.starterMetalVersion=1;
    try{if(saveState.save()){window.resourceWallet?.paint(true);return true;}}catch{}
    if(hadMetal)doc.metal=metal;else delete doc.metal;
    if(hadVersion)doc.starterMetalVersion=version;else delete doc.starterMetalVersion;
    return false;
  }
  function install(){
    if(!window.starterJourney?.ready||!window.upgradePath?.ready){setTimeout(install,40);return;}
    starterCredit();ready=true;
  }
  window.salvageTides={starterCredit,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,150));
})();
