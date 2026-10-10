import{rm,mkdir,cp,writeFile}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','style.css','src','assets'])await cp(path,'dist/'+path,{recursive:true});
await writeFile('dist/.nojekyll','');await import('./pack-assets.mjs');console.log('Static game built in dist/. All assets use relative URLs.');
