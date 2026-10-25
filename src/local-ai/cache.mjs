import {modelById} from './models.mjs';

// Read only. A localStorage marker is never evidence of complete model storage.
export async function inspectModelCache(id,cacheStorage=globalThis.caches){
 if(!cacheStorage)return {complete:false,missing:['cache-api']};
 const m=modelById(id),missing=[];
 try{
  const names=await cacheStorage.keys();
  if(!['webllm/config','webllm/model','webllm/wasm'].every(n=>names.includes(n)))return {complete:false,missing:['model-storage']};
  const configCache=await cacheStorage.open('webllm/config'),modelCache=await cacheStorage.open('webllm/model'),wasmCache=await cacheStorage.open('webllm/wasm');
  const configResponse=await configCache.match(new URL('mlc-chat-config.json',m.model).href);
  const tensorResponse=await modelCache.match(new URL('tensor-cache.json',m.model).href);
  if(!configResponse||!tensorResponse)return {complete:false,missing:['manifest']};
  const config=await configResponse.json(),tensor=await tensorResponse.json();
  const tokenizer=config.tokenizer_files?.includes('tokenizer.json')?'tokenizer.json':config.tokenizer_files?.includes('tokenizer.model')?'tokenizer.model':null;
  if(!tokenizer||!Array.isArray(tensor.records)||!tensor.records.length)return {complete:false,missing:['invalid-manifest']};
  const keys=new Set((await modelCache.keys()).map(k=>k.url));
  for(const file of [tokenizer,...tensor.records.map(r=>r.dataPath)])if(typeof file!=='string'||!keys.has(new URL(file,m.model).href))missing.push(file||'invalid-shard');
  if(!await wasmCache.match(m.model_lib))missing.push('wasm');
  return {complete:missing.length===0,missing,bytes:tensor.records.reduce((n,r)=>n+(Number(r.nbytes)||0),0),shards:tensor.records.length};
 }catch{return {complete:false,missing:['storage-unavailable']};}
}

export async function detectSupport(nav=globalThis.navigator){
 if(!globalThis.isSecureContext&&typeof window!=='undefined')return {supported:false,reason:'HTTPSでRISEを開いてください。'};
 if(!nav?.gpu)return {supported:false,reason:'このブラウザではWebGPUを使えません。iPadではiPadOS 26以降の対応環境が必要です。'};
 let timer;
 try{
  const adapter=await Promise.race([nav.gpu.requestAdapter({powerPreference:'low-power'}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),5000);})]);
  if(!adapter)return {supported:false,reason:'この端末でGPUを利用できません。'};
  if(!adapter.features.has('shader-f16'))return {supported:false,reason:'この端末では、軽量モデルに必要なGPU機能を使えません。'};
  return {supported:true,reason:'',gpu:adapter.info?.description||adapter.info?.vendor||'WebGPU',maxBufferSize:adapter.limits.maxBufferSize,maxStorageBufferBindingSize:adapter.limits.maxStorageBufferBindingSize};
 }catch{return {supported:false,reason:'GPUの確認に失敗しました。ブラウザを再起動してお試しください。'};}
 finally{clearTimeout(timer);}
}
