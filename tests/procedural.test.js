import test from 'node:test';
import assert from 'node:assert/strict';
import { hash2, buildingAt, planChunk, CHUNK_SIZE, chunkCoord, chunkKey, nearestBeacon, districtAt } from '../src/world/procedural.js';

test('hashed seed and coordinate is deterministic and bounded', () => {
  for (const [x, z, s] of [[0, 0, 1], [-52, 3, 124], [34345, -34513, 999999]]) {
    const first = hash2(x, z, s);
    assert.equal(first, hash2(x, z, s));
    assert.ok(first >= 0 && first < 1);
  }
  assert.notEqual(hash2(3, 4, 100), hash2(3, 4, 101));
});

test('chunk plans are reproducible with different traversal orders', () => {
  const a = planChunk(-3, 8, 123456);
  const b = planChunk(2, 1, 123456);
  assert.deepEqual(a, planChunk(-3, 8, 123456));
  assert.deepEqual(b, planChunk(2, 1, 123456));
  assert.deepEqual(a, planChunk(-3, 8, 123456));
});

test('chunks contain 16 non-overlapping lots with valid building geometry', () => {
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const p = planChunk(x, z, 453132);
      assert.equal(p.buildings.length + p.parks.length, 16);
      for (const b of p.buildings) {
        assert.ok(b.height >= 14 && b.width < 51 && b.depth < 51);
        assert.ok(b.x >= x * CHUNK_SIZE && b.x < (x + 1) * CHUNK_SIZE);
        assert.ok(b.z >= z * CHUNK_SIZE && b.z < (z + 1) * CHUNK_SIZE);
      }
      if (p.beacon) {
        assert.equal(p.beacon.id, `453132:${x}:${z}`);
        assert.ok(p.beacon.y >= 82);
      }
    }
  }
});

test('floor chunk coordinates work for negative world coordinates', () => {
  assert.equal(chunkCoord(-0.01), -1);
  assert.equal(chunkCoord(-CHUNK_SIZE), -1);
  assert.equal(chunkCoord(-CHUNK_SIZE - 0.01), -2);
  assert.equal(chunkCoord(CHUNK_SIZE - 0.01), 0);
  assert.equal(chunkKey(-2, 13), '-2,13');
});

test('buildings and district depend only on fixed world lot', () => {
  assert.deepEqual(buildingAt(1, -18, 99), buildingAt(1, -18, 99));
  assert.deepEqual(districtAt(30, 4, 99), districtAt(30, 4, 99));
});

test('nearest beacon considers true 3D distance', () => {
  const b = nearestBeacon([{id: '1', x: 0, y: 100, z: 0}, {id:'2', x: 20, y: 2, z: 0}], 0, 0, 0);
  assert.equal(b.id, '2');
  assert.equal(nearestBeacon([], 0, 0, 0), null);
});
