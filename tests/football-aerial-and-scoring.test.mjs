import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld,worldResult} from '../physics-engine.js';

const make=()=>beginLiveMatch(makeState('Futebol Aéreo FC','Porto'),{engine:'physics'}).world;
test('a genuinely airborne ball can be headed by a physical player',()=>{
 const w=make();w.phase='open';w.ball.owner=null;w.carrier=null;
 const p=w.players.find(p=>p.side===0&&p.pos==='MID');
 Object.assign(w.ball,{x:p.x,y:p.y,z:2.11,vx:0,vy:0,vz:-.4,spin:0,lastTouch:1});
 stepWorld(w);
 assert.ok(w.events.some(e=>e.kind==='header'),'A contestable 2-metre ball must allow a header');
 assert.equal(p.pose,'header');
 assert.ok(Number.isFinite(w.ball.vx+w.ball.vy+w.ball.vz));
});
test('a cross produces three-dimensional ball flight rather than staying at grass level',()=>{
 const w=make();w.phase='open';w.ball.owner=null;w.carrier=null;
 // Place the attacking corner onto the regulation 0.1m arc.
 Object.assign(w.ball,{x:0.1,y:0.1,z:.12,vx:16,vy:4,vz:8.5,spin:0,lastTouch:0});
 const height=w.ball.z;
 stepWorld(w);
 assert.ok(w.ball.z>height+.7,'The ball must climb above the ground');
});
test('goal metadata cannot attribute an own goal to the attacking scorer',()=>{
 const w=make();w.phase='open';w.ball.owner=null;w.carrier=null;
 Object.assign(w.ball,{x:34,y:.5,z:.12,vx:0,vy:-12,vz:0,spin:0,lastTouch:1});
 stepWorld(w);
 const goal=w.events.find(e=>e.kind==='goal');
 assert.ok(goal?.ownGoal);
 assert.equal(goal.playerId,null);
 assert.equal(worldResult(w).hg,1);
});
