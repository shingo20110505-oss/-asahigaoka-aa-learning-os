import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('quiz/index.html');
const js=read('quiz/unified-native-v1.js');
const card=read('app/ui/rise-learning-expansion-v1.js');
const checks=[];
const failures=[];
function check(name,condition,details=''){const ok=Boolean(condition);checks.push({name,ok,details});if(!ok)failures.push(name+(details?`: ${details}`:''))}

let syntaxError='';
try{new vm.Script(js,{filename:'quiz/unified-native-v1.js'})}catch(error){syntaxError=String(error?.message||error)}
check('Unified quiz runtime parses as JavaScript',!syntaxError,syntaxError);
check('Unified quiz declares only English/Japanese/Social',/SUBJECTS=Object\.freeze\(\['english','japanese','social'\]\)/.test(js));
check('Unified quiz UI contains no Science subject',!/(data-subject="science"|>理科<|英語・国語・理科・社会)/.test(html));
check('Legacy independent unified score store is removed',!/(rise-unified-vocab-quiz-v1|state\.seen|state\.correct|state\.by)/.test(html+js));
check('Vocabulary Core is loaded',html.includes('../vocabulary-core/core-v1.js'));
check('Progress adapters are loaded',html.includes('../vocabulary-core/progress-adapters-v1.js'));
check('English writes through native recordAttempt',js.includes("recordAttempt(q,String(ans||''),!!ok,t"));
check('English writes through native updateSRS',js.includes('updateSRS(sid,!!ok,t'));
check('English persists native engine state',js.includes('updateSRS(sid,!!ok,t')&&js.includes('save();return snap(v)'));
check('English wrong-only queue key is native',js.includes("const BANK='aa_vocab_quiz_wrong_v1'"));
check('Japanese progress store key is native',js.includes("JA_STATE_KEY='kokugoChronologiaStateV2'"));
check('Japanese wrong queue key is native',js.includes("JA_WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1'"));
check('Japanese no-repeat cycle key is native',js.includes("JA_CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1'"));
check('Japanese requires the full 15,000-row source',js.includes('rows.length!==15000'));
check('Japanese full IDs match native quiz-full IDs',js.includes("id:'quiz-full-'+String(x.id??i)"));
check('Japanese unified loader uses the verified native meaning source',js.includes('meaning-ja-overrides.js')&&js.includes('KOKUGO_DIRECT_MEANINGS')&&js.includes('directJaMeaning'));

let qualityPolicy=null;
let qualityPolicyError='';
try{
 const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read('kokugo-chronologia/exam-quality-v1.js'),sandbox,{filename:'exam-quality-v1.js'});qualityPolicy=sandbox.window.RISE_JAPANESE_EXAM_QUALITY_V1||null;
}catch(error){qualityPolicyError=String(error?.message||error)}
const verifiedProbe=qualityPolicy?.verified?.({rank:'A',type:'yoji'},'curated');
check('Japanese quality policy loads',!!qualityPolicy&&!qualityPolicyError,qualityPolicyError);
check('Japanese curated metadata overrides coarse full-bank rank while retaining full IDs',
 js.includes('existing.type=x.type||existing.type')&&
 js.includes("Object.assign(existing,jaQuality.verified(x,x.source||'curated'))")&&
 js.includes("existing.qualitySource=x.source||existing.qualitySource")&&
 verifiedProbe?.rank==='A'&&verifiedProbe?.examRank==='A'&&verifiedProbe?.reviewStatus==='verified'&&verifiedProbe?.qualitySource==='curated');
check('Japanese curated/jukugo meanings use their own verified local meanings',js.includes("meaning:text(x.meaning),type:x.kind==='二字熟語'")&&js.includes("meaning:text(x.meaning),type:x.kind==='四字熟語'"));
check('Japanese wrong queue uses stable ID or term/reading identity',js.includes('function jaStableKey')&&js.includes("text(x.id)===id||jaStableKey(x)===stable"));
check('Japanese distractors prefer same type and rank',js.includes('function japaneseDistractors')&&js.includes('x.raw.type===item.raw.type&&x.raw.rank===item.raw.rank'));
check('Japanese exam-priority mode includes A and B',js.includes("rank==='AB'?['A','B'].includes(x.raw.rank)")&&js.includes("exam==='exam'?'AB':'all'"));
check('Japanese runtime exposes quality diagnostics',js.includes('__AA_RISE_UNIFIED_JAPANESE_QUALITY__'));
check('Each new question re-enables typed-answer controls',js.includes("ui.answerInput.value='';ui.answerInput.disabled=false;ui.submit.disabled=false;"));

let japaneseRows=[];
let directMeanings={};
let japaneseDataError='';
try{
 japaneseRows=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
 const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read('kokugo-chronologia/meaning-ja-overrides.js'),sandbox,{filename:'meaning-ja-overrides.js'});directMeanings=sandbox.window.KOKUGO_DIRECT_MEANINGS||{};
}catch(error){japaneseDataError=String(error?.message||error)}
const hasJapanese=value=>/[\u3040-\u30ff\u3400-\u9fff]/.test(String(value||''));
const missingJapanese=japaneseRows.filter((row,index)=>!hasJapanese(directMeanings[String(row.id??index)]));
check('Japanese source is exactly 15,000 rows',!japaneseDataError&&japaneseRows.length===15000,japaneseDataError||String(japaneseRows.length));
check('All 15,000 Japanese rows have verified Japanese meanings',!japaneseDataError&&japaneseRows.length===15000&&missingJapanese.length===0,missingJapanese.slice(0,5).map(x=>x.term||x.id).join(', '));
check('Unified runtime rejects unverified Japanese meanings',js.includes("if(!meaning||!hasJapanese(meaning))throw new Error('日本語意味が未確認:"));

let idiomBank=[];
let idiomError='';
try{const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read('idiom/idiom-bank.js'),sandbox,{filename:'idiom/idiom-bank.js'});idiomBank=sandbox.window.AA_IDIOM_BANK||[]}catch(error){idiomError=String(error?.message||error)}
const curatedKeys=new Set();let curatedDuplicates=0;
for(const x of idiomBank){const key=`${String(x.word||'').normalize('NFKC')}|${String(x.reading||'').normalize('NFKC')}`;if(curatedKeys.has(key))curatedDuplicates++;curatedKeys.add(key)}
const curatedSourceKeepsExcludedTerm=idiomBank.some(x=>String(x.word||'').normalize('NFKC')==='間に合う'&&String(x.reading||'').normalize('NFKC')==='まにあう');
const policyExcludesKnownNonIdiom=!!qualityPolicy?.isExcluded?.({word:'間に合う',reading:'まにあう'})&&qualityPolicy?.exclusions?.has?.('間に合う|まにあう');
check('Known non-idiom is excluded from Japanese quiz without deleting source data',
 curatedSourceKeepsExcludedTerm&&policyExcludesKnownNonIdiom&&js.includes('const JA_QUIZ_EXCLUSIONS=jaQuality.exclusions')&&js.includes('merged.filter(x=>!jaQuality.isExcluded(x)')));
check('Curated idiom bank loads',!idiomError&&idiomBank.length>0,idiomError);
check('Curated idiom bank has no word/reading duplicates',curatedDuplicates===0,String(curatedDuplicates));
check('Curated ranks are A/B/C only',idiomBank.every(x=>['A','B','C'].includes(x.rank)));
check('Curated kinds are explicit',idiomBank.every(x=>['四字熟語','慣用句'].includes(x.kind)));
check('Representative top-priority idiom remains A',idiomBank.some(x=>x.word==='一石二鳥'&&x.rank==='A'));

check('Social writes through Chronologia recordAnswer',js.includes('recordAnswer(item.id,!!ok)'));
check('Social bridge waits for effective 1,000-row Chronologia',js.includes('if(DATA.length<1000)throw 0'));
check('Chronologia remains an independent linked learning asset',html.includes('href="../chronologia.html"')&&html.includes('年表本体は独立教材として継続'));
check('English native page remains linked',html.includes('href="../vocab.html"'));
check('Japanese native page remains linked',html.includes('href="../kokugo-chronologia/"'));
check('Learning card describes current three-subject scope',!/英語・国語・理科・社会/.test(card)&&/英語・国語・社会/.test(card));
check('Unified quiz runtime has no unsupported subject dispatcher',!/(science|理科)/.test(js));

console.log(JSON.stringify({version:'1.2.0',checkedAt:new Date().toISOString(),checks,failures,japanese:{rows:japaneseRows.length,directMeanings:Object.keys(directMeanings).length,missingJapanese:missingJapanese.length,curated:idiomBank.length,curatedDuplicates,qualityPolicy:qualityPolicy?.version||'',curatedSourceKeepsExcludedTerm,policyExcludesKnownNonIdiom}},null,2));
if(failures.length)process.exit(1);
