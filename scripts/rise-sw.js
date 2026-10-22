import {createChatProxy,credentialStore} from './src/chat-proxy.mjs';
import {CHAT_ORIGIN,CHAT_GATEWAY,PAGES_ORIGIN} from './src/chat-target.mjs';
import {gatewayFetch} from './src/chat-gateway.mjs';
const CACHE='rise-v6-__VERSION__',SHELL=__SHELL__;
const chat=createChatProxy({apiRoot:CHAT_ORIGIN+'/api/',store:credentialStore(self.indexedDB),fetchImpl:gatewayFetch(CHAT_GATEWAY)});
self.addEventListener('message',event=>{
 if(event.data?.type==='RISE_ACTIVATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='RISE_CHAT_READY')event.ports[0]?.postMessage({chatTransport:1});
 if(event.data?.type==='RISE_OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE),keys=new Set((await cache.keys()).map(x=>x.url)),ready=SHELL.every(x=>keys.has(new URL(x,self.registration.scope).href));event.ports[0]?.postMessage({ready,version:CACHE.slice(8),count:SHELL.length});})());
});
// Cache the complete public study library atomically; private chat APIs never enter it.
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL.map(x=>new Request(new URL(x,self.registration.scope),{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('rise-v6-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'RISE_OFFLINE_READY'});})()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),base=new URL(self.registration.scope);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;const rel=u.pathname.slice(base.pathname.length);
 if(base.origin===PAGES_ORIGIN&&rel.startsWith('api/')){e.respondWith(chat(e.request,rel.slice(4)+u.search));return;}
 if(e.request.method!=='GET'||/^(api\/|setup|chat-api\/)/.test(rel))return;
 if(['update.html','src/app-updater.mjs'].includes(rel)){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(async()=>await(await caches.open(CACHE)).match(new URL('./'+rel,base))||Response.error()));return;}
 const path='./'+rel;if(!SHELL.includes(path)&&e.request.mode!=='navigate')return;
 e.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(new URL(path,base));if(saved)return saved;try{return await fetch(e.request);}catch{if(e.request.mode==='navigate')return(await cache.match('./index.html'))||Response.error();return Response.error();}})());
});
