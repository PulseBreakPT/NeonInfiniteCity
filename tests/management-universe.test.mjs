import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,migrate,transferValue} from '../model.js';
import {execute} from '../actions.js';
import {advanceSeason} from '../sim.js';
import {progressCareerWeek} from '../career-intelligence.js';
import {
 ensureUniverse,offerContract,minimumWage,managementWeeklyTick,
 settleLoans,createAnnualYouthIntake,archiveSeasonResults,universeAdvisor
} from '../management-universe.js';
import {finance,events,academy} from '../ui-extra.js';
import {playerDetail,squad} from '../ui-main.js';
const newClub=()=>makeState('Universo Verde','Faro');
const nextWeek=(s,round)=>{s.week++;progressCareerWeek(s,round);};

test('universe fields are initialized and survive v2 save migration unchanged',()=>{
 const s=newClub();assert.equal(s.loans.length,0);
 assert.ok(s.world.outsideMarket.budget>0);
 assert.ok(s.sponsorAgreement);
 assert.ok(Number.isInteger(s.reputation));
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.reputation,s.reputation);
 assert.equal(restored.world.outsideMarket.budget,s.world.outsideMarket.budget);
 assert.equal(restored.sponsorAgreement.name,s.club.sponsor);
});
test('legacy state migration adds missing finance and contract structures once',()=>{
 const s=newClub();delete s.world.outsideMarket;delete s.loans;delete s.contractOffers;
 delete s.clubIdentity;delete s.reputation;delete s.finance.transferPayables;
 const m=migrate(JSON.parse(JSON.stringify(s)));assert.ok(m.loans&&m.contractOffers&&m.clubIdentity);
 assert.ok(m.finance.transferPayables);
 assert.deepEqual(migrate(JSON.parse(JSON.stringify(m))).world.outsideMarket,m.world.outsideMarket);
});
test('contract negotiations require market-based wages, persist accepted terms and block proposal spam',()=>{
 const s=newClub(),p=s.players[0],before=p.salary;
 const min=minimumWage(s,p);
 assert.ok(min>=before);
 const first=execute(s,'contract-offer',{id:p.id,salary:1000,years:3});
 assert.match(first.message,/Contraproposta/);
 assert.equal(p.salary,before);
 assert.throws(()=>execute(s,'contract-offer',{id:p.id,salary:min*2,years:3}),/Já apresentaste/);
 s.week++;
 const second=execute(s,'contract-offer',{id:p.id,salary:Math.ceil(min*1.08/100)*100,years:3});
 assert.match(second.message,/Contrato aceite/);
 assert.equal(p.contract,3);
 assert.ok(p.salary>before);
});
test('sponsor agreements are initially negotiable but prevent repeated switching within the season',()=>{
 const s=newClub(),base=s.budget;
 execute(s,'sponsor',{value:'premium'});
 assert.equal(s.club.sponsor,'Norte Digital');
 assert.equal(s.budget,base-12000);
 assert.throws(()=>execute(s,'sponsor',{value:'elite'}),/em vigor/);
 s.season++;
 execute(s,'sponsor',{value:'elite'});
 assert.equal(s.club.sponsor,'Horizonte Global');
 assert.equal(s.sponsorAgreement.untilSeason,s.season+1);
});
test('a player cannot be loaned twice, and comes back to the parent team at season transition',()=>{
 const s=newClub(),xi=s.lineups[s.formation].slice();
 const p=s.players.find(x=>!xi.includes(x.id));
 const count=s.players.length;
 execute(s,'loan-out',{id:p.id});
 assert.equal(s.players.length,count-1);
 const loan=s.loans.at(-1);
 assert.equal(loan.status,'active');
 assert.ok(s.rivals[loan.rivalId].players.some(x=>x.id===p.id));
 assert.ok(!s.lineups[s.formation].includes(p.id));
 s.season++;settleLoans(s);
 assert.equal(s.players.length,count);
 assert.ok(s.players.some(x=>x.id===p.id));
 assert.ok(!s.rivals[loan.rivalId].players.some(x=>x.id===p.id));
 assert.equal(loan.status,'completed');
 const snapshot=JSON.stringify(s);
 settleLoans(s);assert.equal(JSON.stringify(s),snapshot);
});
test('loaning a starter does not change unrelated teammates in their formation',()=>{
 const s=newClub(),xi=s.lineups[s.formation].slice();
 execute(s,'loan-out',{id:xi[4]});
 assert.ok(s.lineups[s.formation].every((id,i)=>i===4||id===xi[i]));
});
test('selling a player has a funded buyer, finite budget and an audit trail',()=>{
 const s=newClub(),p=s.players.find(x=>!s.lineups[s.formation].includes(x.id));
 const expected=Math.round(transferValue(p)*.65/1000)*1000;
 const initial=s.budget;
 const totalBefore=s.world.outsideMarket.budget+Object.values(s.rivals).reduce((n,c)=>n+c.budget,0);
 execute(s,'sell',{id:p.id});
 const totalAfter=s.world.outsideMarket.budget+Object.values(s.rivals).reduce((n,c)=>n+c.budget,0);
 assert.equal(initial+expected,s.budget);
 assert.equal(totalBefore-totalAfter,expected);
 assert.equal(s.world.transfers[0].playerId,p.id);
 assert.ok(!s.players.some(x=>x.id===p.id));
});
test('re-selling the same player cannot mint money',()=>{
 const s=newClub(),p=s.players.find(x=>!s.lineups[s.formation].includes(x.id));
 execute(s,'sell',{id:p.id});
 const balance=s.budget;
 assert.throws(()=>execute(s,'sell',{id:p.id}),/pelo menos|Jogador|inexistente/);
 assert.equal(s.budget,balance);
});
test('bank credit is limited and interest is assessed once per four weeks',()=>{
 const s=newClub(),before=s.budget;
 execute(s,'bank-loan',{amount:100000});
 assert.equal(s.budget,before+100000);
 assert.equal(s.finance.loanBalance,100000);
 assert.throws(()=>execute(s,'bank-loan',{amount:100000}),/recusou/);
 s.week=5;managementWeeklyTick(s,4);
 assert.ok(s.finance.loanInterestPaid>=900);
 const after=s.finance.loanInterestPaid;
 managementWeeklyTick(s,4);
 assert.equal(s.finance.loanInterestPaid,after);
});
test('insolvent teams cannot draw bank loans',()=>{
 const s=newClub();s.finance.debt=1000;
 assert.throws(()=>execute(s,'bank-loan',{amount:100000}),/recusou/);
});
test('promise of minutes has a deadline and affects player satisfaction',()=>{
 const s=newClub(),p=s.players.find(x=>!s.lineups[s.formation].includes(x.id));
 const initial=p.satisfaction;
 execute(s,'promise-minutes',{id:p.id});
 assert.throws(()=>execute(s,'promise-minutes',{id:p.id}),/promessa ativa/);
 s.week=2;managementWeeklyTick(s,1);
 s.week=5;managementWeeklyTick(s,4);
 const promise=s.playerPromises.find(x=>x.playerId===p.id);
 assert.equal(promise.status,'broken');
 assert.ok(p.satisfaction<initial);
 assert.ok(s.world.news.some(n=>n.title==='Compromissos do balneário'));
});
test('kept promises reward satisfaction',()=>{
 const s=newClub(),id=s.lineups[s.formation][0],p=s.players.find(x=>x.id===id);
 execute(s,'promise-minutes',{id});
 for(let round=1;round<=4;round++){s.week=round+1;managementWeeklyTick(s,round);}
 assert.equal(s.playerPromises[0].status,'kept');
 assert.ok(p.satisfaction>=70);
});
test('academy intake is annual, vacancy-limited and reproducible',()=>{
 const s=newClub(),before=s.academy.length;
 createAnnualYouthIntake(s);
 assert.equal(s.academy.length,Math.min(6,before+1));
 const after=JSON.stringify(s.academy);
 createAnnualYouthIntake(s);assert.equal(JSON.stringify(s.academy),after);
 s.season++;
 s.academy.pop();createAnnualYouthIntake(s);
 assert.ok(s.academy.every(x=>x.age>=15));
});
test('financial advisor returns bounded forecasts and cash history',()=>{
 const s=newClub();
 s.week=2;managementWeeklyTick(s,1);
 const report=universeAdvisor(s);
 assert.ok(Number.isFinite(report.netNextFourWeeks));
 assert.ok(report.wages>0);
 assert.equal(report.predictions[0].round,1);
 assert.ok(finance(s).includes('Previsão para 4 jornadas'));
});
test('archived season summaries do not carry giant match replays forward',()=>{
 const s=newClub();
 s.results.push({type:'league',round:2,result:{home:0,away:1,homeName:s.club.name,awayName:'Rival',hg:2,ag:0,events:[{kind:'goal'}]}});
 archiveSeasonResults(s,3);
 const row=s.world.careerRecords[0].results[0];
 assert.deepEqual(row,{competition:'league',round:2,opponent:'Rival',goalsFor:2,goalsAgainst:0});
 assert.equal(row.events,undefined);
 assert.ok(Object.keys(s.world.inactiveLeagues).length>=3);
});
test('inactive divisions have standings, promotion candidates and champions',()=>{
 const s=newClub();archiveSeasonResults(s,10);
 const other=s.world.inactiveLeagues[2];
 assert.equal(other.standings.length,16);
 assert.equal(other.promoted.length,2);
 assert.ok(other.champion);
 assert.ok(events(s).includes('Divisão 2'));
});
test('contracts and promises are actionable in the player profile',()=>{
 const s=newClub(),p=s.players[0],h=playerDetail(s,p.id);
 assert.ok(h.includes('data-action="contract-offer"'));
 assert.ok(h.includes('data-action="promise-minutes"'));
 assert.ok(h.includes('data-action="loan-out"'));
 assert.ok(squad(s,{position:'ALL',search:'',player:null}).includes('O TEU PLANTEL'));
});
test('the full season transition creates career summaries and youth intake',()=>{
 const s=newClub();s.league.completed=true;
 const before=s.world.careerRecords.length;
 advanceSeason(s);
 assert.equal(s.world.careerRecords.length,before+1);
 assert.equal(s.world.lastYouthIntakeSeason,s.season);
 assert.ok(s.academy.length>=4);
});
test('weekly universe processing and migration are idempotent',()=>{
 const s=newClub();nextWeek(s,1);
 const before=JSON.stringify(s);
 progressCareerWeek(s,1);
 assert.equal(JSON.stringify(s),before);
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.world.financialHistory.length,s.world.financialHistory.length);
 assert.equal(saved.playerPromises.length,s.playerPromises.length);
});
