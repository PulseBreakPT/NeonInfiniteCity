import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from '../model.js';
import {shell,navItems} from '../ui-core.js';
import {dashboard,matches,tactics,squad,playerDetail} from '../ui-main.js';
import {league,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more} from '../ui-extra.js';

const views={dashboard,matches,tactics,squad,league,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more};
const ui={slot:null,player:null,search:'',position:'ALL',color:'#caf35b'};
test('16 areas de gestão e 17 ecrãs renderizam sem falhas',()=>{
 const state=makeState();
 assert.equal(navItems().length,16);
 for(const [id,view] of Object.entries(views)){
  const html=view(state,ui);
  assert.ok(typeof html==='string'&&html.length>350,'Ecrã vazio: '+id);
  assert.ok(html.includes('class='),'Falta estrutura: '+id);
 }
});
test('ecrã de partida tem relvado, eventos e relatório',()=>{
 const s=makeState();const view=matches(s,ui);
 assert.ok(view.includes('live-pitch'));assert.ok(view.includes('live-score'));assert.ok(view.includes('match-controls'));
});
test('o perfil não injeta HTML do nome do clube',()=>{
 const s=makeState('<script>alert(1)</script>','Lisboa');
 const html=shell(s,'profile',profile(s),''),clubHtml=club(s);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(!clubHtml.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('os controlos de jogadores são acionáveis e a ficha não bloqueia propagação',()=>{
 const s=makeState();
 const html=playerDetail(s,s.players[0].id);
 assert.ok(html.includes('data-action="contract-offer"'));assert.ok(html.includes('data-action="sell"'));
 assert.ok(html.includes('id="position-choice"'));
 assert.ok(!html.includes('event.stopPropagation()'));
});
test('o menu para telemóvel inclui partidas e mais',()=>{
 const s=makeState();const html=shell(s,'dashboard',dashboard(s,ui),'');
 assert.ok(html.includes('class="mobile-nav"'));
 assert.ok(html.includes('data-nav="matches"'));
 assert.ok(html.includes('data-nav="more"'));
});
