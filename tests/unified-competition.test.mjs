import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,nextFixture,migrate} from '../model.js';
import {simulateMatch,applyRound,playCup} from '../sim.js';
import {beginLiveMatch,tickLiveMatch,resumeLiveMatch,finishLiveMatch} from '../match-live.js';
import {createLeagueFixtureJob,tickLeagueFixtureJob,runCompetitionFixture} from '../competition-physics.js';

test('every unattended league fixture uses the same spatial football engine',()=>{
 const state=makeState('Liga Física FC','Braga');
 const fixture=nextFixture(state),before=JSON.stringify(state);
 const result=simulateMatch(state,fixture,{friendly:true});
 assert.equal(result.engine,'physics-v2');
 assert.equal(result.physicsRevision,9);
 assert.equal(result.hg+result.ag,result.events.filter(e=>e.kind==='goal').length);
 assert.equal(JSON.stringify(state),before,'A friendly simulation must not alter the club');
});
test('incremental rival matches are resumable and settle without simulation at full time',()=>{
 const state=makeState('Calendário Unificado FC','Lisboa');
 const session=beginLiveMatch(state,{engine:'physics'});
 assert.equal(session.rivalFixtures.length,7);
 const originalBudget=state.budget,originalRound=state.league.round;
 for(let minute=0;session.phase!=='final'&&minute<112;minute++){
  if(session.phase==='halftime')resumeLiveMatch(state);
  tickLiveMatch(state);
 }
 assert.equal(session.phase,'final');
 assert.ok(session.rivalFixtures.every(job=>job.complete));
 assert.ok(session.rivalFixtures.every(job=>job.result.engine==='physics-v2'));
 assert.equal(state.budget,originalBudget,'The spectator match must not credit revenue prematurely');
 assert.equal(state.league.round,originalRound);
 const frozen=migrate(JSON.parse(JSON.stringify(state)));
 assert.equal(frozen.liveMatch.rivalFixtures.length,7);
 const results=Object.fromEntries(session.rivalFixtures.map(j=>[j.fixtureId,j.result]));
 const committed=finishLiveMatch(state);
 assert.equal(committed.league.round,originalRound+1);
 assert.equal(committed.league.rounds[originalRound-1].filter(f=>f.played).length,8);
 for(const match of committed.league.rounds[originalRound-1]){
  if(match.id===nextFixture(state).id)continue;
  assert.equal(match.hg,results[match.id].hg);
  assert.equal(match.ag,results[match.id].ag);
 }
 assert.ok(committed.results[0].result.events.some(e=>e.kind==='end'));
 assert.equal(committed.liveMatch,undefined);
});
test('a suspended and resumed background world reaches the same score and events',()=>{
 const state=makeState('Recuperação Física FC','Coimbra');
 const fixture=state.league.rounds[0].find(f=>f.home!==0&&f.away!==0);
 const job=createLeagueFixtureJob(state,fixture);
 for(let step=0;step<330;step++)tickLeagueFixtureJob(job);
 const resumed=JSON.parse(JSON.stringify(job));
 while(!job.complete)tickLeagueFixtureJob(job);
 while(!resumed.complete)tickLeagueFixtureJob(resumed);
 assert.deepEqual(job.result,resumed.result);
 const directly=runCompetitionFixture(state,fixture);
 assert.deepEqual(job.result.events,directly.events);
 assert.deepEqual([job.result.hg,job.result.ag],[directly.hg,directly.ag]);
});
