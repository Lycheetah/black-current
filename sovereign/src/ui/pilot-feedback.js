// Presentation derived from the simulation. These helpers never issue an order or write state.
import { angularVelocity, findEntity, firingTarget, weaponBlocker, LOCK_RANGE } from '../sim/combat.js';
import { hitChance } from '../sim/combat-model.js';
import { dist3 } from '../core/math.js';
import { jobStatus, jobTarget } from '../sim/jobs.js';
import { canDock } from '../sim/shipwright.js';
import { LOOT_RANGE } from '../sim/loss.js';

const km=(m)=>m>=1000?(m/1000).toFixed(m<10000?1:0)+' km':Math.round(m)+' m';
const BLOCK_LABEL={target:'NO TARGET',cycling:'CYCLING',range:'OUT OF RANGE',capacitor:'LOW CAP'};

export function groupFeedback(world, ship, group) {
  const guns=ship.weapons.filter((w)=>w.group===group),g=ship.groups[group];
  if (!guns.length) return {label:'NO GUNS',tone:'muted'};
  if (!g.active&&!g.auto) return {label:'READY',tone:'quiet'};
  const blockers=guns.map((w)=>weaponBlocker(ship,w,firingTarget(world,ship,w)));
  if (blockers.includes(null)) return {label:g.auto?'AUTO':'FIRING',tone:'good'};
  if (blockers.every((b)=>b==='target')&&ship.lock.targetId!=null&&ship.lock.progress<1&&!g.auto)
    return {label:'LOCKING',tone:'warn'};
  const blocker=['capacitor','range','target','cycling'].find((b)=>blockers.includes(b));
  return {label:BLOCK_LABEL[blocker]||'READY',tone:blocker==='cycling'?'quiet':'warn'};
}

export function combatFeedback(world, ship, target) {
  if (!target) return null;
  if (ship.lock.progress<1) return {label:'ACQUIRING TARGET',hint:`Hold the lock · ${Math.round(ship.lock.progress*100)}%`,tone:'quiet'};
  if (!ship.weapons.length) return {label:'NO WEAPONS FITTED',hint:'Fit a gun at the station before engaging.',tone:'warn'};
  const d=dist3(ship.pos,target.pos),ang=angularVelocity(ship,target),radius=target.flight.sig??target.flight.radius;
  const solutions=ship.weapons.map((wpn)=>({wpn,chance:hitChance(wpn.w,d,ang,radius),rangeOnly:hitChance(wpn.w,d,0,radius)}));
  solutions.sort((a,b)=>b.chance-a.chance);
  const best=solutions[0],armed=ship.weapons.filter((w)=>ship.groups[w.group].active||ship.groups[w.group].auto);
  const live=armed.map((w)=>weaponBlocker(ship,w,firingTarget(world,ship,w)));
  if (live.length&&live.every((b)=>b==='capacitor'))
    return {label:'CAPACITOR LOW',hint:'Let capacitor recover or switch off a powered module.',tone:'warn'};
  const maxRange=Math.max(...ship.weapons.map((w)=>w.w.optimal+w.w.falloff*2.5));
  if (d>maxRange) return {label:'OUTSIDE FIRING RANGE',hint:`Approach · best current optimal ${km(best.wpn.w.optimal)}`,tone:'warn'};
  if (best.rangeOnly<.65) return {label:'RANGE REDUCING ACCURACY',hint:`Close toward ${km(best.wpn.w.optimal)} · current hit estimate ${Math.round(best.chance*100)}%`,tone:'warn'};
  if (best.chance<best.rangeOnly*.65) return {label:'TARGET HARD TO TRACK',hint:'Match its course or widen the orbit to reduce crossing speed.',tone:'warn'};
  if (!armed.length) return {label:'WEAPONS READY',hint:`Space fires all groups · best hit estimate ${Math.round(best.chance*100)}%`,tone:'good'};
  return {label:'FIRE CONTROL ACTIVE',hint:`Best current hit estimate ${Math.round(best.chance*100)}% · Space toggles manual fire`,tone:'good'};
}

/** One next action for the active sortie. Explicit wreck IDs prevent looting nearby debris. */
export function sortieGuidance(world, ship) {
  const job=world.jobs.active.find((j)=>j.type==='testament')||world.jobs.active[0];
  if (!job) return null;
  const result=(stage,hint,label,action)=>({id:job.id,title:job.title,stage,hint,label,action});
  const course=()=>result('TRAVEL',jobStatus(world,job),'SET COURSE',{type:'navLandmark',id:'job:'+job.id});
  if (ship.dead) return result('RECOVERING','Your contract remains active. Recover the archive after respawn.',null,null);
  const destination=jobTarget(world,job);
  if (world.sector.id!==destination.sector) return result('TRAVEL TO SECTOR',`Travel to ${destination.sector.toUpperCase()} to continue this contract.`,
    ship.docked?'UNDOCK':'OPEN MAP',ship.docked?{type:'undock'}:'map');
  if (job.type==='testament'&&job.hasBox) {
    if (ship.docked) return result('HEAR THE ARCHIVE','Ilex is aboard. Review the three transfers in JOBS.','HEAR ILEX',{type:'openJobs'});
    if (canDock(world,ship)) return result('RETURN TO ASTERION','The archive is safe aboard. Dock to hear its testimony.','DOCK [G]','dock');
    return result('RETURN TO ASTERION','Ilex is aboard. Your next decision is at the home port.','SET COURSE HOME',{type:'navLandmark',id:'job:'+job.id});
  }
  if (ship.docked) return result('READY TO DEPART','Set the contract course in JOBS, then leave the launch rail.','UNDOCK',{type:'undock'});
  if (job.type!=='testament') return course();
  if (job.enc?.stage==='complete') {
    const wreck=world.wrecks.find((w)=>w.id===job.wreckId&&!w.looted&&w.sector===world.sector.id);
    if (wreck) {
      const near=dist3(ship.pos,wreck.pos)-wreck.radius<=LOOT_RANGE;
      return result('RECOVER ILEX',near?'Archive in reach. Collect it, then return to Asterion.':`Escort clear · archive ${km(dist3(ship.pos,wreck.pos))} away`,
        near?'COLLECT ARCHIVE [V]':'APPROACH ARCHIVE',near?{type:'loot',wreckId:wreck.id}:{type:'navWreck',id:wreck.id});
    }
    return course();
  }
  if (job.enc?.stage==='wave') {
    const locked=ship.lock.targetId!=null?findEntity(world,ship.lock.targetId):null;
    if (locked?.encounterId===job.id) {
      if (ship.lock.progress<1) return result('ENGAGE THE ESCORT',`Acquiring guard · ${Math.round(ship.lock.progress*100)}%`,null,null);
      const armed=Object.values(ship.groups).some((g)=>g.active||g.auto);
      return result('ENGAGE THE ESCORT',armed?'Fire control is active. Keep a useful range and watch your capacitor.':'Target locked. Fire when ready.',
        armed?'KEEP WEAPON RANGE':'FIRE ALL [SPACE]',armed?{type:'navTarget',mode:'range'}:{type:'allGroups',active:true});
    }
    const guards=world.entities.filter((e)=>e.encounterId===job.id&&!e.dead&&!e.docked&&e.faction==='hostile')
      .sort((a,b)=>dist3(ship.pos,a.pos)-dist3(ship.pos,b.pos));
    const guard=guards.find((e)=>dist3(ship.pos,e.pos)<=LOCK_RANGE);
    if (guard) return result('ENGAGE THE ESCORT',`${guards.length} escort ships remain. Lock a guard to begin.`,'LOCK NEAREST GUARD',{type:'lock',targetId:guard.id});
  }
  const t=jobTarget(world,job);
  return result('TRAVEL',`${t.name} · ${km(dist3(ship.pos,t.pos))} · set course, then J for a local jump`,
    'SET COURSE',{type:'navLandmark',id:'job:'+job.id});
}

const escapeText=(s)=>String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sortieMarkup(guidance) {
  if (!guidance) return '';
  return `<section class="sortie-guide"><div class="tag jobs">CONTRACT · ${escapeText(guidance.stage)}</div>
    <h2>${escapeText(guidance.title)}</h2><p>${escapeText(guidance.hint)}</p>
    ${guidance.action?`<button data-sortie-action>${escapeText(guidance.label)}</button>`:''}</section>`;
}
