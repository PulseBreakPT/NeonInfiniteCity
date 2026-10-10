import test from'node:test';
import assert from'node:assert/strict';
import{createWorld,createState,project,unproject,blocked,move,update,interact,useItem,restore,serialize,objectives,inside}from'../src/core.js';
test('projection is reversible across the world',()=>{for(const [x,y]of[[0,0],[11.5,15],[41,41],[4.3,33.1]]){const p=project(x,y),r=unproject(p.x,p.y);assert.ok(Math.abs(r.x-x)<1e-10&&Math.abs(r.y-y)<1e-10);}});
test('world is deterministic and includes all sixteen props',()=>{const a=createWorld(),b=createWorld();assert.deepEqual(a,b);assert.equal(new Set(a.props.map(p=>p.type)).size,16);assert.equal(a.buildings.length,4);assert.ok(!blocked(a,11.5,15));});
test('walls are solid, front doors are open and fast movement cannot tunnel',()=>{const w=createWorld();for(const b of w.buildings){assert.equal(blocked(w,b.x+.1,b.y+3),true);assert.equal(blocked(w,b.door,b.y+b.h),false);}const p={x:10,y:6};move(w,p,0,7);assert.ok(p.y<7);});
test('movement follows screen controls and stays within bounds',()=>{const w=createWorld(),s=createState();const before=project(s.player.x,s.player.y);update(s,w,{x:1,y:0,run:false},.05);const after=project(s.player.x,s.player.y);assert.ok(after.x>before.x);assert.ok(Math.abs(after.y-before.y)<1e-6);const p={x:.7,y:.7};move(w,p,-5,-5);assert.ok(p.x>=.6&&p.y>=.6);});
test('running consumes stamina and resting recovers it',()=>{const w=createWorld(),s=createState();update(s,w,{x:0,y:1,run:true},.05);assert.ok(s.player.stamina<100);const st=s.player.stamina;update(s,w,{x:0,y:0,run:false},.05);assert.ok(s.player.stamina>st);});
test('loot can only be collected once',()=>{const w=createWorld(),s=createState(),o=w.props.find(p=>p.loot);s.player.x=o.x+.8;s.player.y=o.y;assert.ok(interact(s,w).ok);const inventory={...s.inventory};assert.equal(interact(s,w).ok,false);assert.deepEqual(s.inventory,inventory);});
test('generator requires resources and consumes exactly its cost',()=>{const w=createWorld(),s=createState(),o=w.props.find(p=>p.generator);s.player.x=o.x-.8;s.player.y=o.y;assert.equal(interact(s,w).ok,false);s.inventory.fuel=2;s.inventory.parts=3;assert.ok(interact(s,w).ok);assert.equal(s.inventory.fuel,1);assert.equal(s.inventory.parts,1);assert.ok(s.generator);assert.equal(interact(s,w).ok,false);assert.equal(s.inventory.fuel,1);});
test('consumables clamp health, cannot underflow and do not erase mission discoveries',()=>{const s=createState();s.player.health=90;assert.ok(useItem(s,'medkit'));assert.equal(s.player.health,100);assert.equal(s.inventory.medkit,0);assert.equal(useItem(s,'medkit'),false);s.inventory.food=1;s.found.food=1;s.player.health=80;assert.ok(useItem(s,'food'));assert.equal(s.found.food,1);assert.equal(useItem(s,'parts'),false);});
test('hostile contact damages with cooldown; shelter protects player',()=>{const w=createWorld(),s=createState();w.enemies=[{...w.enemies[0],x:s.player.x,y:s.player.y,home:{x:s.player.x,y:s.player.y}}];update(s,w,{x:0,y:0},.05);assert.equal(s.player.health,88);update(s,w,{x:0,y:0},.05);assert.equal(s.player.health,88);s.player.x=11.5;s.player.y=11;w.enemies[0].x=11.5;w.enemies[0].y=11;s.player.invulnerable=0;update(s,w,{x:0,y:0},.05);assert.equal(s.player.health,88);});
test('save round-trip validates numbers, known loot, resource bounds and collisions',()=>{const w=createWorld(),s=createState('female');assert.equal(restore(serialize(s),w).player.character,'female');for(const raw of ['{','{}','null'])assert.equal(restore(raw,w),null);s.player.x=500;assert.equal(restore(serialize(s),w),null);s.player.x=11.5;s.inventory.parts=-1;assert.equal(restore(serialize(s),w),null);s.inventory.parts=0;s.collected=['nonexistent'];assert.equal(restore(serialize(s),w),null);});
test('all loot and generator are reachable from spawn with physical collision checks',()=>{
 const w=createWorld(),start=[23,30],queue=[start],seen=new Set([start.join(',')]);let i=0;
 while(i<queue.length){const [x,y]=queue[i++];for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(!seen.has(k)&&a>=2&&b>=2&&a<=82&&b<=82&&!blocked(w,a/2,b/2)){seen.add(k);queue.push([a,b]);}}}
 for(const p of w.props.filter(o=>o.loot||o.generator)){assert.ok(queue.some(([x,y])=>Math.hypot(x/2-p.x,y/2-p.y)<1.5),'unreachable '+p.id);}
 for(const b of w.buildings)assert.ok(queue.some(([x,y])=>inside({x:x/2,y:y/2},b)),'building '+b.id);
});
test('full objective sequence reaches the win state even if supplies are consumed',()=>{const w=createWorld(),s=createState();for(const o of w.props.filter(p=>p.loot)){s.player.x=o.x+.8;s.player.y=o.y;interact(s,w);}useItem(s,'food');useItem(s,'water');const g=w.props.find(p=>p.generator);s.player.x=g.x-.8;s.player.y=g.y;assert.ok(interact(s,w).ok);s.player.x=11.5;s.player.y=11.7;assert.ok(interact(s,w).ok);assert.equal(s.won,true);assert.ok(objectives(s).every(o=>o.done));});

test('walls block interaction but open doorways allow reaching supplies',()=>{
 const w=createWorld(),s=createState();s.player.x=31;s.player.y=25.8;s.inventory.fuel=1;s.inventory.parts=2;
 assert.equal(blocked(w,s.player.x,s.player.y),false);assert.equal(interact(s,w).ok,false);assert.equal(s.generator,false);assert.equal(s.inventory.fuel,1);
 s.player.x=30;s.player.y=27.2;assert.equal(interact(s,w).ok,true);
 const doorway={...w,props:[{id:'door-loot',x:11.5,y:12.5,loot:{food:1}}]};s.player.x=11.5;s.player.y=13.5;assert.equal(interact(s,doorway).ok,true);
});
test('full meters conserve supplies and finished expeditions reject interactions',()=>{
 const w=createWorld(),s=createState();s.inventory.food=1;s.inventory.water=1;
 for(const item of ['food','water','medkit']){assert.equal(useItem(s,item),false);assert.equal(s.inventory[item],1);}
 s.player.stamina=50;assert.equal(useItem(s,'water'),true);assert.equal(s.player.stamina,100);
 const o=w.props.find(p=>p.loot);s.player.x=o.x+.8;s.player.y=o.y;s.dead=true;assert.equal(interact(s,w).ok,false);s.dead=false;s.won=true;assert.equal(interact(s,w).ok,false);assert.deepEqual(s.collected,[]);
});
