// Reproducible pinned npm assets; verify SRI; no package lifecycle scripts.
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const lock=JSON.parse(await fs.readFile(path.join(root,'runtime-lock.json'),'utf8'));
for(const [name,d]of Object.entries(lock)){
 const base=path.join(root,'work',name);await fs.mkdir(base,{recursive:true});const r=await fetch(d.tarball);if(!r.ok)throw Error('Runtime download '+r.status);const bytes=Buffer.from(await r.arrayBuffer());if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==d.integrity)throw Error('Runtime integrity mismatch');const tar=path.join(base,'runtime.tgz');await fs.writeFile(tar,bytes);execFileSync('tar',['-xzf',tar,'-C',base]);
 const mappings=name==='wllama'?[['esm/index.js','wllama/index.js'],['esm/wasm/wllama.wasm','wllama/wasm/wllama.wasm'],['LICENCE','LICENSE.wllama']]:[['wasm/wllama.js','compat/wllama.js'],['wasm/wllama.wasm','compat/wllama.wasm'],['LICENSE','LICENSE.compat']];
 for(const [src,dest]of mappings){const out=path.join(root,'vendor',dest);await fs.mkdir(path.dirname(out),{recursive:true});await fs.copyFile(path.join(base,'package',src),out).catch(async e=>{if(name==='compat'&&src==='LICENSE'){const metadata=JSON.parse(await fs.readFile(path.join(base,'package/package.json'),'utf8'));if(metadata.license!=='MIT')throw e;await fs.copyFile(path.join(root,'vendor/LICENSE.wllama'),out);}else throw e;});}
 console.log(name,d.version,'integrity verified');
}
