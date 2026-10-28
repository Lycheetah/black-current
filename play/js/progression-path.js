/* One readable investment ladder over the native prices, hold and training.
 * No second wallet, unlock tree or purchase transaction. Ordinary first guns
 * remain accessible; danger and weapon size carry the later economy. */
(() => {
  'use strict';
  const CLASS_PRICE={LIGHT:48,MEDIUM:360,HEAVY:2200,SIEGE:9800,CAPITAL:99000};
  const ARCH_PRICE={cannon:1,repeater:1.05,scatter:1.1,stream:1.05,driver:1.2,rifle:1.35,bolt:1,pulse:1.1,lance:1.4,seeker:1.2,rocket:1.1,torpedo:1.3,mortar:1.1,flak:1.15,shell:1.25};
  const BOUNTY=[0,1,2,3,6,12,22,36,54,78,110];
  const ORDER=['frigate','cruiser','battleship','capital','supercapital','titan'];
  const $=id=>document.getElementById(id),number=n=>Math.round(n).toLocaleString();
  let ready=false;
  function bountyFor(e){
    const tier=Number(e?.tier),i=Number.isFinite(tier)?Math.max(1,Math.min(10,Math.floor(tier))):1,base=BOUNTY[i];
    if(e?.training)return 0;
    return e?.isBoss?Math.max(120,base*30):e?.archetype==='outpost'?Math.max(36,base*10):base*(e?.elite?3:1);
  }
  function milestone(id){
    const M=modularShips,h=M.HULLS[id];if(!h)return null;
    const hang=M.hangar(),training=M.RANK_COST.slice(hang.rank,h.rank).reduce((a,b)=>a+b,0),frame=hang.owned['hull:'+id]?0:h.cost,total=training+frame;
    return{id,...h,training,frame,total,remainingMetal:Math.max(0,total-hubs.metal),remainingMass:Math.max(0,h.mass-progression.totalMass),rank:hang.rank,requiredRank:h.rank,frameOwned:frame===0};
  }
  function suggestions(){
    const M=modularShips,gears=Object.entries(M.GEARS).filter(([,g])=>g.weapon&&!g.salvageOnly&&!upgradePath.needsResearch(g.weapon));
    const have=id=>equipmentCodex.owned('gear',id)>0;
    const novice=gears.filter(([id,g])=>g.cls==='POINT'&&g.cost<=16&&!have(id)).sort((a,b)=>a[1].cost-b[1].cost)[0];
    const weapons=engine.player.nodes.filter(n=>n.type==='cannon'&&!n.lost),family=weapons.length?arsenal.familyOf(fleet.weaponFor(weapons[0])):null;
    const light=gears.filter(([id,g])=>g.cls==='LIGHT'&&!have(id)).sort((a,b)=>(arsenal.familyOf(b[1].weapon)===family)-(arsenal.familyOf(a[1].weapon)===family)||a[1].cost-b[1].cost)[0];
    const ids=[novice?.[0],!have('shield')?'shield':!have('repair')?'repair':null,light?.[0]].filter(Boolean);
    return ids.map(id=>({id,...M.GEARS[id],affordable:hubs.metal>=M.GEARS[id].cost}));
  }
  function planFrame(id){
    const source=saveState.doc.design,from=ORDER.indexOf(source?.modular?.hull),to=ORDER.indexOf(id);
    if(from<0||to!==from+1)return false;
    try{
      const design=modularShips.copy(source);design.modular.hull=id;
      const compiled=modularShips.compile(design).design;
      hangarUI.close();shipyard.edit(()=>{shipyard.design=compiled;shipyard.syncFields();});shipyard.saveDraft();modularYard.refresh();
      return true;
    }catch(e){garage.banner('Cannot plan this frame: '+e.message,'bad');return false;}
  }
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function action(label,id,run){const b=el('button',label);b.type='button';if(id)b.id=id;b.onclick=run;return b;}
  function render(){
    const root=el('section',undefined,'progression-path');root.id='progression-path';
    root.append(el('p','Fight → recover → fit → choose a harder sector','path-loop'));
    const wallet=el('div',undefined,'path-wallet');wallet.append(el('strong','⬡ '+number(hubs.metal)+' Metal'),el('strong','♆ '+number(progression.totalMass)+' Biomass'));root.append(wallet);
    const model=shipyard.design?.modular;
    if(model?.sections.some(s=>s.kind==='novice')){
      const mount=el('section',undefined,'path-hull');mount.id='path-light-mount';
      const light=Object.values(modularShips.GEARS).filter(g=>g.cls==='LIGHT'&&!g.salvageOnly).sort((a,b)=>a.cost-b.cost)[0],cost=modularShips.SECTIONS.deck.cost;
      mount.append(el('h3','Novice → Light · upgrade a weapon mount'),el('p','Your supplied Novice decks fit Novice guns only. A Light deck keeps the same placement and accepts the next gun class.'),el('strong','New Light deck '+cost+' + gun from '+light.cost+' = '+(cost+light.cost)+' metal'),el('small','Owned hardware reduces the bill. No research or new hull required. Preview is free; Apply buys at a station.'));
      const upgrade=action('Preview a Light mount','path-plan-light',()=>hangarUI.planLightMount());upgrade.disabled=!!window.starterJourney?.active;mount.append(upgrade);root.append(mount);
    }
    root.append(el('h3','Next fitting choices'));
    const choices=el('div',undefined,'path-choices');
    for(const g of suggestions()){
      const card=action('',null,()=>hangarUI.browseItem(g.id));card.dataset.pathGear=g.id;
      if(g.weapon)card.append(topdownKit.icon(g.weapon,90,52));else card.append(topdownKit.thumb({sections:[{id:'c',kind:'utility',x:0,y:0}],fittings:[{slot:'c',gear:g.id,mk:1}]},90,52,engine.player.color));
      card.append(el('strong',g.name),el('span',g.weapon?(g.cls==='POINT'?'Novice':g.cls)+' · '+Math.round(arsenal.dps(g.weapon))+' base DPS':g.id==='shield'?'+30 shield · 12/s recharge':'Repairs damaged hull'),el('b',number(g.cost)+' metal'),el('small',g.affordable?(hubs.docked?'View in shop':'Buy at a station'):number(g.cost-hubs.metal)+' more metal'));
      choices.append(card);
    }
    if(!choices.children.length)choices.append(el('p','Your ordinary fitting choices are owned. Explore faction commissions and station specials for variants.'));
    root.append(choices);
    const current=saveState.doc.design?.modular?.hull||'frigate',index=Math.max(0,ORDER.indexOf(current)),next=ORDER[index+1];
    if(next){
      const goal=milestone(next),box=el('section',undefined,'path-hull');box.dataset.pathHull=next;
      const heading=el('div',undefined,'path-hull-title');heading.append(el('h3','Next frame · '+goal.cls),el('span',goal.sections+' sections · '+goal.slots+' base slots · '+goal.power+' power'+(goal.hullHp?' · +'+number(goal.hullHp)+' hull HP':'')));box.append(heading);
      const costs=el('dl',undefined,'path-costs');
      for(const [label,value]of[['Frame',goal.frameOwned?'Owned':number(goal.frame)+' metal'],['Training',goal.training?number(goal.training)+' metal to rank '+goal.requiredRank:'Required rank reached'],['Biomass',number(progression.totalMass)+' / '+number(goal.mass)]]){const row=el('div');row.append(el('dt',label),el('dd',value));costs.append(row);}box.append(costs);
      const meter=el('progress');meter.max=Math.max(1,goal.mass);meter.value=Math.min(goal.mass,progression.totalMass);meter.setAttribute('aria-label','Biomass towards '+goal.cls);box.append(meter);
      box.append(el('p',goal.remainingMetal?number(goal.remainingMetal)+' more metal for frame + training':goal.remainingMass?'Metal ready · '+number(goal.remainingMass)+' more biomass needed':'Frame and training budget ready', 'path-remaining'));
      box.append(el('small','Frame + training: '+number(goal.total)+' metal total. Biomass is kept. Parts and fittings cost extra. Plan keeps your layout; Apply pays.'));
      const buttons=el('div',undefined,'path-actions');buttons.append(action('Plan '+next+' upgrade','path-plan-frame',()=>planFrame(next)),action('Train Shipwright','path-training',()=>hangarUI.open('training')));box.append(buttons);root.append(box);
    }else root.append(el('p','Titan frame reached. Improve your loadout and hunt capital-grade equipment.','path-remaining'));
    const note=el('details',undefined,'path-help');note.append(el('summary','Where do rewards come from?'),el('p','Ordinary kills pay metal; collect biomass from wrecks. Complete a faction commission for its named fitting. Training targets pay just 1 metal per 10 and drop no equipment. Fixed outer bands:1–2 patrols,3–4 cruisers,5–6 battleships,7–8 capitals,9–10 supercapitals and titans. Check sector danger before travelling. Better guns require larger mounts and enough power. Owned hardware can be refitted in the field; buy new hardware at stations.'));root.append(note);
    return root;
  }
  function install(){
    if(!window.quartermaster?.ready||!window.equipmentCodex?.ready){setTimeout(install,50);return;}
    modularShips.HULLS.cruiser.cost=600;
    modularShips.RANK_COST.splice(0,3,120,1800,7200);
    for(const g of Object.values(modularShips.GEARS)){
      if(!g.weapon||g.salvageOnly||!CLASS_PRICE[g.cls])continue;
      const model=arsenal.GUNS[g.weapon],factor=ARCH_PRICE[model?.arch]||1;
      g.cost=Math.round(CLASS_PRICE[g.cls]*factor/2)*2;
    }
    Object.assign(upgradePath,{CLASS_PRICE,BOUNTY,bountyFor,milestone,suggestions,planFrame,render});
    ready=true;upgradePath.ready=true;window.modularYard?.refresh();
  }
  // Register the bounty function immediately; no timing-dependent fallback
  // payout after launch. Prices install after recovery registries are complete.
  Object.assign(upgradePath,{bountyFor});
  window.addEventListener('load',()=>setTimeout(install,120));
})();
