import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,mkdir} from 'node:fs/promises';
import {resolve,normalize,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=resolve(root,normalize(decodeURIComponent(url.pathname)).replace(/^\/+/,'')||'index.html');
 if(!p.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{const bytes=await readFile(p);res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(bytes);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port+'/';
let browser;
try{
 let path=process.env.CHROME_PATH||'';
 for(const candidate of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'])if(!path){try{await access(candidate);path=candidate;}catch{}}
 assert.ok(path,'Chromium is required to verify XI interaction');
 browser=await chromium.launch({executablePath:path,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await mkdir('.browser-qa',{recursive:true});
 for(const [width,height] of [[390,844],[1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<600});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#create-form button[type="submit"]').click();
  await page.waitForSelector('.career-hq');
  const go=async name=>{await page.evaluate(id=>document.querySelector('[data-nav="'+id+'"]').click(),name);await page.waitForTimeout(30);};
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('club-dynasty-v2')));
  await go('tactics');
  assert.equal(await page.locator('#starting-pitch .formation-player').count(),11);
  assert.equal(await page.locator('#lineup-picker .lineup-player').count(),26);
  assert.equal(await page.locator('.lineup-slot-grid [data-action="select-slot"]').count(),11);
  const initial=await saved(),formation=initial.formation;
  const bench=initial.players.find(p=>!initial.lineups[formation].includes(p.id)&&p.injury===0);
  assert.ok(bench,'Need a fit substitute');
  // Select a field position, remove the player and persist an empty slot.
  const geometry=await page.locator('#starting-pitch .formation-player[data-slot="5"]').evaluate(el=>{
   const r=el.getBoundingClientRect(),at=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2);
   return {center:[Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)],pointerEvents:getComputedStyle(el).pointerEvents,
    pitchPointerEvents:getComputedStyle(document.querySelector('#starting-pitch')).pointerEvents,
    hit:at.slice(0,5).map(x=>x.tagName.toLowerCase()+(x.className?.baseVal||x.className||''))};
  });
  console.log('XI pitch touch test '+width+': '+JSON.stringify(geometry));
  if(width===390){
   await page.touchscreen.tap(geometry.center[0],geometry.center[1]);
  }else{
   await page.mouse.click(geometry.center[0],geometry.center[1]);
  }
  await page.waitForSelector('#lineup-picker [data-action="unassign-slot"]',{timeout:9000});
  await page.waitForSelector('[data-action="unassign-slot"]');
  await page.locator('[data-action="unassign-slot"]').click();
  let state=await saved();
  assert.equal(state.lineups[formation][5],null,'Remove did not persist');
  assert.ok((await page.locator('.lineup-toolbar').innerText()).includes('10/11'));
  assert.ok((await page.locator('#starting-pitch [data-slot="5"]').innerText()).includes('VAGA'));
  await page.screenshot({path:'.browser-qa/lineup-empty-'+width+'.png'});
  // Fill an empty position using the player-picker button.
  await page.locator('#lineup-picker [data-action="swap-slot"][data-id="'+bench.id+'"]').click();
  state=await saved();
  assert.equal(state.lineups[formation][5],bench.id,'Substitute not assigned to lineup');
  assert.equal(new Set(state.lineups[formation]).size,11);
  assert.ok((await page.locator('.lineup-toolbar').innerText()).includes('11/11'));
  // Swap two starters directly via the same player list.
  const original5=state.lineups[formation][5],starter8=state.lineups[formation][8];
  await page.locator('.lineup-slot-grid [data-slot="5"]').click();
  await page.locator('#lineup-picker [data-action="swap-slot"][data-id="'+starter8+'"]').click();
  state=await saved();
  assert.equal(state.lineups[formation][5],starter8);
  assert.equal(state.lineups[formation][8],original5);
  assert.equal(new Set(state.lineups[formation]).size,11);
  // Bench-first flow: choose a footballer then tap the pitch.
  const spare=state.players.find(p=>!state.lineups[formation].includes(p.id)&&p.injury===0);
  await page.locator('#lineup-picker [data-action="pick-player"][data-id="'+spare.id+'"]').click();
  assert.ok((await page.locator('.lineup-selection').innerText()).includes(spare.name));
  await page.locator('.lineup-slot-grid [data-slot="6"]').click();
  state=await saved();
  assert.equal(state.lineups[formation][6],spare.id,'Bench-first pick did not place player');
  await page.screenshot({path:'.browser-qa/lineup-active-'+width+'.png'});
  // Switching into squad and choosing a card should preserve that choice as a pitch candidate.
  await go('squad');
  await page.locator('.football-card').first().click();
  await page.locator('.player-dialog [data-action="lineup-from-card"]').click();
  await page.waitForSelector('#starting-pitch');
  assert.ok((await page.locator('.lineup-selection').innerText()).includes('JOGADOR ESCOLHIDO'));
  // Existing saves survive reloading. Old shapes are not lost.
  const beforeReload=await saved();
  await page.reload({waitUntil:'domcontentloaded'});
  await go('tactics');
  const after=await saved();
  assert.deepEqual(after.lineups[formation],beforeReload.lineups[formation]);
  assert.equal(after.players.length,26);
  assert.deepEqual(errors,[],'Browser errors while editing the starting XI');
  console.log('✓ '+width+'×'+height+': remove, bench assign, starter swap, bench-first pick, squad-to-XI, reload');
  await ctx.close();
 }
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
