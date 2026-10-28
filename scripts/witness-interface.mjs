// Master route Stage 4 · the interface: title footer, chart guard, forge-test launch, one danger
// number, rookie prompts that expire, a HUD that collapses in combat, phone captures. Writes shots/interface/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/interface';mkdirSync(out,{recursive:true});
const URL=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data)));};
const browser=await firefox.launch();
const open=async(viewport,query='',touch=false)=>{const c=await browser.newContext({viewport,hasTouch:touch,isMobile:touch});const p=await c.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('dialog',d=>{report.errors.push('unexpected dialog: '+d.message().split('\n')[0]);d.dismiss();});await p.goto(URL+query);await p.waitForFunction(()=>window.flightHud?.ready&&window.starterJourney?.ready);return p;};
try{
 // 1 · title: the chart stays shut, the launch footer is one solid row
 let p=await open({width:1366,height:768});
 await p.keyboard.press('m');await p.waitForTimeout(300);
 check('the sector chart cannot open over the title screen',await p.evaluate(()=>!engine.mapOpen));
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('INTERFACE');await p.waitForTimeout(300);
 report.data.footer=await p.evaluate(()=>{const q=document.getElementById('btn-title-quick').getBoundingClientRect(),l=document.getElementById('btn-title-launch').getBoundingClientRect(),f=document.querySelector('#title-newgame .ng-actions');return{sameRow:Math.abs(q.top-l.top)<4,bg:getComputedStyle(f).backgroundColor};});
 check('desktop launch footer keeps both buttons on one solid row',report.data.footer.sameRow&&!/rgba\(.*, 0\)|transparent/.test(report.data.footer.bg),report.data.footer);
 await p.screenshot({path:out+'/title-desktop.png'});
 await p.keyboard.press('m');await p.waitForTimeout(300);
 check('the sector chart cannot open over the new-pilot screen',await p.evaluate(()=>!engine.mapOpen));
 await p.locator('#btn-title-quick').click();await p.waitForTimeout(800);
 // 2 · one danger number, rookie prompts expire, HUD collapses in combat
 await p.evaluate(()=>garage.closeMission());
 report.data.homeStory=await p.evaluate(()=>{flightHud.tick();const s=document.getElementById('story-contract');return{exists:!!s,shown:!!s&&getComputedStyle(s).display!=='none'};});
 check('the first-expedition prompt shows at home',report.data.homeStory.exists&&report.data.homeStory.shown,report.data.homeStory);
 report.data.deep=await p.evaluate(()=>{const sys=[...galaxy.data.systems].filter(s=>s.id!=='home'&&s.id!==saveState.doc.civHome&&!s.rule).sort((a,b)=>b.danger-a.danger)[0];galaxy.enterSystemById(sys.id);const ch=Object.values(worldMap.chambers).sort((a,b)=>b.dangerLevel-a.dangerLevel)[0];worldMap.currentGridX=ch.gridX;worldMap.currentGridY=ch.gridY;engine.enterChamber({silent:true});flightHud.tick();
  const s=document.getElementById('story-contract');return{strip:document.getElementById('system-strip')?.textContent||'',hud:document.getElementById('hud-danger-lvl').textContent,danger:worldMap.getCurrentChamber().dangerLevel,storyShown:!!s&&getComputedStyle(s).display!=='none'};});
 check('the system strip leads with the sector danger the HUD shows',report.data.deep.strip.includes('sector danger '+report.data.deep.danger)&&report.data.deep.hud.includes(String(report.data.deep.danger)),report.data.deep);
 check('the home-only first-expedition prompt is hidden in deep space',!report.data.deep.storyShown,report.data.deep);
 report.data.combat=await p.evaluate(()=>{engine.paused=false;const P=engine.player,e=engine.enemies[0];e.x=P.x+600;e.y=P.y;e._aggro=true;flightHud.tick();const on=document.body.classList.contains('bc-combat'),rows=[...document.querySelectorAll('#contracts .ct')].map(r=>getComputedStyle(r).display);engine.enemies.forEach(x=>{x.x=P.x+9000;x._aggro=false;x._hitAt=0;});return{on,rows};});
 check('in combat the contract rows collapse to their header',report.data.combat.on&&report.data.combat.rows.length>0&&report.data.combat.rows.every(d=>d==='none'),report.data.combat);
 await p.screenshot({path:out+'/combat-desktop.png'});
 await p.context().close();
 // 3 · forge-test: quick launch works and the grant lands after launch
 p=await open({width:1366,height:768},'?forge-test');
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('FORGE TEST');await p.locator('#btn-title-quick').click();await p.waitForTimeout(1200);
 report.data.forgeTest=await p.evaluate(()=>({launched:!!saveState.doc.launched,title:garage.el.title.style.display,metal:hubs.metal}));
 check('?forge-test quick launch flies and grants its metal after launch',report.data.forgeTest.launched&&report.data.forgeTest.title==='none'&&report.data.forgeTest.metal>=999999,report.data.forgeTest);
 await p.context().close();
 // 4 · phone captures: title footer and flight HUD fit without horizontal overflow
 p=await open({width:390,height:844},'',true);
 await p.locator('#btn-menu-new').tap();await p.locator('#title-callsign').fill('PHONE');await p.waitForTimeout(300);await p.screenshot({path:out+'/title-phone.png'});
 report.data.phoneTitle=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,quick:document.getElementById('btn-title-quick').getBoundingClientRect().width>0}));
 await p.locator('#btn-title-quick').tap();await p.waitForTimeout(900);await p.evaluate(()=>garage.closeMission());await p.waitForTimeout(300);await p.screenshot({path:out+'/flight-phone.png'});
 report.data.phoneFlight=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,launched:!!saveState.doc.launched}));
 check('phone title and flight have no horizontal overflow (PHONE: real-device feel pending)',!report.data.phoneTitle.overflow&&report.data.phoneTitle.quick&&!report.data.phoneFlight.overflow&&report.data.phoneFlight.launched,{...report.data.phoneTitle,...report.data.phoneFlight});
 check('no application exceptions or unexpected dialogs',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('interface witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
