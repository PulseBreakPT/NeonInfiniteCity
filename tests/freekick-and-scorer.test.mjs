import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';
const make=()=>beginLiveMatch(makeState('Bolas Paradas FC','Braga'),{engine:'physics'}).world;
test('long-range free kicks are crosses rather than automatic shots at the centre of goal',()=>{
 const w=make();w.phase='restart';w.phaseTime=0;
 const taker=w.players.find(p=>p.side===0&&p.pos==='MID');
 Object.assign(taker,{x:34,y:70,vx:0,vy:0});
 w.restart={kind:'freekick',team:0,x:34,y:70,takerId:taker.id,takerName:taker.name,elapsed:3};
 Object.assign(w.ball,{owner:null,x:34,y:70,z:.12,vx:0,vy:0,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.phase,'open');
 assert.ok(w.events.some(e=>e.kind==='cross'&&e.text.includes('livre')));
 assert.equal(w.ball.shot,undefined,'Crossing free kicks cannot inflate direct-shot accuracy');
});
test('goals scored from legal last-touch passes still credit their true scorer',()=>{
 const w=make();w.phase='open';w.carrier=null;
 const kicker=w.players.find(p=>p.side===0&&p.pos==='ATT');
 Object.assign(w.ball,{owner:null,x:34,y:.5,z:.12,vx:0,vy:-12,vz:0,spin:0,lastTouch:0,lastPlayerId:kicker.id});
 stepWorld(w);
 const goal=w.events.find(e=>e.kind==='goal');
 assert.ok(goal);
 assert.equal(goal.playerId,kicker.sourceId);
 assert.equal(goal.player,kicker.name);
});
