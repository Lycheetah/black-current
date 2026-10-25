/* One station landing page; existing service handlers own their transactions. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let ready=false;
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
      ['fitting','⌖','Ship fitting','Arrange hulls and fit owned equipment',()=>{bay.show();}],
      ['equipment','▦','Equipment','Buy ordinary weapons once; reuse owned hardware',()=>{bay.show();hangarUI.open('gear',true);}],
      ['upgrades','↗','Upgrades','Larger hulls, reactor training and captain skills',()=>{bay.show();hangarUI.open('training');}],
      ['missions','✦','Missions','Talk to the dockkeeper; follow your current job',()=>pilotRpg.openJournal()],
      ['hold','⬡','Salvage hold','Inspect recovered guns and modules',()=>loot.open()],
      ['supplies','▤','Station stock','Legacy salvage trade and construction supplies',()=>{const d=$('station-details');d.open=!d.open;if(d.open)d.scrollIntoView({block:'nearest'});}],
      ['training','◎','Training range','Practice nearby; almost no income',()=>{travelHelper.training();hubs.closeDock();}],
      ['launch','➤','Launch','Leave the station and fly',()=>hubs.closeDock()]
    ];
    for(const[id,icon,label,detail,run]of items){const b=document.createElement('button');b.type='button';b.dataset.stationService=id;const symbol=document.createElement('span');symbol.className='station-icon';symbol.textContent=icon;const title=document.createElement('strong');title.textContent=label;const p=document.createElement('small');p.textContent=detail;b.append(symbol,title,p);b.onclick=run;station.append(b);}
    const note=document.createElement('p');note.className='station-explainer';note.textContent='Docking repairs your hull. Swap owned equipment anywhere; return here to buy hardware or rebuild hull sections.';
    const details=document.createElement('details');details.id='station-details';const summary=document.createElement('summary');summary.textContent='Station stock & construction';details.append(summary);
    for(const n of [...body.children]){if(n===services)n.hidden=true;else details.append(n);}
    body.prepend(note,station);body.append(details);
    const contact=$('dock-story-contact');if(contact)details.append(contact);
    const next=document.createElement('button');next.id='journey-next';next.type='button';next.className='tm-door';next.onclick=()=>{if(menu.isPaused())menu.resume();pilotRpg.openJournal();};document.querySelector('#pause-menu .tm-doors').prepend(next);
    function objective(){const stage=window.firstExpedition?.state().stage||'offer';return stage==='offer'?'Next: talk to the home dockkeeper for a gun recovery job':stage==='recover'?'Next: recover the recorder in home sector 1,0':stage==='return'?'Next: bring the recorder home and claim your gun':'Next: fit your recovered gun anywhere, then try a tougher sector';}
    function paint(){const text=objective();if(next.textContent!==text)next.textContent=text;if(dock.style.display!=='none'&&note.textContent!==text+'. Docking repairs your hull; buy hardware and rebuild here.')note.textContent=text+'. Docking repairs your hull; buy hardware and rebuild here.';}
    paint();setInterval(paint,1000);ready=true;
  }
  window.stationGrid={get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,110));
})();
