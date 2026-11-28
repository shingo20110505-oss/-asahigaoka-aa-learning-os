import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {historyAdditions} from '../src/history-content.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});const nested=await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]));return nested.flat();}
const files=await walk(out),allowedRoots=new Set(['src','data','icons','assets','review','reading-v2','labs']);
const allowedFiles=new Set(['index.html','update.html','manifest.webmanifest','version.json','sw.js','.nojekyll','chronologia.html','review-bank-v1.js','DEPLOY_STATUS.txt','PUBLIC_VERIFY_STATUS.txt']);
for(const file of files){const relative=path.relative(out,file),parts=relative.split(path.sep);assert.ok(parts.length===1?allowedFiles.has(parts[0]):allowedRoots.has(parts[0]),'Unexpected published path: '+relative);assert.ok(!/\.(php|env|pem|key|toml|ya?ml)$/i.test(file),'Private/configuration file in dist: '+relative);}
const json=async file=>JSON.parse(await fs.readFile(path.join(out,file),'utf8'));
const [englishBytes,englishParts,englishVersion,englishMetadata]=await Promise.all([
 fs.readFile(path.join(out,'data/english/words.json')),json('data/english/words-parts.json'),json('data/english/version.json'),json('data/english/metadata.json')
]);
const englishHash=createHash('sha256').update(englishBytes).digest('hex'),englishWords=JSON.parse(englishBytes.toString('utf8'));
const baseVersion=JSON.parse(await fs.readFile(path.join(root,'data/english/version.json'),'utf8'));
assert.equal(englishParts.sha256,baseVersion.words.sha256,'Canonical split data hash differs from base version');
assert.equal(englishHash,englishVersion.words.sha256,'Published English dictionary differs from advertised version');
assert.equal(englishWords.length,englishVersion.words.entries,'Published English dictionary count differs from advertised version');
assert.equal(englishBytes.length,englishVersion.words.bytes);
assert.equal(englishWords.filter(word=>word.verbForms).length,englishMetadata.counts.verbParadigms);
assert.ok(englishWords.length>englishParts.totalEntries);
assert.equal(englishWords.length,englishMetadata.counts.headwords,'Published English dictionary count differs from metadata');
for(const kind of ['word','phrase'])assert.equal(englishWords.filter(word=>word.kind===kind).length,englishMetadata.counts.kind[kind],'Published English '+kind+' count differs from metadata');
const manifest=await json('data/migration-manifest.json'),review=await json('data/review.json'),history=await json('data/history.json'),reading=await json('data/reading/index.json');
for(const file of ['review/index.html','review-bank-v1.js','DEPLOY_STATUS.txt','PUBLIC_VERIFY_STATUS.txt'])assert.ok((await fs.readFile(path.join(out,file))).equals(await fs.readFile(path.join(root,file))), 'Canonical review or verification file changed in build: '+file);
const reviewUI=await fs.readFile(path.join(out,'review/index.html'),'utf8');
assert.ok(reviewUI.includes('Review v2')&&reviewUI.includes("fetch('../review-bank-v1.js'"),'Review v2 must not be replaced by a redirect');
const reviewBank=await fs.readFile(path.join(out,'review-bank-v1.js'),'utf8');
assert.ok(reviewBank.includes('en-in-the-sky-over-place-20261123'),'Latest dedicated review entry missing');
assert.equal(review.length,114);assert.equal(history.length,1000+historyAdditions);assert.equal(reading.length,150);
for(let n=1;n<=130;n++)assert.ok(reading.some(x=>x.id==='rv3-'+String(n).padStart(6,'0')),'Missing original reading '+n);
assert.deepEqual(review.map(x=>x.id).sort(),manifest.preservedReviewIds.slice().sort());
assert.equal(new Set(history.map(x=>x.id)).size,history.length);
for(const id of manifest.preservedHistoryIds)assert.ok(history.some(x=>x.id===id),`Missing original history ${id}`);
assert.deepEqual(history.filter(x=>x.id<=1000).map(x=>x.id).sort((a,b)=>a-b),manifest.preservedHistoryIds.slice().sort((a,b)=>a-b));
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

const search=await json('data/material-search.json');
assert.equal(search.schema,1);
assert.equal(search.counts.english,englishWords.length);
assert.ok(search.documents.some(document=>document.category==='english' && document.title==='fall through' && document.body.includes('fell through')));
assert.equal(search.counts.reading,reading.length);assert.equal(search.documents.filter(d=>d.category==='history'&&!d.id.startsWith('history:trail-')).length,history.length);assert.equal(search.counts.review,review.length);
assert.equal(new Set(search.documents.map(d=>d.id)).size,search.documents.length);
assert.ok(search.documents.every(d=>!['notes','materials','cards'].includes(d.category)),'Private content must not ship in search');
