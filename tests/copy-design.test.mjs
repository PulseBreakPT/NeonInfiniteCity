import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeState} from '../model.js';
import {welcome,navItems,shell} from '../ui-core.js';
import {roomScene} from '../scene-ui.js';
import {dashboard} from '../ui-main.js';
import {training,social,market,more} from '../ui-extra.js';
const state=()=>makeState('Aurora FC','Lisboa','#caff69');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('O ecrã inicial mostra o jogo, não slogans',()=>{
 const s=state(),html=shell(s,'dashboard',dashboard(s));
 for(const phrase of ['O TEU UNIVERSO','CONSTRÓI O TEU LEGADO','MANAGER CONSOLE','SISTEMAS ATIVOS','MANAGER DATA','A tua equipa. As tuas decisões.']){
  assert.ok(!html.toUpperCase().includes(phrase.toUpperCase()),'Copy redundante: '+phrase);
 }
 assert.ok(html.includes('scene-hotspot'));
 assert.ok(html.includes('data-action="match"'));
});
test('As salas de gestão não repetem introduções decorativas',()=>{
 const s=state();
 for(const id of ['league','market','training','academy','campus','finance','mentors','events','collection','profile','social','club','more']){
  const scene=roomScene(id,s);
  assert.ok(scene.includes('class="room-score"'),id);
  assert.equal((scene.match(/data-nav="/g)||[]).length,2,id);
  assert.ok(!scene.includes('room-orbit'),id);
  assert.ok(!scene.includes('room-pretitle'),id);
  assert.ok(!scene.includes('CLUB DATA'),id);
 }
});
test('Os treinos usam ícones consistentes e mostram custos e limites',()=>{
 const html=training(state());
 for(const emoji of ['🎯','⚡','🛡️','🤝','🧊'])assert.ok(!html.includes(emoji));
 assert.ok(html.includes('3 sessões por jornada'));
 assert.ok(html.includes('€'));
 assert.ok(html.includes('data-action="train"'));
});
test('Amigáveis mostram apenas jogos disponíveis com IA',()=>{
 const html=social(state());
 assert.ok(html.includes('data-action="friendly"'));
 assert.ok(!html.includes('Confederações'));
 assert.ok(!html.includes('Modo online ainda não disponível'));
 assert.ok(html.includes('SEM EFEITO NA CLASSIFICAÇÃO'));
});
test('As operações continuam acessíveis e sem duplicar nomes primários',()=>{
 const labels=navItems().map(x=>x[2]);
 assert.equal(new Set(labels).size,labels.length);
 const html=more(state());
 assert.ok(html.includes('data-nav="market"'));
 assert.ok(html.includes('data-nav="academy"'));
 assert.ok(html.includes('data-nav="finance"'));
});
test('Primeira utilização contém informações concretas sobre o save',()=>{
 const html=welcome();
 assert.ok(html.includes('30 jornadas'));
 assert.ok(html.includes('26 jogadores'));
 assert.ok(html.includes('guardado neste dispositivo'));
 assert.ok(html.includes('id="create-form"'));
});
test('Impeccable é parte do repositório e do workflow de qualidade',()=>{
 const html=read('index.html'),sw=read('sw.js'),css=read('styles-v12.css');
 const product=read('PRODUCT.md'),design=read('DESIGN.md'),agent=read('.agents/skills/impeccable/SKILL.md');
 const workflow=read('.github/workflows/pages.yml'),pkg=JSON.parse(read('package.json'));
 assert.ok(html.includes('styles-v12.css'));
 assert.ok(sw.includes('styles-v12.css'));
 assert.ok(css.includes('styles-v11.css'));
 assert.ok(product.length>300&&design.length>300&&agent.length>300);
 assert.ok(workflow.includes('Impeccable design scan'));
 assert.ok(pkg.scripts['design:install'].includes('impeccable@4.5.2'));
});
