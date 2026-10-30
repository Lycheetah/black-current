/* A new blueprint and a new campaign are different actions. Full campaign
 * changes are confirmed, backed up, durably written, then booted cleanly. */
(() => {
  'use strict';
  const KEY='biotank_forge_save_v2',BACKUP='black_current_previous_campaign_v1';
  const LEGACY=['biotank_forge_player','biotank_forge_progress','bcforge_shipyard_draft_v1','bcforge_shipyard_roster_v1'];
  const copy=x=>JSON.parse(JSON.stringify(x));let ready=false,entry=null,editing=false,persist;
  const notice=(text,bad=false)=>{if(window.garage)garage.banner(text,bad?'bad':'good');};
  function archive(doc){return{v:1,at:new Date().toISOString(),doc:copy(doc),legacy:Object.fromEntries(LEGACY.map(k=>[k,localStorage.getItem(k)]))};}
  const full=e=>e&&(e.name==='QuotaExceededError'||e.code===22||e.code===1014||/quota/i.test(e.message||''));
  // This origin (lycheetah.github.io) shares one storage allowance with every other page published there.
  function largest(){const rows=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);rows.push([k,(localStorage.getItem(k)||'').length]);}}catch{}return rows.sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>k+' '+Math.round(n/1024)+' KB').join(', ');}
  function download(text,name){const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  // Keep the previous campaign when there is room. When browser storage is full, the older backup goes first;
  // if it still cannot fit, the player may take it as a downloaded file and start anyway.
  function backup(previous){
    const text=JSON.stringify(archive(previous));
    try{localStorage.setItem(BACKUP,text);return true;}catch(e){if(!full(e))throw e;}
    try{localStorage.removeItem(BACKUP);localStorage.setItem(BACKUP,text);return true;}catch(e){if(!full(e))throw e;}
    if(!window.confirm('Browser storage for this site is full ('+largest()+').\n\nDownload your current campaign as a file and start the new campaign without an in-browser backup?'))throw new Error('browser storage is full; nothing was reset.');
    download(text,'black-current-campaign-backup.json');return false;
  }
  function write(backedUp){
    if(persist.call(saveState))return true;
    // The legacy keys are deleted after a successful reset anyway; free them first when space is short.
    for(const key of LEGACY){try{localStorage.removeItem(key);}catch{}}
    if(persist.call(saveState))return true;
    if(!backedUp)return false;
    // The old campaign is safe in a backup or a downloaded file: release its slot, and put it back if the new one still cannot fit.
    let old=null;try{old=localStorage.getItem(KEY);localStorage.removeItem(KEY);}catch{}
    if(persist.call(saveState))return true;
    try{if(old!==null)localStorage.setItem(KEY,old);}catch{}
    return false;
  }
  function replace(next,previous){
    const before=saveState.doc,paused=engine.paused;let oldBackup;
    try{
      oldBackup=localStorage.getItem(BACKUP);const stored=backup(previous);
      engine.paused=true;engine.mouse.down=false;
      saveState.doc=next;
      if(!write(!stored)){
        // The backup fitted but left no room for the new save: offer it as a file instead.
        if(!stored||!window.confirm('Browser storage for this site is full ('+largest()+').\n\nDownload your current campaign as a file and start the new campaign without an in-browser backup?'))throw new Error('the fresh save could not be written ('+largest()+').');
        download(localStorage.getItem(BACKUP),'black-current-campaign-backup.json');localStorage.removeItem(BACKUP);oldBackup=undefined;
        if(!write(true))throw new Error('the fresh save could not be written ('+largest()+').');
      }
    }catch(e){
      saveState.doc=before;engine.paused=paused;
      try{if(oldBackup===null)localStorage.removeItem(BACKUP);else if(oldBackup!==undefined)localStorage.setItem(BACKUP,oldBackup);}catch{}
      notice('Campaign unchanged: '+e.message,true);return false;
    }
    // A valid v2 document now exists; old automatic-import keys cannot resurrect it.
    for(const key of LEGACY){try{localStorage.removeItem(key);}catch{}}
    editing=false;entry=null;api.reload();return true;
  }
  function start(profile=saveState.profile){
    const name=sanitizeCallsign(profile.callsign||'');if(name.length<2){notice('Enter a callsign with at least two characters.',true);return false;}
    if(!window.confirm('Start a completely NEW CAMPAIGN?\n\nMass, money, inventory, upgrades and the ship reset. The previous campaign is backed up and can be restored from My builds.'))return false;
    const previous=entry||saveState.doc,next=defaultSave();
    next.profile={...next.profile,callsign:name,crew:CREWS[profile.crew]?profile.crew:next.profile.crew,hullStyle:HULL_STYLES[profile.hullStyle]?profile.hullStyle:next.profile.hullStyle,
      palette:next.palettes.includes(profile.palette)?profile.palette:next.profile.palette,decal:next.decals.includes(profile.decal)?profile.decal:next.profile.decal};
    const hulls=typeof fleet!=='undefined'?fleet.starterHulls():null;
    if(hulls?.[next.profile.hullStyle])next.design=copy(hulls[next.profile.hullStyle]);
    if(window.noviceFleet)noviceFleet.prepareSave(next);
    next.workshop={v:1,builds:{},draft:copy(next.design),editTarget:'active',activeSnapshot:JSON.stringify(next.design)};
    if(saveState.doc.settings)next.settings=copy(saveState.doc.settings);
    if(saveState.doc.audio)next.audio=copy(saveState.doc.audio);
    next.metal=100;next.starterMetalVersion=1;next.launched=true;next.freshCampaignBoot=true;next.firstShipWorkshop={v:1,active:!window.starterJourney?.quickLaunching};
    return replace(next,previous);
  }
  function restore(){
    let a;try{a=JSON.parse(localStorage.getItem(BACKUP)||'null');}catch{}
    if(!a?.doc?.profile||!a.doc.design?.nodes?.some(n=>n.type==='core')){notice('No valid previous campaign backup.',true);return false;}
    if(!window.confirm('Restore the previous campaign?\n\nYour current campaign becomes the backup.'))return false;
    const next=copy(a.doc);next.freshCampaignBoot=true;return replace(next,saveState.doc);
  }
  function cancelForm(){
    if(!editing||!entry)return;const previous=entry;entry=null;editing=false;
    saveState.doc=copy(previous);progression.loadProgress();engine.applyIdentity();
  }
  function wire(){
    const host=document.getElementById('build-library-actions');if(!host||document.getElementById('campaign-start-fresh'))return;
    for(const [id,text,fn]of[['campaign-start-fresh','New campaign · reset progress',()=>start()],['campaign-restore','Restore previous campaign',restore],['campaign-export','Export campaign backup',()=>{
      const data=localStorage.getItem(BACKUP);if(!data){notice('No previous campaign backup.',true);return;}
      const u=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='black-current-previous-campaign.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
    }]]){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.onclick=fn;host.append(b);}
  }
  const api=window.freshCampaign={get ready(){return ready;},start,restore,get backupKey(){return BACKUP;},reload:()=>location.reload()};
  function install(){
    persist=saveState.save;
    // Hull/crew pickers may preview a new character without overwriting the old run.
    saveState.save=function(...args){return editing?true:persist.apply(this,args);};
    document.getElementById('btn-menu-new')?.addEventListener('click',()=>{entry=copy(saveState.doc);editing=true;},true);
    document.getElementById('btn-newgame-back')?.addEventListener('click',cancelForm,true);
    const form=document.getElementById('title-newgame');
    if(form)new MutationObserver(()=>{if(form.style.display==='none')cancelForm();}).observe(form,{attributes:true,attributeFilter:['style']});
    const launch=garage.launch;
    garage.launch=function(continuing){
      if(!continuing&&(saveState.doc.launched||entry&&(entry.totalMass||entry.metal>(entry.starterMetalVersion===1?100:0)||entry.inventory?.length))){
        const callsign=sanitizeCallsign(document.getElementById('title-callsign')?.value||'');
        if(callsign.length<2)return launch.call(this,continuing);
        start({...saveState.profile,callsign});return false;
      }
      if(!continuing){editing=false;entry=null;}return launch.call(this,continuing);
    };
    const note=document.getElementById('title-newgame-note');if(note)note.textContent='New campaign resets mass, money, inventory, upgrades and ship. Your previous campaign is backed up; Continue keeps it.';
    const open=workshopLibrary.open;workshopLibrary.open=function(...args){const r=open.apply(this,args);wire();return r;};wire();ready=true;
    if(saveState.doc.freshCampaignBoot){
      delete saveState.doc.freshCampaignBoot;
      if(persist.call(saveState))garage.launch(true);
      else notice('Fresh campaign saved. Continue when browser storage is available.',true);
    }
  }
  window.addEventListener('load',()=>setTimeout(install,50));
})();
