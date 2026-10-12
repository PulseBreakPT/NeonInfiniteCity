import {articulatedPose,projectBodyJoint} from './player-biomechanics.js';
// CLUB DYNASTY Match Broadcast v3.
// Procedural 2.5D stadium and articulated footballers, no image downloads,
// no textures, no dependencies. Physics & saves stay entirely separate.
const W=68,L=105;
export const CAMERA_MODES=['tv','balanced','sideline','aerial'];
export const cameraTitle={tv:'TV',balanced:'EQUILIBRADA',sideline:'LATERAL',aerial:'TÁTICA'};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
export function interpolateWorld(world,progress=1){
 const t=smooth(clamp(progress,0,1));
 const previous=new Map((world.previous?.players||[]).map(p=>[p.id,p]));
 const players=world.players.filter(p=>p.active!==false||(p.pose==='injured'&&world.tick-(p.injuryTick??0)<22)).map(p=>{
  const a=previous.get(p.id)||p;
  return {...p,x:mix(a.x,p.x,t),y:mix(a.y,p.y,t),
   speed:Math.hypot(p.vx||0,p.vy||0),
   direction:Math.atan2(p.vy||0,p.vx||0)};
 });
 const old=world.previous?.ball||world.ball;
 let ball={x:mix(old.x,world.ball.x,t),y:mix(old.y,world.ball.y,t),
   z:mix(old.z||0,world.ball.z||0,t)};
 // The renderer never invents a ball location: it follows the physical world exactly.
 return {players,ball,carrier:world.ball.owner,restart:world.restart,
  phase:world.phase,events:world.events,score:world.score};
}
function polygon(c,pts,fill,stroke=null,lineWidth=1){
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
 if(fill){c.fillStyle=fill;c.fill();}
 if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}
}
function capsule(c,x1,y1,x2,y2,w,color){
 c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
}
export function broadcastProject(mode,width,height,focus={x:W/2,y:L/2},previous=null){
 const h=height,w=width;
 const side=mode==='tv'||mode==='sideline';
 const zoom=mode==='sideline'?1.38:mode==='tv'?1.05:mode==='balanced'?1.1:.90;
 const fit=mode==='aerial'?Math.min((w-18)/68,(h-25)/105):0;
 const verticalScale=mode==='aerial'?fit:side?clamp(h/68,2.8,7.2):clamp(w/68,3.1,8);
 const horizontalScale=side?clamp(w/65,4.2,12):verticalScale*1.04;
 const xScale=(side?horizontalScale:verticalScale)*zoom;
 const yScale=(mode==='aerial'?verticalScale:side?verticalScale*.77:verticalScale*1.12)*zoom;
 const desired=mode==='aerial'?{x:34,y:52.5}:{x:focus.x,y:focus.y};
 const f=previous?{x:mix(previous.x,desired.x,.055),y:mix(previous.y,desired.y,.055)}:desired;
 function at(x,y){
  if(side)return {x:w/2+(52.5-y)*xScale,y:h/2+(x-f.x)*yScale+(y-f.y)*.09*yScale};
  return {x:w/2+(x-f.x)*xScale,y:h/2+(y-f.y)*yScale};
 }
 // Side-on modes must pan horizontally toward the ball as well.
 const project=side?(x,y)=>{
  const p=at(x,y);
  p.x+= (f.y-52.5)*xScale;
  return p;
 }:at;
 return {mode,focus:f,project,side,xScale,yScale,width:w,height:h,
  portrait:!side,visibleScale:zoom};
}
export function createBroadcastRenderer(canvas,session){
 const host=canvas?.parentElement,ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});
 if(!ctx||!host||!session?.world)return null;
 let width=0,height=0,ratio=0,disposed=false;
 let camera=null,cameraMode=CAMERA_MODES.includes(session.camera)?session.camera:'tv';
 let lastFrameTime=0,renderCount=0;
 const turf=['#1d5939','#226543','#246e49','#1c5b3c','#246c46'];
 host.classList.add('spatial-ready','broadcast-ready');
 function ensureSize(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(w<100||h<120)return false;
  // 1.5x pixels are enough for a detailed 300px Android pitch; avoid 4x VRAM.
  const pixelRatio=Math.min(1.65,window.devicePixelRatio||1);
  if(w!==width||h!==height||ratio!==pixelRatio){
   width=w;height=h;ratio=pixelRatio;
   canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
   camera=null;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);return true;
 }
 function pitch(p,mode){
  const c=ctx;
  // Stadium lighting and audience are deliberately behind the field.
  const sky=c.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,'#061b20');sky.addColorStop(.42,'#0e302e');sky.addColorStop(1,'#071d20');
  c.fillStyle=sky;c.fillRect(0,0,width,height);
  for(let row=0;row<4;row++){
   const bandY=row<2?row*7:height-(4-row)*7;
   c.fillStyle=row%2?'#243e40':'#183338';
   c.fillRect(0,bandY,width,7);
   c.fillStyle='#c2d7b4';
   const count=Math.ceil(width/12);
   for(let i=0;i<count;i++){
    const offset=(i*53+row*17)%11;
    c.globalAlpha=.13+(i%5)*.045;
    c.fillRect(i*12+offset,bandY+2,2,2);
   }
   c.globalAlpha=1;
  }
  const q=(x,y)=>{const a=p.project(x,y);return [a.x,a.y];};
  // Wider than the legal touchlines, like a real pitch on a stadium floor.
  const outer=[q(-3,-3),q(71,-3),q(71,108),q(-3,108)];
  polygon(c,outer,'#163d30');
  c.save();c.beginPath();const corners=[q(0,0),q(68,0),q(68,105),q(0,105)];
  corners.forEach((a,i)=>i?c.lineTo(...a):c.moveTo(...a));c.closePath();c.clip();
  polygon(c,corners,'#1f663f');
  // Soft stripes and subtle mowing bands.
  for(let j=0;j<12;j++){
   const y0=105*j/12,y1=105*(j+1)/12;
   polygon(c,[q(0,y0),q(68,y0),q(68,y1),q(0,y1)],turf[j%5]);
  }
  const light=c.createLinearGradient(0,0,width,height);
  light.addColorStop(0,'rgba(205,255,200,.085)');light.addColorStop(.49,'rgba(255,255,255,0)');
  light.addColorStop(1,'rgba(0,8,7,.25)');
  c.fillStyle=light;c.fillRect(0,0,width,height);
  c.restore();
  const line='#c7eacc';c.strokeStyle=line;c.lineWidth=1.25;
  const segment=(a,b,thick=1.3)=>{
   const A=p.project(...a),B=p.project(...b);
   c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.strokeStyle=line;c.lineWidth=thick;c.stroke();
  };
  const rect=(x1,y1,x2,y2)=>{
   segment([x1,y1],[x2,y1]);segment([x2,y1],[x2,y2]);
   segment([x2,y2],[x1,y2]);segment([x1,y2],[x1,y1]);
  };
  rect(0,0,68,105);segment([0,52.5],[68,52.5]);
  const oval=(cx,cy,r,start=0,end=Math.PI*2)=>{
   c.beginPath();
   for(let i=0;i<=64;i++){
    const t=start+(end-start)*i/64,A=p.project(cx+r*Math.cos(t),cy+r*Math.sin(t));
    if(i===0)c.moveTo(A.x,A.y);else c.lineTo(A.x,A.y);
   }
   c.strokeStyle=line;c.lineWidth=1.2;c.stroke();
  };
  oval(34,52.5,9.15);
  for(const goalY of [0,105]){
   const top=goalY===0,d=top?1:-1;
   rect(13.84,goalY,54.16,goalY+16.5*d);
   rect(24.84,goalY,43.16,goalY+5.5*d);
   const spot=p.project(34,goalY+11*d);
   c.beginPath();c.arc(spot.x,spot.y,1.75,0,Math.PI*2);c.fillStyle=line;c.fill();
   oval(34,goalY+11*d,9.15,top?.31:Math.PI+.31,top?Math.PI-.31:Math.PI*2-.31);
   // Procedural goal, net volume, frame, shadow.
   const gA=p.project(30.34,goalY),gB=p.project(37.66,goalY);
   const backA=p.project(30.34,goalY-d*2.3),backB=p.project(37.66,goalY-d*2.3);
   polygon(c,[[gA.x,gA.y],[gB.x,gB.y],[backB.x,backB.y],[backA.x,backA.y]],'rgba(223,247,240,.14)','rgba(249,255,244,.9)',1.5);
   c.strokeStyle='rgba(230,255,235,.34)';c.lineWidth=.7;
   for(let i=1;i<6;i++){
    const t=i/6;
    const A=p.project(30.34+7.32*t,goalY);
    const B=p.project(30.34+7.32*t,goalY-d*2.3);
    c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.stroke();
   }
   for(let i=1;i<=2;i++){
    const A=p.project(30.34,goalY-d*2.3*i/3),B=p.project(37.66,goalY-d*2.3*i/3);
    c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.stroke();
   }
  }
  // Matchside LED ads (apparent signage; never obscures players).
  if(p.side){
   c.fillStyle='#0c282d';c.fillRect(0,height-23,width,23);
   for(let i=0;i<7;i++){
    c.fillStyle=i%2===0?'#bafda4':'#e7f3e1';c.font='900 9px sans-serif';
    c.fillText(i%2?'CLUB DYNASTY':'MATCHDAY',i*118-(renderCount%200)*.05,height-8);
   }
  }
 }
 function footballer(p,pr,frame){
  const c=ctx,pt=pr.project(p.x,p.y),home=p.side===0,keeper=p.pos==='GK';
  const size=clamp(Math.min(width/39,12)*(pr.mode==='sideline'?1.28:pr.mode==='tv'?1.04:pr.mode==='aerial'?.72:.88),5.3,13);
  const pose=articulatedPose(p,frame.tick||0);
  const project=j=>projectBodyJoint(j,p,{angle:pose.facing,project:pr.project},size*1.13);
  const sk={pelvis:project(pose.pelvis),chest:project(pose.chest),head:project(pose.head),
   hips:pose.hips.map(project),knees:pose.knees.map(project),feet:pose.feet.map(project),
   shoulders:pose.shoulders.map(project),elbows:pose.elbows.map(project),hands:pose.hands.map(project)};
  const color=keeper?(home?'#e8ba66':'#a79ee3'):(home?'#dffaaf':'#f96c77');
  const shorts=keeper?'#142c34':home?'#173c3a':'#f0ecdf';
  const skin=['#dbb597','#b67e58','#e2c6a6','#956243'][((p.index+p.side*11)*7)%4];
  c.beginPath();c.ellipse(pt.x+1,pt.y+size*.19,size*.7,size*.25,0,0,Math.PI*2);
  c.fillStyle='rgba(0,17,16,.50)';c.fill();
  const drawBone=(a,b,w,col)=>capsule(c,a.x,a.y,b.x,b.y,w,col);
  // Rear leg and arm, then the torso, then the near limbs create depth.
  for(let i=0;i<2;i++){
   drawBone(sk.hips[i],sk.knees[i],size*.30,shorts);
   drawBone(sk.knees[i],sk.feet[i],size*.19,home?'#eff5ec':'#faf9f0');
   drawBone(sk.elbows[i],sk.hands[i],size*.19,skin);
  }
  polygon(c,[
   [sk.pelvis.x-size*.28,sk.pelvis.y],[sk.pelvis.x+size*.28,sk.pelvis.y],
   [sk.chest.x+size*.45,sk.chest.y],[sk.chest.x-size*.45,sk.chest.y]
  ],color,home?'#729e75':'#883f46',.8);
  for(let i=0;i<2;i++){
   drawBone(sk.shoulders[i],sk.elbows[i],size*.23,color);
   c.beginPath();c.arc(sk.hands[i].x,sk.hands[i].y,size*.12,0,Math.PI*2);
   c.fillStyle=keeper?'#f5ee8c':skin;c.fill();
  }
  c.beginPath();c.ellipse(sk.head.x,sk.head.y,size*.29,size*.36,0,0,Math.PI*2);
  c.fillStyle=skin;c.fill();
  c.beginPath();c.ellipse(sk.head.x,sk.head.y-size*.19,size*.28,size*.13,0,0,Math.PI*2);
  c.fillStyle='#232920';c.fill();
  c.font='900 '+Math.max(7,size*.8)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.strokeStyle='rgba(0,18,12,.88)';c.lineWidth=2;c.fillStyle=home?'#173d2d':'#fff';
  const number=String(p.number||p.index+1);
  c.strokeText(number,sk.chest.x,sk.chest.y+size*.16);
  c.fillText(number,sk.chest.x,sk.chest.y+size*.16);
  if(frame.carrier===p.id){
   c.beginPath();c.ellipse(pt.x,pt.y,size*1.28,size*.6,0,0,Math.PI*2);
   c.strokeStyle='#e3ff86';c.lineWidth=1.6;c.stroke();
  }
  return pt;
 }
 function ballAt(ball,p){
  const c=ctx,point=p.project(ball.x,ball.y);
  const lift=clamp((ball.z||0)*2.5,0,22);
  c.beginPath();c.ellipse(point.x,point.y+2.5,3.2+lift*.11,2.2+lift*.05,0,0,Math.PI*2);
  c.fillStyle='rgba(0,13,14,.52)';c.fill();
  const y=point.y-lift;
  c.beginPath();c.arc(point.x,y,3.8,0,Math.PI*2);
  c.fillStyle='#f9fffb';c.fill();c.strokeStyle='#17302d';c.lineWidth=.8;c.stroke();
  polygon(c,[[point.x,y-1.8],[point.x+1.6,y-.1],[point.x+1.2,y+1.7],[point.x-1.1,y+1.7],[point.x-1.7,y-.1]],'#28343d');
 }
 function weatherLayer(world,foreground=false){
  const weather=world.weather;if(!weather)return;
  const rain=weather.rainfall||0,wet=weather.wetness||0;
  if(!foreground&&wet>.07){
   ctx.fillStyle='rgba(142,192,220,'+Math.min(.10,wet*.13)+')';
   ctx.fillRect(0,0,width,height);
  }
  if(foreground&&rain>.055){
   const amount=Math.min(110,Math.ceil(rain*76)),drift=(weather.windX||0)*1.3;
   ctx.strokeStyle='rgba(203,236,255,'+Math.min(.44,rain*.45)+')';
   ctx.lineWidth=1;ctx.beginPath();
   for(let i=0;i<amount;i++){
    const x=(i*73.7+(renderCount*1.4)+37)%width;
    const y=(i*137.3+renderCount*3.7)%height;
    ctx.moveTo(x,y);ctx.lineTo(x+drift+3,y+8+rain*7);
   }
   ctx.stroke();
  }
  if(foreground){
   const title={limpo:'☀ CÉU LIMPO',nublado:'☁ NUBLADO',chuva:'☂ CHUVA',aguaceiros:'☂ AGUACEIROS',vento:'➤ VENTO'}[weather.condition]||'TEMPO';
   const speed=Math.round(weather.windSpeed||0);
   const message=title+'  ·  VENTO '+speed+' m/s  ·  '+Math.round(weather.temperature||19)+'°C';
   ctx.save();ctx.font='800 10px sans-serif';ctx.textBaseline='middle';
   const tw=ctx.measureText(message).width;
   ctx.fillStyle='rgba(5,26,23,.85)';ctx.fillRect(7,height-32,tw+24,24);
   ctx.fillStyle='#d9ffce';ctx.fillText(message,18,height-20);ctx.restore();
  }
 }
 function draw(_,blend=1){
  if(disposed||!ensureSize())return;
  const frame=interpolateWorld(session.world,blend);
  frame.tick=(session.world.tick||0)+blend;
  const mode=CAMERA_MODES.includes(session.camera)?session.camera:cameraMode;
  if(mode!==cameraMode){cameraMode=mode;camera=null;}
  // Actual camera is smoothed separately from the football's physics.
  const focus={x:frame.ball.x,y:frame.ball.y};
  camera=broadcastProject(mode,width,height,focus,camera?.focus);
  pitch(camera,mode);
  weatherLayer(session.world,false);
  // Render players by depth; the scene has arms, head, legs, kits and numbers.
  frame.players.slice().sort((a,b)=>camera.project(a.x,a.y).y-camera.project(b.x,b.y).y)
   .forEach(p=>footballer(p,camera,frame));
  ballAt(frame.ball,camera);
  weatherLayer(session.world,true);
  // Minimal broadcast on-pitch telemetry.
  if(frame.restart){
   const tags={corner:'CANTO',freekick:'LIVRE',penalty:'PENÁLTI',throwin:'LANÇAMENTO',goalkick:'PONTAPÉ DE BALIZA',offside:'FORA DE JOGO'};
   const label=tags[frame.restart.kind]||'BOLA PARADA';
   ctx.font='900 11px sans-serif';
   const textWidth=ctx.measureText(label).width;
   ctx.fillStyle='rgba(5,26,23,.89)';ctx.fillRect(8,8,textWidth+22,26);
   ctx.fillStyle='#ddffb1';ctx.fillText(label,19,25);
  }
  renderCount++;
 }
 function setCamera(mode){
  if(!CAMERA_MODES.includes(mode))return;
  cameraMode=mode;session.camera=mode;camera=null;draw(session.minute,1);
 }
 function dispose(){disposed=true;host.classList.remove('spatial-ready','broadcast-ready');}
 return {draw,setCamera,dispose,getMode:()=>cameraMode};
}
