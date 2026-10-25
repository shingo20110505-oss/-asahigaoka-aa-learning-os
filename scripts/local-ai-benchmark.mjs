// Read-only browser evaluation harness. Weights remain in a temporary browser profile, never in Git.
// Usage: node scripts/local-ai-benchmark.mjs [output.json] [model-id]
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dep=process.env.RISE_PLAYWRIGHT_MODULE||'C:/Users/shing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js';
const {chromium}=createRequire(import.meta.url)(dep);
const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>RISE device benchmark</title><link rel="stylesheet" href="/src/styles.css"><main id="main"></main><script type="module">import{mount}from"/src/views/device-ai.mjs";mount({main:document.getElementById("main")});</script>');return;}const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep))throw Error('path');const bytes=await fs.readFile(target);res.setHeader('Content-Type',name.endsWith('.mjs')||name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(4322,'127.0.0.1',r));
const profile=process.env.RISE_BENCH_PROFILE||path.join(process.env.TEMP||root,'rise-local-ai-benchmark-profile');
let browser;
try{
 browser=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1280,height:900},args:['--enable-unsafe-webgpu'],timeout:30000});
 const page=await browser.newPage();page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER',msg.text().slice(0,350));});
 page.on('pageerror',error=>console.log('PAGEERROR',error.message));
 await page.goto('http://127.0.0.1:4322/');
 await page.exposeFunction('benchProgress',p=>console.log(JSON.stringify({time:new Date().toISOString(),...p})));
 if(process.env.RISE_BENCH_UI_ONLY){await page.getByRole('heading',{name:'端末内AIの検証',exact:true}).waitFor();const desktop=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));await page.setViewportSize({width:390,height:844});await page.getByText('この端末で比較する（実験用）',{exact:true}).click();const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));console.log(JSON.stringify({desktop,mobile,modelWeightsDownloaded:false}));await page.screenshot({path:path.resolve(process.argv[2]||'docs/local-ai-device-ui.png'),fullPage:true});}else{
 const report=await page.evaluate(async({model,control})=>{const{localAI}=await import('/src/local-ai/client.mjs');localAI.acceptTerms();if(control){const results=[];await localAI.prepare(model,{cachedOnly:true,internal:true});for(const prompt of ['What gas do plants absorb during photosynthesis? Answer briefly in English.','光合成で植物が吸収する気体は何ですか。短く答えてください。','Explain the meaning of although briefly in English.','although の日本語の意味は？']){const raw=await localAI.call('generate',{messages:[{role:'user',content:prompt}],maxTokens:128});results.push({prompt,...raw});window.benchProgress(results.at(-1));}await localAI.unload();return {control:true,results};}return await localAI.benchmark({...(model?{modelIds:model.split(',')}:{}),onProgress:p=>{if(p.stage!=='load'||Math.round(p.progress*100)%10===0)window.benchProgress(p);}});},{model:process.argv[3],control:!!process.env.RISE_BENCH_CONTROL});
 const output=path.resolve(process.argv[2]||'docs/local-ai-pc-benchmark.json');await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));await page.screenshot({path:output.replace(/\.json$/i,'.png'),fullPage:true});
 console.log(JSON.stringify({output,recommendation:report.recommendation,results:report.results.map(({model,loadMs,passed,medianFirstTokenMs,medianTotalMs,offlineVerified,error})=>({model,loadMs,passed,medianFirstTokenMs,medianTotalMs,offlineVerified,error}))},null,2));
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
