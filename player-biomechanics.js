// Original procedural 3D skeleton, evaluated per animation frame.
// Units: metres. X = player's left/right, Y = travel direction, Z = height.
// Pure math, deterministic and independent of the match scoring engine.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function articulatedPose(player,frameTime=0){
 const pace=clamp(player.gait??Math.hypot(player.vx||0,player.vy||0)/7,0,1);
 const phase=player.stridePhase??frameTime*2.7;
 const action=player.pose||'idle',isKeeper=player.pos==='GK';
 const sprint=action==='sprint';
 const cycle=Math.sin(phase),other=Math.sin(phase+Math.PI);
 const bend=pace*(sprint?.5:.32),arm=pace*(sprint?.43:.29);
 const hasKick=action==='kick'||action==='shot';
 const dive=isKeeper&&action==='dive';
 const height=1.72,baseZ=dive?.29:1.0-pace*.065*Math.abs(cycle);
 const forwardLean=dive?.64:hasKick?.20:sprint?.17:pace*.1;
 const sway=clamp(player.bodyLean||0,-.3,.3);
 const center={x:sway*.25,y:forwardLean,z:baseZ};
 const pelvis={x:center.x,y:center.y,z:center.z};
 const chest={x:center.x+sway*.15,y:center.y+forwardLean*.32,z:center.z+.48};
 const neck={x:chest.x,y:chest.y+.02,z:chest.z+.20};
 const head={x:neck.x,y:neck.y+.03,z:neck.z+.18};
 const feet=[],knees=[],elbows=[],hands=[],shoulders=[],hips=[];
 for(let i=0;i<2;i++){
  const dir=i===0?-1:1,step=i===0?cycle:other;
  const stride=pace*step*(sprint?.55:.38);
  const foot={x:dir*.16,y:stride+(hasKick&&i===1?.67:0),z:.065+Math.max(0,step)*pace*.17};
  const knee={x:dir*.16,y:stride*.43+(hasKick&&i===1?.34:0),z:baseZ*.51+Math.max(0,step)*bend*.24};
  const hip={x:pelvis.x+dir*.16,y:pelvis.y,z:pelvis.z};
  const shoulder={x:chest.x+dir*.28,y:chest.y,z:chest.z+.02};
  const elbow={x:shoulder.x+dir*.08,y:shoulder.y-step*arm*.48,z:shoulder.z-.26};
  const hand={x:elbow.x+dir*.07,y:elbow.y-step*arm*.25,z:elbow.z-.31};
  if(isKeeper&&dive){hand.y+=.65;hand.z+=.25;hand.x+=dir*.09;}
  hips.push(hip);knees.push(knee);feet.push(foot);shoulders.push(shoulder);elbows.push(elbow);hands.push(hand);
 }
 if(dive){head.y+=.3;head.z-=.55;chest.z-=.45;pelvis.z-=.39;}
 if(action==='header'){
  // Full-body aerial effort: vertical leap, raised counterbalancing arms and
  // controlled head contact during the crossing phase.
  for(const joint of [pelvis,chest,neck,head])joint.z+=.28;
  head.y+=.20;
  for(const j of feet)j.z+=.16;
  for(const j of knees)j.z+=.25;
  for(const j of hips)j.z+=.28;
  for(const j of shoulders)j.z+=.28;
  for(const j of elbows){j.z+=.46;j.y+=.15;}
  for(const j of hands){j.z+=.52;j.y+=.20;}
 }
 if(action==='throw'){
  for(const j of elbows){j.z+=.35;j.y+=.14;}
  for(const j of hands){j.z+=.82;j.y+=.33;}
 }
 if(action==='block'){
  pelvis.z-=.22;chest.z-=.16;head.z-=.12;
  for(const j of knees)j.z-=.14;
  for(const j of hands){j.z+=.1;j.y+=.25;}
 }
 if(action==='injured'){
  // Player is temporarily rendered lying on the grass before medical exit.
  pelvis.z=.18;chest.z=.26;chest.y+=.36;head.z=.24;head.y+=.82;
  for(const j of knees){j.z=.14;j.y-=.2;}
  for(const j of shoulders){j.z=.23;j.y+=.35;}
  for(const j of elbows){j.z=.13;j.y+=.35;}
  for(const j of hands){j.z=.09;j.y+=.43;}
 }
 const facing=Number.isFinite(player.facing)?player.facing:Math.atan2(player.vy||-1,player.vx||0);
 return {pelvis,chest,neck,head,hips,knees,feet,shoulders,elbows,hands,facing,action,pace,
  dimensions:{height,shoulderWidth:.56,legLength:.93}};
}
export function projectBodyJoint(joint,player,projection,pixelsPerMetre){
 const a=joint.x*Math.cos(projection.angle+Math.PI/2)+joint.y*Math.cos(projection.angle);
 const b=joint.x*Math.sin(projection.angle+Math.PI/2)+joint.y*Math.sin(projection.angle);
 const pt=projection.project(player.x+a,player.y+b);
 return {x:pt.x,y:pt.y-joint.z*pixelsPerMetre};
}
