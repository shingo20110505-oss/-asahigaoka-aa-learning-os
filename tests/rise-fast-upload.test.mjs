import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBridge} from '../bridge/server.mjs';
import {passwordHash} from '../bridge/security.mjs';
import {uploadFile,fileFingerprint} from '../src/chat-media.mjs';

test('initial image bytes finish in one request; larger uploads resume exactly and remain account scoped',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-fast-upload-')),password='Disposable test only',hash=await passwordHash(password);
 const app=await createBridge({privateDir:dir,config:{ownerPassword:hash,guestPassword:hash}});
 t.after(async()=>{await app.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-fast-upload-'))await fs.rm(dir,{recursive:true});});
 const login=async()=>{const r=await fetch(app.url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'guest',password})});return{Cookie:r.headers.get('set-cookie').split(';')[0],'X-Rise-CSRF':(await r.json()).csrf};};
 const a=await login(),b=await login(),calls=[];
 const api=async(route,{body,headers={},...options}={})=>{calls.push({route,method:options.method});const r=await fetch(app.url+'/api'+route,{...options,headers:{...a,...(body instanceof Blob?{}:{'Content-Type':'application/json'}),...headers},body:body instanceof Blob?body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(value.error);return value;};
 const bytes=Buffer.alloc(900000,71);Buffer.from('89504e470d0a1a0a','hex').copy(bytes);const file=new File([bytes],'image.png',{type:'image/png',lastModified:1});
 const saved=await uploadFile(file,{api});assert.equal(calls.length,1);assert.equal(saved.type,'image/png');assert.equal(saved.size,file.size);
 assert.deepEqual(Buffer.from(await(await fetch(app.url+'/api/files/'+saved.id,{headers:a})).arrayBuffer()),bytes);
 assert.equal((await fetch(app.url+'/api/files/'+saved.id,{headers:b})).status,404);
 assert.equal((await fetch(app.url+'/api/uploads',{method:'POST',headers:{...a,'X-Rise-CSRF':'bad','Content-Type':'application/json'},body:JSON.stringify({name:'x',size:0,fingerprint:'b'.repeat(64),initialData:''})})).status,403);
 for(const initialData of ['!!!!','YQ','YQ==\n',Buffer.alloc(1024*1024+1).toString('base64')])await assert.rejects(api('/uploads',{method:'POST',body:{name:'bad',size:2*1024*1024,fingerprint:'b'.repeat(64),initialData}}),/不正/);
 await assert.rejects(api('/uploads',{method:'POST',body:{name:'bad',size:0,fingerprint:'b'.repeat(64),initialData:'YQ=='}}),/不正/);
 const big=new File([bytes,bytes,bytes,bytes],'large.png',{type:'image/png',lastModified:1}),fingerprint=await fileFingerprint(big);
 const partial=await api('/uploads',{method:'POST',body:{name:big.name,size:big.size,fingerprint,initialData:Buffer.from(await big.slice(0,1024*1024).arrayBuffer()).toString('base64')}});
 assert.equal(partial.offset,1024*1024);assert.equal(partial.chunkSize,3*1024*1024);assert.equal(partial.file,undefined);
 calls.length=0;const finished=await uploadFile(big,{api});assert.equal(finished.id,partial.id);assert.equal(calls.length,3);assert.deepEqual(calls.map(x=>x.method),['POST','PATCH','POST']);
 assert.deepEqual(Buffer.from(await(await fetch(app.url+'/api/files/'+finished.id,{headers:a})).arrayBuffer()),Buffer.from(await big.arrayBuffer()));
});
