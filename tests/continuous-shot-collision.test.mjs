import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';
test('a fast shot cannot tunnel through the defender between adjacent physical frames',()=>{
 const state=makeState('Defesa Contínua FC','Lisboa');
 const w=beginLiveMatch(state,{engine:'physics'}).world;
 w.phase='open';w.carrier=null;
 for(const p of w.players)if(p.side===1){p.x=10;p.y=80;p.vx=0;p.vy=0;}
 const defender=w.players.find(p=>p.side===1&&p.pos==='DEF');
 defender.x=34;defender.y=32.5;
 Object.assign(w.ball,{owner:null,x:34,y:35,z:.12,vx:0,vy:-28,vz:0,spin:0,lastTouch:0,
  shot:{team:0,playerId:'0:10',xg:.18,onTarget:true}});
 stepWorld(w);
 assert.ok(w.events.some(e=>e.kind==='block'),'Fast shots must collide with defenders along their full path');
 assert.equal(w.ball.lastTouch,1);
 assert.ok(w.stats[1].blocks>=1);
 assert.equal(w.ball.shot,undefined,'The original shot is resolved after a successful block');
});
