import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {beginLiveMatch,tickLiveMatchStep} from '../match-live.js';
import {broadcastProject,interpolateWorld,CAMERA_MODES,cameraTitle} from '../broadcast-render.js';
const started=()=>{
 const s=makeState('Atlântico FC','Braga');beginLiveMatch(s,{engine:'physics'});return s;
};
test('broadcast offers 4 actual camera modes and valid pitch projections',()=>{
 assert.deepEqual(CAMERA_MODES,['tv','balanced','sideline','aerial']);
 for(const name of CAMERA_MODES){
  const cam=broadcastProject(name,390,380,{x:30,y:60});
  for(const [x,y] of [[0,0],[68,0],[0,105],[68,105],[34,52.5]]){
   const p=cam.project(x,y);
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),name);
  }
  assert.ok(cameraTitle[name],name);
 }
});
test('aerial camera fits all pitch corners on mobile',()=>{
 for(const [w,h] of [[276,294],[340,360],[640,500]]){
  const c=broadcastProject('aerial',w,h,{x:20,y:30});
  for(const x of [0,68])for(const y of [0,105]){
   const p=c.project(x,y);
   assert.ok(p.x>=0&&p.x<=w,'x='+p.x);
   assert.ok(p.y>=0&&p.y<=h,'y='+p.y);
  }
 }
});
test('ball and all footballers interpolate between consecutive physical states',()=>{
 const s=started(),live=s.liveMatch;
 const before=live.world.players.map(p=>({id:p.id,x:p.x,y:p.y}));
 const ball={...live.world.ball};
 tickLiveMatchStep(s);
 const a=interpolateWorld(live.world,0),b=interpolateWorld(live.world,1);
 assert.equal(a.players.length,22);
 assert.equal(b.players.length,22);
 for(let i=0;i<22;i++){
  const p=a.players[i],next=b.players[i];
  assert.ok(Math.abs(p.x-before[i].x)<1e-9);
  assert.ok(Math.abs(p.y-before[i].y)<1e-9);
  assert.ok(Number.isFinite(next.direction));
 }
 assert.equal(a.ball.z>=0,true);
 assert.ok(ball.x>=0&&ball.x<=68);
 assert.ok(Math.abs(b.players[0].x-live.world.players[0].x)<1e-9);
});
test('players rotate through a bounded angle during sudden tactical changes',()=>{
 const s=started(),live=s.liveMatch;
 const p=live.world.players.find(p=>p.pos==='MID'&&p.side===0);
 for(let i=0;i<5;i++)tickLiveMatchStep(s);
 assert.ok(Number.isFinite(p.facing));
 const old=p.facing;
 live.world.ball.x=67;live.world.ball.y=9;
 tickLiveMatchStep(s);
 const dif=Math.abs(((p.facing-old+Math.PI*3)%(2*Math.PI))-Math.PI);
 assert.ok(dif<.8,'Footballer should turn naturally: '+dif);
});
test('broadcast never changes physics or saves while selecting projection modes',()=>{
 const s=started(),live=s.liveMatch;
 const baseline=JSON.stringify(live.world);
 for(const name of CAMERA_MODES){
  live.camera=name;
  const cam=broadcastProject(name,390,380,{x:34,y:52});
  assert.ok(cam.project(34,50));
 }
 assert.equal(JSON.stringify(live.world),baseline);
});
