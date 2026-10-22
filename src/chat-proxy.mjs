// The page and its media keep the Pages URL. Only this worker contacts the PC relay.
// Login tokens are not put in URLs, page markup, or the page's login response.
const tokenOK=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(value);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const requestHeaders=['accept','content-type','range','x-rise-csrf','upload-offset'];
const responseHeaders=['content-type','content-length','content-range','accept-ranges','content-disposition','cache-control','x-content-type-options','referrer-policy','content-security-policy'];

export function credentialStore(indexedDB){
  let opened;
  const open=()=>opened??=new Promise((resolve,reject)=>{const r=indexedDB.open('rise-chat-connection',1);r.onupgradeneeded=()=>r.result.createObjectStore('connection');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opened=null;reject(r.error);};});
  const transaction=async(mode,action)=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('connection',mode),req=action(tx.objectStore('connection'));tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Connection storage failed'));});};
  return {async read(){return await transaction('readonly',s=>s.get('current'))||{};},async write(value){await transaction('readwrite',s=>s.put(value,'current'));}};
}

export function createChatProxy({apiRoot,store,fetchImpl=fetch}){
  const root=new URL(apiRoot);if(!['https:','http:'].includes(root.protocol)||root.username||root.password)throw Error('Invalid chat relay');
  return async(request,route)=>{
    if(!/^[a-z0-9/-]+(?:\?download=1)?$/.test(route)||route.includes('//')||!['GET','HEAD','POST','PATCH'].includes(request.method))return json({error:'見つかりません'},404);
    try{
      const saved=await store.read(),headers=new Headers();for(const name of requestHeaders){const value=request.headers.get(name);if(value!==null)headers.set(name,value);}
      headers.set('X-Rise-Transport','pages');if(tokenOK(saved.token))headers.set('Authorization','Bearer '+saved.token);
      let body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer();
      if(route==='login'&&request.method==='POST'){
        let input;try{input=JSON.parse(new TextDecoder().decode(body));}catch{return json({error:'JSON形式を確認してください'},400);}
        // The device key only reconnects a guest after the guest password is checked.
        delete input.deviceToken;if(tokenOK(saved.deviceToken))input.deviceToken=saved.deviceToken;
        body=JSON.stringify(input);headers.set('Content-Type','application/json');
      }
      const response=await fetchImpl(new URL(route,root),{method:request.method,headers,body,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',signal:request.signal});
      if(route==='login'&&request.method==='POST'&&response.ok){
        const result=await response.json();if(!tokenOK(result.accessToken))return json({error:'PC側の接続プログラムを更新してください'},503);
        await store.write({token:result.accessToken,deviceToken:tokenOK(result.deviceToken)?result.deviceToken:saved.deviceToken});
        delete result.accessToken;delete result.deviceToken;return json(result,response.status);
      }
      if(route==='logout'&&request.method==='POST'&&response.ok||response.status===401&&route!=='login'){
        const latest=await store.read();if(latest.token===saved.token)await store.write({deviceToken:latest.deviceToken});
      }
      const returned=new Headers({'Cache-Control':'no-store'});for(const name of responseHeaders){const value=response.headers.get(name);if(value!==null)returned.set(name,value);}
      // Preserve streaming and Range responses; never collect a whole video in memory.
      return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:returned});
    }catch{return json({error:'PCとの通信に接続できません。PCのRISEとネットワーク接続を確認してください。'},503);}
  };
}
