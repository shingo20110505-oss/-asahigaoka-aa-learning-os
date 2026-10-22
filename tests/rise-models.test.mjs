import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createProviders} from '../bridge/providers.mjs';
import {codexSelection,guestProvider} from '../bridge/config.mjs';
import {historyRank} from '../src/history-domain.mjs';

test('both Codex roles get explicit models in isolated ephemeral requests, with admin high reasoning',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-model-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'codex-owner'));await fs.writeFile(path.join(dir,'codex-owner','auth.json'),'{}');
 const clients=[],config={ownerCodex:true,ownerModel:'gpt-6-astra',ownerReasoningEffort:'high',guestProvider:'codex',guestCodexModel:'gpt-6.1-sol'};
 const codexFactory=async()=>{const calls=[],client={calls,closed:false,observe(fn){this.listener=fn;return()=>{};},close(){this.closed=true;},async request(method,params){calls.push({method,params});if(method==='account/read')return{account:{type:'chatgpt'}};if(method==='thread/start')return{thread:{id:'private-'+clients.indexOf(client)},model:params.model};if(method==='turn/start'){this.listener({method:'turn/completed',params:{turn:{status:'completed'}}});return{};}}};clients.push(client);return client;};
 const provider=await createProviders({privateDir:dir,config,codexFactory});
 for(const role of ['owner','guest']){assert.equal(provider.ready(role),true);assert.equal(provider.info(role).kind,'codex');await provider.run({privateDir:dir,role,messages:[{role:'user',text:role+'-private-canary'}],signal:new AbortController().signal,onDelta(){}});}
 assert.equal(clients.length,2);
 for(const [i,role]of ['owner','guest'].entries()){
  const client=clients[i],start=client.calls.find(x=>x.method==='thread/start').params,turn=client.calls.find(x=>x.method==='turn/start').params;
  assert.equal(start.model,i?'gpt-6.1-sol':'gpt-6-astra');assert.equal(turn.model,start.model);assert.equal(start.ephemeral,true);assert.equal(start.permissions,'rise-chat');assert.equal(turn.effort,i?undefined:'high');assert.ok(JSON.stringify(turn.input).includes(role+'-private-canary'));assert.ok(!JSON.stringify(turn.input).includes((i?'owner':'guest')+'-private-canary'));assert.equal(client.closed,true);
 }
 const denied=await createProviders({privateDir:dir,config,codexFactory:async()=>({request:async method=>method==='account/read'?{account:{type:'chatgpt'}}:{thread:{id:'wrong'},model:'different-model'},observe:()=>()=>{},close(){}})});
 await assert.rejects(()=>denied.run({privateDir:dir,role:'guest',messages:[{role:'user',text:'hello'}],signal:new AbortController().signal,onDelta(){}}),/指定したモデル/);
 const loggedOut=await createProviders({privateDir:dir,config:{...config,ownerCodex:false},codexFactory});assert.equal(loggedOut.ready('guest'),false);
});
test('role settings reject malformed models and efforts while preserving legacy provider choice',()=>{
 assert.equal(guestProvider({}),'ollama');assert.equal(guestProvider({guestProvider:'codex'}),'codex');
 assert.throws(()=>guestProvider({guestProvider:'remote'}));assert.throws(()=>codexSelection({ownerReasoningEffort:'invalid'},'owner'));assert.throws(()=>codexSelection({guestCodexModel:'x\nsecret'},'guest'));
 assert.deepEqual(codexSelection({ownerModel:'gpt-6-astra',ownerReasoningEffort:'high'},'owner'),{model:'gpt-6-astra',effort:'high'});
});
test('personal history rank overrides do not alter original or legacy progress',()=>{
 const row={level:'A'},progress={rank:'S',memo:'keep',legacyProgress:true};assert.equal(historyRank(row,progress),'S');assert.equal(historyRank(row,{rank:''}),'A');assert.equal(historyRank(row,true),'A');assert.equal(historyRank(row,{rank:'invalid'}),'A');assert.deepEqual(row,{level:'A'});assert.equal(progress.memo,'keep');
});
