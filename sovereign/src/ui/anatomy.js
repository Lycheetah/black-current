// Anatomy readout: outer ring shield, four armour quadrants (fore/starboard/aft/port), structure core.
const C2 = 2 * Math.PI * 30; // armour ring circumference
const SEG = C2 / 4 - 6;
const C1 = 2 * Math.PI * 40;
const ZONES = [['fore', -90], ['starboard', 0], ['aft', 90], ['port', 180]];

export function anatomyMarkup(hostile) {
  const z = ZONES.map(([name, a]) =>
    `<circle class="an-z-bg" r="30" cx="50" cy="50" stroke-dasharray="${SEG} ${C2}" transform="rotate(${a - 45 + 3.4} 50 50)"/>` +
    `<circle class="an-z" data-z="${name}" r="30" cx="50" cy="50" stroke-dasharray="${SEG} ${C2}" transform="rotate(${a - 45 + 3.4} 50 50)"/>`).join('');
  return `<svg class="anatomy ${hostile ? 'hostile' : ''}" viewBox="0 0 100 100">
    <circle class="an-s-bg" r="40" cx="50" cy="50"/>
    <circle class="an-s" data-s r="40" cx="50" cy="50" stroke-dasharray="${C1} ${C1}" transform="rotate(-90 50 50)"/>
    ${z}
    <circle class="an-h-bg" r="19" cx="50" cy="50"/>
    <circle class="an-h" data-h r="19" cx="50" cy="50"/>
    <text x="50" y="47" data-num class="an-num"></text>
    <text x="50" y="58" class="an-cap">STRUCT</text>
  </svg>`;
}

export function bindAnatomy(root) {
  const s = root.querySelector('[data-s]'), h = root.querySelector('[data-h]'), num = root.querySelector('[data-num]');
  const zones = Object.fromEntries([...root.querySelectorAll('[data-z]')].map((el) => [el.dataset.z, el]));
  return (combat) => {
    const sf = combat.shield.cur / Math.max(1, combat.shield.max);
    s.setAttribute('stroke-dasharray', `${C1 * sf} ${C1}`);
    for (const [k, el] of Object.entries(zones)) {
      const a = combat.armour[k];
      const f = a.cur / Math.max(1, a.max);
      el.setAttribute('stroke-dasharray', `${SEG * f} ${C2}`);
      el.classList.toggle('breached', f <= 0);
    }
    const hf = combat.structure.cur / Math.max(1, combat.structure.max);
    h.setAttribute('r', String(4 + 15 * hf));
    h.classList.toggle('critical', hf < 0.35);
    num.textContent = Math.round(hf * 100) + '%';
  };
}

export const SYSTEM_LABELS = { engines: 'ENG', sensors: 'SEN', reactor: 'RCT', weapons_fore: 'W-F', weapons_mid: 'W-M', weapons_aft: 'W-A' };

export function systemsMarkup() {
  return `<div class="systems">${Object.entries(SYSTEM_LABELS).map(([k, l]) => `<span data-sys="${k}"><i></i>${l}</span>`).join('')}</div>`;
}

export function bindSystems(root) {
  const els = [...root.querySelectorAll('[data-sys]')];
  return (systems) => {
    for (const el of els) {
      const v = systems[el.dataset.sys];
      el.querySelector('i').style.width = Math.round(v * 100) + '%';
      el.className = v < 0.3 ? 'crit' : v < 0.7 ? 'warn' : '';
    }
  };
}
