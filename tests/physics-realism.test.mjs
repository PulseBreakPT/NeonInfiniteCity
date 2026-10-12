import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld,FIELD,FIXED_DT} from '../physics-engine.js';

const world=()=>beginLiveMatch(makeState('Realismo FC','Lisboa'),{engine:'physics'}).world;
const open=w=>{w.phase='open';w.phaseTime=0;w.restart=null;w.carrier=null;w.ball.owner=null;};
test('22 unique physical bodies keep their original club player ids for scoring',()=>{
 const w=world();
 assert.equal(w.players.length,22);
 assert.equal(new Set(w.players.map(p=>p.id)).size,22);
 assert.ok(w.players.every(p=>p.sourceId!==undefined&&p.active===true));
 assert.ok(w.ball.spin===0);
});
test('a ball striking the left goalpost rebounds and does not count as a goal',()=>{
 const w=world();open(w);
 Object.assign(w.ball,{x:FIELD.goalLeft,y:.6,z:.12,vx:0,vy:-14,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.deepEqual(w.score,[0,0]);
 assert.equal(w.phase,'open');
 assert.ok(w.ball.vy>0);
 assert.ok(w.events.some(e=>e.kind==='woodwork'));
});
test('a pass in offside position only triggers an offence when its receiver plays the ball',()=>{
 const w=world();open(w);
 const p=w.players.find(p=>p.side===0&&p.pos==='ATT');
 for(const q of w.players)if(q.id!==p.id){q.x=Math.max(2,Math.min(66,p.x+12));q.y=Math.max(2,Math.min(103,p.y+12));q.vx=0;q.vy=0;}
 Object.assign(w.ball,{x:p.x,y:p.y,z:.12,vx:0,vy:0,vz:0,spin:0,lastTouch:0,
   pendingOffside:{side:0,receiverId:p.id},intended:{side:0,receiverId:p.id,passerId:'0:6'}});
 stepWorld(w);
 assert.equal(w.restart?.kind,'offside');
 assert.equal(w.restart?.team,1);
 assert.equal(w.stats[0].accurate,0);
});
test('close footballers cannot remain physically overlapped on the pitch',()=>{
 const w=world();open(w);
 const a=w.players.find(p=>p.side===0&&p.pos==='DEF');
 const b=w.players.find(p=>p.side===1&&p.pos==='DEF');
 Object.assign(a,{x:26,y:51,vx:0,vy:0});
 Object.assign(b,{x:26.25,y:51,vx:0,vy:0});
 Object.assign(w.ball,{x:56,y:35,vx:0,vy:0,z:.12,vz:0,spin:0});
 stepWorld(w);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=.79,'Players must physically separate');
});
test('the goalkeeper cannot teleport toward a shot',()=>{
 const w=world();open(w);
 const g=w.players.find(p=>p.side===1&&p.pos==='GK');
 Object.assign(g,{x:10,y:6,vx:0,vy:0});
 Object.assign(w.ball,{x:34,y:10,z:.12,vx:0,vy:-14,vz:0,spin:0,lastTouch:0,
   shot:{team:0,playerId:'0:9',xg:.4,onTarget:true}});
 stepWorld(w,FIXED_DT);
 assert.ok(Math.abs(g.x-10)<1,'A goalkeeper must move using acceleration');
 assert.notEqual(w.ball.owner,g.id,'A distant goalkeeper cannot claim an impossible save');
});
