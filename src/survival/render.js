import { installPixelDetail } from './pixelDetail.js';
import { REGION, regionMiniMap, regionOf, terrainAt, hash, mod, worldObjectsAt, lootAt } from './world.js';

const COLORS = {
  relva: ['#517c51','#568657','#4c754d'], erva: ['#416e49','#4b7951','#3d6b42'],
  terra: ['#89694d','#927153','#785e48'], estrada: ['#484f55','#50575d','#474f57'],
  cimento: ['#777d82','#7e8286','#6e757b']
};
const ROOF_COLORS = ['#8b4c48','#5c6876','#758172','#947457','#695764'];
const HOUSE_COLORS = ['#ddd2ba','#c6cfce','#c4b4a4','#d0d2c3','#b5c0c8'];
const iconFor = { comida:'🥫', agua:'💧', medicamentos:'✚', madeira:'▣', metal:'⬡', municoes:'◉', penso:'✚', combustivel:'◆' };

const poly = (ctx, points, fill, stroke, lineWidth=1) => {
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath(); if (fill) {ctx.fillStyle=fill;ctx.fill();}
  if (stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
};
const line=(c,a,b,color,width=1)=>{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
const dot=(c,x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
const rgba=(hex,a)=> { const h=hex.replace('#',''); const n=parseInt(h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; };

export class SurvivalRenderer {
  constructor(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', {alpha:false}); this.game=game;
    this.zoom = window.innerWidth<700 ? 0.84 : 1.05;
    this.frame = 0; this.shake = 0;
    this.resize(); window.addEventListener('resize',()=>this.resize());
  }
  resize() {
    const scale=Math.min(window.devicePixelRatio||1,1.7);
    this.w=window.innerWidth;this.h=window.innerHeight;
    this.canvas.width=Math.round(this.w*scale);this.canvas.height=Math.round(this.h*scale);
    this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';
    this.ctx.setTransform(scale,0,0,scale,0,0);
  }
  iso(x,y,e=0) {
    const p=this.game.player;
    const dx=x-p.x, dy=y-p.y;
    return {x:this.w*0.50+(dx-dy)*30*this.zoom, y:this.h*0.52+(dx+dy)*15*this.zoom-e*this.zoom};
  }
  tile(x,y,color,stroke=null,alt=0){
    const p=this.iso(x,y,alt),a=30*this.zoom,b=15*this.zoom;
    poly(this.ctx,[{x:p.x,y:p.y-b},{x:p.x+a,y:p.y},{x:p.x,y:p.y+b},{x:p.x-a,y:p.y}],color,stroke);
  }
  diamondRect(x,y,w,h,height=0) {
    return [this.iso(x,y,height),this.iso(x+w,y,height),this.iso(x+w,y+h,height),this.iso(x,y+h,height)];
  }
  renderTile(x,y,terrain) {
    const h=hash(x,y,this.game.seed+15);
    const palette=COLORS[terrain.material]||COLORS.relva;
    const base=palette[Math.floor(h*3)];
    this.tile(x+.5,y+.5,base);
    if(terrain.material==='estrada'){
      if((mod(x,REGION)===18 || mod(y,REGION)===18)&&hash(x,y,this.game.seed+211)>.17){
        const p=this.iso(x+.5,y+.5);const ctx=this.ctx;ctx.strokeStyle='#b9b1a0';ctx.lineWidth=Math.max(1,1.6*this.zoom);
        ctx.beginPath(); ctx.moveTo(p.x-4*this.zoom,p.y+2*this.zoom);ctx.lineTo(p.x+4*this.zoom,p.y-2*this.zoom);ctx.stroke();
      }
      if(hash(x,y,this.game.seed+312)>.991){const p=this.iso(x+.3,y+.2);line(this.ctx,p,this.iso(x+.8,y+.8),'#35393d',1.2);}
    } else if(h>.72 && h<.9){
      const p=this.iso(x+.33,y+.35);this.ctx.fillStyle=terrain.material==='cimento'?'#a4aab0':'rgba(15,46,25,.25)';
      this.ctx.fillRect(p.x,p.y,1.5*this.zoom,3*this.zoom);
    }
    const plan=this.game.planAt(x,y);
    if(plan.kind==='campos'){
      for(const f of plan.features){
        if(f.type==='horta'&&x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h){
          this.tile(x+.5,y+.5,'#684a32');
          if(mod(y-f.y,2)===0){const p=this.iso(x+.5,y+.5);line(this.ctx,{x:p.x-5*this.zoom,y:p.y-3*this.zoom},{x:p.x+5*this.zoom,y:p.y+2*this.zoom},'#80b260',2*this.zoom);}
        }
      }
    }
  }
  drawBuilding(b){
    const c=this.ctx, p=this.game.player;
    const close=p.x>b.x-1.5&&p.x<b.x+b.w+1.5&&p.y>b.y-1.5&&p.y<b.y+b.h+1.5;
    const height=36+(b.floors-1)*25;
    const [a,bb,d,e]=this.diamondRect(b.x,b.y,b.w,b.h,0);
    const [A,B,D,E]=this.diamondRect(b.x,b.y,b.w,b.h,height);
    c.save();if(close)c.globalAlpha=.2;
    const prison=b.kind==='prisao'||b.kind==='abrigo';
    const roof=prison?'#465361':b.kind==='celeiro'?'#8c554c':ROOF_COLORS[b.color];
    const wall=prison?'#a6adb2':HOUSE_COLORS[b.color];
    poly(c,[bb,d,D,B],rgba(wall,.98),'rgba(30,40,43,.34)',1.2);
    poly(c,[d,e,E,D],rgba(wall,.79),'rgba(30,40,43,.3)',1.2);
    // Horizontal base course and separated window stacks with projected facade alignment.
    line(c,bb,d,'rgba(64,59,57,.65)',2*this.zoom);
    line(c,d,e,'rgba(64,59,57,.65)',2*this.zoom);
    const windows=Math.max(2,Math.floor(b.w/2));
    for(let floor=0;floor<b.floors;floor++){
      for(let j=1;j<windows;j++){
        const t=j/windows;
        const base=this.iso(b.x+b.w,b.y+t*b.h,14+floor*25);
        const top=this.iso(b.x+b.w,b.y+t*b.h,24+floor*25);
        line(c,base,top,close?'#6c858d':'#314f60',4.2*this.zoom);
        line(c,{x:top.x+1,y:top.y},{x:base.x+1,y:base.y},'rgba(151,206,221,.38)',1.0*this.zoom);
      }
      const count=Math.max(2,Math.floor(b.w/2));
      for(let j=1;j<count;j++){
        const t=j/count;
        const base=this.iso(b.x+t*b.w,b.y+b.h,14+floor*25);
        const top=this.iso(b.x+t*b.w,b.y+b.h,24+floor*25);
        line(c,base,top,close?'#7a8990':'#2b485b',4.5*this.zoom);
        line(c,{x:base.x,y:base.y-1},{x:top.x,y:top.y-1},'rgba(173,209,219,.4)',1*this.zoom);
      }
    }
    const door=this.iso(b.door.x+.5,b.door.y+.5);
    poly(c,[{x:door.x-6*this.zoom,y:door.y-18*this.zoom},{x:door.x+5*this.zoom,y:door.y-22*this.zoom},{x:door.x+5*this.zoom,y:door.y-5*this.zoom},{x:door.x-6*this.zoom,y:door.y-3*this.zoom}], '#483f3a','#b99c76');
    dot(c,door.x+2*this.zoom,door.y-13*this.zoom,1.2*this.zoom,'#eecb88');
    // Roof geometry: pitched ridges and structural overhangs.
    const ra=this.iso(b.x-.28,b.y-.28,height+1),rb=this.iso(b.x+b.w+.28,b.y-.28,height+1);
    const rd=this.iso(b.x+b.w+.28,b.y+b.h+.28,height+1),re=this.iso(b.x-.28,b.y+b.h+.28,height+1);
    if(b.roof===1||b.kind==='celeiro'||b.kind==='quinta'){
      const ridge1=this.iso(b.x+b.w*.1,b.y+b.h*.5,height+14),ridge2=this.iso(b.x+b.w*.9,b.y+b.h*.5,height+14);
      poly(c,[ra,rb,ridge2,ridge1],roof,'#333d41',1.2);
      poly(c,[ridge1,ridge2,rd,re],rgba(roof,.81),'#303438',1);
      line(c,ridge1,ridge2,'#bfaf99',1.5*this.zoom);
    } else {
      poly(c,[ra,rb,rd,re],roof,'#282d32',1.6);
      poly(c,this.diamondRect(b.x+.35,b.y+.35,b.w-.7,b.h-.7,height+1.5),rgba(roof,.8),'rgba(230,225,212,.33)');
      const vent=this.iso(b.x+b.w*.46,b.y+b.h*.45,height+7);
      c.fillStyle='#5a6164';c.fillRect(vent.x-4,vent.y-5,8,6);
    }
    if(b.kind==='mercado'||b.kind==='oficina'||b.kind==='refeitorio'){
      const q=this.iso(b.x+b.w*.50,b.y+b.h,height+9);
      c.fillStyle='#f3d19d';c.fillRect(q.x-17*this.zoom,q.y-11*this.zoom,35*this.zoom,9*this.zoom);
      c.font=`${Math.round(7*this.zoom)}px system-ui`;c.textAlign='center';c.fillStyle='#172327';
      c.fillText(b.kind==='mercado'?'MERCADO':b.kind==='oficina'?'OFICINA':'CANTINA',q.x,q.y-4*this.zoom);
    }
    c.restore();
    if(close){
      // Revealed floor and furnishings when entering a structure.
      poly(c,this.diamondRect(b.x+1,b.y+1,b.w-2,b.h-2),b.kind==='prisao'?'rgba(95,105,111,.78)':'rgba(188,160,126,.82)','#463d31');
      for(let i=0;i<Math.min(5,b.w-2);i++){
        const q=this.iso(b.x+1+i*1.1,b.y+2.3);
        c.fillStyle=i%2?'#79634e':'#3c5962'; c.fillRect(q.x-5*this.zoom,q.y-11*this.zoom,9*this.zoom,10*this.zoom);
      }
    }
  }
  drawTree(obj) {
    const c=this.ctx,p=this.iso(obj.x+.5,obj.y+.6),h=(24+(obj.size||.7)*34)*this.zoom;
    dot(c,p.x,p.y+3*this.zoom,11*this.zoom,'rgba(12,27,15,.23)');
    line(c,{x:p.x,y:p.y},{x:p.x,y:p.y-h+12*this.zoom},'#694931',4*this.zoom);
    const canopy=[[0,-h],[-12,-h+14],[11,-h+16],[3,-h+8]];
    for(let i=0;i<canopy.length;i++){
      const [dx,dy]=canopy[i];dot(c,p.x+dx*this.zoom,p.y+dy, (12+(i%3)*3)*(obj.size||.8)*this.zoom, ['#244d38','#2f6743','#3f784e','#1d4938'][i]);
    }
    dot(c,p.x-7*this.zoom,p.y-h+6*this.zoom,6*this.zoom,'rgba(159,207,139,.14)');
  }
  drawFeature(f) {
    const c=this.ctx,p=this.iso(f.x+.5,f.y+.5);
    if(f.type==='arvore'){this.drawTree(f);return;}
    if(f.type==='bunker'){
      dot(c,p.x,p.y,15*this.zoom,'rgba(12,19,20,.42)');
      poly(c,this.diamondRect(f.x-1,f.y-1,3,3,7),'#526069','#20272b',2);
      poly(c,this.diamondRect(f.x-.5,f.y-.5,2,2,8),'#283039','#afbcab',1.5);
      c.fillStyle='#e8c369';c.textAlign='center';c.font=`bold ${Math.round(9*this.zoom)}px system-ui`;
      c.fillText('BUNKER',p.x,p.y-16*this.zoom);return;
    }
    if(f.type==='torre'||f.type==='antena'){
      line(c,{x:p.x,y:p.y},{x:p.x,y:p.y-45*this.zoom},'#606e74',5*this.zoom);
      poly(c,[{x:p.x-12*this.zoom,y:p.y-44*this.zoom},{x:p.x+12*this.zoom,y:p.y-44*this.zoom},{x:p.x+8*this.zoom,y:p.y-55*this.zoom},{x:p.x-8*this.zoom,y:p.y-55*this.zoom}],'#3e4e54','#cad2d1');return;
    }
    if(f.type==='poco'||f.type==='silo'||f.type==='deposito'){
      dot(c,p.x,p.y,11*this.zoom,'#52636b');
      c.fillStyle='#a8b2aa';c.fillRect(p.x-7*this.zoom,p.y-22*this.zoom,14*this.zoom,20*this.zoom);
      dot(c,p.x,p.y-22*this.zoom,7*this.zoom,'#4a565d');return;
    }
    if(f.type==='placa'){
      line(c,p,{x:p.x,y:p.y-30*this.zoom},'#6f6552',3*this.zoom);
      c.fillStyle='#c6ac78';c.fillRect(p.x-12*this.zoom,p.y-32*this.zoom,24*this.zoom,9*this.zoom);return;
    }
    if(f.type==='acampamento'){
      poly(c,[{x:p.x,y:p.y-24*this.zoom},{x:p.x-17*this.zoom,y:p.y+4*this.zoom},{x:p.x+17*this.zoom,y:p.y+4*this.zoom}],'#a18b57','#473f32',2);return;
    }
  }
  drawPrisonFence(f) {
    const c=this.ctx;
    for(let i=0;i<f.w;i++){
      if(i>=16&&i<=19)continue;
      this.drawFencePost(f.x+i,f.y);this.drawFencePost(f.x+i,f.y+f.h-1);
    }
    for(let i=1;i<f.h-1;i++){this.drawFencePost(f.x,f.y+i);this.drawFencePost(f.x+f.w-1,f.y+i);}
  }
  drawFencePost(x,y){
    const c=this.ctx,p=this.iso(x+.5,y+.5);line(c,p,{x:p.x,y:p.y-16*this.zoom},'#909b97',1.1*this.zoom);
    line(c,{x:p.x-3*this.zoom,y:p.y-6*this.zoom},{x:p.x+3*this.zoom,y:p.y-11*this.zoom},'rgba(217,223,212,.5)',.65*this.zoom);
  }
  drawLoot(loot,x,y){
    const c=this.ctx,p=this.iso(x+.5,y+.5),pulse=1+Math.sin(this.frame*.09+x)*.12;
    dot(c,p.x,p.y-8*this.zoom,12*this.zoom*pulse,'rgba(239,202,110,.10)');
    poly(c,[{x:p.x,y:p.y-19*this.zoom},{x:p.x+7*this.zoom,y:p.y-11*this.zoom},{x:p.x,y:p.y-3*this.zoom},{x:p.x-7*this.zoom,y:p.y-11*this.zoom}], '#d9b46a','#fff0c9');
  }
  drawZombie(z){
    const c=this.ctx,p=this.iso(z.x,z.y),s=this.zoom;
    dot(c,p.x,p.y+3*s,8*s,'rgba(8,20,17,.38)');
    c.save();c.translate(p.x,p.y);c.rotate(Math.sin(this.frame*.13+z.id)*.09);
    line(c,{x:-3*s,y:-10*s},{x:-4*s,y:2*s},'#28322c',4.2*s);
    line(c,{x:3*s,y:-10*s},{x:4*s,y:2*s},'#28322c',4.2*s);
    line(c,{x:0,y:-27*s},{x:0,y:-10*s},z.hit>0?'#c75543':z.style===0?'#657363':'#6e5f55',9*s);
    line(c,{x:-2*s,y:-22*s},{x:-12*s,y:-11*s},'#9c9c7b',3*s);
    line(c,{x:2*s,y:-22*s},{x:12*s,y:-12*s},'#9c9c7b',3*s);
    dot(c,0,-32*s,6.5*s,'#a7aa84');
    dot(c,-2.1*s,-33*s,.9*s,'#f5bfa2');dot(c,2.1*s,-33*s,.9*s,'#ed8a7b');
    c.restore();
  }
  drawPlayer(){
    const c=this.ctx,p=this.iso(this.game.player.x,this.game.player.y),s=this.zoom;
    dot(c,p.x,p.y+3*s,9*s,'rgba(5,16,14,.40)');
    if(this.game.player.attack>.0){
      c.beginPath();c.arc(p.x,p.y-18*s,28*s,-Math.PI*.8,Math.PI*.1);
      c.strokeStyle='rgba(252,213,153,.78)';c.lineWidth=3*s;c.stroke();
    }
    line(c,{x:p.x-3*s,y:p.y-10*s},{x:p.x-4*s,y:p.y+1*s},'#202c34',5*s);
    line(c,{x:p.x+3*s,y:p.y-10*s},{x:p.x+4*s,y:p.y+1*s},'#202c34',5*s);
    line(c,{x:p.x,y:p.y-27*s},{x:p.x,y:p.y-9*s},'#d6a36a',11*s);
    c.fillStyle='#304c52';c.fillRect(p.x+6*s,p.y-27*s,6*s,16*s);
    line(c,{x:p.x-4*s,y:p.y-23*s},{x:p.x-10*s,y:p.y-13*s},'#d8bb96',4*s);
    line(c,{x:p.x+5*s,y:p.y-23*s},{x:p.x+11*s,y:p.y-13*s},'#d8bb96',4*s);
    dot(c,p.x,p.y-32*s,7*s,'#dfbc96');
    c.fillStyle='#27363c';c.fillRect(p.x-7*s,p.y-39*s,14*s,3*s);
    if(this.game.player.flashlight){
      const vx=Math.cos(this.game.player.facing),vy=Math.sin(this.game.player.facing);
      const target=this.iso(this.game.player.x+vx*6,this.game.player.y+vy*6);
      c.fillStyle='rgba(255,246,176,.08)';c.beginPath();c.moveTo(p.x,p.y-20*s);
      c.lineTo(target.x-32*s,target.y-4*s);c.lineTo(target.x+32*s,target.y-4*s);c.closePath();c.fill();
    }
  }
  drawBunkerInterior(){
    const c=this.ctx;
    for(let y=-8;y<=8;y++)for(let x=-9;x<=9;x++){
      this.tile(x+.5,y+.5,(x+y)%2?'#576269':'#647178','#3d4a50');
      if(x===-9||x===9||y===-8||y===8){const p=this.iso(x+.5,y+.5);c.fillStyle='#26353a';c.fillRect(p.x-6*this.zoom,p.y-17*this.zoom,12*this.zoom,15*this.zoom);}
    }
    for(let i=-6;i<=6;i+=3){
      const p=this.iso(i,-5);c.fillStyle='#39484f';c.fillRect(p.x-11*this.zoom,p.y-18*this.zoom,22*this.zoom,15*this.zoom);
      dot(c,p.x,p.y-17*this.zoom,2*this.zoom,'#a4d5bf');
    }
    for(let i=-5;i<=5;i+=3){const p=this.iso(i,5);c.fillStyle='#8a8865';c.fillRect(p.x-8*this.zoom,p.y-13*this.zoom,16*this.zoom,11*this.zoom);}
    this.drawPlayer();
    for(const z of this.game.zombies)if(z.inside)this.drawZombie(z);
    c.fillStyle='#9dd7b7';c.font=`bold ${Math.round(10*this.zoom)}px system-ui`;c.textAlign='center';
    const p=this.iso(0,7);c.fillText('SAÍDA [E]',p.x,p.y-15*this.zoom);
  }
  drawMap(){
    const g=this.game,c=this.ctx;
    const size=Math.min(this.w*.75,this.h*.75,570),x=(this.w-size)/2,y=(this.h-size)/2;
    c.save();c.fillStyle='rgba(10,18,22,.96)';c.fillRect(x-17,y-37,size+34,size+66);
    c.strokeStyle='rgba(223,228,205,.32)';c.strokeRect(x-17,y-37,size+34,size+66);
    c.fillStyle='#e9eedc';c.font='bold 16px system-ui';c.textAlign='left';c.fillText('MAPA ESTRATÉGICO',x,y-13);
    const regions=regionMiniMap(g.player.x,g.player.y,g.seed,4);const side=size/9;
    const col={aldeia:'#b38b6b',campos:'#8b9655',floresta:'#325b48',suburbio:'#637f8b',prisao:'#963f4d',bunker:'#b29d51',industrial:'#696e7c'};
    for(const r of regions){
      const {rx,ry}=regionOf(g.player.x,g.player.y);
      const px=x+(r.rx-rx+4)*side,py=y+(r.ry-ry+4)*side;
      c.fillStyle=col[r.kind];c.fillRect(px+1,py+1,side-2,side-2);
      if(r.rx===rx&&r.ry===ry){c.strokeStyle='#f9efc7';c.lineWidth=2;c.strokeRect(px+2,py+2,side-4,side-4);dot(c,px+side/2,py+side/2,5,'#fff');}
      if(r.kind==='bunker'||r.kind==='prisao'){c.fillStyle='#f5eed8';c.font=`bold ${Math.round(side*.23)}px system-ui`;c.textAlign='center';c.fillText(r.kind==='prisao'?'P':'B',px+side/2,py+side*.55);}
    }
    c.textAlign='left';c.fillStyle='#c4d0c7';c.font='11px system-ui';
    c.fillText('VERDE floresta    DOURADO campos    VERMELHO prisão    B bunker',x,y+size+20);c.restore();
  }
  draw(){
    const c=this.ctx,g=this.game;
    const sky=c.createLinearGradient(0,0,0,this.h);sky.addColorStop(0,'#a5b6a9');sky.addColorStop(1,'#293c34');
    c.fillStyle=sky;c.fillRect(0,0,this.w,this.h);
    if(g.player.inside){this.drawBunkerInterior();}
    else {
      const radius=this.w<700?16:23;
      const px=Math.floor(g.player.x),py=Math.floor(g.player.y);
      const objects=[];
      for(let iy=py-radius;iy<=py+radius;iy++){
        for(let ix=px-radius;ix<=px+radius;ix++){
          const projected=this.iso(ix+.5,iy+.5);
          if(projected.x< -110||projected.x>this.w+110||projected.y< -150||projected.y>this.h+120)continue;
          this.renderTile(ix,iy,terrainAt(ix,iy,g.seed));
          const obj=g.objectAt(ix,iy);
          if(obj)objects.push({depth:ix+iy+.5,priority:0,fn:()=>this.drawFeature(obj)});
          const loot=g.lootAt(ix,iy);
          if(loot&&!g.lootTaken.has(loot.id))objects.push({depth:ix+iy+.6,priority:1,fn:()=>this.drawLoot(loot,ix,iy)});
        }
      }
      const minRX=Math.floor((px-radius)/REGION),maxRX=Math.floor((px+radius)/REGION);
      const minRY=Math.floor((py-radius)/REGION),maxRY=Math.floor((py+radius)/REGION);
      for(let ry=minRY;ry<=maxRY;ry++)for(let rx=minRX;rx<=maxRX;rx++){
        const plan=g.getPlan(rx,ry);
        for(const b of plan.buildings)objects.push({depth:b.x+b.y+b.w+b.h-1,priority:0,fn:()=>this.drawBuilding(b)});
        for(const f of plan.features)if(f.type==='muro')objects.push({depth:f.x+f.y+f.w+f.h-2,priority:-1,fn:()=>this.drawPrisonFence(f)});
      }
      for(const z of g.zombies)if(!z.inside)objects.push({depth:z.x+z.y,priority:2,fn:()=>this.drawZombie(z)});
      objects.push({depth:g.player.x+g.player.y,priority:3,fn:()=>this.drawPlayer()});
      objects.sort((a,b)=>a.depth-b.depth||a.priority-b.priority);
      for(const obj of objects)obj.fn();
    }
    this.frame++;
    if(g.rain){
      c.strokeStyle='rgba(203,234,239,.28)';c.lineWidth=1;
      for(let i=0;i<95;i++){
        const x=mod(hash(i,13,g.seed)*this.w+this.frame*(2+i%3),this.w);
        const y=mod(hash(i,77,g.seed)*this.h+this.frame*(9+i%4),this.h);
        line(c,{x,y},{x:x-7,y:y+17},'rgba(192,223,235,.28)',.8);
      }
    }
    const tod=mod(g.clockMinutes,1440)/1440;
    const darkness=tod>.72||tod<.22 ? Math.min(.68,tod>.72?(tod-.72)*2.2:(.22-tod)*2.7) : 0;
    if(darkness>0){c.fillStyle=`rgba(8,15,27,${darkness})`;c.fillRect(0,0,this.w,this.h);}
    if(g.hitFlash>0){c.fillStyle=`rgba(174,32,39,${Math.min(.42,g.hitFlash*.16)})`;c.fillRect(0,0,this.w,this.h);}
    if(g.mapOpen)this.drawMap();
  }
}

installPixelDetail(SurvivalRenderer);
