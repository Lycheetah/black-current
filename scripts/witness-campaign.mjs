// Route 2 Stage 3 · the campaign: three acts, canon cast, set pieces (convoy, siege, Black Sun chase), station jobs and
// reputation per civilisation. Writes shots/campaign/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/campaign';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.saga?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('CAPTAIN');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();engine.player.iFrames=1e9;window.__tick=n=>{for(let i=0;i<n;i++){engine.paused=false;engine.mapOpen=false;engine.update(1/60);}};
  window.__go=(sys,gx,gy,x=0,y=0)=>{if(galaxy.currentId!==sys){galaxy.doc().visited.push(sys);galaxy.enterSystemById(sys);}worldMap.currentGridX=gx;worldMap.currentGridY=gy;engine.enterChamber({silent:true});const P=engine.player;P.x=x;P.y=y;P.vx=P.vy=0;P.iFrames=1e9;};
  window.__clear=()=>{for(let k=engine.enemies.length-1;k>=0;k--){engine.enemies[k].hp=0;engine.killEnemy(k);}};});
 // 1 · Act I: checks on the save chain through, each paying and speaking
 report.data.act1=await p.evaluate(()=>{const S=saga,m0=hubs.metal,first=S.current.id,speaker0=S.envoyName('cosmic-darkness');
  saveState.doc.firstExpedition.stage='done';S.check();const a=S.current.id;
  const hub=galaxy.data.systems.find(s=>s.hub&&!s.home);__go(hub.id,0,0);engine.paused=false;hubs.openDock();hubs.closeDock();S.check();const b=S.current.id;
  saveState.doc.dives={...(saveState.doc.dives||{}),cleared:1};S.check();saveState.doc.rifts={...(saveState.doc.rifts||{}),cleared:1};S.check();
  return{first,a,b,now:S.current.id,act:S.current.act,paid:hubs.metal-m0,log:S.doc().log.length,speaker0,hub:hub.id};});
 const A=report.data.act1;
 check('Act I chains through the expedition, another anchorage, a derelict and a rift, paying metal and speaking each step',A.first==='expedition'&&A.a==='anchorage'&&A.b==='derelict'&&A.now==='banner'&&A.act===1&&A.paid>=1170&&A.log>=4,A);
 check('envoys are named for their civilisation\'s pantheon epithet (no invented names)',A.speaker0==='Envoy of Noctis, the Star-Cat',A.speaker0);
 // 2 · pledge at an anchorage: banner, canon rival, reputation both ways
 report.data.pledge=await p.evaluate(hub=>{__go(hub,0,0);engine.paused=false;hubs.openDock();const S=saga,id=quartermaster.faction(galaxy.current).id,ok=S.pledge();hubs.closeDock();const d=S.doc();return{ok,banner:d.banner,want:id,rival:d.rival,wantRival:S.RIVAL[id][0],rb:S.rep(d.banner),rr:S.rep(d.rival),next:S.current.id,bannerSys:d.bannerSys};},A.hub);
 const PL=report.data.pledge;
 check('pledging at an anchorage takes its civilisation as your banner and its canon rival as your enemy',PL.ok&&PL.banner===PL.want&&PL.rival===PL.wantRival&&PL.rb>0&&PL.rr<0&&PL.next==='convoy',PL);
 // 3 · the Riptide convoy: arrives in its sector, raiders target freighters, win when the convoy crosses
 report.data.convoy=await p.evaluate(()=>{const S=saga,pl=S.current&&S.STEPS.find(s=>s.id==='convoy').place();__go(pl.sys,pl.gx,pl.gy);__clear();__tick(100);const sc=S.scene;const r={rule:galaxy.data.byId[pl.sys].rule,started:sc?.kind,ships:sc?.ships?.length};
  __tick(60*7);r.raiders=engine.enemies.filter(e=>e.saga).length;r.aimed=engine.enemies.some(e=>e.sagaTarget&&sc.ships.includes(e.sagaTarget));
  const f=sc.ships[0],hp0=f.hp;engine.projectiles.push(new Projectile(f.x,f.y,0,0,{damage:50,isPlayer:false}));__tick(1);r.hurt=hp0-f.hp;
  for(const s of sc.ships)s.x=0.81*sc.R;__clear();__tick(5);r.after=S.current.id;r.scene=!!S.scene;return r;});
 const C=report.data.convoy;
 check('the convoy set piece runs in a Riptide sector: freighters cross, raiders hunt them, hits hurt them, arrival completes it',C.rule==='riptide'&&C.started==='convoy'&&C.ships===3&&C.raiders>0&&C.aimed&&C.hurt>=50&&C.after==='siege'&&!C.scene,C);
 // 4 · the siege: berth sealed, waves, the station shield, a win when every wave falls
 report.data.siege=await p.evaluate(()=>{const S=saga,pl=S.STEPS.find(s=>s.id==='siege').place();__go(pl.sys,0,0,900,0);__tick(100);const sc=S.scene;const r={started:sc?.kind,waves:sc?.waves};
  engine.player.x=0;engine.player.y=0;hubs.openDock();r.sealed=!hubs.docked;engine.player.x=900;
  const sh=sc.shield;engine.projectiles.push(new Projectile(0,0,0,0,{damage:40,isPlayer:false}));__tick(1);r.shieldHit=sh-sc.shield;
  for(let k=0;k<12&&S.scene;k++){__clear();__tick(3);}r.after=S.current.id;return r;});
 const G=report.data.siege;
 check('the siege seals the berth, hostile fire drains the station shield, and breaking every wave completes it',G.started==='siege'&&G.waves===4&&G.sealed&&G.shieldHit>=40&&G.after==='chase',G);
 // 5 · the Black Sun chase: the courier runs for the rim; reaching it fails the step; killing it wins
 report.data.chase=await p.evaluate(()=>{const S=saga,pl=S.STEPS.find(s=>s.id==='chase').place();__go(pl.sys,pl.gx,pl.gy);__clear();__tick(100);let sc=S.scene;const r={rule:galaxy.data.byId[pl.sys].rule,started:sc?.kind};
  const c=sc.courier,d0=Math.hypot(c.x-sc.escape.x,c.y-sc.escape.y);__tick(120);r.closing=d0-Math.hypot(c.x-sc.escape.x,c.y-sc.escape.y);
  c.x=sc.escape.x;c.y=sc.escape.y;__tick(2);r.failed=!S.scene&&S.current.id==='chase';
  __go('home',3,3);__go(pl.sys,pl.gx,pl.gy);__clear();__tick(100);sc=S.scene;r.retry=sc?.kind;sc.courier.hp=0;engine.killEnemy(engine.enemies.indexOf(sc.courier));__tick(2);r.after=S.current.id;r.act=S.current.act;return r;});
 const H=report.data.chase;
 check('the Black Sun chase: the courier runs for the rim; letting it escape fails and can be retried; killing it completes Act II',H.rule==='blacksun'&&H.started==='chase'&&H.closing>50&&H.failed&&H.retry==='chase'&&H.after==='citadel'&&H.act===2,H);
 // 6 · Act III and the end
 report.data.act3=await p.evaluate(()=>{const S=saga;saveState.doc.capital={v:1,citadels:{'x':Date.now()},warlords:{}};S.check();const a=S.current.id;saveState.doc.capital.warlords={w:{defeats:1}};S.check();const b=S.current.id;saveState.defeatBoss('GRAVE CHOIR GUARDIAN');S.check();return{a,b,end:S.current,acts:S.doc().acts};});
 check('Act III: a citadel, a warlord, then the Grave Choir guardian ends the campaign with all three acts rewarded',report.data.act3.a==='warlord'&&report.data.act3.b==='choir'&&report.data.act3.end===null&&report.data.act3.acts.length===3,report.data.act3);
 // 7 · jobs: offers rotate per station, a bounty pays metal and reputation, a courier pays on docking at its destination
 report.data.jobs=await p.evaluate(hub=>{const S=saga;__go(hub,0,0);engine.paused=false;hubs.openDock();const offers=S.offers(),again=S.offers();
  const civId=offers[0].civ,r0=S.rep(civId),m0=hubs.metal;const bounty={...offers[0],kind:'bounty',gx:1,gy:1,key:'test:bounty'};S.takeJob(bounty);hubs.closeDock();__go(hub,1,1);__clear();__tick(100);const sc=S.scene;sc.target.hp=0;engine.killEnemy(engine.enemies.indexOf(sc.target));__tick(2);
  const r={offers:offers.length,stable:JSON.stringify(offers)===JSON.stringify(again),bountyKind:sc?.kind,paid:hubs.metal-m0,rep:S.rep(civId)-r0,job:S.doc().job};
  const dest=galaxy.data.systems.find(s=>s.hub&&!s.home&&s.id!==hub)||galaxy.data.byId.home;__go(hub,0,0);engine.paused=false;hubs.openDock();S.takeJob({...offers[0],kind:'courier',dest:dest.id,key:'test:courier',pay:300});hubs.closeDock();
  const m1=hubs.metal;__go(dest.id,0,0);engine.paused=false;hubs.openDock();r.courierPaid=hubs.metal-m1;r.courierDone=!S.doc().job;hubs.closeDock();return r;},A.hub);
 const J=report.data.jobs;
 check('each station posts three jobs that hold steady through the two-hour window',J.offers===3&&J.stable,J);
 // the home dock (rings 0–9, inner rings protected) must post jobs too, every one outside ring 3, and return at once
 report.data.homeJobs=await p.evaluate(()=>{const t0=performance.now();const sys=galaxy.data.byId.home,all=[];for(let e=0;e<40;e++){const now=Date.now;Date.now=()=>now()+e*saga.CFG.jobEpochMs;try{all.push(...saga.offers(sys));}finally{Date.now=now;}}
  const field=all.filter(o=>o.kind==='bounty'||o.kind==='escort');return{n:all.length,field:field.length,inner:field.filter(o=>Math.max(Math.abs(o.gx),Math.abs(o.gy))<=3).length,ms:+(performance.now()-t0).toFixed(1)};});
 check('the home dock posts jobs in every window, with field jobs beyond the protected inner rings',report.data.homeJobs.n===120&&report.data.homeJobs.field>0&&report.data.homeJobs.inner===0&&report.data.homeJobs.ms<500,report.data.homeJobs);
 check('a bounty spawns its marked hull in the job sector and pays metal and reputation',J.bountyKind==='bounty'&&J.paid>0&&J.rep>0&&!J.job,J);
 check('a courier job pays when you dock at its destination',J.courierPaid>=300&&J.courierDone,J);
 // 8 · reputation tiers: Hostile stations refuse; Trusted refunds; Honoured unlocks the livery
 report.data.rep=await p.evaluate(hub=>{const S=saga;__go(hub,0,0);engine.paused=false;hubs.openDock();const id=quartermaster.faction(galaxy.current).id,d=S.doc();
  d.rep[id]=-300;const refused=S.takeJob({...S.offers()[0],key:'test:hostile'});d.rep[id]=750;S.addRep(id,0);const paint=!!shipIdentity.PAINTS['civ-'+id];hubs.closeDock();
  return{tier:S.tier(id),refused:!refused,paint,tiers:[-200,0,120,320,800,1600].map(v=>{d.rep.x=v;return S.tier('x');})};},A.hub);
 const T=report.data.rep;
 check('reputation tiers: Hostile stations will not hire you; Honoured adds the civilisation livery',T.refused&&T.paint&&T.tier==='Honoured'&&T.tiers.join()==='Hostile,Stranger,Known,Trusted,Honoured,Exalted',T);
 // 9 · journal, tracker and persistence
 await p.evaluate(()=>{pilotRpg.openJournal('main');});await p.waitForTimeout(200);report.data.ui=await p.evaluate(()=>({journal:!!document.getElementById('saga-journal'),tracker:!!document.getElementById('saga-tracker')}));await p.screenshot({path:`${out}/journal.png`});await p.evaluate(()=>pilotRpg.close());
 check('the Campaign section is in the journal and the tracker sits in the contracts panel',report.data.ui.journal&&report.data.ui.tracker,report.data.ui);
 await p.evaluate(()=>saveState.save());await p.reload();await p.waitForFunction(()=>window.saga?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(()=>({step:saga.doc().step,banner:saga.doc().banner,acts:saga.doc().acts.length}));
 check('the campaign survives a reload',report.data.reload.step===11&&!!report.data.reload.banner&&report.data.reload.acts===3,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('campaign witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
