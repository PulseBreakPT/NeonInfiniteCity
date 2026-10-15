/**
 * Offline management universe: contracts, real transfer counterparties, loans,
 * dressing-room promises, finance, scouting, youth intake and inactive leagues.
 * Deliberately separate from match physics and deterministic per saved week.
 */
import {clamp,generatePlayer,hash,rating,rng,transferValue,FORMATIONS} from './model.js';

const safeNumber=(n,otherwise=0)=>Number.isFinite(Number(n))?Number(n):otherwise;
const defaultSponsor=(s)=>({name:s.club.sponsor,untilSeason:s.season,startedSeason:s.season});
const positions=['GK','DEF','MID','ATT'];
const logNews=(s,title,detail,kind='management')=>{
 s.world.news??=[];
 s.world.news.unshift({id:s.season+':'+s.week+':'+s.world.serial++,season:s.season,week:s.week,title,detail,kind});
 s.world.news=s.world.news.slice(0,85);
};
const recordTransfer=(s,record)=>{
 s.world.transfers.unshift({season:s.season,week:s.week,...record});
 s.world.transfers=s.world.transfers.slice(0,110);
};
export function ensureUniverse(s){
 s.world??={};const w=s.world;
 w.serial??=0;w.news??=[];w.transfers??=[];w.seasons??=[];
 w.financialHistory??=[];w.careerRecords??=[];w.outsideMarket??={budget:18000000,players:[]};
 w.inactiveLeagues??={};w.developments??=[];
 s.contractOffers??=[];s.loans??=[];s.playerPromises??=[];
 s.sponsorAgreement??=defaultSponsor(s);
 s.reputation=clamp(safeNumber(s.reputation,43+Math.floor((s.fans||0)/2300)),1,100);
 s.clubIdentity??={supporterTrust:75,dressingRoom:80,academyGraduates:0,consecutiveBadWeeks:0};
 s.finance.loanBalance??=0;s.finance.loanInterestPaid??=0;
 s.finance.transferPayables??=[];s.finance.transferReceivables??=[];
 // Sanitize malformed imported offers without changing legitimate user choices.
 const seen=new Set((s.players||[]).map(p=>p.id));
 s.market=(s.market||[]).filter(p=>p&&Number.isInteger(p.id)&&p.id>0&&!seen.has(p.id));
 const seenMarket=new Set();
 s.market=s.market.filter(p=>!seenMarket.has(p.id)&&seenMarket.add(p.id));
 for(const p of [...(s.players||[]),...(s.academy||[])])if(!Array.isArray(p.promises))p.promises=[];
 return s;
}
function availableRivals(s){return Object.values(s.rivals||{}).filter(c=>Array.isArray(c.players));}
function chooseBuyer(s,p,price){
 const clubs=availableRivals(s).filter(c=>(c.budget||0)>=price+25000&&c.players.length<28)
 .sort((a,b)=>(a.players.filter(x=>x.pos===p.pos).length-b.players.filter(x=>x.pos===p.pos).length)||b.budget-a.budget);
 if(clubs.length)return {type:'rival',club:clubs[0]};
 const outside=s.world.outsideMarket;
 if(outside.budget>=price)return {type:'external',club:outside};
 return null;
}
function refreshRivalLineup(club){
 const pool=club.players.filter(p=>(p.contract??1)>0&&(p.injury||0)<=0).sort((a,b)=>rating(b)-rating(a));
 club.lineup=(FORMATIONS[club.formation]||FORMATIONS['4-3-3']).map(pos=>{
  const index=Math.max(0,pool.findIndex(p=>p.pos===pos));
  return pool.splice(index,1)[0]?.id??null;
 });
}
function cleanAsset(p){
 const copy={...p};for(const key of ['ask','expires','bids','freeAgent','sourceClubId','sourcePlayerId'])delete copy[key];
 return copy;
}
export function executeRealSale(s,id){
 ensureUniverse(s);
 const p=s.players.find(x=>x.id===Number(id));
 if(!p||s.players.length<=16)throw Error('Precisas de pelo menos 16 jogadores.');
 if((p.saleLockUntilWeek||0)>s.week)throw Error('O jogador deve permanecer no clube durante a integração.');
 const marketPrice=Math.round(transferValue(p)*.65/1000)*1000;
 // Immediate resale of a subsidized or underpriced signing must never mint
 // money. Legitimate appreciation becomes available next season.
 const feeCap=(p.acquisitionCost>0&&p.acquisitionSeason===s.season)
  ?Math.max(0,Math.floor(p.acquisitionCost*.92/1000)*1000):marketPrice;
 const price=Math.min(marketPrice,feeCap);
 const buyer=chooseBuyer(s,p,price);
 if(!buyer)throw Error('Não há clubes compradores com orçamento para este atleta.');
 buyer.club.budget-=price;
 if(buyer.type==='rival'){buyer.club.players.push({...cleanAsset(p),apps:0,goals:0,assists:0});refreshRivalLineup(buyer.club);}
 else buyer.club.players.unshift({id:p.id,name:p.name,pos:p.pos,age:p.age,fee:price,season:s.season});
 recordTransfer(s,{player:p.name,playerId:p.id,fee:price,from:s.club.name,to:buyer.type==='rival'?buyer.club.name:'Mercado internacional'});
 logNews(s,'Venda com comprador confirmado',p.name+' foi contratado por '+(buyer.type==='rival'?buyer.club.name:'um clube internacional')+' por '+price+' €.','transfer');
 return {player:p,price};
}
export function minimumWage(s,p){
 const skill=rating(p),ambition=p.personality?.ambition??55,loyalty=p.personality?.loyalty??50;
 const market=Math.round((950+skill*skill*2.7)/100)*100;
 const desired=Math.max(p.salary||0,market)*(1.01+ambition/470-loyalty/900+(s.reputation<55?.035:0));
 return Math.ceil(desired/100)*100;
}
export function offerContract(s,id,salary,years){
 ensureUniverse(s);
 const p=s.players.find(x=>x.id===Number(id));if(!p)throw Error('Jogador inexistente.');
 if(!Number.isInteger(years)||years<1||years>5)throw Error('Duração inválida: entre 1 e 5 épocas.');
 if(!Number.isFinite(salary)||salary<1000||salary>2000000)throw Error('Salário proposto inválido.');
 if(s.contractOffers.some(x=>x.playerId===p.id&&x.season===s.season&&x.week===s.week))
  throw Error('Já apresentaste uma proposta ao jogador nesta jornada.');
 const minimum=minimumWage(s,p);
 const adjusted=Math.round(minimum*(years>=3?.95:1));
 const accepted=salary>=adjusted&&!(p.wantsTransfer&&p.personality?.loyalty<38&&salary<adjusted*1.3);
 const offer={id:s.world.serial++,playerId:p.id,season:s.season,week:s.week,salary,years,minimum:adjusted,status:accepted?'accepted':'counter'};
 s.contractOffers.push(offer);
 if(accepted){
  p.contract=years;p.salary=salary;p.satisfaction=clamp((p.satisfaction??70)+8,0,100);
  p.wantsTransfer=false;p.lastNegotiatedSeason=s.season;
  logNews(s,'Contrato renovado',p.name+' assinou por '+years+' épocas com salário de '+salary+' € mensais.','contract');
 }
 else logNews(s,'Contraproposta salarial',p.name+' pretende pelo menos '+adjusted+' € mensais.','contract');
 return offer;
}
export function proposeMinutes(s,id){
 ensureUniverse(s);
 const p=s.players.find(x=>x.id===Number(id));
 if(!p)throw Error('Jogador inexistente.');
 if(s.playerPromises.some(x=>x.playerId===p.id&&x.status==='active'))throw Error('Já existe uma promessa ativa.');
 const deal={playerId:p.id,startedWeek:s.week,expiresWeek:s.week+4,starts:0,target:2,status:'active'};
 s.playerPromises.push(deal);
 p.satisfaction=clamp((p.satisfaction??75)+4,0,100);
 logNews(s,'Promessa de utilização','O treinador comprometeu-se a dar oportunidades a '+p.name+' nas próximas quatro jornadas.','locker');
 return deal;
}
export function loanOut(s,id){
 ensureUniverse(s);
 const p=s.players.find(x=>x.id===Number(id));
 if(!p||s.players.length<=19)throw Error('Plantel insuficiente para ceder jogadores.');
 if((p.saleLockUntilWeek||0)>s.week)throw Error('O jogador está no período de integração.');
 if(s.loans.filter(x=>x.status==='active').length>=2)throw Error('Limite de dois empréstimos ativos.');
 const target=availableRivals(s).filter(c=>c.players.length<24&&c.budget>40000)
 .sort((a,b)=>(a.players.filter(x=>x.pos===p.pos).length-b.players.filter(x=>x.pos===p.pos).length)||b.budget-a.budget)[0];
 if(!target)throw Error('Não há clubes disponíveis para empréstimo.');
 const fee=10000;
 target.budget-=fee;s.budget+=fee;s.finance.income+=fee;
 s.finance.ledger.unshift({day:s.day,label:'Cedência de '+p.name,amount:fee});
 const loan={id:s.world.serial++,direction:'out',player:p,playerId:p.id,rivalId:target.id,season:s.season,untilSeason:s.season+1,status:'active'};
 s.loans.push(loan);
 target.players.push({...cleanAsset(p),loanClubId:0});
 refreshRivalLineup(target);
 s.players=s.players.filter(x=>x.id!==p.id);
 recordTransfer(s,{player:p.name,fee,direction:'loan',to:target.name,from:s.club.name});
 logNews(s,'Empréstimo confirmado',p.name+' foi emprestado a '+target.name+' até ao final da época.','transfer');
 return loan;
}
export function settleLoans(s){
 ensureUniverse(s);
 for(const loan of s.loans){
  if(loan.status!=='active'||s.season<loan.untilSeason)continue;
  const club=s.rivals[loan.rivalId]||Object.values(s.world.divisionArchives||{}).flatMap(x=>Object.values(x.rivals||{})).find(x=>x.id===loan.rivalId);
  if(loan.direction==='out'){
   if(club){club.players=club.players.filter(p=>p.id!==loan.playerId);refreshRivalLineup(club);}
   if(!s.players.some(p=>p.id===loan.playerId)){
    s.players.push({...loan.player,age:(loan.player.age||20)+1,fitness:90,injury:0});
   }
   logNews(s,'Regresso de empréstimo',loan.player.name+' regressou ao '+s.club.name+'.','transfer');
  }
  loan.status='completed';loan.returnSeason=s.season;
 }
 s.loans=s.loans.slice(-28);
}
export function agreementSponsor(s,choice){
 ensureUniverse(s);
 if(s.sponsorAgreement&&s.sponsorAgreement.untilSeason>s.season)
  throw Error('O patrocínio atual está em vigor até à próxima época.');
 const offers={regular:{name:'Atlântico Energia',fee:0,minReputation:0},
 premium:{name:'Norte Digital',fee:12000,minReputation:25},
 elite:{name:'Horizonte Global',fee:22000,minReputation:35}};
 const target=offers[choice];
 if(!target)throw Error('Patrocinador desconhecido.');
 if(s.club.sponsor===target.name)throw Error('Patrocinador já contratado.');
 if(s.reputation<target.minReputation)throw Error('Reputação insuficiente para este patrocinador.');
 if(s.budget<target.fee)throw Error('Saldo insuficiente.');
 s.budget-=target.fee;s.finance.expenses+=target.fee;
 s.finance.ledger.unshift({day:s.day,label:'Negociação: '+target.name,amount:-target.fee});
 s.club.sponsor=target.name;s.finance.sponsorTerm++;
 s.sponsorAgreement={name:target.name,untilSeason:s.season+1,startedSeason:s.season};
 logNews(s,'Patrocínio assinado',target.name+' acordou apoiar o clube durante uma época.','finance');
 return target;
}
export function startBankLoan(s,amount){
 ensureUniverse(s);
 if(!Number.isInteger(amount)||amount<50000||amount>200000)throw Error('Empréstimo entre 50 000 € e 200 000 €.');
 if(s.finance.debt>0||s.finance.loanBalance>0||s.finance.boardConfidence<55)
  throw Error('O banco recusou: existem dívidas ou falta confiança.');
 s.budget+=amount;s.finance.loanBalance+=amount;
 s.finance.ledger.unshift({day:s.day,label:'Crédito bancário',amount});
 logNews(s,'Financiamento bancário',s.club.name+' obteve um crédito de '+amount+' €, sujeito a juros.','finance');
 return amount;
}
export function repayBankLoan(s,amount){
 ensureUniverse(s);
 const debt=s.finance.loanBalance;
 if(debt<=0)throw Error('Não existe crédito bancário para amortizar.');
 if(!Number.isInteger(amount)||amount<=0)throw Error('Montante de amortização inválido.');
 const pay=Math.min(amount,debt);
 if(s.budget<pay)throw Error('Saldo insuficiente para amortizar o crédito.');
 s.budget-=pay;s.finance.loanBalance-=pay;
 s.finance.ledger.unshift({day:s.day,label:'Amortização de crédito bancário',amount:-pay});
 logNews(s,'Crédito amortizado','O clube amortizou '+pay+' € de capital do financiamento.','finance');
 return pay;
}
export function managementWeeklyTick(s,round){
 ensureUniverse(s);
 const key=s.season+':'+round;
 if(s.world.universeWeek===key)return;
 s.world.universeWeek=key;
 const started=new Set(s.lineups?.[s.formation]||[]);
 let successes=0,failures=0;
 for(const promise of s.playerPromises){
  if(promise.status!=='active')continue;
  if(started.has(promise.playerId))promise.starts++;
  if(s.week>=promise.expiresWeek){
   const p=s.players.find(x=>x.id===promise.playerId);
   const success=promise.starts>=promise.target;
   promise.status=success?'kept':'broken';
   if(p){p.satisfaction=clamp((p.satisfaction??75)+(success?12:-18),0,100);p.morale=clamp((p.morale??75)+(success?7:-12),0,100);
    p.memories?.unshift({season:s.season,week:s.week,type:'promise',outcome:promise.status});
   }
   if(success)successes++;else failures++;
  }
 }
 if(successes||failures)logNews(s,'Compromissos do balneário',successes+' promessas cumpridas · '+failures+' promessas não cumpridas.','locker');
 s.playerPromises=s.playerPromises.slice(-45);
 const morale=s.players.reduce((n,p)=>n+(p.satisfaction??75),0)/Math.max(1,s.players.length);
 s.clubIdentity.dressingRoom=Math.round(morale);
 s.clubIdentity.supporterTrust=clamp(s.clubIdentity.supporterTrust+(s.finance.boardConfidence>60?1:-2)+(failures?-3:0),5,100);
 s.reputation=clamp(s.reputation+(s.coach.wins>(s.coach.losses||0)*1.4&&round%5===0?1:0)-(s.finance.debt>0&&round%4===0?1:0),1,100);
 // Debt always has a carrying cost, but does not generate negative cash values.
 if(round%4===0){
  const principal=(s.finance.debt||0)+(s.finance.loanBalance||0);
  const interest=Math.ceil(principal*.009);
  if(interest>0){s.finance.loanInterestPaid+=interest;
   const paid=Math.min(s.budget,interest);s.budget-=paid;
   const missing=interest-paid;s.finance.debt+=missing;
   s.finance.expenses+=interest;s.finance.ledger.unshift({day:s.day,label:'Juros de financiamento',amount:-interest});
  }
 }
 const installments=s.finance.transferPayables;
 for(const debt of installments){
  if(debt.remaining<=0||(debt.nextDay??debt.nextWeek)>s.day)continue;
  const due=Math.min(debt.remaining,debt.installment);
  if(s.budget<due){s.finance.debt+=due-s.budget;s.budget=0;}else s.budget-=due;
  s.finance.expenses+=due;s.finance.ledger.unshift({day:s.day,label:'Prestação da transferência de '+debt.player,amount:-due});
  if(debt.sellerId&&s.rivals[debt.sellerId])s.rivals[debt.sellerId].budget+=Math.round(due*.75);
  debt.remaining-=due;debt.nextDay=s.day+7;
 }
 s.finance.transferPayables=installments.filter(x=>x.remaining>0);
 s.world.financialHistory.unshift({season:s.season,round,budget:s.budget,debt:s.finance.debt,
  wageCost:s.players.reduce((n,p)=>n+(p.salary||0),0)/4,morale:s.clubIdentity.dressingRoom,reputation:s.reputation});
 s.world.financialHistory=s.world.financialHistory.slice(0,75);
}
export function createAnnualYouthIntake(s){
 ensureUniverse(s);
 if(s.world.lastYouthIntakeSeason===s.season)return;
 s.world.lastYouthIntakeSeason=s.season;
 const space=Math.max(0,6-s.academy.length),qty=Math.min(space,s.facilities.academy>=5?2:1);
 const random=rng(hash(s.club.name+':intake:'+s.season));
 for(let i=0;i<qty;i++){
  const p=generatePlayer(s.nextId++,positions[Math.floor(random()*positions.length)],random,45+s.facilities.academy+random()*6);
  p.age=15+Math.floor(random()*2);p.potential=clamp(p.potential+Math.round(random()*4),52,96);
  p.promises=[];
  s.academy.push(p);
  logNews(s,'Novo talento da formação',p.name+' entrou na academia do clube.','youth');
 }
}
function leagueRoster(s,division){
 const random=rng(hash(s.club.name+':inactive:'+division));
 const home=Object.values(s.world.divisionArchives?.[division]?.rivals||{});
 if(home.length===15)return home.map(c=>({name:c.name,power:Math.round(c.players.reduce((n,p)=>n+rating(p),0)/Math.max(1,c.players.length))}));
 const towns=['Viseu','Braga','Faro','Évora','Coimbra','Beja','Aveiro','Leiria','Porto','Tomar','Setúbal','Guarda','Bragança','Lamego','Portalegre','Viana'];
 return Array.from({length:16},(_,i)=>({name:['Sporting','União','Atlético','Real'][i%4]+' '+towns[(i+division*2)%16],power:Math.round(45+(9-division)*2+random()*23)}));
}
export function updateInactiveLeagues(s){
 ensureUniverse(s);
 const random=rng(hash(s.club.name+':world-tables:'+s.season));
 for(let division=1;division<=Math.max(4,s.division);division++){
  if(division===s.division)continue;
  const squads=leagueRoster(s,division);
  const standing=squads.map((team,i)=>({name:team.name,points:Math.max(10,Math.round((team.power-32)*1.15+random()*35)),id:i}));
  standing.sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
  s.world.inactiveLeagues[division]={division,season:s.season-1,champion:standing[0]?.name,
   standings:standing, promoted:standing.slice(0,2).map(x=>x.name),relegated:standing.slice(-2).map(x=>x.name)};
 }
}
export function archiveSeasonResults(s,rank){
 ensureUniverse(s);
 const rows=(s.results||[]).map(row=>({competition:row.type,round:row.round,
  opponent:row.result?.home===0?row.result?.awayName:row.result?.homeName,
  goalsFor:row.result?.home===0?row.result?.hg:row.result?.ag,
  goalsAgainst:row.result?.home===0?row.result?.ag:row.result?.hg}));
 s.world.careerRecords.unshift({season:s.season,division:s.division,rank,
  trophies:s.coach.trophies,results:rows,club:s.club.name});
 s.world.careerRecords=s.world.careerRecords.slice(0,24);
 updateInactiveLeagues(s);
}
export function universeAdvisor(s){
 ensureUniverse(s);
 const wages=s.players.reduce((n,p)=>n+(p.salary||0),0)/4;
 const future=s.finance.transferPayables.reduce((n,p)=>n+p.remaining,0);
 const deals=s.contractOffers.filter(o=>o.status==='counter').length;
 const highRisk=s.players.filter(p=>p.contract<=1&&(p.personality?.ambition||50)>60).length;
 return {wages:Math.ceil(wages),futurePayables:future,negotiations:deals,highRisk,
  netNextFourWeeks:Math.round((85000+({'Atlântico Energia':25000,'Norte Digital':38000,'Horizonte Global':52000}[s.club.sponsor]||25000)-
   wages-(s.facilities.stadium*4000+s.facilities.academy*1800+s.facilities.training*1300))*4-
   future-(s.finance.debt+s.finance.loanBalance)*.009),
  predictions:s.world.financialHistory.slice(0,8)};
}
