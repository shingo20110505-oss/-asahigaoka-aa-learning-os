import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const source=read('english-vocabulary-quiz-quality-v1.js');
const registry=read('app/runtime-registry.js');
const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg)};

try{new vm.Script(source,{filename:'english-vocabulary-quiz-quality-v1.js'})}catch(error){failures.push(`quiz quality syntax: ${error.message}`)}
check(registry.includes('english-vocabulary-quiz-quality-v1.js'),'runtime registry does not load quiz quality layer');
check(source.includes("compatibility:'no-progress-key-migration'"),'progress compatibility marker missing');
check(source.includes("q.quizQualityFallback='unsafe-cloze-to-context'"),'unsafe cloze fallback missing');
check(source.includes("distractors:'same-kind-and-pos-preferred'"),'distractor quality policy missing');

const rows=[
 {id:'a',word:'application',meaning:'申し込み、応用',pos:'n',level:'entrance',example:'The school received many applications for the exchange program.',cloze:'The school received many applications for the exchange program.',srsId:'v:a'},
 {id:'b',word:'argument',meaning:'主張、議論',pos:'n',level:'entrance',example:"The final paragraph strengthens the writer's argument.",cloze:"The final paragraph strengthens the writer's argument.",srsId:'v:b'},
 {id:'c',word:'budget',meaning:'予算',pos:'n',level:'entrance',example:'The town has a limited budget for the project.',cloze:'The town has a limited budget for the project.',srsId:'v:c'},
 {id:'d',word:'concept',meaning:'概念',pos:'n',level:'entrance',example:'The diagram makes the concept easier to understand.',cloze:'The diagram makes the concept easier to understand.',srsId:'v:d'},
 {id:'e',word:'in fact',meaning:'実際には',pos:'phrase',level:'phrase',example:'The first plan looked cheaper, but in fact it cost more.',cloze:'The first plan looked cheaper, but in fact it cost more.',srsId:'v:e'},
 {id:'f',word:'at first',meaning:'最初は',pos:'phrase',level:'phrase',example:'At first, the task looked easy.',cloze:'At first, the task looked easy.',srsId:'v:f'},
 {id:'g',word:'either A or B',meaning:'AかBのどちらか',pos:'phrase',level:'phrase',example:'Choose either plan A or plan B and explain your reason.',cloze:'Choose either plan A or plan B and explain your reason.',srsId:'v:g'},
 {id:'h',word:'both A and B',meaning:'AとBの両方',pos:'phrase',level:'phrase',example:'Both speed and accuracy are important.',cloze:'Both speed and accuracy are important.',srsId:'v:h'}
];
const byWord=Object.fromEntries(rows.map(x=>[x.word,x]));
const makeChoices=v=>[{text:v.word,ok:true,reason:'ok'},{text:'x',ok:false,reason:'x'},{text:'y',ok:false,reason:'y'},{text:'z',ok:false,reason:'z'}];
const original=(forced,forcedFormat)=>{const v=forced||rows[0],format=forcedFormat||'cloze';return{id:`q:${v.id}:${format}`,type:'vocab',format,source:v,stem:`${format}\n\n${v.example}`,choices:makeChoices(v),answerIndex:0,explanation:'ok'}};
const window={makeVocabQ:original,__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__:{complete:true}};
const sandbox={window,DATA:{vocab:rows},vocabPool:()=>rows,CustomEvent:function(name,opts){this.type=name;this.detail=opts?.detail},document:{dispatchEvent(){}},setInterval(fn){fn();return 1},clearInterval(){},console};
vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:'english-vocabulary-quiz-quality-v1.js'});
const wrapped=sandbox.window.makeVocabQ;
const unsafeWord=wrapped(byWord.application,'cloze');
const safeWord=wrapped(byWord.argument,'cloze');
const safePhrase=wrapped(byWord['in fact'],'cloze');
const templatePhrase=wrapped(byWord['either A or B'],'cloze');
check(unsafeWord.format==='context'&&unsafeWord.quizQualityFallback==='unsafe-cloze-to-context','inflected application must fall back from cloze to context');
check(safeWord.format==='cloze','exact word surface should remain cloze eligible');
check(safePhrase.format==='cloze','exact phrase surface should remain cloze eligible');
check(templatePhrase.format==='context'&&templatePhrase.quizQualityFallback==='unsafe-cloze-to-context','A/B phrase template must fall back to context');
check(/例文を読んで/.test(unsafeWord.stem)&&/application/.test(unsafeWord.stem),'context fallback stem is not explicit and readable');
check(new Set(safeWord.choices.map(x=>x.text)).size===4&&safeWord.choices.filter(x=>x.ok).length===1,'rebuilt cloze choices must remain four unique choices with one correct answer');
check(sandbox.window.__AA_ENGLISH_VOCAB_QUIZ_QUALITY_V1__?.total===rows.length,'runtime diagnostics total mismatch');
check(rows.every(x=>x.srsId===`v:${x.id}`),'validation fixture SRS identity changed');

console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',version:sandbox.window.__AA_ENGLISH_VOCAB_QUIZ_QUALITY_V1__?.version||'',diagnostics:sandbox.window.__AA_ENGLISH_VOCAB_QUIZ_QUALITY_V1__||null,failures},null,2));
if(failures.length)process.exit(1);
