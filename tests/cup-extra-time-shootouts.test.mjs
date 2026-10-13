import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,nextFixture} from '../model.js';
import {runMatch} from '../match-engine.js';
import {resolveCupTie} from '../cup-resolution.js';

const makeRandom=seed=>()=>{
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;
};
const athlete=(id,pos,sho=67,gk=30)=>({id,name:'Atleta '+id,pos,sho,gk,def:58,phy:58});
const team=id=>({id,name:'Equipa '+id,starters:[
 athlete(id*100,'GK',33,73),...Array.from({length:10},(_,i)=>athlete(id*100+i+1,i<4?'DEF':i<7?'MID':'ATT',64+i*2))
],sentOff:new Set()});
test('actual five-kick shootouts have one event per kick and a single winner',()=>{
 let tiebreaks=0,early=0,sudden=0;
 for(let seed=1;seed<=80;seed++){
  const [home,away]=[team(0),team(1)],score=[2,2],events=[],stats=[
   {shots:0,xg:0,onTarget:0,saves:0},{shots:0,xg:0,onTarget:0,saves:0}];
  const result=resolveCupTie({teams:[home,away],score,statistics:stats,random:makeRandom(seed*5671),
   clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),at:()=>{},emit:(kind,side,text,extra)=>events.push({kind,side,...extra})});
  assert.equal(result.extraTime.periods.length,2);
  if(score[0]!==score[1]){assert.equal(result.shootout,null);continue;}
  tiebreaks++;
  assert.ok(result.penaltyWinner===home.id||result.penaltyWinner===away.id);
  const so=result.shootout,attempts=so.kicks[0]+so.kicks[1];
  assert.equal(attempts,so.details.length);
  assert.equal(attempts,events.filter(e=>e.kind==='shootout').length);
  assert.equal(so.home,so.details.filter(d=>d.side===0&&d.converted).length);
  assert.equal(so.away,so.details.filter(d=>d.side===1&&d.converted).length);
  assert.notEqual(so.home,so.away);
  assert.equal(result.penaltyWinner,so.home>so.away?home.id:away.id);
  if(attempts<10)early++;
  if(attempts>10)sudden++;
 }
 assert.ok(tiebreaks>10);
 assert.ok(early>0,'Shootout early termination must be possible');
 assert.ok(sudden>0,'Shootout sudden death must be possible');
});
test('cup games only award shootout wins when level after extra time',()=>{
 let extra=0,shootouts=0;
 for(let i=0;i<34;i++){
  const state=makeState('Taça Real '+i,'Coimbra'),fixture=nextFixture(state);
  state.gameNonce=i*3;
  const result=runMatch(state,{...fixture,id:45000+i},{cup:true});
  if(!result.extraTime)continue;
  extra++;
  assert.ok(result.events.some(e=>e.kind==='extra'));
  if(result.hg===result.ag){
   shootouts++;assert.ok(result.penaltyWinner!==null);
   assert.ok(result.shootout&&result.shootout.details.length>0);
   assert.ok(result.events.some(e=>e.kind==='penalties'));
  }else{
   assert.equal(result.penaltyWinner,null);
   assert.equal(result.shootout,null);
  }
 }
 assert.ok(extra>0);
 assert.ok(shootouts>0);
});
