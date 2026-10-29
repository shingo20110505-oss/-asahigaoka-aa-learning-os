import{splitGGUF}from'./gguf-parts.mjs';
import{probeModelSource,loadFailure}from'./load-checks.mjs';
import{READ_PATCH_VERSION,MAX_READ_BYTES}from'./runtime-read-patch.mjs';
let engine,generation={},runtimeLogs=[],loadStage='idle';
const send=(id,type,value)=>postMessage({id,type,value});
const stage=(id,name,message)=>{loadStage=name;send(id,'stage',{name,message,at:new Date().toISOString()});};
onmessage=async({data:{id,op,args={}}})=>{try{
 if(op==='load'||op==='inspect'){
  generation=args.model.generation||{};
  if(args.cachedOnly){const original=fetch;self.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.origin!==location.origin)throw Error('Offline guard: model network disabled');return original(input,init);};}
  stage(id,'environment','GPU・保存容量・保存済みモデルを確認しています');
  let runtime=await import('./vendor/wllama/index.js'),folder='vendor',runtimeVersion='3.8.1';
  let lastLogSent=0;
  const logs=runtimeLogs=[],log=(...x)=>{const line=x.join(' ');if(/gpu|buffer|backend|memory|error|thread|abort|file|load|tensor/i.test(line)){logs.push(line);if(logs.length>80)logs.shift();if(loadStage==='runtime'&&(Date.now()-lastLogSent>500||/error|abort|out of memory/i.test(line))){lastLogSent=Date.now();send(id,'logs',{at:new Date().toISOString(),lines:[...logs]});}}};
  const config=()=>({default:new URL('./'+folder+'/wllama/wasm/wllama.wasm',location.href).href});
  let manager=new runtime.ModelManager({allowOffline:true,parallelDownloads:1});
  const create=()=>{const e=new runtime.Wllama(config(),{modelManager:manager,logger:{debug:log,log,warn:log,error:log}});e.setCompat({wasm:new URL('./'+folder+'/compat/wllama.wasm',location.href).href,worker:new URL('./'+folder+'/compat/wllama.js',location.href).href});return e;};
  engine=create();
  const compat=!!args.forceCompat||engine.getWorkerResources().compat;
  if(compat){
   // 3.8.1 compat fails our Gemma load/warmup regression; both the matched
   // 3.6.1 runtime and valid GGUF parts are required by the regression evidence.
   runtime=await import('./vendor-safari/wllama/index.js');folder='vendor-safari';runtimeVersion='3.6.1';
   manager=new runtime.ModelManager({allowOffline:true,parallelDownloads:1});engine=create();
   if(args.forceCompat)engine.getWorkerResources=()=>({wasmPath:new URL('./vendor-safari/compat/wllama.wasm',location.href).href,jsPath:new URL('./vendor-safari/compat/wllama.js',location.href).href,compat:true});
  }
  const saved=(await manager.getModels()).find(m=>m.url===args.model.url);
  const storage=await navigator.storage?.estimate?.().catch(()=>null);
  const adapter=await navigator.gpu?.requestAdapter().catch(()=>null);
  const loadOptions={n_ctx:args.context??2048,n_parallel:args.parallel??1,n_threads:1,n_gpu_layers:args.gpuLayers===0?0:99,n_batch:compat?Math.min(args.batch??512,128):args.batch??512,n_ubatch:compat?32:args.batch??512,seed:42};
  const checks={runtimeVersion,compat,forcedCompat:!!args.forceCompat,cached:!!saved,webGPU:!!adapter,storage:storage||null,readPatch:compat?READ_PATCH_VERSION:null,maxReadBytes:compat?MAX_READ_BYTES:null,loadOptions};
  send(id,'checks',checks);
  if(!saved){
   if(args.cachedOnly)throw Error('このモデルはまだ端末に保存されていません。一度オンラインで測定してください。');
   if(storage&&Number.isFinite(storage.quota)&&Number.isFinite(storage.usage)&&storage.quota-storage.usage<args.model.bytes+32*1024*1024)throw Error('モデルを保存する空き容量が足りません。');
   stage(id,'connection','モデル配信元への接続を確認しています');checks.connection=await probeModelSource(args.model.url);send(id,'checks',checks);
  }
  if(op==='inspect'){send(id,'done',checks);engine=null;return;}
  const start=performance.now();
  stage(id,'download',saved?'保存済みモデルを開いています':'モデルをダウンロードして保存しています');
  const model=saved||await manager.getModelOrDownload({url:args.model.url},{progressCallback:p=>send(id,'progress',p)});
  stage(id,'open','保存済みモデルのデータを開いています');
  let blobs=await model.open(),parts=null;
  if(compat&&blobs.length===1&&blobs[0].size>=2**31){
   stage(id,'parts','大きなモデルを互換形式で開いています（再ダウンロードなし）');
   const split=await splitGGUF(blobs[0]);blobs=split.parts;parts={count:blobs.length,tensorCount:split.tensorCount,largestPartBytes:split.largestPartBytes,metadataBytesWritten:split.metadataBytesWritten,metadataBytesSaved:split.metadataBytesSaved,method:split.method};
  }
  checks.parts=parts;send(id,'checks',checks);
  stage(id,'runtime',compat?'モデルを少量ずつGPU・メモリに読み込んでいます':'モデルをGPU・メモリに読み込んでいます');
  await engine.loadModel(blobs,loadOptions);
  send(id,'logs',{at:new Date().toISOString(),lines:[...logs]});
  const meta=engine.getModelMetadata();
  if(!meta.meta?.['general.architecture'])throw Error('モデルの起動に失敗しました。'+(logs.findLast(x=>/error loading model/i.test(x))||''));
  stage(id,'ready','モデルの読み込みが完了しました');
  send(id,'done',{ms:performance.now()-start,logs,...checks,parts,webGPUSupported:engine.isSupportWebGPU(),modelMetadata:{name:meta.meta?.['general.name'],architecture:meta.meta?.['general.architecture'],fileType:meta.meta?.['general.file_type']}});
 }else if(op==='generate'){
  const start=performance.now();let answer='',firstVisibleMs=null,usage,finishReason;
  const stream=await engine.createChatCompletion({messages:args.messages,temperature:0.2,top_p:0.9,seed:42,max_tokens:512,stream:true,cache_prompt:false,...generation});
  for await(const chunk of stream){const delta=chunk.choices?.[0]?.delta?.content||'';if(delta){answer+=delta;if(firstVisibleMs===null&&answer.trim())firstVisibleMs=performance.now()-start;send(id,'delta',delta);}if(chunk.usage)usage=chunk.usage;if(chunk.choices?.[0]?.finish_reason)finishReason=chunk.choices[0].finish_reason;}
  send(id,'done',{answer,firstVisibleMs,totalMs:performance.now()-start,usage,finishReason});
 }else if(op==='unload'){await engine?.exit();engine=null;send(id,'done',true);}
 else throw Error('Unknown operation');
 }catch(e){send(id,'error',{message:loadFailure(e.message,runtimeLogs),rawMessage:e.message,stack:e.stack,stage:loadStage,logs:runtimeLogs});}};
