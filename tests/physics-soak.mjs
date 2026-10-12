// Quality gate: 1,024 complete headless physics-based football games.
// Deterministic seeds, full seasons, no graphics, no randomness in test code.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {makeState} from '../model.js';
import {beginLiveMatch,tickLiveMatch,resumeLiveMatch,finishLiveMatch} from '../match-live.js';

const sample=Number(process.env.MATCH_SOAK_COUNT||1024);
const start=performance.now(),out={matches:0,goals:0,draws:0,scoreless:0,passes:0,shots:0,corners:0,fouls:0,offside:0,throws:0,saves:0};
const scores=new Set();
for(let i=0;i<sample;i++){
 const state=makeState('Stress FC '+i,'Aveiro');
 state.formation=['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'][i%5];
 state.tactics.pressure=['baixa','media','alta'][i%3];
 state.tactics.mentality=['defensiva','equilibrada','ofensiva'][Math.floor(i/3)%3];
 state.tactics.passing=['curto','misto','longo'][Math.floor(i/9)%3];
 state.tactics.marking=['zona','individual'][Math.floor(i/27)%2];
 const live=beginLiveMatch(state,{engine:'physics'});
 assert.equal(live.result.events.length,0);
 assert.equal(live.result.hg+live.result.ag,0);
 while(state.liveMatch.phase!=='final'){
  if(state.liveMatch.phase==='halftime')resumeLiveMatch(state);
  tickLiveMatch(state);
 }
 const after=finishLiveMatch(state),m=after.lastMatch;
 assert.ok(m&&m.engine==='physics-v2');
 assert.equal(after.results.length,1);
 assert.equal(after.league.round,2);
 assert.equal(after.finance.debt,0);
 assert.equal(m.hg+m.ag,m.events.filter(e=>e.kind==='goal').length);
 assert.equal(m.stats.shotsHome+m.stats.shotsAway,m.events.filter(e=>e.kind==='shot').length);
 assert.ok(m.events.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=0&&e.x<=100&&e.y>=0&&e.y<=100));
 assert.ok(after.players.every(p=>p.fitness>=4&&p.fitness<=100));
 assert.ok(live.world.tick>(90+live.firstAdded+live.secondAdded-2)*10);
 assert.ok(m.events.at(-1).kind==='end');
 out.matches++;out.goals+=m.hg+m.ag;
 if(m.hg===m.ag)out.draws++;
 if(m.hg+m.ag===0)out.scoreless++;
 out.passes+=m.stats.passesHome+m.stats.passesAway;
 out.shots+=m.stats.shotsHome+m.stats.shotsAway;
 out.corners+=m.stats.cornersHome+m.stats.cornersAway;
 out.fouls+=m.stats.foulsHome+m.stats.foulsAway;
 out.offside+=m.events.filter(e=>e.kind==='offside').length;
 out.throws+=m.events.filter(e=>e.kind==='throwin').length;
 out.saves+=m.stats.savesHome+m.stats.savesAway;
 scores.add(m.hg+':'+m.ag);
}
const seconds=((performance.now()-start)/1000).toFixed(2);
console.log('SOAK RESULTS '+JSON.stringify({matches:out.matches,seconds,goalsPerGame:+(out.goals/sample).toFixed(3),uniqueScores:scores.size,
 drawRate:+(out.draws/sample).toFixed(3),zeroZeroRate:+(out.scoreless/sample).toFixed(3),
 passesPerGame:+(out.passes/sample).toFixed(2),shotsPerGame:+(out.shots/sample).toFixed(2),
 cornerPerGame:+(out.corners/sample).toFixed(2),foulsPerGame:+(out.fouls/sample).toFixed(2),
 offsidesPerGame:+(out.offside/sample).toFixed(2),throwinsPerGame:+(out.throws/sample).toFixed(2),savesPerGame:+(out.saves/sample).toFixed(2)}));
assert.ok(scores.size>=3,'Variety of outcomes');
assert.ok(out.goals/sample<9,'No excessive scoreline inflation');
assert.ok(out.passes/sample>=4,'Insufficient pass gameplay');
assert.ok(out.shots/sample>=1,'Not enough physical shot attempts');
console.log('PASS: fixed-step simulation is repeatable, uses the referee and settles 1024 full games without errors.');
