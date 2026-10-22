// The page and its media keep the Pages URL. Transport can run with or without SW.
// Login tokens are not put in URLs, page markup, or the page's login response.
const tokenOK=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(value);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const requestHeaders=['accept','content-type','range','x-rise-csrf','upload-offset'];
const responseHeaders=['content-type','content-length','content-range','accept-ranges','content-disposition','cache-control','x-content-type-options','referrer-policy','content-security-policy'];

export function credentialStore(indexedDB){
  let opened;
  const failure=()=>Object.assign(Error('Connection storage unavailable'),{publicMessage:'ブラウザのログイン保存領域を開けません。RISEの別のタブを閉じ、ブラウザの保存設定を確認してください。'});
  const open=()=>opened??=new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{done=true;reject(failure());},2500);let r;try{r=indexedDB.open('rise-chat-connection',1);}catch{clearTimeout(timer);reject(failure());return;}r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('connection'))r.result.createObjectStore('connection');};r.onsuccess=()=>{clearTimeout(timer);if(done){r.result.close();return;}done=true;r.result.onversionchange=()=>{r.result.close();opened=null;};resolve(r.result);};r.onerror=r.onblocked=()=>{clearTimeout(timer);done=true;reject(failure());};}).catch(error=>{opened=null;throw error;});
  const transaction=async(mode,action)=>{const db=await open();return new Promise((resolve,reject)=>{let tx;const timer=setTimeout(()=>{try{tx?.abort();}catch{}reject(failure());},2500);try{tx=db.transaction('connection',mode);const req=action(tx.objectStore('connection'));tx.oncomplete=()=>{clearTimeout(timer);resolve(req.result);};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(failure());};}catch{clearTimeout(timer);reject(failure());}});};
  return {async read(){return await transaction('readonly',s=>s.get('current'))||{};},async write(value){await transaction('readwrite',s=>s.put(value,'current'));},async clearSession(expectedToken){await transaction('readwrite',s=>{const r=s.get('current');r.addEventListener('success',()=>{if(r.result?.token===expectedToken)s.put({deviceToken:r.result?.deviceToken},'current');});return r;});}};
}

export function createChatProxy({apiRoot,store,fetchImpl=fetch}){
  const root=new URL(apiRoot);if(!['https:','http:'].includes(root.protocol)||root.username||root.password)throw Error('Invalid chat relay');
  return async(request,route)=>{
    if(!/^[a-z0-9/-]+(?:\?download=1)?$/.test(route)||route.includes('//')||!['GET','HEAD','POST','PATCH','DELETE'].includes(request.method))return json({error:'見つかりません'},404);
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
        if(store.clearSession)await store.clearSession(saved.token);else{const latest=await store.read();if(latest.token===saved.token)await store.write({deviceToken:latest.deviceToken});}
      }
      const returned=new Headers({'Cache-Control':'no-store'});for(const name of responseHeaders){const value=response.headers.get(name);if(value!==null)returned.set(name,value);}
      // Preserve streaming and Range responses; never collect a whole video in memory.
      return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers:returned});
    }catch(error){return json({error:error.publicMessage||'PCとの通信に接続できません。PCのRISEとネットワーク接続を確認してください。'},503);}
  };
}
