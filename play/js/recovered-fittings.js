/* One salvage-to-fitting path. Physical recoveries become reusable modular
 * hardware, including their existing quirk, rather than stranded freeform parts. */
(() => {
  'use strict';
  const M=modularShips,copy=x=>JSON.parse(JSON.stringify(x));let ready=false,lootCiv=null;
  Object.assign(M.GEARS,{
    armour:{name:'Armour module',type:'pod',radius:12,power:0,cost:180,kind:'utility',description:'Utility-slot armour. +35 base hull HP.'},
    'prow-fitting':{name:'Prow fitting',type:'spike',radius:10,power:0,cost:200,kind:'utility',description:'Fits a utility slot. Recovered variants can carry retaliation traits; no bonus ram damage is promised.'},
    'drone-bay':{name:'Fighter bay',type:'bay',radius:14,power:4,cost:800,kind:'utility',description:'Launches a fighter; uses a utility slot and 4 power.'},
    'wing-dock':{name:'Escort dock',type:'wing',radius:16,power:5,cost:1200,kind:'utility',description:'An escort fitting. Uses a utility slot and 5 power.'},
    siphon:{name:'Siphon module',type:'siphon',radius:12,power:3,cost:650,kind:'utility',description:'A close-range siphon fitting. Uses a utility slot and 3 power.'}
  });
  function variant(base,quirk,rarity='rare'){
    if(!Object.hasOwn(M.GEARS,base)||!Object.hasOwn(loot.QUIRKS,quirk))return base;
    const id='recovered-'+base+'-'+quirk,g=M.GEARS[base],q=loot.QUIRKS[quirk];
    M.GEARS[id]={...g,name:(q.name||quirk)+' · '+g.name,quirk,rarity,salvageOnly:true,description:g.description+' Recovered variant only; carries '+(q.name||quirk)+'.'};return id;
  }
  for(const item of saveState.doc.modularHangar?.recoveries||[])if(item.base&&item.quirk)variant(item.base,item.quirk,item.rarity);
  function gearOf(p){
    if(p.type==='cannon'){
      if(p.weapon&&Object.hasOwn(M.GEARS,'gun-'+p.weapon))return'gun-'+p.weapon;
      const cls=fleet.mountBand(p.radius).cls,family=lootCiv?arsenal.familyOf(noviceFleet.ROWS[lootCiv]?.gun):null;
      const guns=Object.entries(M.GEARS).filter(([,g])=>g.weapon&&!g.salvageOnly&&g.cls===cls);
      return(guns.find(([,g])=>family&&arsenal.familyOf(g.weapon)===family)||guns[0])?.[0]||'gun-spitter';
    }
    const types={thruster:'engine',shield:'shield',mender:'repair',bay:'drone-bay',wing:'wing-dock',siphon:'siphon',pod:'armour',spike:'prow-fitting'};return Object.hasOwn(types,p.type)?types[p.type]:null;
  }
  function grant(p){
    const base=gearOf(p);if(!base)return null;const before=copy(saveState.doc),h=M.hangar(),id=p.quirk?variant(base,p.quirk,p.rarity):base;
    const key='gear:'+id+':1';h.owned[key]=Math.min(64,(Number(h.owned[key])||0)+1);h.recoveries=copy(saveState.doc.modularHangar?.recoveries||[]);
    if(!h.recoveries.some(i=>i.id===id))h.recoveries.push({id,base,...(p.quirk?{quirk:p.quirk,rarity:p.rarity||'rare'}:{})});
    saveState.doc.modularHangar=h;const weapon=M.GEARS[id].weapon;if(weapon){const a=armory.doc();if(!a.licenses.includes(weapon))a.licenses.push(weapon);}
    if(!saveState.save()){saveState.doc=before;return false;}
    return M.GEARS[id].name+' → modular hangar';
  }
  function stockCards(){const list=document.getElementById('salvage-list');if(!list)return;const h=M.hangar();
    for(const item of saveState.doc.modularHangar?.recoveries||[]){const g=M.GEARS[item.id],n=h.owned['gear:'+item.id+':1']||0;if(!g||!n)continue;
      const card=document.createElement('article');card.className='armory-card';if(g.weapon)card.append(topdownKit.icon(g.weapon,100,68));const title=document.createElement('h3');title.textContent=g.name+' × '+n;const note=document.createElement('p');note.textContent='Owned hardware · '+g.description;card.append(title,note);list.append(card);
    }
    const note=document.querySelector('#salvage-panel .loot-explainer');if(note)note.textContent='Recovered hardware is ready in the modular shipyard. Select a compatible slot to fit it; owned hardware is reused. Mass unlocks GP; metal pays for new fabrication.';
  }
  function install(){
    if(!window.noviceFleet?.ready||!window.frontierPve?.ready){setTimeout(install,50);return;}
    const add=saveState.addPart;saveState.addPart=function(p){return gearOf(p)?grant(p):add.apply(this,arguments);};
    const collect=progression.collectDrop;progression.collectDrop=function(drop){
      if(drop.collected)return false;if(!drop.part||!gearOf(drop.part))return collect.apply(this,arguments);
      const result=grant(drop.part);if(result===false)return false;drop.collected=true;garage.banner(result,'good');document.getElementById('btn-phone-hold')?.classList.add('new-salvage');window.modularYard?.refresh();return result;
    };
    const spawn=progression.spawnSalvage;progression.spawnSalvage=function(x,y,o){const d=spawn.apply(this,arguments);if(d?.part?.type==='cannon'&&!d.part.weapon){const id=gearOf(d.part);if(id)d.part.weapon=M.GEARS[id].weapon;}return d;};
    const kill=engine.killEnemy;engine.killEnemy=function(i,...a){const previous=lootCiv;lootCiv=this.enemies[i]?.faction||null;try{return kill.call(this,i,...a);}finally{lootCiv=previous;}};
    const open=loot.open;loot.open=function(...a){const r=open.apply(this,a);stockCards();return r;};
    ready=true;
  }
  function owns(p){return(saveState.doc.modularHangar?.recoveries||[]).some(item=>{const g=M.GEARS[item.id];return g&&g.type===p.type&&g.radius===p.radius&&g.quirk===p.quirk&&(g.rarity||'common')===(p.rarity||'common')&&(saveState.doc.modularHangar.owned['gear:'+item.id+':1']||0)>0;});}
  window.recoveredFittings={grant,gearOf,variant,owns,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,200));
})();
