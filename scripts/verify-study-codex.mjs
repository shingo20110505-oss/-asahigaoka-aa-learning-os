// Explicit manual smoke test using the existing signed-in PC account; never run in CI.
import {randomUUID} from 'node:crypto';import fs from 'node:fs/promises';import path from 'node:path';
import {createProviders} from '../bridge/providers.mjs';import {openCodex} from '../bridge/codex-client.mjs';
const privateDir=process.argv[2];if(!privateDir)throw Error('Pass the existing private directory');
const config=JSON.parse(await fs.readFile(path.join(privateDir,'config.json'),'utf8'));
const out='test-results/study-codex';await fs.mkdir(out,{recursive:true});const runs=await fs.readFile(out+'/live.json','utf8').then(JSON.parse).then(x=>x.runs.filter(x=>!x.error)).catch(()=>[]);
for(const role of (process.argv[3]?[process.argv[3]]:['guest','owner'])){
 const calls=[],provider=await createProviders({privateDir,config,codexFactory:async(...args)=>{const c=await openCodex(...args),original=c.handleTools.bind(c);c.handleTools=fn=>original(async p=>{const start=performance.now(),result=await fn(p);calls.push({tool:p.tool,arguments:p.arguments,ms:performance.now()-start,success:result.success});return result;});return c;}});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000),started=performance.now();let text='',first=null,refs=[],error=null;
 try{await provider.run({privateDir,role,browserId:randomUUID(),requestId:'study-'+Date.now(),messages:[{role:'user',text:'RISEの地理教材を使って、輪中と電照菊をそれぞれ説明してください。確認のためrise_searchを語ごとに2回使い、電照菊はrise_readでも本文を確かめ、参照リンクを付けて200〜400字程度で回答してください。',files:[],study:{mode:'chat'}}],signal:controller.signal,onDelta:s=>{first??=performance.now()-started;text+=s;},onReferences:r=>refs=r});}catch(e){error=e.message;}finally{clearTimeout(timeout);}
 const run={role,model:provider.info(role).model,firstVisibleMs:first,totalMs:performance.now()-started,calls,references:refs.map(r=>({id:r.id,route:r.route})),answer:text,error};runs.push(run);await fs.writeFile(out+'/live.json',JSON.stringify({at:new Date().toISOString(),runs},null,2));console.log(JSON.stringify({role,model:run.model,calls:calls.map(c=>c.tool),firstVisibleMs:first,totalMs:run.totalMs,error}));if(error)process.exitCode=1;
}
