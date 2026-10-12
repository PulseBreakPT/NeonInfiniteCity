// CLUB DYNASTY PHYSICS ENGINE — original implementation.
// 105 × 68 m world; fixed Δt=0.2s. Pure data model: no DOM, timers or canvas.
// The referee, ball, players and tactical managers share one simulation clock.
import {clamp,hash} from './model.js';
import {restartPositions} from './pitch-spatial.js';
export const FIELD={width:68,length:105,goalLeft:30.34,goalRight:37.66,boxLeft:13.84,boxRight:54.16,boxDepth:16.5};
export const FIXED_DT=.2;
export const STEPS_PER_MINUTE=36;
const hypot=(dx,dy)=>Math.hypot(dx,dy);
const dist=(a,b)=>hypot(a.x-b.x,a.y-b.y);
const rand=w=>((w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0)/4294967296);
const clampPos=(p)=>{p.x=clamp(p.x,.2,FIELD.width-.2);p.y=clamp(p.y,.2,FIELD.length-.2);return p;};
function event(w,kind,text,team=-1,extra={}){
 const elapsed=w.minute;
 const e={minute:Math.min(90,Math.max(1,Math.floor(elapsed))),clock:elapsed,kind,team,text,
   x:clamp(w.ball.x/FIELD.width*100,2,98),y:clamp(w.ball.y/FIELD.length*100,1,99),...extra};
 w.events.push(e);
 return e;
}
function player(p,side,index){
 return {id:p.id,number:p.number,name:p.name,side,index,pos:p.pos,
   x:p.x/100*FIELD.width,y:p.y/100*FIELD.length,
   vx:0,vy:0,facing:side===0?-Math.PI/2:Math.PI/2,pace:clamp(p.pace||55,25,99),pas:clamp(p.pas||55,20,99),
   sho:clamp(p.sho||55,15,99),def:clamp(p.def||55,15,99),gk:clamp(p.gk||55,15,99),stamina:100};
}
export function createWorld(session){
 const teams=session.spatial.teams;
 const ps=teams.flatMap((team,side)=>team.players.map((p,i)=>player(p,side,i)));
 const own=ps.filter(p=>p.side===0&&p.pos==='MID'),carrier=own[0]||ps[5];
 const w={
  version:2,seed:hash(session.id+':physics:v2')>>>0,
  tick:0,minute:0,phase:'kickoff',phaseTime:1.2,
  teams:teams.map((t,i)=>({id:t.id,name:session.result.home===t.id?session.result.homeName:session.result.awayName,
    side:i,formation:t.formation,tactics:t.tactics,anchors:t.players.map(p=>({x:p.x*.68,y:p.y*1.05}))})),
  players:ps,ball:{x:FIELD.width/2,y:FIELD.length/2,vx:0,vy:0,z:0,vz:0,owner:null,lastTouch:0},
  carrier:carrier.id,possessor:0,restart:null,score:[0,0],events:[],
  stats:[0,1].map(()=>({shots:0,onTarget:0,xg:0,passes:0,accurate:0,possession:0,fouls:0,corners:0,saves:0,yellow:0,red:0})),
  actionCooldown:1.3,lastAction:'kickoff'
 };
 return w;
}
function teamPlayers(w,side){return w.players.filter(p=>p.side===side);}
function findCarrier(w){return w.players.find(p=>p.id===w.carrier)||null;}
function strengths(w,p,tag){return clamp((p[tag]||55)/65,.65,1.5)*clamp(p.stamina/90,.68,1.08);}
function ownGoal(side){return side===0?FIELD.length:0;}
function attackGoal(side){return side===0?0:FIELD.length;}
function atGoalDistance(p,side){return Math.abs(p.y-attackGoal(side));}
function steer(p,target,dt,boost=1){
 const dx=target.x-p.x,dy=target.y-p.y;
 const d=Math.max(.001,hypot(dx,dy));
 const maxSpeed=clamp(3.8+p.pace*.036,4.6,7.4)*boost*(.6+.4*p.stamina/100);
 const wanted=d<2?maxSpeed*d/2:maxSpeed;
 const vx=dx/d*wanted,vy=dy/d*wanted;
 // Footwork and torso have inertia. A player cannot rotate 180 degrees
 // between two 0.2-second steps, even if the tactical target changes.
 if(wanted>.12){
  const desired=Math.atan2(vy,vx);
  let turn=(desired-(p.facing??desired)+Math.PI*3)%(Math.PI*2)-Math.PI;
  p.facing=(p.facing??desired)+clamp(turn,-dt*3.6,dt*3.6);
 }
 const smooth=Math.min(1,dt*2.9);
 p.vx+=(vx-p.vx)*smooth;p.vy+=(vy-p.vy)*smooth;
 p.x+=p.vx*dt;p.y+=p.vy*dt;clampPos(p);
}
function targetFor(w,p){
 const b=w.ball,side=p.side,t=w.teams[side].tactics;
 const attacker=w.possessor===side,dir=side===0?-1:1;
 const mind=t.mentality==='ofensiva'?8:t.mentality==='defensiva'?-7:0;
 const press=t.pressure==='alta'?1.4:t.pressure==='baixa'?.65:1;
 const baseX=(p.index<11? w.teams[side].anchors?.[p.index]?.x :null)??p.x;
 const baseY=(p.index<11? w.teams[side].anchors?.[p.index]?.y :null)??p.y;
 if(p.pos==='GK'){
  return {x:clamp(FIELD.width/2+(b.x-FIELD.width/2)*.13,26,42),
   y:clamp(ownGoal(side)+dir*(4+(Math.abs(b.y-ownGoal(side))<25?5:0)),2,103)};
 }
 const carrier=findCarrier(w);
 if(carrier===p&&w.ball.owner!==null){
  return {x:clamp(p.x+(b.x-p.x)*.2+Math.sin(w.tick*.032+p.id)*.72,4,64),
   y:clamp(p.y+dir*(8+(t.tempo==='rapido'?4:0)),7,98)};
 }
 const distanceToBall=dist(p,b);
 const individual=t.marking==='individual'&&!attacker
  ?teamPlayers(w,1-side).filter(q=>q.pos!=='GK').sort((a,c)=>Math.hypot(a.x-baseX,a.y-baseY)-Math.hypot(c.x-baseX,c.y-baseY))[0]
  :null;
 const primary=teamPlayers(w,side).filter(q=>q.pos!=='GK').sort((a,c)=>dist(a,b)-dist(c,b)).slice(0,t.pressure==='alta'?2:1);
 if(!attacker&&primary.some(q=>q.id===p.id)&&distanceToBall<36*press){
  return {x:b.x+Math.sin(w.tick*.03+p.index)*1.3,y:b.y+dir*(p.pos==='DEF'?-1:2)};
 }
 const forward=p.pos==='ATT'?21:p.pos==='MID'?7:-3;
 const tX=(individual?baseX*.55+individual.x*.45:baseX)+(b.x-baseX)*(attacker?.25+.015*(press-1):.13*press)+(attacker&&(p.pos==='ATT'||p.pos==='MID')?Math.sin(w.tick*.012+p.index)*2:0);
 const tY=(individual?baseY*.55+individual.y*.45:baseY)+dir*(mind+(attacker?forward:0))+(b.y-baseY)*(attacker?.14:.09*press);
 return {x:clamp(tX,3,65),y:clamp(tY,7,98)};
}
function offside(w,passer,target){
 const side=passer.side,defenders=teamPlayers(w,1-side).map(p=>p.y).sort((a,b)=>side===0?a-b:b-a);
 if(defenders.length<2)return false;
 const line=defenders[1];
 return side===0?target.y<Math.min(line,FIELD.length/2)-.3&&target.y<passer.y:
 target.y>Math.max(line,FIELD.length/2)+.3&&target.y>passer.y;
}
function kick(w,p,target,power=15,height=0){
 const d=Math.max(.1,dist(p,target));
 w.ball.owner=null;w.carrier=null;
 w.ball.x=p.x;w.ball.y=p.y;
 w.ball.vx=(target.x-p.x)/d*power;
 w.ball.vy=(target.y-p.y)/d*power;
 w.ball.z=.12;w.ball.vz=height;
 w.ball.lastTouch=p.side;
}
function restart(w,kind,team,where,reason=''){
 w.phase='restart';w.phaseTime=2.5;
 const available=teamPlayers(w,team).filter(p=>p.pos!=='GK')
   .sort((a,b)=>Math.hypot(a.x-where.x,a.y-where.y)-Math.hypot(b.x-where.x,b.y-where.y));
 const taker=kind==='penalty'
  ?teamPlayers(w,team).filter(p=>p.pos==='ATT').sort((a,b)=>b.sho-a.sho)[0]||available[0]
  :kind==='freekick'||kind==='corner'
   ?available.slice().sort((a,b)=>b.pas-a.pas)[0]||available[0]
   :available[0];
 w.restart={kind,team,x:clamp(where.x,.1,FIELD.width-.1),y:clamp(where.y,.1,FIELD.length-.1),
   reason,takerId:taker?.id??null,takerName:taker?.name??null,elapsed:0};
 w.carrier=null;w.ball.owner=null;w.ball.vx=0;w.ball.vy=0;w.ball.vz=0;
 w.ball.x=w.restart.x;w.ball.y=w.restart.y;w.ball.z=.12;
 const words={corner:'Canto',throwin:'Lançamento lateral',freekick:'Livre',penalty:'Grande penalidade',goalkick:'Pontapé de baliza',kickoff:'Pontapé de saída',offside:'Fora de jogo'};
 event(w,kind,words[kind]+(reason?' — '+reason:''),w.teams[team].id);
}
function playerNear(w,side,where,includeKeeper=false){
 return teamPlayers(w,side).filter(p=>includeKeeper||p.pos!=='GK')
 .sort((a,b)=>dist(a,where)-dist(b,where))[0];
}
function choosePass(w,p){
 const t=w.teams[p.side].tactics,dir=p.side===0?-1:1;
 const candidates=teamPlayers(w,p.side).filter(q=>q.id!==p.id&&q.pos!=='GK')
 .map(q=>{
  const d=dist(p,q);
  if(d<5||d>55)return {q,score:-999,d};
  const forward=(q.y-p.y)*dir,pace=t.passing==='longo'?25:13;
  const intercepted=teamPlayers(w,1-p.side).some(enemy=>dist(enemy,q)<3.5);
  const danger=offside(w,p,q)?40:0;
  const score=forward*.42+12*Math.exp(-Math.abs(d-pace)/12)+q.pas/20-d*.035-
   (intercepted?15:0)-danger+(rand(w)-.5)*8;
  return {q,score,d};
 }).sort((a,b)=>b.score-a.score);
 return candidates[0]?.score>-80?candidates[0].q:null;
}
function shoot(w,p){
 const side=p.side,goalY=attackGoal(side),target={x:34+(rand(w)-.5)*8,y:goalY};
 const d=dist(p,target),quality=strengths(w,p,'sho');
 w.stats[side].shots++;
 const xg=clamp(.045+.4*Math.exp(-d/14)*quality,.025,.62);
 w.stats[side].xg+=xg;
 // The shot is a physical kick; crossing the goal line determines the goal.
 const error=(rand(w)-.5)*clamp(d*.72,3,26)/quality;
 target.x+=error;
 kick(w,p,target,clamp(23+d*.15,21,31),.6+rand(w)*1.2);
 w.ball.shot={team:side,playerId:p.id,xg,onTarget:target.x>=FIELD.goalLeft&&target.x<=FIELD.goalRight};
 if(w.ball.shot.onTarget)w.stats[side].onTarget++;
 event(w,'shot','Remate de '+p.name+'.',w.teams[side].id,{player:p.name,playerId:p.id,xg:+xg.toFixed(3)});
 w.actionCooldown=.65;
}
function executeAction(w,p){
 const t=w.teams[p.side].tactics,goalDistance=atGoalDistance(p,p.side),defenders=teamPlayers(w,1-p.side);
 const close=defenders.filter(d=>d.pos!=='GK'&&dist(p,d)<5).length;
 if(goalDistance<34 && (goalDistance<18||rand(w)<(.38+.05*close))){
  shoot(w,p);return;
 }
 const receiver=choosePass(w,p);
 const passChance=t.passing==='curto'?.79:t.passing==='longo'?.57:.7;
 if(receiver&&rand(w)<passChance){
  const d=dist(p,receiver);
  if(offside(w,p,receiver)){
   restart(w,'offside',1-p.side,{x:receiver.x,y:receiver.y},'Posição irregular');
   return;
  }
  w.stats[p.side].passes++;
  const precision=clamp(.55+(p.pas-50)*.006-close*.055+(t.passing==='curto'?.08:0),.36,.91);
  const miss=rand(w)>precision;
  const target={x:clamp(receiver.x+(miss?(rand(w)-.5)*18:receiver.vx*.33),1,67),
   y:clamp(receiver.y+(miss?(rand(w)-.5)*16:receiver.vy*.33),1,104)};
  kick(w,p,target,clamp(d*.85,10,28),d>20?.35:.05);
  if(!miss)w.stats[p.side].accurate++;
  event(w,'pass',p.name+' passa para '+receiver.name+'.',w.teams[p.side].id,
    {player:p.name,playerId:p.id,receiver:receiver.name,receiverId:receiver.id});
  w.actionCooldown=clamp(t.tempo==='rapido'?.65:t.tempo==='lento'?1.5:1.05,.5,1.7);
  return;
 }
 if(close>0&&rand(w)<.19){
  const opponent=defenders.sort((a,b)=>dist(a,p)-dist(b,p))[0];
  w.stats[1-p.side].fouls++;
  const penalty=Math.abs(p.y-attackGoal(p.side))<16.5&&Math.abs(p.x-34)<20;
  restart(w,penalty?'penalty':'freekick',p.side,{x:p.x,y:p.y},'Falta sobre '+p.name);
  if(rand(w)<.18){w.stats[1-p.side].yellow++;event(w,'card','Cartão amarelo para '+opponent.name+'.',w.teams[1-p.side].id,{player:opponent.name});}
  return;
 }
 // Dribble is an actual possession movement, not a camera animation.
 const dir=p.side===0?-1:1;
 const defendersAhead=defenders.filter(d=>Math.abs(d.x-p.x)<5 && dir*(d.y-p.y)>0);
 if(defendersAhead.length&&rand(w)<.15){
  const d=defendersAhead[0],win=rand(w)<clamp(.24+(d.def-p.pas)*.009,.1,.72);
  if(win){
   w.carrier=d.id;w.possessor=d.side;w.ball.owner=d.id;
   event(w,'interception','Corte de '+d.name+'.',w.teams[d.side].id,{player:d.name});
  }
 }
 w.actionCooldown=.8;
}
function controlLooseBall(w){
 let best=null,bestDistance=Infinity;
 for(const p of w.players){
  const d=dist(p,w.ball);
  if(d<bestDistance && (w.ball.z<1.6||p.pos==='GK')){best=p;bestDistance=d;}
 }
 if(best&&bestDistance<1.6&&w.ball.z<1.8){
  if(w.ball.shot&&best.pos==='GK'&&best.side!==w.ball.shot.team){
   w.stats[best.side].saves++;
   event(w,'save','Defesa de '+best.name+'.',w.teams[best.side].id,{player:best.name});
   delete w.ball.shot;
  }
  w.ball.owner=best.id;w.carrier=best.id;w.possessor=best.side;
  w.ball.vx=0;w.ball.vy=0;w.ball.vz=0;w.ball.z=.12;
  w.actionCooldown=.45;
 }
}
function ballPhysics(w,dt){
 const b=w.ball;
 if(b.owner!==null){
  const p=w.players.find(q=>q.id===b.owner);
  if(p){b.x=p.x;b.y=p.y+ (p.side===0?-1:1)*.85;b.z=.12;b.vx=p.vx;b.vy=p.vy;}
  else b.owner=null;
  return;
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;
 b.z+=b.vz*dt;b.vz-=9.81*dt;
 if(b.z<.12){b.z=.12;if(b.vz<0)b.vz=-b.vz*.23;}
 const drag=b.z>.15?.993:.96;
 b.vx*=Math.pow(drag,dt*5);b.vy*=Math.pow(drag,dt*5);
 if(b.x<0||b.x>FIELD.width){
  const outSide=b.x<0?0:FIELD.width;
  restart(w,'throwin',1-b.lastTouch,{x:outSide,y:clamp(b.y,2,103)});
  return;
 }
 // Goalkeeper reads the incoming physical shot, moves across the line and
 // attempts a save once, before the ball has crossed the goal plane.
 if(b.shot&&!b.shot.attemptedSave&&b.shot.onTarget&&b.y>=0&&b.y<=FIELD.length){
  const attacking=b.shot.team,threat=attacking===0?b.y<10:b.y>95;
  if(threat){
   b.shot.attemptedSave=true;
   const goalkeeper=teamPlayers(w,1-attacking).find(p=>p.pos==='GK');
   if(goalkeeper && Math.abs(goalkeeper.x-b.x)<9.4&&Math.abs(goalkeeper.y-b.y)<15){
    const chance=clamp(.59+goalkeeper.gk*.0025+(goalkeeper.stamina-75)*.0008,.50,.87);
    if(rand(w)<chance){
     w.stats[1-attacking].saves++;
     b.owner=goalkeeper.id;w.carrier=goalkeeper.id;w.possessor=1-attacking;
     goalkeeper.x=clamp(b.x,1,67);
     b.vx=0;b.vy=0;b.vz=0;b.z=.12;
     event(w,'save','Grande defesa de '+goalkeeper.name+'.',w.teams[1-attacking].id,
       {player:goalkeeper.name,playerId:goalkeeper.id});
     delete b.shot;
     w.actionCooldown=1.4;
     return;
    }
   }
  }
 }
 if(b.y<0||b.y>FIELD.length){
  const end=b.y<0?0:FIELD.length,attacking=end===0?0:1;
  const legalGoal=b.x>=FIELD.goalLeft&&b.x<=FIELD.goalRight&&b.z<2.44;
  if(legalGoal){
   w.score[attacking]++;
   const scorer=w.players.find(p=>p.id===w.ball.shot?.playerId);
   event(w,'goal','GOLO! '+w.teams[attacking].name+(scorer?' — '+scorer.name:'' )+'.',
    w.teams[attacking].id,{player:scorer?.name||null,playerId:scorer?.id||null});
   restart(w,'kickoff',1-attacking,{x:34,y:52.5});
  }else if(b.lastTouch===1-attacking){
   w.stats[attacking].corners++;
   restart(w,'corner',attacking,{x:b.x<FIELD.width/2?0:FIELD.width,y:end});
  }else{
   restart(w,'goalkick',1-attacking,{x:34,y:end===0?6:99});
  }
  delete b.shot;
  return;
 }
 controlLooseBall(w);
}
function restartTargets(w){
 if(!w.restart)return;
 const r=w.restart,kind=r.kind==='offside'?'freekick':r.kind==='goalkick'?'freekick':r.kind==='kickoff'?'freekick':r.kind;
 const normalized=w.teams.map(t=>({
  ...t,players:teamPlayers(w,t.side).map(p=>({...p,x:p.x/FIELD.width*100,y:p.y/FIELD.length*100}))
 }));
 const spots=restartPositions(normalized,kind,w.teams[r.team].id,
  {x:r.x/FIELD.width*100,y:r.y/FIELD.length*100},r.takerName);
 const spotMap=new Map(spots.map(p=>[p.id,p]));
 for(const p of w.players){const spot=spotMap.get(p.id);if(spot)steer(p,{x:spot.x*.68,y:spot.y*1.05},FIXED_DT,.95);}
}
function restartKick(w){
 const r=w.restart;if(!r)return;
 const teammates=teamPlayers(w,r.team).filter(p=>p.pos!=='GK');
 const nearest=teammates.find(p=>p.id===r.takerId)||teammates.sort((a,b)=>dist(a,r)-dist(b,r))[0];
 if(!nearest)return;
 // Never teleport the taker: the restart stays frozen until they arrive.
 if(dist(nearest,r)>1.7)return;
 nearest.x=clamp(r.x,1,67);nearest.y=clamp(r.y,1,104);
 const kind=r.kind,goal={x:34,y:attackGoal(r.team)};
 if(kind==='penalty'){
  w.stats[r.team].shots++;w.stats[r.team].onTarget++;
  w.stats[r.team].xg+=.76;
  kick(w,nearest,{x:34+(rand(w)-.5)*7,y:goal.y},26,.5);
  w.ball.shot={team:r.team,playerId:nearest.id,xg:.76,onTarget:true};
  event(w,'shot','Grande penalidade batida por '+nearest.name+'.',w.teams[r.team].id,{player:nearest.name});
 }else if(kind==='corner'||kind==='freekick'){
  const target=kind==='corner'?{x:29+rand(w)*10,y:goal.y+(r.team===0?8:-8)}:
   {x:34+(rand(w)-.5)*8,y:goal.y};
  w.stats[r.team].passes++;
  kick(w,nearest,target,kind==='corner'?22:24,kind==='corner'?2.8:1.6);
  event(w,'cross',nearest.name+' cobra '+(kind==='corner'?'o canto':'o livre')+'.',w.teams[r.team].id,{player:nearest.name});
 }else{
  const target=teamPlayers(w,r.team).filter(p=>p.id!==nearest.id&&p.pos!=='GK')
   .sort((a,b)=>dist(a,nearest)-dist(b,nearest))[0];
  if(target){kick(w,nearest,target,16,.2);w.stats[r.team].passes++;}
  else{w.carrier=nearest.id;w.ball.owner=nearest.id;}
 }
 w.restart=null;w.phase='open';w.phaseTime=0;w.actionCooldown=1.3;
}
export function stepWorld(w,dt=FIXED_DT){
 if(w.phase==='final'||w.phase==='halftime')return w;
 w.tick++;
 const side=w.possessor;
 w.stats[side].possession+=dt;
 if(w.phase==='kickoff'){w.phaseTime-=dt;if(w.phaseTime<=0){
  const p=findCarrier(w);if(p){w.ball.owner=p.id;w.carrier=p.id;}w.phase='open';
 }return w;}
 if(w.phase==='restart'){
  restartTargets(w);w.phaseTime-=dt;w.restart.elapsed+=dt;
  if(w.phaseTime<=0){
   restartKick(w);
   if(w.phase==='restart'&&w.restart.elapsed>14){
    // Rare formation/pathfinding deadlock: avoid an endless stopped match.
    const taker=w.players.find(p=>p.id===w.restart.takerId);
    if(taker){steer(taker,w.restart,dt,1.9);if(dist(taker,w.restart)<3)restartKick(w);}
   }
  }
  return w;
 }
 const carrier=findCarrier(w);
 for(const p of w.players){
  const target=targetFor(w,p);steer(p,target,dt,1);
  p.stamina=clamp(p.stamina-dt*(w.teams[p.side].tactics.pressure==='alta'?.027:.010),55,100);
 }
 if(w.ball.owner!==null&&carrier){w.ball.x=carrier.x;w.ball.y=carrier.y;w.ball.z=.12;}
 else ballPhysics(w,dt);
 if(w.phase!=='open')return w;
 w.actionCooldown-=dt;
 if(w.ball.owner!==null&&carrier&&w.actionCooldown<=0)executeAction(w,carrier);
 return w;
}
export function stepMatchMinute(session){
 const w=session.world;
 if(!w)throw Error('Motor físico não iniciado.');
 w.previous={
  players:w.players.map(p=>({id:p.id,x:p.x,y:p.y})),
  ball:{x:w.ball.x,y:w.ball.y,z:w.ball.z}
 };
 // Equivalent and deterministic whether driven by wall clock, headless tests or replay.
 for(let i=0;i<STEPS_PER_MINUTE;i++){
  w.minute=session.minute+i/STEPS_PER_MINUTE;
  stepWorld(w);
 }
 w.minute=session.minute+1;
 return w;
}
export function halfTimeWorld(w){
 w.phase='halftime';w.ball.owner=null;w.ball.vx=0;w.ball.vy=0;
 event(w,'half','Intervalo.',-1);
}
export function secondHalfWorld(w){
 w.phase='kickoff';w.phaseTime=1;
 const newSide=1;w.possessor=newSide;
 const p=teamPlayers(w,newSide).filter(p=>p.pos==='MID')[0]||teamPlayers(w,newSide)[1];
 p.x=34;p.y=52.5;w.carrier=p.id;
 w.ball={x:34,y:52.5,z:.12,vx:0,vy:0,vz:0,owner:p.id,lastTouch:newSide};
 event(w,'kickoff','Começa a segunda parte.',w.teams[newSide].id);
}
export function finalWorld(w){
 w.phase='final';w.ball.owner=null;w.ball.vx=0;w.ball.vy=0;
 event(w,'end','Apito final: '+w.teams[0].name+' '+w.score[0]+'–'+w.score[1]+' '+w.teams[1].name+'.',-1);
}
export function worldResult(w){
 const a=w.stats[0],b=w.stats[1],pos=a.possession+b.possession;
 return {home:w.teams[0].id,away:w.teams[1].id,homeName:w.teams[0].name,awayName:w.teams[1].name,
 hg:w.score[0],ag:w.score[1],events:w.events.slice(),
 stats:{possession:pos?Math.round(a.possession/pos*100):50,
 shotsHome:a.shots,shotsAway:b.shots,onTargetHome:a.onTarget,onTargetAway:b.onTarget,
 xgHome:a.xg.toFixed(2),xgAway:b.xg.toFixed(2),passesHome:a.passes,passesAway:b.passes,
 accurateHome:a.accurate,accurateAway:b.accurate,completedPasses:a.accurate+b.accurate,
 foulsHome:a.fouls,foulsAway:b.fouls,cornersHome:a.corners,cornersAway:b.corners,
 savesHome:a.saves,savesAway:b.saves,yellowHome:a.yellow,yellowAway:b.yellow,redHome:a.red,redAway:b.red},
 engine:'physics-v2',weather:'limpo',involved:true,cup:false,friendly:false,
 homeTactics:w.teams[0].tactics,awayTactics:w.teams[1].tactics};
}
