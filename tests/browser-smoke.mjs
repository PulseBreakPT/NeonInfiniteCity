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
 assert.ok(await page.locator('.career-hq').count()===1);
 assert.ok(await page.locator('.career-world').count()===1);
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
 for(const [width,height] of [[320,650],[360,640],[377,715],[390,844],[414,896],[768,1024]]){
  await page.setViewportSize({width,height});
  await page.locator('.mobile-nav [data-nav="dashboard"]').click();
  await page.waitForSelector('.scene-hotspot',{timeout:5000});
  const layout=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,bodyOverflow:getComputedStyle(document.body).overflow,hotspots:document.querySelectorAll('.scene-hotspot').length}));
  assert.ok(layout.documentWidth<=layout.viewportWidth+1,'Overflow horizontal em '+width+'×'+height+': '+JSON.stringify(layout));
  assert.equal(layout.hotspots,5);
  if(width<=650){
   const scene=await page.evaluate(()=>{
     const map=document.querySelector('.career-world')?.getBoundingClientRect();
     const next=document.querySelector('.scene-event-panel')?.getBoundingClientRect();
     const dock=document.querySelector('.command-grid')?.getBoundingClientRect();
     return {mapBottom:map?.bottom,fixtureTop:next?.top,fixtureBottom:next?.bottom,dockTop:dock?.top};
   });
   assert.ok(scene.fixtureTop>=scene.mapBottom-1,'Painel da jornada sobre o estádio '+width+': '+JSON.stringify(scene));
   assert.ok(scene.dockTop>=scene.fixtureBottom-1,'Comandos sobre a jornada '+width+': '+JSON.stringify(scene));
   const geometry=await page.evaluate(()=>{
    const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const fixture=document.querySelector('.scene-event-panel');
    const play=fixture?.querySelector('[data-action="match"],[data-action="new-season"]');
    const stadium=document.querySelector('.universe-stage');
    const hotspots=[...document.querySelectorAll('.scene-hotspot')];
    const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const br=bounds(play),fr=bounds(fixture),sr=bounds(stadium);
    const targets=hotspots.map(el=>{
     const r=bounds(el);const centerX=(r.left+r.right)/2,centerY=(r.top+r.bottom)/2;
     const hit=document.elementFromPoint(centerX,centerY);
     return {label:el.getAttribute('aria-label'),x:r.left,y:r.top,inStage:r.left>=sr.left-1&&r.right<=sr.right+1&&r.top>=sr.top-1&&r.bottom<=sr.bottom+1,obscuredByFixture:overlap(r,fr)>1,centerClickable:hit===el||el.contains(hit)};
    });
    const text=play.innerText.trim().replace(/\s+/g,' ');
    const range=document.createRange();
    for(const child of play.childNodes){if(child.nodeType===Node.TEXT_NODE&&child.textContent.trim()){range.selectNodeContents(child);break;}}
    const ink=[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
    return {visibleCTA:br.width>90&&br.height>=43&&br.left>=fr.left-1&&br.right<=fr.right+1&&br.top>=fr.top-1&&br.bottom<=fr.bottom+1,
      text,inkInside:ink.every(r=>r.left>=br.left-2&&r.right<=br.right+2&&r.top>=br.top-2&&r.bottom<=br.bottom+2),
      fixtureBelowMap:fr.top>=Math.max(...targets.map(t=>t.y))+20,
      targets,primaryActions:document.querySelectorAll('.game-stage button[data-action="match"],.game-stage button[data-action="new-season"]').length};
   });
   assert.equal(geometry.primaryActions,1,'Botão JOGAR duplicado '+width+': '+JSON.stringify(geometry));
   assert.ok(geometry.text.includes('JOGAR JORNADA'),'Ação de partida não identificada '+width);
   assert.ok(geometry.visibleCTA&&geometry.inkInside,'Texto do botão cortado '+width+': '+JSON.stringify(geometry));
   assert.equal(geometry.targets.length,5);
   for(const target of geometry.targets)assert.ok(target.inStage&&!target.obscuredByFixture&&target.centerClickable,'Ponto do estádio oculto '+width+': '+JSON.stringify(target));
   assert.ok(geometry.fixtureBelowMap,'Próximo jogo está por cima dos pontos '+width+': '+JSON.stringify(geometry));
   console.log('✓ Android '+width+'px: um único JOGAR legível; cinco pontos de estádio sem sobreposição');
  }
  if(width===390)await page.screenshot({path:'.browser-qa/mobile-stadium.png'});
  if(width===377)await page.screenshot({path:'.browser-qa/android-377-matchday.png'});
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
 const isolated=await browser.newContext({viewport:{width:320,height:650},deviceScaleFactor:1});
 const longPage=await isolated.newPage();
 await longPage.goto(url,{waitUntil:'domcontentloaded'});
 await longPage.waitForSelector('#create-form',{timeout:10000});
 const longName='Associação Desportiva Atlântico';
 await longPage.locator('#create-form input[name="name"]').fill(longName);
 await longPage.locator('#create-form button[type="submit"]').click();
 await longPage.waitForSelector('.game-hud .hud-club-copy strong');
 const clubFit=await longPage.locator('.game-hud .hud-club-copy strong').evaluate(el=>{
  const style=getComputedStyle(el),rect=el.getBoundingClientRect();
  return {value:el.textContent,overflow:style.overflowX,whiteSpace:style.whiteSpace,scrollWidth:el.scrollWidth,width:el.clientWidth,rectWidth:rect.width,rectHeight:rect.height};
 });
 assert.equal(clubFit.value,longName);
 assert.notEqual(clubFit.overflow,'hidden');
 assert.notEqual(clubFit.whiteSpace,'nowrap');
 await longPage.screenshot({path:'.browser-qa/mobile-long-club-name.png'});
 console.log('✓ Nome extenso do clube sem truncagem a 320px');
 await isolated.close();

 assert.deepEqual(fatal,[],'Erros JavaScript detetados no navegador');
 console.log('✓ Sem erros fatais JavaScript');
 await context.close();
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
