/* Named equipment commissions live beside the existing field contracts. The
 * vendor owns stock counts only; all hardware enters the same modular hold. */
(() => {
  'use strict';
  const M=()=>modularShips,$=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,run,cls)=>{const e=el('button',text,cls);e.type='button';e.onclick=run;return e;};
  const number=n=>Number(n||0).toLocaleString();
  const PERIOD=12*60*60*1000;
  const JOBS={
    patrol:{title:'Rookie patrol',kind:'kills',n:6,danger:1,line:'Defeat 6 hostiles outside the anchorage and training range.',reward:'weapon'},
    shield:{title:'Secure the outer lanes',kind:'kills',n:12,danger:2,line:'Defeat 12 hostiles in danger 2 or higher sectors.',reward:'shield'},
    elite:{title:'Recover the prototype',kind:'elite',n:2,danger:3,line:'Defeat 2 elite ships in danger 3 or higher sectors.',reward:'variant'},
    carrier:{title:'Break the pirate foundry',kind:'outpost',n:1,danger:3,line:'Destroy a pirate outpost in danger 3 or higher.',reward:'bay'}
  };
  const TRAIT={kinetic:'bouncer',rail:'needle',beam:'cryo',missile:'seeker',ordnance:'nova'};
  let ready=false,preview='',notice='',stockNote='';const credited=new WeakSet();
  const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
  function random(seed){let s=seed||1;return()=>((s^=s<<13,s^=s>>>17,s^=s<<5,s>>>0)/4294967296);}
  function system(){return galaxy.current;}
  function faction(sys=system()){
    const home=sys.id===saveState.doc.civHome,chosen=home&&(saveState.doc.profile?.civ||saveState.doc.civ);
    if(chosen&&canon.civilisations.some(c=>c.id===chosen))return canon.civilisations.find(c=>c.id===chosen);
    let h=0;for(const c of sys.id)h=(h*31+c.charCodeAt(0))>>>0;return canon.civilisations[h%canon.civilisations.length];
  }
  function weapon(family,cls=0,avoid=''){const pool=Object.entries(arsenal.GUNS).filter(([id,g])=>g.family===family&&g.c===cls&&!g.special&&M().GEARS['gun-'+id]).sort(([a],[b])=>a.localeCompare(b));return(pool.find(([id])=>id!==avoid)||pool[0])?.[0]||'spitter';}
  function reward(id,sys=system()){
    const family=arsenal.familyOf(noviceFleet.ROWS[faction(sys).id]?.gun)||'kinetic',kind=JOBS[id]?.reward;
    if(kind==='shield')return{base:'shield'};if(kind==='bay')return{base:'drone-bay'};
    return{base:'gun-'+weapon(family,kind==='variant'?1:0,noviceFleet.ROWS[faction(sys).id]?.gun),...(kind==='variant'?{quirk:TRAIT[family],rarity:'rare'}:{})};
  }
  function descriptor(r){const g=M().GEARS[r.base];return g&&{type:g.type,radius:g.radius,...(g.weapon?{weapon:g.weapon}:{}),...(r.quirk?{quirk:r.quirk,rarity:r.rarity||'rare'}:{})};}
  const gearId=r=>r.quirk?'recovered-'+r.base+'-'+r.quirk:r.base;
  function rewardName(r){return(r.quirk?loot.QUIRKS[r.quirk].name+' · ':'')+M().GEARS[r.base].name;}
  function missions(){const c=contracts.state();if(!c.requisitions||c.requisitions.v!==1||!Array.isArray(c.requisitions.claimed))c.requisitions={v:1,active:null,claimed:[]};return c.requisitions;}
  function warehouse(){let s=saveState.doc.quartermaster;if(!s||s.v!==1||!s.markets||typeof s.markets!=='object'||Array.isArray(s.markets))s=saveState.doc.quartermaster={v:1,markets:{}};return s;}
  const key=(sys,id)=>sys+':'+id;
  const owned=r=>equipmentCodex.owned('gear',gearId(r));
  function atomic(change){
    // Restore only this transaction's fields. Standing contracts hold timer
    // references to their own records; replacing the whole save would orphan them.
    const doc=saveState.doc,fields=['metal','modularHangar','armory','equipmentCodex','quartermaster','travelRoute'],before={};for(const k of fields)before[k]=doc[k]===undefined?undefined:copy(doc[k]);const req=doc.contracts?.requisitions===undefined?undefined:copy(doc.contracts.requisitions),persist=saveState.save;let result=false;
    const rollback=()=>{if(saveState.doc!==doc)saveState.doc=doc;for(const k of fields)if(before[k]===undefined)delete doc[k];else doc[k]=before[k];if(doc.contracts){if(req===undefined)delete doc.contracts.requisitions;else doc.contracts.requisitions=req;}};
    try{saveState.save=()=>true;result=change();}catch(e){notice='Transaction cancelled: '+e.message;}finally{saveState.save=persist;}
    if(!result){rollback();return false;}
    if(!persist.call(saveState)){rollback();notice='Save failed. No metal, stock or reward was changed.';return false;}
    window.walletHUD?.paint();return true;
  }
  function accept(id){
    if(!Object.hasOwn(JOBS,id)||!hubs.docked||missions().active||missions().claimed.includes(key(galaxy.currentId,id)))return false;
    const sys=system(),ok=atomic(()=>{missions().active={id,sys:sys.id,have:0,reward:reward(id,sys)};return true;});
    if(ok){preview='';notice='Commission accepted. Your named reward waits at this system’s station.';}pilotRpg.refresh();return ok;
  }
  function claim(){
    const a=missions().active;if(!a||!JOBS[a.id]||a.have<JOBS[a.id].n||!hubs.docked||a.sys!==galaxy.currentId||missions().claimed.includes(key(a.sys,a.id))||owned(a.reward)>=64)return false;
    const ok=atomic(()=>{if(!recoveredFittings.grant(descriptor(a.reward)))return false;const d=missions();d.claimed.push(key(a.sys,a.id));d.active=null;if(saveState.doc.travelRoute?.name==='Commission patrol area')saveState.doc.travelRoute=null;return true;});
    if(ok){notice='Reward delivered to your modular hold: '+rewardName(a.reward);garage.banner(notice,'good');travelHelper.paint();}pilotRpg.refresh();return ok;
  }
  function abandon(){if(!missions().active)return false;const ok=atomic(()=>{missions().active=null;return true;});if(ok)notice='Commission abandoned. No reward was claimed.';pilotRpg.refresh();return ok;}
  function makeStock(sys,cycle){
    const rng=random(hash(sys.id+'|'+cycle)),family=arsenal.familyOf(noviceFleet.ROWS[faction(sys).id]?.gun)||'kinetic',cls=Math.min(5,Math.max(0,(sys.danger||1)-2)),support=['shield','engine','armour','repair','drone-bay'];
    const bases=['gun-'+weapon(family,cls),support[Math.floor(rng()*support.length)],'gun-'+weapon(['kinetic','rail','beam','missile','ordnance'][Math.floor(rng()*5)],cls)];
    return{cycle,offers:bases.map((base,i)=>{const g=M().GEARS[base],pool=Object.entries(loot.QUIRKS).filter(([,q])=>q.type===g.type),quirk=pool[Math.floor(rng()*pool.length)][0],c=arsenal.GUNS[g.weapon]?.c||0;return{id:i,base,quirk,rarity:cls>=3?'exotic':'rare',price:Math.max(240,Math.ceil((g.cost*(2.5+c*.15)+100*2**c)/10)*10),remaining:1};})};
  }
  function validStock(m){return m&&Number.isSafeInteger(m.cycle)&&Array.isArray(m.offers)&&m.offers.length===3&&m.offers.every((o,i)=>o.id===i&&Object.hasOwn(M().GEARS,o.base)&&Object.hasOwn(loot.QUIRKS,o.quirk)&&loot.QUIRKS[o.quirk].type===M().GEARS[o.base].type&&Number.isSafeInteger(o.price)&&o.price>=240&&[0,1].includes(o.remaining));}
  function market(){
    const sys=system();if(sys.id==='home'||sys.id===saveState.doc.civHome)return{home:true,offers:[]};
    const old=warehouse().markets[sys.id],cycle=Math.max(Math.floor(Date.now()/PERIOD),Number.isSafeInteger(old?.cycle)?old.cycle:0);
    if(old&&!validStock(old)){stockNote='This station’s saved stock is unavailable. No purchase can be made.';return null;}
    if(!old||cycle>old.cycle){if(!atomic(()=>{warehouse().markets[sys.id]=makeStock(sys,cycle);return true;})){stockNote=notice;return null;}stockNote='';}
    return copy(warehouse().markets[sys.id]);
  }
  function buy(id){
    if(!hubs.docked||!Number.isSafeInteger(id))return false;const m=market(),o=m?.offers.find(o=>o.id===id),raw=Number(saveState.doc.metal);
    if(!o||!o.remaining||!Number.isFinite(raw)||raw<0||hubs.metal<o.price||owned(o)>=64)return false;
    const sys=galaxy.currentId,ok=atomic(()=>{const entry=warehouse().markets[sys]?.offers.find(p=>p.id===id);if(!entry||entry.remaining!==1)return false;saveState.doc.metal=hubs.metal-entry.price;if(!recoveredFittings.grant(descriptor(entry)))return false;entry.remaining=0;return true;});
    if(ok){notice='Purchased '+rewardName(o)+'. One physical fitting was added to your modular hold.';stockNote='Bought: '+rewardName(o);garage.banner(notice,'good');}else stockNote='Save failed. Nothing spent or delivered.';hangarUI.open('stock');return ok;
  }
  function portrait(r,W=130,H=66){const g=M().GEARS[r.base];if(g.weapon)return topdownKit.icon(g.weapon,W,H);return topdownKit.thumb({sections:[{id:'c',kind:g.kind==='engine'?'drive':'utility',x:0,y:0}],fittings:[{slot:'c',gear:r.base,mk:1}]},W,H,'#99d6d0');}
  function rewardCard(r){
    const g=M().GEARS[r.base],card=el('article',null,'qm-reward');card.append(portrait(r),el('strong',rewardName(r)));
    const w=g.weapon&&WEAPON_TYPES[g.weapon];card.append(el('small',(w?w.damage+' hit · '+(w.fireRate/60).toFixed(2)+'s · ':'')+g.power+' power'));
    card.append(el('p',r.quirk?loot.QUIRKS[r.quirk].line:w?.blurb||g.description));return card;
  }
  function showJournal(){hangarUI.close();if(!$('modular-yard').hidden)modularYard.close();pilotRpg.openJournal('commissions');$('qm-jobs')?.scrollIntoView({block:'start'});}
  function guide(){const a=missions().active;if(!a)return false;if(a.sys!==galaxy.currentId)return travelHelper.destination(a.sys);if(a.have>=JOBS[a.id].n)return travelHelper.station();return travelHelper.sector(0,Math.min(worldMap.size,JOBS[a.id].danger>=3?4:2),'Commission patrol area');}
  function journal(){
    const host=el('section',null,'qm-board');host.id='qm-jobs';const a=missions().active,sys=system(),civ=faction(a&&galaxy.data.byId[a.sys]||sys);host.append(el('small','FACTION COMMISSIONS','qm-kicker'),el('h3',civ.name+' quartermaster'),el('p','One active commission. Named equipment, no extra currency. Each commission pays once per system.','qm-note'));
    if(notice)host.append(el('p',notice,'qm-notice'));
    if(a&&JOBS[a.id]){
      const job=JOBS[a.id],at=galaxy.data.byId[a.sys];host.append(el('h4',job.title+' · '+(at?.name||a.sys)),el('p',job.line),el('strong',Math.min(job.n,a.have)+' / '+job.n,'qm-progress'),rewardCard(a.reward));
      const actions=el('div',null,'qm-actions'),collect=button(a.have>=job.n?'Claim named reward':'Complete the objective',()=>claim());collect.id='qm-claim';collect.disabled=a.have<job.n||!hubs.docked||a.sys!==galaxy.currentId||owned(a.reward)>=64;
      actions.append(collect,button('Plot commission route',()=>{guide();pilotRpg.close();if(hubs.docked)hubs.closeDock();}),button('Abandon commission',abandon));host.append(actions);if(a.have>=job.n&&(!hubs.docked||a.sys!==galaxy.currentId))host.append(el('p','Return and dock in '+(at?.name||a.sys)+' to claim this fitting.','qm-note'));return host;
    }
    if(preview&&JOBS[preview]){const id=preview,job=JOBS[id],r=reward(id,sys);host.append(el('h4',job.title),el('p',job.line),rewardCard(r));const actions=el('div',null,'qm-actions'),take=button('Accept commission',()=>accept(id));take.id='qm-accept';take.disabled=!hubs.docked;actions.append(take,button('← Other commissions',()=>{preview='';pilotRpg.refresh();}));host.append(actions);if(!hubs.docked)host.append(el('p','Dock in this system to accept. You can preview the reward here.','qm-note'));return host;}
    const cards=el('div',null,'qm-job-grid');for(const [id,job] of Object.entries(JOBS)){const done=missions().claimed.includes(key(sys.id,id)),b=button('',()=>{preview=id;pilotRpg.refresh();});b.dataset.qmJob=id;b.disabled=done;b.append(el('strong',job.title),el('small',job.line),el('span',done?'✓ Claimed here':rewardName(reward(id,sys))));cards.append(b);}host.append(cards);return host;
  }
  function stockView(){
    const host=el('section',null,'qm-stock'),sys=system(),m=market();host.append(el('small','STATION QUARTERMASTER','qm-kicker'),el('h3',faction().name+' · '+sys.name));
    const nav=el('div',null,'qm-actions');nav.append(button('Ordinary equipment',()=>hangarUI.open('gear',true)),button('Faction commissions',showJournal));host.append(nav);if(stockNote)host.append(el('p',stockNote,'qm-notice'));
    if(!m){host.append(el('p','Stock could not be saved or read. Nothing can be purchased.','qm-note'));return host;}
    if(m.home){host.append(el('p','This is your rookie anchorage. Basic equipment is always available. Find faction specials at other systems’ stations, or earn named fittings through commissions.','qm-note'));return host;}
    const rules=el('details',null,'qm-rules');rules.append(el('summary','One fitting per offer · stock rotates every 12 hours'),el('p','This system’s stations share saved quantities. Reopening does not reroll them. Bought fittings go into your hold; ordinary equipment remains available.','qm-note'));host.append(rules);
    const grid=el('div',null,'qm-stock-grid');for(const o of m.offers){const card=rewardCard(o),buyButton=button(o.remaining?(hubs.docked?'Buy · '+number(o.price)+' metal':'Dock to buy'):'Sold out this rotation',()=>buy(o.id));card.dataset.qmOffer=o.id;buyButton.dataset.qmBuy=o.id;buyButton.disabled=!o.remaining||!hubs.docked||hubs.metal<o.price||owned(o)>=64;card.append(el('b',number(o.price)+' metal','qm-price'),buyButton);grid.append(card);}host.append(grid);return host;
  }
  function install(){
    if(!window.equipmentCodex?.ready){setTimeout(install,50);return;}
    pilotRpg.registerJournalSection(journal,{id:'commissions',label:'Faction jobs'});
    const kill=engine.killEnemy;engine.killEnemy=function(i,...args){const e=this.enemies[i],ch=worldMap.getCurrentChamber(),place={sys:galaxy.currentId,danger:ch.dangerLevel,practice:frontierPve.isRange(),haven:ch.isHaven};const result=kill.call(this,i,...args),a=missions().active,job=a&&JOBS[a.id];
      if(e&&e.hp<=0&&!this.enemies.includes(e)&&!e.training&&!credited.has(e)&&job&&a.sys===place.sys&&!place.practice&&!place.haven&&place.danger>=job.danger&&a.have<job.n&&(job.kind==='kills'||job.kind==='elite'&&e.elite||job.kind==='outpost'&&e.archetype==='outpost')){credited.add(e);const before=a.have;a.have++;if(!saveState.save())a.have=before;if(a.have===job.n)garage.banner('Commission complete · return to the '+galaxy.data.byId[a.sys].name+' quartermaster','good');pilotRpg.refresh();}return result;};
    for(const id of ['dock-market','dock-oddities'])$(id)?.closest('section')?.classList.add('qm-retired-stock');
    const oldBuy=loot.buy;loot.buy=function(...a){if(saveState.doc.design?.modular){notice='Use Station specials for saved, limited equipment stock.';garage.banner(notice,'good');return false;}return oldBuy.apply(this,a);};
    const doors=el('div',null,'qm-actions');const stock=button('Station specials',()=>{bay.show();hangarUI.open('stock');}),jobs=button('Faction commissions',showJournal);stock.id='qm-stock-door';jobs.id='qm-jobs-door';doors.append(stock,jobs);$('station-details').querySelector('summary').after(doors);
    ready=true;
  }
  window.quartermaster={JOBS,PERIOD,faction,reward,rewardName,market,buy,accept,claim,abandon,missions,stockView,journal,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,200));
})();
