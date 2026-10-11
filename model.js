
export const SAVE_KEY='club-dynasty-v2';
export const OLD_KEY='club-dynasty-v1';
export const FORMATIONS={
 '4-3-3':['GK','DEF','DEF','DEF','DEF','MID','MID','MID','ATT','ATT','ATT'],
 '4-4-2':['GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','ATT','ATT'],
 '4-2-3-1':['GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','MID','ATT'],
 '3-5-2':['GK','DEF','DEF','DEF','MID','MID','MID','MID','MID','ATT','ATT'],
 '5-3-2':['GK','DEF','DEF','DEF','DEF','DEF','MID','MID','MID','ATT','ATT']
};
export const POSITIONS={GK:'Guarda-redes',DEF:'Defesa',MID:'Médio',ATT:'Avançado'};
export const COLORS=['#caf35b','#59cddc','#ffab63','#f27f9a','#ad8dff','#f0cd68','#f5f6fa','#67aafc'];
export const FACILITY_DATA={
 stadium:{name:'Estádio',base:140000,delta:2500,description:'Aumenta lotação e receita por jogo em casa'},
 academy:{name:'Academia',base:95000,delta:3,description:'Eleva o potencial e formação de juniores'},
 medical:{name:'Centro médico',base:110000,delta:3,description:'Melhora a recuperação e reduz ausências'},
 training:{name:'Centro de treino',base:125000,delta:2,description:'Aumenta os ganhos de treino'},
 commercial:{name:'Centro comercial',base:160000,delta:8,description:'Melhora patrocínio e venda de merchandising'},
 scouting:{name:'Observação',base:100000,delta:1,description:'Desbloqueia maior quantidade de atletas observados'}
};
export const MENTORS=[
 {id:'marques',name:'Artur Marques',type:'Ofensivo',bonus:'attack',description:'Melhora remates e movimentações ofensivas'},
 {id:'valente',name:'Raquel Valente',type:'Organização',bonus:'midfield',description:'Melhora circulação e controlo do meio-campo'},
 {id:'barreto',name:'Eduardo Barreto',type:'Defensivo',bonus:'defense',description:'Reforça posicionamento e organização defensiva'},
 {id:'lopes',name:'Sofia Lopes',type:'Preparação',bonus:'fitness',description:'Reduz fadiga e aumenta a recuperação'}
];
const FIRST=['João','Mateus','Tiago','Pedro','Rúben','Gonçalo','Diogo','Tomás','André','Daniel','Rafael','Henrique','Ricardo','Bruno','Lucas','Nuno','Gabriel','Vasco','Afonso','Duarte','Francisco','Martim','Leonardo','Alexandre','Hugo','Eduardo'];
const LAST=['Silva','Ramos','Mendes','Costa','Teixeira','Almeida','Pereira','Fernandes','Cardoso','Oliveira','Lopes','Ferreira','Santos','Correia','Sousa','Rocha','Moura','Nogueira','Gomes','Carvalho','Barros','Pires','Pinto','Coelho'];
const AI_CLUBS=[
 ['Atlético Lusitano','Lisboa'],['Sporting do Norte','Porto'],['Estrela do Douro','Vila Nova de Gaia'],['Académica do Sul','Faro'],['União Serrana','Covilhã'],['Real do Minho','Braga'],['Clube Alentejano','Évora'],['Marítimos do Oeste','Peniche'],['Olímpico do Tejo','Santarém'],['Vitória Atlântica','Setúbal'],['Nacional da Beira','Viseu'],['Leões da Serra','Guarda'],['Futebol Clube Aurora','Aveiro'],['Académico do Mondego','Coimbra'],['Estrela de Trás-os-Montes','Bragança']
];
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function rng(seed){let x=(seed>>>0)||892714;return function(){x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
export function hash(text){let h=2166136261;for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function rating(p){if(!p)return 0;const r=p.pos==='GK' ? p.gk*.67+p.def*.13+p.phy*.12+p.pas*.08:p.pos==='DEF'?p.def*.39+p.phy*.23+p.pac*.17+p.pas*.16+p.sho*.05:p.pos==='MID'?p.pas*.36+p.pac*.19+p.phy*.19+p.def*.13+p.sho*.13:p.sho*.42+p.pac*.25+p.pas*.16+p.phy*.12+p.def*.05;return clamp(Math.round(r),1,99);}
export const money=n=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);
export function generatePlayer(id,pos,random,quality=65){
 const name=FIRST[Math.floor(random()*FIRST.length)]+' '+LAST[Math.floor(random()*LAST.length)];
 const p={id,name,pos,age:18+Math.floor(random()*16),number:id%99+1,nation:['Portugal','Portugal','Portugal','Brasil','Espanha','França','Angola'][Math.floor(random()*7)],
 fitness:80+Math.round(random()*20),morale:76+Math.round(random()*24),potential:clamp(Math.round(quality+10+random()*17),50,99),
 pac:0,sho:0,pas:0,def:0,phy:0,gk:0,injury:0,cards:0,goals:0,assists:0,apps:0,cleanSheets:0,
 salary:0,contract:1+Math.ceil(random()*4),style:random()>.76?['Criador','Finalizador','Destruidor','Líder','Veloz'][Math.floor(random()*5)]:null,special:null,xp:0,classLevel:1};
 for(const k of ['pac','sho','pas','def','phy','gk'])p[k]=clamp(Math.round(quality-5+random()*14),15,96);
 if(pos==='GK'){p.gk=clamp(p.gk+12,30,99);p.sho=clamp(p.sho-35,5,95);p.pas-=7;}
 if(pos==='DEF'){p.def=clamp(p.def+12,20,99);p.sho=clamp(p.sho-18,5,95);p.phy=clamp(p.phy+5,20,99);}
 if(pos==='MID'){p.pas=clamp(p.pas+11,20,99);}
 if(pos==='ATT'){p.sho=clamp(p.sho+12,20,99);p.def=clamp(p.def-19,5,95);p.pac=clamp(p.pac+6,20,99);}
 p.salary=Math.round((900+rating(p)*rating(p)*2.7)/100)*100;
 return p;
}

const RIVAL_SCHEMES=['4-3-3','4-4-2','4-2-3-1','3-5-2','5-3-2'];
export function makeRivals(state){
 const random=rng(hash(state.club.name+'-rival-'+state.season));
 const roles=['GK','GK','DEF','DEF','DEF','DEF','DEF','DEF','MID','MID','MID','MID','MID','MID','ATT','ATT','ATT','ATT'];
 const rivals={};
 for(const t of state.league.teams.filter(x=>x.id!==0)){
  const philosophy=['ofensiva','equilibrada','defensiva'][Math.floor(random()*3)];
  const formation=RIVAL_SCHEMES[Math.floor(random()*RIVAL_SCHEMES.length)];
  const players=roles.map((role,i)=>generatePlayer(10000+t.id*100+i,role,random,clamp(t.power-7+random()*13,42,92)));
  const pool=players.slice().sort((a,b)=>rating(b)-rating(a));
  const lineup=FORMATIONS[formation].map(pos=>{let i=pool.findIndex(p=>p.pos===pos);if(i<0)i=0;return pool.splice(i,1)[0]?.id;});
  rivals[t.id]={id:t.id,name:t.name,formation,players,lineup,
   tactics:{mentality:philosophy,pressure:random()<.4?'alta':'media',passing:['curto','misto','longo'][Math.floor(random()*3)],tempo:['normal','rapido','lento'][Math.floor(random()*3)],marking:'zona'},
   manager:{name:'Treinador '+t.city,style:philosophy,adaptability:.2+random()*.7},
   budget:300000+Math.floor(random()*1600000),fans:3000+Math.floor(random()*15000),morale:75,form:0,wages:0,history:[],activity:[]};
 }
 return rivals;
}
export function rivalTick(state,round){
 if(!state.rivals)return;
 const random=rng(hash(state.club.name+':rival:'+state.season+':'+round));
 for(const club of Object.values(state.rivals)){
  const match=state.league.rounds[round-1]?.find(f=>f.home===club.id||f.away===club.id);
  if(!match)continue;
  const own=match.home===club.id?match.hg:match.ag,opp=match.home===club.id?match.ag:match.hg;
  const win=own>opp,draw=own===opp;club.form=clamp((club.form||0)+(win?2:draw?0:-2),-12,12);
  club.morale=clamp((club.morale||75)+(win?4:draw?1:-4),20,100);
  club.budget=clamp((club.budget||0)+(match.home===club.id?club.fans*11:0)+(win?23000:draw?7000:0)-Math.ceil(club.players.reduce((n,p)=>n+(p.salary||0),0)/4),0,150000000);
  club.history.unshift({season:state.season,round,own,opp});club.history=club.history.slice(0,12);
  club.players.forEach(p=>{p.fitness=clamp(p.fitness+(club.morale>=75?3:1),24,100);if(p.injury>0)p.injury--;});
  if(round%4===0){
   if(random()<club.manager.adaptability){
    club.tactics.mentality=club.form<0?'defensiva':club.form>3?'ofensiva':'equilibrada';
    club.tactics.pressure=club.form<0?'media':'alta';
   }
   const worst=club.players.slice().sort((a,b)=>rating(a)-rating(b))[0];
   if(worst&&club.budget>150000&&random()<.45){
    const recruit=generatePlayer(10000+club.id*100+18+round,worst.pos,random,50+random()*25);
    club.players=club.players.filter(x=>x.id!==worst.id).concat(recruit);
    club.budget-=110000;
   }
   const pool=club.players.slice().sort((a,b)=>rating(b)-rating(a));
   club.lineup=FORMATIONS[club.formation].map(pos=>{let i=pool.findIndex(p=>p.pos===pos);if(i<0)i=0;return pool.splice(i,1)[0]?.id;});
  }
 }
}

export function getPlayer(state,id){return state.players.find(p=>p.id===Number(id));}
export function autoLineup(state,form=state.formation){
 const pool=state.players.filter(p=>(p.injury||0)<=0&&(p.contract??1)>0&&(p.suspendedUntilWeek||0)<state.week).slice().sort((a,b)=>rating(b)-rating(a));
 return FORMATIONS[form].map(pos=>{
  let idx=pool.findIndex(p=>p.pos===pos);if(idx<0)idx=0;const p=pool.splice(idx,1)[0];return p?.id||null;
 });
}
export function teamPower(state,teamId,forGame=true){
 if(teamId!==0){
  const rival=state.rivals?.[teamId];
  if(rival?.players?.length){
   const roster=rival.lineup.map(id=>rival.players.find(p=>p.id===id)).filter(Boolean);
   const val=roster.reduce((n,p)=>n+rating(p)*(.83+p.fitness/590),0)/Math.max(roster.length,1);
   return clamp(Math.round((val+(rival.form||0)*.3+(rival.morale-75)*.08)*10)/10,35,98);
  }
  const team=state.league.teams.find(t=>t.id===teamId);return team?team.power:65;
 }
 const lineup=state.lineups[state.formation]||[];
 const avg=lineup.reduce((sum,id,index)=>{
  const p=getPlayer(state,id);if(!p)return sum+20;
  const wrong=p.pos!==FORMATIONS[state.formation][index]?-12:0;
  const physical=forGame?(p.fitness-80)*.18+(p.morale-75)*.08-(p.injury>0?28:0):0;
  return sum+rating(p)+wrong+physical;
 },0)/11;
 return Math.round(avg*10)/10;
}
export function makeLeague(name,season=1,seed=1,division=1){
 const random=rng(hash(name)+season*331+seed);
 const teams=[{id:0,name,city:'',power:0}];
 AI_CLUBS.forEach(([n,city],i)=>teams.push({id:i+1,name:n,city,power:clamp(Math.round(53+random()*20+(division-1)*3+season*.3),40,95)}));
 const order=teams.map(t=>t.id),rounds=[];
 for(let round=0;round<15;round++){
  const items=[];
  for(let j=0;j<8;j++){let home=order[j],away=order[15-j];if((round+j)%2) [home,away]=[away,home];items.push({id:round*8+j,round:round+1,home,away,hg:null,ag:null,played:false,events:null});}
  rounds.push(items);
  order.splice(1,0,order.pop());
 }
 for(let r=0;r<15;r++){rounds.push(rounds[r].map((f,i)=>({id:(r+15)*8+i,round:r+16,home:f.away,away:f.home,hg:null,ag:null,played:false,events:null})));}
 return {teams,rounds,round:1,completed:false,champion:null};
}
export function makeCup(state){
 const random=rng(hash(state.club.name)+state.season*709);
 const entrants=state.league.teams.map(t=>t.id);
 for(let i=entrants.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
 return {stage:0,participants:entrants,results:[],winner:null,completed:false};
}
export function makeMarket(state,seed){
 const random=rng(seed),count=7+state.facilities.scouting;
 const idBase=state.nextId;state.nextId+=count;
 return Array.from({length:count},(_,i)=>{
  const positions=['GK','DEF','DEF','MID','MID','ATT','ATT'];
  const p=generatePlayer(idBase+i,positions[i%positions.length],random,60+random()*26);
  p.ask=Math.round((rating(p)**3*3+100000)/10000)*10000;
  p.expires=state.day+2+Math.ceil(random()*3);
  p.bids=0;
  return p;
 });
}
export function standings(state){
 const table=state.league.teams.map(t=>({id:t.id,name:t.name,gp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
 state.league.rounds.flat().filter(f=>f.played).forEach(f=>{
  const a=table.find(x=>x.id===f.home),b=table.find(x=>x.id===f.away);
  if(!a||!b)return;a.gp++;b.gp++;a.gf+=f.hg;a.ga+=f.ag;b.gf+=f.ag;b.ga+=f.hg;
  if(f.hg>f.ag){a.w++;a.pts+=3;b.l++;}else if(f.ag>f.hg){b.w++;b.pts+=3;a.l++;}else{a.d++;b.d++;a.pts++;b.pts++;}
 });
 return table.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.id-b.id);
}
export function log(state,title,detail){state.activity.unshift({title,detail,day:state.day});state.activity=state.activity.slice(0,65);}
export function makeState(name='Atlético Aurora',city='Lisboa',color=COLORS[0]){
 const random=rng(hash(name+' / '+city));
 const pool=['GK','GK','GK',...Array(8).fill('DEF'),...Array(9).fill('MID'),...Array(6).fill('ATT')];
 const players=pool.map((pos,i)=>generatePlayer(i+1,pos,random,54+random()*18));
 const state={version:2,engineVersion:3,club:{name,city,color,baseColor:color,stadium:'Arena '+city,capacity:12500,kitAway:'#f5f6fa',sponsor:'Atlântico Energia',stadiumName:'Arena '+city},
 players,formation:'4-3-3',lineups:{},tactics:{mentality:'equilibrada',pressure:'media',passing:'misto',tempo:'normal',marking:'zona',halftimePlan:'auto'},
 budget:1850000,tokens:22,rest:3,moraleBoosts:2,medical:2,fans:8420,day:1,week:1,season:1,division:1,trainingCount:0,trainingTotal:0,
 league:null,cup:null,market:[],nextId:1000,history:[],results:[],lastMatch:null,fixtureCamera:'2d',
 facilities:{stadium:1,academy:1,medical:1,training:1,commercial:1,scouting:1},academy:[],academySlots:3,
 mentors:[],mentorActive:null,mentorOffers:MENTORS.map(x=>x.id),
 finance:{income:0,expenses:0,ledger:[],debt:0,unpaidWages:0,boardConfidence:75,sponsorTerm:1,stadiumTickets:18,tvContract:'regular'},
 coach:{name:'Treinador',level:1,xp:0,wins:0,draws:0,losses:0,trophies:0,achievements:[],skills:[]},
 quests:[],rewards:{lastDay:0,streak:0},inventory:{kits:['principal'],badges:['padrão'],activeKit:'principal',cards:[],duplicates:0},
 events:{daily:[],weekly:[],lastRefresh:0},friends:[],confederation:null,social:{online:false},
 activity:[{title:'Clube fundado!',detail:'Prepara o onze e disputa a primeira jornada.',day:1}],
 matchPlaying:false,restDaysThisWeek:0,friendliesThisWeek:0,gameNonce:0,rivals:{},seasonEvents:[],matchOrders:{},boardObjectives:{target:10,confidence:75},lastClaimRound:0};
 state.lineups['4-3-3']=autoLineup(state);
 state.league=makeLeague(name,1,hash(name));
 state.rivals=makeRivals(state);
 state.cup=makeCup(state);
 state.market=makeMarket(state,hash(name)+552);
 state.academy=Array.from({length:4},(_,i)=>{const p=generatePlayer(5000+i,['GK','DEF','MID','ATT'][i],random,43+random()*10);p.age=i===0?17:15+Math.floor(random()*4);p.potential=clamp(p.potential+10,65,99);return p;});
 state.events={daily:[{id:'train',text:'Realizar um treino',target:1,progress:0,reward:7000,claimed:false},{id:'match',text:'Disputar uma partida',target:1,progress:0,reward:10000,claimed:false}],weekly:[{id:'win',text:'Vencer 2 partidas',target:2,progress:0,reward:1,kind:'token',claimed:false}],lastRefresh:1};
 return state;
}
export function migrate(saved){
 if(!saved||!saved.club||!Array.isArray(saved.players))return null;
 if(saved.version===2){
  const base=makeState(saved.club.name,saved.club.city,saved.club.color);
  const state={...base,...saved,club:{...base.club,...saved.club},tactics:{...base.tactics,...saved.tactics},facilities:{...base.facilities,...saved.facilities},coach:{...base.coach,...saved.coach},finance:{...base.finance,...saved.finance},inventory:{...base.inventory,...saved.inventory},events:{...base.events,...saved.events}};
  state.rivals=(saved.rivals&&Object.keys(saved.rivals).length)?saved.rivals:makeRivals(state);
  state.engineVersion=3;
  const seen=new Set(state.players.map(p=>p.id));
  state.market=(state.market||[]).filter(o=>o&&Number.isFinite(o.id));
  const observed=new Set(seen);
  let next=Math.max(1000,state.nextId||1000,...state.players.map(p=>p.id+1));
  for(const offer of state.market){if(observed.has(offer.id))offer.id=next++;observed.add(offer.id);next=Math.max(next,offer.id+1);}
  state.nextId=next;
  for(const p of state.players){if(p.contract===undefined)p.contract=3;if(p.injury===undefined)p.injury=0;if(!Number.isFinite(p.xp))p.xp=0;}
  state.club.baseColor ||= state.club.color;

  if(!state.league?.rounds?.length)state.league=makeLeague(state.club.name,state.season);
  if(!state.cup?.participants)state.cup=makeCup(state);
  if(!Array.isArray(state.market))state.market=[];
  return state;
 }
 if(saved.version===1){
  const base=makeState(saved.club.name,saved.club.city,saved.club.color);
  base.players=saved.players.map(p=>({...generatePlayer(p.id,p.pos,rng(hash(p.name)),65),...p,
    injury:0,cards:0,goals:0,assists:0,apps:0,cleanSheets:0,contract:3,
    salary:Math.round((900+rating(p)**2*2.7)/100)*100,style:null,special:null,xp:0,classLevel:1}));
  base.formation=saved.formation||'4-3-3';
  base.lineups=saved.lineups||{};
  if(!base.lineups[base.formation])base.lineups[base.formation]=autoLineup(base);
  base.day=saved.day||1;base.budget=saved.budget??base.budget;
  base.fans=saved.fans||base.fans;base.trainingTotal=saved.trainingTotal||0;
  base.trainingCount=saved.trainingCount||0;base.activity=[...saved.activity||[],...base.activity].slice(0,65);
  base.club={...base.club,...saved.club};base.club.baseColor ||= base.club.color;
  log(base,'Progresso importado','Os jogadores, dias, treinos e orçamento foram preservados da versão anterior.');
  return base;
 }
 return null;
}
export function loadState(storage=localStorage){
 try{
  const v2=JSON.parse(storage.getItem(SAVE_KEY)||'null');
  if(v2){const migrated=migrate(v2);if(migrated)return migrated;}
  const v1=JSON.parse(storage.getItem(OLD_KEY)||'null');
  return migrate(v1);
 }catch(err){return null;}
}
export function saveState(state,storage=localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch(err){return false;}}
export function fixtureName(state,id){return state.league.teams.find(t=>t.id===id)?.name||'Clube desconhecido';}
export function nextFixture(state){return state.league.rounds.flat().find(f=>!f.played&&(f.home===0||f.away===0))||null;}
export function pendingRound(state){return state.league.rounds.find(x=>x.some(f=>!f.played))||null;}
export function captain(state){return state.players.find(p=>p.id===state.lineups[state.formation]?.[0])||state.players[0];}
