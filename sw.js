'use strict';

const VERSION='2.3.0';
const CACHE_NAME=`asahigaoka-aa-os-${VERSION}`;
const BASE=self.registration.scope;
const url=(path)=>new URL(path,BASE).href;

const CORE=[
  url('./'),
  url('index.html'),
  url('offline.html'),
  url('manifest.webmanifest'),
  url('learning-engine-v22.css'),
  url('review/'),
  url('review/index.html'),
  url('review.html'),
  url('review-bank-v1.js'),
  url('review-page-v1.js'),
  url('aa-companion-v2.js'),
  url('aa-companion-mobile-fix.js'),
  url('companion7-runtime.js'),
  url('login-companion-v1.js'),
  url('login-production-test-v1.js'),
  url('settings-improvements-v1.js'),
  url('v23-pet-settings.js'),
  url('v23-loader.js'),
  url('storage-resilience-v1.js'),
  url('reading-gloss-tap-v1.js'),
  url('answer-feedback-audio-v1.js'),
  url('companion-settings-only-guard-v1.js'),
  url('voice-selftest-v1.js'),
  url('analytics-daily-v1.js'),
  url('analytics-explosion-v1.js'),
  url('icons/apple-touch-icon-180.png'),
  url('icons/icon-192.png'),
  url('icons/icon-512.png')
];

async function putIfGood(cache,request,response){
  if(response&&response.ok)await cache.put(request,response.clone());
  return response;
}

async function networkFirst(request,{reload=false}={}){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:reload?'no-store':'no-cache'});
    return await putIfGood(cache,request,response);
  }catch(_){
    return (await cache.match(request))||(await caches.match(request))||null;
  }
}

async function cacheFirstRefresh(request,event){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request)||await caches.match(request);
  const refresh=fetch(request).then(r=>putIfGood(cache,request,r)).catch(()=>null);
  if(cached){event?.waitUntil(refresh);return cached}
  return (await refresh)||new Response('',{status:504,statusText:'Offline'});
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async href=>{
      try{
        const r=await fetch(href,{cache:'reload'});
        if(r.ok)await cache.put(href,r);
      }catch(_){/* one optional asset must never block SW installation */}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('asahigaoka-aa-os-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='CLEAR_RUNTIME_CACHE')event.waitUntil(caches.delete(CACHE_NAME));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const u=new URL(request.url);
  if(u.origin!==self.location.origin||!u.href.startsWith(BASE))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const fresh=await networkFirst(request);
      if(fresh)return fresh;
      return (await caches.match(request))||(await caches.match(url('index.html')))||(await caches.match(url('offline.html')))||new Response('Offline',{status:503});
    })());
    return;
  }

  const ext=(u.pathname.split('.').pop()||'').toLowerCase();
  if(ext==='js'||ext==='css'||ext==='json'||ext==='webmanifest'){
    event.respondWith((async()=>{
      const fresh=await networkFirst(request,{reload:ext==='js'||u.pathname.endsWith('review-bank-v1.js')});
      return fresh||new Response('',{status:504,statusText:'Offline'});
    })());
    return;
  }

  event.respondWith(cacheFirstRefresh(request,event));
});
