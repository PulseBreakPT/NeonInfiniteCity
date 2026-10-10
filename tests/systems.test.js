import test from 'node:test';
import assert from 'node:assert/strict';
import {makePerson,advance,loadSave} from '../src/engine.js';
import {RULES,RULE_BY_ID,GROUPS,ensureSystems,doRule,checkRule,tickSystems} from '../src/systems.js';

const adult=()=>{const p=makePerson({first:'Inês'});p.age=29;p.year=2055;p.cash=250000;p.job='software';p.home={name:'Apartamento',value:90000};p.car={name:'Citadino',value:12000};p.prison=0;p.pending=null;return p;};

test('100 unique rule implementations spread across 10 simulated domains',()=>{
 assert.equal(RULES.length,100);assert.equal(RULE_BY_ID.size,100);assert.equal(GROUPS.length,10);
 for(const g of GROUPS)assert.equal(RULES.filter(r=>r.group===g.id).length,10);
 for(const r of RULES){assert.ok(r.title&&r.desc&&r.icon);assert.ok(Object.keys(r.good).length>=1);assert.ok(Object.keys(r.bad).length>=1);assert.ok(r.risk>0&&r.risk<1);}
});

test('every one of the 100 rules can be executed on a valid eligible character',()=>{
 for(const r of RULES){const p=adult();const s=ensureSystems(p);p.age=Math.max(p.age,r.minAge);p.year=2026+p.age;assert.equal(checkRule(p,r),null,`${r.id} unavailable`);const before=p.cash;const result=doRule(p,r.id);assert.equal(result.ok,true,r.id);assert.equal(s.points,3);assert.equal(s.done[r.id],p.age);assert.equal(p.events[0].title,r.title);assert.ok(p.cash<=before+2000);}
});

test('time budget, costs, age restrictions, irreversible choices and pending events are enforced',()=>{
 const p=adult();p.cash=1;assert.match(checkRule(p,RULE_BY_ID.get('escala')),/Precisas/);
 p.cash=250000;const name='documentos';assert.equal(doRule(p,name).ok,true);assert.equal(doRule(p,name).ok,false);
 for(const id of ['pegada','privacidade','comunicar'])assert.equal(doRule(p,id).ok,true);
 assert.equal(ensureSystems(p).points,0);assert.equal(doRule(p,'fraudes').ok,false);
 const baby=makePerson();assert.match(checkRule(baby,RULE_BY_ID.get('contrato')),/Disponível/);
 const other=adult();other.pending={options:[{label:'X',effect:{},text:'Y'}]};assert.match(checkRule(other,RULE_BY_ID.get('sono')),/decisão/);
});

test('world economy, service risks and meters evolve with time',()=>{
 const a=adult(),b=structuredClone(a);
 for(let i=0;i<5;i++){
  a.age++;a.year++;b.age++;b.year++;
  assert.deepEqual(tickSystems(a),tickSystems(b));
  assert.deepEqual(a.stats,b.stats);assert.equal(a.cash,b.cash);
 }
 assert.equal(a.systems.points,4);assert.ok(a.systems.world.technology>40);
});

test('success has long-term consequences but failures cannot activate benefits',()=>{
 const p=adult();p.rng=2;const start=ensureSystems(p).meters.tempo;
 const r=doRule(p,'rotina');assert.equal(r.ok,true);
 if(!r.failed){assert.equal(p.systems.flags.rotina,p.age);p.age++;p.year++;tickSystems(p);assert.ok(p.systems.meters.tempo>=start-1);}
 else assert.equal(p.systems.flags.rotina,undefined);
});

test('old saves safely migrate and system progress survives saving',()=>{
 const p=adult();doRule(p,'agenda');const parsed=loadSave(JSON.stringify(p));assert.ok(parsed);assert.equal(parsed.systems.points,3);assert.equal(parsed.systems.done.agenda,29);
 const legacy=adult();delete legacy.systems;const restored=loadSave(JSON.stringify(legacy));assert.equal(restored.systems.points,4);
});
