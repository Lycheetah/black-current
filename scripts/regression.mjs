// Run witness scripts in bounded groups and record one baseline (master route Stage 0).
// Usage: node scripts/regression.mjs [--retry] [core|ci|all|<witness-name> ...]
// `ci` is the gate the PR workflow runs: every witness that is green today. Grow it as debt clears.
// --retry reruns a failed witness once and reports it as FLAKY if the rerun passes.
// Writes shots/regression/summary.json. Serve the game at http://127.0.0.1:8811/ (and /black-current/),
// or set GAME_URL to point every witness at another server.
import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';
// One address for every witness, including the old ones that default to retired dev ports.
process.env.GAME_URL=process.env.GAME_URL||'http://127.0.0.1:8811/';
const CORE=['accessible-start','hangar-ui','combat-scaling','service-menus','progression-path','weapon-access','rookie-balance'];
const CI=['audio-forge','gl-backdrop','gl-fx','deep-danger','actives','fitting-zoom','civilisations','combat-scaling','enemy-wings','galaxy','jelly-shoals','menu','mount-progression','novice-fleet','phase-one','quartermaster','roles','rookie-supplies','service-menus','skin','space-experience','weapon-access','one-scale','arsenal','climb','interface','wide-dark','capital',
  'movement-feel','accessible-start','boss-scenes','clip-ons','combat-feel','combat-pass','equipment-codex','first-fit',
  'modular-ships','progression-path','phone-layout','menu-kit','zones','lens','map','terrain','sound-mix','dungeons','dungeon-loot','rifts','ladder','gun-ranks','elite-marks','encounters','autopilot','auto-fire','gates','campaign','gun-feel','onboarding','daily','wingmen','hubs','first-expedition','identity-paths','gun-mods','bases','hud','module-sizes','weapon-families','coop'];
const all=readdirSync('scripts').filter(f=>/^witness-.*\.mjs$/.test(f)).map(f=>f.slice(8,-4));
const retry=process.argv.includes('--retry'),args=process.argv.slice(2).filter(a=>a!=='--retry'),names=!args.length||args[0]==='core'?CORE:args[0]==='ci'?CI:args[0]==='all'?all:args;
const rows=[];
for(const name of names){
  const file='scripts/witness-'+name+'.mjs',url=process.env.GAME_URL,args=[file];
  // Witnesses take their URL from GAME_URL, or from argv[2] when that defaults to a URL.
  if(url&&/process\.argv\[2\]\s*\|\|\s*(process\.env\.GAME_URL\s*\|\|\s*)?'http/.test(readFileSync(file,'utf8')))args.push(url);
  const t=Date.now();let r=spawnSync('node',args,{encoding:'utf8',timeout:600000}),flaky=false;
  if(retry&&r.status!==0){const again=spawnSync('node',args,{encoding:'utf8',timeout:600000});if(again.status===0){r=again;flaky=true;}}
  const out=(r.stdout||'')+(r.stderr||''),last=re=>[...out.matchAll(re)].pop();
  // witnesses report their totals four ways: a JSON summary, 'RESULT n passed / m failed', 'n/t passed', 'n passed, m failed'
  const j=last(/\{"passed":(\d+),"failed":(\d+)/g),rs=last(/RESULT (\d+) passed \/ (\d+) failed/g),of=last(/(\d+)\/(\d+) passed/g),pc=last(/(\d+) passed, (\d+) failed/g);
  const json=j||rs||pc||(of&&[of[0],of[1],String(+of[2]-+of[1])]);
  const fails=[...out.matchAll(/^\s*(?:FAIL|✗|✘|❌)\s*(.{0,160})/gm)].map(m=>m[1]);
  const row={name,exit:r.status,flaky,passed:json?+json[1]:null,failed:json?+json[2]:null,seconds:Math.round((Date.now()-t)/1000),fails,tail:r.status?out.trim().split('\n').slice(-3).join(' | ').slice(0,400):''};
  rows.push(row);console.log(`${row.exit!==0?'FAIL':flaky?'FLKY':'ok  '} ${name.padEnd(24)} ${row.passed??'?'}/${(row.passed??0)+(row.failed??0)||'?'} ${row.seconds}s`);
}
mkdirSync('shots/regression',{recursive:true});
writeFileSync('shots/regression/summary.json',JSON.stringify({when:new Date().toISOString(),rows},null,1));
const bad=rows.filter(r=>r.exit!==0),flakes=rows.filter(r=>r.flaky).map(r=>r.name);console.log(`\n${rows.length-bad.length}/${rows.length} witnesses green`+(flakes.length?` (flaky, passed on rerun: ${flakes.join(', ')})`:''));
process.exitCode=bad.length?1:0;
