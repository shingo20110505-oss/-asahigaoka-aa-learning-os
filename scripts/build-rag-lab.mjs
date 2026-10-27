import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{buildStudyCorpus}from'../src/study-corpus.mjs';import{enrichHistory}from'../bridge/history-reference-content.mjs';
export async function buildRagLab(out){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(root,'experiments/rag'),dest=path.join(out,'labs/rag');await fs.mkdir(dest,{recursive:true});
 for(const name of ['index.html','style.css','lab.mjs','questions.mjs','retrieval.mjs','worker.mjs','models.json','runtime-lock.json','vendor'])await fs.cp(path.join(source,name),path.join(dest,name),{recursive:true});
 await fs.copyFile(path.join(root,'src/study-search.mjs'),path.join(dest,'study-search.mjs'));
 const json=async name=>JSON.parse(await fs.readFile(path.join(root,'data',name+'.json'),'utf8'));const docs=buildStudyCorpus({english:await json('english/words'),history:enrichHistory(await json('history'))}),corpus=JSON.stringify(docs);await fs.writeFile(path.join(dest,'corpus.json'),corpus);
 await fs.copyFile(path.join(root,'data/english/LICENSE.txt'),path.join(dest,'LICENSE.english.txt'));
 await fs.writeFile(path.join(dest,'manifest.json'),JSON.stringify({documents:docs.length,corpusSha256:createHash('sha256').update(corpus).digest('hex'),searchSha256:createHash('sha256').update(await fs.readFile(path.join(dest,'study-search.mjs'))).digest('hex')}));
 async function files(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);e.isDirectory()?out.push(...await files(p)):out.push(p);}return out;}
 const list=await files(dest),hash=createHash('sha256');for(const p of list)hash.update(path.relative(dest,p)).update(await fs.readFile(p));const version=hash.digest('hex').slice(0,12),names=list.map(p=>'./'+path.relative(dest,p).replaceAll('\\','/'));
 await fs.writeFile(path.join(dest,'sw.js'),(await fs.readFile(path.join(source,'sw.js'),'utf8')).replace('__VERSION__',version).replace('__FILES__',JSON.stringify(names)));
 return {version,documents:docs.length};
}
