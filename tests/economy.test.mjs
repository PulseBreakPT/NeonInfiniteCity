import test from 'node:test';
import assert from 'node:assert/strict';
import {
 makeState,migrate,makeMarket,autoLineup,weeklyWageBill,televisionIncome,sponsorIncome,
 campusMaintenance,transferValue,saveState,loadState
} from '../model.js';
import {execute} from '../actions.js';
import {finance,market} from '../ui-extra.js';

const fresh=()=>makeState('Operacional FC','Aveiro');
test('a jornada paga direitos televisivos e patrocínio separadamente',()=>{
 const s=fresh(),before=s.budget,expenses=weeklyWageBill(s)+campusMaintenance(s);
 const regular=televisionIncome(s)+sponsorIncome(s);
 assert.ok(regular>=expenses,'A massa salarial inicial não deve superar as receitas garantidas');
 execute(s,'match');
 assert.ok(s.finance.ledger.some(e=>e.label.includes('Direitos televisivos')&&e.amount===televisionIncome(s)));
 assert.ok(s.finance.ledger.some(e=>e.label.includes('Patrocínio')&&e.amount===sponsorIncome(s)));
 assert.ok(s.budget>=before,'A primeira jornada sem despesas voluntárias não pode empobrecer o clube');
});
test('a gestão normal é sustentável durante meia época com 1 treino por jornada',()=>{
 const s=fresh(),initial=s.budget;
 for(let i=0;i<15;i++){execute(s,'train',{kind:'technical'});execute(s,'match');}
 assert.ok(s.budget>initial,'A economia tem de permitir treinamentos regulares: '+s.budget);
 assert.equal(s.league.round,16);
 assert.equal(s.finance.debt,0);
});
test('8 épocas completas sem compras não deixam o clube sem jogadores contratados',()=>{
 const s=fresh(),first=s.players.length;
 for(let y=0;y<8;y++){
  for(let week=0;week<30;week++)execute(s,'match');
  execute(s,'new-season');
  assert.equal(s.players.length,first);
  assert.ok(s.players.every(p=>p.contract>0),'Um jogador expirou na época '+s.season);
  assert.ok(autoLineup(s).every(Boolean),'A formação ficou sem 11 disponíveis');
  assert.equal(s.finance.debt,0);
 }
});
test('um save antigo com todos os contratos expirados e dívida recupera sem perder progresso',()=>{
 const original=fresh();
 original.season=5;original.week=7;original.budget=0;
 original.finance.debt=720000;original.finance.unpaidWages=140000;original.finance.boardConfidence=10;
 delete original.finance.economyRevision;
 for(const p of original.players)p.contract=0;
 original.coach.wins=41;
 original.facilities.training=4;
 const beforeNames=original.players.map(p=>p.name),migrated=migrate(JSON.parse(JSON.stringify(original)));
 assert.ok(migrated);
 assert.equal(migrated.players.length,original.players.length);
 assert.deepEqual(migrated.players.map(p=>p.name),beforeNames);
 assert.ok(migrated.players.every(p=>p.contract>=2));
 assert.equal(migrated.budget,450000);
 assert.equal(migrated.finance.debt,0);
 assert.equal(migrated.finance.unpaidWages,0);
 assert.equal(migrated.coach.wins,41);
 assert.equal(migrated.facilities.training,4);
 assert.equal(migrated.finance.economyRevision,4);
 assert.ok(migrated.market.some(p=>p.ask===0),'O mercado recuperado precisa de jogadores livres');
 assert.ok(autoLineup(migrated).every(Boolean));
 const restored=migrate(JSON.parse(JSON.stringify(migrated)));
 assert.equal(restored.budget,migrated.budget);
 assert.equal(restored.finance.income,migrated.finance.income);
 assert.equal(restored.finance.debtRelief,migrated.finance.debtRelief);
 assert.deepEqual(restored.players.map(p=>p.contract),migrated.players.map(p=>p.contract));
 assert.equal(restored.finance.ledger.filter(e=>e.label.includes('Capital de recuperação')).length,1);
});
test('um save saudável não recebe uma ajuda financeira duplicada',()=>{
 const original=fresh(),budget=original.budget,rev=original.finance.economyRevision;
 assert.equal(rev,4);
 const recovered=migrate(JSON.parse(JSON.stringify(original)));
 assert.equal(recovered.budget,budget);
 assert.equal(recovered.finance.ledger.length,original.finance.ledger.length);
});
test('qualquer mercado tem reforços gratuitos e uma contratação abaixo de 100 mil euros',()=>{
 const s=fresh();
 for(let week=1;week<=12;week++){
  s.week=week;
  const offers=makeMarket(s,3460+week);
  assert.ok(offers.filter(p=>p.freeAgent&&p.ask===0).length>=2);
  assert.ok(offers.some(p=>p.ask>0&&p.ask<=100000));
  assert.ok(offers.every(p=>p.ask<=transferValue(p)));
 }
});
test('um clube com zero euros pode contratar um jogador livre',()=>{
 const s=fresh();s.budget=0;
 const free=s.market.find(p=>p.freeAgent);
 assert.ok(free);
 const count=s.players.length;
 const result=execute(s,'bid',{id:free.id});
 assert.match(result.message,/sem taxa de transferência/);
 assert.equal(s.players.length,count+1);
 assert.equal(s.budget,0);
 assert.ok(s.players.some(p=>p.id===free.id));
 assert.throws(()=>execute(s,'sell',{id:free.id}),/integração/);
});
test('contratar diretamente jogador barato não depende de licitação aleatória',()=>{
 const s=fresh();const cheap=s.market.find(p=>p.ask>0&&p.ask<=100000);
 assert.ok(cheap);const starting=s.budget;
 execute(s,'bid',{id:cheap.id});
 assert.ok(s.players.some(p=>p.id===cheap.id));
 assert.equal(s.budget,starting-cheap.ask);
});
test('a venda gera um montante moderado e não milhões por jogadores livres',()=>{
 const s=fresh(),p=s.players.find(p=>!s.lineups[s.formation].includes(p.id));
 const expected=Math.round(transferValue(p)*.65/1000)*1000;
 const budget=s.budget;
 execute(s,'sell',{id:p.id});
 assert.equal(s.budget,budget+expected);
});
test('renovar um contrato sem dinheiro não bloqueia jogadores',()=>{
 const s=fresh(),p=s.players[0];
 const initialWage=p.salary;
 s.budget=0;p.contract=0;
 const result=execute(s,'renew',{id:p.id});
 assert.equal(s.budget,0);
 assert.equal(p.contract,3);
 assert.ok(p.salary>=initialWage);
 assert.match(result.message,/valores de mercado/);
 assert.throws(()=>execute(s,'renew',{id:p.id}),/já foi renovado/);
});
test('o ecrã financeiro apresenta contas recorrentes e o mercado preços gratuitos',()=>{
 const s=fresh(),fin=finance(s),offers=market(s);
 for(const word of ['Previsão da próxima jornada','Direitos televisivos','Patrocínio','Salários','Manutenção','SALDO RECORRENTE'])assert.ok(fin.includes(word),word);
 assert.ok(offers.includes('CONTRATAR GRÁTIS'));
 assert.ok(offers.includes('SALDO'));
});
test('um save recuperado mantém o plantel e a economia após guardar e carregar',()=>{
 const s=fresh();delete s.finance.economyRevision;s.players.forEach(p=>p.contract=0);s.budget=0;
 const old=migrate(s),db=new Map(),storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
 saveState(old,storage);
 const freshReload=loadState(storage);
 assert.equal(freshReload.finance.economyRevision,4);
 assert.equal(freshReload.budget,old.budget);
 assert.ok(freshReload.players.every(p=>p.contract>0));
});
