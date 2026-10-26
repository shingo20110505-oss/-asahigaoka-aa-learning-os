import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveCodexExecutable} from '../bridge/codex-client.mjs';

test('automatic Codex discovery follows a desktop update without changing the server PATH',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'rise-codex-discovery-')),previous=process.env.LOCALAPPDATA;
 const bin=path.join(root,'OpenAI','Codex','bin'),old=path.join(bin,'old','codex.exe'),current=path.join(bin,'new','codex.exe');
 try{
  process.env.LOCALAPPDATA=root;
  await fs.mkdir(path.dirname(old),{recursive:true});await fs.writeFile(old,'synthetic executable');
  assert.equal(await resolveCodexExecutable('codex'),old);
  await fs.mkdir(path.dirname(current),{recursive:true});await fs.writeFile(current,'synthetic replacement');await fs.unlink(old);
  assert.equal(await resolveCodexExecutable('codex'),current);
  assert.equal(await resolveCodexExecutable(''),current);
  const custom=path.join(root,'explicit','codex.exe');assert.equal(await resolveCodexExecutable(custom),custom);
 }finally{
  if(previous===undefined)delete process.env.LOCALAPPDATA;else process.env.LOCALAPPDATA=previous;
  if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('rise-codex-discovery-'))await fs.rm(root,{recursive:true,force:true});
 }
});
