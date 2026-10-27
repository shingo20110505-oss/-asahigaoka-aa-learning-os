import test from 'node:test';
import assert from 'node:assert/strict';
import {gatewayFetch,downloadChatFile} from '../src/chat-gateway.mjs';
import {createChatProxy,credentialStore} from '../src/chat-proxy.mjs';
import {setTimeout as delay} from 'node:timers/promises';

test('gateway login uses a finite simple POST and preserves existing browser credentials',async()=>{
 const token='a'.repeat(43),deviceToken='b'.repeat(43);let saved={deviceToken},calls=0;
 const proxy=createChatProxy({apiRoot:'https://relay.test/api/',store:{read:async()=>saved,write:async value=>{saved=value;}},fetchImpl:gatewayFetch('https://aiworknavi.blog/rise-chat/',{fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://aiworknavi.blog/rise-chat/');assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');assert.deepEqual(options.headers,{'Content-Type':'text/plain;charset=UTF-8'});
  const value=JSON.parse(options.body);assert.equal(value.path,'login');assert.equal(value.method,'POST');assert.equal(value.headers['x-rise-transport'],undefined);assert.equal(JSON.parse(atob(value.body)).deviceToken,deviceToken);
  return Response.json({v:1,status:200,headers:{'content-type':'application/json'},body:btoa(JSON.stringify({role:'guest',csrf:'c'.repeat(43),accessToken:token,deviceToken}))});
 }})});
 const response=await proxy(new Request('https://pages.test/api/login',{method:'POST',body:JSON.stringify({password:'test',role:'guest'})}),'login');
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.accessToken,undefined);assert.equal(body.deviceToken,undefined);assert.deepEqual(saved,{token,deviceToken});assert.equal(calls,1);
});

test('gateway requests stop even when a proxy ignores abort; block pages and denied storage give actionable errors',async()=>{
 const fetcher=gatewayFetch('https://gateway.test/',{timeoutMs:15,fetchImpl:()=>new Promise(()=>{})});
 await assert.rejects(fetcher('https://relay.test/api/status'),error=>error.name==='AbortError'&&error.publicMessage.includes('時間切れ'));
 await assert.rejects(gatewayFetch('https://gateway.test/',{fetchImpl:async()=>new Response('<html>Blocked</html>',{headers:{'content-type':'text/html'}})})('https://relay.test/api/status'),/通信入口/);
 const store=credentialStore({open(){throw Error('SecurityError');}});
 const response=await createChatProxy({apiRoot:'https://relay.test/api/',store,fetchImpl:()=>assert.fail('must not fetch')})(new Request('https://pages.test/api/status'),'status');
 assert.equal(response.status,503);assert.match((await response.json()).error,/保存領域/);
});

test('large media downloads are complete, ordered finite ranges and reject truncation',async()=>{
 const bytes=new Uint8Array(2200000).map((_,i)=>i%251),calls=[];
 const request=async(url,options)=>{calls.push(options);if(options.method==='HEAD')return new Response(null,{headers:{'content-length':String(bytes.length),'content-type':'video/mp4'}});const [start,end]=options.headers.Range.slice(6).split('-').map(Number);return new Response(bytes.slice(start,end+1),{status:206,headers:{'content-range':`bytes ${start}-${end}/${bytes.length}`}});};
 const blob=await downloadChatFile('https://pages.test/api/files/test',request);assert.equal(blob.type,'video/mp4');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);assert.equal(calls.length,4);
 await assert.rejects(downloadChatFile('x',async(_,o)=>o.method==='HEAD'?new Response(null,{headers:{'content-length':'10'}}):new Response('short',{status:206,headers:{'content-range':'bytes 0-9/10'}})),/不足/);
});

test('known file metadata skips HEAD, two ranges overlap and out-of-order completion preserves exact bytes',async()=>{
 const bytes=new Uint8Array(2500000).map((_,i)=>i%251);let active=0,peak=0,calls=0;
 const request=async(url,options)=>{assert.notEqual(options.method,'HEAD');calls++;active++;peak=Math.max(peak,active);const [start,end]=options.headers.Range.slice(6).split('-').map(Number);try{await delay(start===0?25:5,undefined,{signal:options.signal});return new Response(bytes.slice(start,end+1),{status:206,headers:{'content-range':`bytes ${start}-${end}/${bytes.length}`}});}finally{active--;}};
 const blob=await downloadChatFile('x',request,{size:bytes.length,type:'image/png'});assert.equal(peak,2);assert.equal(calls,3);assert.equal(blob.type,'image/png');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);
});

test('failed range stops queued downloads and cancels the other request',async()=>{
 let calls=0,active=0;
 await assert.rejects(downloadChatFile('x',async(_,options)=>{calls++;active++;try{if(options.headers.Range.startsWith('bytes=0-')){await delay(5);return new Response('bad',{status:503});}await delay(1000,undefined,{signal:options.signal});assert.fail('must abort');}finally{active--;}},{size:4*1024*1024,type:'image/png'}),/中断/);
 assert.equal(calls,2);assert.equal(active,0);
 const c=new AbortController();c.abort();await assert.rejects(downloadChatFile('x',()=>assert.fail('must not fetch'),{signal:c.signal,size:100,type:'image/png'}),{name:'AbortError'});
});
