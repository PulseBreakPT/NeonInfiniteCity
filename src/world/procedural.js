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
    { name: 'NÚCLEO CENTRAL', tone: 'coral', density: 1.2 },
    { name: 'BAIRRO RUBRO', tone: 'red', density: 1.05 },
    { name: 'DISTRITO ÁUREO', tone: 'gold', density: 1.0 },
    { name: 'ZONA FANTASMA', tone: 'blue', density: 0.7 }
  ][kind];
}

export function buildingAt(gx, gz, seed) {
  const base = hash2(gx, gz, seed);
  if (base < 0.075) return null;
  const district = districtAt(gx, gz, seed);
  const h = Math.max(14, Math.round((22 + Math.pow(hash2(gx + 9, gz - 4, seed), 1.6) * 162) * district.density));
  const w = 30 + hash2(gx - 3, gz + 5, seed) * 18;
  const d = 30 + hash2(gx + 11, gz - 8, seed) * 18;
  const style = Math.floor(hash2(gx + 29, gz, seed) * 5);
  return {
    gx, gz, x: (gx + 0.5) * BLOCK, z: (gz + 0.5) * BLOCK,
    height: h, width: w, depth: d, style, tone: district.tone,
    hasAntenna: hash2(gx + 25, gz + 73, seed) > 0.81,
    hasCrown: hash2(gx + 40, gz - 13, seed) > 0.61
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
      if (building) buildings.push(building);
      else parks.push({ x: (gx + 0.5) * BLOCK, z: (gz + 0.5) * BLOCK });
    }
  }
  const beaconRoll = hash2(cx, cz, seed + 819);
  let beacon = null;
  if (beaconRoll > 0.35 && buildings.length) {
    const b = buildings[Math.floor(hash2(cx + 12, cz - 15, seed) * buildings.length)];
    beacon = { id: `${seed}:${cx}:${cz}`, x: b.x, y: Math.max(82, b.height + 24), z: b.z };
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
