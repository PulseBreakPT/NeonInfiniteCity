
import {FORMATIONS,POSITIONS,COLORS,FACILITY_DATA,MENTORS,rating,teamPower,standings,money,getPlayer,nextFixture,fixtureName,clamp} from './model.js';
import {esc,icon,crest,pill,bar,avatar,btn,title,panel,playerItem,info,navItems} from './ui-core.js';
const val=(v,arr,label)=>'<select data-field="'+label+'">'+arr.map(x=>'<option value="'+esc(x)+'" '+(v===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
const spell=s=>({defensiva:'Defensiva',equilibrada:'Equilibrada',ofensiva:'Ofensiva',baixa:'Baixa',media:'Média',alta:'Alta',curto:'Curto',misto:'Misto',longo:'Longo',lento:'Lento',normal:'Normal',rapido:'Rápido',zona:'À zona',individual:'Individual'}[s]||s);
function tacticSelector(state,key,options,label){
 return '<label class="control-field"><span>'+label+'</span><select data-tactic="'+key+'">'+options.map(v=>'<option value="'+v+'" '+(state.tactics[key]===v?'selected':'')+'>'+spell(v)+'</option>').join('')+'</select></label>';
}
function lineScore(state){return teamPower(state,0,false).toFixed(1);}
function matchHistory(s){return s.results.slice(0,6).map(({type,round,result:r})=>{
 const own=r.home===0?r.hg:r.ag,opp=r.home===0?r.ag:r.hg;
 return '<div class="result-row"><span class="score-circle '+(own>opp?'win':own===opp?'draw':'loss')+'">'+(own>opp?'V':own===opp?'E':'D')+'</span><div class="grow"><strong>'+esc(r.homeName)+' <b>'+r.hg+'–'+r.ag+'</b> '+esc(r.awayName)+'</strong><small>'+(type==='cup'?'Taça':'Liga')+' · Ronda '+round+'</small></div>'+btn('open-result','Detalhes','quiet','data-round="'+round+'" data-kind="'+type+'"')+'</div>';}).join('')||'<div class="empty-state">Ainda não disputaste partidas.</div>';}
export function dashboard(s){
 const f=nextFixture(s),opp=f?fixtureName(s,f.home===0?f.away:f.home):'Época concluída',rank=standings(s).findIndex(t=>t.id===0)+1;
 return title('CENTRO DE COMANDO','O TEU GABINETE','Todas as decisões começam aqui.',btn('match','Jogar jornada '+Math.min(30,s.league.round),'accent',s.league.completed?'disabled':''))+
 '<div class="dashboard-grid"><div class="hero-card"><span class="eyebrow">O CAMINHO PARA A GLÓRIA</span><h2>FAZ<br>A HISTÓRIA.</h2><p>Prepara o onze. Supera os rivais. Constrói um clube que perdura através das épocas.</p><div class="hero-actions">'+btn('nav','Preparar equipa '+icon('arrow'),'accent','data-to="tactics"')+btn('nav','Ver competição','subtle','data-to="league"')+'</div><div class="hero-pitch"><i></i><i></i><i></i></div></div>'+
 '<div class="kpi-grid"><div class="kpi"><small>QUALIDADE DO ONZE</small><strong>'+lineScore(s)+'</strong><span>OVR do onze inicial</span></div><div class="kpi"><small>POSIÇÃO NA LIGA</small><strong>'+rank+'<em>º</em></strong><span>16 equipas</span></div><div class="kpi"><small>CONDIÇÃO MÉDIA</small><strong>'+Math.round(s.players.reduce((n,p)=>n+p.fitness,0)/s.players.length)+'<em>%</em></strong><span>Plantel profissional</span></div><div class="kpi"><small>ADEPTOS</small><strong>'+s.fans.toLocaleString('pt-PT')+'</strong><span>Apoio ao teu clube</span></div></div></div>'+
 '<div class="content-two">'+panel('Próximo adversário',f?'<div class="fixture-preview"><div>'+crest(s)+'<b>'+esc(s.club.name)+'</b></div><span>VS</span><div><span class="rival-crest">FC</span><b>'+esc(opp)+'</b></div></div><div class="fixture-meta">'+pill('JORNADA '+s.league.round)+pill(f.home===0?'CASA':'FORA')+' '+pill('DIVISÃO '+s.division)+'</div>'+btn('match','Disputar jogo '+icon('play'),'accent full'):'<div class="empty-state">A época terminou. Inicia uma nova temporada.</div>'+btn('new-season','Iniciar próxima época','accent full',''+(!s.league.completed?'disabled':'')),pill('LIGA NACIONAL'))+
 panel('Atividade do clube',s.activity.slice(0,5).map(a=>'<div class="activity-entry"><span class="activity-icon">'+icon('check',15)+'</span><div><strong>'+esc(a.title)+'</strong><small>'+esc(a.detail)+'</small></div></div>').join('')||'<p>Sem atividade.</p>')+'</div>'+
 '<div class="content-two">'+panel('Últimos resultados',matchHistory(s),btn('nav','Calendário →','quiet','data-to="league"'))+
 panel('Plano da semana',[
 ['Táticas','Refina instruções antes do apito inicial','tactics'],['Mercado','Observa reforços e renova contratos','market'],['Academia','Desenvolve as próximas estrelas','academy']
 ].map(([a,b,to])=>'<button class="task-link" data-nav="'+to+'"><span class="task-icon">'+icon(to==='tactics'?'pitch':to==='market'?'swap':'book')+'</span><span><strong>'+a+'</strong><small>'+b+'</small></span>'+icon('arrow')+'</button>').join(''))+'</div>';
}
function matchPitch(s,view){
 const home=view?.homeName||s.club.name,away=view?.awayName||'Adversário';
 const pitchLines='<div class="pitch-markings"><span class="midline"></span><span class="midcircle"></span><span class="box top"></span><span class="box bottom"></span><span class="goal-area a"></span><span class="goal-area b"></span></div>';
 const positions=[
 [50,88],[14,72],[37,74],[63,74],[86,72],[22,51],[50,54],[78,51],[21,31],[50,25],[79,31]
 ];
 const points=positions.map(([x,y],i)=>{
 const id=s.lineups[s.formation][i],p=getPlayer(s,id);
 return '<div class="pitch-dot home-dot" style="left:'+x+'%;top:'+y+'%;--delay:'+i*.3+'s" title="'+esc(p?.name)+'"><span>'+esc(String(p?.number??(i+1)))+'</span></div>';
 }).join('');
 const opponents=positions.map(([x,y],i)=>'<div class="pitch-dot away-dot" style="left:'+x+'%;top:'+(100-y)+'%;--delay:'+i*.2+'s"><span>'+(i+1)+'</span></div>').join('');
 return '<div class="live-pitch">'+pitchLines+points+opponents+'<span id="ball" class="football" style="left:50%;top:50%">⚽</span><span class="pitch-foot">'+esc(home)+' vs '+esc(away)+'</span></div>';
}
export function matches(s){
 const f=nextFixture(s),r=s.lastMatch,extra=s.league.completed?'Época terminada':f?'Liga Nacional · Jornada '+f.round:'Sem partidas';
 return title('CENTRO DE PARTIDAS','MATCHDAY',extra,s.league.completed?btn('new-season','Nova época','accent'):btn('match','Jogar jornada '+s.league.round,'accent'))+
 '<div class="match-layout"><section class="panel live-card"><div class="match-heading"><div><span class="eyebrow">'+(r?'ÚLTIMA PARTIDA · REPLAY':'PRÓXIMA JORNADA')+'</span><div class="match-versus"><span>'+esc(r?r.homeName:f?fixtureName(s,f.home):s.club.name)+'</span><strong id="live-score">'+(r?r.hg+' : '+r.ag:'VS')+'</strong><span>'+esc(r?r.awayName:f?fixtureName(s,f.away):'Adversário')+'</span></div></div>'+pill(r?'FINALIZADO':'PRÉ-JOGO',r?'good':'gold')+'</div>'+
 matchPitch(s,r||null)+
 '<div class="commentary"><span id="live-minute">'+(r?'90’':'00’')+'</span><strong id="live-comment">'+esc(r?r.events.at(-1).text:'Define o teu onze antes da partida.')+'</strong></div><div class="match-controls">'+btn('replay','Rever a partida '+icon('play'),'subtle',r?'':'disabled')+btn('nav','Táticas '+icon('shield'),'subtle','data-to="tactics"')+(!s.league.completed?btn('match','Próxima jornada '+icon('arrow'),'accent'):'')+'</div></section>'+
 '<section class="panel stat-card"><div class="panel-heading"><h3>'+(r?'Estatísticas':'Preparação de jogo')+'</h3>'+pill(r?'FINAL':'PREVIEW')+'</div>'+(r?[
 ['Posse de bola',r.stats.possession+'%',(100-r.stats.possession)+'%',r.stats.possession],
 ['Remates',r.stats.shotsHome,r.stats.shotsAway,Math.round(r.stats.shotsHome/(r.stats.shotsHome+r.stats.shotsAway)*100)],
 ['À baliza',r.stats.onTargetHome,r.stats.onTargetAway,Math.round(r.stats.onTargetHome/Math.max(1,r.stats.onTargetHome+r.stats.onTargetAway)*100)],
 ['Golos esperados',r.stats.xgHome,r.stats.xgAway,Math.round(Number(r.stats.xgHome)/(Number(r.stats.xgHome)+Number(r.stats.xgAway))*100)]
 ].map(([name,a,b,p])=>'<div class="match-stat"><small>'+name+'</small><div class="row between"><strong>'+a+'</strong>'+bar(p)+'<strong>'+b+'</strong></div></div>').join('')+
 '<h4>Momentos do jogo</h4><div class="match-events">'+r.events.filter(e=>e.kind==='goal'||e.kind==='injury'||e.kind==='card'||e.kind==='half').map(e=>'<div><b>'+e.minute+'’</b> '+esc(e.text)+'</div>').join('')+'</div>':
 info('Força do onze',lineScore(s)+' OVR')+info('Esquema tático',s.formation)+info('Mentalidade',spell(s.tactics.mentality))+info('Pressão',spell(s.tactics.pressure))+info('Mentor ativo',esc(s.mentors.find(m=>m.id===s.mentorActive)?.name||'Sem mentor'))+'<p class="muted note">O simulador considera qualidade do plantel, condição, moral, vantagem de casa e escolhas táticas.</p>')+'</section></div>'+
 panel('Histórico de resultados',matchHistory(s))+
 '<p class="muted note">A animação é um replay visual dos acontecimentos calculados pelo motor. As decisões táticas devem ser feitas antes da simulação.</p>';
}
function positionalLayout(s){
 const positions={
 '4-3-3':[[50,88],[16,70],[38,73],[62,73],[84,70],[25,51],[50,55],[75,51],[21,29],[50,22],[79,29]],
 '4-4-2':[[50,88],[16,70],[38,73],[62,73],[84,70],[14,50],[38,51],[62,51],[86,50],[36,27],[64,27]],
 '4-2-3-1':[[50,88],[16,71],[38,73],[62,73],[84,71],[35,59],[65,59],[19,40],[50,39],[81,40],[50,23]],
 '3-5-2':[[50,88],[25,74],[50,75],[75,74],[12,53],[32,54],[50,58],[68,54],[88,53],[35,29],[65,29]],
 '5-3-2':[[50,88],[10,73],[30,76],[50,77],[70,76],[90,73],[28,52],[50,54],[72,52],[37,28],[63,28]]
 }[s.formation];
 return '<div class="tactic-pitch">'+positions.map(([x,y],i)=>{
 const p=getPlayer(s,s.lineups[s.formation]?.[i]);
 return '<button class="formation-player" style="left:'+x+'%;top:'+y+'%" data-action="select-slot" data-slot="'+i+'"><span class="shirt" style="--shirt:'+esc(s.club.color)+'">'+esc(p?.number||'?')+'</span><b>'+esc(short(p?.name))+'</b><small>'+FORMATIONS[s.formation][i]+' • '+rating(p)+'</small></button>';
 }).join('')+'<div class="tactical-line mid"></div><div class="tactical-circle"></div><div class="tactical-box top"></div><div class="tactical-box bottom"></div></div>';
}
export function tactics(s,ui){
 const slot=ui.slot,arr=s.lineups[s.formation],available=s.players.filter(p=>p.injury===0&&(slot===null||!arr.includes(p.id)||arr[slot]===p.id)).sort((a,b)=>rating(b)-rating(a));
 return title('ESTRATÉGIA','QUADRO TÁTICO','Controla a estrutura e o comportamento da tua equipa.',btn('best-eleven','Otimizar onze','accent'))+
 '<div class="content-two wider"><section class="panel"><div class="panel-heading"><h3>Onze inicial</h3><label class="inline-select">Formação <select data-action="formation">'+Object.keys(FORMATIONS).map(f=>'<option '+(s.formation===f?'selected':'')+'>'+f+'</option>').join('')+'</select></label></div>'+positionalLayout(s)+'<div class="panel-foot">'+pill('FORÇA '+lineScore(s)+' OVR','good')+pill('FORMAÇÃO '+s.formation)+'</div></section>'+
 panel(slot===null?'Banco de suplentes':'Escolhe um substituto',slot===null?'<p class="note">Toca num jogador no relvado para escolheres quem ocupa essa posição. Lesionados não podem ser selecionados.</p>'+s.players.filter(p=>!arr.includes(p.id)).slice(0,6).map(p=>'<div class="compact-player">'+avatar(p)+'<span>'+esc(p.name)+'</span>'+pill(rating(p))+'</div>').join(''):'<div class="chosen-slot">Posição: <b>'+FORMATIONS[s.formation][slot]+'</b>'+btn('cancel-slot','Cancelar','quiet')+'</div><div class="scroll-players">'+available.map(p=>playerItem(p,'swap-slot')).join('')+'</div>')+'</div>'+
 panel('Ordens de equipa','<div class="tactics-grid">'+tacticSelector(s,'mentality',['defensiva','equilibrada','ofensiva'],'Mentalidade')+tacticSelector(s,'pressure',['baixa','media','alta'],'Pressão')+tacticSelector(s,'passing',['curto','misto','longo'],'Tipos de passe')+tacticSelector(s,'tempo',['lento','normal','rapido'],'Ritmo')+tacticSelector(s,'marking',['zona','individual'],'Marcação')+'</div><p class="note muted">Estas escolhas influenciam ataque, defesa, controlo do meio-campo e fadiga no motor de partidas.</p>') ;
}
export function squad(s,ui){
 const filtered=s.players.filter(p=>(ui.position==='ALL'||p.pos===ui.position)&&p.name.toLowerCase().includes(ui.search.toLowerCase())).sort((a,b)=>rating(b)-rating(a));
 return title('RECURSOS HUMANOS','PLANTEL PRINCIPAL',s.players.length+' atletas · Formação '+s.formation,btn('nav','Quadro tático','accent','data-to="tactics"'))+
 '<div class="filters"><input id="player-search" placeholder="Pesquisar jogador…" value="'+esc(ui.search)+'"><select id="player-filter"><option value="ALL">Todas as posições</option>'+Object.keys(POSITIONS).map(p=>'<option value="'+p+'" '+(ui.position===p?'selected':'')+'>'+POSITIONS[p]+'</option>').join('')+'</select>'+pill(filtered.length+' jogadores')+'</div>'+
 '<div class="panel table-wrap"><table class="data-table"><thead><tr><th>Jogador</th><th>Pos</th><th>Idade</th><th>OVR</th><th>Condição</th><th>Moral</th><th>Salário</th><th>Contrato</th></tr></thead><tbody>'+filtered.map(p=>'<tr data-action="show-player" data-id="'+p.id+'"><td><div class="table-player">'+avatar(p)+'<div><b>'+esc(p.name)+'</b><small> Nº '+p.number+' · '+esc(p.nation)+'</small></div></div></td><td>'+pill(p.pos)+'</td><td>'+p.age+'</td><td><span class="ovr">'+rating(p)+'</span></td><td>'+bar(p.fitness)+(p.injury>0?pill('Lesão '+p.injury,'danger'):' '+p.fitness+'%')+'</td><td>'+p.morale+'%</td><td>'+money(p.salary)+'</td><td>'+p.contract+' épocas</td></tr>').join('')+'</tbody></table></div>'+(ui.player!==null?playerDetail(s,ui.player):'');
}
export function playerDetail(s,id){
 const p=getPlayer(s,id);if(!p)return'';
 return '<div class="modal-overlay" data-action="close-player"><div class="player-dialog" role="dialog" aria-modal="true" aria-label="Ficha do jogador" onclick="event.stopPropagation()"><div class="dialog-head">'+avatar(p)+'<div class="grow"><span class="eyebrow">CARTÃO DE JOGADOR</span><h2>'+esc(p.name)+'</h2><small>'+esc(p.nation)+' · '+POSITIONS[p.pos]+' · '+p.age+' anos</small></div>'+pill('OVR '+rating(p),'good')+btn('close-player','✕','quiet')+'</div><div class="attribute-grid">'+['pac','sho','pas','def','phy','gk'].map(k=>'<div><small>'+({pac:'VELOCIDADE',sho:'REMATE',pas:'PASSE',def:'DEFESA',phy:'FÍSICO',gk:'BALIZA'}[k])+'</small><b>'+p[k]+'</b>'+bar(p[k])+'</div>').join('')+'</div>'+
 '<div class="dialog-meta">'+info('Potencial',p.potential)+info('Estilo',esc(p.style||'Por desenvolver'))+info('Especialidade',esc(p.special||'Nenhuma'))+info('Classe',p.classLevel)+info('Golos',p.goals)+info('Assistências',p.assists)+info('Partidas',p.apps)+info('Contrato',p.contract+' épocas')+'</div><div class="row wrap" style="margin-top:12px"><label class="control-field grow"><span>Aprender posição · 2 tokens</span><select id="position-choice">'+Object.keys(POSITIONS).map(pos=>'<option value="'+pos+'" '+(pos===p.pos?'selected':'')+'>'+POSITIONS[pos]+'</option>').join('')+'</select></label>'+btn('position','Treinar posição','subtle','data-id="'+p.id+'"')+'</div><div class="dialog-actions">'+btn('renew','Renovar contrato','subtle','data-id="'+p.id+'"')+btn('player-class','Evoluir classe','subtle','data-id="'+p.id+'"')+btn('special','Especialidade','subtle','data-id="'+p.id+'"')+(p.injury>0?btn('heal','Tratar lesão','accent','data-id="'+p.id+'"'):'')+btn('sell','Vender jogador','danger','data-id="'+p.id+'"')+'</div></div></div>';
}
