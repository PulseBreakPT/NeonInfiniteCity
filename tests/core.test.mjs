import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,migrate,saveState,loadState,FORMATIONS,autoLineup,standings,rating,teamPower,makeLeague} from '../model.js';
import {execute} from '../actions.js';
import {tacticsMultiplier,applyRound} from '../sim.js';

test('inicializa um clube com 26 jogadores, 16 clubes e 30 jornadas',()=>{
 const s=makeState('Atlético Aurora','Lisboa');
 assert.equal(s.players.length,26);assert.equal(new Set(s.players.map(p=>p.id)).size,26);
 assert.equal(s.league.teams.length,16);assert.equal(s.league.rounds.length,30);
 assert.equal(s.league.rounds.flat().length,240);assert.equal(s.budget,1850000);
});
test('todos os clubes se enfrentam uma vez em cada estádio',()=>{
 const s=makeState('Clube Azul','Faro'),fixtures=s.league.rounds.flat(),map=new Map();
 for(const f of fixtures){const key=[f.home,f.away].sort((a,b)=>a-b).join(':');map.set(key,[...(map.get(key)||[]),f]);}
 assert.equal(map.size,120);
 for(const v of map.values()){assert.equal(v.length,2);assert.equal(v[0].home,v[1].away);assert.equal(v[0].away,v[1].home);}
});
test('as formações geram sempre onze jogadores sem duplicados',()=>{
 const s=makeState('Onze Original','Évora');
 for(const form of Object.keys(FORMATIONS)){const lineup=autoLineup(s,form);assert.equal(lineup.length,11);assert.equal(new Set(lineup).size,11);}
});
test('a tática ofensiva melhora multiplicador de ataque e aumenta a exposição defensiva',()=>{
 const s=makeState();const base=tacticsMultiplier(s);
 s.tactics.mentality='ofensiva';const attack=tacticsMultiplier(s);
 assert.ok(attack.attack>base.attack);assert.ok(attack.defense<base.defense);
});
test('uma jornada joga 8 jogos e atualiza os 16 clubes',()=>{
 const s=makeState();const r=execute(s,'match').result;
 assert.ok(r.events.some(e=>e.kind==='end'));assert.equal(s.league.round,2);
 assert.equal(s.league.rounds.flat().filter(f=>f.played).length,8);
 assert.equal(standings(s).reduce((n,t)=>n+t.gp,0),16);
 assert.equal(r.events.filter(e=>e.kind==='goal').length,r.hg+r.ag);
});
test('o campeonato completo tem 240 jogos, 30 por equipa e diferença total de golos nula',()=>{
 const s=makeState();
 for(let i=0;i<30;i++)execute(s,'match');
 assert.equal(s.league.completed,true);
 assert.equal(s.league.rounds.flat().filter(f=>f.played).length,240);
 const table=standings(s);
 assert.ok(table.every(t=>t.gp===30));
 assert.equal(table.reduce((n,t)=>n+t.gf-t.ga,0),0);
 assert.equal(s.cup.completed,true);assert.equal(s.cup.results.length,4);
 assert.equal(table[0].id,s.league.champion);
});
test('uma nova época renova o calendário e faz avançar as idades',()=>{
 const s=makeState(),age=s.players[0].age;
 for(let i=0;i<30;i++)execute(s,'match');
 execute(s,'new-season');
 assert.equal(s.season,2);assert.equal(s.league.round,1);
 assert.equal(s.players[0].age,age+1);assert.equal(s.league.rounds.flat().filter(f=>f.played).length,0);
});
test('uma compra no mercado não causa saldos negativos nem atletas duplicados',()=>{
 const s=makeState(),p=s.market[0];
 for(let i=0;i<25&&s.market.some(x=>x.id===p.id);i++)execute(s,'bid',{id:p.id});
 assert.ok(s.budget>=0);assert.equal(new Set(s.players.map(x=>x.id)).size,s.players.length);
});
test('economia rejeita melhorias sem fundos',()=>{
 const s=makeState();s.budget=20;
 assert.throws(()=>execute(s,'upgrade',{key:'stadium'}),/Saldo insuficiente/);
 assert.equal(s.budget,20);
});
test('treinos respeitam limite semanal e reduzem condição',()=>{
 const s=makeState(),old=s.players[0].fitness;
 for(let i=0;i<3;i++)execute(s,'train',{kind:'technical'});
 assert.equal(s.trainingCount,3);assert.ok(s.players[0].fitness<old);
 assert.throws(()=>execute(s,'train',{kind:'technical'}),/Limite/);
});
test('mentores podem ser contratados e alteram os modificadores táticos',()=>{
 const s=makeState();
 execute(s,'mentor-hire',{id:'marques'});const old=tacticsMultiplier(s);
 execute(s,'mentor-select',{id:'marques'});
 assert.equal(s.mentors.length,1);assert.ok(tacticsMultiplier(s).attack>=old.attack);
});
test('academia permite formação de juniores e promoção',()=>{
 const s=makeState(),id=s.academy.find(p=>p.age>=16)?.id;
 assert.ok(id);const old=s.players.length;
 execute(s,'academy-train',{id});execute(s,'academy-promote',{id});
 assert.equal(s.players.length,old+1);assert.ok(!s.academy.some(p=>p.id===id));
});
test('migrar save v1 preserva plantel, finanças e progressão',()=>{
 const s=makeState('Antigo','Porto');
 const old={version:1,club:s.club,players:s.players,formation:s.formation,lineups:s.lineups,day:9,budget:234567,fans:9300,trainingTotal:7,activity:[]};
 const imported=migrate(old);
 assert.equal(imported.version,2);assert.equal(imported.day,9);
 assert.equal(imported.players.length,26);assert.equal(imported.budget,234567);assert.equal(imported.fans,9300);
});
test('save v2 guarda e restaura sem perda de resultados',()=>{
 const db=new Map(),store={getItem:key=>db.get(key)||null,setItem:(k,v)=>db.set(k,v)};
 const s=makeState('Guardar','Lisboa');execute(s,'match');
 assert.equal(saveState(s,store),true);
 const copy=loadState(store);
 assert.equal(copy.players.length,s.players.length);
 assert.equal(copy.league.round,s.league.round);
 assert.equal(copy.lastMatch.hg,s.lastMatch.hg);
});
test('amizoso contra IA não altera classificação da liga',()=>{
 const s=makeState(),before=JSON.stringify(standings(s));
 execute(s,'friendly',{id:1});
 assert.equal(JSON.stringify(standings(s)),before);
});
test('personalização escapa ao motor mas mantém o clube editável',()=>{
 const s=makeState();
 execute(s,'club-update',{name:'Clube & Filhos',city:'Coimbra',stadium:'Nova Arena',color:'#caf35b'});
 assert.equal(s.league.teams[0].name,'Clube & Filhos');
});
