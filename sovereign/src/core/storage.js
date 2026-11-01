// Save storage: three slots in localStorage. When storage is full or blocked the game keeps running and
// offers the save as a file (download, or copy where downloads are blocked).
const LEGACY = 'sovereign_eclipse_reforge_save';
const key = (slot) => `${LEGACY}_${slot}`;
export const SLOTS = [1, 2, 3];

function get(k) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } }

/** One-time move of the pre-slot save into slot 1. */
function migrateLegacy() {
  try {
    const old = localStorage.getItem(LEGACY);
    if (old && !localStorage.getItem(key(1))) localStorage.setItem(key(1), old);
    if (old) localStorage.removeItem(LEGACY);
  } catch {}
}
migrateLegacy();

export const readSave = (slot = 1) => get(key(slot));

/** Every slot with its save (or null), newest save first in `latest`. */
export function listSlots() {
  const slots = SLOTS.map((slot) => ({ slot, data: readSave(slot) }));
  const latest = slots.filter((s) => s.data).sort((a, b) => String(b.data.savedAt).localeCompare(String(a.data.savedAt)))[0] || null;
  return { slots, latest };
}

/** @returns {{ok:true}|{ok:false, reason:string}} */
export function writeSave(data, slot = 1) {
  try { localStorage.setItem(key(slot), JSON.stringify(data)); return { ok: true }; }
  catch (e) { return { ok: false, reason: e?.name === 'QuotaExceededError' ? 'STORAGE FULL' : 'STORAGE BLOCKED' }; }
}

export function clearSave(slot) { try { localStorage.removeItem(key(slot)); } catch {} }

/** Offer the save as a file; falls back to the clipboard. Resolves to what happened. */
export async function exportSave(data) {
  const text = JSON.stringify(data, null, 1);
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'sovereign-eclipse-save.json';
    document.body.appendChild(a); a.click(); a.remove();
  } catch {}
  try { await navigator.clipboard.writeText(text); return 'SAVE FILE OFFERED · ALSO COPIED TO CLIPBOARD'; }
  catch { return 'SAVE FILE OFFERED'; }
}
