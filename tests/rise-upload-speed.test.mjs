import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {ChatUploads} from '../src/chat-uploads.mjs';

const image=name=>new File(['unchanged image bytes '+name],name+'.png',{type:'image/png',lastModified:1});
const entry=file=>({file,kind:'image',frames:[]});

test('preparation sends no network data; upload concurrency is two and bytes/order/timestamps stay intact',async()=>{
 const a=image('a'),b=image('b'),frame=image('frame'),c=image('c');let active=0,peak=0;const sent=[],progress=[];
 const uploads=new ChatUploads({api:()=>assert.fail('No network during preparation'),transfer:async(file,{signal,fingerprint,onProgress})=>{
  active++;peak=Math.max(peak,active);assert.match(fingerprint,/^[a-f0-9]{64}$/);sent.push([file.name,await file.text()]);
  await delay(file===a?20:5,undefined,{signal});onProgress(file.size);active--;return{id:file.name};
 }});
 const files=[{file:a,frames:[{file:frame,time:1.25}],duration:2},entry(b),entry(c)];
 await uploads.prepare(files);assert.equal(sent.length,0);
 const result=await uploads.send(files,{onProgress:(...args)=>progress.push(args)});
 assert.equal(peak,2);assert.equal(sent.length,4);for(const [name,bytes] of sent)assert.equal(bytes,'unchanged image bytes '+name.slice(0,-4));
 assert.deepEqual(result.map(f=>f.id),['a.png','b.png','c.png']);assert.deepEqual(result[0].frames,[{id:'frame.png',time:1.25}]);assert.equal(result[0].duration,2);
 for(let i=0;i<files.length;i++){const last=progress.filter(x=>x[0]===i).at(-1);assert.equal(last[1],last[2]);}
 await uploads.send(files);assert.equal(sent.length,4,'completed files are reused after a failed message send');
 uploads.reset();await uploads.send([entry(a)]);assert.equal(sent.length,5,'another login must upload to its own account');
});

test('same file is uploaded once per batch and trusted conversation attachments need no reupload',async()=>{
 const file=image('repeat'),existing=image('saved');let calls=0;
 const uploads=new ChatUploads({transfer:async()=>({id:'upload-'+ ++calls})});uploads.remember(existing,{id:'existing'});
 const result=await uploads.send([entry(file),entry(file),entry(existing)]);
 assert.deepEqual(result.map(x=>x.id),['upload-1','upload-1','existing']);assert.equal(calls,1);
});

test('failed uploads stop queued files, wait for active cancellation, and retain completed files for retry',async()=>{
 const a=image('a'),b=image('b'),c=image('c');let fail=true,active=0;const calls=[];
 const uploads=new ChatUploads({transfer:async file=>{active++;calls.push(file.name);try{await delay(file===a?20:1);if(file===a&&fail)throw Error('network');return{id:file.name};}finally{active--;}}});
 // a runs alongside b, then c; both successful attachments can be reused.
 await assert.rejects(uploads.send([entry(a),entry(b),entry(c)]),/network/);assert.equal(active,0);
 const previous=calls.length;fail=false;await uploads.send([entry(a),entry(b),entry(c)]);assert.equal(calls.length,previous+1);
});

test('cancellation and account reset reject late completions and cannot populate another session cache',async()=>{
 let finish,started;const began=new Promise(r=>started=r),file=image('slow');let calls=0;
 const uploads=new ChatUploads({transfer:async()=>{calls++;started();return new Promise(r=>finish=r);}});
 const controller=new AbortController(),sending=uploads.send([entry(file)],{signal:controller.signal});await began;
 uploads.reset();finish({id:'old-user-file'});await assert.rejects(sending,{name:'AbortError'});
 uploads.transfer=async()=>{calls++;return{id:'new-user-file'};};assert.equal((await uploads.send([entry(file)]))[0].id,'new-user-file');assert.equal(calls,2);
 controller.abort();await assert.rejects(uploads.send([entry(file)],{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,2);
});

test('an early failure cancels the other worker and never starts queued attachments',async()=>{
 const files=['bad','pending','queued'].map(n=>entry(image(n))),started=[];
 const uploads=new ChatUploads({transfer:async(file,{signal})=>{started.push(file.name);if(file.name==='bad.png'){await delay(10);throw Error('failed');}await delay(1000,undefined,{signal});return{id:file.name};}});
 await assert.rejects(uploads.send(files),/failed/);assert.deepEqual(started.sort(),['bad.png','pending.png']);
});
