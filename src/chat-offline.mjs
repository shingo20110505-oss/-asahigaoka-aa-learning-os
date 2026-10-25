// Compatibility for saved conversations from the retired device model experiment.
// Existing history remains readable; no local model or inference runtime is loaded.
export function recoverSavedThread(thread){
 if(!thread?.localOnly)return thread;
 return{...thread,busy:false,messages:thread.messages.map(m=>m.status==='inProgress'?{...m,status:'interrupted'}:m)};
}
export function savedThreadId(summary,preferred){
 const saved=new Set(summary.savedIds);
 if(saved.has(preferred))return preferred;
 return summary.threads.filter(t=>saved.has(t.id)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]?.id||summary.savedIds[0];
}
