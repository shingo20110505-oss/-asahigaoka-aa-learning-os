function ready(worker){return new Promise(resolve=>{if(!worker)return resolve(false);const channel=new MessageChannel(),finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);},timer=setTimeout(()=>finish(false),500);channel.port1.onmessage=e=>finish(e.data?.chatTransport===1);try{worker.postMessage({type:'RISE_CHAT_READY'},[channel.port2]);}catch{finish(false);}});}
// Bound registration itself: managed browsers can leave register/update pending.
export async function ensureChatConnection(options={}){
  let serviceWorker;try{serviceWorker='serviceWorker'in options?options.serviceWorker:navigator.serviceWorker;}catch{return false;}
  const timeoutMs=options.timeoutMs??2500;
  if(!serviceWorker)return false;let timer,expired=false;
  const attempt=async()=>{
    if(await ready(serviceWorker.controller))return true;
    const registration=await serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'});
    if(expired)return false;
    if(!registration.installing)registration.update().catch(()=>{});
    while(!expired){if(registration.waiting)registration.waiting.postMessage({type:'RISE_ACTIVATE'});if(await ready(serviceWorker.controller))return true;await new Promise(resolve=>setTimeout(resolve,100));}
    return false;
  };
  try{return await Promise.race([attempt().catch(()=>false),new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve(false);},timeoutMs);})]);}
  finally{expired=true;clearTimeout(timer);}
}
