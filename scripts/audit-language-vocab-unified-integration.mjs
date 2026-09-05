import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};

const core=read('vocabulary-core/core-v1.js');
const en=read('english-vocabulary-supplement-v1.js');
const ja=read('kokugo-chronologia/jukugo-bank-supplement-v1.js');
const unified=read('quiz/unified-native-v1.js');
const rank=read('kokugo-chronologia/quiz-rank-select-v1.js');
const raw=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean);

check(raw.length===15000,`Japanese raw bank changed: ${raw.length}`);
check(rank.includes("kokugoChronologiaStateV2"),'Japanese state key changed');
check(rank.includes("aa_kokugo_vocab_wrong_queue_v1"),'Japanese wrong key changed');
check(rank.includes("aa_kokugo_vocab_full15000_cycle_v1"),'Japanese cycle key changed');
check(rank.includes("x.word+'|'+x.reading"),'Japanese word|reading dedupe guard missing');

check(en.includes("srsId:`v:en-sup-v1-"),'English stable supplement SRS IDs missing');
check(en.includes("compatibility:'append-only-existing-id-preserved'"),'English append-only compatibility marker missing');
check(en.includes("words.has(key)"),'English existing-surface dedupe missing');

check(ja.includes("compatibility:'append-only-word-reading-preserved'"),'Japanese append-only compatibility marker missing');
check(ja.includes("function key(x){return `${String(x?.word||'').trim()}|${String(x?.reading||'').trim()}`}"),'Japanese supplement word|reading identity missing');

check(core.includes("VERSION = '1.2.0'"),'Vocabulary Core was not upgraded to 1.2.0');
check(core.includes("['english', 'japanese', 'social']"),'Vocabulary Core subject contract changed');
check(core.includes('jukugo-bank-supplement-v1.js'),'Unified quiz does not bootstrap Japanese supplement');
check(core.includes("id = 'aaJukugoExtension'"),'Unified supplement compatibility shim missing');
check(core.includes("store: 'asahi_learning_os_v1'"),'English native progress store changed');
check(core.includes("store: 'kokugoChronologiaStateV2'"),'Japanese native progress store changed');
check(core.includes("wrongStore: 'aa_kokugo_vocab_wrong_queue_v1'"),'Japanese wrong store changed in core');
check(core.includes("cycleStore: 'aa_kokugo_vocab_full15000_cycle_v1'"),'Japanese cycle store changed in core');

check(unified.includes("...(window.AA_JUKUGO_ADVANCED||[])"),'Unified Japanese pool no longer consumes advanced/supplement bank');
check(unified.includes("uniqueBy([...full,...bank,...curated],x=>x.word+'|'+x.reading)"),'Unified Japanese word|reading dedupe missing');
check(unified.includes("if(rows.length!==15000)"),'Unified Japanese 15k hard guard missing');

const result={status:failures.length?'FAIL':'PASS',rawJapaneseRows:raw.length,failures};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exit(1);
