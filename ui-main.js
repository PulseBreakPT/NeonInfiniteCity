
import {FORMATIONS,POSITIONS,COLORS,FACILITY_DATA,MENTORS,rating,teamPower,standings,money,getPlayer,nextFixture,fixtureName,clamp} from './model.js';
import {esc,short,icon,crest,pill,bar,avatar,btn,title,panel,playerItem,info,navItems} from './ui-core.js';
const val=(v,arr,label)=>'<select data-field="'+label+'">'+arr.map(x=>'<option value="'+esc(x)+'" '+(v===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
const spell=s=>({defensiva:'Defensiva',equilibrada:'Equilibrada',ofensiva:'Ofensiva',baixa:'Baixa',media:'Média',alta:'Alta',curto:'Curto',misto:'Misto',longo:'Longo',lento:'Lento',normal:'Normal',rapido:'Rápido',zona:'À zona',individual:'Individual'}[s]||s);
function tacticSelector(state,key,options,label){
 return '<label class="control-field"><span>'+label+'</span><select data-tactic="'+key+'">'+options.map(v=>'<option value="'+v+'" '+(state.tactics[key]===v?'selected':'')+'>'+spell(v)+'</option>').join('')+'</select></label>';
}
function lineScore(state){return teamPower(state,0,false).toFixed(1);}
function matchHistory(s){return s.results.slice(0,6).map(({type,round,result:r})=>{
 const own=r.home===0?r.hg:r.ag,opp=r.home===0?r.ag:r.hg;
 return '<div class="result-row"><span class="score-circle '+(own>opp?'win':own===opp?'draw':'loss')+'">'+(own>opp?'V':own===opp?'E':'D')+'</span><div class="grow"><strong>'+esc(r.homeName)+' <b>'+r.hg+'–'+r.ag+'</b> '+esc(r.awayName)+'</strong><small>'+(type==='cup'?'Taça':'Liga')+' · Ronda '+round+'</small></div>'+btn('open-result','Detalhes','quiet','data-round="'+round+'" data-kind="'+type+'"')+'</div>';}).join('')||'<div class="empty-state">Ainda não disputaste partidas.</div>';}
export function legacyDashboard(s){
 const f=nextFixture(s),opp=f?fixtureName(s,f.home===0?f.away:f.home):'Época concluída',rank=standings(s).findIndex(t=>t.id===0)+1;
 const avg=Math.round(s.players.reduce((n,p)=>n+p.fitness,0)/Math.max(1,s.players.length));
 const moral=Math.round(s.players.reduce((n,p)=>n+p.morale,0)/Math.max(1,s.players.length));
 const power=lineScore(s);
 const cards=[['matches','pitch','Partida','Jogar a jornada','JORNADA '+Math.min(s.league.round,30)],['tactics','shield','CENTRO TÁTICO','Definir o onze',s.formation],
 ['squad','users','Equipa','Gerir os atletas',s.players.length+' JOGADORES'],['market','swap','TRANSFERÊNCIAS','Reforçar a equipa','JANELA ABERTA'],
 ['training','bolt','TREINO','Preparação física',s.trainingCount+'/3 SESSÕES'],['league','trophy','COMPETIÇÕES','Tabela e calendário',rank+'º LUGAR']];
 return title('CARREIRA / ÉPOCA '+s.season,'QUARTEL-GENERAL','Um clube. Uma identidade. Uma temporada para conquistar.',s.league.completed?btn('new-season','NOVA TEMPORADA '+icon('arrow'),'accent'):btn('match','INICIAR JORNADA '+icon('play'),'accent'))+
 '<div class="game-home-layout"><section class="home-stadium"><div class="home-stadium-shade"></div><div class="home-stadium-content"><div class="home-broadcast"><span class="broadcast-live"><b></b> MATCHDAY</span><span>LIGA NACIONAL <i>•</i> ÉPOCA '+s.season+'</span><span>JORNADA '+Math.min(s.league.round,30)+' / 30</span></div>'+
 '<div class="home-stadium-main"><span class="home-event-tag">'+(f?'PRÓXIMO CONFRONTO':'ÉPOCA CONCLUÍDA')+'</span><div class="home-team-vs"><div class="home-team"><span class="home-crest">'+crest(s)+'</span><strong>'+esc(s.club.name)+'</strong><small>O TEU CLUBE</small></div><div class="home-vs"><span>VS</span><small>'+(f?(f.home===0?'CASA':'FORA'):'FINAL')+'</small></div><div class="home-team"><span class="home-crest rival"><span class="rival-crest">'+esc(opp.split(' ').map(x=>x[0]).slice(0,2).join(''))+'</span></span><strong>'+esc(opp)+'</strong><small>ADVERSÁRIO</small></div></div></div>'+
 '<div class="home-stadium-footer"><div><span>ESTÁDIO</span><strong>'+esc(f&&f.home!==0?'Estádio adversário':s.club.stadium)+'</strong></div><div><span>ONZE INICIAL</span><strong>'+power+' OVR</strong></div><div class="home-cta">'+(s.league.completed?btn('new-season','NOVA ÉPOCA '+icon('arrow'),'accent'):btn('match','Jogar '+icon('arrow'),'accent'))+'</div></div></div></section>'+
 '<aside class="home-command-stack"><div class="command-overview"><div class="command-label"><span>ESTADO DO CLUBE</span><strong>PLANTEL <i>●</i></strong></div><div class="command-power"><div class="power-dial" style="--power:'+Math.min(100,Math.max(0,Number(power)))+'"><span>'+power+'</span><small>OVR</small></div><div class="power-stats"><span>FORÇA DA EQUIPA</span><strong>'+rank+'º <small>NA LIGA</small></strong><p>PLANTEL COMPETITIVO</p></div></div><div class="command-meter"><span>CONDIÇÃO</span>'+bar(avg)+'<b>'+avg+'%</b></div><div class="command-meter"><span>MORAL</span>'+bar(moral)+'<b>'+moral+'%</b></div></div>'+
 '<button class="command-director" data-nav="profile"><span class="director-glyph">'+icon('user',27)+'</span><span><small>MENSAGEM DA DIREÇÃO</small><strong>'+(rank<=5?'LUTAR PELOS TÍTULOS':rank<=10?'MANTER O RUMO':'É HORA DE REAGIR')+'</strong><em>CONFIANÇA '+(s.finance.boardConfidence??75)+'%</em></span>'+icon('arrow')+'</button></aside></div>'+
 '<div class="home-section-head"><span>ACESSO RÁPIDO</span><strong>CENTROS DE OPERAÇÃO</strong><small>ESCOLHE O TEU PRÓXIMO PASSO</small></div>'+
 '<div class="home-module-grid">'+cards.map(([id,ic,name,desc,value],i)=>'<button class="home-module module-'+i+'" data-nav="'+id+'"><span class="home-module-head"><span class="module-symbol">'+icon(ic,23)+'</span><span class="module-count">'+String(i+1).padStart(2,'0')+'</span></span><span class="module-meta">'+esc(value)+'</span><strong>'+name+'</strong><small>'+desc+'</small><span class="module-open">'+icon('arrow',19)+'</span></button>').join('')+'</div>'+
 '<div class="content-two home-lower">'+panel('CENTRO DE NOTÍCIAS',s.activity.slice(0,4).map(a=>'<div class="activity-entry"><span class="activity-icon">'+icon('check',15)+'</span><div><strong>'+esc(a.title)+'</strong><small>'+esc(a.detail)+'</small></div></div>').join('')||'<div class="empty-state">Ainda sem novidades.</div>',btn('nav','VER HISTÓRICO '+icon('arrow'),'quiet','data-to="profile"'))+
 panel('ÚLTIMOS RESULTADOS',matchHistory(s),btn('nav','IR PARA A LIGA '+icon('arrow'),'quiet','data-to="league"'))+'</div>';
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
 '<div class="broadcast-banner"><div class="broadcast-left"><span class="broadcast-beacon"><b></b> '+(r?'REPLAY DISPONÍVEL':'PRÉ-JOGO')+'</span><strong>LIGA NACIONAL</strong></div><div class="broadcast-right"><span>90 MINUTOS</span><span>● 2D TÁTICO</span><span>'+esc(r?.weather||'—')+'</span></div></div>'+
 '<div class="match-layout broadcast-layout"><section class="panel live-card"><div class="match-heading"><div><span class="eyebrow">'+(r?'ÚLTIMA PARTIDA · REPLAY':'PRÓXIMA JORNADA')+'</span><div class="match-versus"><span>'+esc(r?r.homeName:f?fixtureName(s,f.home):s.club.name)+'</span><strong id="live-score">'+(r?r.hg+' : '+r.ag:'VS')+'</strong><span>'+esc(r?r.awayName:f?fixtureName(s,f.away):'Adversário')+'</span></div></div>'+pill(r?'FINALIZADO':'PRÉ-JOGO',r?'good':'gold')+'</div>'+
 '<div class="pitch-camera-frame"><div class="pitch-camera-label">CAM 01 <span>↗</span> VISÃO TÁTICA</div>'+matchPitch(s,r||null)+'<div class="pitch-camera-corners"><i></i><i></i><i></i><i></i></div></div>'+
 '<div class="match-timeline"><div class="timeline-top"><span>REPLAY DA PARTIDA</span><strong id="timeline-clock">'+(r?'90:00':'00:00')+'</strong></div><div class="timeline-track">'+(r?r.events.filter(e=>['goal','card','red','injury','half','penalties'].includes(e.kind)).map(e=>'<span class="timeline-marker marker-'+esc(e.kind)+'" style="left:'+(e.minute/90*100)+'%" title="'+esc(e.minute+' min: '+e.text)+'"></span>').join(''):'')+'<input type="range" aria-label="Minuto do replay" id="match-timeline" min="0" max="90" step="1" value="'+(r?90:0)+'" '+(r?'':'disabled')+'></div><div class="timeline-rulers"><span>00</span><span>15</span><span>30</span><span>45</span><span>60</span><span>75</span><span>90</span></div></div>'+
 '<div class="commentary"><span id="live-minute">'+(r?'90’':'00’')+'</span><strong id="live-comment">'+esc(r?r.events.at(-1).text:'Define o teu onze antes da partida.')+'</strong></div><div class="match-controls cinematic-controls">'+btn('replay','▶ REPLAY','subtle',r?'':'disabled')+btn('replay-pause','<span id="replay-pause-label">PAUSAR</span>','subtle',r?'':'disabled')+btn('replay-speed','<span id="replay-speed-label">1×</span>','subtle',r?'':'disabled')+btn('nav','TÁTICAS '+icon('shield'),'subtle','data-to="tactics"')+(!s.league.completed?btn('match','Próxima jornada '+icon('arrow'),'accent'):'')+'</div></section>'+
 '<section class="panel stat-card"><div class="panel-heading"><h3>'+(r?'Estatísticas':'Preparação de jogo')+'</h3>'+pill(r?'FINAL':'PREVIEW')+'</div>'+(r?[
 ['Posse de bola',r.stats.possession+'%',(100-r.stats.possession)+'%',r.stats.possession],
 ['Remates',r.stats.shotsHome,r.stats.shotsAway,Math.round(r.stats.shotsHome/(r.stats.shotsHome+r.stats.shotsAway)*100)],
 ['À baliza',r.stats.onTargetHome,r.stats.onTargetAway,Math.round(r.stats.onTargetHome/Math.max(1,r.stats.onTargetHome+r.stats.onTargetAway)*100)],
 ['Golos esperados',r.stats.xgHome,r.stats.xgAway,Math.round(Number(r.stats.xgHome)/(Number(r.stats.xgHome)+Number(r.stats.xgAway))*100)],
 ['Passes certos',r.stats.accurateHome??0,r.stats.accurateAway??0,Math.round((r.stats.accurateHome??0)/Math.max(1,(r.stats.accurateHome??0)+(r.stats.accurateAway??0))*100)],
 ['Cantos',r.stats.cornersHome??0,r.stats.cornersAway??0,Math.round((r.stats.cornersHome??0)/Math.max(1,(r.stats.cornersHome??0)+(r.stats.cornersAway??0))*100)],
 ['Faltas',r.stats.foulsHome??0,r.stats.foulsAway??0,Math.round((r.stats.foulsHome??0)/Math.max(1,(r.stats.foulsHome??0)+(r.stats.foulsAway??0))*100)]
 ].map(([name,a,b,p])=>'<div class="match-stat"><small>'+name+'</small><div class="row between"><strong>'+a+'</strong>'+bar(p)+'<strong>'+b+'</strong></div></div>').join('')+
 '<h4>Momentos do jogo</h4><div class="match-events">'+r.events.filter(e=>['goal','injury','card','red','half','tactical','save','substitution','penalties','end'].includes(e.kind)).map(e=>'<div><b>'+e.minute+'’</b> '+esc(e.text)+'</div>').join('')+'</div>':
 info('Força do onze',lineScore(s)+' OVR')+info('Últimas condições climatéricas',esc(s.lastMatch?.weather||'A definir'))+info('Esquema tático',s.formation)+info('Mentalidade',spell(s.tactics.mentality))+info('Pressão',spell(s.tactics.pressure))+info('Mentor ativo',esc(s.mentors.find(m=>m.id===s.mentorActive)?.name||'Sem mentor'))+info('Treinador rival',esc(s.rivals?.[f?.home===0?f.away:f?.home]?.manager?.name||'A definir'))+info('Estilo rival',esc(s.rivals?.[f?.home===0?f.away:f?.home]?.tactics?.mentality||'equilibrada'))+'<p class="muted note">O simulador considera qualidade do plantel, condição, moral, vantagem de casa e escolhas táticas.</p>')+'</section></div>'+
 panel('Histórico de resultados',matchHistory(s))+
 '<p class="muted note">Motor de acontecimentos: passes, interceções, faltas, remates e golos geram os resultados e as estatísticas. O replay 2D é esquemático; prepara alterações táticas antes de iniciar a jornada.</p>';
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
 return title('Táticas','QUADRO TÁTICO','Controla a estrutura e o comportamento da tua equipa.',btn('best-eleven','Otimizar onze','accent'))+
 '<div class="content-two wider"><section class="panel"><div class="panel-heading"><h3>Onze inicial</h3><label class="inline-select">Formação <select data-action="formation">'+Object.keys(FORMATIONS).map(f=>'<option '+(s.formation===f?'selected':'')+'>'+f+'</option>').join('')+'</select></label></div>'+positionalLayout(s)+'<div class="panel-foot">'+pill('FORÇA '+lineScore(s)+' OVR','good')+pill('FORMAÇÃO '+s.formation)+'</div></section>'+
 panel(slot===null?'Banco de suplentes':'Escolhe um substituto',slot===null?'<p class="note">Toca num jogador no relvado para escolheres quem ocupa essa posição. Lesionados não podem ser selecionados.</p>'+s.players.filter(p=>!arr.includes(p.id)).slice(0,6).map(p=>'<div class="compact-player">'+avatar(p)+'<span>'+esc(p.name)+'</span>'+pill(rating(p))+'</div>').join(''):'<div class="chosen-slot">Posição: <b>'+FORMATIONS[s.formation][slot]+'</b>'+btn('cancel-slot','Cancelar','quiet')+'</div><div class="scroll-players">'+available.map(p=>playerItem(p,'swap-slot')).join('')+'</div>')+'</div>'+
 panel('Ordens de equipa','<div class="tactics-grid">'+tacticSelector(s,'mentality',['defensiva','equilibrada','ofensiva'],'Mentalidade')+tacticSelector(s,'pressure',['baixa','media','alta'],'Pressão')+tacticSelector(s,'passing',['curto','misto','longo'],'Tipos de passe')+tacticSelector(s,'tempo',['lento','normal','rapido'],'Ritmo')+tacticSelector(s,'marking',['zona','individual'],'Marcação')+tacticSelector(s,'halftimePlan',['auto','agressivo','proteger','manter'],'Plano de intervalo')+'</div><p class="note muted">Estas escolhas influenciam ataque, defesa, controlo do meio-campo e fadiga no motor de partidas.</p>') ;
}
export function squad(s,ui){
 const filtered=s.players.filter(p=>(ui.position==='ALL'||p.pos===ui.position)&&p.name.toLowerCase().includes(ui.search.toLowerCase())).sort((a,b)=>rating(b)-rating(a));
 const xi=new Set(s.lineups[s.formation]||[]);
 return title('Equipa / EQUIPA PRINCIPAL','O TEU PLANTEL',s.players.length+' atletas profissionais · Esquema '+s.formation,btn('nav','EDITAR O ONZE '+icon('arrow'),'accent','data-to="tactics"'))+
 '<div class="filters player-filters"><input id="player-search" placeholder="Pesquisar futebolista…" aria-label="Pesquisar futebolista" value="'+esc(ui.search)+'"><select id="player-filter" aria-label="Filtrar posição"><option value="ALL">Todas as posições</option>'+Object.keys(POSITIONS).map(p=>'<option value="'+p+'" '+(ui.position===p?'selected':'')+'>'+POSITIONS[p]+'</option>').join('')+'</select>'+pill(filtered.length+' ATLETAS','good')+'</div>'+
 '<div class="player-deck">'+filtered.map((p,i)=>{
 const isStarter=xi.has(p.id),health=p.injury>0?'LESIONADO':(p.suspendedUntilWeek||0)>=s.week?'SUSPENSO':'DISPONÍVEL';
 return '<button class="football-card" data-action="show-player" data-id="'+p.id+'" aria-label="Ver ficha de '+esc(p.name)+'"><div class="football-card-top"><div class="football-rating"><strong>'+rating(p)+'</strong><span>'+p.pos+'</span></div><span class="football-card-label">'+(isStarter?'TITULAR':'SUPLENTE')+'</span></div><div class="football-portrait"><div class="portrait-shadow"></div><div class="portrait-head"></div><div class="portrait-shoulders"></div><span class="portrait-number">'+p.number+'</span></div><div class="football-player-name">'+esc(p.name)+'</div><div class="football-card-meta"><span>'+p.age+' ANOS</span><span>'+esc(p.nation)+'</span></div><div class="football-attributes"><div><b>'+p.pac+'</b><small>VEL</small></div><div><b>'+p.sho+'</b><small>REM</small></div><div><b>'+p.pas+'</b><small>PAS</small></div><div><b>'+p.def+'</b><small>DEF</small></div></div><div class="football-card-footer"><span class="'+(health==='DISPONÍVEL'?'ready':'out')+'">● '+health+'</span><span>'+p.fitness+'% FIT</span></div></button>';
 }).join('')+'</div>'+(filtered.length?'':'<div class="empty-state">Não foram encontrados jogadores.</div>')+
 (ui.player!==null?playerDetail(s,ui.player):'');
}

export function playerDetail(s,id){
 const p=getPlayer(s,id);if(!p)return'';
 return '<div class="modal-overlay" data-action="close-player"><div class="player-dialog" role="dialog" aria-modal="true" aria-label="Ficha do jogador"><div class="dialog-head">'+avatar(p)+'<div class="grow"><span class="eyebrow">CARTÃO DE JOGADOR</span><h2>'+esc(p.name)+'</h2><small>'+esc(p.nation)+' · '+POSITIONS[p.pos]+' · '+p.age+' anos</small></div>'+pill('OVR '+rating(p),'good')+btn('close-player','✕','quiet')+'</div><div class="attribute-grid">'+['pac','sho','pas','def','phy','gk'].map(k=>'<div><small>'+({pac:'VELOCIDADE',sho:'REMATE',pas:'PASSE',def:'DEFESA',phy:'FÍSICO',gk:'BALIZA'}[k])+'</small><b>'+p[k]+'</b>'+bar(p[k])+'</div>').join('')+'</div>'+
 '<div class="dialog-meta">'+info('Potencial',p.potential)+info('Estilo',esc(p.style||'Por desenvolver'))+info('Especialidade',esc(p.special||'Nenhuma'))+info('Classe',p.classLevel)+info('Golos',p.goals)+info('Assistências',p.assists)+info('Partidas',p.apps)+info('Contrato',p.contract+' épocas')+'</div><div class="row wrap" style="margin-top:12px"><label class="control-field grow"><span>Aprender posição · 2 tokens</span><select id="position-choice">'+Object.keys(POSITIONS).map(pos=>'<option value="'+pos+'" '+(pos===p.pos?'selected':'')+'>'+POSITIONS[pos]+'</option>').join('')+'</select></label>'+btn('position','Treinar posição','subtle','data-id="'+p.id+'"')+'</div><div class="dialog-actions">'+btn('renew','Renovar contrato','subtle','data-id="'+p.id+'"')+btn('player-class','Evoluir classe','subtle','data-id="'+p.id+'"')+btn('special','Especialidade','subtle','data-id="'+p.id+'"')+(p.injury>0?btn('heal','Tratar lesão','accent','data-id="'+p.id+'"'):'')+btn('sell','Vender jogador','danger','data-id="'+p.id+'"')+'</div></div></div>';
}


export function dashboard(s){
 const f=nextFixture(s),rank=standings(s).findIndex(t=>t.id===0)+1,opp=f?fixtureName(s,f.home===0?f.away:f.home):'Fim de época';
 const avg=Math.round(s.players.reduce((a,p)=>a+p.fitness,0)/Math.max(1,s.players.length));
 const morale=Math.round(s.players.reduce((a,p)=>a+p.morale,0)/Math.max(1,s.players.length));
 const strength=teamPower(s,0,false).toFixed(1),nextWeek=s.league.round;
 const online=s.league.completed?btn('new-season','NOVA ÉPOCA '+icon('arrow'),'accent'):btn('match','JOGAR JORNADA '+icon('play'),'accent');
 const spots=[
  ['matches','pitch','ESTÁDIO','Jogar','57%','48%','01'],
  ['tactics','shield','Táticas','Definir onze','37%','39%','02'],
  ['training','bolt','Treinos','Treinar','23%','67%','03'],
  ['market','swap','Mercado','TRANSFERÊNCIAS','77%','29%','04'],
  ['academy','book','FORMAÇÃO','ACADEMIA','74%','73%','05']
 ];
 const fast=[['matches','pitch','Partida','Jornada '+nextWeek],['tactics','shield','Táticas',s.formation],['squad','users','Equipa',s.players.length+' atletas'],
 ['market','swap','MERCADO','Negociações'],['training','bolt','TREINOS',s.trainingCount+'/3 sessões'],['more','grid','CLUBE','Todos os sistemas']];
 return title('ÉPOCA '+s.season,'Gabinete')+
 '<div class="universe-layout"><section class="home-stadium universe-stage" aria-label="Complexo desportivo interativo">'+
 '<div class="stadium-scene-image" role="img" aria-label="Vista isométrica original do estádio e complexo desportivo"></div><div class="stadium-scene-dimmer"></div>'+
 '<div class="scene-topbar"><span class="scene-sector"><span class="scene-radar">✧</span> COMPLEXO DESPORTIVO</span></div>'+
 '<div class="scene-coordinate scene-coordinate-left">VISTA DO ESTÁDIO</div>'+
 '<div class="stadium-hotspots">'+spots.map(([id,ic,name,detail,left,top,n],i)=>'<button class="scene-hotspot hotspot-'+i+'" data-nav="'+id+'" style="left:'+left+';top:'+top+'" aria-label="'+esc(name)+' — '+esc(detail)+'"><span class="hotspot-pin">'+icon(ic,17)+'<span class="hotspot-pulse"></span></span><span class="hotspot-label"><b>'+esc(name)+'</b><small>'+esc(detail)+'</small></span><em>'+n+'</em></button>').join('')+'</div>'+
 '<div class="scene-event-panel"><div class="scene-event-text"><span>PRÓXIMO JOGO <b>·</b> LIGA NACIONAL</span><div class="home-team-vs"><strong>'+esc(s.club.name)+'</strong><span>VS</span><strong>'+esc(opp)+'</strong></div><small>JORNADA '+Math.min(nextWeek,30)+' · '+(f?(f.home===0?'EM CASA':'FORA'):'ÉPOCA CONCLUÍDA')+'</small></div><div class="scene-event-cta">'+online+'</div></div>'+
 '<div class="scene-corner top-left"></div><div class="scene-corner top-right"></div><div class="scene-corner bottom-left"></div><div class="scene-corner bottom-right"></div></section>'+
 '<aside class="manager-console"><div class="manager-console-header"><span><i class="status-pulse"></i> EQUIPA</span><b>ÉPOCA ATUAL</b></div>'+
 '<div class="manager-power"><span class="manager-power-ring" style="--power:'+Number(strength)+'"><strong>'+strength+'</strong><small>OVR</small></span><div><small>FORÇA DO ONZE</small><strong>'+rank+'º <em>NA LIGA</em></strong><span>DIVISÃO '+s.division+'</span></div></div>'+
 '<div class="manager-readiness"><div><span>CONDIÇÃO</span><b>'+avg+'%</b></div>'+bar(avg)+'<div><span>MORAL DO PLANTEL</span><b>'+morale+'%</b></div>'+bar(morale)+'</div>'+
 '<div class="manager-intel"><span class="intel-flag">◆ OBJETIVO DA DIREÇÃO</span><strong>'+(rank<=4?'DISPUTAR O TÍTULO':rank<=9?'SUBIR NA TABELA':'SUBIR NA TABELA')+'</strong><small>CONFIANÇA '+(s.finance.boardConfidence??75)+'% · '+s.fans.toLocaleString('pt-PT')+' ADEPTOS</small></div>'+
 '<div class="manager-commands"><button data-nav="league" class="manager-command">'+icon('trophy',17)+' CLASSIFICAÇÃO '+icon('arrow',16)+'</button><button data-nav="club" class="manager-command">'+icon('settings',17)+' DIREÇÃO DO CLUBE '+icon('arrow',16)+'</button></div></aside></div>'+
 '<div class="console-heading"><div><span></span><strong>Acessos rápidos</strong></div><small></small></div>'+
 '<div class="home-module-grid command-grid">'+fast.map(([id,ic,label,meta],i)=>'<button class="home-module command-tile" data-nav="'+id+'"><span class="home-module-head"><span class="module-symbol">'+icon(ic,23)+'</span><span class="module-count">0'+(i+1)+'</span></span><span class="module-meta">'+esc(meta).toUpperCase()+'</span><strong>'+esc(label)+'</strong><span class="tile-arr">'+icon('arrow',17)+'</span></button>').join('')+'</div>'+
 '<div class="command-bottom"><div class="hud-matches-history">'+matchHistory(s)+'</div><button data-nav="events" class="mini-event-link"><span>'+icon('star',17)+' MISSÕES & RECOMPENSAS</span>'+icon('arrow',17)+'</button></div>';
}
