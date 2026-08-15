(()=>{'use strict';
const VERSION='2026-08-15.2';
if(window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__)return;
window.__AA_KOKUGO_QUIZ_INTERACTION_FIX__=VERSION;

function prepare(root=document){
  root.querySelectorAll?.('#jkgQuiz .quiz-opt').forEach(btn=>{
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.touchAction='manipulation';
    btn.style.webkitTapHighlightColor='rgba(49,95,214,.12)';
  });
}

function fallbackTap(target){
  const btn=target?.closest?.('#jkgQuiz .quiz-opt');
  if(!btn||btn.disabled)return;
  const body=btn.closest('#quizBody');
  if(!body)return;
  const marker=String(Date.now())+'-'+Math.random();
  btn.dataset.aaTapPending=marker;
  setTimeout(()=>{
    if(!btn.isConnected||btn.disabled||btn.dataset.aaTapPending!==marker)return;
    if(typeof btn.onclick==='function'){
      try{btn.onclick();}catch(err){console.error('Kokugo quiz tap fallback failed',err);}
    }else{
      btn.click();
    }
  },0);
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
    if(kind)kind.value='two';if(mode)mode.value='meaning';
    start.click();
    const choice=await waitFor(()=>document.querySelector('#jkgQuiz .quiz-opt'));
    choice.dispatchEvent(new Event('pointerup',{bubbles:true,cancelable:true}));
    await waitFor(()=>document.querySelector('#jkgQuiz .quiz-opt.correct')&&document.getElementById('quizResult')?.textContent?.trim());
    const next=document.getElementById('quizNext');
    const disabled=[...document.querySelectorAll('#jkgQuiz .quiz-opt')].every(b=>b.disabled);
    const nextVisible=!!next&&getComputedStyle(next).display!=='none';
    if(!disabled||!nextVisible)throw new Error(`graded=${disabled} next=${nextVisible}`);
    markAudit(true,{graded:true,nextVisible:true,version:VERSION});
  }catch(err){markAudit(false,{error:String(err?.message||err),version:VERSION})}
}

function install(){
  const body=document.getElementById('quizBody');
  if(!body){setTimeout(install,50);return;}
  prepare(body);
  const mo=new MutationObserver(()=>prepare(body));
  mo.observe(body,{childList:true,subtree:true});
  document.addEventListener('pointerup',e=>fallbackTap(e.target),true);
  document.addEventListener('touchend',e=>fallbackTap(e.target),{capture:true,passive:true});
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#jkgQuiz .quiz-opt');
    if(btn)delete btn.dataset.aaTapPending;
  },true);
  document.documentElement.dataset.kokugoQuizInteractionFix=VERSION;
  runAudit();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
