import {applyRound} from './sim.js';
import {clamp,hash,nextFixture,autoLineup,getPlayer} from './model.js';
import {spatialTeams} from './pitch-spatial.js';

/** The event engine runs on an isolated clone at kick-off.
 * League tables, finances, players and official results are committed atomically
 * only at the final whistle. A serialized fixture can be resumed after a reload.
 */
export function matchClock(session,minute=session.minute){
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
 if(event.kind==='end'||event.kind==='penalties')return session.total;
 if(event.kind==='half')return 45+session.firstAdded;
 const minute=Math.max(0,Math.min(90,Number(event.minute)||0));
 if(minute>45)return minute+session.firstAdded+(minute===90?1:0);
 return minute;
}
export function visibleEvents(session,minute=session.minute){
 return session.result.events.filter(e=>eventAtMinute(session,e)<=minute);
}
export function liveScore(session,minute=session.minute){
 const goals=visibleEvents(session,minute).filter(e=>e.kind==='goal');
 return {
  home:goals.filter(e=>e.team===session.result.home).length,
  away:goals.filter(e=>e.team===session.result.away).length
 };
}
export function beginLiveMatch(state){
 if(state.liveMatch)throw Error('A partida já está em curso.');
 if(state.league.completed)throw Error('A época terminou.');
 const fixture=nextFixture(state);
 if(!fixture)throw Error('Não existe jornada para disputar.');
 // Prepare a complete, deterministic event stream in a sandboxed club state.
 // The user's club, save, budget and classification remain unchanged.
 const after=structuredClone(state);
 delete after.liveMatch;
 const result=applyRound(after);
 const seed=hash(state.club.name+':'+state.season+':'+state.week+':'+fixture.id);
 const firstAdded=1+seed%4,secondAdded=2+Math.floor(seed/7)%5;
 const session={
  schema:1,id:state.season+':'+state.league.round+':'+fixture.id,
  round:fixture.round,minute:0,firstAdded,secondAdded,
  total:90+firstAdded+secondAdded,phase:'running',speed:1,
  result,after,spatial:{schema:1,teams:spatialTeams(after,fixture)}
 };
 state.liveMatch=session;
 return session;
}
export function tickLiveMatch(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase!=='running')return session;
 session.minute=clamp(session.minute+1,0,session.total);
 if(session.minute>=session.total)session.phase='final';
 else if(session.minute===45+session.firstAdded)session.phase='halftime';
 return session;
}
export function resumeLiveMatch(state){
 const session=state.liveMatch;
 if(!session)throw Error('Não há jogo em curso.');
 if(session.phase==='paused'||session.phase==='halftime')session.phase='running';
 return session;
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
 delete committed.liveMatch;
 return committed;
}
