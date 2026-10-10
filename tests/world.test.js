import test from 'node:test';
import assert from 'node:assert/strict';
import {AREAS,SEED,REGION,hash,regionKind,regionOf,regionPlan,terrainAt,obstacleAt,buildingAt,lootAt,worldObjectsAt,regionMiniMap} from '../src/survival/world.js';

test('hash deterministic within 0 to 1 and seed sensitive',()=>{
  for(const [x,y] of [[0,0],[-21,4],[99921,-12002]]){
    assert.equal(hash(x,y,9),hash(x,y,9));
    assert.ok(hash(x,y,9)>=0 && hash(x,y,9)<1);
    assert.notEqual(hash(x,y,9),hash(x,y,10));
  }
});
test('all seven procedural region archetypes are discoverable',()=>{
  const types=new Set();
  for(let x=-14;x<14;x++)for(let y=-14;y<14;y++)types.add(regionKind(x,y,SEED));
  assert.deepEqual([...types].sort(),[...AREAS].sort());
});
test('initial world is a village with open, walkable spawn',()=>{
  assert.equal(regionKind(0,0,SEED),'aldeia');
  assert.equal(obstacleAt(18,23,SEED),null);
  const plan=regionPlan(0,0,SEED);
  assert.ok(plan.buildings.length>=5);
});
test('regions generated deterministically, including negative coordinates',()=>{
  for(const [x,y] of [[0,0],[-7,19],[17,-3]]){
    const a=regionPlan(x,y,SEED);assert.deepEqual(a,regionPlan(x,y,SEED));
    for(const b of a.buildings){
      assert.ok(b.x>=x*REGION&&b.x+b.w<=(x+1)*REGION);
      assert.ok(b.y>=y*REGION&&b.y+b.h<=(y+1)*REGION);
      assert.ok(b.door.x>=b.x&&b.door.x<b.x+b.w);
      assert.ok(b.door.y>=b.y&&b.door.y<b.y+b.h);
      assert.equal(obstacleAt(b.door.x,b.door.y,SEED),null);
    }
  }
  assert.deepEqual(regionOf(-1,-1),{rx:-1,ry:-1});
});
test('prison walls exist and main gate is passable',()=>{
  const plan=regionPlan(2,3,SEED);
  assert.equal(plan.kind,'prisao');
  assert.equal(obstacleAt(2*REGION+6,3*REGION+9,SEED),'fence');
  assert.equal(obstacleAt(2*REGION+22,3*REGION+42,SEED),null);
});
test('bunkers contain hatch and underground structure',()=>{
  const plan=regionPlan(4,1,SEED);
  assert.equal(plan.kind,'bunker');
  assert.ok(plan.features.find(f=>f.type==='bunker'));
  assert.ok(plan.buildings.find(b=>b.kind==='abrigo'));
});
test('terrain, homes, loot and minimap stay in valid ranges',()=>{
  const a=regionPlan(0,0,SEED),b=a.buildings[0];
  assert.equal(buildingAt(b.x+1,b.y+1,SEED)?.id,b.id);
  assert.ok(['estrada','erva','relva','terra','cimento'].includes(terrainAt(10,11,SEED).material));
  for(let x=b.x+1;x<b.x+b.w-1;x++)for(let y=b.y+1;y<b.y+b.h-1;y++){
    const l=lootAt(x,y,SEED);if(l)assert.ok(l.id.startsWith('loot:'));
  }
  assert.equal(regionMiniMap(0,0,SEED,4).length,81);
  assert.equal(worldObjectsAt(b.x+1,b.y+1,SEED),null);
});

test('world props stay deterministic and within known types',()=>{const kinds=new Set(['arvore','poco','placa','acampamento','silo','deposito','bunker','torre','antena','carro','poste','caixote','arbusto']);for(let x=-30;x<80;x+=3)for(let y=-20;y<80;y+=3){const a=worldObjectsAt(x,y,SEED);assert.deepEqual(a,worldObjectsAt(x,y,SEED));if(a)assert.ok(kinds.has(a.type));}});
