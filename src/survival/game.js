import { SEED, REGION, ITEM_KINDS, hash, regionKind, regionOf, regionPlan, terrainAt, obstacleAt, lootAt, worldObjectsAt } from './world.js';
import { SurvivalRenderer } from './render.js';

const $ = id=>document.getElementById(id);
const STORAGE='neon-afterfall-survival-v1';
const LABELS={comida:'Conserva',agua:'Água',medicamentos:'Medicamentos',madeira:'Madeira',metal:'Sucata',municoes:'Munições',penso:'Penso',combustivel:'Combustível'};
const ICONS={comida:'🥫',agua:'💧',medicamentos:'✚',madeira:'▣',metal:'⬡',municoes:'◉',penso:'✚',combustivel:'◆'};
const START_INVENTORY={comida:3,agua:3,medicamentos:1,madeira:2,metal:1,municoes:8,penso:2,combustivel:0};
const NAMES=['MORTOS A ANDAR','ALGUÉM SE APROXIMA','ZONA DE RISCO','INFETADOS POR PERTO'];
const initial=()=>({
  seed:SEED,player:{x:18,y:23,health:100,hunger:92,thirst:87,stamina:100,facing:0,attack:0,flashlight:false,inside:false},
  inventory:{...START_INVENTORY},lootTaken:[],clockMinutes:8*60+10,days:1,kills:0,distance:0,playtime:0,
  events:[],radio:0
});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function safeLoad(){
  try{
    const source=JSON.parse(localStorage.getItem(STORAGE));
    if(!source||source.seed!==SEED||!source.player||typeof source.player.x!=='number'||!Number.isFinite(source.player.x))return initial();
    const state=initial();
    Object.assign(state,source);
    state.player={...initial().player,...source.player};
    for(const stat of ['health','hunger','thirst','stamina'])state.player[stat]=clamp(Number(state.player[stat])||0,0,100);
    state.player.x=clamp(state.player.x,-200000,200000);state.player.y=clamp(state.player.y,-200000,200000);
    state.inventory={...START_INVENTORY,...source.inventory};
    for(const key of ITEM_KINDS)state.inventory[key]=clamp(Math.floor(Number(state.inventory[key])||0),0,9999);
    state.lootTaken=Array.isArray(source.lootTaken)?source.lootTaken.slice(-3000).filter(s=>typeof s==='string'):[];
    state.clockMinutes=Number.isFinite(source.clockMinutes)?source.clockMinutes:480;
    return state;
  }catch{return initial();}
}

export class SurvivalGame {
  constructor(){
    this.saved=safeLoad();
    this.seed=this.saved.seed;
    this.player=this.saved.player;
    this.inventory=this.saved.inventory;
    this.lootTaken=new Set(this.saved.lootTaken);
    this.clockMinutes=this.saved.clockMinutes;
    this.days=this.saved.days;
    this.kills=this.saved.kills;
    this.distance=this.saved.distance;
    this.playtime=this.saved.playtime;
    this.rain=false;
    this.paused=false;
    this.mapOpen=false;
    this.inventoryOpen=false;
    this.gameOver=false;
    this.zombies=[];
    this.spawned=new Set();
    this.regionCache=new Map();
    this.keyDown=new Set();
    this.touch={x:0,y:0,run:false};
    this.last=performance.now();this.lastSave=0;this.lastHUD=0;
    this.messageTimeout=0;this.hitFlash=0;
    this.equipment='machado';
    this.renderer=new SurvivalRenderer($('world'),this);
    this.attachControls();
    this.spawnAround();
    this.updateHUD();
    this.showMessage('BEM-VINDO A AFTERFALL · PROCURA PROVISÕES E SOBREVIVE',4500);
    requestAnimationFrame(t=>this.frame(t));
  }
  getPlan(rx,ry){
    const key=`${rx}:${ry}`;
    if(this.regionCache.has(key))return this.regionCache.get(key);
    const plan=regionPlan(rx,ry,this.seed);
    this.regionCache.set(key,plan);
    if(this.regionCache.size>48){
      const it=this.regionCache.keys().next().value;
      this.regionCache.delete(it);
    }
    return plan;
  }
  planAt(x,y){const {rx,ry}=regionOf(x,y);return this.getPlan(rx,ry);}
  buildingAt(x,y){const gx=Math.floor(x),gy=Math.floor(y);return this.planAt(gx,gy).buildings.find(b=>gx>=b.x&&gx<b.x+b.w&&gy>=b.y&&gy<b.y+b.h)||null;}
  lootAt(x,y){return lootAt(x,y,this.seed,this.planAt(x,y));}
  objectAt(x,y){return worldObjectsAt(x,y,this.seed,this.planAt(x,y));}
  isBlocked(x,y){
    if(this.player.inside)return Math.abs(x)>8.5||Math.abs(y)>7.5;
    return !!obstacleAt(x,y,this.seed,this.planAt(x,y));
  }
  save(){
    try{
      const state={seed:this.seed,player:this.player,inventory:this.inventory,lootTaken:[...this.lootTaken].slice(-3000),clockMinutes:this.clockMinutes,days:this.days,kills:this.kills,distance:this.distance,playtime:this.playtime};
      localStorage.setItem(STORAGE,JSON.stringify(state));
    }catch{/* Private browsing or storage disabled: game stays playable. */}
  }
  showMessage(text,duration=2500){
    const m=$('messages');m.textContent=text;m.classList.add('visible');
    clearTimeout(this.messageTimeout);this.messageTimeout=setTimeout(()=>m.classList.remove('visible'),duration);
  }
  attachControls(){
    window.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
      if(e.repeat&&['KeyE','KeyM','KeyI','KeyP','KeyF','KeyC','Space','Digit1','Digit2','Digit3'].includes(e.code))return;
      this.keyDown.add(e.code);
      if(e.code==='Space')this.attack();
      if(e.code==='KeyE')this.interact();
      if(e.code==='KeyM'){this.mapOpen=!this.mapOpen;this.updateHUD();}
      if(e.code==='KeyI')this.toggleInventory();
      if(e.code==='KeyP')this.togglePause();
      if(e.code==='KeyF'){this.player.flashlight=!this.player.flashlight;this.showMessage(`LANTERNA ${this.player.flashlight?'ATIVADA':'DESATIVADA'}`);}
      if(e.code==='KeyC')this.craft();
      if(e.code==='Digit1')this.useItem('comida');
      if(e.code==='Digit2')this.useItem('agua');
      if(e.code==='Digit3')this.useItem('medicamentos');
    });
    window.addEventListener('keyup',e=>this.keyDown.delete(e.code));
    window.addEventListener('blur',()=>{this.keyDown.clear();this.touch.x=0;this.touch.y=0;});
    $('attack').addEventListener('click',()=>this.attack());
    $('interact').addEventListener('click',()=>this.interact());
    $('inventory-btn').addEventListener('click',()=>this.toggleInventory());
    $('map-btn').addEventListener('click',()=>{this.mapOpen=!this.mapOpen;this.updateHUD();});
    $('craft-btn').addEventListener('click',()=>this.craft());
    $('flash-btn').addEventListener('click',()=>{this.player.flashlight=!this.player.flashlight;this.showMessage('LANTERNA '+(this.player.flashlight?'LIGADA':'DESLIGADA'));});
    $('pause-btn').addEventListener('click',()=>this.togglePause());
    $('continue-btn').addEventListener('click',()=>this.togglePause());
    $('restart-btn').addEventListener('click',()=>this.restart());
    $('close-inventory').addEventListener('click',()=>this.toggleInventory(false));
    $('rain-btn').addEventListener('click',()=>{this.rain=!this.rain;this.showMessage(this.rain?'CHUVA INTENSA':'CÉU LIMPO');});
    $('craft-inventory').addEventListener('click',()=>this.craft());
    $('newgame-btn').addEventListener('click',()=>{if(confirm('Reiniciar a sobrevivência e apagar o progresso?'))this.restart();});
    for(const name of ITEM_KINDS){
      const button=$('use-'+name);if(button)button.addEventListener('click',()=>this.useItem(name));
    }
    const canvas=$('world');
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.renderer.zoom=clamp(this.renderer.zoom+(e.deltaY<0?.09:-.09),.55,1.65);},{passive:false});
    this.setupJoystick();
    const run=$('run');
    for(const [event,val] of [['pointerdown',true],['pointerup',false],['pointercancel',false],['pointerleave',false]])run.addEventListener(event,e=>{e.preventDefault();this.touch.run=val;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.save();this.paused=true;this.updateHUD();}});
    window.addEventListener('beforeunload',()=>this.save());
  }
  setupJoystick(){
    const pad=$('joystick'),knob=$('joystick-knob');let active=null;
    const set=e=>{
      const r=pad.getBoundingClientRect();const dx=(e.clientX-r.left-r.width/2)/(r.width*.42);const dy=(e.clientY-r.top-r.height/2)/(r.height*.42);
      const length=Math.max(1,Math.hypot(dx,dy));
      this.touch.x=clamp(dx/length,-1,1);this.touch.y=clamp(dy/length,-1,1);
      knob.style.transform=`translate(${this.touch.x*r.width*.27}px,${this.touch.y*r.height*.27}px)`;
    };
    pad.addEventListener('pointerdown',e=>{e.preventDefault();active=e.pointerId;pad.setPointerCapture(active);set(e);});
    pad.addEventListener('pointermove',e=>{if(e.pointerId===active)set(e);});
    const release=e=>{if(e.pointerId!==active)return;active=null;this.touch.x=0;this.touch.y=0;knob.style.transform='';};
    pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);
  }
  togglePause(force){this.paused=typeof force==='boolean'?force:!this.paused;$('pause-overlay').hidden=!this.paused;this.updateHUD();}
  toggleInventory(force){this.inventoryOpen=typeof force==='boolean'?force:!this.inventoryOpen;$('inventory-panel').hidden=!this.inventoryOpen;this.updateHUD();}
  restart(){
    this.saved=initial();this.player=this.saved.player;this.inventory=this.saved.inventory;this.lootTaken.clear();
    this.clockMinutes=this.saved.clockMinutes;this.days=1;this.kills=0;this.distance=0;this.playtime=0;
    this.paused=false;this.gameOver=false;this.zombies=[];this.spawned.clear();this.regionCache.clear();
    $('death-overlay').hidden=true;$('pause-overlay').hidden=true;$('inventory-panel').hidden=true;this.inventoryOpen=false;
    this.spawnAround();this.save();this.updateHUD();this.showMessage('NOVO SOBREVIVENTE · DIA 1',2800);
  }
  spawnAround(){
    if(this.player.inside){
      const key='bunker:'+Math.floor(this.player.x)+':'+this.days;
      if(!this.spawned.has(key)){
        this.spawned.add(key);
        for(let i=0;i<4;i++)this.zombies.push({id:this.zombies.length+i,x:-6+i*3,y:-3,health:90,speed:.5+i*.06,style:i%2,inside:true,hit:0,attackDelay:0});
      }
      return;
    }
    const {rx,ry}=regionOf(this.player.x,this.player.y);
    for(let sy=ry-1;sy<=ry+1;sy++)for(let sx=rx-1;sx<=rx+1;sx++){
      const key=`${sx}:${sy}`;
      if(this.spawned.has(key))continue;
      this.spawned.add(key);
      const kind=regionKind(sx,sy,this.seed);
      const count=kind==='prisao'?19:kind==='industrial'?13:kind==='aldeia'||kind==='suburbio'?11:kind==='bunker'?8:7;
      for(let i=0;i<count;i++){
        let x=sx*REGION+4+hash(sx*99+i,sy,this.seed+801)*40;
        let y=sy*REGION+4+hash(sx,sy*97+i,this.seed+802)*40;
        if(dist({x,y},this.player)<7){x+=8;y+=8;}
        if(this.isBlocked(x,y))continue;
        this.zombies.push({id:this.zombies.length+i,x,y,health:70+hash(i,sx*17+sy,this.seed)*60,speed:.32+hash(i+sx,sy,this.seed+610)*.47,style:i%2,inside:false,hit:0,attackDelay:0});
      }
    }
    if(this.spawned.size>120){this.spawned.clear();this.spawned.add(`${rx}:${ry}`);}
    this.zombies=this.zombies.filter(z=>z.inside||dist(z,this.player)<90).slice(-200);
  }
  move(dt){
    const p=this.player;
    const k=this.keyDown;
    let sx=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0)+this.touch.x;
    let sy=(k.has('KeyS')||k.has('ArrowDown')?1:0)-(k.has('KeyW')||k.has('ArrowUp')?1:0)+this.touch.y;
    const norm=Math.hypot(sx,sy);
    if(norm<.1)return;
    sx/=norm;sy/=norm;
    const movingX=(sx+sy)*.707106781;
    const movingY=(sy-sx)*.707106781;
    const run=(k.has('ShiftLeft')||k.has('ShiftRight')||this.touch.run)&&p.stamina>10;
    const speed=run?4.4:2.55;
    const vx=movingX*speed*dt,vy=movingY*speed*dt;
    let moved=0;
    if(!this.isBlocked(p.x+vx+.15*Math.sign(vx),p.y)){p.x+=vx;moved+=Math.abs(vx);}
    if(!this.isBlocked(p.x,p.y+vy+.15*Math.sign(vy))){p.y+=vy;moved+=Math.abs(vy);}
    if(moved>0){p.facing=Math.atan2(vy,vx);this.distance+=moved;p.stamina=clamp(p.stamina-(run?8:1.1)*dt,0,100);}
  }
  updateZombies(dt){
    const p=this.player;
    for(const z of this.zombies){
      if(!!z.inside!==!!p.inside)continue;
      z.hit=Math.max(0,z.hit-dt);
      z.attackDelay=Math.max(0,z.attackDelay-dt);
      const d=dist(p,z);
      if(d>19||d<.55)continue;
      const noise=p.attack>0?1.6:1;
      if(d<16*noise){
        const dx=(p.x-z.x)/d,dy=(p.y-z.y)/d,move=z.speed*dt;
        if(!this.isBlocked(z.x+dx*move,z.y))z.x+=dx*move;
        if(!this.isBlocked(z.x,z.y+dy*move))z.y+=dy*move;
      }
      if(d<.89&&z.attackDelay===0){
        p.health=clamp(p.health-(6+hash(z.id,Math.floor(this.playtime),this.seed)*7),0,100);
        this.hitFlash=2.5;z.attackDelay=1.3;
        this.showMessage('ESTÁS A SER ATACADO!');
      }
    }
    this.zombies=this.zombies.filter(z=>z.health>0);
    if(p.health<=0)this.die();
  }
  die(){if(this.gameOver)return;this.gameOver=true;this.paused=true;this.save();$('death-overlay').hidden=false;}
  attack(){
    if(this.paused||this.gameOver||this.player.attack>0)return;
    const p=this.player;p.attack=.28;p.stamina=clamp(p.stamina-11,0,100);
    let hit=false;
    for(const z of this.zombies){
      if(!!z.inside!==!!p.inside||dist(z,p)>2.15)continue;
      const angle=Math.atan2(z.y-p.y,z.x-p.x);
      let difference=Math.atan2(Math.sin(angle-p.facing),Math.cos(angle-p.facing));
      if(Math.abs(difference)>2.2)continue;
      z.health-=55;z.hit=.3;hit=true;
      if(z.health<=0){this.kills++;if(hash(z.id,this.kills,this.seed)>.65)this.inventory.penso++;}
    }
    this.showMessage(hit?'GOLPE CERTEIRO':'GOLPE NO VAZIO',700);
  }
  enterBunker(){
    const {rx,ry}=regionOf(this.player.x,this.player.y);
    const plan=this.getPlan(rx,ry);
    if(plan.kind!=='bunker')return false;
    const entry=plan.features.find(f=>f.type==='bunker');
    if(!entry||dist(this.player,{x:entry.x+.5,y:entry.y+.5})>2.5)return false;
    this.player.previous={x:this.player.x,y:this.player.y};
    this.player.x=0;this.player.y=6;this.player.inside=true;
    this.zombies=this.zombies.filter(z=>!z.inside);
    this.spawnAround();this.save();this.showMessage('BUNKER SUBTERRÂNEO · ENCONTRA EQUIPAMENTO',3500);
    return true;
  }
  exitBunker(){
    if(!this.player.inside||dist(this.player,{x:0,y:7})>2.5)return false;
    const back=this.player.previous||{x:18,y:23};
    this.player.x=back.x;this.player.y=back.y;this.player.inside=false;
    this.zombies=this.zombies.filter(z=>!z.inside);
    this.spawnAround();this.save();this.showMessage('REGRESSASTE À SUPERFÍCIE');return true;
  }
  interact(){
    if(this.paused||this.gameOver)return;
    if(this.player.inside){
      if(this.exitBunker())return;
      const x=Math.floor(this.player.x), y=Math.floor(this.player.y);
      let nearest=null;
      for(let xx=-6;xx<=6;xx+=3){
        const crate={x:xx,y:-5,id:`bunker-crate:${this.player.previous?.x ?? 0}:${this.player.previous?.y ?? 0}:${xx}`};
        if(!this.lootTaken.has(crate.id)&&dist(crate,this.player)<2.6)nearest=crate;
      }
      if(!nearest){this.showMessage('PROCURA OS ARMÁRIOS NO FUNDO DO BUNKER');return;}
      this.lootTaken.add(nearest.id);
      const num=2+Math.floor(hash(x,y,this.seed+911)*3);
      this.inventory.municoes+=num;this.showMessage(`ARMÁRIO MILITAR · +${num} MUNIÇÕES`,2200);this.save();this.updateHUD();return;
    }
    if(this.enterBunker())return;
    const p=this.player;
    let nearest=null;
    for(let y=Math.floor(p.y)-2;y<=Math.floor(p.y)+2;y++)for(let x=Math.floor(p.x)-2;x<=Math.floor(p.x)+2;x++){
      const loot=this.lootAt(x,y);
      if(!loot||this.lootTaken.has(loot.id))continue;
      const distance=dist({x:x+.5,y:y+.5},p);
      if(distance<2.6&&(!nearest||distance<nearest.distance))nearest={...loot,distance};
    }
    if(!nearest){this.showMessage('NÃO HÁ NADA PARA RECOLHER');return;}
    this.lootTaken.add(nearest.id);
    const qty=1+Math.floor(hash(nearest.id.length,Math.floor(p.x+p.y),this.seed+214)*2);
    this.inventory[nearest.kind]=(this.inventory[nearest.kind]||0)+qty;
    this.showMessage(`${ICONS[nearest.kind]} ${LABELS[nearest.kind].toUpperCase()} +${qty}`,2200);
    this.updateHUD();this.save();
  }
  useItem(name){
    if(!this.inventory[name]){this.showMessage('NÃO TENS ESTE RECURSO');return;}
    const p=this.player;
    if(name==='comida'){p.hunger=clamp(p.hunger+38,0,100);this.inventory[name]--;}
    else if(name==='agua'){p.thirst=clamp(p.thirst+48,0,100);this.inventory[name]--;}
    else if(name==='medicamentos'){p.health=clamp(p.health+45,0,100);this.inventory[name]--;}
    else if(name==='penso'){p.health=clamp(p.health+18,0,100);this.inventory[name]--;}
    else{this.showMessage('ESTE RECURSO É UTILIZADO NA FABRICAÇÃO');return;}
    this.showMessage(`${LABELS[name].toUpperCase()} UTILIZADO`);this.save();this.updateHUD();
  }
  craft(){
    if(this.inventory.madeira>=2&&this.inventory.metal>=1){
      this.inventory.madeira-=2;this.inventory.metal-=1;this.inventory.penso+=2;
      this.showMessage('FABRICAÇÃO CONCLUÍDA · +2 PENSOS',2500);this.save();this.updateHUD();
    }else this.showMessage('PRECISAS DE 2 MADEIRAS E 1 SUCATA');
  }
  updateHUD(){
    const p=this.player;
    const plan=p.inside?{title:'BUNKER SUBTERRÂNEO'}:this.planAt(p.x,p.y);
    $('area').textContent=plan.title;
    $('coords').textContent=p.inside?'SUBSOLO · -1':`${Math.floor(p.x)} / ${Math.floor(p.y)}`;
    $('clock').textContent=`DIA ${this.days} · ${String(Math.floor(this.clockMinutes/60)%24).padStart(2,'0')}:${String(Math.floor(this.clockMinutes%60)).padStart(2,'0')}`;
    $('health-value').textContent=Math.round(p.health);$('health-fill').style.width=p.health+'%';
    $('hunger-value').textContent=Math.round(p.hunger);$('hunger-fill').style.width=p.hunger+'%';
    $('thirst-value').textContent=Math.round(p.thirst);$('thirst-fill').style.width=p.thirst+'%';
    $('stamina-value').textContent=Math.round(p.stamina);$('stamina-fill').style.width=p.stamina+'%';
    $('kills').textContent=this.kills;$('distance').textContent=Math.floor(this.distance*10)+' m';
    $('zombie-count').textContent=this.zombies.filter(z=>!!z.inside===!!p.inside&&dist(z,p)<17).length;
    $('survival-days').textContent=this.days;
    $('map-btn').classList.toggle('selected',this.mapOpen);
    for(const kind of ITEM_KINDS){const el=$('num-'+kind);if(el)el.textContent=this.inventory[kind]||0;const inv=$('inv-'+kind);if(inv)inv.textContent=this.inventory[kind]||0;}
    $('pause-overlay').hidden=!this.paused||this.gameOver;
    $('inventory-panel').hidden=!this.inventoryOpen;
  }
  frame(now){
    requestAnimationFrame(t=>this.frame(t));
    const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
    if(!this.paused&&!this.gameOver){
      this.move(dt);this.player.attack=Math.max(0,this.player.attack-dt);
      this.hitFlash=Math.max(0,this.hitFlash-dt*2);
      this.playtime+=dt;this.clockMinutes+=dt*.68;
      if(this.clockMinutes>=1440){this.clockMinutes-=1440;this.days++;this.showMessage(`SOBREVIVESTE MAIS UM DIA · DIA ${this.days}`,4000);}
      this.player.hunger=clamp(this.player.hunger-dt*.052,0,100);
      this.player.thirst=clamp(this.player.thirst-dt*.068,0,100);
      this.player.stamina=clamp(this.player.stamina+dt*(this.player.hunger>10?5.4:1),0,100);
      if(this.player.hunger===0||this.player.thirst===0)this.player.health=clamp(this.player.health-dt*.5,0,100);
      this.updateZombies(dt);
      if(Math.floor(this.playtime)%3===0&&now-this.lastSave>2500)this.spawnAround();
      if(now-this.lastSave>6500){this.lastSave=now;this.save();}
      if(now-this.lastHUD>250){this.lastHUD=now;this.updateHUD();}
    }
    this.renderer.draw();
  }
}
new SurvivalGame();
