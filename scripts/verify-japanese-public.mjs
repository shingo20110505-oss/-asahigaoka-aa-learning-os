import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {starterPacks} from '../japanese-exam/starter-packs.mjs';
import {assertPack,scoreExam} from '../japanese-exam/core.mjs';
const base=new URL(process.argv[2]||'https://shingo20110505-oss.github.io/-asahigaoka-aa-learning-os/');
const revision=process.argv[3]||Date.now().toString();
const assets=['japanese-exam/index.html','japanese-exam/app.mjs','japanese-exam/core.mjs','japanese-exam/starter-packs.mjs','japanese-exam/prompts.mjs','japanese-exam/bridge.js','japanese-exam/style.css','japanese-exam/catalog.json','japanese-exam/generation-status.json','v23-loader.js'];
const digest=x=>createHash('sha256').update(x).digest('hex');
const hashes={};
for(const asset of assets){
  const expected=await fs.readFile(asset),url=new URL(asset,base);url.searchParams.set('verify',revision);
  const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('public_http:'+asset+':'+r.status);
  if(asset.endsWith('.mjs')&&!/(java|ecma)script/i.test(r.headers.get('content-type')||''))throw Error('invalid_module_mime:'+asset);
  const received=Buffer.from(await r.arrayBuffer());hashes[asset]=digest(received);
  if(hashes[asset]!==digest(expected))throw Error('public_hash_mismatch:'+asset);
}
for(const pack of starterPacks){assertPack(pack);const responses=Object.fromEntries(pack.questions.map(q=>[q.id,q.marks?Object.fromEntries(q.marks.map(m=>[m.id,m.answer])):q.answers]));if(scoreExam(pack.questions,responses).earned!==22)throw Error('scoring');}
const catalog=JSON.parse(await fs.readFile('japanese-exam/catalog.json','utf8'));
for(const e of catalog.entries){if(!/^[a-f0-9]{64}$/.test(e.sha256)||e.path!==`items/${e.sha256}.json`)throw Error('invalid_catalog');const r=await fetch(new URL('japanese-exam/'+e.path+'?verify='+revision,base),{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('item_http');const bytes=Buffer.from(await r.arrayBuffer());if(digest(bytes)!==e.sha256)throw Error('item_hash');assertPack(JSON.parse(bytes.toString('utf8')));}
console.log(JSON.stringify({result:'success',source_sha:revision,page_url:new URL('japanese-exam/',base).href,checks:'public-assets-sha256,module-mime,full-scoring,choice-evidence,import-catalog',packs:starterPacks.length+catalog.entries.length,builtInQuestions:starterPacks.flatMap(p=>p.questions).length,hashes}));
