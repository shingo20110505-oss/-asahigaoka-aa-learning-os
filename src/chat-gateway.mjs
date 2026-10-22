// Browser requests use finite HTTPS POSTs without custom headers or preflights.
// Session credentials stay in the body, never in a URL or a browser cookie.
function encode(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
function decode(text){if(typeof text!=='string'||text.length>24*1024*1024)throw Error('中継からの応答が不正です');return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
export function gatewayFetch(endpoint,{fetchImpl=fetch,timeoutMs=22000}={}){
 return async(url,options={})=>{
  const controller=new AbortController(),cancel=()=>controller.abort(),signal=options.signal;signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  let timer;const aborted=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new DOMException('通信が時間切れ、または中止になりました','AbortError')),{once:true});if(controller.signal.aborted)reject(new DOMException('中止しました','AbortError'));timer=setTimeout(cancel,timeoutMs);});
  const exchange=async()=>{
   const u=new URL(url),method=options.method||'GET',headers=Object.fromEntries(new Headers(options.headers));delete headers['x-rise-transport'];
   const bytes=options.body===undefined?new Uint8Array():new Uint8Array(await new Response(options.body).arrayBuffer());
   const response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({v:1,method,path:u.pathname.replace(/^\/api\//,'')+u.search,headers,body:encode(bytes)}),mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
   const type=response.headers.get('content-type')||'';if(!type.includes('application/json'))throw Error('AIworknaviの通信入口に接続できません。中継先が制限されていないか確認してください。');
   const value=await response.json();if(!response.ok)throw Error(value.error||'AIworknaviの中継に接続できません');
   if(value.v!==1||!Number.isInteger(value.status)||value.status<200||value.status>599||!value.headers||typeof value.headers!=='object')throw Error('中継からの応答が不正です');
   return new Response(method==='HEAD'||[204,205,304].includes(value.status)?null:decode(value.body),{status:value.status,headers:value.headers});
  };
  try{return await Promise.race([exchange(),aborted]);}catch(error){error.publicMessage=error.name==='TypeError'?'AIworknaviに接続できません。この端末で aiworknavi.blog が開けるか確認してください。':error.name==='AbortError'?'AIworknaviとの通信が時間切れ、または中止になりました。もう一度接続してください。':error.name==='SyntaxError'?'中継先から通信データ以外の応答が返りました。通信の制限を確認してください。':error.message;throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 };
}

// Fetch finite ranges so CGI/proxy buffers never need to hold a complete MP4.
export async function downloadChatFile(url,request,{signal}={}){
 const head=await request(url,{method:'HEAD',signal});if(!head.ok)throw Error('添付を読み込めません。ログイン状態を確認してください。');
 const length=head.headers.get('content-length'),size=Number(length);if(length===null||!Number.isSafeInteger(size)||size<0)throw Error('添付のサイズを取得できません');
 const parts=[];for(let start=0;start<size;start+=1024*1024){const end=Math.min(size-1,start+1024*1024-1),r=await request(url,{headers:{Range:`bytes=${start}-${end}`},signal});if(r.status!==206||r.headers.get('content-range')!==`bytes ${start}-${end}/${size}`)throw Error('添付の読み込みが中断しました。もう一度試してください。');const part=await r.blob();if(part.size!==end-start+1)throw Error('添付のデータが不足しています');parts.push(part);}
 return new Blob(parts,{type:head.headers.get('content-type')||'application/octet-stream'});
}
