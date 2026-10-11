import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeState} from '../model.js';
import {roomScene} from '../scene-ui.js';
import {dashboard,matches} from '../ui-main.js';
import {shell} from '../ui-core.js';

const load=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const state=()=>makeState('Aurora FC','Lisboa','#cbfc8e');

test('cinematic stadium headquarters contains five active in-world locations',()=>{
 const s=state(),html=dashboard(s);
 assert.ok(html.includes('universe-stage'));
 assert.equal((html.match(/class="scene-hotspot /g)||[]).length,5);
 for(const destination of ['matches','tactics','training','market','academy']){
  assert.ok(html.includes('data-nav="'+destination+'"'));
 }
 assert.ok(html.includes('class="home-team-vs"'));
 assert.ok(html.includes('class="home-module-grid command-grid"'));
});
test('12 management rooms and operations map have distinct scenes and valid links',()=>{
 const s=state();
 const rooms=['league','market','training','academy','campus','finance','mentors','events','collection','profile','social','club','more'];
 const names=new Set();
 for(const page of rooms){
  const html=roomScene(page,s);
  assert.ok(html.includes('class="room-scene room-'+page+'"'),page);
  assert.ok(html.includes('class="room-score"'),page);
  assert.equal((html.match(/data-nav="/g)||[]).length,2,page);
  const name=html.match(/<h2>([^<]+)<\/h2>/)?.[1];
  assert.ok(name);names.add(name);
 }
 assert.equal(names.size,rooms.length);
});
test('live match has functional input destinations for replay and speed',()=>{
 const s=state(),before=matches(s);
 assert.ok(before.includes('id="match-timeline"'));
 assert.ok(before.includes('data-action="replay-pause"'));
 assert.ok(before.includes('data-action="replay-speed"'));
 assert.ok(before.includes('data-action="replay"'));
 assert.ok(before.includes('class="pitch-camera-frame"'));
 assert.ok(before.includes('class="broadcast-banner"'));
});
test('shell retains single page frame and accessible mobile game controls',()=>{
 const s=state(),html=shell(s,'dashboard',dashboard(s));
 assert.ok(html.includes('class="app-shell game-shell elite-shell"'));
 assert.ok(html.includes('class="main-frame game-canvas"'));
 assert.ok(html.includes('class="mobile-nav"'));
 for(const to of ['dashboard','matches','tactics','squad','more']){
  assert.ok(html.includes('data-nav="'+to+'"'));
 }
 assert.ok(html.includes('PROGRESSO')||html.includes('SAVE LOCAL AUTOMÁTICO'));
});
test('all new design resources are packaged for offline use',()=>{
 const index=load('index.html'),sw=load('sw.js'),css=load('styles-v4.css'),asset=load('assets/stadium-isometric.svg'),pkg=JSON.parse(load('package.json'));
 assert.ok(index.includes('styles-v5.css'));
 assert.ok(sw.includes('styles-v5.css'));
 assert.ok(sw.includes('stadium-isometric.svg'));
 assert.ok(sw.includes('scene-ui.js'));
 assert.ok(css.includes('.scene-hotspot'));
 assert.ok(css.includes('.room-scene'));
 assert.ok(css.includes('.match-timeline'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(asset.startsWith('<svg')&&asset.endsWith('</svg>'));
 assert.ok(pkg.scripts.check.includes('scene-ui.js'));
});
test('room scenes escape user-controlled names and metrics',()=>{
 const s=state();
 s.coach.name='<img src=x onerror=alert(1)>';
 s.club.name='<script>alert(1)</script>';
 const html=shell(s,'dashboard',dashboard(s));
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});
