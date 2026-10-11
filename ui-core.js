
import {FORMATIONS,POSITIONS,COLORS,FACILITY_DATA,MENTORS,rating,teamPower,standings,money,getPlayer,nextFixture,fixtureName} from './model.js';
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const short=x=>String(x||'').trim().split(/\s+/).slice(-1)[0]||'';
export const initials=x=>String(x||'CD').trim().split(/\s+/).slice(0,2).map(n=>n[0]||'').join('').toUpperCase();
export const icon=(n,size=19)=>{const d={
 home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',pitch:'M4 4h16v16H4zM4 12h16M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8M22 21v-2a4 4 0 0 0-3-3.87',trophy:'M8 21h8m-4-4v4M7 3h10v7a5 5 0 0 1-10 0V3zM7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4',bolt:'m13 2-9 12h7l-1 8 10-12h-7z',coins:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M15 8c-2-2-6-1-6 2 0 3 6 1 6 4s-4 4-7 1M12 5v14',building:'M4 21V5l8-3 8 3v16M2 21h20M8 9h2m4 0h2m-8 4h2m4 0h2m-6 8v-5h4v5',book:'M4 5h7v16H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm7 0h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-9',flag:'M4 22V3m0 1c4-4 9 4 16 0v11c-7 4-12-4-16 0',user:'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8M4 21v-2a8 8 0 0 1 16 0v2',shop:'M4 10v11h16V10M3 9l2-6h14l2 6H3zm6 12v-8h6v8',star:'m12 2 3.1 6.5 7.1 1-5.1 5 1.2 7-6.3-3.3L5.7 21l1.2-7-5.1-5 7.1-1z',settings:'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',arrow:'M4 12h16m-6-6 6 6-6 6',chart:'M3 21h18M6 18v-7m6 7V4m6 14v-10',heart:'M20.8 4.6c-2.6-2.5-6.4-1.7-8.8 1C9.6 3 5.8 2.1 3.2 4.6-.5 8.4 3.5 13 12 21c8.5-8 12.5-12.6 8.8-16.4',grid:'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',shield:'M12 2 21 6v6c0 6-4 9-9 10-5-1-9-4-9-10V6z',calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16',swap:'M4 8h16l-4-4m4 12H4l4 4',plus:'M12 5v14m-7-7h14',check:'m4 12 5 5L20 6',play:'m9 5 11 7-11 7V5',cup:'M7 3h10v8a5 5 0 0 1-10 0V3zM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 16v5m-4 0h8',gift:'M4 10h16v11H4zM2 7h20v3H2zM12 7c-9 0-9-7-5-7 4 0 5 7 5 7zm0 0c9 0 9-7 5-7-4 0-5 7-5 7',pause:'M8 5v14m8-14v14',rotate:'M20 11a8 8 0 0 0-14-5L4 8V3M4 8h5M4 13a8 8 0 0 0 14 5l2-2v5m0-5h-5'};
 return '<svg aria-hidden="true" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="'+(d[n]||d.star)+'"/></svg>';
};
export function crest(state,small=false){return '<span class="crest '+(small?'crest-sm':'')+'" style="--club:'+esc(state.club.color)+'"><b>'+esc(initials(state.club.name))+'</b></span>';}
export function btn(action,text,cls='subtle',extra=''){return '<button class="btn '+cls+'" data-action="'+esc(action)+'" '+extra+'>'+text+'</button>';}
export const pill=(txt,cls='')=>'<span class="pill '+cls+'">'+txt+'</span>';
export function bar(n,cls=''){return '<span class="meter '+cls+'"><i style="width:'+Math.max(0,Math.min(100,n))+'%"></i></span>';}
export function avatar(p){return '<span class="avatar">'+esc(initials(p.name))+'</span>';}
export function title(eyebrow,name,description='',actions=''){return '<header class="page-title"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+name+'</h1>'+(description?'<p>'+description+'</p>':'')+'</div>'+(actions?'<div class="title-actions">'+actions+'</div>':'')+'</header>';}
export function panel(name,content,aside=''){return '<section class="panel"><div class="panel-heading"><h3>'+name+'</h3>'+aside+'</div>'+content+'</section>';}
export const info=(k,v)=>'<div class="info"><span>'+k+'</span><strong>'+v+'</strong></div>';
export function playerItem(p,action='show-player',value=null){
 return '<button class="player-item" data-action="'+action+'" data-id="'+(value??p.id)+'">'+avatar(p)+'<span class="player-desc"><b>'+esc(p.name)+'</b><small>'+esc(POSITIONS[p.pos])+' · '+p.age+' anos</small></span><span class="ovr">'+rating(p)+'</span></button>';
}
export function navItems(){return [
 ['dashboard','home','Gabinete','Visão geral'],['matches','pitch','Partidas','Simulador ao vivo'],['tactics','shield','Táticas','Sistema de jogo'],['squad','users','Plantel','Jogadores e contratos'],
 ['league','trophy','Competições','Liga e taça'],['market','swap','Mercado','Transferências'],['training','bolt','Treinos','Evolução'],['academy','book','Academia','Novos talentos'],
 ['campus','building','Campus','Instalações'],['finance','coins','Finanças','Receitas e custos'],['mentors','star','Mentores','Equipa técnica'],['events','calendar','Eventos','Desafios'],
 ['collection','gift','Coleções','Cosméticos'],['profile','user','Treinador','Carreira'],['social','heart','Social','Jogos amigáveis'],['club','settings','Clube','Identidade e preferências']
 ];}
export function legacyShell(state,page,body,notice=''){
 const nav=navItems(),primary=['dashboard','matches','tactics','squad','more'];
 const navLink=([id,ic,label])=>'<button class="nav-item '+(page===id?'active':'')+'" data-nav="'+id+'">'+icon(ic)+'<span>'+label+'</span></button>';
 const toast=notice?'<div class="toast" role="status">'+esc(notice)+'</div>':'';
 return '<div class="app-shell"><aside class="side"><div class="brand"><span class="logo">CD</span><span><strong>CLUB DYNASTY</strong><small>FOOTBALL MANAGER</small></span></div><div class="nav-scroll">'+nav.map(navLink).join('')+'</div><div class="side-footer"><div class="eyebrow">TEMPORADA '+state.season+'</div><strong>O futuro pertence-te.</strong><small>Constrói a tua dinastia.</small></div></aside>'+
 '<div class="main-frame"><header class="top-bar"><div class="club-header">'+crest(state,true)+'<div><strong>'+esc(state.club.name)+'</strong><small>Época '+state.season+' · Jornada '+Math.min(30,state.league.round)+'</small></div></div><div class="resources"><span>'+icon('coins',15)+' '+money(state.budget)+'</span><span class="tokens">✦ '+state.tokens+'</span><button data-nav="club" class="top-settings">'+icon('settings')+'</button></div></header><main class="page" id="page">'+body+'</main></div>'+
 '<nav class="mobile-nav" aria-label="Navegação principal">'+primary.map(id=>{const detail=nav.find(x=>x[0]===id)||['more','grid','Mais'];return navLink(detail);}).join('')+'</nav>'+toast+'</div>';
}
export function welcome(color=COLORS[0]){
 return '<div class="welcome"><div class="welcome-showcase"><span class="mark">CD <span>✦</span></span><div><span class="eyebrow">FOOTBALL MANAGER · 2026</span><h1>CRIA O<br><em>TEU LEGADO.</em></h1><p>Constrói uma equipa. Domina o campeonato. Deixa o teu nome gravado na história.</p></div><div class="stadium-art">◉</div><small>CLUB DYNASTY · JOGO ORIGINAL DE GESTÃO</small></div><div class="welcome-card"><span class="eyebrow">PRIMEIRO PASSO</span><h2>FUNDA O TEU CLUBE</h2><p>Escolhe a tua identidade e recebe um plantel com 26 jogadores. Os teus dados ficam guardados neste dispositivo.</p><form id="create-form"><label>Nome do clube<input name="name" maxlength="32" placeholder="Atlético Aurora" value="Atlético Aurora" required></label><label>Cidade<input name="city" maxlength="26" value="Lisboa" required></label><label>Cor principal</label><div class="swatches">'+COLORS.map(c=>'<button type="button" class="swatch '+(c===color?'chosen':'')+'" style="background:'+c+'" data-color="'+c+'" aria-label="Selecionar cor '+c+'"></button>').join('')+'</div><button class="btn accent large" type="submit">Fundar clube '+icon('arrow')+'</button></form><small class="muted">Single-player, sem registo. Dados guardados localmente.</small></div></div>';
}

export function shell(state,page,body,notice=''){
 const nav=navItems(),primary=['dashboard','matches','tactics','squad','more'];
 const shortcuts=['league','market','training','academy','campus','finance','mentors','events','collection','profile','social','club'];
 const navMap=Object.fromEntries(nav.map(x=>[x[0],x]));
 const activeMore=!primary.includes(page);
 const navLink=([id,ic,label],mobile=false)=>'<button type="button" title="'+esc(label)+'" aria-label="'+esc(label)+'" aria-current="'+(page===id?'page':'false')+'" class="nav-item '+(page===id||id==='more'&&activeMore?'active':'')+'" data-nav="'+id+'"><span class="nav-glyph">'+icon(ic,mobile?21:23)+'</span><span class="nav-word">'+esc(label)+'</span></button>';
 const toast=notice?'<div class="toast" role="status"><span class="toast-mark">✦</span>'+esc(notice)+'</div>':'';
 const current=navMap[page]||['more','grid','Operações'];
 const rank=standings(state).findIndex(t=>t.id===0)+1,round=Math.min(30,state.league.round);
 return '<div class="app-shell game-shell" data-scene="'+esc(page)+'" style="--club-color:'+esc(state.club.color)+'">'+
 '<aside class="side game-rail" aria-label="Menu principal"><div class="brand"><span class="logo">CD<span class="logo-spark">✦</span></span><span class="rail-brand"><strong>CLUB<br>DYNASTY</strong><small>FOOTBALL UNIVERSE</small></span></div>'+
 '<div class="rail-caption">CENTRO DE COMANDO</div><nav class="nav-scroll" aria-label="Ecrãs de jogo">'+primary.map(id=>navLink(navMap[id]||['more','grid','Mais'])).join('')+'</nav>'+
 '<div class="rail-bottom"><div class="rail-division"><span class="mini-trophy">'+icon('trophy',18)+'</span><strong>'+rank+'º</strong><small>DIV '+state.division+'</small></div><button type="button" data-nav="club" class="rail-settings" title="Definições do clube" aria-label="Definições do clube">'+icon('settings',21)+'</button></div></aside>'+
 '<div class="main-frame game-canvas"><header class="top-bar game-hud"><div class="hud-club">'+crest(state,true)+'<div class="hud-club-copy"><span class="hud-label">CLUBE ATIVO <b class="online-indicator"></b> LOCAL</span><strong>'+esc(state.club.name)+'</strong><small>'+esc(state.club.city)+' <i>◆</i> ÉPOCA '+state.season+' <i>◆</i> JORNADA '+round+'</small></div></div>'+
 '<div class="hud-command"><div class="hud-season"><span class="hud-label">COMPETIÇÃO</span><strong>LIGA NACIONAL</strong><small>DIVISÃO '+state.division+' / 16 EQUIPAS</small></div>'+
 '<div class="resources"><span class="hud-wallet">'+icon('coins',16)+'<span class="hud-number">'+money(state.budget)+'</span></span><span class="tokens"><b>✦</b>'+state.tokens+'</span></div>'+
 '<button type="button" data-nav="club" class="top-settings" title="O meu clube" aria-label="O meu clube">'+icon('settings',19)+'</button></div></header>'+
 '<div class="game-ribbon"><div class="ribbon-location"><span class="ribbon-led"></span><span>DYNASTY OS</span><span class="ribbon-slash">/</span><strong>'+esc(current[2])+'</strong></div>'+
 '<nav class="ribbon-links" aria-label="Acesso rápido aos sistemas">'+shortcuts.map(id=>{const x=navMap[id];return '<button type="button" data-nav="'+id+'" class="'+(page===id?'active':'')+'">'+icon(x[1],14)+' '+esc(x[2])+'</button>';}).join('')+'</nav>'+
 '<div class="ribbon-mark">MANAGER MODE <span>●</span></div></div>'+
 '<main class="page game-stage" id="page" data-screen="'+esc(page)+'"><div class="screen-backdrop" aria-hidden="true"></div><div class="scene-content">'+body+'</div></main>'+
 '<div class="game-statusline"><span>✦ &nbsp; CLUB DYNASTY <em>/</em> FOOTBALL UNIVERSE</span><span>'+esc(state.coach?.name||'Treinador')+' <em>•</em> '+(state.league.completed?'ÉPOCA CONCLUÍDA':'ÉPOCA '+state.season+' EM CURSO')+'</span><span class="status-saved">● PROGRESSO LOCAL</span></div></div>'+
 '<nav class="mobile-nav" aria-label="Navegação principal">'+primary.map(id=>navLink(navMap[id]||['more','grid','Mais'],true)).join('')+'</nav>'+toast+'</div>';
}
