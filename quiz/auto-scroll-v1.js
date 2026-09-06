(()=>{'use strict';
const VERSION='1.1.0';
const study=document.getElementById('studyCard');
const next=document.getElementById('nextQuestion');
const index=document.getElementById('questionIndex');
const prompt=document.getElementById('prompt');
if(!study||!next)return;

const prefersReducedMotion=()=>{
 try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true}
 catch(_){return false}
};
const marker=()=>`${index?.textContent||''}\n${prompt?.textContent||''}`;

function scrollToQuestionTop(){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  study.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'start'});
 }));
}

function scrollAfterQuestionChanges(before){
 let done=false;
 let fallback=0;
 const observer=new MutationObserver(()=>{
  if(marker()!==before)finish(true);
  else if(study.classList.contains('hidden'))finish(false);
 });
 const finish=shouldScroll=>{
  if(done)return;
  done=true;
  observer.disconnect();
  clearTimeout(fallback);
  if(shouldScroll)scrollToQuestionTop();
 };
 observer.observe(study,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
 fallback=setTimeout(()=>finish(!study.classList.contains('hidden')),1800);
}

// Capture on document so infinite/classics handlers cannot suppress this hook
// with stopImmediatePropagation() on the button itself.
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('#nextQuestion'):null;
 if(!target||target.classList.contains('hidden')||target.disabled)return;
 scrollAfterQuestionChanges(marker());
},true);

document.documentElement.dataset.unifiedQuizAutoScroll=VERSION;
})();
