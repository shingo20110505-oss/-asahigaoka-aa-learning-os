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
check('Social writes through Chronologia recordAnswer',js.includes('recordAnswer(item.id,!!ok)'));
check('Social bridge waits for effective 1,000-row Chronologia',js.includes('if(DATA.length<1000)throw 0'));
check('Chronologia remains an independent linked learning asset',html.includes('href="../chronologia.html"')&&html.includes('年表本体は独立教材として継続'));
check('English native page remains linked',html.includes('href="../vocab.html"'));
check('Japanese native page remains linked',html.includes('href="../kokugo-chronologia/"'));
check('Learning card describes current three-subject scope',!/英語・国語・理科・社会/.test(card)&&/英語・国語・社会/.test(card));
check('Unified quiz runtime has no unsupported subject dispatcher',!/(science|理科)/.test(js));

console.log(JSON.stringify({version:'1.0.1',checkedAt:new Date().toISOString(),checks,failures},null,2));
if(failures.length)process.exit(1);
