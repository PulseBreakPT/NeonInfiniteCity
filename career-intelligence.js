
/**
 * Career intelligence: deterministic, offline-first management decisions.
 * All mutations happen at explicit week/season boundaries, never during match
 * animation, and retain IDs so old saves, lineups and histories survive.
 */
import {FORMATIONS,autoLineup,clamp,generatePlayer,hash,rating,rng,standings,transferValue} from './model.js';

const traits=['ambition','loyalty','professionalism','patience','adaptability'];
const profile=(p)=>{const random=rng(hash(String(p.id)+':'+p.name+':character'));
 return Object.fromEntries(traits.map(k=>[k,Math.round(25+random()*70)]));
};
export function developIdentity(player){
 if(!player.personality||typeof player.personality!=='object')player.personality=profile(player);
 for(const k of traits)if(!Number.isFinite(player.personality[k]))player.personality[k]=profile(player)[k];
 if(!Number.isFinite(player.satisfaction))player.satisfaction=clamp((player.morale??80)+5,0,100);
 if(!Number.isFinite(player.reputation))player.reputation=clamp(rating(player)-15,1,99);
 if(!Number.isFinite(player.careerApps))player.careerApps=player.apps||0;
 if(!Number.isFinite(player.careerGoals))player.careerGoals=player.goals||0;
 if(!Array.isArray(player.memories))player.memories=[];
 return player;
}
function news(state,title,detail,kind='world'){
 state.world.news.unshift({id:state.season+':'+state.week+':'+state.world.serial++,season:state.season,week:state.week,title,detail,kind});
 state.world.news=state.world.news.slice(0,80);
}
export function ensureCareer(state){
 state.world??={};
 const w=state.world;
 w.version=1;w.news??=[];w.transfers??=[];w.seasons??=[];w.serial??=0;
 w.lastWeekProcessed??=null;w.nextRivalId??=50000;w.globalMarket??=[];
 state.negotiations??=[];state.incomingOffers??=[];
 state.board??={targetRank:Math.max(1,Math.min(16,state.boardObjectives?.target||10)),requestedSeason:0,warnings:0,status:'normal',lastReviewWeek:0};
 state.coach.skillPoints??=Math.max(0,(state.coach.level||1)-1-(state.coach.skills?.length||0));
 state.academy??=[];
 for(const p of [...(state.players||[]),...state.academy,...(state.market||[])])developIdentity(p);
 for(const club of Object.values(state.rivals||{})){
  club.strategy??={risk:30+(hash(club.name)%55),priority:'equilibrado',lastDecision:0,transfers:[]};
  club.trophies??=0;club.seasons??=0;
  for(const p of club.players||[])developIdentity(p);
 }
 return state;
}
function playable(state,id){const p=state.players.find(x=>x.id===id);return !!p&&p.injury<=0&&(p.contract??0)>0&&(p.suspendedUntilWeek||0)<state.week;}
export function preserveLineups(state,removedId){
 for(const [formation,old] of Object.entries(state.lineups||{})){
  if(!FORMATIONS[formation]||!Array.isArray(old))continue;
  const used=new Set();
  const ids=old.map(id=>id===removedId?null:id);
  for(let i=0;i<11;i++){
   const id=ids[i];
   if(id!==null&&id!==undefined&&playable(state,id)&&!used.has(id)){used.add(id);continue;}
   // Keep an intentionally vacant slot; only fill a slot displaced by a sale.
   if(id===null&&old[i]!==removedId)continue;
   const pool=state.players.filter(p=>playable(state,p.id)&&!used.has(p.id));
   pool.sort((a,b)=>(b.pos===FORMATIONS[formation][i]?100:0)+rating(b)-
    ((a.pos===FORMATIONS[formation][i]?100:0)+rating(a)));
   ids[i]=pool[0]?.id??null;
   if(ids[i])used.add(ids[i]);
  }
  state.lineups[formation]=ids;
 }
}
const needPosition=(club)=>{
 const counts={GK:0,DEF:0,MID:0,ATT:0};
 for(const p of club.players||[])if(p.contract>0&&(p.injury||0)===0)counts[p.pos]=(counts[p.pos]||0)+1;
 const ideal={GK:2,DEF:6,MID:6,ATT:4};
 return Object.keys(ideal).sort((a,b)=>(counts[a]/ideal[a])-(counts[b]/ideal[b]))[0];
};
function rivalLineup(club){
 const pool=club.players.filter(p=>p.contract>0&&(p.injury||0)===0).sort((a,b)=>rating(b)-rating(a));
 return FORMATIONS[club.formation].map(pos=>{
  let index=pool.findIndex(p=>p.pos===pos);if(index<0)index=0;
  return pool.splice(index,1)[0]?.id??null;
 });
}
export function updateRivalIntelligence(state,round){
 ensureCareer(state);
 const random=rng(hash(state.club.name+':rival-ai:'+state.season+':'+round));
 for(const club of Object.values(state.rivals)){
  const strategy=club.strategy;
  if(round%3!==0)continue;
  const position=needPosition(club),players=club.players.slice().sort((a,b)=>rating(a)-rating(b));
  const weak=players.find(p=>p.pos===position)||players[0];
  const pressure=club.form< -4||club.morale<58;
  strategy.priority=pressure?'reconstruir':club.budget>900000?'competir':'sustentabilidade';
  const budget=club.budget||0;
  const price=80000+Math.max(0,Math.round((club.form+9)*6000));
  if(weak&&budget>price+110000&&(weak.age>30||rating(weak)<69||pressure)&&random()<.8){
   const quality=clamp(rating(weak)+4+random()*10,52,93);
   const candidate=developIdentity(generatePlayer(state.world.nextRivalId++,position,random,quality));
   candidate.contract=3;
   club.players=club.players.filter(x=>x.id!==weak.id).concat(candidate);
   club.budget-=price;
   club.lineup=rivalLineup(club);
   strategy.transfers.unshift({season:state.season,round,inId:candidate.id,outId:weak.id,fee:price});
   strategy.transfers=strategy.transfers.slice(0,20);
   news(state,'Reforço no '+club.name,club.name+' reforçou a posição '+position+' com '+candidate.name+'.','transfer');
  }else if(pressure&&club.manager&&random()<.20){
   club.manager={...club.manager,style:'equilibrada',adaptability:clamp(club.manager.adaptability+.08,.2,.95)};
   news(state,'Mudança de rumo',club.name+' alterou a estratégia da equipa técnica.','manager');
  }
  strategy.lastDecision=round;
 }
}
export function getAdvisorReport(state){
 ensureCareer(state);
 const wage=state.players.reduce((s,p)=>s+(p.salary||0),0)/4;
 const recurring=85000+({'Atlântico Energia':25000,'Norte Digital':38000,'Horizonte Global':52000}[state.club.sponsor]||25000)-wage-
 ((state.facilities.stadium||1)*4000+(state.facilities.academy||1)*1800+(state.facilities.training||1)*1300);
 const lineup=new Set(state.lineups?.[state.formation]||[]);
 const coverage={GK:0,DEF:0,MID:0,ATT:0};
 state.players.filter(p=>(p.contract||0)>0).forEach(p=>coverage[p.pos]++);
 const weakest=Object.entries(coverage).sort((a,b)=>a[1]/({GK:2,DEF:6,MID:6,ATT:4}[a[0]])-b[1]/({GK:2,DEF:6,MID:6,ATT:4}[b[0]]))[0]?.[0]||'MID';
 const unrest=state.players.filter(p=>p.satisfaction<50).length;
 const aging=state.players.filter(p=>p.age>=32&&lineup.has(p.id)).length;
 return {wage:Math.round(wage),recurring:Math.round(recurring),weakest,unrest,aging,
  alerts:[...(recurring<0?['As despesas recorrentes ultrapassam as receitas garantidas.']:[]),
   ...(unrest? [unrest+' atletas estão insatisfeitos.']:[]),
   ...(aging? [aging+' titulares têm 32 anos ou mais.']:[]),
   'Prioridade para a observação: '+weakest]};
}
function createIncomingOffer(state,random){
 if(state.incomingOffers.some(o=>o.status==='pending'))return;
 const eligible=state.players.filter(p=>p.age>=19&&p.age<=33&&(p.saleLockUntilWeek||0)<=state.week);
 if(!eligible.length)return;
 const candidate=eligible[Math.floor(random()*eligible.length)];
 const interested=Object.values(state.rivals).filter(c=>(c.budget||0)>120000);
 if(!interested.length)return;
 const club=interested[Math.floor(random()*interested.length)];
 const base=Math.round(transferValue(candidate)*(.74+random()*.48)/1000)*1000;
 const offer=Math.min(base,Math.round(club.budget*.55/1000)*1000);
 if(offer<40000)return;
 state.incomingOffers.push({id:state.world.serial++,playerId:candidate.id,clubId:club.id,clubName:club.name,
  amount:offer,season:state.season,week:state.week,expiresWeek:state.week+2,status:'pending'});
 news(state,'Proposta recebida',club.name+' apresentou uma proposta por '+candidate.name+'.','transfer');
}
function resolveNegotiations(state,random){
 for(const deal of state.negotiations){
  if(deal.status!=='pending'||deal.createdWeek>=state.week)continue;
  const offer=state.market.find(p=>p.id===deal.playerId);
  if(!offer){deal.status='expired';continue;}
  const club=state.rivals[deal.clubId];
  const valuation=Number(offer.ask)||1;
  const personality=developIdentity(offer).personality;
  const demanded=Math.ceil(valuation*(.85+personality.ambition/600));
  const accepted=deal.amount>=demanded&&deal.amount<=state.budget&&state.players.length<35&&
   (offer.satisfaction||75)>=40;
  if(!accepted){
   deal.status=deal.amount<demanded?'counter':'rejected';
   if(deal.status==='counter')deal.counterAmount=Math.ceil(demanded/1000)*1000;
   continue;
  }
  state.budget-=deal.amount;
  state.finance.expenses+=deal.amount;
  state.finance.ledger.unshift({day:state.day,label:'Contratação negociada: '+offer.name,amount:-deal.amount});
  state.players.push({...offer,contract:3,injury:0,goals:0,assists:0,apps:0,saleLockUntilWeek:state.week+3});
  state.market=state.market.filter(x=>x.id!==offer.id);
  deal.status='accepted';deal.settledWeek=state.week;
  if(club)club.budget+=Math.round(deal.amount*.75);
  state.world.transfers.unshift({season:state.season,week:state.week,playerId:offer.id,player:offer.name,fee:deal.amount,to:state.club.name});
  news(state,'Contratação confirmada',offer.name+' assinou pelo '+state.club.name+'.','transfer');
 }
 state.negotiations=state.negotiations.slice(-40);
}
export function progressCareerWeek(state,round){
 ensureCareer(state);
 const key=state.season+':'+round;
 if(state.world.lastWeekProcessed===key)return state;
 state.world.lastWeekProcessed=key;
 const random=rng(hash(state.club.name+':career:'+key));
 const xi=new Set(state.lineups?.[state.formation]||[]);
 for(const player of state.players){
  developIdentity(player);
  const started=xi.has(player.id),mind=player.personality;
  player.careerApps+=(started?1:0);
  player.careerGoals+=Math.max(0,(player.goals||0)-(player.previousGoals||0));
  player.previousGoals=player.goals||0;
  player.satisfaction=clamp(player.satisfaction+(started?3:-Math.max(1,Math.round(mind.ambition/30)))+
   (player.morale>88?1:player.morale<40?-3:0),3,100);
  if(started&&player.age<=29&&player.fitness>45&&
    (round+player.id)%Math.max(3,7-Math.floor(mind.professionalism/28)-(state.coach.skills||[]).includes('developer'))===0){
   const primary=player.pos==='GK'?'gk':player.pos==='DEF'?'def':player.pos==='MID'?'pas':'sho';
   player[primary]=Math.min(98,player.potential,player[primary]+1);
  }
  if(player.satisfaction<30&&mind.ambition>65)player.wantsTransfer=true;
  if(player.satisfaction>60)player.wantsTransfer=false;
  if(player.wantsTransfer&&random()<.08)news(state,'Insatisfação no plantel',player.name+' quer discutir o seu futuro no clube.','player');
 }
 for(const p of state.academy){developIdentity(p);
  const growth=(round+p.id)%4===0?1:0;
  const field=p.pos==='GK'?'gk':p.pos==='DEF'?'def':p.pos==='MID'?'pas':'sho';
  p[field]=Math.min(p.potential,p[field]+growth);
 }
 for(const m of state.mentors){m.xp=(m.xp||0)+12;m.level=Math.min(10,1+Math.floor(m.xp/150));}
 updateRivalIntelligence(state,round);
 resolveNegotiations(state,random);
 state.incomingOffers=state.incomingOffers.filter(o=>o.status==='pending'&&o.expiresWeek>=state.week);
 if(round%4===0)createIncomingOffer(state,random);
 const rank=standings(state).findIndex(t=>t.id===0)+1;
 const b=state.board,target=b.targetRank;
 if(rank>target+5&&round>=8){b.warnings++;b.status=b.warnings>=3?'ultimatum':'warning';}
 else if(rank<=target+1){b.warnings=Math.max(0,b.warnings-1);b.status='normal';}
 if(b.status==='ultimatum'&&round%3===0)news(state,'Direção exige resultados','O clube está abaixo do objetivo de '+target+'º lugar. O orçamento discricionário poderá ficar limitado.','board');
 if(round%5===0){
  const report=getAdvisorReport(state);
  if(report.recurring<0)news(state,'Alerta de tesouraria','O saldo recorrente é negativo. Analisa salários e instalações.','finance');
 }
 return state;
}
export function nextSeasonCareer(state){
 ensureCareer(state);
 const random=rng(hash(state.club.name+':offseason:'+state.season));
 const old=state.rivals;
 // Keep opponents, their players, transfer history and managers between seasons.
 for(const club of Object.values(old)){
  club.seasons=(club.seasons||0)+1;
  for(const p of club.players){
   p.age++;p.contract=Math.max(0,(p.contract||1)-1);
   if(p.contract===0)p.contract=p.personality?.loyalty>30?2:1;
   if(p.age>=31){const key=p.pos==='GK'?'gk':'pac';p[key]=Math.max(20,p[key]-1-Math.floor((p.age-31)/4));}
   p.injury=0;p.fitness=92;p.morale=clamp((p.morale||75)+3,0,100);
  }
  const retirees=club.players.filter(p=>p.age>=38||(p.age>=35&&random()<.35));
  club.players=club.players.filter(p=>!retirees.includes(p));
  for(const p of retirees){
   const newcomer=developIdentity(generatePlayer(state.world.nextRivalId++,p.pos,random,clamp(rating(p)+random()*8-4,50,88)));
   newcomer.age=18+Math.floor(random()*7);
   club.players.push(newcomer);
  }
  club.lineup=rivalLineup(club);
  club.budget=Math.max(80000,club.budget||0);
 }
 state.world.seasons.unshift({season:state.season-1,club:state.club.name,division:state.division,
  target:state.board.targetRank,coach:state.coach.name});
 state.world.seasons=state.world.seasons.slice(0,25);
 state.board.targetRank=clamp(state.division===1?Math.max(6,12-(state.coach.trophies||0)):10,1,16);
 state.board.warnings=Math.max(0,state.board.warnings-1);state.board.status='normal';
 state.board.requestedSeason=0;
 state.world.lastWeekProcessed=null;
 for(const p of state.players){
  developIdentity(p);
  const age=p.age;
  if(age>=30){const decline=age>=35?2:1;p.pac=clamp(p.pac-decline,8,99);p.phy=clamp(p.phy-(age>=34?1:0),8,99);}
  p.satisfaction=clamp(p.satisfaction+12,0,100);
  p.previousGoals=0;
 }
 for(const p of state.academy)developIdentity(p);
 state.negotiations=[];state.incomingOffers=[];
 news(state,'Nova época, novas metas','A direção espera um lugar entre os primeiros '+state.board.targetRank+'.','board');
 return state;
}
export function acceptIncomingOffer(state,id){
 ensureCareer(state);
 const offer=state.incomingOffers.find(x=>x.id===Number(id)&&x.status==='pending');
 if(!offer)throw Error('Proposta expirada ou inexistente.');
 const player=state.players.find(x=>x.id===offer.playerId);
 if(!player||state.players.length<=16)throw Error('Não é possível vender: plantel insuficiente.');
 const rival=state.rivals[offer.clubId];
 if(!rival||rival.budget<offer.amount)throw Error('O clube comprador já não dispõe de orçamento.');
 const buy=offer.amount;
 rival.budget-=buy;
 rival.players.push({...player,id:state.world.nextRivalId++,apps:0,goals:0,assists:0,contract:Math.max(2,player.contract)});
 rival.lineup=rivalLineup(rival);
 state.players=state.players.filter(p=>p.id!==player.id);
 preserveLineups(state,player.id);
 state.budget+=buy;state.finance.income+=buy;
 state.finance.ledger.unshift({day:state.day,label:'Venda negociada: '+player.name,amount:buy});
 state.world.transfers.unshift({season:state.season,week:state.week,player:player.name,fee:buy,to:rival.name});
 offer.status='accepted';
 news(state,'Venda confirmada',player.name+' transferido para '+rival.name+'.','transfer');
 return buy;
}
export function negotiateMarket(state,playerId,amount){
 ensureCareer(state);
 const player=state.market.find(p=>p.id===Number(playerId));
 if(!player||player.freeAgent||player.ask<=100000)throw Error('Utiliza a contratação direta para esta oferta.');
 if(state.negotiations.some(x=>x.playerId===player.id&&['pending','counter'].includes(x.status)))
  throw Error('Já existe uma negociação para este atleta.');
 if(!Number.isFinite(amount)||amount<Math.round(player.ask*.65)||amount>state.budget)
  throw Error('A proposta deve ser válida e caber no orçamento.');
 const clubs=Object.values(state.rivals);
 const club=clubs[hash('selling:'+player.id)%clubs.length];
 const deal={id:state.world.serial++,playerId:player.id,clubId:club.id,amount:Math.round(amount/1000)*1000,
  createdWeek:state.week,status:'pending'};
 state.negotiations.push(deal);
 news(state,'Negociação iniciada','Enviada proposta por '+player.name+'. O clube vendedor responderá após a próxima jornada.','transfer');
 return deal;
}
export function boardBudgetRequest(state){
 ensureCareer(state);
 const b=state.board;
 if(b.requestedSeason===state.season)throw Error('Já pediste orçamento nesta época.');
 b.requestedSeason=state.season;
 const confidence=state.finance.boardConfidence||0;
 if(confidence<57||state.finance.debt>0||b.status==='ultimatum'){
  news(state,'Pedido recusado','A direção exige melhores resultados e contas equilibradas antes de investir.','board');
  return 0;
 }
 const amount=Math.round((65000+confidence*1500+state.facilities.commercial*12000+((state.coach.skills||[]).includes('economist')?30000:0))/1000)*1000;
 state.budget+=amount;state.finance.income+=amount;
 state.finance.ledger.unshift({day:state.day,label:'Orçamento adicional autorizado pela direção',amount});
 news(state,'Investimento autorizado','A direção aprovou '+amount+' € para reforçar o clube.','board');
 return amount;
}
