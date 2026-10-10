import{createWorld,createState,update,interact,nearby,useItem,objectives,inside,SAVE_KEY,serialize,restore,clamp}from'./core.js';
import{Renderer}from'./renderer.js';
import{SHEET_COUNT,PACK_ROOT}from'./assetpack.js';
const $=id=>document.getElementById(id);
let world=createWorld(),state=createState(),renderer,selected='male',playing=false,paused=false,last=0,uiTick=0,saveTick=0,toastTimer,ended=false,restartArmed=false,expandedMap=false;
const keys=new Set(),joy={x:0,y:0},input={x:0,y:0,run:false};let touchRun=false,joystickPointer=null,audio=null,audioEnabled=false;
const gameplay=['topbar','mission','map-widget','location','quickbar','desktop-help','zoom','touch'];
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function storageRead(){try{return localStorage.getItem(SAVE_KEY);}catch{return null;}}
function save(silent=false){if(!playing||state.dead)return false;try{localStorage.setItem(SAVE_KEY,serialize(state));if(!silent)toast('Expedição guardada neste dispositivo.');return true;}catch{if(!silent)toast('Não foi possível guardar. Verifica o armazenamento do navegador.');return false;}}
function resetInput(){keys.clear();joy.x=joy.y=0;touchRun=false;joystickPointer=null;$('stick').style.transform='translate(0,0)';$('run-touch').classList.remove('pressed');}
function soundState(){if(!audio)return;const on=audioEnabled&&playing&&!paused&&!ended;if(on)audio.ctx.resume().catch(()=>{});else audio.ctx.suspend().catch(()=>{});}
function pause(value){if(!playing||ended)return;paused=value;$('pause-panel').hidden=!value;resetInput();restartArmed=false;$('restart').textContent='Recomeçar expedição';soundState();if(value){save(true);$('resume').focus();}else $('world').focus();}
function start(resume=false){
 world=createWorld();renderer.world=world;const stored=resume?restore(storageRead(),world):null;if(resume&&!stored){toast('A gravação já não está disponível. Iniciámos uma nova expedição.');}
 state=stored||createState(selected);playing=true;paused=false;ended=false;saveTick=0;resetInput();
 for(const id of gameplay)$(id).hidden=false;
 for(const id of ['welcome','pause-panel','end-panel','credits'])$(id).hidden=true;
 document.body.classList.add('playing');const p={x:(state.player.x-state.player.y)*48,y:(state.player.x+state.player.y)*24};renderer.camera=p;updateUI();soundState();save(true);toast(resume&&stored?'De volta a Vale Sereno.':'Encontra as caixas marcadas. Mantém distância dos errantes.');
}
function home(){playing=false;paused=false;ended=false;resetInput();document.body.classList.remove('playing');for(const id of gameplay)$(id).hidden=true;for(const id of ['pause-panel','end-panel','interact-prompt','credits'])$(id).hidden=true;$('welcome').hidden=false;$('continue').hidden=!restore(storageRead(),createWorld());soundState();}
function action(){if(!playing||paused||ended)return;const r=interact(state,world);toast(r.text);if(r.ok)save(true);updateUI();}
function consume(item){if(!playing||paused||ended)return;if(useItem(state,item)){toast(item==='medkit'?'Kit médico usado. +45 saúde.':item==='food'?'Comeste conservas. +18 saúde.':'Bebeste água. Fôlego recuperado.');save(true);updateUI();}else toast(state.inventory[item]>0?(item==='water'?'O fôlego já está cheio. Água conservada.':'A saúde já está cheia. Recurso conservado.'):'Não tens esse recurso. Procura nas caixas da vila.');}
function toggleLantern(){renderer.lantern=!renderer.lantern;$('lantern').setAttribute('aria-pressed',String(renderer.lantern));$('lantern').querySelector('b').textContent=renderer.lantern?'●':'○';}
function toggleMap(){expandedMap=!expandedMap;$('map-widget').classList.toggle('expanded',expandedMap);$('map-toggle').setAttribute('aria-label',expandedMap?'Reduzir mapa':'Ampliar mapa');$('minimap').width=$('minimap').height=expandedMap?384:168;renderer.drawMap(state,expandedMap);}
function end(){ended=true;paused=true;resetInput();soundState();$('interact-prompt').hidden=true;$('end-panel').hidden=false;
 $('end-label').textContent=state.won?'PRIMEIRO DIA CONCLUÍDO':'A EXPEDIÇÃO TERMINOU';$('end-title').textContent=state.won?'Uma luz na escuridão.':'A vila não perdoa.';
 $('end-message').textContent=state.won?'Há mantimentos, medicamentos e eletricidade. Esta noite, Vale Sereno tem um abrigo.':'Os errantes alcançaram-te. Procura caminhos alternativos, guarda o fôlego e usa os kits médicos.';
 $('end-stats').textContent=`${Math.floor(state.time/60)} min ${Math.floor(state.time%60)} s · ${state.collected.length} caixas exploradas · ${Math.floor(state.steps)} m percorridos`;
 if(state.won)save(true);$('play-again').focus();
}
function updateUI(){
 const p=state.player;$('health-text').textContent=Math.ceil(p.health);$('stamina-text').textContent=Math.ceil(p.stamina);$('health-bar').style.width=p.health+'%';$('stamina-bar').style.width=p.stamina+'%';
 for(const [key,value]of Object.entries(state.inventory))$('count-'+key).textContent=value;
 const tasks=objectives(state);$('objectives').replaceChildren(...tasks.map(t=>{const li=document.createElement('li');li.textContent=t.text;li.className=t.done?'done':'';return li;}));$('mission-progress').textContent=tasks.filter(t=>t.done).length+' / 4';
 const total=18*60+10+Math.floor(state.time/12);$('clock').textContent=String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
 const b=world.buildings.find(b=>inside(p,b,1));$('location-text').textContent=b?b.name:'Rua dos Plátanos';
 const o=nearby(state,world);$('interact-prompt').hidden=!o||!playing||paused||ended;if(o)$('interact-label').textContent=o.finish?'Preparar abrigo e concluir':o.generator?(state.generator?'Gerador ligado':'Reparar · 1 combustível + 2 peças'):'Recolher recursos';
 $('action-touch').style.opacity=o?'1':'.5';renderer.drawMap(state,expandedMap);
}
function frame(now){
 const dt=Math.min(.05,(now-last)/1000||.016);last=now;
 if(playing&&!paused&&!ended){
  input.x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
  input.y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
  input.run=keys.has('shift')||touchRun;update(state,world,input,dt);saveTick+=dt;
  if(saveTick>15){save(true);saveTick=0;}if(state.dead||state.won)end();
 }
 renderer.draw(state,dt,playing);uiTick+=dt;if(uiTick>.15){updateUI();uiTick=0;}requestAnimationFrame(frame);
}
function bind(){
 document.querySelectorAll('[data-character]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.character;state.player.character=selected;document.querySelectorAll('[data-character]').forEach(el=>{const active=el===b;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});}));
 $('start').onclick=()=>start();$('continue').onclick=()=>start(true);$('pause-btn').onclick=()=>pause(!paused);$('resume').onclick=()=>pause(false);$('save').onclick=()=>save();
 $('quit').onclick=()=>{save(true);home();};$('restart').onclick=()=>{if(restartArmed){start();}else{restartArmed=true;$('restart').textContent='Confirmar nova expedição';}};
 $('play-again').onclick=()=>start();$('end-home').onclick=home;$('action-touch').onclick=action;$('lantern').onclick=toggleLantern;$('map-toggle').onclick=toggleMap;
 $('zoom-in').onclick=()=>renderer.zoom=clamp(renderer.zoom+.15,.65,1.75);$('zoom-out').onclick=()=>renderer.zoom=clamp(renderer.zoom-.15,.65,1.75);
 $('rain').onclick=()=>{renderer.rain=!renderer.rain;$('rain').setAttribute('aria-pressed',String(renderer.rain));$('rain').textContent='Chuva ambiente: '+(renderer.rain?'ligada':'desligada');};
 $('sound').onclick=()=>{
  try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;const ctx=new Audio(),gain=ctx.createGain(),osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=65;gain.gain.value=.018;osc.connect(gain);gain.connect(ctx.destination);osc.start();audio={ctx};}audioEnabled=!audioEnabled;$('sound').setAttribute('aria-pressed',String(audioEnabled));$('sound').textContent='Som ambiente: '+(audioEnabled?'ligado':'desligado');soundState();}catch{toast('O áudio não está disponível neste navegador.');}
 };
 $('credits-link').onclick=e=>{e.preventDefault();$('credits').hidden=false;$('close-credits').focus();};$('close-credits').onclick=()=>{$('credits').hidden=true;$('credits-link').focus();};
 document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>consume(b.dataset.item));
 addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(!playing)return;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  if(k==='escape'&&!e.repeat){pause(!paused);return;}if(paused||ended)return;keys.add(k);if(e.repeat)return;
  if(k==='e')action();if(k==='f')toggleLantern();if(k==='m')toggleMap();if(['1','2','3'].includes(k))consume(['food','water','medkit'][Number(k)-1]);
 });
 addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{resetInput();if(playing&&!ended)pause(true);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();save(true);if(playing&&!ended)pause(true);}});
 addEventListener('pagehide',()=>save(true));addEventListener('resize',()=>renderer.resize());
 const stick=$('joystick');function stickMove(e){if(e.pointerId!==joystickPointer)return;const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const length=Math.hypot(dx,dy),m=Math.min(length,38);joy.x=length>5?dx/length*m/38:0;joy.y=length>5?dy/length*m/38:0;$('stick').style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;}
 stick.addEventListener('pointerdown',e=>{if(!playing||paused)return;joystickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e);});stick.addEventListener('pointermove',stickMove);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(joystickPointer===e.pointerId){joystickPointer=null;joy.x=joy.y=0;$('stick').style.transform='translate(0,0)';}});
 $('run-touch').addEventListener('pointerdown',e=>{e.preventDefault();touchRun=true;$('run-touch').setPointerCapture(e.pointerId);$('run-touch').classList.add('pressed');});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('run-touch').addEventListener(event,()=>{touchRun=false;$('run-touch').classList.remove('pressed');});
}
async function load(){
 try{
  const response=await fetch('assets/atlas.json');if(!response.ok)throw new Error('atlas');const atlas=await response.json(),assets={};let loaded=0;
  await Promise.all(Object.keys(atlas).map(name=>new Promise((resolve,reject)=>{const img=new Image(),timeout=setTimeout(()=>reject(new Error(name)),30000);img.onload=()=>{clearTimeout(timeout);assets[name]=img;$('load-progress').value=++loaded;resolve();};img.onerror=()=>{clearTimeout(timeout);reject(new Error(name));};img.src='assets/'+name+'.png';})));
  const packSheets=await Promise.all(Array.from({length:SHEET_COUNT},(_,i)=>new Promise(resolve=>{const image=new Image();image.onload=()=>{$('load-progress').value=++loaded;resolve(image);};image.onerror=()=>{$('load-progress').value=++loaded;console.warn('Premium500 atlas indisponível',i);resolve(null);};image.src=PACK_ROOT+'atlases/sheet-'+String(i).padStart(2,'0')+'.svg';})));
  renderer=new Renderer($('world'),$('minimap'),world,assets,atlas,packSheets);renderer.camera={x:-168,y:636};bind();$('start').disabled=false;$('loading').hidden=true;home();requestAnimationFrame(frame);
 }catch(error){$('load-text').textContent='Não foi possível carregar os assets. Verifica a ligação e recarrega a página.';const button=document.createElement('button');button.textContent='Tentar novamente';button.className='secondary';button.style.width='220px';button.onclick=()=>location.reload();$('loading').append(button);console.error('Asset loading failed',error);}
}
load();
