/** World generation is a pure function of seed + integer grid coordinates. */
export const BLOCK = 64;
export const BLOCKS_PER_CHUNK = 4;
export const CHUNK_SIZE = BLOCK * BLOCKS_PER_CHUNK;
export const ROAD = 13;

export function hash2(x, z, seed = 1) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function districtAt(x, z, seed) {
  const tx = Math.floor(x / 7), tz = Math.floor(z / 7);
  const kind = Math.floor(hash2(tx, tz, seed + 541) * 4);
  return [
    { name: 'NÚCLEO CENTRAL', tone: 'coral', density: 1.24, foliage: 0.55 },
    { name: 'BAIRRO RUBRO', tone: 'red', density: 1.08, foliage: 0.34 },
    { name: 'DISTRITO ÁUREO', tone: 'gold', density: 0.97, foliage: 0.62 },
    { name: 'ZONA FANTASMA', tone: 'blue', density: 0.74, foliage: 0.83 }
  ][kind];
}

export function buildingAt(gx, gz, seed) {
  const base = hash2(gx, gz, seed);
  if (base < 0.075) return null;
  const district = districtAt(gx, gz, seed);
  const h = Math.max(14, Math.round((22 + Math.pow(hash2(gx + 9, gz - 4, seed), 1.6) * 162) * district.density));
  const w = 28 + hash2(gx - 3, gz + 5, seed) * 20;
  const d = 28 + hash2(gx + 11, gz - 8, seed) * 20;
  const style = Math.floor(hash2(gx + 29, gz, seed) * 7);
  const accentIndex = Math.floor(hash2(gx + 6, gz + 12, seed + 701) * 4);
  const accent = ['amber', 'cyan', 'red', 'white'][accentIndex];
  const taper = 0.62 + hash2(gx + 4, gz - 7, seed + 88) * 0.24;
  const podiumHeight = 4 + Math.round(hash2(gx + 19, gz - 14, seed + 91) * 11);
  const roofUnitHeight = 4 + Math.round(hash2(gx + 77, gz + 3, seed + 31) * 8);
  const crownType = Math.floor(hash2(gx - 27, gz + 22, seed + 411) * 4);
  const terraceLevels = Math.floor(hash2(gx + 35, gz + 41, seed + 211) * 3);
  return {
    gx,
    gz,
    x: (gx + 0.5) * BLOCK,
    z: (gz + 0.5) * BLOCK,
    height: h,
    width: w,
    depth: d,
    style,
    tone: district.tone,
    accent,
    taper,
    podiumHeight,
    roofUnitHeight,
    crownType,
    terraceLevels,
    hasAntenna: hash2(gx + 25, gz + 73, seed) > 0.79,
    hasCrown: hash2(gx + 40, gz - 13, seed) > 0.54,
    hasHelipad: h > 115 && hash2(gx + 13, gz + 8, seed + 91) > 0.58,
    hasRibbon: style === 2 || style === 4 || style === 6,
    hasSkyGarden: hash2(gx + 93, gz - 44, seed + 57) > 0.72,
    stepped: style === 1 || style === 5,
    slender: style === 3 || style === 6
  };
}

export function planChunk(cx, cz, seed) {
  const buildings = [];
  const parks = [];
  for (let ix = 0; ix < BLOCKS_PER_CHUNK; ix++) {
    for (let iz = 0; iz < BLOCKS_PER_CHUNK; iz++) {
      const gx = cx * BLOCKS_PER_CHUNK + ix;
      const gz = cz * BLOCKS_PER_CHUNK + iz;
      const building = buildingAt(gx, gz, seed);
      if (building) {
        buildings.push(building);
      } else {
        const district = districtAt(gx, gz, seed);
        parks.push({
          gx,
          gz,
          x: (gx + 0.5) * BLOCK,
          z: (gz + 0.5) * BLOCK,
          treeCount: 3 + Math.floor(hash2(gx + 44, gz - 6, seed + 14) * (3 + district.foliage * 3)),
          hasPavilion: hash2(gx - 21, gz + 37, seed + 912) > 0.56,
          kind: hash2(gx + 9, gz + 9, seed + 445) > 0.5 ? 'grove' : 'plaza'
        });
      }
    }
  }

  const beaconRoll = hash2(cx, cz, seed + 819);
  let beacon = null;
  if (beaconRoll > 0.35 && buildings.length) {
    const ranked = [...buildings].sort((a, b) => b.height - a.height);
    const topCount = Math.max(1, Math.min(4, ranked.length));
    const b = ranked[Math.floor(hash2(cx + 12, cz - 15, seed) * topCount)];
    beacon = { id: `${seed}:${cx}:${cz}`, x: b.x, y: Math.max(82, b.height + b.roofUnitHeight + 18), z: b.z };
  }
  return { cx, cz, buildings, parks, beacon };
}

export function chunkKey(cx, cz) { return `${cx},${cz}`; }
export function chunkCoord(value) { return Math.floor(value / CHUNK_SIZE); }

export function nearestBeacon(beacons, x, y, z) {
  let closest = null;
  for (const beacon of beacons) {
    const d = Math.hypot(beacon.x - x, beacon.y - y, beacon.z - z);
    if (!closest || d < closest.distance) closest = { ...beacon, distance: d };
  }
  return closest;
}