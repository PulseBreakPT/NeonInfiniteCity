/* AFTERFALL Pixel Detail: deterministic micro-geometry, no external assets. */
export function installPixelDetail(Renderer){
  const proto=Renderer.prototype;
  const terrainBase=proto.renderTile, buildingBase=proto.drawBuilding, treeBase=proto.drawTree, featureBase=proto.drawFeature;
  const hash=(x,y,seed)=>{let h=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
  const line=(c,a,b,color,width)=>{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const shape=(c,pts,fill,stroke)=>{c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}};
  const dot=(c,x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const block=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,w),Math.max(1,h));};
  proto.renderTile=function(x,y,t){
    terrainBase.call(this,x,y,t);
    const s=this.zoom,c=this.ctx,p=this.iso(x+.5,y+.5),seed=this.game.seed,h=hash(x,y,seed+19);
    if(t.material==='estrada'){
      if(h>.56){block(c,p.x-9*s,p.y-2*s,5*s,1*s,'#303b3e');block(c,p.x+3*s,p.y+4*s,4*s,1*s,'#777b78');}
      if(h>.85){line(c,this.iso(x+.15,y+.24),this.iso(x+.53,y+.32),'#343c3f',.85*s);line(c,this.iso(x+.53,y+.32),this.iso(x+.63,y+.63),'#343c3f',.8*s);}
      if(h>.975){dot(c,p.x,p.y,3.6*s,'#666967');dot(c,p.x,p.y,2.3*s,'#41484a');}
    } else if(t.material==='cimento'){
      if(h>.30)line(c,this.iso(x+.04,y+.70),this.iso(x+.55,y+.70),'rgba(40,52,52,.25)',.8*s);
      if(h>.78){block(c,p.x-7*s,p.y-2*s,3*s,1*s,'#bbc0b3');block(c,p.x+5*s,p.y+1*s,2*s,1*s,'#556462');}
    } else if(this.zoom>.55){
      const dust=t.material==='terra'?['#c19a6f','#67503b','#9c7752','#453c30']:['#a4b86e','#315538','#9fac72','#527f48'];
      for(let i=0;i<4;i++){
        const a=hash(x*13+i*7,y*19-i*31,seed+214),b=hash(x*17-i*11,y*13+i*5,seed+711);
        block(c,p.x+Math.floor((a-.5)*26)*s,p.y+Math.floor((b-.5)*12)*s,(i%2+1)*s,s,dust[i]);
      }
      if(h>.72){line(c,this.iso(x+.24,y+.38),this.iso(x+.28,y+.22),dust[2],1*s);line(c,this.iso(x+.24,y+.38),this.iso(x+.39,y+.28),dust[1],.8*s);}
    }
    if(t.kind==='campos'&&t.material==='terra'&&h>.21&&h<.82){
      block(c,p.x-2*s,p.y-5*s,2*s,5*s,'#789251');
      block(c,p.x+1*s,p.y-7*s,3*s,3*s,'#99b56a');
    }
  };
  proto.drawBuilding=function(b){
    buildingBase.call(this,b);
    const c=this.ctx,s=this.zoom;
    const p=this.game.player;
    if(p.x>b.x-1.5&&p.x<b.x+b.w+1.5&&p.y>b.y-1.5&&p.y<b.y+b.h+1.5)return;
    const roofHeight=36+(b.floors-1)*25;
    const hs=hash(b.x,b.y,this.game.seed+519);
    const prison=b.kind==='prisao'||b.kind==='abrigo', pitched=b.roof===1||b.kind==='celeiro'||b.kind==='quinta';
    const face1=this.iso(b.x+b.w,b.y+b.h,0);
    const face2=this.iso(b.x,b.y+b.h,0);
    const face3=this.iso(b.x+b.w,b.y,0);
    // Weathered mortar rows and randomly chipped bricks on both illuminated walls.
    for(let row=1;row<Math.floor(roofHeight/7);row++){
      const elev=row*7;
      line(c,this.iso(b.x+b.w,b.y+b.h,elev),this.iso(b.x,b.y+b.h,elev),'rgba(41,48,43,.23)',.72*s);
      line(c,this.iso(b.x+b.w,b.y,elev),this.iso(b.x+b.w,b.y+b.h,elev),'rgba(50,48,43,.20)',.72*s);
      for(let j=1;j<6;j++){
        const n=hash(b.x+row*17+j*23,b.y-row*7+j,this.game.seed+920);
        if(n<.53)continue;
        const q=this.iso(b.x+j*b.w/6,b.y+b.h,elev+2);
        block(c,q.x,q.y,2*s,1.2*s,'rgba(52,59,56,.36)');
      }
    }
    // Roof panel seams, weathering, staggered individual tiles.
    if(pitched){
      for(let row=1;row<=7;row++){
        const y=b.y+b.h*(.12+row*.095),z=roofHeight+1+(1-row/9)*10;
        const a=this.iso(b.x+.2,y,z),d=this.iso(b.x+b.w-.2,y,z);
        line(c,a,d,row%2?'rgba(39,43,40,.26)':'rgba(238,210,178,.23)',.95*s);
        for(let j=1;j<12;j++){
          const q=this.iso(b.x+j*b.w/12,y,z);
          if(hash(b.x+row+j*71,b.y-row,this.game.seed+129)>.45)block(c,q.x,q.y,1.1*s,2.6*s,'rgba(33,38,37,.25)');
        }
      }
    } else {
      for(let i=1;i<=8;i++){
        const q=this.iso(b.x+i*b.w/9,b.y+.5,roofHeight+1);
        const r=this.iso(b.x+i*b.w/9,b.y+b.h-.5,roofHeight+1);
        line(c,q,r,'rgba(27,34,38,.19)',.8*s);
      }
      const v=this.iso(b.x+b.w*.46,b.y+b.h*.46,roofHeight+7);
      block(c,v.x-6*s,v.y-7*s,12*s,7*s,'#475054');
      block(c,v.x-7*s,v.y-8*s,14*s,2*s,'#bcc1b9');
      for(let i=0;i<3;i++)block(c,v.x-4*s+i*3*s,v.y-4*s,1*s,3*s,'#272d31');
    }
    // Fireplaces, mechanical shafts and rooftop maintenance detailing.
    if(!prison&&(b.kind==='casa'||b.kind==='quinta'||b.kind==='cabana')){
      const ch=this.iso(b.x+b.w*.68,b.y+b.h*.36,roofHeight+11);
      block(c,ch.x-4*s,ch.y-14*s,7*s,14*s,'#765044');
      block(c,ch.x-5*s,ch.y-15*s,9*s,3*s,'#d0bca4');
      block(c,ch.x-2*s,ch.y-15*s,3*s,1*s,'#2d2b28');
    }
    if(b.kind==='bloco'){
      for(let floor=1;floor<b.floors;floor++)for(let j=1;j<4;j++){
        const q=this.iso(b.x+j*b.w/4,b.y+b.h,6+floor*25);
        line(c,{x:q.x-9*s,y:q.y+3*s},{x:q.x+9*s,y:q.y+3*s},'#d5d4cd',2.4*s);
        for(let k=-1;k<=1;k++)line(c,{x:q.x+k*7*s,y:q.y+3*s},{x:q.x+k*7*s,y:q.y-5*s},'#344d52',1*s);
        block(c,q.x-7*s,q.y+4*s,14*s,2*s,'#4a4f48');
      }
    }
    // Window ledges, shutter edges, downpipes and electrical boxes.
    for(let floor=0;floor<b.floors;floor++){
      for(let j=1;j<5;j++){
        const q=this.iso(b.x+b.w,b.y+b.h*j/5,15+floor*25);
        block(c,q.x-3*s,q.y+1*s,8*s,1.4*s,'#d9cfb7');
        block(c,q.x+4*s,q.y-12*s,1*s,11*s,'#4a615f');
      }
    }
    const drain=this.iso(b.x+b.w,b.y+b.h*.93,2);
    line(c,{x:drain.x+2*s,y:drain.y-26*s},{x:drain.x+2*s,y:drain.y+2*s},'#78817e',1.5*s);
    if(hs>.68&&!prison){
      const planter=this.iso(b.x+b.w*.18,b.y+b.h,3);
      block(c,planter.x-7*s,planter.y-5*s,13*s,4*s,'#8b6751');
      for(let i=0;i<4;i++)dot(c,planter.x+(i*3-4)*s,planter.y-6*s,2.5*s,['#48683d','#61874a','#789a56'][i%3]);
    }
  };
  proto.drawTree=function(o){
    treeBase.call(this,o);
    const c=this.ctx,s=this.zoom,p=this.iso(o.x+.5,o.y+.6);
    const h=(24+(o.size||.7)*34)*s,seed=Math.floor(o.x*91+o.y*37);
    for(let i=0;i<16;i++){
      const a=hash(seed+i*7,i*19,this.game.seed+224)*Math.PI*2;
      const dist=Math.sqrt(hash(seed-i*11,i*31,this.game.seed+441))*(12+9*(o.size||.7))*s;
      const x=p.x+Math.cos(a)*dist,y=p.y-h+Math.sin(a)*dist*.60;
      const r=(3.6+i%4)*(o.size||.8)*s;
      dot(c,x,y,r,['#275132','#447b40','#315e37','#5e9251','#709950'][i%5]);
      if(i%4===0)block(c,x-2*s,y-1*s,2*s,1.4*s,'#aec187');
    }
  };
  proto.drawFeature=function(f){
    if(!['carro','poste','caixote','arbusto'].includes(f.type)){featureBase.call(this,f);return;}
    const c=this.ctx,s=this.zoom,p=this.iso(f.x+.5,f.y+.5),seed=this.game.seed;
    if(f.type==='carro'){
      const side=hash(f.x,f.y,seed+120)>.5;
      const coords=side?[[-.65,-.22],[.65,-.22],[.65,.22],[-.65,.22]]:[[-.22,-.65],[.22,-.65],[.22,.65],[-.22,.65]];
      const pts=coords.map(v=>this.iso(f.x+.5+v[0],f.y+.5+v[1],2));
      const col=['#af5948','#687c7c','#d1c4ab','#425b68','#aa8360'][Math.floor(hash(f.x,f.y,seed+222)*5)];
      shape(c,pts,col,'#24363b');
      const upper=coords.map(v=>this.iso(f.x+.5+v[0]*.56,f.y+.5+v[1]*.64,10));
      shape(c,upper,'#45606b','#a0bcc0');
      for(let i of [0,2]){
        const q=pts[i];dot(c,q.x,q.y+3*s,3.4*s,'#141b20');dot(c,q.x,q.y+3*s,1.3*s,'#aeb3ae');
      }
      const light=pts[1];block(c,light.x-2*s,light.y-2*s,4*s,2*s,'#e5d6b0');
      const rear=pts[3];block(c,rear.x-2*s,rear.y-2*s,4*s,2*s,'#c15450');
      return;
    }
    if(f.type==='poste'){
      dot(c,p.x+8*s,p.y+4*s,6*s,'rgba(19,30,27,.23)');
      line(c,p,{x:p.x,y:p.y-48*s},'#606e69',3*s);
      line(c,{x:p.x-1*s,y:p.y-47*s},{x:p.x+14*s,y:p.y-51*s},'#7b8982',2*s);
      block(c,p.x+11*s,p.y-52*s,8*s,3*s,'#e7d6a2');return;
    }
    if(f.type==='caixote'){
      shape(c,[this.iso(f.x+.13,f.y+.12,9),this.iso(f.x+.92,f.y+.12,9),this.iso(f.x+.92,f.y+.91,9),this.iso(f.x+.13,f.y+.91,9)],'#647a73','#334744');
      block(c,p.x-7*s,p.y-10*s,13*s,8*s,'#456057');
      block(c,p.x-8*s,p.y-13*s,15*s,3*s,'#899b8e');
      return;
    }
    for(let i=0;i<10;i++){
      const angle=hash(f.x+i*5,f.y-i*7,seed+11)*Math.PI*2;
      const rr=(2+i%5)*s;
      dot(c,p.x+Math.cos(angle)*rr,p.y-4*s+Math.sin(angle)*rr*.5,(3+i%4)*s,['#376c38','#588348','#789950'][i%3]);
    }
  };
}