/* Ordinary hardware is bought once. Research belongs to special discoveries,
 * not the everyday fight / salvage / refit loop. Registers before restore. */
(() => {
  'use strict';
  const originalOwns=armory.owns.bind(armory);
  const needsResearch=id=>{
    const g=arsenal.GUNS[id];
    return !g || g.c===5 || !!g.special || ['cryo','plasma'].includes(g.gen?.onhit);
  };
  armory.owns=id=>!!WEAPON_TYPES[id]&&(!needsResearch(id)||originalOwns(id));
  window.upgradePath={needsResearch,NOVICE_PRICES:{spitter:4,'repeater-point':6,'scatter-point':8,needler:8,'driver-point':12,'rifle-point':14,'bolt-point':6,burst:10,'lance-point':14,'seeker-point':10,'rocket-point':10,'torpedo-point':16,'mortar-point':12,flak:8,'shell-point':14},capacity(){
    const m=saveState.doc.design?.modular;if(!m||!window.modularShips)return progression.getTotalGP();
    const rank=Math.max(0,Math.min(modularShips.RANK_COST.length,Math.floor(Number(saveState.doc.modularHangar?.rank)||0)));
    return modularShips.HULLS[m.hull].slots+rank+(m.kit||[]).reduce((n,k)=>n+(modularShips.PIECES[k.piece]?.slots||0),0);
  }};
})();
