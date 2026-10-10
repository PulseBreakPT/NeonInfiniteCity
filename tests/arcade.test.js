import test from 'node:test';
import assert from 'node:assert/strict';
import {steering,speedForMass,radiusForMass,SpatialHash,botTarget,AdaptiveQuality} from '../src/arcade.js';
test('steering is bounded per fixed tick and independent of frame split',()=>{
 let dir={x:0,y:1};for(let i=0;i<60;i++)dir=steering(dir,{x:1,y:0},7,1/60);
 assert.ok(Math.abs(dir.x-1)<1e-6);
 const first=steering({x:1,y:0},{x:-1,y:0},5,1/60);
 assert.ok(first.x>0.99,'cannot teleport through a 180° turn');
});
test('growth creates a visible risk/reward tradeoff',()=>{
 assert.ok(radiusForMass(150)>radiusForMass(20));
 assert.ok(speedForMass(150)<speedForMass(20));
 assert.ok(speedForMass(20,true)>speedForMass(20,false));
 assert.ok(speedForMass(2000)>20);
});
test('spatial hash handles negatives and cell boundaries',()=>{
 const items=[{x:-51,y:-2,id:1},{x:-1,y:4,id:2},{x:50,y:0,id:3}];
 const hash=new SpatialHash(50).build(items);
 assert.deepEqual(hash.near(-50,0,6).map(x=>x.id),[1]);
 assert.deepEqual(hash.near(0,0,5).map(x=>x.id),[2]);
 assert.deepEqual(hash.near(40,0,12).map(x=>x.id),[3]);
});
test('bots flee a much larger rival and hunt vulnerable exposed trails',()=>{
 const bot={id:'bot-1',x:0,y:0,origin:{x:0,y:0},phase:0,excursion:0,mass:25};
 const player={x:30,y:0,mass:100,trail:[{x:12,y:2}]};
 assert.equal(botTarget(bot,player,1).mode,'flee');
 player.mass=15;player.trail=Array.from({length:10},(_,i)=>({x:i+1,y:0}));
 assert.equal(botTarget(bot,player,1).mode,'hunt');
 bot.excursion=3;assert.equal(botTarget(bot,player,1).mode,'return');
});
test('adaptive quality only adjusts after sustained pressure and has bounds',()=>{
 const q=new AdaptiveQuality();
 for(let i=0;i<150;i++)q.observe(35);
 assert.ok(q.scale<1);
 for(let i=0;i<4500;i++)q.observe(42);
 assert.ok(q.scale>=.67);
 for(let i=0;i<4500;i++)q.observe(12);
 assert.ok(q.scale<=1);
});
