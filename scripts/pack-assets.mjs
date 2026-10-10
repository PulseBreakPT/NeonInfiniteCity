// Build a downloadable ZIP of 500 individual SVGs, 10 atlas sheets and metadata.
// ZIP format: DEFLATE, original CRC-32, UTF-8 paths. Node 20+, no npm packages.
import{readFile,writeFile}from'node:fs/promises';
import{deflateRawSync}from'node:zlib';
const root='dist/assets/premium500/';
const manifest=JSON.parse(await readFile(root+'manifest.json','utf8'));
if(manifest.count!==500||manifest.items.length!==500)throw Error('Premium500 manifest is incomplete.');
const names=[
 ...manifest.items.map(x=>x.file),
 ...Array.from({length:10},(_,i)=>'atlases/sheet-'+String(i).padStart(2,'0')+'.svg'),
 'manifest.json','README.md','gallery.html'
];
const table=new Uint32Array(256);
for(let i=0;i<256;i++){let n=i;for(let j=0;j<8;j++)n=n&1?0xEDB88320^(n>>>1):n>>>1;table[i]=n>>>0;}
function crc32(data){let value=0xffffffff;for(const n of data)value=table[(value^n)&255]^(value>>>8);return(value^0xffffffff)>>>0;}
const locals=[],centrals=[];let position=0;
for(const name of names){
 const filename=Buffer.from('PREMIUM500/'+name,'utf8');
 const bytes=await readFile(root+name),compressed=deflateRawSync(bytes,{level:9}),crc=crc32(bytes);
 const local=Buffer.alloc(30+filename.length);
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);
 local.writeUInt16LE(8,8);local.writeUInt16LE(0x0021,12);local.writeUInt32LE(crc,14);
 local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);filename.copy(local,30);
 const dir=Buffer.alloc(46+filename.length);
 dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);
 dir.writeUInt16LE(0x800,8);dir.writeUInt16LE(8,10);dir.writeUInt16LE(0x0021,14);
 dir.writeUInt32LE(crc,16);dir.writeUInt32LE(compressed.length,20);dir.writeUInt32LE(bytes.length,24);
 dir.writeUInt16LE(filename.length,28);dir.writeUInt32LE(position,42);filename.copy(dir,46);
 locals.push(local,compressed);centrals.push(dir);position+=local.length+compressed.length;
}
const centralSize=centrals.reduce((sum,part)=>sum+part.length,0);
const end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(names.length,8);end.writeUInt16LE(names.length,10);
end.writeUInt32LE(centralSize,12);end.writeUInt32LE(position,16);
const zip=Buffer.concat([...locals,...centrals,end]);
if(zip.readUInt32LE(zip.length-22)!==0x06054b50||zip.readUInt16LE(zip.length-12)!==513)throw Error('Premium500 ZIP validation failed.');
await writeFile(root+'PREMIUM500.zip',zip);
console.log('PREMIUM500.zip: '+names.length+' files, '+(zip.length/1024).toFixed(1)+' KiB');
