// Download pinned packages, verify npm SRI, and copy browser assets. No npm lifecycle scripts.
import fs from'node:fs/promises';import path from'node:path';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{root}from'./serve.mjs';
const lock=JSON.parse(await fs.readFile(path.join(root,'runtime-lock.json'),'utf8'));
await fs.mkdir(path.join(root,'vendor'),{recursive:true});
for(const name of ['webllm','wllama']){
 const d=lock[name],base=path.join(root,'work',name);await fs.mkdir(base,{recursive:true});
 const response=await fetch(d.tarball);if(!response.ok)throw Error('Download failed: '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==d.integrity)throw Error('SRI mismatch: '+name);
 const tar=path.join(base,'package.tgz');await fs.writeFile(tar,bytes);execFileSync('tar',['-xzf',tar,'-C',base]);
 if(name==='webllm'){await fs.copyFile(path.join(base,'package/lib/index.js'),path.join(root,'vendor/webllm.mjs'));await fs.copyFile(path.join(base,'package/LICENSE'),path.join(root,'vendor/LICENSE.webllm'));}
 else{await fs.mkdir(path.join(root,'vendor/wllama/wasm'),{recursive:true});for(const file of ['index.js','wasm/wllama.wasm'])await fs.copyFile(path.join(base,'package/esm',file),path.join(root,'vendor/wllama',file));await fs.copyFile(path.join(base,'package/LICENCE'),path.join(root,'vendor/LICENSE.wllama'));}
 console.log(name,d.version,'SRI verified');
}
