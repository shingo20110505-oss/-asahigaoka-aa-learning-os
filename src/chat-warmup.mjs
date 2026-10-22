import {CHAT_GATEWAY,CHAT_ORIGIN,usesHostedChat} from './chat-target.mjs';
import {gatewayFetch} from './chat-gateway.mjs';
let pending,started=0;
export function warmChat(){if(!navigator.onLine)return Promise.resolve(null);if(pending&&Date.now()-started<20000)return pending;started=Date.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);pending=(usesHostedChat(location.hostname)?gatewayFetch(CHAT_GATEWAY)(new URL('/api/status',CHAT_ORIGIN),{signal:controller.signal,cache:'no-store'}):fetch('./api/status',{signal:controller.signal,cache:'no-store'})).then(r=>r.ok?r.json():null).catch(()=>null).finally(()=>clearTimeout(timer));return pending;}
