import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {RelayCore} from '../relay/core.mjs';
import {createBridge} from '../bridge/server.mjs';
import {startRelay} from '../bridge/relay-client.mjs';
import {secret,passwordHash} from '../bridge/security.mjs';
import {createChatProxy} from '../src/chat-proxy.mjs';
import {PAGES_ORIGIN} from '../src/chat-target.mjs';

test('Pages preflight allows only its exact origin and narrow API headers, including offline responses',async()=>{
  const relay=new RelayCore({RISE_RELAY_TOKEN:secret()});
  const preflight=(origin=PAGES_ORIGIN,header='authorization,x-rise-transport,content-type')=>relay.fetch(new Request('https://relay.example/api/login',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':header}}));
  const good=await preflight();assert.equal(good.status,204);assert.equal(good.headers.get('access-control-allow-origin'),PAGES_ORIGIN);assert.equal(good.headers.get('access-control-allow-credentials'),null);
  for(const origin of ['https://evil.invalid',PAGES_ORIGIN+'.evil.invalid','null']){const bad=await preflight(origin);assert.equal(bad.status,403);assert.equal(bad.headers.get('access-control-allow-origin'),null);}
  assert.equal((await preflight(PAGES_ORIGIN,'cookie')).status,403);
  const offline=await relay.fetch(new Request('https://relay.example/api/status',{headers:{Origin:PAGES_ORIGIN,'X-Rise-Transport':'pages'}}));assert.equal(offline.status,503);assert.equal(offline.headers.get('access-control-allow-origin'),PAGES_ORIGIN);
  const privateRoute=await relay.fetch(new Request('https://relay.example/_rise/host/hello',{method:'POST',headers:{Origin:PAGES_ORIGIN}}));assert.equal(privateRoute.status,401);assert.equal(privateRoute.headers.get('access-control-allow-origin'),null);relay.close();
});

test('Pages worker keeps credentials out of page responses while preserving login, guest identity, SSE and ranged media',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-pages-test-')),token=secret(),origin='https://relay.example';
  const config={ownerPassword:await passwordHash('owner-123'),guestPassword:await passwordHash('guest-123'),relayToken:token,publicOrigin:origin};
  const provider={ready:()=>true,async run({onDelta,signal}){for(const text of ['同じ','画面で','回答']){await delay(10,undefined,{signal});onDelta(text);}}};
  const app=await createBridge({privateDir:dir,config,provider,publicOrigin:origin}),relay=new RelayCore({RISE_RELAY_TOKEN:token},{pollMs:200,headerMs:2000,idleMs:5000});
  let online=false;const connector=startRelay({origin,token,localURL:app.url,fetchImpl:(url,options)=>new URL(url).origin===origin?relay.fetch(new Request(url,options)):fetch(url,options),onStatus:s=>{online=s.connected;}});
  t.after(async()=>{await connector.close();relay.close();await app.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-pages-test-'))await fs.rm(dir,{recursive:true});});
  for(let n=0;!online&&n<100;n++)await delay(5);assert.ok(online);
  const request=(route,options={})=>relay.fetch(new Request(origin+'/api/'+route,{...options,headers:{origin:PAGES_ORIGIN,'x-rise-transport':'pages','sec-fetch-site':'cross-site','cf-connecting-ip':'192.0.2.12',...options.headers}}));
  const client=()=>{let value={};const store={read:async()=>({...value}),write:async next=>{value={...next};}};let csrf='';
    const proxy=createChatProxy({apiRoot:origin+'/api/',store,fetchImpl:(url,options)=>{assert.equal(options.credentials,'omit');assert.ok(['','?download=1'].includes(new URL(url).search));return request(new URL(url).pathname.slice(5)+new URL(url).search,{...options,headers:Object.fromEntries(options.headers)});}});
    return{store,call:(route,{method='GET',body,headers={},signal}={})=>proxy(new Request(PAGES_ORIGIN+'/rise/api/'+route,{method,headers:{'X-Rise-CSRF':csrf,...(body&&!(body instanceof Uint8Array)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body),signal}),route),
      async login(role){const r=await this.call('login',{method:'POST',body:{role,password:role+'-123'}});assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);const data=await r.json();assert.equal(data.accessToken,undefined);assert.equal(data.deviceToken,undefined);csrf=data.csrf;return data;}};
  };
  const guest=client(),other=client(),owner=client();await guest.login('guest');await other.login('guest');await owner.login('owner');
  const initial=await guest.store.read();assert.ok(initial.token);assert.ok(initial.deviceToken);
  const thread=await(await guest.call('threads',{method:'POST',body:{title:'同じRISEの画面'}})).json();assert.ok(thread.id);
  assert.equal((await other.call('threads/'+thread.id)).status,404);assert.equal((await owner.call('threads/'+thread.id)).status,404);
  assert.equal((await request('threads',{headers:{Cookie:'rise_session='+initial.token}})).status,401,'a bearer session cannot be used as a cookie');
  assert.equal((await relay.fetch(new Request(origin+'/api/threads',{headers:{Origin:origin,Authorization:'Bearer '+initial.token}}))).status,401,'bearer login is bound to the Pages transport');
  assert.equal((await guest.call('threads',{method:'POST',body:{},headers:{'X-Rise-CSRF':'wrong'}})).status,403);
  const events=await guest.call('events'),reader=events.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/connected/);
  const sent=await guest.call('threads/'+thread.id+'/messages',{method:'POST',body:{text:'確認',files:[]}});assert.equal(sent.status,201);await sent.arrayBuffer();
  let stream='';while(!stream.includes('"type":"done"')){const part=await reader.read();assert.equal(part.done,false);stream+=new TextDecoder().decode(part.value);}assert.match(stream,/同じ/);assert.match(stream,/画面で/);await reader.cancel();
  const bytes=new Uint8Array(190000).fill(33);bytes.set([0,0,0,24,102,116,121,112,105,115,111,109]);
  const upload=await(await guest.call('uploads',{method:'POST',body:{name:'test.mp4',size:bytes.length,fingerprint:'b'.repeat(64)}})).json();
  const chunk=await guest.call('uploads/'+upload.id,{method:'PATCH',headers:{'Upload-Offset':'0','Content-Type':'application/octet-stream'},body:bytes});assert.equal(chunk.status,200);await chunk.arrayBuffer();
  assert.equal((await guest.call('uploads/'+upload.id+'/complete',{method:'POST',body:{}})).status,200);
  const media=await guest.call('files/'+upload.id,{headers:{Range:'bytes=100-999'}});assert.equal(media.status,206);assert.equal(media.headers.get('content-range'),'bytes 100-999/190000');assert.deepEqual(new Uint8Array(await media.arrayBuffer()),bytes.slice(100,1000));
  assert.equal((await other.call('files/'+upload.id)).status,404);const download=await guest.call('files/'+upload.id+'?download=1');assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal((await download.arrayBuffer()).byteLength,bytes.length);
  assert.equal((await guest.call('logout',{method:'POST',body:{}})).status,200);assert.equal((await guest.store.read()).token,undefined);assert.equal((await guest.store.read()).deviceToken,initial.deviceToken);
  await guest.login('guest');assert.notEqual((await guest.store.read()).token,initial.token);assert.equal((await guest.call('threads/'+thread.id)).status,200,'logout and login retains the same guest history');
  const restarted=createChatProxy({apiRoot:origin+'/api/',store:guest.store,fetchImpl:(url,options)=>request(new URL(url).pathname.slice(5),{...options,headers:Object.fromEntries(options.headers)})});
  assert.equal((await restarted(new Request(PAGES_ORIGIN+'/rise/api/threads/'+thread.id),'threads/'+thread.id)).status,200,'a restarted worker restores the browser login');
});
