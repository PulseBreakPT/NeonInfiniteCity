import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,migrate} from '../model.js';
import {beginLiveMatch} from '../match-live.js';

test('old live saves recover the bench, match data and second-half orientation',()=>{
 const state=makeState('História FC','Coimbra');
 const session=beginLiveMatch(state,{engine:'physics'});
 const w=session.world,home=w.players.find(p=>p.side===0&&p.pos==='GK');
 const original=home.y,score=[2,1];
 w.score=score.slice();
 session.minute=52;session.phase='running';
 w.previous={players:w.players.map(p=>({id:p.id,x:p.x,y:p.y})),ball:{x:w.ball.x,y:w.ball.y,z:w.ball.z}};
 delete w.half;delete w.bench;delete w.substitutions;delete w.subWindows;delete w.pendingSubstitutions;
 const stored=JSON.parse(JSON.stringify(state));
 const migrated=migrate(stored),a=migrated.liveMatch.world;
 assert.equal(a.half,2);
 assert.deepEqual(a.score,score);
 assert.ok(a.bench.some(x=>x.length>0));
 assert.ok(Math.abs(a.players.find(p=>p.id===home.id).y-(105-original))<1e-9);
 assert.equal(a.substitutions.length,2);
 assert.equal(a.version,5);
 const repeated=migrate(JSON.parse(JSON.stringify(migrated)));
 assert.deepEqual(repeated.liveMatch.world,a,'Migrating twice must not flip the pitch twice');
});
test('substitution data is preserved through save migration',()=>{
 const state=makeState('Suplentes FC','Porto');
 beginLiveMatch(state,{engine:'physics'});
 const w=state.liveMatch.world;
 w.pendingSubstitutions.push({side:0,outId:'0:2',inId:123,requestedAt:12,automatic:false});
 const restored=migrate(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(restored.liveMatch.world.pendingSubstitutions,w.pendingSubstitutions);
});
