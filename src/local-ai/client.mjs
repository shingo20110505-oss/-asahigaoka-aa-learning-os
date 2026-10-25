import {MODELS,DEFAULT_MODEL,RUNTIME_VERSION,RELEASE_MODEL_IDS,modelById,normalizeMessages} from './models.mjs';
import {detectSupport,inspectModelCache} from './cache.mjs';
import {STUDY_CASES,scoreAnswer,chooseRecommendation,median} from './quality.mjs';
const SELECTION='rise-local-ai-model-v1',REPORT='rise-local-ai-report-v1',VALIDATION='rise-local-ai-validation-v1',TERMS='rise-local-ai-gemma-terms-2026-04-01';
const abortError=()=>new DOMException('処理を中止しました。','AbortError');
const loadStored=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const saveStored=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
export function explainLocalAIError(error){const s=String(error?.message||error);if(/out.of.memory|device.*lost|allocation|buffer.*size|memory access/i.test(s))return 'GPUの空きメモリが不足しました。他のアプリを閉じるか、軽いモデルを選んでください。';if(/fetch|network|cache.add|load failed|HTTP|CORS|Failed to execute.*add/i.test(s))return 'モデルの取得に失敗しました。通信を確認して、もう一度準備してください。';return s.slice(0,300);}

export class LocalAIClient{
 constructor({workerFactory=()=>new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),support=detectSupport,inspect=inspectModelCache}={}){this.workerFactory=workerFactory;this.support=support;this.inspect=inspect;this.worker=null;this.loadedModel=null;this.pending=null;this.serial=0;this.benchmarking=false;this.lastError='';}
 notify(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('rise:local-ai'));}
 selected(){const id=loadStored(SELECTION);return MODELS.some(m=>m.id===id)?id:DEFAULT_MODEL;}
 report(){return loadStored(REPORT);}
 termsAccepted(){return loadStored(TERMS)===true;}
 acceptTerms(){saveStored(TERMS,true);this.notify();}
 validated(model){const entry=loadStored(VALIDATION)?.[model];return RELEASE_MODEL_IDS.includes(model)&&!!entry&&entry.runtime===RUNTIME_VERSION&&entry.revision===modelById(model).revision&&entry.passed===true;}
 async status(){const capability=await this.support();const entries=await Promise.all(MODELS.map(async m=>({model:m.id,...await this.inspect(m.id)})));const installed=entries.filter(e=>e.complete).map(e=>e.model),validated=installed.filter(id=>this.validated(id)&&(!modelById(id).license||this.termsAccepted()));const preferred=this.selected(),selectedModel=validated.includes(preferred)?preferred:validated[0]||preferred;return {...capability,releaseAvailable:RELEASE_MODEL_IDS.length>0,installed,validated,cache:entries,selectedModel,ready:capability.supported&&validated.includes(selectedModel),loadedModel:this.loadedModel,busy:!!this.pending||this.benchmarking,error:this.lastError};}
 ensureWorker(){if(this.worker)return;this.worker=this.workerFactory();this.worker.onmessage=({data})=>{const task=this.pending;if(!task||task.id!==data.id)return;if(data.type==='progress')task.onProgress?.(data.data);else if(data.type==='delta')task.onDelta?.(data.data.delta);else if(data.type==='done')task.resolve(data.data);else if(data.type==='error')task.reject(Error(explainLocalAIError(data.data.message)));};this.worker.onerror=()=>{this.pending?.reject(Error('端末内AIを起動できませんでした。ページを再読み込みしてください。'));this.destroy();};}
 destroy(){this.worker?.terminate();this.worker=null;this.loadedModel=null;}
 async call(type,payload,{signal,onProgress,onDelta,timeout=120000}={}){
  if(this.pending)throw Error('端末内AIが処理中です。');if(signal?.aborted)throw abortError();
  this.ensureWorker();const id=++this.serial;let timer,abort;
  try{return await new Promise((resolve,reject)=>{this.pending={id,resolve,reject,onProgress,onDelta};abort=()=>{reject(abortError());this.destroy();};signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{reject(Error('端末内AIの処理が時間内に終わりませんでした。軽いモデルを選んでお試しください。'));this.destroy();},timeout);this.notify();this.worker.postMessage({id,type,payload});});}
  catch(error){this.lastError=explainLocalAIError(error);this.destroy();throw error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);this.pending=null;this.notify();}
 }
 checkBusy(internal){if(this.pending||this.benchmarking&&!internal)throw Error('端末内AIの比較・処理が進行中です。');}
 async prepare(model=this.selected(),{onProgress,signal,cachedOnly=false,internal=false}={}){
  this.checkBusy(internal);modelById(model);const capability=await this.support();if(!capability.supported)throw Error(capability.reason);
  if(modelById(model).license&&!this.termsAccepted())throw Error('Gemmaの利用規約を確認し、同意してから準備してください。');
  if(signal?.aborted)throw abortError();
  const cached=await this.inspect(model);if(cachedOnly&&!cached.complete)throw Error('この端末にモデルが保存されていません。オンラインで端末内AIを準備してください。');
  if(!internal&&!RELEASE_MODEL_IDS.includes(model))throw Error('このモデルは日本語の回答確認を通過していないため、通常のチャットでは使えません。');
  if(!internal&&!this.validated(model)){
   if(cachedOnly)throw Error('このモデルは、この端末での回答確認がまだ済んでいません。端末内AIの設定で準備してください。');
   const report=await this.benchmark({modelIds:[model],onProgress,signal});
   if(report.recommendation!==model)throw Error('このモデルは日本語の回答確認を通過しませんでした。別のモデルを比較してください。');
   return this.prepare(model,{onProgress,signal,cachedOnly:true});
  }
  this.checkBusy(internal);
  if(this.loadedModel===model&&cached.complete){if(!internal)saveStored(SELECTION,model);return {model,cached:true};}
  this.destroy();this.lastError='';
  if(!cachedOnly)try{await navigator.storage?.persist?.();}catch{}
  const start=performance.now();await this.call('prepare',{model,cachedOnly},{onProgress,signal,timeout:cachedOnly?180000:900000});
  this.loadedModel=model;const stored=await this.inspect(model);if(!stored.complete){this.destroy();throw Error('モデルを保存できませんでした。端末の空き容量を確認してください。');}
  if(!internal)saveStored(SELECTION,model);this.notify();return {model,cached:cached.complete,loadMs:performance.now()-start};
 }
 async generate(messages,{onDelta,signal,maxTokens=384,internal=false}={}){
  this.checkBusy(internal);const normalized=normalizeMessages(messages);
  if(!internal&&this.loadedModel&&!this.validated(this.loadedModel))throw Error('このモデルは日本語の回答確認を通過していないため、通常のチャットでは使えません。');
  if(!this.loadedModel){const state=await this.status();if(!state.ready)throw Error('端末内AIをオンラインで準備してください。');await this.prepare(state.selectedModel,{cachedOnly:true,signal,internal});}
  const result=await this.call('generate',{messages:normalized.messages,maxTokens:Math.max(32,Math.min(768,Math.floor(maxTokens)||384))},{signal,onDelta,timeout:180000});return {...result,contextTruncated:normalized.contextTruncated};
 }
 async unload(){if(this.pending){this.pending.reject(abortError());this.destroy();return;}if(this.worker)try{await this.call('unload',{}, {timeout:4000});}catch{}this.destroy();this.notify();}
 async remove(model){this.checkBusy();const m=modelById(model);if(this.loadedModel===model)await this.unload();const validation=loadStored(VALIDATION)||{};delete validation[model];saveStored(VALIDATION,validation);for(const scope of ['webllm/model','webllm/config','webllm/wasm']){const cache=await caches.open(scope);for(const request of await cache.keys())if(request.url.startsWith(m.model)||request.url===m.model_lib)await cache.delete(request);}this.notify();}
 async benchmark({modelIds=MODELS.map(m=>m.id),onProgress,signal}={}){
  this.checkBusy();this.benchmarking=true;this.notify();
  try{
   const capability=await this.support();const report={schema:1,runtime:RUNTIME_VERSION,createdAt:new Date().toISOString(),environment:{userAgent:globalThis.navigator?.userAgent||'',...capability},screening:'固定6問の語句照合による簡易判定。入試全般の正確さの保証ではありません。',results:[],recommendation:null};
   if(!capability.supported)throw Error(capability.reason);
   for(const model of modelIds){if(signal?.aborted)throw abortError();modelById(model);const result={model,cases:[],offlineVerified:false,state:'running'};report.results.push(result);saveStored(REPORT,report);onProgress?.({stage:'model',model,text:modelById(model).name+'を準備しています'});
    try{
     const prepared=await this.prepare(model,{signal,internal:true,onProgress:p=>onProgress?.({stage:'load',model,...p})});result.loadMs=prepared.loadMs??0;result.wasCached=prepared.cached;
     for(const test of STUDY_CASES){onProgress?.({stage:'question',model,test:test.id,text:`${result.cases.length+1}/${STUDY_CASES.length}問を確認しています`});const answer=await this.generate([{role:'user',content:test.prompt}],{signal,internal:true,maxTokens:220});result.cases.push({id:test.id,prompt:test.prompt,answer:answer.text,...answer.metrics,quality:scoreAnswer(test,answer.text)});saveStored(REPORT,report);}
     await this.unload();onProgress?.({stage:'offline',model,text:'通信なしの再起動を確認しています'});
     // A new worker is loaded with all network reads disabled, so this checks durable restart.
     const offline=await this.prepare(model,{signal,cachedOnly:true,internal:true});const reply=await this.generate([{role:'user',content:'1 + 1 の答えを数字だけで答えてください。'}],{signal,internal:true,maxTokens:32});result.offlineVerified=!!reply.text.trim();result.offlineSmokePassed=/2|２/.test(reply.text);result.offlineReloadMs=offline.loadMs;result.offlineAnswer=reply.text;
     result.medianFirstTokenMs=median(result.cases.map(c=>c.firstTokenMs));result.medianTotalMs=median(result.cases.map(c=>c.totalMs));result.passed=result.cases.filter(c=>c.quality.passed).length;
     result.state='complete';
    }catch(error){result.state=error.name==='AbortError'?'cancelled':'error';result.error=explainLocalAIError(error);saveStored(REPORT,report);if(error.name==='AbortError')throw error;}
    finally{await this.unload();}
    const validation=loadStored(VALIDATION)||{};validation[model]={runtime:RUNTIME_VERSION,revision:modelById(model).revision,passed:chooseRecommendation([result])===model,at:new Date().toISOString()};saveStored(VALIDATION,validation);
    saveStored(REPORT,report);onProgress?.({stage:'result',model,result});
   }
   report.screeningCandidate=chooseRecommendation(report.results);report.recommendation=RELEASE_MODEL_IDS.includes(report.screeningCandidate)?report.screeningCandidate:null;if(report.recommendation)saveStored(SELECTION,report.recommendation);saveStored(REPORT,report);return report;
  }finally{this.destroy();this.benchmarking=false;this.notify();}
 }
}
export const localAI=new LocalAIClient();
