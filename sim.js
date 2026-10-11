
import {rng,hash,clamp,teamPower,getPlayer,fixtureName,standings,makeCup,makeLeague,autoLineup,makeMarket,generatePlayer,rating,log} from './model.js';
const pick=(random,arr)=>arr[Math.floor(random()*arr.length)];
const poisson=(random,lambda)=>{let k=0,p=1,L=Math.exp(-lambda);while(p>L&&k<10){p*=random();k++;}return k-1;};
export function tacticsMultiplier(state){
 let attack=1,defense=1,midfield=1,fatigue=1;
 const t=state.tactics||{};
 if(t.mentality==='ofensiva'){attack+=.16;defense-=.10;fatigue+=.1;}
 if(t.mentality==='defensiva'){attack-=.08;defense+=.15;}
 if(t.pressure==='alta'){attack+=.09;defense+=.025;fatigue+=.16;}
 if(t.pressure==='baixa'){fatigue-=.1;defense+=.02;}
 if(t.passing==='curto'){midfield+=.12;attack-=.03;}
 if(t.passing==='longo'){attack+=.06;midfield-=.07;}
 if(t.tempo==='rapido'){attack+=.07;fatigue+=.09;}
 if(t.marking==='individual'){defense+=.07;fatigue+=.07;}
 const mentor=state.mentors.find(m=>m.id===state.mentorActive);
 if(mentor){const delta=.05+(mentor.level-1)*.012;if(mentor.bonus==='attack')attack+=delta;if(mentor.bonus==='midfield')midfield+=delta;if(mentor.bonus==='defense')defense+=delta;if(mentor.bonus==='fitness')fatigue-=delta;}
 return {attack,defense,midfield,fatigue};
}
export function simulateMatch(state,fixture,{cup=false,friendly=false}={}){
 const seed=hash([state.season,state.week,fixture.id,fixture.home,fixture.away,state.club.name,state.tactics.mentality,state.tactics.passing].join(':'));
 const random=rng(seed);
 const homeUser=fixture.home===0,awayUser=fixture.away===0,involved=homeUser||awayUser;
 const userId=involved?0:-1;
 const modifiers=tacticsMultiplier(state),homePower=teamPower(state,fixture.home),awayPower=teamPower(state,fixture.away);
 const h=homePower+(homeUser?3:0)+(homeUser?(modifiers.attack-1)*17:0),a=awayPower+(awayUser?(modifiers.attack-1)*17:0);
 const hd=Math.max(.35,1.36+(h-a)*.045+(homeUser?modifiers.attack-1:0)-(awayUser?modifiers.defense-1:0));
 const ad=Math.max(.35,1.05+(a-h)*.045+(awayUser?modifiers.attack-1:0)-(homeUser?modifiers.defense-1:0));
 let hg=clamp(poisson(random,hd),0,7),ag=clamp(poisson(random,ad),0,7);
 if(cup&&hg===ag){if(random()<.5)hg++;else ag++;}
 const homeName=fixtureName(state,fixture.home),awayName=fixtureName(state,fixture.away);
 const events=[], lineup=state.lineups[state.formation]||[];
 const starters=lineup.map(id=>getPlayer(state,id)).filter(Boolean);
 function chooseScorer(){
  const weights=starters.map(p=>p.pos==='ATT'?6:p.pos==='MID'?3:p.pos==='DEF'?1.2:.1);
  const total=weights.reduce((n,x)=>n+x,0),roll=random()*total;let running=0;
  return starters.find((p,i)=>(running+=weights[i])>=roll)||starters[0];
 }
 for(let team=0;team<2;team++){
  const goals=team===0?hg:ag,club=team===0?homeName:awayName,teamId=team===0?fixture.home:fixture.away;
  for(let i=0;i<goals;i++){
   const minute=3+Math.floor(random()*86);
   let scorer=teamId===0?chooseScorer():null;
   let assist=null;
   if(scorer){scorer.goals=(scorer.goals||0)+1;const options=starters.filter(p=>p.id!==scorer.id&&p.pos!=='GK');if(random()<.68&&options.length){assist=pick(random,options);assist.assists=(assist.assists||0)+1;}}
   events.push({minute,kind:'goal',team:teamId,text:'GOLO! '+club+(scorer?' — '+scorer.name:''),player:scorer?.name||null,x:40+random()*20,y:team===0?18+random()*26:58+random()*24});
  }
 }
 if(involved){
  const injuryChance=.055+(modifiers.fatigue-1)*.16;
  if(random()<injuryChance&&starters.length){
   const p=pick(random,starters);p.injury=Math.max(1,1+Math.floor(random()*3));
   events.push({minute:15+Math.floor(random()*70),kind:'injury',team:0,text:'Lesão: '+p.name+' ('+p.injury+' jornadas de recuperação)',player:p.name,x:32,y:60});
  }
  if(random()<.38&&starters.length){const p=pick(random,starters);p.cards=(p.cards||0)+1;events.push({minute:22+Math.floor(random()*66),kind:'card',team:0,text:'Cartão amarelo: '+p.name,player:p.name,x:62,y:51});}
  starters.forEach(p=>{
   p.apps=(p.apps||0)+1;
   p.fitness=clamp(p.fitness-Math.ceil(12+random()*9+(modifiers.fatigue-1)*16),8,100);
   p.morale=clamp(p.morale+(homeUser?(hg>ag?4:hg<ag?-4:1):(ag>hg?4:ag<hg?-4:1)),5,100);
   if(p.pos==='GK'&&(homeUser?ag===0:hg===0))p.cleanSheets=(p.cleanSheets||0)+1;
  });
  const mentor=state.mentors.find(m=>m.id===state.mentorActive);
  if(mentor){mentor.xp+=22;if(mentor.xp>=mentor.level*70&&mentor.level<10){mentor.xp=0;mentor.level++;}}
 }
 for(let i=0;i<5+Math.floor(random()*8);i++){
  const min=2+Math.floor(random()*86),team=random()<.5?fixture.home:fixture.away;
  events.push({minute:min,kind:random()<.23?'save':'chance',team,text:random()<.22?'Grande defesa!':'Oportunidade de perigo para '+fixtureName(state,team),x:15+random()*70,y:14+random()*70});
 }
 events.push({minute:45,kind:'half',team:-1,text:'Intervalo — reajustar a estratégia',x:50,y:50});
 events.push({minute:90,kind:'end',team:-1,text:'Apito final: '+homeName+' '+hg+'–'+ag+' '+awayName,x:50,y:50});
 events.sort((a,b)=>a.minute-b.minute||(a.kind==='goal'?-1:1));
 const possession=clamp(Math.round(50+(homePower-awayPower)*.6+((homeUser?modifiers.midfield-1:awayUser?1-modifiers.midfield:0)*30)),25,75);
 const shotsHome=Math.max(hg+2,Math.round(hd*4+random()*4)),shotsAway=Math.max(ag+2,Math.round(ad*4+random()*4));
 return {home:fixture.home,away:fixture.away,hg,ag,homeName,awayName,events,stats:{possession,shotsHome,shotsAway,onTargetHome:Math.max(hg,Math.round(shotsHome*.43)),onTargetAway:Math.max(ag,Math.round(shotsAway*.43)),xgHome:hd.toFixed(2),xgAway:ad.toFixed(2)},involved,cup,friendly};
}
export function addLedger(state,label,amount){
 if(!state.finance)state.finance={income:0,expenses:0,ledger:[]};
 state.budget=Math.max(0,state.budget+amount);
 if(amount>0)state.finance.income+=amount;else state.finance.expenses+=Math.abs(amount);
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
 if(fixture.home===0){const takings=Math.floor(state.club.capacity*.61*state.finance.stadiumTickets);addLedger(state,'Bilheteira',takings);}
 const wages=state.players.reduce((n,p)=>n+(p.salary||0),0);
 addLedger(state,'Salários da jornada',-Math.min(state.budget,wages));
 const sponsor=13000+state.facilities.commercial*5000;
 addLedger(state,'Patrocínio e televisão',sponsor);
 const fanShift=won?180:draw?65:-110;
 state.fans=clamp(state.fans+fanShift,100,2000000);
 state.coach.xp+=won?80:draw?45:20;
 state.coach.level=1+Math.floor(state.coach.xp/320);
 updateProgress(state,'match');
 log(state,won?'Vitória importante!':draw?'Empate disputado':'Derrota da equipa',result.homeName+' '+result.hg+'–'+result.ag+' '+result.awayName);
}
export function applyRound(state){
 const round=state.league.rounds[state.league.round-1];
 if(!round||round.every(f=>f.played))throw Error('Não existe jornada por disputar.');
 const playerFixture=round.find(f=>f.home===0||f.away===0);
 if(!playerFixture)throw Error('Clube não encontrado no calendário.');
 if((state.lineups[state.formation]||[]).some(id=>!id))throw Error('O onze inicial está incompleto.');
 let featured=null;
 for(const fixture of round){
  if(fixture.played)continue;
  const result=simulateMatch(state,fixture);
  fixture.hg=result.hg;fixture.ag=result.ag;fixture.played=true;
  if(fixture===playerFixture){
   featured=result;
   awardMatch(state,result,fixture);
   state.results.unshift({type:'league',round:fixture.round,result});
  }
 }
 state.league.round++;
 state.week++;state.day+=7;state.trainingCount=0;
 state.players.forEach(p=>{p.injury=Math.max(0,p.injury-1);p.fitness=clamp(p.fitness+8+state.facilities.medical*2,5,100);p.morale=clamp(p.morale+1,5,100);});
 state.market=makeMarket(state,hash(state.club.name)+state.week*923+state.season*322);
 state.events.daily.forEach(q=>{q.progress=0;q.claimed=false;});
 state.events.weekly.forEach(q=>{if(state.week%5===0){q.progress=0;q.claimed=false;}});
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
  const result=simulateMatch(state,fixture,{cup:true});const winner=result.hg>result.ag?fixture.home:fixture.away;
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
 const previous=state.season;
 state.history.unshift({season:previous,position:pos,champion:fixtureName(state,state.league.champion),cup:state.cup.winner===0,record:state.coach.wins+'/'+state.coach.draws+'/'+state.coach.losses});
 if(pos<=2)state.division=Math.max(1,state.division-1);else if(pos>=14)state.division=Math.min(8,state.division+1);
 state.season++;state.week=1;state.day++;state.trainingCount=0;
 state.players.forEach(p=>{p.age++;p.contract=Math.max(0,(p.contract||1)-1);p.fitness=95;p.injury=0;p.cards=0;p.goals=0;p.assists=0;p.apps=0;p.cleanSheets=0;});
 state.league=makeLeague(state.club.name,state.season,hash(state.club.name),state.division);
 state.cup=makeCup(state);state.market=makeMarket(state,hash(state.club.name)+state.season*977);
 state.lastMatch=null;state.results=[];
 log(state,'Época '+state.season+' iniciada','Começa uma nova temporada na divisão '+state.division+'.');
}
