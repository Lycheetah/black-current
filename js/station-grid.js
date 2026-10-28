/* One station landing page; existing service handlers own their transactions. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let ready=false,last='';
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const number=n=>Math.round(n||0).toLocaleString();
  function install(){
    if(!window.hangarUI?.ready||!window.starterJourney?.ready||!window.pilotRpg?.ready){setTimeout(install,50);return;}
    const dock=$('dock-panel'),body=dock.querySelector('.dock-body'),services=dock.querySelector('.dock-services');
    dock.classList.add('station-grid');
    // Duplicate freeform/technology doors are retired; the modular shop remains authoritative.
    for(const b of document.querySelectorAll('#dock-panel button,#pause-menu .tm-doors button')){
      if(b.id==='dock-shipyard'||b.id==='dock-vow'||b.dataset.service==='vow'||b.textContent.trim()==='Armoury / upgrades')b.hidden=true;
    }
    const station=document.createElement('nav');station.id='station-services';station.setAttribute('aria-label','Station services');
    const items=[
      ['fitting','Ship fitting','Fit, rotate & build',()=>{bay.show();}],
      ['equipment','Equipment shop','Weapons & systems',()=>{bay.show();hangarUI.open('gear',true);}],
      ['stock','Station specials','Limited faction hardware',()=>{bay.show();hangarUI.open('stock');}],
      ['upgrades','My progression','Next mount, frame & cost',()=>{bay.show();hangarUI.open('path');}],
      ['captain','Captain','Build, perks & augments',()=>{pilotRpg.showBuild();}],
      ['missions','Jobs & bounties','Objectives & fitting rewards',()=>pilotRpg.openJournal()],
      ['hold','Salvage hold','Recovered hardware',()=>loot.open()],
      ['codex','Equipment Codex','Stats & compatible slots',()=>equipmentCodex.open()]
    ];
    for(const[id,label,detail,run]of items){const b=document.createElement('button');b.type='button';b.dataset.stationService=id;const symbol=el('span',null,'station-icon');symbol.append(serviceGlyph(id));b.append(symbol,el('strong',label),el('small',detail));b.onclick=run;station.append(b);}
    const hero=el('section',null,'station-ship');hero.setAttribute('aria-label','Your flying ship');
    const image=new Image();image.className='station-background';image.alt='';image.src=hubs.stationArt.src;
    const preview=el('div',null,'station-ship-art'),info=el('div',null,'station-ship-info');hero.append(image,preview,info);
    const layout=el('div',null,'station-layout');layout.append(hero,station);
    const note=document.createElement('p');note.className='station-explainer';note.textContent='Docking repairs your hull. Swap owned equipment anywhere; return here to buy hardware or rebuild hull sections.';
    const details=document.createElement('details');details.id='station-details';const summary=document.createElement('summary');summary.textContent='Cargo sale & station construction';details.append(summary);
    for(const n of [...body.children]){if(n===services)n.hidden=true;else details.append(n);}
    body.prepend(layout,note);body.append(details);
    const train=el('button','Training range','tm-door');train.id='station-training';train.type='button';train.dataset.stationService='training';train.onclick=()=>{travelHelper.training();hubs.closeDock();};
    const footer=dock.querySelector('.dock-doors');footer.prepend(train);$('dock-undock').dataset.stationService='launch';$('dock-undock').textContent='Launch · E';
    // Captain now has one pictured service tile; preserve the native footer
    // button for old callers but remove the duplicate from the visible flow.
    for(const b of footer.querySelectorAll('button'))if(b.textContent==='Captain / build')b.hidden=true;
    const contact=$('dock-story-contact');if(contact)details.append(contact);
    const next=document.createElement('button');next.id='journey-next';next.type='button';next.className='tm-door';next.onclick=()=>{if(menu.isPaused())menu.resume();pilotRpg.openJournal();};document.querySelector('#pause-menu .tm-doors').prepend(next);
    function objective(){const stage=window.firstExpedition?.state().stage||'offer';return stage==='offer'?'Next: talk to the home dockkeeper for a gun recovery job':stage==='recover'?'Next: recover the recorder in home sector 1,0':stage==='return'?'Next: bring the recorder home and claim your gun':'Next: fit your recovered gun anywhere, then try a tougher sector';}
    function paint(){
      const text=objective();if(next.textContent!==text)next.textContent=text;
      if(dock.style.display==='none')return;
      if(train.parentNode!==footer)footer.prepend(train);
      note.textContent=text;
      const d=saveState.doc.design,m=d?.modular,key=JSON.stringify([d,hubs.metal,progression.totalMass,modularShips.hangar().rank]);if(key===last)return;last=key;
      const wallet=$('dock-metal');wallet.replaceChildren();for(const[label,value]of [['Metal',hubs.metal],['Biomass',progression.totalMass]]){const row=el('span',null,'station-balance');row.append(serviceGlyph(label==='Metal'?'hold':'upgrades'),el('b',number(value)),el('small',label));wallet.append(row);}
      preview.replaceChildren();info.replaceChildren();
      if(!m)return;try{
        const q=modularShips.quote(d),guns=m.fittings.filter(f=>modularShips.GEARS[f.gear]?.weapon).length+(m.kit||[]).filter(k=>modularShips.PIECES[k.piece]?.silo).length;
        preview.append(topdownKit.thumb(m,280,170,d.color));
        info.append(el('small','FLYING SHIP · '+q.hull.cls),el('h3',d.name||'Your ship'));
        const stats=el('div',null,'station-ship-stats');for(const[label,value]of [['Guns',guns],['Modules',q.modules+' / '+q.capacity],['Power',q.power+' / '+q.hull.power]]){const row=el('span');row.append(el('b',String(value)),el('small',label));stats.append(row);}info.append(stats);
        const tip=el('p','Fit owned gear anywhere. Dock to buy hardware or rebuild.');info.append(tip);
      }catch{info.append(el('h3','Inspect your ship'),el('p','Open Ship fitting to review the active layout.'));}
    }
    const open=hubs.openDock;hubs.openDock=function(...args){const r=open.apply(this,args);last='';paint();return r;};
    new MutationObserver(()=>{if(dock.style.display!=='none'){last='';paint();}}).observe(dock,{attributes:true,attributeFilter:['style']});
    paint();setInterval(paint,1000);ready=true;
  }
  window.stationGrid={get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,110));
})();
