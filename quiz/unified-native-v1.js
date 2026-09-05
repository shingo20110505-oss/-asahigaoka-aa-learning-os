(()=>{'use strict';
const VERSION='1.2.0';
const SUBJECTS=Object.freeze(['english','japanese','social']);
const core=window.RISE_VOCABULARY_CORE_V1;
const progressAdapters=window.RISE_VOCABULARY_PROGRESS_ADAPTERS_V1;
const jaQuality=window.RISE_JAPANESE_EXAM_QUALITY_V1;
if(!core||!progressAdapters||!jaQuality)throw new Error('Rise Vocabulary Core / Japanese quality policy is unavailable');

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const text=v=>v==null?'':String(v).trim();
const norm=v=>text(v).normalize('NFKC').toLowerCase();
const hasJapanese=v=>/[\u3040-\u30ff\u3400-\u9fff]/.test(text(v));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const uniqueBy=(rows,keyFn)=>{const out=[],seen=new Set();for(const row of rows){const key=keyFn(row);if(!key||seen.has(key))continue;seen.add(key);out.push(row)}return out};
const SUBJECT_LABEL={mixed:'3教科',english:'英語',japanese:'国語',social:'社会'};
const JA_STATE_KEY='kokugoChronologiaStateV2';
const JA_WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1';
const JA_CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1';
const JA_MEANING_SCRIPT='../kokugo-chronologia/meaning-ja-overrides.js?v=rise-unified-ja-20260905';
const JA_QUIZ_EXCLUSIONS=jaQuality.exclusions;

const ui={
 status:$('#connectionStatus'),start:$('#startSession'),focus:$('#focusToggle'),count:$('#sessionCount'),mode:$('#quizMode'),filterA:$('#filterA'),filterB:$('#filterB'),filterALabel:$('#filterALabel'),filterBLabel:$('#filterBLabel'),
 enCount:$('#enCount'),jaCount:$('#jaCount'),soCount:$('#soCount'),enSub:$('#enSub'),jaSub:$('#jaSub'),soSub:$('#soSub'),
 study:$('#studyCard'),setup:$('#setupCard'),subjectName:$('#subjectName'),modeName:$('#modeName'),index:$('#questionIndex'),score:$('#sessionScore'),bar:$('#sessionBar'),prompt:$('#prompt'),hint:$('#hint'),choices:$('#choices'),inputRow:$('#inputRow'),answerInput:$('#answerInput'),submit:$('#submitAnswer'),feedback:$('#feedback'),next:$('#nextQuestion'),speak:$('#speakQuestion'),summary:$('#summary'),summaryTitle:$('#summaryTitle'),summaryScore:$('#summaryScore'),restart:$('#restartSession')
};
const frames={english:$('#englishBridge'),social:$('#socialBridge')};
const data={english:[],japanese:[],social:[]};
const ready={english:false,japanese:false,social:false};
let englishApi=null,socialApi=null;
let subject='mixed',focusWeak=false,session=null,questionStarted=0;

function option(value,label){return `<option value="${value}">${label}</option>`}
function setOptions(el,items,value){el.innerHTML=items.map(x=>option(x[0],x[1])).join('');if(value&&items.some(x=>x[0]===value))el.value=value}
function currentReady(){return subject==='mixed'?SUBJECTS.every(s=>ready[s]):ready[subject]}
function updateStartState(){ui.start.disabled=!currentReady();ui.start.textContent=currentReady()?'クイズを始める':'データ接続中…'}
function setStatus(){
 const done=SUBJECTS.filter(s=>ready[s]).length;
 ui.status.textContent=done===3?'英語・国語・社会の既存学習履歴へ接続済み。答えは元の履歴へ直接記録されます。':`既存教材へ接続中… ${done} / 3 教科`;
 updateStartState();
}
function progressForEnglish(item){return progressAdapters.readEnglish(item.record,item.raw,{wrongBank:englishApi?.wrongBank?.()||{},now:Date.now()})}
function progressForJapanese(item){return progressAdapters.readJapanese(item.record,loadJaState(),{wrongQueue:loadJaWrong()})}
function progressForSocial(item){return progressAdapters.readSocial(item.record,{progress:{[item.raw.id]:item.raw.progress||{}}},{now:Date.now()})}
function updateCounts(){
 if(ready.english){const weak=data.english.filter(x=>progressForEnglish(x).status==='weak').length;ui.enCount.textContent=data.english.length.toLocaleString();ui.enSub.textContent=`要復習 ${weak.toLocaleString()}`}
 if(ready.japanese){const wrong=loadJaWrong().length;ui.jaCount.textContent=data.japanese.length.toLocaleString();ui.jaSub.textContent=`誤答 ${wrong.toLocaleString()}`}
 if(ready.social){const weak=data.social.filter(x=>progressForSocial(x).status==='weak').length;ui.soCount.textContent=data.social.length.toLocaleString();ui.soSub.textContent=`弱点 ${weak.toLocaleString()}`}
}

function configureControls(){
 focusWeak=false;ui.focus.classList.remove('on');
 if(subject==='mixed'){
   setOptions(ui.mode,[['auto','3教科ミックス']]);
   ui.filterALabel.textContent='配分';setOptions(ui.filterA,[['balanced','均等に出題'],['english','英語を多め'],['japanese','国語を多め'],['social','社会を多め']]);
   ui.filterBLabel.textContent='出題範囲';setOptions(ui.filterB,[['all','全範囲'],['exam','入試重要を優先']]);
   ui.focus.textContent='苦手優先';
 }else if(subject==='english'){
   setOptions(ui.mode,[['random','ランダム形式'],['en-ja','英語 → 日本語'],['ja-en','日本語 → 英語'],['spell','日本語 → スペル']]);
   ui.filterALabel.textContent='語種';setOptions(ui.filterA,[['all','単語＋熟語'],['word','単語'],['phrase','熟語'],['form','活用形']]);
   ui.filterBLabel.textContent='状態';setOptions(ui.filterB,[['all','全状態'],['weak','要復習'],['new','未学習'],['mastered','定着']]);
   ui.focus.textContent='間違いだけ';
 }else if(subject==='japanese'){
   setOptions(ui.mode,[['random','ランダム形式'],['meaning','語句 → 意味'],['reading','語句 → 読み'],['word','意味 → 語句']]);
   ui.filterALabel.textContent='種類';setOptions(ui.filterA,[['all','全部'],['two','二字熟語'],['three','三字熟語'],['yoji','四字熟語'],['idiom','慣用句'],['four','四字語']]);
   ui.filterBLabel.textContent='ランク';setOptions(ui.filterB,[['all','全ランク'],['A','A 最優先'],['B','B 重要'],['C','C 発展']]);
   ui.focus.textContent='間違いだけ';
 }else{
   setOptions(ui.mode,[['mixed','出来事 ↔ 年号'],['eventToYear','出来事 → 年号'],['yearToEvent','年号 → 出来事']]);
   ui.filterALabel.textContent='重要度';setOptions(ui.filterA,[['SA','S・A'],['S','Sのみ'],['all','全ランク']]);
   ui.filterBLabel.textContent='時代';const periods=[...new Set(data.social.map(x=>x.raw.period).filter(Boolean))];setOptions(ui.filterB,[['all','全時代'],...periods.map(x=>[x,x])]);
   ui.focus.textContent='弱点のみ';
 }
 updateStartState();
}
function setSubject(next){subject=next;$$('[data-subject]').forEach(b=>b.classList.toggle('on',b.dataset.subject===next));configureControls()}

function injectEnglishBridge(){
 try{
   const d=frames.english.contentDocument;if(!d?.body||d.getElementById('rise-unified-english-bridge'))return;
   const s=d.createElement('script');s.id='rise-unified-english-bridge';
   s.textContent=`(()=>{const BANK='aa_vocab_quiz_wrong_v1';const loadBank=()=>{try{const v=JSON.parse(localStorage.getItem(BANK)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return{}}};const saveBank=b=>{try{localStorage.setItem(BANK,JSON.stringify(b))}catch(_){}};function go(n=0){try{if(!window.AA_API_READING_ONLY||typeof vocabPool!=='function'||typeof state==='undefined'||typeof recordAttempt!=='function'||typeof updateSRS!=='function'||typeof save!=='function')throw 0;const snap=v=>{const sid=v.srsId||'v:'+v.id,it=state.items?.[sid]||null,r=it?.lastReviewAt&&typeof retention==='function'?retention(it):0,unknown=state.profile?.unknownWords?.[String(v.word||'').toLowerCase()],fromReading=!!unknown&&(!it?.lastReviewAt||(+unknown.lastSeenAt||0)>=(+it.lastReviewAt||0));return{id:String(v.id),srsId:String(sid),word:String(v.word||''),meaning:String(v.meaning||''),pos:String(v.pos||''),level:String(v.level||''),example:String(v.example||''),family:Array.isArray(v.family)?v.family.slice(0,12):[],progress:it?{fromReading,seen:+it.seen||0,correct:+it.correct||0,lapses:+it.lapses||0,retention:+r||0,lastReviewAt:+it.lastReviewAt||0,dueAt:+it.dueAt||0,due:!!it.lastReviewAt&&(+it.dueAt||0)<=Date.now()}:{fromReading,seen:0,correct:0,lapses:0,retention:0,lastReviewAt:0,dueAt:0,due:false}}};window.AA_RISE_UNIFIED_ENGLISH_API={list:()=>vocabPool().map(snap),wrongBank:()=>({...loadBank()}),markWrong(id){const b=loadBank();b[String(id)]=Date.now();saveBank(b);return true},removeWrong(id){const b=loadBank();delete b[String(id)];saveBank(b);return true},record(id,ok,ms,fmt,ans){const v=vocabPool().find(x=>String(x.id)===String(id));if(!v)return null;const sid=v.srsId||'v:'+v.id,t=Math.max(250,+ms||0),q={id:'vocab:'+v.id+':'+fmt+':'+Date.now(),reviewKey:sid,subject:'english',type:'vocab',source:v,skills:[{id:'en.vocab.recall',role:'primary'}]};recordAttempt(q,String(ans||''),!!ok,t,{errorType:ok?null:'vocab_recall'});updateSRS(sid,!!ok,t,String(fmt||'unified'),.9);save();return snap(v)}}}catch(_){if(n<300)setTimeout(()=>go(n+1),100)}}go()})();`;
   d.body.appendChild(s);
 }catch(_){}
}
function refreshEnglish(){
 if(!englishApi?.list)return false;
 try{
   data.english=englishApi.list().filter(x=>x?.id&&x.word&&x.meaning).map(raw=>{
     const isPhrase=raw.srsId?.startsWith('phrase:')||raw.pos==='phrase'||raw.level==='phrase'||raw.word.includes(' ');
     const native={id:raw.id,en:raw.word,ja:raw.meaning,pos:raw.pos,level:raw.level,example:raw.example,srsId:raw.srsId};if(isPhrase)native.phrase=raw.word;
     return{raw,record:core.normalizeEnglish(native),kind:raw.pos==='form'||raw.level==='form'?'form':isPhrase?'phrase':'word'};
   });
   ready.english=data.english.length>0;updateCounts();setStatus();return ready.english;
 }catch(_){return false}
}
function connectEnglish(n=0){
 injectEnglishBridge();
 try{const api=frames.english.contentWindow?.AA_RISE_UNIFIED_ENGLISH_API;if(api?.list&&api?.record){englishApi=api;refreshEnglish();return}}
 catch(_){}
 if(n<300)setTimeout(()=>connectEnglish(n+1),100);
}

function loadJaState(){try{const v=JSON.parse(localStorage.getItem(JA_STATE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}}
function saveJaState(v){try{localStorage.setItem(JA_STATE_KEY,JSON.stringify(v))}catch(_){}}
function loadJaWrong(){try{const v=JSON.parse(localStorage.getItem(JA_WRONG_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function jaWrongKey(x){return [text(x?.id),text(x?.type),text(x?.word),text(x?.reading)].join('|')}
function jaStableKey(x){return [norm(x?.word),norm(x?.reading)].join('|')}
function saveJaWrong(list){const out=[],seen=new Set();for(const x of list||[]){if(!x?.id||!x?.word)continue;const k=text(x.id)||jaStableKey(x);if(seen.has(k))continue;seen.add(k);out.push(x)}try{localStorage.setItem(JA_WRONG_KEY,JSON.stringify(out))}catch(_){}return out}
function addJaWrong(item){const list=loadJaWrong(),id=text(item.raw.id),stable=jaStableKey(item.raw);if(!list.some(x=>text(x.id)===id||jaStableKey(x)===stable))list.push({id:item.raw.id,word:item.raw.word,reading:item.raw.reading||'',meaning:item.raw.meaning||'',type:item.raw.type||'',rank:item.raw.rank||'',createdAt:Date.now()});saveJaWrong(list)}
function removeJaWrong(item){const id=text(item.raw.id),stable=jaStableKey(item.raw);saveJaWrong(loadJaWrong().filter(x=>text(x.id)!==id&&jaStableKey(x)!==stable))}
function markJaReview(item){const state=loadJaState();state[item.raw.id]='review';saveJaState(state)}
function loadJaCycle(){try{const v=JSON.parse(localStorage.getItem(JA_CYCLE_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
function saveJaCycle(v){try{localStorage.setItem(JA_CYCLE_KEY,JSON.stringify(v))}catch(_){} }
function directJaMeaning(id){const v=(window.KOKUGO_DIRECT_MEANINGS||{})[String(id??'')];return text(v)}
function jaContentKey(x){return `${norm(x?.word||x?.term)}|${norm(x?.reading)}`}
function loadScriptOnce(src,id){
 return new Promise((resolve,reject)=>{
   if(id&&document.getElementById(id)){if(window.KOKUGO_DIRECT_MEANINGS)resolve();else setTimeout(()=>window.KOKUGO_DIRECT_MEANINGS?resolve():reject(new Error('日本語意味辞書を初期化できませんでした')),0);return}
   const s=document.createElement('script');if(id)s.id=id;s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('日本語意味辞書を読み込めませんでした'));document.head.appendChild(s);
 });
}
async function ensureJaMeanings(){
 const current=window.KOKUGO_DIRECT_MEANINGS;
 if(current&&typeof current==='object'&&Object.keys(current).length>=15000)return current;
 await loadScriptOnce(JA_MEANING_SCRIPT,'rise-kokugo-direct-meanings');
 const loaded=window.KOKUGO_DIRECT_MEANINGS,count=loaded&&typeof loaded==='object'?Object.keys(loaded).length:0;
 if(count<15000)throw new Error(`日本語意味辞書 ${count.toLocaleString()}件（15,000未満）`);
 return loaded;
}

async function loadJapanese(){
 try{
   await ensureJaMeanings();
   const res=await fetch('../kokugo-chronologia/data.jsonl?v=rise-unified-20260905-ja2',{cache:'no-cache'});if(!res.ok)throw new Error('HTTP '+res.status);
   const rows=(await res.text()).split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));if(rows.length!==15000)throw new Error('15,000語データ件数 '+rows.length);
   const seenFull=new Set();
   const full=rows.map((x,i)=>{
     const meaning=directJaMeaning(x.id??i),raw={id:'quiz-full-'+String(x.id??i),word:text(x.term),reading:text(x.reading),meaning,type:['yoji','idiom','four'].includes(x.type)?x.type:'four',...jaQuality.base({type:x.type}),source:'full15000'};
     if(!meaning||!hasJapanese(meaning))throw new Error('日本語意味が未確認: '+text(x.term||x.id||i));
     const key=jaContentKey(raw);if(!raw.word||seenFull.has(key))throw new Error('15,000語データに空欄または重複: '+key);seenFull.add(key);
     return raw;
   });
   const bank=uniqueBy([...(window.AA_JUKUGO_BANK||[]),...(window.AA_JUKUGO_ADVANCED||[])].map(x=>({id:x.id,word:text(x.word),reading:text(x.reading),meaning:text(x.meaning),type:x.kind==='二字熟語'?'two':'three',...jaQuality.verified({...x,type:x.kind==='二字熟語'?'two':'three'},'jukugo'),source:'jukugo'})),jaContentKey);
   const curated=uniqueBy((window.AA_IDIOM_BANK||[]).filter(x=>x&&['四字熟語','慣用句'].includes(x.kind)).map((x,i)=>({id:'quiz-curated-'+i,word:text(x.word),reading:text(x.reading),meaning:text(x.meaning),type:x.kind==='四字熟語'?'yoji':'idiom',...jaQuality.verified({...x,type:x.kind==='四字熟語'?'yoji':'idiom'},'curated'),source:'curated'})),jaContentKey);
   const merged=[...full],byKey=new Map(merged.map(x=>[jaContentKey(x),x]));let curatedOverrides=0,jukugoOverrides=0,added=0;
   for(const x of [...bank,...curated]){
     const key=jaContentKey(x);if(!key||!x.word)continue;const existing=byKey.get(key);
     if(existing){
       existing.type=x.type||existing.type;Object.assign(existing,jaQuality.verified(x,x.source||'curated'));if(x.meaning&&hasJapanese(x.meaning))existing.meaning=x.meaning;existing.qualitySource=x.source||existing.qualitySource;
       if(x.source==='curated')curatedOverrides++;else jukugoOverrides++;
       continue;
     }
     merged.push(x);byKey.set(key,x);added++;
   }
   const eligible=merged.filter(x=>!jaQuality.isExcluded(x)&&x.id&&x.word&&x.meaning&&hasJapanese(x.meaning));
   data.japanese=eligible.map(raw=>({raw,record:core.normalizeJapanese(raw)}));
   ready.japanese=full.length===15000&&data.japanese.length>=15000;
   if(!ready.japanese)throw new Error(`日本語確認済み候補 ${data.japanese.length.toLocaleString()}語（15,000未満）`);
   window.__AA_RISE_UNIFIED_JAPANESE_COUNT__=data.japanese.length;
   const qualitySummary=jaQuality.summarize(eligible);window.__AA_RISE_UNIFIED_JAPANESE_QUALITY__=Object.freeze({...qualitySummary,runtimeVersion:VERSION,base:full.length,curatedOverrides,jukugoOverrides,added,excludedTerms:[...JA_QUIZ_EXCLUSIONS]});
   updateCounts();setStatus();if(subject==='japanese')configureControls();
 }catch(err){ready.japanese=false;ui.jaCount.textContent='接続失敗';ui.jaSub.textContent=text(err?.message||err);setStatus()}
}

function injectSocialBridge(){
 try{
   const d=frames.social.contentDocument;if(!d?.body||d.getElementById('rise-unified-social-bridge'))return;
   const s=d.createElement('script');s.id='rise-unified-social-bridge';
   s.textContent=`(()=>{function go(n=0){try{if(typeof DATA==='undefined'||typeof state==='undefined'||typeof byId==='undefined'||typeof recordAnswer!=='function')throw 0;if(DATA.length<1000)throw 0;const snap=x=>({id:String(x.id),sort:+x.sort||0,date:String(x.date||''),event:String(x.event||''),area:String(x.area||''),period:String(x.period||''),level:String(x.level||''),detail:String(x.detail||''),tags:Array.isArray(x.tags)?x.tags.slice():[],progress:{...(state.progress?.[x.id]||{})}});window.AA_RISE_UNIFIED_SOCIAL_API={list:()=>DATA.map(snap),record(id,ok){const n=Number(id),item=byId.get(n)||byId.get(id)||DATA.find(x=>String(x.id)===String(id));if(!item)return null;recordAnswer(item.id,!!ok);return snap(item)}}}catch(_){if(n<400)setTimeout(()=>go(n+1),100)}}go()})();`;
   d.body.appendChild(s);
 }catch(_){}
}
function refreshSocial(){
 if(!socialApi?.list)return false;
 try{
   data.social=socialApi.list().filter(x=>x?.id&&x.event&&x.date).map(raw=>({raw,record:core.normalizeSocial(raw)}));
   ready.social=data.social.length>=1000;updateCounts();setStatus();if(subject==='social')configureControls();return ready.social;
 }catch(_){return false}
}
function connectSocial(n=0){
 injectSocialBridge();
 try{const api=frames.social.contentWindow?.AA_RISE_UNIFIED_SOCIAL_API;if(api?.list&&api?.record){socialApi=api;refreshSocial();return}}
 catch(_){}
 if(n<400)setTimeout(()=>connectSocial(n+1),100);
}

function weightedWithoutReplacement(rows,count,weightFn){
 const pool=rows.slice(),out=[];
 while(pool.length&&out.length<count){let total=0;const weights=pool.map(x=>{const w=Math.max(.05,Number(weightFn(x))||1);total+=w;return w});let r=Math.random()*total,index=0;for(;index<weights.length-1;index++){r-=weights[index];if(r<=0)break}out.push(pool.splice(index,1)[0])}
 return out;
}
function pickValues(pool,item,field,count=3,predicate=()=>true){const vals=[],seen=new Set([text(item.raw[field])]);for(const x of shuffle(pool)){if(x===item||!predicate(x))continue;const v=text(x.raw[field]);if(!v||seen.has(v))continue;seen.add(v);vals.push(v);if(vals.length===count)break}return vals}
function englishQuestion(item,mode,pool,wrongOnly){
 const actual=mode==='random'?shuffle(['en-ja','ja-en','spell'])[0]:mode;
 let prompt,answer,field,input=false;
 if(actual==='en-ja'){prompt=item.raw.word;answer=item.raw.meaning;field='meaning'}else if(actual==='ja-en'){prompt=item.raw.meaning;answer=item.raw.word;field='word'}else{prompt=item.raw.meaning;answer=item.raw.word;input=true}
 if(!prompt||!answer)return null;
 let choices=null;if(!input){const same=pool.filter(x=>x.kind===item.kind);let vals=pickValues(same,item,field);if(vals.length<3)vals=pickValues(pool,item,field);if(vals.length<3)return null;choices=shuffle([answer,...vals])}
 return{subject:'english',actual,prompt,hint:actual==='en-ja'?'意味を選んでください':actual==='ja-en'?'英単語・熟語を選んでください':'英語で入力してください',answer,choices,input,inputMode:'english',speak:item.raw.word,item,explanation:[`${item.raw.word} = ${item.raw.meaning}`,item.raw.example].filter(Boolean).join('｜'),check:v=>actual==='spell'?norm(v)===norm(answer):text(v)===answer,async commit(ok,value,ms){englishApi.record(item.raw.id,ok,ms,'unified-'+actual,value);if(wrongOnly){if(ok)englishApi.removeWrong(item.raw.id);else englishApi.markWrong(item.raw.id)}else if(!ok)englishApi.markWrong(item.raw.id);refreshEnglish()}};
}
function buildEnglishQuestions(count,mode,kind,progressFilter,wrongOnly=false,weakPriority=false){
 let pool=data.english.filter(x=>kind==='all'||x.kind===kind);
 if(wrongOnly)pool=pool.filter(x=>progressForEnglish(x).currentWrong);
 else if(progressFilter&&progressFilter!=='all')pool=pool.filter(x=>progressForEnglish(x).status===progressFilter);
 if(!pool.length&&!wrongOnly)pool=data.english.slice();
 const selected=weightedWithoutReplacement(pool,Math.min(count,pool.length),x=>{const p=progressForEnglish(x);if(weakPriority&&(p.status==='weak'||p.currentWrong||p.fromReading))return 8;if(p.status==='weak'||p.fromReading)return 5;if(p.status==='new')return 2;return 1});
 return selected.map(x=>englishQuestion(x,mode,pool,wrongOnly)).filter(Boolean).slice(0,count);
}

function jaMatches(x,kind,rank){const rankOk=rank==='all'||(rank==='AB'?['A','B'].includes(x.raw.rank):x.raw.rank===rank);return(kind==='all'||x.raw.type===kind)&&rankOk}
function jaValid(field,v){return!!text(v)&&(field!=='meaning'||hasJapanese(v))}
function japaneseDistractors(pool,item,field,count=3){
 const vals=[],seen=new Set([text(item.raw[field])]);
 const take=predicate=>{for(const x of shuffle(pool)){if(vals.length>=count)break;if(x===item||!predicate(x)||!jaValid(field,x.raw[field]))continue;const v=text(x.raw[field]);if(!v||seen.has(v))continue;seen.add(v);vals.push(v)}};
 take(x=>x.raw.type===item.raw.type&&x.raw.rank===item.raw.rank);
 take(x=>x.raw.type===item.raw.type);
 take(x=>x.raw.rank===item.raw.rank);
 take(()=>true);
 return vals;
}
function japaneseQuestion(item,mode,pool,wrongOnly){
 const modes=mode==='random'?shuffle(['meaning','reading','word']):[mode];
 for(const actual of modes){const field=actual==='meaning'?'meaning':actual==='reading'?'reading':'word',prompt=actual==='word'?item.raw.meaning:item.raw.word,answer=text(item.raw[field]);if(!jaValid(field,answer)||!prompt||(actual==='word'&&!hasJapanese(prompt)))continue;const vals=japaneseDistractors(pool,item,field,3);if(vals.length<3)continue;return{subject:'japanese',actual,prompt,hint:actual==='meaning'?'意味を選んでください':actual==='reading'?'読みを選んでください':'この意味に合う語句を選んでください',answer,choices:shuffle([answer,...vals]),input:false,item,explanation:`${item.raw.word}${item.raw.reading?'（'+item.raw.reading+'）':''}｜${item.raw.meaning}`,check:v=>text(v)===answer,commit(ok){if(wrongOnly&&ok)removeJaWrong(item);else if(!ok){addJaWrong(item);markJaReview(item)}updateCounts()}}}
 return null;
}
function makeJaNoRepeat(pool,kind,rank,mode,limit){
 const state=loadJaCycle(),key=`${kind}|${rank}`,valid=new Set(pool.map(x=>x.raw.id));let rem=Array.isArray(state[key]?.remaining)?state[key].remaining.filter((id,i,a)=>valid.has(id)&&a.indexOf(id)===i):[];const known=new Set(Array.isArray(state[key]?.known)?state[key].known:[]),newIds=pool.filter(x=>!known.has(x.raw.id)).map(x=>x.raw.id);
 if(!state[key]||!state[key].initialized){rem=shuffle(pool.map(x=>x.raw.id));state[key]={remaining:rem,known:pool.map(x=>x.raw.id),initialized:true,cycle:1}}else{if(newIds.length){const have=new Set(rem);rem=[...shuffle(newIds).filter(id=>!have.has(id)),...rem]}if(!rem.length){rem=shuffle(pool.map(x=>x.raw.id));state[key].cycle=(Number(state[key].cycle)||0)+1}state[key].remaining=rem;state[key].known=pool.map(x=>x.raw.id)}
 const byId=new Map(pool.map(x=>[x.raw.id,x])),out=[],used=[];for(const id of rem){const item=byId.get(id);if(!item)continue;const q=japaneseQuestion(item,mode,pool,false);if(!q)continue;out.push(q);used.push(id);if(out.length===limit)break}const usedSet=new Set(used);state[key].remaining=rem.filter(id=>!usedSet.has(id));saveJaCycle(state);return out;
}
function buildJapaneseQuestions(count,mode,kind,rank,wrongOnly=false,weakPriority=false){
 let pool=data.japanese.filter(x=>jaMatches(x,kind,rank));if(pool.length<4)return[];
 if(wrongOnly){const wrong=pool.filter(x=>progressForJapanese(x).currentWrong);return shuffle(wrong).map(x=>japaneseQuestion(x,mode,pool,true)).filter(Boolean).slice(0,count)}
 if(weakPriority){const weak=pool.filter(x=>progressForJapanese(x).status==='weak');if(weak.length>=4)return shuffle(weak).map(x=>japaneseQuestion(x,mode,pool,false)).filter(Boolean).slice(0,count)}
 return makeJaNoRepeat(pool,kind,rank,mode,count);
}

function socialPool(level,period,weakOnly=false){return data.social.filter(x=>{const r=x.raw;if(period!=='all'&&r.period!==period)return false;if(level==='SA'&&!['S','A'].includes(r.level))return false;if(level==='S'&&r.level!=='S')return false;if(weakOnly&&progressForSocial(x).status!=='weak')return false;return true})}
function normalizeYearInput(v){return text(v).normalize('NFKC').toLowerCase().replace(/[\s,，]/g,'').replace(/年$/g,'').replace(/^bc/g,'紀元前')}
function acceptedYear(item,input){const a=normalizeYearInput(input);if(item.raw.sort<0){const n=String(Math.abs(item.raw.sort));return['紀元前'+n,'-'+n,n+'bc'].includes(a)}return a===String(item.raw.sort)}
function socialQuestion(item,mode,pool){
 let actual=mode;if(actual==='mixed')actual=/^(紀元前)?\d+年$/.test(item.raw.date)&&Math.random()<.52?'eventToYear':'yearToEvent';if(actual==='eventToYear'&&!/^(紀元前)?\d+年$/.test(item.raw.date))actual='yearToEvent';
 if(actual==='eventToYear')return{subject:'social',actual,prompt:item.raw.event,hint:'年号を入力してください（例：645 / 645年 / 紀元前221）',answer:item.raw.date,choices:null,input:true,inputMode:'year',item,explanation:item.raw.detail||`${item.raw.event}｜${item.raw.date}`,check:v=>acceptedYear(item,v),commit(ok){socialApi.record(item.raw.id,ok);refreshSocial()}};
 const same=pool.filter(x=>x!==item&&x.raw.period===item.raw.period&&x.raw.sort!==item.raw.sort),vals=pickValues(same,item,'event');if(vals.length<3)return null;return{subject:'social',actual,prompt:item.raw.date,hint:'この年の出来事を選んでください',answer:item.raw.event,choices:shuffle([item.raw.event,...vals]),input:false,item,explanation:item.raw.detail||`${item.raw.date}｜${item.raw.event}`,check:v=>text(v)===item.raw.event,commit(ok){socialApi.record(item.raw.id,ok);refreshSocial()}};
}
function buildSocialQuestions(count,mode,level,period,weakOnly=false){let pool=socialPool(level,period,weakOnly);if(pool.length<4&&!weakOnly)pool=socialPool('all','all',false);return shuffle(pool).map(x=>socialQuestion(x,mode,pool)).filter(Boolean).slice(0,count)}

function mixedQuotas(count,bias){const q={english:Math.floor(count/3),japanese:Math.floor(count/3),social:Math.floor(count/3)},order=bias&&q[bias]!=null?[bias,'english','japanese','social'].filter((x,i,a)=>a.indexOf(x)===i):['english','japanese','social'];let rest=count-q.english-q.japanese-q.social,i=0;while(rest-->0){q[order[i++%order.length]]++}if(bias&&q[bias]!=null&&count>=10){const donor=order.find(x=>x!==bias&&q[x]>2);if(donor){q[bias]++;q[donor]--}}return q}
function buildMixedQuestions(count,bias,exam){const q=mixedQuotas(count,bias==='balanced'?null:bias),weak=focusWeak;const en=buildEnglishQuestions(q.english,'random','all',exam==='exam'?'weak':'all',false,weak||exam==='exam');const ja=buildJapaneseQuestions(q.japanese,'random','all',exam==='exam'?'AB':'all',false,weak||exam==='exam');const so=buildSocialQuestions(q.social,'mixed',exam==='exam'?'SA':'all','all',weak);return shuffle([...en,...ja,...so]).slice(0,count)}

function buildSession(){
 const count=Number(ui.count.value)||10,mode=ui.mode.value,a=ui.filterA.value,b=ui.filterB.value;
 if(subject==='mixed')return buildMixedQuestions(count,a,b);
 if(subject==='english')return buildEnglishQuestions(count,mode,a,b,focusWeak,false);
 if(subject==='japanese')return buildJapaneseQuestions(count,mode,a,b,focusWeak,false);
 return buildSocialQuestions(count,mode,a,b,focusWeak);
}
function subjectModeLabel(q){if(q.subject==='english')return({'en-ja':'英→日','ja-en':'日→英',spell:'スペル'})[q.actual]||q.actual;if(q.subject==='japanese')return({meaning:'意味',reading:'読み',word:'語句'})[q.actual]||q.actual;return q.actual==='eventToYear'?'出来事→年号':'年号→出来事'}
function speak(word){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.88;speechSynthesis.speak(u)}catch(_){}}
function showQuestion(){
 if(!session)return;if(session.index>=session.questions.length){finishSession();return}
 const q=session.questions[session.index];session.locked=false;questionStarted=performance.now();ui.feedback.className='feedback hidden';ui.feedback.innerHTML='';ui.next.classList.add('hidden');ui.choices.innerHTML='';ui.answerInput.value='';ui.answerInput.disabled=false;ui.submit.disabled=false;ui.inputRow.classList.toggle('hidden',!q.input);ui.choices.classList.toggle('hidden',!!q.input);ui.speak.classList.toggle('hidden',!q.speak);ui.speak.onclick=()=>q.speak&&speak(q.speak);
 ui.subjectName.textContent=SUBJECT_LABEL[q.subject];ui.modeName.textContent=subjectModeLabel(q);ui.index.textContent=`${session.index+1} / ${session.questions.length}`;ui.score.textContent=`正解 ${session.score}`;ui.bar.style.width=`${session.index/session.questions.length*100}%`;ui.prompt.textContent=q.prompt;ui.hint.textContent=q.hint;
 if(q.choices){for(const value of q.choices){const btn=document.createElement('button');btn.type='button';btn.className='choice';btn.textContent=value;btn.onclick=()=>answerQuestion(value,btn);ui.choices.appendChild(btn)}}
 if(q.input){ui.answerInput.placeholder=q.inputMode==='year'?'年号を入力':'英語を入力';ui.answerInput.setAttribute('inputmode',q.inputMode==='year'?'text':'text');setTimeout(()=>ui.answerInput.focus({preventScroll:true}),50)}
}
async function answerQuestion(value,button){
 if(!session||session.locked)return;const q=session.questions[session.index],answer=text(value);if(q.input&&!answer)return;session.locked=true;const ok=q.check(answer),ms=Math.max(250,Math.round(performance.now()-questionStarted));if(ok)session.score++;
 if(q.choices){$$('#choices .choice').forEach(b=>{if(text(b.textContent)===q.answer)b.classList.add('ok');b.disabled=true});if(button&&!ok)button.classList.add('bad')}
 ui.answerInput.disabled=!!q.input;ui.submit.disabled=!!q.input;
 try{await q.commit(ok,answer,ms)}catch(err){console.error('Unified quiz native commit failed',err)}
 ui.feedback.className=`feedback ${ok?'ok':'bad'}`;ui.feedback.innerHTML=`<strong>${ok?'正解':'要復習'}</strong><div class="answerLine">正解：${q.answer}</div><p>${q.explanation||''}</p>`;ui.next.classList.remove('hidden');ui.score.textContent=`正解 ${session.score}`;ui.bar.style.width=`${(session.index+1)/session.questions.length*100}%`;updateCounts();
}
function nextQuestion(){if(!session)return;session.index++;ui.answerInput.disabled=false;ui.submit.disabled=false;showQuestion()}
function finishSession(){ui.study.classList.add('hidden');ui.summary.classList.remove('hidden');ui.summaryTitle.textContent='セッション完了';ui.summaryScore.textContent=`${session.score} / ${session.questions.length}`;updateCounts()}
function startSession(){
 if(!currentReady())return;const questions=buildSession();if(!questions.length){ui.status.textContent='この条件では出題できる問題がありません。条件を変更してください。';return}
 session={questions,index:0,score:0,locked:false};ui.setup.classList.add('compact');ui.summary.classList.add('hidden');ui.study.classList.remove('hidden');showQuestion();ui.study.scrollIntoView({behavior:'smooth',block:'start'});
}

$$('[data-subject]').forEach(b=>b.onclick=()=>setSubject(b.dataset.subject));
ui.focus.onclick=()=>{focusWeak=!focusWeak;ui.focus.classList.toggle('on',focusWeak)};
ui.start.onclick=startSession;ui.next.onclick=nextQuestion;ui.submit.onclick=()=>answerQuestion(ui.answerInput.value,null);ui.answerInput.onkeydown=e=>{if(e.key==='Enter'&&!ui.submit.disabled)answerQuestion(ui.answerInput.value,null)};ui.restart.onclick=()=>{ui.summary.classList.add('hidden');startSession()};
frames.english.addEventListener('load',()=>connectEnglish());frames.social.addEventListener('load',()=>connectSocial());
window.addEventListener('storage',()=>{if(ready.english)refreshEnglish();if(ready.japanese)updateCounts();if(ready.social)refreshSocial()});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(()=>{});

document.documentElement.dataset.unifiedVocabularyQuiz=VERSION;
setSubject('mixed');setStatus();loadJapanese();connectEnglish();connectSocial();
})();
