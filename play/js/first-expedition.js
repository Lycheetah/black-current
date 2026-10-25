/* A first authored expedition: dock dialogue, guarded recovery, cargo and a chosen reward. */
(() => {
  'use strict';
  const homeSys=()=>(saveState.doc&&saveState.doc.civHome)||'home';   // a civilisation start (js/civilisations.js) runs the first job from its own home
  const TARGET={get sys(){return homeSys();},gx:1,gy:0,x:520,y:-240};
  const HOME={get sys(){return homeSys();},gx:0,gy:0,x:0,y:0};
  const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  let known=null,button,contact,tracker,ready=false,clock=0,askedAboutPay=false;
  function state(){
    let d=saveState.doc.firstExpedition;if(d===known&&d)return d;
    if(!d||d.v!==1)d=saveState.doc.firstExpedition={v:1,stage:'offer',guards:[false,false],reward:null};
    if(!['offer','recover','return','done'].includes(d.stage))d.stage='offer';
    d.guards=[!!d.guards?.[0],!!d.guards?.[1]];known=d;return d;
  }
  const system=()=>typeof galaxy!=='undefined'?galaxy.currentId:'home';
  const inSector=target=>{const ch=worldMap.getCurrentChamber();return system()===target.sys&&ch.gridX===target.gx&&ch.gridY===target.gy;};
  const homeDock=()=>!!hubs.docked&&inSector(HOME);
  const nearRecorder=()=>inSector(TARGET)&&Math.hypot(engine.player.x-TARGET.x,engine.player.y-TARGET.y)<=155;
  const dangerNearRecorder=()=>engine.enemies.some(e=>e.hp>0&&Math.hypot(e.x-TARGET.x,e.y-TARGET.y)<240);
  const story=window.firstExpedition={TARGET,HOME,state,get ready(){return ready;},get carrying(){return state().stage==='return';},
    accept(){
      const d=state();if(d.stage!=='offer'||!homeDock())return false;
      const before=copy(d);d.stage='recover';d.guards=[false,false];
      if(!saveState.save()){saveState.doc.firstExpedition=before;return false;}
      refresh();garage.banner('FIRST EXPEDITION · recorder marked in home sector 1,0','good');return true;
    },
    recover(){
      const d=state();if(d.stage!=='recover'||engine.paused||engine.mapOpen||engine.player.dead||!nearRecorder()||!d.guards.every(Boolean)||dangerNearRecorder())return false;
      const before=copy(d);d.stage='return';
      if(!saveState.save()){saveState.doc.firstExpedition=before;return false;}
      refresh();button.hidden=true;garage.banner('RECORDER ABOARD · return to the home dock','good');soundEngine.voice?.('pickup');return true;
    },
    chooseReward(choice){
      const d=state();if(d.stage!=='return'||!homeDock()||!['burst','support'].includes(choice))return false;
      const old={quest:copy(d),armory:copy(armory.doc()),pilot:copy(pilotRpg.doc()),hangar:copy(modularShips.hangar()),metal:hubs.metal};
      let description;
      if(choice==='burst'){
        const h=modularShips.hangar(),key='gear:gun-burst:1';h.owned[key]=Math.min(64,(h.owned[key]||0)+1);saveState.doc.modularHangar=h;description='Three-round pulse gun delivered to your hold. Fit it to a light weapon deck anywhere.';
      }else{
        const p=pilotRpg.doc();
        if((p.trained.support||0)>=1){saveState.doc.metal=old.metal+40;description='40 metal: Drone operator I was already trained.';}
        else{p.trained.support=1;if(!p.active.includes('support')&&p.active.length<pilotRpg.slots())p.active.push('support');description='Drone operator I learned. Equip a drone bay in the Shipyard.';}
      }
      d.stage='done';d.reward=choice;d.rewardText=description;
      if(!saveState.save()){
        saveState.doc.firstExpedition=old.quest;saveState.doc.armory=old.armory;saveState.doc.pilot=old.pilot;saveState.doc.modularHangar=old.hangar;saveState.doc.metal=old.metal;pilotRpg.refresh();refresh();return false;
      }
      pilotRpg.refresh();refresh();garage.banner('EXPEDITION COMPLETE · '+description,'good');soundEngine.playEvolutionFanfare();return true;
    },
    openChart(){
      pilotRpg.close();if(hubs.docked)hubs.closeDock();if(typeof menu!=='undefined'&&menu.isPaused())menu.resume();engine.paused=false;
      if(!engine.mapOpen)engine.toggleMapModal();else worldMap.renderMatrixGridModal();
      document.querySelector('#chart-tabs button:not(#chart-tab-galaxy)')?.click();
      worldMap.renderMatrixGridModal();
    },
    spawnGuards(){
      const d=state();if(d.stage!=='recover'||!inSector(TARGET))return;
      for(let i=0;i<2;i++)if(!d.guards[i]&&!engine.enemies.some(e=>e.firstExpeditionGuard===i)&&engine.enemies.length<30){
        const e=new EnemyOrganism(TARGET.x+(i?160:-160),TARGET.y+(i?90:-90),{tier:1,archetype:i?'stalker':'mote'});
        e.firstExpeditionGuard=i;e._aggro=false;engine.enemies.push(e);
      }
    },
  };
  const text=(tag,content,cls)=>{const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e;};
  function action(label,id,fn,disabled=false){const b=text('button',label);b.type='button';b.id=id;b.disabled=disabled;b.onclick=fn;return b;}
  function journal(){
    const d=state(),section=document.createElement('section');section.id='first-expedition-journal';section.className='story-card';
    section.append(text('span','MAIN QUEST · FIRST EXPEDITION','story-eyebrow'),text('h3',d.stage==='done'?'Recorder delivered':'The silent recorder'));
    if(d.stage==='offer'){
      section.append(text('p','Dockkeeper: “A survey recorder stopped answering in the next sector. Two scavengers are circling it. Bring it home and I can give you a pulse gun or arrange support training.”'));
      if(askedAboutPay)section.append(text('p','Choose one reward on return: three-round pulse technology or Drone operator I. If your chosen reward is already owned, receive 40 metal instead.'));
      const row=document.createElement('div');row.className='story-actions';
      row.append(action('Take the job','story-accept',()=>story.accept(),!homeDock()),action('Ask about the reward','story-ask-pay',()=>{askedAboutPay=!askedAboutPay;pilotRpg.refresh();}));section.append(row);
      if(!homeDock())section.append(text('p','Visit the home dock to speak to the dockkeeper.'));
    }else if(d.stage==='recover'){
      section.append(text('p',`Travel to home-system sector 1,0. Follow the gold recorder signal. Guards cleared: ${d.guards.filter(Boolean).length} / 2.`),text('p','Clear the hulls around the recorder, then approach and recover it. The ★ on the sector chart marks your destination.'));
      section.append(action('Show sector chart','story-show-chart',()=>story.openChart()));
    }else if(d.stage==='return'){
      section.append(text('p','The recorder is secured in your hold. Bring it to the home dock in sector 0,0.'),text('p','Dockkeeper: “You brought the whole recorder back. Choose what helps your next build.”'));
      const row=document.createElement('div');row.className='story-actions';
      row.append(action('Take pulse gun','story-reward-burst',()=>story.chooseReward('burst'),!homeDock()),action('Choose support training','story-reward-support',()=>story.chooseReward('support'),!homeDock()));section.append(row);
      if(!homeDock())section.append(action('Show return route','story-show-chart',()=>story.openChart()));
    }else{
      section.append(text('p',d.rewardText||'The recorder is home and your reward is recorded.'),text('p','Dockkeeper: “The field contract board is still taking relay and salvage work. Invest in your next fitting before you push deeper.”'));
    }
    return section;
  }
  function refresh(){
    if(!ready)return;
    const d=state();
    if(contact){contact.querySelector('p').textContent=d.stage==='offer'?'Dockkeeper · a recovery job is available.':d.stage==='return'?'Dockkeeper · your recorder is ready to hand in.':d.stage==='done'?'Dockkeeper · expedition complete.':'Dockkeeper · recorder recovery is in progress.';}
    ensureTracker();pilotRpg.refresh();engine._needsRender=true;
  }
  function ensureTracker(){
    const host=$('contracts');if(!host)return;
    if(!tracker||!host.contains(tracker)){
      tracker=document.createElement('section');tracker.id='story-contract';
      tracker.append(text('strong','First expedition'),text('p',''),action('Open quest journal','story-open-journal',()=>pilotRpg.openJournal()));host.prepend(tracker);
    }
    const d=state();tracker.hidden=d.stage==='done';
    tracker.querySelector('p').textContent=d.stage==='offer'?'Talk to the home dockkeeper.':d.stage==='recover'?`Recorder · sector 1,0 · ${d.guards.filter(Boolean).length}/2 guards cleared`:'Recorder aboard · return home, sector 0,0';
  }
  function tick(){
    const d=state();clock++;if(clock%60===0)story.spawnGuards();
    const show=d.stage==='recover'&&nearRecorder()&&!engine.player.dead;button.hidden=!show;
    if(show){const blocked=!d.guards.every(Boolean)||dangerNearRecorder();button.disabled=blocked;const label=blocked?'Clear the recorder’s guards':'Recover survey recorder';if(button.textContent!==label)button.textContent=label;const other=$('expedition-action');if(other)other.hidden=true;}
  }
  function draw(ctx,camera){
    const d=state();if(!['recover','return'].includes(d.stage))return;
    const z=engine.camera.zoom||1,p=engine.player,target=d.stage==='recover'?TARGET:HOME,ch=worldMap.getCurrentChamber();
    if(d.stage==='recover'&&inSector(TARGET)){
      const x=TARGET.x-camera.x,y=TARGET.y-camera.y;
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#102531';ctx.strokeStyle='#e8c478';ctx.lineWidth=2/z;
      ctx.fillRect(-28,-16,56,32);ctx.strokeRect(-28,-16,56,32);ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(0,-44);ctx.moveTo(-18,-32);ctx.lineTo(18,-32);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,43+Math.sin(performance.now()/550)*4,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#eddbab';ctx.textAlign='center';ctx.font=`${11/z}px system-ui`;ctx.fillText('SURVEY RECORDER',0,-55);ctx.restore();
    }
    if(d.stage==='return'){
      const a=(p.angle||0)+Math.PI,x=p.x+Math.cos(a)*65-camera.x,y=p.y+Math.sin(a)*65-camera.y;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#bda363';ctx.strokeStyle='#fff0c8';ctx.lineWidth=1/z;ctx.fillRect(-9,-9,18,18);ctx.strokeRect(-9,-9,18,18);ctx.restore();
    }
    if(system()!==target.sys)return;
    const R=ch.radius||2600,wx=(target.gx-ch.gridX)*R*2+target.x,wy=(target.gy-ch.gridY)*R*2+target.y;
    const sx=(wx-camera.x)*z,sy=(wy-camera.y)*z,w=engine.viewportWidth,h=engine.viewportHeight;
    if(sx>=20&&sx<w-20&&sy>=120&&sy<h-230)return;
    const bx=Math.max(28,Math.min(w-28,sx))/z,by=Math.max(140,Math.min(Math.max(145,h-245),sy))/z;
    ctx.save();ctx.fillStyle='#edc273';ctx.beginPath();ctx.moveTo(bx,by-8/z);ctx.lineTo(bx+7/z,by);ctx.lineTo(bx,by+8/z);ctx.lineTo(bx-7/z,by);ctx.closePath();ctx.fill();ctx.font=`${9/z}px system-ui`;ctx.textAlign='center';ctx.fillText('QUEST',bx,by+20/z);ctx.restore();
  }
  function decorateChart(){
    const d=state(),target=d.stage==='recover'?TARGET:d.stage==='return'?HOME:null;
    for(const cell of document.querySelectorAll('#matrix-grid-container .sector-cell')){
      const match=!!target&&system()===target.sys&&cell.querySelector('.sec-coords')?.textContent===`${target.gx},${target.gy}`;
      if(cell.classList.contains('story-target')!==match)cell.classList.toggle('story-target',match);
      if(match&&!cell.querySelector('.story-star')){cell.append(text('span','★','story-star'));cell.title+=' · tracked expedition';}
      if(!match)cell.querySelector('.story-star')?.remove();
    }
  }
  function install(){
    state();button=action('Recover survey recorder','story-action',e=>{e.stopPropagation();story.recover();});button.hidden=true;
    for(const event of['touchstart','mousedown'])button.addEventListener(event,e=>e.stopPropagation(),{passive:true});document.body.append(button);
    contact=document.createElement('section');contact.id='dock-story-contact';contact.append(text('p','Dockkeeper · a recovery job is available.'),action('Talk to dockkeeper','dock-story-talk',()=>pilotRpg.openJournal()));
    const dock=$('dock-panel');dock.querySelector('.dock-cols').before(contact);
    pilotRpg.registerJournalSection(journal);
    const enter=engine.enterChamber.bind(engine);engine.enterChamber=(...args)=>{const r=enter(...args);story.spawnGuards();refresh();return r;};
    const kill=engine.killEnemy.bind(engine);engine.killEnemy=i=>{const e=engine.enemies[i],guard=e?.firstExpeditionGuard,r=kill(i);if(state().stage==='recover'&&inSector(TARGET)&&(guard===0||guard===1)){state().guards[guard]=true;saveState.save();refresh();}return r;};
    const update=engine.update.bind(engine);engine.update=dt=>{const r=update(dt);if(!engine.paused&&!engine.mapOpen&&!document.hidden)tick();else button.hidden=true;return r;};
    const paint=particleSystem.draw.bind(particleSystem);particleSystem.draw=(ctx,camera)=>{paint(ctx,camera);draw(ctx,camera);};
    const chart=worldMap.renderMatrixGridModal.bind(worldMap);worldMap.renderMatrixGridModal=(...args)=>{
      const r=chart(...args);decorateChart();return r;
    };
    const openHold=loot.open.bind(loot);loot.open=(...args)=>{const r=openHold(...args);if(story.carrying){const item=text('article','MISSION CARGO · Survey recorder. Return it to the home dock; it cannot be sold or fitted.','loot-card story-cargo');$('salvage-list').prepend(item);}return r;};
    new MutationObserver(()=>{if(!tracker||!$('contracts').contains(tracker))ensureTracker();}).observe($('contracts'),{childList:true});
    new MutationObserver(()=>decorateChart()).observe($('matrix-grid-container'),{childList:true});
    new MutationObserver(()=>refresh()).observe(dock,{attributes:true,attributeFilter:['style']});
    document.addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.target.matches('input,textarea,select')&&!button.hidden&&!engine.paused&&!engine.mapOpen){e.preventDefault();e.stopImmediatePropagation();story.recover();}},true);
    ready=true;refresh();story.spawnGuards();
  }
  window.addEventListener('load',()=>setTimeout(install,0));
})();
