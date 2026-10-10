// VIDA NOVA — deterministic, testable life simulation. No DOM or external dependencies.
export const VERSION = 1;
export const MAX_AGE = 115;
export const FIRST_NAMES = ['Leonor','Matilde','Inês','Beatriz','Mariana','Sofia','Lara','Eva','Tiago','Miguel','Diogo','Tomás','Afonso','Guilherme','Rafael','Martim'];
export const LAST_NAMES = ['Silva','Santos','Ferreira','Pereira','Costa','Oliveira','Rodrigues','Martins','Sousa','Carvalho'];
export const COLORS = ['rose','blue','gold','mint','lilac','coral'];
export const CAREERS = [
  {id:'cafe',name:'Funcionário de café',salary:10800,minAge:16,minIQ:0,education:'none',icon:'☕',prestige:1},
  {id:'retalho',name:'Assistente de loja',salary:13800,minAge:18,minIQ:0,education:'none',icon:'🛍️',prestige:2},
  {id:'cozinha',name:'Cozinheiro',salary:17000,minAge:18,minIQ:30,education:'none',icon:'🍳',prestige:2},
  {id:'oficina',name:'Mecânico',salary:22000,minAge:18,minIQ:36,education:'none',icon:'🔧',prestige:3},
  {id:'design',name:'Designer gráfico',salary:28000,minAge:18,minIQ:62,education:'none',icon:'🎨',prestige:4},
  {id:'software',name:'Programador',salary:38000,minAge:18,minIQ:70,education:'university',icon:'💻',prestige:5},
  {id:'medicina',name:'Médico',salary:63000,minAge:24,minIQ:83,education:'university',icon:'🩺',prestige:8},
  {id:'direito',name:'Advogado',salary:51000,minAge:22,minIQ:78,education:'university',icon:'⚖️',prestige:7}
];
export const JOBS = CAREERS;
export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
export function pseudo(seed){let a=(seed|0)>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function money(n){return Math.round(n).toLocaleString('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0});}
export function schoolName(age){return age<3?'Primeiros anos':age<6?'Infância':age<10?'Ensino básico':age<13?'2.º ciclo':age<16?'3.º ciclo':age<19?'Ensino secundário':'Vida adulta';}
export function makePerson({first='Leonor',last='Silva',gender='Mulher',country='Portugal',color='rose'}={}){
  const chosenFirst=String(first).trim().slice(0,24).replace(/[<>]/g,'')||'Leonor';
  const chosenLast=String(last).trim().slice(0,24).replace(/[<>]/g,'')||'Silva';
  const seed=Math.floor(Math.random()*0x7fffffff)+1;
  const r=pseudo(seed);
  const stats={health:Math.round(76+r()*22),happiness:Math.round(66+r()*25),intelligence:Math.round(35+r()*47),charisma:Math.round(34+r()*46),stress:0};
  const person={v:VERSION,seed,rng:seed,first:chosenFirst,last:chosenLast,gender,country,color:COLORS.includes(color)?color:'rose',age:0,alive:true,year:2026,
    stats,cash:0,savings:0,investments:0,home:null,car:null,job:null,jobYears:0,education:'none',universityYears:0,universityCourse:null,
    partner:null,married:false,children:0,friends:0,family:76,karma:55,criminal:0,prison:0,illness:0,lifeScore:0,actions:[],events:[],pending:null,achievements:[],habits:{},lastChoice:null};
  addEvent(person,'🎀','Bem-vindo ao mundo!',chosenFirst+' '+chosenLast+' nasceu em '+country+'. Uma história inteira espera por ti.','birth');
  return person;
}
function rand(person){person.rng=(Math.imul((person.rng|0),1664525)+1013904223)>>>0;return person.rng/4294967296;}
function roll(person,p){return rand(person)<p;}
const pick=(person,items)=>items[Math.floor(rand(person)*items.length)];
export function addEvent(p,icon,title,detail,type='story'){
  const e={id:(p.events[0]?.id||0)+1,age:p.age,year:p.year,icon,title,detail,type};
  p.events.unshift(e);p.events=p.events.slice(0,220);return e;
}
function change(p,delta={}){for(const [k,n]of Object.entries(delta)){if(k in p.stats)p.stats[k]=clamp(p.stats[k]+n);else if(k==='family')p.family=clamp(p.family+n);else if(k==='karma')p.karma=clamp(p.karma+n);else if(k==='cash')p.cash=Math.round(p.cash+n);else if(k==='friends')p.friends=Math.max(0,p.friends+n);}}
function badge(p,id,label){if(p.achievements.includes(id))return;p.achievements.push(id);addEvent(p,'🏆','Conquista desbloqueada',label,'achievement');}
export function getNetWorth(p){return Math.round(p.cash+p.savings+p.investments+(p.home?.value||0)+(p.car?.value||0));}
export function annualExpenses(p){if(p.age<18)return 0;const base=p.home?7200:9000;return base+((p.children||0)*2800)+(p.car?1700:0)+(p.universityYears>0?1500:0);}
export function annualIncome(p){if(p.prison>0)return 0;const career=CAREERS.find(j=>j.id===p.job);if(!career)return 0;return Math.round(career.salary*(1+Math.min(p.jobYears,26)*.032)*(1+Math.min(100,p.stats.intelligence)*.0015));}
export function rate(p){let score=100*p.age+Math.round(getNetWorth(p)/350)+p.stats.health*3+p.stats.happiness*3+p.stats.intelligence*3+p.karma*2+p.children*280+p.friends*65+p.achievements.length*550;return Math.max(0,score);}
function canAct(p,id){return !p.habits[id] || p.habits[id]!==p.age;}
function used(p,id){p.habits[id]=p.age;}
export function activities(p){
  if(!p.alive)return [];
  const a=[
    {id:'read',title:'Ler um livro',desc:'+ Inteligência e cultura',icon:'📚',section:'self',minAge:6,cost:0},
    {id:'exercise',title:'Fazer exercício',desc:'+ Saúde, menos stress',icon:'🏃',section:'self',minAge:5,cost:0},
    {id:'friends',title:'Sair com amigos',desc:'+ Felicidade e vida social',icon:'🪩',section:'social',minAge:10,cost:75},
    {id:'family',title:'Estar com a família',desc:'Melhora laços familiares',icon:'🏡',section:'social',minAge:2,cost:0},
    {id:'therapy',title:'Ir à terapia',desc:'Reduz ansiedade e stress',icon:'🧠',section:'self',minAge:15,cost:160},
    {id:'doctor',title:'Ir ao médico',desc:'Trata a saúde e doenças',icon:'🩺',section:'self',minAge:3,cost:150},
    {id:'study',title:'Estudar com afinco',desc:'+ Inteligência e oportunidades',icon:'🎓',section:'career',minAge:6,maxAge:24,cost:0},
    {id:'side',title:'Trabalho ocasional',desc:'Ganha dinheiro extra',icon:'💼',section:'career',minAge:16,cost:0},
    {id:'work',title:'Dar tudo no trabalho',desc:'Melhora desempenho e salário',icon:'🚀',section:'career',minAge:16,cost:0,requireJob:true},
    {id:'love',title:'Conhecer alguém',desc:'Talvez comece uma história',icon:'💕',section:'social',minAge:16,cost:20,requireSingle:true},
    {id:'date',title:'Encontro romântico',desc:'Aprofunda a relação',icon:'💐',section:'social',minAge:16,cost:120,requirePartner:true},
    {id:'marry',title:'Pedir em casamento',desc:'Um passo importante',icon:'💍',section:'social',minAge:18,cost:3000,requirePartner:true,notMarried:true},
    {id:'baby',title:'Ter um filho',desc:'A família pode crescer',icon:'🍼',section:'social',minAge:18,maxAge:50,cost:1500,requirePartner:true},
    {id:'university',title:'Entrar na universidade',desc:'Licenciatura de 3 anos',icon:'🏛️',section:'career',minAge:18,maxAge:40,cost:1800,requireNoDegree:true},
    {id:'raise',title:'Pedir aumento',desc:'Negociar com o empregador',icon:'📈',section:'career',minAge:18,cost:0,requireJob:true},
    {id:'vacation',title:'Fazer férias',desc:'Descontrair e criar memórias',icon:'🏖️',section:'self',minAge:18,cost:1700},
    {id:'save',title:'Pôr 500 € de parte',desc:'Constrói uma reserva',icon:'🏦',section:'finance',minAge:18,cost:500},
    {id:'invest',title:'Investir 1 000 €',desc:'Aplicação de longo prazo',icon:'📊',section:'finance',minAge:18,cost:1000},
    {id:'withdraw',title:'Resgatar investimentos',desc:'Vende a carteira financeira',icon:'💶',section:'finance',minAge:18,cost:0,requireInvestment:true},
    {id:'buycar',title:'Comprar um automóvel',desc:'Mobilidade e despesas anuais',icon:'🚗',section:'finance',minAge:18,cost:12000,requireNoCar:true},
    {id:'buyhome',title:'Comprar uma casa',desc:'Um lugar para chamar teu',icon:'🏠',section:'finance',minAge:18,cost:90000,requireNoHome:true},
    {id:'sellhome',title:'Vender a casa',desc:'Liquida o património',icon:'🔑',section:'finance',minAge:18,cost:0,requireHome:true},
    {id:'quit',title:'Despedir-me',desc:'Abrir espaço para outro caminho',icon:'🚪',section:'career',minAge:16,cost:0,requireJob:true}
  ];
  return a.filter(x=>p.age>=x.minAge&&(x.maxAge==null||p.age<=x.maxAge)&&(!x.requireJob||p.job)&&(!x.requireSingle||!p.partner)&&(!x.requirePartner||p.partner)&&(!x.notMarried||!p.married)&&(!x.requireNoDegree||p.education!=='university'&&p.universityYears===0)&&(!x.requireInvestment||p.investments>0)&&(!x.requireNoCar||!p.car)&&(!x.requireNoHome||!p.home)&&(!x.requireHome||p.home)).map(x=>({...x,used:!canAct(p,x.id)}));
}
export function act(p,id){
  if(!p.alive||p.pending||p.prison>0)return {ok:false,msg:p.pending?'Decide primeiro o acontecimento.':'Esta ação não está disponível.'};
  const item=activities(p).find(a=>a.id===id);if(!item)return {ok:false,msg:'Ação indisponível nesta fase da vida.'};
  if(!canAct(p,id))return {ok:false,msg:'Já fizeste isto este ano. Avança um ano para repetir.'};
  if(item.cost>p.cash)return {ok:false,msg:'Não tens dinheiro suficiente para esta atividade.'};
  p.cash-=item.cost;used(p,id);let icon=item.icon,title=item.title,detail='';
  switch(id){
    case 'read':change(p,{intelligence:4,happiness:1});detail='Novos mundos abriram-se na tua imaginação.';break;
    case 'exercise':change(p,{health:6,happiness:3,stress:-8});detail='Sentiste-te mais forte e com a cabeça leve.';break;
    case 'friends':change(p,{happiness:9,charisma:4,stress:-5,friends:1});detail='Uma noite cheia de histórias para contar.';break;
    case 'family':change(p,{family:12,happiness:7,stress:-3});detail='Passaste tempo de qualidade com as pessoas de quem gostas.';break;
    case 'therapy':change(p,{stress:-22,happiness:8,health:2});detail='Pedir ajuda fez-te bem.';break;
    case 'doctor':change(p,{health:17,stress:-3});p.illness=Math.max(0,p.illness-1);detail='Recebeste acompanhamento médico.';break;
    case 'study':change(p,{intelligence:7,stress:2});detail='Esforço consistente dá resultado.';break;
    case 'side':{const n=250+Math.round(rand(p)*750);change(p,{cash:n,stress:4,health:-1});detail='Fizeste uns trabalhos extra e ganhaste '+money(n)+'.';break;}
    case 'work':change(p,{intelligence:2,stress:10,karma:2});if(roll(p,.22)){const bonus=Math.round(annualIncome(p)*.05);p.cash+=bonus;detail='O teu esforço deu um prémio de '+money(bonus)+'.';}else detail='O teu chefe reparou no teu empenho.';break;
    case 'love':{const people=['Alex','Joana','Gabriel','Marta','Rita','Daniel','Catarina','Santiago','Nina','Bruno'];p.partner={name:pick(p,people),bond:55};change(p,{happiness:13,charisma:3});detail='Conheceste '+p.partner.name+'. Talvez venha aí algo especial.';badge(p,'first-love','O primeiro romance');break;}
    case 'date':p.partner.bond=clamp(p.partner.bond+16);change(p,{happiness:11,stress:-5});detail='Uma tarde memorável com '+p.partner.name+'.';break;
    case 'marry':{if(p.partner.bond<60){p.cash+=item.cost;delete p.habits[id];return {ok:false,msg:'Fortalece primeiro a relação antes de dar este passo.'};}p.married=true;change(p,{happiness:16,karma:5});detail='Disseste “sim” a '+p.partner.name+'!';badge(p,'marriage','Uma nova aliança para a vida');break;}
    case 'baby':p.children++;change(p,{happiness:12,stress:9});detail='A tua família cresceu. Agora tens '+p.children+' filho(s).';badge(p,'parent','O início de uma nova geração');break;
    case 'university':{if(p.education==='university'){p.cash+=item.cost;delete p.habits[id];return {ok:false,msg:'Já tens uma licenciatura.'};}p.universityYears=3;p.universityCourse='Curso superior';change(p,{intelligence:6,stress:8});detail='Começaste a tua licenciatura. Restam 3 anos.';break;}
    case 'raise':{const success=clamp((p.stats.intelligence+p.karma)/220+.12,0.15,.78);if(roll(p,success)){p.jobYears+=2;change(p,{happiness:8});detail='Conseguiste um aumento salarial!';}else{change(p,{stress:8,happiness:-5});detail='Desta vez a chefia disse que não.';}break;}
    case 'vacation':change(p,{happiness:20,stress:-22,health:4});detail='Uma viagem inesquecível para recarregar energias.';break;
    case 'save':p.savings+=500;detail='Mais 500 € na tua poupança.';break;
    case 'invest':p.investments+=1000;detail='Investiste 1 000 €. O valor vai oscilar ao longo dos anos.';break;
    case 'withdraw':{const amount=p.investments;p.investments=0;p.cash+=amount;detail='Recebeste '+money(amount)+' da venda da carteira.';break;}
    case 'buycar':p.car={name:'Citadino',value:12000};change(p,{happiness:8});detail='Compraste o teu primeiro automóvel.';badge(p,'car','Primeiro carro');break;
    case 'buyhome':p.home={name:'Casa própria',value:90000};change(p,{happiness:15});detail='Tens finalmente uma casa em teu nome.';badge(p,'house','Um teto para chamar teu');break;
    case 'sellhome':{const value=p.home.value;p.cash+=value;p.home=null;detail='Vendeste a tua casa por '+money(value)+'.';break;}
    case 'quit':p.job=null;p.jobYears=0;change(p,{happiness:3,stress:-15});detail='Fechaste um capítulo da tua carreira.';break;
    default:return {ok:false,msg:'Ação desconhecida.'};
  }
  addEvent(p,icon,title,detail,'action');p.lifeScore=rate(p);return {ok:true,msg:detail};
}
export function availableJobs(p){return CAREERS.map(j=>({...j,qualified:p.alive&&p.age>=j.minAge&&p.stats.intelligence>=j.minIQ&&(j.education!=='university'||p.education==='university')&&p.prison===0}));}
export function applyJob(p,id){
  if(!p.alive||p.pending)return {ok:false,msg:'Resolve primeiro o acontecimento atual.'};
  const job=availableJobs(p).find(j=>j.id===id);if(!job||!job.qualified)return {ok:false,msg:'Ainda não reúnes os requisitos para esta profissão.'};
  if(p.job===id)return {ok:false,msg:'Já trabalhas nesta profissão.'};
  p.job=id;p.jobYears=0;change(p,{happiness:5,stress:4});addEvent(p,job.icon,'Novo emprego','Começaste a trabalhar como '+job.name+'. Salário base: '+money(job.salary)+'/ano.','career');if(!p.achievements.includes('first-job'))badge(p,'first-job','Primeiro contrato de trabalho');p.lifeScore=rate(p);return {ok:true,msg:'Parabéns pelo novo emprego!'};
}
const INCIDENTS=[
  {id:'found',min:5,max:95,icon:'💌',title:'Uma surpresa na rua',text:'Encontraste uma carteira com dinheiro e documentos. O que fazes?',options:[{label:'Entregar à polícia',effect:{karma:12,happiness:5},text:'Fizeste a coisa certa. A pessoa agradeceu-te.'},{label:'Ficar com o dinheiro',effect:{cash:230,karma:-15,stress:8},text:'Ficaste com o dinheiro, mas não te sentes completamente bem.'}]},
  {id:'exam',min:7,max:22,icon:'📝',title:'Um teste difícil',text:'Tens um teste importante e pouco tempo para estudar.',options:[{label:'Estudar a noite toda',effect:{intelligence:8,stress:12},text:'Deste tudo de ti e aprendeste bastante.'},{label:'Descansar e confiar',effect:{happiness:6,intelligence:-2},text:'Ficaste descansado, mesmo sem saber tudo.'}]},
  {id:'volunteer',min:13,max:94,icon:'🌿',title:'Um convite solidário',text:'Uma associação local precisa de voluntários este fim de semana.',options:[{label:'Dar uma ajuda',effect:{karma:10,happiness:6,stress:2},text:'Ajudar a comunidade fez-te sentir realizado.'},{label:'Ficar em casa',effect:{stress:-4,happiness:1},text:'Aproveitaste para descansar.'}]},
  {id:'promotion',min:18,max:72,requireJob:true,icon:'📣',title:'Uma oportunidade de destaque',text:'O teu responsável convida-te a liderar um projeto.',options:[{label:'Aceitar o desafio',effect:{intelligence:5,stress:12},bonusJob:2,text:'O esforço deu frutos e abriu-te portas.'},{label:'Proteger o teu tempo',effect:{stress:-10,happiness:5},text:'Definiste limites saudáveis.'}]},
  {id:'health',min:14,max:110,icon:'❤️‍🩹',title:'Um aviso do corpo',text:'Tens-te sentido cansado nos últimos tempos. O que decides?',options:[{label:'Marcar uma consulta',effect:{health:10,cash:-120,stress:-8},text:'Foste acompanhado e recuperaste forças.'},{label:'Ignorar por agora',effect:{health:-14,stress:8},text:'A saúde ressentiu-se.'}]},
  {id:'friendship',min:10,max:100,icon:'🤝',title:'Amizade em jogo',text:'Um amigo pede apoio durante uma fase complicada.',options:[{label:'Estar presente',effect:{friends:1,karma:5,happiness:6},text:'A amizade ficou mais forte.'},{label:'Não me envolver',effect:{friends:-1,stress:-2},text:'Escolheste manter alguma distância.'}]},
  {id:'windfall',min:20,max:100,icon:'🎁',title:'Uma herança inesperada',text:'Um familiar distante deixou-te uma pequena quantia.',options:[{label:'Guardar o dinheiro',effect:{savings:3000,happiness:6},text:'Reforçaste a tua poupança.'},{label:'Aproveitar a vida',effect:{cash:2500,happiness:16},text:'O dinheiro trouxe experiências novas.'}]},
  {id:'studyabroad',min:16,max:35,icon:'✈️',title:'Uma viagem de última hora',text:'Surgiu uma oportunidade para conhecer outro país.',options:[{label:'Ir à aventura',effect:{cash:-800,happiness:17,intelligence:5},text:'Voltaste com o coração cheio de histórias.'},{label:'Permanecer por cá',effect:{family:7,stress:-4},text:'Decidiste passar tempo com quem mais importa.'}]}
];
export function choose(p,index){
  if(!p.pending||!p.alive)return {ok:false,msg:'Não há decisão pendente.'};
  const choice=p.pending.options[index];if(!choice)return {ok:false,msg:'Escolha inválida.'};
  const eff={...choice.effect};if('savings'in eff){p.savings+=eff.savings;delete eff.savings;}if('cash'in eff&&p.cash+eff.cash<0)eff.cash=-p.cash;
  change(p,eff);if(choice.bonusJob&&p.job)p.jobYears+=choice.bonusJob;
  const incident=p.pending;p.pending=null;p.lastChoice={age:p.age,text:choice.text};addEvent(p,incident.icon,incident.title,choice.text,'choice');p.lifeScore=rate(p);
  return {ok:true,msg:choice.text};
}
function updateMortality(p){
  if(p.age<48)return false;
  const risk=p.age>=100?.40:p.age>=90?.16:p.age>=80?.06:p.age>=70?.022:p.age>=60?.007:.002;
  const healthFactor=(100-p.stats.health)/600;
  return p.age>=MAX_AGE||roll(p,risk+healthFactor);
}
export function advance(p){
  if(!p.alive)return {ok:false,msg:'Esta vida terminou. Começa uma nova.'};
  if(p.pending)return {ok:false,msg:'Tens uma decisão por tomar.'};
  p.age+=1;p.year+=1;p.habits={};
  const isAdult=p.age>=18;
  p.stats.stress=clamp(p.stats.stress-3);
  if(p.age>45)change(p,{health:-Math.ceil((p.age-43)/18)});
  if(p.age>65)change(p,{health:-2});
  if(p.age<18){if(roll(p,.48))change(p,{intelligence:2});if(roll(p,.3))change(p,{happiness:2});}
  if(p.age===6)addEvent(p,'🎒','Primeiro dia de escola','Começaste o ensino básico. Um mundo de descobertas!','milestone');
  if(p.age===13)addEvent(p,'🧑‍🎓','Adolescência','Novas ideias, amizades e desafios começam a surgir.','milestone');
  if(p.age===18){addEvent(p,'🎉','Chegaste à maioridade','Agora podes trabalhar, estudar na universidade e gerir o teu dinheiro.','milestone');badge(p,'adult','18 anos e todo um futuro pela frente');}
  if(p.age===21)badge(p,'twentyone','A vida adulta está a ganhar forma');
  if(p.age===30)badge(p,'thirty','Três décadas de histórias');
  if(p.age===50)badge(p,'fifty','Meio século de vida');
  if(p.age===80)badge(p,'eighty','Oito décadas extraordinárias');
  if(p.universityYears>0){p.universityYears--;change(p,{intelligence:4,stress:6});if(p.universityYears===0){p.education='university';p.universityCourse=null;addEvent(p,'🎓','Licenciatura concluída','Concluíste a universidade. Agora tens novas carreiras ao teu alcance.','career');badge(p,'degree','Diploma universitário');}}
  if(p.job&&p.prison===0){p.jobYears++;const income=annualIncome(p);p.cash+=income;change(p,{stress:2});addEvent(p,'💵','Salário anual',money(income)+' recebidos como '+(CAREERS.find(j=>j.id===p.job)?.name||'profissional')+'.','finance');}
  if(isAdult){const expenses=annualExpenses(p);p.cash-=expenses;addEvent(p,'🧾','Custo de vida',money(expenses)+' em despesas anuais de habitação, alimentação e família.','finance');}
  if(p.savings>0)p.savings=Math.round(p.savings*1.012);
  if(p.investments>0){const delta=(rand(p)*.24)-.08;p.investments=Math.max(0,Math.round(p.investments*(1+delta)));}
  if(p.home)p.home.value=Math.max(10000,Math.round(p.home.value*(0.99+rand(p)*.05)));
  if(p.car)p.car.value=Math.max(500,Math.round(p.car.value*.89));
  if(p.partner){p.partner.bond=clamp(p.partner.bond-2+(roll(p,.5)?2:-1));if(p.partner.bond<8&&roll(p,.5)){addEvent(p,'💔','Fim de relação','Os teus caminhos e os de '+p.partner.name+' separaram-se.','relationship');p.partner=null;p.married=false;change(p,{happiness:-18,stress:12});}}
  if(p.prison>0){p.prison--;change(p,{happiness:-12,health:-6});if(p.prison===0)addEvent(p,'🕊️','Liberdade recuperada','Cumpriste a pena e estás novamente em liberdade.','milestone');}
  if(p.stats.stress>65)change(p,{health:-Math.ceil((p.stats.stress-60)/13),happiness:-3});
  if(p.stats.health<25)change(p,{happiness:-4});
  if(p.cash<0)change(p,{happiness:-4,stress:8});
  if(p.age>18&&roll(p,.23))change(p,{happiness:Math.round(rand(p)*8-3)});
  if(updateMortality(p)||p.stats.health<=0){p.alive=false;p.pending=null;p.lifeScore=rate(p);addEvent(p,'🕊️','Uma vida para recordar',p.first+' viveu '+p.age+' anos. O legado continua nas escolhas que fez.','death');return {ok:true,dead:true,msg:'A tua história chegou ao fim.'};}
  if(p.age>=5&&roll(p,.49)){
    const eligible=INCIDENTS.filter(i=>p.age>=i.min&&p.age<=i.max&&(!i.requireJob||p.job));
    if(eligible.length){const incident=pick(p,eligible);p.pending={id:incident.id,icon:incident.icon,title:incident.title,text:incident.text,options:incident.options.map(o=>({...o,effect:{...o.effect}}))};}
  }
  if(!p.pending){const moments=p.age<6?['Uma infância cheia de descobertas.','Aprendeste mais sobre o mundo à tua volta.']:p.age<18?['Mais um ano de escola, amigos e pequenas aventuras.','Cresceste e descobriste novos interesses.']:['Um novo capítulo para construir a tua vida.','O tempo avançou, e as tuas escolhas deixaram marcas.'];addEvent(p,'✨','Mais um ano',pick(p,moments),'age');}
  p.lifeScore=rate(p);return {ok:true,dead:false,pending:!!p.pending,msg:'Chegaste aos '+p.age+' anos.'};
}
export function loadSave(raw){try{const p=typeof raw==='string'?JSON.parse(raw):raw;if(!p||p.v!==VERSION||typeof p.first!=='string'||!Number.isFinite(p.age)||p.age<0||p.age>MAX_AGE||!p.stats||!Array.isArray(p.events))return null;const out={...p,stats:{...p.stats},events:p.events.slice(0,220),achievements:Array.isArray(p.achievements)?p.achievements.slice(0,80):[],habits:typeof p.habits==='object'&&p.habits?p.habits:{}};for(const k of ['health','happiness','intelligence','charisma','stress'])out.stats[k]=clamp(Number(out.stats[k]));for(const k of ['cash','savings','investments'])out[k]=clamp(Number(out[k]),k==='cash'?-1e8:0,1e10);out.family=clamp(out.family);out.karma=clamp(out.karma);out.age=Math.floor(out.age);out.year=2026+out.age;out.children=clamp(Number(out.children),0,50);out.friends=clamp(Number(out.friends),0,999);out.jobYears=clamp(Number(out.jobYears),0,80);out.universityYears=clamp(Number(out.universityYears),0,5);out.pending=out.pending&&Array.isArray(out.pending.options)?out.pending:null;return out;}catch{return null;}}
