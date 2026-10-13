import {applyRound} from './sim.js';
import {clamp,hash,nextFixture,autoLineup,getPlayer} from './model.js';
import {spatialTeams,formationAnchors} from './pitch-spatial.js';
import {createWorld,stepWorld,STEPS_PER_MINUTE,halfTimeWorld,secondHalfWorld,finalWorld,worldResult,requestSubstitution} from './physics-engine.js';

/** The event engine runs on an isolated clone at kick-off.
 * League tables, finances, players and official results are committed atomically
 * only at the final whistle. A serialized fixture can be resumed after a reload.
 */
export const PHYSICS_FRAME_MS=200; // 1× playback matches the fixed 0.2 s physics step.
export function matchClock(session,minute=session.minute){
 minute=Math.max(0,Math.floor(minute));
 const first=45+session.firstAdded;
 if(minute>90+session.firstAdded)return "90+"+(minute-90-session.firstAdded)+"'";
 if(minute>first)return (minute-session.firstAdded)+"'";
 if(minute>45)return "45+"+(minute-45)+"'";
 return String(minute).padStart(2,'0')+"'";
}
export function matchPhase(session,minute=session.minute){
 if(minute>=session.total)return 'final';
 if(minute===45+session.firstAdded)return 'halftime';
 if(minute>45+session.firstAdded)return 'second';
 return 'first';
}
export function eventAtMinute(session,event){
 if(Number.isFinite(event.clock))return event.clock;
 if(event.kind==='end'||event.kind==='penalties')return session.total;
 if(event.kind==='half')return 45+session.firstAdded;
 const minute=Math.max(0,Math.min(90,Number(event.minute)||0));
 if(minute>45)return minute+session.firstAdded+(minute===90?1:0);
 return minute;
}
export function visibleEvents(session,minute=session.minute){
 if(session.schema===2&&session.world)return session.world.events.slice();
 return session.result.events.filter(e=>eventAtMinute(session,e)<=minute);
}
export function liveScore(session,minute=session.minute){
 if(session.schema===2&&session.world)return {home:session.world.score[0],away:session.world.score[1]};
 const goals=visibleEvents(session,minute).filter(e=>e.kind==='goal');
 return {
  home:goals.filter(e=>e.team===session.result.home).length,
  away:goals.filter(e=>e.team===session.result.away).length
 };
}
export function beginLiveMatch(state,options={}){
 if(state.liveMatch)throw Error('A partida já está em curso.');
 if(state.league.completed)throw Error('A época terminou.');
 const fixture=nextFixture(state);
 if(!fixture)throw Error('Não existe jornada para disputar.');
 // Prepare a complete, deterministic event stream in a sandboxed club state.
 // The user's club, save, budget and classification remain unchanged.
 const after=structuredClone(state);
 delete after.liveMatch;
 const physics=options.engine==='physics';
 if(physics){
  const ids=after.lineups[after.formation]||[];
  if(ids.length!==11||new Set(ids).size!==11||ids.some(id=>!getPlayer(after,id)||(getPlayer(after,id).injury||0)>0||(getPlayer(after,id).contract??0)<=0)){
   after.lineups[after.formation]=autoLineup(after);
  }
  if(after.lineups[after.formation].some(id=>!id))throw Error('Não há 11 jogadores disponíveis para iniciar.');
 }
 const result=physics?null:applyRound(after);
 const seed=hash(state.club.name+':'+state.season+':'+state.week+':'+fixture.id);
 const firstAdded=1+seed%4,secondAdded=2+Math.floor(seed/7)%5;
 const session={
  schema:physics?2:1,id:state.season+':'+state.league.round+':'+fixture.id,
  round:fixture.round,minute:0,substep:0,firstAdded,secondAdded,
  total:90+firstAdded+secondAdded,phase:'running',speed:1,
  result:result||{home:fixture.home,away:fixture.away,
    homeName:fixture.home===0?state.club.name:state.league.teams.find(t=>t.id===fixture.home)?.name||'Casa',
    awayName:fixture.away===0?state.club.name:state.league.teams.find(t=>t.id===fixture.away)?.name||'Fora',
    hg:0,ag:0,events:[]},
  after,spatial:{schema:1,teams:spatialTeams(after,fixture)}
 };
 if(physics){session.world=createWorld(session);session.result=worldResult(session.world);}
 state.liveMatch=session;
 return session;
}
/** Advances one fixed physical step. The UI calls this for each animation frame;
 * neither the whole minute nor its end-state is precomputed.
 * Substeps are saved, so a reloaded match continues at the exact instant.
 */
const INTERRUPTIONS=new Set(['goal','freekick','offside','penalty','corner','throwin','goalkick',
 'injury','treatment','substitution','handball','forfeit']);
function adjustStoppageMinutes(session,half){
 const firstEnd=45+session.firstAdded;
 const start=half===1?0:firstEnd,end=half===1?45:90+session.firstAdded;
 const stops=(session.world?.events||[]).filter(e=>INTERRUPTIONS.has(e.kind)&&
  (e.clock??e.minute)>=start&&(e.clock??e.minute)<end).length;
 const additional=clamp(Math.ceil(stops*.16),1,half===1?8:10);
 if(half===1)session.firstAdded=Math.max(session.firstAdded,additional);
 else session.secondAdded=Math.max(session.secondAdded,additional);
 session.total=90+session.firstAdded+session.secondAdded;
}
export function tickLiveMatchStep(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase!=='running'||session.schema!==2)return session;
 const world=session.world;
 const substep=session.substep||0;
 world.previous={
  players:world.players.map(p=>({id:p.id,x:p.x,y:p.y})),
  ball:{x:world.ball.x,y:world.ball.y,z:world.ball.z}
 };
 world.minute=session.minute+substep/STEPS_PER_MINUTE;
 stepWorld(world);
 if(world.phase==='final'&&world.forfeit){
  session.minute=session.total;session.substep=0;session.phase='final';
  session.result=worldResult(world);return session;
 }
 session.substep=substep+1;
 if(session.substep===STEPS_PER_MINUTE){
  session.substep=0;
  session.minute=clamp(session.minute+1,0,session.total);
  world.minute=session.minute;
  if(session.minute===45&&!session.stoppageCalibratedFirst){
   adjustStoppageMinutes(session,1);session.stoppageCalibratedFirst=true;
  }
  if(session.minute===90+session.firstAdded&&!session.stoppageCalibratedSecond){
   adjustStoppageMinutes(session,2);session.stoppageCalibratedSecond=true;
  }
  if(session.minute>=session.total){
   session.phase='final';
   finalWorld(world);
  }else if(session.minute===45+session.firstAdded){
   session.phase='halftime';
   halfTimeWorld(world);
  }
  session.result=worldResult(world);
 }
 return session;
}
export function tickLiveMatch(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase!=='running')return session;
 if(session.schema===2){
  const remaining=STEPS_PER_MINUTE-(session.substep||0);
  for(let i=0;i<remaining&&session.phase==='running';i++)tickLiveMatchStep(state);
  return session;
 }
 session.minute=clamp(session.minute+1,0,session.total);
 if(session.minute>=session.total)session.phase='final';
 else if(session.minute===45+session.firstAdded)session.phase='halftime';
 return session;
}
export function resumeLiveMatch(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase==='halftime'&&session.schema===2)secondHalfWorld(session.world);
 if(session.phase==='paused'||session.phase==='halftime')session.phase='running';
 return session;
}
export function setLiveFormation(state,formation){
 const options=['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'];
 if(!options.includes(formation))throw Error('Formação inválida.');
 const session=state.liveMatch;
 if(!session||session.schema!==2||session.phase==='final')throw Error('Não há partida ativa.');
 const side=session.world.teams.findIndex(t=>t.id===0);
 if(side<0)throw Error('Clube não encontrado.');
 const team=session.world.teams[side];
 team.anchors=formationAnchors(formation,side,session.world.half||1);
 team.formation=formation;
 session.selectedFormation=formation;
 session.world.events.push({minute:Math.max(1,Math.floor(session.world.minute)),
  clock:session.world.minute,x:50,y:50,kind:'tactical',team:0,text:'Mudança de sistema tático: '+formation+'.'});
 return formation;
}
export function setLiveTactic(state,key,value){
 const allowed={mentality:['defensiva','equilibrada','ofensiva'],
  pressure:['baixa','media','alta'],passing:['curto','misto','longo'],
  tempo:['lento','normal','rapido'],marking:['zona','individual']};
 if(!allowed[key]?.includes(value))throw Error('Instrução tática inválida.');
 const session=state.liveMatch;
 if(!session||session.schema!==2||session.phase==='final')throw Error('Não há jogo em curso.');
 const side=session.world.teams.findIndex(t=>t.id===0);
 if(side<0)throw Error('Clube não encontrado.');
 session.world.teams[side].tactics[key]=value;
 if(session.after?.tactics)session.after.tactics[key]=value;
 session.world.events.push({minute:Math.max(1,Math.floor(session.world.minute)),clock:session.world.minute,
  x:50,y:50,kind:'tactical',team:0,text:'Alteração tática: '+key+' → '+value+'.'});
 return session.world.teams[side].tactics;
}
export function requestLiveSubstitution(state,outId,inId){
 const session=state.liveMatch;
 if(!session||session.schema!==2||session.phase==='final')throw Error('Nenhuma partida ativa.');
 const side=session.world.teams.findIndex(t=>t.id===0);
 if(side<0)throw Error('Clube do jogador não está nesta partida.');
 const change=requestSubstitution(session.world,0,outId,inId);
 session.result=worldResult(session.world);
 return change;
}
export function pauseLiveMatch(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase==='running')session.phase='paused';
 return session;
}
export function finishLiveMatch(state){
 const session=state.liveMatch;
 if(!session||session.phase!=='final'||session.minute<session.total)
  throw Error('A partida ainda não chegou ao apito final.');
 // Old snapshots and double commits never count: the live match must belong
 // to the current saved fixture.
 const fixture=nextFixture(state);
 if(!fixture||fixture.round!==session.round||session.id!==state.season+':'+state.league.round+':'+fixture.id)
  throw Error('A jornada em curso já não corresponde ao calendário.');
 const committed=session.after;
 if(session.schema===2){
  // No match, league-table, wage or transfer operation has been applied yet.
  // Settle the entire round in this single final-whistle transaction.
  applyRound(committed,{featuredResult:worldResult(session.world)});
  if(session.selectedFormation)committed.formation=session.selectedFormation;
 }
 delete committed.liveMatch;
 return committed;
}
