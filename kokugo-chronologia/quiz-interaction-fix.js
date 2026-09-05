(()=>{'use strict';
const VERSION='2026-09-05.2';
if(window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__)return;
window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__=VERSION;

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
function waitFor(test,timeout=30000){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let value;try{value=test()}catch(_){}if(value)return resolve(value);if(Date.now()-start>timeout)return reject(new Error('timeout'));setTimeout(tick,80)};tick()})}
async function runAudit(){
  if(!new URLSearchParams(location.search).has('aa_quiz_ui_ci'))return;
  try{
    const tab=await waitFor(()=>document.querySelector('[data-tab="quiz"]'));
    tab.click();
    const start=await waitFor(()=>document.getElementById('quizStart'));
    const kind=document.getElementById('quizKind'),mode=document.getElementById('quizMode');
    const rank=await waitFor(()=>document.getElementById('quizRank'));
    if(kind)kind.value='all';if(mode)mode.value='meaning';rank.value='all';rank.dispatchEvent(new Event('change',{bubbles:true}));
    start.click();
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
    markAudit(true,{graded:true,nextVisible:true,realTouchCapture:true,rankSelector:true,full15000:full,pool,supplementV1:window.__AA_JAPANESE_VOCAB_SUPPLEMENT__||null,supplementV2:window.__AA_JAPANESE_VOCAB_SUPPLEMENT_V2__||null,version:VERSION});
  }catch(err){markAudit(false,{error:String(err?.message||err),version:VERSION})}
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
  document.documentElement.dataset.kokugoQuizInteractionFix=VERSION;
  runAudit();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
(()=>{'use strict';
if(document.getElementById('aaKokugoQuizRankLoader'))return;
const loadRank=()=>{if(document.getElementById('aaKokugoQuizRankLoader'))return;const s=document.createElement('script');s.id='aaKokugoQuizRankLoader';s.src='./quiz-rank-select-v1.js?v=20260905-2';s.async=false;document.head.appendChild(s)};
const loadV2=()=>{if(window.__AA_JAPANESE_VOCAB_SUPPLEMENT_V2__){loadRank();return}if(document.getElementById('aaKokugoVocabSupplementV2')){let tries=0;const timer=setInterval(()=>{if(window.__AA_JAPANESE_VOCAB_SUPPLEMENT_V2__||++tries>=500){clearInterval(timer);loadRank()}},10);return}const s=document.createElement('script');s.id='aaKokugoVocabSupplementV2';s.src='./jukugo-bank-supplement-v2.js?v=20260905-2';s.async=false;s.onload=loadRank;s.onerror=loadRank;document.head.appendChild(s)};
const waitV1=()=>{if(window.__AA_JAPANESE_VOCAB_SUPPLEMENT__){loadV2();return}let tries=0;const timer=setInterval(()=>{if(window.__AA_JAPANESE_VOCAB_SUPPLEMENT__||++tries>=500){clearInterval(timer);loadV2()}},10)};
if(document.getElementById('aaKokugoVocabSupplementV1')){waitV1();return}
const sup=document.createElement('script');sup.id='aaKokugoVocabSupplementV1';sup.src='./jukugo-bank-supplement-v1.js?v=20260905-1';sup.async=false;sup.onload=waitV1;sup.onerror=loadV2;document.head.appendChild(sup);
})();