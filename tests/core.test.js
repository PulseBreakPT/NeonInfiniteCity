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
