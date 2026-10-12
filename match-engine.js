
import {rng,hash,clamp,getPlayer,fixtureName,rating,teamPower} from './model.js';

const TACTIC_DEFAULT={mentality:'equilibrada',pressure:'media',passing:'misto',tempo:'normal',marking:'zona'};
const TACTIC_MATRIX={
 mentality:{defensiva:{attack:.87,defense:1.16,pace:.87},equilibrada:{attack:1,defense:1,pace:1},ofensiva:{attack:1.17,defense:.87,pace:1.13}},
 pressure:{baixa:{turnover:.89,fatigue:.83,defense:1.025},media:{turnover:1,fatigue:1},alta:{turnover:1.18,fatigue:1.32,defense:1.045}},
 passing:{curto:{success:1.12,progress:.85},misto:{success:1,progress:1},longo:{success:.84,progress:1.25}},
 tempo:{lento:{pace:.82,success:1.07,fatigue:.88},normal:{pace:1},rapido:{pace:1.19,success:.91,fatigue:1.17}},
 marking:{zona:{defense:1},individual:{defense:1.065,fatigue:1.12}}
};
function tactics(t={},mentor=null){
 const out={attack:1,defense:1,pace:1,turnover:1,fatigue:1,success:1,progress:1};
 for(const [key,options] of Object.entries(TACTIC_MATRIX)){
  const choice=options[t[key]]||options[TACTIC_DEFAULT[key]];
  for(const [effect,value] of Object.entries(choice))out[effect]*=value;
 }
 if(mentor){
  const bonus=.045+clamp((mentor.level||1)-1,0,9)*.013;
  if(mentor.bonus==='attack')out.attack+=bonus;
  if(mentor.bonus==='midfield')out.success+=bonus;
  if(mentor.bonus==='defense')out.defense+=bonus;
  if(mentor.bonus==='fitness')out.fatigue=Math.max(.65,out.fatigue-bonus);
 }
 return out;
}
function specialist(p,type){
 let x=1;
 if(p.style==='Finalizador'&&type==='shot')x*=1.12;
 if(p.style==='Criador'&&type==='pass')x*=1.10;
 if(p.style==='Destruidor'&&type==='defense')x*=1.12;
 if(p.style==='Veloz'&&type==='advance')x*=1.09;
 if(p.style==='Líder')x*=1.025;
 if(p.special==='Líder de equipa')x*=1.065;
 x+=clamp((p.classLevel||1)-1,0,10)*.012;
 return x;
}
function groupScore(players,key){
 if(!players.length)return 55;
 return players.reduce((v,p)=>v+(p[key]??55),0)/players.length;
}
function selectWeighted(random,players,weight){
 if(!players.length)return null;
 const weights=players.map(p=>Math.max(.01,weight(p))),total=weights.reduce((a,b)=>a+b,0);
 let cursor=random()*total;
 for(let i=0;i<players.length;i++){cursor-=weights[i];if(cursor<=0)return players[i];}
 return players.at(-1);
}
function makeTeam(state,id){
 const isUser=id===0,profile=state.rivals?.[id],all=isUser?state.players:(profile?.players||[]);
 const ids=isUser?(state.lineups[state.formation]||[]):(profile?.lineup||all.slice(0,11).map(p=>p.id));
 const allowed=p=>p&&(p.injury||0)<=0&&(p.contract??1)>0&&(p.suspendedUntilWeek||0)<state.week;
 const starters=ids.map(x=>all.find(p=>p.id===x)).filter(allowed);
 const reserves=all.filter(p=>allowed(p)&&!ids.includes(p.id));
 if(!isUser){while(starters.length<11&&reserves.length)starters.push(reserves.shift());}
 const mentor=isUser?state.mentors?.find(m=>m.id===state.mentorActive):null;
 const tactical=tactics(isUser?state.tactics:profile?.tactics,mentor);
 return {id,isUser,profile,starters,reserves,tactical,all,formation:isUser?state.formation:(profile?.formation||'4-3-3'),
    name:fixtureName(state,id),yellow:new Map(),sentOff:new Set(),subs:0,injuries:0};
}
function modifier(p){return clamp((p.fitness??90)/95,.55,1.07)*clamp((p.morale??80)/85,.73,1.13);}
function attackStrength(team){const ps=team.starters.filter(p=>!team.sentOff.has(p.id));return ps.length?groupScore(ps,'pas')*.26+groupScore(ps,'sho')*.42+groupScore(ps,'pac')*.21+groupScore(ps,'phy')*.11:45;}
function defendStrength(team){const ps=team.starters.filter(p=>!team.sentOff.has(p.id));return ps.length?groupScore(ps,'def')*.61+groupScore(ps,'phy')*.23+groupScore(ps,'gk')*.16:45;}
export function runMatch(state,fixture,{cup=false,friendly=false}={}){
 const home=makeTeam(state,fixture.home),away=makeTeam(state,fixture.away);
 const seed=hash([state.season,state.week,fixture.id,state.gameNonce||0,fixture.home,fixture.away,state.tactics?.mentality,state.tactics?.pressure,state.tactics?.passing,state.tactics?.tempo,state.tactics?.marking,state.mentorActive||''].join(':'));
 const random=rng(seed);
 const teams=[home,away];
 const events=[],statistics=[{shots:0,onTarget:0,xg:0,passes:0,accurate:0,possession:0,fouls:0,corners:0,saves:0,yellow:0,red:0},{shots:0,onTarget:0,xg:0,passes:0,accurate:0,possession:0,fouls:0,corners:0,saves:0,yellow:0,red:0}];
 let score=[0,0],minute=0,current=0,ball={x:50,y:50},steps=0,halfTimePassed=false;
 const weather=['limpo','chuva','vento','nevoeiro'][Math.floor(random()*4)];
 const weatherPass=weather==='chuva'?.94:weather==='vento'?.96:weather==='nevoeiro'?.92:1;
 const weatherShot=weather==='vento'?.89:weather==='chuva'?.96:1;
 const event=(kind,side,text,extra={})=>{
  // World positions: local home attacks toward the northern goal (y=0).
  // The ball is stored as progress and lateral displacement of current possession.
  const mapX=clamp(current===0?ball.y:100-ball.y,3,97);
  const mapY=clamp(current===0?100-ball.x:ball.x,2,98);
  events.push({minute:Math.min(90,Math.max(1,Math.floor(minute))),kind,
   team:side===-1?-1:teams[side].id,text,x:mapX,y:mapY,...extra});
 };
 const choosing=(team,role)=>selectWeighted(random,team.starters.filter(p=>!team.sentOff.has(p.id)),p=>{
  if(role==='shot')return(p.pos==='ATT'?7:p.pos==='MID'?3:p.pos==='DEF'?.6:.05)*(p.sho/60)*specialist(p,'shot');
  if(role==='pass')return(p.pos==='MID'?4:p.pos==='DEF'?3:p.pos==='ATT'?2:.2)*specialist(p,'pass');
  if(role==='keeper')return p.pos==='GK'?20:1;
  return 1;
 });
 function substitute(team,player,reason){
  const available=team.reserves.filter(p=>(p.injury||0)<=0&&(p.contract??1)>0);
  if(!available.length||team.subs>=5)return;
  const positional=available.filter(p=>p.pos===player.pos),replacement=selectWeighted(random,positional.length?positional:available,p=>rating(p)+1);
  if(!replacement)return;
  const idx=team.starters.findIndex(p=>p.id===player.id);
  if(idx<0)return;
  team.starters[idx]=replacement;team.reserves=team.reserves.filter(p=>p.id!==replacement.id);
  team.subs++;
  event('substitution',team===home?0:1,team.name+': '+replacement.name+' substitui '+player.name+' ('+reason+').');
 }
 function injury(team,side){
  if(random()>.006*team.tactical.fatigue)return;
  const p=choosing(team,'any');if(!p)return;
  const length=1+Math.floor(random()*4);
  if(!friendly)p.injury=Math.max(p.injury||0,length);
  event('injury',side,'Lesão: '+p.name+' ('+length+' semanas).',{player:p.name});
  team.injuries++;substitute(team,p,'lesão');
 }
 function foul(team,other,side){
  if(random()>.064*team.tactical.turnover)return false;
  const p=choosing(team,'any');
  statistics[side].fouls++;
  if(random()<.17&&p){
   const prev=team.yellow.get(p.id)||0;team.yellow.set(p.id,prev+1);
   statistics[side].yellow++;
   event('card',side,'Cartão amarelo: '+p.name,{player:p.name});
   if(prev>=1||random()<.04){
    team.sentOff.add(p.id);statistics[side].red++;
    event('red',side,'Expulsão: '+p.name,{player:p.name});
    if(!friendly&&team.isUser){p.cards=(p.cards||0)+1;p.suspendedUntilWeek=state.week+1;}
   }else if(!friendly&&team.isUser){p.cards=(p.cards||0)+1;if(p.cards%5===0)p.suspendedUntilWeek=state.week+1;}
  } else if(random()<.11) event('foul',side,'Falta de '+team.name+' — livre para '+other.name+'.');
  return true;
 }
 function scored(team,side,shooter,kind,probability,assist=true){
  const shotXg=clamp(probability,.025,.85);
  statistics[side].shots++;statistics[side].onTarget++;
  statistics[side].xg+=shotXg;
  score[side]++;
  event('goal',side,'GOLO! '+team.name+' — '+shooter.name+' ('+kind+').',
   {player:shooter.name,playerId:shooter.id,xg:+shotXg.toFixed(3),source:kind});
  if(!friendly&&team.isUser){
   shooter.goals=(shooter.goals||0)+1;
   if(assist){
    const passer=selectWeighted(random,team.starters.filter(p=>p.id!==shooter.id),p=>p.pas+10);
    if(passer&&random()<.62)passer.assists=(passer.assists||0)+1;
   }
  }
 }
 const strength=(team,other,offense=true)=>{
  const p=offense?attackStrength(team)*team.tactical.attack:defendStrength(team)*team.tactical.defense;
  const x=team.starters.reduce((sum,player)=>sum+modifier(player),0)/Math.max(1,team.starters.length);
  return p*x*(team===home?1.038:1)*(1-Math.max(0,11-team.starters.length)*.07);
 };
 // A posse, passes, duelos e remates nascem desta sequência de decisões; o resultado não é pré-escolhido.
 while(minute<89.6&&steps++<210){
  const attacker=teams[current],defender=teams[1-current],at=statistics[current],de=statistics[1-current];
  const atk=strength(attacker,defender),def=strength(defender,attacker,false);
  const speed=clamp(attacker.tactical.pace,.65,1.5);
  minute+=clamp((.63+random()*.95)/speed,.35,2.1);
  if(minute>=90)break;
  if(!halfTimePassed&&minute>=45){
   halfTimePassed=true;event('half',-1,'Intervalo — '+home.name+' '+score[0]+'–'+score[1]+' '+away.name+'.');
   for(let k=0;k<2;k++){
    const coach=teams[k],rival=!coach.isUser?coach.profile:null;
    if(!rival){
     const plan=state.tactics?.halftimePlan||'auto';
     const behind=score[k]<score[1-k],ahead=score[k]>score[1-k];
     const planMind=plan==='agressivo'?'ofensiva':plan==='proteger'?'defensiva':plan==='auto'?(behind?'ofensiva':ahead?'defensiva':state.tactics.mentality):state.tactics.mentality;
     if(planMind!==state.tactics.mentality){
      coach.tactical=tactics({...state.tactics,mentality:planMind},state.mentors?.find(m=>m.id===state.mentorActive)||null);
      event('tactical',k,'O treinador altera a mentalidade ao intervalo: '+planMind+'.');
     }
     continue;
    }
    const behind=score[k]<score[1-k],ahead=score[k]>score[1-k];
    const newMind=behind?'ofensiva':ahead?'defensiva':rival.tactics.mentality;
    if(newMind!==rival.tactics.mentality&&random()<(rival.manager.adaptability||.5)){
     coach.tactical=tactics({...rival.tactics,mentality:newMind},null);
     event('tactical',k,rival.manager.name+' reajusta a equipa ao intervalo: '+newMind+'.');
    }
   }
  }
  const carrier=choosing(attacker,'pass'),passSkill=carrier?.pas??55;
  if(!carrier){current=1-current;continue;}
  at.possession++;at.passes++;
  const pressure=defender.tactical.turnover,passChance=clamp(.67+(passSkill-60)*.003+(atk-def)*.0016+(attacker.tactical.success*weatherPass-1)*.38-(pressure-1)*.13,.40,.93);
  if(random()>passChance){
   if(random()<.28){
    // An imprecise pass can cross the touchline: restart from that touchline.
    ball.y=random()<.5?3:97;
    event('throwin',1-current,'Lançamento lateral para '+defender.name+'.',
     {player:choosing(defender,'pass')?.name||null});
   }else event('interception',1-current,'Recuperação de bola de '+defender.name+'.');
   current=1-current;ball.x=100-ball.x;ball.y=100-ball.y;continue;
  }
  at.accurate++;
  const progress=(8+random()*15)*attacker.tactical.progress;
  ball.x=clamp((current===0?ball.x:100-ball.x)+progress,13,96);
  if(current===1)ball.x=100-ball.x;
  ball.y=clamp(ball.y+(random()-.5)*29,8,92);
  // Every successful sequence produces a spatial ball movement — not a random dot wobble.
  const receiver=choosing(attacker,ball.x>65?'shot':'pass');
  event('pass',current,'Passe de '+carrier.name+(receiver?' para '+receiver.name:'')+'.',
   {player:carrier.name,playerId:carrier.id,receiver:receiver?.name||null,
    receiverId:receiver?.id??null,passType:attacker.tactical.progress>1.1?'longo':'curto'});
  if(foul(defender,attacker,1-current)){
   const relative=ball.x;
   const taker=choosing(attacker,'shot')||carrier;
   if(relative>80&&random()<.17&&taker){
    // Foul in the area. The shot comes from the penalty mark.
    ball.x=88;ball.y=50;
    event('penalty',current,'Grande penalidade para '+attacker.name+'. '+taker.name+' prepara o remate.',
     {player:taker.name,playerId:taker.id});
    const keeper=choosing(defender,'keeper');
    const chance=clamp(.73+(taker.sho-60)*.002-(keeper?.gk||55)*.0006,.52,.86);
    if(random()<chance)scored(attacker,current,taker,'grande penalidade',.76,false);
    else{
     at.shots++;at.onTarget++;at.xg+=.76;de.saves++;
     event('save',1-current,'Defesa do guarda-redes no penálti de '+taker.name+'.',{player:taker.name});
    }
   }else if(random()<.56){
    ball.x=clamp(ball.x,65,85);
    event('freekick',current,'Livre para '+attacker.name+' — '+taker.name+' na bola.',
     {player:taker.name,playerId:taker.id});
    const freeShotChance=clamp(.09+(taker.sho-55)*.002+(attacker.tactical.attack-1)*.06,.05,.24);
    if(random()<freeShotChance){
     scored(attacker,current,taker,'livre direto',.11,false);
    }else if(random()<.55){
     at.shots++;at.xg+=.07;
     event('chance',current,'Livre de '+taker.name+' passa perto da baliza.',{player:taker.name});
    }
   }
   continue;
  }
  injury(attacker,current);injury(defender,1-current);
  const relativeX=current===0?ball.x:100-ball.x;
  const finishing=clamp(.04+(relativeX-35)*.0054+(atk-def)*.0018+(attacker.tactical.attack-1)*.12,.035,.42);
  if(relativeX>48&&random()<finishing){
   const shooter=choosing(attacker,'shot')||carrier,keeper=choosing(defender,'keeper');
   const effort=clamp((relativeX-35)/70,.16,.95);
   const shotSkill=(shooter?.sho??55)/70*specialist(shooter,'shot');
   const keeperSkill=(keeper?.gk??52)/75*specialist(keeper||{classLevel:1},'defense');
   const xg=clamp((.055+effort*.35)*shotSkill*(1-keeperSkill*.24)*attacker.tactical.attack*weatherShot,.025,.66);
   at.shots++;at.xg+=xg;
   const onTargetChance=clamp(.38+(shooter?.sho??60)*.003-(def/100)*.10,.35,.79);
   if(random()<onTargetChance){
    at.onTarget++;
    if(random()<clamp(xg/onTargetChance,.06,.84)){
     score[current]++;event('goal',current,'GOLO! '+attacker.name+' — '+shooter.name+'.',{player:shooter.name,xg:+xg.toFixed(3)});
     if(!friendly&&attacker.isUser){
      shooter.goals=(shooter.goals||0)+1;
      const assister=selectWeighted(random,attacker.starters.filter(p=>p.id!==shooter.id),p=>p.pas+10);
      if(assister&&random()<.69)assister.assists=(assister.assists||0)+1;
     }
    }else{de.saves++;event('save',1-current,'Grande defesa de '+defender.name+' a remate de '+shooter.name+'.',{player:shooter.name,xg:+xg.toFixed(3)});}
   }else if(random()<.34){
    at.corners++;
    // Stationary corner first, then a header from the attacking line.
    ball.x=97;ball.y=random()<.5?3:97;
    const kicker=choosing(attacker,'pass')||carrier,header=choosing(attacker,'shot')||carrier;
    event('corner',current,'Canto para '+attacker.name+'. '+kicker.name+' prepara o cruzamento.',
     {player:kicker.name,playerId:kicker.id,receiver:header.name});
    if(random()<clamp(.10+(header.sho-65)*.002,.05,.20)){
     ball.x=91;ball.y=45+random()*10;
     scored(attacker,current,header,'cabeceamento após canto',.16,true);
    }else if(random()<.5){
     ball.x=85;ball.y=35+random()*30;
     at.shots++;at.xg+=.09;
     event('chance',current,'Cruzamento do canto e cabeceamento de '+header.name+'.',{player:header.name});
    }
   }
   else if(random()<.20)event('chance',current,'Remate para fora de '+shooter.name+'.',{player:shooter.name,xg:+xg.toFixed(3)});
   current=1-current;ball={x:50,y:50};
  }else if(relativeX>72&&random()<.18){current=1-current;ball.x=100-ball.x;ball.y=100-ball.y;}
  else if(relativeX>79){current=1-current;ball.x=100-ball.x;}
  else if(random()<.12){current=1-current;ball.x=100-ball.x;}
 }
 minute=90;
 const stats1=statistics[0],stats2=statistics[1],poss=stats1.possession+stats2.possession;
 let penaltyWinner=null,shootout=null;
 if(cup&&score[0]===score[1]){
  const roll=random()+clamp((strength(home,away)-strength(away,home))*.008,-.20,.20);
  penaltyWinner=roll<.5?away.id:home.id;
  shootout={home:penaltyWinner===home.id?5:4,away:penaltyWinner===away.id?5:4};
  event('penalties',penaltyWinner===home.id?0:1,'Decisão nos penáltis: '+fixtureName(state,penaltyWinner)+' vence '+shootout.home+'–'+shootout.away+'.');
 }
 event('end',-1,'Apito final: '+home.name+' '+score[0]+'–'+score[1]+' '+away.name+'.');
 if(!friendly){
  for(const team of teams){
   for(const p of team.starters.concat(team.reserves.filter(p=>p._used))){
    if(team.isUser){
     p.apps=(p.apps||0)+1;
     const fatigue=Math.ceil((11+random()*8)*team.tactical.fatigue);
     p.fitness=clamp(p.fitness-fatigue,4,100);
     const ownGoals=team===home?score[0]:score[1],otherGoals=team===home?score[1]:score[0];
     p.morale=clamp(p.morale+(ownGoals>otherGoals?4:ownGoals<otherGoals?-4:1),5,100);
     if(p.pos==='GK'&&otherGoals===0)p.cleanSheets=(p.cleanSheets||0)+1;
     if(!Number.isFinite(p.xp))p.xp=0;p.xp+=(ownGoals>otherGoals?12:7);
    }
   }
  }
 }
 const allEvents=events.sort((a,b)=>a.minute-b.minute||(a.kind==='end'?1:-1));
 return {home:home.id,away:away.id,homeName:home.name,awayName:away.name,hg:score[0],ag:score[1],
  events:allEvents,stats:{possession:poss?clamp(Math.round(stats1.possession/poss*100),1,99):50,
   shotsHome:stats1.shots,shotsAway:stats2.shots,onTargetHome:stats1.onTarget,onTargetAway:stats2.onTarget,
   xgHome:stats1.xg.toFixed(2),xgAway:stats2.xg.toFixed(2),passesHome:stats1.passes,passesAway:stats2.passes,
   accurateHome:stats1.accurate,accurateAway:stats2.accurate,completedPasses:stats1.accurate+stats2.accurate,
   foulsHome:stats1.fouls,foulsAway:stats2.fouls,cornersHome:stats1.corners,cornersAway:stats2.corners,
   savesHome:stats1.saves,savesAway:stats2.saves,yellowHome:stats1.yellow,yellowAway:stats2.yellow,
   redHome:stats1.red,redAway:stats2.red},
   penaltyWinner,shootout,weather,homeTactics:home.tactical,awayTactics:away.tactical,involved:home.isUser||away.isUser,cup,friendly,engine:'events-v4'};
}
export const tacticalModifiers=tactics;
