// Navigation points: one place that resolves any destination id to { name, pos, radius }, so autopilot,
// ZJ jumps, the HUD and the map agree. Ids: a landmark id, 'sun', 'job:<id>', 'belt:<id>',
// 'rock:<id>' (an asteroid) or 'anom:<id>' (a pirate anomaly).
import { jobPoint } from './jobs.js';

export function navPoint(world, id) {
  if (typeof id !== 'string') return null;
  const S = world.sector;
  if (S.landmarks[id]) return S.landmarks[id];
  if (id === 'sun') return S.blackSun;
  if (id.startsWith('job:')) return jobPoint(world, id);
  if (id.startsWith('belt:')) { const b = S.belts.find((x) => 'belt:' + x.id === id); return b ? { name: 'Belt · ' + b.id.replace(/_/g, ' '), pos: b.center, radius: b.spread * 0.3 } : null; }
  if (id.startsWith('rock:')) { const r = world.mining?.rocks?.find((x) => 'rock:' + x.id === id && x.sector === S.id && x.amount > 0); return r ? { name: r.name, pos: r.pos, radius: r.radius } : null; }
  if (id.startsWith('anom:')) { const a = world.anomalies?.list?.find((x) => 'anom:' + x.id === id && x.sector === S.id); return a ? { name: a.name, pos: a.pos, radius: 800 } : null; }
  return null;
}
