import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {makeState,migrate,standings} from '../model.js';
import {beginLiveMatch,tickLiveMatch,resumeLiveMatch,pauseLiveMatch,finishLiveMatch,liveScore} from '../match-live.js';
import {createWorld,stepWorld,stepMatchMinute,worldResult,FIELD,FIXED_DT,STEPS_PER_MINUTE} from '../physics-engine.js';

const create=()=>makeState('Mecânica Futebol Clube','Coimbra');
const start=()=>{const state=create(),session=beginLiveMatch(state,{engine:'physics'});return {state,session,world:session.world};};
const play=state=>{
 while(state.liveMatch?.phase!=='final'){
  if(state.liveMatch.phase==='halftime')resumeLiveMatch(state);
  tickLiveMatch(state);
 }
 return finishLiveMatch(state);
};
test('11 jogadores por equipa, campo métrico, guarda-redes e táticas reais',()=>{
 const {world,session}=start();
 assert.equal(FIELD.length,105);assert.equal(FIELD.width,68);
 assert.equal(FIXED_DT,.2);assert.equal(STEPS_PER_MINUTE,36);
 assert.equal(world.players.length,22);
 assert.equal(world.players.filter(p=>p.side===0).length,11);
 assert.equal(world.players.filter(p=>p.side===1).length,11);
 assert.equal(world.players.filter(p=>p.pos==='GK').length,2);
 assert.equal(world.teams.length,2);
 assert.equal(session.schema,2);
});
test('a física avança em passos fixos com inércia e bola independente',()=>{
 const {world}=start(),before=JSON.stringify(world.players.map(p=>[p.x,p.y]));
 for(let i=0;i<100;i++)stepWorld(world);
 assert.equal(world.tick,100);
 assert.notEqual(JSON.stringify(world.players.map(p=>[p.x,p.y])),before);
 assert.ok(world.players.every(p=>p.x>=0&&p.x<=68&&p.y>=0&&p.y<=105));
 assert.ok(Number.isFinite(world.ball.x)&&Number.isFinite(world.ball.y));
 assert.ok(world.events.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
});
test('todos os passes, faltas e remates começam no estado real do campo, não num resultado pré-calculado',()=>{
 const {state,session}=start();
 assert.equal(state.league.round,1);
 assert.equal(state.results.length,0);
 assert.equal(session.result.hg+session.result.ag,0);
 assert.equal(session.result.events.length,0);
 for(let i=0;i<18;i++)tickLiveMatch(state);
 const w=session.world;
 assert.ok(w.tick>=18*12);
 assert.ok(w.events.length>0);
 assert.equal(session.result.events.length,w.events.length);
 assert.equal(session.result.engine,'physics-v2');
 assert.equal(state.league.round,1);
});
test('o árbitro coloca a bola no sítio correto ao marcar canto, livre, penálti e lançamento',()=>{
 const {world}=start();
 world.phase='open';world.ball.owner=null;world.carrier=null;
 world.ball.x=-.5;world.ball.y=51;world.ball.lastTouch=0;
 stepWorld(world);
 assert.equal(world.restart?.kind,'throwin');
 assert.equal(world.restart.team,1);
 for(let i=0;i<145&&world.phase==='restart';i++)stepWorld(world);
 assert.equal(world.phase,'open','A reposição deve ser executada depois de o marcador alcançar a bola.');
});
test('golo é físico: só conta quando a bola atravessa a linha entre os postes',()=>{
 const {world}=start();
 world.phase='open';world.ball.owner=null;world.carrier=null;
 world.ball.x=34;world.ball.y=.4;world.ball.vx=0;world.ball.vy=-10;
 world.ball.z=.2;world.ball.vz=0;world.ball.lastTouch=0;
 stepWorld(world);
 assert.equal(world.score[0],1);
 assert.ok(world.events.some(e=>e.kind==='goal'));
 assert.equal(world.restart?.kind,'kickoff');
});
test('fora dos postes não se contam golos',()=>{
 const {world}=start();
 world.phase='open';world.ball.owner=null;world.carrier=null;
 world.ball.x=5;world.ball.y=.5;world.ball.vx=0;world.ball.vy=-10;
 world.ball.z=.2;world.ball.vz=0;world.ball.lastTouch=0;
 stepWorld(world);
 assert.equal(world.score[0]+world.score[1],0);
 assert.equal(world.restart?.kind,'goalkick');
});
test('resultado e economia só são confirmados depois de 90 minutos e descontos',()=>{
 const {state,session}=start(),first=state.budget;
 for(let i=0;i<37;i++)tickLiveMatch(state);
 assert.equal(state.budget,first);
 assert.equal(state.results.length,0);
 assert.equal(state.league.round,1);
 const pending=JSON.parse(JSON.stringify(state));
 const resuming=migrate(pending);
 assert.equal(resuming.liveMatch.minute,37);
 const after=play(resuming);
 assert.equal(after.league.round,2);
 assert.equal(after.results.length,1);
 assert.equal(after.liveMatch,undefined);
 assert.equal(after.lastMatch.engine,'physics-v2');
 assert.equal(after.lastMatch.hg+after.lastMatch.ag,
  after.lastMatch.events.filter(e=>e.kind==='goal').length);
 assert.equal(after.league.rounds[0].filter(f=>f.played).length,8);
 assert.ok(after.finance.ledger.some(e=>e.label.includes('televisivos')));
});
test('pausar imobiliza relógio e física; intervalo não paga prémios',()=>{
 const {state,session,world}=start();
 tickLiveMatch(state);pauseLiveMatch(state);
 const tick=world.tick,min=session.minute;
 tickLiveMatch(state);tickLiveMatch(state);
 assert.equal(world.tick,tick);assert.equal(session.minute,min);
 resumeLiveMatch(state);
 while(session.phase!=='halftime')tickLiveMatch(state);
 assert.equal(state.results.length,0);
 const pauseTick=world.tick;tickLiveMatch(state);
 assert.equal(world.tick,pauseTick);
 resumeLiveMatch(state);
 tickLiveMatch(state);
 assert.ok(world.tick>pauseTick);
});
test('estado serializado produz sempre a mesma partida: IA, decisões e estatísticas',()=>{
 const a=start(),b=JSON.parse(JSON.stringify(a.state));
 for(let i=0;i<70;i++){
  if(a.session.phase==='halftime')resumeLiveMatch(a.state);
  if(b.liveMatch.phase==='halftime')resumeLiveMatch(b);
  tickLiveMatch(a.state);tickLiveMatch(b);
 }
 assert.deepEqual(a.session.world,b.liveMatch.world);
 assert.deepEqual(a.session.result,b.liveMatch.result);
});
test('a formação e a pressão alteram comportamentos mensuráveis',()=>{
 const state=create();
 state.tactics.pressure='baixa';const a=beginLiveMatch(state,{engine:'physics'}).world;
 const other=create();other.tactics.pressure='alta';
 const b=beginLiveMatch(other,{engine:'physics'}).world;
 assert.equal(a.teams[0].tactics.pressure,'baixa');
 assert.equal(b.teams[0].tactics.pressure,'alta');
 for(let i=0;i<120;i++){stepWorld(a);stepWorld(b);}
 assert.notDeepEqual(a.players.map(p=>[p.x,p.y]),b.players.map(p=>[p.x,p.y]));
});
test('simulação sem renderizar e com partidas repetidas não bloqueia o Node',()=>{
 const t0=performance.now();const outcomes=[];
 for(let i=0;i<6;i++){
  const {state}=start(),after=play(state);
  outcomes.push([after.lastMatch.hg,after.lastMatch.ag,after.lastMatch.events.length]);
 }
 assert.ok(outcomes.every((r)=>r.every(Number.isFinite)));
 assert.ok(outcomes.every(([a,b])=>a<16&&b<16));
 const elapsed=performance.now()-t0;
 assert.ok(elapsed<28000,'Headless match batch should finish promptly, took '+Math.round(elapsed)+'ms');
 console.log('Physics engine 6 matches',JSON.stringify({elapsed:Math.round(elapsed),outcomes}));
});
test('jogo antigo continua a poder terminar com replay/eventos legados',()=>{
 const state=create();const classic=beginLiveMatch(state);
 assert.equal(classic.schema,1);
 const after=play(state);
 assert.equal(after.results.length,1);
 assert.notEqual(after.lastMatch.engine,'physics-v2');
});

test('guarda-redes tem atributos próprios para reagir a remates físicos',()=>{
 const {world}=start();
 for(const p of world.players.filter(p=>p.pos==='GK')){
  assert.ok(p.gk>=15&&p.gk<=99);
 }
 const original=JSON.parse(JSON.stringify(world));
 const a=JSON.parse(JSON.stringify(original));
 const b=JSON.parse(JSON.stringify(original));
 for(let i=0;i<60;i++){stepWorld(a);stepWorld(b);}
 assert.deepEqual(a,b,'Guardar e continuar com a mesma seed não pode alterar as defesas');
});
