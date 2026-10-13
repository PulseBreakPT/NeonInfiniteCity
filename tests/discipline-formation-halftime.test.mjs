import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch,setLiveFormation} from '../match-live.js';
import {requestSubstitution,stepWorld,worldResult,halfTimeWorld,secondHalfWorld} from '../physics-engine.js';
import {isPenaltyArea,goalkeeperHandlingAllowed} from '../football-rules.js';

function boot(){const state=makeState('Disciplina FC','Faro');const match=beginLiveMatch(state,{engine:'physics'});return {state,w:match.world};}
test('substituted and injured players are never falsely red-carded',()=>{
 const {w}=boot(),side=w.teams.findIndex(t=>t.id===0);
 const outgoing=w.players.find(p=>p.side===side&&p.pos!=='GK');
 const reserve=w.bench[side][0];
 w.phase='restart';w.restart={kind:'throwin',team:1-side,x:1,y:45,elapsed:0,takerId:null};
 requestSubstitution(w,0,outgoing.sourceId,reserve.id);
 const injured=w.players.find(p=>p.side===side&&p.active!==false&&p.pos!=='GK');
 injured.active=false;injured.injury=3;
 const treatment=w.players.find(p=>p.side!==side&&p.active!==false&&p.pos!=='GK');
 treatment.active=false;treatment.temporaryExitUntilTick=200;
 let result=worldResult(w);
 assert.equal(result.discipline.length,0,'Substitutions, medical treatment and injuries are not expulsions');
 const offender=w.players.find(p=>p.side===side&&p.active!==false&&p.pos!=='GK');
 offender.active=false;offender.sentOff=true;offender.yellows=1;
 result=worldResult(w);
 assert.deepEqual(result.discipline.map(d=>d.playerId),[offender.sourceId]);
 assert.ok(result.discipline[0].red);
});
test('penalty box and goalkeeper permissions mirror after half time',()=>{
 const {w}=boot(),home=w.players.find(p=>p.side===0&&p.pos==='GK');
 assert.equal(isPenaltyArea(34,99,0,1),true);
 assert.equal(isPenaltyArea(34,6,0,1),false);
 assert.equal(goalkeeperHandlingAllowed(home,{x:34,y:99},1),true);
 halfTimeWorld(w);secondHalfWorld(w);
 assert.equal(isPenaltyArea(34,99,0,2),false);
 assert.equal(isPenaltyArea(34,6,0,2),true);
 assert.equal(goalkeeperHandlingAllowed(home,{x:34,y:6},2),true);
 assert.equal(goalkeeperHandlingAllowed(home,{x:34,y:99},2),false);
});
test('live formation changes are deterministic in both halves',()=>{
 const {state,w}=boot(),side=w.teams.findIndex(t=>t.id===0);
 const original=w.teams[side].anchors.map(p=>({...p}));
 setLiveFormation(state,'3-5-2');
 assert.equal(w.teams[side].formation,'3-5-2');
 assert.notDeepEqual(w.teams[side].anchors,original);
 assert.equal(state.liveMatch.selectedFormation,'3-5-2');
 assert.equal(state.liveMatch.after.formation,'4-3-3','Career XI must remain intact until official settlement');
 assert.throws(()=>setLiveFormation(state,'2-2-6'),/inválida/);
 halfTimeWorld(w);secondHalfWorld(w);
 setLiveFormation(state,'4-4-2');
 assert.equal(w.teams[side].formation,'4-4-2');
 assert.ok(w.teams[side].anchors[0].y<15,'Home GK has swapped ends in second half');
});
