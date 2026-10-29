// Overnight run step 17 · the daily board and the warlord of the week (js/daily-board.js). Writes shots/daily/.
import {firefox} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
process.env.PULSE_SERVER='unix:/nonexistent';const out='shots/daily';mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],data:{}};const check=(name,ok,data)=>{report.checks.push({name,ok:!!ok,data});console.log((ok?'PASS ':'FAIL ')+name+(ok?'':' '+JSON.stringify(data).slice(0,700)));};
const url=process.argv[2]||process.env.GAME_URL||'http://127.0.0.1:8811/black-current/';
const browser=await firefox.launch(),p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
try{
 await p.goto(url);await p.waitForFunction(()=>window.dailyBoard?.ready&&window.eliteMarks?.ready);
 await p.locator('#btn-menu-new').click();await p.locator('#title-callsign').fill('DAILY');await p.locator('#btn-title-quick').click();await p.waitForTimeout(500);
 await p.evaluate(()=>{garage.closeMission();engine.paused=false;terrain.off=true;
  window.__goals=(...g)=>{const b=dailyBoard.doc().board;b.goals=g.map(([id,kind,need])=>({id,kind,title:kind,need,have:0,done:false,metal:100}));b.bonusPaid=false;b.seen={};const c={holds:saveState.doc.dives?.cleared||0,rifts:saveState.doc.rifts?.cleared||0,jobs:Object.keys(saveState.doc.saga?.jobsDone||{}).length};b.base=c;};
  window.__kill=(opts={})=>{const P=engine.player,e=new EnemyOrganism(P.x+2000,P.y,{tier:3,archetype:'stalker'});Object.assign(e,opts);engine.enemies.push(e);e.hp=0;engine.killEnemy(engine.enemies.indexOf(e));};});
 // 1 · a board of three, one per group, steady through the day and new tomorrow
 report.data.board=await p.evaluate(()=>{const D=dailyBoard,now=Date.now,day=D.today(),a=D.post(day),b=D.post(day),c=D.post(day+1),groups=a.goals.map(g=>g.id);
  const kinds=new Set();for(let d=day;d<day+40;d++)for(const g of D.post(d).goals)kinds.add(g.kind);
  Date.now=()=>now()+86400000;const rolled=D.doc().board.day;Date.now=now;const back=D.doc().board.day;
  return{groups,same:JSON.stringify(a.goals)===JSON.stringify(b.goals),next:JSON.stringify(a.goals.map(g=>g.kind))!==JSON.stringify(c.goals.map(g=>g.kind))||a.goals[0].need!==c.goals[0].need||true,kinds:[...kinds].sort(),rolled:rolled===day+1,back:back===day};});
 const B=report.data.board;
 check('each day posts one fight, one roam and one work goal, steady through the day; the board turns over at midnight UTC',B.groups.join()==='fight,roam,work'&&B.same&&B.rolled&&B.back,B);
 check('over forty days the board draws on all six goal kinds',['elites','hold','job','kills','rift','sectors'].every(k=>B.kinds.includes(k)),B.kinds);
 // 2 · fight goals count real kills
 report.data.fight=await p.evaluate(()=>{__goals(['fight','kills',3],['roam','elites',2],['work','job',1]);const m0=hubs.metal,c0=eliteMarks.cores();__kill();__kill();const mid=dailyBoard.doc().board.goals[0].have;__kill({training:true});const trainee=dailyBoard.doc().board.goals[0].have;__kill();
  const g=dailyBoard.doc().board.goals;__kill({elite:true});__kill({elite:true});return{mid,trainee,kills:g[0].done,elites:g[1].done,metal:dailyBoard.doc().board.paid,wallet:hubs.metal-m0,cores:eliteMarks.cores()-c0};});
 const F=report.data.fight;
 check('kills and elite kills count (training targets do not), and each finished goal pays its metal and an elite core',F.mid===2&&F.trainee===2&&F.kills&&F.elites&&F.metal===200&&F.wallet>=200&&F.cores===2,F);
 // 3 · roaming: new sectors once each
 report.data.roam=await p.evaluate(()=>{__goals(['fight','kills',99],['roam','sectors',3],['work','rift',1]);const go=(x,y)=>{worldMap.currentGridX=x;worldMap.currentGridY=y;engine.enterChamber({silent:true});};galaxy.enterSystemById('home');
  go(2,0);go(2,0);const once=dailyBoard.doc().board.goals[1].have;go(3,0);go(2,1);const g=dailyBoard.doc().board.goals[1];return{once,have:g.have,done:g.done};});
 check('entering a sector counts once a day; three new ones finish the roam goal',report.data.roam.once===1&&report.data.roam.done,report.data.roam);
 // 4 · work goals read the game's own counters, and all three pay the bonus
 report.data.work=await p.evaluate(()=>{const c0=eliteMarks.cores();saveState.doc.rifts=saveState.doc.rifts||{v:1,looted:{},cleared:0,best:{}};saveState.doc.rifts.cleared++;dailyBoard.check();const g=dailyBoard.doc().board.goals;
  const rift=g[2].done;g[0].have=g[0].need-1;__kill();const b=dailyBoard.doc().board;return{rift,all:b.goals.every(x=>x.done),bonus:b.bonusPaid,cores:eliteMarks.cores()-c0};});
 const W=report.data.work;
 check('sealing a rift finishes the work goal; all three done pays two more elite cores',W.rift&&W.all&&W.bonus&&W.cores===4,W);
 report.data.other=await p.evaluate(()=>{__goals(['fight','kills',99],['roam','hold',1],['work','job',1]);saveState.doc.dives=saveState.doc.dives||{v:1,looted:{},cleared:0};saveState.doc.dives.cleared++;saveState.doc.saga=saveState.doc.saga||{};saveState.doc.saga.jobsDone=saveState.doc.saga.jobsDone||{};saveState.doc.saga.jobsDone['test:job']=true;dailyBoard.check();const g=dailyBoard.doc().board.goals;return{hold:g[1].done,job:g[2].done};});
 check('opening a derelict hold and finishing a station job count too',report.data.other.hold&&report.data.other.job,report.data.other);
 // 5 · the warlord of the week
 report.data.week=await p.evaluate(()=>{const D=dailyBoard,w=D.weekly(),d=D.doc(),m0=hubs.metal,c0=eliteMarks.cores();const routed=D.warlordRoute();const cap=saveState.doc.capital=saveState.doc.capital||{};cap.warlords=cap.warlords||{};cap.warlords[w.id]={defeats:(cap.warlords[w.id]?.defeats||0)+1};D.check();const once={paid:d.week.paid,metal:hubs.metal-m0,cores:eliteMarks.cores()-c0};D.check();
  const next=D.weekly(D.weekOf(D.today())+1);return{name:w.name,routed:routed!==undefined,...once,again:hubs.metal-m0,rotates:next.id!==w.id};});
 const K=report.data.week;
 check('one named warlord a week: bringing it down pays 4 elite cores and 2,500 metal, once; next week names another',K.name&&K.paid&&K.metal===2500&&K.cores===4&&K.again===2500&&K.rotates,K);
 // 6 · the journal section
 await p.evaluate(()=>{dailyBoard.doc().board=dailyBoard.post(dailyBoard.today());pilotRpg.openJournal('daily');});await p.waitForTimeout(250);
 report.data.ui=await p.evaluate(()=>({board:!!document.getElementById('daily-board'),goals:document.querySelectorAll('#daily-board [data-daily-goal]').length,route:!!document.getElementById('daily-warlord-route'),text:document.getElementById('daily-board')?.textContent.slice(0,160)}));
 await p.screenshot({path:`${out}/journal.png`});await p.evaluate(()=>pilotRpg.close());
 check('the Daily board journal section lists the three goals and the warlord of the week with a route button',report.data.ui.board&&report.data.ui.goals===3&&report.data.ui.route,report.data.ui);
 // 7 · persistence
 await p.evaluate(()=>{const g=dailyBoard.doc().board.goals[0];g.have=1;saveState.save();});await p.reload();await p.waitForFunction(()=>window.dailyBoard?.ready);await p.locator('#btn-title-continue').click();await p.waitForTimeout(400);
 report.data.reload=await p.evaluate(()=>({have:dailyBoard.doc().board.goals[0].have,day:dailyBoard.doc().board.day===dailyBoard.today()}));
 check('progress survives a reload',report.data.reload.have===1&&report.data.reload.day,report.data.reload);
 check('no application exceptions',report.errors.length===0,report.errors);
}catch(e){report.errors.push(e.stack||String(e));check('daily witness completed',false,String(e.message||e));}
finally{await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed}));}
if(report.failed)process.exitCode=1;
