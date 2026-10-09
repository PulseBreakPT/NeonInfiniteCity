import test from 'node:test';
import assert from 'node:assert/strict';
import { hash2, buildingAt, planChunk } from '../src/world/procedural.js';

test('architectural detail and palette remain deterministic across the world', () => {
  const accents = new Set(['amber', 'cyan', 'red', 'white']);
  const styles = new Set();
  for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) {
    const b = buildingAt(x, z, 284799);
    if (!b) continue;
    styles.add(b.style);
    assert.ok(accents.has(b.accent));
    assert.ok(b.podiumHeight >= 4 && b.roofUnitHeight >= 4);
    assert.ok(b.taper >= 0.62 && b.taper < 0.87);
    assert.ok(b.terraceLevels >= 0 && b.terraceLevels <= 2);
    assert.ok(b.width <= 48 && b.depth <= 48);
    assert.deepEqual(b, buildingAt(x, z, 284799));
  }
  assert.equal(styles.size, 7);
});

test('park vegetation and beacons are repeatable with no chunk generation state', () => {
  const seed = 7273;
  for (let cx = -5; cx <= 5; cx++) for (let cz = -5; cz <= 5; cz++) {
    const chunk = planChunk(cx, cz, seed);
    assert.deepEqual(chunk, planChunk(cx, cz, seed));
    for (const p of chunk.parks) {
      assert.ok(p.treeCount >= 3 && p.treeCount <= 8);
      assert.ok(['grove', 'plaza'].includes(p.kind));
      assert.equal(typeof p.hasPavilion, 'boolean');
      assert.ok(hash2(p.gx, p.gz, seed) < 0.075);
    }
    if (chunk.beacon) assert.ok(chunk.beacon.y > 80);
  }
});
