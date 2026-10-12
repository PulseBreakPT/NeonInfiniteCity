import {buildSpatialTimeline,spatialFrame} from './pitch-spatial.js';

// Canvas layer renders player trajectories independently of the match clock.
// No per-player DOM writes, layouts or React-style re-renders in the animation loop.
export function createPitchRenderer(canvas,session){
 const host=canvas?.parentElement;
 if(!canvas||!host||(!session?.spatial?.teams&&!session?.world))return null;
 const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
 if(!ctx)return null;
 const timeline=buildSpatialTimeline(session);
 host.classList.add('spatial-ready');
 let lastWidth=0,lastHeight=0,lastRatio=0,disposed=false;
 function draw(minute){
  if(disposed)return;
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(width<80||height<80)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(lastWidth!==width||lastHeight!==height||lastRatio!==dpr){
   lastWidth=width;lastHeight=height;lastRatio=dpr;
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  let frame;
  if(session.schema===2&&session.world){
   const w=session.world;
   const progress=Math.max(0,Math.min(.95,minute-Math.floor(minute)));
   const dt=progress*2.4;
   const positions=w.players.map(p=>({
    ...p,x:Math.max(0,Math.min(100,(p.x+p.vx*dt)*100/68)),
    y:Math.max(0,Math.min(100,(p.y+p.vy*dt)*100/105))
   }));
   let ball={x:w.ball.x+(!w.ball.owner?w.ball.vx*dt:0),y:w.ball.y+(!w.ball.owner?w.ball.vy*dt:0)};
   if(w.ball.owner!==null){
    const holder=w.players.find(p=>p.id===w.ball.owner);
    if(holder){ball={x:holder.x+holder.vx*dt,y:holder.y+holder.vy*dt};}
   }
   frame={players:positions,ball:{x:Math.max(0,Math.min(100,ball.x*100/68)),y:Math.max(0,Math.min(100,ball.y*100/105))},
    setPiece:w.restart?.kind||null};
  }else frame=spatialFrame(session,minute,timeline);
  if(!frame)return;
  const sx=x=>x/100*width,sy=y=>y/100*height;
  const size=Math.max(6.5,Math.min(width/55,11));
  const ball=frame.ball;
  // Ball pass trajectory, an unobtrusive 0.5-second possession trail.
  const line=session.schema===2?null:timeline.findLast?.(e=>e.time<=minute)||timeline[0];
  if(line){
   const ax=sx(line.x),ay=sy(line.y),bx=sx(ball.x),by=sy(ball.y);
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
   ctx.strokeStyle='rgba(246,255,232,.27)';ctx.lineWidth=2;
   ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
  }
  for(let i=0;i<frame.players.length;i++){
   const p=frame.players[i],home=i<11,x=sx(p.x),y=sy(p.y);
   // Player shadow and rim.
   ctx.beginPath();ctx.ellipse(x,y+size*.6,size*.9,size*.4,0,0,Math.PI*2);
   ctx.fillStyle='rgba(0,18,19,.49)';ctx.fill();
   const keeper=p.pos==='GK';
   ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);
   ctx.fillStyle=keeper?(home?'#ffe0a1':'#d1b5fb'):(home?'#dcffa0':'#ff9c9b');
   ctx.fill();
   ctx.lineWidth=2;ctx.strokeStyle=home?'#183c34':'#592d3b';ctx.stroke();
   ctx.fillStyle='#142c2d';ctx.font='900 '+Math.round(size*.97)+'px sans-serif';
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(String(p.number).slice(0,2),x,y+.5);
  }
  const x=sx(ball.x),y=sy(ball.y);
  ctx.beginPath();ctx.arc(x+1,y+2,size*.71,0,Math.PI*2);ctx.fillStyle='rgba(0,12,10,.55)';ctx.fill();
  ctx.beginPath();ctx.arc(x,y,size*.65,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.lineWidth=1;ctx.strokeStyle='#132c2c';ctx.stroke();
  ctx.beginPath();ctx.arc(x-size*.14,y-size*.14,size*.18,0,Math.PI*2);ctx.fillStyle='#182d31';ctx.fill();
  if(frame.setPiece){
   const labels={corner:'CANTO',freekick:'LIVRE',throwin:'LANÇAMENTO LATERAL',penalty:'GRANDE PENALIDADE'};
   const name=labels[frame.setPiece]||'BOLA PARADA';
   ctx.font='900 11px sans-serif';ctx.textBaseline='top';ctx.textAlign='left';
   const tw=ctx.measureText(name).width;
   ctx.fillStyle='rgba(7,35,32,.9)';ctx.fillRect(8,8,tw+22,25);
   ctx.strokeStyle='rgba(189,255,152,.8)';ctx.lineWidth=1;ctx.strokeRect(8.5,8.5,tw+21,24);
   ctx.fillStyle='#dfffaa';ctx.fillText(name,19,14);
  }
 }
 function dispose(){
  disposed=true;host.classList.remove('spatial-ready');
  const ctx=canvas.getContext('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);
 }
 return {draw,dispose,timelineSize:timeline.length};
}
