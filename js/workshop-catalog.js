/* Named weapons and systems share one searchable catalogue. It plans ordinary
 * nodes; ownership, fire control and GP remain enforced by the canonical Fly path. */
(() => {
  'use strict';
  let panel,ready=false,query='',kind='weapons',size='all';
  const ODD=['bay','siphon','wing','mender'];
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
  function rows(){
    const out=[],equips=fleet.equips();
    for(const [id,def]of Object.entries(WEAPON_TYPES)){
      const mount=equips.filter(p=>p.type==='cannon'&&fleet.mountWeapons(p.radius).includes(id)).sort((a,b)=>a.radius-b.radius)[0];if(!mount)continue;
      const cls=fleet.mountBand(mount.radius).cls,owned=armory.owns(id),cycle=(def.fireRate/60).toFixed(2),tier={POINT:0,LIGHT:0,MEDIUM:1,HEAVY:2,SIEGE:3,CAPITAL:4}[cls];
      out.push({id:'weapon-'+id,title:def.title||id,type:'cannon',cls,owned,exotic:false,part:{...mount,weapon:id},
        facts:`${cls} · ${cycle}s cycle · ${def.damage} base damage${def.burst?' · '+def.burst+'-round burst':''}`,
        line:def.blurb||'A '+cls.toLowerCase()+' battery. Different hulls modify its firing cycle.',
        status:(owned?'Technology owned':`Research ${armory.PRICES[id]} metal at a dock before Fly`)+(armory.doc().rack<tier?' · Requires '+armory.RACKS[tier].name:'')});
    }
    for(const p of equips.filter(p=>p.type!=='cannon'))out.push({id:'system-'+p.type+'-'+p.radius,title:p.type==='spike'?'Spike plating (legacy)':p.title.replace(/ · .*$/,''),type:p.type,cls:'SYSTEM',owned:true,exotic:false,part:p,facts:`${p.cost} GP · ${p.radius}px fitting`,line:p.type==='spike'?'Adds 15 base hull HP. No ramming damage bonus.':p.desc.replace(/<[^>]*>/g,''),status:'Standard system'});
    for(const [id,q]of Object.entries(loot.QUIRKS)){
      const held=saveState.doc.inventory.find(p=>p.quirk===id),part=held?{...held}:{type:q.type,radius:16,quirk:id,rarity:'exotic'};
      out.push({id:'exotic-'+id,title:q.name,type:q.type,cls:part.type==='cannon'?fleet.mountBand(part.radius).cls:'SYSTEM',owned:!!held,exotic:true,part:{...part,cost:fleet.costOfNode(part.type,part.radius),title:q.name},facts:held?`${part.radius}px · ${part.cost||fleet.costOfNode(part.type,part.radius)} GP`:'Exotic blueprint',line:q.line,status:held?'Recovered blueprint':'Find in salvage or the exotic market'});
    }
    return out;
  }
  function art(row){return sprites.ready?sprites.pick(row.part,0):null;}
  function choose(row,auto=false){
    if(row.exotic&&!row.owned)return;
    const entry=art(row);shipyard.part={...row.part,title:row.title,...(entry?{art:entry.file}:{})};
    close();shipyard.phonePane('ship');shipyard.buildParts();shipyard.paint();
    if(auto)document.getElementById('sy-mount-selected').click();
    else shipyard.toast(row.title+' selected. Click the workbench or Mount selected part.');
  }
  function card(row,large=false){
    const el=large?document.createElement('article'):button('',()=>choose(row));el.className=large?'catalog-card':'p part-card named-part';el.dataset.catalogId=row.id;el.dataset.type=row.type;
    const pic=art(row);if(pic){const im=document.createElement('img');im.src=pic.path.replace(/\/([^/]+)$/,'/clean/$1');im.alt='';im.loading='lazy';im.onerror=()=>{im.onerror=null;im.src=pic.path;};el.append(im);}
    const title=document.createElement('strong');title.textContent=row.title;const facts=document.createElement('span');facts.textContent=large?row.facts:row.exotic?'Recovered exotic':row.type==='cannon'?row.facts.split(' · ').slice(0,2).join(' · '):row.type+' · '+row.part.radius+'px';const status=document.createElement('small');status.textContent=large?row.status:`${fleet.costOfNode(row.part.type,row.part.radius)} GP · ${row.owned?'Owned':(armory.PRICES[row.part.weapon]||0)+' metal'}`;
    el.append(title,facts,status);
    if(large){const p=document.createElement('p');p.textContent=row.line;el.append(p);const b=button(row.exotic&&!row.owned?'Recover blueprint':'Add to blueprint',()=>choose(row,true));b.disabled=row.exotic&&!row.owned;b.dataset.add=row.id;el.append(b);}
    else{el.title=row.line+' · '+row.status;el.disabled=row.exotic&&!row.owned;el.setAttribute('aria-pressed',String(row.part.weapon?shipyard.part?.weapon===row.part.weapon:shipyard.part?.type===row.part.type&&shipyard.part?.radius===row.part.radius&&shipyard.part?.quirk===row.part.quirk));}
    return el;
  }
  function paint(){
    if(!panel||panel.hidden)return;
    const list=panel.querySelector('#catalog-list'),all=rows(),matches=all.filter(r=>(kind==='all'||kind==='weapons'&&r.type==='cannon'||kind==='systems'&&r.type!=='cannon'||kind==='exotics'&&r.exotic)&&(size==='all'||r.cls===size)&&(r.title+' '+r.line+' '+r.cls).toLowerCase().includes(query.toLowerCase()));
    list.replaceChildren(...matches.map(r=>card(r,true)));list.scrollTop=0;
    if(!matches.length){const empty=document.createElement('p');empty.textContent='No matching fittings. Try another class or search.';list.append(empty);}
    panel.querySelector('#catalog-count').textContent=`${matches.length} shown · ${all.filter(r=>!r.exotic&&r.type==='cannon').length} weapon families · ${all.filter(r=>r.exotic).length} exotic fittings`;
  }
  function open(){panel.hidden=false;document.body.classList.add('catalog-open');paint();panel.querySelector(document.documentElement.classList.contains('mobile-layout')?'#catalog-close':'#catalog-search').focus();}
  function close(){if(panel){panel.hidden=true;document.body.classList.remove('catalog-open');}}
  function wire(){
    const root=shipyard.el;if(!root?.classList.contains('shipyard-workshop')||!root.querySelector('.sy-pane-heading')||root.querySelector('#sy-browse-catalog'))return;
    const b=button('Browse weapons & systems',open);b.id='sy-browse-catalog';root.querySelector('.sy-pane-heading').after(b);
    const hint=document.createElement('p');hint.className='catalog-library-hint';hint.textContent='Search by weapon name. Open the catalogue for class filters and larger cards.';b.after(hint);
  }
  function install(){
    panel=document.createElement('div');panel.id='workshop-catalog';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','catalog-title');
    panel.innerHTML='<section class="catalog-sheet catalog-list-view"><header><div><small>THE ARMOURY / BLUEPRINTS</small><h2 id="catalog-title">Weapons & ship systems</h2><p id="catalog-count"></p></div></header><div class="catalog-filters"><input id="catalog-search" type="search" placeholder="Search torpedo, rail, drones…" aria-label="Search weapons and systems"><select id="catalog-kind" aria-label="Fitting category"><option value="weapons">Weapons</option><option value="systems">Ship systems</option><option value="exotics">Exotic fittings</option><option value="all">Everything</option></select><select id="catalog-size" aria-label="Weapon size"><option value="all">All sizes</option></select></div><div id="catalog-list"></div><footer>Planning is free. Research and fitting requirements apply when you Fly. Cycle and damage show base weapon values.</footer></section>';
    const back=button('Back to ship',close);back.id='catalog-close';panel.querySelector('header').append(back);
    const view=button('Card view',()=>{const sheet=panel.querySelector('.catalog-sheet'),list=sheet.classList.toggle('catalog-list-view');view.textContent=list?'Card view':'List view';});view.id='catalog-view';back.before(view);
    const select=panel.querySelector('#catalog-size');for(const c of['POINT','LIGHT','MEDIUM','HEAVY','SIEGE','CAPITAL','SYSTEM'])select.add(new Option(c,c));
    panel.querySelector('#catalog-search').oninput=e=>{query=e.target.value;paint();};panel.querySelector('#catalog-kind').onchange=e=>{kind=e.target.value;paint();};select.onchange=()=>{size=select.value;paint();};
    panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(panel);
    const buildParts=shipyard.buildParts;shipyard.buildParts=function(){
      const result=buildParts.call(this),host=this.el?.querySelector('#sy-parts');if(!host||!this.el.classList.contains('shipyard-workshop'))return result;
      const list=rows().filter(r=>(!r.exotic||r.owned)&&(this.category==='all'||this.category===r.type||this.category==='odd'&&ODD.includes(r.type))&&(r.title+' '+r.line+' '+r.cls).toLowerCase().includes(this.search.toLowerCase()));
      host.replaceChildren(...list.map(r=>card(r)));if(!list.length){const p=document.createElement('p');p.textContent='No matching parts. Open Browse for every weapon and exotic.';host.append(p);}
      this.el.querySelector('#sy-catalog-count').textContent=list.length+' fittings';wire();return result;
    };
    const place=shipyard.place;shipyard.place=function(...args){const weapon=this.part?.weapon,start=this.design.nodes.length;if(!weapon)return place.apply(this,args);this.edit(()=>{place.apply(this,args);for(const n of this.design.nodes.slice(start))if(n.type==='cannon')n.weapon=weapon;});};
    const stats=shipyard.paintStats;shipyard.paintStats=function(){const r=stats.call(this),b=this.budget(),e=this.el?.querySelector('#sy-budget');if(e){e.textContent=`Fitted ${b.usedGP} / ${b.totalGP} GP capacity`;e.dataset.used=String(b.usedGP);e.dataset.capacity=String(b.totalGP);e.title='New ship clears the blueprint. New campaign resets earned mass, money and capacity.';}return r;};
    for(const key of['build','show']){const previous=shipyard[key];shipyard[key]=function(...args){const r=previous.apply(this,args);wire();return r;};}
    const hide=shipyard.hide;shipyard.hide=function(...args){close();return hide.apply(this,args);};
    ready=true;wire();if(shipyard.el)shipyard.buildParts();
  }
  // This script registers before the workshop's capture shortcuts.
  window.addEventListener('keydown',e=>{if(!panel||panel.hidden)return;e.stopImmediatePropagation();if(e.code==='Escape'){e.preventDefault();close();document.getElementById('sy-browse-catalog')?.focus();}if(e.code==='Tab'){const items=[...panel.querySelectorAll('button,input,select')].filter(x=>!x.disabled&&x.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}},true);
  window.workshopCatalog={get ready(){return ready;},open,close,rows};window.addEventListener('load',()=>setTimeout(install,0));
})();
