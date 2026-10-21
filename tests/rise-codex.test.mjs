import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {codexEnvironment,codexArguments,disabledFeatures} from '../bridge/codex-client.mjs';

test('owner Codex uses an isolated home, no inherited API credentials, no project instructions and a restricted profile',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-codex-test-'));
  t.after(async()=>{if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-codex-test-'))await fs.rm(dir,{recursive:true});});
  const {home,cwd,env}=await codexEnvironment(dir);assert.equal(env.CODEX_HOME,home);assert.equal(path.dirname(home),dir);assert.equal(path.dirname(cwd),dir);assert.deepEqual(await fs.readdir(cwd),[]);
  for(const key of ['OPENAI_API_KEY','GITHUB_TOKEN','CLOUDFLARE_API_TOKEN','NODE_OPTIONS'])assert.equal(key in env,false);
  const args=codexArguments();assert.ok(args.includes('project_doc_max_bytes=0'));assert.ok(args.includes('default_permissions="rise-chat"'));assert.ok(args.includes('permissions.rise-chat.network.enabled=false'));assert.ok(!args.some(x=>x.includes('danger-full-access')||x.includes('sandbox_mode')));
  for(const feature of ['shell_tool','unified_exec','apps','plugins','memories','browser_use','computer_use','multi_agent'])assert.ok(disabledFeatures.includes(feature));
});
