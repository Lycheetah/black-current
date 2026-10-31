// Append-only event log for the view layer (effects, combat log). Renderers track the last seq they read.
const KEEP_TICKS = 180;

export function pushEvent(world, e) {
  e.seq = ++world.eventSeq;
  e.tick = world.tick;
  world.events.push(e);
}

export function trimEvents(world) {
  const cut = world.tick - KEEP_TICKS;
  let i = 0;
  while (i < world.events.length && world.events[i].tick < cut) i++;
  if (i) world.events.splice(0, i);
}
