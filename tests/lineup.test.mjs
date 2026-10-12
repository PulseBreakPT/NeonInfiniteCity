import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,FORMATIONS,getPlayer,migrate,autoLineup} from '../model.js';
import {execute} from '../actions.js';
import {tactics,playerDetail} from '../ui-main.js';

const state=()=>makeState('União Futura','Faro');

test('all eleven pitch positions are real accessible buttons',()=>{
 const s=state(),html=tactics(s,{slot:null,candidate:null});
 assert.equal((html.match(/data-action="select-slot"/g)||[]).length,11);
 assert.equal((html.match(/class="lineup-player /g)||[]).length,s.players.length);
 assert.ok(html.includes('id="lineup-picker"'));
 assert.ok(html.includes('id="starting-pitch"'));
 assert.ok(html.includes('11/11'));
 assert.ok(html.includes('data-action="pick-player"'));
});
test('slot selection shows removal and allows assigning another starter',()=>{
 const s=state(),ui={slot:2,candidate:null};
 const html=tactics(s,ui);
 assert.ok(html.includes('data-action="unassign-slot"'));
 assert.ok(html.includes('data-action="swap-slot"'));
 assert.ok(html.includes('aria-pressed="true"'));
 assert.ok(html.includes('Jogador para Defesa'));
 assert.equal((html.match(/data-action="swap-slot"/g)||[]).length,s.players.length);
});
test('removing a starter leaves an explicit empty slot',()=>{
 const s=state(),original=s.lineups[s.formation].slice(),removed=original[4];
 const result=execute(s,'unassign-slot',{slot:4});
 assert.match(result.message,/Posição por preencher/);
 assert.equal(s.lineups[s.formation].length,11);
 assert.equal(s.lineups[s.formation][4],null);
 assert.equal(s.lineups[s.formation].filter(Boolean).length,10);
 const html=tactics(s,{slot:4,candidate:null});
 assert.ok(html.includes('VAGA'));
 assert.ok(html.includes('10/11'));
 assert.ok(!html.includes('data-action="unassign-slot"'));
 assert.ok(s.players.some(x=>x.id===removed),'The player must remain in the club');
});
test('a substitute fills a gap and can replace an existing starter',()=>{
 const s=state(),ids=s.lineups[s.formation];
 const bench=s.players.find(p=>!ids.includes(p.id)&&p.injury===0);
 assert.ok(bench);
 execute(s,'unassign-slot',{slot:7});
 execute(s,'swap',{slot:7,id:bench.id});
 assert.equal(ids[7],bench.id);
 assert.equal(ids.filter(Boolean).length,11);
 assert.equal(new Set(ids).size,11);
 const another=s.players.find(p=>!ids.includes(p.id)&&p.injury===0);
 const displaced=ids[10];
 execute(s,'swap',{slot:10,id:another.id});
 assert.equal(ids[10],another.id);
 assert.ok(!ids.includes(displaced));
 assert.ok(s.players.some(p=>p.id===displaced));
});
test('two starters exchange positions without being duplicated',()=>{
 const s=state(),ids=s.lineups[s.formation],first=ids[2],second=ids[8];
 execute(s,'swap',{slot:8,id:first});
 assert.equal(ids[8],first);
 assert.equal(ids[2],second);
 assert.equal(ids.length,11);
 assert.equal(new Set(ids).size,11);
});
test('moving a starter into a vacant slot leaves the old slot vacant',()=>{
 const s=state(),ids=s.lineups[s.formation],existing=ids[8];
 execute(s,'unassign-slot',{slot:5});
 execute(s,'swap',{slot:5,id:existing});
 assert.equal(ids[5],existing);
 assert.equal(ids[8],null);
 assert.equal(ids.filter(Boolean).length,10);
});
test('invalid removals and ineligible players cannot alter the saved XI',()=>{
 const s=state(),before=JSON.stringify(s.lineups);
 for(const n of [-1,11,1.5,'wrong'])assert.throws(()=>execute(s,'unassign-slot',{slot:n}),/Posição inválida/);
 assert.equal(JSON.stringify(s.lineups),before);
 const injured=s.players.find(p=>!s.lineups[s.formation].includes(p.id));
 injured.injury=2;
 assert.throws(()=>execute(s,'swap',{slot:5,id:injured.id}),/lesionado/);
 assert.equal(JSON.stringify(s.lineups),before);
});
test('manual changes survive migration of a local v2 save',()=>{
 const s=state(),id=s.players.find(p=>!s.lineups[s.formation].includes(p.id)).id;
 execute(s,'unassign-slot',{slot:2});
 execute(s,'swap',{slot:2,id});
 execute(s,'unassign-slot',{slot:4});
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.lineups[restored.formation][2],id);
 assert.equal(restored.lineups[restored.formation][4],null);
 assert.equal(restored.players.length,s.players.length);
});
test('the match engine can complete a vacant position without altering manual choices outside the match',()=>{
 const s=state(),slot=8;
 execute(s,'unassign-slot',{slot});
 assert.equal(s.lineups[s.formation][slot],null);
 execute(s,'match');
 assert.equal(s.lineups[s.formation].filter(Boolean).length,11);
 assert.equal(new Set(s.lineups[s.formation]).size,11);
});
test('player detail includes a direct route to tactical XI selection',()=>{
 const s=state(),html=playerDetail(s,s.players[1].id);
 assert.ok(html.includes('data-action="lineup-from-card"'));
 assert.ok(html.includes('ESCOLHER PARA O ONZE'));
});
