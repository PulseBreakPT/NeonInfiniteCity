import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,nextFixture} from '../model.js';
import {spatialTeams} from '../pitch-spatial.js';
import {createWorld} from '../physics-engine.js';
import {resolvePhysicalCupShootout} from '../competition-physics.js';

const setup=()=>{
 const state=makeState('Taça Física FC','Porto'),fixture=nextFixture(state);
 const world=createWorld({id:'penalties:physics:qa',
  spatial:{teams:spatialTeams(state,fixture)},
  result:{home:fixture.home,away:fixture.away,homeName:'Casa',awayName:'Fora'}});
 world.competitionCup=true;world.half=4;world.minute=120;world.score=[2,2];
 return world;
};
test('physical competition shootout resolves a real 120-minute draw without modifying match goals',()=>{
 const w=setup(),original=w.score.slice();
 const decision=resolvePhysicalCupShootout(w);
 assert.ok([w.teams[0].id,w.teams[1].id].includes(decision.penaltyWinner));
 const shootout=decision.shootout;
 assert.notEqual(shootout.home,shootout.away);
 assert.deepEqual(w.score,original,'Shootout kicks never count towards the 120-minute score');
 assert.equal(shootout.details.length,w.events.filter(e=>e.kind==='shootout').length);
 assert.equal(w.events.filter(e=>e.kind==='penalties').length,1);
 assert.ok(w.events.every(e=>e.clock===120));
 assert.ok(shootout.details.every(p=>p.playerId!==null&&typeof p.converted==='boolean'));
});
test('a saved 120-minute world reproduces the same shootout decision and ordered kick data',()=>{
 const a=setup(),b=JSON.parse(JSON.stringify(a));
 const original=resolvePhysicalCupShootout(a),resumed=resolvePhysicalCupShootout(b);
 assert.deepEqual(original,resumed);
 assert.deepEqual(a.events,b.events);
});
test('a decisive score cannot enter the penalty shootout',()=>{
 const w=setup();w.score=[2,3];
 assert.throws(()=>resolvePhysicalCupShootout(w),/empate/);
});
