import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {BODY_LIMIT,CHUNK_LIMIT,REQUEST_HEADERS,RESPONSE_HEADERS,validRoute,validId,selectHeaders,encode,decode,limitedBody} from '../relay/protocol.mjs';

// Only this outbound connector knows the relay secret. The browser never receives it.
export function startRelay({origin,token,localURL,fetchImpl=fetch,onStatus=()=>{}}){
  const remote=new URL(origin),local=new URL(localURL);
  if(remote.protocol!=='https:'||remote.username||remote.password||remote.pathname!=='/'||remote.search||remote.hash)throw Error('中継先はHTTPSのサイトURLにしてください');
  if(local.protocol!=='http:'||local.hostname!=='127.0.0.1'||local.pathname!=='/'||local.username||local.password)throw Error('PC接続先が不正です');
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(token||''))throw Error('中継用の接続キーが未設定です');
  const instance=randomUUID(),stop=new AbortController(),tasks=new Map();let failure=0;
  async function send(action,input,signal=stop.signal,timeout=35000){const response=await fetchImpl(new URL('/_rise/host/'+action,remote),{method:'POST',headers:{Authorization:'Bearer '+token,'X-Rise-Instance':instance,'Content-Type':'application/json'},body:JSON.stringify(input||{}),redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(timeout)])});if(!response.ok)throw Object.assign(Error(response.status===401?'中継の接続キーが一致しません':response.status===409?'別のPC接続が動作中です':'中継接続を再試行しています'),{status:response.status});return response.json();}
  async function handle(item,controller){
    try{
      if(!validId(item.id)||!validRoute(item.path)||!['GET','POST','PATCH','HEAD','DELETE'].includes(item.method))throw Error('Invalid relay request');
      const headers=new Headers();for(const name of REQUEST_HEADERS)if(typeof item.headers?.[name]==='string')headers.set(name,item.headers[name]);
      headers.set('X-Rise-Public-Origin',remote.origin);headers.set('X-Rise-Relay',token);headers.set('X-Rise-Client',typeof item.clientIP==='string'?item.clientIP.slice(0,100):'unknown');
      const body=decode(item.body,BODY_LIMIT),response=await fetchImpl(new URL(item.path,local),{method:item.method,headers,body:['GET','HEAD'].includes(item.method)?undefined:body,redirect:'error',signal:controller.signal});
      const responseHeaders=selectHeaders(response.headers,RESPONSE_HEADERS);const cookies=response.headers.getSetCookie();if(cookies.length)responseHeaders['set-cookie']=cookies;
      let compact;
      if(/^\/api\/uploads(?:\/|$)/.test(item.path)&&response.headers.get('content-type')?.includes('application/json')){
        compact=await limitedBody(response,CHUNK_LIMIT);
        try{await send('response',{id:item.id,status:response.status,headers:responseHeaders,body:encode(compact)},controller.signal);return;}
        catch(error){if(error.status!==404)throw error;}
      }
      await send('headers',{id:item.id,status:response.status,headers:responseHeaders},controller.signal);
      if(item.method==='HEAD'||[204,205,304].includes(response.status))return;
      let sequence=0;for await(const part of compact?[compact]:response.body||[]){for(let offset=0;offset<part.length;offset+=CHUNK_LIMIT)await send('chunk',{id:item.id,sequence:sequence++,body:encode(part.subarray(offset,offset+CHUNK_LIMIT))},controller.signal);}
      await send('end',{id:item.id,sequence},controller.signal);
    }catch{if(!stop.signal.aborted)await send('error',{id:item.id},stop.signal,5000).catch(()=>{});}
    finally{controller.abort();tasks.delete(item.id);}
  }
  async function loop(){while(!stop.signal.aborted){try{
    await send('hello');failure=0;onStatus({connected:true,message:'別端末から接続できます',origin:remote.origin});
    while(!stop.signal.aborted){const {items}=await send('poll');for(const item of items||[]){if(item.type==='cancel'){tasks.get(item.id)?.controller.abort();continue;}if(item.type!=='request'||tasks.has(item.id))continue;if(tasks.size>=64){await send('error',{id:item.id});continue;}const controller=new AbortController(),abort=()=>controller.abort();stop.signal.addEventListener('abort',abort,{once:true});const entry={controller,promise:null};tasks.set(item.id,entry);entry.promise=handle(item,controller).finally(()=>stop.signal.removeEventListener('abort',abort));}}
  }catch(error){if(stop.signal.aborted)break;onStatus({connected:false,message:error.message,origin:remote.origin});for(const task of tasks.values())task.controller.abort();await delay(Math.min(30000,1000*2**Math.min(failure++,5)),undefined,{signal:stop.signal}).catch(()=>{});}}
  }
  const running=loop();return {async close(){stop.abort();for(const task of tasks.values())task.controller.abort();await send('close',{},AbortSignal.timeout(3000),3000).catch(()=>{});await running;await Promise.allSettled([...tasks.values()].map(t=>t.promise));onStatus({connected:false,message:'遠隔接続を停止しました',origin:remote.origin});}};
}
