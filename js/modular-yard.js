/* Tap a connector to build structure; tap a slot to fit equipment. The old
 * blueprint library, canonical application seam and financial save remain shared. */
(() => {
  'use strict';
  let panel,ready=false,selected='fore',part='deck',moving=false,message='',previousPause=true;
  const $=id=>document.getElementById(id),M=()=>modularShips,copy=x=>JSON.parse(JSON.stringify(x));
  const number=n=>Math.round(Number(n)||0).toLocaleString('en-US');
  const work=()=>saveState.doc.workshop;
  const signature=d=>JSON.stringify(d||null);
  function button(text,fn,id){const b=document.createElement('button');b.type='button';b.textContent=text;if(id)b.id=id;b.onclick=fn;return b;}
  function say(text,bad=false){message=text;const e=$('modular-message');if(e){e.textContent=text;e.classList.toggle('bad',bad);}}
  function mutate(change){
    const next=copy(shipyard.design);try{change(next.modular);M().prune(next.modular);const c=M().compile(next);shipyard.edit(()=>{shipyard.design=c.design;shipyard.syncFields();});say('Blueprint changed. Apply owned equipment here; new hardware and hull changes need a station.');render();return true;}catch(e){say(e.message,true);return false;}
  }
  function lay(design,text){
    if(work().draft)work().blueprintDraft=copy(work().draft);
    work().editTarget='blueprint';const c=M().compile(design);shipyard.edit(()=>{shipyard.design=c.design;shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();});const m=c.design.modular;selected=(m.sections.find(s=>s.id==='fore')||m.sections.find(s=>m.fittings.some(f=>f.slot===s.id&&M().GEARS[f.gear].kind==='weapon'))||m.sections[0]).id;moving=false;say(text);render();
  }
  function chooseHull(hull){lay(M().make(hull),'New modular blueprint. Your flying ship and saved builds are safe.');}
  function chooseFactory(id){const f=M().FACTORY.find(f=>f.id===id);try{lay(M().factory(id),`${f.name} on the slip. Reshape or refit anything, then Apply at a station to fly it.`);}catch(e){say(e.message,true);}}
  // Bill and blocker for a factory hull, priced against this captain's hangar and research.
  function factoryState(id){try{const d=M().factory(id),q=M().quote(d);return{d,q,why:fitting.check(d)||(hubs.metal<q.total?`Needs ${number(q.total-hubs.metal)} more metal`:null)};}catch(e){return{why:e.message};}}
  // Factory cards show the ship through the top-down kit, the same painter flight and the slip use.
  function shipArt(host,design){
    if(typeof topdownKit==='undefined'||!host.isConnected||!design?.modular)return;const W=host.clientWidth,H=host.clientHeight;if(!W||!H)return;
    try{host.replaceChildren(topdownKit.thumb(design.modular,W,H,design.color));}catch{}
  }
  function silhouette(m){
    const xs=m.sections.map(s=>s.x),ys=m.sections.map(s=>s.y),x0=Math.min(...xs),y0=Math.min(...ys),fitted=new Map(m.fittings.map(f=>[f.slot,f])),col={light:'#e7bb75',medium:'#cf9af0',engine:'#99c6ee',utility:'#86ded0'};
    let html=`<svg viewBox="${x0*24-13} ${y0*24-13} ${(Math.max(...xs)-x0+1)*24+2} ${(Math.max(...ys)-y0+1)*24+2}" aria-hidden="true">`;
    for(const s of m.sections){const slot=M().SECTIONS[s.kind].slot;html+=`<rect x="${s.x*24-11}" y="${s.y*24-10}" width="22" height="20" rx="4" fill="${fitted.has(s.id)?col[slot]||'#8197a5':s.kind==='plate'?'#2b3d4b':'#1a2a36'}" stroke="#a08250" stroke-width="1.2"/>`;}
    return html+'</svg>';
  }
  function factoryCard(f){
    const st=factoryState(f.id),b=button('',()=>chooseFactory(f.id));b.className='modular-factory-card';b.dataset.factory=f.id;b.style.setProperty('--hull-tint',f.color);
    const art=document.createElement('div');art.className='modular-factory-art';art.innerHTML=st.d?silhouette(st.d.modular):'';if(st.d)requestAnimationFrame(()=>shipArt(art,st.d));
    const n=document.createElement('strong');n.textContent=f.name;
    const role=document.createElement('span');role.className='role';role.textContent=`${f.role} · ${M().HULLS[f.hull].label||M().HULLS[f.hull].cls}`;
    const blurb=document.createElement('p');blurb.textContent=f.blurb;
    const kit=document.createElement('p');kit.className='kit';kit.textContent=st.d?st.d.modular.fittings.map(x=>M().GEARS[x.gear].name).join(' · ')||'No fittings':'';
    const status=document.createElement('p');status.className='status';status.classList.toggle('bad',!!st.why);status.textContent=st.q?`${number(st.q.total)} metal · ${st.why||'Ready to fly'}`:st.why;
    b.append(art,n,role,blurb,kit,status);return b;
  }
  function useActive(){
    const active=saveState.doc.design;if(!active)return false;
    if(work().draft&&signature(work().draft)!==signature(active))work().blueprintDraft=copy(work().draft);
    work().editTarget='active';work().activeSnapshot=signature(active);work().draft=copy(active);shipyard.design=copy(active);shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();shipyard._snapshot=signature(shipyard.design);shipyard.undoStack=[];shipyard.redoStack=[];shipyard.paint();return true;
  }
  function open(){
    if(!panel||panel.hidden===false)return;
    previousPause=engine.paused;engine.paused=true;engine.mouse.down=false;panel.hidden=false;document.body.classList.add('modular-yard-open');
    if(!shipyard.design?.modular){render();say('Build a modular blueprint, or return to your current ship. Your legacy ship is preserved.');}else{try{shipyard.design=M().compile(shipyard.design).design;}catch(e){say(e.message,true);}}render();$('modular-close').focus({preventScroll:true});panel.scrollTop=0;
  }
  function close(){if(!panel||panel.hidden)return;panel.hidden=true;document.body.classList.remove('modular-yard-open');engine.paused=previousPause;if(window.noviceFleet&&shipyard.open)shipyard.hide();}
  function ports(m){const result=new Map(),has=new Set(m.sections.map(s=>s.x+','+s.y));for(const s of m.sections)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=s.x+dx,y=s.y+dy,key=x+','+y;if(!has.has(key)&&Math.abs(x)<=8&&Math.abs(y)<=8)result.set(key,{x,y});}return[...result.values()];}
  function connect(x,y){
    mutate(m=>{if(moving){const s=m.sections.find(s=>s.id===selected);if(!s||s.kind==='bridge')throw new Error('Select a structural section to move.');s.x=x;s.y=y;}else{let i=1;while(m.sections.some(s=>s.id==='s'+i))i++;const id='s'+i;m.sections.push({id,kind:part,x,y});selected=id;}});moving=false;
  }
  function select(id){selected=id;moving=false;render();}
  function compatible(s,g){return M().fits(M().SECTIONS[s.kind].slot,g);}   // one rule, shared with factory hulls
  function fit(gear){mutate(m=>{const prior=m.fittings.find(f=>f.slot===selected);m.fittings=m.fittings.filter(f=>f.slot!==selected);m.fittings.push({slot:selected,gear,mk:1,...(prior?.rotation!==undefined?{rotation:prior.rotation}:{})});});}
  function apply(){
    if(!shipyard.design?.modular)return;
    if(!hubs.docked&&M().fieldReason(shipyard.design)&&hubs.dockNear()){engine.paused=false;hubs.openDock();engine.paused=true;}
    const ok=engine.applyDesign(shipyard.design);if(ok===false){const reason=M().check(shipyard.design)||fitting.check(shipyard.design);let total=0;try{total=M().quote(shipyard.design).total;}catch{}say(reason||(!hubs.docked?'Dock at a station to apply this refit.':hubs.metal<total?'Not enough metal for this fabrication bill.':'The refit was not saved. Your previous ship and wallet are retained.'),true);return;}
    shipyard.design=copy(saveState.doc.design);work().draft=copy(saveState.doc.design);work().editTarget='active';work().activeSnapshot=signature(saveState.doc.design);say('Applied. This is now the ship you are flying.');render();
  }
  function dock(){if(!hubs.docked&&hubs.dockNear()){engine.paused=false;hubs.openDock();engine.paused=true;}say(hubs.docked?'Docked. You can apply and train here.':'Reach a station to dock.');render();}
  function preview(){
    const canvas=$('modular-preview-art'),svg=$('modular-canvas');if(!canvas||!svg)return;
    const b=svg.viewBox.baseVal,W=svg.clientWidth,H=svg.clientHeight;if(!W||!H)return;
    const dpr=Math.min(2,devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;const c=canvas.getContext('2d'),scale=Math.min(W/b.width,H/b.height);
    c.scale(dpr,dpr);c.translate((W-b.width*scale)/2-b.x*scale,(H-b.height*scale)/2-b.y*scale);c.scale(scale,scale);
    const nodes=shipyard.renderNodes();fluidShader.drawOrganismMembrane(c,0,0,0,18,nodes,shipyard.design.color,{});
  }
  function draw(m){
    const c=ports(m),all=[...m.sections,...c],xs=all.map(s=>s.x*48),ys=all.map(s=>s.y*48),minX=Math.min(...xs)-14,minY=Math.min(...ys)-14,w=Math.max(...xs)-minX+14,h=Math.max(...ys)-minY+14;
    const colours={light:'#e7bb75',medium:'#cf9af0',heavy:'#ff9a6a',capital:'#ff5d73',engine:'#99c6ee',utility:'#86ded0'},fitted=new Map(m.fittings.map(f=>[f.slot,f]));
    let html=`<svg id="modular-canvas" viewBox="${minX} ${minY} ${w} ${h}" aria-label="Connected hull sections and fitting slots">`;const art=typeof topdownKit!=='undefined'?topdownKit.slip(m,minX,minY,w,h,shipyard.design?.color):'';if(art)html+=`<image href="${art}" x="${minX}" y="${minY}" width="${w}" height="${h}" pointer-events="none"/>`;
    for(const s of m.sections){const x=s.x*48,y=s.y*48,slot=M().SECTIONS[s.kind].slot,col=colours[slot]||'#8197a5';html+=`<g role="button" tabindex="0" data-section="${s.id}" aria-label="${M().SECTIONS[s.kind].name}, ${slot||'structure'}, ${fitted.has(s.id)?'fitted':'empty'}"><rect class="mod-plate" x="${x-23}" y="${y-20}" width="46" height="40" rx="9" fill="${col}" fill-opacity="${selected===s.id?.16:0}" stroke="${selected===s.id?'#f4deaa':col}" stroke-opacity="${selected===s.id?1:.14}" stroke-width="${selected===s.id?2:1}"/>${slot&&!fitted.has(s.id)?`<circle cx="${x}" cy="${y}" r="8" fill="#0a1925" fill-opacity=".8" stroke="${col}" stroke-opacity=".8"/><text x="${x}" y="${y+3}" text-anchor="middle" fill="${col}" font-size="8" font-weight="700">${slot==='engine'?'E':slot==='utility'?'U':'W'}</text>`:''}</g>`;}
    for(const p of c)html+=`<g class="mod-port" role="button" tabindex="0" data-port="${p.x},${p.y}" aria-label="Attach at ${p.x}, ${p.y}"><circle cx="${p.x*48}" cy="${p.y*48}" r="20" fill="transparent"/><circle cx="${p.x*48}" cy="${p.y*48}" r="9" fill="#10202a" stroke="#6fbfae" stroke-dasharray="2 3"/><text x="${p.x*48}" y="${p.y*48+4}" text-anchor="middle" fill="#9addcc" font-size="12">+</text></g>`;
    return html+'</svg>';
  }
  function emptyStage(){
    const wrap=document.createElement('div');wrap.className='modular-empty';
    const h=document.createElement('h3');h.textContent='Lay down a keel';
    const p=document.createElement('p');p.textContent='Take a factory hull, or start from a bare keel. The ship you fly stays as it is until you Apply at a station.';
    const row=document.createElement('div');row.className='modular-empty-hulls';
    for(const[id,hull]of Object.entries(M().HULLS)){const b=button('',()=>chooseHull(id));b.className='modular-hull-card';b.dataset.emptyHull=id;const n=document.createElement('strong');n.textContent=hull.name;const sub=document.createElement('span');sub.textContent=hull.mass?`Fabrication needs ${number(hull.mass)} mass · shipwright rank ${hull.rank}`:'Starter kit supplied · free to plan';b.append(n,sub);row.append(b);}
    const steps=document.createElement('ol');steps.className='modular-steps';for(const t of['Pick a factory hull or a bare keel','Tap + to attach sections','Tap a slot, fit equipment','Apply at a station'])steps.append(Object.assign(document.createElement('li'),{textContent:t}));
    const fh=document.createElement('h4');fh.textContent='Factory hulls · ready to fly, fully rebuildable';const factories=document.createElement('div');factories.className='modular-factory-row';for(const f of M().FACTORY)factories.append(factoryCard(f));
    const kh=document.createElement('h4');kh.textContent='Or lay a bare keel';
    wrap.append(h,p,fh,factories,kh,row,steps);$('modular-stage').append(wrap);
  }
  // Each clip-on button shows its piece on the selected section, painted by the flight kit. Cached:
  // the kit list repaints on every edit.
  const kitArts=new Map();
  function kitArt(kind,mount,piece){
    const tint=shipyard.design?.color||'#7fd8ff',key=[kind,mount,piece,tint].join('|');let img=kitArts.get(key);
    if(!img){img=document.createElement('img');img.className='kit-art';img.alt='';img.width=72;img.height=44;
      if(typeof topdownKit!=='undefined')try{img.src=topdownKit.thumb({sections:[{id:'c',kind,x:0,y:0}],fittings:[],kit:[{cell:'c',mount,piece}]},72,44,tint).toDataURL();}catch{}
      kitArts.set(key,img);}
    return img.cloneNode();
  }
  // Clip-ons for the selected section: every legal piece on every open mount, one tap to add or remove.
  function paintKit(){
    let host=$('modular-kit');if(!host){const tools=panel?.querySelector('.modular-section-tools');if(!tools)return;host=document.createElement('div');host.id='modular-kit';tools.after(host);}
    const m=shipyard.design?.modular,s=m?.sections?.find(s=>s.id===selected);if(!m||!s){host.replaceChildren();return;}
    const open=M().mountsOf(m,s),kit=m.kit||[],side={port:'port',star:'starboard',prow:'bow',stern:'stern',top:'top'},rows=[];
    for(const[id,p]of Object.entries(M().PIECES))for(const mount of p.mounts){
      if(!open.includes(mount)||M().kitWhy(m,{cell:s.id,mount,piece:id}))continue;
      const mine=kit.some(k=>k.cell===s.id&&k.mount===mount&&k.piece===id);
      const b=button(`${mine?'✓':'+'} ${p.name}${p.mounts.length>1?' · '+side[mount]:''}`,()=>mutate(mm=>{mm.kit=(mm.kit||[]).filter(k=>!(k.cell===s.id&&k.mount===mount));if(!mine)mm.kit.push({cell:s.id,mount,piece:id});}));
      b.className='kit-piece'+(mine?' on':'');b.dataset.piece=id;b.dataset.mount=mount;b.title=p.blurb;b.prepend(kitArt(s.kind,mount,id));
      const cost=document.createElement('small');cost.textContent=mine?'fitted · tap to remove':number(p.cost)+' metal · '+p.blurb;b.append(cost);rows.push(b);
    }
    const h=document.createElement('h3');h.textContent='Clip-ons';host.replaceChildren(...(rows.length?[h,...rows]:[]));
  }
  function render(){paintKit();
    if(!panel||panel.hidden)return;
    const p=engine.player,h=M().hangar();$('modular-money').textContent=number(hubs.metal)+' metal';$('modular-vitals').textContent=`Flying ship · HP ${number(p.hp)} / ${number(p.maxHp)} · Shield ${number(p.shieldHp)}`;
    const d=shipyard.design,m=d?.modular,active=work().editTarget!=='blueprint'&&signature(d)===signature(saveState.doc.design);
    $('modular-source').textContent=window.starterJourney?.active?'STARTER WORKSHOP · arrange your supplied kit':active?'CURRENT FLYING SHIP':'BLUEPRINT PREVIEW · changes are not applied';
    $('modular-active').disabled=!saveState.doc.design;
    const training=$('modular-training');training.replaceChildren();const title=document.createElement('strong');title.textContent=`Shipwright ${h.rank} / ${M().RANK_COST.length}`;training.append(title);
    const explanation=document.createElement('p');explanation.textContent='Each rank unlocks one additional module slot. Hull type, power and weapon size still apply.';training.append(explanation);
    if(h.rank<M().RANK_COST.length){const b=button(`Train rank ${h.rank+1} · ${number(M().RANK_COST[h.rank])} metal`,()=>{if(!M().train())say('Training requires docking, enough metal, and the listed mass milestone.',true);else{say('Shipwright trained: one more module slot unlocked.');render();}},'modular-train');b.disabled=!hubs.docked||hubs.metal<M().RANK_COST[h.rank]||progression.totalMass<M().RANK_MASS[h.rank];const hint=document.createElement('p');hint.textContent=`${hubs.docked?'Docked':'Dock to train'} · requires ${number(M().RANK_MASS[h.rank])} mass · ${number(progression.totalMass)} collected.`;training.append(b,hint);}
    if(window.reactorTraining){const r=reactorTraining.ranks(),remaining=reactorTraining.earned()-Object.values(r).reduce((a,b)=>a+b,0),heading=document.createElement('h3');heading.textContent=`Reactor training · ${remaining} level points`;training.append(heading);for(const[id,name]of Object.entries(reactorTraining.NAMES)){const b=button(`${name} ${r[id]}/5 · ${Math.round(reactorTraining.bonus(id)*100)}% → ${Math.round((reactorTraining.bonus(id)+.05)*100)}% · 1 point`,()=>{if(reactorTraining.train(id)){say('Reactor specialisation trained.');render();}else say('No reactor point spent. Check available points or storage.',true);});b.dataset.reactorTrain=id;b.disabled=remaining<=0||r[id]>=5;training.append(b);}}
    $('modular-factory').replaceChildren(...M().FACTORY.map(f=>{const st=factoryState(f.id),b=button(`${f.name} · ${M().HULLS[f.hull].label||M().HULLS[f.hull].cls} · ${st.q?number(st.q.total)+' metal':'unavailable'}`,()=>chooseFactory(f.id));b.dataset.factoryRail=f.id;b.title=st.why||'Ready to fly';return b;}));
    $('modular-stage').replaceChildren();$('modular-slots').replaceChildren();$('modular-equipment').replaceChildren();$('modular-connectors').replaceChildren();
    if(!m){emptyStage();$('modular-selected').textContent='No blueprint on the slip';for(const id of['modular-move','modular-remove-section','modular-unfit','modular-rotate-module','modular-rotate-section'])$(id).disabled=true;$('modular-equipment').textContent='Pick a hull. Then tap any section on the ship to see what fits it.';$('modular-budget').textContent='GP means fitting capacity; metal is spendable currency.';$('modular-bill').textContent='Starter frigate kit supplied: one core, spine, deck, engine block, light gun and engine.';$('modular-apply').disabled=true;return;}
    let q;try{q=M().quote(d);}catch(e){say(e.message,true);return;}
    $('modular-budget').textContent=`${q.hull.label||q.hull.cls} · ${q.modules} / ${q.capacity} modules · ${q.power} / ${q.hull.power} power${m.hull==='frigate'?' · 4 guns max':''}`;
    const name=$('modular-name');if(document.activeElement!==name)name.value=d.frame||'';
    $('modular-stage').innerHTML='<div class="modular-scene"><canvas id="modular-preview-art" aria-label="Ship preview rendered with the flight renderer"></canvas>'+draw(m)+'</div>';preview();
    const pick=m.sections.find(s=>s.id===selected)||m.sections[0];selected=pick.id;
    for(const s of m.sections){const spec=M().SECTIONS[s.kind],f=m.fittings.find(f=>f.slot===s.id),b=button(`${s.id}: ${spec.name} · ${f?M().GEARS[f.gear].name:spec.slot?'Empty '+spec.slot+' slot':'Structure'}`,()=>select(s.id));b.dataset.selectSection=s.id;b.setAttribute('aria-pressed',String(selected===s.id));$('modular-slots').append(b);}
    for(const pos of ports(m))$('modular-connectors').append(button(`${moving?'Move':'Attach '+M().SECTIONS[part].name} at ${pos.x}, ${pos.y}`,()=>connect(pos.x,pos.y)));
    $('modular-selected').textContent=`${M().SECTIONS[pick.kind].name} · ${M().SECTIONS[pick.kind].slot||'structural connector'} · ${pick.id}`;
    $('modular-move').disabled=pick.kind==='bridge';$('modular-remove-section').disabled=pick.kind==='bridge';$('modular-unfit').disabled=!m.fittings.some(f=>f.slot===pick.id);
    $('modular-rotate-module').disabled=!m.fittings.some(f=>f.slot===pick.id);$('modular-rotate-section').disabled=pick.kind==='bridge';
    const facing=m.fittings.find(f=>f.slot===pick.id);$('modular-selected').textContent+=` · module facing ${facing?.rotation??0}°`;
    const options=Object.entries(M().GEARS).filter(([,g])=>compatible(pick,g));
    // One compact row per option, grouped by family; the list scrolls inside the inspector so 30+ guns never bury the page.
    if(options.length){const note=document.createElement('p');note.className='modular-gear-note';note.textContent='Tap a row to preview it in this slot. GP is fitting capacity, power comes from the reactor, metal per new module (owned hardware is reused).';$('modular-equipment').append(note);}
    const groups=new Map();for(const o of options){const k=o[1].family||'Systems';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);}
    const fitted=m.fittings.find(f=>f.slot===pick.id)?.gear;
    for(const[family,list]of groups){const tint=Object.values(window.arsenal?.FAMILIES||{}).find(f=>f.name===family)?.tint||'#9fd8cf';const head=document.createElement('h4');head.className='modular-gear-family';head.style.color=tint;head.textContent=`${family} · ${list.length}`;$('modular-equipment').append(head);
      for(const[id,g]of list){const w=g.weapon&&WEAPON_TYPES[g.weapon],locked=g.weapon&&!armory.owns(g.weapon);const b=button('',()=>fit(id));b.className='modular-gear-row'+(id===fitted?' fitted':'')+(locked?' locked':'');b.dataset.fitGear=id;b.style.setProperty('--tint',tint);b.title=g.description;
        const name=document.createElement('strong');name.textContent=g.name+(id===fitted?' · fitted':'');const facts=document.createElement('small');facts.textContent=(w?`${g.cls} · ${w.damage} dmg · ${(w.fireRate/60).toFixed(2)}s base cycle · `:'')+`${fleet.costOfNode(g.type,g.radius)} GP · ${g.power} power · ${number(g.cost)} metal`+(locked?' · research first':'');b.append(name,facts);$('modular-equipment').append(b);}}
    if(!options.length)$('modular-equipment').textContent='This section is structural. Add a weapon deck, engine block or utility section to expose its fitting slot.';
    $('modular-bill').textContent=`Fabrication: ${number(q.total)} metal · Balance after apply: ${number(hubs.metal-q.total)} metal. Planning and saved blueprints are free.`;
    // The Apply handler docks first when a station is within reach. Validate
    // structural/capacity requirements here, but let that reachable dock satisfy
    // the location requirement. Direct field fabrication remains prohibited.
    const first=window.starterJourney?.active,field=!hubs.docked&&M().fieldReason(d),near=!!hubs.dockNear();
    const why=(first?starterJourney.blocker(d):null)||M().check(d)||(field&&!near?field:null),applyButton=$('modular-apply');applyButton.disabled=!M().ready||(first?starterJourney.nextLabel().startsWith('Launch')&&!!why:!!why||hubs.metal<q.total);applyButton.textContent=first?starterJourney.nextLabel():`${hubs.docked?'Apply at station':!field?'Apply owned fittings':near?'Dock & apply':'Station required'} · ${number(q.total)} metal`;
    $('modular-blocked').textContent=(first&&!starterJourney.nextLabel().startsWith('Launch')?'The gold button adds and fits your supplied kit. You can also build through Parts.':why)||'Owned equipment can be swapped in the field. Buy new hardware or rebuild hull sections at a station.';
    $('modular-undo').disabled=!shipyard.undoStack.length;$('modular-redo').disabled=!shipyard.redoStack.length;
  }
  function sourceLabel(){
    const root=shipyard.el;if(!root)return;const target=work().editTarget==='blueprint'?'BLUEPRINT · not flying':'ACTIVE SHIP · apply changes to fly';
    const spikes=root.querySelector('[data-category="spike"]');if(spikes){spikes.textContent='Plating';spikes.title='Legacy spikes add base hull HP; they do not add ramming damage.';}
    let badge=root.querySelector('#sy-edit-source');if(!badge){badge=document.createElement('p');badge.id='sy-edit-source';badge.className='catalog-library-hint';root.querySelector('.sy-workbench').prepend(badge);}badge.textContent=target;
    if(!root.querySelector('#sy-build-modular')){const b=button('Build modular hull',open,'sy-build-modular');root.querySelector('#sy-browse-catalog')?.after(b);}
    if(!root.querySelector('#sy-show-flying')){const b=button('Show flying ship',()=>{useActive();if(shipyard.design.modular)open();},'sy-show-flying');root.querySelector('#sy-build-modular')?.after(b);}
    if(!root.querySelector('#sy-fitting-help')){const help=document.createElement('details');help.id='sy-fitting-help';const summary=document.createElement('summary');summary.textContent='How fitting works';const p=document.createElement('p');p.textContent='Metal buys technology and modular hardware. GP is fitting capacity earned through mass; it is not spent money. Weapon size sets its class. A blueprint is a plan; Apply/Fly changes your active ship.';help.append(summary,p);root.querySelector('.sy-library')?.append(help);}
  }
  function install(){
    panel=document.createElement('div');panel.id='modular-yard';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','modular-title');
    panel.innerHTML='<section class="modular-shell"><header class="modular-top"><div class="modular-heading"><small>CONSTRUCTION DOCK · MODULAR</small><h2 id="modular-title">Build a ship, fit its slots</h2><p id="modular-source"></p></div><div class="modular-numbers"><strong id="modular-money"></strong><span id="modular-vitals"></span><span id="modular-budget"></span></div><button id="modular-close">Back</button></header>'
      +'<div class="modular-columns"><aside class="modular-rail"><h3>Factory hulls</h3><nav id="modular-factory" aria-label="Factory hulls"></nav><h3>Bare keel</h3><nav id="modular-hulls" aria-label="New hull"></nav><h3>Add structure</h3><label>Part to attach · then tap a + on the ship<select id="modular-part"></select></label><h3>Sections &amp; slots</h3><div id="modular-slots"></div><details><summary>Attachment points · list</summary><div id="modular-connectors"></div></details><section id="modular-training"></section></aside>'
      +'<section class="modular-preview"><label class="modular-namebar">Blueprint name<input id="modular-name" maxlength="48"></label><div id="modular-stage"></div><p class="modular-hint">Tap <b>+</b> to attach a hull part · tap a section to fit it · <b>Modules</b> and <b>Power</b> limit your loadout · <b>Metal</b> buys new hardware</p><div class="modular-tools"><button id="modular-undo">Undo</button><button id="modular-redo">Redo</button><button id="modular-active">Show flying ship</button><button id="modular-save">Save blueprint</button></div></section>'
      +'<aside class="modular-inspector"><h3 id="modular-selected"></h3><div class="modular-tools modular-section-tools"><button id="modular-move">Move section</button><button id="modular-remove-section">Remove section</button><button id="modular-unfit">Unfit module</button><button id="modular-rotate-module">Rotate module 90°</button><button id="modular-rotate-section">Rotate section 90°</button></div><h3 class="modular-fits-head">Fits this slot</h3><div id="modular-equipment"></div></aside></div>'
      +'<footer><div class="modular-status"><p id="modular-message" aria-live="polite"></p><p id="modular-bill"></p><p id="modular-blocked"></p></div><div class="modular-footer-actions"><button id="modular-dock">Dock here</button><button id="modular-apply">Apply at station</button></div></footer></section>';
    panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(panel);
    for(const[id,h]of Object.entries(M().HULLS))$('modular-hulls').append(button(`New ${h.name} · ${h.mass?number(h.mass)+' biomass · rank '+h.rank:'starter kit'}`,()=>chooseHull(id),'modular-new-'+id));
    for(const[id,p]of Object.entries(M().SECTIONS))if(id!=='bridge')$('modular-part').add(new Option(p.name+' · '+number(p.cost)+' metal'+(p.hulls?' · '+p.hulls.map(k=>M().HULLS[k].cls.toLowerCase()).join('/')+' only':''),id));$('modular-part').value=part;$('modular-part').onchange=e=>{part=e.target.value;moving=false;render();};
    $('modular-close').onclick=close;$('modular-active').onclick=()=>{if(useActive())render();};$('modular-apply').onclick=apply;$('modular-dock').onclick=dock;
    const find=button('Find refit station',()=>{if(!saveState.doc.launched){say('Launch your captain to travel to a station.');return;}window.travelHelper?.station();close();if(shipyard.open)shipyard.hide();if(menu.isPaused())menu.resume();window.travelHelper?.paint();},'modular-find-station');$('modular-dock').after(find);
    $('modular-name').onchange=e=>{shipyard.edit(()=>{shipyard.design.frame=e.target.value.slice(0,48);shipyard.syncFields();});render();};
    $('modular-save').onclick=()=>{shipyard.syncFields();const ok=workshopLibrary.save();say(ok?'Blueprint saved. Your flying ship is unchanged.':'Blueprint was not saved.',!ok);render();};
    $('modular-undo').onclick=()=>{shipyard.history('undo');render();};$('modular-redo').onclick=()=>{shipyard.history('redo');render();};
    $('modular-rotate-module').onclick=()=>mutate(m=>{const f=m.fittings.find(f=>f.slot===selected);if(f)f.rotation=((f.rotation||0)+90)%360;});
    $('modular-rotate-section').onclick=()=>mutate(m=>{const s=m.sections.find(s=>s.id===selected);if(s&&s.kind!=='bridge')s.rotation=((s.rotation||0)+90)%360;});
    $('modular-unfit').onclick=()=>mutate(m=>{m.fittings=m.fittings.filter(f=>f.slot!==selected);});
    $('modular-remove-section').onclick=()=>mutate(m=>{if(m.fittings.some(f=>f.slot===selected))throw new Error('Unfit this section’s equipment first.');const s=m.sections.find(s=>s.id===selected);if(s?.kind==='bridge')throw new Error('The command core must remain.');m.sections=m.sections.filter(s=>s.id!==selected);});
    $('modular-move').onclick=()=>{moving=true;say('Choose an empty + connector. Every section must remain connected.');render();};
    function stageAction(e){const s=e.target.closest('[data-section]'),p=e.target.closest('[data-port]');if(s)select(s.dataset.section);else if(p){const[x,y]=p.dataset.port.split(',').map(Number);connect(x,y);}}
    $('modular-stage').onclick=stageAction;$('modular-stage').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stageAction(e);}};
    const show=shipyard.show;shipyard.show=function(...args){const d=work();if(!this.open&&d.editTarget!=='blueprint'&&saveState.doc.design&&d.activeSnapshot!==signature(saveState.doc.design)){if(d.draft)d.blueprintDraft=copy(d.draft);d.draft=copy(saveState.doc.design);d.activeSnapshot=signature(saveState.doc.design);d.editTarget='active';}const r=show.apply(this,args);sourceLabel();if(this.design?.modular)open();return r;};
    const paint=shipyard.paint;shipyard.paint=function(...args){if(this.design?.modular){try{this.design=M().compile(this.design).design;}catch{}}const r=paint.apply(this,args);sourceLabel();render();return r;};
    const fresh=workshopLibrary.newShip;workshopLibrary.newShip=function(...a){work().editTarget='blueprint';return fresh.apply(this,a);};
    const load=workshopLibrary.load;workshopLibrary.load=function(...a){work().editTarget='blueprint';const r=load.apply(this,a);sourceLabel();if(r&&shipyard.design.modular)open();return r;};
    const flying=workshopLibrary.editFlying;workshopLibrary.editFlying=function(...a){work().editTarget='active';const r=flying.apply(this,a);work().activeSnapshot=signature(saveState.doc.design);sourceLabel();if(r&&shipyard.design.modular)open();return r;};
    const libraryOpen=workshopLibrary.open;workshopLibrary.open=function(...a){const r=libraryOpen.apply(this,a),actions=$('build-library-actions');for(const[id,text,key]of[['resume-stashed-blueprint','Resume previous draft','blueprintDraft'],['load-pre-modular','Load pre-modular ship','modularLegacy']]){let b=$(id);const d=key==='modularLegacy'?saveState.doc.modularLegacy:work()[key];if(d&&!b){b=button(text,()=>{const saved=key==='modularLegacy'?saveState.doc.modularLegacy:work()[key];if(!saved)return;work().editTarget='blueprint';shipyard.edit(()=>{shipyard.design=copy(saved);shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();});workshopLibrary.close();shipyard.phonePane('ship');if(saved.modular)open();},id);actions.append(b);}if(b)b.hidden=!d;}return r;};
    const hide=shipyard.hide;shipyard.hide=function(...a){close();return hide.apply(this,a);};
    for(const key of['place','duplicateSel','remove','resizeSel']){const fn=shipyard[key];shipyard[key]=function(...a){if(this.design?.modular){open();say('Use the structural slots in the modular workbench.');return false;}return fn.apply(this,a);};}
    window.addEventListener('black-current-wallet',()=>{if(panel&&!panel.hidden)render();});
    document.addEventListener('keydown',e=>{if(!panel||panel.hidden)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(!/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)){e.stopImmediatePropagation();}},true);
    for(const host of[document.querySelector('#dock-panel .dock-doors'),document.querySelector('#pause-menu .tm-doors')])if(host){const b=button('Modular shipyard',()=>{if(!shipyard.open)shipyard.show();open();});b.className='tm-door';b.dataset.service='modular';host.append(b);}
    ready=true;sourceLabel();
  }
  window.modularYard={open,close,useActive,refresh:render,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
/* Test grant (Mac, 2026-10-25: "max out my material in game quickly"): open the game with ?forge-test
   and the save gets 999,999 metal, enough to build and apply any modular hull. */
if(/[?&]forge-test\b/.test(location.search)){const t=setInterval(()=>{if(typeof hubs==='undefined'||typeof saveState==='undefined'||!saveState.doc||!saveState.doc.launched)return;clearInterval(t);hubs.metal=Math.max(hubs.metal||0,999999);try{saveState.save();}catch{}window.garage?.banner?.('Test grant: 999,999 metal.','good');},250);}
/* Forge skin: a piece that lands flashes the blueprint table and clicks. Watches only the yard panel. */
(function snap(){const panel=document.getElementById('modular-yard');if(!panel){setTimeout(snap,300);return;}let last='';new MutationObserver(()=>{const stage=document.getElementById('modular-stage'),m=typeof shipyard!=='undefined'&&shipyard.design?.modular;if(panel.hidden||!stage||!m){last='';return;}const sig=JSON.stringify([m.sections,m.fittings,m.kit]);if(last&&sig!==last){stage.classList.remove('forge-snap');void stage.offsetWidth;stage.classList.add('forge-snap');try{soundEngine.playBubblePop('small');}catch(e){}}last=sig;}).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});})();
/* Tabs, not scroll. Mac: "long form scrolling in a small little space". The rail was 2.6 screens tall and the
   inspector 2. After every render each panel is regrouped: the part picker stays pinned, the rest becomes tabs.
   The chosen tab survives re-renders; only classes change, so no yard logic or element moves. */
(function tabs(){
  const panel=document.getElementById('modular-yard');if(!panel){setTimeout(tabs,300);return;}
  const groups={
    rail:[['pin',['modular-part']],['Hulls',['modular-factory','modular-hulls']],['Slots',['modular-slots','modular-connectors']],['Training',['modular-training']]],
    inspector:[['Clip-ons',['modular-kit']],['Fittings',['modular-equipment']]]
  };
  const pick={rail:'Hulls',inspector:'Clip-ons'};
  function apply(){
    if(panel.hidden)return;
    const empty=!!panel.querySelector('.modular-empty');
    for(const key of Object.keys(groups)){
      const col=panel.querySelector('.modular-'+key);if(!col)continue;
      col.classList.toggle('forge-tabbed',!empty);
      let bar=col.querySelector(':scope>.forge-tabs');
      if(empty){bar?.remove();col.querySelectorAll('.forge-off,.forge-pin').forEach(e=>e.classList.remove('forge-off','forge-pin'));continue;}
      const live=[];
      for(const [name,ids] of groups[key]){
        const els=new Set();
        for(const id of ids){let el=document.getElementById(id);while(el&&el.parentElement!==col)el=el.parentElement;if(!el)continue;els.add(el);const h=el.previousElementSibling;if(h&&h.tagName==='H3')els.add(h);}
        if(!els.size)continue;
        if(name!=='pin')live.push(name);
        els.forEach(e=>{e.dataset.forgeTab=name;e.classList.toggle('forge-pin',name==='pin');e.classList.toggle('forge-off',name!=='pin'&&name!==pick[key]);});
      }
      if(live.length&&!live.includes(pick[key])){pick[key]=live[0];apply();return;}
      if(!bar){bar=document.createElement('div');bar.className='forge-tabs';bar.setAttribute('role','tablist');col.prepend(bar);}
      const sig=live.join('|')+'>'+pick[key];
      if(bar.dataset.sig!==sig){
        bar.dataset.sig=sig;bar.replaceChildren(...live.map(name=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.textContent=name;b.setAttribute('aria-selected',String(name===pick[key]));b.onclick=()=>{pick[key]=name;apply();col.scrollTop=0;};return b;}));
      }
    }
  }
  new MutationObserver(apply).observe(panel,{childList:true,subtree:true});
  apply();
})();
