/* Captain progression: paid training, a limited loadout and a journal in the existing save. */
(() => {
  'use strict';
  const TRAITS={
    battery:{name:'Battery discipline',branch:'Gunnery',text:'+6% main-gun damage, −4% thrust per rank.',mods:{damage:.06,thrust:-.04}},
    reach:{name:'Long-range focus',branch:'Gunnery',text:'+8% projectile range, −4% part durability per rank.',mods:{range:.08,parts:-.04}},
    plating:{name:'Damage control',branch:'Engineering',text:'+12% part durability, −4% thrust per rank.',mods:{parts:.12,thrust:-.04}},
    survey:{name:'Deep-water survey',branch:'Expedition',text:'+12% sight, −3% main-gun damage per rank.',mods:{sight:.12,damage:-.03}},
    salvage:{name:'Recovery field',branch:'Expedition',text:'+20% salvage reach, −4% main-gun damage per rank.',mods:{magnet:.2,damage:-.04}},
    support:{name:'Drone operator',branch:'Engineering',text:'+8% drone damage and mender healing, −4% main-gun damage per rank.',mods:{drone:.08,mender:.08,damage:-.04}},
  };
  const COST=[80,240,720],LEVEL=[2,4,6];
  const $=id=>document.getElementById(id);const journalSections=[];let overlay,previousPause=true,ready=false,tab='build',baseMagnet=220,baseMender=45,knownDoc=null;
  const doc=()=>{let d=saveState.doc.pilot;if(d&&d===knownDoc)return d;if(!d||d.v!==1)d=saveState.doc.pilot={v:1,trained:{},active:[],cores:[],claimed:[]};
    if(!d.trained||typeof d.trained!=='object')d.trained={};if(!Array.isArray(d.active))d.active=[];if(!Array.isArray(d.cores))d.cores=[];if(!Array.isArray(d.claimed))d.claimed=[];
    for(const id of Object.keys(d.trained))if(!TRAITS[id])delete d.trained[id];else d.trained[id]=Math.max(0,Math.min(3,Math.floor(Number(d.trained[id])||0)));
    d.active=[...new Set(d.active)].filter(id=>TRAITS[id]&&d.trained[id]>0);if(saveState.doc.aiCore&&!d.cores.includes(saveState.doc.aiCore))d.cores.push(saveState.doc.aiCore);knownDoc=d;return d;
  };
  const slots=()=>progression.getEvolutionData().level>=5?3:progression.getEvolutionData().level>=3?2:1;
  const pilot=window.pilotRpg={TRAITS,COST,LEVEL,get ready(){return ready;},doc,slots,
    scale(stat){const d=doc(),talent=window.captainTalents?captainTalents.scale(stat):1;if(!d.active.length)return talent;return talent*d.active.slice(0,slots()).reduce((m,id)=>m*(1+(TRAITS[id].mods[stat]||0)*d.trained[id]),1);},
    train(id){
      if(!TRAITS[id]||!hubs.docked)return false;const d=doc(),rank=d.trained[id]||0;
      if(rank>=3||progression.getEvolutionData().level<LEVEL[rank]||hubs.metal<COST[rank])return false;
      const saved=JSON.parse(JSON.stringify(d)),cash=hubs.metal,oldParts=engine.coreMod('parts');d.trained[id]=rank+1;if(!d.active.includes(id)&&d.active.length<slots())d.active.push(id);saveState.doc.metal=cash-COST[rank];
      if(!saveState.save()){saveState.doc.pilot=saved;saveState.doc.metal=cash;return false;}retuneParts(oldParts);apply();paint();return true;
    },
    equip(id){
      if(!hubs.docked||!TRAITS[id]||!doc().trained[id])return false;const d=doc(),before=d.active.slice(),has=d.active.includes(id);
      if(!has&&d.active.length>=slots())return false;
      const oldParts=engine.coreMod('parts');d.active=has?d.active.filter(x=>x!==id):[...d.active,id];
      if(!saveState.save()){d.active=before;return false;}retuneParts(oldParts);apply();paint();return true;
    },
    setCore(id){
      if(!hubs.docked||!doc().cores.includes(id)||!AI_CORES[id])return false;
      const hp=engine.player.hp/engine.player.maxHp,oldParts=engine.coreMod('parts');
      if(!saveState.setAiCore(id))return false;engine.recalculatePlayerStats();engine.player.hp=engine.player.maxHp*hp;retuneParts(oldParts);paint();return true;
    },
    claim(id){const q=quests().find(q=>q.id===id),d=doc();if(!q||!q.done||d.claimed.includes(id))return false;const cash=hubs.metal;d.claimed.push(id);saveState.doc.metal=cash+q.metal;if(!saveState.save()){d.claimed=d.claimed.filter(x=>x!==id);saveState.doc.metal=cash;return false;}paint();return true;},
    registerJournalSection(render){if(typeof render==='function'&&!journalSections.includes(render))journalSections.push(render);paint();},
    refresh(){apply();paint();},
    openJournal(){tab='journal';this.open();},
    openTalents(){tab='talents';this.open();},
    open(){if(overlay.style.display==='flex'){paint();return;}previousPause=engine.paused;engine.paused=true;engine.mouse.down=false;document.body.classList.add('captain-open');paint();overlay.style.display='flex';engine._needsRender=true;},
    close(){overlay.style.display='none';document.body.classList.remove('captain-open');engine.paused=previousPause;},
  };
  function retuneParts(old){const scale=engine.coreMod('parts')/old;for(const n of engine.player.nodes)if(n.partMax){const fraction=n.partHp/n.partMax;n.partMax*=scale;n.partHp=n.partMax*fraction;}}
  function apply(){if(typeof JUICE!=='undefined')JUICE.magnet=baseMagnet*pilot.scale('magnet');if(typeof roles!=='undefined')roles.CFG.menderHeal=baseMender*pilot.scale('mender');}
  function quests(){return[
    {id:'blueprint',name:'A ship of your own',text:'Save a blueprint containing at least one gun in My builds.',metal:40,done:Object.values(saveState.doc.workshop?.builds||{}).some(d=>d.nodes?.some(n=>n.type==='cannon'))},
    {id:'research',name:'Something worth saving for',text:'Purchase a weapon technology from the dock armoury.',metal:40,done:typeof armory!=='undefined'&&Object.keys(armory.PRICES).some(id=>armory.owns(id))},
    {id:'contract',name:'Work in the Current',text:'Complete a field contract.',metal:80,done:(saveState.doc.contracts?.done||0)>0},
    {id:'core',name:'A mind beside yours',text:'Recover and choose an AI core from a salvage drop.',metal:80,done:doc().cores.length>0},
  ];}
  const element=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
  function action(text,fn,disabled=false){const b=element('button',text);b.type='button';b.onclick=fn;b.disabled=disabled;return b;}
  function card(name,text){const el=element('article',null,'armory-card');el.append(element('h3',name),element('p',text));return el;}
  function paint(){
    if(!overlay)return;const d=doc(),level=progression.getEvolutionData(),next=progression.getNextThreshold();
    $('captain-name').textContent=saveState.profile.callsign||'Captain';
    $('captain-progress').textContent=`Captain level ${level.level} · ${Math.floor(progression.totalMass)}${next?' / '+next.mass:''} biomass · ${hubs.metal} metal`;
    for(const b of overlay.querySelectorAll('[data-captain-tab]'))b.setAttribute('aria-pressed',String(b.dataset.captainTab===tab));
    const content=$('captain-content');content.replaceChildren();
    if(tab==='build'){
      const group=element('div',null,'captain-grid'),crew=saveState.crew();group.append(card('Crew · '+(crew.name||saveState.profile.crew),[crew.feel,crew.edge].filter(Boolean).join(' ')));
      const vow=saveState.doc.vow&&vows.CHOICES[saveState.doc.vow],vowCard=card('Vow · '+(vow?.name||'Unchosen'),vow?.line||'Choose one strength with a cost.');
      vowCard.append(action('Choose vow at dock',()=>{pilot.close();vows.open();},!hubs.docked));group.append(vowCard);
      const core=saveState.doc.aiCore&&AI_CORES[saveState.doc.aiCore],coreCard=card('AI core · '+(core?.name||'None fitted'),core?[core.lore,core.up,core.down].filter(Boolean).join(' · '):'Recover AI cores from elites, outposts and guardians. One core is active.');group.append(coreCard);content.append(group);
      content.append(element('h3',`Equipped training · ${d.active.slice(0,slots()).length} / ${slots()} slots`));
      const active=element('div',null,'captain-grid');for(const id of d.active.slice(0,slots()))active.append(card(TRAITS[id].name+' · rank '+d.trained[id],TRAITS[id].text));
      if(!active.children.length)active.append(element('p','Train a perk at a dock. Equip one now, two from level 3 and three from level 5.'));content.append(active);
      if(d.cores.length){content.append(element('h3','Recovered augments'));const cores=element('div',null,'captain-grid');for(const id of d.cores)if(AI_CORES[id]){const el=card(AI_CORES[id].name,[AI_CORES[id].up,AI_CORES[id].down].join(' · '));el.append(action(saveState.doc.aiCore===id?'Active':'Equip at dock',()=>pilot.setCore(id),!hubs.docked||saveState.doc.aiCore===id));cores.append(el);}content.append(cores);}
    }else if(tab==='talents'&&window.captainTalents){
      captainTalents.render(content);
    }else if(tab==='arsenal'&&window.arsenal){arsenal.render(content);}else if(tab==='training'){
      content.append(element('p','Training is permanent. Your equipped slots are limited. Every perk has a tradeoff; swap equipped perks freely at a dock.'));
      const grid=element('div',null,'captain-grid');for(const[id,t]of Object.entries(TRAITS)){const rank=d.trained[id]||0,el=card(t.name+' · '+rank+'/3',t.branch+' · '+t.text);el.dataset.trait=id;
        const train=action(rank===3?'Fully trained':`Train ${rank+1} · ${COST[rank]} metal · level ${LEVEL[rank]}`,()=>pilot.train(id),!hubs.docked||rank>=3||level.level<LEVEL[rank]||hubs.metal<COST[rank]);train.dataset.action='train';el.append(train);
        el.append(action(d.active.includes(id)?'Unequip':`Equip · ${d.active.length}/${slots()} slots`,()=>pilot.equip(id),!hubs.docked||!rank||(!d.active.includes(id)&&d.active.length>=slots())));grid.append(el);}content.append(grid);
    }else{
      for(const render of journalSections){const section=render();if(section)content.append(section);}
      content.append(element('h3','Captain milestones'));
      const grid=element('div',null,'captain-grid');for(const q of quests()){const claimed=d.claimed.includes(q.id),el=card(q.name,q.text);el.append(action(claimed?'Reward claimed':`${q.done?'Claim':'In progress'} · ${q.metal} metal`,()=>pilot.claim(q.id),claimed||!q.done));grid.append(el);}content.append(grid);
      content.append(element('h3','Field contracts'));const labels={kills:'Defeat hostiles',outpost:'Break outposts',elite:'Defeat elites',wing:'Break hostile wings',chain:'Build a kill chain',lunge:'Catch chargers mid-lunge',painter:'Stop snipers while aiming',strip:'Strip enemy fittings'};
      for(const q of saveState.doc.contracts?.active||[])content.append(card(labels[q.kind]||q.kind,`${Math.min(q.have,q.n)} / ${q.n} · reward ${q.mass} biomass${q.parts?' and '+q.parts+' recovered fittings':''}`));
    }
  }
  function install(){
    doc();baseMagnet=typeof JUICE!=='undefined'?JUICE.magnet:220;baseMender=typeof roles!=='undefined'?roles.CFG.menderHeal:45;
    overlay=element('div',null,'menu-overlay');overlay.id='captain-panel';overlay.style.display='none';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','captain-name');
    overlay.innerHTML='<div class="menu-card armory-sheet"><header><div><span class="captain-eyebrow">CAPTAIN / BUILD & JOURNAL</span><h2 id="captain-name"></h2><p id="captain-progress"></p></div><button id="captain-close" type="button">Back</button></header><nav id="captain-tabs" aria-label="Captain views"></nav><div id="captain-content"></div></div>';
    for(const[id,name]of[['build','Build'],['talents','Talents'],['arsenal','Arsenal'],['training','Training'],['journal','Journal']]){const b=action(name,()=>{tab=id;paint();});b.dataset.captainTab=id;overlay.querySelector('#captain-tabs').append(b);}
    overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(overlay);$('captain-close').onclick=()=>pilot.close();
    for(const host of[document.querySelector('#pause-menu .tm-doors'),document.querySelector('#dock-panel .dock-doors')])if(host){const b=action('Captain / build',()=>pilot.open());b.className='tm-door';host.append(b);}
    const damage=hardpoints.damageScale.bind(hardpoints);hardpoints.damageScale=p=>damage(p)*(p===engine.player?pilot.scale('damage'):1);
    const core=engine.coreMod.bind(engine);engine.coreMod=stat=>core(stat)*pilot.scale(stat);
    const update=Projectile.prototype.update;Projectile.prototype.update=function(...args){const first=!this._pilotTuned,r=update.apply(this,args);if(first&&this.isPlayer){this._pilotTuned=true;this.life=Math.max(0,Math.round((this.life+1)*pilot.scale('range'))-1);}return r;};
    const drone=MitosisDrone.prototype.update;MitosisDrone.prototype.update=function(projectiles,...args){const count=projectiles.length,r=drone.call(this,projectiles,...args);for(let i=count;i<projectiles.length;i++)projectiles[i].damage*=pilot.scale('drone');return r;};
    const setCore=saveState.setAiCore.bind(saveState);saveState.setAiCore=id=>{if(!AI_CORES[id])return false;const d=doc(),before=d.cores.slice(),old=saveState.doc.aiCore;if(!d.cores.includes(id))d.cores.push(id);const r=setCore(id);if(!r){d.cores=before;saveState.doc.aiCore=old;}return r;};
    const tag=document.querySelector('.tm-tag');if(tag)tag.textContent='Build your ship. Train your captain. Bring something worth keeping out of the dark.';
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&overlay.style.display==='flex'){e.preventDefault();e.stopImmediatePropagation();pilot.close();}},true);apply();ready=true;
  }
  window.addEventListener('load',()=>setTimeout(install,0));
})();
