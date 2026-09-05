import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(p,'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail:String(detail||'')});
const run=(source,sandbox,filename)=>vm.runInNewContext(source,sandbox,{timeout:3000,filename});
const hasJapanese=v=>/[\u3040-\u30ff\u3400-\u9fff]/.test(String(v||''));

const enSource=read('english-vocabulary-supplement-v1.js');
const legacy={id:'legacy-keep',word:'legacyword',meaning:'旧語義',pos:'n',level:'core',srsId:'v:legacy-keep'};
const enSandbox={DATA:{vocab:[structuredClone(legacy)]},window:{}};
run(enSource,enSandbox,'english-vocabulary-supplement-v1.js');
const enMeta=enSandbox.window.RISE_ENGLISH_VOCAB_SUPPLEMENT||{},enAdded=enSandbox.DATA.vocab.slice(1),legacyAfter=enSandbox.DATA.vocab[0];
check('English supplement parses and exports metadata',enMeta.version==='1.0.0',JSON.stringify(enMeta));
check('English candidate count >= 150',Number(enMeta.candidateCount)>=150,enMeta.candidateCount);
check('English stable supplement IDs',enAdded.length>0&&enAdded.every(x=>/^rise-en-sup-[a-z0-9-]+$/.test(String(x.id))),enAdded.length);
check('English supplement IDs unique',new Set(enAdded.map(x=>x.id)).size===enAdded.length);
check('English words unique',new Set(enAdded.map(x=>String(x.word).toLowerCase())).size===enAdded.length);
check('English required fields complete',enAdded.every(x=>x.word&&hasJapanese(x.meaning)&&x.pos&&x.level&&x.example));
check('English source and quality metadata complete',enAdded.every(x=>x.source==='rise-english-supplement-v1'&&x.qualityChecked===true&&Array.isArray(x.tags)));
check('Existing English ID preserved',legacyAfter.id===legacy.id,legacyAfter.id);
check('Existing English SRS ID preserved',legacyAfter.srsId===legacy.srsId,legacyAfter.srsId);
check('English supplement never assigns srsId',!/\bsrsId\s*:|\bsrsId\s*=/.test(enSource));

const jaSource=read('kokugo-chronologia/jukugo-bank-supplement-v1.js');
const jaSandbox={window:{AA_JUKUGO_ADVANCED:[]}};
run(jaSource,jaSandbox,'jukugo-bank-supplement-v1.js');
const jaMeta=jaSandbox.window.RISE_JAPANESE_VOCAB_SUPPLEMENT||{},jaRows=jaSandbox.window.AA_JUKUGO_ADVANCED;
check('Japanese supplement parses and exports metadata',jaMeta.version==='1.0.0',JSON.stringify(jaMeta));
check('Japanese candidate count >= 120',Number(jaMeta.candidateCount)>=120,jaMeta.candidateCount);
check('Japanese stable supplement IDs',jaRows.length>0&&jaRows.every(x=>/^jkgs1-\d{4}$/.test(String(x.id))),jaRows.length);
check('Japanese supplement IDs unique',new Set(jaRows.map(x=>x.id)).size===jaRows.length);
check('Japanese word-reading keys unique',new Set(jaRows.map(x=>`${x.word}|${x.reading}`)).size===jaRows.length);
check('Japanese readings/meanings are Japanese',jaRows.every(x=>hasJapanese(x.reading)&&hasJapanese(x.meaning)));
check('Japanese kind/rank valid',jaRows.every(x=>['二字熟語','三字熟語'].includes(x.kind)&&['A','B','C'].includes(x.rank)));
check('Japanese source and quality metadata complete',jaRows.every(x=>x.source==='rise-japanese-supplement-v1'&&x.qualityChecked===true&&x.domain==='modern-reading'));

const jaLines=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(x=>x.trim());
check('Japanese 15,000 raw bank remains exactly 15,000 rows',jaLines.length===15000,jaLines.length);
const rawRows=jaLines.map(JSON.parse),rawKeys=rawRows.map(x=>`${String(x.term||'').trim()}|${String(x.reading||'').trim()}`);
check('Japanese raw word-reading keys remain unique',new Set(rawKeys).size===rawKeys.length,`${new Set(rawKeys).size}/${rawKeys.length}`);

const rankQuiz=read('kokugo-chronologia/quiz-rank-select-v1.js');
for(const key of ['kokugoChronologiaStateV2','aa_kokugo_vocab_wrong_queue_v1','aa_kokugo_vocab_full15000_cycle_v1'])check(`Japanese native state key preserved: ${key}`,rankQuiz.includes(key));
check('Japanese runtime still dedupes by word-reading',rankQuiz.includes("`${x.word}|${x.reading||''}`")||rankQuiz.includes("x.word+'|'+x.reading"));

const loader=read('v23-loader.js'),enPos=loader.indexOf('english-vocabulary-supplement-v1.js'),glossPos=loader.indexOf('v23-english-gloss-vocab.js'),mainPos=loader.indexOf('v23-english-main.js');
check('English supplement is loaded after glossary import',enPos>glossPos,`${glossPos}<${enPos}`);
check('English supplement is loaded before v23 English main',enPos>=0&&enPos<mainPos,`${enPos}<${mainPos}`);

const core=read('vocabulary-core/core-v1.js');
check('Unified quiz bootstraps Japanese supplement before native engine',core.includes('jukugo-bank-supplement-v1.js')&&core.includes('document.write'));
check('Vocabulary Core version upgraded without changing subjects',core.includes("VERSION = '1.2.0'")&&core.includes("['english', 'japanese', 'social']"));
const interaction=read('kokugo-chronologia/quiz-interaction-fix.js');
check('Standalone Japanese page has supplement load barrier',interaction.includes('__AA_KOKUGO_SUPPLEMENT_BARRIER__')&&interaction.includes('jukugo-bank-supplement-v1.js'));
check('Supplement barrier waits for advanced-5',interaction.includes('jukugo-bank-advanced-5\\.js'));

const workflow=read('.github/workflows/vocabulary-foundation-audit.yml');
check('Vocabulary CI runs language compatibility audit',workflow.includes('audit-language-vocabulary-compat.mjs'));

const failures=checks.filter(x=>!x.ok);
console.log(JSON.stringify({version:'1.1.0',english:{candidates:enMeta.candidateCount,addedToEmptyBaseline:enMeta.added},japanese:{candidates:jaMeta.candidateCount,addedToEmptyAdvanced:jaMeta.added},checks,failures},null,2));
if(failures.length)process.exit(1);
