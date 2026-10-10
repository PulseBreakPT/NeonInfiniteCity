import test from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, wrapDx, EARTH, CITIES, pointInPoly, Territory, GRID, updateTrail, trailHit, polygonArea, randomHash, toCell } from '../src/core.js';
test('worldwide projection roundtrips and wraps the dateline', () => {
  for (const loc of [...CITIES, { lat: 75.3, lng: 179.8 }, { lat: -70.1, lng: -179.1 }]) {
    const p = project(loc.lat, loc.lng), result = unproject(p.x,p.y);
    assert.ok(Math.abs(result.lat-loc.lat)<1e-7);
    assert.ok(Math.abs(result.lng-loc.lng)<1e-7);
  }
  assert.ok(Math.abs(wrapDx(EARTH-25)+25)<1e-5);
  assert.ok(Math.abs(wrapDx(-EARTH+25)-25)<1e-5);
});
test('polygon geometry handles concavity', () => {
  const p=[{x:0,y:0},{x:40,y:0},{x:40,y:20},{x:20,y:20},{x:20,y:40},{x:0,y:40}];
  assert.equal(pointInPoly({x:10,y:10},p),true);
  assert.equal(pointInPoly({x:30,y:30},p),false);
  assert.equal(polygonArea(p),1200);
});
test('territory contains start circle and earns cells for an enclosed loop',()=>{
  const t=new Territory('me',GRID*.5,GRID*.5,GRID*2.8);
  assert.ok(t.count>=18);
  assert.equal(t.contains(4.5,4.5),true);
  const previous=t.count;
  const won=t.capture([{x:0,y:0},{x:120,y:0},{x:120,y:80},{x:0,y:80}]);
  assert.ok(won.length>10);
  assert.ok(t.count>previous);
  assert.equal(t.contains(100,40),true);
  assert.equal(t.capture([{x:0,y:0},{x:120,y:0},{x:120,y:80},{x:0,y:80}]).length,0);
});
test('trail starts outside and closes when actor returns',()=>{
  const actor={x:4,y:4,lastOwned:{x:4,y:4},territory:new Territory('a',4,4,20),trail:[]};
  actor.x=37;actor.y=3;updateTrail(actor);
  actor.x=70;actor.y=40;updateTrail(actor);
  actor.x=4;actor.y=4;const won=updateTrail(actor);
  assert.ok(won?.captured?.length>0);
  assert.equal(actor.trail.length,0);
});
test('trail vulnerability counts line segment hits',()=>{
  const path=[{x:0,y:0},{x:10,y:0},{x:10,y:20}];
  assert.equal(trailHit({x:9,y:13},path,3),true);
  assert.equal(trailHit({x:30,y:13},path,3),false);
});
test('limits protect against excessively large capture',()=>{
  const t=new Territory('me',0,0,20);
  const before=t.count;
  assert.equal(t.capture([{x:0,y:0},{x:100000,y:0},{x:100000,y:10000},{x:0,y:10000}]).length,0);
  assert.equal(t.count,before);
});
test('hash and cell coordinates remain deterministic at huge world coordinates',()=>{
  assert.equal(randomHash(1234567,-98765,7),randomHash(1234567,-98765,7));
  assert.deepEqual(toCell({x:-.01,y:10}),{x:-1,y:1});
});
