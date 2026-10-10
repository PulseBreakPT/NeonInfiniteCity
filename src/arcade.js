/** ATLAS.IO — reusable real-time arcade mechanics; no network or DOM dependencies. */
export const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function steering(current, target, radiansPerSecond, dt) {
  const a = Math.atan2(current.y, current.x);
  const b = Math.atan2(target.y, target.x);
  if (!Number.isFinite(b) || Math.hypot(target.x, target.y) < 0.0001) return {...current};
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const rotated = a + clamp(delta, -radiansPerSecond * dt, radiansPerSecond * dt);
  return {x: Math.cos(rotated), y: Math.sin(rotated)};
}
export function speedForMass(mass, boosting = false, base = 40) {
  const slowdown = 1 / (1 + Math.max(0, mass - 20) * 0.0024);
  return base * Math.max(0.72, slowdown) * (boosting ? 1.53 : 1);
}
export function radiusForMass(mass, isPlayer = false) {
  return (isPlayer ? 10.4 : 9) + Math.min(isPlayer ? 8 : 6, Math.sqrt(Math.max(1,mass)) * .43);
}
/** Broadphase collision buckets. Positions are absolute Web-Mercator metres. */
export class SpatialHash {
  constructor(cell = 48) { this.cell = cell; this.buckets = new Map(); }
  key(x, y) { return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`; }
  build(items) {
    this.buckets.clear();
    for (const item of items) {
      const k = this.key(item.x,item.y);
      if (!this.buckets.has(k)) this.buckets.set(k,[]);
      this.buckets.get(k).push(item);
    }
    return this;
  }
  near(x,y,radius) {
    const minX=Math.floor((x-radius)/this.cell),maxX=Math.floor((x+radius)/this.cell);
    const minY=Math.floor((y-radius)/this.cell),maxY=Math.floor((y+radius)/this.cell);
    const out=[];
    for(let iy=minY;iy<=maxY;iy++)for(let ix=minX;ix<=maxX;ix++){
      const list=this.buckets.get(`${ix},${iy}`);
      if(list)for(const item of list){
        if(Math.abs(item.x-x)<=radius&&Math.abs(item.y-y)<=radius)out.push(item);
      }
    }
    return out;
  }
}
/** Stable bot decisions: pressure a vulnerable trail, flee stronger opponents, or patrol in arcs. */
export function botTarget(bot, player, time) {
  const dx=player.x-bot.x,dy=player.y-bot.y;
  const playerDistance=Math.hypot(dx,dy);
  const vx=bot.origin.x-bot.x,vy=bot.origin.y-bot.y;
  const homeDistance=Math.hypot(vx,vy);
  if (playerDistance<65 && player.mass>bot.mass*1.45)
    return {x:-dx, y:-dy, mode:'flee'};
  if(bot.excursion>1.7 || homeDistance>110)
    return {x:vx, y:vy, mode:'return'};
  if(player.trail.length>5 && playerDistance<140 && bot.mass>player.mass*.78){
    const nearest=player.trail[Math.max(0,player.trail.length-5)] || player;
    return {x:nearest.x-bot.x,y:nearest.y-bot.y,mode:'hunt'};
  }
  const a=bot.phase * .62 + Number(bot.id.split('-')[1])*1.6;
  const tangential=bot.excursion<.35 ? 0.8 : 0.3;
  return {x:Math.cos(a)*tangential + vx*.014,y:Math.sin(a)*tangential + vy*.014,mode:'patrol'};
}
/** Limits Canvas cost for low-FPS devices without modifying simulation timing. */
export class AdaptiveQuality {
  constructor(){this.scale=1;this.frames=0;this.sum=0;this.cooldown=0;}
  observe(frameMs){
    if(!Number.isFinite(frameMs)||frameMs<1||frameMs>100)return false;
    this.frames++;this.sum+=frameMs;
    if(this.frames<150)return false;
    const avg=this.sum/this.frames;
    this.frames=0;this.sum=0;
    if(this.cooldown>0){this.cooldown--;return false;}
    const before=this.scale;
    if(avg>23) this.scale=Math.max(.67,Math.round((this.scale-.13)*100)/100);
    else if(avg<17) this.scale=Math.min(1,Math.round((this.scale+.09)*100)/100);
    if(before!==this.scale)this.cooldown=1;
    return before!==this.scale;
  }
}
