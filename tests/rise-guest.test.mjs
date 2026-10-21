import test from 'node:test';
import assert from 'node:assert/strict';
import {InferenceQueue,runGuest,inspectGuestModel} from '../bridge/guest-provider.mjs';
import {inputs} from '../bridge/providers.mjs';
import {GUEST_LIMITS,validateChatInput} from '../src/chat-policy.mjs';
import {fileFingerprint} from '../src/chat-media.mjs';
import {mergeChatSnapshot} from '../src/chat-sync.mjs';
const guest={url:'http://127.0.0.1:11434',model:'fixture'};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('guest inference serializes requests and cancellation removes a waiting request',async()=>{
  const queue=new InferenceQueue(),release=deferred(),started=deferred(),order=[];
  const first=queue.run(new AbortController().signal,async()=>{order.push('first');started.resolve();await release.promise;});await started.promise;
  const abort=new AbortController();const second=queue.run(abort.signal,()=>order.push('cancelled'));const rejects=assert.rejects(second,{name:'AbortError'});
  const third=queue.run(new AbortController().signal,()=>order.push('third'));
  abort.abort();await rejects;assert.deepEqual(order,['first']);release.resolve();await Promise.all([first,third]);assert.deepEqual(order,['first','third']);assert.equal(queue.active,false);assert.equal(queue.waiting.length,0);
});

test('guest stream handles split UTF-8, requires completion and releases model memory',async()=>{
  let request,answer='';const encoder=new TextEncoder();
  const fetchImpl=async(_url,options)=>{request=JSON.parse(options.body);const bytes=encoder.encode('{"message":{"content":"理由です。"}}\n{"done":true,"done_reason":"length"}');return new Response(new ReadableStream({start(c){for(let n=0;n<bytes.length;n+=2)c.enqueue(bytes.slice(n,n+2));c.close();}}));};
  const args={guest,input:[{type:'text',text:'because'}],guidance:'explain',signal:new AbortController().signal,queue:new InferenceQueue(),onDelta:x=>answer+=x,fetchImpl,inspectModel:async()=>({thinking:false,vision:true})};
  await runGuest(args);assert.ok(answer.startsWith('理由です。'));assert.ok(answer.includes('長さの上限'));assert.equal(request.keep_alive,0);assert.equal(request.options.num_ctx,8192);assert.equal(request.messages[1].content,'because');
  await assert.rejects(runGuest({...args,fetchImpl:async()=>new Response('{"message":{"content":"途中"}}\n')}),/途中で切れ/);
  await assert.rejects(runGuest({...args,fetchImpl:async()=>new Response('{"error":"model unavailable"}')}),/model unavailable/);
  await assert.rejects(runGuest({...args,fetchImpl:async()=>new Response('{"done":true}')}),/本文が返りません/);
  await assert.rejects(runGuest({...args,input:[{type:'localImage',path:'never-open'}],inspectModel:async()=>({vision:false})}),/画像に対応していません/);
});

test('installed model capabilities govern image input and optional thinking controls',async()=>{
 const inspect=info=>inspectGuestModel({guest,signal:new AbortController().signal,fetchImpl:async()=>Response.json(info)});
 assert.deepEqual(await inspect({capabilities:['completion']}),{vision:false,thinking:undefined});
 assert.deepEqual(await inspect({capabilities:['completion','vision','thinking']}),{vision:true,thinking:false});
 assert.deepEqual(await inspect({capabilities:['completion'],thinking:{values:['low','high']}}),{vision:false,thinking:undefined});
});

test('guest bounds preserve the latest question and reject excess images without changing stored files',async()=>{
  const input=await inputs({role:'guest',privateDir:'',messages:[{role:'user',text:'過去'.repeat(7000)},{role:'user',text:'LATEST_QUESTION'}]});
  assert.equal(input.omitted,true);assert.equal(input.at(-1).text,'利用者: LATEST_QUESTION');assert.ok(input.map(x=>x.text||'').join('').length<6200);
  assert.throws(()=>validateChatInput({text:'x'.repeat(4001),files:[]},GUEST_LIMITS),/4,000/);
  assert.throws(()=>validateChatInput({text:'x',files:[{kind:'video',size:10**12,frames:Array.from({length:5},()=>({size:100}))}]},GUEST_LIMITS),/合計4枚/);
  assert.doesNotThrow(()=>validateChatInput({text:'x',files:[{kind:'video',size:10**12,frames:[{size:100}]}]},GUEST_LIMITS));
  assert.throws(()=>validateChatInput({text:'x',files:[{kind:'image',size:9*1024*1024}]},GUEST_LIMITS),/8MB/);
});

test('resumed file identity covers the tail and hashing is cancellable',async()=>{
  const head=new Uint8Array(1024*1024+10),options={type:'video/mp4',lastModified:1234};
  const a=new File([head,new Uint8Array([1])],'same.mp4',options),b=new File([head,new Uint8Array([2])],'same.mp4',options);
  assert.notEqual(await fileFingerprint(a),await fileFingerprint(b));assert.equal(await fileFingerprint(a),await fileFingerprint(a));
  const abort=new AbortController();abort.abort();await assert.rejects(fileFingerprint(a,{signal:abort.signal}),{name:'AbortError'});
});

test('reconnecting snapshots do not roll back newer streamed text and completed state wins',()=>{
 const live={id:'thread',messages:[{id:'a',text:'受信した新しい文章',status:'inProgress'},{id:'b',text:'新しい回答',status:'inProgress'}]};
 const lagging={id:'thread',busy:true,messages:[{id:'a',text:'受信した',status:'inProgress'}]};
 const merged=mergeChatSnapshot(live,lagging);assert.equal(merged.messages[0].text,live.messages[0].text);assert.equal(merged.messages[1].id,'b');
 const done=mergeChatSnapshot(live,{id:'thread',busy:false,messages:[{id:'a',text:'最終回答',status:'completed'}]});assert.equal(done.messages[0].text,'最終回答');assert.equal(done.messages.length,1);
});
