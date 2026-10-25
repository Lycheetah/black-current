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
    const next=copy(shipyard.design);try{change(next.modular);const c=M().compile(next);shipyard.edit(()=>{shipyard.design=c.design;shipyard.syncFields();});say('Blueprint changed. Review the bill, then Apply at station.');render();return true;}catch(e){say(e.message,true);return false;}
  }
  function chooseHull(hull){
    if(work().draft)work().blueprintDraft=copy(work().draft);
    work().editTarget='blueprint';const c=M().compile(M().make(hull));shipyard.edit(()=>{shipyard.design=c.design;shipyard.sel=-1;shipyard.part=null;shipyard.syncFields();});selected='fore';moving=false;say('New modular blueprint. Your flying ship and saved builds are safe.');render();
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
  function close(){if(!panel)return;panel.hidden=true;document.body.classList.remove('modular-yard-open');engine.paused=previousPause;}
  function ports(m){const result=new Map(),has=new Set(m.sections.map(s=>s.x+','+s.y));for(const s of m.sections)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=s.x+dx,y=s.y+dy,key=x+','+y;if(!has.has(key)&&Math.abs(x)<=8&&Math.abs(y)<=8)result.set(key,{x,y});}return[...result.values()];}
  function connect(x,y){
    mutate(m=>{if(moving){const s=m.sections.find(s=>s.id===selected);if(!s||s.kind==='bridge')throw new Error('Select a structural section to move.');s.x=x;s.y=y;}else{let i=1;while(m.sections.some(s=>s.id==='s'+i))i++;const id='s'+i;m.sections.push({id,kind:part,x,y});selected=id;}});moving=false;
  }
  function select(id){selected=id;moving=false;render();}
  function compatible(s,g){const slot=M().SECTIONS[s.kind].slot;return slot===g.kind||g.kind==='weapon'&&(slot==='light'&&['POINT','LIGHT'].includes(g.cls)||slot==='medium'&&['POINT','LIGHT','MEDIUM'].includes(g.cls));}
  function fit(gear){mutate(m=>{m.fittings=m.fittings.filter(f=>f.slot!==selected);m.fittings.push({slot:selected,gear,mk:1});});}
  function apply(){
    if(!shipyard.design?.modular)return;
    if(!hubs.docked&&hubs.dockNear()){engine.paused=false;hubs.openDock();engine.paused=true;}
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
    const c=ports(m),all=[...m.sections,...c],xs=all.map(s=>s.x*48),ys=all.map(s=>s.y*48),minX=Math.min(...xs)-30,minY=Math.min(...ys)-30,w=Math.max(...xs)-minX+30,h=Math.max(...ys)-minY+30;
    const colours={light:'#e7bb75',medium:'#cf9af0',engine:'#99c6ee',utility:'#86ded0'},fitted=new Map(m.fittings.map(f=>[f.slot,f]));
    let html=`<svg id="modular-canvas" viewBox="${minX} ${minY} ${w} ${h}" aria-label="Connected hull sections and fitting slots">`;
    for(const s of m.sections){const x=s.x*48,y=s.y*48,slot=M().SECTIONS[s.kind].slot,col=colours[slot]||'#8197a5';html+=`<g role="button" tabindex="0" data-section="${s.id}" aria-label="${M().SECTIONS[s.kind].name}, ${slot||'structure'}, ${fitted.has(s.id)?'fitted':'empty'}"><rect x="${x-23}" y="${y-20}" width="46" height="40" rx="5" fill="transparent" stroke="${selected===s.id?'#f4deaa':'#526975'}" stroke-width="${selected===s.id?2:1}"/>${slot&&!fitted.has(s.id)?`<circle cx="${x}" cy="${y}" r="11" fill="#0a1925" stroke="${col}"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="${col}" font-size="10">${slot==='engine'?'E':slot==='utility'?'U':'W'}</text>`:''}</g>`;}
    for(const p of c)html+=`<g role="button" tabindex="0" data-port="${p.x},${p.y}" aria-label="Attach at ${p.x}, ${p.y}"><circle cx="${p.x*48}" cy="${p.y*48}" r="15" fill="#10202a" stroke="#4c736e" stroke-dasharray="3 3"/><text x="${p.x*48}" y="${p.y*48+6}" text-anchor="middle" fill="#9addcc" font-size="20">+</text></g>`;
    return html+'</svg>';
  }
  function render(){
    if(!panel||panel.hidden)return;
    const p=engine.player,h=M().hangar();$('modular-money').textContent=number(hubs.metal)+' metal';$('modular-vitals').textContent=`Flying ship · HP ${number(p.hp)} / ${number(p.maxHp)} · Shield ${number(p.shieldHp)}`;
    const d=shipyard.design,m=d?.modular,active=work().editTarget!=='blueprint'&&signature(d)===signature(saveState.doc.design);
    $('modular-source').textContent=active?'CURRENT FLYING SHIP':'BLUEPRINT PREVIEW · changes are not applied';
    $('modular-active').disabled=!saveState.doc.design;
    const training=$('modular-training');training.replaceChildren();const title=document.createElement('strong');title.textContent=`Shipwright ${h.rank} / 3`;training.append(title);
    const explanation=document.createElement('p');explanation.textContent='Each rank unlocks one additional module slot. Hull type, power and weapon size still apply.';training.append(explanation);
    if(h.rank<3){const b=button(`Train rank ${h.rank+1} · ${number(M().RANK_COST[h.rank])} metal`,()=>{if(!M().train())say('Training requires docking, enough metal, and the listed mass milestone.',true);else{say('Shipwright trained: one more module slot unlocked.');render();}},'modular-train');b.disabled=!hubs.docked||hubs.metal<M().RANK_COST[h.rank]||progression.totalMass<M().RANK_MASS[h.rank];const hint=document.createElement('p');hint.textContent=`${hubs.docked?'Docked':'Dock to train'} · requires ${number(M().RANK_MASS[h.rank])} mass · ${number(progression.totalMass)} collected.`;training.append(b,hint);}
    if(window.reactorTraining){const r=reactorTraining.ranks(),remaining=reactorTraining.earned()-Object.values(r).reduce((a,b)=>a+b,0),heading=document.createElement('h3');heading.textContent=`Reactor training · ${remaining} level points`;training.append(heading);for(const[id,name]of Object.entries(reactorTraining.NAMES)){const b=button(`${name} ${r[id]}/5 · ${Math.round(reactorTraining.bonus(id)*100)}% → ${Math.round((reactorTraining.bonus(id)+.05)*100)}% · 1 point`,()=>{if(reactorTraining.train(id)){say('Reactor specialisation trained.');render();}else say('No reactor point spent. Check available points or storage.',true);});b.dataset.reactorTrain=id;b.disabled=remaining<=0||r[id]>=5;training.append(b);}}
    $('modular-stage').replaceChildren();$('modular-slots').replaceChildren();$('modular-equipment').replaceChildren();$('modular-connectors').replaceChildren();
    if(!m){$('modular-stage').textContent='Your existing ship is safe. Choose a modular frigate or cruiser above to start a separate blueprint.';$('modular-budget').textContent='GP means fitting capacity; metal is spendable currency.';$('modular-bill').textContent='Starter frigate kit supplied: one core, spine, deck, engine block, light gun and engine.';$('modular-apply').disabled=true;return;}
    let q;try{q=M().quote(d);}catch(e){say(e.message,true);return;}
    $('modular-budget').textContent=`${q.hull.cls} · ${q.gp} / ${number(progression.getTotalGP())} GP fitting capacity · ${q.modules} / ${q.capacity} module slots · ${q.power} / ${q.hull.power} power`;
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
    for(const[id,g]of options){const card=document.createElement('article');card.className='modular-gear';const title=document.createElement('strong');title.textContent=g.name;const desc=document.createElement('p');desc.textContent=g.description;const facts=document.createElement('p');facts.textContent=`${fleet.costOfNode(g.type,g.radius)} GP · ${g.power} power · one ${g.kind} slot · ${number(g.cost)} metal per new module`;const owned=document.createElement('p');owned.textContent=g.weapon&&!armory.owns(g.weapon)?'Research required in the Armoury before Apply.':'Technology available. Owned hardware is reused before buying new.';const b=button('Preview in selected slot',()=>fit(id));b.dataset.fitGear=id;card.append(title,desc,facts,owned,b);$('modular-equipment').append(card);}
    if(!options.length)$('modular-equipment').textContent='This section is structural. Add a weapon deck, engine block or utility section to expose its fitting slot.';
    $('modular-bill').textContent=`Fabrication: ${number(q.total)} metal · Balance after apply: ${number(hubs.metal-q.total)} metal. Planning and saved blueprints are free.`;
    const why=M().check(d)||fitting.check(d),applyButton=$('modular-apply');applyButton.disabled=!M().ready||!!why||hubs.metal<q.total||(!hubs.docked&&!hubs.dockNear());applyButton.textContent=`${hubs.docked?'Apply at station':hubs.dockNear()?'Dock & apply':'Dock to apply'} · ${number(q.total)} metal`;
    $('modular-blocked').textContent=why||(!hubs.docked&&!hubs.dockNear()?'Reach a station to apply. You can plan and save here.':'Owned fittings are reused; only new hardware is charged.');
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
    panel.innerHTML='<section class="modular-shell"><header><div><small>BLACK CURRENT / CONSTRUCTION DOCK</small><h2 id="modular-title">Build a ship, fit its slots</h2><p id="modular-source"></p></div><button id="modular-close">Back</button></header><div class="modular-numbers"><strong id="modular-money"></strong><span id="modular-vitals"></span><span id="modular-budget"></span></div><p class="modular-guide">1 Choose a hull. 2 Tap a + connector to attach structure. 3 Select a slot and preview compatible equipment. 4 Review the bill and Apply at a station. <b>Metal buys parts. GP is fitting capacity, not money.</b></p><nav id="modular-hulls"></nav><div class="modular-columns"><section class="modular-preview"><label>Blueprint name<input id="modular-name" maxlength="48"></label><div id="modular-stage"></div><div class="modular-tools"><button id="modular-undo">Undo</button><button id="modular-redo">Redo</button><button id="modular-active">Show flying ship</button><button id="modular-save">Save blueprint</button><button id="modular-dock">Dock here</button></div><label>Next structural part<select id="modular-part"></select></label><details><summary>Attachment points — touch list</summary><div id="modular-connectors"></div></details><h3>Sections & slots</h3><div id="modular-slots"></div></section><aside><h3 id="modular-selected"></h3><div class="modular-tools"><button id="modular-move">Move section</button><button id="modular-remove-section">Remove section</button><button id="modular-unfit">Unfit module</button><button id="modular-rotate-module">Rotate module 90°</button><button id="modular-rotate-section">Rotate section 90°</button></div><div id="modular-equipment"></div><section id="modular-training"></section></aside></div><footer><p id="modular-message" aria-live="polite"></p><p id="modular-bill"></p><p id="modular-blocked"></p><button id="modular-apply">Apply at station</button></footer></section>';
    const sticky=document.createElement('div');sticky.className='modular-sticky';const header=panel.querySelector('header'),numbers=panel.querySelector('.modular-numbers');header.before(sticky);sticky.append(header,numbers);
    panel.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(panel);
    for(const[id,h]of Object.entries(M().HULLS))$('modular-hulls').append(button(`New ${h.name} · ${h.mass?number(h.mass)+' mass · rank '+h.rank:'starter kit'}`,()=>chooseHull(id),'modular-new-'+id));
    for(const[id,p]of Object.entries(M().SECTIONS))if(id!=='bridge')$('modular-part').add(new Option(p.name+' · '+number(p.cost)+' metal',id));$('modular-part').value=part;$('modular-part').onchange=e=>{part=e.target.value;moving=false;render();};
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
    for(const host of[document.querySelector('#dock-panel .dock-doors'),document.querySelector('#pause-menu .tm-doors')])if(host)host.append(button('Modular shipyard',()=>{if(!shipyard.open)shipyard.show();open();}));
    ready=true;sourceLabel();
  }
  window.modularYard={open,close,useActive,refresh:render,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
