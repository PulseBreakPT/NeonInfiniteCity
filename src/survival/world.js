// NEON: AFTERFALL — pure deterministic open-world layout. No browser dependencies.
export const REGION = 48;
export const SEED = 260610;
export const TILE = 32;
export const AREAS = ['aldeia', 'campos', 'floresta', 'suburbio', 'prisao', 'bunker', 'industrial'];
export const ITEM_KINDS = ['comida', 'agua', 'medicamentos', 'madeira', 'metal', 'municoes', 'penso', 'combustivel'];

export function hash(x, y, seed = SEED) {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const mod = (a, b) => ((a % b) + b) % b;
export const cell = v => Math.floor(v);
export const regionOf = (x, y) => ({ rx: Math.floor(x / REGION), ry: Math.floor(y / REGION) });
export const regionKey = (rx, ry) => `${rx}:${ry}`;

export function regionKind(rx, ry, seed = SEED) {
  if (rx === 0 && ry === 0) return 'aldeia';
  if (mod(rx, 5) === 2 && mod(ry, 5) === 3) return 'prisao';
  if (mod(rx, 5) === 4 && mod(ry, 4) === 1) return 'bunker';
  const n = hash(rx, ry, seed + 815);
  if (n < .29) return 'floresta';
  if (n < .53) return 'campos';
  if (n < .72) return 'aldeia';
  if (n < .85) return 'suburbio';
  return 'industrial';
}

const fit = (n, min, max) => Math.max(min, Math.min(max, n));
function building(rx, ry, i, x, y, w, h, kind, seed, opts = {}) {
  const gx = rx * REGION + x;
  const gy = ry * REGION + y;
  const doorSide = (i + Math.floor(hash(gx, gy, seed + 8) * 4)) % 4;
  const door = doorSide === 0 ? { x: gx + Math.floor(w / 2), y: gy } :
    doorSide === 1 ? { x: gx + w - 1, y: gy + Math.floor(h / 2) } :
    doorSide === 2 ? { x: gx + Math.floor(w / 2), y: gy + h - 1 } :
    { x: gx, y: gy + Math.floor(h / 2) };
  return {
    id: `${rx}:${ry}:b${i}`, x: gx, y: gy, w, h, kind, door,
    roof: Math.floor(hash(gx, gy, seed + 283) * 3),
    color: Math.floor(hash(gx + i, gy, seed + 892) * 5),
    floors: kind === 'bloco' ? 3 : kind === 'prisao' ? 2 : 1,
    ...opts
  };
}

export function regionPlan(rx, ry, seed = SEED) {
  const kind = regionKind(rx, ry, seed);
  const r = n => hash(rx * 101 + n * 19, ry * 71 - n * 11, seed + n * 3);
  const buildings = [];
  const features = [];
  const slots = [
    [5, 6], [20, 5], [33, 6], [6, 22], [21, 22], [34, 22], [6, 35], [22, 35], [35, 35]
  ];
  let seq = 0;
  const add = (x, y, w, h, type, opts) => buildings.push(building(rx, ry, seq++, x, y, w, h, type, seed, opts));

  if (kind === 'aldeia' || kind === 'suburbio') {
    const count = kind === 'suburbio' ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const [x, y] = slots[i];
      const w = 6 + Math.floor(r(i + 2) * 3);
      const h = 5 + Math.floor(r(i + 7) * 3);
      const type = i === 2 && kind === 'aldeia' ? 'mercado' :
        i === 3 && kind === 'suburbio' ? 'bloco' : 'casa';
      add(x, y, w, h, type);
    }
    features.push({ type: 'poco', x: rx * REGION + 23, y: ry * REGION + 17 });
    features.push({ type: 'placa', x: rx * REGION + 19, y: ry * REGION + 17 });
  } else if (kind === 'campos') {
    add(7, 7, 9, 7, 'quinta');
    add(32, 7, 11, 9, 'celeiro');
    add(32, 33, 9, 8, 'armazem');
    for (let i = 0; i < 4; i++) features.push({
      type: 'horta', x: rx * REGION + 6 + (i % 2) * 11,
      y: ry * REGION + 25 + Math.floor(i / 2) * 7, w: 9, h: 5,
      crop: Math.floor(r(i + 20) * 3)
    });
    features.push({ type: 'silo', x: rx * REGION + 40, y: ry * REGION + 22 });
  } else if (kind === 'floresta') {
    if (r(7) > 0.35) add(30, 29, 7, 6, 'cabana');
    features.push({ type: 'lago', x: rx * REGION + 15, y: ry * REGION + 16, w: 8, h: 5 });
    features.push({ type: 'acampamento', x: rx * REGION + 22, y: ry * REGION + 36 });
  } else if (kind === 'prisao') {
    add(11, 10, 26, 10, 'prisao');
    add(12, 30, 13, 9, 'refeitorio');
    add(31, 29, 8, 9, 'armazem');
    features.push({ type: 'muro', x: rx * REGION + 6, y: ry * REGION + 6, w: 36, h: 37 });
    for (const [x, y] of [[7,7],[41,7],[7,42],[41,42]]) features.push({ type: 'torre', x: rx * REGION + x, y: ry * REGION + y });
  } else if (kind === 'bunker') {
    add(28, 27, 10, 8, 'abrigo');
    features.push({ type: 'bunker', x: rx * REGION + 22, y: ry * REGION + 21 });
    features.push({ type: 'antena', x: rx * REGION + 11, y: ry * REGION + 14 });
  } else if (kind === 'industrial') {
    add(8, 8, 13, 11, 'fabrica');
    add(29, 8, 13, 14, 'armazem');
    add(10, 31, 14, 10, 'oficina');
    features.push({ type: 'deposito', x: rx * REGION + 34, y: ry * REGION + 33 });
  }
  return { rx, ry, kind, buildings, features, title: ({
    aldeia: 'ALDEIA ABANDONADA', campos: 'CAMPOS AGRÍCOLAS', floresta: 'FLORESTA SILENCIOSA',
    suburbio: 'BAIRRO RESIDENCIAL', prisao: 'COMPLEXO PRISIONAL', bunker: 'ZONA MILITAR', industrial: 'ZONA INDUSTRIAL'
  })[kind] };
}

export function buildingAt(x, y, seed = SEED, cachedPlan = null) {
  const { rx, ry } = regionOf(x, y);
  // A building footprint is strictly contained in its region.
  const plan = cachedPlan || regionPlan(rx, ry, seed);
  return plan.buildings.find(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) ?? null;
}

export function terrainAt(x, y, seed = SEED) {
  const gx = cell(x), gy = cell(y);
  const { rx, ry } = regionOf(gx, gy);
  const lx = mod(gx, REGION), ly = mod(gy, REGION);
  const kind = regionKind(rx, ry, seed);
  const h = hash(gx, gy, seed + 101);
  const cross = lx >= 17 && lx <= 20 || ly >= 17 && ly <= 20;
  const road = kind !== 'floresta' && (cross || lx >= 45 && ly >= 16 && ly <= 21 || ly >= 45 && lx >= 16 && lx <= 21);
  const soil = kind === 'campos' && ((lx >= 5 && lx <= 27 && ly >= 24 && ly <= 44) || (lx > 25 && ly >= 23 && ly <= 44));
  let material = road ? 'estrada' : soil ? 'terra' : h < 0.22 ? 'terra' : h > 0.83 ? 'erva' : 'relva';
  if (kind === 'industrial' || kind === 'prisao' || kind === 'bunker') material = road ? 'estrada' : h < 0.7 ? 'cimento' : 'terra';
  return { material, variation: h, road, kind };
}

export function obstacleAt(x, y, seed = SEED, cachedPlan = null) {
  const gx = cell(x), gy = cell(y);
  const b = buildingAt(gx, gy, seed, cachedPlan);
  if (b && (gx === b.x || gy === b.y || gx === b.x + b.w - 1 || gy === b.y + b.h - 1)) {
    if (!(gx === b.door.x && gy === b.door.y)) return 'wall';
  }
  const { rx, ry } = regionOf(gx, gy);
  const plan = cachedPlan || regionPlan(rx, ry, seed);
  if (plan.kind === 'prisao') {
    const lx = mod(gx, REGION), ly = mod(gy, REGION);
    if ((lx === 6 || lx === 41) && ly >= 6 && ly <= 42 || (ly === 6 || ly === 42) && lx >= 6 && lx <= 41) {
      // Main gate on the southern approach.
      if (!(ly === 42 && lx >= 22 && lx <= 25)) return 'fence';
    }
  }
  return null;
}

export function nodeId(kind, x, y) { return `${kind}:${x}:${y}`; }

export function lootAt(x, y, seed = SEED, cachedPlan = null) {
  const gx = cell(x), gy = cell(y);
  const b = buildingAt(gx, gy, seed, cachedPlan);
  if (b) {
    const inside = gx > b.x && gy > b.y && gx < b.x + b.w - 1 && gy < b.y + b.h - 1;
    if (!inside) return null;
    const relX = gx - b.x, relY = gy - b.y;
    const spot = hash(relX + b.x * 17, relY + b.y * 19, seed + 132);
    if (spot < 0.085) {
      const kinds = b.kind === 'prisao' ? ['municoes','medicamentos','metal','penso'] :
        b.kind === 'celeiro' || b.kind === 'oficina' ? ['madeira','metal','combustivel'] :
        b.kind === 'mercado' ? ['comida','agua','comida','penso'] : ITEM_KINDS;
      return { id: nodeId('loot', gx, gy), kind: kinds[Math.floor(hash(gx, gy, seed + 111) * kinds.length)] };
    }
    return null;
  }
  const r = hash(gx, gy, seed + 606);
  if (r < 0.011) return { id: nodeId('loot', gx, gy), kind: hash(gx, gy, seed + 19) > .5 ? 'madeira' : 'comida' };
  return null;
}

export function worldObjectsAt(x, y, seed = SEED, cachedPlan = null) {
  const gx = cell(x), gy = cell(y);
  const { rx, ry } = regionOf(gx, gy);
  const plan = cachedPlan || regionPlan(rx, ry, seed);
  if (buildingAt(gx, gy, seed, plan)) return null;
  for (const f of plan.features) {
    if (f.x === gx && f.y === gy && f.type !== 'horta' && f.type !== 'muro') return f;
  }
  if (plan.kind === 'floresta' || plan.kind === 'aldeia' || plan.kind === 'campos' || plan.kind === 'suburbio') {
    const prob = plan.kind === 'floresta' ? 0.16 : plan.kind === 'campos' ? 0.025 : 0.042;
    if (!terrainAt(gx, gy, seed).road && hash(gx, gy, seed + 53) < prob) {
      return { x: gx, y: gy, type: 'arvore', size: fit(hash(gx, gy, seed + 1012) * 1.3, 0.4, 1.3) };
    }
  }
  return null;
}

export function regionMiniMap(cx, cy, seed = SEED, radius = 4) {
  const { rx, ry } = regionOf(cx, cy);
  const regions = [];
  for (let y = ry - radius; y <= ry + radius; y++) {
    for (let x = rx - radius; x <= rx + radius; x++) regions.push({ rx: x, ry: y, kind: regionKind(x, y, seed) });
  }
  return regions;
}
