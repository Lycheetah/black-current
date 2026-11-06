// A hero/capture link is a disposable flight. Pilot slots belong to normal sessions.
export function sessionModeFor(params) {
  return ['preview','autolaunch','capture'].some((key)=>params.has(key)) ? 'preview' : 'pilot';
}

/** Keep every save trigger behind the same boundary, before even making a snapshot. */
export function savePilotSession({mode,launched,dead,slot,makeSave,write}) {
  if (mode!=='pilot'||!launched||dead) return {ok:false,skipped:true};
  return write(makeSave(),slot);
}
