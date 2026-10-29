/* Actual game UI at phone sizes. Fresh profile, real menus; no player save is touched. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const { firefox } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const url = process.env.GAME_URL || 'http://127.0.0.1:8811/';
const out = resolve('shots/phone-layout'); mkdirSync(out, { recursive: true });
const report = { browser: 'firefox', checks: [], errors: [] };
const check = (name, ok, detail = null) => { report.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + JSON.stringify(detail)}`); };
const browser = await firefox.launch();
async function bounds(page, selector) {
  return page.locator(selector).evaluate(element => {
    const r = element.getBoundingClientRect(), style = getComputedStyle(element);
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { width: r.width, height: r.height, visible: style.display !== 'none' && style.visibility !== 'hidden'
      && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
      reachable: hit === element || element.contains(hit), rect: { x:r.x,y:r.y,width:r.width,height:r.height } };
  });
}
async function tap(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.locator(selector).tap();
  await page.waitForTimeout(120);
}
try {
  const context = await browser.newContext({ viewport: { width:390,height:844 }, hasTouch: true });
  await context.route('**/*', route => route.request().url().startsWith(new URL(url).origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
  for (const viewport of [{width:390,height:844},{width:844,height:390},{width:360,height:740},{width:740,height:360}]) {
    const name = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.menu && window.hubs && window.starterJourney?.ready && document.documentElement.classList.contains('mobile-layout'));
    await page.waitForTimeout(180);
    for (const id of ['btn-menu-new','btn-menu-builder','btn-menu-settings','btn-menu-howto','btn-menu-credits']) {
      const r = await bounds(page, '#' + id);
      check(`${name} title ${id} is reachable with a 44px target`, r.visible && r.reachable && r.height >=44, r);
    }
    await page.screenshot({path:`${out}/title-${name}.png`});
    await tap(page,'#btn-menu-settings');
    let r = await bounds(page,'#btn-panel-back');
    check(`${name} settings Back stays reachable`,r.visible&&r.reachable&&r.height>=44,r);
    {await page.locator('.set-row input[type=range]').first().waitFor();await page.waitForTimeout(150);const sl=await page.locator('.set-row input[type=range]').evaluateAll(nodes=>nodes.map(n=>({id:n.id,h:+n.getBoundingClientRect().height.toFixed(2)})));check(`${name} settings sliders have touch-sized targets`,sl.length>=3&&sl.every(n=>n.h>=44),sl);}
    await page.screenshot({path:`${out}/settings-${name}.png`});
    await tap(page,'#btn-panel-back');
    await page.evaluate(()=>{document.getElementById('title-callsign').value='PHONE';if(saveState.doc.launched)garage.launch(true);else document.getElementById('btn-title-quick').click();   /* Build my ship opens the first-ship workshop */garage.closeMission();});
    await page.waitForTimeout(250);
    check(`${name} resources stay in the compact status card`,await page.evaluate(()=>document.querySelector('.organism-info .mass-row #hud-mass-count')!==null));
    const ids=['btn-touch-ability','btn-touch-pause','btn-touch-designer','btn-touch-map','btn-touch-build','btn-phone-contracts'];
    const rectangles=[];
    for (const id of ids) rectangles.push({id,...await bounds(page,'#'+id)});
    check(`${name} all six actions fit and can be tapped`,rectangles.every(r=>r.visible&&r.reachable&&r.width>=44&&r.height>=44),rectangles);
    check(`${name} actions do not cover the lower-left thumb area`,rectangles.every(r=>r.rect.x>=viewport.width/2),rectangles);
    check(`${name} desktop action row is hidden`,!await page.locator('.hud-center-actions').isVisible());
    await page.screenshot({path:`${out}/flight-${name}.png`});
await page.click('#btn-reactor-stingers'); check('phone ship-system buttons switch the reactor (GUNS)', await page.evaluate(() => reactor.mode === 'stingers' && document.getElementById('btn-reactor-stingers').getAttribute('aria-pressed') === 'true')); await page.screenshot({ path: `${out}/systems-740x360.png` });
    await tap(page,'#btn-phone-contracts');
    check(`${name} Jobs opens the existing contracts`,await page.locator('#contracts').isVisible()&&await page.locator('#btn-phone-contracts').getAttribute('aria-expanded')==='true');
    check(`${name} Jobs exposes all three contracts`,await page.locator('#contracts .ct:visible').count()===3);
    r=await bounds(page,'#contracts');
    check(`${name} contract drawer receives touches above the world`,r.visible&&r.reachable,r);
    await tap(page,'#btn-phone-contracts');
    check(`${name} Jobs closes without blocking flight`,!await page.locator('#contracts').isVisible()&&await page.evaluate(()=>!engine.paused));
    await tap(page,'#btn-touch-pause');
    r=await bounds(page,'#btn-pause-resume');
    check(`${name} pause Resume is reachable`,await page.evaluate(()=>menu.isPaused())&&r.visible&&r.reachable&&r.height>=44,r);
    check(`${name} flight controls step aside while paused`,!await page.locator('.mobile-action-bar').isVisible());
    await page.screenshot({path:`${out}/pause-${name}.png`});
    await tap(page,'#btn-pause-resume');
    await tap(page,'#btn-touch-map');
    r=await bounds(page,'#btn-close-map');
    check(`${name} chart Close is visible without hunting`,r.visible&&r.reachable&&r.height>=44,r);
    await tap(page,'#chart-tab-galaxy');
    r=await bounds(page,'#btn-close-map');
    check(`${name} galaxy Close stays reachable`,r.visible&&r.reachable,r);
    await page.screenshot({path:`${out}/chart-${name}.png`});
    await tap(page,'#btn-close-map');
    await tap(page,'#btn-touch-build');
    check(`${name} build panel uses the real structure cards (one per structure kind)`,await page.locator('#build-panel').isVisible()&&await page.locator('#build-list .build-card').count()===await page.evaluate(()=>Object.keys(hubs.KINDS).length));
    await page.locator('#build-close').scrollIntoViewIfNeeded();
    r=await bounds(page,'#build-close');
    check(`${name} build Close remains reachable after scrolling`,r.visible&&r.reachable&&r.height>=44,r);
    await page.screenshot({path:`${out}/build-${name}.png`});
    await tap(page,'#build-close');
    await page.evaluate(()=>{engine.player.x=40;engine.player.y=0;hubs.openDock();});
    check(`${name} real dock opens`,await page.locator('#dock-panel').isVisible());
    await page.locator('#dock-undock').scrollIntoViewIfNeeded();
    r=await bounds(page,'#dock-undock');
    check(`${name} Undock fits and remains reachable`,r.visible&&r.reachable&&r.height>=44,r);
    // The blueprint market is retired stock (quartermaster.js); the station's service tiles are the live actions.
    check(`${name} station service tiles are finger-sized`,await page.locator('#station-services button').evaluateAll(nodes=>nodes.length===8&&nodes.every(n=>n.getBoundingClientRect().height>=44)));
    await page.screenshot({path:`${out}/dock-${name}.png`});
    await tap(page,'#dock-undock');
    check(`${name} page has no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  // Prove the bounds assertion catches a deliberately broken layout in this isolated page.
  const defect=await page.addStyleTag({content:'.mobile-layout .mobile-action-bar{right:-100px!important}'});
  check('known off-screen control defect is detected',!(await bounds(page,'#btn-touch-ability')).visible);
  await defect.evaluate(n=>n.remove());
  await page.setViewportSize({width:1366,height:768});
  await page.waitForTimeout(100);
  check('resizing to desktop restores resources and desktop actions',await page.evaluate(()=>!document.documentElement.classList.contains('mobile-layout')&&!!document.querySelector('.vitals-card .mass-row'))&&await page.locator('.hud-center-actions').isVisible());
  const desktop=await browser.newContext({viewport:{width:1366,height:768}});
  await desktop.route('**/*',route=>route.request().url().startsWith(new URL(url).origin)?route.continue():route.abort());
  const dp=await desktop.newPage();dp.on('pageerror',e=>report.errors.push(e.message));
  await dp.goto(url);await dp.waitForFunction(()=>window.menu&&window.hubs);
  check('desktop defaults retain their original layout',await dp.evaluate(()=>!document.documentElement.classList.contains('mobile-layout')&&!!document.querySelector('.vitals-card .mass-row')));
  const standalone=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  await standalone.route('**/*',route=>route.request().url().startsWith(new URL(url).origin)?route.continue():route.abort());
  const sp=await standalone.newPage();sp.on('pageerror',e=>report.errors.push(e.message));
  await sp.goto(new URL('dist/black-current.html',url).href);
  await sp.waitForFunction(()=>window.menu&&window.sprites?.ready&&document.documentElement.classList.contains('mobile-layout'));
  await sp.waitForFunction(()=>window.starterJourney?.ready);
  await sp.evaluate(()=>{document.getElementById('title-callsign').value='DOWNLOAD';document.getElementById('btn-title-quick').click();garage.closeMission();});
  await sp.waitForTimeout(200);
  const downloadBounds=await Promise.all(['#btn-touch-ability','#btn-touch-pause','#btn-touch-designer','#btn-touch-map','#btn-touch-build','#btn-phone-contracts'].map(selector=>bounds(sp,selector)));
  check('standalone download includes the working phone layout',downloadBounds.every(r=>r.visible&&r.reachable&&r.width>=44&&r.height>=44),downloadBounds);
  check('no application exceptions',report.errors.length===0,report.errors);
} finally {
  await browser.close();report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;
  writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.passed}/${report.checks.length} passed`);
if(report.failed)process.exitCode=1;
