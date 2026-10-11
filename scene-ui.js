import {icon,esc,crest,pill} from './ui-core.js';
import {money,teamPower,standings,nextFixture,rating} from './model.js';

/* Environmental scene directors. Each room has an identity, an operative signal,
   a supporting measurement and usable neighbouring navigation destinations. */
const ROOM={
 league:{label:'SALA DE TROFÉUS',eyebrow:'COMPETIÇÃO NACIONAL',subtitle:'A classificação nunca pára.',glyph:'trophy',next:'matches',alt:'tactics',primary:'IR AO JOGO',secondary:'TÁTICAS'},
 market:{label:'CENTRO DE OBSERVAÇÃO',eyebrow:'SCOUTING ROOM',subtitle:'Constrói o onze do futuro.',glyph:'swap',next:'squad',alt:'academy',primary:'O MEU PLANTEL',secondary:'ACADEMIA'},
 training:{label:'LABORATÓRIO DESPORTIVO',eyebrow:'PREPARAÇÃO FÍSICA',subtitle:'Cada sessão muda a equipa.',glyph:'bolt',next:'tactics',alt:'squad',primary:'QUADRO TÁTICO',secondary:'VESTIÁRIO'},
 academy:{label:'CENTRO DE FORMAÇÃO',eyebrow:'A PRÓXIMA GERAÇÃO',subtitle:'Descobre estrelas antes do mundo.',glyph:'book',next:'squad',alt:'campus',primary:'PLANTEL PRINCIPAL',secondary:'INSTALAÇÕES'},
 campus:{label:'COMPLEXO DO CLUBE',eyebrow:'EVOLUÇÃO DO ESTÁDIO',subtitle:'Um império constrói-se.',glyph:'building',next:'finance',alt:'academy',primary:'ORÇAMENTO',secondary:'FORMAÇÃO'},
 finance:{label:'SALA DA DIREÇÃO',eyebrow:'FINANÇAS & PATRIMÓNIO',subtitle:'Cada decisão tem um custo.',glyph:'coins',next:'campus',alt:'market',primary:'INFRAESTRUTURAS',secondary:'TRANSFERÊNCIAS'},
 mentors:{label:'DIREÇÃO TÉCNICA',eyebrow:'A EQUIPA POR DETRÁS DA EQUIPA',subtitle:'A experiência vence partidas.',glyph:'star',next:'tactics',alt:'training',primary:'ESTRATÉGIA',secondary:'TREINOS'},
 events:{label:'CENTRO DE MISSÕES',eyebrow:'CONQUISTAS DO TREINADOR',subtitle:'Joga. Evolui. Deixa a tua marca.',glyph:'flag',next:'profile',alt:'collection',primary:'CARREIRA',secondary:'RECOMPENSAS'},
 collection:{label:'SALA DE RECOMPENSAS',eyebrow:'CLUB DYNASTY / COLEÇÃO',subtitle:'Desbloqueia o teu estilo.',glyph:'gift',next:'club',alt:'events',primary:'PERSONALIZAÇÃO',secondary:'MISSÕES'},
 profile:{label:'ESCRITÓRIO DO TREINADOR',eyebrow:'HISTÓRIA DA TUA CARREIRA',subtitle:'Os títulos não se oferecem.',glyph:'user',next:'dashboard',alt:'league',primary:'QUARTEL-GENERAL',secondary:'PALMARÉS'},
 social:{label:'CENTRO DE AMIGÁVEIS',eyebrow:'RIVAIS CONTROLADOS PELA IA',subtitle:'Testa a tua estratégia.',glyph:'users',next:'matches',alt:'tactics',primary:'MATCH CENTER',secondary:'TÁTICAS'},
 club:{label:'IDENTIDADE DO CLUBE',eyebrow:'O TEU EMBLEMA. O TEU LEGADO.',subtitle:'Constrói uma instituição única.',glyph:'shield',next:'campus',alt:'collection',primary:'COMPLEXO',secondary:'EQUIPAMENTOS'},
 more:{label:'MAPA DAS OPERAÇÕES',eyebrow:'ESCOLHE O TEU PRÓXIMO PASSO',subtitle:'Todo o universo do futebol à distância de um comando.',glyph:'grid',next:'matches',alt:'dashboard',primary:'MATCH CENTER',secondary:'QUARTEL-GENERAL'}
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
 return '<section class="room-scene room-'+page+'" aria-label="Ambiente do jogo: '+esc(r.label)+'">'+
 '<div class="room-world"><div class="room-world-map"></div><div class="room-world-diamond d1"></div><div class="room-world-diamond d2"></div><div class="room-world-diamond d3"></div><div class="room-symbol">'+icon(r.glyph,88)+'</div><div class="room-orbit orbit-a"></div><div class="room-orbit orbit-b"></div></div>'+
 '<div class="room-foreground"><div class="room-copy"><span class="room-pretitle"><i>●</i> '+esc(r.eyebrow)+'</span><h2>'+esc(r.label)+'</h2><p>'+esc(r.subtitle)+'</p><div class="room-shortcuts"><button data-nav="'+r.next+'">'+icon('arrow',13)+' '+esc(r.primary)+'</button><button data-nav="'+r.alt+'">'+icon('arrow',13)+' '+esc(r.secondary)+'</button></div></div>'+
 '<div class="room-score"><span>CLUB DATA</span><strong>'+esc(m.value)+'</strong><small>'+esc(m.tag)+'</small></div></div><span class="room-crosshair cross-1"></span><span class="room-crosshair cross-2"></span></section>';
}
