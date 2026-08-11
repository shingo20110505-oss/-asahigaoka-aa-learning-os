'use strict';
const fs=require('fs'),vm=require('vm');
function read(name){return fs.readFileSync(name,'utf8')}
function extractJSONArray(source,marker){const p=source.indexOf(marker);if(p<0)throw new Error(marker+' not found');let i=source.indexOf('[',p),depth=0,str=false,esc=false;for(let j=i;j<source.length;j++){const c=source[j];if(str){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}if(c==='"'){str=true;continue}if(c==='[')depth++;else if(c===']'){depth--;if(depth===0)return JSON.parse(source.slice(i,j+1))}}throw new Error('DATA array end not found')}
const html=read('chronologia.html'),base=extractJSONArray(html,'const DATA =');
const ctx={console,window:{},document:{readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},createElement(){return{style:{},appendChild(){}}}},setInterval(){return 0},clearInterval(){},CustomEvent:function(){}};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['chronologia-v7-data-1.js','chronologia-v7-data-2a.js','chronologia-v7-data-2b.js','chronologia-v7-data-3.js','chronologia-v7-overrides.js'])vm.runInContext(read(f),ctx,{filename:f});
const data=[...base],seen=new Set(base.map(x=>Number(x.id)));for(const pack of ctx.CHRONO_V7_PACKS||[])for(const x of pack.items||[]){const id=Number(x.id);if(id>500||seen.has(id))continue;seen.add(id);data.push(x)}
const rows=data.filter(x=>Number(x.id)<=500).sort((a,b)=>Number(a.id)-Number(b.id));if(rows.length!==500)throw new Error('core count mismatch '+rows.length);
const clean=s=>String(s??'').replace(/[\t\r\n]+/g,' ').trim();const render=part=>part.map(x=>[x.id,x.date,x.area,x.period,x.level,x.event,x.detail,(x.tags||[]).join('・')].map(clean).join('\t')).join('\n')+'\n';
fs.writeFileSync('CHRONOLOGIA_CORE_ITEMS.tsv',render(rows));
for(let start=1;start<=500;start+=50){const end=start+49,part=rows.filter(x=>Number(x.id)>=start&&Number(x.id)<=end),name=`CHRONOLOGIA_CORE_${String(start).padStart(3,'0')}_${String(end).padStart(3,'0')}.tsv`;if(part.length!==50)throw new Error(`${name} count ${part.length}`);fs.writeFileSync(name,render(part))}
console.log('CHRONOLOGIA_CORE_EXPORT '+JSON.stringify({items:rows.length,blocks:10,first:rows[0]?.id,last:rows.at(-1)?.id,pass:rows.length===500}));