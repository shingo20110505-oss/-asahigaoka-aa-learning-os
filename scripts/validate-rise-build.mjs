import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});const nested=await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]));return nested.flat();}
const files=await walk(out),allowedRoots=new Set(['src','data','icons','assets','review','reading-v2','labs']);
const allowedFiles=new Set(['index.html','update.html','manifest.webmanifest','version.json','sw.js','.nojekyll','chronologia.html']);
for(const file of files){const relative=path.relative(out,file),parts=relative.split(path.sep);assert.ok(parts.length===1?allowedFiles.has(parts[0]):allowedRoots.has(parts[0]),'Unexpected published path: '+relative);assert.ok(!/\.(php|env|pem|key|toml|ya?ml)$/i.test(file),'Private/configuration file in dist: '+relative);}
const json=async file=>JSON.parse(await fs.readFile(path.join(out,file),'utf8'));
const manifest=await json('data/migration-manifest.json'),review=await json('data/review.json'),history=await json('data/history.json'),reading=await json('data/reading/index.json');
assert.equal(review.length,114);assert.equal(history.length,1000);assert.equal(reading.length,150);
for(let n=1;n<=130;n++)assert.ok(reading.some(x=>x.id==='rv3-'+String(n).padStart(6,'0')),'Missing original reading '+n);
assert.deepEqual(review.map(x=>x.id).sort(),manifest.preservedReviewIds.slice().sort());
assert.deepEqual(history.map(x=>x.id).sort((a,b)=>a-b),manifest.preservedHistoryIds.slice().sort((a,b)=>a-b));
for(const name of ['rise-apple-touch-icon-180','rise-icon-192','rise-icon-512','rise-icon-maskable-512','rise-favicon-32']){const file='icons/'+name+'-20260905-v5.png';assert.ok((await fs.readFile(path.join(out,file))).equals(await fs.readFile(path.join(root,file))),'Logo was changed');}
for(const image of manifest.reviewImages){assert.ok((await fs.readFile(path.join(out,image))).equals(await fs.readFile(path.join(root,'review',image))),'Review image was changed');}
const webmanifest=await json('manifest.webmanifest');for(const icon of webmanifest.icons)await fs.access(path.join(out,icon.src));
assert.ok(!(await fs.readFile(path.join(out,'sw.js'),'utf8')).includes('__VERSION__'));
const worker=await fs.readFile(path.join(out,'sw.js'),'utf8'),offline=JSON.parse(worker.match(/SHELL=(\[[^\n]+\]);/)[1]);
const {version}=await json('version.json');
for(const file of ['index.html','src/index.html','update.html','src/update.html'])assert.match(await fs.readFile(path.join(out,file),'utf8'),new RegExp('name="rise-build" content="'+version+'"'),'Mismatched app build');
for(const file of files){const rel=path.relative(out,file).replaceAll('\\','/');if(!['sw.js','version.json','.nojekyll'].includes(rel)&&!rel.startsWith('labs/'))assert.ok(offline.includes('./'+rel),'Missing offline material: '+rel);}
assert.ok(!offline.some(p=>p.startsWith('./labs/')),'Lab must not download in the ordinary app');
const labSW=await fs.readFile(path.join(out,'labs/rag/sw.js'),'utf8');assert.ok(!labSW.includes('__VERSION__'));
assert.ok(!files.some(p=>/\.gguf$/.test(p)),'Model weights must not ship in Pages');
assert.equal(new Set(offline).size,offline.length);assert.ok(offline.every(x=>!/(api\/|setup|\.rise-private|bridge\/)/.test(x)),'Private route in offline cache');
console.log(JSON.stringify({checkedFiles:files.length,preserved:{review:review.length,history:history.length,reading:reading.length},logo:'byte-identical',privateBridge:'excluded'}));
