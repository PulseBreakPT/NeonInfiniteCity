import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,mkdir} from 'node:fs/promises';
import {resolve,normalize,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(process.cwd()),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const raw=normalize(decodeURIComponent(new URL(req.url,'http://localhost').pathname)).replace(/^\/+/,'')||'index.html',p=resolve(root,raw);
 if(!p.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(p));}
 catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 let executable=process.env.CHROME_PATH||'';
 for(const p of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'])if(!executable){try{await access(p);executable=p;}catch{}}
 browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await mkdir('.browser-qa',{recursive:true});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 await context.addInitScript(() => {window.__CLUB_MATCH_TEST_RATE__=60;});
 let page=await context.newPage(),errors=[];
 const attach=()=>page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('club-dynasty-v2')));
 attach();
 const url='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#create-form button[type="submit"]').click();
 await page.waitForSelector('.career-hq');
 await page.evaluate(()=>window.__CLUB_MATCH_TEST_RATE__=1);
 await page.locator('.career-hq [data-action="match"]').click();
 await page.waitForSelector('.live-matchday');
 await page.waitForSelector('.spatial-ready #live-spatial-canvas');
 await page.waitForTimeout(180);
 const surface=await page.locator('#live-spatial-canvas').evaluate(canvas=>{
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const rgba=c.getImageData(0,0,w,h).data;let pixels=0;
  for(let i=3;i<rgba.length;i+=48)if(rgba[i]>20)pixels++;
  return {width:w,height:h,pixels};
 });
 assert.ok(surface.width>=240&&surface.height>=240&&surface.pixels>45,'Canvas tactical players not rendered '+JSON.stringify(surface));
 let s=await state(),live=s.liveMatch;
 assert.equal(live.schema,2,'Novo jogo tem de usar a física 11v11');
 assert.equal(live.world?.players.length,22,'O campo deve conter 22 jogadores');
 assert.ok(live.world?.ball&&Number.isFinite(live.world.ball.vx));
 // All four camera modes must paint the same live game without resetting it.
 const cameraControl=page.locator('[data-action="live-camera"]');
 assert.equal(await cameraControl.count(),1);
 assert.ok((await cameraControl.innerText()).includes('TV'));
 const frames=[];
 for(const label of ['EQUILIBRADA','LATERAL','TÁTICA','TV']){
  await cameraControl.click();
  await page.waitForTimeout(85);
  assert.ok((await cameraControl.innerText()).includes(label),'Camera '+label);
  const result=await page.locator('#live-spatial-canvas').evaluate(c=>{
   const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let lit=0;
   for(let i=3;i<a.length;i+=128)if(a[i]>0)lit++;
   return {w:c.width,h:c.height,lit};
  });
  assert.ok(result.w>240&&result.h>240&&result.lit>100,'Empty broadcast '+label);
  frames.push(label);
 }
 assert.equal((await state()).liveMatch.camera,'tv');
 await page.screenshot({path:'.browser-qa/broadcast-tv-android.png'});
 console.log('✓ 4 responsive broadcast cameras: '+frames.join(' / '));

 assert.ok(live,'Session should be persisted at kick-off');
 const balance=s.budget,round=s.league.round;
 // In real 1× playback, 36 fixed simulation steps MUST NOT complete in 320 ms.
 await page.evaluate(()=>window.__CLUB_MATCH_TEST_RATE__=1);
 await page.waitForTimeout(650);
 const pacing=await page.evaluate(()=>{
  // State is written periodically, so inspect the animated browser's visible clock
  // and canvas; save-state timing is verified by the pause below.
  const canvas=document.querySelector('#live-spatial-canvas');
  return {rendered:canvas?.width>0&&canvas?.height>0,
   clock:document.querySelector('#live-clock')?.textContent};
 });
 assert.ok(pacing.rendered,'A animação contínua tem de estar disponível em velocidade 1×');
 assert.equal(pacing.clock,"00'",'O motor não pode acelerar um minuto inteiro em 650 ms no modo 1×');
 await page.evaluate(()=>window.__CLUB_MATCH_TEST_RATE__=60);

 assert.equal(round,1);
 assert.equal(s.results.length,0);
 assert.equal(s.players[0].apps,0);
 assert.ok(live.total>=93);
 const firstClock=await page.locator('#live-clock').innerText();
 await page.locator('[data-action="live-pause"]').click();
 const paused=await page.locator('#live-clock').innerText();
 await page.waitForTimeout(500);
 assert.equal(await page.locator('#live-clock').innerText(),paused);
 assert.equal((await state()).budget,balance);
 await page.screenshot({path:'.browser-qa/live-kickoff-android.png'});
 // Reload a saved, paused match: the same kick-off is resumed without giving points.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('.live-matchday');
 assert.equal((await state()).league.round,1);
 assert.equal(await page.locator('#live-clock').innerText(),paused);
 await page.locator('[data-action="live-speed"]').click();
 await page.locator('[data-action="live-speed"]').click();
 await page.locator('[data-action="live-pause"]').click();
 await page.waitForFunction(()=>{
  const s=JSON.parse(localStorage.getItem('club-dynasty-v2'));
  return s?.liveMatch?.phase==='halftime'||s?.liveMatch?.minute>45+s?.liveMatch?.firstAdded;
 },null,{timeout:30000});
 s=await state();assert.equal(s.league.round,1,'Half-time must not commit results');
 assert.ok(s.liveMatch.world.tick>1000,'A física deve avançar ao longo da primeira parte');
 assert.equal(s.budget,balance);
 await page.screenshot({path:'.browser-qa/live-halftime-android.png'});
 await page.waitForFunction(()=>{
  const s=JSON.parse(localStorage.getItem('club-dynasty-v2'));
  return s&&!s.liveMatch&&s.league.round===2;
 },null,{timeout:45000});
 s=await state();
 assert.equal(s.results.length,1);
 assert.equal(s.lastMatch.engine,'physics-v2');
 assert.equal(s.lastMatch.hg+s.lastMatch.ag,s.lastMatch.events.filter(e=>e.kind==='goal').length);
 assert.equal(s.league.round,2);
 assert.equal(s.week,2);
 assert.ok(s.lastMatch?.events.some(e=>e.kind==='end'));
 assert.ok(await page.locator('#match-timeline:not([disabled])').count());
 assert.equal(s.finance.debt,0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'.browser-qa/live-fulltime-android.png'});
 console.log('✓ Android live match: kickoff/pause/save/reload/added halftime/90+stoppage/final-only league update');
 await context.close();
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
