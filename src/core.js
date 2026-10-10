export const SIZE=42;
export const SAVE_KEY='ultimo-abrigo-v1';
export const ITEM_NAMES={food:'Conservas',water:'Água',medkit:'Kit médico',fuel:'Combustível',parts:'Peças'};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function project(x,y){return{x:(x-y)*48,y:(x+y)*24};}
export function unproject(x,y){return{x:x/96+y/48,y:y/48-x/96};}
export function inside(p,b,pad=0){return p.x>b.x-pad&&p.x<b.x+b.w+pad&&p.y>b.y-pad&&p.y<b.y+b.h+pad;}
export function createWorld(){
 const random=rng(41026),buildings=[
  {id:'shelter',name:'ABRIGO',x:8,y:7,w:7,h:6,color:'#888975',roof:'#5b6256',floor:10,door:11.5},
  {id:'clinic',name:'CLÍNICA',x:26,y:7,w:6,h:6,color:'#b7b7a5',roof:'#56686b',floor:11,door:29},
  {id:'market',name:'MERCEARIA',x:8,y:27,w:7,h:6,color:'#ab9276',roof:'#785e48',floor:8,door:11.5},
  {id:'workshop',name:'OFICINA',x:26,y:26,w:7,h:7,color:'#8a9089',roof:'#555956',floor:15,door:29.5}
 ];
 const walls=[];
 for(const b of buildings){
  walls.push({x:b.x,y:b.y,w:b.w,h:.16},{x:b.x,y:b.y,w:.16,h:b.h},{x:b.x+b.w-.16,y:b.y,w:.16,h:b.h},{x:b.x,y:b.y+b.h-.16,w:b.door-b.x-.85,h:.16},{x:b.door+.85,y:b.y+b.h-.16,w:b.x+b.w-b.door-.85,h:.16});
 }
 const props=[],add=(type,x,y,extra={})=>props.push({id:'p'+props.length,type,x,y,r:[.32,.23,.25,.4,.14,.6,.35,.2,.5,.5,.19,.3,.35,.25,0,0][type],...extra});
 // Every prop from the original atlas is used.
 add(8,9.7,8.4);add(9,12.5,9);add(10,12.5,10);add(11,13.8,8);add(13,8.7,10);add(0,9.1,11,{loot:{water:1,food:1},label:'Réserve du refuge'});
 add(9,27.5,8.5);add(13,30.8,8.2);add(0,27.5,10.5,{loot:{medkit:2,water:1},label:'Armoire médicale'});add(8,30.8,10.6);
 add(9,9.5,28.6);add(11,13.5,28.3);add(0,10.5,30.2,{loot:{food:3,water:3},label:'Réserve alimentaire'});add(10,9.5,30.5);add(2,14.8,34);
 add(12,30.8,27.2,{generator:true,r:.35});add(13,27,27);add(3,27.8,28.8);add(0,27.4,30.9,{loot:{fuel:1,parts:2},label:'Caisse de pièces'});add(1,31.8,31.8);add(7,28.6,27.5);
 add(5,18.3,15);add(5,22.8,24);add(4,20,15);add(4,21.4,24);add(6,16.5,15);add(15,23.3,23);add(1,24,28);add(2,16.4,22);
 add(0,6,20,{loot:{parts:1,medkit:1},label:'Caixa abandonada'});add(0,35,19,{loot:{fuel:1,water:2},label:'Reserva da estrada'});
 const trees=[];
 for(let i=0;i<185;i++){
  const x=1+random()*40,y=1+random()*40;
  if((x>17&&x<24)||(y>17&&y<23)||buildings.some(b=>inside({x,y},b,2)))continue;
  if(random()<.6)trees.push({x,y,r:.23,height:80+random()*65,variant:random()});else add(14,x,y,{r:0,scale:.55+random()*.5});
 }
 const enemies=[{x:20,y:27},{x:22,y:10},{x:14,y:23},{x:33,y:23},{x:20,y:35},{x:6,y:25},{x:35,y:15},{x:24,y:32}].map((p,i)=>({...p,home:{...p},id:i,phase:i*2,direction:0,moving:false}));
 return{buildings,walls,props,trees,enemies};
}
export function createState(character='male'){
 return{version:1,player:{x:11.5,y:15,health:100,stamina:100,character,direction:0,moving:false,running:false,step:0,invulnerable:0},inventory:{food:0,water:0,medkit:1,fuel:0,parts:0},found:{food:0,water:0,medkit:0},collected:[],generator:false,won:false,dead:false,time:0,steps:0};
}
export function blocked(world,x,y,r=.2){
 if(x<.6||y<.6||x>SIZE-.6||y>SIZE-.6)return true;
 for(const b of world.walls){if(x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h)return true;}
 for(const p of [...world.props,...world.trees]){if(p.r&&Math.hypot(x-p.x,y-p.y)<r+p.r)return true;}
 return false;
}
export function move(world,p,dx,dy){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));let moved=0;
 for(let i=0;i<n;i++){const a=p.x,b=p.y;if(!blocked(world,p.x+dx/n,p.y))p.x+=dx/n;if(!blocked(world,p.x,p.y+dy/n))p.y+=dy/n;moved+=Math.hypot(a-p.x,b-p.y);}
 return moved;
}
export function direction(dx,dy){const sx=dx-dy,sy=dx+dy;return sy>=0?(sx>=0?0:1):(sx<0?2:3);}
export function update(state,world,input,dt){
 if(state.dead||state.won)return;
 dt=clamp(dt,0,.05);state.time+=dt;const p=state.player;
 p.invulnerable=Math.max(0,p.invulnerable-dt);
 const norm=Math.hypot(input.x,input.y);let dx=0,dy=0;
 if(norm>.1){dx=input.x/norm+2*input.y/norm;dy=2*input.y/norm-input.x/norm;const len=Math.hypot(dx,dy);dx/=len;dy/=len;p.direction=direction(dx,dy);}
 p.running=!!input.run&&norm>.1&&p.stamina>2;
 const speed=p.running?3.1:1.55;const moved=move(world,p,dx*speed*dt,dy*speed*dt);
 p.moving=moved>.0001;p.stamina=clamp(p.stamina+(p.running&&p.moving?-24:15)*dt,0,100);p.step+=moved*(p.running?3.4:4);state.steps+=moved;
 for(const e of world.enemies){
  e.phase+=dt;const d=distance(e,p);let tx,ty;
  const safe=inside(p,world.buildings[0],.7);
  if(d<(p.running?8:5)&&!safe){tx=p.x;ty=p.y;}else{tx=e.home.x+Math.cos(e.phase*.23+e.id)*2;ty=e.home.y+Math.sin(e.phase*.19+e.id)*2;}
  let ex=tx-e.x,ey=ty-e.y,l=Math.hypot(ex,ey);e.moving=l>.1;
  if(l>.1){ex/=l;ey/=l;e.direction=direction(ex,ey);move(world,e,ex*dt*.62,ey*dt*.62);}
  if(distance(e,p)<.56&&p.invulnerable<=0&&!safe){p.health=clamp(p.health-12,0,100);p.invulnerable=1.6;}
 }
 if(p.health<=0)state.dead=true;
}
// Clip the segment against each wall; props do not block reaching their own contents.
export function clearReach(world,a,b){
 return !world.walls.some(w=>{
  let lo=0,hi=1;
  for(const [origin,delta,min,max]of[[a.x,b.x-a.x,w.x,w.x+w.w],[a.y,b.y-a.y,w.y,w.y+w.h]]){
   if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false;continue;}
   let enter=(min-origin)/delta,leave=(max-origin)/delta;
   if(enter>leave)[enter,leave]=[leave,enter];
   lo=Math.max(lo,enter);hi=Math.min(hi,leave);if(lo>hi)return false;
  }
  return true;
 });
}
export function nearby(state,world){
 const p=state.player,options=world.props.filter(o=>((o.loot&&!state.collected.includes(o.id))||o.generator)&&distance(o,p)<1.55&&clearReach(world,p,o)).sort((a,b)=>distance(a,p)-distance(b,p));
 if(options.length)return options[0];
 const b=world.buildings[0];if(inside(p,b)&&state.generator)return{id:'shelter',finish:true,x:p.x,y:p.y};
 return null;
}
export function interact(state,world){
 if(state.dead||state.won)return{ok:false,text:'A expedição terminou.'};
 const o=nearby(state,world);if(!o)return{ok:false,text:'Aproxima-te de uma caixa ou do gerador.'};
 if(o.finish){if(state.found.food>=1&&state.found.water>=1&&state.found.medkit>=1){state.won=true;return{ok:true,text:'O abrigo está pronto. Sobreviveste ao primeiro dia.'};}return{ok:false,text:'Ainda precisas de encontrar comida, água e material médico.'};}
 if(o.generator){if(state.generator)return{ok:false,text:'O gerador já está a funcionar. Regressa ao abrigo.'};if(state.inventory.fuel<1||state.inventory.parts<2)return{ok:false,text:'Precisas de 1 combustível e 2 peças.'};state.inventory.fuel--;state.inventory.parts-=2;state.generator=true;return{ok:true,text:'Gerador ligado. Regressa ao abrigo.'};}
 for(const [k,v]of Object.entries(o.loot)){state.inventory[k]+=v;if(k in state.found)state.found[k]+=v;}
 state.collected.push(o.id);return{ok:true,text:Object.entries(o.loot).map(([k,v])=>`+${v} ${ITEM_NAMES[k]}`).join(' · ')};
}
export function useItem(state,item){
 if(!['food','water','medkit'].includes(item)||state.inventory[item]<=0||state.dead||state.won)return false;
 if(item==='water'?state.player.stamina>=100:state.player.health>=100)return false;
 state.inventory[item]--;if(item==='medkit')state.player.health=clamp(state.player.health+45,0,100);if(item==='food')state.player.health=clamp(state.player.health+18,0,100);if(item==='water')state.player.stamina=100;return true;
}
export function objectives(s){return[{text:'Encontrar água e conservas',done:s.found.food>0&&s.found.water>0,target:'market'},{text:'Recolher material médico',done:s.found.medkit>0,target:'clinic'},{text:'Reparar o gerador da oficina',done:s.generator,target:'workshop'},{text:'Regressar ao abrigo',done:s.won,target:'shelter'}];}
export function serialize(state){return JSON.stringify(state);}
export function restore(raw,world){
 try{
  const s=JSON.parse(raw);if(s.version!==1||!s.player||!['male','female'].includes(s.player.character))return null;
  const nums=[s.player.x,s.player.y,s.player.health,s.player.stamina,s.time,s.steps];if(!nums.every(Number.isFinite)||s.time<0||s.steps<0||blocked(world,s.player.x,s.player.y))return null;
  if(s.player.health<=0||s.player.health>100||s.player.stamina<0||s.player.stamina>100||s.dead||typeof s.generator!=='boolean'||typeof s.won!=='boolean')return null;
  for(const k of Object.keys(ITEM_NAMES))if(!Number.isInteger(s.inventory?.[k])||s.inventory[k]<0||s.inventory[k]>100)return null;
  for(const k of ['food','water','medkit'])if(!Number.isInteger(s.found?.[k])||s.found[k]<0||s.found[k]>100)return null;
  if(!Array.isArray(s.collected)||!s.collected.every(id=>world.props.some(p=>p.id===id&&p.loot)))return null;
  s.player={...createState().player,...s.player,moving:false,running:false,step:0,invulnerable:0,direction:0};return s;
 }catch{return null;}
}
