const CACHE='rise-a16-lab-shell-v1';
const SHELL=['./','./index.html','./style.css','./ui.mjs','./lab.mjs','./worker.mjs','./questions.mjs','./models.json','./vendor/webllm.mjs','./vendor/wllama/index.js','./vendor/wllama/wasm/wllama.wasm'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(new URL(event.request.url).origin!==location.origin||event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(async()=>{const r=await caches.match(event.request);if(r)return r;throw Error('Offline asset missing');}));});
