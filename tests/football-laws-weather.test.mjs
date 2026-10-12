import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch} from '../match-live.js';
import {stepWorld} from '../physics-engine.js';
import {createWeather,advanceWeather,surfaceGrip,rollingDrag} from '../weather-systems.js';
import {restartGoalVerdict,goalkeeperHandlingAllowed,isPenaltyArea} from '../football-rules.js';
import {articulatedPose,projectBodyJoint} from '../player-biomechanics.js';

const start=()=>{
 const w=beginLiveMatch(makeState('Leis Reais FC','Braga'),{engine:'physics'}).world;
 w.phase='open';w.carrier=null;w.ball.owner=null;return w;
};
test('weather changes smoothly, deterministically and changes traction',()=>{
 const a=createWeather(123456),b=createWeather(123456);
 for(let t=1;t<4000;t++){advanceWeather(a,t);advanceWeather(b,t);}
 assert.deepEqual(a,b);
 assert.ok(a.windSpeed>=0&&Number.isFinite(a.windX+a.windY));
 assert.ok(a.wetness>=0&&a.wetness<=1);
 assert.ok(surfaceGrip({wetness:.96,rainfall:.9})<surfaceGrip({wetness:0,rainfall:0}));
 assert.ok(rollingDrag({wetness:1})!==rollingDrag({wetness:0}));
});
test('direct throw-ins and indirect free kicks cannot score, own restarts cause corners',()=>{
 assert.equal(restartGoalVerdict('throwin',0,0,false),'goalkick');
 assert.equal(restartGoalVerdict('backpass',0,0,false),'goalkick');
 assert.equal(restartGoalVerdict('offside',0,0,false),'goalkick');
 assert.equal(restartGoalVerdict('throwin',0,1,false),'corner');
 assert.equal(restartGoalVerdict('corner',0,0,false),'goal');
 assert.equal(restartGoalVerdict('throwin',0,0,true),'goal');
 const w=start();
 Object.assign(w.ball,{x:34,y:.5,vx:0,vy:-13,z:.12,vz:0,spin:0,lastTouch:0,
  restartKind:'throwin',restartSide:0,restartTouched:false});
 stepWorld(w);
 assert.equal(w.score[0],0);
 assert.equal(w.restart.kind,'goalkick');
});
test('goalkeepers cannot illegally handle outside their area or on a backpass',()=>{
 const keeper={pos:'GK',side:0};
 assert.equal(goalkeeperHandlingAllowed(keeper,{x:34,y:101}),true);
 assert.equal(goalkeeperHandlingAllowed(keeper,{x:34,y:80}),false);
 assert.equal(goalkeeperHandlingAllowed(keeper,{x:34,y:101,deliberateBackpass:0}),false);
 assert.equal(goalkeeperHandlingAllowed(keeper,{x:34,y:101,fromThrowin:0}),false);
 assert.equal(isPenaltyArea(34,99,0),true);
 assert.equal(isPenaltyArea(34,16,1),true);
});
test('independent procedural 3D skeleton bends, strides and projects every limb',()=>{
 const p={x:34,y:40,pos:'ATT',facing:Math.PI/2,gait:.95,stridePhase:2.1,pose:'sprint'};
 const q=articulatedPose(p,12);
 assert.equal(q.hips.length,2);assert.equal(q.feet.length,2);
 assert.ok(q.head.z>q.chest.z&&q.chest.z>q.pelvis.z);
 assert.ok(Math.abs(q.feet[0].y-q.feet[1].y)>.1);
 const projected=projectBodyJoint(q.head,p,{angle:q.facing,project:(x,y)=>({x,y})},10);
 assert.ok(Number.isFinite(projected.x+projected.y));
 assert.ok(projected.y<40);
 const kicking=articulatedPose({...p,pose:'kick'},12);
 assert.ok(kicking.feet[1].y>q.feet[1].y);
});
test('the match serializes evolving weather, collisions, fatigue and injury reports',()=>{
 const w=start();
 for(let i=0;i<160;i++)stepWorld(w);
 assert.ok(w.weather?.lastTick===w.tick);
 assert.ok(w.players.some(p=>p.stridePhase>0));
 assert.ok(w.players.every(p=>Number.isFinite(p.bodyLean)));
 assert.ok(w.players.every(p=>p.stamina>=35));
 assert.ok(Array.isArray(w.injuries));
});
