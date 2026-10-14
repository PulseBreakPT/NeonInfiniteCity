
import {FORMATIONS,FACILITY_DATA,MENTORS,clamp,rng,hash,rating,autoLineup,getPlayer,generatePlayer,makeMarket,log,teamPower,money,transferValue} from './model.js';
import {simulateMatch,applyRound,advanceSeason} from './sim.js';
import {developIdentity,preserveLineups,negotiateMarket,acceptIncomingOffer,boardBudgetRequest,ensureCareer} from './career-intelligence.js';
import {executeRealSale,offerContract,proposeMinutes,loanOut,agreementSponsor,startBankLoan,repayBankLoan,ensureUniverse,minimumWage} from './management-universe.js';
function requireFunds(s,cost){if(!Number.isFinite(cost)||cost<0)throw Error('Custo inválido.');if(s.budget<cost)throw Error('Saldo insuficiente.');if(s.board?.status==='ultimatum'&&cost>=120000)throw Error('A direção suspendeu investimentos elevados até recuperares a confiança.');}
function spend(s,cost,label){requireFunds(s,cost);s.budget-=cost;s.finance.expenses+=cost;s.finance.ledger.unshift({day:s.day,label,amount:-cost});}
function income(s,amount,label){s.budget+=amount;s.finance.income+=amount;s.finance.ledger.unshift({day:s.day,label,amount});}
function requireToken(s,n){if(s.tokens<n)throw Error('Tokens insuficientes.');s.tokens-=n;}
function enhance(p,keys,n=1){let gains=0;for(const key of keys){if(p[key]<p.potential&&p[key]<98){p[key]=Math.min(98,p.potential,p[key]+n);gains++;}}return gains;}
function eventProgress(s,type){[...s.events.daily,...s.events.weekly].forEach(q=>{if(q.id===type&&!q.claimed)q.progress=Math.min(q.target,q.progress+1);});}
export function execute(state,action,data={}){
 const s=state;const snapshot=JSON.parse(JSON.stringify(state));const p=getPlayer(s,data.id);
 const offerForSeed=s.market?.find(x=>x.id===Number(data.id));
 const random=rng(hash(s.club.name+':'+s.day+':'+s.week+':'+s.trainingTotal+':'+action+':'+(s.gameNonce||0)+':'+(offerForSeed?.bids||0)));
 let message='';
 try{
 switch(action){
 case 'formation':{
  if(!FORMATIONS[data.value])throw Error('Formação inválida.');
  s.formation=data.value;if(!s.lineups[data.value])s.lineups[data.value]=autoLineup(s,data.value);
  message='Formação '+s.formation+' selecionada.';break;
 }
 case 'best-eleven':s.lineups[s.formation]=autoLineup(s);message='Onze otimizado para '+s.formation+'.';break;
 case 'unassign-slot':{
  const slot=Number(data.slot),ids=s.lineups[s.formation];
  if(!Array.isArray(ids)||!Number.isInteger(slot)||slot<0||slot>10)throw Error('Posição inválida.');
  if(ids[slot]===null||ids[slot]===undefined)throw Error('Esta posição já está vaga.');
  const removed=getPlayer(s,ids[slot]);ids[slot]=null;
  message=(removed?.name||'Jogador')+' saiu do onze. Posição por preencher.';break;
 }
 case 'swap':{
  const slot=Number(data.slot),chosen=Number(data.id),ids=s.lineups[s.formation];
  if(!Number.isInteger(slot)||slot<0||slot>10||!p)throw Error('Posição ou jogador inválido.');
  if(p.injury>0)throw Error('Este jogador está lesionado.');
  if((p.suspendedUntilWeek||0)>=s.week)throw Error('Este jogador está suspenso.');
  if((p.contract??0)<=0)throw Error('O contrato do jogador terminou.');
  if(!Array.isArray(ids)||ids.length!==11)throw Error('Onze inválido. Usa "Otimizar onze" para corrigir.');
  const old=ids.indexOf(chosen);
  if(old!==-1&&old!==slot){
   const displaced=ids[slot];
   ids[old]=displaced===undefined?null:displaced;
  }
  ids[slot]=chosen;
  message=p.name+' colocado no onze inicial.';break;
 }
 case 'tactic':{
  const choices={mentality:['defensiva','equilibrada','ofensiva'],pressure:['baixa','media','alta'],passing:['curto','misto','longo'],tempo:['lento','normal','rapido'],marking:['zona','individual'],halftimePlan:['auto','agressivo','proteger','manter']};
  if(!choices[data.key]?.includes(data.value))throw Error('Tática inválida.');
  s.tactics[data.key]=data.value;message='Instruções táticas atualizadas.';break;
 }
 case 'train':{
  if(s.trainingCount>=3)throw Error('Limite de 3 sessões por semana.');
  const types={technical:{cost:12000,keys:['pas','sho'],fatigue:8},physical:{cost:15000,keys:['pac','phy'],fatigue:11},defense:{cost:13500,keys:['def','phy'],fatigue:9},recovery:{cost:7500,keys:[],fatigue:-19},teamwork:{cost:11000,keys:['pas','def'],fatigue:6}};
  const t=types[data.kind];if(!t)throw Error('Treino inválido.');spend(s,t.cost,'Treino: '+data.kind);
  let gains=0;for(const player of s.players){
   if(data.kind==='recovery'){player.morale=clamp(player.morale+3,0,100);}else{gains+=enhance(player,t.keys,s.facilities.training>=4?2:1);}
   developIdentity(player);player.satisfaction=clamp(player.satisfaction+(data.kind==='recovery'?3:1),0,100);
   player.fitness=clamp(player.fitness-t.fatigue,5,100);
   if(data.kind!=='recovery'&&player.fitness<25&&random()<.012)player.injury=Math.max(player.injury||0,1+Math.ceil(random()*2));
  }
  s.trainingCount++;s.trainingTotal++;eventProgress(s,'train');message='Treino concluído: '+gains+' atributos melhorados.';
  log(s,'Sessão de treino',message);break;
 }
 case 'heal':{
  if(!p||p.injury<=0)throw Error('O jogador não precisa de tratamento.');
  if(s.medical<=0)throw Error('Sem tratamentos médicos.');
  s.medical--;p.injury=0;message=p.name+' recuperou da lesão.';break;
 }
 case 'rest':{
  if(s.rest<=0)throw Error('Sem reforços de descanso.');s.rest--;
  s.players.forEach(x=>x.fitness=clamp(x.fitness+18,0,100));message='Equipa recuperou condição física.';break;
 }
 case 'morale':{
  if(s.moraleBoosts<=0)throw Error('Sem reforços de moral.');s.moraleBoosts--;
  s.players.forEach(x=>x.morale=clamp(x.morale+15,0,100));message='Moral de equipa reforçada.';break;
 }
 case 'renew':{
  if(!p)throw Error('Jogador desconhecido.');
  if(p.lastRenewedSeason===s.season)throw Error('O contrato já foi renovado nesta época.');
  if((p.contract||0)>=5)throw Error('O jogador já tem contrato de longa duração.');
  developIdentity(p);
  if(p.satisfaction<28&&p.personality.loyalty<60)throw Error('O jogador recusou renovar: exige um projeto desportivo mais ambicioso.');
  const previous=Math.max(0,Number(p.contract)||0);
  p.contract=Math.min(5,previous+3);
  p.salary=Math.ceil((Number(p.salary)||5000)*1.02/100)*100;
  p.lastRenewedSeason=s.season;
  p.satisfaction=clamp(p.satisfaction+6,0,100);
  message='Contrato de '+p.name+' prolongado até '+p.contract+' épocas, sem prémio de assinatura. Salário ajustado em 2%.';
  break;
 }
 case 'position':{
  if(!p||!FORMATIONS['4-3-3'].includes(data.pos))throw Error('Posição inválida.');
  requireToken(s,2);p.pos=data.pos;s.lineups[s.formation]=autoLineup(s);message=p.name+' aprendeu a nova posição '+p.pos+'.';break;
 }
 case 'player-class':{
  if(!p)throw Error('Jogador desconhecido.');if(p.classLevel>=10)throw Error('Classe máxima atingida.');const cost=3+p.classLevel;
  requireToken(s,cost);p.classLevel++;p.potential=clamp(p.potential+2,0,99);enhance(p,p.pos==='GK'?['gk','phy']:['pac','sho','pas','def','phy'],1);
  message=p.name+' melhorou para classe '+p.classLevel+'.';break;
 }
 case 'special':{
  if(!p)throw Error('Jogador desconhecido.');requireToken(s,4);p.special=String(data.value||'Capitão').slice(0,24);message='Especialidade atribuída a '+p.name+'.';break;
 }
 case 'bid':{
  const offer=s.market.find(x=>x.id===Number(data.id));if(!offer)throw Error('Oferta já não disponível.');
  if(offer.ask>100000)throw Error('Esta contratação exige negociação com o clube vendedor.');
  if(s.players.length>=35)throw Error('Plantel completo: limite de 35 atletas.');
  const bid=Math.round(offer.ask*(1+(offer.bids||0)*.08));
  requireFunds(s,bid);
  const direct=!!offer.freeAgent||bid<=100000;
  const won=direct||random()>(.15+Math.min(.24,(offer.bids||0)*.04));
  if(!won){offer.bids++;message='Licitação superada por outro clube. Sem custos.';break;}
  if(bid>0)spend(s,bid,'Transferência: '+offer.name);
  const signed={...developIdentity(offer),contract:3,injury:0,goals:0,assists:0,apps:0,
   saleLockUntilWeek:s.week+(offer.freeAgent?8:2)};
  delete signed.ask;delete signed.expires;delete signed.bids;
  s.players.push(signed);s.market=s.market.filter(x=>x.id!==offer.id);
  s.nextId=Math.max(s.nextId,signed.id+1);
  message=signed.name+(bid>0?' contratado por '+money(bid):' contratado sem taxa de transferência')+'.';
  log(s,'Reforço confirmado',message);break;
 }
 case 'sell':{
  const {player,price}=executeRealSale(s,data.id);
  income(s,price,'Venda: '+player.name);
  s.players=s.players.filter(x=>x.id!==player.id);preserveLineups(s,player.id);
  message=player.name+' vendido por '+money(price)+' a um comprador com fundos.';log(s,'Transferência de saída',message);break;
 }
 case 'contract-offer':{
  const decision=offerContract(s,data.id,Number(data.salary),Number(data.years));
  message=decision.status==='accepted'?'Contrato aceite: '+money(decision.salary)+' por mês · '+decision.years+' épocas.':'Contraproposta: salário mínimo '+money(decision.minimum)+' por mês.';break;
 }
 case 'promise-minutes':{
  proposeMinutes(s,data.id);message='Promessa de utilização registada para as próximas quatro jornadas.';break;
 }
 case 'loan-out':{
  const loan=loanOut(s,data.id);preserveLineups(s,loan.playerId);
  message=loan.player.name+' emprestado até ao fim da época.';break;
 }
 case 'bank-loan':{
  const moneyReceived=startBankLoan(s,Number(data.amount));
  message='Crédito de '+money(moneyReceived)+' contratado com juros mensais.';break;
 }
 case 'bank-repay':{
  const paid=repayBankLoan(s,Number(data.amount));
  message='Crédito amortizado: '+money(paid)+'.';break;
 }
 case 'offer-transfer':
 case 'offer-instalments':{
  const deal=negotiateMarket(s,data.id,Number(data.amount),action==='offer-instalments'?3:1);
  message='Proposta de '+money(deal.amount)+' enviada'+(deal.installments===3?' em três pagamentos':'')+'. Resposta após a próxima jornada.';break;
 }
 case 'accept-counter':{
  ensureCareer(s);
  const deal=s.negotiations.find(x=>x.id===Number(data.id)&&x.status==='counter');
  if(!deal)throw Error('Contraproposta indisponível.');
  if((deal.installments===3?Math.ceil(deal.counterAmount/3000)*1000:deal.counterAmount)>s.budget)throw Error('Saldo insuficiente para a contraproposta.');
  deal.amount=deal.counterAmount;deal.createdWeek=s.week;deal.status='pending';
  message='Contraproposta aceite. Aguardar confirmação na próxima jornada.';break;
 }
 case 'accept-offer':{
  const value=acceptIncomingOffer(s,data.id);
  message='Proposta aceite: '+money(value)+'.';break;
 }
 case 'reject-offer':{
  ensureCareer(s);
  const offer=s.incomingOffers.find(x=>x.id===Number(data.id)&&x.status==='pending');
  if(!offer)throw Error('Proposta indisponível.');
  offer.status='rejected';message='Proposta recusada.';break;
 }
 case 'board-request':{
  const granted=boardBudgetRequest(s);
  message=granted?'Direção aprovou '+money(granted)+' de orçamento adicional.':'Pedido recusado: melhora resultados e situação financeira.';break;
 }
 case 'coach-skill':{
  ensureCareer(s);
  const valid=['developer','economist','scout','leader'],skill=String(data.id);
  if(!valid.includes(skill))throw Error('Especialização inválida.');
  if(s.coach.skills.includes(skill))throw Error('Já desbloqueaste esta especialização.');
  if((s.coach.skillPoints||0)<1)throw Error('Sem pontos de carreira.');
  s.coach.skillPoints--;s.coach.skills.push(skill);
  message='Especialização de treinador desbloqueada.';break;
 }
 case 'scout':{
  const cost=18000;spend(s,cost,'Relatório de olheiros');
  const market=makeMarket(s,hash(s.club.name)+s.day*991+s.nextId*73);
  const candidate=market[0];developIdentity(candidate);
  if((s.coach.skills||[]).includes('scout'))candidate.potential=Math.min(99,candidate.potential+2);
  s.market.unshift(candidate);s.gameNonce=(s.gameNonce||0)+1;message='Novo talento observado: '+candidate.name+'.';break;
 }
 case 'upgrade':{
  if(!FACILITY_DATA[data.key])throw Error('Instalação desconhecida.');
  const level=s.facilities[data.key];if(level>=10)throw Error('Nível máximo atingido.');
  const cost=FACILITY_DATA[data.key].base*level;
  spend(s,cost,'Obras: '+FACILITY_DATA[data.key].name);
  s.facilities[data.key]=level+1;
  if(data.key==='stadium')s.club.capacity+=2500;
  message=FACILITY_DATA[data.key].name+' evoluiu para nível '+(level+1)+'.';break;
 }
 case 'tickets':{
  const v=Number(data.value);if(!Number.isFinite(v)||v<8||v>70)throw Error('O preço deve estar entre 8 € e 70 €.');
  s.finance.stadiumTickets=v;message='Bilhetes definidos para '+v+' €.';break;
 }
 case 'sponsor':{
  const choice=agreementSponsor(s,data.value);
  message='Novo patrocinador: '+choice.name+' · contrato até à próxima época.';break;
 }
 case 'academy-train':{
  const kid=s.academy.find(x=>x.id===Number(data.id));if(!kid)throw Error('Jovem desconhecido.');
  if(kid.lastAcademyTraining===s.season+':'+s.week)throw Error('O jovem já treinou nesta jornada.');
  const cost=12000;spend(s,cost,'Formação jovem: '+kid.name);
  kid.lastAcademyTraining=s.season+':'+s.week;
  const field=kid.pos==='GK'?'gk':kid.pos==='DEF'?'def':kid.pos==='MID'?'pas':'sho';
  enhance(kid,[field,'phy'],s.facilities.academy>=5?2:1);
  if(kid.age<=18&&kid.potential<96&&s.week%4===0)kid.potential++;
  kid.fitness=clamp((kid.fitness||90)-7,35,100);
  message=kid.name+' evoluiu na academia.';break;
 }
 case 'academy-promote':{
  const kid=s.academy.find(x=>x.id===Number(data.id));if(!kid||kid.age<17)throw Error('O jovem precisa de ter 17 anos para ser promovido.');
  if(s.players.length>=35)throw Error('Plantel profissional completo.');
  spend(s,10000,'Assinatura profissional de '+kid.name);
  const clone={...kid,id:s.nextId++,age:Math.max(17,kid.age),contract:4,salary:2000,apps:0,goals:0,assists:0,injury:0,saleLockUntilWeek:s.week+4};
  s.players.push(clone);s.academy=s.academy.filter(x=>x.id!==kid.id);
  message=clone.name+' promovido à equipa principal!';break;
 }
 case 'academy-recruit':{
  if(s.academy.length>=6)throw Error('A academia já tem 6 jovens.');
  spend(s,35000,'Recrutamento de jovens');
  const positions=['GK','DEF','MID','ATT'];
  const kid=generatePlayer(5000+s.nextId++,positions[Math.floor(random()*4)],random,44+random()*9);
  kid.age=15+Math.floor(random()*4);kid.potential=clamp(kid.potential+s.facilities.academy*2,68,99);s.academy.push(kid);
  message=kid.name+' entrou na academia.';break;
 }
 case 'mentor-hire':{
  const dataMentor=MENTORS.find(x=>x.id===data.id);if(!dataMentor)throw Error('Mentor desconhecido.');
  if(s.mentors.some(x=>x.id===data.id))throw Error('Já contrataste este mentor.');
  const cost=80000;spend(s,cost,'Recrutamento: '+dataMentor.name);
  s.mentors.push({...dataMentor,level:1,xp:0,contract:3});
  if(!s.mentorActive)s.mentorActive=data.id;message=dataMentor.name+' passou a integrar a equipa técnica.';break;
 }
 case 'mentor-select':{
  if(!s.mentors.some(x=>x.id===data.id))throw Error('Mentor não contratado.');
  s.mentorActive=data.id;message='Mentor ativo alterado.';break;
 }
 case 'reward':{
  if(s.rewards.lastClaimWeek===s.season+':'+s.week)throw Error('Já recebeste o bónus desta jornada.');
  s.rewards.streak=s.rewards.lastClaimWeek===s.season+':'+(s.week-1)?s.rewards.streak+1:1;
  s.rewards.lastDay=s.day;s.rewards.lastClaimWeek=s.season+':'+s.week;
  const prize=4500+s.rewards.streak*1800;income(s,prize,'Bónus de preparação da jornada');
  if(s.rewards.streak%3===0)s.tokens+=2;message='Bónus da jornada: '+money(prize)+(s.rewards.streak%3===0?' e 2 tokens':'')+'.';break;
 }
 case 'quest':{
  const q=[...s.events.daily,...s.events.weekly].find(x=>x.id===data.id);
  if(!q||q.claimed||q.progress<q.target)throw Error('Objetivo ainda não concluído.');
  q.claimed=true;if(q.kind==='token')s.tokens+=q.reward;else income(s,q.reward,'Objetivo concluído');
  message='Recompensa resgatada com sucesso.';break;
 }
 case 'buy-consumable':{
  const types={rest:{price:3,label:'Descanso'},medical:{price:3,label:'Tratamento'},moraleBoosts:{price:2,label:'Moral'}};
  const t=types[data.kind];if(!t)throw Error('Recurso inválido.');
  requireToken(s,t.price);s[data.kind]++;message=t.label+' adquirido.';break;
 }
 case 'cosmetic':{
  const kits={principal:{price:0,color:s.club.baseColor||'#caf35b'},oceano:{price:4,color:'#59cddc'},solar:{price:4,color:'#ffab63'},noturno:{price:5,color:'#826dff'},royal:{price:6,color:'#f0cd68'}};
  const kit=kits[data.id];if(!kit)throw Error('Equipamento desconhecido.');
  if(!s.inventory.kits.includes(data.id)){requireToken(s,kit.price);s.inventory.kits.push(data.id);}
  s.inventory.activeKit=data.id;s.club.color=kit.color;message='Equipamento '+data.id+' equipado.';break;
 }
 case 'pack':{
  requireToken(s,3);const pool=['Lenda do Clube','Mestre Tático','Guardião da Baliza','Campeão da Taça','Artilheiro Histórico','Estrela da Academia','Capitão Eterno'];
  const item=pool[Math.floor(random()*pool.length)];
  if(s.inventory.cards.includes(item)){s.inventory.duplicates++;message='Carta repetida: '+item+'. +1 duplicado.';}
  else{s.inventory.cards.push(item);message='Nova carta colecionável: '+item+'!';}
  break;
 }
 case 'trade-duplicates':{
  if(s.inventory.duplicates<3)throw Error('São necessários 3 duplicados.');
  s.inventory.duplicates-=3;s.tokens+=4;message='3 cartas repetidas trocadas por 4 tokens.';break;
 }
 case 'name-coach':{
  const name=String(data.value||'').trim();if(name.length<2||name.length>32)throw Error('Nome de treinador inválido.');
  s.coach.name=name;message='Perfil do treinador atualizado.';break;
 }
 case 'club-update':{
  const name=String(data.name||'').trim(),city=String(data.city||'').trim(),stadium=String(data.stadium||'').trim();
  if(!name||!city||!stadium||name.length>32||city.length>26||stadium.length>40)throw Error('Preenche os campos corretamente.');
  s.club.name=name;s.club.city=city;s.club.stadium=stadium;
  if(data.color&&/^#[0-9a-fA-F]{6}$/.test(data.color)){s.club.color=data.color;s.club.baseColor=data.color;}
  s.league.teams[0].name=name;message='Identidade do clube atualizada.';break;
 }
 case 'match':{
  if(s.league.completed)throw Error('A temporada terminou. Inicia a próxima.');
  const result=applyRound(s);
  message='Jornada '+(s.league.round-1)+' terminada: '+result.hg+'–'+result.ag+'.';
  return {message,result};
 }
 case 'new-season':{
  advanceSeason(s);message='Começou a época '+s.season+'.';break;
 }
 case 'friendly':{
  if((s.friendliesThisWeek||0)>=1)throw Error('Só podes disputar um amigável por jornada.');
  const opponent=s.league.teams.find(x=>x.id===Number(data.id)&&x.id!==0)||s.league.teams[1];
  s.gameNonce=(s.gameNonce||0)+1;
  const fixture={id:9000+s.day,home:0,away:opponent.id};
  const result=simulateMatch(s,fixture,{friendly:true});
  s.lastMatch=result;s.friendliesThisWeek=(s.friendliesThisWeek||0)+1;
  message='Amigável contra '+opponent.name+' finalizado.';
  return {message,result};
 }
 case 'rest-day':{
  if((s.restDaysThisWeek||0)>=2)throw Error('Limite de dois dias de descanso por jornada.');
  s.day++;s.restDaysThisWeek=(s.restDaysThisWeek||0)+1;
  s.players.forEach(x=>{x.fitness=clamp(x.fitness+7+s.facilities.medical,0,100);});
  message='Dia de descanso concluído.';break;
 }
 default:throw Error('Ação desconhecida: '+action);
 }
 return {message};
 }catch(err){for(const key of Object.keys(s))delete s[key];Object.assign(s,snapshot);throw err;}
}
