import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,nextFixture} from '../model.js';
import {simulateMatch} from '../sim.js';
import {beginLiveMatch,eventAtMinute} from '../match-live.js';
import {spatialTeams,tacticalBase,restartPositions,buildSpatialTimeline,spatialFrame,spatialChecksum} from '../pitch-spatial.js';

const initial=()=>makeState('Tactical FC','Coimbra');

test('11 players per team occupy tactical positions on the correct goal line',()=>{
 const s=initial(),fixture=nextFixture(s),teams=spatialTeams(s,fixture);
 assert.equal(teams.length,2);
 assert.equal(teams[0].players.length,11);
 assert.equal(teams[1].players.length,11);
 assert.equal(teams[0].side,0);assert.equal(teams[1].side,1);
 assert.equal(teams[0].players[0].y,92);
 assert.equal(teams[1].players[0].y,8);
 for(const p of teams.flatMap(t=>t.players))assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
});
test('all tactical formations produce eleven distinct position slots',()=>{
 const s=initial();
 for(const formation of ['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2']){
  s.formation=formation;
  const team=spatialTeams(s,nextFixture(s)).find(t=>t.id===0);
  assert.equal(team.players.length,11);
  assert.equal(team.formation,formation);
  assert.ok(new Set(team.players.map(p=>p.x+':'+p.y)).size>=10);
 }
});
test('pressing and mentalidade influence real on-pitch player coordinates',()=>{
 const s=initial(),teams=spatialTeams(s,nextFixture(s)),own=teams.find(t=>t.id===0);
 const target={x:80,y:30};
 own.tactics.pressure='baixa';own.tactics.mentality='defensiva';
 const defensive=tacticalBase(own,target,false);
 own.tactics.pressure='alta';own.tactics.mentality='ofensiva';
 const attacking=tacticalBase(own,target,false);
 assert.notDeepEqual(defensive.map(p=>[p.x,p.y]),attacking.map(p=>[p.x,p.y]));
 const opponent=teams.find(t=>t.id!==0);
 assert.equal(tacticalBase(opponent,target,false)[0].y,8);
});
test('corner: taker at corner flag; attackers in box; defenders defend goal',()=>{
 const s=initial(),teams=spatialTeams(s,nextFixture(s));
 for(const side of [0,1]){
  const taker=teams[side],spot={x:3,y:side===0?3:97};
  const players=restartPositions(teams,'corner',taker.id,spot);
  assert.equal(players.length,22);
  const own=players.slice(0,11),defender=players.slice(11);
  assert.ok(Math.abs(own[1].x-3)<1);
  assert.ok(Math.abs(own[1].y-spot.y)<4);
  assert.ok([own[8],own[9],own[10]].every(p=>Math.abs(p.y-spot.y)<19));
  assert.ok(Math.abs(defender[0].y-spot.y)<5);
 }
});
test('free kick: three-player defensive wall between ball and goal',()=>{
 const s=initial(),teams=spatialTeams(s,nextFixture(s)),location={x:43,y:31};
 const players=restartPositions(teams,'freekick',teams[0].id,location);
 const defensive=players.slice(11);
 const wallY=location.y+(5-location.y)*.30;
 const wall=defensive.filter(p=>p.pos==='DEF'&&Math.abs(p.y-wallY)<1&&Math.abs(p.x-location.x)<7);
 assert.equal(wall.length,3,'The wall must contain three actual defenders, never the goalkeeper');
 assert.ok(wall.every(p=>p.y>5&&p.y<location.y));
 assert.ok(Math.max(...wall.map(p=>p.x))-Math.min(...wall.map(p=>p.x))<=9);
});
test('penalty: only taker and keeper inside the penalty zone',()=>{
 const s=initial(),teams=spatialTeams(s,nextFixture(s)),points=restartPositions(teams,'penalty',teams[0].id,{x:50,y:12});
 const attacker=points.slice(0,11),defenders=points.slice(11);
 assert.ok(attacker[9].y<18);
 assert.ok(attacker.filter((p,i)=>i>0&&i!==9&&p.y<=18).length===0);
 assert.ok(defenders.filter((p,i)=>i>0&&p.y<=18).length===0);
 assert.ok(Math.abs(defenders.find(p=>p.pos==='GK').y-5)<1,'the actual goalkeeper stays on the goal line');
});
test('throw-in restarts at the touchline with nearby passing options',()=>{
 const s=initial(),teams=spatialTeams(s,nextFixture(s));
 for(const side of [3,97]){
  const players=restartPositions(teams,'throwin',teams[0].id,{x:side,y:57});
  assert.ok(Math.abs(players[4].x-side)<.5);
  assert.ok(Math.abs(players[4].y-57)<1);
  assert.ok(players.slice(5,7).every(p=>Math.abs(p.x-side)<35));
 }
});
test('match engine creates positional pass and restart events with finite coordinates',()=>{
 const s=initial(),fixture=nextFixture(s),r=simulateMatch(s,fixture);
 assert.ok(r.events.some(e=>e.kind==='pass'),'A tactical game must register actual passes');
 assert.ok(r.events.length>20);
 for(const e of r.events){
  assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y),e.kind+' coordinate');
  assert.ok(e.x>=3&&e.x<=97&&e.y>=2&&e.y<=98);
 }
 assert.equal(r.engine,'events-v4');
});
test('spatial snapshots interpolate passing plays and are repeatable after saving',()=>{
 const s=initial(),live=beginLiveMatch(s),timeline=buildSpatialTimeline(live);
 assert.ok(timeline.length>25);
 const one=spatialFrame(live,14.25,timeline);
 const two=spatialFrame(live,14.65,timeline);
 assert.equal(one.players.length,22);
 for(const p of one.players)assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
 assert.ok(Number.isFinite(one.ball.x)&&Number.isFinite(one.ball.y));
 assert.equal(spatialChecksum(one),spatialChecksum(spatialFrame(live,14.25,buildSpatialTimeline(JSON.parse(JSON.stringify(live))))));
 // There is no randomness or time-dependent state in spatial reconstruction.
 assert.deepEqual(two,spatialFrame(live,14.65,timeline));
});
test('tactical match simulation never commits budget or league before final whistle',()=>{
 const s=initial(),before=s.budget,round=s.league.round;
 const live=beginLiveMatch(s);
 assert.equal(live.spatial.teams.length,2);
 assert.equal(s.league.round,round);
 assert.equal(s.budget,before);
 assert.equal(s.results.length,0);
 assert.ok(live.result.events.some(e=>['pass','corner','throwin','freekick','penalty'].includes(e.kind)));
});
