/* Hull damage and sustained travel; wraps native simulation owners. */
(() => {
  'use strict';
  let ready=false,enabled=false,button,desktopButton;
  const ordinary=e=>e instanceof EnemyOrganism&&!e.isBoss&&!e.training&&!e.holo;
  function paint(){
    for(const b of [button,desktopButton])if(b){
      b.setAttribute('aria-pressed',String(enabled));
      b.innerHTML='<span>Cruise '+(enabled?'ON':'OFF')+'</span><small>'+(enabled?'25% damage':b.id==='btn-cruise'?'fast travel':'V · travel')+'</small>';   /* the phone button shows no keyboard key */
      b.title='Cruise · V · more thrust (more on bigger frames), weapon damage reduced by 75%. No reactor drain.';
    }
  }
  function set(on){
    if(on&&(!saveState.doc.launched||engine.player.dead||engine.paused||engine.mapOpen))return false;
    enabled=!!on;paint();return true;
  }
  function install(){
    if(!window.enemyWings?.ready||!window.weaponBalance?.ready||!window.viewControls?.ready||!document.getElementById('phone-zoom')){setTimeout(install,40);return;}
    const hurt=EnemyOrganism.prototype.takeDamage;
    EnemyOrganism.prototype.takeDamage=function(amount,...args){if(Number.isFinite(amount)&&amount>0)this._hullHitAt=performance.now();return hurt.call(this,amount,...args);};
    const severedHp=new WeakMap(),lose=engine.loseNode;
    engine.loseNode=function(ship,node,...args){if(ordinary(ship))severedHp.set(node,node.partHp);return lose.call(this,ship,node,...args);};
    const damage=engine.damageNode;
    engine.damageNode=function(ship,node,amount,...args){
      const applies=ordinary(ship)&&!node.lost&&Number.isFinite(amount)&&amount>0;
      const partHp=node.partHp??Math.max(8,node.radius*JUICE.nodeHpPerRadius);
      severedHp.delete(node);
      const result=damage.call(this,ship,node,amount,...args);
      if(applies){
        // Read native critical damage before hull-only loss handlers clamp HP
        // to0. Never roll a second critical for the same impact.
        const dealt=Math.max(0,partHp-(severedHp.get(node)??node.partHp??partHp));
        const absorbed=Math.min(dealt,Math.max(0,partHp));
        const shock=dealt-absorbed+absorbed*.2;
        const shield=Math.max(0,ship.shield||0);
        ship.shield=Math.max(0,shield-shock);
        ship.hp-=Math.max(0,shock-shield);
        ship._hullHitAt=performance.now();
      }
      severedHp.delete(node);
      return result;
    };
    const thrust=reactor.thrustScale;
    const boost=()=>window.tuning?.CRUISE?.[tuning.classOf(engine.player)]||1.65;   // js/tuning.js CRUISE by frame
    reactor.thrustScale=function(...args){return thrust.apply(this,args)*(enabled?boost():1);};
    const fire=engine.fireMountGroup;
    engine.fireMountGroup=function(id,mounts,damageScale,...args){return fire.call(this,id,mounts,(damageScale??1)*(enabled?.25:1),...args);};
    const input=engine.readInput;
    engine.readInput=function(...args){
      const r=input.apply(this,args);
      // Dump cruise momentum on disengage: toggling cannot retain boost speed
      // with full-damage guns. No arbitrary travel cooldown is needed.
      if(!enabled&&this.player._cruising){const k=boost();this.player.vx/=k;this.player.vy/=k;}
      this.player._cruising=enabled;return r;
    };
    const update=engine.update;
    engine.update=function(...args){if(enabled&&(this.player.dead||!saveState.doc.launched))set(false);return update.apply(this,args);};
    const reset=engine.reset;
    if(typeof reset==='function')engine.reset=function(...args){set(false);return reset.apply(this,args);};
    for(const[id,host]of [['btn-cruise','phone-zoom'],['btn-cruise-desktop','view-controls']]){
      const b=document.createElement('button');b.id=id;b.type='button';b.className='cruise-button';
      b.onclick=e=>{e.stopPropagation();set(!enabled);};
      for(const type of ['pointerdown','mousedown','touchstart'])b.addEventListener(type,e=>e.stopPropagation(),{passive:true});
      document.getElementById(host).append(b);if(id==='btn-cruise')button=b;else desktopButton=b;
    }
    document.addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat&&!e.target.closest('input,textarea,select,[contenteditable=true]')){e.preventDefault();set(!enabled);}});
    paint();ready=true;
  }
  window.combatFeel={setCruise:set,get cruise(){return enabled;},get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,300));
})();
