/* PLAYTEST FUNDS (Mac, 2026-10-29: "add a +100 metal button … or even do 1k … it'll let me test a lot").
 * While the climb is being re-priced (docs/PLAN.md, overnight run steps 2–3), the preview builds carry two
 * small buttons beside the wallet: +1,000 metal and +500 biomass. They go through the normal wallet and save,
 * so everything bought with them is real. Remove this file from index.html when the economy is tuned. */
(() => {
  'use strict';
  const GRANT = { metal: 1000, biomass: 500 };
  let ready = false;
  function grant(kind) {
    if (kind === 'metal') { hubs.metal = hubs.metal + GRANT.metal; saveState.save(); }
    else { progression.totalMass += GRANT.biomass; progression.saveProgress?.(); saveState.save(); }
    window.resourceWallet?.paint?.(true); window.walletHUD?.paint?.();
    garage.banner(kind === 'metal' ? `PLAYTEST · +${GRANT.metal.toLocaleString()} metal` : `PLAYTEST · +${GRANT.biomass} biomass`, 'good');
    return true;
  }
  function install() {
    const anchor = document.getElementById('wallet-button');
    if (!anchor || !window.hubs || typeof progression === 'undefined') { setTimeout(install, 100); return; }
    const box = document.createElement('span'); box.id = 'playtest-funds';
    box.style.cssText = 'display:inline-flex;gap:4px;margin-left:6px;vertical-align:middle;pointer-events:auto';
    for (const [kind, label] of [['metal', '+1k ⬡'], ['biomass', '+500 ♆']]) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.playtest = kind; b.textContent = label; b.title = 'Playtest funds (preview builds only)';
      b.style.cssText = 'font:600 11px/1 system-ui;padding:5px 7px;border:1px solid #c9a24a;border-radius:3px;background:rgba(20,16,6,.85);color:#f0d78a;cursor:pointer';
      b.addEventListener('click', e => { e.stopPropagation(); grant(kind); });
      b.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
      box.append(b);
    }
    anchor.after(box); ready = true;
  }
  window.playtestFunds = { GRANT, grant, get ready() { return ready; } };
  window.addEventListener('load', () => setTimeout(install, 300));
})();
