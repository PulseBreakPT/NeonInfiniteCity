// Premium500: deterministic isometric set dressing. No external dependencies.
export const PACK_COUNT=500;
export const SHEET_COUNT=10;
export const PACK_ROOT='assets/premium500/';
export function tileAsset(type,hash){
 const ranges=[[0,24],[0,24],[24,18],[76,14],[106,14],[42,18],[42,18],[60,16],[60,16],[106,14],[106,14],[60,16],[90,16],[90,16],[24,18],[106,14]];
 const [offset,count]=ranges[type]||ranges[0];return offset+((hash>>>0)%count);
}
function randomSource(seed){
 return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function inBuilding(b,x,y,pad=0){return x>b.x-pad&&x<b.x+b.w+pad&&y>b.y-pad&&y<b.y+b.h+pad;}
export function createScenery(world){
 const rand=randomSource(20261011),nodes=[],original=[...world.props,...world.trees];
 // The 120 ground assets are placed per-tile. Each remaining index is placed in the world.
 for(let id=120;id<PACK_COUNT;id++){
  const cat=id<240?'natureza':id<300?'arquitetura':id<365?'interior':id<400?'veiculos':id<445?'urbano':id<480?'sobrevivencia':'personagens';
  let x=0,y=0,found=false;
  for(let attempt=0;attempt<100;attempt++){
   if(cat==='interior'){
    const b=world.buildings[(id-300)%world.buildings.length];
    x=b.x+.9+rand()*(b.w-1.8);y=b.y+.9+rand()*(b.h-1.8);
   }else if(cat==='veiculos'){
    if(rand()<.5){x=18.9+rand()*4.1;y=2+rand()*38;}
    else{x=2+rand()*38;y=18.9+rand()*3.1;}
   }else if(cat==='urbano'){
    if(rand()<.5){x=(rand()<.5?16.5:24.5)+(rand()-.5)*.7;y=2+rand()*38;}
    else{x=2+rand()*38;y=(rand()<.5?16.5:24.5)+(rand()-.5)*.7;}
   }else{
    x=2+rand()*38;y=2+rand()*38;
    if(x>16.4&&x<24.6||y>16.4&&y<24.6)continue;
   }
   if(world.buildings.some(b=>cat!=='interior'&&inBuilding(b,x,y,1.0)))continue;
   if(original.some(o=>Math.hypot(o.x-x,o.y-y)<(cat==='interior'?.6:cat==='veiculos'?.9:.7)))continue;
   if(nodes.some(o=>Math.hypot(o.x-x,o.y-y)<(cat==='veiculos'?1.5:cat==='arquitetura'?1.6:.57)))continue;
   // Keep the spawn area and the four mission entrances unobstructed.
   if(Math.hypot(x-11.5,y-15)<2.2)continue;
   if(world.buildings.some(b=>Math.hypot(x-b.door,y-(b.y+b.h+1))<1.7))continue;
   found=true;break;
  }
  if(!found)continue;
  let height=cat==='natureza'?(id<170?100:43):cat==='arquitetura'?90:cat==='interior'?59:cat==='veiculos'?63:cat==='urbano'?(id<410?99:49):cat==='sobrevivencia'?52:73;
  const solid=(cat==='arquitetura'||cat==='veiculos')&&false; // Atmospheric scene objects cannot obstruct quest paths.
  nodes.push({id,x,y,height,category:cat,solid});
 }
 return nodes;
}
