'use strict';
// publish guard: English reading forwards slider difficulty via generateReading(requested,mode)
const fs=require('fs'),vm=require('vm');
function extractData(){const s=fs.readFileSync('index.html','utf8'),m=s.match(/const DATA\s*=\s*(\{[\s\S]*?\});\s*const READING_GLOSSARY/);if(!m)throw new Error('DATA not found');return JSON.parse(m[1]);}
const DATA=extractData(),ctx={console,DATA,window:{},document:{dispatchEvent(){}},CustomEvent:function(){},state:{ui:{subjectDifficulty:7,practiceConfig:null},session:null},save(){},render(){},recentCorrectPenaltyForKey(){return 0},dueScore(){return 0},itemState(){return{seen:0,correct:0}},generateReadingForLearner(){return{}},makeMathQ(){},makeScienceQ(){},makeSocialQ(){},makeJapaneseQ(){},makeSubjectQ(){},makeVocabQ(v,f){return{source:v,format:f}},planVocabQueue(){return[]},makeKanjiQ(k,f){return{source:k,format:f}},planKanjiQueue(){return[]},handleAction(){},vocabPool(){return DATA.vocab}};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['curriculum-v2-data.js','v23-japanese.js','v23-math.js','v23-science.js','v23-social.js','curriculum-expansion-v24.js','source-quote-bank-v1.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const C=ctx.AA_V2_CURRICULUM,subs=['japanese','math','science','social'],banks={};for(const s of subs)banks[s]=(C[s]||[]).map(r=>({id:r[0],subject:s,area:r[1],prompt:r[2],answer:r[3],explanation:r[4],difficulty:Number(r[5])||6,skillId:s+'.audit',impact:1}));
ctx.AA_V2_TEST_API={banks,subjectRows:s=>banks[s],priority:()=>0,makeQuestion:r=>({id:'q:'+r.id,reviewKey:'v2:'+r.subject+':'+r.id,choices:[{text:String(r.answer),ok:true,reason:'ok'},{text:'x1',ok:false,reason:'no'},{text:'x2',ok:false,reason:'no'},{text:'x3',ok:false,reason:'no'}],answerIndex:0,source:{area:r.area,difficulty:r.difficulty}}),startPractice(){}};
ctx.AA_V22_TEST_API={normalizePracticeConfig:x=>x};
vm.runInContext(fs.readFileSync('difficulty-engine-v1.js','utf8'),ctx,{filename:'difficulty-engine-v1.js'});
const E=ctx.AA_DIFFICULTY_ENGINE;if(!E)throw new Error('difficulty engine not loaded');
const result={version:E.version,runtimeAudit:ctx.AA_DIFFICULTY_AUDIT,subjects:{},english:{},unitPractice:{},failures:[]};
function mean(a){return a.reduce((s,x)=>s+x,0)/Math.max(1,a.length)}
for(const s of subs){const levels={};for(const d of [1,3,5,7,9,11]){const vals=[];for(let i=0;i<24;i++){const r=E.chooseRow(s,d);if(r)vals.push(Number(r.difficulty)||6)}levels[d]=+mean(vals).toFixed(2);if(!vals.length||Math.abs(levels[d]-d)>3.1)result.failures.push(`${s}:level${d}`)}if((levels[11]||0)-(levels[1]||0)<3.5)result.failures.push(`${s}:range-too-small`);result.subjects[s]={rows:banks[s].length,means:levels};}
for(const d of [1,3,5,7,9,11]){const w=E.vocabWords(24,d),k=E.kanjiWords(Math.min(24,DATA.kanji.length),d);result.english[d]={vocabMean:+mean(w.map(E.vocabDifficulty)).toFixed(2),vocabFormat:E.vocabFormat(w[0],d,1),kanjiMean:+mean(k.map(E.kanjiDifficulty)).toFixed(2),kanjiFormat:E.kanjiFormat(k[0],d,1)}}
if(result.english[11].vocabMean-result.english[1].vocabMean<2)result.failures.push('english:vocab-range');
if(result.english[1].vocabFormat===result.english[11].vocabFormat)result.failures.push('english:vocab-format');
if(result.english[11].kanjiMean-result.english[1].kanjiMean<2)result.failures.push('japanese:kanji-range');
const unitCases={japanese:'classical',math:'algebra',science:'chemistry',social:'history'};for(const [s,u] of Object.entries(unitCases)){const means={};for(const d of [2,10]){ctx.state.ui.subjectDifficulty=d;const cfg={subject:s,length:'standard',unitsBySubject:{[s]:[u]}},q=E.exactUnitQueue(cfg)||[];means[d]=+mean(q.map(x=>x.actualDifficulty)).toFixed(2);if(q.length<3||q.some(x=>x.examUnit!==u))result.failures.push(`${s}:unit-${d}`)}if(means[10]-means[2]<2)result.failures.push(`${s}:unit-range`);result.unitPractice[s]={unit:u,means};}
const index=fs.readFileSync('index.html','utf8');result.english.readingExact=/function generateReadingForLearner\(base=7/.test(index)&&/generateReading\(requested,mode\)/.test(index)&&/state\.ui\.subjectDifficulty\|\|7/.test(index);if(!result.english.readingExact)result.failures.push('english:reading-difficulty-wire');
result.pass=!!ctx.AA_DIFFICULTY_AUDIT?.pass&&result.failures.length===0;
console.log('DIFFICULTY_5SUBJECT_AUDIT '+JSON.stringify(result));if(!result.pass)process.exitCode=1;
