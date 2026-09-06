import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dataPath=path.join(root,'kokugo-chronologia/data.jsonl');
const statusPath=path.join(root,'kokugo-chronologia/KOKUGO_CHRONOLOGIA_STATUS.json');
const quarantinePath=path.join(root,'kokugo-chronologia/taxonomy-quarantine-v1.json');
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
const quarantine=JSON.parse(fs.readFileSync(quarantinePath,'utf8'));
const quarantineRows=Array.isArray(quarantine.nonCanonicalYoji)?quarantine.nonCanonicalYoji:[];
const quarantineById=new Map(quarantineRows.map(x=>[String(x.id),x]));
const typeCounts={yoji:0,idiom:0,four:0,other:0};
const flagCounts={strictTrue:0,idiomTrue:0,fourTrue:0,strictAndIdiom:0};
let mismatchCount=0,nonJapaneseMeaningCount=0,suspiciousReadingCount=0,nonCanonicalYojiCount=0;
const mismatch=[];
const duplicateIds=[];
const duplicateKeys=[];
const nonJapaneseMeaning=[];
const suspiciousReading=[];
const nonCanonicalYoji=[];
const unquarantinedNonCanonicalYoji=[];
const quarantineDrift=[];
const knownExclusionsPresent=[];
const idSeen=new Set(),keySeen=new Set(),nonCanonicalSeen=new Set();
const sample=(arr,obj,limit=100)=>{if(arr.length<limit)arr.push(obj)};
const yojiSurface4=(term)=>{
  const chars=Array.from(String(term||'').normalize('NFKC'));
  return chars.length===4&&chars.every(ch=>/^\p{Script=Han}$/u.test(ch)||ch==='々'||ch==='〻');
};
const hasJapanese=(s)=>/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(String(s||''));
const kanaLike=(s)=>/^[\p{Script=Hiragana}\p{Script=Katakana}ー・、\s]+$/u.test(String(s||''));

for(let i=0;i<rows.length;i++){
  const x=rows[i]||{};
  const id=String(x.id??''),term=String(x.term||''),reading=String(x.reading||''),key=`${term}|${reading}`;
  if(typeCounts[x.type]!==undefined)typeCounts[x.type]++;else typeCounts.other++;
  if(x.strict===true)flagCounts.strictTrue++;
  if(x.idiom===true)flagCounts.idiomTrue++;
  if(x.four===true)flagCounts.fourTrue++;
  if(x.strict===true&&x.idiom===true)flagCounts.strictAndIdiom++;
  if(idSeen.has(id))sample(duplicateIds,{line:i+1,id,term,reading});else idSeen.add(id);
  if(keySeen.has(key))sample(duplicateKeys,{line:i+1,key,id});else keySeen.add(key);
  if(!hasJapanese(x.meaning)){nonJapaneseMeaningCount++;sample(nonJapaneseMeaning,{line:i+1,id,term,reading,meaning:String(x.meaning||'').slice(0,180),type:x.type})}
  if(reading&&!kanaLike(reading)){suspiciousReadingCount++;sample(suspiciousReading,{line:i+1,id,term,reading,type:x.type})}
  if(KNOWN_EXCLUSIONS.has(key))sample(knownExclusionsPresent,{line:i+1,id,term,reading,type:x.type,strict:x.strict,idiom:x.idiom,four:x.four,meaning:x.meaning});
  if(x.type==='yoji'&&!yojiSurface4(term)){
    nonCanonicalYojiCount++;
    nonCanonicalSeen.add(id);
    const row={line:i+1,id,term,reading,type:x.type,strict:x.strict,idiom:x.idiom,four:x.four,meaning:x.meaning};
    sample(nonCanonicalYoji,row);
    const q=quarantineById.get(id);
    if(!q)sample(unquarantinedNonCanonicalYoji,row);
    else if(String(q.term)!==term||String(q.reading)!==reading)sample(quarantineDrift,{id,expected:{term:q.term,reading:q.reading},actual:{term,reading}});
  }

  const bad=(reason)=>{mismatchCount++;sample(mismatch,{line:i+1,id,term,reading,type:x.type,strict:x.strict,idiom:x.idiom,four:x.four,reason})};
  if(!['yoji','idiom','four'].includes(x.type)){bad('unknown-type');continue}
  if(x.type==='yoji'&&x.strict!==true)bad('yoji-without-strict-true');
  if(x.type==='idiom'&&x.idiom!==true)bad('idiom-without-idiom-true');
  if(x.type==='four'){
    if(x.four!==true)bad('four-without-four-true');
    if(x.strict===true)bad('strict-entry-misclassified-as-four');
    if(x.idiom===true)bad('idiom-entry-misclassified-as-four');
  }
  if(x.strict===true&&x.type!=='yoji')bad('strict-true-not-yoji');
  if(x.idiom===true&&x.strict!==true&&x.type!=='idiom')bad('idiom-true-not-idiom');
}

for(const q of quarantineRows){
  const id=String(q.id||'');
  if(!nonCanonicalSeen.has(id))sample(quarantineDrift,{id,expected:{term:q.term,reading:q.reading},actual:null,reason:'quarantine-entry-not-present-as-noncanonical-yoji'});
}

const hardFailures=[];
if(lines.length!==15000)hardFailures.push(`row-count=${lines.length}`);
if(parseErrors.length)hardFailures.push(`parse-errors=${parseErrors.length}`);
if(duplicateIds.length)hardFailures.push(`duplicate-id-samples=${duplicateIds.length}`);
if(duplicateKeys.length)hardFailures.push(`duplicate-key-samples=${duplicateKeys.length}`);
if(mismatchCount)hardFailures.push(`taxonomy-mismatch=${mismatchCount}`);
if(typeCounts.yoji!==Number(status.selected_strict_yojijukugo))hardFailures.push(`yoji-count=${typeCounts.yoji},status-strict=${status.selected_strict_yojijukugo}`);
if(typeCounts.idiom+flagCounts.strictAndIdiom!==flagCounts.idiomTrue)hardFailures.push(`idiom-routing=${typeCounts.idiom}+${flagCounts.strictAndIdiom}!=${flagCounts.idiomTrue}`);
if(unquarantinedNonCanonicalYoji.length)hardFailures.push(`unquarantined-noncanonical-yoji=${unquarantinedNonCanonicalYoji.length}`);
if(quarantineDrift.length)hardFailures.push(`taxonomy-quarantine-drift=${quarantineDrift.length}`);
if(nonCanonicalYojiCount!==quarantineRows.length)hardFailures.push(`noncanonical-yoji=${nonCanonicalYojiCount},quarantine=${quarantineRows.length}`);

const semanticQuality={
  nonCanonicalYojiSurface:{count:nonCanonicalYojiCount,quarantined:quarantineRows.length,samples:nonCanonicalYoji},
  unquarantinedNonCanonicalYoji,
  quarantineDrift,
  rawMeaningNonJapanese:{count:nonJapaneseMeaningCount,samples:nonJapaneseMeaning},
  suspiciousReading:{count:suspiciousReadingCount,samples:suspiciousReading},
  knownSemanticExclusionsPresent:knownExclusionsPresent
};
const semanticWarnings=[];
if(nonCanonicalYojiCount)semanticWarnings.push(`non-canonical-yoji-quarantined=${nonCanonicalYojiCount}`);
if(nonJapaneseMeaningCount)semanticWarnings.push(`raw-meaning-non-japanese=${nonJapaneseMeaningCount}`);
if(knownExclusionsPresent.length)semanticWarnings.push(`known-semantic-exclusions-present=${knownExclusionsPresent.length}`);

const report={
  version:'1.2.0',
  generatedAt:new Date().toISOString(),
  source:'kokugo-chronologia/data.jsonl',
  quarantineSource:'kokugo-chronologia/taxonomy-quarantine-v1.json',
  sourceRows:lines.length,
  parsedRows:rows.length,
  statusReference:status,
  quarantineVersion:quarantine.version||null,
  typeCounts,
  flagCounts,
  hardFailures,
  semanticWarnings,
  parseErrors:parseErrors.slice(0,50),
  taxonomyMismatch:{count:mismatchCount,samples:mismatch},
  duplicateIdSamples:duplicateIds,
  duplicateKeySamples:duplicateKeys,
  semanticQuality,
  verdict:hardFailures.length?'FAIL':semanticWarnings.length?'PASS_WITH_SEMANTIC_WARNINGS':'PASS'
};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(hardFailures.length)process.exit(1);
