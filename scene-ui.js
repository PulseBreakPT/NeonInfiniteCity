import {icon,esc,crest,pill} from './ui-core.js';
import {money,teamPower,standings,nextFixture,rating} from './model.js';

/* Environmental scene directors. Each room has an identity, an operative signal,
   a supporting measurement and usable neighbouring navigation destinations. */
const ROOM={
 league:{label:'Liga e Taça',next:'matches',alt:'tactics',primary:'Próxima partida',secondary:'Definir táticas'},
 market:{label:'Transferências',next:'squad',alt:'academy',primary:'Ver plantel',secondary:'Academia'},
 training:{label:'Treinos',next:'tactics',alt:'squad',primary:'Táticas',secondary:'Plantel'},
 academy:{label:'Academia',next:'squad',alt:'campus',primary:'Plantel',secondary:'Instalações'},
 campus:{label:'Instalações',next:'finance',alt:'academy',primary:'Finanças',secondary:'Academia'},
 finance:{label:'Finanças',next:'campus',alt:'market',primary:'Instalações',secondary:'Mercado'},
 mentors:{label:'Equipa técnica',next:'tactics',alt:'training',primary:'Táticas',secondary:'Treinos'},
 events:{label:'Objetivos',next:'profile',alt:'collection',primary:'Treinador',secondary:'Recompensas'},
 collection:{label:'Equipamentos e cartas',next:'club',alt:'events',primary:'Clube',secondary:'Objetivos'},
 profile:{label:'Treinador',next:'dashboard',alt:'league',primary:'Gabinete',secondary:'Classificação'},
 social:{label:'Amigáveis',next:'matches',alt:'tactics',primary:'Partida',secondary:'Táticas'},
 club:{label:'Clube',next:'campus',alt:'collection',primary:'Instalações',secondary:'Equipamentos'},
 more:{label:'Gestão do clube',next:'matches',alt:'dashboard',primary:'Partida',secondary:'Gabinete'}
};
function metric(page,s){
 const rank=standings(s).findIndex(x=>x.id===0)+1;
 switch(page){
 case 'league':return {value:rank+'º',tag:'CLASSIFICAÇÃO'};
 case 'market':return {value:s.market.length,tag:'ALVOS NO RADAR'};
 case 'training':return {value:s.trainingCount+'/3',tag:'SESSÕES DA SEMANA'};
 case 'academy':return {value:s.academy.length,tag:'JOVENS EM FORMAÇÃO'};
 case 'campus':return {value:s.facilities.stadium,tag:'NÍVEL DO ESTÁDIO'};
 case 'finance':return {value:money(s.budget),tag:'SALDO DO CLUBE'};
 case 'mentors':return {value:s.mentors.length,tag:'TÉCNICOS CONTRATADOS'};
 case 'events':return {value:s.coach.trophies,tag:'TROFÉUS'};
 case 'collection':return {value:s.inventory.cards.length,tag:'CARTAS ÚNICAS'};
 case 'profile':return {value:s.coach.level,tag:'NÍVEL DO TREINADOR'};
 case 'social':return {value:15,tag:'RIVAIS NA LIGA'};
 case 'club':return {value:s.fans.toLocaleString('pt-PT'),tag:'ADEPTOS'};
 default:return {value:'16',tag:'CENTROS DISPONÍVEIS'};
 }
}
export function roomScene(page,s){
 const r=ROOM[page];if(!r)return'';
 const m=metric(page,s);
 return '<section class="room-scene room-'+page+'" aria-label="'+esc(r.label)+'">'+
 '<div class="room-foreground"><div class="room-copy"><h2>'+esc(r.label)+'</h2><div class="room-shortcuts"><button type="button" data-nav="'+r.next+'">'+esc(r.primary)+' '+icon('arrow',14)+'</button><button type="button" data-nav="'+r.alt+'">'+esc(r.secondary)+' '+icon('arrow',14)+'</button></div></div>'+
 '<div class="room-score"><strong>'+esc(m.value)+'</strong><small>'+esc(m.tag)+'</small></div></div></section>';
}
