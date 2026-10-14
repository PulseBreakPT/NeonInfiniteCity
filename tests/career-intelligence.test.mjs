import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState,migrate,rating} from '../model.js';
import {execute} from '../actions.js';
import {advanceSeason} from '../sim.js';
import {ensureCareer,progressCareerWeek,preserveLineups,getAdvisorReport} from '../career-intelligence.js';
import {market,finance,events,profile} from '../ui-extra.js';

const fresh=()=>makeState('Inteligência Atlântica','Faro');

test('new clubs and old saves have deterministic, persistent personalities',()=>{
 const state=fresh(),player=state.players[0];
 assert.ok(player.personality.ambition>=25&&player.personality.ambition<=95);
 assert.equal(typeof player.satisfaction,'number');
 assert.equal(Object.keys(state.rivals).length,15);
 assert.ok(Object.values(state.rivals).every(c=>c.strategy&&c.players.every(p=>p.personality)));
 const clone=migrate(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(clone.players[0].personality,player.personality);
 assert.ok(Array.isArray(clone.world.news));
 assert.ok(clone.board.targetRank>0);
});
test('weekly development is idempotent and records memory once',()=>{
 const s=fresh();
 s.players[0].satisfaction=40;
 const original=s.players[0].careerApps;
 progressCareerWeek(s,1);
 const evolved=s.players[0].careerApps;
 assert.ok(evolved>=original);
 const snapshot=JSON.stringify(s);
 progressCareerWeek(s,1);
 assert.equal(JSON.stringify(s),snapshot);
});
test('academy accepts one paid individual training per athlete each week',()=>{
 const s=fresh(),kid=s.academy[0],before=s.budget;
 execute(s,'academy-train',{id:kid.id});
 assert.equal(s.budget,before-12000);
 assert.throws(()=>execute(s,'academy-train',{id:kid.id}),/já treinou/);
 assert.equal(s.budget,before-12000);
 s.week++;
 execute(s,'academy-train',{id:kid.id});
 assert.equal(s.budget,before-24000);
});
test('selling a substitute preserves manually arranged starting eleven',()=>{
 const s=fresh(),xi=s.lineups[s.formation].slice();
 const bench=s.players.find(p=>!xi.includes(p.id));
 execute(s,'sell',{id:bench.id});
 assert.deepEqual(s.lineups[s.formation],xi);
});
test('selling a starter fills only the affected position',()=>{
 const s=fresh(),xi=s.lineups[s.formation].slice(),sold=xi[2];
 execute(s,'sell',{id:sold});
 const next=s.lineups[s.formation];
 assert.equal(next.length,11);
 assert.ok(!next.includes(sold));
 assert.ok(next.every((id,i)=>i===2||id===xi[i]));
 assert.equal(new Set(next).size,11);
});
test('negotiations above the direct purchase threshold settle at the next week',()=>{
 const s=fresh();
 const p=s.market.filter(x=>x.ask>100000&&x.ask*1.12<s.budget).sort((a,b)=>a.ask-b.ask)[0];
 assert.ok(p,'Need an affordable negotiable transfer');
 const sum=Math.ceil(p.ask*1.1/1000)*1000;
 const start=s.budget;
 execute(s,'offer-transfer',{id:p.id,amount:sum});
 assert.equal(s.budget,start);
 assert.equal(s.negotiations[0].status,'pending');
 s.week++;
 progressCareerWeek(s,1);
 assert.equal(s.negotiations[0].status,'accepted');
 assert.ok(s.players.some(x=>x.id===p.id));
 assert.equal(s.budget,start-sum);
});
test('underbids receive a counteroffer instead of a hidden random failure',()=>{
 const s=fresh();
 const p=s.market.filter(x=>x.ask>100000&&x.ask*.8<s.budget).sort((a,b)=>a.ask-b.ask)[0];
 assert.ok(p);
 execute(s,'offer-transfer',{id:p.id,amount:Math.ceil(p.ask*.7/1000)*1000});
 s.week++;
 progressCareerWeek(s,1);
 const deal=s.negotiations[0];
 assert.equal(deal.status,'counter');
 assert.ok(deal.counterAmount>deal.amount);
 const ui=market(s);
 assert.ok(ui.includes('accept-counter'));
});
test('incoming club offer is executable and credited exactly once',()=>{
 const s=fresh(),p=s.players.find(x=>!s.lineups[s.formation].includes(x.id));
 const club=s.rivals[1],sum=60000;
 club.budget=Math.max(club.budget,100000);
 s.incomingOffers.push({id:246,playerId:p.id,clubId:club.id,clubName:club.name,amount:sum,status:'pending',expiresWeek:3});
 const before=s.budget;
 execute(s,'accept-offer',{id:246});
 assert.equal(s.budget,before+sum);
 assert.ok(!s.players.some(x=>x.id===p.id));
 assert.ok(club.players.some(x=>x.name===p.name));
 assert.throws(()=>execute(s,'accept-offer',{id:246}),/expirada|inexistente/);
});
test('the board grants funds once per season and rejects insolvent requests',()=>{
 const s=fresh(),before=s.budget;
 const result=execute(s,'board-request');
 assert.match(result.message,/aprovou/);
 assert.ok(s.budget>before);
 assert.throws(()=>execute(s,'board-request'),/Já pediste/);
 const insolvent=fresh();insolvent.finance.debt=1000;
 assert.match(execute(insolvent,'board-request').message,/recusado/);
});
test('coach specializations spend points and have an irreversible unlock',()=>{
 const s=fresh();s.coach.skillPoints=2;
 execute(s,'coach-skill',{id:'economist'});
 assert.equal(s.coach.skillPoints,1);
 assert.ok(s.coach.skills.includes('economist'));
 assert.throws(()=>execute(s,'coach-skill',{id:'economist'}),/Já desbloqueaste/);
});
test('relegations and new seasons do not regenerate rival squads or delete histories',()=>{
 const s=fresh(),old=s.rivals[1],firstId=old.players[0].id,manager=old.manager.name;
 s.league.completed=true;
 advanceSeason(s);
 assert.strictEqual(s.rivals[1],old);
 assert.ok(s.rivals[1].players.some(p=>p.id===firstId));
 assert.equal(s.rivals[1].manager.name,manager);
 assert.equal(s.rivals[1].seasons,1);
 assert.equal(s.world.seasons.length,1);
});
test('career adviser, transfers, director and world news are visible in the app',()=>{
 const s=fresh(),report=getAdvisorReport(s);
 assert.ok(['GK','DEF','MID','ATT'].includes(report.weakest));
 assert.ok(finance(s).includes('Direção e objetivos'));
 assert.ok(market(s).includes('Propostas por jogadores'));
 assert.ok(events(s).includes('Notícias do universo'));
 assert.ok(profile(s).includes('Especializações do treinador'));
});

test('older starters eventually retire and are replaced with different identities',()=>{
 const s=fresh(),before=s.players.length,starter=s.lineups[s.formation][2];
 s.players.find(p=>p.id===starter).age=40;
 s.league.completed=true;
 advanceSeason(s);
 assert.equal(s.players.length,before);
 assert.ok(!s.players.some(p=>p.id===starter));
 assert.ok(!s.lineups[s.formation].includes(starter));
 assert.ok(s.world.retired.some(p=>p.id===starter));
});
test('relegation changes the actual opponent clubs and archives the old division',()=>{
 const s=fresh(),names=Object.values(s.rivals).map(x=>x.name);
 for(const f of s.league.rounds.flat()){
  f.played=true;
  if(f.home===0){f.hg=0;f.ag=4;}
  else if(f.away===0){f.hg=4;f.ag=0;}
  else {f.hg=0;f.ag=0;}
 }
 s.league.completed=true;
 advanceSeason(s);
 assert.equal(s.division,2);
 const now=Object.values(s.rivals).map(x=>x.name);
 assert.notDeepEqual(now,names);
 assert.ok(s.world.divisionArchives[1]);
 assert.equal(s.league.teams[1].name,s.rivals[1].name);
});
test('leadership specialty raises morale-related satisfaction over time',()=>{
 const normal=fresh(),leader=structuredClone(normal);
 leader.coach.skills.push('leader');
 progressCareerWeek(normal,1);progressCareerWeek(leader,1);
 assert.ok(leader.players[0].satisfaction>=normal.players[0].satisfaction);
});
test('director ultimatum blocks expensive discretionary actions but permits training',()=>{
 const s=fresh();s.board.status='ultimatum';
 assert.throws(()=>execute(s,'upgrade',{key:'stadium'}),/direção/);
 execute(s,'train',{kind:'technical'});
 assert.equal(s.trainingCount,1);
});

test('a counterproposal persists its player through a renewed market and can be accepted',()=>{
 const s=fresh(),player=s.market.filter(p=>p.ask>100000&&p.ask*.9<s.budget).sort((a,b)=>a.ask-b.ask)[0];
 assert.ok(player);
 const start=s.budget;
 execute(s,'offer-transfer',{id:player.id,amount:Math.ceil(player.ask*.7/1000)*1000});
 s.week++;
 progressCareerWeek(s,1);
 const deal=s.negotiations[0];
 assert.equal(deal.status,'counter');
 const updatedMarket=s.market.filter(p=>p.id!==player.id);
 s.market=updatedMarket;
 execute(s,'accept-counter',{id:deal.id});
 assert.equal(deal.status,'pending');
 s.week++;
 progressCareerWeek(s,2);
 assert.equal(deal.status,'accepted');
 assert.equal(s.budget,start-deal.amount);
 assert.ok(s.players.some(p=>p.id===player.id));
 assert.ok(!s.players.find(p=>p.id===player.id).ask);
});

test('premium market offers are owned by rivals and transfers genuinely move the player',()=>{
 const s=fresh(),offer=s.market.filter(p=>p.sourceClubId&&p.ask>100000&&p.ask*1.12<s.budget)
  .sort((a,b)=>a.ask-b.ask)[0];
 assert.ok(offer,'Expected a priced player listed by a real rival club');
 const seller=s.rivals[offer.sourceClubId],oldBudget=seller.budget;
 assert.ok(seller.players.some(p=>p.id===offer.sourcePlayerId));
 assert.throws(()=>execute(s,'bid',{id:offer.id}),/negociação/);
 const amount=Math.ceil(offer.ask*1.1/1000)*1000;
 execute(s,'offer-transfer',{id:offer.id,amount});
 s.week++;
 progressCareerWeek(s,1);
 assert.ok(s.players.some(p=>p.id===offer.id));
 const settledSeller=s.rivals[offer.sourceClubId];
 assert.ok(!settledSeller.players.some(p=>p.id===offer.sourcePlayerId));
 assert.ok(settledSeller.budget>=oldBudget);
 assert.ok(!settledSeller.lineup.includes(offer.sourcePlayerId));
});

test('market listing IDs stay unique from rival athlete IDs across saves',()=>{
 const s=fresh();
 const offers=s.market.filter(p=>p.sourceClubId);
 assert.ok(offers.length>=2);
 for(const offer of offers){
  assert.notEqual(offer.id,offer.sourcePlayerId);
  assert.ok(s.rivals[offer.sourceClubId].players.some(p=>p.id===offer.sourcePlayerId));
 }
 const clone=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(clone.market.map(p=>p.id),s.market.map(p=>p.id));
 assert.ok(clone.nextId>=s.nextId);
 assert.equal(new Set(clone.market.map(p=>p.id)).size,clone.market.length);
});
