import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('quiz/index.html');
const runtime=read('quiz/unified-native-v1.js');
const bankCode=read('quiz/japanese-classics-bank-v1.js');
const normalizerCode=read('kokugo-chronologia/koten-kanbun-normalization-v1.js');
const vocabPage=read('classics-vocab/index.html');
const vocabApp=read('classics-vocab/app.js');
const sw=read('sw.js');
const failures=[],checks=[];
const check=(name,condition,detail='')=>{const ok=Boolean(condition);checks.push({name,ok,detail});if(!ok)failures.push(name+(detail?`: ${detail}`:''));};

for(const [file,code] of [['unified-native-v1.js',runtime],['japanese-classics-bank-v1.js',bankCode],['koten-kanbun-normalization-v1.js',normalizerCode],['classics-vocab/app.js',vocabApp]]){
 let error='';try{new vm.Script(code,{filename:file});}catch(caught){error=String(caught?.message||caught);}
 check(`${file} parses`,!error,error);
}

const sandbox={window:{},Object,console,setInterval:()=>0,clearInterval:()=>{}};vm.createContext(sandbox);
for(let index=1;index<=5;index++)vm.runInContext(read(`kokugo-chronologia/koten-kanbun-bank-${index}.js`),sandbox,{filename:`koten-kanbun-bank-${index}.js`});
vm.runInContext(normalizerCode,sandbox,{filename:'koten-kanbun-normalization-v1.js'});
vm.runInContext(bankCode,sandbox,{filename:'japanese-classics-bank-v1.js'});
const bank=sandbox.window.RISE_JAPANESE_CLASSICS_BANK_V1||{};

check('Classical bank exposes 700 unique words',(bank.classical?.length||0)===700,String(bank.classical?.length||0));
check('Kanbun bank exposes 300 unique expressions',(bank.kanbun?.length||0)===300,String(bank.kanbun?.length||0));
check('Classics adapter consumes all 1,700 source cards',bank.sourceTotal===1700&&bank.total===1000,`${bank.sourceTotal}/${bank.total}`);
const all=[...(bank.classical||[]),...(bank.kanbun||[])];
check('Classics IDs are unique',new Set(all.map(item=>item.id)).size===all.length,`${new Set(all.map(item=>item.id)).size}/${all.length}`);
for(const mode of ['meaning','reading','word']){
 check(`Every classics item can build four unique ${mode} choices`,all.every(item=>{const pool=item.kind==='classical'?bank.classical:bank.kanbun;const question=bank.makeQuestion?.(item,mode,pool);return Array.isArray(question?.choices)&&question.choices.length===4&&new Set(question.choices).size===4&&question.choices.includes(question.answer);}));
}

check('All five classics sources load before normalization and adapter',[1,2,3,4,5].every(index=>html.includes(`koten-kanbun-bank-${index}.js`))&&html.indexOf('koten-kanbun-bank-5.js')<html.indexOf('koten-kanbun-normalization-v1.js')&&html.indexOf('koten-kanbun-normalization-v1.js')<html.indexOf('./japanese-classics-bank-v1.js'));
check('Unified runtime loads after the classics adapter',html.indexOf('./japanese-classics-bank-v1.js')<html.indexOf('./unified-native-v1.js'));
check('Legacy competing infinite and review controllers are not loaded',!html.includes('./review-algorithm-v1.js')&&!html.includes('./infinite-course-v1.js'));
check('Infinite option is present in stable HTML',html.includes('<option value="infinite">∞ 無限コース</option>'));
check('Infinite course can be ended manually',html.includes('id="endSession"')&&runtime.includes("ui.end.addEventListener('click',()=>finishSession(true))"));
check('One runtime publishes normal, infinite, and wrong-review diagnostics',runtime.includes("dataset.riseInfiniteCourse=VERSION")&&runtime.includes("dataset.riseWrongReview=VERSION")&&runtime.includes('RISE_UNIFIED_QUIZ_V2'));

check('Japanese UI exposes all, modern vocabulary, classical, and kanbun filters',runtime.includes("['all','語彙＋古文＋漢文']")&&runtime.includes("['vocab','現代語彙のみ']")&&runtime.includes("['classical','古文']")&&runtime.includes("['kanbun','漢文']"));
check('Japanese all interleaves modern vocabulary/classical/kanbun',runtime.includes("shuffle(['vocab','vocab','vocab','classical','kanbun'])"));
check('Classics uses its persistent no-repeat cycle',runtime.includes("CLASSIC_CYCLE_KEY='rise_kokugo_classics_cycle_v1'")&&runtime.includes('cyclePick(CLASSIC_CYCLE_KEY'));
check('Modern Japanese keeps its native persistent no-repeat cycle',runtime.includes("JA_CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1'")&&runtime.includes('cyclePick(JA_CYCLE_KEY'));
check('English and Social gain selection-only persistent cycles',runtime.includes("AUX_CYCLE_KEY='rise_unified_quiz_cycle_v2'")&&runtime.includes('cyclePick(AUX_CYCLE_KEY'));
check('Session-level keys prevent repeats across overlapping cycle buckets',runtime.includes('usedKeys:new Set()')&&runtime.includes('session.usedKeys.add(question.key)'));
check('Normal infinite mode starts a new no-repeat cycle after exhaustion',runtime.includes('function tryNextNormalQuestion()')&&runtime.includes("session.usedKeys=new Set(previous?[previous]:[])")&&runtime.includes('cycleAttempt<2'));

check('Classics questions use the normalized 1,000-item adapter',runtime.includes('classics.makeQuestion(item,mode,pool)'));
check('All three classic directions reach normal and wrong-only',runtime.includes("['meaning','reading','word'].includes(mode)")&&runtime.includes('classicQuestion(item,area,context.mode,pool,true)'));
check('Classics level filters exist in quiz and standalone list',runtime.includes("['S','S 最優先']")&&runtime.includes("['B','B 発展']")&&vocabPage.includes('id="level"')&&vocabApp.includes("level==='all'||x.level===level"));
check('Standalone list exposes unresolved wrong-only and shared progress',vocabPage.includes('間違えた単語だけ')&&vocabApp.includes("STATE_KEY='kokugoChronologiaStateV2'")&&vocabApp.includes("PROGRESS_KEY='rise_kokugo_classics_progress_v1'")&&vocabApp.includes('wrong.has(x.id)'));
check('Quiz links to the standalone classics list',html.includes('href="../classics-vocab/"'));

check('Three-subject infinite queue uses English/Japanese/Social',runtime.includes("const order=['english','japanese','social']"));
check('Existing native-history writes remain intact',runtime.includes('recordAttempt(q,String(ans||\'\'),!!ok,t')&&runtime.includes('updateJapaneseWrong(item,correct,true)')&&runtime.includes('recordAnswer(item.id,!!ok)'));
check('Wrong-only label explicitly covers all three subjects',html.includes('全教科の間違いだけ'));
check('English wrong review removes recovered items',runtime.includes('else if(isWrongReview)englishApi.removeWrong(item.raw.id)'));
check('Japanese wrong review removes by stable ID or term/reading',runtime.includes('function sameJaWrong(left,right)')&&runtime.includes('if(correct&&canRecover)'));
check('Classic currentWrong is updated directly on every answer',runtime.includes('progress.currentWrong=false')&&runtime.includes('progress.currentWrong=true')&&!runtime.includes('new MutationObserver'));
check('Classic entries are not double-counted as regular Japanese errors',runtime.includes("filter(item=>!['koten','kanbun'].includes(text(item?.type)))"));
check('Social wrong-only means last native answer is wrong (stage zero)',runtime.includes('(Number(progress.wrong)||0)>0&&Number(progress.stage||0)===0'));
check('Review priority includes errors, due state, and recency',runtime.includes('recentBoost')&&runtime.includes('(progress.lapses||0)*12')&&runtime.includes('(Number(progress.wrong)||0)*10')&&runtime.includes('progress.nextReview'));
check('Review suppresses immediate source repetition',runtime.includes('recentSources.length>=2')&&runtime.includes('candidate.source!==recentSources[recentSources.length-1]'));
check('Infinite review avoids a same-question repeat at cycle boundaries',runtime.includes('withoutImmediateRepeat')&&runtime.includes('candidate.key!==previous'));
check('Mixed review gathers every source',runtime.includes('englishWrongCandidates(config)')&&runtime.includes('japaneseWrongCandidates(config)')&&runtime.includes('socialWrongCandidates(config)'));
check('Candidate set is recalculated for every next question',runtime.includes('const candidates=collectWrongCandidates(session.config)'));
check('Finite wrong review ends after one pass instead of repeating',runtime.includes('!session.attemptedRound.has(candidate.key)')&&runtime.includes('if(!pool.length&&session.infinite'));
check('Invalid candidates use a bounded loop, not recursion',runtime.includes('for(let attempt=0;attempt<100;attempt++)'));
check('No aggregate quiz score is persisted',!/localStorage\.setItem\([^\n]*(?:score|result)/i.test(runtime));

check('PWA precaches unified runtime, classics, and standalone assets',sw.includes("url('quiz/unified-native-v1.js')")&&sw.includes("url('quiz/japanese-classics-bank-v1.js')")&&sw.includes("url('classics-vocab/app.js')")&&sw.includes("url('kokugo-chronologia/koten-kanbun-bank-5.js')"));

console.log(JSON.stringify({version:'3.0.0',checks,failures,bank:{sourceTotal:bank.sourceTotal||0,classical:bank.classical?.length||0,kanbun:bank.kanbun?.length||0,total:all.length}},null,2));
if(failures.length)process.exit(1);
