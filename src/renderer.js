import{SIZE,project,inside,objectives,nearby,distance}from'./core.js';
export class Renderer{
 constructor(canvas,mini,world,assets,atlas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.mini=mini;this.world=world;this.assets=assets;this.atlas=atlas;this.camera={x:0,y:0};this.zoom=1;this.lantern=true;this.rain=false;this.resize();this.makeTerrain();}
 resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(devicePixelRatio||1,1.75);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';}
 poly(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 sprite(sheet,index,x,y,height,opacity=1){const r=this.atlas[sheet]?.[index];if(!r)return;const c=this.ctx;const w=r[2]/r[3]*height;c.save();c.globalAlpha=opacity;c.drawImage(this.assets[sheet],...r,x-w/2,y-height,w,height);c.restore();}
 makeTerrain(){
  this.ground=document.createElement('canvas');this.pad=80;this.ground.width=SIZE*96+160;this.ground.height=SIZE*48+160;const c=this.ground.getContext('2d');const old=this.ctx;this.ctx=c;c.translate(SIZE*48+this.pad,this.pad);
  for(let sum=0;sum<SIZE*2;sum++)for(let x=0;x<SIZE;x++){
   const y=sum-x;if(y<0||y>=SIZE)continue;const p=project(x+.5,y+.5);let type=0;
   const hash=((x*73856093)^(y*19349663))>>>0;
   if(x>=19&&x<=22||y>=19&&y<=21)type=hash%4===0?6:5;
   else if(x>=17&&x<=24||y>=17&&y<=23)type=8;
   else if(x<3||y<3||x>38||y>38)type=hash%2?13:12;
   else type=[0,0,0,1,2,12][hash%6];
   if(x>32&&y>31)type=[3,4,14][hash%3];
   for(const b of this.world.buildings){if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h)type=b.floor;else if(x>=b.door-1&&x<=b.door+1&&y>=b.y+b.h&&y<b.y+b.h+4)type=7;}
   if(x>=4&&x<=6&&y>=8&&y<=10)type=9;
   const points=[{x:p.x,y:p.y-24},{x:p.x+48,y:p.y},{x:p.x,y:p.y+24},{x:p.x-48,y:p.y}];this.poly(points,['#586342','#807858','#74614b','#bcac85','#767570','#474d4a','#454b47','#87867a','#9a9887','#92705a','#756957','#9f9d88','#536043','#625b42','#585345','#6a6c63'][type]);
   c.save();c.clip();const r=this.atlas.terrain[type];c.drawImage(this.assets.terrain,...r,p.x-48.5,p.y-24.5,97,49);c.restore();
   // Painted road markings follow the isometric ground plane.
   if((x===20&&y%3!==0&&!(y>=18&&y<=22))||(y===20&&x%3!==0&&!(x>=18&&x<=23))){c.save();c.globalAlpha=.55;const a=project(x+.45,y+.1),b=project(x+.45,y+.9);const aa=y===20?project(x+.1,y+.5):a,bb=y===20?project(x+.9,y+.5):b;c.strokeStyle='#ded9bd';c.lineWidth=2;c.beginPath();c.moveTo(aa.x,aa.y);c.lineTo(bb.x,bb.y);c.stroke();c.restore();}
  }
  this.ctx=old;
 }
 shadow(x,y,w=15){const c=this.ctx;c.fillStyle='rgba(12,20,15,.28)';c.beginPath();c.ellipse(x,y,w,w*.42,0,0,Math.PI*2);c.fill();}
 building(b,state){
  const c=this.ctx;const near=inside(state.player,b,3.8);const H=near?63:82;
  const p=(x,y,h=0)=>{const q=project(x,y);q.y-=h;return q;};const a=p(b.x,b.y),bb=p(b.x+b.w,b.y),d=p(b.x,b.y+b.h),e=p(b.x+b.w,b.y+b.h);
  // Back walls leave the interior and front doorway visible near the player.
  this.poly([a,bb,p(b.x+b.w,b.y,H),p(b.x,b.y,H)],b.color,'#484e42');
  this.poly([a,d,p(b.x,b.y+b.h,H),p(b.x,b.y,H)],'#697267','#424d43');
  for(let i=1;i<b.w-1;i+=2){const q=p(b.x+i,b.y,H*.6);this.poly([{x:q.x-13,y:q.y},{x:q.x+14,y:q.y+13},{x:q.x+14,y:q.y-13},{x:q.x-13,y:q.y-26}],state.generator&&b.id==='shelter'?'#e1b969':'#344441','#b5ae93');}
  if(!near){this.poly([d,e,p(b.x+b.w,b.y+b.h,H),p(b.x,b.y+b.h,H)],b.color,'#424b42');this.poly([bb,e,p(b.x+b.w,b.y+b.h,H),p(b.x+b.w,b.y,H)],'#657064','#424b42');this.poly([p(b.x-.2,b.y-.2,H),p(b.x+b.w+.2,b.y-.2,H),p(b.x+b.w+.2,b.y+b.h+.2,H),p(b.x-.2,b.y+b.h+.2,H)],b.roof,'#3a443e');
   for(let i=0;i<b.w;i++){const q1=p(b.x+i,b.y,H+1),q2=p(b.x+i,b.y+b.h,H+1);c.strokeStyle='rgba(230,225,198,.12)';c.beginPath();c.moveTo(q1.x,q1.y);c.lineTo(q2.x,q2.y);c.stroke();}
  }else{
   const low=12;for(const [x1,x2]of[[b.x,b.door-.85],[b.door+.85,b.x+b.w]])this.poly([p(x1,b.y+b.h),p(x2,b.y+b.h),p(x2,b.y+b.h,low),p(x1,b.y+b.h,low)],'#9b9d87','#555e51');
  }
  const sign=p(b.door,b.y+b.h,near?18:H-20);c.save();c.translate(sign.x,sign.y);c.fillStyle='#283b33';c.fillRect(-49,-15,98,22);c.strokeStyle='#a0a385';c.strokeRect(-49,-15,98,22);c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#e7dfc3';c.fillText(b.name,0,0);c.restore();
 }
 draw(state,dt,playing){
  const c=this.ctx,p=project(state.player.x,state.player.y);const blend=1-Math.exp(-dt*7);this.camera.x+=(p.x-this.camera.x)*blend;this.camera.y+=(p.y-this.camera.y)*blend;
  const base=this.w<600?.75:1;const zoom=base*this.zoom;this.scale=zoom;const offsetX=this.w*.5,offsetY=this.h*(this.w<600?.49:.56);this.origin={x:offsetX-this.camera.x*zoom,y:offsetY-this.camera.y*zoom};
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#26352c';c.fillRect(0,0,this.w,this.h);c.save();c.translate(this.origin.x,this.origin.y);c.scale(zoom,zoom);c.imageSmoothingEnabled=true;
  c.drawImage(this.ground,-SIZE*48-this.pad,-this.pad);
  const visible=(x,y,h=150)=>{const q=project(x,y);return q.x>this.camera.x-this.w/zoom/2-350&&q.x<this.camera.x+this.w/zoom/2+350&&q.y>this.camera.y-this.h/zoom-200&&q.y<this.camera.y+this.h/zoom+h;};
  const nodes=[];
  for(const b of this.world.buildings)nodes.push({depth:b.x+b.y+b.w+b.h-.1,draw:()=>this.building(b,state)});
  for(const t of this.world.trees)if(visible(t.x,t.y))nodes.push({depth:t.x+t.y,draw:()=>{const q=project(t.x,t.y);this.shadow(q.x,q.y,30);c.fillStyle='#665f47';c.fillRect(q.x-4,q.y-45,8,44);this.sprite('props',14,q.x,q.y-25,t.height);}});
  for(const o of this.world.props)if(visible(o.x,o.y))nodes.push({depth:o.x+o.y,draw:()=>{
   const q=project(o.x,o.y);const heights=[39,42,45,24,24,36,23,17,43,42,38,68,37,64,44,18];this.shadow(q.x,q.y,o.type===14?18:16);this.sprite('props',o.type,q.x,q.y,heights[o.type]*(o.scale||1));
   if(o.loot&&!state.collected.includes(o.id)){c.strokeStyle='#e0c776';c.lineWidth=1.3;c.beginPath();c.ellipse(q.x,q.y+1,18,8,0,0,Math.PI*2);c.stroke();c.fillStyle='#ead18c';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText('+',q.x,q.y-45-Math.sin(state.time*2)*2);}
   if(o.generator&&state.generator){c.fillStyle='#b0df85';c.beginPath();c.arc(q.x+7,q.y-25,3,0,7);c.fill();}
  }});
  for(const e of this.world.enemies)if(visible(e.x,e.y))nodes.push({depth:e.x+e.y,draw:()=>{const q=project(e.x,e.y);this.shadow(q.x,q.y);c.save();c.filter='grayscale(1) sepia(.6) brightness(.55)';this.sprite('male-walk',e.direction*4+(Math.floor(e.phase*4)%4),q.x,q.y,68);c.restore();if(distance(e,state.player)<6){c.fillStyle='#d18465';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('!',q.x,q.y-77);}}});
  nodes.push({depth:state.player.x+state.player.y,draw:()=>{
   const q=project(state.player.x,state.player.y),u=state.player;this.shadow(q.x,q.y,14);c.strokeStyle='#c6d3a0';c.lineWidth=1.3;c.beginPath();c.ellipse(q.x,q.y,15,7,0,0,7);c.stroke();
   if(u.invulnerable>0&&Math.floor(state.time*12)%2===0)c.globalAlpha=.5;
   if(u.moving)this.sprite(u.character+'-'+(u.running?'run':'walk'),u.direction*4+Math.floor(u.step)%4,q.x,q.y,74);else this.sprite('idle',(u.character==='female'?4:0)+u.direction,q.x,q.y,74);
   c.globalAlpha=1;
  }});
  nodes.sort((a,b)=>a.depth-b.depth);for(const n of nodes)n.draw();
  const target=objectives(state).find(o=>!o.done);if(target&&playing){const b=this.world.buildings.find(b=>b.id===target.target);const q=project(b.door,b.y+b.h+1);c.save();c.strokeStyle='#e4c981';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.ellipse(q.x,q.y,23,11,0,0,7);c.stroke();c.setLineDash([]);c.fillStyle='#e4c981';c.font='18px sans-serif';c.textAlign='center';c.fillText('⌄',q.x,q.y-7-Math.sin(state.time*2)*3);c.restore();}
  c.restore();
  const dark=Math.min(.27,.09+state.time/4000);c.fillStyle=`rgba(19,31,32,${dark})`;c.fillRect(0,0,this.w,this.h);
  if(this.lantern){const x=offsetX,y=offsetY-20;const glow=c.createRadialGradient(x,y,5,x,y,200*zoom);glow.addColorStop(0,'rgba(245,206,128,.10)');glow.addColorStop(1,'rgba(245,206,128,0)');c.fillStyle=glow;c.fillRect(0,0,this.w,this.h);}
  const vignette=c.createRadialGradient(this.w/2,this.h/2,this.w*.15,this.w/2,this.h/2,Math.max(this.w,this.h)*.7);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(10,23,19,.53)');c.fillStyle=vignette;c.fillRect(0,0,this.w,this.h);
  if(this.rain){c.strokeStyle='rgba(210,223,217,.2)';c.lineWidth=1;for(let i=0;i<70;i++){const x=(i*163+state.time*90)%this.w,y=(i*77+state.time*380)%this.h;c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y+18);c.stroke();}}
  if(state.player.invulnerable>1){c.fillStyle='rgba(152,48,32,.13)';c.fillRect(0,0,this.w,this.h);}
 }
 drawMap(state,large=false){
  const canvas=this.mini,c=canvas.getContext('2d');const w=canvas.width;c.clearRect(0,0,w,w);c.fillStyle='#253a30';c.fillRect(0,0,w,w);const scale=w/SIZE;
  c.fillStyle='#6d7567';c.fillRect(19*scale,0,4*scale,w);c.fillRect(0,19*scale,w,3*scale);
  for(const b of this.world.buildings){c.fillStyle=b.id==='shelter'?'#b5c29b':'#9d9980';c.fillRect(b.x*scale,b.y*scale,b.w*scale,b.h*scale);if(large){c.fillStyle='#e9e6d8';c.font='10px sans-serif';c.textAlign='center';c.fillText(b.name,(b.x+b.w/2)*scale,(b.y+b.h+2)*scale);}}
  for(const e of this.world.enemies){if(distance(e,state.player)<7){c.fillStyle='#ce8063';c.fillRect(e.x*scale-1,e.y*scale-1,3,3);}}
  const task=objectives(state).find(o=>!o.done);if(task){const b=this.world.buildings.find(b=>b.id===task.target);c.strokeStyle='#e6c677';c.lineWidth=2;c.strokeRect(b.x*scale-2,b.y*scale-2,b.w*scale+4,b.h*scale+4);}
  c.fillStyle='#f4edd0';c.beginPath();c.arc(state.player.x*scale,state.player.y*scale,large?5:3,0,7);c.fill();
 }
}
