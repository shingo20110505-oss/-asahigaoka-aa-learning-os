(()=>{'use strict';
const VERSION='2026-09-06.2';
const KIND_MEMORY_KEY='aa_kokugo_quiz_preferred_kind_v1';
const DB_AUDIT_URL='./data.jsonl?v=quiz-db-audit-20260906-1';
if(window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__)return;
window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__=VERSION;

let preferredKind=null;
try{preferredKind=sessionStorage.getItem(KIND_MEMORY_KEY)||null}catch(_){}

function savePreferredKind(value){
  if(!value)return;
  preferredKind=value;
  try{sessionStorage.setItem(KIND_MEMORY_KEY,value)}catch(_){}
}
function rememberKindSelection(e){
  const el=e.target;
  if(el?.id==='quizKind'&&el.value)savePreferredKind(el.value);
}
function restorePreferredKind(){
  const kind=document.getElementById('quizKind');
  if(!kind||!preferredKind)return false;
  if(![...kind.options].some(o=>o.value===preferredKind))return false;
  if(kind.value===preferredKind)return true;
  kind.value=preferredKind;
  kind.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}
function protectQuizKind(e){
  const start=e.target?.closest?.('#quizStart,#quizWrongStart');
  if(start)restorePreferredKind();
}
document.addEventListener('change',rememberKindSelection,true);
document.addEventListener('pointerdown',protectQuizKind,true);
document.addEventListener('touchstart',protectQuizKind,{capture:true,passive:true});
document.addEventListener('click',protectQuizKind,true);
document.addEventListener('touchend',protectQuizKind,{capture:true,passive:true});

function prepare(root=document){
  root.querySelectorAll?.('#jkgQuiz .quiz-opt').forEach(btn=>{
    btn.type='button';
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('touch-action','manipulation','important');
    btn.style.setProperty('position','relative','important');
    btn.style.setProperty('z-index','2','important');
    btn.style.webkitTapHighlightColor='rgba(49,95,214,.12)';
    btn.style.webkitUserSelect='none';
  });
}

let lastBtn=null,lastAt=0;
function activate(target,event,source){
  const btn=target?.closest?.('#jkgQuiz .quiz-opt');
  if(!btn||btn.disabled)return false;
  const body=btn.closest('#quizBody');
  if(!body||typeof btn.onclick!=='function')return false;
  const now=Date.now();
  if(btn===lastBtn&&now-lastAt<450)return true;
  lastBtn=btn;lastAt=now;
  if(event?.cancelable)event.preventDefault();
  try{event?.stopImmediatePropagation?.()}catch(_){try{event?.stopPropagation?.()}catch(__){}}
  try{btn.onclick.call(btn,event||null);return true}catch(err){console.error('Kokugo quiz tap activation failed',source,err);return false}
}

function captureTouch(e){activate(e.target,e,'touchend')}
function capturePointer(e){if(e.pointerType==='touch'||e.pointerType==='pen')activate(e.target,e,'pointerup')}
function captureClick(e){activate(e.target,e,'click')}

function fallbackTap(target){
  const btn=target?.closest?.('#jkgQuiz .quiz-opt');
  if(!btn||btn.disabled)return;
  const marker=String(Date.now())+'-'+Math.random();
  btn.dataset.aaTapPending=marker;
  setTimeout(()=>{
    if(!btn.isConnected||btn.disabled||btn.dataset.aaTapPending!==marker)return;
    activate(btn,null,'fallback');
  },24);
}

function markAudit(ok,detail){
  document.documentElement.dataset.aaKokugoQuizUi=ok?'PASS':'FAIL';
  let el=document.getElementById('aaKokugoQuizUiAudit');
  if(!el){el=document.createElement('pre');el.id='aaKokugoQuizUiAudit';el.hidden=true;document.body.appendChild(el)}
  el.textContent=`AA_KOKUGO_QUIZ_UI=${ok?'PASS':'FAIL'} ${JSON.stringify(detail)}`;
}
function markDbAudit(ok,detail){
  document.documentElement.dataset.aaKokugoDbAudit=ok?'PASS':'FAIL';
  window.__AA_KOKUGO_DB_AUDIT__={ok,...detail,version:VERSION};
  let el=document.getElementById('aaKokugoDbAudit');
  if(!el){el=document.createElement('pre');el.id='aaKokugoDbAudit';el.hidden=true;document.body.appendChild(el)}
  el.textContent=`AA_KOKUGO_DB_AUDIT=${ok?'PASS':'FAIL'} ${JSON.stringify(window.__AA_KOKUGO_DB_AUDIT__)}`;
}
async function auditDatabase(){
  const res=await fetch(DB_AUDIT_URL,{cache:'no-cache'});
  if(!res.ok)throw new Error('database HTTP '+res.status);
  const rows=(await res.text()).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  const validTypes=new Set(['yoji','idiom','four']);
  const seen=new Set(),bad=[],counts={yoji:0,idiom:0,four:0};
  for(const x of rows){
    const key=String(x.term||'')+'|'+String(x.reading||'');
    const type=String(x.type||'');
    if(counts[type]!=null)counts[type]++;
    const reasons=[];
    if(!x.term)reasons.push('empty-term');
    if(!validTypes.has(type))reasons.push('invalid-type');
    if(seen.has(key))reasons.push('duplicate');
    seen.add(key);
    if(type==='yoji'&&x.strict!==true)reasons.push('yoji-without-strict');
    if(x.strict===true&&type!=='yoji')reasons.push('strict-outside-yoji');
    if(type==='idiom'&&x.idiom!==true)reasons.push('idiom-flag-mismatch');
    if(x.idiom===true&&type!=='idiom')reasons.push('idiom-type-mismatch');
    if(type==='yoji'&&x.four!==true)reasons.push('yoji-four-flag-mismatch');
    if(type==='four'&&(x.strict===true||x.idiom===true))reasons.push('four-contaminated');
    if(reasons.length&&bad.length<20)bad.push({id:x.id,term:x.term,reading:x.reading,type,reasons});
  }
  const ok=rows.length===15000&&bad.length===0;
  markDbAudit(ok,{rows:rows.length,counts,bad});
  if(!ok)throw new Error(`database audit failed rows=${rows.length} bad=${bad.length}`);
  return {rows:rows.length,counts};
}
function waitFor(test,timeout=30000){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let value;try{value=test()}catch(_){}if(value)return resolve(value);if(Date.now()-start>timeout)return reject(new Error('timeout'));setTimeout(tick,80)};tick()})}
async function runAudit(){
  if(!new URLSearchParams(location.search).has('aa_quiz_ui_ci'))return;
  try{
    const db=await auditDatabase();
    const tab=await waitFor(()=>document.querySelector('[data-tab="quiz"]'));
    tab.click();
    const start=await waitFor(()=>document.getElementById('quizStart'));
    const kind=document.getElementById('quizKind'),mode=document.getElementById('quizMode');
    const rank=await waitFor(()=>document.getElementById('quizRank'));
    if(kind){kind.value='yoji';kind.dispatchEvent(new Event('change',{bubbles:true}))}
    if(mode)mode.value='meaning';rank.value='all';rank.dispatchEvent(new Event('change',{bubbles:true}));
    if(kind)kind.value='all';
    start.click();
    if(kind&&kind.value!=='yoji')throw new Error(`category persistence failed: ${kind.value}`);
    await waitFor(()=>document.querySelector('#jkgQuiz .quiz-meta'));
    const choice=await waitFor(()=>document.querySelector('#jkgQuiz .quiz-opt'));
    const Ev=window.PointerEvent||window.MouseEvent;
    choice.dispatchEvent(new Ev('pointerup',{bubbles:true,cancelable:true,pointerType:'touch'}));
    await waitFor(()=>document.querySelector('#jkgQuiz .quiz-opt.correct')&&document.getElementById('quizResult')?.textContent?.trim());
    const next=document.getElementById('quizNext');
    const disabled=[...document.querySelectorAll('#jkgQuiz .quiz-opt')].every(b=>b.disabled);
    const nextVisible=!!next&&getComputedStyle(next).display!=='none';
    const full=Number(window.__AA_KOKUGO_FULL_15000_COUNT__||0),pool=Number(window.__AA_KOKUGO_QUIZ_POOL_COUNT__||0);
    if(!disabled||!nextVisible||full!==15000||pool<15000)throw new Error(`graded=${disabled} next=${nextVisible} full=${full} pool=${pool}`);
    markAudit(true,{graded:true,nextVisible:true,realTouchCapture:true,rankSelector:true,categoryPersistence:true,databaseAudit:true,dbCounts:db.counts,full15000:full,pool,version:VERSION});
  }catch(err){markAudit(false,{error:String(err?.message||err),dbAudit:window.__AA_KOKUGO_DB_AUDIT__||null,version:VERSION})}
}

function installKindGuard(){
  const kind=document.getElementById('quizKind');
  if(!kind)return false;
  if(!preferredKind&&kind.value)savePreferredKind(kind.value);
  let last=kind.value;
  const mo=new MutationObserver(()=>{
    if(preferredKind&&kind.value!==preferredKind)restorePreferredKind();
    last=kind.value;
  });
  mo.observe(kind,{childList:true,subtree:true,attributes:true});
  const timer=setInterval(()=>{
    if(!kind.isConnected){clearInterval(timer);return}
    if(kind.value!==last){
      if(preferredKind&&kind.value!==preferredKind)restorePreferredKind();
      else if(kind.value)savePreferredKind(kind.value);
      last=kind.value;
    }
  },120);
  return true;
}

function install(){
  const body=document.getElementById('quizBody');
  if(!body){setTimeout(install,50);return;}
  prepare(body);
  const mo=new MutationObserver(()=>prepare(body));
  mo.observe(body,{childList:true,subtree:true});
  window.addEventListener('touchend',captureTouch,{capture:true,passive:false});
  window.addEventListener('pointerup',capturePointer,{capture:true,passive:false});
  window.addEventListener('click',captureClick,true);
  document.addEventListener('pointerup',e=>fallbackTap(e.target),true);
  document.addEventListener('touchend',e=>fallbackTap(e.target),{capture:true,passive:true});
  installKindGuard();
  let tries=0;
  const restoreTimer=setInterval(()=>{
    installKindGuard();
    if(document.getElementById('quizRank')){clearInterval(restoreTimer);restorePreferredKind();return}
    if(++tries>=600)clearInterval(restoreTimer);
  },50);
  document.documentElement.dataset.kokugoQuizInteractionFix=VERSION;
  runAudit();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
(()=>{'use strict';
if(document.getElementById('aaKokugoQuizRankLoader'))return;
const loadRank=()=>{if(document.getElementById('aaKokugoQuizRankLoader'))return;const s=document.createElement('script');s.id='aaKokugoQuizRankLoader';s.src='./quiz-rank-select-v1.js?v=20260906-2';s.async=false;document.head.appendChild(s)};
const waitSupplement=()=>{let tries=0;const timer=setInterval(()=>{if(window.__AA_JAPANESE_VOCAB_SUPPLEMENT__||++tries>=500){clearInterval(timer);loadRank()}},10)};
if(document.getElementById('aaKokugoVocabSupplementV1')){waitSupplement();return}
const sup=document.createElement('script');sup.id='aaKokugoVocabSupplementV1';sup.src='./jukugo-bank-supplement-v1.js?v=20260905-1';sup.async=false;sup.onload=waitSupplement;sup.onerror=loadRank;document.head.appendChild(sup);
})();