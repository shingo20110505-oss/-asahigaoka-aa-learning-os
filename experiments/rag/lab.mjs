import{sourceAnswer}from'./fast-answer.mjs';
import{createResultsView,ARM_LABELS,formatMs,deviceMismatch,VIEW_VERSION}from'./results-view.mjs';
const resultsView=createResultsView();
import{QUESTIONS,HOLDOUT_QUESTIONS,VALIDATION_QUESTIONS,SYSTEM,CONDITIONS,RELEASE_CRITERIA,VERSION}from'./questions.mjs';
import{createStudyIndex}from'./study-search.mjs';
import{retrieve,messagesFor,percentile}from'./retrieval.mjs';
const KEY='rise-rag-lab-v1',models=await(await fetch('./models.json')).json();
let report;try{report=JSON.parse(localStorage.getItem(KEY));}catch{}report??={version:VERSION,runs:[],events:[],criteria:RELEASE_CRITERIA,adopted:false};
report.currentProtocol={version:VERSION,criteria:RELEASE_CRITERIA};report.currentViewVersion=VIEW_VERSION;
let worker,seq=0,pending=new Map(),busy=false,indexPromise;
export function checkpoint(){try{localStorage.setItem(KEY,JSON.stringify(report));}catch(e){report.storageError=e.message;}window.dispatchEvent(new Event('lab-update'));window.labCheckpoint?.(report);}
function phase(text){report.active=text;checkpoint();}
function terminate(){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Object.assign(Error('測定を停止しました'),{partial:p.onDelta?p.partial:undefined}));}pending.clear();}
function call(op,args={},timeout=180000,onDelta=null){
 if(!worker){
  worker=new Worker('./worker.mjs',{type:'module'});
  worker.onmessage=({data:{id,type,value}})=>{
   const p=pending.get(id);if(!p)return;
   if(type==='done'||type==='error'){clearTimeout(p.timer);pending.delete(id);type==='done'?p.resolve(value):p.reject(Object.assign(Error(value.message),{partial:p.onDelta?p.partial:undefined,diagnostic:value}));}
   else{
    if(type==='delta'){p.partial=(p.partial||'')+value;p.onDelta?.(value);}
    if(p.op==='load'&&type==='stage')p.armTimeout(value.name==='runtime'?180000:60000);
    if(p.op==='load'&&type==='progress'&&value.loaded>p.loaded){p.loaded=value.loaded;p.armTimeout(60000);}
    window.dispatchEvent(new CustomEvent('lab-'+type,{detail:value}));
   }
  };
  worker.onerror=e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Object.assign(Error(e.message),{partial:p.onDelta?p.partial:undefined}));}pending.clear();};
 }
 const id=++seq;return new Promise((resolve,reject)=>{
  const p={resolve,reject,onDelta,op,loaded:0,armTimeout(ms){clearTimeout(this.timer);this.timer=setTimeout(()=>{const error=Error(op==='load'?'モデルの読み込みが進まないため停止しました。直前の状態は結果JSONに保存しています。':op+' が時間内に完了しませんでした');error.partial=this.onDelta?this.partial:'';reject(error);terminate();},ms);}};
  pending.set(id,p);p.armTimeout(op==='load'?45000:timeout);worker.postMessage({id,op,args});
 });
}
async function getIndex(){return indexPromise??= (async()=>{const start=performance.now(),response=await fetch('./corpus.json');if(!response.ok)throw Error('教材を読み込めません');const docs=await response.json(),readMs=performance.now()-start,at=performance.now(),index=createStudyIndex(docs);return{index,fetchParseMs:readMs,indexMs:performance.now()-at,count:docs.length};})();}
async function environment(){const a=await navigator.gpu?.requestAdapter().catch(()=>null);return{label:document.querySelector('#device').value,userAgent:navigator.userAgent,platform:navigator.platform,webGPU:!!a,gpu:a?.info?{vendor:a.info.vendor,architecture:a.info.architecture,description:a.info.description}:null,limits:a?{maxBufferSize:a.limits.maxBufferSize,maxStorageBufferBindingSize:a.limits.maxStorageBufferBindingSize}:null,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory??null,storage:await navigator.storage?.estimate?.(),navigatorOnline:navigator.onLine,physicalDeviceSource:'user declaration; browser cannot verify chip or total RAM'};}
export async function prepare(){
 if(!('serviceWorker'in navigator))throw Error('オフライン保存に対応していません');
 const scope=new URL('./',location.href).href,found=await navigator.serviceWorker.getRegistration(scope),saved=found?.scope===scope?found:null;
 // register()/update() can fetch the worker script even when an active worker exists.
 // Reuse that worker without a network request after an offline full-page reload.
 if(!navigator.onLine){if(!saved?.active)throw Error('測定画面が未保存です。一度オンラインで準備してください。');return true;}
 const reg=saved||await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}),previous=!!reg.active;
 try{await reg.update();}catch(e){if(!reg.active)throw e;}
 const w=reg.installing||reg.waiting;
 if(w)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('測定画面の保存が時間内に終わりませんでした')),60000),check=()=>{if(w.state==='activated'){clearTimeout(timer);resolve();}if(w.state==='redundant'){clearTimeout(timer);reject(Error('測定画面を保存できませんでした'));}};w.addEventListener('statechange',check);check();});
 if(previous&&w)throw Error('測定ページを更新しました。再読み込みしてから開始してください。モデルはまだ読み込んでいません。');return true;
}
export async function run({id=models[0].id,searchOnly=false,cachedOnly=false,questionIds=null,gpuLayers=99,forceCompat=false,suite='development'}={}){
 if(busy)throw Error('測定中です');const label=document.querySelector('#device').value;if(!label)throw Error('測定する端末を選んでください');if(deviceMismatch(label))throw Error('このブラウザはiPadではありません。実際に使っている端末を選んでください。');
 const model=models.find(m=>m.id===id);if(!model)throw Error('Unknown model');busy=true;resultsView.clearGeneration();document.querySelector('#progress').textContent='';
 const run={id:crypto.randomUUID(),startedAt:new Date().toISOString(),model:searchOnly?null:model,conditions:{...CONDITIONS,system:SYSTEM,gpuLayers,forceCompat,suite,modelGeneration:model.generation||{}},searchOnly,cachedOnly,viewVersion:VIEW_VERSION,questions:[],status:'running'};report.runs.push(run);checkpoint();
 let lock;try{
  run.environment=await environment();lock=await navigator.wakeLock?.request('screen').catch(()=>null);phase('教材と測定画面を保存しています');await prepare();run.manifest=await(await fetch('./manifest.json')).json();const {index,...timings}=await getIndex();run.index=timings;
  if(!searchOnly){phase('モデルを読み込んでいます（初回は約 '+(model.bytes/1e9).toFixed(2)+' GB）');run.load=await call('load',{model,cachedOnly,gpuLayers,forceCompat,context:CONDITIONS.context,parallel:CONDITIONS.parallel,batch:CONDITIONS.batch},900000);phase('モデルの準備運転をしています（採点対象外）');run.warmup=await call('generate',{messages:[{role:'user',content:'1+1 の答えだけを書いてください。'}]});}
  const bank=suite==='validation'?VALIDATION_QUESTIONS:suite==='holdout'?HOLDOUT_QUESTIONS:QUESTIONS,questions=questionIds?bank.filter(q=>questionIds.includes(q.id)):bank;
  for(let i=0;i<questions.length;i++){
   const q=questions[i],r={id:q.id,subject:q.subject,prompt:q.prompt,rubric:q.rubric,arms:{}};run.questions.push(r);phase((i+1)+' / '+questions.length+'：'+q.subject);
   const retrieved=retrieve(index,q.prompt);r.retrieval=retrieved;r.arms.verbatim={answer:retrieved.text,totalMs:retrieved.ms,firstVisibleMs:retrieved.ms};const fastStart=performance.now(),fast=sourceAnswer(q.prompt,retrieved),policyMs=performance.now()-fastStart;if(fast)r.arms.assisted={answer:fast.text,kind:fast.kind,modelUsed:false,firstVisibleMs:retrieved.ms+policyMs,totalMs:retrieved.ms+policyMs};checkpoint();
   // Alternate order to reduce simple warm/thermal order bias; no conversation/KV reuse.
   for(const arm of searchOnly?[]:(i%2?['rag','none']:['none','rag'])){phase((i+1)+' / '+questions.length+'：'+({rag:'検索＋LLM',none:'検索なし'})[arm]);const messages=messagesFor(q.prompt,arm,retrieved,SYSTEM);(r.prompts??={})[arm]=messages;const append=resultsView.beginGeneration(run.id,q,arm);const a=await call('generate',{messages},180000,append);r.arms[arm]={...a,totalMs:a.totalMs+(arm==='rag'?retrieved.ms:0),firstVisibleMs:a.firstVisibleMs===null?null:a.firstVisibleMs+(arm==='rag'?retrieved.ms:0)};if(arm==='rag'&&!fast)r.arms.assisted={...r.arms.rag,kind:'model',modelUsed:true,totalMs:r.arms.rag.totalMs+policyMs,firstVisibleMs:r.arms.rag.firstVisibleMs===null?null:r.arms.rag.firstVisibleMs+policyMs};checkpoint();}
  }
  run.status='completed';
 }catch(e){run.status='failed';run.error=e.message;if(e.diagnostic)run.errorDiagnostic=e.diagnostic;if(e.partial)run.failedPartial={phase:report.active,answer:e.partial,completed:false};}finally{if(worker)try{await call('unload',{},15000);}catch{}terminate();await lock?.release().catch(()=>{});run.finishedAt=new Date().toISOString();run.summary=summarize(run);report.active=null;busy=false;checkpoint();}return run;
}
export async function inspect(){
 if(busy)throw Error('測定中です');busy=true;const model=models.find(m=>m.id===document.querySelector('#model').value);
 report.inspection={model:model.id,startedAt:new Date().toISOString()};phase('GPU・保存容量・配信元を確認しています');
 try{const checks=await call('inspect',{model,cachedOnly:!navigator.onLine},45000);report.inspection.checks=checks;report.inspection.message='確認完了：GPU '+(checks.webGPU?'対応':'未確認・利用不可')+' / モデル '+(checks.cached?'保存済み':'配信元に接続できました')+' / 実行ライブラリ '+checks.runtimeVersion;}
 catch(e){report.inspection.message=e.message;report.inspection.error=e.diagnostic;}
 finally{terminate();busy=false;report.active=null;checkpoint();document.querySelector('#status').textContent=report.inspection.message;}
}
export function summarize(run){const out={};for(const arm of ['none','verbatim','rag','assisted']){const values=run.questions.map(q=>q.arms[arm]).filter(Boolean);out[arm]={count:values.length,firstMedianMs:percentile(values.map(x=>x.firstVisibleMs),.5),firstP95Ms:percentile(values.map(x=>x.firstVisibleMs),.95),totalMedianMs:percentile(values.map(x=>x.totalMs),.5),totalP95Ms:percentile(values.map(x=>x.totalMs),.95),accuracy:null,note:'正確さは未採点。キーワード一致率を正答率にはしません。'};}return out;}
export function stop(){terminate();}
export function exportJSON(){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rise-rag-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export async function clearModel(){if(busy)throw Error('先に停止してください');terminate();const{ModelManager}=await import('./vendor/wllama/index.js');for(const m of await new ModelManager({allowOffline:true}).getModels()){if(models.some(x=>x.url===m.url))await m.remove();}report.events.push({type:'models-cleared',at:new Date().toISOString()});checkpoint();}
if(report.active){report.events.push({type:'interrupted',phase:report.active,at:new Date().toISOString(),note:'原因はタブ終了、OS終了、メモリ不足などを判別できません'});const last=report.runs.at(-1);if(last?.status==='running')last.status='interrupted';report.active=null;checkpoint();}
window.lab={models,run,stop,prepare,exportJSON,clearModel,inspect,get report(){return report;},get busy(){return busy;}};
document.addEventListener('visibilitychange',()=>{if(busy){report.events.push({type:'visibility',value:document.visibilityState,at:new Date().toISOString()});checkpoint();}});
document.querySelector('#model').innerHTML=models.map(m=>'<option value="'+m.id+'">'+m.name+'（'+(m.bytes/1e9).toFixed(2)+' GB）</option>').join('');
document.querySelector('#model').value='gemma4-e2b-q4';
const button=(id,fn)=>document.querySelector('#'+id).addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>{document.querySelector('#status').textContent=e.message;}));
const selection=()=>({id:document.querySelector('#model').value,suite:document.querySelector('#suite').value});
button('inspect',inspect);
button('smoke',()=>run({...selection(),suite:'development',questionIds:['g2','k1','e1'],cachedOnly:!navigator.onLine}));
button('start',()=>run({...selection(),cachedOnly:!navigator.onLine}));button('search',()=>run({...selection(),searchOnly:true}));button('offline',()=>run({...selection(),cachedOnly:true}));button('stop',stop);button('export',exportJSON);button('clear',clearModel);
function render(){
 const latest=report.runs.at(-1),selected=resultsView.render(report,busy);
 document.querySelector('#status').textContent=report.active||latest?.error||(latest?.status==='completed'?'測定完了。回答を比較し、結果JSONを保存できます。':latest?.status==='interrupted'?'前回の測定は途中で中断しました。直前の状態は結果JSONに残っています。':'準備できています。');
 for(const id of ['inspect','smoke','start','search','offline','clear','device','model','suite'])document.querySelector('#'+id).disabled=busy;
 document.querySelector('#result').textContent=selected?.summary?Object.entries(selected.summary).filter(([,x])=>x.count).map(([arm,x])=>ARM_LABELS[arm]+'（'+x.count+'問）\n回答開始：中央値 '+formatMs(x.firstMedianMs)+'\n完了：中央値 '+formatMs(x.totalMedianMs)+' / 95%点 '+formatMs(x.totalP95Ms)+'\n正確さ：未採点').join('\n\n'):selected?'測定中：'+selected.questions.length+'問目':'';
}
window.addEventListener('lab-update',render);window.addEventListener('lab-stage',e=>{if(e.detail.name!=='download')document.querySelector('#progress').textContent='';const run=report.runs.at(-1);if(run?.status==='running'){(run.loadStages??=[]).push(e.detail);}phase(e.detail.message);});
window.addEventListener('lab-checks',e=>{const run=report.runs.at(-1);if(run?.status==='running'){run.loadChecks=e.detail;run.conditions.effectiveLoadOptions=e.detail.loadOptions;}checkpoint();});
window.addEventListener('lab-logs',e=>{const run=report.runs.at(-1);if(run?.status==='running'){run.loadLog=e.detail;checkpoint();}});
window.addEventListener('pagehide',e=>{if(busy){report.events.push({type:'pagehide',persisted:e.persisted,phase:report.active,at:new Date().toISOString()});checkpoint();}});
let lastProgressSave=0;
window.addEventListener('lab-progress',e=>{const p=e.detail,run=report.runs.at(-1);document.querySelector('#progress').textContent=p.total?Math.floor(p.loaded/p.total*100)+'% · '+(p.loaded/1e6).toFixed(1)+' / '+(p.total/1e6).toFixed(1)+' MB':'受信済み '+(p.loaded/1e6).toFixed(1)+' MB';if(run?.status==='running'){run.loadProgress={...p,at:new Date().toISOString()};if(Date.now()-lastProgressSave>2000){lastProgressSave=Date.now();checkpoint();}}});render();
