// Fetch-based SSE works when a browser cannot run the Pages service worker.
// Authentication stays in request headers, never in the event URL.
export function chatEvents(url,request,{retryMs=1500}={}){
  const controller=new AbortController();let timer;
  const events={onopen:null,onmessage:null,onerror:null,close(){clearTimeout(timer);controller.abort();}};
  async function connect(){
    let reader;
    try{
      const response=await request(url,{signal:controller.signal,headers:{Accept:'text/event-stream'}});
      if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream'))throw Error('回答の受信に接続できません');
      events.onopen?.();reader=response.body.getReader();const decoder=new TextDecoder();let pending='',data=[];
      const line=value=>{if(value.endsWith('\r'))value=value.slice(0,-1);if(!value){if(data.length)events.onmessage?.({data:data.join('\n')});data=[];}else if(value.startsWith('data:'))data.push(value.slice(5).replace(/^ /,''));};
      while(!controller.signal.aborted){const part=await reader.read();if(part.done)break;pending+=decoder.decode(part.value,{stream:true});let end;while((end=pending.indexOf('\n'))>=0){line(pending.slice(0,end));pending=pending.slice(end+1);}}
      if(!controller.signal.aborted)throw Error('回答の受信が中断されました');
    }catch(error){if(!controller.signal.aborted)events.onerror?.(error);}
    finally{await reader?.cancel().catch(()=>{});reader?.releaseLock();if(!controller.signal.aborted)timer=setTimeout(connect,retryMs);}
  }
  timer=setTimeout(connect,0);return events;
}
