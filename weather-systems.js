// Deterministic local match climate. All quantities use SI units; no wall-clock RNG.
export const CONDITIONS=['limpo','nublado','chuva','aguaceiros','vento'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=v=>v-Math.floor(v);
const noise=n=>fract(Math.sin(n*127.1+78.233)*43758.5453123);
export function createWeather(seed=1){
 const phase=(seed%10007)/10007*Math.PI*2;
 const rainfall=seed%11<3?.22:seed%11<5?.56:0;
 const gust=seed%17<4?7:1.5;
 const temperature=clamp(7+(seed%26),4,34);
 return {seed,phase,temperature,wetness:rainfall*.15,rainfall,windX:Math.cos(phase)*gust,
  windY:Math.sin(phase)*gust,windSpeed:gust,windDirection:phase,condition:rainfall>.4?'chuva':gust>6?'vento':'limpo',lastTick:0};
}
export function advanceWeather(w,tick,dt=.2){
 if(!w)return null;
 const time=tick*dt,osc=Math.sin(time*.0031+w.phase),slow=Math.sin(time*.0007+w.phase*1.7);
 // Rain fronts move in and out during the match, rather than snapping instantly.
 const front=noise(Math.floor(time/48)+(w.seed%991))*1.2-.45;
 const rainTarget=clamp((osc*.33+slow*.29+front)*1.1,0,.98);
 w.rainfall+=(rainTarget-w.rainfall)*Math.min(1,dt*.015);
 w.wetness=clamp(w.wetness+dt*(w.rainfall*.0028-(1-w.rainfall)*.00024),0,1);
 const windTarget=1.2+(w.seed%8)*.5+Math.max(0,slow)*4.5;
 const windAngle=w.phase+Math.sin(time*.0022+w.phase)*.6;
 w.windSpeed+=(windTarget-w.windSpeed)*Math.min(1,dt*.012);
 w.windDirection=windAngle;
 w.windX=Math.cos(windAngle)*w.windSpeed;
 w.windY=Math.sin(windAngle)*w.windSpeed;
 w.condition=w.rainfall>.54?'chuva':w.rainfall>.17?'aguaceiros':w.windSpeed>5.8?'vento':w.wetness>.42?'nublado':'limpo';
 w.lastTick=tick;
 return w;
}
export function surfaceGrip(w){
 return clamp(1-(w?.wetness||0)*.29-(w?.rainfall||0)*.08,.61,1);
}
export function rollingDrag(w){
 // Wet turf rolls freely initially but puddles create extra resistance.
 return 1.0-(w?.wetness||0)*.20+Math.max(0,(w?.wetness||0)-.72)*1.8;
}
export function atmosphere(w){
 return {windX:w?.windX||0,windY:w?.windY||0,rain:w?.rainfall||0,wetness:w?.wetness||0,
  temperature:w?.temperature??19,condition:w?.condition||'limpo'};
}
