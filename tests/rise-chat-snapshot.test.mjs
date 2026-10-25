import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {createBridge} from '../bridge/server.mjs';
import {passwordHash} from '../bridge/security.mjs';
import {injectHTTP} from '../scripts/hermetic-http.mjs';

test('concurrent polling never reports an unfinished reply as idle',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-snapshot-')),password='Synthetic snapshot test';
 const hash=await passwordHash(password);
 const app=await createBridge({privateDir:dir,config:{ownerPassword:hash,guestPassword:hash},provider:{ready:()=>true,run:async({onDelta,messages})=>{onDelta(messages.at(-1).text);await yieldTurn();onDelta(' complete');}}});
 t.after(async()=>{await app.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-snapshot-'))await fs.rm(dir,{recursive:true,force:true});});
 let headers={};
 const call=async(route,body)=>{const r=await injectHTTP(app.server,{url:app.url+'/api'+route,method:body?'POST':'GET',headers:{...headers,...(body?{'content-type':'application/json'}:{})},body:body?Buffer.from(JSON.stringify(body)):undefined});assert.ok(r.status<400,route+': '+r.body.toString());return {...r,data:JSON.parse(r.body)};};
 const login=await call('/login',{role:'guest',password});headers={cookie:login.headers['set-cookie'].split(';')[0],'x-rise-csrf':login.data.csrf};
 for(let n=0;n<24;n++){
  const thread=(await call('/threads',{title:'Snapshot '+n})).data;
  await call('/threads/'+thread.id+'/messages',{text:'Reply '+n,files:[]});
  let complete=false;
  const deadline=Date.now()+5000;
  while(!complete&&Date.now()<deadline){
   const snapshots=await Promise.all(Array.from({length:4},()=>call('/threads/'+thread.id)));
   for(const {data} of snapshots)if(!data.busy){assert.equal(data.messages.at(-1).status,'completed');assert.equal(data.messages.at(-1).text,'Reply '+n+' complete');complete=true;}
   await yieldTurn();
  }
  assert.ok(complete,'reply finished within bounded polling');
 }
});
