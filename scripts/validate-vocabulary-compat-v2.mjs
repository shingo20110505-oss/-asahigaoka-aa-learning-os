import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];const warnings=[];
const assert=(ok,msg)=>{if(!ok)failures.push(msg)};
const rawBlock=(text,label)=>{const m=text.match(/const RAW=`([\s\S]*?)`;/);assert(!!m,`${label}: RAW block not found`);return m?.[1]||''};
const parse=(file,fields,label)=>rawBlock(read(file),label).split(/\r?\n/).filter(Boolean).map((line,i)=>{const parts=line.split('|');assert(parts.length===fields.length,`${label} line ${i+1}: expected ${fields.length} fields, got ${parts.length}`);return Object.fromEntries(fields.map((f,j)=>[f,parts[j]??'']))});
const duplicateKeys=(rows,key)=>{const seen=new Set(),dups=[];for(const row of rows){const k=key(row);if(!k)continue;if(seen.has(k))dups.push(k);else seen.add(k)}return [...new Set(dups)]};

const legacy=read('app/legacy/main-runtime.js');
const dataLine=legacy.split(/\r?\n/).find(line=>line.startsWith('const DATA = '));
assert(!!dataLine,'English legacy DATA line missing');
let base={vocab:[]};try{base=JSON.parse(dataLine.slice('const DATA = '.length,-1))}catch(err){failures.push(`English DATA parse: ${err.message}`)}
const baseWords=new Set((base.vocab||[]).map(x=>String(x.word||'').trim().toLowerCase()).filter(Boolean));
const baseIds=new Set((base.vocab||[]).map(x=>String(x.id||'')).filter(Boolean));
assert(duplicateKeys(base.vocab||[],x=>String(x.id||'')).length===0,'English base IDs are not unique');

const en1=parse('english-vocabulary-supplement-v1.js',['word','meaning','pos','level','example'],'English v1');
const en2=parse('english-vocabulary-supplement-v2.js',['word','meaning','pos','level','example','category'],'English v2');
const enKey=x=>String(x.word||'').trim().toLowerCase();
assert(duplicateKeys(en1,enKey).length===0,'English v1 has duplicate surfaces');
assert(duplicateKeys(en2,enKey).length===0,'English v2 has duplicate surfaces');
const en1Keys=new Set(en1.map(enKey));
const enCross=en2.map(enKey).filter(k=>en1Keys.has(k));
assert(enCross.length===0,`English v1/v2 overlap: ${[...new Set(enCross)].join(', ')}`);
for(const [i,x] of en2.entries()){
 assert(x.word&&x.meaning&&x.pos&&x.level&&x.example&&x.category,`English v2 row ${i+1}: required field missing`);
 assert(['core','entrance','phrase','form'].includes(x.level),`English v2 row ${i+1}: invalid level ${x.level}`);
 assert(['reading-logic','data','academic','society','science','connector','phrase'].includes(x.category),`English v2 row ${i+1}: invalid category ${x.category}`);
}
const en2Text=read('english-vocabulary-supplement-v2.js');
assert(en2Text.includes('en-sup-v2-'),'English v2 stable ID prefix missing');
assert(en2Text.includes('srsId:`v:en-sup-v2-'),'English v2 stable SRS prefix missing');
assert(en2Text.includes("compatibility:'append-only-existing-id-and-srs-preserved'"),'English v2 compatibility marker missing');
const registry=read('app/runtime-registry.js');
const en1Pos=registry.indexOf('english-vocabulary-supplement-v1.js');
const en2Pos=registry.indexOf('english-vocabulary-supplement-v2.js');
assert(en1Pos>=0&&en2Pos>en1Pos,'Runtime registry must load English v1 before v2');
const en2New=en2.filter(x=>!baseWords.has(enKey(x))).length;
const en2BaseSkipped=en2.length-en2New;

const jaLines=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(x=>x.trim());
assert(jaLines.length===15000,`Japanese full data row count changed: ${jaLines.length}`);
const jaFull=[];for(const [i,line] of jaLines.entries())try{jaFull.push(JSON.parse(line))}catch(err){failures.push(`Japanese data line ${i+1}: ${err.message}`)}
const jaKey=x=>`${String(x.word??x.term??'').trim()}|${String(x.reading||'').trim()}`;
assert(duplicateKeys(jaFull,jaKey).length===0,'Japanese 15k word|reading identity changed or duplicated');

const ja1=parse('kokugo-chronologia/jukugo-bank-supplement-v1.js',['word','reading','meaning','rank','kind'],'Japanese v1');
const ja2=parse('kokugo-chronologia/jukugo-bank-supplement-v2.js',['word','reading','meaning','rank','kind'],'Japanese v2');
assert(duplicateKeys(ja1,jaKey).length===0,'Japanese v1 has duplicate word|reading');
assert(duplicateKeys(ja2,jaKey).length===0,'Japanese v2 has duplicate word|reading');
const ja1Keys=new Set(ja1.map(jaKey));
const jaCross=ja2.map(jaKey).filter(k=>ja1Keys.has(k));
assert(jaCross.length===0,`Japanese v1/v2 overlap: ${[...new Set(jaCross)].join(', ')}`);
for(const [i,x] of ja2.entries()){
 assert(x.word&&x.reading&&x.meaning,`Japanese v2 row ${i+1}: required field missing`);
 assert(['A','B','C'].includes(x.rank),`Japanese v2 row ${i+1}: invalid rank ${x.rank}`);
 assert(['二字熟語','三字熟語'].includes(x.kind),`Japanese v2 row ${i+1}: invalid kind ${x.kind}`);
 assert(/[ぁ-んァ-ヶ一-龯]/.test(x.meaning),`Japanese v2 row ${i+1}: non-Japanese meaning`);
}
const bankFiles=fs.readdirSync(path.join(root,'kokugo-chronologia')).filter(n=>/^jukugo-bank(?:-advanced-\d+)?\.js$/.test(n));
const bankKeys=new Set();
for(const file of bankFiles){const m=read(`kokugo-chronologia/${file}`).match(/const raw=`([\s\S]*?)`;/);if(!m){warnings.push(`Could not parse ${file}`);continue}for(const line of m[1].split(/\r?\n/).filter(Boolean)){const [word,reading]=line.split('|');if(word)bankKeys.add(`${word}|${reading||''}`)}}
const ja2BankOverlap=ja2.map(jaKey).filter(k=>bankKeys.has(k));
assert(ja2BankOverlap.length===0,`Japanese v2 duplicates existing bank: ${[...new Set(ja2BankOverlap)].slice(0,30).join(', ')}`);
const jaFullKeys=new Set(jaFull.map(jaKey));
const ja2FullOverlap=ja2.map(jaKey).filter(k=>jaFullKeys.has(k));
if(ja2FullOverlap.length)warnings.push(`Japanese v2 overlaps full15k and will be deduped in final quiz: ${ja2FullOverlap.length}`);

const ja2Text=read('kokugo-chronologia/jukugo-bank-supplement-v2.js');
assert(ja2Text.includes('ja-sup-v2-'),'Japanese v2 stable ID prefix missing');
assert(ja2Text.includes("compatibility:'append-only-word-reading-preserved'"),'Japanese v2 compatibility marker missing');
const touch=read('kokugo-chronologia/quiz-interaction-fix.js');
const j1=touch.indexOf('jukugo-bank-supplement-v1.js'),j2=touch.indexOf('jukugo-bank-supplement-v2.js'),rank=touch.indexOf('quiz-rank-select-v1.js');
assert(j1>=0&&j2>j1&&rank>j2,'Japanese loader order must be supplement v1 -> v2 -> ranked quiz');
assert(touch.includes('__AA_JAPANESE_VOCAB_SUPPLEMENT_V2__'),'Japanese v2 readiness guard missing');
const quiz=read('kokugo-chronologia/quiz-rank-select-v1.js');
assert(quiz.includes("const STATE_KEY='kokugoChronologiaStateV2'"),'Japanese state key changed');
assert(quiz.includes("const WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1'"),'Japanese wrong queue key changed');
assert(quiz.includes("const CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1'"),'Japanese cycle key changed');
assert(quiz.includes('if(rows.length!==15000)'),'Japanese 15k hard guard missing');

console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',english:{base:(base.vocab||[]).length,v1:en1.length,v2:en2.length,v2NewAgainstLegacyBase:en2New,v2AlreadyInLegacyBase:en2BaseSkipped},japanese:{full:jaFull.length,v1:ja1.length,v2:ja2.length,v2Full15000Overlap:ja2FullOverlap.length,bankFiles:bankFiles.length},warnings,failures},null,2));
if(failures.length)process.exit(1);
