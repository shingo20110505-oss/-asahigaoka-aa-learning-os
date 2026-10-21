import {BODY_LIMIT,CHUNK_LIMIT,REQUEST_HEADERS,RESPONSE_HEADERS,validRoute,validId,selectHeaders,encode,decode,limitedBody} from './protocol.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function authorized(request,token){if(!/^[A-Za-z0-9_-]{43,128}$/.test(token||''))return false;const supplied=request.headers.get('authorization')||'';if(supplied.length>160)return false;const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,b]=await Promise.all([hash(supplied),hash('Bearer '+token)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}

export class RelayCore {
  constructor(env,{pollMs=25000,headerMs=25000,idleMs=60000}={}){this.env=env;this.pollMs=pollMs;this.headerMs=headerMs;this.idleMs=idleMs;this.pending=new Map();this.queue=[];this.waiter=null;this.instance=null;this.lastSeen=0;this.receiving=0;this.queuedBytes=0;}
  push(item){if(this.waiter){const p=this.pending.get(item.id);if(p){this.queuedBytes-=p.bodyBytes;p.bodyBytes=0;}const done=this.waiter;this.waiter=null;done([item]);}else{this.queue.push(item);if(this.queue.length>128)this.queue.shift();}}
  remove(id,{error='PCとの接続が終了しました',cancel=true}={}){const p=this.pending.get(id);if(!p)return;this.pending.delete(id);this.queuedBytes-=p.bodyBytes;p.bodyBytes=0;this.queue=this.queue.filter(x=>x.id!==id);clearTimeout(p.timer);p.release?.();p.request.signal.removeEventListener('abort',p.abort);if(!p.started)p.resolve(json({error},503));else{try{p.controller.error(Error(error));}catch{}}if(cancel)this.push({type:'cancel',id});}
  touch(p){clearTimeout(p.timer);p.timer=setTimeout(()=>this.remove(p.id),this.idleMs);}
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    try {
      if(path.startsWith('/_rise/host/'))return await this.host(request,path.slice(12));
      if(!validRoute(path+url.search)||!['GET','POST','PATCH','HEAD'].includes(request.method))return json({error:'見つかりません'},404);
      if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'この接続元は許可されていません'},403);
      if(!this.instance||Date.now()-this.lastSeen>45000)return json({error:'PCがオフラインです。PCでRISEを起動してください。'},503);
      if(this.pending.size+this.receiving>=64||this.queuedBytes+(this.receiving+1)*BODY_LIMIT>12*1024*1024)return json({error:'接続が混み合っています。少し待ってから試してください。'},429);
      let body;this.receiving++;try{body=await limitedBody(request,BODY_LIMIT);}catch{return json({error:'送信データが大きすぎます'},413);}finally{this.receiving--;}
      const id=crypto.randomUUID();
      return await new Promise(resolve=>{
        const p={id,request,resolve,started:false,sequence:0,controller:null,release:null,bodyBytes:body.length};this.queuedBytes+=body.length;
        p.abort=()=>this.remove(id);p.timer=setTimeout(()=>this.remove(id),this.headerMs);this.pending.set(id,p);request.signal.addEventListener('abort',p.abort,{once:true});
        if(request.signal.aborted){p.abort();return;}
        this.push({type:'request',id,path:path+url.search,method:request.method,headers:selectHeaders(request.headers,REQUEST_HEADERS),clientIP:request.headers.get('cf-connecting-ip')||'unknown',body:encode(body)});
      });
    }catch{return json({error:'中継で処理を完了できませんでした'},502);}
  }
  async host(request,action){
    if(!await authorized(request,this.env.RISE_RELAY_TOKEN))return json({error:'Unauthorized'},401);
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    const instance=request.headers.get('x-rise-instance');if(!validId(instance))return json({error:'Invalid instance'},400);
    if(this.instance&&this.instance!==instance&&Date.now()-this.lastSeen<45000)return json({error:'別のPC接続が動作中です'},409);
    if(this.instance!==instance){for(const id of [...this.pending.keys()])this.remove(id,{cancel:false});this.queue=[];this.waiter?.([]);this.waiter=null;this.instance=instance;}
    this.lastSeen=Date.now();
    if(action==='hello')return json({ok:true});
    if(action==='close'){for(const id of [...this.pending.keys()])this.remove(id,{cancel:false});this.queue=[];this.waiter?.([]);this.waiter=null;this.instance=null;return json({ok:true});}
    if(action==='poll'){
      if(this.waiter)return json({error:'Poll already pending'},409);
      if(this.queue.length){const items=this.queue.splice(0,8);for(const item of items){const p=this.pending.get(item.id);if(p){this.queuedBytes-=p.bodyBytes;p.bodyBytes=0;}}return json({items});}
      const items=await new Promise(resolve=>{let timer;const done=items=>{clearTimeout(timer);request.signal.removeEventListener('abort',abort);if(this.waiter===done)this.waiter=null;resolve(items);};const abort=()=>done([]);timer=setTimeout(()=>done([]),this.pollMs);this.waiter=done;request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();});return json({items});
    }
    let input;try{input=JSON.parse(new TextDecoder().decode(await limitedBody(request,100000)));}catch{return json({error:'Invalid body'},400);}
    const p=this.pending.get(input.id);if(!p)return json({error:'Request ended'},410);
    this.touch(p);
    if(action==='headers'){
      if(p.started||!Number.isInteger(input.status)||input.status<200||input.status>599)return json({error:'Invalid response'},400);
      const headers=new Headers();for(const [name,value] of Object.entries(input.headers||{}))if(RESPONSE_HEADERS.includes(name)){if(name==='set-cookie'&&Array.isArray(value)){for(const cookie of value)if(typeof cookie==='string')headers.append(name,cookie);}else if(typeof value==='string')headers.set(name,value);}
      headers.set('Cache-Control','no-store');p.started=true;
      if(p.request.method==='HEAD'||[204,205,304].includes(input.status)){p.resolve(new Response(null,{status:input.status,headers}));this.finish(p);return json({ok:true});}
      const stream=new ReadableStream({start:controller=>{p.controller=controller;},pull:()=>{p.release?.();p.release=null;},cancel:()=>this.remove(p.id)},{highWaterMark:256*1024,size:chunk=>chunk.length});
      p.resolve(new Response(stream,{status:input.status,headers}));return json({ok:true});
    }
    if(action==='chunk'){
      if(!p.started||!p.controller||input.sequence!==p.sequence)return json({error:'Invalid sequence'},409);
      let bytes;try{bytes=decode(input.body,CHUNK_LIMIT);}catch{return json({error:'Invalid chunk'},400);}
      if(p.controller.desiredSize<=0)await new Promise(resolve=>{p.release=resolve;});
      if(!this.pending.has(p.id))return json({error:'Request ended'},410);
      p.controller.enqueue(bytes);p.sequence++;return json({ok:true});
    }
    if(action==='end'){if(!p.started||input.sequence!==p.sequence)return json({error:'Incomplete response'},409);this.finish(p);return json({ok:true});}
    if(action==='error'){this.remove(p.id,{cancel:false});return json({ok:true});}
    return json({error:'Not found'},404);
  }
  finish(p){this.pending.delete(p.id);this.queuedBytes-=p.bodyBytes;p.bodyBytes=0;clearTimeout(p.timer);p.request.signal.removeEventListener('abort',p.abort);p.release?.();try{p.controller?.close();}catch{}}
  close(){for(const id of [...this.pending.keys()])this.remove(id,{cancel:false});this.waiter?.([]);this.waiter=null;this.queue=[];this.instance=null;}
}
