import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld,FIELD} from '../physics-engine.js';

function ready(){
 const state=makeState('Leis do Jogo FC','Coimbra');
 const w=beginLiveMatch(state,{engine:'physics'}).world;
 w.phase='open';w.phaseTime=0;w.ball.owner=null;w.carrier=null;
 return w;
}
test('a corner is taken from the physical corner flag with no endless restart',()=>{
 const w=ready();
 Object.assign(w.ball,{x:4,y:-.5,vx:0,vy:-3,z:.12,vz:0,spin:0,lastTouch:1});
 stepWorld(w);
 assert.equal(w.restart?.kind,'corner');
 assert.equal(w.restart?.team,0);
 assert.ok(w.ball.x<5&&w.ball.y<1);
 for(let i=0;i<170&&w.phase==='restart';i++)stepWorld(w);
 assert.equal(w.phase,'open');
 assert.ok(w.events.some(e=>e.kind==='cross'),'The kick must actually happen');
});
test('after a goal the centre restart eventually proceeds with its real taker',()=>{
 const w=ready();
 Object.assign(w.ball,{x:34,y:.4,vx:0,vy:-10,z:.12,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.restart?.kind,'kickoff');
 for(let i=0;i<170&&w.phase==='restart';i++)stepWorld(w);
 assert.equal(w.phase,'open');
});
test('goalkeepers can take goal kicks, and avoid artificial deadlocks',()=>{
 const w=ready();
 Object.assign(w.ball,{x:5,y:-.4,vx:0,vy:-5,z:.12,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.restart?.kind,'goalkick');
 assert.ok(w.restart?.takerId!==null);
 assert.equal(w.players.find(p=>p.id===w.restart.takerId)?.pos,'GK');
 for(let i=0;i<170&&w.phase==='restart';i++)stepWorld(w);
 assert.equal(w.phase,'open');
});
