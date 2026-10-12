// CLUB DYNASTY PHYSICS ENGINE — original implementation.
// 105 × 68 m world; fixed Δt=0.2s. Pure data model: no DOM, timers or canvas.
// The referee, ball, players and tactical managers share one simulation clock.
import {clamp,hash} from './model.js';
import {restartPositions} from './pitch-spatial.js';
import {createWeather,advanceWeather,surfaceGrip,rollingDrag} from './weather-systems.js';
import {restartGoalVerdict,goalkeeperHandlingAllowed,isPenaltyArea,requiredDistance} from './football-rules.js';
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
 return {id:side+':'+index,sourceId:p.id,number:p.number,name:p.name,side,index,pos:p.pos,
   x:p.x/100*FIELD.width,y:p.y/100*FIELD.length,
   vx:0,vy:0,facing:side===0?-Math.PI/2:Math.PI/2,pace:clamp(p.pace||55,25,99),pas:clamp(p.pas||55,20,99),
   sho:clamp(p.sho||55,15,99),def:clamp(p.def||55,15,99),gk:clamp(p.gk||55,15,99),phy:clamp(p.phy||55,15,99),
   stamina:clamp(p.fitness||90,35,100),yellows:0,active:true,control:0,
   pose:'idle',poseUntil:0,stridePhase:0,gait:0,bodyLean:0,injury:0};
}
export function createWorld(session){
 const teams=session.spatial.teams;
 const ps=teams.flatMap((team,side)=>team.players.map((p,i)=>player(p,side,i)));
 const own=ps.filter(p=>p.side===0&&p.pos==='MID'),carrier=own[0]||ps[5];
 const w={
  version:5,half:1,seed:hash(session.id+':physics:v2')>>>0,
  tick:0,minute:0,phase:'kickoff',phaseTime:1.2,
  teams:teams.map((t,i)=>({id:t.id,name:session.result.home===t.id?session.result.homeName:session.result.awayName,
    side:i,formation:t.formation,tactics:t.tactics,anchors:t.players.map(p=>({x:p.x*.68,y:p.y*1.05}))})),
  players:ps,ball:{x:FIELD.width/2,y:FIELD.length/2,vx:0,vy:0,z:.12,vz:0,spin:0,owner:null,lastTouch:0},
  carrier:carrier.id,possessor:0,restart:null,score:[0,0],events:[],injuries:[],
  weather:createWeather(hash(session.id+':climate')),
  bench:teams.map(t=>(t.bench||[]).map(b=>({...b}))),
  substitutions:[[],[]],subWindows:[0,0],pendingSubstitutions:[],
  referee:{advantage:null,handballDecisions:0},
  stats:[0,1].map(()=>({shots:0,onTarget:0,xg:0,passes:0,accurate:0,possession:0,fouls:0,corners:0,saves:0,yellow:0,red:0})),
  actionCooldown:1.3,lastAction:'kickoff'
 };
 return w;
}
function teamPlayers(w,side){return w.players.filter(p=>p.side===side&&p.active!==false);}
export function requestSubstitution(w,team,outId,inId,{automatic=false}={}){
 let side=w.teams.findIndex(t=>t.id===team);
 if(side<0)side=w.teams.findIndex(t=>t.side===team);
 if(side<0)throw Error('Equipa desconhecida.');
 if(w.phase==='final')throw Error('A partida terminou.');
 const outgoing=teamPlayers(w,side).find(p=>String(p.id)===String(outId)||String(p.sourceId)===String(outId));
 const incoming=w.bench?.[side]?.find(p=>String(p.id)===String(inId));
 if(!outgoing||!incoming)throw Error('Jogador de saída ou suplente indisponível.');
 if(w.substitutions[side].length+w.pendingSubstitutions.filter(s=>s.side===side).length>=5)throw Error('Limite de cinco substituições atingido.');
 if(w.pendingSubstitutions.some(s=>s.side===side&&s.outId===outgoing.id)||w.pendingSubstitutions.some(s=>s.side===side&&String(s.inId)===String(inId)))throw Error('Essa substituição já está agendada.');
 if(w.subWindows[side]>=3&&w.phase!=='halftime'&&!automatic)throw Error('Limite de três paragens para substituições atingido.');
 const request={side,outId:outgoing.id,inId:incoming.id,requestedAt:w.tick,automatic};
 w.pendingSubstitutions.push(request);
 if(w.phase==='restart'||w.phase==='halftime')applySubstitutionQueue(w);
 return request;
}
function applySubstitutionQueue(w){
 if(!w.pendingSubstitutions?.length)return;
 const requests=w.pendingSubstitutions.slice();w.pendingSubstitutions=[];
 const usedWindow=new Set();
 for(const q of requests){
  const side=q.side,old=w.players.find(p=>p.side===side&&p.id===q.outId&&!p.replaced);
  const bench=w.bench[side],idx=bench.findIndex(p=>String(p.id)===String(q.inId));
  if(!old||idx<0||w.substitutions[side].length>=5)continue;
  const halftime=w.phase==='halftime',newWindow=!usedWindow.has(side)&&!halftime;
  if(newWindow&&w.subWindows[side]>=3)continue;
  const incoming=bench.splice(idx,1)[0];
  const footballer=player({...incoming,
   x:old.x/FIELD.width*100,y:old.y/FIELD.length*100},side,old.index);
  footballer.id=side+':sub:'+incoming.id;
  footballer.facing=old.facing;
  // A player replaced cannot return; injured and dismissed footballers are not eligible.
  old.active=false;old.replaced=true;old.vx=0;old.vy=0;
  if(w.ball.owner===old.id){w.ball.owner=footballer.id;w.carrier=footballer.id;}
  if(w.restart?.takerId===old.id)w.restart.takerId=footballer.id;
  w.players.push(footballer);
  const exitDistance=Math.min(old.x,FIELD.width-old.x,old.y,FIELD.length-old.y);
  // The 2026/27 ten-second exit limit is estimated using a walking pace.
  const lateExit=!q.automatic&&exitDistance/2.4>10;
  if(lateExit){footballer.active=false;footballer.entryTick=w.tick+STEPS_PER_MINUTE;footballer.pose='idle';}
  if(newWindow){w.subWindows[side]++;usedWindow.add(side);}
  w.substitutions[side].push({side,team:w.teams[side].id,outId:old.sourceId??old.id,inId:incoming.id,at:w.minute,delayed:lateExit});
  event(w,'substitution',old.name+' sai, entra '+incoming.name+'.',w.teams[side].id,
    {player:incoming.name,playerId:incoming.id,out:old.name});
 }
}
function manageBench(w){
 if(!w.bench||!w.substitutions||!w.pendingSubstitutions)return;
 for(let side=0;side<2;side++){
  if(w.substitutions[side].length>=5||w.pendingSubstitutions.some(q=>q.side===side))continue;
  const bench=w.bench[side];if(!bench?.length)continue;
  const all=w.players.filter(p=>p.side===side&&!p.replaced);
  const injured=all.find(p=>p.injury>0&&p.active===false);
  const tacticalAI=w.teams[side].id!==0;
  const tired=tacticalAI&&w.minute>=60&&w.subWindows[side]<3
   ?teamPlayers(w,side).filter(p=>p.pos!=='GK'&&p.stamina<77).sort((a,b)=>a.stamina-b.stamina)[0]
   :null;
  const exiting=injured||tired;
  if(!exiting)continue;
  const substitute=bench.find(p=>p.pos===exiting.pos)||bench.find(p=>p.pos!=='GK');
  if(!substitute)continue;
  w.pendingSubstitutions.push({side,outId:exiting.id,inId:substitute.id,requestedAt:w.tick,automatic:true});
 }
}
function updateDelayedEntries(w){
 for(const p of w.players)if(p.entryTick!==undefined&&!p.active&&w.tick>=p.entryTick&&(w.phase==='restart'||w.phase==='halftime')){
  p.active=true;delete p.entryTick;
  event(w,'substitution',p.name+' entra após o período de espera.',w.teams[p.side].id);
 }
}

function findCarrier(w){return w.players.find(p=>p.id===w.carrier)||null;}
function strengths(w,p,tag){return clamp((p[tag]||55)/65,.65,1.5)*clamp(p.stamina/90,.68,1.08);}
function direction(w,side){return (side===0?-1:1)*(w.half===2?-1:1);}
function ownGoal(side,w){return direction(w,side)===-1?FIELD.length:0;}
function attackGoal(side,w){return direction(w,side)===-1?0:FIELD.length;}
function atGoalDistance(p,side,w){return Math.abs(p.y-attackGoal(side,w));}
function steer(p,target,dt,boost=1,grip=1){
 const dx=target.x-p.x,dy=target.y-p.y,d=Math.max(.001,hypot(dx,dy));
 const speed=hypot(p.vx,p.vy);
 const targetSpeed=clamp(3.8+p.pace*.036,4.6,7.4)*boost*(.6+.4*p.stamina/100);
 const desiredSpeed=Math.min(targetSpeed,Math.sqrt(2*7.5*d));
 const desiredAngle=Math.atan2(dy,dx);
 const desiredVx=Math.cos(desiredAngle)*desiredSpeed,desiredVy=Math.sin(desiredAngle)*desiredSpeed;
 // Bounded thrust/braking: inertia remains even when the target reverses.
 const ax=desiredVx-p.vx,ay=desiredVy-p.vy,a=hypot(ax,ay);
 const braking=(desiredVx*p.vx+desiredVy*p.vy)<0;
 const maxChange=(braking?7.8:5.3)*dt*grip;
 const fraction=a>maxChange?maxChange/a:1;
 p.vx+=ax*fraction;p.vy+=ay*fraction;
 const actualAngle=Math.atan2(p.vy,p.vx);
 p.stridePhase=(p.stridePhase||0)+hypot(p.vx,p.vy)*dt*2.2;
 p.gait=clamp(hypot(p.vx,p.vy)/7,0,1);
 p.bodyLean=clamp((p.bodyLean||0)*.7+Math.sin(actualAngle-(p.facing||actualAngle))*.12,-.3,.3);
 if(p.poseUntil<=0)p.pose=p.gait>.65?'sprint':p.gait>.12?'run':'idle';
 if(speed>.08||hypot(p.vx,p.vy)>.08){
  let turn=(actualAngle-(p.facing??actualAngle)+Math.PI*3)%(Math.PI*2)-Math.PI;
  p.facing=(p.facing??actualAngle)+clamp(turn,-dt*4.1*grip,dt*4.1*grip);
 }
 p.x+=p.vx*dt;p.y+=p.vy*dt;
 if(p.x<.2||p.x>FIELD.width-.2)p.vx=0;
 if(p.y<.2||p.y>FIELD.length-.2)p.vy=0;
 clampPos(p);
}
function inflictInjury(w,p,reason,impact=5){
 if(!p||p.active===false||p.injury>0)return;
 const weeks=clamp(Math.round(1+(impact-4)*.45+rand(w)*2),1,7);
 p.injury=weeks;p.active=false;p.pose='injured';p.poseUntil=Infinity;p.injuryTick=w.tick;
 p.vx=0;p.vy=0;
 if(w.ball.owner===p.id){w.ball.owner=null;w.carrier=null;}
 w.injuries??=[];w.injuries.push({playerId:p.sourceId??p.id,team:w.teams[p.side].id,
  name:p.name,weeks,reason,minute:w.minute});
 event(w,'injury',p.name+' sai lesionado ('+reason+', '+weeks+' sem.).',w.teams[p.side].id,
  {player:p.name,playerId:p.sourceId??p.id,weeks});
}
function physicalContacts(w){
 // Body collision capsules prevent overlapping footballers in a live match.
 const ps=w.players;
 for(let i=0;i<ps.length;i++){
  const a=ps[i];if(a.active===false)continue;
  for(let j=i+1;j<ps.length;j++){
   const b=ps[j];if(b.active===false)continue;
   const dx=b.x-a.x,dy=b.y-a.y,ds=dx*dx+dy*dy;
   if(ds>=.64)continue;
   const d=Math.sqrt(ds),overlap=(.8-d)*.5;
   const nx=d>1e-6?dx/d:((i+j)%2?1:-1),ny=d>1e-6?dy/d:0;
   a.x-=nx*overlap;a.y-=ny*overlap;
   b.x+=nx*overlap;b.y+=ny*overlap;
   // Dampen velocity pointing into the other body.
   const approaching=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
   if(approaching>0){
    a.vx-=approaching*nx*.38;a.vy-=approaching*ny*.38;
    b.vx+=approaching*nx*.38;b.vy+=approaching*ny*.38;
    const hazard=clamp((1-surfaceGrip(w.weather))*1.4,0,.55);
    if(a.side!==b.side&&approaching>3.3&&rand(w)<(.00023+hazard*.0008)*approaching){
     inflictInjury(w,rand(w)<.5?a:b,'choque',approaching);
    }
   }
   clampPos(a);clampPos(b);
  }
 }
}
function minimumPlayers(w){
 if(w.phase==='final'||w.phase==='halftime'||w.phase==='kickoff')return false;
 for(let side=0;side<2;side++){
  const n=teamPlayers(w,side).length;
  if(n>=7)continue;
  if(w.players.some(p=>p.side===side&&p.entryTick!==undefined))continue;
  w.forfeit={team:w.teams[side].id,reason:'Menos de sete jogadores em campo'};
  const winner=1-side;
  w.score[winner]=Math.max(3,w.score[winner]);w.score[side]=0;
  w.phase='final';w.restart=null;w.ball.owner=null;w.carrier=null;
  event(w,'forfeit',w.teams[side].name+' perde por falta do número mínimo de jogadores.',w.teams[winner].id);
  event(w,'end','Partida interrompida e encerrada: falta de jogadores.',-1);
  return true;
 }
 return false;
}
function bookPlayer(w,p,kind='yellow'){
 if(!p||p.active===false)return;
 if(kind==='red'||(p.yellows=(p.yellows||0)+1)>=2){
  p.active=false;
  w.stats[p.side].red++;
  event(w,'card','Cartão vermelho para '+p.name+'.',w.teams[p.side].id,{player:p.name,playerId:p.sourceId??p.id,color:'red'});
  if(w.ball.owner===p.id){w.ball.owner=null;w.carrier=null;}
  minimumPlayers(w);
 }else{
  w.stats[p.side].yellow++;
  event(w,'card','Cartão amarelo para '+p.name+'.',w.teams[p.side].id,{player:p.name,playerId:p.sourceId??p.id,color:'yellow'});
 }
}

function targetFor(w,p){
 const b=w.ball,side=p.side,t=w.teams[side].tactics;
 const attacker=w.possessor===side,dir=direction(w,side);
 const mind=t.mentality==='ofensiva'?8:t.mentality==='defensiva'?-7:0;
 const press=t.pressure==='alta'?1.4:t.pressure==='baixa'?.65:1;
 const baseX=(p.index<11? w.teams[side].anchors?.[p.index]?.x :null)??p.x;
 const baseY=(p.index<11? w.teams[side].anchors?.[p.index]?.y :null)??p.y;
 if(p.pos==='GK'){
  const threatening=w.possessor!==side && Math.abs(b.y-ownGoal(side,w))<35;
  const projectedX=b.shot?.team===1-side
   ?clamp(b.x+b.vx*Math.min(.36,Math.abs(b.y-ownGoal(side,w))/Math.max(12,Math.abs(b.vy))),29,39)
   :FIELD.width/2+(b.x-FIELD.width/2)*(threatening?.31:.16);
  return {x:clamp(projectedX,28,40),
   y:clamp(ownGoal(side,w)+dir*(threatening?2.7:4.2),1.4,103.6)};
 }
 const carrier=findCarrier(w);
 if(w.ball.owner===null&&w.phase==='open'&&w.ball.z<1.9){
  const chasers=teamPlayers(w,side).filter(q=>q.pos!=='GK').sort((a,c)=>dist(a,b)-dist(c,b));
  if(chasers[0]?.id===p.id && dist(p,b)<25){
   return {x:clamp(b.x+b.vx*.16,1,67),y:clamp(b.y+b.vy*.16,1,104)};
  }
 }
 if(carrier===p&&w.ball.owner!==null){
  return {x:clamp(p.x+(b.x-p.x)*.2+Math.sin(w.tick*.032+p.index+p.side*11)*.72,4,64),
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
 const side=passer.side,forward=direction(w,side),defenders=teamPlayers(w,1-side).map(p=>p.y).sort((a,b)=>forward===-1?a-b:b-a);
 if(defenders.length<2)return false;
 const line=defenders[1];
 return forward===-1?target.y<Math.min(line,FIELD.length/2,w.ball.y)-.3:
 target.y>Math.max(line,FIELD.length/2,w.ball.y)+.3;
}
function kick(w,p,target,power=15,height=0){
 const d=Math.max(.1,dist(p,target));
 w.ball.owner=null;w.carrier=null;
 w.ball.x=p.x;w.ball.y=p.y;
 w.ball.vx=(target.x-p.x)/d*power;
 w.ball.vy=(target.y-p.y)/d*power;
 w.ball.z=.12;w.ball.vz=height;
 w.ball.spin=(rand(w)-.5)*4*(p.pas/75);
 w.ball.lastTouch=p.side;delete w.ball.intended;delete w.ball.pendingOffside;
 delete w.ball.restartKind;delete w.ball.restartSide;delete w.ball.restartTouched;
 delete w.ball.fromThrowin;delete w.ball.deliberateBackpass;delete w.ball.restartKicker;delete w.ball.keeperHeld;
 p.pose='kick';p.poseUntil=.6;
}
function restart(w,kind,team,where,reason=''){
 // Penalties are always taken from the regulation 11 m mark.
 if(kind==='penalty')where={x:FIELD.width/2,y:attackGoal(team,w)===0?11:FIELD.length-11};
 w.phase='restart';w.phaseTime=2.5;
 const available=teamPlayers(w,team).filter(p=>p.pos!=='GK')
   .sort((a,b)=>Math.hypot(a.x-where.x,a.y-where.y)-Math.hypot(b.x-where.x,b.y-where.y));
 const taker=kind==='goalkick'
  ?teamPlayers(w,team).find(p=>p.pos==='GK')||available[0]
  :kind==='penalty'
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
 manageBench(w);applySubstitutionQueue(w);updateDelayedEntries(w);
}
function playerNear(w,side,where,includeKeeper=false){
 return teamPlayers(w,side).filter(p=>includeKeeper||p.pos!=='GK')
 .sort((a,b)=>dist(a,where)-dist(b,where))[0];
}
function choosePass(w,p){
 const t=w.teams[p.side].tactics,dir=direction(w,p.side);
 const candidates=teamPlayers(w,p.side).filter(q=>q.id!==p.id&&(q.pos!=='GK'||t.passing==='curto'))
 .map(q=>{
  const d=dist(p,q);
  if(d<5||d>55)return {q,score:-999,d};
  const forward=(q.y-p.y)*dir,pace=t.passing==='longo'?25:13;
  const intercepted=teamPlayers(w,1-p.side).some(enemy=>dist(enemy,q)<3.5);
  const danger=offside(w,p,q)?14:0;
  const score=forward*.42+12*Math.exp(-Math.abs(d-pace)/12)+q.pas/20-d*.035-
   (intercepted?15:0)-danger-(q.pos==='GK'?12:0)+(rand(w)-.5)*8;
  return {q,score,d};
 }).sort((a,b)=>b.score-a.score);
 return candidates[0]?.score>-80?candidates[0].q:null;
}
function shoot(w,p){
 const side=p.side,goalY=attackGoal(side,w),target={x:34+(rand(w)-.5)*8,y:goalY};
 const d=dist(p,target),quality=strengths(w,p,'sho');
 w.stats[side].shots++;
 const xg=clamp(.045+.4*Math.exp(-d/14)*quality,.025,.62);
 w.stats[side].xg+=xg;
 // The shot is a physical kick; crossing the goal line determines the goal.
 const pressure=teamPlayers(w,1-side).filter(q=>q.pos!=='GK'&&dist(q,p)<4.5).length;
 const error=(rand(w)-.5)*clamp(d*1.06,6,36)*(1+pressure*.22)/quality;
 target.x+=error;
 kick(w,p,target,clamp(23+d*.15,21,31),.6+rand(w)*1.2);
 p.pose='shot';p.poseUntil=.8;
 w.ball.shot={team:side,playerId:p.id,xg,onTarget:target.x>=FIELD.goalLeft&&target.x<=FIELD.goalRight};
 if(w.ball.shot.onTarget)w.stats[side].onTarget++;
 event(w,'shot','Remate de '+p.name+'.',w.teams[side].id,{player:p.name,playerId:p.sourceId,xg:+xg.toFixed(3)});
 w.actionCooldown=.65;
}
function executeAction(w,p){
 const t=w.teams[p.side].tactics,goalDistance=atGoalDistance(p,p.side,w),defenders=teamPlayers(w,1-p.side);
 const close=defenders.filter(d=>d.pos!=='GK'&&dist(p,d)<5).length;
 if(goalDistance<32 && (goalDistance<12||rand(w)<(.21+.035*close))){
  shoot(w,p);return;
 }
 const receiver=choosePass(w,p);
 const passChance=t.passing==='curto'?.79:t.passing==='longo'?.57:.7;
 if(receiver&&rand(w)<passChance){
  const d=dist(p,receiver);
  const flagged=offside(w,p,receiver);
  w.stats[p.side].passes++;
  const precision=clamp(.55+(p.pas-50)*.006-close*.055+(t.passing==='curto'?.08:0),.36,.91);
  const miss=rand(w)>precision;
  const target={x:clamp(receiver.x+(miss?(rand(w)-.5)*18:receiver.vx*.33),1,67),
   y:clamp(receiver.y+(miss?(rand(w)-.5)*16:receiver.vy*.33),1,104)};
  kick(w,p,target,clamp(d*.85,10,28),d>20?.35:.05);
  w.ball.intended={side:p.side,receiverId:receiver.id,passerId:p.id};
  if(receiver.pos==='GK')w.ball.deliberateBackpass=p.side;
  if(flagged)w.ball.pendingOffside={side:p.side,receiverId:receiver.id};
  event(w,'pass',p.name+' passa para '+receiver.name+'.',w.teams[p.side].id,
    {player:p.name,playerId:p.sourceId,receiver:receiver.name,receiverId:receiver.sourceId});
  w.actionCooldown=clamp(t.tempo==='rapido'?.65:t.tempo==='lento'?1.5:1.05,.5,1.7);
  return;
 }
 if(close>0&&rand(w)<.19){
  const opponent=defenders.sort((a,b)=>dist(a,p)-dist(b,p))[0];
  w.stats[1-p.side].fouls++;
  const penalty=isPenaltyArea(p.x,p.y,1-p.side);
  const advantage=!penalty&&goalDistance<28&&rand(w)<.28;
  if(advantage){
   w.referee??={};w.referee.advantage={team:p.side,where:{x:p.x,y:p.y},expires:w.tick+15,penalty:false};
   event(w,'advantage','Lei da vantagem para '+w.teams[p.side].name+'.',w.teams[p.side].id);
  }else restart(w,penalty?'penalty':'freekick',p.side,{x:p.x,y:p.y},'Falta sobre '+p.name);
  if(rand(w)<.006)inflictInjury(w,p,'entrada dura',6+rand(w)*3);
  if(rand(w)<.012)bookPlayer(w,opponent,'red');
  else if(rand(w)<.18)bookPlayer(w,opponent);
  return;
 }
 // Dribble is an actual possession movement, not a camera animation.
 const dir=direction(w,p.side);
 const defendersAhead=defenders.filter(d=>Math.abs(d.x-p.x)<5 && dir*(d.y-p.y)>0);
 if(defendersAhead.length&&rand(w)<.15){
  const d=defendersAhead[0],win=rand(w)<clamp(.24+(d.def-p.pas)*.009,.1,.72);
  if(win){
   w.carrier=d.id;w.possessor=d.side;w.ball.owner=d.id;
   event(w,'interception','Corte de '+d.name+'.',w.teams[d.side].id,{player:d.name,playerId:d.sourceId});
  }
 }
 w.actionCooldown=.8;
}
function aerialContest(w){
 const b=w.ball;
 if(b.owner!==null||b.z<1.55||b.z>2.50||w.phase!=='open')return false;
 const contenders=w.players.filter(p=>p.active!==false&&p.pos!=='GK'&&dist(p,b)<1.12);
 if(!contenders.length)return false;
 contenders.sort((a,c)=>dist(a,b)-dist(c,b));
 const p=contenders[0],height=b.z;
 const jumpReach=1.55+clamp((p.phy||55)/100,0,1)*.92;
 if(height>jumpReach)return false;
 const goalDistance=atGoalDistance(p,p.side,w);
 const shot=goalDistance<20&&(rand(w)<.38);
 const friend=teamPlayers(w,p.side).filter(q=>q.id!==p.id&&q.pos!=='GK')
  .sort((a,c)=>dist(a,p)-dist(c,p))[0];
 const target=shot?{x:34+(rand(w)-.5)*7,y:attackGoal(p.side,w)}
   :friend?{x:friend.x,y:friend.y}:{x:34,y:attackGoal(p.side,w)};
 kick(w,p,target,shot?15:12,shot?1.7:1.2);
 b.z=height;b.vz=shot?1.6:1.2;p.pose='header';p.poseUntil=.85;
 if(shot){
  const xg=clamp(.31*Math.exp(-goalDistance/19),.015,.36);
  w.stats[p.side].shots++;w.stats[p.side].xg+=xg;
  const onTarget=target.x>=FIELD.goalLeft&&target.x<=FIELD.goalRight;
  if(onTarget)w.stats[p.side].onTarget++;
  b.shot={team:p.side,playerId:p.id,xg,onTarget};
 }
 event(w,'header',p.name+(shot?' cabeceia à baliza.':' ganha o duelo aéreo.'),w.teams[p.side].id,
  {player:p.name,playerId:p.sourceId??p.id});
 w.actionCooldown=.6;
 return true;
}
function blockShot(w){
 const b=w.ball;
 if(b.owner!==null||!b.shot||b.z>2.1||w.phase!=='open')return false;
 const opponents=teamPlayers(w,1-b.shot.team).filter(p=>p.pos!=='GK');
 const d=opponents.sort((a,c)=>dist(a,b)-dist(c,b))[0];
 if(!d||dist(d,b)>0.73)return false;
 b.vx=-b.vx*(.25+rand(w)*.25);b.vy=-b.vy*(.4+rand(w)*.3);
 b.vz=1.1+rand(w)*2;b.lastTouch=d.side;b.spin*=-.6;
 delete b.shot;delete b.pendingOffside;delete b.intended;
 w.stats[d.side].blocks=(w.stats[d.side].blocks||0)+1;
 d.pose='block';d.poseUntil=.6;
 event(w,'block','Remate bloqueado por '+d.name+'.',w.teams[d.side].id,
  {player:d.name,playerId:d.sourceId??d.id});
 return true;
}
function controlLooseBall(w){
 let best=null,bestDistance=Infinity;
 for(const p of w.players){
  if(p.active===false)continue;
  const d=dist(p,w.ball);
  const heightLimit=p.pos==='GK'?2.6:1.7;
  if(d<bestDistance&&w.ball.z<heightLimit){best=p;bestDistance=d;}
 }
 if(!best||bestDistance>1.35)return;
 const b=w.ball,pass=b.intended,flag=b.pendingOffside;
 if(best.pos==='GK'&&!goalkeeperHandlingAllowed(best,b)){
  if(rand(w)<.3){
   w.referee??={handballDecisions:0};
   w.referee.handballDecisions++;
   restart(w,'backpass',1-best.side,{x:best.x,y:best.y},'Reposição ilegal ao guarda-redes');
   return;
  }
 }
 // Offside is an offence only upon involvement, never when the pass leaves the foot.
 if(flag&&best.side===flag.side&&best.id===flag.receiverId){
  restart(w,'offside',1-best.side,{x:best.x,y:best.y},'Posição irregular de '+best.name);
  return;
 }
 if(b.restartKicker===best.id&&!b.restartTouched){
  restart(w,'indirect',1-best.side,{x:best.x,y:best.y},'Segundo toque do marcador');
  return;
 }
 b.restartTouched=true;
 if(pass&&best.side===pass.side)w.stats[best.side].accurate++;
 if(pass&&best.side!==pass.side){
  event(w,'interception','Interceção de '+best.name+'.',w.teams[best.side].id,{player:best.name,playerId:best.sourceId});
 }
 if(b.shot&&best.pos==='GK'&&best.side!==b.shot.team){
  best.pose='dive';best.poseUntil=1.1;
  w.stats[best.side].saves++;
  event(w,'save','Defesa de '+best.name+'.',w.teams[best.side].id,{player:best.name,playerId:best.sourceId});
 }
 const wasShot=!!b.shot;
 delete b.shot;delete b.intended;delete b.pendingOffside;delete b.fromThrowin;delete b.deliberateBackpass;
 b.owner=best.id;w.carrier=best.id;w.possessor=best.side;
 b.keeperHeld=best.pos==='GK'&&goalkeeperHandlingAllowed(best,b)&&wasShot;
 w.referee??={};w.referee.keeperHold=0;
 b.vx=0;b.vy=0;b.vz=0;b.z=.12;b.spin=0;
 w.actionCooldown=.45;
}

function ballPhysics(w,dt){
 const b=w.ball;
 if(b.owner!==null){
  const p=w.players.find(q=>q.id===b.owner);
  if(p){b.x=p.x;b.y=p.y+direction(w,p.side)*.85;b.z=.12;b.vx=p.vx;b.vy=p.vy;}
  else b.owner=null;
  return;
 }
 // Horizontal air drag, Magnus curl, bounce and rolling friction in metric units.
 const lastX=b.x,lastY=b.y,lastZ=b.z;
 const spin=Number.isFinite(b.spin)?b.spin:0;
 const wx=w.weather?.windX||0,wy=w.weather?.windY||0;
 if(b.z>.16){
  b.vx+=(wx-b.vx)*.003*dt;b.vy+=(wy-b.vy)*.003*dt;
  const speed=hypot(b.vx,b.vy);
  const magnus=.036*spin*speed;
  const ax=-b.vy/(speed||1)*magnus,ay=b.vx/(speed||1)*magnus;
  b.vx+=ax*dt;b.vy+=ay*dt;
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;
 b.z+=b.vz*dt;b.vz-=9.81*dt;
 if(b.z<.12){
  b.z=.12;if(b.vz<-.65)b.vz=-b.vz*.28;else b.vz=0;
 }
 const drag=b.z>.16?Math.exp(-.085*dt):Math.exp(-rollingDrag(w.weather)*dt);
 b.vx*=drag;b.vy*=drag;b.spin=spin*Math.exp(-.28*dt);
 // Posts and crossbar are physical solid obstacles, not probabilistic misses.
 const goalEnd=b.y<0?0:b.y>FIELD.length?FIELD.length:null;
 if(goalEnd!==null){
  const crossing=lastY===b.y?1:clamp((goalEnd-lastY)/(b.y-lastY),0,1);
  const contactX=lastX+(b.x-lastX)*crossing;
  const contactZ=lastZ+(b.z-lastZ)*crossing;
  const hitPost=contactZ<2.55&&(Math.abs(contactX-FIELD.goalLeft)<.15||Math.abs(contactX-FIELD.goalRight)<.15);
  const hitBar=contactX>FIELD.goalLeft&&contactX<FIELD.goalRight&&Math.abs(contactZ-2.44)<.16;
  if(hitPost||hitBar){
   b.y=goalEnd===0?.16:FIELD.length-.16;b.x=clamp(contactX,0,FIELD.width);
   b.vy=-b.vy*.62;b.vx+=(rand(w)-.5)*1.5;
   if(hitBar)b.vz=-Math.max(1.1,Math.abs(b.vz)*.4);
   delete b.shot;
   event(w,'woodwork',hitBar?'A bola bate na barra!':'A bola bate no poste!',w.teams[b.lastTouch]?.id??-1);
   return;
  }
 }
 if(b.x<0||b.x>FIELD.width){
  const outSide=b.x<0?0:FIELD.width;
  restart(w,'throwin',1-b.lastTouch,{x:outSide,y:clamp(b.y,2,103)});
  return;
 }
 // Anticipation and diving reach follow the actual goalkeeper position.
 // An outstretched dive extends the save envelope; the body never teleports.
 if(b.shot&&!b.shot.attemptedSave&&b.shot.onTarget&&b.y>=0&&b.y<=FIELD.length){
  const attacking=b.shot.team,threat=attackGoal(attacking,w)===0?b.y<14:b.y>91;
  if(threat){
   const goalkeeper=teamPlayers(w,1-attacking).find(p=>p.pos==='GK');
   if(goalkeeper){
    const reach=dist(goalkeeper,b);
    if(reach<3.85&&b.z<2.65){
     b.shot.attemptedSave=true;
     const skill=goalkeeper.gk/100;
     const chance=clamp(.51+skill*.44-reach*.065,.29,.88);
     if(rand(w)<chance){
      w.stats[1-attacking].saves++;
      goalkeeper.pose='dive';goalkeeper.poseUntil=1.1;
      b.lastTouch=1-attacking;
      if(reach<1.45&&rand(w)<.48){
       b.owner=goalkeeper.id;w.carrier=goalkeeper.id;w.possessor=1-attacking;
       b.vx=0;b.vy=0;b.vz=0;b.z=.12;b.spin=0;
      }else{
       // Parry: the ball remains independent and can produce a real corner.
       const outward=b.x<34?-1:1,away=-direction(w,attacking);
       const behind=rand(w)<.43;
       b.vx=outward*(behind?24+rand(w)*8:12+rand(w)*10);
       b.vy=away*(behind?-(14+rand(w)*8):3+rand(w)*6);
       b.vz=behind?2.5+rand(w)*3.5:.6+rand(w)*2.8;
       b.spin=(rand(w)-.5)*3.5;
       w.carrier=null;w.ball.owner=null;w.possessor=1-attacking;
      }
      event(w,'save','Defesa de '+goalkeeper.name+'.',w.teams[1-attacking].id,
        {player:goalkeeper.name,playerId:goalkeeper.sourceId});
      delete b.shot;delete b.intended;delete b.pendingOffside;delete b.fromThrowin;delete b.deliberateBackpass;
      w.actionCooldown=1.4;return;
     }
    }
   }
  }
 }
 if(b.y<0||b.y>FIELD.length){
  const end=b.y<0?0:FIELD.length,attacking=attackGoal(0,w)===end?0:1;
  const legalGoal=b.x>=FIELD.goalLeft&&b.x<=FIELD.goalRight&&b.z<2.44;
  if(legalGoal){
   const verdict=restartGoalVerdict(b.restartKind,b.restartSide,attacking,b.restartTouched);
   if(verdict!=='goal'){
    if(verdict==='corner'){w.stats[1-attacking].corners++;restart(w,'corner',1-attacking,{x:b.x<34?0:68,y:end});}
    else restart(w,'goalkick',1-attacking,{x:34,y:end===0?6:99});
    return;
   }
   w.score[attacking]++;
   const scorer=w.players.find(p=>p.id===w.ball.shot?.playerId);
   event(w,'goal','GOLO! '+w.teams[attacking].name+(scorer?' — '+scorer.name:'' )+'.',
    w.teams[attacking].id,{player:scorer?.name||null,playerId:scorer?.sourceId??scorer?.id??null});
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
 if(!blockShot(w)&&!aerialContest(w))controlLooseBall(w);
}
function restartTargets(w){
 if(!w.restart)return;
 const r=w.restart,kind=r.kind==='offside'?'freekick':r.kind==='goalkick'?'freekick':r.kind==='kickoff'?'freekick':r.kind;
 const normalized=w.teams.map(t=>({
  ...t,side:w.half===2?1-t.side:t.side,players:w.players.filter(p=>p.side===t.side).map(p=>({...p,x:p.x/FIELD.width*100,y:p.y/FIELD.length*100}))
 }));
 const spots=restartPositions(normalized,kind,w.teams[r.team].id,
  {x:r.x/FIELD.width*100,y:r.y/FIELD.length*100},r.takerName);
 const spotMap=new Map(spots.map(p=>[p.side+':'+p.index,p]));
 for(const p of w.players){
  if(p.active===false)continue;
  const spot=spotMap.get(p.side+':'+p.index);
  // The restart is taken from the ball's physical location, not from an
  // approximate tactical diagram a few metres inside the field.
  let target=p.id===r.takerId?{x:r.x,y:r.y}:spot?{x:spot.x*.68,y:spot.y*1.05}:null;
  if(target&&p.side!==r.team&&p.pos!=='GK'){
   const radius=requiredDistance(r.kind),dx=target.x-r.x,dy=target.y-r.y,d=hypot(dx,dy);
   if(radius>0&&d<radius){
    const angle=d>.001?Math.atan2(dy,dx):Math.PI*.35+p.index*.3;
    target={x:clamp(r.x+Math.cos(angle)*(radius+.35),1,67),
      y:clamp(r.y+Math.sin(angle)*(radius+.35),1,104)};
   }
  }
  if(target)steer(p,target,FIXED_DT,.95,surfaceGrip(w.weather));
 }
 physicalContacts(w);
}
function restartKick(w){
 const r=w.restart;if(!r)return;
 const teammates=teamPlayers(w,r.team).filter(p=>p.pos!=='GK'||r.kind==='goalkick');
 const nearest=teammates.find(p=>p.id===r.takerId)||teammates.sort((a,b)=>dist(a,r)-dist(b,r))[0];
 if(!nearest)return;
 // Never teleport the taker: the restart stays frozen until they arrive.
 if(dist(nearest,r)>.85)return;
 nearest.x=clamp(r.x,1,67);nearest.y=clamp(r.y,1,104);
 const kind=r.kind,goal={x:34,y:attackGoal(r.team,w)};
 if(kind==='penalty'){
  const opposingKeeper=teamPlayers(w,1-r.team).find(p=>p.pos==='GK');
  // The goalkeeper must reach the line physically before the taker is allowed.
  if(opposingKeeper&&Math.abs(opposingKeeper.y-goal.y)>.48)return;

  w.stats[r.team].shots++;w.stats[r.team].onTarget++;
  w.stats[r.team].xg+=.76;
  kick(w,nearest,{x:34+(rand(w)-.5)*7,y:goal.y},26,.5);
  w.ball.shot={team:r.team,playerId:nearest.id,xg:.76,onTarget:true};
  event(w,'shot','Grande penalidade batida por '+nearest.name+'.',w.teams[r.team].id,{player:nearest.name,playerId:nearest.sourceId,xg:.76});
 }else if(kind==='corner'||kind==='freekick'){
  const target=kind==='corner'?{x:29+rand(w)*10,y:goal.y-direction(w,r.team)*8}:
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
 w.ball.restartKind=kind;w.ball.restartSide=r.team;w.ball.restartTouched=false;
 w.ball.restartKicker=nearest.id;
 if(kind==='throwin')w.ball.fromThrowin=r.team;
 w.restart=null;w.phase='open';w.phaseTime=0;w.actionCooldown=1.3;
}
export function stepWorld(w,dt=FIXED_DT){
 if(w.phase==='final'||w.phase==='halftime')return w;
 w.tick++;
 w.referee??={advantage:null,keeperHold:0};
 w.weather??=createWeather(hash('old:'+w.seed));
 advanceWeather(w.weather,w.tick,dt);
 for(const p of w.players)if(p.poseUntil>0&&Number.isFinite(p.poseUntil))p.poseUntil=Math.max(0,p.poseUntil-dt);
 if(w.phase==='open'&&w.ball.owner!==null)w.stats[w.possessor].possession+=dt;
 if(w.phase==='open'&&w.ball.owner!==null&&w.ball.keeperHeld){
  const keeper=findCarrier(w);
  if(keeper?.pos==='GK'){
   w.referee.keeperHold=(w.referee.keeperHold||0)+dt;
   if(w.referee.keeperHold>8){
    const opponent=1-keeper.side,goalY=ownGoal(keeper.side,w);
    w.stats[opponent].corners++;
    restart(w,'corner',opponent,{x:w.ball.x<34?0:68,y:goalY},'Guarda-redes excedeu oito segundos');
    w.referee.keeperHold=0;
    return w;
   }
  }
 }else w.referee.keeperHold=0;
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
 if(minimumPlayers(w))return w;
 for(const p of w.players){
  if(p.active===false)continue;
  const target=targetFor(w,p);steer(p,target,dt,1,surfaceGrip(w.weather));
  const effort=clamp(hypot(p.vx,p.vy)/6,0,1.2);
  p.stamina=clamp(p.stamina-dt*(w.teams[p.side].tactics.pressure==='alta'?.029:.011)*(0.6+effort)*(1+Math.max(0,w.weather.temperature-26)*.03),43,100);
  if(w.weather.wetness>.62&&effort>.9&&rand(w)<.000014*w.weather.wetness){
   inflictInjury(w,p,'escorregadela',5+effort*2);
  }
 }
 physicalContacts(w);
 if(w.ball.owner!==null&&carrier&&carrier.active!==false){
  // A foot contact is ahead of the body's centre and follows the runner's stride.
  const stride=Math.sin(w.tick*.83+carrier.index)*.13;
  const forward=direction(w,carrier.side);
  w.ball.x=clamp(carrier.x+Math.cos(carrier.facing)*(.55+stride),.03,67.97);
  w.ball.y=clamp(carrier.y+Math.sin(carrier.facing)*(.55+stride)+forward*.15,.03,104.97);
  w.ball.z=.12;w.ball.vx=carrier.vx;w.ball.vy=carrier.vy;
 }
 else ballPhysics(w,dt);
 if(w.phase!=='open')return w;
 if(w.referee?.advantage){
  const advantage=w.referee.advantage;
  if(w.possessor!==advantage.team&&w.tick<=advantage.expires){
   w.referee.advantage=null;
   restart(w,advantage.penalty?'penalty':'freekick',advantage.team,advantage.where,'Sem vantagem');
   return w;
  }
  if(w.tick>=advantage.expires)w.referee.advantage=null;
 }
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
 manageBench(w);applySubstitutionQueue(w);updateDelayedEntries(w);
 event(w,'half','Intervalo.',-1);
}
export function secondHalfWorld(w){
 if(w.half===2)return w;
 w.half=2;
 for(const team of w.teams)for(const anchor of team.anchors)anchor.y=FIELD.length-anchor.y;
 for(const p of w.players){p.y=FIELD.length-p.y;p.vx=0;p.vy=0;p.facing=-p.facing;clampPos(p);}
 w.phase='kickoff';w.phaseTime=1;w.restart=null;
 const newSide=1;w.possessor=newSide;
 const p=teamPlayers(w,newSide).find(p=>p.pos==='MID')||teamPlayers(w,newSide)[1];
 if(!p){w.phase='final';return w;}
 p.x=34;p.y=52.5;w.carrier=p.id;
 w.ball={x:34,y:52.5,z:.12,vx:0,vy:0,vz:0,spin:0,owner:p.id,lastTouch:newSide};
 event(w,'kickoff','Começa a segunda parte. As equipas trocaram de campo.',w.teams[newSide].id);
 return w;
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
 savesHome:a.saves,savesAway:b.saves,blocksHome:a.blocks||0,blocksAway:b.blocks||0,yellowHome:a.yellow,yellowAway:b.yellow,redHome:a.red,redAway:b.red},
 fatigue:Object.fromEntries(w.players.filter(p=>w.teams[p.side].id===0).map(p=>[p.sourceId??p.id,Math.max(9,Math.round((100-p.stamina)*.55))])),
 discipline:w.players.filter(p=>p.yellows>0||p.active===false).map(p=>({playerId:p.sourceId??p.id,team:w.teams[p.side].id,yellow:p.yellows||0,red:p.active===false})),
 injuries:(w.injuries||[]).slice(),substitutions:(w.substitutions||[[],[]]).flat(),forfeit:w.forfeit||null,engine:'physics-v2',physicsRevision:6,
 weather:w.weather?.condition||'limpo',weatherDetail:{...(w.weather||{})},involved:true,cup:false,friendly:false,
 homeTactics:w.teams[0].tactics,awayTactics:w.teams[1].tactics};
}
