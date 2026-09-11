import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('quiz/index.html');
const runtime=read('quiz/unified-native-v1.js');
const card=read('app/ui/rise-learning-expansion-v1.js');
const aiReading=read('ai-reading-v1.js');
const questionQuality=read('question-quality-v1.js');
const loader=read('v23-loader.js');
const failures=[];
const checks=[];
function check(name,condition,details=''){
 const ok=Boolean(condition);checks.push({name,ok,details});
 if(!ok)failures.push(name+(details?`: ${details}`:''));
}

let syntaxError='';
try{new vm.Script(runtime,{filename:'quiz/unified-native-v1.js'});}catch(error){syntaxError=String(error?.message||error);}
check('Unified quiz runtime parses as JavaScript',!syntaxError,syntaxError);
const bridgePrograms=[...runtime.matchAll(/script\.textContent=`([\s\S]*?)`;/g)].map(match=>match[1]);
let bridgeSyntax='';
for(const [index,program] of bridgePrograms.entries()){
 try{new vm.Script(program,{filename:`unified-bridge-${index+1}.js`});}catch(error){bridgeSyntax=String(error?.message||error);break;}
}
check('English and Social native bridge programs both parse',bridgePrograms.length===2&&!bridgeSyntax,bridgeSyntax||`bridges=${bridgePrograms.length}`);
check('Unified quiz scope is exactly English/Japanese/Social',/SUBJECTS\s*=\s*Object\.freeze\(\['english','japanese','social'\]\)/.test(runtime));
check('Unified quiz UI exposes exactly the three supported subject tabs',[...html.matchAll(/data-subject="([^"]+)"/g)].map(match=>match[1]).join('/')==='mixed/english/japanese/social');
check('Science and Math do not leak into this vocabulary quiz',!/(data-subject="(?:science|math)"|>理科<|>数学<)/.test(html));
check('One controller owns normal, infinite, and wrong-only modes',html.includes('./unified-native-v1.js?v=2.0.0')&&!html.includes('./review-algorithm-v1.js')&&!html.includes('./infinite-course-v1.js'));
check('English history bridge skips UI-only AI reading decorators',aiReading.includes('rise_unified_vocab_bridge=1')&&aiReading.includes('bridgeOnly: true'));
check('Question quality tolerates bridge data before vocabulary hydration',questionQuality.includes("!Array.isArray(DATA?.vocab)?null")&&questionQuality.includes('unsafeInflectionCount()'));
check('Bridge safety fixes use fresh production asset URLs',loader.includes('gemini-library-2.0.5-exam-scaffold-rise-ia-bridge-guard')&&loader.includes('question-quality-1.1.1-bridge-safe'));
check('Classics bank loads before the unified controller',html.indexOf('./japanese-classics-bank-v1.js')>0&&html.indexOf('./japanese-classics-bank-v1.js')<html.indexOf('./unified-native-v1.js'));
check('Legacy independent unified score store is absent',!/(rise-unified-vocab-quiz-v1|WRONG_REVIEW_SCORE|reviewScoreKey)/.test(html+runtime));
check('Only a selection-cycle store was added',runtime.includes("AUX_CYCLE_KEY='rise_unified_quiz_cycle_v2'")&&!/score[^\n]{0,30}localStorage|localStorage[^\n]{0,30}score/i.test(runtime));

check('Vocabulary Core and progress adapters load',html.includes('../vocabulary-core/core-v1.js')&&html.includes('../vocabulary-core/progress-adapters-v1.js'));
check('English writes through native recordAttempt/updateSRS/save',runtime.includes('recordAttempt(q,String(ans||\'\'),!!ok,t')&&runtime.includes('updateSRS(sid,!!ok,t')&&runtime.includes('save();return snap(v)'));
check('English uses the native wrong queue',runtime.includes("const BANK='aa_vocab_quiz_wrong_v1'")&&runtime.includes('removeWrong(item.raw.id)')&&runtime.includes('markWrong(item.raw.id)'));
check('English modes remain selectable and are honored in wrong-only',html.includes('id="quizMode"')&&runtime.includes("['en-ja','ja-en','spell']")&&runtime.includes("config.subject==='english'?config.mode:'random'"));
check('English word-only, phrase-only, and form-only filters exist',runtime.includes("['word','単語のみ']")&&runtime.includes("['phrase','熟語のみ']")&&runtime.includes("['form','活用形のみ']"));
check('Typed controls reset on every question',runtime.includes("ui.answerInput.value='';ui.answerInput.disabled=false;ui.submit.disabled=false"));
check('English spelling normalization handles case, width, spaces, apostrophes, and dashes',runtime.includes("normalize('NFKC').toLowerCase()")&&runtime.includes("replace(/[’‘]/g")&&runtime.includes("replace(/[‐‑‒–—]/g")&&runtime.includes("replace(/\\s+/g,' ')"));

check('Japanese native state, wrong queue, and cycle keys remain unchanged',runtime.includes("JA_STATE_KEY='kokugoChronologiaStateV2'")&&runtime.includes("JA_WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1'")&&runtime.includes("JA_CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1'"));
check('Japanese requires the exact 15,000-row source',runtime.includes('rows.length!==15000'));
check('Japanese full IDs preserve quiz-full identity',runtime.includes("id:'quiz-full-'+String(row.id??index)"));
check('Japanese meanings come from the verified direct dictionary',runtime.includes('meaning-ja-overrides.js')&&runtime.includes('KOKUGO_DIRECT_MEANINGS')&&runtime.includes('const meaning=text(meanings[String(row.id??index)])'));
check('Japanese loader rejects missing/non-Japanese meanings',runtime.includes("if(!meaning||!hasJapanese(meaning))throw new Error"));
check('Japanese content is deduplicated by word and reading',runtime.includes('function jaContentKey')&&runtime.includes('const seenFull=new Set()')&&runtime.includes('byKey=new Map(merged.map(item=>[jaContentKey(item),item]))'));
check('Curated Japanese metadata overrides coarse dictionary metadata',runtime.includes('existing.type=item.type||existing.type')&&runtime.includes('Object.assign(existing,jaQuality.verified(item')&&runtime.includes('existing.qualitySource=item.source||existing.qualitySource'));
check('Japanese exclusions are applied without deleting source data',runtime.includes('!jaQuality.isExcluded(item)'));
check('Japanese distractors prefer same type and rank',runtime.includes('row.raw.type===item.raw.type&&row.raw.rank===item.raw.rank'));
check('Japanese all includes modern vocabulary, classical, and kanbun',runtime.includes("['vocab','vocab','vocab','classical','kanbun']")&&runtime.includes("['all','語彙＋古文＋漢文']"));
check('Japanese fixed question mode reaches normal and wrong-only builders',runtime.includes('japaneseVocabQuestion(item,context.mode,distractorPool,true)')&&runtime.includes('makeJapaneseVocabNormal(context.kind'));
check('Classics answers are recorded directly without MutationObserver inference',runtime.includes('function recordClassic(item,correct)')&&!runtime.includes('new MutationObserver'));
check('Classic mistakes are excluded from regular Japanese wrong count',runtime.includes("filter(item=>!['koten','kanbun'].includes(text(item?.type)))"));

check('Social writes through native Chronologia recordAnswer',runtime.includes('recordAnswer(item.id,!!ok)'));
check('Social bridge waits for the effective 1,000-row catalogue',runtime.includes("typeof recordAnswer!=='function'||DATA.length<1000"));
check('Social fixed directions reach normal and wrong-only builders',runtime.includes("['eventToYear','yearToEvent'].includes(mode)")&&runtime.includes('socialQuestion(item,context.mode,all,true)'));
check('Social year-to-event distractors exclude another event from the same date',runtime.includes('row.raw.date!==item.raw.date&&row.raw.sort!==item.raw.sort'));
check('Social BCE and full-width year input normalization is preserved',runtime.includes("normalize('NFKC').toLowerCase()")&&runtime.includes("`紀元前${number}`")&&runtime.includes('`${number}bc`'));

check('All modes use one session lock and one answer commit path',runtime.includes('session.locked=true')&&runtime.includes('await question.commit(correct,answer,ms)')&&runtime.includes('session.transitioning'));
check('Finite sessions do not repeat a question within the session',runtime.includes('usedKeys:new Set()')&&runtime.includes('session.usedKeys.add(question.key)')&&runtime.includes('avoidKeys.has(`${prefix}:${id}`)'));
check('Wrong-only finite sessions use one-pass attempted keys',runtime.includes('attemptedRound:new Set()')&&runtime.includes('!session.attemptedRound.has(candidate.key)')&&runtime.includes('session.attemptedRound.add(question.key)'));
check('Wrong-only selection is iterative rather than recursive',runtime.includes('for(let attempt=0;attempt<100;attempt++)')&&!/nextWrongQuestion\([^)]*\)[^{]*\{[^}]*nextWrongQuestion\(/s.test(runtime));
check('Empty wrong-only state is shown in a visible summary',runtime.includes("ui.summaryTitle.textContent='間違いはありません'")&&runtime.includes("ui.summary.classList.remove('hidden')"));
check('Restart restores subject, mode, filters, count, and wrong-only state',runtime.includes('function applyConfig(config)')&&runtime.includes('configureJapaneseRange(config.filterB)')&&runtime.includes('wrongOnly=Boolean(config.wrongOnly)'));
check('Feedback renders untrusted content with textContent/replaceChildren',runtime.includes('answer.textContent=`正解：${question.answer}`')&&runtime.includes('explanation.textContent=question.explanation')&&runtime.includes('ui.feedback.replaceChildren')&&!/ui\.feedback\.innerHTML/.test(runtime));
check('Infinite course is a first-class count option with manual end',html.includes('<option value="infinite">∞ 無限コース</option>')&&html.includes('id="endSession"')&&runtime.includes("ui.end.addEventListener('click',()=>finishSession(true))"));

let qualityPolicy=null,qualityPolicyError='';
try{
 const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read('kokugo-chronologia/exam-quality-v1.js'),sandbox,{filename:'exam-quality-v1.js'});qualityPolicy=sandbox.window.RISE_JAPANESE_EXAM_QUALITY_V1||null;
}catch(error){qualityPolicyError=String(error?.message||error);}
check('Japanese quality policy loads',Boolean(qualityPolicy)&&!qualityPolicyError,qualityPolicyError);
check('Known non-idiom remains excluded',qualityPolicy?.isExcluded?.({word:'間に合う',reading:'まにあう'})===true);

const japaneseRows=read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const meaningSandbox={window:{}};vm.createContext(meaningSandbox);vm.runInContext(read('kokugo-chronologia/meaning-ja-overrides.js'),meaningSandbox,{filename:'meaning-ja-overrides.js'});
const meanings=meaningSandbox.window.KOKUGO_DIRECT_MEANINGS||{};
const missing=japaneseRows.filter((row,index)=>!/[\u3040-\u30ff\u3400-\u9fff]/.test(String(meanings[String(row.id??index)]||'')));
check('Japanese source is exactly 15,000 rows',japaneseRows.length===15000,`rows=${japaneseRows.length}`);
check('All 15,000 Japanese rows have Japanese meanings',Object.keys(meanings).length>=15000&&missing.length===0,`meanings=${Object.keys(meanings).length}, missing=${missing.length}`);

check('Chronologia remains an independent linked learning asset',html.includes('href="../chronologia.html"')&&html.includes('年表本体は独立教材として継続'));
check('English and Japanese native pages remain linked',html.includes('href="../vocab.html"')&&html.includes('href="../kokugo-chronologia/"'));
check('Learning card still describes the three-subject scope',!/英語・国語・理科・社会/.test(card)&&/英語・国語・社会/.test(card));

let bridgeGuardError='';
try{
 const sandbox={window:{},location:{search:'?rise_unified_vocab_bridge=1'},URLSearchParams};
 vm.createContext(sandbox);vm.runInContext(aiReading,sandbox,{filename:'ai-reading-v1.js'});
 check('AI reading bridge guard exits cleanly',sandbox.window.__AA_AI_READING_V1__?.bridgeOnly===true);
}catch(error){bridgeGuardError=String(error?.message||error);check('AI reading bridge guard exits cleanly',false,bridgeGuardError);}
try{
 const sandbox={window:{},DATA:{},localStorage:{setItem(){}},console:{info(){},warn(){}}};
 vm.createContext(sandbox);vm.runInContext(questionQuality,sandbox,{filename:'question-quality-v1.js'});
 check('Question quality bridge guard executes without DATA.vocab',sandbox.window.AA_QUESTION_QUALITY?.version==='1.1.1'&&sandbox.window.AA_QUESTION_QUALITY?.initialAudit?.unsafeInflectionsRemaining===null);
}catch(error){check('Question quality bridge guard executes without DATA.vocab',false,String(error?.message||error));}

console.log(JSON.stringify({version:'2.0.0',checkedAt:new Date().toISOString(),checks,failures,japanese:{rows:japaneseRows.length,directMeanings:Object.keys(meanings).length,missing:missing.length}},null,2));
if(failures.length)process.exit(1);
