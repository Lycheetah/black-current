/* Captain talents: combat XP earns ranks, ranks earn points, points buy nodes in three
 * trees. Stat nodes feed pilotRpg.scale (the one stat path); tier-three keystones unlock
 * active abilities. Lives as the Talents tab of the Captain panel. */
(() => {
  'use strict';
  const TREES={
    gunnery:{name:'Gunnery',tint:'#f2a65e',nodes:[
      {id:'steady',tier:1,max:3,name:'Steady hands',text:'+4% main-gun damage per rank.',mods:{damage:.04}},
      {id:'barrels',tier:1,max:2,name:'Long barrels',text:'+6% projectile range per rank.',mods:{range:.06}},
      {id:'hotloads',tier:2,max:2,name:'Hot loads',text:'+6% main-gun damage per rank.',mods:{damage:.06}},
      {id:'marksman',tier:2,max:1,name:'Marksman',text:'+10% range and +4% damage.',mods:{range:.1,damage:.04}},
      {id:'overcharge',tier:3,max:1,name:'Overcharge',text:'Ability · R. Guns run hot: +50% damage for 5 s. 22 s cooldown.',ability:'overcharge'}]},
    engineering:{name:'Engineering',tint:'#86ded0',nodes:[
      {id:'joints',tier:1,max:3,name:'Reinforced joints',text:'+8% part durability per rank.',mods:{parts:.08}},
      {id:'medic',tier:1,max:2,name:'Field medic',text:'+10% mender healing per rank.',mods:{mender:.1}},
      {id:'drones',tier:2,max:2,name:'Drone tuning',text:'+10% drone damage per rank.',mods:{drone:.1}},
      {id:'bracing',tier:2,max:2,name:'Hull bracing',text:'+6% hull HP per rank.',mods:{hull:.06}},
      {id:'emp',tier:3,max:1,name:'EMP pulse',text:'Ability · F. A shock ring hits every hostile within reach for 60. 18 s cooldown.',ability:'emp'}]},
    expedition:{name:'Expedition',tint:'#9ec8ff',nodes:[
      {id:'drives',tier:1,max:3,name:'Trimmed drives',text:'+4% thrust per rank.',mods:{thrust:.04}},
      {id:'sensors',tier:1,max:2,name:'Wide sensors',text:'+10% sight per rank.',mods:{sight:.1}},
      {id:'tractor',tier:2,max:2,name:'Tractor field',text:'+15% salvage reach per rank.',mods:{magnet:.15}},
      {id:'survey',tier:2,max:2,name:'Combat survey',text:'+15% combat XP per rank.',mods:{xp:.15}},
      {id:'burn',tier:3,max:1,name:'Afterburner',text:'Ability · C. Drives flare to 190% thrust for 3 s. 12 s cooldown.',ability:'burn'}]},
  };
  const GATE={1:0,2:2,3:4};
  const ABILITIES={
    overcharge:{name:'Overcharge',short:'Charge',key:'KeyR',label:'R',time:5000,cool:22000,tint:'#f2a65e'},
    emp:{name:'EMP',key:'KeyF',label:'F',time:0,cool:18000,tint:'#86ded0'},
    burn:{name:'Burn',key:'KeyC',label:'C',time:3000,cool:12000,tint:'#9ec8ff'},
  };
  const NODES={};for(const[tree,t]of Object.entries(TREES))for(const n of t.nodes)NODES[n.id]={...n,tree};
  const until={},ready={};let bar=null;
  const copy=x=>JSON.parse(JSON.stringify(x));
  function doc(){let d=saveState.doc.talents;if(!d||d.v!==1)d=saveState.doc.talents={v:1,xp:0,spent:{}};
    if(!Number.isFinite(d.xp)||d.xp<0)d.xp=0;if(!d.spent||typeof d.spent!=='object')d.spent={};
    for(const id of Object.keys(d.spent))if(!Object.hasOwn(NODES,id))delete d.spent[id];else d.spent[id]=Math.max(0,Math.min(NODES[id].max,Math.floor(Number(d.spent[id])||0)));return d;}
  // Rank r needs 80·r more XP than rank r−1; rank 1 is free so the first point lands at once.
  function rankOf(xp){let r=1,need=80;while(xp>=need){xp-=need;r++;need=80*r;}return{rank:r,into:xp,need};}
  const spentTotal=()=>Object.values(doc().spent).reduce((a,b)=>a+b,0);
  const points=()=>rankOf(doc().xp).rank-spentTotal();
  const inTree=tree=>TREES[tree].nodes.reduce((n,x)=>n+(doc().spent[x.id]||0),0);
  const has=ability=>Object.values(NODES).some(n=>n.ability===ability&&doc().spent[n.id]>0);
  function lockReason(id){const n=NODES[id],r=doc().spent[id]||0;if(r>=n.max)return'Mastered';if(inTree(n.tree)<GATE[n.tier])return`Needs ${GATE[n.tier]} points in ${TREES[n.tree].name}`;if(points()<1)return'No talent points · earn combat XP';return null;}
  function scale(stat){
    let m=1;const d=doc();for(const[id,r]of Object.entries(d.spent)){const v=NODES[id]?.mods?.[stat];if(v&&r)m*=1+v*r;}
    const now=performance.now();if(stat==='damage'&&until.overcharge>now)m*=1.5;if(stat==='thrust'&&until.burn>now)m*=1.9;return m;
  }
  // Part and hull numbers are baked into nodes, so a change re-derives them proportionally.
  function retune(change){const oldParts=engine.coreMod('parts'),hp=engine.player.hp/Math.max(1,engine.player.maxHp);const ok=change();if(!ok)return false;
    const k=engine.coreMod('parts')/oldParts;for(const n of engine.player.nodes)if(n.partMax){const f=n.partHp/n.partMax;n.partMax*=k;n.partHp=n.partMax*f;}
    engine.recalculatePlayerStats();engine.player.hp=engine.player.maxHp*hp;pilotRpg.refresh();paintBar();return true;}
  function commit(mutate){const before=copy(doc());mutate(doc());if(!saveState.save()){saveState.doc.talents=before;return false;}return true;}
  function learn(id){if(!Object.hasOwn(NODES,id)||lockReason(id))return false;return retune(()=>commit(d=>{d.spent[id]=(d.spent[id]||0)+1;}));}
  function reset(){if(!hubs.docked||!spentTotal())return false;return retune(()=>commit(d=>{d.spent={};}));}
  function gain(xp){const before=rankOf(doc().xp).rank,d=doc();d.xp+=Math.max(0,Math.round(xp*scale('xp')));const after=rankOf(d.xp).rank;
    if(after>before){saveState.save();window.garage?.banner(`COMBAT RANK ${after} · talent point earned · Captain → Talents`,'good');try{soundEngine.playEvolutionFanfare();}catch{}}}
  function burst(x,y,c,n){try{particleSystem.spawnBubbleBurst(x,y,c,n);}catch{}}
  function use(id){
    const a=ABILITIES[id],now=performance.now(),p=engine.player;if(!a||!has(id)||engine.paused||engine.mapOpen||hubs.docked||(ready[id]||0)>now||!p||p.hp<=0)return false;
    ready[id]=now+a.cool;if(a.time)until[id]=now+a.time;try{soundEngine.playAbility(id==='emp'?'shield':'dash');}catch{}
    if(id==='emp'){const reach=340;for(let i=0;i<14;i++){const t=i/14*Math.PI*2;burst(p.x+Math.cos(t)*reach*.6,p.y+Math.sin(t)*reach*.6,a.tint,4);}
      for(let j=engine.enemies.length-1;j>=0;j--){const e=engine.enemies[j];if(!e||Math.hypot(e.x-p.x,e.y-p.y)>reach+(e.coreRadius||0))continue;e.takeDamage(60);burst(e.x,e.y,a.tint,10);if(e.hp<=0)engine.killEnemy(j);}}
    else burst(p.x,p.y,a.tint,26);
    paintBar();return true;
  }
  function paintBar(){
    if(!bar)return;const now=performance.now(),show=saveState.doc.launched&&!hubs.docked&&!engine.paused;bar.hidden=!show||!Object.keys(ABILITIES).some(has);if(bar.hidden)return;
    for(const[id,a]of Object.entries(ABILITIES)){const b=bar.querySelector(`[data-ability="${id}"]`);b.hidden=!has(id);if(b.hidden)continue;
      const left=Math.max(0,(ready[id]||0)-now),on=(until[id]||0)>now;b.classList.toggle('on',on);b.disabled=left>0&&!on;b.style.setProperty('--cd',String(left/a.cool));
      const t=b.querySelector('small'),text=on?'ACTIVE':left>0?Math.ceil(left/1000)+'s':a.label;if(t.textContent!==text)t.textContent=text;}
  }
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  function render(content){
    const d=doc(),r=rankOf(d.xp),head=el('div',null,'talent-head');
    head.append(el('strong',`Combat rank ${r.rank}`),el('span',`${Math.floor(r.into)} / ${r.need} XP to next`),el('span',`${points()} talent point${points()===1?'':'s'}`,'talent-points'));
    const meter=el('div',null,'talent-meter');meter.style.setProperty('--fill',String(r.into/r.need));head.append(meter);
    const rs=el('button',hubs.docked?'Reset talents · free at dock':'Reset at a dock');rs.type='button';rs.disabled=!hubs.docked||!spentTotal();rs.onclick=()=>{if(reset())pilotRpg.refresh();};head.append(rs);
    content.append(head,el('p','Kills earn combat XP. Each rank is one talent point. Deeper tiers open as you invest in a tree; the third tier is an active ability.','talent-intro'));
    const grid=el('div',null,'talent-trees');
    for(const[tree,t]of Object.entries(TREES)){const col=el('section',null,'talent-tree');col.style.setProperty('--tint',t.tint);col.append(el('h3',`${t.name} · ${inTree(tree)}`));
      for(const tier of[1,2,3]){const row=el('div',null,'talent-tier');row.dataset.tier=tier;
        for(const n of t.nodes.filter(n=>n.tier===tier)){const rank=d.spent[n.id]||0,why=lockReason(n.id),card=el('article',null,'talent-node'+(n.ability?' ability':'')+(rank?' owned':''));card.dataset.talent=n.id;
          card.append(el('strong',n.name),el('small',`${rank} / ${n.max}`),el('p',n.text));const b=el('button',why||'Learn · 1 point');b.type='button';b.disabled=!!why;b.onclick=()=>{if(learn(n.id))pilotRpg.refresh();};card.append(b);row.append(card);}
        col.append(row);}
      grid.append(col);}
    content.append(grid);
  }
  function install(){
    if(typeof pilotRpg==='undefined'||!pilotRpg.ready||!engine.player){setTimeout(install,60);return;}
    doc();
    const kill=engine.killEnemy.bind(engine);engine.killEnemy=i=>{const e=engine.enemies[i];const r=kill(i);if(e&&!e._talentXp){e._talentXp=true;gain(6+(e.maxHp||40)/15);}return r;};
    bar=el('div',null,'ability-bar');bar.id='ability-bar';bar.hidden=true;
    for(const[id,a]of Object.entries(ABILITIES)){const b=el('button',null,'ability-btn');b.type='button';b.dataset.ability=id;b.style.setProperty('--tint',a.tint);b.setAttribute('aria-label',`${a.name} (${a.label})`);b.append(el('span',a.short||a.name),el('small',a.label));
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();use(id);});bar.append(b);}
    bar.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});document.body.append(bar);
    document.addEventListener('keydown',e=>{if(e.repeat||e.target.matches?.('input,textarea,select'))return;for(const[id,a]of Object.entries(ABILITIES))if(e.code===a.key&&has(id)){if(use(id))e.preventDefault();}});
    setInterval(paintBar,150);
    if(spentTotal()){engine.recalculatePlayerStats();pilotRpg.refresh();}
    window.captainTalents.ready=true;
  }
  window.captainTalents={TREES,NODES,ABILITIES,doc,rankOf,points,scale,learn,reset,gain,use,render,lockReason,ready:false};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
