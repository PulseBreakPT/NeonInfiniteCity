import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,mkdir} from 'node:fs/promises';
import {resolve,normalize,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve('.'),mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const path=resolve(root,normalize(decodeURIComponent(new URL(req.url,'http://localhost').pathname)).replace(/^\/+/,'')||'index.html');
 if(!path.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{const buf=await readFile(path);res.writeHead(200,{'Content-Type':mimes[extname(path)]||'application/octet-stream'});res.end(buf);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 let binary=process.env.CHROME_PATH||'';
 for(const candidate of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'])if(!binary){try{await access(candidate);binary=candidate;}catch{}}
 browser=await chromium.launch({executablePath:binary,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 await mkdir('.browser-qa',{recursive:true});
 for(const [width,height] of [[390,844],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600});
  await context.addInitScript(() => {window.__CLUB_MATCH_TEST_RATE__=60;});
 let page=await context.newPage();const errors=[];
  page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>errors.push(error.message));
  const url='http://127.0.0.1:'+server.address().port+'/';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#create-form button[type="submit"]').click();
  await page.waitForSelector('.career-hq');
  const mutate=await page.evaluate(()=>{
   const key='club-dynasty-v2',s=JSON.parse(localStorage.getItem(key));
   s.budget=0;s.finance.debt=730000;s.finance.unpaidWages=230000;
   delete s.finance.economyRevision;s.season=5;
   s.players.forEach(p=>p.contract=0);
   const name=s.club.name,number=s.players.length;
   localStorage.setItem(key,JSON.stringify(s));
   return {name,number};
  });
  // A second tab reads the legacy save as a genuine cold start; reloading the
  // original tab would trigger its beforeunload handler and overwrite the fixture.
  page=await context.newPage();
  page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.career-hq');
  const get=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('club-dynasty-v2')));
  let s=await get();
  assert.equal(s.budget,450000);
  assert.equal(s.finance.debt,0);
  assert.equal(s.finance.economyRevision,4);
  assert.equal(s.players.length,mutate.number);
  assert.ok(s.players.every(p=>p.contract>=2));
  const originalBalance=s.budget;
  await page.evaluate(()=>document.querySelector('[data-nav="finance"]').click());
  await page.waitForSelector('.finance-forecast');
  assert.ok((await page.locator('.finance-forecast').innerText()).includes('Direitos televisivos'));
  assert.ok((await page.locator('.finance-forecast').innerText()).includes('SALDO RECORRENTE'));
  await page.screenshot({path:'.browser-qa/financial-recovery-'+width+'.png'});
  await page.evaluate(()=>document.querySelector('[data-nav="market"]').click());
  await page.waitForSelector('.market-card');
  const free=page.locator('.market-card [data-action="bid"]').filter({hasText:'CONTRATAR GRÁTIS'}).first();
  assert.ok(await free.isEnabled(),'Free-agent signing not available after recovery');
  await free.click();
  s=await get();
  assert.equal(s.players.length,mutate.number+1);
  assert.equal(s.budget,originalBalance,'A free agent must not consume transfer money');
  await page.screenshot({path:'.browser-qa/affordable-market-'+width+'.png'});
  await page.reload({waitUntil:'domcontentloaded'});
  s=await get();
  assert.equal(s.finance.ledger.filter(x=>x.label.includes('Capital de recuperação')).length,1);
  assert.equal(s.budget,originalBalance);
  await page.evaluate(()=>document.querySelector('[data-nav="matches"]').click());
  await page.waitForSelector('[data-action="match"]');
  await page.locator('[data-action="match"]').first().click();
  await page.waitForSelector('.live-matchday');
  await page.locator('[data-action="live-speed"]').click();
  await page.locator('[data-action="live-speed"]').click();
  await page.waitForSelector('#match-timeline:not([disabled])',{timeout:50000});
  s=await get();
  assert.ok(s.budget>=originalBalance-20000,'The first match should not cause a severe financial loss');
  assert.equal(s.finance.debt,0);
  assert.ok(s.players.every(p=>p.contract>0));
  assert.deepEqual(errors,[]);
  console.log('✓ '+width+'×'+height+': legacy contracts/debt recovered once; free agent signed; TV revenue and match work; no lost save');
  await context.close();
 }
}catch(err){console.error(err);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
