'use strict';
const fs=require('fs'),vm=require('vm');
(async()=>{
 const ctx={console,window:{},atob,Blob,DecompressionStream,Response,Uint8Array};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('chronologia-v7-data-4.js','utf8'),ctx,{filename:'chronologia-v7-data-4.js'});
 await ctx.CHRONO_V7_EXTRA_READY;
 const pack=(ctx.CHRONO_V7_PACKS||[]).find(p=>(p.items||[]).some(x=>Number(x.id)===501));if(!pack)throw new Error('supplement pack missing');
 const rows=pack.items.map(x=>[x.id,x.date,x.area,x.period,x.level,x.event].join('\t'));
 fs.writeFileSync('CHRONOLOGIA_SUPPLEMENT_ITEMS.tsv',rows.join('\n')+'\n');
 console.log(`CHRONOLOGIA_SUPPLEMENT_EXPORT items=${rows.length}`);
 if(rows.length!==500)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});