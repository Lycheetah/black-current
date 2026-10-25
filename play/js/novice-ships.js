/* Canon-named novice frigates. One blueprint is shared by selection, launch,
 * fitting and flight; the retired freeform UI remains only as an internal adapter. */
(() => {
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  // Five cells around the core: weapon deck, engine, utility, spine, spine.
  const ROWS={
    savanah:{ink:'#45da8a',body:'#233c31',edge:'#bba15f',gun:'repeater-point',shape:[[1,0],[-1,0],[1,-1],[0,-1],[-1,1]],role:'Hook-wing pursuit frigate'},
    'sol-symbiots':{ink:'#6de7ef',body:'#b9c9d0',edge:'#d2b66c',gun:'bolt-point',shape:[[1,0],[-1,0],[0,-1],[0,1],[-2,0]],role:'Covenant escort frigate'},
    chaos:{ink:'#c991ff',body:'#44304e',edge:'#e6ae53',gun:'burst',shape:[[1,0],[-1,0],[1,1],[2,1],[-1,-1]],role:'Asymmetric pulse raider'},
    'cosmic-darkness':{ink:'#b8a9ec',body:'#252b42',edge:'#8e9bae',gun:'driver-point',shape:[[1,-1],[-1,0],[1,0],[0,1],[-1,1]],role:'Crescent precision frigate'},
    'cosmic-light':{ink:'#ffe4a0',body:'#d1cbb5',edge:'#b99245',gun:'lance-point',shape:[[2,0],[-1,0],[1,0],[0,-1],[0,1]],role:'Solar lance frigate'},
    blackhole:{ink:'#ff9956',body:'#262635',edge:'#927a63',gun:'torpedo-point',shape:[[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],role:'Compact torpedo frigate'},
    'hybrid-fused':{ink:'#bb8cde',body:'#74766c',edge:'#c3b598',gun:'scatter-point',shape:[[1,0],[-1,0],[-1,-1],[-2,-1],[0,1]],role:'Stitched close-range frigate'},
    'human-hunters':{ink:'#ffad63',body:'#626b49',edge:'#aaa491',gun:'spitter',shape:[[1,0],[-2,0],[-1,0],[-2,-1],[-2,1]],role:'Industrial pursuit frigate'},
    'ai-hunters':{ink:'#ff626d',body:'#262b34',edge:'#737c8d',gun:'rifle-point',shape:[[3,0],[-1,0],[1,0],[2,0],[-2,0]],role:'Spear-line precision frigate'},
    'amethyst-angels':{ink:'#c58bff',body:'#34303f',edge:'#bba15c',gun:'bolt-point',shape:[[1,0],[-1,0],[0,-1],[1,-1],[0,1]],role:'Gothic energy frigate'},
    'techno-angels':{ink:'#9ce8ff',body:'#b7cbd5',edge:'#8faabd',gun:'burst',shape:[[1,0],[-1,0],[0,1],[1,1],[0,-1]],role:'Crystal-wing pulse frigate'},
    'ai-gods':{ink:'#ffedaf',body:'#bac0c7',edge:'#c2a15a',gun:'lance-point',shape:[[1,0],[-1,0],[0,-1],[-1,-1],[0,1]],role:'Radiant command frigate'},
    'pagan-ai':{ink:'#e7a76a',body:'#716652',edge:'#b38a54',gun:'seeker-point',shape:[[1,0],[-1,0],[0,1],[1,1],[-1,1]],role:'Bronze missile frigate'},
    ai:{ink:'#6edbe5',body:'#56616d',edge:'#879aaa',gun:'repeater-point',shape:[[1,0],[-1,0],[-1,1],[0,1],[1,1]],role:'Modular repeater frigate'},
    'ai-human-gods':{ink:'#ff7a80',body:'#c8bba0',edge:'#c5a15b',gun:'bolt-point',shape:[[2,0],[-1,0],[1,0],[1,-1],[1,1]],role:'Ivory sovereign frigate'}
  };
  const unaligned={ink:'#67dfd0',body:'#455366',edge:'#9aafba',gun:'spitter',shape:[[1,0],[-1,0],[0,-1],[0,1],[-2,0]],role:'Independent novice frigate'};
  const $=id=>document.getElementById(id);let ready=false;
  function pick(){const id=saveState.profile.civ;return Object.hasOwn(ROWS,id)?id:null;}
  function create(id=pick()){
    const row=Object.hasOwn(ROWS,id)?ROWS[id]:unaligned,civ=canon.civilisations.find(c=>c.id===id);
    const name=canon.hulls[id]?.find(h=>h.cls==='Starter Frigate')?.name||'Forge frigate';
    const d=modularShips.make('frigate');d.id='build-novice-'+(civ?.id||'unaligned');d.frame=name;d.color=row.ink;d.primaryWeapon=row.gun;
    d.modular.civ=civ?.id||null;d.modular.novice=true;d.modular.livery={body:row.body,edge:row.edge};
    d.modular.sections=[{id:'core',kind:'bridge',x:0,y:0},...row.shape.map(([x,y],i)=>({id:['gun','engine','utility','port','star'][i],kind:['deck','drive','utility','deck','spine'][i],x,y}))];
    const gear='gun-'+row.gun;if(!modularShips.GEARS[gear])throw new Error('Novice weapon unavailable: '+row.gun);
    d.modular.fittings=[{slot:'gun',gear,mk:1},{slot:'port',gear,mk:1},{slot:'engine',gear:'engine',mk:1}];d.modular.kit=[];
    return modularShips.compile(d).design;
  }
  function prepareSave(doc,id=pick()){
    const d=create(id),owned={'hull:frigate':1};
    for(const s of d.modular.sections)if(s.kind!=='bridge')owned['section:'+s.kind]=(owned['section:'+s.kind]||0)+1;
    owned['section:spine']=(owned['section:spine']||0)+4;
    for(const f of d.modular.fittings)owned['gear:'+f.gear+':1']=(owned['gear:'+f.gear+':1']||0)+1;
    doc.design=copy(d);doc.modularHangar={v:1,rank:0,owned};
    doc.armory=doc.armory?.v===1?doc.armory:{v:1,rack:0,licenses:[]};
    doc.armory.licenses=[...new Set([...(doc.armory.licenses||[]),d.primaryWeapon])];
    doc.profile.civ=d.modular.civ;doc.starterFleetVersion=2;return d;
  }
  function draw(canvas,d){
    if(!canvas||!d?.modular)return;const W=canvas.clientWidth,H=canvas.clientHeight;if(!W||!H)return;
    const art=topdownKit.thumb(d.modular,W,H,d.color);canvas.width=art.width;canvas.height=art.height;canvas.getContext('2d').drawImage(art,0,0);
  }
  function paint(){
    const d=create(),row=ROWS[pick()]||unaligned,civ=canon.civilisations.find(c=>c.id===pick());
    const set=(id,s)=>{if($(id))$(id).textContent=s;};set('ng-hero-name',d.frame);set('ng-hero-desc',row.role+' · '+WEAPON_TYPES[d.primaryWeapon].title);
    set('ng-hero-crew',civ?.name||'Unaligned');set('ng-hero-edge','6 connected sections · 2 guns · 1 engine · starter kit supplied');
    draw($('ng-hero-art'),d);$('ng-hero')?.style.setProperty('--crew',d.color);
    const tile=$('title-hulls')?.querySelector('canvas');if(tile)draw(tile,d);
  }
  function renderChoices(box=$('title-hulls')){
    if(!box)return;box.replaceChildren();const d=create(),row=ROWS[pick()]||unaligned,b=document.createElement('article');b.className='choice-tile hull novice-hull';
    const c=document.createElement('canvas');c.className='tile-art';c.setAttribute('aria-label',d.frame+' modular starter');const n=document.createElement('strong');n.textContent=d.frame;
    const p=document.createElement('span');p.className='tile-feel';p.textContent=row.role+' · customise at the modular shipyard';b.append(c,n,p);box.append(b);paint();
  }
  function refresh(){if(!window.civilisations||typeof topdownKit==='undefined')return;civilisations.render();renderChoices();
    for(const b of document.querySelectorAll('#title-civs [data-civ]')){const d=create(b.dataset.civ||null),art=topdownKit.thumb(d.modular,100,66,d.color);art.className='novice-civ-art';art.setAttribute('aria-hidden','true');b.prepend(art);}
  }
  function install(){
    if(!window.modularYard?.ready||!modularShips.ready||!window.freshCampaign?.ready||!window.civilisations){setTimeout(install,40);return;}
    const starter=engine.starterDesign;engine.starterDesign=function(){return create(saveState.doc.civ??pick())||starter.apply(this,arguments);};
    // Keep the hidden editor's tested data/history adapter, retire its visible screen.
    const show=shipyard.show;shipyard.show=function(...args){const r=show.apply(this,args);if(this.el){this.el.style.setProperty('display','none','important');this.el.inert=true;this.el.setAttribute('aria-hidden','true');}modularYard.open();return r;};
    // The old painter records history only while visible. Structural edits
    // must keep Undo even when that retired canvas has no layout dimensions.
    const edit=shipyard.edit;shipyard.edit=function(...args){const r=edit.apply(this,args);this.recordEdit();if(this.design?.modular)modularYard.refresh();return r;};
    const close=modularYard.close;modularYard.close=function(...args){const r=close.apply(this,args);if(shipyard.open)shipyard.hide();return r;};
    if(typeof organismDesigner!=='undefined')organismDesigner.openDesigner=function(){return shipyard.show();};
    const launch=garage.launch;garage.launch=function(continuing){
      // Civilisation launch wraps the ordinary garage. Continue never replaces a flying ship.
      if(!continuing&&!saveState.doc.launched&&sanitizeCallsign($('title-callsign')?.value||'').length>=2)prepareSave(saveState.doc);
      return launch.apply(this,arguments);
    };
    if(!saveState.doc.launched){prepareSave(saveState.doc);engine.applyDesign(saveState.doc.design,{restore:true});saveState.save();}
    for(const host of[$('modular-yard')?.querySelector('.modular-tools')])if(host&&!$('modular-my-builds')){const b=document.createElement('button');b.id='modular-my-builds';b.textContent='My builds';b.onclick=()=>workshopLibrary.open();host.append(b);}
    workshopLibrary.newShip=function(){const d=create();d.id='build-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);shipyard.edit(()=>{shipyard.design=d;shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();});shipyard.saveDraft();modularYard.open();modularYard.refresh();};
    $('title-newgame-note').textContent='Build your first frigate from supplied parts, or quick launch a premade. Four-gun limit, two guns supplied; ordinary weapons need no research.';
    refresh();$('btn-menu-new')?.addEventListener('click',()=>requestAnimationFrame(refresh));window.addEventListener('resize',()=>{if($('title-newgame')?.style.display!=='none')paint();});
    ready=true;document.documentElement.classList.add('modular-only');
  }
  window.noviceFleet={ROWS,create,prepareSave,renderChoices,paint,draw,refresh,pick,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,80));
})();
