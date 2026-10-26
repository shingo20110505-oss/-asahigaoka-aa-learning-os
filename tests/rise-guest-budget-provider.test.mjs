import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createProviders} from '../bridge/providers.mjs';

async function setup(t,{match=true}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-budget-provider-'));
 t.after(async()=>{assert.equal(path.dirname(dir),os.tmpdir());await fs.rm(dir,{recursive:true,force:true});});
 let used=10,delta=1,status='completed',rateCalls=0,turns=0,controller;const replies=[];
 const reset=Math.floor(Date.now()/1000)+7*86400;
 const factory=async()=>{
  const observers=new Set();let closed=false;
  const emit=m=>{for(const fn of observers)fn(m);};
  const snapshot=()=>({accountId:match?'fixture':'different',rateLimitsByLimitId:{codex:{limitId:'codex',primary:{usedPercent:used,windowDurationMins:10080,resetsAt:reset}}}});
  return {observe(fn){observers.add(fn);return()=>observers.delete(fn);},close(){closed=true;},async request(method){
   if(closed)throw Error('closed');
   if(method==='account/read')return{account:{type:'chatgpt'},workspaceRouting:{chatgptAccountId:'fixture'}};
   if(method==='account/rateLimits/read'){rateCalls++;return snapshot();}
   if(method==='thread/start')return{thread:{id:'fixture'}};
   if(method==='turn/interrupt')return{};
   if(method==='turn/start'){
    turns++;used+=delta;emit({method:'turn/started',params:{turn:{id:'turn'}}});
    emit({method:'account/rateLimits/updated',params:{rateLimits:snapshot().rateLimitsByLimitId.codex}});
    if(status==='abort'){queueMicrotask(()=>controller.abort());return{};}
    emit({method:'item/agentMessage/delta',params:{delta:'テスト回答'}});
    emit({method:'turn/completed',params:{turn:{status,error:status==='failed'?{message:'fixture failed'}:undefined}}});return{};
   }
   throw Error('unexpected method '+method);
  }};
 };
 const provider=await createProviders({privateDir:dir,config:{ownerCodex:true,guestProvider:'codex',guestWeeklyBudget:{enabled:true}},codexFactory:factory});
 const run=(role,browserId)=>{controller=new AbortController();return provider.run({privateDir:dir,role,browserId,requestId:randomUUID(),messages:[{role:'user',text:'こんにちは'}],signal:controller.signal,onDelta:text=>replies.push(text),onBudget:value=>replies.push(value)});};
 return{dir,provider,run,replies,setDelta:n=>delta=n,setStatus:s=>status=s,counters:()=>({turns,rateCalls})};
}

test('provider enforces guest browser cap before inference, while owner remains usable without quota reads',async t=>{
 const f=await setup(t),browser=randomUUID();f.setDelta(5);await f.run('guest',browser);
 assert.equal(f.replies.find(x=>x?.mode==='estimated').browserUsed,5);
 await assert.rejects(f.run('guest',browser),{code:'BUDGET_BROWSER_LIMIT'});assert.equal(f.counters().turns,1);
 const reads=f.counters().rateCalls;await f.run('owner');assert.equal(f.counters().turns,2);assert.equal(f.counters().rateCalls,reads);
 assert.equal(f.provider.info('owner').guestBudget,null);assert.equal(f.provider.info('guest').guestBudget.totalLimit,25);
});
test('provider never starts inference when the dedicated login and rate-limit account IDs differ',async t=>{
 const f=await setup(t,{match:false});await assert.rejects(f.run('guest',randomUUID()),{code:'BUDGET_ACCOUNT'});assert.equal(f.counters().turns,0);
 await f.run('owner');assert.equal(f.counters().turns,1);
});
test('provider persists observed usage on failed and interrupted turns',async t=>{
 const f=await setup(t),b=randomUUID();f.setStatus('failed');await assert.rejects(f.run('guest',b),/fixture failed/);
 f.setStatus('interrupted');await assert.rejects(f.run('guest',b),{name:'AbortError'});
 const state=JSON.parse(await fs.readFile(path.join(f.dir,'guest-weekly-budget.json'),'utf8'));assert.equal(state.windows[state.current].total,2);
});

test('browser cancellation settles usage before closing Codex and permits the next guest turn',async t=>{
 const f=await setup(t),b=randomUUID();f.setStatus('abort');
 await assert.rejects(f.run('guest',b),{name:'AbortError'});
 const state=JSON.parse(await fs.readFile(path.join(f.dir,'guest-weekly-budget.json'),'utf8'));
 assert.equal(state.windows[state.current].total,1);
 assert.equal(state.windows[state.current].pending,null);
 assert.equal(await fs.access(path.join(f.dir,'guest-weekly-budget.json.lock')).then(()=>true,()=>false),false);
 f.setStatus('completed');await f.run('guest',b);assert.equal(f.counters().turns,2);
});
