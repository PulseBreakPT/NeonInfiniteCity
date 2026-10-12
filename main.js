
import {COLORS,makeState,migrate,loadState,saveState,rating,FORMATIONS} from './model.js';
import {execute} from './actions.js';
import {beginLiveMatch,tickLiveMatch,tickLiveMatchStep,PHYSICS_FRAME_MS,pauseLiveMatch,resumeLiveMatch,finishLiveMatch,visibleEvents,eventAtMinute,liveScore,matchClock,matchPhase} from './match-live.js';
import {shell,welcome,esc} from './ui-core.js';
import {createPitchRenderer} from './pitch-render.js';
import {roomScene} from './scene-ui.js';
import {dashboard,matches,tactics,squad} from './ui-main.js';
import {league as leaguePage,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more} from './ui-extra.js';
let state=loadState(),page=state?.liveMatch?'matches':'dashboard',ui={slot:null,candidate:null,player:null,search:'',position:'ALL',color:COLORS[0]},notice='',replayTimer=null,replayStep=0,replaySpeed=1,replayPaused=false;
const $=s=>document.querySelector(s);
let liveTimer=null,halftimeTimer=null,spatialRenderer=null,spatialFrame=0,lastSpatialDraw=0,lastLiveTick=0,physicsAccumulator=0,lastPhysicsPaint=0,lastPhysicsEvents=0;
function persist(){if(state&&!saveState(state))notification('Não foi possível guardar o progresso. Verifica o armazenamento.');}
function notification(message){notice=message;render();setTimeout(()=>{if(notice===message){notice='';const t=$('.toast');if(t)t.remove();}},4000);}
function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null;}}
function stopSpatial(){
 if(spatialFrame){cancelAnimationFrame(spatialFrame);spatialFrame=0;}
 if(spatialRenderer){spatialRenderer.dispose();spatialRenderer=null;}
}
// Browser animation time and match physics are independent clocks.
// At 1×, a physics step lasting 0.2s is shown over 0.2s (previously
// 36 steps were squeezed into 0.32s and looked like teleportation).
function physicsStepDuration(live){
 const qa=Number(window.__CLUB_MATCH_TEST_RATE__||1);
 const rate=Number.isFinite(qa)?Math.max(1,Math.min(80,qa)):1;
 return PHYSICS_FRAME_MS/(Math.max(1,live.speed||1)*rate);
}
function spatialLoop(t){
 if(!spatialRenderer||!state?.liveMatch||page!=='matches'){spatialFrame=0;return;}
 const live=state.liveMatch;
 if(live.phase!=='running'){
  spatialRenderer.draw(live.minute,1);
  spatialFrame=0;lastLiveTick=0;
  return;
 }
 if(live.schema===2){
  const delta=lastLiveTick?Math.max(0,Math.min(200,t-lastLiveTick)):0;
  lastLiveTick=t;
  physicsAccumulator+=delta;
  const stepMs=physicsStepDuration(live);
  const initialMinute=live.minute;
  let steps=0;
  // Bound main-thread work after tab suspension or a dropped frame.
  while(physicsAccumulator>=stepMs&&steps<12&&live.phase==='running'){
   physicsAccumulator-=stepMs;
   tickLiveMatchStep(state);
   steps++;
   if(live.substep===0||((live.substep||0)%18===0)||live.phase!=='running')persist();
  }
  const nextEvents=live.world?.events.length||0;
  const visualTime=live.minute+(live.substep||0)/36;
  spatialRenderer.draw(visualTime,Math.min(1,physicsAccumulator/stepMs));
  if(steps&&(t-lastPhysicsPaint>=160||nextEvents!==lastPhysicsEvents||live.minute!==initialMinute||live.phase!=='running')){
   lastPhysicsPaint=t;lastPhysicsEvents=nextEvents;paintLive();
  }
  if(live.phase==='halftime'){
   physicsAccumulator=0;spatialFrame=0;lastLiveTick=0;
   startLiveClock();return;
  }
  if(live.phase==='final'){
   spatialFrame=0;lastLiveTick=0;physicsAccumulator=0;
   try{
    state=finishLiveMatch(state);persist();go('matches');
   }catch(err){notification('⚠ '+err.message);}
   return;
  }
 }else if(t-lastSpatialDraw>33){
  const fraction=Math.min(.99,Math.max(0,(t-lastLiveTick)/(320/(live.speed||1))));
  spatialRenderer.draw(live.minute+fraction);
  lastSpatialDraw=t;
 }
 spatialFrame=requestAnimationFrame(spatialLoop);
}
function resumeSpatial(){
 if(spatialRenderer&&!spatialFrame){
  lastLiveTick=0;
  physicsAccumulator=0;
  spatialFrame=requestAnimationFrame(spatialLoop);
 }
}
function initSpatial(){
 stopSpatial();
 if(!state?.liveMatch||page!=='matches')return;
 const canvas=document.getElementById('live-spatial-canvas');
 if(!canvas)return;
 spatialRenderer=createPitchRenderer(canvas,state.liveMatch);
 if(spatialRenderer){lastLiveTick=0;lastSpatialDraw=0;lastPhysicsEvents=state.liveMatch.world?.events.length||0;physicsAccumulator=0;spatialFrame=requestAnimationFrame(spatialLoop);}
}
function stopLiveClock(){
 if(liveTimer){clearInterval(liveTimer);liveTimer=null;}
 if(halftimeTimer){clearTimeout(halftimeTimer);halftimeTimer=null;}
}
function paintLive(){
 const live=state?.liveMatch;if(!live||page!=='matches')return;
 const shown=visibleEvents(live),scores=liveScore(live),clock=matchClock(live),last=shown.at(-1);
 const el=id=>document.getElementById(id);
 if(el('live-clock'))el('live-clock').textContent=clock;
 if(el('live-clock-small'))el('live-clock-small').textContent=clock;
 if(el('live-comment-minute'))el('live-comment-minute').textContent=clock;
 if(el('live-score'))el('live-score').textContent=scores.home+' : '+scores.away;
 if(el('live-period'))el('live-period').textContent=live.phase==='halftime'?'INTERVALO':live.phase==='paused'?'EM PAUSA':matchPhase(live)==='first'?'1.ª PARTE':'2.ª PARTE';
 if(el('live-added'))el('live-added').textContent=live.minute<=45?'45 + '+live.firstAdded+' MIN':'90 + '+live.secondAdded+' MIN';
 if(el('live-progress-fill'))el('live-progress-fill').style.width=((live.minute+(live.schema===2?(live.substep||0)/36:0))/live.total*100)+'%';
 if(el('live-pause-label'))el('live-pause-label').textContent=live.phase==='running'?'PAUSAR':live.phase==='halftime'?'INICIAR 2.ª PARTE':'CONTINUAR';
 if(el('live-speed-label'))el('live-speed-label').textContent=live.speed+'×';
 const commentary=last?.text||(live.minute>0?'A bola circula entre as duas equipas.':'A partida está prestes a começar.');
 if(el('live-comment')?.textContent!==commentary)el('live-comment').textContent=commentary;
 const important=shown.filter(e=>['goal','card','red','injury','half','tactical','save','substitution','penalties','end','chance','corner','freekick','throwin','penalty','offside'].includes(e.kind)).slice(-9).reverse();
 if(el('live-reports-count')?.textContent!==shown.length+' LANCES')el('live-reports-count').textContent=shown.length+' LANCES';
 const list=el('live-events');
 // Rendering does not re-create the DOM tree every 160 ms while play continues.
 const signature=shown.length+':'+(shown.at(-1)?.clock??shown.at(-1)?.minute??0);
 if(list&&list.dataset.renderKey!==signature){
  list.dataset.renderKey=signature;
  list.innerHTML=important.length?important.map(e=>'<div class="live-event-row '+(e.kind==='goal'?'is-goal':'')+'"><b>'+esc(matchClock(live,eventAtMinute(live,e)))+'</b><span>'+esc(e.text)+'</span></div>').join(''):'<div class="live-event-empty">Aguardam-se os primeiros lances.</div>';
 }
 const ball=el('ball');
 if(ball&&!spatialRenderer){
  const n=live.minute,delta=Math.max(0,n-eventAtMinute(live,last||{minute:0}));
  const baseX=last?.x??50,baseY=last?.y??50;
  ball.style.left=Math.max(7,Math.min(93,baseX+Math.sin(n*.65)*Math.min(19,delta*2+7)))+'%';
  ball.style.top=Math.max(7,Math.min(93,baseY+Math.cos(n*.43)*Math.min(13,delta+5)))+'%';
 }
 if(spatialRenderer&&live.phase!=='running')spatialRenderer.draw(live.minute,1);
}
function startLiveClock(){
 stopLiveClock();
 const live=state?.liveMatch;
 if(!live||page!=='matches')return;
 if(live.phase==='halftime'){
  halftimeTimer=setTimeout(()=>{
   if(state?.liveMatch===live&&live.phase==='halftime'){
    resumeLiveMatch(state);persist();paintLive();startLiveClock();resumeSpatial();
   }
  },1700);
  return;
 }
 if(live.phase!=='running')return;
 if(live.schema===2){resumeSpatial();return;}
 liveTimer=setInterval(()=>{
  if(!state?.liveMatch||page!=='matches'){stopLiveClock();return;}
  lastLiveTick=performance.now();
  const session=tickLiveMatch(state);
  // The browser records the minute, not the result. The pending fixture is
  // resumable even if the app is closed in the middle of stoppage time.
  if(session.minute%3===0||session.phase!=='running')persist();
  paintLive();
  if(session.phase==='halftime'){startLiveClock();return;}
  if(session.phase==='final'){
   stopLiveClock();
   try{
    state=finishLiveMatch(state);
    persist();
    go('matches');
   }catch(e){notification('⚠ '+e.message);}
  }
 },Math.round(320/(live.speed||1)));
}

const pages={dashboard,matches,tactics,squad,league:leaguePage,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more};
function render(){
 stopSpatial();
 const holder=$('#app');if(!holder)return;
 const priorScroll=$('#page')?.scrollTop||0;
 if(!state){holder.innerHTML=welcome(ui.color);return;}
 let pageContent=pages[page]?pages[page](state,ui):dashboard(state,ui);
 if(page!=='dashboard'&&page!=='matches'&&page!=='tactics'&&page!=='squad')pageContent=pageContent.replace('</header>','</header>'+roomScene(page,state));
 holder.innerHTML=shell(state,page,pageContent,notice);
 if(ui.player!==null&&page!=='squad')ui.player=null;

 const viewport=$('#page');if(viewport)viewport.scrollTop=priorScroll;
 initSpatial();
}
function go(to){
 if(!pages[to])return;
 if(state?.liveMatch&&to!=='matches'){notice='A jornada está em curso. Termina a partida antes de sair.';render();return;}
 stopReplay();
 page=to;ui.slot=null;ui.candidate=null;ui.player=null;notice='';render();
 const el=$('#page');if(el)el.scrollTop=0;
}
function act(action,data={}){
 try{
  if(action==='nav')return go(data.to);
  if(action==='live-pause'){
   if(!state?.liveMatch)return;
   if(state.liveMatch.phase==='running'){pauseLiveMatch(state);stopLiveClock();}
   else{resumeLiveMatch(state);startLiveClock();resumeSpatial();}
   persist();paintLive();return;
  }
  if(action==='live-camera'){
   if(!state?.liveMatch)return;
   const modes=['tv','balanced','sideline','aerial'];
   const live=state.liveMatch;
   const idx=modes.indexOf(live.camera||'tv');
   live.camera=modes[(idx+1)%modes.length];
   spatialRenderer?.setCamera?.(live.camera);
   const name={tv:'TV',balanced:'EQUILIBRADA',sideline:'LATERAL',aerial:'TÁTICA'}[live.camera];
   const el=document.getElementById('live-camera-label');
   if(el)el.textContent=name;
   persist();return;
  }
  if(action==='live-speed'){
   if(!state?.liveMatch)return;
   const live=state.liveMatch;live.speed=live.speed===1?2:live.speed===2?4:1;
   persist();paintLive();
   if(live.schema!==2)startLiveClock();
   resumeSpatial();return;
  }
  if(action==='match'){
   if(state?.liveMatch){go('matches');return;}
   beginLiveMatch(state,{engine:'physics'});persist();go('matches');startLiveClock();return;
  }
  if(state?.liveMatch)throw Error('Partida em curso. Aguarda o apito final.');

  if(action==='select-slot'){
   if(page!=='tactics')return;
   const slot=Number(data.slot);
   if(!Number.isInteger(slot)||slot<0||slot>10)return notification('Posição inválida.');
   if(ui.candidate!==null){
    const result=execute(state,'swap',{id:ui.candidate,slot});
    ui.candidate=null;ui.slot=null;persist();return notification(result.message);
   }
   ui.slot=slot;render();
   if(window.matchMedia('(max-width:850px)').matches)requestAnimationFrame(()=>$('#lineup-picker')?.scrollIntoView({block:'start',behavior:'instant'}));
   return;
  }
  if(action==='cancel-slot'){ui.slot=null;ui.candidate=null;return render();}
  if(action==='close-player'){ui.player=null;return render();}
  if(action==='show-player'){ui.player=data.id;return render();}
  if(action==='lineup-from-card'){
   const player=state.players.find(p=>p.id===Number(data.id));
   if(!player)return notification('Jogador não encontrado.');
   if(player.injury>0||(player.suspendedUntilWeek||0)>=state.week||(player.contract??0)<=0)return notification('O jogador está indisponível.');
   go('tactics');ui.candidate=player.id;ui.slot=null;render();return;
  }
  if(action==='pick-player'){
   const player=state.players.find(p=>p.id===Number(data.id));
   if(!player)return notification('Jogador não encontrado.');
   if(player.injury>0||(player.suspendedUntilWeek||0)>=state.week||(player.contract??0)<=0)return notification('O jogador está indisponível.');
   ui.candidate=player.id;ui.slot=null;render();
   if(window.matchMedia('(max-width:850px)').matches)requestAnimationFrame(()=>$('#starting-pitch')?.scrollIntoView({block:'center',behavior:'instant'}));
   return;
  }
  if(action==='unassign-slot'){
   if(ui.slot===null)return notification('Seleciona uma posição no relvado.');
   const result=execute(state,'unassign-slot',{slot:ui.slot});
   persist();return notification(result.message);
  }
  if(action==='swap-slot'){
   if(ui.slot===null)return act('pick-player',{id:data.id});
   const result=execute(state,'swap',{id:data.id,slot:ui.slot});
   ui.slot=null;ui.candidate=null;persist();return notification(result.message);
  }
  if(action==='replay')return replay();
  if(action==='replay-pause')return toggleReplay();
  if(action==='replay-speed')return cycleReplaySpeed();
  if(action==='open-result'){
   const f=state.results.find(x=>String(x.round)===String(data.round)&&x.type===data.kind);
   if(f){state.lastMatch=f.result;go('matches');return;}
   throw Error('Resultado não encontrado.');
  }
  if(action==='export')return exportSave();
  if(action==='sell'&&!confirm('Vender este jogador? Esta operação não pode ser desfeita.'))return;
  if(action==='player-class'&&!confirm('Utilizar tokens para evoluir a classe?'))return;
  if(action==='special')data.value='Líder de equipa';
  if(action==='position')data.pos=$('#position-choice')?.value||'MID';
  if(action==='bid'&&!confirm('Confirmar a licitação pelo jogador selecionado?'))return;
  const result=execute(state,action,data);
  persist();
  if(action==='match'||action==='friendly'){go('matches');notification(result.message);return;}
  if(action==='new-season'){go('dashboard');notification(result.message);return;}
  notification(result.message);
 }catch(err){notification('⚠ '+(err?.message||'Operação não concluída.'));}
}
function paintReplay(minute){
 const r=state?.lastMatch;if(!r||page!=='matches')return;
 const end=Math.min(90,Math.max(0,Math.round(minute))),events=r.events||[];
 const clock=$('#live-minute'),comment=$('#live-comment'),score=$('#live-score'),ball=$('#ball'),slider=$('#match-timeline'),clockLive=$('#timeline-clock');
 if(clock)clock.textContent=end+'’';
 if(clockLive)clockLive.textContent=String(end).padStart(2,'0')+':00';
 if(slider)slider.value=end;
 const relevant=events.filter(e=>e.minute<=end),last=relevant.at(-1);
 if(comment)comment.textContent=last?last.text:'A partida começa. As duas equipas procuram controlar o meio-campo.';
 if(ball&&!spatialRenderer){ball.style.left=(last?.x??50)+'%';ball.style.top=(last?.y??50)+'%';}
 if(score)score.textContent=events.filter(e=>e.kind==='goal'&&e.minute<=end&&e.team===r.home).length+' : '+events.filter(e=>e.kind==='goal'&&e.minute<=end&&e.team===r.away).length;
}
function toggleReplay(){
 if(!state?.lastMatch)return;
 if(!replayTimer&&!replayPaused){replay();return;}
 if(replayPaused){replayPaused=false;replay(true);return;}
 stopReplay();replayPaused=true;const el=$('#replay-pause-label');if(el)el.textContent='CONTINUAR';
}
function cycleReplaySpeed(){
 replaySpeed=replaySpeed===1?2:replaySpeed===2?4:1;
 const label=$('#replay-speed-label');if(label)label.textContent=replaySpeed+'×';
 if(replayTimer)replay(true);
}
function replay(resume=false){
 stopReplay();if(!state?.lastMatch)return;
 if(!resume){replayStep=0;replaySpeed=1;}
 replayPaused=false;
 const pauseLabel=$('#replay-pause-label'),speedLabel=$('#replay-speed-label');
 if(pauseLabel)pauseLabel.textContent='PAUSAR';
 if(speedLabel)speedLabel.textContent=replaySpeed+'×';
 paintReplay(replayStep);
 replayTimer=setInterval(()=>{
  if(page!=='matches'||!$('#live-minute')){stopReplay();return;}
  replayStep=Math.min(90,replayStep+1);
  paintReplay(replayStep);
  if(replayStep>=90){stopReplay();const el=$('#replay-pause-label');if(el)el.textContent='RECOMEÇAR';}
 },Math.round(220/replaySpeed));
}
function exportSave(){
 const json=JSON.stringify(state,null,2);
 const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='club-dynasty-epoca-'+state.season+'.json';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);notification('Save exportado com sucesso.');
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button,[data-action="show-player"],[data-action="close-player"]');if(!button)return;
 if(button.classList?.contains('modal-overlay')&&event.target!==button)return;
 const color=button.dataset.color;
 if(color){
  if(!COLORS.includes(color))return;
  if(!state){ui.color=color;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('chosen',b.dataset.color===color));}
  else{$('#club-color').value=color;document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('chosen',b.dataset.color===color));}
  return;
 }
 const nav=button.dataset.nav;
 if(nav){go(nav);return;}
 const action=button.dataset.action;
 if(!action)return;
 act(action,{id:button.dataset.id,slot:button.dataset.slot!==undefined?Number(button.dataset.slot):undefined,to:button.dataset.to,key:button.dataset.key,kind:button.dataset.kind,round:button.dataset.round,pos:button.dataset.pos});
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.dataset.action==='formation'){ui.slot=null;ui.candidate=null;act('formation',{value:el.value});}
 if(el.dataset.tactic)act('tactic',{key:el.dataset.tactic,value:el.value});
 if(el.id==='player-filter'){ui.position=el.value;render();}
 if(el.id==='import-save'){
  const f=el.files?.[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{
   try{
    const content=JSON.parse(String(reader.result));
    if(!content||![1,2].includes(content.version))throw Error('Formato não suportado.');
    const imported=migrate(content);if(!imported)throw Error('Save inválido.');
    if(!confirm('Substituir o progresso atual pelo save importado?'))return;
    state=imported;persist();go('dashboard');notification('Save importado com sucesso.');
   }catch(e){notification('⚠ Importação falhou: '+e.message);}
  };reader.readAsText(f);
 }
});
document.addEventListener('input',event=>{
 if(event.target.id==='match-timeline'){
  replayStep=Number(event.target.value)||0;paintReplay(replayStep);return;
 }
 if(event.target.id==='player-search'){
  ui.search=event.target.value;
  const caret=event.target.selectionStart;
  render();
  const current=$('#player-search');if(current){current.focus();try{current.setSelectionRange(caret,caret);}catch(e){}}
 }
});
document.addEventListener('submit',event=>{
 if(!['create-form','club-form','coach-form','finance-form'].includes(event.target.id))return;
 event.preventDefault();
 const form=new FormData(event.target);
 try{
  if(event.target.id==='create-form'){
   const name=String(form.get('name')||'').trim(),city=String(form.get('city')||'').trim();
   if(!name||!city||name.length>32||city.length>26)throw Error('Nome ou cidade inválidos.');
   state=makeState(name,city,ui.color);persist();go('dashboard');notification('Bem-vindo ao '+name+'!');return;
  }
  if(event.target.id==='club-form'){
   act('club-update',{name:form.get('name'),city:form.get('city'),stadium:form.get('stadium'),color:form.get('color')});return;
  }
  if(event.target.id==='coach-form'){act('name-coach',{value:form.get('coach')});return;}
  if(event.target.id==='finance-form'){
   const snapshot=structuredClone(state);
   try{
    execute(state,'tickets',{value:form.get('tickets')});
    const name={'Atlântico Energia':'regular','Norte Digital':'premium','Horizonte Global':'elite'};
    const selected=String(form.get('sponsor')),current=name[state.club.sponsor]||'regular';
    if(selected!==current)execute(state,'sponsor',{value:selected});
    persist();notification('Finanças atualizadas.');return;
   }catch(err){state=snapshot;throw err;}
  }
 }catch(e){notification('⚠ '+e.message);}
});
document.addEventListener('keydown',event=>{
 if(!state||event.ctrlKey||event.metaKey||event.altKey)return;
 const target=event.target;
 if(['INPUT','SELECT','TEXTAREA'].includes(target?.tagName)||target?.isContentEditable)return;
 if(event.key==='Escape'){
  if(ui.player!==null){act('close-player');return;}
  if(ui.slot!==null||ui.candidate!==null){act('cancel-slot');return;}
  if(page!=='dashboard')go('dashboard');
  return;
 }
 const hotkeys={'1':'dashboard','2':'matches','3':'tactics','4':'squad','5':'more'};
 if(hotkeys[event.key]){event.preventDefault();go(hotkeys[event.key]);}
});
window.addEventListener('beforeunload',()=>{stopReplay();stopLiveClock();stopSpatial();if(state)saveState(state);});
if(state){ui.color=state.club.color;saveState(state);}
render();
if(state?.liveMatch){if(state.liveMatch.phase==='running'||state.liveMatch.phase==='halftime')startLiveClock();else paintLive();}
