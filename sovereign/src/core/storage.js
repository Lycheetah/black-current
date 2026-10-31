// Save storage. localStorage when the browser allows it; when it is full or blocked the game keeps
// running and offers the save as a file (download, or copy where downloads are blocked).
const KEY = 'sovereign_eclipse_reforge_save';

export function readSave() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** @returns {{ok:true}|{ok:false, reason:string}} */
export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return { ok: true }; }
  catch (e) { return { ok: false, reason: e?.name === 'QuotaExceededError' ? 'STORAGE FULL' : 'STORAGE BLOCKED' }; }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }

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
