/* Route every learner-facing mathematics path through the verified Aichi-style engine. */
(function(root){
'use strict';
const VERSION='1.1.0';
const E=root.AAMathEngine;
let counter=0;
const fail=message=>{if(typeof document!=='undefined')document.documentElement.dataset.aaMathFullReplacement='FAIL';throw new Error(message);};
if(!E||typeof E.make!=='function'||typeof E.buildSet!=='function'||typeof E.figureHTML!=='function'){
 if(typeof document!=='undefined')document.documentElement.dataset.aaMathFullReplacement='FAIL';
 root.AAMathFullReplacement={VERSION,ok:false,reason:'AAMathEngine unavailable'};
 if(typeof module!=='undefined')module.exports=root.AAMathFullReplacement;
 return;
}
const mix32=n=>{n=(n^61)^(n>>>16);n=Math.imul(n,9);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);return (n^(n>>>15))>>>0;};
function runtimeSeed(){
 counter=(counter+1)>>>0;
 let extra=0;
 try{if(root.crypto?.getRandomValues){const a=new Uint32Array(1);root.crypto.getRandomValues(a);extra=a[0]>>>0;}}catch(_){/* deterministic fallback below */}
 return mix32((Date.now()>>>0)^extra^Math.imul(counter,0x9e3779b1));
}
function seededRandom(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const PROBES=Object.fromEntries(E.FAMILIES.map(f=>[f,E.make(f,99173,2).difficulty5]));
function difficultyCap(diff){diff=Math.max(1,Math.min(11,Math.round(Number(diff)||7)));return diff<=3?2:diff<=6?3:diff<=8?4:5;}
function familyPool(diff){
 diff=Math.max(1,Math.min(11,Math.round(Number(diff)||7)));const cap=difficultyCap(diff);
 let pool=E.FAMILIES.filter(f=>PROBES[f]<=cap);
 if(diff>=7){const floor=diff>=9?3:2;const applied=pool.filter(f=>PROBES[f]>=floor);if(applied.length>=5)pool=applied;}
 if(!pool.length)fail('No verified math family for requested difficulty');
 return pool;
}
function shuffleChoices(q,seed){
 const random=seededRandom(seed^0xa51c9e37),choices=q.choices.map(c=>({...c}));
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 return {choices,answerIndex:choices.findIndex(c=>c.ok)};
}
function assertFinite(value,label='question'){
 if(typeof value==='number'&&!Number.isFinite(value))fail(label+' contains non-finite number');
 if(Array.isArray(value))value.forEach((x,i)=>assertFinite(x,`${label}[${i}]`));
 else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))assertFinite(v,`${label}.${k}`);
}
function assertQuestion(q){
 if(!q||q.subject!=='math'||q.source?.origin!=='verified-math-template'||q.source?.curriculum!=='junior-high')fail('Unverified math question');
 if(!Array.isArray(q.choices)||q.choices.length!==4||new Set(q.choices.map(c=>String(c.text))).size!==4)fail('Math choices are not unique');
 if(q.choices.filter(c=>c.ok).length!==1||q.answerIndex<0||!q.choices[q.answerIndex]?.ok)fail('Math answer is not unique');
 if(q.choices.some(c=>typeof c.reason!=='string'||!c.reason.trim()))fail('Math choice explanation missing');
 if(!Array.isArray(q.solutionSteps)||q.solutionSteps.length<2)fail('Math solution steps missing');
 assertFinite(q);
 return q;
}
function createPracticeQuestion(diff=7,forcedSeed=null){
 diff=Math.max(1,Math.min(11,Math.round(Number(diff)||7)));
 const seed=Number.isSafeInteger(forcedSeed)?(forcedSeed>>>0):runtimeSeed();
 const pool=familyPool(diff),family=pool[seed%pool.length],level=diff<=3?1:diff<=7?2:3;
 const base=E.make(family,mix32(seed^0x51f15e),level),shuffled=shuffleChoices(base,mix32(seed^0x8179));
 const q={...base,...shuffled,id:`math-v1-practice-${seed}-${family}-${++counter}`,reviewKey:`aichi-math:${family}`,points:1,testMode:false,mathFigure:base.figure||null,figure:base.figure||null,requestedDifficulty:diff,source:{...base.source,adapterVersion:VERSION,route:'full-replacement'},context:'aichi-math-full-replacement'};
 return assertQuestion(q);
}
const previousMakeSubjectQ=typeof root.makeSubjectQ==='function'?root.makeSubjectQ:null;
root.makeMathQ=createPracticeQuestion;
if(previousMakeSubjectQ){
 root.makeSubjectQ=function(subject,diff=7){return subject==='math'?createPracticeQuestion(diff):previousMakeSubjectQ(subject,diff);};
}
/* Global function declarations are window bindings in this classic-script app. Reassign both bindings when available. */
try{makeMathQ=root.makeMathQ;}catch(_){/* property assignment above remains authoritative */}
try{if(previousMakeSubjectQ)makeSubjectQ=root.makeSubjectQ;}catch(_){/* property assignment above remains authoritative */}
const previousStudyHTML=typeof root.studyHTML==='function'?root.studyHTML:null;
if(previousStudyHTML){
 root.studyHTML=function(...args){
  let html=previousStudyHTML(...args);
  try{
   const session=typeof state!=='undefined'?state?.session:null,q=session?.queue?.[session?.index];
   if(q?.subject==='math'&&q.mathFigure&&!String(html).includes('class="mathFigure"')){
    const figure=E.figureHTML(q.mathFigure);
    if(figure){const marker='<div class="qstem">';html=String(html).replace(marker,`<div data-aa-math-full-figure="1">${figure}</div>${marker}`);}
   }
  }catch(_){/* Rendering must not damage an otherwise valid session. */}
  return html;
 };
 try{studyHTML=root.studyHTML;}catch(_){/* global property is enough */}
}
function selfTest(){
 let checks=0,figures=0;
 for(let diff=1;diff<=11;diff++)for(let i=1;i<=17;i++){
  const q=createPracticeQuestion(diff,diff*10000+i);checks++;
  if(q.figure){const html=E.figureHTML(q.figure);if(!/mathFigure/.test(html)||!/<svg/.test(html))fail('Math figure render failed');figures++;}
  if(q.requestedDifficulty!==diff||!familyPool(diff).includes(q.family))fail('Math difficulty routing failed');
 }
 return {ok:true,checks,figures};
}
let report;
try{report=selfTest();if(typeof document!=='undefined'){document.documentElement.dataset.aaMathFullReplacement='PASS';document.documentElement.dataset.aaMathFullReplacementVersion=VERSION;document.documentElement.dataset.aaMathFullReplacementChecks=String(report.checks);}}
catch(error){if(typeof document!=='undefined')document.documentElement.dataset.aaMathFullReplacement='FAIL';report={ok:false,error:String(error?.stack||error)};}
const API={VERSION,ok:!!report.ok,report,createPracticeQuestion,familyPool,assertQuestion};
root.AAMathFullReplacement=API;
if(typeof module!=='undefined')module.exports=API;
})(typeof window==='undefined'?globalThis:window);
