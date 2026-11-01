// The Asterion induction: the first hour as a story chain. One owner: this module writes world.induction
// and pays its rewards. Each step completes on a game event or a state check while it is the active step.
// The chain ends at Helios Bastion, beyond the PILLAR, where an envoy of your civilisation waits.
import { pushEvent } from './events.js';

export const INDUCTION = [
  { id: 'launch', title: 'Off the rail', text: 'Asterion Forge has cleared you. Throttle up with W, steer with A/D and R/F. Reach half speed.',
    when: (w, p) => p.speed > p.flight.maxSpeed * 0.5, reward: { salvage: 20 } },
  { id: 'drill', title: 'Live fire', text: 'Drill drones drift near Asterion. Press 1 (or FIRE) to lock the nearest and open fire. Destroy one.',
    on: 'drillKill', reward: { salvage: 30 } },
  { id: 'listen', title: 'Listen', text: 'Press P to ping the Scanner Atlas. Somewhere out there a signature answers.',
    when: (w) => Object.values(w.atlas.sigs).some((s) => s.stage !== 'hidden'), reward: { research: 5 } },
  { id: 'home', title: 'Come home', text: 'Fly back to Asterion Forge and dock with G.', on: 'docked', reward: { salvage: 20 } },
  { id: 'refit', title: 'The Shipwright', text: 'Open the SHIPWRIGHT tab. Pick a hardpoint and fit a different gun. Drag a node to move it.',
    on: 'fitted', reward: { salvage: 60 } },
  { id: 'breach', title: 'Break the Current', text: 'Undock. Open the map with B, pick the Current Breach and ZJ jump. Purge every wave.',
    when: (w) => w.ops.naraka.stage === 'complete', reward: { research: 10 } },
  { id: 'wreck', title: 'Pick the bones', text: 'Every kill leaves a wreck. Fly within 500 m of one and loot it with V.', on: 'looted', reward: { salvage: 25 } },
  { id: 'trade', title: 'The Exchange', text: 'Dock and sell something at the EXCHANGE tab. Materials come from wrecks and resolved signatures.',
    on: 'sold', reward: { salvage: 25 } },
  { id: 'pillar', title: 'Beyond the PILLAR', text: 'The PILLAR is open. Fly to it, jump through with J, and dock at Helios Bastion in Erebos Reach. Your people are waiting.',
    when: (w, p) => w.sector.id === 'erebos' && p.docked, reward: { salvage: 200, research: 20 } },
];

export const createInduction = () => ({ step: 0, seq: 0, done: false });

export function stepInduction(world, player) {
  const ind = world.induction;
  if (!ind || ind.done || !player || player.dead) { if (ind) ind.seq = world.eventSeq; return; }
  const s = INDUCTION[ind.step];
  let ok = false;
  if (s.on) {
    for (const ev of world.events) {
      if (ev.seq <= ind.seq) continue;
      if (ev.type === s.on) { ok = true; break; }
    }
  } else ok = s.when(world, player);
  ind.seq = world.eventSeq;
  if (!ok) return;
  world.salvage += s.reward.salvage || 0;
  world.research += s.reward.research || 0;
  ind.step++;
  if (ind.step >= INDUCTION.length) { ind.done = true; pushEvent(world, { type: 'inductionDone' }); }
  pushEvent(world, { type: 'inductionStep', id: s.id, title: s.title, reward: s.reward });
}

/** Skip the chain (veteran pilots, old saves). */
export function skipInduction(world) {
  world.induction = { step: INDUCTION.length, seq: world.eventSeq, done: true };
}
