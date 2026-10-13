const CACHE='club-dynasty-shell-v30';
const SHELL=['./','./index.html','./styles-v2.css','./styles-v3.css','./styles-v4.css','./styles-v5.css','./styles-v6.css','./styles-v7.css','./styles-v8.css','./styles-v9.css','./styles-v10.css','./styles-v11.css','./styles-v12.css','./styles-v13.css','./main.js','./model.js','./sim.js','./match-engine.js','./cup-resolution.js','./competition-physics.js','./match-live.js','./physics-engine.js','./weather-systems.js','./football-rules.js','./player-biomechanics.js','./pitch-spatial.js','./pitch-render.js','./broadcast-render.js','./actions.js','./ui-core.js','./ui-main.js','./ui-extra.js','./scene-ui.js','./manifest.webmanifest','./assets/mark.svg','./assets/stadium.svg','./assets/stadium-isometric.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('club-dynasty-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));}return response;}).catch(()=>caches.match('./index.html')));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy));}return response;})));
});
