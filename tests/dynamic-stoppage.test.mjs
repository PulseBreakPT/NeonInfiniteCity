import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch,tickLiveMatchStep} from '../match-live.js';
import {STEPS_PER_MINUTE} from '../physics-engine.js';

test('added minutes increase with actual first-half stoppages',()=>{
 const state=makeState('Descontos FC','Porto'),match=beginLiveMatch(state,{engine:'physics'});
 const baseline=match.total,first=match.firstAdded;
 for(let i=0;i<40;i++)match.world.events.push({clock:12+i*.1,kind:'throwin',team:0,text:'Reposição'});
 match.minute=44;match.substep=STEPS_PER_MINUTE-1;match.world.phase='open';
 tickLiveMatchStep(state);
 assert.equal(match.minute,45);
 assert.ok(match.firstAdded>=Math.max(first,7));
 assert.ok(match.total>=baseline);
 assert.equal(state.league.round,1,'No table updates until the final whistle');
});
test('extra time remains deterministic through a saved partial minute',()=>{
 const state=makeState('Relógio FC','Lisboa'),match=beginLiveMatch(state,{engine:'physics'});
 match.minute=44;match.substep=STEPS_PER_MINUTE-1;match.world.phase='open';
 for(let i=0;i<34;i++)match.world.events.push({clock:20+i*.1,kind:'corner',team:0,text:'Canto'});
 const saved=JSON.parse(JSON.stringify(state));
 tickLiveMatchStep(state);tickLiveMatchStep(saved);
 assert.equal(state.liveMatch.firstAdded,saved.liveMatch.firstAdded);
 assert.equal(state.liveMatch.total,saved.liveMatch.total);
 assert.deepEqual(state.liveMatch.world,saved.liveMatch.world);
});
