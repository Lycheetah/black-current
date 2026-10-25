/* Mac requested a clean development restart: retire pre-modular campaigns once.
 * Runs before campaign.js. Only Black Current's own storage keys are removed. */
(() => {
  'use strict';
  const epoch='modular-novices-20261025',key='blackCurrent.campaignEpoch';
  const owned=k=>/^(biotank_forge_|bcforge_|black_current_|blackCurrent\.)/.test(k)&&k!==key;
  window.forgeCampaignEpoch={epoch,reset:false,error:null};
  try{
    if(localStorage.getItem(key)===epoch)return;
    const keys=Object.keys(localStorage).filter(owned);
    for(const k of keys)localStorage.removeItem(k);
    localStorage.setItem(key,epoch);
    window.forgeCampaignEpoch.reset=keys.length>0;
  }catch(e){window.forgeCampaignEpoch.error=e.message;}
})();
