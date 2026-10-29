// Route 2 Stage 5 · co-op first slice (js/coop.js): two browsers link by swapping codes (no relay), the friend's ship
// flies in the host's game from the friend's controls, the friend sees the host's enemies, and a kill the friend lands pays
// the friend's own save. Writes shots/coop/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/coop';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch();
const open=async name=>{const c=await browser.newContext({viewport:{width:1100,height:700}}),p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(name+': '+e.message));await p.goto(url);await p.waitForFunction(()=>window.coop?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill(name);await p.locator('#btn-title-quick').click();
 /* co-op runs on the real game loop, so take off properly: finish the first ship (Use premade) and let the title close */
 await p.waitForFunction(()=>window.starterJourney?.active||!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{if(starterJourney.active)starterJourney.finish(true);garage.closeMission();});
 await p.waitForFunction(()=>!document.body.classList.contains('at-title'),null,{timeout:15000});
 await p.evaluate(()=>{garage.closeMission();galaxy.enterSystemById('home');worldMap.currentGridX=2;worldMap.currentGridY=2;engine.enterChamber({silent:true});garage.closeMission();engine.enemies=[];terrain.off=true;engine.player.iFrames=1e9;});await p.waitForTimeout(300);await p.evaluate(()=>{garage.closeReward?.();garage.closeMission();engine.paused=false;});return p;};
try{
 const H=await open('HOSTER'),G=await open('GUESTY');
 // 1 · the Co-op door and the code handshake, no ICE servers
 report.data.door=await H.evaluate(()=>!!document.getElementById('btn-coop'));
 const offer=await H.evaluate(()=>coop.host());const answer=await G.evaluate(c=>coop.join(c),offer);await H.evaluate(c=>coop.acceptAnswer(c),answer);
 await H.waitForFunction(()=>coop.connected);await G.waitForFunction(()=>coop.connected);await H.waitForFunction(()=>!!coop.ally,null,{timeout:10000});
 report.data.link={door:report.data.door,offer:offer.slice(0,5),len:offer.length,stun:await H.evaluate(()=>!!menu.settings().coopStun),hostRole:await H.evaluate(()=>coop.role),guestRole:await G.evaluate(()=>coop.role)};
 check('the pause menu has a Co-op door; an invite code and an answer code link two browsers with no relay or STUN',report.data.link.door&&report.data.link.offer==='BCO1.'&&!report.data.link.stun&&report.data.link.hostRole==='host'&&report.data.link.guestRole==='guest',report.data.link);
 // 2 · the friend's ship appears in the host's game, built from the friend's design
 report.data.ally=await H.evaluate(()=>({name:coop.ally.name,hull:coop.ally.design?.modular?.hull,guns:coop.ally.guns.length,hp:coop.ally.hp}));
 check('the friend\'s ship joins the host\'s sector with the friend\'s own design and guns',report.data.ally.name==='GUESTY'&&report.data.ally.hull&&report.data.ally.guns>0&&report.data.ally.hp>0,report.data.ally);
 // 3 · the friend flies it
 const x0=await H.evaluate(()=>coop.ally.x);await G.keyboard.down('KeyD');await G.waitForTimeout(1500);await G.keyboard.up('KeyD');
 report.data.fly={moved:Math.round(await H.evaluate(()=>coop.ally.x)-x0)};
 check('the friend\'s controls fly the ship in the host\'s game',report.data.fly.moved>100,report.data.fly);
 // 4 · the friend sees the host's world
 await H.evaluate(()=>{const P=engine.player;for(let i=0;i<3;i++){const e=new EnemyOrganism(P.x+500+i*90,P.y-200,{tier:1,archetype:'stalker'});e.update=()=>{};engine.enemies.push(e);}});await G.waitForTimeout(800);
 report.data.view=await G.evaluate(()=>({enemies:engine.enemies.length,proxies:engine.enemies.every(e=>e._coopProxy),host:!!coop.snap?.host}));
 await G.screenshot({path:`${out}/guest.png`});await H.screenshot({path:`${out}/host.png`});
 check('the friend sees the host\'s enemies and the host\'s ship',report.data.view.enemies===3&&report.data.view.proxies&&report.data.view.host,report.data.view);
 // 5 · personal loot: the friend's kill pays the friend
 const hostMetal0=await H.evaluate(()=>{engine.enemies=[];const a=coop.ally,e=new EnemyOrganism(a.x+260,a.y,{tier:3,archetype:'stalker'});e.update=()=>{};e.hp=e.maxHp=1;e.shield=0;e.nodes=e.nodes.filter(n=>n.type==='core');engine.enemies.push(e);window.__target=e;return hubs.metal;});
 const guestMetal0=await G.evaluate(()=>hubs.metal);
 await G.evaluate(()=>{const read=engine.readInput;window.__read=read;engine.readInput=function(){const t=engine.enemies[0],P=engine.player;return this.input={ax:0,ay:0,aimX:t?t.x:P.x+260,aimY:t?t.y:P.y,fire:true};};});
 await H.waitForFunction(()=>window.__target.hp<=0||!engine.enemies.includes(window.__target),null,{timeout:10000}).catch(()=>{});await G.waitForTimeout(600);
 await G.evaluate(()=>{engine.readInput=window.__read;});
 report.data.loot={killed:await H.evaluate(()=>!engine.enemies.includes(window.__target)),guestGain:await G.evaluate(m=>hubs.metal-m,guestMetal0),hostGain:await H.evaluate(m=>hubs.metal-m,hostMetal0),rewards:await G.evaluate(()=>coop.stats.rewards)};
 check('a kill the friend lands pays the friend\'s own save, not the host\'s',report.data.loot.killed&&report.data.loot.guestGain>0&&report.data.loot.hostGain===0,report.data.loot);
 // 6 · leaving
 await G.evaluate(()=>coop.close());await H.waitForFunction(()=>!coop.connected,null,{timeout:10000});
 report.data.leave={host:await H.evaluate(()=>({connected:coop.connected,ally:!!coop.ally})),guest:await G.evaluate(()=>coop.connected)};
 check('leaving unlinks both sides and the friend\'s ship leaves the host\'s game',!report.data.leave.host.connected&&!report.data.leave.host.ally&&!report.data.leave.guest,report.data.leave);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('coop witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
