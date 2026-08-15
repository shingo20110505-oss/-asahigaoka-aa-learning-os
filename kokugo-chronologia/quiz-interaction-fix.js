(()=>{'use strict';
const VERSION='2026-08-15.1';
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
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
