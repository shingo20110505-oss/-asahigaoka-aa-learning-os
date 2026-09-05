import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=[];const warn=[];
const assert=(ok,msg)=>{if(!ok)fail.push(msg)};
const unique=(rows,key,label)=>{const seen=new Map();for(const row of rows){const k=key(row);if(!k)continue;if(seen.has(k))fail.push(`${label} duplicate: ${k}`);else seen.set(k,row)}return seen};
const rawBlock=(text,label)=>{const m=text.match(/const RAW=`([\s\S]*?)`;\n/);assert(!!m,`${label}: RAW block not found`);return m?.[1]||''};
const pipeRows=(text,fields,label)=>rawBlock(text,label).split(/\r?\n/).filter(Boolean).map((line,i)=>{const values=line.split('|');assert(values.length===fields.length,`${label} line ${i+1}: expected ${fields.length} fields, got ${values.length}`);return Object.fromEntries(fields.map((f,j)=>[f,values[j]??'']))});

// English: parse the legacy source of truth without rewriting it.
const legacy=read('app/legacy/main-runtime.js');
const dataLine=legacy.split(/\r?\n/).find(line=>line.startsWith('const DATA = '));
assert(!!dataLine,'English: const DATA line not found');
let data={vocab:[]};
try{data=JSON.parse(dataLine.slice('const DATA = '.length,-1))}catch(err){fail.push(`English DATA JSON parse failed: ${err.message}`)}
assert(Array.isArray(data.vocab),'English: DATA.vocab is not an array');
const baseEnglish=data.vocab||[];
unique(baseEnglish,x=>String(x.id||''),'English base id');
const baseWords=new Map();
for(const x of baseEnglish){const k=String(x.word||'').trim().toLowerCase();if(!k)fail.push(`English base missing word: ${x.id}`);else if(baseWords.has(k))warn.push(`English base duplicate surface (runtime already dedupes): ${k}`);else baseWords.set(k,x)}

const enText=read('english-vocabulary-supplement-v1.js');
const enRows=pipeRows(enText,['word','meaning','pos','level','example'],'English supplement');
unique(enRows,x=>x.word.trim().toLowerCase(),'English supplement surface');
for(const [i,x] of enRows.entries()){
 assert(x.word&&x.meaning&&x.pos&&x.level&&x.example,`English supplement row ${i+1}: required field missing`);
 assert(['core','entrance','phrase','form'].includes(x.level),`English supplement row ${i+1}: invalid level ${x.level}`);
}
const enNew=enRows.filter(x=>!baseWords.has(x.word.trim().toLowerCase()));
const enSkipped=enRows.length-enNew.length;
assert(enText.includes("srsId:`v:en-sup-v1-"),'English supplement: stable v: SRS id rule missing');
assert(enText.includes("compatibility:'append-only-existing-id-preserved'"),'English supplement: append-only compatibility marker missing');
const registry=read('app/runtime-registry.js');
assert(registry.includes('english-vocabulary-supplement-v1.js'),'English supplement is not loaded by runtime registry');
assert(registry.includes("document.addEventListener('DOMContentLoaded'"),'English supplement must load after deferred legacy DATA exists');

// Japanese 15k: preserve exact row count and term|reading identity.
const jaLines=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(x=>x.trim());
assert(jaLines.length===15000,`Japanese full data row count changed: ${jaLines.length}`);
const jaRows=[];
for(const [i,line] of jaLines.entries())try{jaRows.push(JSON.parse(line))}catch(err){fail.push(`Japanese data.jsonl line ${i+1}: ${err.message}`)}
unique(jaRows,x=>`${x.term||''}|${x.reading||''}`,'Japanese full word|reading');
for(const [i,x] of jaRows.entries())assert(x.term&&x.reading,`Japanese full row ${i+1}: term/reading missing`);

const jaSupText=read('kokugo-chronologia/jukugo-bank-supplement-v1.js');
const jaSup=pipeRows(jaSupText,['word','reading','meaning','rank','kind'],'Japanese supplement');
unique(jaSup,x=>`${x.word}|${x.reading}`,'Japanese supplement word|reading');
for(const [i,x] of jaSup.entries()){
 assert(x.word&&x.reading&&x.meaning,`Japanese supplement row ${i+1}: required field missing`);
 assert(['A','B','C'].includes(x.rank),`Japanese supplement row ${i+1}: invalid rank ${x.rank}`);
 assert(['二字熟語','三字熟語'].includes(x.kind),`Japanese supplement row ${i+1}: invalid kind ${x.kind}`);
 assert(/[ぁ-んァ-ヶ一-龯]/.test(x.meaning),`Japanese supplement row ${i+1}: meaning is not Japanese`);
}
const bankFiles=fs.readdirSync(path.join(root,'kokugo-chronologia')).filter(n=>/^jukugo-bank(?:-advanced-\d+)?\.js$/.test(n));
const bankKeys=new Set();
for(const file of bankFiles){
 const text=read(`kokugo-chronologia/${file}`),m=text.match(/const raw=`([\s\S]*?)`;/);if(!m){warn.push(`Could not inspect ${file}`);continue}
 for(const line of m[1].split(/\r?\n/).filter(Boolean)){const [word,reading]=line.split('|');if(word)bankKeys.add(`${word}|${reading||''}`)}
}
const jaNew=jaSup.filter(x=>!bankKeys.has(`${x.word}|${x.reading}`));
const jaSkipped=jaSup.length-jaNew.length;
assert(jaSupText.includes("compatibility:'append-only-word-reading-preserved'"),'Japanese supplement: append-only word|reading marker missing');

const quizRank=read('kokugo-chronologia/quiz-rank-select-v1.js');
assert(quizRank.includes("const STATE_KEY='kokugoChronologiaStateV2'"),'Japanese state key changed');
assert(quizRank.includes("const WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1'"),'Japanese wrong queue key changed');
assert(quizRank.includes("const CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1'"),'Japanese no-repeat cycle key changed');
assert(quizRank.includes("if(rows.length!==15000)"),'Japanese 15k hard guard missing');
assert(quizRank.includes("const k=x.word+'|'+x.reading"),'Japanese word|reading duplicate guard missing');
const touch=read('kokugo-chronologia/quiz-interaction-fix.js');
assert(touch.includes("captureTouch")&&touch.includes("capturePointer")&&touch.includes("fallbackTap"),'Japanese mobile quiz tap hardening missing');
assert(touch.includes('jukugo-bank-supplement-v1.js'),'Japanese supplement loader missing');
assert(touch.includes('window.__AA_JAPANESE_VOCAB_SUPPLEMENT__'),'Japanese quiz loader does not wait for safe supplement install');

console.log(JSON.stringify({
 status:fail.length?'FAIL':'PASS',
 english:{base:baseEnglish.length,supplementRequested:enRows.length,newAfterSurfaceDedupe:enNew.length,skippedExistingSurface:enSkipped},
 japanese:{full:jaRows.length,supplementRequested:jaSup.length,newAfterBankDedupe:jaNew.length,skippedExistingBankKey:jaSkipped,existingBankFiles:bankFiles.length},
 warnings:warn.slice(0,30),failures:fail
},null,2));
if(fail.length)process.exit(1);
