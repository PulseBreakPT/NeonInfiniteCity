import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,mkdir} from 'node:fs/promises';
import {join,extname,resolve,normalize} from 'node:path';
import {chromium} from 'playwright-core';

const root=resolve(process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const path=normalize(new URL(req.url,'http://localhost').pathname),relative=decodeURIComponent(path).replace(/^\/+/,'')||'index.html';
 const target=resolve(root,relative);
 if(!target.startsWith(root+'/')&&target!==root){res.writeHead(403);return res.end('Forbidden');}
 try{const bytes=await readFile(target);res.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}
 catch{res.writeHead(404);res.end('Not Found: '+relative);}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let executable=process.env.CHROME_PATH||'';
if(!executable){for(const path of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/opt/google/chrome/chrome']){try{await access(path);executable=path;break;}catch{}}}
assert.ok(executable,'Nenhum Chrome/Chromium disponível na runner');
let browser;
const fatal=[];
try{
 browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>fatal.push('JS: '+e.message));
 const url='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#create-form',{timeout:12000});
 await page.locator('#create-form button[type="submit"]').click();
 await page.waitForSelector('.universe-stage',{timeout:12000});
 assert.equal(await page.locator('.scene-hotspot').count(),5);
 assert.equal(await page.locator('.command-tile').count(),6);
 assert.ok((await page.locator('.stadium-scene-image').evaluate(x=>getComputedStyle(x).backgroundImage)).includes('stadium-isometric.svg'));
 await mkdir('.browser-qa',{recursive:true});
 await page.screenshot({path:'.browser-qa/desktop-stadium.png'});
 console.log('✓ Ecrã principal desktop: estádio, 5 hotspots e 6 comandos');
 await page.locator('.game-dock [data-nav="squad"]').click();
 await page.waitForSelector('.football-card');
 assert.equal(await page.locator('.football-card').count(),26);
 await page.screenshot({path:'.browser-qa/desktop-squad.png'});
 console.log('✓ Plantel com 26 cartas jogáveis');
 await page.locator('.game-dock [data-nav="matches"]').click();
 await page.waitForSelector('.pitch-camera-frame');
 await page.locator('.game-stage button[data-action="match"]').first().click();
 await page.waitForSelector('#match-timeline:not([disabled])',{timeout:12000});
 await page.locator('button[data-action="replay"]').first().click();
 await page.waitForTimeout(500);
 assert.ok((await page.locator('#live-minute').innerText()).includes('’'));
 await page.locator('button[data-action="replay-speed"]').click();
 await page.locator('button[data-action="replay-pause"]').click();
 await page.screenshot({path:'.browser-qa/desktop-broadcast.png'});
 console.log('✓ Motor de jogo, cronologia, pausa e velocidade no replay');
 for(const [width,height] of [[320,650],[360,640],[390,844],[768,1024]]){
  await page.setViewportSize({width,height});
  await page.locator('.mobile-nav [data-nav="dashboard"]').click();
  await page.waitForSelector('.scene-hotspot',{timeout:5000});
  const layout=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,bodyOverflow:getComputedStyle(document.body).overflow,hotspots:document.querySelectorAll('.scene-hotspot').length}));
  assert.ok(layout.documentWidth<=layout.viewportWidth+1,'Overflow horizontal em '+width+'×'+height+': '+JSON.stringify(layout));
  assert.equal(layout.hotspots,5);
  if(width===390)await page.screenshot({path:'.browser-qa/mobile-stadium.png'});
  console.log('✓ Viewport '+width+'×'+height+' sem overflow horizontal');
 }
 await page.locator('.mobile-nav [data-nav="more"]').click();
 await page.waitForSelector('.room-scene.room-more',{timeout:5000});
 await page.locator('.more-grid [data-nav="finance"]').click();
 await page.waitForSelector('.room-scene.room-finance',{timeout:5000});
 await page.screenshot({path:'.browser-qa/mobile-finance.png'});
 console.log('✓ Menu de operações, salas temáticas e finanças');

 // Regression: the initial shell must accommodate the longest accepted club name
 // without truncating it, even in the narrowest mobile viewport.
 await page.setViewportSize({width:320,height:650});
 await page.evaluate(()=>localStorage.clear());
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#create-form');
 const longName='Associação Desportiva do Atlântico';
 await page.locator('#create-form input[name="name"]').fill(longName);
 await page.locator('#create-form button[type="submit"]').click();
 await page.waitForSelector('.game-hud .hud-club-copy strong');
 const clubFit=await page.locator('.game-hud .hud-club-copy strong').evaluate(el=>{
  const style=getComputedStyle(el),rect=el.getBoundingClientRect();
  return {value:el.textContent,overflow:style.overflowX,whiteSpace:style.whiteSpace,scrollWidth:el.scrollWidth,width:el.clientWidth,rectWidth:rect.width,rectHeight:rect.height};
 });
 assert.equal(clubFit.value,longName);
 assert.notEqual(clubFit.overflow,'hidden');
 assert.notEqual(clubFit.whiteSpace,'nowrap');
 await page.screenshot({path:'.browser-qa/mobile-long-club-name.png'});
 console.log('✓ Nome extenso do clube sem truncagem a 320px');

 assert.deepEqual(fatal,[],'Erros JavaScript detetados no navegador');
 console.log('✓ Sem erros fatais JavaScript');
 await context.close();
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
