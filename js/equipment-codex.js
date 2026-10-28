/* A field guide over the existing fitting registries. Collection records are
 * metadata only: quotes, purchases, hardware counts and fitting stay native. */
(() => {
  'use strict';
  const M=()=>modularShips,$=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,run,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=run;return b;};
  const number=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
  const clean=s=>(s||'').replace(/\s*\(.*\)$/,'');
  const TYPES={cannon:'weapon',thruster:'engine',shield:'shield',pod:'armour',bay:'fighter bay',wing:'escort dock',siphon:'siphon',mender:'repair module',spike:'prow fitting'};
  const SIDES={top:'Top',port:'Port',star:'Starboard',prow:'Bow',stern:'Stern'};
  const CATEGORIES=[['all','All'],['weapons','Weapons'],['systems','Systems'],['hull','Hull & add-ons'],['traits','Recovered traits']];
  let ready=false,dialog,priorPause=false,returnFocus=null,selected='',page=0,category='all',query='',family='',size='',collection='all',records=[];
  const narrow=()=>innerWidth<760||innerHeight<500;
  const pageSize=()=>innerHeight<500?(innerWidth>=600?4:2):innerWidth<760?(innerHeight<740?4:6):innerHeight<740?6:innerHeight<940?9:12;
  const savedSeen=()=>Array.isArray(saveState.doc.equipmentCodex?.seen)?saveState.doc.equipmentCodex.seen.filter(id=>typeof id==='string'&&id.length<180):[];
  function owned(type,id){if(type==='section'&&id==='bridge')return saveState.doc.design?.modular?1:0;const h=M().hangar().owned;if(type==='gear')return Object.entries(h).reduce((n,[key,value])=>n+(key.startsWith('gear:'+id+':')&&Number.isSafeInteger(value)&&value>0?value:0),0);const v=h[type+':'+id];return Number.isSafeInteger(v)&&v>0?v:0;}
  function discoveries(){
    const found=new Set(savedSeen()),add=(type,id)=>{found.add(type+':'+id);const g=type==='gear'&&M().GEARS[id];if(g?.quirk)found.add('trait:'+g.quirk);};
    for(const [key,n] of Object.entries(M().hangar().owned)){if(!Number.isSafeInteger(n)||n<=0)continue;const match=/^(gear|kit|section):(.+?)(?::[1-5])?$/.exec(key);if(match)add(match[1],match[2]);}
    const m=saveState.doc.design?.modular;if(m){for(const s of m.sections)add('section',s.kind);for(const f of m.fittings)add('gear',f.gear);for(const k of m.kit||[])add('kit',k.piece);}
    for(const r of saveState.doc.modularHangar?.recoveries||[])if(r?.id&&M().GEARS[r.id])add('gear',r.id);
    return[...found].sort().slice(0,2048);
  }
  function recorded(){const seen=discoveries();return JSON.stringify(seen)===JSON.stringify(savedSeen())?null:{v:1,seen};}
  function entries(){
    const seen=new Set(savedSeen()),recoveries=new Set((saveState.doc.modularHangar?.recoveries||[]).map(r=>r.id)),out=[];
    for(const [id,g] of Object.entries(M().GEARS)){
      if(g.salvageOnly&&!owned('gear',id)&&!recoveries.has(id)&&!seen.has('gear:'+id))continue;
      out.push({key:'gear:'+id,type:'gear',id,data:g,category:g.weapon?'weapons':'systems',family:g.weapon?arsenal.familyName(g.weapon):'Systems',size:g.cls||'SYSTEM',collected:seen.has('gear:'+id)||owned('gear',id)>0,owned:owned('gear',id)});
    }
    for(const [id,p] of Object.entries(M().PIECES))out.push({key:'kit:'+id,type:'kit',id,data:p,category:p.silo?'weapons':p.node&&['thruster','shield','bay'].includes(p.node.type)?'systems':'hull',family:p.silo?'Missile':'Add-ons',size:'ADD-ON',collected:seen.has('kit:'+id)||owned('kit',id)>0,owned:owned('kit',id)});
    for(const [id,s] of Object.entries(M().SECTIONS))out.push({key:'section:'+id,type:'section',id,data:s,category:'hull',family:'Hull sections',size:'STRUCTURE',collected:seen.has('section:'+id)||owned('section',id)>0,owned:owned('section',id)});
    for(const [id,q] of Object.entries(loot.QUIRKS))out.push({key:'trait:'+id,type:'trait',id,data:q,category:'traits',family:'Recovered traits',size:'TRAIT',collected:seen.has('trait:'+id),owned:0});
    for(const e of out){e.unknown=(e.type==='trait'||e.data.salvageOnly)&&!e.collected;e.name=e.unknown?'Unidentified '+(TYPES[e.data.type]||'fitting')+' trait':clean(e.data.name);e.price=e.type==='trait'||e.data.salvageOnly?'Salvage only':e.id==='bridge'?'Starter core':number(e.data.cost)+' metal';}
    return out.sort((a,b)=>Number(b.collected)-Number(a.collected)||a.category.localeCompare(b.category)||(a.data.cost||0)-(b.data.cost||0)||a.name.localeCompare(b.name));
  }
  function artwork(e,W=150,H=86){
    let c;if(e.type==='gear'&&e.data.weapon)c=topdownKit.icon(e.data.weapon,W,H);
    else if(e.type==='trait'){
      const match=Object.entries(M().GEARS).find(([,g])=>g.type===e.data.type&&!g.salvageOnly);
      return match?artwork({...e,type:'gear',id:match[0],data:match[1]},W,H):el('span','◈','codex-unknown-art');
    }else{
      const kind=e.type==='section'?e.id:e.type==='gear'&&e.data.kind==='engine'?'drive':e.type==='kit'&&e.data.on==='bridge'?'bridge':'deck';
      const m={sections:[{id:'c',kind,x:0,y:0}],fittings:e.type==='gear'?[{slot:'c',gear:e.id,mk:1}]:e.type==='kit'&&e.data.needs==='weapon'?[{slot:'c',gear:'gun-spitter',mk:1}]:[],kit:e.type==='kit'?[{cell:'c',mount:e.data.mounts[0],piece:e.id}]:[]};c=topdownKit.thumb(m,W,H,'#88cbd4');
    }
    c.setAttribute('aria-hidden','true');if(e.unknown)c.classList.add('codex-silhouette');return c;
  }
  function minimumFrames(e){
    if(e.type==='trait')return[];
    return Object.entries(M().HULLS).filter(([hull])=>{
      const kinds=e.type==='gear'?Object.entries(M().SECTIONS).filter(([,s])=>M().fits(s.slot,e.data)).map(([k])=>k):[e.type==='section'?e.id:'bridge'];
      return kinds.some(kind=>{const core={id:'core',kind:'bridge',x:0,y:0},section={id:'slot',kind,x:1,y:0},slot=kind==='bridge'?'core':'slot';
        try{M().compile({color:'#88cbd4',modular:{v:1,hull,sections:kind==='bridge'?[core]:[core,section],fittings:e.type==='gear'?[{slot,gear:e.id,mk:1}]:[],kit:[]}});return true;}catch{return false;}
      });
    }).map(([id,h])=>({id,...h}));
  }
  function details(e){
    const g=e.data,stats=[],fits=[],notes=[];let effect='',source='Station fitting: buy hardware once; reuse your owned copies.';
    if(e.unknown)return{stats:[],fits:[TYPES[g.type]||'Recovered fitting'],effect:'Recover a fitting of this type to reveal its trait and trade-off.',source:'Recovered enemy equipment. Elite wrecks and bosses can carry traits; no specific trait is guaranteed.',notes:[]};
    if(e.type==='gear'){
      stats.push(['Power',number(g.power)],['Owned',number(e.owned)]);for(const [id,s] of Object.entries(M().SECTIONS))if(M().fits(s.slot,g))fits.push(clean(s.name));
      if(g.weapon){const w=WEAPON_TYPES[g.weapon];stats.unshift(['Base hit',number(w.damage)],['Base DPS',number(arsenal.dps(g.weapon))],['Cycle',(w.fireRate/60).toFixed(2)+' s'],['Shots / cycle',number(arsenal.GUNS[g.weapon]?.shots||1)]);effect=w.blurb||g.description;if(window.weaponBalance?.ready){const s=weaponBalance.stats(g.weapon);if(s.fragments)stats.push(['Fragments',s.fragments+' × '+s.fragmentHit],['Fragment potential',s.fragmentDps+' DPS']);}notes.push('Base Mk I figures. Hull bonuses, mastery, traits and weapon marks can change flight results.');}
      else{effect=g.description;if(g.type==='shield'){const s=arsenal.shields.of(g.radius);stats.unshift(['Shield pool',number(s.pool)],['Recharge',number(s.rate)+' / s'],['Recharge delay',number(s.delay/60)+' s']);}if(g.type==='pod')stats.unshift(['Base hull','+35 HP']);if(g.type==='bay')stats.unshift(['Fighters','1 / bay'],['Fighter hull',number(roles.CFG.droneHp)],['Relaunch',number(roles.CFG.relaunch/60)+' s']);if(g.type==='mender')stats.unshift(['Pulse cycle',number(roles.CFG.menderEvery/60)+' s'],['Base self heal',number(roles.CFG.menderHeal*.25)+' HP']);if(g.type==='wing')stats.unshift(['Escorts','1 / dock'],['Escort hull',number(roles.CFG.escortHp)]);}
      if(g.salvageOnly)source='Recovered hardware only. One physical copy per fitted slot; this variant cannot be fabricated.';
      else if(g.weapon&&upgradePath.needsResearch(g.weapon))source='Special technology: select this weapon in fitting, research in its inspector, then buy the hardware at a station.';
      if(g.quirk)notes.push(loot.QUIRKS[g.quirk]?.line||'Recovered trait.');
      const frames=minimumFrames(e);if(frames.length){const h=frames[0];notes.push('Smallest frame: '+h.name+(h.rank?' · Shipwright '+h.rank+' · '+number(h.mass)+' biomass':' · rookie compatible')+'.');}
    }else if(e.type==='kit'){
      effect=g.blurb;fits.push(...g.mounts.map(s=>SIDES[s]+' mount'));stats.push(['Power',g.power<0?'+'+Math.abs(g.power)+' supply':number(g.power||0)],['Owned',number(e.owned)]);
      if(g.slots)stats.unshift(['Module slots','+'+g.slots]);if(g.node?.type==='pod')stats.unshift(['Base hull','+35 HP']);
      if(g.needs==='weapon')notes.push('Needs a fitted weapon beneath it.');if(g.needs==='clear')notes.push('Needs a section without a turret.');if(g.on==='bridge')notes.push('Command core only.');
      if(g.mounts.some(s=>s!=='top'))notes.push('Edge mounts must face open space. One clip-on per mount.');
      if(g.silo)notes.push('Missile size follows your hull. Counts towards the rookie four-weapon limit.');
      if(!g.node&&!g.silo&&!g.power&&!g.slots)notes.push('Cosmetic only: changes appearance without adding combat stats.');
    }else if(e.type==='section'){
      effect=e.id==='bridge'?'The ship’s single command core. It also accepts a utility module.':e.id==='plate'?'Adds an armoured hull section and 35 base hull HP.':g.slot?'Attach this section to create a '+g.slot+' slot. Fit one compatible module into it.':'Connects and shapes your hull; it does not create an equipment slot.';
      stats.push(['Hull sections','1'],['Module slot',g.slot?g.slot[0].toUpperCase()+g.slot.slice(1):'None'],['Owned',number(e.owned)]);if(e.id==='plate')stats.unshift(['Base hull','+35 HP']);fits.push('Cardinal connection to another hull section');
      const frames=minimumFrames(e);if(frames.length)notes.push('Smallest frame: '+frames[0].name+'.');source=e.id==='bridge'?'Supplied when you create a ship. Each ship has one core.':'Buy hull hardware and rebuild connected sections at a station.';
    }else{effect=g.line;fits.push('Recovered '+(TYPES[g.type]||g.type));source='Discovered on recovered enemy equipment. Inspect the physical variant in Weapons or Systems for its exact slot and power.';}
    return{stats,fits,effect,source,notes};
  }
  function drawDetail(){
    const host=$('codex-detail'),e=records.find(r=>r.key===selected);host.replaceChildren();if(!e)return;
    const d=details(e),art=el('div',null,'codex-detail-art');art.append(artwork(e,260,134));host.append(art,el('small',e.family+' · '+e.size,'codex-kicker'),el('h3',e.name),el('p',e.collected?'Collected'+(e.owned?' · '+e.owned+' owned, including mounted copies':''):e.unknown?'Undiscovered':'Catalogue entry · not yet collected','codex-status'),el('p',d.effect,'codex-effect'));
    if(d.stats.length){const grid=el('dl',null,'codex-stats');for(const [name,value] of d.stats){const cell=el('div');cell.append(el('dt',name),el('dd',value));grid.append(cell);}host.append(grid);}
    host.append(el('h4','Fits on'));const slots=el('div',null,'codex-fits');for(const text of d.fits)slots.append(el('span',text));host.append(slots,el('h4','Where to get it'),el('p',d.source,'codex-source'));
    if(e.type!=='trait')host.append(el('p',e.price,'codex-cost'));
    for(const note of d.notes)host.append(el('p',note,'codex-note'));
    if(!e.unknown&&e.type!=='trait'){const b=button(e.type==='gear'?'View in equipment shop':'Open ship fitting',()=>{close();if($('modular-yard').hidden)bay.show();if(e.type==='gear')hangarUI.browseItem(e.id);},'codex-action');b.id='codex-open-fitting';host.append(b);}
    host.scrollTop=0;
  }
  function filtered(){return records.filter(e=>(category==='all'||e.category===category)&&(!family||e.family===family)&&(!size||e.size===size)&&(collection==='all'||collection==='collected'&&e.collected||collection==='missing'&&!e.collected)&&(e.name+' '+e.family+' '+(e.unknown?'':e.data.description||e.data.blurb||e.data.line||'')).toLowerCase().includes(query.toLowerCase()));}
  function drawGrid(){
    records=entries();const list=filtered(),pages=Math.max(1,Math.ceil(list.length/pageSize()));page=Math.max(0,Math.min(page,pages-1));
    const grid=$('codex-grid');grid.replaceChildren();const rows=list.slice(page*pageSize(),(page+1)*pageSize());if(!rows.some(e=>e.key===selected))selected=rows[0]?.key||'';
    if(!list.length)grid.append(el('p','No equipment matches these filters. Clear a filter to see more.','codex-empty'));
    for(const e of rows){const b=button('',()=>{selected=e.key;dialog.dataset.detail='true';drawGrid();drawDetail();$('codex-back').focus({preventScroll:true});},'codex-card'+(e.collected?' collected':'')+(selected===e.key?' selected':''));b.dataset.codexItem=e.key;b.setAttribute('aria-pressed',String(selected===e.key));const picture=el('div',null,'codex-card-art');picture.append(artwork(e));b.append(picture,el('small',e.family+' · '+e.size),el('strong',e.name),el('span',e.unknown?'Undiscovered':e.collected?'✓ Collected'+(e.owned?' · '+e.owned+' owned':''):e.price,'codex-card-state'));grid.append(b);}
    $('codex-page').textContent=list.length+' entries · '+(page+1)+' / '+pages;$('codex-prev').disabled=page===0;$('codex-next').disabled=page>=pages-1;
    $('codex-progress').textContent=records.filter(e=>e.collected).length+' / '+records.length+' collected · '+Object.keys(M().GEARS).filter(id=>M().GEARS[id].weapon&&!M().GEARS[id].salvageOnly).length+' weapon models';
  }
  function refresh(){if(!dialog?.open)return;drawGrid();drawDetail();}
  function close(){if(!dialog?.open)return;dialog.close();document.body.classList.remove('codex-open');engine.paused=priorPause;returnFocus?.focus({preventScroll:true});}
  function open(key=''){
    if(!ready)return false;if(dialog.open){if(key){selected=key;dialog.dataset.detail='true';refresh();}return true;}
    priorPause=engine.paused;returnFocus=document.activeElement;engine.paused=true;engine.mouse.down=false;category=key?'all':'weapons';query=family=size='';collection='all';page=0;selected=typeof key==='string'?key:'';
    const pending=recorded();$('codex-save-note').textContent=pending&&!saveState.save()?'Collection could not be saved. Browsing is still available.':'';
    records=entries();for(const id of ['codex-family','codex-size']){const field=$(id),values=[...new Set(records.map(e=>id==='codex-family'?e.family:e.size))];field.replaceChildren(new Option(id==='codex-family'?'All families':'All sizes',''),...values.sort().map(v=>new Option(v,v)));}
    $('codex-search').value='';$('codex-family').value='';$('codex-size').value='';$('codex-collection').value='all';for(const b of dialog.querySelectorAll('[data-codex-category]'))b.setAttribute('aria-pressed',String(b.dataset.codexCategory===category));
    if(selected)page=Math.max(0,Math.floor(records.findIndex(e=>e.key===selected)/pageSize()));dialog.dataset.detail=key?'true':'false';dialog.showModal();document.body.classList.add('codex-open');refresh();(key&&narrow()?$('codex-back'):narrow()?$('codex-close'):$('codex-search')).focus({preventScroll:true});return true;
  }
  // Registered before engine input: Escape closes this modal alone.
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&dialog?.open){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  function install(){
    if(!window.stationGrid?.ready||!window.recoveredFittings?.ready){setTimeout(install,50);return;}
    const persist=saveState.save;saveState.save=function(...a){const doc=this.doc,previous=doc.equipmentCodex,next=recorded();if(next)doc.equipmentCodex=next;let result;try{result=persist.apply(this,a);}catch(e){if(next){if(previous===undefined)delete doc.equipmentCodex;else doc.equipmentCodex=previous;}throw e;}if(result===false&&next){if(previous===undefined)delete doc.equipmentCodex;else doc.equipmentCodex=previous;}return result;};
    dialog=el('dialog');dialog.id='equipment-codex';dialog.setAttribute('aria-labelledby','codex-title');
    dialog.innerHTML='<header class="codex-header"><div><small class="codex-kicker">CAPTAIN / FIELD GUIDE</small><h2 id="codex-title">Equipment Codex</h2><p id="codex-progress"></p></div><button id="codex-close" type="button">× Close</button></header><div class="codex-controls"><input id="codex-search" type="search" placeholder="Find a weapon, module or hull part…" aria-label="Search equipment"><nav id="codex-categories" aria-label="Equipment categories"></nav><div class="codex-filters"><select id="codex-family" aria-label="Equipment family"></select><select id="codex-size" aria-label="Equipment size"></select><select id="codex-collection" aria-label="Collection status"><option value="all">All collection</option><option value="collected">Collected</option><option value="missing">Not collected</option></select></div></div><p id="codex-save-note" role="status"></p><div class="codex-body"><section class="codex-library" aria-label="Equipment cards"><div id="codex-grid"></div><nav class="codex-pages" aria-label="Equipment pages"><button id="codex-prev" type="button">← Previous</button><span id="codex-page"></span><button id="codex-next" type="button">Next →</button></nav></section><section class="codex-inspector"><button id="codex-back" type="button">← Equipment cards</button><div id="codex-detail"></div></section></div>';
    document.body.append(dialog);$('codex-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
    $('codex-back').onclick=()=>{dialog.dataset.detail='false';(narrow()?$('codex-close'):$('codex-search')).focus({preventScroll:true});};
    for(const [id,name] of CATEGORIES){const b=button(name,()=>{category=id;page=0;dialog.dataset.detail='false';for(const b of $('codex-categories').children)b.setAttribute('aria-pressed',String(b.dataset.codexCategory===id));drawGrid();drawDetail();});b.dataset.codexCategory=id;$('codex-categories').append(b);}
    $('codex-search').oninput=e=>{query=e.target.value;page=0;drawGrid();drawDetail();};
    for(const [id,set] of [['codex-family',v=>family=v],['codex-size',v=>size=v],['codex-collection',v=>collection=v]])$(id).onchange=e=>{set(e.target.value);page=0;drawGrid();drawDetail();};
    $('codex-prev').onclick=()=>{page--;drawGrid();drawDetail();};$('codex-next').onclick=()=>{page++;drawGrid();drawDetail();};window.addEventListener('resize',refresh);
    const door=button('Equipment Codex',()=>open(),'tm-door');door.id='btn-equipment-codex';document.querySelector('#pause-menu .tm-doors').append(door);
    ready=true;hangarUI.refresh();
  }
  window.equipmentCodex={open,close,refresh,entries,details,discoveries,owned,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,150));
})();
