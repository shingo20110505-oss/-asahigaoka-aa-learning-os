'use strict';
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const INDEX=fs.readFileSync('index.html','utf8');
function scan(source,start,open,close){let d=0,q=null,e=false,lc=false,bc=false;for(let i=start;i<source.length;i++){let c=source[i],n=source[i+1];if(lc){if(c==='\n')lc=false;continue}if(bc){if(c==='*'&&n==='/'){bc=false;i++}continue}if(q){if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===q)q=null;continue}if(c==='/'&&n==='/'){lc=true;i++;continue}if(c==='/'&&n==='*'){bc=true;i++;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c===open)d++;else if(c===close&&--d===0)return i+1}throw Error('unbalanced')}
function obj(name){let m=new RegExp(`\\bconst\\s+${name}\\s*=\\s*`).exec(INDEX);if(!m)throw Error(name);let s=INDEX.indexOf('{',m.index+m[0].length),e=scan(INDEX,s,'{','}');return vm.runInNewContext(`(${INDEX.slice(s,e)})`,{})}
function fn(name){let m=new RegExp(`\\bfunction\\s+${name}\\s*\\(`).exec(INDEX);if(!m)throw Error(name);let s=INDEX.indexOf('{',m.index+m[0].length),e=scan(INDEX,s,'{','}');return INDEX.slice(m.index,e)}
const DATA=obj('DATA');let READING_DISTRACTORS={};try{READING_DISTRACTORS=obj('READING_DISTRACTORS')}catch{}
const gate={basic:true,past:true,future:true,modal:true,infinitive:true,gerund:true,passive:true,comparison:true,presentPerfect:true,asMuchAs:true,asManyAs:true,indirectQuestion:true,relativePronoun:true,presentPerfectProgressive:true,participle:true,subjunctive:true};
const ctx={console,Math,DATA,READING_GLOSSARY:{},READING_DISTRACTORS,window:{},document:{dispatchEvent(){}},CustomEvent:function(){},state:{profile:{grammarGate:gate},historyFingerprints:[],recentTexts:[]},hash:s=>crypto.createHash('sha1').update(String(s)).digest('hex').slice(0,12)};ctx.window=ctx;ctx.shuffle=a=>[...a];ctx.shuffleChoices=a=>[...a];vm.createContext(ctx);
for(const n of ['evidenceRefs','grammarQuestion','englishReadingChoice'])vm.runInContext(fn(n),ctx);
vm.runInContext(fn('readingQuestionSet'),ctx);
ctx.makeReadingPassage=sc=>(sc.facts||[]).filter(Boolean).join('\n\n');
vm.runInContext(fs.readFileSync('v23-english-main.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('reading-natural-v2.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('reading-natural-v3.js','utf8'),ctx);
const sc=ctx.DATA.readingScenarios.find(x=>x.id==='r13')||ctx.DATA.readingScenarios[0];
const passage=ctx.makeReadingPassage(sc,7,'standard');
const before=ctx.readingQuestionSet(sc,passage,7);
const snapshotBefore=before.map(q=>({type:q.type,answerIndex:q.answerIndex,choices:(q.choices||[]).map(c=>({text:c.text,ok:c.ok,error:c.error})),evidenceRefs:q.evidenceRefs,evidence:q.evidence}));
for(const q of before){let seen=new Set();for(const c of q.choices||[]){c.text=ctx.englishReadingChoice(q.type,c,sc);if(seen.has(c.text))c.text='A problem can have only one possible cause.';seen.add(c.text)}}
const snapshotAfter=before.map(q=>({type:q.type,answerIndex:q.answerIndex,choices:(q.choices||[]).map(c=>({text:c.text,ok:c.ok,error:c.error})),evidenceRefs:q.evidenceRefs,evidence:q.evidence}));
console.log(JSON.stringify({scenario:{id:sc.id,title:sc.title,facts:sc.facts,inference:sc.inference,lesson:sc.lesson},passage,before:snapshotBefore,after:snapshotAfter},null,2));
