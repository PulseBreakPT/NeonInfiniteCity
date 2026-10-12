import {clamp,hash,nextFixture,rating} from './model.js';
import {eventAtMinute} from './match-live.js';

// Tactical match geometry in percentage-of-pitch coordinates.
// HOME attacks toward y=0; AWAY attacks toward y=100.
const SHAPES={
 '4-3-3':[[50,92],[13,73],[37,76],[63,76],[87,73],[24,55],[50,58],[76,55],[19,30],[50,24],[81,30]],
 '4-4-2':[[50,92],[13,74],[37,76],[63,76],[87,74],[13,53],[38,56],[62,56],[87,53],[36,27],[64,27]],
 '4-2-3-1':[[50,92],[13,74],[37,76],[63,76],[87,74],[35,62],[65,62],[19,43],[50,43],[81,43],[50,23]],
 '3-5-2':[[50,92],[25,76],[50,78],[75,76],[10,55],[31,56],[50,61],[69,56],[90,55],[36,29],[64,29]],
 '5-3-2':[[50,92],[10,74],[29,77],[50,78],[71,77],[90,74],[28,55],[50,60],[72,55],[36,29],[64,29]]
};
const DEFAULT=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','ATT','ATT','ATT'];
const clampPoint=p=>({x:clamp(p.x,3,97),y:clamp(p.y,2,98)});
const interpolate=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const owned=(team,id)=>team.id===id;
function teamProfile(state,id,side){
 const isUser=id===0,rival=state.rivals?.[id];
 const formation=isUser?state.formation:rival?.formation||'4-3-3';
 const all=isUser?state.players:rival?.players||[];
 const ids=isUser?state.lineups[formation]||[]:rival?.lineup||all.slice(0,11).map(p=>p.id);
 const names=ids.map((playerId,i)=>all.find(p=>p.id===playerId)||all[i]||null);
 const formationPositions=SHAPES[formation]||SHAPES['4-3-3'];
 const tactics=isUser?state.tactics:rival?.tactics||{};
 return {id,side,formation,tactics:{
  mentality:tactics?.mentality||'equilibrada',pressure:tactics?.pressure||'media',
  marking:tactics?.marking||'zona',passing:tactics?.passing||'misto',
  tempo:tactics?.tempo||'normal'
 },players:formationPositions.map(([x,y],i)=>({
  id:names[i]?.id??i,name:names[i]?.name||'Jogador '+(i+1),
  number:names[i]?.number??i+1,pos:names[i]?.pos||DEFAULT[i],
  pace:names[i]?.pac||55,def:names[i]?.def||55,pas:names[i]?.pas||55,
  sho:names[i]?.sho||55,gk:names[i]?.gk||55,phy:names[i]?.phy||55,fitness:names[i]?.fitness||90,
  x:side===0?x:100-x,y:side===0?y:100-y
 })),
 bench:all.filter(p=>!ids.includes(p.id)&&!(p.injury>0)&&!(p.contract<=0)&&!(p.suspendedUntilWeek>=state.week)).slice(0,9).map(p=>({
  id:p.id,name:p.name,number:p.number||0,pos:p.pos||'MID',
  pace:p.pac||55,def:p.def||55,pas:p.pas||55,
  sho:p.sho||55,gk:p.gk||55,phy:p.phy||55,fitness:p.fitness||90
 }))};
}
export function spatialTeams(state,fixture=nextFixture(state)){
 if(!fixture)return null;
 return [teamProfile(state,fixture.home,0),teamProfile(state,fixture.away,1)];
}
export function tacticalBase(team,ball={x:50,y:50},attacking=false){
 const pressure={baixa:.20,media:.36,alta:.53}[team.tactics?.pressure]??.36;
 const mentality={defensiva:-7,equilibrada:0,ofensiva:9}[team.tactics?.mentality]??0;
 const direction=team.side===0?-1:1;
 return team.players.map((p,i)=>{
  if(p.pos==='GK'){
   return {...p,x:clamp(p.x+(ball.x-50)*.12,39,61),y:team.side===0?92:8};
  }
  const isDefender=p.pos==='DEF',isForward=p.pos==='ATT';
  const shift=attacking?(isForward?6:isDefender?2:4):-(isForward?1:3);
  const follow=attacking?.30:pressure;
  const y=p.y+direction*(mentality+shift)+(ball.y-p.y)*follow*(isDefender?.45:isForward?.65:.82);
  const x=p.x+(ball.x-p.x)*(attacking?.17:.17+pressure*.19);
  return {...p,x:clamp(x,6,94),y:clamp(y,10,90)};
 });
}
export function restartPositions(teams,kind,teamId,location,takerName=null){
 const own=teams.find(t=>owned(t,teamId))||teams[0],other=teams.find(t=>!owned(t,teamId))||teams[1];
 const goalY=own.side===0?.2:99.8,behind=own.side===0?1:-1;
 const sideX=location.x<50?3:97;
 const atGoal=(dx,dy)=>clampPoint({x:dx,y:goalY+behind*dy});
 let players=[...tacticalBase(own,location,true),...tacticalBase(other,location,false)];
 const ours=players.slice(0,11),theirs=players.slice(11);
 const fallback=kind==='corner'?1:kind==='throwin'?4:9;
 const identified=ours.findIndex(p=>p.name===takerName);
 const takerIndex=identified>=0?identified:fallback;
 // The goalkeepers remain on their goal lines for all restarts.
 const keeperIndex=theirs.findIndex(p=>p.pos==='GK');
 const settleKeeper=()=>{if(keeperIndex>=0)theirs[keeperIndex]={...theirs[keeperIndex],x:50,y:own.side===0?.2:99.8};};
 if(kind==='corner'){
  const near=sideX===3?10:90;
  ours[takerIndex]={...ours[takerIndex],...clampPoint({x:sideX,y:goalY+behind*1})};
  const target=[28,41,53,65,76];
  [8,9,10,5,6,7,4].filter(i=>i!==takerIndex).slice(0,5).forEach((i,j)=>ours[i]={...ours[i],...atGoal(target[j],j%2?11:6)});
  theirs.map((p,i)=>i).filter(i=>i!==keeperIndex).slice(0,6).forEach((i,j)=>theirs[i]={...theirs[i],...atGoal(25+j*9,7+(j%2)*6)});
  ours[4]={...ours[4],x:near,y:goalY+behind*30};
  settleKeeper();
 }else if(kind==='freekick'){
  const ball=clampPoint(location);
  ours[takerIndex]={...ours[takerIndex],x:ball.x,y:ball.y};
  [7,8,10,9,6].filter(i=>i!==takerIndex).slice(0,3).forEach((i,j)=>ours[i]={...ours[i],...atGoal(27+j*23,10)});
  // An actual 3-player defensive wall sits between kicker and target goal.
  const wallY=ball.y+(goalY-ball.y)*.30;
  theirs.map((p,i)=>i).filter(i=>i!==keeperIndex&&theirs[i].pos==='DEF').slice(0,3).forEach((i,j)=>theirs[i]={...theirs[i],x:clamp(ball.x+(j-1)*4,6,94),y:clamp(wallY,8,92)});
  settleKeeper();
 }else if(kind==='penalty'){
  const penaltySpot=atGoal(50,12);
  ours[takerIndex]={...ours[takerIndex],...penaltySpot};
  // Everyone but the taker and goalkeeper stays outside the penalty area.
  for(let i=0;i<11;i++)if(i!==takerIndex&&ours[i].pos!=='GK')ours[i]={...ours[i],...atGoal(20+(i%5)*15,23+(i%2)*3)};
  for(let i=0;i<11;i++)if(i!==keeperIndex)theirs[i]={...theirs[i],...atGoal(21+(i%5)*15,26+(i%2)*3)};
  settleKeeper();
 }else if(kind==='throwin'){
  const boundary=sideX;
  ours[takerIndex]={...ours[takerIndex],x:boundary,y:clamp(location.y,6,94)};
  [5,6,8,7].filter(i=>i!==takerIndex).slice(0,3).forEach((i,j)=>ours[i]={...ours[i],x:boundary===3?14+(j*5):86-(j*5),y:clamp(location.y+(j-1)*9,8,92)});
  [3,4,5].forEach((i,j)=>theirs[i]={...theirs[i],x:boundary===3?22+j*7:78-j*7,y:clamp(location.y+(j-1)*8,7,93)});
 }
 return [...ours,...theirs];
}
export function buildSpatialTimeline(session){
 const teams=session.spatial?.teams;
 if(!teams)return [];
 const scenes=[{time:0,kind:'kickoff',team:teams[0].id,x:50,y:50}];
 const count=new Map();
 for(const e of session.result.events||[]){
  const minute=eventAtMinute(session,e),prev=count.get(minute)||0;
  count.set(minute,prev+1);
  scenes.push({
   time:clamp(minute+prev*.09,0,session.total),kind:e.kind,team:e.team,
   x:Number.isFinite(e.x)?e.x:50,y:Number.isFinite(e.y)?e.y:50,
   player:e.player||null,receiver:e.receiver||null,text:e.text
  });
 }
 return scenes.sort((a,b)=>a.time-b.time);
}
const setPieces=new Set(['corner','freekick','penalty','throwin']);
export function spatialFrame(session,minute,scenes=buildSpatialTimeline(session)){
 const teams=session.spatial?.teams;
 if(!teams||teams.length!==2)return null;
 const t=clamp(minute,0,session.total);
 let cursor=0;
 // Number of actions per match is small enough for binary search at 30 fps.
 let lo=0,hi=scenes.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(scenes[mid].time<=t)lo=mid+1;else hi=mid;}
 cursor=Math.max(0,lo-1);
 const previous=scenes[cursor]||{x:50,y:50,team:teams[0].id,time:0,kind:'kickoff'};
 const following=scenes[Math.min(scenes.length-1,cursor+1)]||previous;
 const delta=Math.max(.08,following.time-previous.time),alpha=clamp((t-previous.time)/delta,0,1);
 const eased=alpha*alpha*(3-2*alpha);
 const carrierTeam=teams.find(v=>v.id===previous.team)||teams[0];
 const ball=clampPoint({
  x:interpolate(previous.x,following.x,eased),
  y:interpolate(previous.y,following.y,eased)-Math.sin(Math.PI*alpha)*(following.kind==='corner'?1.5:0)
 });
 let players;
 if(setPieces.has(previous.kind)&&t-previous.time<Math.min(.95,delta*.73)){
  players=restartPositions(teams,previous.kind,previous.team,previous,previous.player);
 }else{
  players=teams.flatMap(team=>tacticalBase(team,ball,team===carrierTeam));
 }
 const activeTeam=teams.find(v=>v.id===previous.team)||teams[0];
 if(previous.player&&!setPieces.has(previous.kind)){
  const idx=players.findIndex(p=>p.name===previous.player&&activeTeam.players.some(op=>op.name===p.name));
  if(idx>=0)players[idx]={...players[idx],x:clamp(ball.x+(activeTeam.id===0?0:0),4,96),y:clamp(ball.y+3*(activeTeam.side===0?1:-1),4,96)};
 }
 return {time:t,phase:previous.kind,team:activeTeam.id,ball,players,
  setPiece:setPieces.has(previous.kind)?previous.kind:null,
  attackingTeam:activeTeam.id,text:previous.text||''};
}
export function spatialChecksum(frame){
 const data=frame.players.flatMap(p=>[Math.round(p.x),Math.round(p.y)]).join(',')+':'+Math.round(frame.ball.x)+':'+Math.round(frame.ball.y);
 return hash(data);
}
