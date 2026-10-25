/* Build first, quick launch second. The workshop spends only the supplied kit;
 * a saved unfinished first build resumes through Continue. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  let ready=false,active=false,quick=false;
  window.addEventListener('keydown',e=>{
    if(active&&e.code==='Escape'){
      e.preventDefault();e.stopImmediatePropagation();
      if($('wallet-panel')?.open){resourceWallet.close();return;}
      if($('hangar-picker')?.open){$('hangar-picker').close();return;}
      message('Finish your ship below, or choose Use premade. Your draft is saved.');
    }
  },true);
  function message(text){if($('modular-message'))$('modular-message').textContent=text;}
  function blocker(d){
    try{
      const q=modularShips.quote(d),m=q.design.modular;
      if(m.hull!=='frigate')return'Your first ship uses the supplied frigate frame.';
      if(m.fittings.filter(f=>modularShips.GEARS[f.gear].kind==='weapon').length!==2)return'Fit your two supplied guns to two light weapon decks.';
      if(!m.fittings.some(f=>modularShips.GEARS[f.gear].kind==='engine'))return'Fit the supplied engine to an engine block.';
      if(q.total)return'Use your supplied kit for this first build. Buy extra hardware after launching.';
      return modularShips.check(d);
    }catch(e){return e.message;}
  }
  function begin(resume=false){
    garage.closeMission();engine.paused=false;hubs.openDock();
    if(!hubs.docked){garage.banner('Return to your home station to finish your first ship.','bad');return;}
    active=true;document.body.classList.add('starter-workshop');
    saveState.doc.firstShipWorkshop={v:1,active:true};
    const prior=resume&&saveState.doc.workshop?.draft?.modular?copy(saveState.doc.workshop.draft):null;
    bay.show();
    const d=prior||noviceFleet.create(saveState.doc.civ);
    if(!prior){d.frame='My first frigate';d.modular.sections=d.modular.sections.filter(s=>s.kind==='bridge');d.modular.fittings=[];d.modular.kit=[];}
    shipyard.edit(()=>{shipyard.design=d;shipyard.syncFields();});shipyard.saveDraft();
    $('modular-close').textContent='Use premade';
    modularPhone.choose('ship');modularYard.refresh();hangarUI.refresh();
    message('Your kit: two light weapon decks, two guns, an engine block + engine, a utility section and five spines. Ten hull sections and four weapons maximum. Pick a hull part, then tap a + to attach it.');
    if(!saveState.save())message('The workshop could not be saved. Keep this page open and retry saving.');
  }
  function finish(premade=false){
    if(!active)return;
    const d=premade?noviceFleet.create(saveState.doc.civ):shipyard.design,why=blocker(d);
    if(why){message(why);return;}
    saveState.doc.firstShipWorkshop.active=false;
    if(!engine.applyDesign(d)){saveState.doc.firstShipWorkshop.active=true;message('Ship was not launched. Your kit and money are unchanged; check the fitting warning.');return;}
    active=false;document.body.classList.remove('starter-workshop');$('modular-close').textContent='Back';
    modularYard.close();if(shipyard.open)shipyard.hide();hubs.closeDock();
    garage.banner('Two guns ready. Try the nearby training range, or talk to the home dockkeeper for your first job.','good');
  }
  function install(){
    if(!window.hangarUI?.ready||!window.noviceFleet?.ready||!window.modularPhone?.ready){setTimeout(install,50);return;}
    // Existing novice captains receive the missing second-gun kit once, without
    // replacing their flying ship, progress, wallet or player-authored layout.
    if(saveState.doc.launched&&saveState.doc.starterFleetVersion===1&&saveState.doc.design?.modular?.novice){
      const before=copy(saveState.doc),h=modularShips.hangar(),gun=noviceFleet.ROWS[saveState.doc.civ]?.gun||'spitter';
      h.owned['section:spine']=Math.max(5,h.owned['section:spine']||0);h.owned['section:deck']=Math.max(2,h.owned['section:deck']||0);h.owned['gear:gun-'+gun+':1']=Math.max(2,h.owned['gear:gun-'+gun+':1']||0);saveState.doc.modularHangar=h;saveState.doc.starterFleetVersion=2;
      if(!saveState.save()){for(const k of Object.keys(saveState.doc))delete saveState.doc[k];Object.assign(saveState.doc,before);}
    }
    $('btn-title-launch').textContent='BUILD MY SHIP';
    const b=document.createElement('button');b.id='btn-title-quick';b.type='button';b.className='btn btn-secondary';b.textContent='Quick launch premade';
    b.onclick=()=>{quick=true;try{garage.launch(false);}finally{quick=false;}};$('btn-title-launch').before(b);
    document.querySelector('#title-newgame .ng-sub').textContent='Build your own two-gun frigate from a supplied kit, or quick launch your civilisation’s premade.';
    const launch=garage.launch;garage.launch=function(continuing){
      const fresh=!saveState.doc.launched,result=launch.apply(this,arguments);
      if(saveState.doc.launched&&garage.el.title.style.display==='none'&&((fresh&&!quick)||saveState.doc.firstShipWorkshop?.active))begin(!!saveState.doc.firstShipWorkshop?.active);
      return result;
    };
    $('modular-close').addEventListener('click',e=>{if(active){e.preventDefault();e.stopImmediatePropagation();finish(true);}},true);
    $('modular-apply').addEventListener('click',e=>{if(active){e.preventDefault();e.stopImmediatePropagation();finish();}},true);
    ready=true;if(saveState.doc.firstShipWorkshop?.active&&garage.el.title.style.display==='none')begin(true);
  }
  window.starterJourney={begin,finish,blocker,get active(){return active;},get quickLaunching(){return quick;},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,100));
})();
