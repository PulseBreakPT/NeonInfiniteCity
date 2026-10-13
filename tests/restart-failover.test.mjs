import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';
test('an injured assigned taker is replaced instead of deadlocking the restart',()=>{
 const w=beginLiveMatch(makeState('Reposições FC','Coimbra'),{engine:'physics'}).world;
 const chosen=w.players.find(p=>p.side===0&&p.pos==='MID');
 chosen.active=false;chosen.injury=3;
 const replacement=w.players.find(p=>p.side===0&&p.active!==false&&p.pos!=='GK');
 w.phase='restart';w.phaseTime=0;
 w.restart={kind:'freekick',team:0,x:replacement.x,y:replacement.y,
  takerId:chosen.id,takerName:chosen.name,elapsed:20};
 Object.assign(w.ball,{owner:null,x:replacement.x,y:replacement.y,vx:0,vy:0,z:.12,vz:0,spin:0});
 for(let i=0;i<150&&w.phase==='restart';i++)stepWorld(w);
 assert.equal(w.phase,'open','An eligible teammate must eventually take the kick');
 assert.notEqual(w.restart?.takerId,chosen.id);
});
test('an abandoned match cannot remain stuck in a restart with fewer than seven',()=>{
 const w=beginLiveMatch(makeState('Número Mínimo FC','Braga'),{engine:'physics'}).world;
 w.phase='restart';
 w.restart={kind:'freekick',team:0,x:34,y:45,takerId:w.players[0].id,elapsed:10};
 w.players.filter(p=>p.side===0&&p.pos!=='GK').slice(0,5).forEach(p=>{p.active=false;p.sentOff=true;});
 stepWorld(w);
 assert.equal(w.phase,'final');
 assert.ok(w.forfeit);
});
