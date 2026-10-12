import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';

function ready(){
 const w=beginLiveMatch(makeState('Linhas FC','Faro'),{engine:'physics'}).world;
 w.phase='open';w.carrier=null;w.ball.owner=null;
 return w;
}
test('touchline wins when it is crossed before the end line in one physics step',()=>{
 const w=ready();
 Object.assign(w.ball,{x:.8,y:.8,z:.12,vx:-20,vy:-10,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.restart?.kind,'throwin');
 assert.equal(w.restart?.team,1);
 assert.equal(w.score[0]+w.score[1],0);
});
test('goal line wins when it is crossed before the sideline',()=>{
 const w=ready();
 Object.assign(w.ball,{x:.8,y:.8,z:.12,vx:-10,vy:-20,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.restart?.kind,'goalkick');
 assert.equal(w.restart?.team,1);
});
test('interpolated shot crossing a valid goal line is still awarded correctly',()=>{
 const w=ready();
 Object.assign(w.ball,{x:34,y:.5,z:.12,vx:0,vy:-12,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.score[0],1);
 assert.ok(w.events.some(e=>e.kind==='goal'));
});
