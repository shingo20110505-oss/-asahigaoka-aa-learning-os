import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=[];const assert=(ok,msg)=>{if(!ok)fail.push(msg)};const norm=v=>String(v??'').trim().toLowerCase();
const rawBlock=(text,label)=>{const m=text.match(/const RAW=`([\s\S]*?)`;/);assert(!!m,`${label}: RAW block not found`);return m?.[1]||''};
const rowsFromRaw=(text,label)=>rawBlock(text,label).split(/\r?\n/).filter(Boolean).map((line,i)=>{const fields=line.split('|');assert(fields.length===5,`${label} row ${i+1}: expected 5 fields, got ${fields.length}`);const [word,meaning,pos,level,example]=fields;assert(word&&meaning&&pos&&level&&example,`${label} row ${i+1}: required field missing`);assert(['core','entrance','phrase','form'].includes(level),`${label} row ${i+1}: invalid level ${level}`);return{word,meaning,pos,level,example}});

const legacy=read('app/legacy/main-runtime.js');
const dataLine=legacy.split(/\r?\n/).find(line=>line.startsWith('const DATA = '));
assert(!!dataLine,'base DATA line not found');
let data={vocab:[]};try{data=JSON.parse(dataLine.slice('const DATA = '.length,-1))}catch(err){fail.push(`base DATA JSON parse failed: ${err.message}`)}
const base=Array.isArray(data.vocab)?data.vocab:[];
assert(base.length===107,`base vocabulary must remain 107, got ${base.length}`);
for(let i=0;i<base.length;i++)assert(base[i]?.id===`v${String(i+1).padStart(3,'0')}`,`base id changed at ${i+1}: ${base[i]?.id}`);
const baseSnapshot=JSON.stringify(base);

const v1Text=read('english-vocabulary-supplement-v1.js'),v1=rowsFromRaw(v1Text,'v1');
assert(v1Text.includes('srsId:`v:en-sup-v1-'),'v1 stable SRS rule missing');
assert(v1Text.includes("compatibility:'append-only-existing-id-preserved'"),'v1 append-only marker missing');

const partFiles=[1,2,3,4].map(i=>`english-vocabulary-supplement-v2-data-${i}.js`);
const v2=partFiles.flatMap((file,i)=>rowsFromRaw(read(file),`v2 part ${i+1}`));
assert(v2.length===418,`v2 candidate count changed: ${v2.length}`);
const v2Surface=new Set();for(const [i,row] of v2.entries()){const key=norm(row.word);assert(!v2Surface.has(key),`v2 duplicate surface: ${row.word} at ${i+1}`);v2Surface.add(key)}
const v2Text=read('english-vocabulary-supplement-v2.js');
assert(v2Text.includes('TARGET=500'),'v2 target 500 missing');
assert(v2Text.includes('srsId:`v:${id}`'),'v2 stable SRS rule missing');
assert(v2Text.includes("compatibility:'append-only-existing-id-preserved'"),'v2 append-only marker missing');

const effective=base.map(x=>structuredClone(x)),ids=new Set(effective.map(x=>String(x.id||''))),words=new Set(effective.map(x=>norm(x.word)));
const append=(rows,prefix,target=Infinity)=>{let added=0,skipped=0;for(const [i,row] of rows.entries()){if(effective.length>=target)break;const id=`${prefix}${String(i+1).padStart(3,'0')}`,key=norm(row.word);if(!key||ids.has(id)||words.has(key)){skipped++;continue}const item={id,...row,cloze:row.example,family:[],syn:'',srsId:`v:${id}`};effective.push(item);ids.add(id);words.add(key);added++}return{added,skipped}};
const v1Result=append(v1,'en-sup-v1-');
const beforeV2=effective.length;
const v2Result=append(v2,'en-sup-v2-',500);
assert(effective.length===500,`effective vocabulary must be exactly 500, got ${effective.length} (before v2 ${beforeV2})`);
assert(new Set(effective.map(x=>x.id)).size===effective.length,'effective ids are not unique');
assert(new Set(effective.map(x=>norm(x.word))).size===effective.length,'effective normalized words are not unique');
assert(JSON.stringify(effective.slice(0,107))===baseSnapshot,'base 107 rows changed during simulation');
for(const row of effective.slice(107)){assert(row.id&&row.word&&row.meaning&&row.pos&&row.level&&row.example&&row.cloze&&row.srsId,`new row missing required fields: ${row.id||row.word}`);assert(row.srsId===`v:${row.id}`,`unstable SRS key: ${row.id}`)}

const registry=read('app/runtime-registry.js');
for(const file of ['english-vocabulary-supplement-v1.js',...partFiles,'english-vocabulary-supplement-v2.js'])assert(registry.includes(file),`runtime registry missing ${file}`);
const inventory=read('vocabulary-core/inventory-v1.json');assert(inventory.includes('asahi_learning_os_v1'),'native English progress store changed');assert(inventory.includes('reference-native-do-not-copy'),'native progress policy changed');
const sw=read('sw.js');assert(sw.includes("ext==='js'||ext==='mjs'"),'service worker JS network-first cache path changed');

console.log(JSON.stringify({status:fail.length?'FAIL':'PASS',base:base.length,v1Candidates:v1.length,v1Added:v1Result.added,v1Skipped:v1Result.skipped,beforeV2,v2Candidates:v2.length,v2Added:v2Result.added,v2SkippedBeforeTarget:v2Result.skipped,total:effective.length,failures:fail},null,2));
if(fail.length)process.exit(1);
