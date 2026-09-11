import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');
const runtimeSource=read('quiz/unified-native-v1.js');
const bridgeSources=[...runtimeSource.matchAll(/script\.textContent=`([\s\S]*?)`;/g)].map(match=>match[1]);
assert.equal(bridgeSources.length,2,'English and Social bridge programs must both exist');
for(const [index,source] of bridgeSources.entries())assert.doesNotThrow(()=>new vm.Script(source),`bridge ${index+1} must parse`);

{
 const bridgeStore=new Map(),calls=[];
 const bridgeStorage={getItem:key=>bridgeStore.get(key)||null,setItem:(key,value)=>bridgeStore.set(key,String(value))};
 const context={window:null,localStorage:bridgeStorage,Date,setTimeout,clearTimeout,AA_API_READING_ONLY:true,AA_V23_STATS:{loaderComplete:true},state:{items:{},profile:{unknownWords:{}}},vocabPool:()=>[{id:'native-en',srsId:'v:native-en',word:'native',meaning:'既存',pos:'n',level:'entrance',example:'A native bridge.'}],recordAttempt:(...args)=>calls.push(['attempt',...args]),updateSRS:(...args)=>calls.push(['srs',...args]),save:()=>calls.push(['save']),retention:()=>.8};
 context.window=context;vm.createContext(context);vm.runInContext(bridgeSources[0],context);
 assert.equal(context.AA_RISE_UNIFIED_ENGLISH_API.list().length,1);
 context.AA_RISE_UNIFIED_ENGLISH_API.record('native-en',false,500,'spell','wrong');
 context.AA_RISE_UNIFIED_ENGLISH_API.markWrong('native-en');
 assert.ok(context.AA_RISE_UNIFIED_ENGLISH_API.wrongBank()['native-en']);
 context.AA_RISE_UNIFIED_ENGLISH_API.removeWrong('native-en');
 assert.equal(Object.keys(context.AA_RISE_UNIFIED_ENGLISH_API.wrongBank()).length,0);
 assert.deepEqual(calls.map(call=>call[0]),['attempt','srs','save']);
}

{
 const calls=[],rows=Array.from({length:1000},(_,index)=>({id:index+1,sort:500+index,date:`${500+index}年`,event:`出来事${index+1}`,area:'日本',period:'古代',level:'A',detail:'解説',tags:[]}));
 const context={window:null,Date,setTimeout,clearTimeout,DATA:rows,state:{progress:{}},byId:new Map(rows.map(row=>[row.id,row])),recordAnswer:(id,correct)=>calls.push([id,correct])};
 context.window=context;vm.createContext(context);vm.runInContext(bridgeSources[1],context);
 assert.equal(context.AA_RISE_UNIFIED_SOCIAL_API.list().length,1000);
 context.AA_RISE_UNIFIED_SOCIAL_API.record('1',true);
 assert.deepEqual(calls,[[1,true]]);
}

class ClassList{
 constructor(owner,initial=''){this.owner=owner;this.values=new Set(String(initial).split(/\s+/).filter(Boolean));}
 add(...names){for(const name of names)this.values.add(name);this.sync();}
 remove(...names){for(const name of names)this.values.delete(name);this.sync();}
 contains(name){return this.values.has(name);}
 toggle(name,force){const next=force==null?!this.values.has(name):Boolean(force);if(next)this.values.add(name);else this.values.delete(name);this.sync();return next;}
 sync(){this.owner._className=[...this.values].join(' ');}
}

class MockElement{
 constructor(tag='div',id=''){
  this.tagName=tag.toUpperCase();this.id=id;this.dataset={};this.style={};this.children=[];this.listeners={};this.attributes={};this.disabled=false;this.value='';this._text='';this._className='';this.classList=new ClassList(this);
 }
 set className(value){this._className=String(value);this.classList=new ClassList(this,value);}
 get className(){return this._className;}
 set textContent(value){this._text=String(value??'');if(this.tagName!=='SELECT')this.children=[];}
 get textContent(){return this._text||this.children.map(child=>child.textContent||'').join('');}
 get options(){return this.tagName==='SELECT'?this.children:[];}
 appendChild(child){this.children.push(child);if(this.tagName==='SELECT'&&!this.value)this.value=child.value;return child;}
 replaceChildren(...children){this.children=children;this._text='';if(this.tagName==='SELECT')this.value=children[0]?.value||'';}
 addEventListener(type,listener){(this.listeners[type]||(this.listeners[type]=[])).push(listener);}
 dispatchEvent(event){event.target=this;for(const listener of this.listeners[event.type]||[])listener.call(this,event);return true;}
 click(){const event=new MockEvent('click');if(typeof this.onclick==='function')this.onclick(event);this.dispatchEvent(event);}
 setAttribute(name,value){this.attributes[name]=String(value);if(name==='value')this.value=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 scrollIntoView(){}
 focus(){}
}

class MockEvent{
 constructor(type){this.type=type;this.defaultPrevented=false;this.key='';}
 preventDefault(){this.defaultPrevented=true;}
 stopPropagation(){}
 stopImmediatePropagation(){}
}

const ids=['connectionStatus','startSession','focusToggle','sessionCount','quizMode','filterA','filterB','filterALabel','filterBLabel','wrongReviewSummary','enCount','jaCount','soCount','enSub','jaSub','soSub','studyCard','setupCard','subjectName','modeName','questionIndex','sessionScore','sessionBar','prompt','hint','choices','inputRow','answerInput','submitAnswer','feedback','nextQuestion','endSession','speakQuestion','summary','summaryTitle','summaryScore','summaryMessage','restartSession','englishBridge','socialBridge'];
const elements=new Map(ids.map(id=>[id,new MockElement(['sessionCount','quizMode','filterA','filterB'].includes(id)?'select':id==='answerInput'?'input':'div',id)]));
for(const id of ['studyCard','inputRow','feedback','nextQuestion','endSession','speakQuestion','summary'])elements.get(id).classList.add('hidden');
for(const value of ['10','20','30','infinite']){const option=new MockElement('option');option.value=value;option.textContent=value;elements.get('sessionCount').appendChild(option);}

const subjectButtons=['mixed','english','japanese','social'].map(subject=>{const button=new MockElement('button');button.dataset.subject=subject;if(subject==='mixed')button.classList.add('on');return button;});
const documentElement=new MockElement('html');
const scriptMarkers=new Set(['rise-unified-english-bridge-v2','rise-unified-social-bridge-v2']);
const document={
 readyState:'complete',documentElement,
 head:new MockElement('head'),
 querySelector(selector){if(selector.startsWith('#'))return elements.get(selector.slice(1))||null;if(selector==='[data-subject]')return subjectButtons[0]||null;return null;},
 querySelectorAll(selector){if(selector==='[data-subject]')return subjectButtons;if(selector==='#choices .choice')return elements.get('choices').children;return[];},
 createElement(tag){return new MockElement(tag);},
 createTextNode(value){const node=new MockElement('#text');node.textContent=value;return node;},
 getElementById(id){return elements.get(id)||(scriptMarkers.has(id)?{}:null);}
};

const storage=new Map();
const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const englishProgress=new Map(),englishWrong={};
const englishKinds=['word','phrase','form'];
const englishRows=Array.from({length:18},(_,index)=>{
 const kind=englishKinds[index%englishKinds.length],id=`en-${index}`;
 return{id,srsId:kind==='phrase'?`phrase:${id}`:`v:${id}`,word:kind==='phrase'?`sample phrase ${index}`:`sample${index}`,meaning:`意味${index}`,pos:kind,level:kind,example:`Example ${index}.`,progress:englishProgress.get(id)||{seen:0,correct:0,lapses:0,retention:0,lastReviewAt:0,dueAt:0,due:false}};
});
const englishApi={
 list:()=>englishRows.map(row=>({...row,progress:{...(englishProgress.get(row.id)||row.progress)}})),wrongBank:()=>({...englishWrong}),
 markWrong(id){englishWrong[id]=Date.now();localStorage.setItem('aa_vocab_quiz_wrong_v1',JSON.stringify(englishWrong));},
 removeWrong(id){delete englishWrong[id];localStorage.setItem('aa_vocab_quiz_wrong_v1',JSON.stringify(englishWrong));},
 record(id,correct){const old=englishProgress.get(id)||{seen:0,correct:0,lapses:0,retention:0};englishProgress.set(id,{...old,seen:old.seen+1,correct:old.correct+(correct?1:0),lapses:old.lapses+(correct?0:1),retention:correct?.9:.2,lastReviewAt:Date.now(),dueAt:Date.now()+10000,due:false});localStorage.setItem('asahi_learning_os_v1',JSON.stringify({updatedAt:Date.now(),id,correct}));}
};

const socialProgress=new Map();
const socialRows=Array.from({length:1000},(_,index)=>({id:String(index+1),sort:index+500,date:`${index+500}年`,event:`出来事${index+1}`,area:index%2?'日本':'世界',period:index%3===0?'古代':index%3===1?'中世':'近現代',level:index%4===0?'S':index%4===1?'A':'B',detail:`解説${index+1}`,tags:[],progress:{...(socialProgress.get(String(index+1))||{})}}));
const socialApi={
 list:()=>socialRows.map(row=>({...row,progress:{...(socialProgress.get(row.id)||{})}})),
 record(id,correct){const key=String(id),old=socialProgress.get(key)||{seen:0,correct:0,wrong:0,stage:0};const next={...old,seen:old.seen+1,correct:old.correct+(correct?1:0),wrong:old.wrong+(correct?0:1),stage:correct?Math.min(old.stage+1,5):0,nextReview:correct?Date.now()+86400000:Date.now(),last:Date.now()};socialProgress.set(key,next);localStorage.setItem('chronologia-aichi-v3',JSON.stringify({progress:Object.fromEntries(socialProgress)}));}
};
elements.get('englishBridge').contentWindow={AA_RISE_UNIFIED_ENGLISH_API:englishApi};
elements.get('englishBridge').contentDocument={body:new MockElement('body'),getElementById:id=>scriptMarkers.has(id)?{}:null};
elements.get('socialBridge').contentWindow={AA_RISE_UNIFIED_SOCIAL_API:socialApi};
elements.get('socialBridge').contentDocument={body:new MockElement('body'),getElementById:id=>scriptMarkers.has(id)?{}:null};

const windowListeners={};
const sandbox={document,localStorage,location:{protocol:'http:',pathname:'/quiz/'},navigator:{},console,performance:{now:()=>Date.now()},setTimeout,clearTimeout,setInterval,clearInterval,AbortController,Event:MockEvent,speechSynthesis:{cancel(){},speak(){}},SpeechSynthesisUtterance:class{constructor(value){this.text=value;}},addEventListener(type,listener){(windowListeners[type]||(windowListeners[type]=[])).push(listener);}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);

for(const file of ['idiom/idiom-bank.js','kokugo-chronologia/jukugo-bank.js','kokugo-chronologia/jukugo-bank-advanced-1.js','kokugo-chronologia/jukugo-bank-advanced-2.js','kokugo-chronologia/jukugo-bank-advanced-3.js','kokugo-chronologia/jukugo-bank-advanced-4.js','kokugo-chronologia/jukugo-bank-advanced-5.js','vocabulary-core/core-v1.js','vocabulary-core/progress-adapters-v1.js','kokugo-chronologia/exam-quality-v1.js','kokugo-chronologia/koten-kanbun-bank-1.js','kokugo-chronologia/koten-kanbun-bank-2.js','kokugo-chronologia/koten-kanbun-bank-3.js','kokugo-chronologia/koten-kanbun-bank-4.js','kokugo-chronologia/koten-kanbun-bank-5.js','kokugo-chronologia/koten-kanbun-normalization-v1.js','quiz/japanese-classics-bank-v1.js','kokugo-chronologia/meaning-ja-overrides.js'])vm.runInContext(read(file),sandbox,{filename:file});
const japaneseJsonl=read('kokugo-chronologia/data.jsonl');
sandbox.fetch=async()=>({ok:true,status:200,text:async()=>japaneseJsonl});
vm.runInContext(runtimeSource,sandbox,{filename:'quiz/unified-native-v1.js'});

async function waitFor(predicate,label,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){const result=predicate();if(result)return result;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error(`${label} timeout`);}
await waitFor(()=>sandbox.RISE_UNIFIED_QUIZ_V2.counts().japanese>=15000,'Japanese data');
const counts=sandbox.RISE_UNIFIED_QUIZ_V2.counts();
assert.equal(counts.english,18);assert.ok(counts.japanese>=15000);assert.equal(counts.classical,700);assert.equal(counts.kanbun,300);assert.equal(counts.social,1000);
assert.equal(elements.get('startSession').disabled,false);

function chooseSubject(subject){subjectButtons.find(button=>button.dataset.subject===subject).click();}
function select(id,value){const element=elements.get(id);assert.ok(element.options.some(option=>option.value===value),`${id} lacks ${value}`);element.value=value;element.dispatchEvent(new MockEvent('change'));}
function setWrongOnly(wanted){const button=elements.get('focusToggle');if(button.classList.contains('on')!==wanted)button.click();}
async function start(config){chooseSubject(config.subject);if(config.filterA)select('filterA',config.filterA);if(config.filterB)select('filterB',config.filterB);if(config.mode)select('quizMode',config.mode);select('sessionCount',config.count||'10');setWrongOnly(Boolean(config.wrongOnly));elements.get('startSession').click();return waitFor(()=>sandbox.RISE_UNIFIED_QUIZ_V2.current(),`${config.subject} start`);}
async function answer(correct){const question=sandbox.RISE_UNIFIED_QUIZ_V2.current();assert.ok(question);const choices=elements.get('choices').children;if(choices.length){const button=choices.find(choice=>(choice.textContent===question.answer)===correct);assert.ok(button);button.click();}else{elements.get('answerInput').value=correct?question.answer.replace(/年$/,''):'__wrong__';elements.get('submitAnswer').click();}await waitFor(()=>!elements.get('feedback').classList.contains('hidden'),'feedback');}
async function next(){elements.get('nextQuestion').click();await new Promise(resolve=>setTimeout(resolve,0));}

let question=await start({subject:'english',mode:'spell',filterA:'word'});
assert.equal(question.kind,'word');assert.equal(question.input,true);assert.match(question.mode,/^スペル/);await answer(false);
assert.ok(localStorage.getItem('asahi_learning_os_v1'));assert.equal(sandbox.RISE_WRONG_REVIEW_V1.counts().english,1);

question=await start({subject:'english',mode:'spell',filterA:'word',wrongOnly:true});
assert.match(question.mode,/スペル・間違い$/);await answer(true);await next();
assert.equal(sandbox.RISE_WRONG_REVIEW_V1.counts().english,0);assert.equal(elements.get('summaryTitle').textContent,'間違い復習完了');

englishApi.markWrong('en-0');englishApi.markWrong('en-3');
await start({subject:'english',mode:'spell',filterA:'word',wrongOnly:true,count:'infinite'});
const wrongCycleKeys=[];
for(let index=0;index<4;index++){wrongCycleKeys.push(sandbox.RISE_UNIFIED_QUIZ_V2.current().key);await answer(false);if(index<3)await next();}
assert.equal(new Set(wrongCycleKeys.slice(0,2)).size,2);
assert.notEqual(wrongCycleKeys[2],wrongCycleKeys[1]);
elements.get('endSession').click();englishApi.removeWrong('en-0');englishApi.removeWrong('en-3');

question=await start({subject:'japanese',mode:'reading',filterA:'vocab'});
assert.equal(question.source,'japanese-vocab');assert.match(question.mode,/^語句→読み/);
localStorage.setItem('aa_kokugo_vocab_wrong_queue_v1',JSON.stringify([{id:'quiz-full-2538870',word:'嗚呼嗚呼',reading:'ああああ',meaning:'驚きや嘆きを表す声',type:'four',rank:'C'},{id:'legacy-metadata-id',word:'嗚呼嗚呼',reading:'ああああ',meaning:'驚きや嘆きを表す声',type:'yoji',rank:'C'}]));
assert.equal(sandbox.RISE_WRONG_REVIEW_V1.counts().japanese,1);
question=await start({subject:'japanese',mode:'word',filterA:'vocab',filterB:'C',wrongOnly:true});
assert.equal(question.source,'japanese-vocab');await answer(true);await next();
assert.equal(sandbox.RISE_WRONG_REVIEW_V1.counts().japanese,0);
const classicalKeys=[];
await start({subject:'japanese',mode:'meaning',filterA:'classical',filterB:'S',count:'infinite'});
for(let index=0;index<8;index++){const current=sandbox.RISE_UNIFIED_QUIZ_V2.current();classicalKeys.push(current.key);await answer(false);if(index<7)await next();}
assert.equal(new Set(classicalKeys).size,classicalKeys.length);elements.get('endSession').click();assert.equal(elements.get('summaryTitle').textContent,'無限コース終了');

question=await start({subject:'japanese',mode:'word',filterA:'kanbun',filterB:'A'});
assert.equal(question.source,'kanbun');assert.match(question.mode,/意味→語句/);

question=await start({subject:'social',mode:'eventToYear',filterA:'all'});
assert.equal(question.input,true);assert.match(question.mode,/^出来事→年号/);await answer(false);assert.ok(localStorage.getItem('chronologia-aichi-v3'));
question=await start({subject:'social',mode:'yearToEvent',filterA:'all'});
assert.equal(question.input,false);assert.match(question.mode,/^年号→出来事/);

await start({subject:'english',mode:'spell',filterA:'all',count:'infinite'});
const englishCycleKeys=[];
for(let index=0;index<20;index++){const current=sandbox.RISE_UNIFIED_QUIZ_V2.current();englishCycleKeys.push(current.key);await answer(false);if(index<19)await next();}
assert.equal(new Set(englishCycleKeys.slice(0,18)).size,18);
assert.notEqual(englishCycleKeys[18],englishCycleKeys[17]);
elements.get('endSession').click();

await start({subject:'mixed',filterA:'balanced',count:'10'});
const mixedKeys=[],mixedSubjects=new Set();
for(let index=0;index<10;index++){const current=sandbox.RISE_UNIFIED_QUIZ_V2.current();mixedKeys.push(current.key);mixedSubjects.add(current.subject);await answer(false);await next();}
assert.equal(new Set(mixedKeys).size,10);assert.deepEqual([...mixedSubjects].sort(),['english','japanese','social']);assert.equal(elements.get('summaryScore').textContent,'0 / 10');

console.log(JSON.stringify({status:'PASS',version:sandbox.RISE_UNIFIED_QUIZ_V2.version,counts,checks:{nativeBridges:true,englishModes:true,wrongRecovery:true,wrongCycleBoundary:true,japaneseModes:true,japaneseMetadataDedupe:true,classicsNoRepeat:classicalKeys.length,socialModes:true,infiniteCycleRollover:englishCycleKeys.length,mixedExactCount:true,nativeStores:true}},null,2));
