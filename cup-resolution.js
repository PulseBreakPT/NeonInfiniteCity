// A deterministic knockout resolution: two 15-minute periods followed by a real
// best-of-five shootout with early termination and paired sudden death.
export function resolveCupTie({teams,score,statistics,random,clamp,at,emit}){
 const periods=[],initial=score.slice();
 for(const start of [90,105]){
  at(start,0);
  emit('extra',-1,start===90?'Inicia-se o prolongamento.':'Inicia-se a segunda parte do prolongamento.');
  const events=[];
  for(let side=0;side<2;side++){
   const attack=teams[side],defense=teams[1-side],active=attack.starters.filter(p=>!attack.sentOff.has(p.id));
   const defenders=defense.starters.filter(p=>!defense.sentOff.has(p.id));
   const shots=2+Math.floor(random()*3);
   for(let i=0;i<shots;i++){
    const clock=start+1+random()*13.7;
    at(clock,side);
    const striker=active.slice().sort((a,b)=>(b.sho||55)-(a.sho||55))[i%Math.max(1,active.length)];
    if(!striker)continue;
    const quality=(active.reduce((v,p)=>v+(p.sho||50),0)/active.length)-
     (defenders.reduce((v,p)=>v+(p.def||50),0)/Math.max(1,defenders.length));
    const xg=clamp(.12+quality*.002,.04,.24),onTarget=random()<clamp(.45+quality*.003,.25,.66);
    const stat=statistics[side];stat.shots++;stat.xg+=xg;
    if(onTarget)stat.onTarget++;
    emit('shot',side,'Remate de '+striker.name+' no prolongamento.',
     {player:striker.name,playerId:striker.id,xg:+xg.toFixed(3)});
    const goal=onTarget&&random()<xg/clamp(.45+quality*.003,.25,.66);
    if(goal){
     score[side]++;striker.goals=(striker.goals||0)+1;
     emit('goal',side,'GOLO no prolongamento! '+striker.name+'.',{player:striker.name,playerId:striker.id});
    }else if(onTarget){statistics[1-side].saves++;}
    events.push({minute:clock,side,goal});
   }
  }
  periods.push({start,end:start+15,events});
 }
 at(120,0);
 if(score[0]!==score[1])return {penaltyWinner:null,shootout:null,extraTime:{periods,goals:[score[0]-initial[0],score[1]-initial[1]]}};
 const kicks=[0,0],goals=[0,0],details=[];
 const ordered=teams.map(team=>team.starters.filter(p=>!team.sentOff.has(p.id))
  .sort((a,b)=>(b.sho||55)-(a.sho||55)));
 const keepers=teams.map(t=>t.starters.find(p=>p.pos==='GK'&&!t.sentOff.has(p.id)));
 const take=side=>{
  const player=ordered[side][kicks[side]%Math.max(1,ordered[side].length)];
  const probability=clamp(.72+((player?.sho??55)-60)*.003-((keepers[1-side]?.gk??55)-60)*.002,.50,.90);
  const converted=random()<probability;
  kicks[side]++;if(converted)goals[side]++;
  const detail={side,round:kicks[side],playerId:player?.id??null,
   name:player?.name||'Jogador',converted,probability:+probability.toFixed(3)};
  details.push(detail);at(120,side);
  emit('shootout',side,detail.name+(converted?' converte':' falha')+' o penálti.',
   {player:detail.name,playerId:detail.playerId,shootoutRound:detail.round,converted});
 };
 for(let round=0;round<5;round++){
  take(0);
  if(goals[0]>goals[1]+(5-kicks[1])||goals[1]>goals[0]+(5-kicks[0]))break;
  take(1);
  if(goals[0]>goals[1]+(5-kicks[1])||goals[1]>goals[0]+(5-kicks[0]))break;
 }
 for(let sudden=0;goals[0]===goals[1]&&sudden<200;sudden++){take(0);take(1);}
 if(goals[0]===goals[1])throw Error('Shootout exceeded 200 sudden-death pairs without decision.');
 const winner=goals[0]>goals[1]?teams[0].id:teams[1].id;
 emit('penalties',winner===teams[0].id?0:1,
  'Desempate por penáltis: '+teams[winner===teams[0].id?0:1].name+' vence '+goals[0]+'–'+goals[1]+'.');
 return {penaltyWinner:winner,shootout:{home:goals[0],away:goals[1],kicks,details},
  extraTime:{periods,goals:[score[0]-initial[0],score[1]-initial[1]]}};
}
