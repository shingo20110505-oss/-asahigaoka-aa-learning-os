import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createProviders} from '../bridge/providers.mjs';

test('ordinary chat can return generated images and cited hosted searches without changing conversation mode',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-plugin-test-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const configs=[],turns=[],images=[],references=[];
 const codexFactory=async(_,config)=>{
  configs.push(config);let observe;return{observe:fn=>{observe=fn;return()=>{};},close(){},async request(method,params){
   if(method==='account/read')return{account:{type:'chatgpt'}};
   if(method==='thread/start')return{thread:{id:'fixture'}};
   if(method==='turn/start'){
    turns.push(params);
    if(config.webSearch)observe({method:'item/completed',params:{item:{type:'webSearch'}}});
    observe({method:'item/agentMessage/delta',params:{delta:'説明 [学校公式](https://example.jp/school)'}});
    observe({method:'item/completed',params:{item:{type:'imageGeneration',status:'completed',result:'image-fixture'}}});
    observe({method:'turn/completed',params:{turn:{status:'completed'}}});return{};
   }
  }};
 };
 const provider=await createProviders({privateDir:dir,config:{ownerCodex:true,guestProvider:'codex'},codexFactory});
 const run=search=>provider.run({privateDir:dir,role:'guest',messages:[{role:'user',text:'調べてイラストにして',study:{mode:'chat',search}}],signal:new AbortController().signal,onDelta(){},onImage:img=>images.push(img),onReferences:refs=>references.push(refs)});
 await run(true);await run(false);
 assert.equal(configs[0].imageMode,true);assert.equal(configs[0].webSearch,true);assert.equal(configs[1].imageMode,true);assert.equal(configs[1].webSearch,false);
 assert.deepEqual(images,['image-fixture','image-fixture']);
 assert.ok(turns[0].input.some(x=>x.text?.includes('Web検索を使い')));assert.ok(!turns[1].input.some(x=>x.text?.includes('Web検索を使い')));
 assert.equal(references.filter(rows=>rows.some(r=>r.kind==='web')).length,1);assert.equal(references.flat().find(r=>r.kind==='web').sources[0],'https://example.jp/school');
});
