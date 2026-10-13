import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGoalCrossing} from '../referee-audit.js';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';

const field={length:105,goalLeft:30.34,goalRight:37.66};
test('independent goal-line audit requires the entire ball to cross between posts',()=>{
 const input={before:{x:34,y:.4,z:.12},after:{x:34,y:-1,z:.12},
  goalLine:0,field,attacking:0};
 const valid=auditGoalCrossing(input);
 assert.equal(valid.status,'confirmed');
 assert.ok(valid.evidence.completeBallCrossing);
 assert.ok(valid.evidence.crossedThisStep);
 assert.equal(valid.evidence.goalLine,0);
 assert.equal(auditGoalCrossing({...input,after:{x:34,y:-.05,z:.12}}).approved,false);
 assert.equal(auditGoalCrossing({...input,after:{x:15,y:-1,z:.12}}).approved,false);
 assert.equal(auditGoalCrossing({...input,after:{x:34,y:-1,z:2.8}}).approved,false);
});
test('the review rejects a direct throw-in goal without another player touch',()=>{
 const review=auditGoalCrossing({
  before:{x:34,y:1,z:.12},after:{x:34,y:-2,z:.12},
  goalLine:0,field,attacking:0,restartKind:'throwin',restartSide:0,
  restartTouched:false
 });
 assert.equal(review.approved,false);
 assert.equal(review.evidence.restartLegal,false);
});
test('an accepted live goal preserves objective review evidence in the career result',()=>{
 const w=beginLiveMatch(makeState('VAR Prova FC','Faro'),{engine:'physics'}).world;
 w.phase='open';w.carrier=null;
 Object.assign(w.ball,{owner:null,x:34,y:.4,z:.12,vx:0,vy:-12,vz:0,spin:0,
  lastTouch:0});
 stepWorld(w);
 assert.equal(w.score[0],1);
 assert.equal(w.events.find(e=>e.kind==='goal')?.review?.status,'confirmed');
 assert.equal(w.referee.reviewLog.length,1);
});
