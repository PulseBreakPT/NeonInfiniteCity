import {createServer} from 'node:http';
import {readFile,access,mkdir,writeFile} from 'node:fs/promises';
import {resolve,normalize,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve('.'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 const raw=normalize(decodeURIComponent(new URL(req.url,'http://local').pathname)).replace(/^\/+/,'')||'index.html';
 const p=resolve(root,raw);
 if(!p.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{const buf=await readFile(p);res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(buf);}
 catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 let executable=process.env.CHROME_PATH||'';
 for(const p of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium']){if(executable)break;try{await access(p);executable=p;}catch{}}
 browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await context.newPage();
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#create-form button[type=submit]').click();
 await page.waitForSelector('.universe-stage');
 const screens=['dashboard','matches','tactics','squad','league','market','training','academy','campus','finance','mentors','events','collection','profile','social','club','more'];
 const widths=[[320,650],[360,740],[390,844],[768,1024],[1024,768],[1440,900]];
 const result=[];
 await mkdir('.browser-qa',{recursive:true});
 for(const [width,height] of widths){
  await page.setViewportSize({width,height});
  for(const id of screens){
   await page.evaluate(id=>{const btn=document.querySelector('[data-nav="'+id+'"]');if(btn)btn.click();},id);
   await page.waitForTimeout(18);
   const audit=await page.evaluate(()=>{
    const sample=[];
    const isVisible=e=>{const c=getComputedStyle(e);const b=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&b.width>2&&b.height>2&&b.bottom>0&&b.top<innerHeight;};
    const path=e=>{const id=e.id?'#'+e.id:'';return e.tagName.toLowerCase()+id+(typeof e.className==='string'&&e.className?'.'+e.className.trim().replace(/\s+/g,'.').slice(0,75):'');};
    const candidates=document.querySelectorAll('h1,h2,h3,h4,p,small,strong,b,span,button,label,th,td,a,em');
    for(const e of candidates){
     if(!isVisible(e))continue;
     const txt=(e.textContent||'').trim().replace(/\s+/g,' ');
     if(txt.length<4||txt.length>180)continue;
     const css=getComputedStyle(e),r=e.getBoundingClientRect();
     // Content that cannot be read due to the element's own clipping.
     if((css.overflowX==='hidden'||css.overflowX==='clip')&&e.scrollWidth>e.clientWidth+3){
      sample.push({type:'element-width',selector:path(e),text:txt.slice(0,70),lost:Math.round(e.scrollWidth-e.clientWidth),rect:[Math.round(r.width),Math.round(r.height)]});
     }
     if((css.overflowY==='hidden'||css.overflowY==='clip')&&e.scrollHeight>e.clientHeight+3){
      sample.push({type:'element-height',selector:path(e),text:txt.slice(0,70),lost:Math.round(e.scrollHeight-e.clientHeight),rect:[Math.round(r.width),Math.round(r.height)]});
     }
     // Text ink rectangle beyond the nearest clipping ancestor, including card parents.
     const textNodes=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>=4);
     if(!textNodes.length)continue;
     for(const n of textNodes){
      const rng=document.createRange();rng.selectNodeContents(n);
      for(const ink of rng.getClientRects()){
       let clip=e;
       while(clip&&clip!==document.body){
        const style=getComputedStyle(clip);
        // The page is intentionally scrollable inside the full-screen game frame.
        // Content below its viewport is not clipped; it is reachable by scrolling.
        if(clip.classList.contains('game-canvas')||/^(auto|scroll)$/.test(style.overflowY)&&clip.scrollHeight>clip.clientHeight+2)break;
        const clipX=['hidden','clip'].includes(style.overflowX),clipY=['hidden','clip'].includes(style.overflowY);
        if(clipX||clipY){
         const box=clip.getBoundingClientRect();
         const h=clipX&&ink.right>box.right+3||clipX&&ink.left<box.left-3;
         const v=clipY&&ink.bottom>box.bottom+3||clipY&&ink.top<box.top-3;
         if(h||v){
          sample.push({type:h?'ancestor-width':'ancestor-height',selector:path(e),ancestor:path(clip),text:txt.slice(0,70),lost:Math.round(h?Math.max(ink.right-box.right,box.left-ink.left):Math.max(ink.bottom-box.bottom,box.top-ink.top)),rect:[Math.round(r.width),Math.round(r.height)]});
          break;
         }
        }clip=clip.parentElement;
       }
      }
     }
    }
    return {sample:sample.slice(0,400),total:sample.length,stageHeight:document.querySelector('.game-stage')?.getBoundingClientRect().height,viewport:{width:innerWidth,height:innerHeight},pageWidth:document.documentElement.scrollWidth};
   });
   result.push({width,height,page:id,...audit});
   if((width===390||width===1440)&&['dashboard','matches','league','squad','more','market','training','finance'].includes(id)){
    await page.screenshot({path:'.browser-qa/clipping-'+width+'-'+id+'.png'});
   }
  }
 }
 const counts=new Map();
 for(const x of result)for(const v of x.sample){const key=v.type+'|'+v.selector+'|'+(v.ancestor||'');const q=counts.get(key)||{...v,occurrences:0,examples:[]};q.occurrences++;if(q.examples.length<4)q.examples.push(x.width+':'+x.page+':'+v.text);counts.set(key,q);}
 const top=[...counts.values()].sort((a,b)=>b.occurrences-a.occurrences).slice(0,95);
 const report={views:result.length,total:result.reduce((a,b)=>a+b.total,0),mostFrequent:top,byScreen:result.map(r=>({size:r.width,page:r.page,issues:r.total})).filter(r=>r.issues).slice(0,110),javascript:errs};
 await writeFile('.browser-qa/clipping-report.json',JSON.stringify(report,null,2));
 console.log('CLIPPING AUDIT '+JSON.stringify(report));
}catch(e){console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
