// Route 2 Stage 1 · one menu kit. The pause menu is regrouped into Resume, six pictured tiles, small extras
// and a quiet footer; every service panel wears the shared frame. Each tile must open its real screen.
// Writes shots/menu-kit/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/menu-kit';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const TILES=['Ship fitting','Captain','Sector chart','Equipment Codex','Settings','How to play'];
try{
 for(const [name,viewport,touch] of [['desk',{width:1366,height:768},false],['phone',{width:390,height:844},true],['land',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch}),p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));
  await p.goto(url);await p.waitForFunction(()=>window.uiKit?.ready);
  await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('KIT '+name.toUpperCase());await p.locator('#btn-title-quick').click();await p.waitForTimeout(400);
  const pause=async()=>{await p.evaluate(()=>{garage.closeMission();if(!menu.isPaused())menu.pause();});await p.waitForTimeout(150);};
  await pause();
  const layout=report.data[name]=await p.evaluate(()=>{const card=document.querySelector('#pause-menu .uk-pause'),vis=b=>!b.hidden&&b.offsetParent!==null;
   const reach=b=>{const r=b.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:b.querySelector('strong')?.textContent||b.textContent.trim(),h:Math.round(r.height),reach:!!h&&(h===b||b.contains(h))};};
   const tiles=[...card.querySelectorAll('.uk-tiles button')].filter(vis),extras=[...card.querySelectorAll('.uk-extras button')].filter(vis);
   const rect=card.getBoundingClientRect();
   return{panel:card.classList.contains('uk-panel'),resume:!!card.querySelector('.uk-doors #btn-pause-resume'),objective:!!card.querySelector('.uk-doors #journey-next'),quit:!!card.querySelector('.uk-foot #btn-pause-quit'),
    tiles:tiles.map(reach),extras:extras.map(reach),dupes:[...card.querySelectorAll('button')].filter(b=>vis(b)&&/Modular shipyard|Armoury/.test(b.textContent)).length,
    fits:rect.left>=0&&rect.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
  await p.screenshot({path:`${out}/pause-${name}.png`});
  const min=touch?44:36;
  check(`${name}: pause is one kit panel with objective, Resume and a quiet quit footer`,layout.panel&&layout.resume&&layout.objective&&layout.quit&&layout.fits&&!layout.overflow,layout);
  check(`${name}: six pictured tiles in reading order, nothing duplicated`,JSON.stringify(layout.tiles.map(t=>t.label))===JSON.stringify(TILES)&&layout.dupes===0,layout.tiles);
  // Landscape phones scroll the card; reach the controls the way a thumb would.
  if(name==='land')await p.evaluate(()=>document.querySelector('.uk-pause .uk-extras').scrollIntoView({block:'center'}));
  const reach=await p.evaluate(()=>[...document.querySelectorAll('.uk-pause .uk-extras button')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:b.textContent.trim(),h:Math.round(r.height),reach:!!h&&(h===b||b.contains(h))};}));
  check(`${name}: tiles and extras are reachable with ${min}px targets (Guardian encounter included)`,(name==='land'||layout.tiles.every(t=>t.reach&&t.h>=min))&&reach.every(t=>t.reach&&t.h>=min)&&reach.some(t=>/Guardian/.test(t.label)),{tiles:layout.tiles,extras:reach});
  if(name!=='desk'){await context.close();continue;}
  // Every tile opens its real screen (desktop pass).
  const opened={};
  const tile=async label=>{await pause();await p.locator('.uk-pause .uk-tiles button',{hasText:label}).first().click();await p.waitForTimeout(250);};
  const close=async()=>{await p.evaluate(()=>{try{if(window.modularYard&&!document.getElementById('modular-yard').hidden)document.getElementById('modular-close').click();}catch{};for(const d of document.querySelectorAll('dialog[open]'))d.close();if(engine.mapOpen)engine.toggleMapModal();document.getElementById('captain-panel').style.display='none';if(document.getElementById('menu-panel').style.display!=='none')menu.closePanel();});await p.waitForTimeout(150);};
  await tile('Ship fitting');opened.fitting=await p.evaluate(()=>!document.getElementById('modular-yard').hidden);await p.screenshot({path:`${out}/open-fitting.png`});await close();
  await tile('Captain');opened.captain=await p.evaluate(()=>{const c=document.getElementById('captain-panel');return c.style.display==='flex'&&c.firstElementChild.classList.contains('uk-panel');});await p.screenshot({path:`${out}/open-captain.png`});await close();
  await tile('Sector chart');opened.chart=await p.evaluate(()=>!!engine.mapOpen&&document.querySelector('#map-overlay .modal-card').classList.contains('uk-panel'));await close();
  await tile('Equipment Codex');opened.codex=await p.evaluate(()=>{const d=document.getElementById('equipment-codex');return d.open&&d.classList.contains('uk-panel');});await p.screenshot({path:`${out}/open-codex.png`});await close();
  await tile('Settings');opened.settings=await p.evaluate(()=>document.getElementById('menu-panel').style.display!=='none'&&/Settings/i.test(document.getElementById('menu-panel-title').textContent));await close();
  await tile('How to play');opened.howto=await p.evaluate(()=>document.getElementById('menu-panel').style.display!=='none'&&/How to play/i.test(document.getElementById('menu-panel-title').textContent));await close();
  report.data.opened=opened;
  check('each pause tile opens its real screen, framed by the kit',Object.values(opened).length===6&&Object.values(opened).every(Boolean),opened);
  // The station and the shop wear the same frame.
  report.data.frames=await p.evaluate(()=>{garage.closeMission();if(menu.isPaused())menu.resume();hubs.openDock();const dock=document.querySelector('#dock-panel > .menu-card').classList.contains('uk-panel');hubs.closeDock();bay.show();hangarUI.open('gear',true);const shop=document.getElementById('hangar-picker').classList.contains('uk-panel');return{dock,shop};});
  check('station and equipment shop share the kit frame',report.data.frames.dock&&report.data.frames.shop,report.data.frames);
  await context.close();
 }
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('menu kit witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
