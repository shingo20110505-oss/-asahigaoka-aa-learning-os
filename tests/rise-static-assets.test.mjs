import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBridge} from '../bridge/server.mjs';
import {injectHTTP} from '../scripts/hermetic-http.mjs';

test('local preview serves public documentation and licenses required by atomic offline precache',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rise-static-assets-'));
 const staticDir=path.join(root,'public');await fs.mkdir(staticDir);
 await fs.writeFile(path.join(staticDir,'README.md'),'runtime documentation');
 await fs.writeFile(path.join(staticDir,'LICENSE.txt'),'library license');
 const app=await createBridge({privateDir:path.join(root,'private'),staticDir,config:{}});
 const request=async pathname=>{const r=await injectHTTP(app.server,{url:app.url+pathname});return new Response(r.body,{status:r.status,headers:r.headers});};
 t.after(async()=>{await app.close();if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('rise-static-assets-'))await fs.rm(root,{recursive:true,force:true});});
 for(const file of ['README.md','LICENSE.txt']){
  const response=await request('/'+file);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/plain/);
 }
 const response=await request('/README.md');const policy=response.headers.get('content-security-policy');
 assert.match(policy,/wasm-unsafe-eval/);assert.match(policy,/worker-src 'self' blob:/);assert.ok(!policy.includes("script-src 'self' 'unsafe-eval'"));
 assert.match(policy,/frame-src 'self' blob:/);assert.doesNotMatch(policy,/huggingface\.co|\*\.hf\.co/);
 assert.equal((await request('/private/config.json')).status,404);
});
