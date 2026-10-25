import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {ChatArchive} from '../src/chat-archive.mjs';import {createBridge} from '../bridge/server.mjs';import {passwordHash} from '../bridge/security.mjs';
import {createChatProxy} from '../src/chat-proxy.mjs';
function memoryStorage(){let state={meta:new Map(),threads:new Map(),files:new Map()},queue=Promise.resolve();return {run(mode,fn){const task=queue.then(async()=>{const draft=structuredClone(state),key=x=>JSON.stringify(x),tx={get:async(n,k)=>draft[n].get(key(k)),put:async(n,k,v)=>draft[n].set(key(k),structuredClone(v)),delete:async(n,k)=>draft[n].delete(key(k)),clear:async n=>draft[n].clear(),all:async n=>[...draft[n].values()],keys:async n=>[...draft[n].keys()].map(x=>JSON.parse(x))};const result=await fn(tx);if(mode==='readwrite')state=draft;return result;});queue=task.catch(()=>{});return task;}};}
const threadId='11111111-1111-4111-8111-111111111111',fileId='22222222-2222-4222-8222-222222222222';
const session=(role,id,tag=id,expires=2000)=>({role,csrf:'MUST_NOT_BE_CACHED',accessToken:'MUST_NOT_BE_CACHED',offline:{id:id.repeat(64),session:tag.repeat(64),expires},provider:{label:'Codex',token:'MUST_NOT_BE_CACHED'}});
const thread=(text,updatedAt=10,status='completed')=>({id:threadId,title:text,updatedAt,messages:[{id:'reply',role:'assistant',text,status,files:[]}],accessToken:'MUST_NOT_BE_CACHED'});
test('offline snapshots persist across reload, contain no credentials, and separate owner and individual guests',async()=>{
 const storage=memoryStorage(),make=()=>new ChatArchive({storage,now:()=>1000,channel:null});const a=make();await a.open();await a.activate(session('owner','a'));await a.list([{id:threadId,title:'owner only'}]);await a.save(thread('OWNER_ONLY'));await a.putFile(fileId,new Blob(['OWNER_FILE']));
 const reload=make();await reload.open();assert.equal((await reload.thread(threadId)).messages[0].text,'OWNER_ONLY');assert.equal(await(await reload.file(fileId)).text(),'OWNER_FILE');assert.ok(!JSON.stringify(await reload.summary()).includes('MUST_NOT_BE_CACHED'));assert.ok(!JSON.stringify(await reload.thread(threadId)).includes('MUST_NOT_BE_CACHED'));
 await reload.lock();await reload.activate(session('guest','b'));assert.equal(await reload.thread(threadId),null);assert.equal(await reload.file(fileId),null);await reload.save(thread('GUEST_B_ONLY'));await reload.lock();await reload.activate(session('guest','c'));assert.equal(await reload.thread(threadId),null);
});
test('logout and account changes fence late writes, old tabs, media and delayed session activation',async()=>{
 const storage=memoryStorage(),a=new ChatArchive({storage,now:()=>1000,channel:null}),b=new ChatArchive({storage,now:()=>1000,channel:null});await a.open();await a.activate(session('owner','a'));await b.open();const oldBinding=a.binding,oldRevision=a.revision;await b.lock();await b.activate(session('guest','b'));
 await assert.rejects(()=>a.save(thread('LATE_OWNER'),oldBinding),{code:'ARCHIVE_SESSION_CHANGED'});await assert.rejects(()=>a.putFile(fileId,new Blob(['late']),oldBinding),{code:'ARCHIVE_SESSION_CHANGED'});await assert.rejects(()=>a.thread(threadId),{code:'ARCHIVE_SESSION_CHANGED'});await assert.rejects(()=>a.activate(session('owner','a'),oldRevision),{code:'ARCHIVE_SESSION_CHANGED'});await assert.rejects(()=>a.lock(oldRevision),{code:'ARCHIVE_SESSION_CHANGED'});assert.deepEqual((await b.summary()).savedIds,[]);
 await b.save(thread('GUEST'));await b.lock();const reload=new ChatArchive({storage,now:()=>1000,channel:null});assert.equal((await reload.open()).locked,true);assert.equal(reload.binding,null);await assert.rejects(()=>reload.summary(),{code:'ARCHIVE_SESSION_CHANGED'});
});
test('expired leases cannot read offline data and stale responses cannot roll completed messages back',async()=>{
 let now=1000;const a=new ChatArchive({storage:memoryStorage(),now:()=>now,channel:null});await a.open();await a.activate(session('guest','a'));await a.save(thread('complete reply',20));await a.save(thread('comp',20,'inProgress'));assert.equal((await a.thread(threadId)).messages[0].status,'completed');assert.equal((await a.thread(threadId)).messages[0].text,'complete reply');await a.save(thread('older',10));assert.equal((await a.thread(threadId)).messages[0].text,'complete reply');now=2001;await assert.rejects(()=>a.thread(threadId),{code:'ARCHIVE_SESSION_CHANGED'});assert.equal((await a.open()).locked,true);
});
test('a delayed logout clears only its original browser credential, retaining a newer login',async()=>{
 const old='a'.repeat(43),newer='b'.repeat(43);let saved={token:old,deviceToken:'d'.repeat(43)},release,observed;
 const proxy=createChatProxy({apiRoot:'https://relay.example/api/',store:{read:async()=>structuredClone(saved),clearSession:async expected=>{observed=expected;if(saved.token===expected)saved={deviceToken:saved.deviceToken};}},fetchImpl:()=>new Promise(resolve=>{release=()=>resolve(new Response('{}',{status:200}));})});
 const pending=proxy(new Request('https://site.example/api/logout',{method:'POST'}),'logout');await new Promise(resolve=>setImmediate(resolve));saved={...saved,token:newer};release();await pending;assert.equal(observed,old);assert.equal(saved.token,newer);
});
test('server supplies stable per-account cache identities, distinct sessions and no cross-guest authority',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-archive-')),app=await createBridge({privateDir:dir,config:{ownerPassword:await passwordHash('owner1234'),guestPassword:await passwordHash('guest1234')}});t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const login=async(role,cookie='')=>{const response=await fetch(app.url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({role,password:role==='owner'?'owner1234':'guest1234'})});assert.equal(response.status,200);return {data:await response.json(),cookie:response.headers.get('set-cookie').split(';')[0]};};
 const owner=await login('owner'),owner2=await login('owner'),g1=await login('guest'),g2=await login('guest'),g1again=await login('guest',g1.cookie);assert.equal(owner.data.offline.id,owner2.data.offline.id);assert.notEqual(owner.data.offline.session,owner2.data.offline.session);assert.notEqual(g1.data.offline.id,g2.data.offline.id);assert.notEqual(owner.data.offline.id,g1.data.offline.id);assert.equal(g1.data.offline.id,g1again.data.offline.id);const verified=await(await fetch(app.url+'/api/session',{headers:{Cookie:g2.cookie}})).json();assert.deepEqual(verified.offline,g2.data.offline);assert.equal((await fetch(app.url+'/api/threads',{headers:{Authorization:'Bearer '+owner.data.offline.session}})).status,401);
});

test('deleting a cached conversation removes its unshared media and preserves another conversation',async()=>{const a=new ChatArchive({storage:memoryStorage(),now:()=>1000,channel:null});await a.open();await a.activate(session('owner','a'));const first=thread('remove');first.messages[0].files=[{id:fileId,name:'only.png'}];const second={...thread('keep'),id:'33333333-3333-4333-8333-333333333333'};await a.list([first,second]);await a.save(first);await a.save(second);await a.putFile(fileId,new Blob(['copy']));await a.remove(threadId);assert.equal(await a.thread(threadId),null);assert.equal(await a.file(fileId),null);assert.equal((await a.thread(second.id)).title,'keep');assert.equal((await a.summary()).threads.length,1);await a.save(first);await a.list([first,second]);assert.equal(await a.thread(threadId),null);assert.equal((await a.summary()).threads.length,1);});


test('local AI conversations survive remote list refresh and remain fenced by account and logout',async()=>{
 const storage=memoryStorage(),a=new ChatArchive({storage,now:()=>1000,channel:null});await a.open();await a.activate(session('owner','a'));
 const local={...thread('local conversation'),localOnly:true};local.messages[0].localModel='Qwen';await a.save(local);
 assert.equal((await a.summary()).threads[0].localOnly,true);
 await a.list([]);assert.equal((await a.thread(threadId)).localOnly,true);assert.equal((await a.thread(threadId)).messages[0].localModel,'Qwen');
 const old=a.binding;await a.lock();await a.activate(session('guest','b'));assert.equal(await a.thread(threadId),null);
 await assert.rejects(()=>a.save(local,old),{code:'ARCHIVE_SESSION_CHANGED'});
 await a.save(local);await a.remove(threadId);await a.list([]);assert.deepEqual((await a.summary()).threads,[]);
});
