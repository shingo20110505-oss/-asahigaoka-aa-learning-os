(()=>{'use strict';
const VERSION='1.0.0';
const study=document.getElementById('studyCard');
const next=document.getElementById('nextQuestion');
if(!study||!next)return;
const prefersReducedMotion=()=>{try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true}catch(_){return false}};
function scrollToQuestionTop(){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  study.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'start'});
 }));
}
next.addEventListener('click',scrollToQuestionTop);
document.documentElement.dataset.unifiedQuizAutoScroll=VERSION;
})();
