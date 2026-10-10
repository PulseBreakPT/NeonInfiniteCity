// VIDA NOVA 2.0 — 100 independent, playable systems with persistent consequences.
// All probability and changes are deterministic from a character's saved RNG seed.
const sections = [
 ['tempo','⏳','Tempo e rotinas',[
 ['agenda','Organizar agenda','Evita compromissos sobrepostos',6,0,'time:9,stress:-4','time:-7,stress:7'],
 ['prioridades','Definir prioridades','Seleciona o que importa este ano',8,0,'time:6,happiness:3','stress:7'],
 ['sono','Regularizar o sono','Melhora concentração e energia',5,0,'health:5,time:7','time:-8,health:-5'],
 ['procrastinar','Enfrentar a procrastinação','Resolve tarefas antes de se acumularem',10,0,'time:10,skills:2','time:-10,stress:9'],
 ['pontual','Ser pontual','Reforça a confiança nos compromissos',8,0,'social:4,work:5','social:-7'],
 ['multitarefa','Gerir multitarefas','Equilibra produtividade com qualidade',14,0,'time:7,work:4','stress:9,work:-5'],
 ['rotina','Criar uma rotina','Hábitos mantêm os ganhos anuais',10,0,'time:5,health:3','happiness:-3'],
 ['interrupcoes','Preparar imprevistos','Reserva tempo para emergências',16,40,'time:5,world:3','time:-9,cash:-80'],
 ['plano','Planear cinco anos','Traça etapas para um objetivo',15,0,'time:5,skills:5','happiness:-4'],
 ['prazos','Cumprir prazos','Protege oportunidades com data-limite',16,0,'time:6,law:3','work:-7,cash:-120']]],
 ['aprendizagem','📚','Aprendizagem e capacidades',[
 ['curva','Treinar com método','Supera um patamar de aprendizagem',7,0,'skills:8,intelligence:2','stress:4'],
 ['esquecimento','Rever matérias antigas','Impede a deterioração de conhecimentos',8,0,'skills:6','skills:-6'],
 ['transferir','Cruzar conhecimentos','Aplica competências noutra área',13,0,'skills:6,work:3','time:-5'],
 ['observar','Observar especialistas','Aprende com quem tem experiência',10,30,'skills:5,social:2','skills:-3'],
 ['errar','Aprender com os erros','Analisa falhas e melhora',9,0,'skills:7,stress:-2','happiness:-4'],
 ['atualizar','Atualizar conhecimentos','Não deixes a tecnologia ultrapassar-te',16,250,'skills:8,digital:5','skills:-8'],
 ['concentrar','Treinar concentração','Sessões sem distrações',10,0,'skills:4,time:5','stress:7'],
 ['certificar','Renovar certificação','Mantém qualificações válidas',18,350,'law:5,skills:4','law:-7,work:-4'],
 ['portfolio','Construir portefólio','Mostra provas das tuas capacidades',15,100,'work:6,skills:4','time:-5'],
 ['versatil','Diversificar competências','Evita especialização excessiva',16,200,'skills:7,work:3','skills:-5']]],
 ['social','🤝','Interações sociais',[
 ['circulos','Entrar num círculo social','Conhece uma comunidade diferente',12,90,'social:8,friends:1','social:-6'],
 ['impressao','Preparar uma apresentação','Uma boa primeira impressão abre portas',13,35,'social:5,charisma:3','social:-5'],
 ['comunicar','Comunicar melhor','Expressa as tuas ideias com clareza',8,0,'social:7,charisma:2','social:-5'],
 ['malentendido','Esclarecer mal-entendido','Resolve uma mensagem ambígua',12,0,'social:8,stress:-4','social:-9'],
 ['reputacao','Cuidar da reputação','Constrói confiança na tua região',14,0,'social:6,karma:3','social:-8'],
 ['pressao','Resistir à pressão de grupo','Toma uma decisão independente',12,0,'social:4,happiness:4','social:-6,stress:5'],
 ['apresentar','Pedir uma apresentação','Um conhecido abre uma nova porta',16,50,'social:5,work:3','social:-4'],
 ['convites','Cumprir compromissos sociais','Mantém datas e convites importantes',11,85,'social:7,family:4','social:-6'],
 ['limites','Estabelecer limites','Respeita o teu espaço e o dos outros',14,0,'social:3,stress:-8','social:-5'],
 ['segredos','Proteger informação privada','Evita que segredos circulem',15,0,'social:4,digital:4','social:-8,stress:5']]],
 ['trabalho','💼','Mercado de trabalho',[
 ['vagas','Procurar vagas regionais','Estuda a oferta na tua região',16,0,'work:6,time:2','work:-5'],
 ['contrato','Negociar contrato','Melhora salário e condições',18,0,'work:8,cash:300','work:-7,stress:5'],
 ['experiencia','Superar período experimental','Ganha estabilidade no emprego',16,0,'work:8','work:-8'],
 ['avaliacao','Pedir avaliação','Descobre pontos fortes e fracos',16,0,'work:7,skills:3','stress:6'],
 ['politicas','Conhecer regulamentos','Evita incumprimentos na organização',16,0,'work:4,law:5','law:-8'],
 ['interesses','Declarar conflitos de interesse','Protege decisões profissionais',18,0,'law:7,work:4','work:-7,karma:-4'],
 ['mobilidade','Mudar de departamento','Experimenta uma nova função',18,0,'work:7,skills:4','work:-5'],
 ['remoto','Organizar trabalho remoto','Reduz deslocações com equipamento adequado',18,450,'time:6,work:5','work:-5'],
 ['greve','Participar numa negociação laboral','Exerce direitos coletivos',18,0,'law:5,social:5','cash:-300,stress:5'],
 ['sigilo','Proteger segredo comercial','Respeita informação confidencial',18,0,'law:7,work:5','law:-10,work:-5']]],
 ['comercio','📦','Comércio e operações',[
 ['fornecimento','Diversificar fornecedores','Reduz ruturas de abastecimento',18,800,'trade:8,time:3','trade:-9,cash:-250'],
 ['validade','Controlar validade','Evita produtos deteriorados',16,80,'trade:6,health:2','trade:-6,health:-3'],
 ['precos','Testar elasticidade dos preços','Ajusta preços à procura',18,0,'trade:7,cash:200','trade:-7,cash:-300'],
 ['sazonalidade','Planear a época alta','Prepara stock para picos de procura',18,400,'trade:7,cash:200','trade:-7'],
 ['localizacao','Estudar localização comercial','Escolhe o melhor ponto para vender',18,550,'trade:8,work:2','trade:-8'],
 ['garantias','Gerir devoluções e garantias','Cumpre obrigações com os clientes',18,250,'trade:6,law:5','trade:-6,law:-3'],
 ['qualidade','Inspecionar a produção','Deteta defeitos antes da venda',18,250,'trade:8,work:3','trade:-8'],
 ['inventario','Inventariar armazém','Reduz stock perdido e vendas falhadas',16,200,'trade:7,time:2','trade:-7'],
 ['concursos','Concorrer a fornecimento','Apresenta uma proposta competitiva',18,900,'trade:10,cash:800','cash:-800,trade:-6'],
 ['escala','Aumentar escala de operações','Baixa custos unitários com investimento',20,2200,'trade:12,cash:1000','trade:-9,cash:-1200']]],
 ['habitacao','🏠','Habitação e transportes',[
 ['manutencao','Manter equipamentos','Evita avarias em casa',18,350,'home:8,time:2','home:-8,cash:-350'],
 ['energia','Poupar água e energia','Reduz consumos recorrentes',18,200,'home:7,world:3','home:-5'],
 ['servicos','Preparar falhas de serviços','Instala equipamento de emergência',18,500,'home:7,world:4','home:-8'],
 ['vizinhanca','Mediar conflito de vizinhos','Resolve ruído ou utilização de espaços',18,0,'home:4,social:5','social:-7,stress:6'],
 ['mudanca','Organizar uma mudança','Evita perdas e problemas de instalação',18,800,'home:6,time:3','home:-7,cash:-350'],
 ['transporte','Comparar transportes','Escolhe a mobilidade mais eficiente',16,40,'home:5,time:5','time:-5'],
 ['avarias','Fazer revisão automóvel','Reduz a probabilidade de avaria',18,480,'home:9','home:-9,cash:-600'],
 ['transito','Planear percursos','Evita congestionamentos frequentes',16,0,'time:7,home:3','time:-7'],
 ['estacionamento','Gerir estacionamento','Evita multas e atrasos',18,80,'home:4,law:4','cash:-200,law:-4'],
 ['urbanismo','Consultar regras urbanísticas','Evita obras fora das normas',18,220,'home:6,law:7','law:-8,home:-4']]],
 ['medicina','🩺','Medicina e condição física',[
 ['sintomas','Registar sintomas','Deteta problemas antes de agravarem',12,0,'health:6,skills:2','health:-5'],
 ['diagnostico','Pedir segunda opinião','Reduz incerteza no diagnóstico',12,160,'health:6','health:-5,cash:-150'],
 ['adesao','Cumprir medicação','Evita falhas na continuidade do tratamento',12,120,'health:8','health:-9'],
 ['interacoes','Rever medicamentos','Previne interações indesejadas',16,95,'health:7','health:-7'],
 ['reabilitacao','Fazer reabilitação','Recupera depois de uma lesão',12,300,'health:10,stress:-2','health:-6'],
 ['espera','Gerir consultas e espera','Planeia cuidados dentro dos prazos',12,0,'health:5,time:3','health:-5'],
 ['acesso','Encontrar cuidados acessíveis','Escolhe unidade ou transporte adequado',12,80,'health:5,world:2','health:-4'],
 ['ergonomia','Corrigir postura','Reduz riscos em tarefas repetitivas',14,180,'health:7,work:2','health:-6'],
 ['circadiano','Estabilizar horários','Protege ritmo biológico',12,0,'health:5,time:4','health:-5'],
 ['alimentos','Proteger higiene alimentar','Evita intoxicações e desperdício',10,80,'health:6,trade:2','health:-7']]],
 ['justica','⚖️','Justiça e burocracia',[
 ['documentos','Atualizar documentos','Mantém identificação e registos válidos',16,75,'law:8','law:-9'],
 ['licencas','Pedir licença profissional','Cumpre requisitos de exercício',18,350,'law:8,work:3','law:-9'],
 ['pontos','Respeitar código da estrada','Evita pontos e restrições na carta',18,0,'law:6,home:2','law:-8,cash:-350'],
 ['acidentes','Prevenir acidentes','Reduz riscos e responsabilidades',16,120,'law:5,health:4','health:-7,cash:-300'],
 ['seguros','Rever seguros','Escolhe coberturas e franquias',18,480,'law:7,home:3','cash:-500,home:-4'],
 ['litigios','Resolver litígio por mediação','Evita custos de disputa prolongada',18,180,'law:7,social:4','cash:-300,social:-7'],
 ['recursos','Recorrer de decisão administrativa','Contesta dentro do prazo',18,130,'law:7','law:-7,cash:-200'],
 ['consumidor','Exercer direitos do consumidor','Pede reparação ou compensação',16,0,'law:6,cash:90','law:-4'],
 ['fiscalizacao','Preparar fiscalização','Reúne comprovativos e cumpre normas',18,300,'law:9,trade:3','law:-9,cash:-400'],
 ['prescricao','Verificar prazos legais','Não percas direitos por atrasos',18,60,'law:7,time:3','law:-8']]],
 ['digital','💻','Tecnologia e internet',[
 ['pegada','Rever pegada digital','Evita publicações que prejudiquem o futuro',12,0,'digital:8,social:3','digital:-8'],
 ['privacidade','Configurar privacidade','Limita exposição de dados pessoais',12,0,'digital:8','digital:-8'],
 ['fraudes','Identificar fraude digital','Protege contas e dinheiro',14,0,'digital:6,law:3','cash:-500,digital:-8'],
 ['recomendacao','Personalizar recomendações','Controla o conteúdo que consomes',12,0,'digital:5,time:3','time:-5'],
 ['viralidade','Criar conteúdo viral','Tenta alcançar um grande público',15,160,'digital:10,social:5','digital:-7,social:-4'],
 ['moderacao','Respeitar normas digitais','Evita bloqueios e restrições de conta',12,0,'digital:6,law:2','digital:-7'],
 ['identidade','Cuidar da identidade online','Alinha a apresentação com a realidade',14,0,'digital:6,social:4','social:-6'],
 ['assinaturas','Auditar subscrições','Cancela cobranças desnecessárias',18,0,'digital:5,cash:180','digital:-4'],
 ['autorais','Registar criação original','Protege direitos de autor e licenças',16,160,'digital:7,law:5','law:-7'],
 ['obsolescencia','Atualizar equipamentos','Mantém dispositivos utilizáveis',16,650,'digital:9,skills:3','digital:-8']]],
 ['mundo','🌍','Mundo e acontecimentos',[
 ['ecossistema','Restaurar ecossistema','Protege a biodiversidade local',12,180,'world:8,karma:3','world:-7'],
 ['catastrofe','Preparar plano para catástrofes','Evita perdas em crises ambientais',16,300,'world:8,home:4','world:-8,home:-5'],
 ['emergencia','Apoiar serviços de emergência','Melhora a resposta comunitária',18,140,'world:8,social:3','world:-7'],
 ['evacuacao','Treinar evacuação','Conhece rotas e planos de saída',12,0,'world:7,time:3','world:-7'],
 ['racionamento','Gerir reservas essenciais','Resiste melhor a períodos de escassez',16,250,'world:6,home:3','world:-7'],
 ['migracao','Aprender idioma local','Facilita integração noutra cultura',14,150,'world:5,skills:5','social:-5'],
 ['comunidade','Participar na associação','Constrói projetos coletivos',12,50,'world:7,social:4','world:-5'],
 ['desporto','Entrar numa competição','Participa em torneios e classificações',9,110,'health:5,world:3','health:-4,stress:5'],
 ['animais','Cuidar de animal','Treina e alimenta um companheiro',10,180,'happiness:7,world:4','happiness:-6,cash:-150'],
 ['dependencia','Prestar cuidados a familiar','Apoia alguém com necessidades diárias',16,110,'family:9,world:4','stress:9,time:-6']]]
];

const parseEffects = str => Object.fromEntries(str.split(',').map(p=>{const i=p.lastIndexOf(':');return [p.slice(0,i),Number(p.slice(i+1))];}));
export const GROUPS=Object.freeze(sections.map(([id,icon,title])=>({id,icon,title})));
export const RULES=Object.freeze(sections.flatMap(([group,icon,,data])=>data.map(([id,title,desc,minAge,cost,good,bad],idx)=>Object.freeze({id,title,desc,icon,group,minAge,cost,good:parseEffects(good),bad:parseEffects(bad),risk:0.10+idx%4*0.035}))));
export const RULE_BY_ID=new Map(RULES.map(r=>[r.id,r]));
if(RULES.length!==100||RULE_BY_ID.size!==100)throw Error('A simulação exige 100 lógicas únicas');
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
const METERS=Object.freeze(Object.fromEntries(GROUPS.map(g=>[g.id,55])));
export function ensureSystems(p){
 if(!p.systems||typeof p.systems!=='object')p.systems={};
 const s=p.systems;
 s.meters={...METERS,...(s.meters&&typeof s.meters==='object'?s.meters:{})};
 for(const k of Object.keys(METERS))s.meters[k]=clamp(Number(s.meters[k]));
 s.year=Number.isInteger(s.year)?s.year:p.age;
 s.points=clamp(Number(s.points??4),0,4);
 s.done=s.done&&typeof s.done==='object'&&!Array.isArray(s.done)?s.done:{};
 s.history=Array.isArray(s.history)?s.history.slice(-60):[];
 s.flags=s.flags&&typeof s.flags==='object'&&!Array.isArray(s.flags)?s.flags:{};
 s.world=s.world&&typeof s.world==='object'?s.world:{};
 for(const [k,val] of Object.entries({inflation:2.2,demand:55,supply:65,technology:40,services:70,risk:25,season:0}))s.world[k]=clamp(Number(s.world[k]??val),k==='inflation'?-4:0,100);
 return s;
}
function roll(p){p.rng=(Math.imul(p.rng|0,1664525)+1013904223)>>>0;return p.rng/4294967296;}
function effect(p,changes){const s=ensureSystems(p);for(const [k,v] of Object.entries(changes)){
 if(k in s.meters)s.meters[k]=clamp(s.meters[k]+v);
 else if(k in p.stats)p.stats[k]=clamp(p.stats[k]+v);
 else if(k==='cash')p.cash=Math.max(-100000,Math.round(p.cash+v));
 else if(k==='friends')p.friends=clamp(p.friends+v,0,1000);
 else if(k==='family'||k==='karma')p[k]=clamp(p[k]+v);
 }}
function record(p,r,text,kind='system'){
 const s=ensureSystems(p);s.history.unshift({id:r.id,age:p.age,year:p.year,title:r.title,detail:text,group:r.group});s.history=s.history.slice(0,60);
 const last=p.events?.[0]?.id||0;
 p.events.unshift({id:last+1,age:p.age,year:p.year,icon:r.icon,title:r.title,detail:text,type:kind});p.events=p.events.slice(0,220);
}
export function checkRule(p,r){
 const s=ensureSystems(p);
 if(!p.alive)return 'A vida terminou';
 if(p.pending)return 'Resolve a decisão pendente';
 if(p.prison>0)return 'Indisponível durante a pena';
 if(p.age<r.minAge)return `Disponível aos ${r.minAge} anos`;
 if(s.points<1)return 'Sem tempo livre este ano';
 if(s.done[r.id]===p.age)return 'Já realizada este ano';
 if(p.cash<r.cost)return `Precisas de ${r.cost.toLocaleString('pt-PT')} €`;
 if(['contrato','experiencia','avaliacao','politicas','interesses','mobilidade','remoto','sigilo'].includes(r.id)&&!p.job)return 'Exige emprego';
 if(['manutencao','energia','servicos','vizinhanca','mudanca','urbanismo'].includes(r.id)&&!p.home)return 'Exige casa própria';
 if(['avarias','pontos','estacionamento'].includes(r.id)&&!p.car)return 'Exige automóvel';
 if(r.id==='dependencia'&&p.age<18)return 'Só disponível na idade adulta';
 return null;
}
export function doRule(p,id){
 const r=RULE_BY_ID.get(id);if(!r)return {ok:false,msg:'Mecânica desconhecida'};
 const err=checkRule(p,r);if(err)return {ok:false,msg:err};
 const s=ensureSystems(p);
 const riskModifier=(s.world.risk-25)/500+(50-s.meters[r.group])/600;
 const failed=roll(p)<clamp(r.risk+riskModifier,0.04,0.55);
 p.cash-=r.cost;s.points--;s.done[r.id]=p.age;
 const changes=failed?r.bad:r.good;
 effect(p,changes);
 // Each distinctive action also sets a stateful flag that influences annual simulation.
 if(!failed)s.flags[r.id]=p.age;
 if(r.id==='assinaturas'&&!failed)s.flags.subscriptionSavings=180;
 if(r.id==='certificar'&&!failed)s.flags.certificateExpires=p.age+4;
 if(r.id==='documentos'&&!failed)s.flags.documentsExpire=p.age+8;
 if(r.id==='licencas'&&!failed)s.flags.licenseExpires=p.age+5;
 if(r.id==='seguros'&&!failed)s.flags.insuredUntil=p.age+3;
 if(r.id==='rotina'&&!failed)s.flags.routineUntil=p.age+5;
 if(r.id==='manutencao'&&!failed)s.flags.homeServiceUntil=p.age+3;
 if(r.id==='avarias'&&!failed)s.flags.carServiceUntil=p.age+3;
 if(r.id==='animais'&&!failed)s.flags.pet=true;
 if(r.id==='concursos'&&!failed)s.flags.supplyContractUntil=p.age+3;
 if(r.id==='escala'&&!failed)s.flags.scaleUntil=p.age+5;
 if(r.id==='remoto'&&!failed)s.flags.remoteUntil=p.age+2;
 if(r.id==='portfolio'&&!failed)s.flags.portfolioUntil=p.age+4;
 if(r.id==='segredos'&&!failed)s.flags.privacyUntil=p.age+3;
 if(r.id==='ecossistema'&&!failed)s.flags.environmentUntil=p.age+3;
 if(r.id==='prazos'&&!failed)s.flags.deadlineUntil=p.age+2;
 if(r.id==='catastrofe'&&!failed)s.flags.disasterPlanUntil=p.age+5;
 if(r.id==='racionamento'&&!failed)s.flags.foodReserveUntil=p.age+3;
 if(r.id==='adesao'&&!failed)s.therapyUntil=p.age+2;
 const outcome=failed?`Houve dificuldades: ${r.desc.toLowerCase()}. As consequências vão continuar a influenciar a tua vida.`:`${r.desc}. O resultado foi favorável e pode influenciar os próximos anos.`;
 record(p,r,outcome);return {ok:true,failed,msg:outcome};
}
// Correlated year simulation rather than a random event that ignores the character.
export function tickSystems(p){
 const s=ensureSystems(p);
 s.year=p.age;s.points=4;s.done={};
 const w=s.world;
 const wobble=()=>roll(p)-0.5;
 w.season=(w.season+1)%4;
 w.inflation=clamp(w.inflation+wobble()*1.8,-2,14);
 w.demand=clamp(w.demand+wobble()*14-(w.inflation-3)*.3);
 w.supply=clamp(w.supply+wobble()*12-(w.risk-25)*.07);
 w.technology=clamp(w.technology+1.5+wobble()*2);
 w.services=clamp(w.services+wobble()*10);
 w.risk=clamp(w.risk+wobble()*12+(w.services<25?4:0));
 const active=id=>Number(s.flags[id])>=p.age-1;
 for(const key of Object.keys(s.meters)){
   let drift=-1-(w.risk>70?1:0);
   if(key==='aprendizagem')drift-=w.technology>65?2:0;
   if(key==='comercio')drift+=w.supply<30?-3:w.demand>65?1:0;
   if(key==='habitacao')drift-=w.services<30?2:0;
   if(key==='social')drift+=p.friends>=5?1:0;
   if(key==='medicina')drift+=p.stats.health>75?1:0;
   if(key==='trabalho')drift+=p.job?2:0;
   if(key==='tempo')drift+=s.flags.routineUntil>=p.age?2:0;
   s.meters[key]=clamp(s.meters[key]+drift);
 }
 const morale=s.meters.social-50, wellness=s.meters.medicina-50, routine=s.meters.tempo-50;
 p.stats.happiness=clamp(p.stats.happiness+Math.round(morale/30)-(w.risk>80?2:0));
 p.stats.health=clamp(p.stats.health+Math.round(wellness/32)-(w.services<22?3:0));
 p.stats.stress=clamp(p.stats.stress+Math.round((50-routine)/24));
 if(p.job){
   const efficiency=(s.meters.trabalho-50)+(s.meters.aprendizagem-50)*.3;
   const change=Math.round((efficiency/100)*900);
   p.cash+=change;
   if(active('greve'))p.cash-=Math.round(Math.max(0,300*(1-w.demand/100)));
   if(s.flags.remoteUntil>=p.age)p.cash+=220;
 }
 if(p.age>=18){
  if(s.flags.subscriptionSavings)p.cash+=s.flags.subscriptionSavings;
  if(p.home){let repair=Math.round((100-s.meters.habitacao)*3.5);if(s.flags.homeServiceUntil>=p.age)repair=Math.floor(repair*.3);p.cash-=repair;}
  if(p.car){let repair=Math.round((100-s.meters.habitacao)*2.5);if(s.flags.carServiceUntil>=p.age)repair=Math.floor(repair*.25);p.cash-=repair;}
  if(s.flags.pet){p.cash-=260;p.stats.happiness=clamp(p.stats.happiness+1);}
  if(s.flags.supplyContractUntil>=p.age)p.cash+=Math.round(w.supply*w.demand*.09);
  if(s.flags.scaleUntil>=p.age)p.cash+=Math.round(w.demand*5);
 }
 // Successful skills and world actions can create residual gains for up to three years.
 for(const r of RULES){const elapsed=p.age-Number(s.flags[r.id]);if(elapsed>=1&&elapsed<=3){
   const gain=elapsed===1?2:1; s.meters[r.group]=clamp(s.meters[r.group]+gain);
   if(r.id==='comunicar'||r.id==='limites')p.stats.stress=clamp(p.stats.stress-1);
   if(r.id==='sono'||r.id==='circadiano')p.stats.health=clamp(p.stats.health+1);
 }}
 if(s.flags.certificateExpires===p.age)s.meters.aprendizagem=clamp(s.meters.aprendizagem-9);
 if(s.flags.documentsExpire===p.age||s.flags.licenseExpires===p.age)s.meters.justica=clamp(s.meters.justica-8);
 if(w.services<23&&w.risk>55&&roll(p)<.23){
   const covered=s.flags.insuredUntil>=p.age;
   const loss=covered?120:900;
   p.cash-=loss;p.stats.stress=clamp(p.stats.stress+5);
   record(p,{id:'service-failure',icon:'⚠️',title:'Interrupção de serviços',group:'mundo'},`Uma falha de serviços custou ${loss} €. ${covered?'O seguro reduziu os danos.':'Sem cobertura, pagaste as reparações.'}`,'world');
 }
 if(w.supply<22&&(s.flags.foodReserveUntil??-1)<p.age){p.cash-=170;p.stats.happiness=clamp(p.stats.happiness-2);}
 if(w.risk>70&&s.flags.disasterPlanUntil<p.age&&roll(p)<.14){p.cash-=450;p.stats.stress=clamp(p.stats.stress+7);}
 return {year:p.year,world:{...w},meters:{...s.meters}};
}
export const DOMAIN_LABELS=Object.freeze(Object.fromEntries(GROUPS.map(g=>[g.id,g.title])));
