/** ATLAS.IO: deterministic geometry and rule engine. No DOM or Leaflet dependency. */
export const R = 6378137;
export const EARTH = 2 * Math.PI * R;
export const GRID = 9; // score unit only: territory is continuous geometry
export const MAX_CAPTURE_AREA = 1000000;
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
  { name: 'Maputo', country: 'Moçambique', lat: -25.9655, lng: 32.5832, emoji: '🇲🇿' },
  { name: 'Madrid', country: 'Espanha', lat: 40.4168, lng: -3.7038, emoji: '🇪🇸' },
  { name: 'Berlim', country: 'Alemanha', lat: 52.52, lng: 13.405, emoji: '🇩🇪' },
  { name: 'Roma', country: 'Itália', lat: 41.9028, lng: 12.4964, emoji: '🇮🇹' },
  { name: 'Cidade do México', country: 'México', lat: 19.4326, lng: -99.1332, emoji: '🇲🇽' },
  { name: 'Cairo', country: 'Egito', lat: 30.0444, lng: 31.2357, emoji: '🇪🇬' },
  { name: 'Seul', country: 'Coreia do Sul', lat: 37.5665, lng: 126.978, emoji: '🇰🇷' },
  { name: 'Mumbai', country: 'Índia', lat: 19.076, lng: 72.8777, emoji: '🇮🇳' },
  { name: 'Cidade do Cabo', country: 'África do Sul', lat: -33.9249, lng: 18.4241, emoji: '🇿🇦' },
  { name: 'Toronto', country: 'Canadá', lat: 43.6532, lng: -79.3832, emoji: '🇨🇦' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, emoji: '🇦🇷' },
  { name: 'Banguecoque', country: 'Tailândia', lat: 13.7563, lng: 100.5018, emoji: '🇹🇭' },
  { name: 'Singapura', country: 'Singapura', lat: 1.3521, lng: 103.8198, emoji: '🇸🇬' }
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
  if(vertices.length<3)return 0;
  // Translate to local origin before Shoelace: Mercator world coordinates can
  // be +/- 20 million metres, where products otherwise lose numerical precision.
  const origin=vertices[0];let twice=0;
  for(let i=1;i<vertices.length-1;i++){
    const a=vertices[i],b=vertices[i+1];
    twice+=(a.x-origin.x)*(b.y-origin.y)-(b.x-origin.x)*(a.y-origin.y);
  }
  return Math.abs(twice)*.5;
}
export function distanceToSegment(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}
export function polygonBounds(points) {
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};
}
export function circlePolygon(x,y,radius,sides=48) {
  return Array.from({length:sides},(_,i)=>({x:x+Math.cos(i*2*Math.PI/sides)*radius,y:y+Math.sin(i*2*Math.PI/sides)*radius}));
}
function estimateArea(points,test) {
  const b=polygonBounds(points),w=b.maxX-b.minX,h=b.maxY-b.minY;
  if(w<=0||h<=0)return 0;
  // Adaptive bounded area sampling: max 2304 samples instead of 25600, preventing capture freezes.
  const nx=Math.max(8,Math.min(48,Math.ceil(w/6))),ny=Math.max(8,Math.min(48,Math.ceil(h/6)));
  let n=0;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++) {
    const p={x:b.minX+(i+.5)*w/nx,y:b.minY+(j+.5)*h/ny};
    if(pointInPoly(p,points)&&test(p))n++;
  }
  return n*w*h/(nx*ny);
}
/** Free-form territory: chronological polygon union / subtraction operations.
 * Raster cells are never used for geometry, ownership, or rendering.
 */
export class Territory {
  constructor(owner,x,y,radius=30) {
    this.owner=owner;this.ops=[];this.area=0;this.index=new Map();this.indexSize=160;
    if(radius>0)this.addCircle(x,y,radius);
  }
  indexOperation(op) {
    const id=this.ops.length;
    this.ops.push(op);
    const b=op.bounds,s=this.indexSize;
    for(let x=Math.floor(b.minX/s);x<=Math.floor(b.maxX/s);x++)
      for(let y=Math.floor(b.minY/s);y<=Math.floor(b.maxY/s);y++){
        const key=`${x}:${y}`;
        if(!this.index.has(key))this.index.set(key,[]);
        this.index.get(key).push(id);
      }
  }
  contains(x,y) {
    const p={x,y},s=this.indexSize;
    const ids=this.index.get(`${Math.floor(x/s)}:${Math.floor(y/s)}`);
    if(!ids)return false;
    for(let k=ids.length-1;k>=0;k--){
      const op=this.ops[ids[k]],b=op.bounds;
      if(x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY&&pointInPoly(p,op.points))return op.type==='add';
    }
    return false;
  }
  get count(){return Math.max(0,Math.round(this.area/(GRID*GRID)));}
  addCircle(x,y,radius){return this.capture(circlePolygon(x,y,radius));}
  capture(path) {
    if(!Array.isArray(path)||path.length<3||path.length>300||this.ops.length>=1600)return null;
    if(!path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
    const points=path.map(p=>({x:p.x,y:p.y})),b=polygonBounds(points),raw=polygonArea(points);
    if(raw<3||raw>MAX_CAPTURE_AREA||b.maxX-b.minX>1600||b.maxY-b.minY>1600)return null;
    const area=estimateArea(points,p=>!this.contains(p.x,p.y));
    if(area<2)return null;
    this.indexOperation({type:'add',points,bounds:b});this.area+=area;
    return {points,area};
  }
  erase(points) {
    if(!Array.isArray(points)||points.length<3||!this.ops.length||this.ops.length>=1600)return 0;
    const area=estimateArea(points,p=>this.contains(p.x,p.y));
    if(area<2)return 0;
    const copy=points.map(p=>({x:p.x,y:p.y}));
    this.indexOperation({type:'cut',points:copy,bounds:polygonBounds(copy)});
    this.area=Math.max(0,this.area-area);
    return area;
  }
  clear(){this.ops=[];this.area=0;this.index.clear();}
}
export function updateTrail(actor) {
  const home=actor.territory.contains(actor.x,actor.y);
  if(home) {
    if(actor.trail.length>2) {
      const captured=actor.territory.capture([...actor.trail,{x:actor.x,y:actor.y}]);
      actor.trail=[];actor.lastOwned={x:actor.x,y:actor.y};
      return captured?{captured}:null;
    }
    actor.trail=[];actor.lastOwned={x:actor.x,y:actor.y};return null;
  }
  if(!actor.trail.length)actor.trail.push({...actor.lastOwned||{x:actor.x,y:actor.y}});
  if(distance(actor.trail.at(-1),actor)>=4.2)actor.trail.push({x:actor.x,y:actor.y});
  if(actor.trail.length>260)return {overextended:true};
  return null;
}
export function trailHit(point, trail, radius = 5) {
  if (!trail?.length) return false;
  for (let i = 1; i < trail.length; i++) {
    if (distanceToSegment(point, trail[i - 1], trail[i]) < radius) return true;
  }
  return false;
}

/** Closest distance between two segments, including crossing and endpoint touches. */
export function segmentDistance(a,b,c,d) {
  const cross=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  if((ab1===0&&distanceToSegment(c,a,b)<1e-8)||(ab2===0&&distanceToSegment(d,a,b)<1e-8)||
     (cd1===0&&distanceToSegment(a,c,d)<1e-8)||(cd2===0&&distanceToSegment(b,c,d)<1e-8)||
     (ab1*ab2<0&&cd1*cd2<0))return 0;
  return Math.min(distanceToSegment(a,c,d),distanceToSegment(b,c,d),distanceToSegment(c,a,b),distanceToSegment(d,a,b));
}
/** Swept collision detects fast-moving actors passing through trails between frames. */
export function trailHitSweep(from,to,trail,radius=5,ignoreLast=0) {
  if(!trail||trail.length<2)return false;
  for(let i=1;i<trail.length-ignoreLast;i++) {
    if(segmentDistance(from,to,trail[i-1],trail[i])<radius)return true;
  }
  return false;
}
