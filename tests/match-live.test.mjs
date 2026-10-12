import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,standings,migrate} from '../model.js';
import {beginLiveMatch,tickLiveMatch,matchClock,matchPhase,liveScore,visibleEvents,eventAtMinute,pauseLiveMatch,resumeLiveMatch,finishLiveMatch} from '../match-live.js';
import {matches} from '../ui-main.js';

test('kickoff stores a pending fixture and does not assign the official result',()=>{
 const s=makeState('Aurora Atlético','Porto'),baseline=JSON.stringify(s);
 const before=standings(s),budget=s.budget,week=s.week;
 const live=beginLiveMatch(s);
 assert.equal(live.minute,0);
 assert.equal(live.phase,'running');
 assert.ok(live.total>=93&&live.total<=100);
 assert.equal(s.budget,budget);
 assert.equal(s.week,week);
 assert.deepEqual(standings(s),before);
 assert.equal(s.league.rounds.flat().filter(f=>f.played).length,0);
 assert.equal(s.results.length,0);
 assert.ok(JSON.stringify(s).length>baseline.length);
 assert.deepEqual(liveScore(live),{home:0,away:0});
 assert.equal(visibleEvents(live).length,0);
 assert.throws(()=>beginLiveMatch(s),/já está em curso/);
 assert.throws(()=>finishLiveMatch(s),/apito final/);
});
test('both halves include stoppage time with a distinct halftime and final whistle',()=>{
 const s=makeState('Minuto FC','Braga'),live=beginLiveMatch(s);
 const halfEnd=45+live.firstAdded;
 assert.equal(matchClock(live,46),"45+1'");
 assert.equal(matchClock(live,halfEnd),"45+"+live.firstAdded+"'");
 assert.equal(matchClock(live,halfEnd+1),"46'");
 assert.equal(matchClock(live,90+live.firstAdded),"90'");
 assert.equal(matchClock(live,live.total),"90+"+live.secondAdded+"'");
 while(live.minute<halfEnd)tickLiveMatch(s);
 assert.equal(live.phase,'halftime');
 assert.equal(live.minute,halfEnd);
 tickLiveMatch(s);
 assert.equal(live.minute,halfEnd,'halftime must be a proper break');
 resumeLiveMatch(s);
 assert.equal(live.phase,'running');
 while(live.phase==='running')tickLiveMatch(s);
 assert.equal(live.phase,'final');
 assert.equal(live.minute,live.total);
 assert.ok(live.total>90);
 assert.equal(matchPhase(live),'final');
});
test('pausing the match freezes clock without paying out results',()=>{
 const s=makeState('Relógio AC','Faro'),live=beginLiveMatch(s);
 for(let i=0;i<14;i++)tickLiveMatch(s);
 const budget=s.budget;
 pauseLiveMatch(s);
 for(let i=0;i<10;i++)tickLiveMatch(s);
 assert.equal(live.minute,14);
 assert.equal(s.budget,budget);
 assert.equal(s.league.round,1);
 resumeLiveMatch(s);
 tickLiveMatch(s);
 assert.equal(live.minute,15);
});
test('only revealed goals affect the live scoreboard',()=>{
 const s=makeState('Placar FC','Faro'),live=beginLiveMatch(s);
 const goals=live.result.events.filter(e=>e.kind==='goal');
 for(const goal of goals){
  const before=liveScore(live,eventAtMinute(live,goal)-1);
  const after=liveScore(live,eventAtMinute(live,goal));
  assert.equal(after.home+after.away,before.home+before.away+1);
 }
 const total=liveScore(live,live.total);
 assert.equal(total.home,live.result.hg);
 assert.equal(total.away,live.result.ag);
 const last=visibleEvents(live,live.total).at(-1);
 assert.equal(last.kind,'end');
});
test('the league and finances commit atomically only after the second added time',()=>{
 const s=makeState('Compromisso FC','Lisboa'),original=s.budget,first=s.players[0].apps;
 const live=beginLiveMatch(s);
 while(live.phase!=='final'){
  if(live.phase==='halftime')resumeLiveMatch(s);
  tickLiveMatch(s);
  assert.equal(s.league.round,1);
  assert.equal(s.players[0].apps,first);
  assert.equal(s.budget,original);
 }
 assert.throws(()=>beginLiveMatch(s),/já está em curso/);
 const committed=finishLiveMatch(s);
 assert.equal(committed.league.round,2);
 assert.equal(committed.week,2);
 assert.equal(committed.results[0].result.hg,live.result.hg);
 assert.equal(committed.results[0].result.ag,live.result.ag);
 assert.ok(committed.players[0].apps>=first);
 assert.ok(committed.budget!==original);
 assert.equal(committed.liveMatch,undefined);
 assert.equal(s.league.round,1,'the old object stays uncommitted');
});
test('saved pending game resumes from the exact minute without any double match',()=>{
 const s=makeState('Save FC','Funchal');const live=beginLiveMatch(s);
 for(let i=0;i<32;i++)tickLiveMatch(s);
 pauseLiveMatch(s);
 const saved=JSON.parse(JSON.stringify(s));
 const resumed=migrate(saved);
 assert.equal(resumed.liveMatch.minute,32);
 assert.equal(resumed.liveMatch.phase,'paused');
 assert.equal(resumed.league.round,1);
 resumeLiveMatch(resumed);
 while(resumed.liveMatch.phase!=='final'){
  if(resumed.liveMatch.phase==='halftime')resumeLiveMatch(resumed);
  tickLiveMatch(resumed);
 }
 const completed=finishLiveMatch(resumed);
 assert.equal(completed.league.round,2);
 assert.equal(completed.league.rounds.flat().filter(f=>f.played).length,8);
 assert.equal(completed.results.filter(r=>r.type==='league').length,1);
});
test('tampering or early completion cannot force a result',()=>{
 const s=makeState('Validade FC','Lisboa');
 const live=beginLiveMatch(s);
 live.phase='final';
 assert.throws(()=>finishLiveMatch(s),/apito final/);
 live.minute=live.total;live.round++;
 assert.throws(()=>finishLiveMatch(s),/calendário/);
});
test('in-play view exposes live pitch and controls without showing final result statistics',()=>{
 const s=makeState('Direto FC','Porto');beginLiveMatch(s);
 const html=matches(s);
 assert.ok(html.includes('id="live-clock"'));
 assert.ok(html.includes('id="live-score"'));
 assert.ok(html.includes('data-action="live-pause"'));
 assert.ok(html.includes('data-action="live-speed"'));
 assert.ok(html.includes('id="live-events"'));
 assert.ok(html.includes('id="ball"'));
 assert.ok(!html.includes('id="match-timeline"'));
 assert.ok(!html.includes('FINALIZADO'));
});
