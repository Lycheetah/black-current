/* Player-owned builds use the one save document. Legacy editor storage is an archive. */
(() => {
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));let overlay,ready=false,priorPause=true;
  const id=()=>`build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const valid=d=>d&&Array.isArray(d.nodes)&&d.nodes.length>0&&d.nodes.length<=64&&d.nodes.filter(n=>n.type==='core').length===1&&d.nodes.every(n=>[n.dx,n.dy,n.radius].every(Number.isFinite)&&n.radius>=2&&n.radius<=80);
  const doc=()=>{let d=saveState.doc.workshop;if(!d||d.v!==1)d=saveState.doc.workshop={v:1,builds:{},draft:null};if(!d.builds||typeof d.builds!=='object'||Array.isArray(d.builds))d.builds={};return d;};
  const fresh=()=>({id:id(),frame:'New ship',mark:'I',scale:1,color:engine.player.color||'#5ef2e0',primaryWeapon:'spitter',secAbility:'shield',nodes:[{dx:0,dy:0,radius:18,type:'core'}]});
  const library=window.workshopLibrary={get ready(){return ready;},
    newShip(){shipyard.edit(()=>{shipyard.design=fresh();shipyard.sel=-1;shipyard.part=null;shipyard.zoom=0;shipyard.syncFields();});shipyard.saveDraft();shipyard.phonePane('ship');shipyard.toast('Fresh hull. Flying ship and saved builds are safe; Undo restores the draft.');},
    save(){
      shipyard.readFields();if(!valid(shipyard.design)){shipyard.toast('A blueprint needs one valid core and valid fittings.',true);return false;}
      const d=doc(),design=copy(shipyard.design);design.id=design.id&&design.id.startsWith('build-')?design.id:id();design.frame=String(design.frame||'Untitled ship').slice(0,48);
      if(!d.builds[design.id]&&Object.keys(d.builds).length>=24){shipyard.toast('24 builds saved. Export or remove one before adding another.',true);return false;}
      const previous=copy(d);d.builds[design.id]=design;d.draft=copy(design);
      if(!saveState.save()){saveState.doc.workshop=previous;shipyard.toast('Build was not saved: browser storage unavailable.',true);return false;}
      shipyard.design=copy(design);shipyard.register(design);shipyard.syncFields();shipyard.refreshRosterList();shipyard.paint();shipyard.toast('Saved build: '+design.frame+'. Open My builds to load it.');return true;
    },
    load(key){const d=doc().builds[key];if(!valid(d))return false;shipyard.edit(()=>{shipyard.design=copy(d);shipyard.sel=-1;shipyard.part=null;shipyard.zoom=0;shipyard.syncFields();});shipyard.saveDraft();this.close();shipyard.phonePane('ship');shipyard.toast('Loaded '+d.frame+'. Fly applies it.');return true;},
    open(){priorPause=engine.paused;engine.paused=true;paint();overlay.style.display='flex';document.body.classList.add('build-library-open');},
    close(){overlay.style.display='none';document.body.classList.remove('build-library-open');engine.paused=priorPause;},
    editFlying(){const d=saveState.doc.design;if(!valid(d))return false;shipyard.edit(()=>{shipyard.design=copy(d);shipyard.design.id=id();shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();});shipyard.saveDraft();this.close();shipyard.phonePane('ship');return true;},
  };
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
  function paint(){
    const list=document.getElementById('my-build-list');list.replaceChildren();
    for(const[key,d]of Object.entries(doc().builds))if(valid(d)){
      const row=document.createElement('article');row.className='armory-card';const title=document.createElement('h3');title.textContent=d.frame;
      const detail=document.createElement('p');detail.textContent=`${d.nodes.length} parts · ${d.nodes.filter(n=>n.type==='cannon').length} guns · ${d.nodes.reduce((a,n)=>a+fleet.costOfNode(n.type,n.radius),0)} GP`;
      const remove=button('Delete build',()=>{if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent='Confirm delete';return;}shipyard.deleteFromRoster(key);paint();});
      row.append(title,detail,button('Load build',()=>library.load(key)),button('Export build',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(d.frame||'ship').replace(/[^a-z0-9_-]/gi,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),remove);list.append(row);
    }
    if(!list.children.length){const p=document.createElement('p');p.textContent='No builds saved here yet. Create a hull and choose Save build. Older editor data stays in the legacy archive.';list.append(p);}
  }
  function wire(){
    const root=shipyard.el;if(!root)return;
    const clear=root.querySelector('#sy-clear');clear.textContent='New ship';clear.onclick=()=>library.newShip();
    const save=root.querySelector('#sy-save');save.textContent='Save build';save.onclick=()=>library.save();root.querySelector('#sy-fly').textContent='Fly';
    if(!root.querySelector('#sy-my-builds')){const b=button('My builds',()=>library.open());b.id='sy-my-builds';root.querySelector('#sy-close').before(b);}
  }
  function installStorage(){
    doc();
    // The editor's storage adapter changes; node editing, history and flight stay canonical.
    shipyard.savedRoster=()=>copy(doc().builds);shipyard.saveToRoster=()=>library.save();
    shipyard.saveDraft=function(){if(valid(this.design)){const d=doc(),before=d.draft;d.draft=copy(this.design);if(!saveState.save()){d.draft=before;this.toast('Draft was not saved.',true);}}};
    shipyard.loadDraft=function(){this.design=valid(doc().draft)?copy(doc().draft):fresh();};
    shipyard.deleteFromRoster=function(key){if(!doc().builds[key])return;const previous=doc().builds[key];delete doc().builds[key];if(!saveState.save())doc().builds[key]=previous;else{delete FLEET_HULLS[key];const index=fleet.order.indexOf(key);if(index>=0)fleet.order.splice(index,1);}this.refreshRosterList();};shipyard.loadDraft();
  }
  // This runs before the legacy load listeners, so they read the new workspace too.
  installStorage();
  function install(){
    const show=shipyard.show;shipyard.show=function(...args){if(!this.open){this.design=valid(doc().draft)?copy(doc().draft):fresh();this.sel=-1;this.part=null;this.zoom=0;}const result=show.apply(this,args);wire();return result;};
    const build=shipyard.build;shipyard.build=function(...args){const result=build.apply(this,args);wire();return result;};
    overlay=document.createElement('div');overlay.id='build-library';overlay.className='menu-overlay';overlay.style.display='none';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','build-library-title');
    overlay.innerHTML='<div class="menu-card armory-sheet"><header><h2 id="build-library-title">My builds</h2><button id="build-library-close" type="button">Back</button></header><p>Blueprints stay separate from the ship you are flying.</p><div id="build-library-actions"></div><div id="my-build-list"></div><details class="legacy-build-archive"><summary>Legacy archive</summary><p>Older editor saves remain in your browser. They never load into this workspace automatically.</p><button id="export-legacy-builds" type="button">Export old designs</button></details></div>';
    overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(overlay);document.getElementById('build-library-close').onclick=()=>library.close();document.getElementById('build-library-actions').append(button('Edit flying ship',()=>library.editFlying()));
    document.getElementById('export-legacy-builds').onclick=()=>{const archive={};for(const key of['bcforge_shipyard_roster_v1','bcforge_shipyard_draft_v1','biotank_forge_player']){try{archive[key]=JSON.parse(localStorage.getItem(key)||'null');}catch{archive[key]=localStorage.getItem(key);}}const url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='black-current-legacy-builds.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&overlay.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();library.close();}},true);ready=true;
  }
  window.addEventListener('load',()=>setTimeout(install,0));
})();
