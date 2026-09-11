(()=>{'use strict';

const VERSION='2.0.0';
const SUBJECTS=Object.freeze(['english','japanese','social']);
const SUBJECT_LABEL=Object.freeze({mixed:'3教科',english:'英語',japanese:'国語',social:'社会'});
const core=window.RISE_VOCABULARY_CORE_V1;
const progressAdapters=window.RISE_VOCABULARY_PROGRESS_ADAPTERS_V1;
const jaQuality=window.RISE_JAPANESE_EXAM_QUALITY_V1;
const classics=window.RISE_JAPANESE_CLASSICS_BANK_V1;

const JA_STATE_KEY='kokugoChronologiaStateV2';
const JA_WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1';
const JA_CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1';
const CLASSIC_PROGRESS_KEY='rise_kokugo_classics_progress_v1';
const CLASSIC_CYCLE_KEY='rise_kokugo_classics_cycle_v1';
const AUX_CYCLE_KEY='rise_unified_quiz_cycle_v2';
const JA_MEANING_SCRIPT='../kokugo-chronologia/meaning-ja-overrides.js?v=rise-unified-ja-20260911';
const EXACT_YEAR=/^(紀元前)?\d+年$/;

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const text=value=>value==null?'':String(value).trim();
const norm=value=>text(value).normalize('NFKC').toLowerCase();
const normEnglish=value=>norm(value).replace(/[’‘]/g,"'").replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ');
const hasJapanese=value=>/[\u3040-\u30ff\u3400-\u9fff]/.test(text(value));
const shuffle=values=>{
 const out=values.slice();
 for(let i=out.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [out[i],out[j]]=[out[j],out[i]];
 }
 return out;
};
const uniqueBy=(rows,keyOf)=>{
 const out=[],seen=new Set();
 for(const row of rows){
  const key=text(keyOf(row));
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(row);
 }
 return out;
};

const ui={
 status:$('#connectionStatus'),start:$('#startSession'),focus:$('#focusToggle'),count:$('#sessionCount'),mode:$('#quizMode'),
 filterA:$('#filterA'),filterB:$('#filterB'),filterALabel:$('#filterALabel'),filterBLabel:$('#filterBLabel'),wrongSummary:$('#wrongReviewSummary'),
 enCount:$('#enCount'),jaCount:$('#jaCount'),soCount:$('#soCount'),enSub:$('#enSub'),jaSub:$('#jaSub'),soSub:$('#soSub'),
 study:$('#studyCard'),setup:$('#setupCard'),subjectName:$('#subjectName'),modeName:$('#modeName'),index:$('#questionIndex'),score:$('#sessionScore'),bar:$('#sessionBar'),
 prompt:$('#prompt'),hint:$('#hint'),choices:$('#choices'),inputRow:$('#inputRow'),answerInput:$('#answerInput'),submit:$('#submitAnswer'),feedback:$('#feedback'),
 next:$('#nextQuestion'),end:$('#endSession'),speak:$('#speakQuestion'),summary:$('#summary'),summaryTitle:$('#summaryTitle'),summaryScore:$('#summaryScore'),summaryMessage:$('#summaryMessage'),restart:$('#restartSession')
};
const frames={english:$('#englishBridge'),social:$('#socialBridge')};
const data={english:[],japanese:[],social:[]};
const connection={english:'loading',japanese:'loading',social:'loading'};
const drafts={
 mixed:{mode:'auto',filterA:'balanced',filterB:'all'},
 english:{mode:'random',filterA:'all',filterB:'all'},
 japanese:{mode:'random',filterA:'all',filterB:'all'},
 social:{mode:'mixed',filterA:'SA',filterB:'all'}
};

let englishApi=null;
let socialApi=null;
let active='mixed';
let wrongOnly=false;
let session=null;
let lastConfig=null;
let questionStarted=0;
let startNonce=0;
let starting=false;

function fatal(message){
 if(ui.status)ui.status.textContent=message;
 if(ui.start){ui.start.disabled=true;ui.start.textContent='初期化できません';}
 console.error(message);
}

if(!core||!progressAdapters||!jaQuality||!classics){
 fatal('統合クイズの必須データを読み込めませんでした。再読み込みしてください。');
 return;
}

function jsonGet(key,fallback){
 try{
  const value=JSON.parse(localStorage.getItem(key)||'null');
  return value??fallback;
 }catch(_){return fallback;}
}

function jsonSet(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}
}

function setOptions(select,items,preferred){
 select.replaceChildren();
 for(const [value,label] of items){
  const option=document.createElement('option');
  option.value=value;option.textContent=label;select.appendChild(option);
 }
 if(preferred&&items.some(([value])=>value===preferred))select.value=preferred;
}

function captureDraft(){
 if(!drafts[active])return;
 drafts[active]={mode:ui.mode.value,filterA:ui.filterA.value,filterB:ui.filterB.value};
}

function japaneseRangeOptions(kind){
 if(kind==='classical')return[['all','全レベル'],['S','S 最優先'],['A','A 頻出'],['B','B 重要'],['C','C 発展']];
 if(kind==='kanbun')return[['all','全レベル'],['A','A 頻出'],['B','B 発展']];
 return[['all','全ランク'],['exam','入試重要（A・B）'],['A','A 最優先'],['B','B 重要'],['C','C 発展']];
}

function configureJapaneseRange(preferred){
 const kind=ui.filterA.value;
 ui.filterBLabel.textContent=kind==='classical'||kind==='kanbun'?'レベル':'ランク';
 setOptions(ui.filterB,japaneseRangeOptions(kind),preferred);
}

function configureControls(){
 const saved=drafts[active]||{};
 if(active==='mixed'){
  setOptions(ui.mode,[['auto','3教科ミックス']],saved.mode);
  ui.filterALabel.textContent='配分';
  setOptions(ui.filterA,[['balanced','均等に出題'],['english','英語を多め'],['japanese','国語を多め'],['social','社会を多め']],saved.filterA);
  ui.filterBLabel.textContent='出題範囲';
  setOptions(ui.filterB,[['all','全範囲'],['exam','入試重要を優先']],saved.filterB);
 }else if(active==='english'){
  setOptions(ui.mode,[['random','ランダム形式'],['en-ja','英語 → 日本語'],['ja-en','日本語 → 英語'],['spell','日本語 → スペル']],saved.mode);
  ui.filterALabel.textContent='語種';
  setOptions(ui.filterA,[['all','単語＋熟語'],['word','単語のみ'],['phrase','熟語のみ'],['form','活用形のみ']],saved.filterA);
  ui.filterBLabel.textContent='状態';
  setOptions(ui.filterB,[['all','全状態'],['weak','要復習'],['new','未学習'],['mastered','定着']],saved.filterB);
 }else if(active==='japanese'){
  setOptions(ui.mode,[['random','ランダム形式'],['meaning','語句 → 意味'],['reading','語句 → 読み'],['word','意味 → 語句']],saved.mode);
  ui.filterALabel.textContent='種類';
  setOptions(ui.filterA,[['all','語彙＋古文＋漢文'],['vocab','現代語彙のみ'],['two','二字熟語'],['three','三字熟語'],['yoji','四字熟語'],['idiom','慣用句'],['four','四字語'],['classical','古文'],['kanbun','漢文']],saved.filterA);
  configureJapaneseRange(saved.filterB);
 }else{
  setOptions(ui.mode,[['mixed','出来事 ↔ 年号'],['eventToYear','出来事 → 年号'],['yearToEvent','年号 → 出来事']],saved.mode);
  ui.filterALabel.textContent='重要度';
  setOptions(ui.filterA,[['SA','S・A'],['S','Sのみ'],['all','全ランク']],saved.filterA);
  ui.filterBLabel.textContent='時代';
  const periods=[...new Set(data.social.map(item=>item.raw.period).filter(Boolean))];
  setOptions(ui.filterB,[['all','全時代'],...periods.map(period=>[period,period])],saved.filterB);
 }
 ui.filterB.disabled=wrongOnly&&active==='english';
 updateFocusUi();
 updateStartState();
}

function setSubject(next){
 if(!SUBJECTS.includes(next)&&next!=='mixed')return;
 captureDraft();active=next;
 for(const button of $$('[data-subject]')){
  const selected=button.dataset.subject===next;
  button.classList.toggle('on',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
 configureControls();
}

function updateFocusUi(){
 ui.focus.classList.toggle('on',wrongOnly);
 ui.focus.setAttribute('aria-pressed',String(wrongOnly));
 ui.focus.textContent=active==='mixed'?'全教科の間違いだけ':'間違いだけ';
 ui.filterB.disabled=wrongOnly&&active==='english';
}

function currentReady(){
 return active==='mixed'?SUBJECTS.every(name=>connection[name]==='ready'):connection[active]==='ready';
}

function connectionStatus(){
 const ready=SUBJECTS.filter(name=>connection[name]==='ready').length;
 const failed=SUBJECTS.filter(name=>connection[name]==='error');
 if(ready===SUBJECTS.length)return '英語・国語・社会の既存学習履歴へ接続済み。答えは元の履歴へ直接記録されます。';
 if(failed.length)return `${failed.map(name=>SUBJECT_LABEL[name]).join('・')}の接続に失敗しました。ページを再読み込みしてください。`;
 return `既存教材へ接続中… ${ready} / ${SUBJECTS.length} 教科`;
}

function updateStartState(){
 const ready=currentReady();
 ui.start.disabled=starting||!ready;
 if(starting)ui.start.textContent='問題を準備中…';
 else if(!ready)ui.start.textContent='データ接続中…';
 else ui.start.textContent=wrongOnly?'間違い復習を始める':'クイズを始める';
 ui.status.textContent=connectionStatus();
}

function loadJaState(){
 const value=jsonGet(JA_STATE_KEY,{});
 return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
}

function saveJaState(value){jsonSet(JA_STATE_KEY,value);}

function loadJaWrong(){
 const value=jsonGet(JA_WRONG_KEY,[]);
 return Array.isArray(value)?value:[];
}

function jaStableKey(item){return `${norm(item?.word||item?.term)}|${norm(item?.reading)}`;}
function jaWrongIdentity(item){return text(item?.id)||`${text(item?.type)}|${jaStableKey(item)}`;}
function jaWrongDomain(item){const type=text(item?.type);return type==='koten'||type==='kanbun'?type:'vocab';}
function sameJaWrong(left,right){
 const leftId=text(left?.id),rightId=text(right?.id);
 if(leftId&&rightId&&leftId===rightId)return true;
 const stableLeft=jaStableKey(left),stableRight=jaStableKey(right);
 return stableLeft!=='|'&&stableLeft===stableRight&&(!left?.type||!right?.type||jaWrongDomain(left)===jaWrongDomain(right));
}

function saveJaWrong(rows){
 const out=[];
 for(const row of rows||[]){
  if(!row||!text(row.id)||!text(row.word))continue;
  if(out.some(existing=>sameJaWrong(existing,row)))continue;
  out.push(row);
 }
 jsonSet(JA_WRONG_KEY,out);
 return out;
}

function updateJapaneseWrong(item,correct,canRecover){
 const rows=loadJaWrong(),index=rows.findIndex(row=>sameJaWrong(row,item)),now=Date.now();
 if(correct&&canRecover){
  for(let rowIndex=rows.length-1;rowIndex>=0;rowIndex--)if(sameJaWrong(rows[rowIndex],item))rows.splice(rowIndex,1);
 }else if(!correct){
  const entry={id:item.id,word:item.word,reading:item.reading||'',meaning:item.meaning||'',type:item.type||'',rank:item.rank||item.displayBand||'',createdAt:index>=0?(rows[index].createdAt||now):now,lastWrongAt:now,retryCount:(index>=0?(Number(rows[index].retryCount)||0):0)+1};
  if(index>=0)rows[index]={...rows[index],...entry};else rows.push(entry);
  const state=loadJaState();state[item.id]='review';saveJaState(state);
 }
 saveJaWrong(rows);
}

function classicProgress(){
 const value=jsonGet(CLASSIC_PROGRESS_KEY,{});
 return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
}

function isClassicWrong(progress){
 return progress?.currentWrong===true||(progress?.currentWrong==null&&(Number(progress?.wrong)||0)>0&&(Number(progress?.wrong)||0)>=(Number(progress?.correct)||0));
}

function recordClassic(item,correct){
 const state=classicProgress(),now=Date.now(),progress=state[item.id]||{seen:0,correct:0,wrong:0};
 progress.seen=(Number(progress.seen)||0)+1;
 progress.last=now;
 if(correct){
  progress.correct=(Number(progress.correct)||0)+1;
  progress.currentWrong=false;
  progress.lastCorrectAt=now;
  if((Number(progress.wrong)||0)>0)progress.recovered=(Number(progress.recovered)||0)+1;
 }else{
  progress.wrong=(Number(progress.wrong)||0)+1;
  progress.currentWrong=true;
  progress.lastWrongAt=now;
 }
 state[item.id]=progress;jsonSet(CLASSIC_PROGRESS_KEY,state);
 updateJapaneseWrong(item,correct,true);
}

function progressForEnglish(item){
 return progressAdapters.readEnglish(item.record,item.raw,{wrongBank:englishApi?.wrongBank?.()||{},now:Date.now()});
}

function progressForJapanese(item){
 return progressAdapters.readJapanese(item.record,loadJaState(),{wrongQueue:loadJaWrong()});
}

function progressForSocial(item){
 return progressAdapters.readSocial(item.record,{progress:{[item.raw.id]:item.raw.progress||{}}},{now:Date.now()});
}

function socialCurrentWrong(item){
 const progress=item?.raw?.progress||item?.progress||{};
 return (Number(progress.wrong)||0)>0&&Number(progress.stage||0)===0;
}

function currentWrongCounts(){
 const englishBank=englishApi?.wrongBank?englishApi.wrongBank()||{}:{};
 const english=data.english.length?data.english.filter(item=>Object.prototype.hasOwnProperty.call(englishBank,String(item.raw.id))).length:Object.keys(englishBank).length;
 let regularRows=loadJaWrong().filter(item=>!['koten','kanbun'].includes(text(item?.type)));
 if(data.japanese.length){
  const ids=new Set(data.japanese.map(item=>text(item.raw.id))),stable=new Set(data.japanese.map(item=>jaStableKey(item.raw)));
  regularRows=regularRows.filter(item=>ids.has(text(item.id))||stable.has(jaStableKey(item)));
 }
 const regularKeys=new Set(regularRows.map(item=>jaStableKey(item)!=='|'?jaStableKey(item):jaWrongIdentity(item)));
 const progress=classicProgress();
 const classical=classics.classical.filter(item=>isClassicWrong(progress[item.id])).length;
 const kanbun=classics.kanbun.filter(item=>isClassicWrong(progress[item.id])).length;
 const social=data.social.filter(socialCurrentWrong).length;
 return{english,japanese:regularKeys.size,classical,kanbun,social,total:english+regularKeys.size+classical+kanbun+social};
}

function updateWrongSummary(){
 if(!ui.wrongSummary)return;
 const counts=currentWrongCounts();
 const strong=document.createElement('strong');
 strong.textContent=`間違い専用 ${counts.total.toLocaleString()}件`;
 const detail=document.createTextNode(`　英語 ${counts.english.toLocaleString()}・国語語彙 ${counts.japanese.toLocaleString()}・古文 ${counts.classical.toLocaleString()}・漢文 ${counts.kanbun.toLocaleString()}・社会 ${counts.social.toLocaleString()}`);
 const line=document.createElement('br');
 const note=document.createElement('span');
 note.textContent='選んだ教科・種類・出題形式を守り、同じ問題を1周内で重複させずに復習します。';
 ui.wrongSummary.replaceChildren(strong,detail,line,note);
}

function updateCounts(){
 if(connection.english==='ready'){
  const weak=data.english.filter(item=>progressForEnglish(item).status==='weak').length;
  ui.enCount.textContent=data.english.length.toLocaleString();ui.enSub.textContent=`要復習 ${weak.toLocaleString()}`;
 }
 if(connection.japanese==='ready'){
  const counts=currentWrongCounts();
  ui.jaCount.textContent=(data.japanese.length+classics.total).toLocaleString();
  ui.jaSub.textContent=`語彙 ${data.japanese.length.toLocaleString()}＋古文・漢文 ${classics.total.toLocaleString()}｜誤答 ${(counts.japanese+counts.classical+counts.kanbun).toLocaleString()}`;
 }
 if(connection.social==='ready'){
  const weak=data.social.filter(item=>progressForSocial(item).status==='weak').length;
  ui.soCount.textContent=data.social.length.toLocaleString();ui.soSub.textContent=`弱点 ${weak.toLocaleString()}`;
 }
 updateWrongSummary();
}

function injectEnglishBridge(){
 try{
  const doc=frames.english?.contentDocument;
  if(!doc?.body||doc.getElementById('rise-unified-english-bridge-v2'))return;
  const script=doc.createElement('script');script.id='rise-unified-english-bridge-v2';
  script.textContent=`(()=>{const BANK='aa_vocab_quiz_wrong_v1';const loadBank=()=>{try{const v=JSON.parse(localStorage.getItem(BANK)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return{}}};const saveBank=b=>{try{localStorage.setItem(BANK,JSON.stringify(b))}catch(_){}};function go(n=0){try{if(!window.AA_API_READING_ONLY||window.AA_V23_STATS?.loaderComplete!==true||typeof vocabPool!=='function'||typeof state==='undefined'||typeof recordAttempt!=='function'||typeof updateSRS!=='function'||typeof save!=='function')throw 0;const snap=v=>{const sid=v.srsId||'v:'+v.id,it=state.items?.[sid]||null,r=it?.lastReviewAt&&typeof retention==='function'?retention(it):0,unknown=state.profile?.unknownWords?.[String(v.word||'').toLowerCase()],fromReading=!!unknown&&(!it?.lastReviewAt||(+unknown.lastSeenAt||0)>=(+it.lastReviewAt||0));return{id:String(v.id),srsId:String(sid),word:String(v.word||''),meaning:String(v.meaning||''),pos:String(v.pos||''),level:String(v.level||''),example:String(v.example||''),family:Array.isArray(v.family)?v.family.slice(0,12):[],progress:it?{fromReading,seen:+it.seen||0,correct:+it.correct||0,lapses:+it.lapses||0,retention:+r||0,lastReviewAt:+it.lastReviewAt||0,dueAt:+it.dueAt||0,due:!!it.lastReviewAt&&(+it.dueAt||0)<=Date.now()}:{fromReading,seen:0,correct:0,lapses:0,retention:0,lastReviewAt:0,dueAt:0,due:false}}};window.AA_RISE_UNIFIED_ENGLISH_API={version:'2.0.0',list:()=>vocabPool().map(snap),wrongBank:()=>({...loadBank()}),markWrong(id){const b=loadBank();b[String(id)]=Date.now();saveBank(b);return true},removeWrong(id){const b=loadBank();delete b[String(id)];saveBank(b);return true},record(id,ok,ms,fmt,ans){const v=vocabPool().find(x=>String(x.id)===String(id));if(!v)return null;const sid=v.srsId||'v:'+v.id,t=Math.max(250,+ms||0),q={id:'vocab:'+v.id+':'+fmt+':'+Date.now(),reviewKey:sid,subject:'english',type:'vocab',source:v,skills:[{id:'en.vocab.recall',role:'primary'}]};recordAttempt(q,String(ans||''),!!ok,t,{errorType:ok?null:'vocab_recall'});updateSRS(sid,!!ok,t,String(fmt||'unified'),.9);save();return snap(v)}}}catch(_){if(n<300)setTimeout(()=>go(n+1),100)}}go()})();`;
  doc.body.appendChild(script);
 }catch(_){}
}

function refreshEnglish(){
 if(!englishApi?.list)return false;
 try{
  const rows=uniqueBy(englishApi.list().filter(item=>item?.id&&text(item.word)&&text(item.meaning)),item=>item.id);
  data.english=rows.map(raw=>{
   const isPhrase=raw.srsId?.startsWith('phrase:')||raw.pos==='phrase'||raw.level==='phrase'||raw.word.includes(' ');
   const native={id:raw.id,en:raw.word,ja:raw.meaning,pos:raw.pos,level:raw.level,example:raw.example,srsId:raw.srsId};
   if(isPhrase)native.phrase=raw.word;
   return{raw,record:core.normalizeEnglish(native),kind:raw.pos==='form'||raw.level==='form'?'form':isPhrase?'phrase':'word'};
  });
  connection.english=data.english.length?'ready':'error';updateCounts();updateStartState();return connection.english==='ready';
 }catch(error){console.error('English bridge refresh failed',error);return false;}
}

function connectEnglish(attempt=0){
 injectEnglishBridge();
 try{
  const api=frames.english?.contentWindow?.AA_RISE_UNIFIED_ENGLISH_API;
  if(api?.list&&api?.record&&api?.wrongBank){englishApi=api;refreshEnglish();return;}
 }catch(_){}
 if(attempt<350)setTimeout(()=>connectEnglish(attempt+1),100);
 else{connection.english='error';ui.enCount.textContent='接続失敗';ui.enSub.textContent='再読み込みしてください';updateStartState();}
}

function injectSocialBridge(){
 try{
  const doc=frames.social?.contentDocument;
  if(!doc?.body||doc.getElementById('rise-unified-social-bridge-v2'))return;
  const script=doc.createElement('script');script.id='rise-unified-social-bridge-v2';
  script.textContent=`(()=>{function go(n=0){try{if(typeof DATA==='undefined'||typeof state==='undefined'||typeof byId==='undefined'||typeof recordAnswer!=='function'||DATA.length<1000)throw 0;const snap=x=>({id:String(x.id),sort:+x.sort||0,date:String(x.date||''),event:String(x.event||''),area:String(x.area||''),period:String(x.period||''),level:String(x.level||''),detail:String(x.detail||''),tags:Array.isArray(x.tags)?x.tags.slice():[],progress:{...(state.progress?.[x.id]||{})}});window.AA_RISE_UNIFIED_SOCIAL_API={version:'2.0.0',list:()=>DATA.map(snap),record(id,ok){const n=Number(id),item=byId.get(n)||byId.get(id)||DATA.find(x=>String(x.id)===String(id));if(!item)return null;recordAnswer(item.id,!!ok);return snap(item)}}}catch(_){if(n<450)setTimeout(()=>go(n+1),100)}}go()})();`;
  doc.body.appendChild(script);
 }catch(_){}
}

function refreshSocial(){
 if(!socialApi?.list)return false;
 try{
  const rows=uniqueBy(socialApi.list().filter(item=>item?.id&&text(item.event)&&text(item.date)),item=>item.id);
  data.social=rows.map(raw=>({raw,record:core.normalizeSocial(raw)}));
  connection.social=data.social.length>=1000?'ready':'error';updateCounts();updateStartState();
  if(active==='social')configureControls();
  return connection.social==='ready';
 }catch(error){console.error('Social bridge refresh failed',error);return false;}
}

function connectSocial(attempt=0){
 injectSocialBridge();
 try{
  const api=frames.social?.contentWindow?.AA_RISE_UNIFIED_SOCIAL_API;
  if(api?.list&&api?.record){socialApi=api;refreshSocial();return;}
 }catch(_){}
 if(attempt<500)setTimeout(()=>connectSocial(attempt+1),100);
 else{connection.social='error';ui.soCount.textContent='接続失敗';ui.soSub.textContent='再読み込みしてください';updateStartState();}
}

function waitForJapaneseMeanings(timeout=20000){
 const started=Date.now();
 return new Promise((resolve,reject)=>{
  const check=()=>{
   const meanings=window.KOKUGO_DIRECT_MEANINGS;
   if(meanings&&typeof meanings==='object'&&Object.keys(meanings).length>=15000){resolve(meanings);return;}
   if(Date.now()-started>=timeout){reject(new Error('日本語意味辞書を初期化できませんでした'));return;}
   setTimeout(check,50);
  };
  check();
 });
}

async function ensureJaMeanings(){
 const current=window.KOKUGO_DIRECT_MEANINGS;
 if(current&&typeof current==='object'&&Object.keys(current).length>=15000)return current;
 let script=document.getElementById('rise-kokugo-direct-meanings');
 if(!script){
  script=document.createElement('script');script.id='rise-kokugo-direct-meanings';script.src=JA_MEANING_SCRIPT;script.async=true;document.head.appendChild(script);
 }
 return waitForJapaneseMeanings();
}

function jaContentKey(item){return `${norm(item?.word||item?.term)}|${norm(item?.reading)}`;}

async function loadJapanese(){
 try{
  const meanings=await ensureJaMeanings();
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  let response;
  try{response=await fetch('../kokugo-chronologia/data.jsonl?v=rise-unified-20260911',{cache:'no-cache',signal:controller.signal});}
  finally{clearTimeout(timeout);}
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const rows=(await response.text()).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  if(rows.length!==15000)throw new Error(`15,000語データ件数 ${rows.length}`);
  const seenFull=new Set();
  const full=rows.map((row,index)=>{
   const meaning=text(meanings[String(row.id??index)]);
   const raw={id:'quiz-full-'+String(row.id??index),word:text(row.term),reading:text(row.reading),meaning,type:['yoji','idiom','four'].includes(row.type)?row.type:'four',...jaQuality.base({type:row.type}),source:'full15000'};
   if(!meaning||!hasJapanese(meaning))throw new Error(`日本語意味が未確認: ${text(row.term||row.id||index)}`);
   const key=jaContentKey(raw);
   if(!raw.word||seenFull.has(key))throw new Error(`15,000語データに空欄または重複: ${key}`);
   seenFull.add(key);return raw;
  });
  const jukugo=uniqueBy([...(window.AA_JUKUGO_BANK||[]),...(window.AA_JUKUGO_ADVANCED||[])].map(item=>({
   id:item.id,word:text(item.word),reading:text(item.reading),meaning:text(item.meaning),type:item.kind==='二字熟語'?'two':'three',...jaQuality.verified({...item,type:item.kind==='二字熟語'?'two':'three'},'jukugo'),source:'jukugo'
  })),jaContentKey);
  const curated=uniqueBy((window.AA_IDIOM_BANK||[]).filter(item=>item&&['四字熟語','慣用句'].includes(item.kind)).map((item,index)=>({
   id:'quiz-curated-'+index,word:text(item.word),reading:text(item.reading),meaning:text(item.meaning),type:item.kind==='四字熟語'?'yoji':'idiom',...jaQuality.verified({...item,type:item.kind==='四字熟語'?'yoji':'idiom'},'curated'),source:'curated'
  })),jaContentKey);
  const merged=full.slice(),byKey=new Map(merged.map(item=>[jaContentKey(item),item]));
  let curatedOverrides=0,jukugoOverrides=0,added=0;
  for(const item of [...jukugo,...curated]){
   const key=jaContentKey(item);if(!key||!item.word)continue;
   const existing=byKey.get(key);
   if(existing){
    existing.type=item.type||existing.type;
    Object.assign(existing,jaQuality.verified(item,item.source||'curated'));
    if(item.meaning&&hasJapanese(item.meaning))existing.meaning=item.meaning;
    existing.qualitySource=item.source||existing.qualitySource;
    if(item.source==='curated')curatedOverrides++;else jukugoOverrides++;
   }else{merged.push(item);byKey.set(key,item);added++;}
  }
  const eligible=merged.filter(item=>!jaQuality.isExcluded(item)&&item.id&&item.word&&item.meaning&&hasJapanese(item.meaning));
  data.japanese=eligible.map(raw=>({raw,record:core.normalizeJapanese(raw)}));
  if(full.length!==15000||data.japanese.length<15000)throw new Error(`日本語確認済み候補 ${data.japanese.length.toLocaleString()}語（15,000未満）`);
  connection.japanese='ready';
  const qualitySummary=jaQuality.summarize(eligible);
  window.__AA_RISE_UNIFIED_JAPANESE_COUNT__=data.japanese.length;
  window.__AA_RISE_UNIFIED_JAPANESE_QUALITY__=Object.freeze({...qualitySummary,runtimeVersion:VERSION,base:full.length,curatedOverrides,jukugoOverrides,added,excludedTerms:[...jaQuality.exclusions]});
  updateCounts();updateStartState();
 }catch(error){
  connection.japanese='error';ui.jaCount.textContent='接続失敗';ui.jaSub.textContent=text(error?.message||error);updateStartState();console.error('Japanese vocabulary load failed',error);
 }
}

function cyclePick(storageKey,bucket,pool,idOf,avoidKeys,prefix,legacyArray=false){
 const unique=uniqueBy(pool,item=>idOf(item));
 if(!unique.length)return null;
 const byId=new Map(unique.map(item=>[text(idOf(item)),item]));
 const valid=new Set(byId.keys());
 const state=jsonGet(storageKey,{});
 const stored=state&&typeof state==='object'&&!Array.isArray(state)?state:{};
 const old=stored[bucket];
 let remaining=legacyArray?(Array.isArray(old)?old.slice():[]):(Array.isArray(old?.remaining)?old.remaining.slice():[]);
 const seenRemaining=new Set();
 remaining=remaining.map(text).filter(id=>valid.has(id)&&!seenRemaining.has(id)&&seenRemaining.add(id));
 const known=legacyArray?new Set():new Set(Array.isArray(old?.known)?old.known.map(text):[]);
 if(!old){remaining=shuffle([...valid]);}
 else if(!legacyArray){
  const additions=[...valid].filter(id=>!known.has(id)&&!remaining.includes(id));
  if(additions.length)remaining=[...shuffle(additions),...remaining];
 }
 if(!remaining.length)remaining=shuffle([...valid]);
 const position=remaining.findIndex(id=>!avoidKeys.has(`${prefix}:${id}`));
 if(position<0){
  if(legacyArray)stored[bucket]=remaining;
  else stored[bucket]={remaining,known:[...valid],initialized:true,cycle:Number(old?.cycle||1)};
  jsonSet(storageKey,stored);return null;
 }
 const [id]=remaining.splice(position,1);
 if(legacyArray)stored[bucket]=remaining;
 else stored[bucket]={remaining,known:[...valid],initialized:true,cycle:Math.max(1,Number(old?.cycle)||1)+(remaining.length===0?1:0)};
 jsonSet(storageKey,stored);
 return byId.get(id)||null;
}

function pickDistinct(rows,item,valueOf,count=3,pred=()=>true){
 const answer=text(valueOf(item)),seen=new Set([answer]),values=[];
 for(const row of shuffle(rows)){
  if(row===item||!pred(row))continue;
  const value=text(valueOf(row));
  if(!value||seen.has(value))continue;
  seen.add(value);values.push(value);
  if(values.length===count)break;
 }
 return values;
}

function englishPool(config,wrong=false){
 let pool=data.english.filter(item=>config.kind==='all'||item.kind===config.kind);
 if(wrong){
  const bank=englishApi?.wrongBank?.()||{};
  pool=pool.filter(item=>Object.prototype.hasOwnProperty.call(bank,String(item.raw.id)));
 }else if(config.status&&config.status!=='all')pool=pool.filter(item=>progressForEnglish(item).status===config.status);
 return pool;
}

function englishQuestion(item,mode,pool,isWrongReview){
 const modes=['en-ja','ja-en','spell'];
 const actual=modes.includes(mode)?mode:shuffle(modes)[0];
 let prompt,answer,valueOf,input=false;
 if(actual==='en-ja'){prompt=item.raw.word;answer=item.raw.meaning;valueOf=row=>row.raw.meaning;}
 else if(actual==='ja-en'){prompt=item.raw.meaning;answer=item.raw.word;valueOf=row=>row.raw.word;}
 else{prompt=item.raw.meaning;answer=item.raw.word;input=true;}
 if(!text(prompt)||!text(answer))return null;
 let choices=null;
 if(!input){
  const sameKind=pool.filter(row=>row.kind===item.kind);
  let wrong=pickDistinct(sameKind,item,valueOf);
  if(wrong.length<3)wrong=pickDistinct(data.english,item,valueOf);
  if(wrong.length<3)return null;
  choices=shuffle([answer,...wrong]);
 }
 return{
  key:`english:${item.raw.id}`,source:'english',kind:item.kind,subject:'english',subjectLabel:'英語',
  modeLabel:actual==='en-ja'?`英→日${isWrongReview?'・間違い':''}`:actual==='ja-en'?`日→英${isWrongReview?'・間違い':''}`:`スペル${isWrongReview?'・間違い':''}`,
  prompt,hint:isWrongReview?'間違い専用｜正解すると未克服リストから外れます':actual==='en-ja'?'意味を選んでください':actual==='ja-en'?'英単語・熟語を選んでください':'英語で入力してください',
  answer,choices,input,inputMode:'english',speak:item.raw.word,
  explanation:[`${item.raw.word} = ${item.raw.meaning}`,item.raw.example].filter(Boolean).join('｜'),
  check:value=>actual==='spell'?normEnglish(value)===normEnglish(answer):text(value)===text(answer),
  async commit(correct,value,ms){
   englishApi.record(item.raw.id,correct,ms,`${isWrongReview?'wrong-review':'unified'}-${actual}`,value);
   if(!correct)englishApi.markWrong(item.raw.id);else if(isWrongReview)englishApi.removeWrong(item.raw.id);
   refreshEnglish();
  }
 };
}

function makeEnglishNormal(config){
 const context=config.subject==='mixed'?{kind:'all',status:'all',exam:config.filterB==='exam'}:{kind:config.filterA,status:config.filterB,exam:false};
 let pool=englishPool(context,false);
 let poolVariant='all';
 if(context.exam){
  const priority=pool.filter(item=>{const p=progressForEnglish(item);return p.status==='weak'||p.fromReading||p.currentWrong;});
  if(priority.length>=4&&Math.random()<.7){pool=priority;poolVariant='priority';}
 }
 if(pool.length<4)return null;
 const mode=config.subject==='mixed'?'random':config.mode;
 const eligible=pool.filter(item=>mode!=='spell'||text(item.raw.word));
 const bucket=`english|${context.kind}|${context.status}|${context.exam?'exam':'all'}|${poolVariant}`;
 const item=cyclePick(AUX_CYCLE_KEY,bucket,eligible,row=>row.raw.id,session.usedKeys,'english');
 return item?englishQuestion(item,mode,pool,false):null;
}

function jaRankMatches(item,range){
 if(!range||range==='all')return true;
 if(range==='exam')return jaQuality.isExamImportant(item)||(['A','B'].includes(item.rank)&&item.reviewStatus==='verified');
 return item.rank===range;
}

function japaneseVocabPool(kind,range){
 return data.japanese.filter(item=>(kind==='all'||kind==='vocab'||item.raw.type===kind)&&jaRankMatches(item.raw,range));
}

function japaneseDistractors(pool,item,field,count=3){
 const out=[],seen=new Set([text(item.raw[field])]);
 const take=predicate=>{
  for(const row of shuffle(pool)){
   if(out.length>=count)break;
   if(row===item||!predicate(row))continue;
   const value=text(row.raw[field]);
   if(!value||seen.has(value)||(field==='meaning'&&!hasJapanese(value)))continue;
   seen.add(value);out.push(value);
  }
 };
 take(row=>row.raw.type===item.raw.type&&row.raw.rank===item.raw.rank);
 take(row=>row.raw.type===item.raw.type);
 take(row=>row.raw.rank===item.raw.rank);
 take(()=>true);
 return out;
}

function japaneseVocabQuestion(item,mode,pool,isWrongReview){
 const wanted=['meaning','reading','word'].includes(mode)?[mode]:shuffle(['meaning','reading','word']);
 for(const actual of wanted){
  const field=actual==='meaning'?'meaning':actual==='reading'?'reading':'word';
  const prompt=actual==='word'?item.raw.meaning:item.raw.word,answer=text(item.raw[field]);
  if(!answer||!text(prompt)||(field==='meaning'&&!hasJapanese(answer))||(actual==='word'&&!hasJapanese(prompt)))continue;
  let wrong=japaneseDistractors(pool,item,field);
  if(wrong.length<3)wrong=japaneseDistractors(data.japanese,item,field);
  if(wrong.length<3)continue;
  return{
   key:`japanese-vocab:${item.raw.id}`,source:'japanese-vocab',kind:item.raw.type,subject:'japanese',subjectLabel:'国語',
   modeLabel:`${actual==='meaning'?'語句→意味':actual==='reading'?'語句→読み':'意味→語句'}${isWrongReview?'・間違い':''}`,
   prompt,hint:isWrongReview?'国語語彙｜間違い専用':actual==='meaning'?'意味を選んでください':actual==='reading'?'読みを選んでください':'この意味に合う語句を選んでください',
   answer,choices:shuffle([answer,...wrong]),input:false,
   explanation:`${item.raw.word}${item.raw.reading?'（'+item.raw.reading+'）':''}｜${item.raw.meaning}`,
   check:value=>text(value)===answer,
   commit(correct){updateJapaneseWrong(item.raw,correct,isWrongReview);updateCounts();}
  };
 }
 return null;
}

function makeJapaneseVocabNormal(kind,range,mode){
 let pool=japaneseVocabPool(kind,range);
 if(['meaning','reading','word'].includes(mode))pool=pool.filter(item=>{
  if(mode==='reading')return Boolean(text(item.raw.reading));
  if(mode==='word')return hasJapanese(item.raw.meaning);
  return hasJapanese(item.raw.meaning);
 });
 if(pool.length<4)return null;
 const bucket=`${kind}|${range}`;
 const item=cyclePick(JA_CYCLE_KEY,bucket,pool,row=>row.raw.id,session.usedKeys,'japanese-vocab');
 return item?japaneseVocabQuestion(item,mode,pool,false):null;
}

function classicLevelMatches(item,range,area){
 if(!range||range==='all')return true;
 if(range==='exam')return area==='classical'?['S','A','B'].includes(item.level):item.level==='A';
 return item.level===range;
}

function classicQuestion(item,area,mode,pool,isWrongReview){
 const built=classics.makeQuestion(item,mode,pool);
 if(!built)return null;
 const areaLabel=area==='classical'?'古文単語':'漢文語句';
 const direction=built.actual==='meaning'?'語句→意味':built.actual==='reading'?'語句→読み':'意味→語句';
 return{
  key:`classic:${item.id}`,source:area,kind:item.kind,subject:'japanese',subjectLabel:'国語',modeLabel:`${areaLabel}・${direction}${isWrongReview?'・間違い':''}`,
  prompt:built.prompt,hint:`${item.displayBand}｜${item.area}｜出る順 #${item.rank}${isWrongReview?'｜間違い専用':''}`,
  answer:built.answer,choices:[...built.choices],input:false,explanation:built.explanation,
  check:value=>text(value)===text(built.answer),commit(correct){recordClassic(item,correct);updateCounts();}
 };
}

function makeClassicNormal(area,range,mode){
 const pool=classics[area].filter(item=>classicLevelMatches(item,range,area));
 if(pool.length<4)return null;
 const bucket=`${area}|${range}`;
 const item=cyclePick(CLASSIC_CYCLE_KEY,bucket,pool,row=>row.id,session.usedKeys,'classic',true);
 return item?classicQuestion(item,area,mode,pool,false):null;
}

function japaneseContext(config){
 if(config.subject==='mixed')return{kind:'all',range:config.filterB==='exam'?'exam':'all',mode:'random'};
 return{kind:config.filterA,range:config.filterB,mode:config.mode};
}

function nextJapaneseDomain(context){
 if(context.kind==='classical'||context.kind==='kanbun')return context.kind;
 if(context.kind!=='all')return'vocab';
 if(!session.japaneseQueue.length){
  const order=shuffle(['vocab','vocab','vocab','classical','kanbun']);
  const last=session.lastJapaneseDomain;
  if(last&&order[0]===last){const swap=order.findIndex(value=>value!==last);if(swap>0)[order[0],order[swap]]=[order[swap],order[0]];}
  session.japaneseQueue=order;
 }
 const domain=session.japaneseQueue.shift();session.lastJapaneseDomain=domain;return domain;
}

function makeJapaneseNormal(config){
 const context=japaneseContext(config),tried=new Set();
 const allowed=context.kind==='all'?['vocab','classical','kanbun']:context.kind==='classical'||context.kind==='kanbun'?[context.kind]:['vocab'];
 for(let attempt=0;attempt<allowed.length+3;attempt++){
  const domain=context.kind==='all'?nextJapaneseDomain(context):allowed[0];
  if(tried.has(domain)&&tried.size>=allowed.length)break;
  tried.add(domain);
  let question=null;
  if(domain==='classical'||domain==='kanbun')question=makeClassicNormal(domain,context.range,context.mode);
  else question=makeJapaneseVocabNormal(context.kind==='all'?'all':context.kind,context.range,context.mode);
  if(question)return question;
 }
 return null;
}

function socialPool(config,wrong=false){
 const level=config.subject==='mixed'?(config.filterB==='exam'?'SA':'all'):config.filterA;
 const period=config.subject==='mixed'?'all':config.filterB;
 let pool=data.social.filter(item=>{
  if(period!=='all'&&item.raw.period!==period)return false;
  if(level==='SA'&&!['S','A'].includes(item.raw.level))return false;
  if(level==='S'&&item.raw.level!=='S')return false;
  return !wrong||socialCurrentWrong(item);
 });
 const mode=config.subject==='mixed'?'mixed':config.mode;
 if(mode==='eventToYear')pool=pool.filter(item=>EXACT_YEAR.test(item.raw.date));
 return{pool,level,period,mode};
}

function normalizeYearInput(value){
 return text(value).normalize('NFKC').toLowerCase().replace(/[\s,，]/g,'').replace(/年$/,'').replace(/^bc/,'紀元前');
}

function acceptedYear(item,value){
 const answer=normalizeYearInput(value);
 if(item.raw.sort<0){
  const number=String(Math.abs(item.raw.sort));
  return[`紀元前${number}`,`-${number}`,`${number}bc`].includes(answer);
 }
 return answer===String(item.raw.sort);
}

function socialDistractors(pool,item){
 const eligible=pool.filter(row=>row!==item&&row.raw.date!==item.raw.date&&row.raw.sort!==item.raw.sort);
 let values=pickDistinct(eligible,item,row=>row.raw.event,3,row=>row.raw.period===item.raw.period&&row.raw.area===item.raw.area);
 if(values.length<3)values=pickDistinct(eligible,item,row=>row.raw.event,3,row=>row.raw.period===item.raw.period);
 if(values.length<3)values=pickDistinct(data.social,item,row=>row.raw.event,3,row=>row.raw.date!==item.raw.date&&row.raw.sort!==item.raw.sort);
 return values;
}

function socialQuestion(item,mode,pool,isWrongReview){
 let actual=['eventToYear','yearToEvent'].includes(mode)?mode:(EXACT_YEAR.test(item.raw.date)&&Math.random()<.52?'eventToYear':'yearToEvent');
 if(actual==='eventToYear'&&!EXACT_YEAR.test(item.raw.date))actual='yearToEvent';
 if(actual==='eventToYear')return{
  key:`social:${item.raw.id}`,source:'social',kind:item.raw.period,subject:'social',subjectLabel:'社会',modeLabel:`出来事→年号${isWrongReview?'・間違い':''}`,
  prompt:item.raw.event,hint:isWrongReview?'社会｜間違い専用｜年号を入力':'年号を入力してください（例：645 / 645年 / 紀元前221）',
  answer:item.raw.date,choices:null,input:true,inputMode:'year',explanation:item.raw.detail||`${item.raw.event}｜${item.raw.date}`,
  check:value=>acceptedYear(item,value),commit(correct){socialApi.record(item.raw.id,correct);refreshSocial();}
 };
 const wrong=socialDistractors(pool,item);if(wrong.length<3)return null;
 return{
  key:`social:${item.raw.id}`,source:'social',kind:item.raw.period,subject:'social',subjectLabel:'社会',modeLabel:`年号→出来事${isWrongReview?'・間違い':''}`,
  prompt:item.raw.date,hint:isWrongReview?'社会｜間違い専用｜出来事を選択':'この年の出来事を選んでください',
  answer:item.raw.event,choices:shuffle([item.raw.event,...wrong]),input:false,explanation:item.raw.detail||`${item.raw.date}｜${item.raw.event}`,
  check:value=>text(value)===text(item.raw.event),commit(correct){socialApi.record(item.raw.id,correct);refreshSocial();}
 };
}

function makeSocialNormal(config){
 const context=socialPool(config,false);
 if(context.pool.length<4)return null;
 const bucket=`social|${context.level}|${context.period}|${context.mode}`;
 const item=cyclePick(AUX_CYCLE_KEY,bucket,context.pool,row=>row.raw.id,session.usedKeys,'social');
 return item?socialQuestion(item,context.mode,context.pool,false):null;
}

function recentBoost(timestamp){
 const value=Number(timestamp)||0;if(!value)return 0;
 const age=Math.max(0,Date.now()-value);
 if(age<3600000)return 28;if(age<86400000)return 20;if(age<3*86400000)return 12;if(age<14*86400000)return 6;return 0;
}

function englishWrongCandidates(config){
 const kind=config.subject==='english'?config.filterA:'all',pool=englishPool({kind,status:'all'},true),all=data.english;
 return pool.map(item=>{
  const progress=progressForEnglish(item),timestamp=(englishApi.wrongBank()||{})[String(item.raw.id)];
  return{key:`english:${item.raw.id}`,source:'english',priority:100+Math.min(60,(progress.lapses||0)*12)+(progress.due?20:0)+(progress.fromReading?8:0)+recentBoost(timestamp||progress.lastReviewAt),make:()=>englishQuestion(item,config.subject==='english'?config.mode:'random',all,true)};
 });
}

function japaneseWrongCandidates(config){
 const context=japaneseContext(config),out=[],seenWrong=new Set();
 const includeVocab=!['classical','kanbun'].includes(context.kind);
 if(includeVocab){
  const all=data.japanese,byId=new Map(all.map(item=>[text(item.raw.id),item])),byStable=new Map(all.map(item=>[jaStableKey(item.raw),item]));
  for(const wrong of loadJaWrong()){
   if(['koten','kanbun'].includes(text(wrong?.type)))continue;
   const item=byId.get(text(wrong.id))||byStable.get(jaStableKey(wrong));
   if(!item)continue;
   if(context.kind!=='all'&&context.kind!=='vocab'&&item.raw.type!==context.kind)continue;
   if(!jaRankMatches(item.raw,context.range))continue;
   const candidateKey=`japanese-vocab:${item.raw.id}`;if(seenWrong.has(candidateKey))continue;seenWrong.add(candidateKey);
   const distractorPool=japaneseVocabPool(context.kind==='all'?'all':context.kind,context.range);
   out.push({key:candidateKey,source:'japanese-vocab',priority:100+recentBoost(wrong.lastWrongAt||wrong.createdAt)+(Number(wrong.retryCount)||0)*14,make:()=>japaneseVocabQuestion(item,context.mode,distractorPool,true)});
  }
 }
 const progress=classicProgress();
 for(const area of ['classical','kanbun']){
  if(context.kind!=='all'&&context.kind!==area)continue;
  const pool=classics[area].filter(item=>classicLevelMatches(item,context.range,area));
  for(const item of pool){
   const value=progress[item.id];if(!isClassicWrong(value))continue;
   out.push({key:`classic:${item.id}`,source:area,priority:100+Math.min(60,(Number(value?.wrong)||0)*12)+recentBoost(value?.lastWrongAt||value?.last),make:()=>classicQuestion(item,area,context.mode,pool,true)});
  }
 }
 return out;
}

function socialWrongCandidates(config){
 const context=socialPool(config,true),all=context.pool.length>=4?context.pool:data.social;
 return context.pool.map(item=>{
  const progress=item.raw.progress||{};
  return{key:`social:${item.raw.id}`,source:'social',priority:100+Math.min(60,(Number(progress.wrong)||0)*10)+recentBoost(progress.last)+((Number(progress.nextReview)||0)<=Date.now()?18:0),make:()=>socialQuestion(item,context.mode,all,true)};
 });
}

function collectWrongCandidates(config){
 let candidates=[];
 if(config.subject==='mixed'||config.subject==='english')candidates.push(...englishWrongCandidates(config));
 if(config.subject==='mixed'||config.subject==='japanese')candidates.push(...japaneseWrongCandidates(config));
 if(config.subject==='mixed'||config.subject==='social')candidates.push(...socialWrongCandidates(config));
 if(config.subject==='mixed'&&config.filterA!=='balanced'){
  const preferred=config.filterA;
  candidates=candidates.map(candidate=>({...candidate,priority:candidate.priority+(candidate.source===preferred||candidate.source.startsWith(preferred)?10:0)}));
 }
 return candidates;
}

function weightedWrongPick(candidates){
 let pool=candidates.filter(candidate=>!session.attemptedRound.has(candidate.key));
 if(!pool.length&&session.infinite&&candidates.length){session.attemptedRound.clear();pool=candidates.slice();}
 if(!pool.length)return null;
 const previous=session.recentKeys[session.recentKeys.length-1]||'';
 const withoutImmediateRepeat=pool.filter(candidate=>candidate.key!==previous);
 if(withoutImmediateRepeat.length)pool=withoutImmediateRepeat;
 const withoutRecent=pool.filter(candidate=>!session.recentKeys.includes(candidate.key));
 if(withoutRecent.length)pool=withoutRecent;
 const recentSources=session.recentSources;
 if(recentSources.length>=2&&recentSources[recentSources.length-1]===recentSources[recentSources.length-2]){
  const alternate=pool.filter(candidate=>candidate.source!==recentSources[recentSources.length-1]);
  if(alternate.length)pool=alternate;
 }
 pool.sort((left,right)=>right.priority-left.priority);
 const top=pool.slice(0,Math.min(10,pool.length));
 const minimum=Math.min(...top.map(candidate=>candidate.priority));
 let total=0;
 const weights=top.map(candidate=>{const weight=Math.max(1,candidate.priority-minimum+12);total+=weight;return weight;});
 let random=Math.random()*total;
 for(let index=0;index<top.length;index++){random-=weights[index];if(random<=0)return top[index];}
 return top[0];
}

function nextWrongQuestion(){
 const rejected=new Set();
 for(let attempt=0;attempt<100;attempt++){
  const candidates=collectWrongCandidates(session.config).filter(candidate=>!rejected.has(candidate.key));
  const picked=weightedWrongPick(candidates);if(!picked)return null;
  const question=picked.make();
  if(question)return question;
  rejected.add(picked.key);session.attemptedRound.add(picked.key);
 }
 return null;
}

function nextMixedSubject(config){
 if(!session.subjectQueue.length){
  const order=['english','japanese','social'];
  if(config.filterA!=='balanced'&&SUBJECTS.includes(config.filterA))order.push(config.filterA);
  session.subjectQueue=shuffle(order);
  const last=session.lastMixedSubject;
  if(last&&session.subjectQueue[0]===last){const swap=session.subjectQueue.findIndex(value=>value!==last);if(swap>0)[session.subjectQueue[0],session.subjectQueue[swap]]=[session.subjectQueue[swap],session.subjectQueue[0]];}
 }
 const next=session.subjectQueue.shift();session.lastMixedSubject=next;return next;
}

function normalQuestionFor(subject,config){
 if(subject==='english')return makeEnglishNormal(config);
 if(subject==='japanese')return makeJapaneseNormal(config);
 return makeSocialNormal(config);
}

function tryNextNormalQuestion(){
 const config=session.config;
 if(config.subject!=='mixed')return normalQuestionFor(config.subject,config);
 const failed=new Set();
 for(let attempt=0;attempt<18;attempt++){
  const subject=nextMixedSubject(config);
  const question=normalQuestionFor(subject,config);
  if(question)return question;
  failed.add(subject);
  if(failed.size===SUBJECTS.length)return null;
 }
 return null;
}

function nextNormalQuestion(){
 for(let cycleAttempt=0;cycleAttempt<2;cycleAttempt++){
  const question=tryNextNormalQuestion();
  if(question)return question;
  if(!session.infinite||!session.usedKeys.size||cycleAttempt>0)return null;
  const previous=session.recentKeys[session.recentKeys.length-1]||'';
  session.usedKeys=new Set(previous?[previous]:[]);
  session.subjectQueue=[];session.japaneseQueue=[];
 }
 return null;
}

function snapshotConfig(){
 captureDraft();
 return{subject:active,mode:ui.mode.value,count:ui.count.value,filterA:ui.filterA.value,filterB:ui.filterB.value,wrongOnly};
}

function showFeedback(correct,question){
 const title=document.createElement('strong');
 title.textContent=session.config.wrongOnly?(correct?'克服':'まだ要復習'):(correct?'正解':'要復習');
 const answer=document.createElement('div');answer.className='answerLine';answer.textContent=`正解：${question.answer}`;
 const explanation=document.createElement('p');explanation.textContent=question.explanation||'';
 ui.feedback.className=`feedback ${correct?'ok':'bad'}`;
 ui.feedback.replaceChildren(title,answer,explanation);
}

function speak(word){
 try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word);utterance.lang='en-US';utterance.rate=.88;speechSynthesis.speak(utterance);}catch(_){}
}

function resetQuestionUi(){
 ui.feedback.className='feedback hidden';ui.feedback.replaceChildren();
 ui.next.classList.add('hidden');ui.next.disabled=false;ui.next.textContent='次の問題へ';
 ui.choices.replaceChildren();ui.answerInput.value='';ui.answerInput.disabled=false;ui.submit.disabled=false;
}

async function renderNext(){
 if(!session||session.transitioning)return;
 if(!session.infinite&&session.answered>=session.limit){finishSession(false);return;}
 session.transitioning=true;resetQuestionUi();
 const question=session.config.wrongOnly?nextWrongQuestion():nextNormalQuestion();
 if(!session)return;
 if(!question){
  session.transitioning=false;
  const message=session.config.wrongOnly?(session.answered?'この範囲の未克服問題を1周しました。正解した項目は間違い一覧から外れています。':'この条件に未克服の間違いはありません。'):(session.answered?'この条件で重複せずに出せる問題をすべて出題しました。':'この条件では出題できる問題がありません。条件を変更してください。');
  finishSession(false,message);return;
 }
 session.current=question;session.locked=false;session.transitioning=false;session.usedKeys.add(question.key);questionStarted=performance.now();
 ui.inputRow.classList.toggle('hidden',!question.input);ui.choices.classList.toggle('hidden',Boolean(question.input));
 ui.speak.classList.toggle('hidden',!question.speak);ui.speak.onclick=()=>question.speak&&speak(question.speak);
 ui.subjectName.textContent=question.subjectLabel;ui.modeName.textContent=question.modeLabel;
 ui.index.textContent=session.infinite?`${session.answered+1} / ∞`:`${session.answered+1} / ${session.limit}`;
 ui.score.textContent=`正解 ${session.score} · 回答 ${session.answered}`;
 ui.bar.style.width=session.infinite?`${(session.answered%30)/30*100}%`:`${session.answered/session.limit*100}%`;
 ui.prompt.textContent=question.prompt;ui.hint.textContent=question.hint||'';
 if(question.choices){
  for(const value of question.choices){
   const button=document.createElement('button');button.type='button';button.className='choice';button.textContent=value;
   button.addEventListener('click',()=>answerQuestion(value,button));ui.choices.appendChild(button);
  }
 }
 if(question.input){
  ui.answerInput.placeholder=question.inputMode==='year'?'年号を入力':'英語を入力';
  ui.answerInput.setAttribute('inputmode','text');ui.answerInput.setAttribute('enterkeyhint','done');
  setTimeout(()=>{if(session?.current===question&&!session.locked)ui.answerInput.focus({preventScroll:true});},50);
 }
 ui.end.classList.toggle('hidden',!session.infinite);
 ui.end.textContent=session.config.wrongOnly?'間違い復習を終了':'無限コースを終了';
 updateWrongSummary();
}

async function answerQuestion(value,button){
 if(!session||session.locked||session.transitioning||!session.current)return;
 const question=session.current,answer=text(value);if(question.input&&!answer)return;
 session.locked=true;
 const correct=Boolean(question.check(answer)),ms=Math.max(250,Math.round(performance.now()-questionStarted));
 session.answered++;if(correct)session.score++;
 if(question.choices){
  for(const choice of $$('#choices .choice')){if(text(choice.textContent)===text(question.answer))choice.classList.add('ok');choice.disabled=true;}
  if(button&&!correct)button.classList.add('bad');
 }
 if(question.input){ui.answerInput.disabled=true;ui.submit.disabled=true;}
 try{await question.commit(correct,answer,ms);}catch(error){console.error('Unified quiz native commit failed',error);}
 session.attemptedRound.add(question.key);
 session.recentKeys.push(question.key);if(session.recentKeys.length>8)session.recentKeys.shift();
 session.recentSources.push(question.source);if(session.recentSources.length>5)session.recentSources.shift();
 showFeedback(correct,question);
 ui.next.classList.remove('hidden');
 if(!session.infinite&&session.answered>=session.limit)ui.next.textContent='結果を見る';
 ui.score.textContent=`正解 ${session.score} · 回答 ${session.answered}`;
 ui.bar.style.width=session.infinite?`${(session.answered%30)/30*100}%`:`${session.answered/session.limit*100}%`;
 updateCounts();
}

function finishSession(manual=false,message=''){
 if(!session)return;
 const result={score:session.score,answered:session.answered,infinite:session.infinite,wrongOnly:session.config.wrongOnly};
 session=null;ui.study.classList.add('hidden');ui.end.classList.add('hidden');ui.summary.classList.remove('hidden');
 if(result.wrongOnly&&result.answered===0)ui.summaryTitle.textContent='間違いはありません';
 else if(result.wrongOnly)ui.summaryTitle.textContent=manual?'間違い復習を終了':'間違い復習完了';
 else if(result.infinite)ui.summaryTitle.textContent='無限コース終了';
 else ui.summaryTitle.textContent='セッション完了';
 ui.summaryScore.textContent=`${result.score} / ${result.answered}`;
 ui.summaryMessage.textContent=message||(result.wrongOnly?'正解した項目は未克服リストから外れ、各教材の既存履歴へ反映されています。':'正誤は各教材の既存履歴へ反映済みです。');
 updateCounts();updateStartState();ui.summary.scrollIntoView({behavior:'smooth',block:'start'});
}

async function startSession(config=snapshotConfig()){
 if(starting||!currentReady())return;
 const nonce=++startNonce;starting=true;updateStartState();lastConfig={...config};
 session={config:{...config},infinite:config.count==='infinite',limit:config.count==='infinite'?Infinity:Number(config.count)||10,answered:0,score:0,locked:false,transitioning:false,current:null,usedKeys:new Set(),attemptedRound:new Set(),recentKeys:[],recentSources:[],subjectQueue:[],japaneseQueue:[],lastMixedSubject:'',lastJapaneseDomain:''};
 ui.summary.classList.add('hidden');ui.setup.classList.add('compact');ui.study.classList.remove('hidden');
 ui.study.scrollIntoView({behavior:'smooth',block:'start'});
 starting=false;updateStartState();
 if(nonce!==startNonce)return;
 await renderNext();
}

function applyConfig(config){
 setSubject(config.subject);
 if([...ui.mode.options].some(option=>option.value===config.mode))ui.mode.value=config.mode;
 if([...ui.filterA.options].some(option=>option.value===config.filterA))ui.filterA.value=config.filterA;
 if(config.subject==='japanese')configureJapaneseRange(config.filterB);
 if([...ui.filterB.options].some(option=>option.value===config.filterB))ui.filterB.value=config.filterB;
 if([...ui.count.options].some(option=>option.value===config.count))ui.count.value=config.count;
 wrongOnly=Boolean(config.wrongOnly);updateFocusUi();captureDraft();
}

for(const button of $$('[data-subject]'))button.addEventListener('click',()=>setSubject(button.dataset.subject));
ui.mode.addEventListener('change',captureDraft);
ui.filterA.addEventListener('change',()=>{
 const oldRange=ui.filterB.value;
 if(active==='japanese')configureJapaneseRange(oldRange);
 captureDraft();
});
ui.filterB.addEventListener('change',captureDraft);
ui.focus.addEventListener('click',()=>{wrongOnly=!wrongOnly;updateFocusUi();updateStartState();updateWrongSummary();});
ui.start.addEventListener('click',()=>startSession());
ui.next.addEventListener('click',async()=>{
 if(!session||session.transitioning)return;
 ui.next.disabled=true;ui.next.classList.add('hidden');
 await renderNext();
});
ui.submit.addEventListener('click',()=>answerQuestion(ui.answerInput.value,null));
ui.answerInput.addEventListener('keydown',event=>{
 if(event.key!=='Enter')return;
 event.preventDefault();
 if(session?.locked&&!ui.next.classList.contains('hidden'))ui.next.click();
 else if(!ui.submit.disabled)answerQuestion(ui.answerInput.value,null);
});
ui.end.addEventListener('click',()=>finishSession(true));
ui.restart.addEventListener('click',()=>{
 if(!lastConfig)return;
 ui.summary.classList.add('hidden');applyConfig(lastConfig);startSession({...lastConfig});
});

frames.english?.addEventListener('load',()=>connectEnglish());
frames.social?.addEventListener('load',()=>connectSocial());
window.addEventListener('storage',()=>{
 if(connection.english==='ready')refreshEnglish();
 if(connection.social==='ready')refreshSocial();
 updateCounts();
});

document.documentElement.dataset.unifiedVocabularyQuiz=VERSION;
document.documentElement.dataset.riseWrongReview=VERSION;
document.documentElement.dataset.riseInfiniteCourse=VERSION;
window.RISE_WRONG_REVIEW_V1=Object.freeze({version:VERSION,counts:currentWrongCounts,collect:()=>collectWrongCandidates(snapshotConfig()),snapshot:snapshotConfig});
window.RISE_UNIFIED_QUIZ_V2=Object.freeze({
 version:VERSION,subjects:SUBJECTS,
 counts:()=>({english:data.english.length,japanese:data.japanese.length,classical:classics.classical.length,kanbun:classics.kanbun.length,social:data.social.length}),
 wrongCounts:currentWrongCounts,snapshot:snapshotConfig,
 current:()=>session?.current?{key:session.current.key,subject:session.current.subject,source:session.current.source,kind:session.current.kind||'',mode:session.current.modeLabel,prompt:session.current.prompt,answer:session.current.answer,input:Boolean(session.current.input)}:null
});

if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(()=>{});
setSubject('mixed');updateCounts();updateStartState();loadJapanese();connectEnglish();connectSocial();

})();
