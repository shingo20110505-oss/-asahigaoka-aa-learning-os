import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBridge} from '../bridge/server.mjs';

test('local preview serves runtime license/readme assets required by atomic offline precache',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rise-device-assets-'));
 const staticDir=path.join(root,'public');await fs.mkdir(staticDir);
 await fs.writeFile(path.join(staticDir,'README.md'),'runtime documentation');
 await fs.writeFile(path.join(staticDir,'LICENSE.web-llm'),'runtime license');
 const app=await createBridge({privateDir:path.join(root,'private'),staticDir,config:{}});
 t.after(async()=>{await app.close();if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('rise-device-assets-'))await fs.rm(root,{recursive:true,force:true});});
 for(const file of ['README.md','LICENSE.web-llm']){
  const response=await fetch(app.url+'/'+file);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/plain/);
 }
 const response=await fetch(app.url+'/README.md');const policy=response.headers.get('content-security-policy');
 assert.match(policy,/wasm-unsafe-eval/);assert.match(policy,/worker-src 'self' blob:/);assert.ok(!policy.includes("script-src 'self' 'unsafe-eval'"));
 assert.equal((await fetch(app.url+'/private/config.json')).status,404);
});
