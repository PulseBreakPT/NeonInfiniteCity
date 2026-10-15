import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,makeMarket,migrate,standings,autoLineup,teamPower,rating} from '../model.js';
import {runMatch,tacticalModifiers} from '../match-engine.js';
import {execute} from '../actions.js';

const game=(name='Atlético Verificação')=>makeState(name,'Lisboa');

test('oponentes têm plantéis, técnicos, finanças e táticas independentes',()=>{
 const s=game();assert.equal(Object.keys(s.rivals).length,15);
 const all=new Set();
 for(const [id,t] of Object.entries(s.rivals)){
  assert.equal(t.players.length,18);assert.equal(t.lineup.length,11);
  assert.ok(t.manager.adaptability>=.2&&t.manager.adaptability<=.9);
  assert.ok(t.budget>0);assert.ok(t.tactics.mentality);
  for(const p of t.players){assert.ok(!all.has(p.id));all.add(p.id);}
 }
});
test('resultados são derivados de remates, posse, passes e ocasiões',()=>{
 const s=game(),fixture=s.league.rounds[0].find(f=>f.home===0||f.away===0);
 const r=runMatch(s,fixture),e=r.events,k=r.stats;
 assert.equal(r.engine,'events-v4');
 assert.equal(e.filter(x=>x.kind==='goal').length,r.hg+r.ag);
 assert.ok(k.shotsHome>=r.hg&&k.shotsAway>=r.ag);
 assert.ok(k.onTargetHome>=r.hg&&k.onTargetAway>=r.ag);
 assert.ok(k.onTargetHome<=k.shotsHome&&k.onTargetAway<=k.shotsAway);
 assert.ok(k.accurateHome<=k.passesHome&&k.accurateAway<=k.passesAway);
 assert.ok(k.xgHome>=0&&k.xgAway>=0);assert.ok(k.possession>0&&k.possession<100);
 assert.ok(['limpo','chuva','vento','nevoeiro'].includes(r.weather));
 assert.ok(e.some(x=>x.kind==='half')&&e.at(-1).kind==='end');
});
test('motor mantém a reprodução determinística para igual estado',()=>{
 const s=game();const f=s.league.rounds[0][0];
 const a=runMatch(structuredClone(s),f);
 const b=runMatch(structuredClone(s),f);
 assert.deepEqual([a.hg,a.ag,a.events,a.stats],[b.hg,b.ag,b.events,b.stats]);
});
test('mudanças táticas afetam a circulação e condições de jogo',()=>{
 const s=game();
 const defense=tacticalModifiers({mentality:'defensiva',pressure:'baixa',passing:'curto',tempo:'lento'});
 const aggressive=tacticalModifiers({mentality:'ofensiva',pressure:'alta',passing:'longo',tempo:'rapido'});
 assert.ok(aggressive.attack>defense.attack);
 assert.ok(aggressive.fatigue>defense.fatigue);
 assert.ok(aggressive.success<defense.success);
 const f=s.league.rounds[0].find(x=>x.home===0||x.away===0);
 const base=runMatch(structuredClone(s),f);
 s.tactics={...s.tactics,mentality:'ofensiva',pressure:'alta',passing:'longo',tempo:'rapido'};
 const mod=runMatch(s,f);
 assert.notDeepEqual(base.stats,mod.stats);
});
test('bónus só é resgatado uma vez em cada jornada',()=>{
 const s=game();execute(s,'reward');for(let i=0;i<2;i++)execute(s,'rest-day');
 const old=s.budget,tokens=s.tokens;
 assert.throws(()=>execute(s,'reward'),/bónus|jornada/);
 assert.equal(s.budget,old);assert.equal(s.tokens,tokens);
 assert.throws(()=>execute(s,'rest-day'),/Limite/);
});
test('observação gera IDs únicos, incluindo após migração de save',()=>{
 const s=game();for(let i=0;i<3;i++)execute(s,'scout');
 assert.throws(()=>execute(s,'scout'),/Limite de três/);
 const ids=s.market.map(p=>p.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(new Set([...ids,...s.players.map(p=>p.id)]).size,ids.length+s.players.length);
 const old=structuredClone(s);old.market[1].id=old.market[0].id;
 const imported=migrate(old);
 assert.equal(new Set(imported.market.map(p=>p.id)).size,imported.market.length);
});
test('júnior promovido requer idade e período de integração',()=>{
 const s=game(),kid=s.academy.find(p=>p.age>=17);
 assert.ok(kid);
 const money=s.budget;
 execute(s,'academy-promote',{id:kid.id});
 const promoted=s.players.at(-1);
 assert.ok(s.budget<=money-10000);
 assert.throws(()=>execute(s,'sell',{id:promoted.id}),/integração/);
 assert.equal(s.players.at(-1).id,promoted.id);
});
test('lesionados no onze são substituídos sem participar',()=>{
 const s=game(),id=s.lineups[s.formation][0];
 const p=s.players.find(x=>x.id===id);p.injury=4;
 execute(s,'match');
 assert.ok(!s.lineups[s.formation].includes(id));
 assert.equal(p.apps,0);
});
test('atletas sem contrato não participam em partidas',()=>{
 const s=game(),id=s.lineups[s.formation][1];
 const p=s.players.find(x=>x.id===id);p.contract=0;
 execute(s,'match');assert.ok(!s.lineups[s.formation].includes(id));
 assert.equal(p.apps,0);
});
test('operações inválidas não geram estados financeiros parciais',()=>{
 const s=game(),before=JSON.stringify(s);
 assert.throws(()=>execute(s,'upgrade',{key:'invalid'}),/desconhecida/);
 assert.equal(JSON.stringify(s),before);
 s.budget=2;const cash=s.budget;
 assert.throws(()=>execute(s,'academy-promote',{id:s.academy[0].id}),/insuficiente/);
 assert.equal(s.budget,cash);
});
test('patrocinadores premium pagam mais por jornada',()=>{
 const normal=game(),elite=structuredClone(normal);
 elite.club.sponsor='Horizonte Global';
 execute(normal,'match');execute(elite,'match');
 const n=normal.finance.ledger.find(x=>x.label.startsWith('Patrocínio'));
 const e=elite.finance.ledger.find(x=>x.label.startsWith('Patrocínio'));
 assert.ok(e.amount>n.amount);
});
test('amigáveis sem farm de estatísticas e com limite semanal',()=>{
 const s=game(),apps=s.players.reduce((sum,p)=>sum+p.apps,0),funds=s.budget;
 execute(s,'friendly',{id:1});
 assert.equal(s.players.reduce((sum,p)=>sum+p.apps,0),apps);
 assert.equal(s.budget,funds);
 assert.throws(()=>execute(s,'friendly',{id:1}),/um amigável/);
});
test('voltar ao equipamento original não causa erro',()=>{
 const s=game(),base=s.club.color;
 execute(s,'cosmetic',{id:'oceano'});assert.notEqual(s.club.color,base);
 execute(s,'cosmetic',{id:'principal'});assert.equal(s.club.color,base);
});
test('dívidas e salários em atraso têm consequências e são contabilizados',()=>{
 const s=game();s.budget=0;
 s.players.forEach(p=>p.salary=300000);
 execute(s,'match');
 assert.ok(s.finance.debt>0);
 assert.ok(s.finance.unpaidWages>0);
 assert.ok(s.finance.boardConfidence<75);
 assert.equal(s.budget,0);
});
test('os clubes rivais mudam de forma e atualizam recursos na época',()=>{
 const s=game(),r=s.rivals[1],original=r.budget;
 for(let i=0;i<4;i++)execute(s,'match');
 assert.equal(r.history.length,4);
 assert.notEqual(r.budget,original);
 assert.ok(r.form>=-12&&r.form<=12);
});
test('uma época completa mantém 30 jogos por clube e 4 fases de taça',()=>{
 const s=game();
 for(let i=0;i<30;i++)execute(s,'match');
 const table=standings(s);
 assert.ok(s.league.completed);assert.equal(s.league.rounds.flat().filter(x=>x.played).length,240);
 assert.ok(table.every(t=>t.gp===30));
 assert.equal(table.reduce((n,t)=>n+t.gf-t.ga,0),0);
 assert.equal(s.cup.results.length,4);
 execute(s,'new-season');assert.equal(s.season,2);
 assert.equal(s.league.round,1);assert.equal(Object.keys(s.rivals).length,15);
});
test('importação v1 conserva progresso antigo e acrescenta a IA nova',()=>{
 const s=game(),old={version:1,club:s.club,players:s.players,formation:s.formation,lineups:s.lineups,budget:112000,day:13,fans:5400,trainingTotal:6,activity:[]};
 const newer=migrate(old);
 assert.equal(newer.version,2);
 assert.equal(newer.engineVersion,9);
 assert.equal(newer.budget,112000);assert.equal(newer.day,13);assert.equal(newer.fans,5400);
 assert.equal(newer.players.length,26);
 assert.equal(Object.keys(newer.rivals).length,15);
});

test('planos táticos do treinador afetam a segunda parte',()=>{
 const s=game('Plano Intervalo'),fixture=s.league.rounds[0].find(f=>f.home===0||f.away===0);
 s.tactics.halftimePlan='agressivo';
 const result=runMatch(s,fixture);
 assert.ok(result.events.some(e=>e.kind==='half'));
 assert.ok(result.events.some(e=>e.kind==='tactical'&&e.team===0));
});
test('suspensões disciplinares retiram futebolistas do onze na jornada seguinte',()=>{
 const s=game('Suspenso'),id=s.lineups[s.formation][0];
 const player=s.players.find(p=>p.id===id);
 player.suspendedUntilWeek=s.week+1;
 execute(s,'match');
 assert.ok(!s.lineups[s.formation].includes(id));
 assert.equal(player.apps,0);
});
