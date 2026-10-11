
import {COLORS,makeState,migrate,loadState,saveState,rating,FORMATIONS} from './model.js';
import {execute} from './actions.js';
import {shell,welcome,esc} from './ui-core.js';
import {roomScene} from './scene-ui.js';
import {dashboard,matches,tactics,squad} from './ui-main.js';
import {league as leaguePage,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more} from './ui-extra.js';
let state=loadState(),page='dashboard',ui={slot:null,player:null,search:'',position:'ALL',color:COLORS[0]},notice='',replayTimer=null,replayStep=0,replaySpeed=1,replayPaused=false;
const $=s=>document.querySelector(s);
function persist(){if(state&&!saveState(state))notification('Não foi possível guardar o progresso. Verifica o armazenamento.');}
function notification(message){notice=message;render();setTimeout(()=>{if(notice===message){notice='';const t=$('.toast');if(t)t.remove();}},4000);}
function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null;}}
const pages={dashboard,matches,tactics,squad,league:leaguePage,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more};
function render(){
 const holder=$('#app');if(!holder)return;
 const priorScroll=$('#page')?.scrollTop||0;
 if(!state){holder.innerHTML=welcome(ui.color);return;}
 let pageContent=pages[page]?pages[page](state,ui):dashboard(state,ui);
 if(page!=='dashboard'&&page!=='matches'&&page!=='tactics'&&page!=='squad')pageContent=pageContent.replace('</header>','</header>'+roomScene(page,state));
 holder.innerHTML=shell(state,page,pageContent,notice);
 if(ui.player!==null&&page!=='squad')ui.player=null;

 const viewport=$('#page');if(viewport)viewport.scrollTop=priorScroll;
}
function go(to){if(!pages[to])return;stopReplay();page=to;ui.slot=null;ui.player=null;notice='';render();const el=$('#page');if(el)el.scrollTop=0;}
function act(action,data={}){
 try{
  if(action==='nav')return go(data.to);
  if(action==='select-slot'){ui.slot=data.slot;return render();}
  if(action==='cancel-slot'){ui.slot=null;return render();}
  if(action==='close-player'){ui.player=null;return render();}
  if(action==='show-player'){ui.player=data.id;return render();}
  if(action==='swap-slot'){
   if(ui.slot===null)return notification('Seleciona uma posição no relvado.');
   execute(state,'swap',{id:data.id,slot:ui.slot});ui.slot=null;persist();return notification('Onze inicial atualizado.');
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
 if(ball){ball.style.left=(last?.x??50)+'%';ball.style.top=(last?.y??50)+'%';}
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
 if(el.dataset.action==='formation'){act('formation',{value:el.value});ui.slot=null;}
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
  if(ui.slot!==null){act('cancel-slot');return;}
  if(page!=='dashboard')go('dashboard');
  return;
 }
 const hotkeys={'1':'dashboard','2':'matches','3':'tactics','4':'squad','5':'more'};
 if(hotkeys[event.key]){event.preventDefault();go(hotkeys[event.key]);}
});
window.addEventListener('beforeunload',()=>{stopReplay();if(state)saveState(state);});
if(state){ui.color=state.club.color;saveState(state);}
render();
