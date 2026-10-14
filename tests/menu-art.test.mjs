import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeState} from '../model.js';
import {navItems,gameArt,shell} from '../ui-core.js';
import {more} from '../ui-extra.js';
import {dashboard} from '../ui-main.js';

const ids=navItems().map(([id])=>id);
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all sixteen navigation rooms have their own real transparent image asset',()=>{
 assert.equal(ids.length,16);
 assert.equal(new Set(ids).size,16);
 for(const id of [...ids,'more']){
  const path='assets/ui-icons/'+id+'.svg';
  assert.ok(fs.existsSync(new URL('../'+path,import.meta.url)),path+' missing');
  const art=read(path);
  assert.match(art,/^<svg /);
  assert.match(art,/viewBox="0 0 96 96"/);
  assert.match(art,/<linearGradient/);
  assert.ok(!art.includes('<image '),'Raster embed not expected in vector art');
  assert.ok(!art.includes('<rect width="96" height="96"'),'Art should have transparent background');
  assert.ok(!art.toLowerCase().includes('<text'),'Keep the icon text-free');
 }
});
test('navigation image art is accessible, whitelisted and brand-independent',()=>{
 const s=makeState('Desportivo Faro','Faro');
 const html=shell(s,'tactics','<p>Teste</p>');
 assert.ok(html.includes('src="./assets/ui-icons/tactics.svg"'));
 assert.ok(html.includes('src="./assets/ui-icons/matches.svg"'));
 assert.ok(html.includes('src="./assets/ui-icons/club.svg"'));
 assert.ok(html.includes('src="./assets/ui-icons/finance.svg"'));
 assert.ok(html.includes('class="game-art"'));
 assert.ok(html.includes('aria-label="Táticas"'));
 assert.ok(html.includes('alt="" aria-hidden="true"'));
 assert.ok(!gameArt('../../danger',30).includes('../danger'));
 assert.ok(gameArt('../../danger',30).includes('more.svg'));
});
test('mobile navigation and all 16 operations use proper room artwork',()=>{
 const s=makeState();
 const html=shell(s,'more',more(s));
 for(const id of ids)assert.ok(html.includes('src="./assets/ui-icons/'+id+'.svg"'),'No artwork for '+id);
 assert.match(html,/<nav class="mobile-nav"/);
 assert.ok(html.includes('src="./assets/ui-icons/more.svg"'));
 assert.ok(html.includes('class="more-tile"'));
});
test('stadium shortcuts replace generic svg nav symbols with object art',()=>{
 const html=dashboard(makeState(),{slot:null,player:null,search:'',position:'ALL'});
 assert.match(html,/class="game-art"/);
 assert.match(html,/module-symbol/);
});
test('offline cache and visual stylesheet include every menu icon',()=>{
 const sw=read('sw.js'),html=read('index.html'),css=read('styles-v14.css');
 for(const id of [...ids,'more']){
  assert.ok(sw.includes('./assets/ui-icons/'+id+'.svg'),'Missing offline icon: '+id);
  if(id!=='dashboard')assert.ok(css.includes('data-screen="'+id+'"'),'Missing page title icon: '+id);
 }
 assert.ok(sw.includes('./styles-v14.css'));
 assert.ok(html.includes('href="./styles-v14.css"'));
 assert.ok(css.includes('@media(max-width:850px)'));
 assert.ok(css.includes('prefers-reduced-motion'));
});
