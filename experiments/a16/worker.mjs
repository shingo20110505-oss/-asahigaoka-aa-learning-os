let engine,model,backend,runtimeLogs=[];
const send=(id,type,value)=>postMessage({id,type,value});
self.onmessage=async({data:{id,op,args}})=>{
 try{
  if(op==='load'){
   model=args.model;backend=model.runtime;runtimeLogs=[];
   if(args.cachedOnly){const original=fetch;self.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin)throw Error('Offline guard blocked network: '+url.href);return original(input,init);};Cache.prototype.add=async()=>{throw Error('Offline guard blocked Cache.add');};Cache.prototype.addAll=async()=>{throw Error('Offline guard blocked Cache.addAll');};}
   const start=performance.now();
   if(backend==='webllm'){
    const {MLCEngine}=await import('./vendor/webllm.mjs');
    engine=new MLCEngine({appConfig:{cacheBackend:'cache',model_list:[model]},initProgressCallback:p=>send(id,'progress',p)});
    await engine.reload(model.id,{context_window_size:4096});
   }else{
    const {Wllama,ModelManager}=await import('./vendor/wllama/index.js');
    const log=(...s)=>{const line=s.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');if(/gpu|offload|buffer|backend|memory|error|thread/i.test(line)){runtimeLogs.push(line);if(runtimeLogs.length>100)runtimeLogs.shift();}};
    engine=new Wllama({default:new URL('./vendor/wllama/wasm/wllama.wasm',location.href).href},{modelManager:new ModelManager({allowOffline:args.cachedOnly}),logger:{debug:log,log,warn:log,error:log}});
    // Compatibility kernels are selected on Safari; they are not enabled by UA spoofing.
    if(/Safari/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent))engine.setCompat('default','firefox_safari');
    await engine.loadModelFromUrl(model.url,{n_ctx:4096,n_threads:1,n_gpu_layers:model.n_gpu_layers,n_batch:128,n_ubatch:128,seed:42,useCache:true,progressCallback:p=>send(id,'progress',p)});
   }
   send(id,'done',{loadMs:performance.now()-start,backend,context:4096,...(backend==='wllama'?{webGPUSupported:engine.isSupportWebGPU(),runtimeLogs,nGpuLayersRequested:model.n_gpu_layers,nThreadsRequested:1}:{})});
  }else if(op==='generate'){
   if(backend==='webllm')await engine.resetChat();
   let answer='',firstTokenMs=null,firstVisibleTokenMs=null,usage=null,finishReason=null,timings=null;const start=performance.now();
   const options={messages:args.messages,temperature:0.2,top_p:0.9,seed:42,max_tokens:args.maxTokens??256,stream:true};
   const stream=backend==='webllm'?await engine.chat.completions.create({...options,stream_options:{include_usage:true},...(model.id.startsWith('Qwen3')?{extra_body:{enable_thinking:false}}:{})}):await engine.createChatCompletion({...options,cache_prompt:false});
   for await(const chunk of stream){const delta=chunk.choices?.[0]?.delta?.content||'';if(delta){if(firstTokenMs===null)firstTokenMs=performance.now()-start;answer+=delta;const visible=answer.replace(/^\s*<think>\s*<\/think>\s*/,'').trim();if(firstVisibleTokenMs===null&&visible&&!'<think>'.startsWith(visible)&&!/^<think>\s*(?:<\/?t?h?i?n?k?>?)?$/.test(visible))firstVisibleTokenMs=performance.now()-start;send(id,'delta',delta);}if(chunk.usage)usage=chunk.usage;if(chunk.timings)timings=chunk.timings;if(chunk.choices?.[0]?.finish_reason)finishReason=chunk.choices[0].finish_reason;}
   const totalMs=performance.now()-start;
   send(id,'done',{answer,firstTokenMs,firstVisibleTokenMs,totalMs,usage,finishReason,timings,outputTokensPerSecond:usage?.completion_tokens?usage.completion_tokens/(totalMs/1000):null,decodeTokensPerSecond:usage?.extra?.decode_tokens_per_s??timings?.predicted_per_second??null});
  }else if(op==='unload'){
   if(backend==='webllm')await engine?.unload();else await engine?.exit();engine=null;send(id,'done',true);
  }else throw Error('Unknown operation');
 }catch(error){send(id,'error',{message:error.message,stack:error.stack});}
};
