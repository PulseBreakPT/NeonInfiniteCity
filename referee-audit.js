// Deterministic goal-line audit for the fictional match referee.
// This is an objective geometric record, NOT an actual video assistant.
import {restartGoalVerdict} from './football-rules.js';

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const BALL_RADIUS=.11;
export function auditGoalCrossing({before,after,goalLine,field,attacking,
 restartKind=null,restartSide=null,restartTouched=false}){
 const dy=after.y-before.y,withinSegment=Math.abs(dy)>1e-8;
 const t=withinSegment?(goalLine-before.y)/dy:Infinity;
 const crosses=withinSegment&&t>=0&&t<=1;
 const x=crosses?before.x+(after.x-before.x)*t:after.x;
 const z=crosses?before.z+(after.z-before.z)*t:after.z;
 const beyondLine=goalLine===0?after.y<=-BALL_RADIUS:
  after.y>=field.length+BALL_RADIUS;
 const mouth=x>field.goalLeft+BALL_RADIUS&&x<field.goalRight-BALL_RADIUS;
 const underBar=z<2.44-BALL_RADIUS&&z>=BALL_RADIUS-.05;
 const direct=restartGoalVerdict(restartKind,restartSide,attacking,restartTouched);
 const verified=crosses&&beyondLine&&mouth&&underBar&&direct==='goal';
 return {type:'objective-goal-line',status:verified?'confirmed':'not-confirmed',
  approved:verified,evidence:{
   crossingFraction:+clamp(t,0,1).toFixed(6),
   x:+x.toFixed(3),height:+z.toFixed(3),goalLine,
   completeBallCrossing:beyondLine,betweenPosts:mouth,underCrossbar:underBar,
   crossedThisStep:crosses,initialRestart:restartKind||'open-play',
   restartLegal:direct==='goal'
  }};
}
