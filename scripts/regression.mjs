// Run witness scripts in bounded groups and record one baseline (master route Stage 0).
// Usage: node scripts/regression.mjs [core|all|<witness-name> ...]
// Writes shots/regression/summary.json. Serve the game at http://127.0.0.1:8811/ (and /black-current/),
// or set GAME_URL to point every witness at another server.
import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';
const CORE=['accessible-start','hangar-ui','combat-scaling','service-menus','progression-path','weapon-access','rookie-balance'];
const all=readdirSync('scripts').filter(f=>/^witness-.*\.mjs$/.test(f)).map(f=>f.slice(8,-4));
const args=process.argv.slice(2),names=!args.length||args[0]==='core'?CORE:args[0]==='all'?all:args;
const rows=[];
for(const name of names){
  const file='scripts/witness-'+name+'.mjs',url=process.env.GAME_URL,args=[file];
  // Witnesses take their URL from GAME_URL, or from argv[2] when that defaults to a URL.
  if(url&&/process\.argv\[2\]\s*\|\|\s*(process\.env\.GAME_URL\s*\|\|\s*)?'http/.test(readFileSync(file,'utf8')))args.push(url);
  const t=Date.now(),r=spawnSync('node',args,{encoding:'utf8',timeout:600000});
  const out=(r.stdout||'')+(r.stderr||''),json=[...out.matchAll(/\{"passed":(\d+),"failed":(\d+)/g)].pop();
  const fails=[...out.matchAll(/^(?:FAIL|✗|❌)\s*(.{0,160})/gm)].map(m=>m[1]);
  const row={name,exit:r.status,passed:json?+json[1]:null,failed:json?+json[2]:null,seconds:Math.round((Date.now()-t)/1000),fails,tail:r.status?out.trim().split('\n').slice(-3).join(' | ').slice(0,400):''};
  rows.push(row);console.log(`${row.exit===0?'ok  ':'FAIL'} ${name.padEnd(24)} ${row.passed??'?'}/${(row.passed??0)+(row.failed??0)||'?'} ${row.seconds}s`);
}
mkdirSync('shots/regression',{recursive:true});
writeFileSync('shots/regression/summary.json',JSON.stringify({when:new Date().toISOString(),rows},null,1));
const bad=rows.filter(r=>r.exit!==0);console.log(`\n${rows.length-bad.length}/${rows.length} witnesses green`);
process.exitCode=bad.length?1:0;
