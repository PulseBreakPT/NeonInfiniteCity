import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeState} from '../model.js';
import {shell,welcome,navItems} from '../ui-core.js';
import {dashboard,matches,tactics,squad} from '../ui-main.js';
import {league,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more} from '../ui-extra.js';

const state=()=>makeState('Atlético Nova Era','Lisboa','#caf35b');
const ui={slot:null,player:null,search:'',position:'ALL',color:'#caf35b'};
test('the game uses an immersive, complete HUD with clear navigation',()=>{
 const s=state(),html=shell(s,'dashboard',dashboard(s),'');
 assert.ok(html.includes('class="app-shell game-shell"'));
 assert.ok(html.includes('class="top-bar game-hud"'));
 assert.ok(html.includes('class="game-ribbon"'));
 assert.ok(html.includes('class="game-statusline"'));
 assert.ok(html.includes('class="mobile-nav"'));
 for(const page of ['dashboard','matches','tactics','squad','more'])assert.ok(html.includes('data-nav="'+page+'"'));
 assert.ok(html.includes(s.club.name));
});
test('matchday home presents rival, stadium and a direct play action',()=>{
 const s=state(),html=dashboard(s);
 assert.ok(html.includes('class="home-stadium"'));
 assert.ok(html.includes('class="home-team-vs"'));
 assert.ok(html.includes('data-action="match"'));
 assert.ok(html.includes('class="home-module-grid"'));
 assert.ok(html.includes('data-nav="league"'));
});
test('roster is composed of football player cards, not a spreadsheet',()=>{
 const s=state(),html=squad(s,ui);
 assert.ok(html.includes('class="player-deck"'));
 assert.equal((html.match(/class="football-card"/g)||[]).length,s.players.length);
 assert.ok(html.includes('data-action="show-player"'));
 assert.ok(html.includes('class="football-portrait"'));
 assert.ok(html.includes('id="player-filter"'));
});
test('all 16 management modules remain accessible after the redesign',()=>{
 const s=state(),all={dashboard,matches,tactics,squad,league,market,training,academy,campus,finance,mentors,events,collection,profile,social,club,more};
 assert.equal(navItems().length,16);
 for(const [key,fn] of Object.entries(all)){
  const html=fn(s,ui);
  assert.ok(html.length>450,key+' view is empty');
  assert.ok(html.includes('page-title'),key+' missing title');
 }
});
test('player deck safely escapes custom player names',()=>{
 const s=state();
 s.players[0].name='<script>alert(1)</script>';
 const html=squad(s,ui);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('premium design assets are wired and included in the offline cache',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles-v3.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const svg=readFileSync(new URL('../assets/stadium.svg',import.meta.url),'utf8');
 assert.ok(html.includes('./styles-v3.css'));
 assert.ok(css.includes('styles-v2.css'));
 assert.ok(css.includes('.game-hud.top-bar'));
 assert.ok(css.includes('.football-card'));
 assert.ok(css.includes('.home-stadium'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(sw.includes('styles-v3.css'));
 assert.ok(sw.includes('assets/stadium.svg'));
 assert.ok(svg.startsWith('<svg')&&svg.endsWith('</svg>'));
});
test('onboarding still creates a playable club with no online dependency',()=>{
 const html=welcome();
 assert.ok(html.includes('id="create-form"'));
 assert.ok(html.includes('name="name"'));
 assert.ok(html.includes('name="city"'));
 assert.ok(html.includes('data-color='));
});
