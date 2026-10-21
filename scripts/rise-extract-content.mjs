import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const read = name => fs.readFile(new URL('../'+name, import.meta.url), 'utf8');
const write = async (name, data) => {const p=new URL('../data/'+name,import.meta.url);await fs.mkdir(new URL('.',p),{recursive:true});await fs.writeFile(p,JSON.stringify(data)+'\n');};
function literal(source, marker, opener='[') {
  const at=source.indexOf(marker);assert(at>=0,marker);
  const start=source.indexOf(opener,at),closer=opener==='['?']':'}';
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<source.length;i++) {const c=source[i];
    if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"')quoted=true;else if(c===opener)depth++;else if(c===closer&&!--depth)return JSON.parse(source.slice(start,i+1));
  }throw Error('Unterminated '+marker);
}
const html=await read('chronologia.html'),base=literal(html,'const DATA =');
const canonical=new Map(base.filter(x=>x.id>=353&&x.id<=385).map(x=>[x.id,structuredClone(x)]));
const ctx={console,DATA:base,document:{readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},createElement(){return{style:{},appendChild(){}}}},setInterval(){},clearInterval(){},setTimeout(){},CustomEvent:function(){},atob,Blob,DecompressionStream,Response,Uint8Array};ctx.window=ctx;vm.createContext(ctx);
const packNames=['chronologia-v7-data-1.js','chronologia-v7-data-2a.js','chronologia-v7-data-2b.js','chronologia-v7-data-3.js','chronologia-v7-data-4.js','chronologia-v7-overrides.js'];
for(const name of packNames)vm.runInContext(await read(name),ctx,{filename:name});
if(ctx.CHRONO_V7_EXTRA_READY)await ctx.CHRONO_V7_EXTRA_READY;
const force=await read('chronologia-force1000-v1.js');
const curated=[...force.slice(force.indexOf('const CURATED='),force.indexOf('function load(')).matchAll(/\.\/(chronologia-[^?'\s]+\.js)/g)].map(m=>m[1]);
for(const name of curated)vm.runInContext(await read(name),ctx,{filename:name});
const rows=new Map(base.map(x=>[Number(x.id),x]));
const rich=literal(html,'const RICH_NOTES =','{');
for(const pack of ctx.CHRONO_V7_PACKS||[]) {for(const x of pack.items||[])rows.set(Number(x.id),x);Object.assign(rich,pack.notes||{});}
for(const [id,row] of canonical)rows.set(id,row);
Object.assign(rows.get(368),{sort:1971,date:'1971年',event:'ニクソン・ショック',area:'欧米・世界',period:'現代',level:'A',detail:'アメリカがドルと金の交換停止を発表。固定相場制がくずれ、円高・変動相場制へつながった。',tags:['ニクソンショック','世界経済']});
ctx.DATA=[...rows.values()];ctx.RICH_NOTES=rich;
for(const name of ['chronologia-deep-explanations-v3.js','chronologia-deep-polish-v1.js'])vm.runInContext(await read(name),ctx,{filename:name});
ctx.ChronologiaDeepExplanations.build();ctx.ChronologiaDeepPolish.run();
// Keep curated explanations. Do not carry auto-generated same-era boilerplate:
// that engine treated distant ancient events as contemporaneous.
const history=[...rows.values()].map(x=>({...x,note:rich[x.event]||{}})).sort((a,b)=>a.sort-b.sort||a.id-b.id);
assert.equal(history.length,1000);assert.equal(new Set(history.map(x=>x.id)).size,1000);
for(const [id,row] of canonical)if(id!==368)assert.equal(rows.get(id).event,row.event);
await write('history.json',history);
const reviewContext={window:{}};const reviewRaw=await read('review-bank-v1.js');vm.runInNewContext(reviewRaw,reviewContext);
const review=reviewContext.window.AA_REVIEW_BANK;assert.equal(review.length,114);await write('review.json',review);
const manifest=JSON.parse(await read('reading-v2-data/manifest.json'));
const supplements={'batch-1011.json':'supplement-101-106.json','batch-1012.json':'supplement-107-112.json','batch-1013.json':'supplement-113-118.json','batch-1014.json':'supplement-119-124.json','batch-1015.json':'supplement-125-130.json'};
const index=[];
for(const file of manifest.batches){const raw=JSON.parse(await read('reading-v2-data/'+file));const items=Array.isArray(raw)?raw:raw.items;const sup=supplements[file]?JSON.parse(await read('reading-v2-data/'+supplements[file])):{};
 for(const item of items){const extra=sup[item.id]||{},x={...item,passage:[item.passage,extra.passageAppend].filter(Boolean).join('\n\n'),translation:[item.translation,extra.translationAppend].filter(Boolean).join('\n\n')};
 assert(x.passage&&x.translation&&x.title);assert(/^rv3-\d{6}$/.test(x.id));
 const words=x.passage.trim().split(/\s+/).length;await write('reading/'+x.id+'.json',x);index.push({id:x.id,title:x.title,level:x.level,words});}
}
assert.equal(index.length,130);assert.equal(new Set(index.map(x=>x.id)).size,130);await write('reading/index.json',index);
const evidence={baseline:'1a92145',reviewCount:review.length,reviewSourceSha256:crypto.createHash('sha256').update(reviewRaw).digest('hex'),historyCount:history.length,readingCount:index.length,preservedReviewIds:review.map(x=>x.id),preservedHistoryIds:history.map(x=>x.id),canonicalHistoryRange:[353,385],reviewImages:[...new Set(review.filter(x=>x.image).map(x=>x.image))]};
await write('migration-manifest.json',evidence);console.log(JSON.stringify({review:evidence.reviewCount,history:evidence.historyCount,reading:evidence.readingCount,images:evidence.reviewImages.length}));
