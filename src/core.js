/** ATLAS.IO: deterministic geometry and rule engine. No DOM or Leaflet dependency. */
export const R = 6378137;
export const EARTH = 2 * Math.PI * R;
export const GRID = 9;
export const MAX_LAT = 85.05112878;
export const LIMIT = 11000;
export const CITIES = Object.freeze([
  { name: 'Lisboa', country: 'Portugal', lat: 38.7223, lng: -9.1393, emoji: '🇵🇹' },
  { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291, emoji: '🇵🇹' },
  { name: 'Faro', country: 'Portugal', lat: 37.0194, lng: -7.9304, emoji: '🇵🇹' },
  { name: 'Londres', country: 'Reino Unido', lat: 51.5072, lng: -0.1276, emoji: '🇬🇧' },
  { name: 'Nova Iorque', country: 'Estados Unidos', lat: 40.7128, lng: -74.0060, emoji: '🇺🇸' },
  { name: 'Tóquio', country: 'Japão', lat: 35.6762, lng: 139.6503, emoji: '🇯🇵' },
  { name: 'São Paulo', country: 'Brasil', lat: -23.5505, lng: -46.6333, emoji: '🇧🇷' },
  { name: 'Sydney', country: 'Austrália', lat: -33.8688, lng: 151.2093, emoji: '🇦🇺' },
  { name: 'Paris', country: 'França', lat: 48.8566, lng: 2.3522, emoji: '🇫🇷' },
  { name: 'Dubai', country: 'EAU', lat: 25.2048, lng: 55.2708, emoji: '🇦🇪' },
  { name: 'Rio de Janeiro', country: 'Brasil', lat: -22.9068, lng: -43.1729, emoji: '🇧🇷' },
  { name: 'Maputo', country: 'Moçambique', lat: -25.9655, lng: 32.5832, emoji: '🇲🇿' }
]);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const randomHash = (a, b, seed = 1) => {
  let h = Math.imul(Math.floor(a) ^ seed, 0x27d4eb2d) ^ Math.imul(Math.floor(b) | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
export function project(lat, lng) {
  const bounded = clamp(Number(lat) || 0, -MAX_LAT, MAX_LAT);
  return { x: R * Number(lng || 0) * Math.PI / 180, y: R * Math.log(Math.tan(Math.PI / 4 + bounded * Math.PI / 360)) };
}
export function unproject(x, y) {
  const lng = ((((x / R * 180 / Math.PI) + 180) % 360) + 360) % 360 - 180;
  return { lat: clamp((2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI, -MAX_LAT, MAX_LAT), lng };
}
export function wrapDx(dx) { return ((dx + EARTH / 2) % EARTH + EARTH) % EARTH - EARTH / 2; }
export function cellKey(ix, iy) { return `${ix},${iy}`; }
export function toCell(p) { return { x: Math.floor(p.x / GRID), y: Math.floor(p.y / GRID) }; }
export function cellCenter(ix, iy) { return { x: (ix + .5) * GRID, y: (iy + .5) * GRID }; }
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function pointInPoly(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function polygonArea(vertices) {
  let twice = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) * .5;
}
export function distanceToSegment(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}
export class Territory {
  constructor(owner, x, y, radius = 30) {
    this.owner = owner;
    this.cells = new Set();
    if (radius > 0) this.addCircle(x, y, radius);
  }
  contains(x, y) {
    const c = toCell({ x, y });
    return this.cells.has(cellKey(c.x, c.y));
  }
  get count() { return this.cells.size; }
  addCircle(x, y, radius) {
    const loX = Math.floor((x - radius) / GRID), hiX = Math.ceil((x + radius) / GRID);
    const loY = Math.floor((y - radius) / GRID), hiY = Math.ceil((y + radius) / GRID);
    for (let ix = loX; ix <= hiX; ix++) for (let iy = loY; iy <= hiY; iy++) {
      const c = cellCenter(ix, iy);
      if (Math.hypot(c.x - x, c.y - y) <= radius) this.cells.add(cellKey(ix, iy));
    }
  }
  /** Add enclosed cells plus the swept trail. Returns only newly acquired cell keys. */
  capture(path) {
    if (!Array.isArray(path) || path.length < 3) return [];
    const xs = path.map(p => p.x), ys = path.map(p => p.y);
    const loX = Math.floor(Math.min(...xs) / GRID), hiX = Math.ceil(Math.max(...xs) / GRID);
    const loY = Math.floor(Math.min(...ys) / GRID), hiY = Math.ceil(Math.max(...ys) / GRID);
    const candidates = (hiX - loX + 1) * (hiY - loY + 1);
    if (candidates > 8000) return [];
    const added = [];
    const add = (ix, iy) => {
      if (this.cells.size >= LIMIT) return;
      const key = cellKey(ix, iy);
      if (!this.cells.has(key)) { this.cells.add(key); added.push(key); }
    };
    for (let ix = loX; ix <= hiX; ix++) for (let iy = loY; iy <= hiY; iy++) {
      if (pointInPoly(cellCenter(ix, iy), path)) add(ix, iy);
    }
    for (let n = 1; n < path.length; n++) {
      const a = path[n - 1], b = path[n], len = distance(a, b);
      for (let k = 0; k <= Math.ceil(len / (GRID / 2)); k++) {
        const t = k / Math.max(1, Math.ceil(len / (GRID / 2)));
        const c = toCell({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        add(c.x, c.y);
      }
    }
    return added;
  }
}
export function updateTrail(actor) {
  const home = actor.territory.contains(actor.x, actor.y);
  if (home) {
    if (actor.trail.length > 2) {
      const points = [...actor.trail, { x: actor.x, y: actor.y }];
      const added = actor.territory.capture(points);
      actor.trail = [];
      actor.lastOwned = { x: actor.x, y: actor.y };
      return { captured: added };
    }
    actor.trail = [];
    actor.lastOwned = { x: actor.x, y: actor.y };
    return null;
  }
  if (actor.trail.length === 0) actor.trail.push({ ...(actor.lastOwned || { x: actor.x, y: actor.y }) });
  const last = actor.trail[actor.trail.length - 1];
  if (distance(last, actor) >= GRID * .47) actor.trail.push({ x: actor.x, y: actor.y });
  if (actor.trail.length > 260) return { overextended: true };
  return null;
}
export function trailHit(point, trail, radius = 5) {
  if (!trail?.length) return false;
  for (let i = 1; i < trail.length; i++) {
    if (distanceToSegment(point, trail[i - 1], trail[i]) < radius) return true;
  }
  return false;
}
