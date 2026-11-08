import{SYSTEM,QUESTIONS,LONG_PROMPTS}from'./questions.mjs';
export const manifest=await(await fetch('./models.json')).json();
let worker=null,sequence=0,pending=new Map(),busy=false,activeModel=null;
const KEY='rise-a16-lab-v1';
export let report=JSON.parse(localStorage.getItem(KEY)||'null')||{schema:1,date:'2026-10-26',runs:[],events:[],physicalA16Verified:false};
export function checkpoint(){try{localStorage.setItem(KEY,JSON.stringify(report));}catch(e){report.persistenceError=e.message;}window.dispatchEvent(new Event('lab-update'));window.labCheckpoint?.(report);}
function event(type,data){report.events.push({at:new Date().toISOString(),type,...data});checkpoint();}
export async function environment(){
 const a=await navigator.gpu?.requestAdapter().catch(()=>null);const info=a?.info;
 return{userAgent:navigator.userAgent,platform:navigator.platform,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory??null,maxTouchPoints:navigator.maxTouchPoints,secureContext:isSecureContext,crossOriginIsolated,webAssembly:typeof WebAssembly==='object',webGPU:!!a,gpu:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,features:a?[...a.features]:[],limits:a?{maxBufferSize:a.limits.maxBufferSize,maxStorageBufferBindingSize:a.limits.maxStorageBufferBindingSize,maxStorageBuffersPerShaderStage:a.limits.maxStorageBuffersPerShaderStage}:null,storage:await storage(),memory:memory(),physicalDevice:document.querySelector('#device')?.value||'unspecified; UA is not hardware proof'};
}
export async function storage(){return navigator.storage?.estimate?await navigator.storage.estimate().catch(e=>({error:e.message})):null;}
function memory(){return performance.memory?{jsUsedHeapBytes:performance.memory.usedJSHeapSize,jsHeapLimitBytes:performance.memory.jsHeapSizeLimit,note:'JS heap only; excludes GPU/native allocations'}:null;}
function spawn(){
 worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=({data:{id,type,value}})=>{const p=pending.get(id);if(type==='done'||type==='error'){if(p){clearTimeout(p.timer);pending.delete(id);type==='done'?p.resolve(value):p.reject(Error(value.message));}}else if(type==='progress'){window.dispatchEvent(new CustomEvent('lab-progress',{detail:value}));}else if(type==='delta'){window.dispatchEvent(new CustomEvent('lab-delta',{detail:value}));}else if(type==='log'){event('runtime-log',{value});}};
 worker.onerror=e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(e.message));}pending.clear();};
}
function call(op,args={},timeout=180000){if(!worker)spawn();const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,timer:setTimeout(()=>{pending.delete(id);reject(Error(op+' timed out'));terminate('timeout');},timeout)});worker.postMessage({id,op,args});});}
export function terminate(reason='user-stop'){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(reason));}pending.clear();activeModel=null;}
async function unload(){if(worker){try{await call('unload',{},15000);}finally{terminate('unloaded');}}}
function modelById(id){const m=manifest.models.find(x=>x.id===id);if(!m)throw Error('Unknown model');return m;}
export async function load(id,{cachedOnly=false}={}){if(location.hostname==='shingo20110505-oss.github.io')throw Error('Run this lab on a separate origin from production. Production intentionally purges retired WebLLM caches.');await unload();const m=modelById(id);const result=await call('load',{model:m,cachedOnly},900000);activeModel=id;return result;}
async function answer(messages,maxTokens=256){return await call('generate',{messages,maxTokens},240000);}
export async function run(id){
 if(busy)throw Error('A test is already running');busy=true;
 const run={id,startedAt:new Date().toISOString(),model:modelById(id),environment:await environment(),conditions:{temperature:0.2,top_p:0.9,seed:42,maxTokens:256,context:4096,system:SYSTEM,thinking:id.startsWith('Qwen3')?false:'not specified',kvReuse:false,...(modelById(id).runtime==='wllama'?{n_threads:1,n_gpu_layers:modelById(id).n_gpu_layers,cache_prompt:false}:{})},questions:[],longConversation:[],status:'running'};report.runs.push(run);report.active={id,phase:'load'};checkpoint();
 try{
  run.load=await load(id);run.storageAfterLoad=await storage();run.memoryAfterLoad=memory();checkpoint();
  run.warmup=await answer([{role:'system',content:SYSTEM},{role:'user',content:'1+1 の答えだけを書いてください。'}],32);checkpoint();
  for(const q of QUESTIONS){report.active={id,phase:q.id};checkpoint();const a=await answer([{role:'system',content:SYSTEM},{role:'user',content:q.prompt}]);run.questions.push({...q,...a});checkpoint();}
  const messages=[{role:'system',content:SYSTEM}];
  for(const prompt of LONG_PROMPTS){report.active={id,phase:'long-conversation'};messages.push({role:'user',content:prompt});checkpoint();const a=await answer(messages);run.longConversation.push({prompt,...a});messages.push({role:'assistant',content:a.answer});checkpoint();}
  // A controlled worker teardown tests recovery; it is not evidence of an actual OS OOM.
  terminate('controlled-termination');run.controlledRecovery={load:await load(id,{cachedOnly:true}),answer:await answer([{role:'user',content:'1+1 の答えだけを書いてください。'}],32)};
  run.status='completed';
 }catch(e){run.error=e.message;run.status='failed';}finally{await unload().catch(e=>event('unload-error',{message:e.message}));run.storageAfter=await storage();run.finishedAt=new Date().toISOString();report.active=null;busy=false;checkpoint();}
 return run;
}
export async function offlineProbe(id){
 if(busy)throw Error('A test is already running');busy=true;const probe={id,startedAt:new Date().toISOString(),navigatorOnline:navigator.onLine,environment:await environment(),networkControl:'worker blocks external fetch; for full-page proof also disable network before reloading'};report.offline??=[];report.offline.push(probe);checkpoint();
 try{probe.load=await load(id,{cachedOnly:true});probe.answer=await answer([{role:'system',content:SYSTEM},{role:'user',content:'光合成で取り入れる気体と出す気体は何ですか。短く答えてください。'}],96);probe.completed=true;}catch(e){probe.completed=false;probe.error=e.message;}finally{await unload().catch(()=>{});busy=false;checkpoint();}return probe;
}
export async function chat(id,text){
 if(busy)throw Error('A test is already running');if(!text.trim())throw Error('質問を入力してください');busy=true;
 report.interactive??=[];let session=report.interactive.at(-1);if(!session||session.id!==id){session={id,messages:[{role:'system',content:SYSTEM}],turns:[]};report.interactive.push(session);}
 report.active={id,phase:'interactive'};checkpoint();
 try{if(activeModel!==id)session.lastLoad=await load(id,{cachedOnly:true});const messages=[...session.messages,{role:'user',content:text}];const a=await answer(messages);session.messages=[...messages,{role:'assistant',content:a.answer}];session.turns.push({prompt:text,...a});return a;}
 catch(e){session.error=e.message;throw e;}finally{report.active=null;busy=false;checkpoint();}
}
export function clearChat(){if(busy)throw Error('Stop first');terminate('new-chat');report.interactive??=[];report.interactive.push({id:null,messages:[],turns:[]});checkpoint();}
export async function contextProbe(id){
 if(busy)throw Error('A test is already running');busy=true;
 const messages=[{role:'system',content:SYSTEM},{role:'user',content:'最初の約束を記憶してください。合言葉は「青いノート」。一次関数 y=2x+1 で x=-3 のとき y=-5 です。最後にこの2点を質問します。'},{role:'assistant',content:'合言葉と計算結果を確認しました。'}];
 for(let i=1;i<=20;i++)messages.push({role:'user',content:`復習記録${i}。学習では、問題文に示された条件を整理し、式の意味を確認してから計算します。答えが出たら単位と符号を確かめ、元の式に代入して検算します。分からない箇所は教科書に戻って確認します。今日は、この順序を守ってノートに途中式を残しました。`},{role:'assistant',content:`記録${i}を確認しました。条件整理、計算、検算の順序ですね。`});
 messages.push({role:'user',content:'最初に伝えた合言葉と、x=-3 のときの y の値を答えてください。短く答えてください。'});
 const test={id,kind:'synthetic 21-turn history retention; prior assistant turns are fixtures, not model-generated',messages,environment:await environment()};report.contextTests??=[];report.contextTests.push(test);report.active={id,phase:'long-context'};checkpoint();
 try{test.load=await load(id,{cachedOnly:true});test.result=await answer(messages,96);test.completed=true;}catch(e){test.completed=false;test.error=e.message;}finally{await unload().catch(()=>{});report.active=null;busy=false;checkpoint();}return test;
}
export async function clearModel(id){if(busy)throw Error('Stop the current test first');await unload();const m=modelById(id),before=await storage();if(m.runtime==='webllm'){for(const name of await caches.keys()){if(!name.startsWith('webllm/'))continue;const cache=await caches.open(name);for(const request of await cache.keys()){if(request.url.startsWith(m.model)||request.url===m.model_lib)await cache.delete(request);}}}else{const{ModelManager}=await import('./vendor/wllama/index.js');const manager=new ModelManager({allowOffline:true});const models=await manager.getModels();for(const x of models){if(x.url===m.url)await x.remove();}}event('cache-delete',{id,before,after:await storage()});}
export function exportJSON(){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rise-a16-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export function resetReport(){if(busy)throw Error('Stop first');report={schema:1,date:'2026-10-26',runs:[],events:[],physicalA16Verified:false};checkpoint();}
export async function prepareShell(){if(!('serviceWorker'in navigator))throw Error('Service Worker unavailable');await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));return true;}
addEventListener('visibilitychange',()=>event('visibility',{state:document.visibilityState}));
if(report.active){event('interrupted-session',{previous:report.active,note:'Page exited during work; OOM, tab close and OS termination are not distinguishable here'});report.active=null;checkpoint();}
window.lab={manifest,run,offlineProbe,chat,clearChat,contextProbe,environment,clearModel,terminate,exportJSON,prepareShell,resetReport,get report(){return report;}};
