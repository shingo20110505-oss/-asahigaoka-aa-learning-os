import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dataPath=path.join(root,'kokugo-chronologia/data.jsonl');
const statusPath=path.join(root,'kokugo-chronologia/KOKUGO_CHRONOLOGIA_STATUS.json');
const outDir=path.join(root,'artifacts');
const outPath=path.join(outDir,'kokugo-taxonomy-audit.json');
const KNOWN_EXCLUSIONS=new Set(['間に合う|まにあう']);

const lines=fs.readFileSync(dataPath,'utf8').split(/\r?\n/).filter(x=>x.trim());
const rows=[];
const parseErrors=[];
for(let i=0;i<lines.length;i++){
  try{rows.push(JSON.parse(lines[i]))}catch(err){parseErrors.push({line:i+1,error:String(err?.message||err)})}
}
const status=JSON.parse(fs.readFileSync(statusPath,'utf8'));
const typeCounts={yoji:0,idiom:0,four:0,other:0};
const flagCounts={strictTrue:0,idiomTrue:0,fourTrue:0};
const mismatch=[];
const duplicateIds=[];
const duplicateKeys=[];
const nonJapaneseMeaning=[];
const suspiciousReading=[];
const knownExclusionsPresent=[];
const idSeen=new Set(),keySeen=new Set();
const sample=(arr,obj,limit=50)=>{if(arr.length<limit)arr.push(obj)};
const han4=(term)=>{
  const chars=Array.from(String(term||'').normalize('NFKC'));
  return chars.length===4&&chars.every(ch=>/^\p{Script=Han}$/u.test(ch));
};
const hasJapanese=(s)=>/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(String(s||''));
const kanaLike=(s)=>/^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u.test(String(s||''));

for(let i=0;i<rows.length;i++){
  const x=rows[i]||{};
  const term=String(x.term||''),reading=String(x.reading||''),key=`${term}|${reading}`;
  if(typeCounts[x.type]!==undefined)typeCounts[x.type]++;else typeCounts.other++;
  if(x.strict===true)flagCounts.strictTrue++;
  if(x.idiom===true)flagCounts.idiomTrue++;
  if(x.four===true)flagCounts.fourTrue++;
  if(idSeen.has(String(x.id)))sample(duplicateIds,{line:i+1,id:x.id,term,reading});else idSeen.add(String(x.id));
  if(keySeen.has(key))sample(duplicateKeys,{line:i+1,key,id:x.id});else keySeen.add(key);
  if(!hasJapanese(x.meaning))sample(nonJapaneseMeaning,{line:i+1,id:x.id,term,reading,meaning:String(x.meaning||'').slice(0,160),type:x.type});
  if(reading&&!kanaLike(reading))sample(suspiciousReading,{line:i+1,id:x.id,term,reading,type:x.type});
  if(KNOWN_EXCLUSIONS.has(key))sample(knownExclusionsPresent,{line:i+1,id:x.id,term,reading,type:x.type,strict:x.strict,idiom:x.idiom,four:x.four,meaning:x.meaning});

  const bad=(reason)=>sample(mismatch,{line:i+1,id:x.id,term,reading,type:x.type,strict:x.strict,idiom:x.idiom,four:x.four,reason});
  if(!['yoji','idiom','four'].includes(x.type)){bad('unknown-type');continue}
  if(x.type==='yoji'){
    if(x.strict!==true)bad('yoji-without-strict-true');
    if(x.four!==true)bad('yoji-without-four-true');
    if(!han4(term))bad('yoji-not-exactly-four-han');
  }
  if(x.type==='idiom'&&x.idiom!==true)bad('idiom-without-idiom-true');
  if(x.type==='four'){
    if(x.four!==true)bad('four-without-four-true');
    if(x.strict===true)bad('strict-entry-misclassified-as-four');
    if(x.idiom===true)bad('idiom-entry-misclassified-as-four');
  }
  if(x.strict===true&&x.type!=='yoji')bad('strict-true-not-yoji');
  if(x.idiom===true&&x.strict!==true&&x.type!=='idiom')bad('idiom-true-not-idiom');
}

const hardFailures=[];
if(lines.length!==15000)hardFailures.push(`row-count=${lines.length}`);
if(parseErrors.length)hardFailures.push(`parse-errors=${parseErrors.length}`);
if(duplicateIds.length)hardFailures.push(`duplicate-id-samples=${duplicateIds.length}`);
if(duplicateKeys.length)hardFailures.push(`duplicate-key-samples=${duplicateKeys.length}`);
if(mismatch.length)hardFailures.push(`taxonomy-mismatch-samples=${mismatch.length}`);
if(typeCounts.yoji!==Number(status.selected_strict_yojijukugo))hardFailures.push(`yoji-count=${typeCounts.yoji},status-strict=${status.selected_strict_yojijukugo}`);

const report={
  version:'1.0.0',
  generatedAt:new Date().toISOString(),
  source:'kokugo-chronologia/data.jsonl',
  sourceRows:lines.length,
  parsedRows:rows.length,
  statusReference:status,
  typeCounts,
  flagCounts,
  hardFailures,
  parseErrors:parseErrors.slice(0,50),
  taxonomyMismatchSamples:mismatch,
  duplicateIdSamples:duplicateIds,
  duplicateKeySamples:duplicateKeys,
  rawMeaningNonJapanese:{sampleCount:nonJapaneseMeaning.length,samples:nonJapaneseMeaning},
  suspiciousReading:{sampleCount:suspiciousReading.length,samples:suspiciousReading},
  knownSemanticExclusionsPresent:knownExclusionsPresent,
  verdict:hardFailures.length?'FAIL':'PASS'
};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(hardFailures.length)process.exit(1);
