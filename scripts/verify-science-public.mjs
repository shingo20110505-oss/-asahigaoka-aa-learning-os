import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const [baseArg,sha]=process.argv.slice(2);if(!baseArg||!sha)throw new Error('usage: node scripts/verify-science-public.mjs <base> <source-sha>');
const base=baseArg.endsWith('/')?baseArg:baseArg+'/';
async function get(path){const r=await fetch(new URL(path+'?verify='+encodeURIComponent(sha),base),{cache:'no-store'});assert.equal(r.ok,true,path+' HTTP '+r.status);return r.text()}
for(const path of ['science-exam/core.mjs','science-exam/generator.mjs','science-exam/bridge.js','v23-loader.js']){
 const [publicText,localText]=await Promise.all([get(path),readFile(path,'utf8')]);
 const h=x=>createHash('sha256').update(x).digest('hex');assert.equal(h(publicText),h(localText),path+' sha256 mismatch');
}
const loader=await get('v23-loader.js');assert.match(loader,/science-exam\/bridge\.js/);
const bridge=await get('science-exam/bridge.js');assert.match(bridge,/legacyGenericFallback:false/);assert.match(bridge,/makeScienceQ=function/);
const core=await get('science-exam/core.mjs');assert.match(core,/totalPoints:22/);assert.match(core,/questionCount:20/);assert.match(core,/deterministic-recompute/);
const gen=await get('science-exam/generator.mjs');assert.match(gen,/buildExam/);assert.match(gen,/earth_humidity/);assert.match(gen,/phy_circuit/);
console.log(JSON.stringify({ok:true,sourceSha:sha,checks:['exact-sha256','loader-route','no-legacy-fallback','20q-22pt-profile','deterministic-recompute']}));
