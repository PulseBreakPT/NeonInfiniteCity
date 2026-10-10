import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../game-shell.css',import.meta.url),'utf8');
const script=readFileSync(new URL('../src/game-ui.js',import.meta.url),'utf8');
test('six navigation modules exist as accessible game buttons',()=>{
  for(const tab of ['life','actions','people','career','finance','systems'])
    assert.match(html,new RegExp(`data-tab="${tab}"`));
  assert.match(html,/aria-label="Ecrãs do jogo"/);
});
test('life engine and save controls retain their integration targets',()=>{
  for(const id of ['game-screen','create-screen','create-form','profile-card','profile-avatar','stats','content-panel','nav','age-btn','cash','wealth','settings-btn','modal-backdrop','gameover-screen','toast'])
    assert.ok(html.includes(`id="${id}"`),`Missing required ID ${id}`);
});
test('fullscreen layout blocks vertical scroll and browser pinch zoom',()=>{
  assert.match(html,/user-scalable=no/);
  assert.match(css,/overflow:hidden!important/);
  assert.match(script,/gesturestart/);
  assert.match(script,/preventDefault/);
});
test('category and pagination controls are connected',()=>{
  for(const id of ['stage-pager','page-prev','page-next','page-label'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(script,/MutationObserver/);
  assert.match(script,/turnPage/);
  assert.match(script,/sim-action/);
});
test('persistent engine files are loaded without replacing gameplay logic',()=>{
  assert.match(html,/src="\.\/src\/app\.js"/);
  assert.match(html,/src="\.\/src\/game-ui\.js"/);
  assert.match(html,/href="\.\/game-shell\.css"/);
});
