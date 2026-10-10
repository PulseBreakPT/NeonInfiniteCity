import test from'node:test';
import assert from'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';
import{createWorld}from'../src/core.js';
import{PACK_COUNT,SHEET_COUNT,tileAsset,createScenery}from'../src/assetpack.js';
test('Premium500 ships 500 uniquely indexed vector items',async()=>{
 const root='assets/premium500/';const manifest=JSON.parse(await readFile(root+'manifest.json','utf8'));
 assert.equal(PACK_COUNT,500);assert.equal(SHEET_COUNT,10);assert.equal(manifest.count,500);assert.equal(manifest.items.length,500);
 assert.equal((await readdir(root+'items')).filter(f=>f.endsWith('.svg')).length,500);
 assert.equal(new Set(manifest.items.map(it=>it.key)).size,500);
 assert.equal(new Set(manifest.items.map(it=>it.file)).size,500);
 for(const a of manifest.items){
  const svg=await readFile(root+a.file,'utf8');
  assert.match(svg,/<svg[^>]+viewBox="0 0 128 128"/);
  assert.ok(svg.length>200,'nonempty original illustration '+a.key);
  assert.equal(a.sheet,Math.floor(a.id/50));
  assert.equal(a.index,a.id%50);
 }
});
test('ten isometric atlases each pack 50 cells and gallery exists',async()=>{
 for(let i=0;i<SHEET_COUNT;i++){
  const atlas=await readFile('assets/premium500/atlases/sheet-'+String(i).padStart(2,'0')+'.svg','utf8');
  assert.match(atlas,/width="1280" height="640"/);
  assert.equal((atlas.match(/<svg x="/g)||[]).length,50);
 }
 assert.match(await readFile('assets/premium500/gallery.html','utf8'),/manifest.json/);
});
test('world dressing is deterministic and terrain uses all 120 indices',()=>{
 const w=createWorld(),a=createScenery(w),b=createScenery(w);
 assert.deepEqual(a,b);assert.ok(a.length>=330,'most set dressing variants should be instantiated');
 assert.ok(a.every(o=>o.id>=120&&o.id<500&&o.x>=0&&o.x<=42&&o.y>=0&&o.y<=42));
 for(const t of Array.from({length:16},(_,i)=>i))for(let hash=0;hash<128;hash++)assert.ok(tileAsset(t,hash)>=0&&tileAsset(t,hash)<120);
});
