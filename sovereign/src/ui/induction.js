// Induction tracker (HUD card) and the envoy who meets you at the end of it. Reads world.induction.
import { INDUCTION } from '../sim/induction.js';
import { RACE_CATALOG, PANTHEON_CODEX } from '../data/ships/races.js';

export function createInductionUi(card, envoy, world) {
  let key = '', lastSeq = 0;
  envoy.addEventListener('click', (e) => { if (e.target.closest('[data-envoy-ok]')) envoy.classList.remove('show'); });

  function showEnvoy() {
    const civ = RACE_CATALOG[world.pilot.civ] || {}, god = PANTHEON_CODEX[world.pilot.civ] || {};
    envoy.innerHTML = `<div class="box"><div class="glyph">${god.glyph || '◈'}</div>
      <h2>ENVOY OF ${(god.godName || civ.name || 'YOUR PEOPLE').toUpperCase()}</h2>
      <div class="sub">${(civ.name || '').toUpperCase()} · HELIOS BASTION · EREBOS REACH</div>
      ${god.quote ? `<blockquote>“${god.quote}”</blockquote>` : ''}
      <p>${world.pilot.name}. Asterion taught you to fly, to fight, to listen and to trade. Out here, that is only the beginning.
      Erebos is contested ground: the Mirror Well waits to be taken, and further on the Aion Gate is sealed. Our work starts now.</p>
      <p class="dim">Induction complete · +200 salvage · +20 research. Agents and standing arrive with the Contracts release.</p>
      <button class="ui-btn" data-envoy-ok>I AM READY</button></div>`;
    envoy.classList.add('show');
  }

  return {
    update() {
      const ind = world.induction;
      for (const ev of world.events) {
        if (ev.seq <= lastSeq) continue;
        lastSeq = ev.seq;
        if (ev.type === 'inductionStep') { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
        if (ev.type === 'inductionDone') showEnvoy();
      }
      const k = ind.step + ':' + ind.done;
      if (k === key) return;
      key = k;
      card.classList.toggle('show', !ind.done);
      if (ind.done) return;
      const s = INDUCTION[ind.step];
      const r = [s.reward.salvage ? `+${s.reward.salvage} SALVAGE` : '', s.reward.research ? `+${s.reward.research} RESEARCH` : ''].filter(Boolean).join(' · ');
      card.innerHTML = `<div class="tag"><span>ASTERION INDUCTION · ${ind.step + 1}/${INDUCTION.length}</span><span>${r}</span></div>
        <h3>${s.title.toUpperCase()}</h3><p>${s.text}</p>
        <div class="pips">${INDUCTION.map((_, i) => `<i class="${i < ind.step ? 'on' : ''}"></i>`).join('')}</div>`;
    },
  };
}
