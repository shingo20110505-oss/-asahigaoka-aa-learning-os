// Supplemental long-context and cache-lifecycle tests. Uses the same isolated profile.
import fs from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import{createRequire}from'node:module';import{serve,root}from'./serve.mjs';
const{chromium}=createRequire(import.meta.url)(process.env.RISE_PLAYWRIGHT_MODULE||'C:/Users/shing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js');
const{server,url}=await serve();let browser;const mode=process.argv[2]||'context',ids=process.argv.slice(3);const out=path.join(root,'results',`supplement-${mode}.json`),results=[];
try{
 browser=await chromium.launchPersistentContext(process.env.RISE_BENCH_PROFILE||path.join(root,'profile'),{channel:'chrome',headless:true,args:['--enable-unsafe-webgpu']});const page=await browser.newPage();await page.goto(url);await page.waitForFunction(()=>!!window.lab);await page.locator('#device').fill('Windows desktop / Ryzen 5 7535U / Radeon / Chrome; NOT an iPad');
 for(const id of ids){console.log('START',mode,id);let result;
  if(mode==='context')result=await page.evaluate(id=>window.lab.contextProbe(id),id);
  else if(mode==='delete'){
   result=await page.evaluate(async id=>{const inventory=async()=>{const entries=[];for(const name of await caches.keys())if(name.startsWith('webllm/'))entries.push(...await(await caches.open(name)).keys());return Object.fromEntries(window.lab.manifest.models.filter(m=>m.runtime==='webllm').map(m=>[m.id,entries.filter(r=>r.url.startsWith(m.model)||r.url===m.model_lib).length]));};const{ModelManager}=await import('./vendor/wllama/index.js');const urls=async()=>(await new ModelManager({allowOffline:true}).getModels()).map(m=>m.url).sort();const model=window.lab.manifest.models.find(m=>m.id===id),before=await navigator.storage.estimate(),beforeEntries=await inventory(),beforeGGUF=await urls();const c=await caches.open('a16-test-unrelated');await c.put('./keep',new Response('keep'));await window.lab.clearModel(id);const after=await navigator.storage.estimate(),afterEntries=await inventory(),afterGGUF=await urls();const retained=await(await c.match('./keep')).text();const offline=await window.lab.offlineProbe(id);return{id,model,before,after,beforeEntries,afterEntries,beforeGGUF,afterGGUF,unrelatedCacheRetained:retained==='keep',offline};},id);
   assert.equal(result.unrelatedCacheRetained,true);assert.equal(result.offline.completed,false);
   for(const [other,count]of Object.entries(result.beforeEntries))assert.equal(result.afterEntries[other],other===id?0:count,'Unrelated model entries changed');
   assert.deepEqual(result.afterGGUF,result.beforeGGUF.filter(url=>url!==result.model.url),'Unrelated GGUF model changed');
   if(result.model.runtime==='webllm')assert.ok(result.beforeEntries[id]>0,'No populated cache to delete');else assert.ok(result.beforeGGUF.includes(result.model.url),'No GGUF to delete');
   result.assertionsPassed=true;
  }
  else throw Error('Unknown probe');
  results.push(result);await fs.writeFile(out,JSON.stringify({mode,results},null,2));console.log(JSON.stringify({id,completed:result.completed,error:result.error,answer:result.result?.answer,metrics:result.result&&{firstTokenMs:result.result.firstTokenMs,totalMs:result.result.totalMs,tokens:result.result.usage},offline:result.offline?.completed}));
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
