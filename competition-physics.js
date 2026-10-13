// Unified deterministic spatial football engine for scheduled league, cup and
// friendly fixtures. Every score, goal and statistic is obtained from the same
// 105 × 68 metre world used by the live Android broadcast.
import {hash,fixtureName} from './model.js';
import {spatialTeams} from './pitch-spatial.js';
import {createWorld,stepWorld,halfTimeWorld,secondHalfWorld,extraTimeStartWorld,
 finalWorld,worldResult,STEPS_PER_MINUTE} from './physics-engine.js';
import {resolvePenalties} from './cup-resolution.js';

const randomFor=w=>((w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0)/4294967296);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const seedId=(state,fixture,cup,friendly)=>[state.club.name,state.season,state.week,
 fixture.id,fixture.home,fixture.away,state.gameNonce||0,cup?1:0,friendly?1:0,
 state.tactics?.pressure,state.tactics?.mentality,state.tactics?.passing].join(':');

// Advance other league games one fixed physics step for each watched-match step.
// Saves contain these worlds, so Android resume and deterministic tests do not
// need to re-simulate seven fixtures at the final whistle.
export function createLeagueFixtureJob(state,fixture){
 const session={id:seedId(state,fixture,false,false),
  spatial:{teams:spatialTeams(state,fixture)},
  result:{home:fixture.home,away:fixture.away,
   homeName:fixtureName(state,fixture.home),awayName:fixtureName(state,fixture.away)}};
 return {fixtureId:fixture.id,world:createWorld(session),minute:0,substep:0,complete:false};
}
export function tickLeagueFixtureJob(job){
 if(job.complete)return job;
 const w=job.world;
 if(w.phase!=='final'){
  w.minute=job.minute+job.substep/STEPS_PER_MINUTE;
  stepWorld(w);
 }
 job.substep++;
 if(job.substep>=STEPS_PER_MINUTE||w.phase==='final'){
  job.substep=0;job.minute++;
  if(job.minute===45&&w.phase!=='final'){
   w.minute=45;halfTimeWorld(w);secondHalfWorld(w);
  }
  if(job.minute>=90||w.phase==='final'){
   if(w.phase!=='final'){w.minute=90;finalWorld(w);}
   job.complete=true;
   job.result={...worldResult(w),engine:'physics-v2',physicsRevision:8,
    involved:false,cup:false,friendly:false};
   delete job.world; // compact the persisted career snapshot after completion
  }
 }
 return job;
}
export function resolvePhysicalCupShootout(w){
 if(w.score[0]!==w.score[1])throw Error('Só é permitida série de penáltis após empate.');
 w.minute=120;
 const teams=w.teams.map((team,side)=>({
  id:team.id,name:team.name,sentOff:new Set(),
  starters:w.players.filter(p=>p.side===side&&p.active!==false)
   .map(p=>({...p,id:p.sourceId??p.id}))
 }));
 const penalty=resolvePenalties({teams,random:()=>randomFor(w),clamp,
  at:()=>{w.minute=120;},
  emit:(kind,side,text,extra={})=>w.events.push({
   kind,minute:120,clock:120,team:side===-1?-1:w.teams[side].id,text,
   x:50,y:50,...extra
  })});
 return penalty;

}

export function runCompetitionFixture(state,fixture,{cup=false,friendly=false}={}){
 if(!fixture||!Number.isInteger(fixture.home)||!Number.isInteger(fixture.away))
  throw Error('Partida da competição inválida.');
 const id=seedId(state,fixture,cup,friendly);
 const session={id,spatial:{teams:spatialTeams(state,fixture)},
  result:{home:fixture.home,away:fixture.away,
   homeName:fixtureName(state,fixture.home),awayName:fixtureName(state,fixture.away)}};
 if(!session.spatial.teams.every(t=>t.players.length===11))
  throw Error('Onze inicial incompleto.');
 const w=createWorld(session);
 w.competitionCup=!!cup;
 const simulate=(first,last)=>{
  for(let minute=first;minute<last&&w.phase!=='final';minute++){
   for(let sub=0;sub<STEPS_PER_MINUTE&&w.phase!=='final';sub++){
    w.minute=minute+sub/STEPS_PER_MINUTE;
    stepWorld(w);
   }
  }
 };
 simulate(0,45);
 if(w.phase!=='final'){w.minute=45;halfTimeWorld(w);secondHalfWorld(w);}
 simulate(45,90);
 let shootout=null,penaltyWinner=null,extraTime=null;
 if(cup&&w.phase!=='final'&&w.score[0]===w.score[1]){
  const before=w.score.slice();
  extraTime={played:true,periods:[{start:90,end:105},{start:105,end:120}],goals:[0,0]};
  w.minute=90;extraTimeStartWorld(w,3);simulate(90,105);
  if(w.phase!=='final'){w.minute=105;extraTimeStartWorld(w,4);simulate(105,120);}
  extraTime.goals=[w.score[0]-before[0],w.score[1]-before[1]];
  if(w.phase!=='final'&&w.score[0]===w.score[1]){
   const penalty=resolvePhysicalCupShootout(w);
   shootout=penalty.shootout;penaltyWinner=penalty.penaltyWinner;
  }
 }
 if(w.phase!=='final'){
  w.minute=cup&&extraTime?120:90;
  finalWorld(w);
 }
 const result=worldResult(w);
 return {...result,home:fixture.home,away:fixture.away,
  cup:!!cup,friendly:!!friendly,involved:fixture.home===0||fixture.away===0,
  engine:'physics-v2',physicsRevision:8,extraTime,penaltyWinner,shootout,
  fixtureId:fixture.id};
}
