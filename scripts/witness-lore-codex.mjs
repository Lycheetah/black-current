// The Pantheon codex (js/lore-codex.js, js/canon-lore.js). Mac, 2026-10-30: "do up the lore and civilizations". The title
// menu opens it (the pause menu keeps its three extras); it shows all fifteen canon civilisations, each with its canon facts, its eighteen-class hull
// lineage (the nine flown here marked) and its authored codex text, word for word from docs/canon; it fits a phone.
import {chromium,devices} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const out='shots/lore-codex';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,600)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const doc=readFileSync('docs/canon/COMPLETE_PANTHEON_LORE_15_CIVILISATIONS.md','utf8').replace(/\s+/g,' ');
const browser=await chromium.launch();
try{
 const c=await browser.newContext({viewport:{width:1366,height:860}}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(url);await p.waitForFunction(()=>window.loreCodex?.ready);
 await p.locator('#btn-menu-lore').click();
 report.data.title=await p.evaluate(()=>({open:loreCodex.open,civs:[...document.querySelectorAll('#lore-codex .lc-civ')].map(b=>b.dataset.civ)}));
 check('the title menu opens the codex on all fifteen canon civilisations',report.data.title.open&&report.data.title.civs.length===15,report.data.title);
 await p.locator('#lore-codex .lc-civ[data-civ="ai-hunters"]').click();
 report.data.page=await p.evaluate(()=>{const pg=document.getElementById('lore-codex-page'),c=canon.civilisations.find(x=>x.id==='ai-hunters');return{name:pg.querySelector('.lc-name').textContent,motto:pg.querySelector('.lc-motto').textContent,wantMotto:c.motto,ladder:pg.querySelectorAll('.lc-ladder li').length,flown:pg.querySelectorAll('.lc-ladder li.flown').length,names:[...pg.querySelectorAll('.lc-ladder b')].map(b=>b.textContent),canonNames:canon.hulls['ai-hunters'].map(h=>h.name),paras:[...pg.querySelectorAll('.lc-section p, .lc-section blockquote')].map(n=>n.textContent)};});
 const P=report.data.page,notInCanon=P.paras.filter(t=>!doc.includes(t.replace(/\s+/g,' ').slice(0,60)));
 check('a civilisation page: canon name and motto, the eighteen-class lineage by canon name, nine flown here',P.name==='AI Hunters'&&P.motto===P.wantMotto&&P.ladder===18&&P.flown===9&&JSON.stringify(P.names)===JSON.stringify(P.canonNames),{...P,paras:P.paras.length});
 check('the codex text is the canon doc word for word (every paragraph found in docs/canon)',P.paras.length>20&&notInCanon.length===0,{paras:P.paras.length,notInCanon:notInCanon.slice(0,3)});
 await p.screenshot({path:`${out}/desktop.png`});
 await p.locator('#lore-codex-close').click();check('Close shuts it',!(await p.evaluate(()=>loreCodex.open)));
 await c.close();
 const m=await browser.newContext({...devices['iPhone 13'],hasTouch:true}),q=await m.newPage();q.on('pageerror',e=>report.errors.push(e.message));
 await q.goto(url);await q.waitForFunction(()=>window.loreCodex?.ready);await q.locator('#btn-menu-lore').tap();
 report.data.phone=await q.evaluate(()=>{const r=document.getElementById('lore-codex').getBoundingClientRect();return{w:Math.round(r.width),vw:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
 await q.screenshot({path:`${out}/phone.png`});
 check('on a phone it fills the screen without sideways overflow',Math.abs(report.data.phone.w-report.data.phone.vw)<=2&&!report.data.phone.overflow,report.data.phone);
 await m.close();
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){check('witness completed',false,e.message);}
const failed=report.checks.filter(c=>!c.ok).length;writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.checks.length-failed,failed,errors:report.errors}));
await browser.close();process.exit(failed||report.errors.length?1:0);
