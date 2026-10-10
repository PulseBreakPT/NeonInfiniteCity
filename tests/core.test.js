import test from 'node:test';
import assert from 'node:assert/strict';
import {project,unproject,wrapDx,EARTH,CITIES,pointInPoly,Territory,updateTrail,trailHit,polygonArea,randomHash,circlePolygon} from '../src/core.js';
test('worldwide projection roundtrips and wraps longitude',()=>{
 for(const c of CITIES){const p=project(c.lat,c.lng),r=unproject(p.x,p.y);assert.ok(Math.abs(r.lat-c.lat)<1e-7);assert.ok(Math.abs(r.lng-c.lng)<1e-7)}
 assert.ok(Math.abs(wrapDx(EARTH-25)+25)<1e-5);
});
test('free form concave polygon accuracy',()=>{
 const poly=[{x:0,y:0},{x:40,y:0},{x:40,y:20},{x:20,y:20},{x:20,y:40},{x:0,y:40}];
 assert.equal(pointInPoly({x:10,y:10},poly),true);assert.equal(pointInPoly({x:30,y:30},poly),false);assert.equal(polygonArea(poly),1200);
});
test('starter zone has 48 curved boundary points, no square cells',()=>{
 const t=new Territory('player',0,0,31);
 assert.equal(t.ops[0].points.length,48);assert.equal(t.contains(30,0),true);assert.equal(t.contains(30,30),false);
 assert.equal(circlePolygon(0,0,10).length,48);
});
test('captured triangle preserves its exact diagonal geometry',()=>{
 const t=new Territory('player',0,0,20);
 const r=t.capture([{x:0,y:0},{x:120,y:10},{x:60,y:100}]);
 assert.ok(r.area>3000);assert.equal(t.contains(57,40),true);assert.equal(t.contains(112,90),false);
 assert.equal(t.ops.at(-1).points.length,3);
});
test('overlap is not rewarded twice',()=>{
 const t=new Territory('player',0,0,20),ring=[{x:0,y:0},{x:70,y:0},{x:70,y:70},{x:0,y:70}];
 assert.ok(t.capture(ring));assert.equal(t.capture(ring),null);
});
test('territory capture can be stolen and reclaimed',()=>{
 const t=new Territory('player',0,0,30),poly=[{x:-20,y:-20},{x:20,y:-20},{x:20,y:20},{x:-20,y:20}];
 const taken=t.erase(poly);assert.ok(taken>0);assert.equal(t.contains(0,0),false);
 assert.ok(t.capture(poly));assert.equal(t.contains(0,0),true);
});
test('trail closes after returning to owned polygon',()=>{
 const actor={x:4,y:4,lastOwned:{x:4,y:4},territory:new Territory('me',4,4,20),trail:[]};
 actor.x=37;actor.y=3;updateTrail(actor);actor.x=70;actor.y=40;updateTrail(actor);actor.x=4;actor.y=4;
 const won=updateTrail(actor);assert.ok(won?.captured?.area>0);assert.equal(actor.trail.length,0);
});
test('segment collisions detect vulnerable player trail',()=>{
 const path=[{x:0,y:0},{x:10,y:0},{x:10,y:20}];
 assert.equal(trailHit({x:9,y:13},path,3),true);assert.equal(trailHit({x:30,y:13},path,3),false);
});
test('huge claims rejected',()=>{
 const t=new Territory('me',0,0,20),before=t.area;
 assert.equal(t.capture([{x:0,y:0},{x:100000,y:0},{x:100000,y:10000},{x:0,y:10000}]),null);
 assert.equal(t.area,before);
});
test('spawn cities span many countries',()=>{
 assert.ok(CITIES.length>=20);assert.ok(new Set(CITIES.map(c=>c.country)).size>=14);
 assert.notEqual(randomHash(1,2),randomHash(3,4));
});

test('fast moving players collide with a crossed trail between frames',async()=>{
  const {trailHitSweep,segmentDistance}=await import('../src/core.js');
  const trail=[{x:0,y:-25},{x:0,y:25}];
  assert.equal(trailHitSweep({x:-45,y:0},{x:45,y:0},trail,3),true);
  assert.equal(trailHitSweep({x:-45,y:40},{x:45,y:40},trail,3),false);
  assert.equal(segmentDistance({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}),0);
});
test('capturing a large polygon remains bounded and stable',()=>{
  const t=new Territory('me',0,0,32);
  const start=performance.now();
  for(let i=0;i<12;i++) {
    const x=50+i*30;
    assert.ok(t.capture([{x,y:-30},{x:x+26,y:-30},{x:x+26,y:30},{x,y:30}]));
  }
  assert.ok(performance.now()-start<1200,'normal capture computations must be bounded');
  assert.ok(t.area>10000);
});
test('overlapping claims keep continuous shapes rather than rectangular cells',()=>{
  const t=new Territory('you',0,0,25);
  const a=t.capture([{x:10,y:10},{x:60,y:22},{x:25,y:75}]);
  assert.ok(a&&a.points.length===3);
  assert.ok(t.contains(32,34));
  assert.ok(!t.contains(55,60));
});
test('polygon area is stable near world Mercator coordinate limits',()=>{
 const {x,y}=project(-23.5,-46.6);
 assert.equal(polygonArea([{x,y},{x:x+60,y},{x:x+60,y:y+40},{x,y:y+40}]),2400);
});
test('indexed vector territories allow 200 independent conquests without rectangular ownership',()=>{
  const t=new Territory('you',0,0,12);
  for(let i=0;i<200;i++){
    const x=i*70+25;
    const capture=t.capture([{x,y:-3},{x:x+15,y:9},{x:x+26,y:-3}]);
    assert.ok(capture?.area>2,`capture ${i} must succeed`);
  }
  assert.ok(t.ops.length>140);
  assert.equal(t.contains(197*70+42,0),true);
  assert.equal(t.contains(197*70+42,60),false);
});
test('spatial territory index honours latest cuts and reclaim at negative coordinates',()=>{
  const t=new Territory('you',-5000000,3000000,30);
  const x=-5000000,y=3000000;
  const clip=[{x:x-12,y:y-12},{x:x+12,y:y-12},{x:x+12,y:y+12},{x:x-12,y:y+12}];
  assert.equal(t.contains(x,y),true);
  assert.ok(t.erase(clip)>0);
  assert.equal(t.contains(x,y),false);
  assert.ok(t.capture(clip));
  assert.equal(t.contains(x,y),true);
  t.clear();assert.equal(t.contains(x,y),false);
});
