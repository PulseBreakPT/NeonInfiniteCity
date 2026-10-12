import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld,FIELD} from '../physics-engine.js';

function openWorld(){
 const w=beginLiveMatch(makeState('Árbitro FC','Lisboa'),{engine:'physics'}).world;
 w.phase='open';w.phaseTime=0;w.carrier=null;w.ball.owner=null;
 return w;
}
test('penalty cannot be taken until goalkeeper reaches the goal line',()=>{
 const w=openWorld();
 const goalkeeper=w.players.find(p=>p.side===1&&p.pos==='GK');
 w.phase='restart';w.phaseTime=0;w.restart={
  kind:'penalty',team:0,x:34,y:11,elapsed:3,
  takerId:w.players.find(p=>p.side===0&&p.pos==='ATT').id,
  takerName:w.players.find(p=>p.side===0&&p.pos==='ATT').name
 };
 const kicker=w.players.find(p=>p.id===w.restart.takerId);
 kicker.x=34;kicker.y=11;goalkeeper.x=34;goalkeeper.y=8.1;
 stepWorld(w);
 assert.equal(w.phase,'restart');
 for(let i=0;i<170&&w.phase==='restart';i++)stepWorld(w);
 assert.equal(w.phase,'open');
 assert.ok(goalkeeper.y<.8,'Goalkeeper must be on the goal line before the kick');
});
test('the restart kicker may not touch again before any other player',()=>{
 const w=openWorld();
 const player=w.players.find(p=>p.side===0&&p.pos==='MID');
 Object.assign(w.ball,{x:player.x,y:player.y,z:.12,vx:0,vy:0,vz:0,spin:0,
  restartKind:'freekick',restartSide:0,restartTouched:false,restartKicker:player.id});
 stepWorld(w);
 assert.equal(w.restart?.kind,'indirect');
 assert.equal(w.restart?.team,1);
});
test('goalkeeper holding ball for more than eight seconds awards a corner',()=>{
 const w=openWorld();
 const keeper=w.players.find(p=>p.side===0&&p.pos==='GK');
 keeper.x=34;keeper.y=100;
 Object.assign(w.ball,{owner:keeper.id,x:34,y:100,z:.12,vx:0,vy:0,keeperHeld:true,lastTouch:0});
 w.possessor=0;w.carrier=keeper.id;w.actionCooldown=100;
 for(let i=0;i<45&&w.phase==='open';i++)stepWorld(w);
 assert.equal(w.restart?.kind,'corner');
 assert.equal(w.restart?.team,1);
});
test('advantage is brought back when the beneficiary loses control quickly',()=>{
 const w=openWorld();
 w.referee.advantage={team:0,where:{x:33,y:41},expires:w.tick+20,penalty:false};
 w.possessor=1;w.ball.x=13;w.ball.y=41;w.ball.vx=0;w.ball.vy=0;
 stepWorld(w);
 assert.equal(w.restart?.kind,'freekick');
 assert.equal(w.restart?.team,0);
});
