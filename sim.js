
import {rng,hash,clamp,teamPower,getPlayer,fixtureName,standings,makeCup,makeLeague,autoLineup,makeMarket,makeRivals,rivalTick,generatePlayer,rating,log,weeklyWageBill,televisionIncome,sponsorIncome,campusMaintenance} from './model.js';
import {runMatch,tacticalModifiers} from './match-engine.js';
import {progressCareerWeek,nextSeasonCareer} from './career-intelligence.js';
import {archiveSeasonResults,ensureUniverse} from './management-universe.js';
import {runCompetitionFixture} from './competition-physics.js';
const pick=(random,arr)=>arr[Math.floor(random()*arr.length)];
const poisson=(random,lambda)=>{let k=0,p=1,L=Math.exp(-lambda);while(p>L&&k<10){p*=random();k++;}return k-1;};
export function tacticsMultiplier(state){return tacticalModifiers(state?.tactics||{},state?.mentors?.find(m=>m.id===state.mentorActive)||null);}
export function simulateMatch(state,fixture,options={}){
 const clubIncluded=fixture.home===0||fixture.away===0;
 if(clubIncluded){
  const ids=state.lineups[state.formation]||[];
  if(ids.length!==11||new Set(ids).size!==11||ids.some(id=>{
   const p=getPlayer(state,id);
   return !p||(p.injury||0)>0||(p.contract??0)<=0||(p.suspendedUntilWeek||0)>=state.week;
  }))state.lineups[state.formation]=autoLineup(state);
 }
 // Every fixture now uses the same metric ball, referee, tactics and 22-player
 // engine as the watched match. No synthetic score is assigned before play.
 const result=runCompetitionFixture(state,fixture,options);
 if(clubIncluded&&!options.friendly){
  const won=result.hg===result.ag&&options.cup&&result.penaltyWinner!==null
   ?result.penaltyWinner===0:fixture.home===0?result.hg>result.ag:result.ag>result.hg;
  const lost=result.hg===result.ag&&options.cup&&result.penaltyWinner!==null
   ?result.penaltyWinner!==0:fixture.home===0?result.hg<result.ag:result.ag<result.hg;
  const active=new Set([
   ...(state.lineups[state.formation]||[]),
   ...(result.substitutions||[]).filter(s=>s.team===0).map(s=>s.inId)
  ]);
  for(const id of active){
   const player=getPlayer(state,id);if(!player)continue;
   player.apps=(player.apps||0)+1;
   player.xp=(player.xp||0)+(won?12:7);
   player.fitness=clamp((player.fitness||90)-Math.max(8,result.fatigue?.[id]??14),4,100);
   player.morale=clamp((player.morale||80)+(won?4:lost?-4:1),5,100);
   const conceded=fixture.home===0?result.ag:result.hg;
   if(player.pos==='GK'&&conceded===0)player.cleanSheets=(player.cleanSheets||0)+1;
  }
  for(const event of result.events||[])if(event.kind==='goal'&&event.team===0){
   if(event.playerId&&!event.ownGoal){
    const scorer=getPlayer(state,event.playerId);
    if(scorer)scorer.goals=(scorer.goals||0)+1;
   }
   if(event.assistId){
    const assister=getPlayer(state,event.assistId);
    if(assister)assister.assists=(assister.assists||0)+1;
   }
  }
  for(const injury of result.injuries||[])if(injury.team===0){
   const player=getPlayer(state,injury.playerId);
   if(player)player.injury=Math.max(player.injury||0,injury.weeks||1);
  }
  for(const card of result.discipline||[])if(card.team===0){
   const player=getPlayer(state,card.playerId);if(!player)continue;
   player.cards=(player.cards||0)+(card.yellow||0);
   if(card.red)player.suspendedUntilWeek=Math.max(player.suspendedUntilWeek||0,state.week+1);
  }
 }
 return result;
}
export function addLedger(state,label,amount){
 if(!state.finance)state.finance={income:0,expenses:0,ledger:[]};
 const prior=state.budget;
 state.budget=Math.max(0,state.budget+amount);
 if(amount>0){
  state.finance.income+=amount;
  // Repagar primeiro as dívidas antes de autorizar investimento adicional.
  const due=Math.min(state.finance.debt||0,Math.max(0,state.budget));
  if(due){state.finance.debt-=due;state.budget-=due;state.finance.unpaidWages=Math.max(0,(state.finance.unpaidWages||0)-due);state.finance.ledger.unshift({day:state.day,label:'Amortização de dívida',amount:-due});}
 }else{
  state.finance.expenses+=Math.abs(amount);
  if(prior+amount<0){const missing=Math.abs(prior+amount);state.finance.debt=(state.finance.debt||0)+missing;if(label.startsWith('Salários'))state.finance.unpaidWages=(state.finance.unpaidWages||0)+missing;}
 }
 state.finance.ledger.unshift({day:state.day,label,amount});
 state.finance.ledger=state.finance.ledger.slice(0,90);
}
function updateProgress(state,type){
 const event=type==='match'?'match':type==='win'?'win':'train';
 [...state.events.daily,...state.events.weekly].forEach(q=>{if(q.id===event&&!q.claimed)q.progress=Math.min(q.target,q.progress+1);});
}
function awardMatch(state,result,fixture){
 const won=(fixture.home===0?result.hg>result.ag:result.ag>result.hg),draw=result.hg===result.ag;
 if(won){state.coach.wins++;addLedger(state,'Prémio de vitória',26000);updateProgress(state,'win');}
 else if(draw){state.coach.draws++;addLedger(state,'Prémio de empate',10000);}
 else state.coach.losses++;
 if(fixture.home===0){
  const price=state.finance.stadiumTickets||18;
  const demand=clamp(.82-(price-18)*.014+Math.min(.20,state.fans/100000)+(won?.06:draw?0:-.04),.16,.99);
  const attendance=Math.min(state.club.capacity,Math.round(state.fans*1.1*demand));
  addLedger(state,'Bilheteira · '+attendance+' adeptos',Math.floor(attendance*price));
 }
 const wages=weeklyWageBill(state);
 addLedger(state,'Direitos televisivos da jornada',televisionIncome(state));
 addLedger(state,'Patrocínio · '+(state.club.sponsor||'Atlântico Energia'),sponsorIncome(state));
 addLedger(state,'Salários mensais rateados por jornada',-wages);
 addLedger(state,'Manutenção do campus',-campusMaintenance(state));
 if(state.finance.debt>0){
  state.finance.boardConfidence=clamp((state.finance.boardConfidence??75)-5,0,100);
  state.players.forEach(p=>p.morale=clamp(p.morale-2,0,100));
  log(state,'Aviso da direção','Existem dívidas de '+state.finance.debt+' €. Moral e confiança da direção afetadas.');
 }else state.finance.boardConfidence=clamp((state.finance.boardConfidence??75)+(won?2:draw?0:-1),0,100);
 const fanShift=won?180:draw?65:-110;
 state.fans=clamp(state.fans+fanShift,100,2000000);
 state.coach.xp+=won?80:draw?45:20;
 const previousLevel=state.coach.level;
 state.coach.level=1+Math.floor(state.coach.xp/320);
 state.coach.skillPoints=(state.coach.skillPoints||0)+Math.max(0,state.coach.level-previousLevel);
 updateProgress(state,'match');
 log(state,won?'Vitória importante!':draw?'Empate disputado':'Derrota da equipa',result.homeName+' '+result.hg+'–'+result.ag+' '+result.awayName);
}
export function applyRound(state,{featuredResult=null,otherResults=null}={}){
 const round=state.league.rounds[state.league.round-1];
 if(!round||round.every(f=>f.played))throw Error('Não existe jornada por disputar.');
 const playerFixture=round.find(f=>f.home===0||f.away===0);
 if(!playerFixture)throw Error('Clube não encontrado no calendário.');
 const lineup=state.lineups[state.formation]||[];
 if(lineup.length!==11||new Set(lineup).size!==11||lineup.some(id=>!getPlayer(state,id)||(getPlayer(state,id)?.injury||0)>0||(getPlayer(state,id)?.contract??0)<=0||(getPlayer(state,id)?.suspendedUntilWeek||0)>=state.week)){
  const automatic=autoLineup(state);
  if(automatic.some(id=>!id))throw Error('Não há 11 jogadores disponíveis. Contrata, renova ou recupera atletas.');
  state.lineups[state.formation]=automatic;
  log(state,'Onze corrigido automaticamente','Jogadores lesionados, sem contrato ou indisponíveis foram substituídos.');
 }
 let featured=null;
 for(const fixture of round){
  if(fixture.played)continue;
  const result=fixture===playerFixture&&featuredResult?featuredResult:(otherResults?.[fixture.id]||simulateMatch(state,fixture));
  if(fixture===playerFixture&&featuredResult){
   const line=state.lineups[state.formation]||[];
   const played=new Set([...line,...(featuredResult.substitutions||[]).filter(x=>x.side=== (fixture.home===0?0:1)||x.team===0).map(x=>x.inId)]);
   const userWon=(fixture.home===0?result.hg>result.ag:result.ag>result.hg);
   const userLost=(fixture.home===0?result.hg<result.ag:result.ag<result.hg);
   for(const id of played){const p=getPlayer(state,id);if(!p)continue;
    p.apps=(p.apps||0)+1;p.xp=(p.xp||0)+(userWon?12:7);
    p.fitness=clamp((p.fitness||90)-Math.max(9,featuredResult.fatigue?.[p.id]??14),4,100);
    p.morale=clamp((p.morale||80)+(userWon?4:userLost?-4:1),5,100);
    if(p.pos==='GK'&&(fixture.home===0?result.ag:result.hg)===0)p.cleanSheets=(p.cleanSheets||0)+1;
   }
   for(const e of result.events||[])if(e.kind==='goal'&&e.team===0){
    if(e.playerId&&!e.ownGoal){const scorer=getPlayer(state,e.playerId);if(scorer)scorer.goals=(scorer.goals||0)+1;}
    if(e.assistId){const maker=getPlayer(state,e.assistId);if(maker)maker.assists=(maker.assists||0)+1;}
   }
   // Match officials affect the next round: reds suspend the club player.
   // Persist physical injuries by player identity; weekly recovery below consumes
   // one week immediately, so retain the intended full recovery horizon.
   for(const injury of featuredResult.injuries||[]){
    if(injury.team!==0)continue;
    const athlete=getPlayer(state,injury.playerId);
    if(!athlete)continue;
    athlete.injury=Math.max(athlete.injury||0,(injury.weeks||1)+1);
    athlete.fitness=clamp((athlete.fitness||80)-8,4,100);
    log(state,'Boletim clínico',athlete.name+': '+injury.reason+' ('+injury.weeks+' semanas).');
   }
   for(const d of featuredResult.discipline||[]){
    if(d.team!==0)continue;
    const p=getPlayer(state,d.playerId);if(!p)continue;
    p.cards=(p.cards||0)+(d.yellow||0);
    if(d.red)p.suspendedUntilWeek=Math.max(p.suspendedUntilWeek||0,state.week+1);
   }
  }
  fixture.hg=result.hg;fixture.ag=result.ag;fixture.played=true;
  if(fixture===playerFixture){
   featured=result;
   awardMatch(state,result,fixture);
   state.results.unshift({type:'league',round:fixture.round,result});
  }
 }
 rivalTick(state,state.league.round);
 state.league.round++;
 state.week++;state.day+=7;state.trainingCount=0;state.restDaysThisWeek=0;state.friendliesThisWeek=0;state.gameNonce=0;
 state.players.forEach(p=>{p.injury=Math.max(0,p.injury-1);p.fitness=clamp(p.fitness+8+state.facilities.medical*2,5,100);p.morale=clamp(p.morale+1,5,100);});
 progressCareerWeek(state,state.league.round-1);
 state.market=makeMarket(state,hash(state.club.name)+state.week*923+state.season*322);
 // Recompensas conquistadas continuam resgatáveis; não destruir o progresso depois do apito final.
 state.events.daily.forEach(q=>{if(q.claimed){q.progress=0;q.claimed=false;}});
 state.events.weekly.forEach(q=>{if(state.week%5===0&&q.claimed){q.progress=0;q.claimed=false;}});
 state.academy.forEach(p=>{p.xp=(p.xp||0)+20;if(p.pas<p.potential&&state.week%3===0)p.pas++;});
 state.lastMatch=featured;
 if([4,8,16,22].includes(state.week-1)&&!state.cup.completed)playCup(state);
 if(state.league.round>30){const top=standings(state);state.league.completed=true;state.league.champion=top[0]?.id??null;const position=top.findIndex(t=>t.id===0)+1;let reward=position===1?550000:position<=4?280000:position<=8?140000:65000;addLedger(state,'Prémio de classificação',reward);if(position===1){state.coach.trophies++;state.coach.achievements.push('Campeão nacional • Época '+state.season);}log(state,'Fim da época '+state.season,'Terminaste em '+position+'º lugar. Prémio: '+reward+' €.');}
 return featured;
}
export function playCup(state){
 const remaining=state.cup.participants;if(remaining.length<=1){state.cup.completed=true;state.cup.winner=remaining[0]??null;return null;}
 const winners=[],stageGames=[];
 for(let i=0;i<remaining.length;i+=2){
  const fixture={id:7000+state.season*100+state.cup.stage*10+i,home:remaining[i],away:remaining[i+1]};
  const result=simulateMatch(state,fixture,{cup:true});const winner=result.penaltyWinner??(result.hg>result.ag?fixture.home:fixture.away);
  winners.push(winner);stageGames.push({home:fixture.home,away:fixture.away,hg:result.hg,ag:result.ag,winner});
  if(fixture.home===0||fixture.away===0){
   state.results.unshift({type:'cup',round:state.cup.stage+1,result});
   addLedger(state,'Taça: prémio de participação',winner===0?52000:18000);
   log(state,winner===0?'Taça: passagem à próxima fase':'Taça: eliminação',result.homeName+' '+result.hg+'–'+result.ag+' '+result.awayName);
  }
 }
 state.cup.results.push({stage:state.cup.stage+1,games:stageGames});state.cup.stage++;
 state.cup.participants=winners;if(winners.length===1){state.cup.winner=winners[0];state.cup.completed=true;if(winners[0]===0){state.coach.trophies++;state.coach.achievements.push('Vencedor da Taça • Época '+state.season);addLedger(state,'Prémio pela Taça',350000);}}
 return stageGames;
}
export function advanceSeason(state){
 if(!state.league.completed)throw Error('A época ainda não terminou.');
 const pos=standings(state).findIndex(t=>t.id===0)+1;
 const previousDivision=state.division;
 const previous=state.season;
 archiveSeasonResults(state,pos);
 state.history.unshift({season:previous,position:pos,champion:fixtureName(state,state.league.champion),cup:state.cup.winner===0,record:state.coach.wins+'/'+state.coach.draws+'/'+state.coach.losses});
 if(pos<=2)state.division=Math.max(1,state.division-1);else if(pos>=14)state.division=Math.min(8,state.division+1);
 state.season++;state.week=1;state.day++;state.trainingCount=0;
 let autoRenewed=0;
 state.players.forEach(p=>{
  p.age++;
  p.contract=Math.max(0,(Number(p.contract)||0)-1);
  if(p.contract===0){
   // Standard one-season club option: preserves a usable team and costs
   // a modest 2.5% wage rise, not an impossible signing fee.
   p.contract=1;p.salary=Math.ceil((Number(p.salary)||5000)*(p.satisfaction<45?1.055:1.025)/100)*100;
   autoRenewed++;
  }
  p.fitness=95;p.injury=0;p.cards=0;p.goals=0;p.assists=0;p.apps=0;p.cleanSheets=0;
 });
 if(autoRenewed)log(state,'Continuidade do plantel',autoRenewed+' contratos prolongados automaticamente por uma época.');
 nextSeasonCareer(state,previousDivision);
 state.league=makeLeague(state.club.name,state.season,hash(state.club.name),state.division);
 // Persistent rival careers: do not erase squads, transfers or managers annually.
 for(const team of state.league.teams.filter(t=>t.id!==0)){
  const club=state.rivals[team.id];if(club){team.name=club.name;team.power=clamp(Math.round(club.players.reduce((sum,p)=>sum+rating(p),0)/Math.max(1,club.players.length)),40,95);}
 }
 state.cup=makeCup(state);state.market=makeMarket(state,hash(state.club.name)+state.season*977);
 state.academy.forEach(p=>{p.age++;p.potential=clamp(p.potential+state.facilities.academy*.3,0,99);});
 state.mentors=state.mentors.filter(m=>(--m.contract)>0);if(!state.mentors.some(m=>m.id===state.mentorActive))state.mentorActive=null;
 state.finance.boardConfidence=clamp((state.finance.boardConfidence??75)+(pos<=8?6:-6),0,100);
 state.restDaysThisWeek=0;state.friendliesThisWeek=0;state.gameNonce=0;
 state.lastMatch=null;state.results=[];
 log(state,'Época '+state.season+' iniciada','Começa uma nova temporada na divisão '+state.division+'.');
}
