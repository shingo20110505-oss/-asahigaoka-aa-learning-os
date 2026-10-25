// Remove only the retired model stores. Learning files and chat archives are separate.
export async function retireLocalAI({cacheStorage=globalThis.caches,storage=globalThis.localStorage,storageManager=globalThis.navigator?.storage}={}){
 const failures=[];
 for(const name of ['webllm/model','webllm/config','webllm/wasm'])try{await cacheStorage?.delete(name);}catch{failures.push(name);}
 for(const key of ['rise-local-ai-model-v1','rise-local-ai-report-v1','rise-local-ai-validation-v1','rise-local-ai-gemma-terms-2026-04-01'])try{storage?.removeItem(key);}catch{failures.push(key);}
 if(storageManager?.getDirectory)try{const root=await storageManager.getDirectory();await root.removeEntry('webllm-resume',{recursive:true});}catch(e){if(e.name!=='NotFoundError')failures.push('webllm-resume');}
 return {removed:failures.length===0,failures};
}
