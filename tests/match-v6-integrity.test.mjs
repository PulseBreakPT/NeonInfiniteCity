import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch,tickLiveMatchStep,setLiveTactic,requestLiveSubstitution} from '../match-live.js';
import {stepWorld,halfTimeWorld,secondHalfWorld,worldResult,requestSubstitution} from '../physics-engine.js';

const start=()=>{
 const state=makeState('Rigor FC','Lisboa');
 const match=beginLiveMatch(state,{engine:'physics'});
 return {state,match,w:match.world};
};
test('at halftime teams truly reverse ends, pitch anchors and the direction of goals',()=>{
 const {w}=start(),p=w.players.find(p=>p.side===0&&p.pos==='GK');
 const oldY=p.y,oldAnchor=w.teams[0].anchors[0].y;
 halfTimeWorld(w);secondHalfWorld(w);
 assert.equal(w.half,2);
 assert.ok(Math.abs(p.y-(105-oldY))<.1);
 assert.ok(Math.abs(w.teams[0].anchors[0].y-(105-oldAnchor))<.1);
 w.phase='open';w.restart=null;w.carrier=null;
 Object.assign(w.ball,{owner:null,x:34,y:104.5,vx:0,vy:13,z:.12,vz:0,spin:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.score[0],1,'Home club attacks the far end in the second half');
});
test('the correct eleven remains on pitch after a named substitution',()=>{
 const {state,w}=start(),side=w.teams.findIndex(t=>t.id===0);
 const outgoing=w.players.find(p=>p.side===side&&p.pos==='DEF');
 const sub=w.bench[side].find(p=>p.pos===outgoing.pos)||w.bench[side][0];
 assert.ok(sub,'Bench must contain eligible players');
 requestLiveSubstitution(state,outgoing.sourceId,sub.id);
 assert.equal(w.pendingSubstitutions.length,1);
 w.phase='open';w.ball.owner=null;w.carrier=null;
 Object.assign(w.ball,{x:-.5,y:48,vx:0,vy:-4,z:.12,vz:0,lastTouch:0});
 stepWorld(w);
 assert.equal(w.substitutions[side].length,1);
 assert.equal(w.players.filter(p=>p.side===side&&p.active!==false).length,11);
 assert.equal(w.bench[side].some(p=>p.id===sub.id),false);
 assert.ok(worldResult(w).substitutions.some(change=>change.inId===sub.id));
});
test('five substitutions and three stoppages are enforced',()=>{
 const {state,w}=start(),side=w.teams.findIndex(t=>t.id===0);
 for(let n=0;n<3;n++){
  const old=w.players.find(p=>p.side===side&&p.pos!=='GK'&&p.active!==false);
  const reserve=w.bench[side][0];
  w.phase='restart';w.restart={kind:'throwin',team:side,x:0,y:45,elapsed:0,takerId:null};
  requestSubstitution(w,0,old.sourceId,reserve.id);
  assert.equal(w.substitutions[side].length,n+1);
 }
 assert.equal(w.subWindows[side],3);
 w.phase='open';
 const old=w.players.find(p=>p.side===side&&p.pos!=='GK'&&p.active!==false);
 const reserve=w.bench[side][0];
 assert.throws(()=>requestSubstitution(w,0,old.sourceId,reserve.id),/três/);
});
test('minimum seven rule produces a deterministic match forfeit',()=>{
 const {state,w}=start();
 w.phase='open';w.carrier=null;w.ball.owner=null;
 const ps=w.players.filter(p=>p.side===0&&p.pos!=='GK');
 for(let n=0;n<5;n++)ps[n].active=false;
 tickLiveMatchStep(state);
 assert.equal(state.liveMatch.phase,'final');
 assert.equal(w.forfeit?.team,w.teams[0].id);
 assert.ok(w.events.some(e=>e.kind==='forfeit'));
});
test('tactical instructions change the active physics world without restarting',()=>{
 const {state,w}=start(),side=w.teams.findIndex(t=>t.id===0);
 const before=w.tick;
 setLiveTactic(state,'mentality','ofensiva');
 setLiveTactic(state,'pressure','alta');
 assert.equal(w.teams[side].tactics.mentality,'ofensiva');
 assert.equal(w.teams[side].tactics.pressure,'alta');
 assert.equal(w.tick,before);
 assert.throws(()=>setLiveTactic(state,'pressure','extrema'),/inválida/);
});
