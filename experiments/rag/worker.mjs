let engine,generation={},runtimeLogs=[];
const send=(id,type,value)=>postMessage({id,type,value});
onmessage=async({data:{id,op,args={}}})=>{try{
 if(op==='load'){
  generation=args.model.generation||{};
  const {Wllama,ModelManager}=await import('./vendor/wllama/index.js');
  if(args.cachedOnly){const original=fetch;self.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.origin!==location.origin)throw Error('Offline guard: model network disabled');return original(input,init);};}
  const logs=runtimeLogs=[],log=(...x)=>{const line=x.join(' ');if(/gpu|buffer|backend|memory|error|thread/i.test(line)){logs.push(line);if(logs.length>80)logs.shift();}};
  engine=new Wllama({default:new URL('./vendor/wllama/wasm/wllama.wasm',location.href).href},{modelManager:new ModelManager({allowOffline:!!args.cachedOnly}),logger:{debug:log,log,warn:log,error:log}});
  engine.setCompat({wasm:new URL('./vendor/compat/wllama.wasm',location.href).href,worker:new URL('./vendor/compat/wllama.js',location.href).href});
  const start=performance.now();await engine.loadModelFromUrl(args.model.url,{n_ctx:args.context??2048,n_parallel:args.parallel??1,n_threads:1,n_gpu_layers:args.gpuLayers===0?0:99,n_batch:args.batch??512,n_ubatch:args.batch??512,seed:42,useCache:true,progressCallback:p=>send(id,'progress',p)});
  const meta=engine.getModelMetadata();send(id,'done',{ms:performance.now()-start,logs,webGPUSupported:engine.isSupportWebGPU(),modelMetadata:{name:meta.meta?.['general.name'],architecture:meta.meta?.['general.architecture'],fileType:meta.meta?.['general.file_type']}});
 }else if(op==='generate'){
  const start=performance.now();let answer='',firstVisibleMs=null,usage,finishReason;
  const stream=await engine.createChatCompletion({messages:args.messages,temperature:0.2,top_p:0.9,seed:42,max_tokens:512,stream:true,cache_prompt:false,...generation});
  for await(const chunk of stream){const delta=chunk.choices?.[0]?.delta?.content||'';if(delta){answer+=delta;if(firstVisibleMs===null&&answer.trim())firstVisibleMs=performance.now()-start;send(id,'delta',delta);}if(chunk.usage)usage=chunk.usage;if(chunk.choices?.[0]?.finish_reason)finishReason=chunk.choices[0].finish_reason;}
  send(id,'done',{answer,firstVisibleMs,totalMs:performance.now()-start,usage,finishReason});
 }else if(op==='unload'){await engine?.exit();engine=null;send(id,'done',true);}
 else throw Error('Unknown operation');
 }catch(e){send(id,'error',{message:e.message,stack:e.stack,logs:runtimeLogs});}};
