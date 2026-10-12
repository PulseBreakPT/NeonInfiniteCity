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
 const players=world.players.map(p=>{
  const a=previous.get(p.id)||p;
  return {...p,x:mix(a.x,p.x,t),y:mix(a.y,p.y,t),
   speed:Math.hypot(p.vx||0,p.vy||0),
   direction:Math.atan2(p.vy||0,p.vx||0)};
 });
 const old=world.previous?.ball||world.ball;
 let ball={x:mix(old.x,world.ball.x,t),y:mix(old.y,world.ball.y,t),
   z:mix(old.z||0,world.ball.z||0,t)};
 // Ball glued to the foot of the real carrier for first touch and dribbling.
 const owner=world.ball.owner!==null?players.find(p=>p.id===world.ball.owner):null;
 if(owner){ball.x=owner.x;ball.y=owner.y+(owner.side===0?-.72:.72);ball.z=.12;}
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
  const speed=p.speed||0;
  const stride=clamp(speed/7,0,1);
  const scale=pr.mode==='sideline'?1.28:pr.mode==='tv'?1.04:pr.mode==='aerial'?.72:.88;
  const size=clamp(Math.min(width/39,12)*scale,5.3,13);
  const tick=frame.tick||0;
  const swing=Math.sin(tick*.66+p.id*1.71)*stride;
  // Heading uses smoothed velocity, not direction to the ball or random motion.
  // The footballer's torso faces the projected direction of movement.
  // In a TV/sideline camera, the world axes rotate 90 degrees on screen.
  const heading=p.facing??Math.atan2(p.vy||0,p.vx||0);
  const next=pr.project(p.x+Math.cos(heading),p.y+Math.sin(heading));
  const facing=Math.atan2(next.y-pt.y,next.x-pt.x);
  const jersey=keeper?(home?'#f8c662':'#baadfa'):(home?'#eeffc8':'#fd646a');
  const shorts=keeper?'#162b33':home?'#143d3a':'#f7f6ec';
  const skin=['#dbb597','#b67e58','#e2c6a6','#956243'][Math.abs((p.id||1)*7)%4];
  // Ground-contact shadow and pressure marker.
  c.beginPath();c.ellipse(pt.x+1,pt.y+size*.7,size*.76,size*.28,0,0,Math.PI*2);
  c.fillStyle='rgba(0,17,16,.54)';c.fill();
  c.save();c.translate(pt.x,pt.y);c.rotate(facing+Math.PI/2);
  capsule(c,-size*.28,size*.12-swing*size*.23,-size*.23,size*.84+swing*size*.18,size*.24,shorts);
  capsule(c,size*.28,size*.12+swing*size*.23,size*.23,size*.84-swing*size*.18,size*.24,shorts);
  capsule(c,-size*.23,size*.83+swing*size*.18,-size*.37,size*.87+swing*size*.18,size*.13,'#f9fcf0');
  capsule(c,size*.23,size*.83-swing*size*.18,size*.41,size*.87-swing*size*.18,size*.13,'#f9fcf0');
  capsule(c,-size*.50,-size*.27-swing*size*.08,-size*.66,size*.25+swing*size*.18,size*.18,skin);
  capsule(c,size*.50,-size*.27+swing*size*.08,size*.66,size*.25-swing*size*.18,size*.18,skin);
  polygon(c,[[-size*.48,-size*.55],[size*.48,-size*.55],[size*.43,size*.35],[-size*.43,size*.35]],jersey,home?'#b8e7ad':'#a74249',.7);
  c.beginPath();c.ellipse(0,-size*.72,size*.28,size*.31,0,0,Math.PI*2);
  c.fillStyle=skin;c.fill();
  c.beginPath();c.ellipse(0,-size*.94,size*.26,size*.13,0,0,Math.PI*2);
  c.fillStyle='#28251e';c.fill();
  c.rotate(-(facing+Math.PI/2));
  c.font='900 '+Math.max(7,size*.88)+'px sans-serif';c.fillStyle=home?'#17432f':'#fff';
  c.strokeStyle='rgba(5,30,23,.9)';c.lineWidth=1.4;c.textAlign='center';c.textBaseline='middle';
  c.strokeText(String(p.number||p.index+1),0,-size*.13);
  c.fillText(String(p.number||p.index+1),0,-size*.13);
  c.restore();
  if(frame.carrier===p.id){
   c.beginPath();c.ellipse(pt.x,pt.y,size*1.35,size*.58,0,0,Math.PI*2);
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
  // Render players by depth; the scene has arms, head, legs, kits and numbers.
  frame.players.slice().sort((a,b)=>camera.project(a.x,a.y).y-camera.project(b.x,b.y).y)
   .forEach(p=>footballer(p,camera,frame));
  ballAt(frame.ball,camera);
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
