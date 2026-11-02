// Station JOBS tab: the story operation, this station's job board, and your active jobs.
import { RACE_CATALOG } from '../data/ships/races.js';
import { SECTORS } from '../world/sectors.js';
import { boardFor, jobTypeInfo, jobStatus, tierOpen, standingAt, MAX_ACTIVE, TIER_NAMES, TIER_STANDING } from '../sim/jobs.js';

const fmt = (n) => Math.round(n).toLocaleString();
const waveLine = (waves) => waves.map((w) => Object.entries(w).map(([c, n]) => `${n} ${c}${n > 1 ? 's' : ''}`).join(' + ')).join(' → ');

export function jobsTab(world, p) {
  const sid = world.sector.id;
  const st = standingAt(world, sid);
  const next = TIER_STANDING.find((s) => s > st);
  const op = world.op;
  const opCard = op && op.stage !== 'complete' ? `<section class="ui-card jb-story"><div class="ui-sub">STORY OPERATION · ${op.type}</div><h3>${op.name.toUpperCase()}</h3>
      <p>${op.desc}</p><table class="ui-table"><tr><td>Location</td><td>${world.sector.landmarks[op.target]?.name || op.target}</td></tr>
      <tr><td>Hostiles</td><td>${op.races.map((r) => RACE_CATALOG[r]?.name || r).join(', ')}</td></tr><tr><td>Reward</td><td>${fmt(op.reward)} salvage</td></tr></table>
      <button class="ui-btn" data-course="${op.target}">SET COURSE ON UNDOCK</button></section>` : '';
  const offers = boardFor(world, sid).map((j) => {
    const info = jobTypeInfo(j.type), open = tierOpen(world, sid, j.tier), full = world.jobs.active.length >= MAX_ACTIVE;
    return `<div class="jb-offer${open ? '' : ' locked'}">
      <div class="jb-h"><span class="jb-type">${info.icon} ${info.name.toUpperCase()}</span><span class="jb-tier">TIER ${TIER_NAMES[j.tier]}</span></div>
      <b class="jb-title">${j.title}</b><p>${j.desc}</p>
      ${j.waves ? `<div class="jb-waves">${waveLine(j.waves)}</div>` : ''}
      <div class="jb-reward">+${fmt(j.reward.salvage)} SALVAGE · +${j.reward.research} RESEARCH · +${j.reward.standing} STANDING</div>
      ${open ? `<button class="ui-btn" data-job-accept="${j.id}"${full ? ' disabled title="Three jobs at once"' : ''}>ACCEPT</button>` : `<div class="rs-p">NEEDS STANDING ${TIER_STANDING[j.tier]}</div>`}
    </div>`;
  }).join('');
  const active = world.jobs.active.map((j) => `<div class="ui-row"><span>${jobTypeInfo(j.type).icon} ${j.title}<small>${SECTORS[j.sector].name} · ${jobStatus(world, j)}</small></span>
      <span class="ui-acts"><button class="ui-btn sm" data-course="job:${j.id}">COURSE</button><button class="ui-btn sm ghost" data-job-abandon="${j.id}" title="Costs 1 standing">ABANDON</button></span></div>`).join('');
  return `<div class="jb">
    <div class="ui-note top">Jobs from ${SECTORS[sid].stationName || SECTORS[sid].name}. Standing here <b class="hl">${st}</b>${next != null ? ` · next tier at ${next}` : ' · every tier open'}. Up to ${MAX_ACTIVE} jobs at once; the board refills as you take them.</div>
    ${opCard}
    <section class="ui-card"><h3>ACTIVE JOBS · ${world.jobs.active.length} / ${MAX_ACTIVE}</h3>${active || '<div class="ui-note">None yet. Take one from the board.</div>'}</section>
    <div class="jb-board">${offers}</div>
  </div>`;
}
