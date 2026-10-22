import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureChatConnection} from '../src/chat-connection.mjs';
import {chatEvents} from '../src/chat-stream.mjs';
import {appendMaterialFiles,materialFiles} from '../src/material-files.mjs';

test('chat falls back when service workers are absent, denied or registration never settles',async()=>{
  assert.equal(await ensureChatConnection({serviceWorker:null}),false);
  assert.equal(await ensureChatConnection({get serviceWorker(){throw Error('SecurityError');}}),false);
  assert.equal(await ensureChatConnection({serviceWorker:{register:async()=>{throw Error('Denied');}}}),false);
  assert.equal(await ensureChatConnection({serviceWorker:{register:()=>new Promise(()=>{})},timeoutMs:15}),false);
  const worker={postMessage(_,ports){ports[0].postMessage({chatTransport:1});ports[0].close();}};
  assert.equal(await ensureChatConnection({serviceWorker:{controller:worker}}),true);
});

test('fetch SSE preserves split Japanese characters and multiline data and stops on close',async()=>{
  let calls=0,cancelled=false;const bytes=new TextEncoder().encode(': ping\r\ndata: 日本語\r\ndata: 続き\r\n\r\n');
  const stream=new ReadableStream({start(controller){for(let i=0;i<bytes.length;i++)controller.enqueue(bytes.slice(i,i+1));},cancel(){cancelled=true;}});
  const events=chatEvents('https://example.test/events',async()=>{calls++;return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});},{retryMs:5});
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{events.close();reject(Error('SSE timeout'));},1000);events.onmessage=message=>{clearTimeout(timer);events.close();resolve(message.data);};});
  assert.equal(result,'日本語\n続き');await new Promise(r=>setTimeout(r,20));assert.equal(calls,1);assert.ok(cancelled);
});

test('resource attachments append without count truncation and preserve legacy and backup records',async()=>{
  const old={attachment:{id:'old',name:'以前の写真.jpg'}};
  const files=Array.from({length:125},(_,i)=>({name:'資料'+i+'.jpg',size:i}));
  let id=0;const attachments=await appendMaterialFiles(old,files,async file=>({id:String(++id),name:file.name,size:file.size}));
  assert.equal(attachments.length,126);assert.equal(attachments[0].id,'old');assert.equal(attachments.at(-1).name,'資料124.jpg');assert.equal(old.attachments,undefined);
  const record=JSON.parse(JSON.stringify({attachments}));assert.deepEqual(materialFiles(record),attachments);
  assert.deepEqual(await appendMaterialFiles(record,[{name:'',size:0}],()=>assert.fail()),attachments);
});
