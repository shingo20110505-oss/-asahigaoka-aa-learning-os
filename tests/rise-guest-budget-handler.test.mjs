import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createBridge} from '../bridge/server.mjs';
import {passwordHash} from '../bridge/security.mjs';
import {PAGES_ORIGIN} from '../src/chat-target.mjs';

for(const pages of [false,true])test('handler separates browser budgets from restored history '+(pages?'Pages bearer':'local cookies'),async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-budget-handler-'));let handler;
 const calls=[],password='fixture-password-only',origin='https://relay.example',relayToken='r'.repeat(43);
 const app=await createBridge({privateDir:dir,publicOrigin:pages?origin:null,config:{ownerPassword:await passwordHash(password),guestPassword:await passwordHash(password),...(pages?{publicOrigin:origin,relayToken}:{})},provider:{ready:()=>true,run:async args=>{calls.push({role:args.role,browserId:args.browserId});args.onDelta('fixture');}},serverFactory(fn){handler=fn;return{once(){},listen(_port,_host,done){done();},address(){return{port:4318};},close(done){done();}};}});
 t.after(async()=>{await app.close();assert.equal(path.dirname(dir),os.tmpdir());await fs.rm(dir,{recursive:true,force:true});});
 async function call(route,{who,body,method=body?'POST':'GET'}={}){
  const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);Object.assign(req,{method,url:'/api'+route,socket:{remoteAddress:'fixture'},headers:{host:pages?'relay.example':'localhost:4318',...(pages?{origin:PAGES_ORIGIN,'x-rise-transport':'pages','x-rise-relay':relayToken,'x-rise-public-origin':origin}:{}),...(who?pages?{authorization:'Bearer '+who.data.accessToken,'x-rise-csrf':who.data.csrf}:{cookie:who.cookie,'x-rise-csrf':who.data.csrf}:{})}});
  const result={headers:{}};const res={headersSent:false,setHeader(k,v){result.headers[k.toLowerCase()]=v;},writeHead(status,headers){result.status=status;Object.assign(result.headers,Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v])));this.headersSent=true;},end(data){result.data=data?JSON.parse(String(data)):null;},destroy(){throw Error('unexpected response destruction');}};
  await handler(req,res);result.cookie=[].concat(result.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');return result;
 }
 const login=(who,recovery)=>call('/login',{who,body:{role:'guest',password,recovery,...(pages&&who?{deviceToken:who.data.deviceToken}:{})}});
 const a=await login();assert.equal(a.status,200);const b=await login();assert.notEqual(a.data.budgetBrowserKey,b.data.budgetBrowserKey);
 const thread=await call('/threads',{who:a,body:{title:'fixture'}});const recovery=await call('/recovery',{who:a,body:{}});
 const restored=await login(undefined,recovery.data.code);assert.equal((await call('/threads/'+thread.data.id,{who:restored})).status,200);assert.notEqual(restored.data.budgetBrowserKey,a.data.budgetBrowserKey);
 await call('/logout',{who:a,body:{}});const again=await login(a);assert.equal(again.data.budgetBrowserKey,a.data.budgetBrowserKey);
 for(const who of [again,restored]){
  const r=await call('/threads/'+thread.data.id+'/messages',{who,body:{text:'fixture',files:[],browserId:'client-cannot-select-this'}});assert.equal(r.status,201);
  for(let n=0;n<100;n++){const current=await call('/threads/'+thread.data.id,{who});if(!current.data.busy)break;await new Promise(r=>setTimeout(r,5));}
 }
 assert.equal(calls.length,2);assert.notEqual(calls[0].browserId,calls[1].browserId);assert.notEqual(calls[0].browserId,'client-cannot-select-this');
 const owner=await call('/login',{body:{role:'owner',password}});assert.equal(owner.data.budgetBrowserKey,null);
});
