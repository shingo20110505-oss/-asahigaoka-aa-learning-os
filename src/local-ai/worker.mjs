import {appConfig,modelById,visibleAnswer,messagesForModel} from './models.mjs';
let engine,activeModel,working=false,cachedOnly=false;
const originalFetch=globalThis.fetch.bind(globalThis),originalAdd=Cache.prototype.add,originalAddAll=Cache.prototype.addAll;
globalThis.fetch=(...args)=>{if(cachedOnly)throw Error('保存済みデータが不足しています。オンラインで端末内AIを準備してください。');return originalFetch(...args);};
Cache.prototype.add=function(...args){if(cachedOnly)throw Error('保存済みデータが不足しています。');return originalAdd.apply(this,args);};
Cache.prototype.addAll=function(...args){if(cachedOnly)throw Error('保存済みデータが不足しています。');return originalAddAll.apply(this,args);};
const send=(id,type,data)=>postMessage({id,type,data});
self.onmessage=async({data:{id,type,payload={}}})=>{
 if(working){send(id,'error',{message:'別の処理が進行中です。'});return;}
 working=true;
 try{
  if(type==='prepare'){
   cachedOnly=!!payload.cachedOnly;const m=modelById(payload.model);
   const runtime=await import('./vendor/web-llm-0.2.86.mjs');
   if(engine)await engine.unload();
   engine=await runtime.CreateMLCEngine(m.id,{appConfig,logLevel:'ERROR',initProgressCallback:progress=>send(id,'progress',progress)});
   activeModel=m.id;send(id,'done',{model:m.id});
  }else if(type==='generate'){
   if(!engine||!activeModel)throw Error('端末内AIを準備してください。');
   await engine.resetChat();
   const m=modelById(activeModel),start=performance.now();let firstTokenMs=null,text='',raw='',usage;
   const stream=await engine.chat.completions.create({messages:messagesForModel(activeModel,payload.messages),temperature:0.2,top_p:0.9,frequency_penalty:0.1,max_tokens:payload.maxTokens||384,stream:true,stream_options:{include_usage:true},...(m.thinking?{extra_body:{enable_thinking:false}}:{})});
   for await(const chunk of stream){const content=chunk.choices?.[0]?.delta?.content||'';if(content){raw+=content;const visible=m.thinking?visibleAnswer(raw):raw,delta=visible.slice(text.length);if(delta){firstTokenMs??=performance.now()-start;text=visible;send(id,'delta',{delta});}}if(chunk.usage)usage=chunk.usage;}
   if(!text.trim())throw Error('回答が空でした。質問を短くして、もう一度お試しください。');
   send(id,'done',{text,model:activeModel,metrics:{firstTokenMs,totalMs:performance.now()-start,tokens:usage?.completion_tokens??null,decodeTokensPerSecond:usage?.extra?.decode_tokens_per_s??null}});
  }else if(type==='unload'){if(engine)await engine.unload();engine=null;activeModel=null;send(id,'done',{});}
  else throw Error('未対応の操作です。');
 }catch(error){send(id,'error',{message:String(error?.message||error).slice(0,1200)});}
 finally{working=false;}
};
