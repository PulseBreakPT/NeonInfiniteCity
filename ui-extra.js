
import {FORMATIONS,POSITIONS,COLORS,FACILITY_DATA,MENTORS,rating,teamPower,standings,money,getPlayer,nextFixture,fixtureName,clamp} from './model.js';
import {esc,icon,crest,pill,bar,avatar,btn,title,panel,playerItem,info,navItems} from './ui-core.js';
function team(s,id){return esc(fixtureName(s,id));}
export function league(s){
 const rows=standings(s),curr=s.league.rounds[Math.min(29,s.league.round-1)]||[];
 const last=s.league.rounds[Math.max(0,Math.min(29,s.league.round-2))]||[];
 const arr=(list)=>list.map(f=>'<div class="fixture-line '+(f.home===0||f.away===0?'mine':'')+'"><span>'+team(s,f.home)+'</span><b>'+(f.played?f.hg+' : '+f.ag:'VS')+'</b><span>'+team(s,f.away)+'</span></div>').join('');
 const cup=s.cup;
 return title('FUTEBOL PROFISSIONAL','COMPETIÇÕES','Liga Nacional · 16 equipas · 30 jornadas · Época '+s.season,btn('match','Jogar jornada','accent',s.league.completed?'disabled':''))+
 '<div class="content-two wider">'+panel('Classificação da Liga', '<div class="table-wrap"><table class="data-table standings"><thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GM</th><th>GS</th><th>DG</th><th>PTS</th></tr></thead><tbody>'+rows.map((t,i)=>'<tr class="'+(t.id===0?'my-team':'')+'"><td><b>'+String(i+1).padStart(2,'0')+'</b></td><td>'+esc(t.name)+'</td><td>'+t.gp+'</td><td>'+t.w+'</td><td>'+t.d+'</td><td>'+t.l+'</td><td>'+t.gf+'</td><td>'+t.ga+'</td><td>'+(t.gf-t.ga)+'</td><td><b>'+t.pts+'</b></td></tr>').join('')+'</tbody></table></div>')+
 panel('Calendário', '<div class="eyebrow section-label">JORNADA '+Math.min(30,s.league.round)+'</div>'+arr(curr)+(last.some(f=>f.played)?'<h4 class="section-label">Última jornada</h4>'+arr(last):'')+(s.league.completed?'<div class="notice-success">Temporada terminada. Vencedor: '+team(s,s.league.champion)+'.</div>'+btn('new-season','Nova temporada','accent full'):'<div class="note muted">Os resultados dos outros 15 clubes são calculados pelo mesmo motor de simulação.</div>'))+'</div>'+
 '<div class="content-two">'+panel('Taça eliminatória','<div class="cup-progress">'+pill('FASE '+(cup.stage+1))+pill(cup.participants.length+' CLUBES ATIVOS')+'</div>'+(cup.results.length?cup.results.slice().reverse().map(stage=>'<div class="cup-stage"><strong>Ronda '+stage.stage+'</strong>'+stage.games.map(g=>'<div class="fixture-line '+(g.home===0||g.away===0?'mine':'')+'"><span>'+team(s,g.home)+'</span><b>'+g.hg+' : '+g.ag+'</b><span>'+team(s,g.away)+'</span></div>').join('')+'</div>').join(''):'<div class="empty-state">A Taça começa após algumas jornadas da Liga.</div>')+(cup.completed?'<div class="notice-success">Vencedor: '+team(s,cup.winner)+'</div>':''),pill('ELIMINATÓRIA'))+
 panel('Palmarés e histórico',s.coach.achievements.map(x=>'<div class="history-item">'+icon('trophy',14)+' '+esc(x)+'</div>').join('')+s.history.map(x=>'<div class="history-item">Época '+x.season+' · '+x.position+'º classificado · '+esc(x.champion)+'</div>').join('')||'<div class="empty-state">Sem épocas concluídas.</div>')+'</div>';
}
export function market(s){
 return title('GESTÃO DE TALENTO','MERCADO DE TRANSFERÊNCIAS','Jogadores disponíveis nesta jornada. As licitações concorrem com a IA.',btn('scout','Novo relatório de olheiros · 18 000 €','accent'))+
 '<div class="market-head">'+pill('SALDO '+money(s.budget),'good')+pill(s.players.length+'/35 NO PLANTEL')+pill('LEILÕES COM RIVAIS IA')+'</div>'+
 '<div class="cards-grid">'+s.market.map(p=>'<div class="market-card"><div class="row">'+avatar(p)+'<div class="grow"><b>'+esc(p.name)+'</b><small>'+esc(p.nation)+' · '+p.age+' anos · '+POSITIONS[p.pos]+'</small></div><span class="ovr">'+rating(p)+'</span></div><div class="market-details">'+info('Potencial',p.potential)+info('Oferta mínima',money(Math.round(p.ask*(1+(p.bids||0)*.08))))+info('Interesse rival',p.bids?'Elevado':'Normal')+info('Contrato','3 épocas')+'</div>'+btn('bid','Licitar e contratar '+icon('arrow'),'accent full','data-id="'+p.id+'"')+'</div>').join('')+'</div>'+
 '<p class="note muted">Mercado contra concorrentes simulados. A concorrência pode superar as licitações sem retirar saldo. As ofertas mudam depois da jornada.</p>';
}
export function training(s){
 const workouts=[['technical','pitch','Técnica','Passe e remate','12 000 €'],['physical','bolt','Físico','Velocidade e resistência','15 000 €'],['defense','shield','Defesa','Marcação e robustez','13 500 €'],['teamwork','users','Coletivo','Equilíbrio e sincronização','11 000 €'],['recovery','heart','Recuperação','Condição e moral','7 500 €']];
 return title('CIÊNCIA DO DESPORTO','CENTRO DE TREINO','3 sessões por jornada. O treino reduz a condição física.',btn('rest-day','Descansar ('+(2-(s.restDaysThisWeek||0))+'/2)','subtle',(s.restDaysThisWeek||0)>=2?'disabled':''))+
 '<div class="headline-stats">'+pill('SESSÕES DA SEMANA '+s.trainingCount+'/3',s.trainingCount>=3?'danger':'good')+pill('DESCANSO × '+s.rest)+pill('TRATAMENTOS × '+s.medical)+pill('MORAL × '+s.moraleBoosts)+'</div>'+
 '<div class="cards-grid">'+workouts.map(([k,emoji,name,detail,cost])=>'<div class="training-card"><span class="training-emoji">'+icon(emoji,29)+'</span><h3>'+name+'</h3><p>'+detail+'</p><div class="row between"><small>Custo</small><strong>'+cost+'</strong></div>'+btn('train','Iniciar treino '+icon('arrow'),'accent full','data-kind="'+k+'" '+(s.trainingCount>=3?'disabled':''))+'</div>').join('')+'</div>'+
 '<div class="content-two">'+panel('Gestão da condição',info('Condição média',Math.round(s.players.reduce((n,p)=>n+p.fitness,0)/s.players.length)+'%')+info('Moral média',Math.round(s.players.reduce((n,p)=>n+p.morale,0)/s.players.length)+'%')+
 btn('rest','Usar reforço de descanso','subtle full',!s.rest?'disabled':'')+btn('morale','Usar reforço de moral','subtle full',!s.moraleBoosts?'disabled':''))+
 panel('Últimos treinos',s.activity.filter(a=>a.title.includes('treino')).slice(0,7).map(a=>'<div class="history-item"><strong>'+esc(a.title)+'</strong><small>'+esc(a.detail)+'</small></div>').join('')||'<div class="empty-state">Ainda não há sessões registadas.</div>')+'</div>';
}
export function academy(s){
 return title('FUTURO DO CLUBE','ACADEMIA DE JUNIORES','Promove jovens a partir dos 17 anos. Assinatura: 10 000 €.',btn('academy-recruit','Recrutar júnior · 35 000 €','accent'))+
 '<div class="headline-stats">'+pill('NÍVEL '+s.facilities.academy)+pill(s.academy.length+'/6 JOVENS')+pill('PROMOÇÕES PARA A EQUIPA PRINCIPAL')+'</div>'+
 '<div class="cards-grid">'+s.academy.map(p=>'<div class="academy-card"><div class="row">'+avatar(p)+'<div class="grow"><b>'+esc(p.name)+'</b><small>'+POSITIONS[p.pos]+' · '+p.age+' anos</small></div><span class="ovr">'+rating(p)+'</span></div>'+info('Potencial',p.potential+' OVR')+info('Nacionalidade',esc(p.nation))+info('Evolução',bar(Math.max(8,Math.min(99,(rating(p)/p.potential)*100))))+'<div class="action-row">'+btn('academy-train','Treinar · 12 000 €','subtle','data-id="'+p.id+'"')+btn('academy-promote','Promover','accent','data-id="'+p.id+'" '+(p.age<17?'disabled':''))+'</div></div>').join('')+'</div>'+
 '<p class="note muted">Os jovens evoluem no centro de formação. Promoção: mínimo de 17 anos e 10 000 € pela assinatura profissional. Não é possível vendê-los nas quatro primeiras jornadas após a promoção.</p>';
}
export function campus(s){
 const props=Object.entries(FACILITY_DATA);
 return title('INFRAESTRUTURAS','CAMPUS DESPORTIVO','As melhorias têm custo imediato e efeitos nas próximas jornadas.')+
 '<div class="campus-banner"><div><span class="eyebrow">ESTÁDIO PRINCIPAL</span><h2>'+esc(s.club.stadium)+'</h2><p>'+s.club.capacity.toLocaleString('pt-PT')+' lugares · '+s.fans.toLocaleString('pt-PT')+' adeptos</p></div><div class="stadium-icon">'+icon('building',70)+'</div></div>'+
 '<div class="cards-grid">'+props.map(([key,d])=>{
  const level=s.facilities[key],cost=d.base*level,max=level>=10;
  return '<div class="facility-card"><div class="row between"><span class="facility-symbol">'+icon(key==='stadium'?'pitch':key==='academy'?'book':key==='medical'?'heart':key==='training'?'bolt':key==='commercial'?'shop':'star',23)+'</span>'+pill('NÍVEL '+level+(max?' · MAX':''),'good')+'</div><h3>'+d.name+'</h3><p>'+d.description+'</p><div class="level-block">'+bar(level*10)+'</div>'+btn('upgrade',max?'Nível máximo':'Melhorar · '+money(cost),'accent full','data-key="'+key+'" '+(max||s.budget<cost?'disabled':''))+'</div>';
 }).join('')+'</div>';
}
export function finance(s){
 const f=s.finance,net=f.income-f.expenses;
 return title('DIREÇÃO FINANCEIRA','FINANÇAS','Receitas, despesas e contratos da época.')+
 '<div class="kpi-grid"><div class="kpi"><small>SALDO ATUAL</small><strong class="currency">'+money(s.budget)+'</strong></div><div class="kpi"><small>RECEITAS ACUMULADAS</small><strong class="currency pos">'+money(f.income)+'</strong></div><div class="kpi"><small>DESPESAS ACUMULADAS</small><strong class="currency neg">'+money(f.expenses)+'</strong></div><div class="kpi"><small>RESULTADO ACUMULADO</small><strong class="currency '+(net<0?'neg':'pos')+'">'+money(net)+'</strong></div></div>'+
 '<div class="headline-stats">'+pill('DÍVIDA '+money(s.finance.debt||0),(s.finance.debt||0)>0?'danger':'good')+pill('CONFIANÇA DA DIREÇÃO '+(s.finance.boardConfidence??75)+'%')+pill('SALÁRIOS EM ATRASO '+money(s.finance.unpaidWages||0))+'</div><div class="content-two">'+panel('Exploração do clube','<form id="finance-form"><label class="control-field"><span>Preço de bilhete (8 € – 70 €)</span><input type="number" min="8" max="70" name="tickets" value="'+f.stadiumTickets+'" required></label><label class="control-field"><span>Patrocinador</span><select name="sponsor">'+[['Atlântico Energia','regular'],['Norte Digital','premium'],['Horizonte Global','elite']].map(([n,id])=>'<option value="'+id+'" '+(s.club.sponsor===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><div class="form-actions"><button type="submit" class="btn accent full">Guardar contratos e bilhetes</button></div></form>'+info('Capacidade do estádio',s.club.capacity.toLocaleString('pt-PT'))+info('Patrocinador atual',esc(s.club.sponsor))+'<p class="note muted">Negociar um patrocínio premium tem custo inicial. A receita dos jogos em casa cresce com o estádio e preço dos bilhetes.</p>')+
 panel('Livro de movimentos','<div class="ledger">'+f.ledger.slice(0,16).map(e=>'<div class="ledger-line"><div><b>'+esc(e.label)+'</b><small>Dia '+e.day+'</small></div><strong class="'+(e.amount>=0?'pos':'neg')+'">'+(e.amount>0?'+':'')+money(e.amount)+'</strong></div>').join('')+'</div>'||'<div class="empty-state">Os movimentos financeiros aparecem quando realizares operações.</div>')+'</div>';
}
export function mentors(s){
 return title('EQUIPA TÉCNICA','MENTORES','Cada treinador oferece um bónus diferente ao onze.')+
 '<div class="cards-grid">'+MENTORS.map((m,i)=>{
 const hired=s.mentors.find(x=>x.id===m.id),active=s.mentorActive===m.id;
 return '<div class="mentor-card"><div class="mentor-art">'+['◈','⬡','✦','◎'][i]+'</div><span class="eyebrow">'+m.type.toUpperCase()+'</span><h3>'+m.name+'</h3><p>'+m.description+'</p>'+info('Experiência',hired?hired.xp+' XP':'A contratar')+info('Nível',hired?hired.level+' / 10':'—')+(hired?(active?pill('MENTOR ATIVO','good'):btn('mentor-select','Selecionar mentor','accent full','data-id="'+m.id+'"')):btn('mentor-hire','Contratar · 80 000 €','accent full','data-id="'+m.id+'"'))+'</div>';
 }).join('')+'</div><p class="note muted">A experiência dos mentores aumenta durante as partidas. Cada especialização altera a simulação.</p>';
}
export function events(s){
 const quests=[...s.events.daily,...s.events.weekly];
 const streak=s.rewards.streak;
 return title('DESAFIOS E CONQUISTAS','EVENTOS & MISSÕES','Objetivos concluídos podem ser resgatados uma vez.',btn('reward',s.rewards.lastClaimWeek===s.season+':'+s.week?'Bónus da jornada recebido':'Resgatar bónus da jornada','accent',s.rewards.lastClaimWeek===s.season+':'+s.week?'disabled':''))+
 '<div class="event-hero"><div><span class="eyebrow">RECOMPENSAS POR JORNADA</span><h2>'+streak+' JORNADAS SEGUIDAS</h2><p>Bónus disponível uma vez em cada jornada.</p></div><span class="event-glyph">✦</span></div>'+
 '<div class="cards-grid">'+quests.map(q=>'<div class="quest-card"><span class="eyebrow">'+(s.events.daily.includes(q)?'OBJETIVO DIÁRIO':'OBJETIVO SEMANAL')+'</span><h3>'+esc(q.text)+'</h3><div class="progress-text">'+q.progress+'/'+q.target+'</div>'+bar(q.progress/q.target*100)+info('Recompensa',q.reward+(q.kind==='token'?' tokens':' €'))+btn('quest',q.claimed?'Concluído':q.progress>=q.target?'Resgatar recompensa':'Por concluir','accent full','data-id="'+q.id+'" '+(q.claimed||q.progress<q.target?'disabled':''))+'</div>').join('')+'</div>'+
 panel('Troféus e conquistas',s.coach.achievements.map(a=>'<div class="history-item">'+icon('trophy',14)+' '+esc(a)+'</div>').join('')||'<div class="empty-state">Vence competições para desbloquear novos troféus.</div>')+
 '<p class="note muted">Os eventos atuais são desafios locais. Torneios mundiais sincronizados exigiriam contas e servidor.</p>';
}
export function collection(s){
 const kits=[['principal','Original',0],['oceano','Oceano',4],['solar','Solar',4],['noturno','Noturno',5],['royal','Royal',6]];
 return title('IDENTIDADE E RECOMPENSAS','COLEÇÕES','Equipamentos, cartas e reforços.')+
 '<div class="headline-stats">'+pill('TOKENS ✦ '+s.tokens,'gold')+pill(s.inventory.cards.length+' CARTAS DISTINTAS')+pill(s.inventory.duplicates+' REPETIDAS')+'</div>'+
 panel('Equipamentos alternativos','<div class="kit-grid">'+kits.map(([id,name,price])=>'<div class="kit-card"><div class="kit-shirt" style="--kit:'+({principal:COLORS[0],oceano:'#59cddc',solar:'#ffab63',noturno:'#826dff',royal:'#f0cd68'}[id])+'"></div><strong>'+name+'</strong><small>'+(!price?'Incluído':price+' tokens')+'</small>'+btn('cosmetic',s.inventory.activeKit===id?'Em uso':s.inventory.kits.includes(id)?'Equipar':'Desbloquear','accent full','data-id="'+id+'" '+(s.inventory.activeKit===id?'disabled':''))+'</div>').join('')+'</div>')+
 '<div class="content-two">'+panel('Galeria de cartas','<div class="collect-gallery">'+s.inventory.cards.map(c=>'<span class="collect-card">✦<strong>'+esc(c)+'</strong></span>').join('')+'</div>'+(s.inventory.cards.length?'':'<div class="empty-state">Abre um pacote para revelar o teu primeiro colecionável.</div>')+btn('pack','Abrir pacote · 3 tokens','accent full')+btn('trade-duplicates','Trocar 3 repetidas por 4 tokens','subtle full',s.inventory.duplicates<3?'disabled':''))+
 panel('Loja de reforços',info('Tokens disponíveis',s.tokens)+info('Descanso',s.rest)+info('Tratamentos',s.medical)+info('Moral',s.moraleBoosts)+['rest','medical','moraleBoosts'].map((id)=>btn('buy-consumable','Comprar '+({rest:'descanso',medical:'tratamento',moraleBoosts:'moral'}[id])+' · '+(id==='moraleBoosts'?2:3)+' tokens','subtle full','data-kind="'+id+'"')).join(''))+'</div>';
}
export function profile(s){
 const c=s.coach,apps=c.wins+c.draws+c.losses;
 return title('O TREINADOR','CARREIRA & PERFIL','Resultados e histórico do treinador.')+
 '<div class="profile-banner"><div class="profile-avatar">'+icon('user',38)+'</div><div><span class="eyebrow">TREINADOR PRINCIPAL</span><h2>'+esc(c.name)+'</h2><p>Nível '+c.level+' · '+esc(s.club.name)+'</p></div>'+pill('XP '+c.xp,'good')+'</div>'+
 '<div class="kpi-grid"><div class="kpi"><small>VITÓRIAS</small><strong>'+c.wins+'</strong></div><div class="kpi"><small>EMPATES</small><strong>'+c.draws+'</strong></div><div class="kpi"><small>DERROTAS</small><strong>'+c.losses+'</strong></div><div class="kpi"><small>TROFÉUS</small><strong>'+c.trophies+'</strong></div></div>'+
 '<div class="content-two">'+panel('Perfil do treinador','<form id="coach-form"><label class="control-field"><span>Nome público</span><input name="coach" maxlength="32" value="'+esc(c.name)+'" required></label><button type="submit" class="btn accent full">Guardar perfil</button></form>'+info('Partidas disputadas',apps)+info('Percentagem de vitórias',apps?Math.round(c.wins/apps*100)+'%':'0%')+info('Experiência acumulada',c.xp+' XP')+info('Confiança da direção',(s.finance.boardConfidence??75)+'%'))+
 panel('Historial desportivo',s.history.map(e=>'<div class="history-item"><strong>Época '+e.season+'</strong><small>'+e.position+'º lugar · '+esc(e.champion)+'</small></div>').join('')+c.achievements.map(e=>'<div class="history-item">'+icon('trophy',14)+' '+esc(e)+'</div>').join('')||'<div class="empty-state">Sem épocas concluídas.</div>')+'</div>';
}
export function social(s){
 const slots=Math.max(0,1-(s.friendliesThisWeek||0));
 return title('','Amigáveis','Contra clubes da liga · '+slots+' partida disponível nesta jornada')+
 '<div class="headline-stats">'+pill('AMIGÁVEIS '+(slots? 'DISPONÍVEIS':'ESGOTADOS'),slots?'good':'danger')+pill('SEM EFEITO NA CLASSIFICAÇÃO')+'</div>'+
 '<div class="rival-grid friendly-grid">'+s.league.teams.filter(t=>t.id!==0).map(t=>'<div class="rival-card"><span class="rival-crest">'+esc(t.name.split(' ').map(x=>x[0]).slice(0,2).join(''))+'</span><strong>'+esc(t.name)+'</strong><small>OVR '+t.power+'</small>'+btn('friendly','Jogar amigável','accent full','data-id="'+t.id+'" '+(slots?'':'disabled') )+'</div>').join('')+'</div>'+
 '<p class="note muted">O resultado não altera a classificação nem as estatísticas oficiais dos jogadores.</p>';
}
export function club(s){
 return title('IDENTIDADE','O TEU CLUBE','Nome, cores, estádio e cópia de segurança do progresso.')+
 '<div class="content-two">'+panel('Identidade e equipamento','<form id="club-form"><label class="control-field"><span>Nome</span><input name="name" value="'+esc(s.club.name)+'" maxlength="32" required></label><label class="control-field"><span>Cidade</span><input name="city" value="'+esc(s.club.city)+'" maxlength="26" required></label><label class="control-field"><span>Estádio</span><input name="stadium" value="'+esc(s.club.stadium)+'" maxlength="40" required></label><div class="control-field"><span>Cor oficial</span><div class="swatches">'+COLORS.map(c=>'<button type="button" data-color="'+c+'" style="background:'+c+'" class="swatch '+(s.club.color===c?'chosen':'')+'" aria-label="Cor '+c+'"></button>').join('')+'</div></div><input type="hidden" name="color" id="club-color" value="'+esc(s.club.color)+'"><button type="submit" class="btn accent full">Guardar identidade</button></form>')+
 panel('O teu estádio','<div class="club-stadium">🏟️'+crest(s)+'</div>'+info('Nome',esc(s.club.stadium))+info('Localização',esc(s.club.city))+info('Capacidade',s.club.capacity.toLocaleString('pt-PT')+' lugares')+info('Adeptos',s.fans.toLocaleString('pt-PT'))+
 '<hr><h4>Guardar progresso</h4>'+btn('export','Exportar save em JSON','subtle full')+'<label class="import-label">Importar save JSON <input type="file" id="import-save" accept=".json,application/json"></label><p class="note muted">Exporta regularmente uma cópia. A limpeza dos dados do navegador apaga o save local.</p>')+'</div>';
}
export function more(s){
 return title('TODOS OS SISTEMAS','CENTRO DE OPERAÇÕES','')+
 '<div class="more-grid">'+navItems().map(([id,ic,label,desc])=>'<button class="more-tile" data-nav="'+id+'"><span>'+icon(ic,24)+'</span><strong>'+label+'</strong><small>'+desc+'</small></button>').join('')+'</div>';
}
