(()=>{'use strict';
const VERSION='1.2.0';
const study=document.getElementById('studyCard');
const next=document.getElementById('nextQuestion');
const index=document.getElementById('questionIndex');
const prompt=document.getElementById('prompt');
if(!study||!next)return;

const marker=()=>`${index?.textContent||''}\n${prompt?.textContent||''}`;

function forceQuestionTop(){
 if(study.classList.contains('hidden'))return;
 const root=document.documentElement;
 const previous=root.style.scrollBehavior;
 root.style.scrollBehavior='auto';
 const y=Math.max(0,window.scrollY+study.getBoundingClientRect().top-12);
 window.scrollTo(0,y);
 requestAnimationFrame(()=>{root.style.scrollBehavior=previous});
}

function scrollAfterQuestionChanges(before){
 const started=performance.now();
 let finished=false;
 const finish=()=>{
  if(finished||study.classList.contains('hidden'))return;
  finished=true;
  // iOS/PWA can relayout once more after choices/feedback are replaced.
  // Reassert the same position after the first paint so the viewport cannot
  // remain at the old answer/next-button position.
  forceQuestionTop();
  requestAnimationFrame(forceQuestionTop);
  setTimeout(forceQuestionTop,120);
 };
 const check=()=>{
  if(finished||study.classList.contains('hidden'))return;
  if(marker()!==before){finish();return}
  if(performance.now()-started<2500){requestAnimationFrame(check);return}
  // Even if a mode reuses the same prompt text, a visible Next tap should
  // still return the viewport to the active quiz card.
  finish();
 };
 requestAnimationFrame(check);
}

// The quiz has three next-question owners (normal, infinite/classics, wrong
// review). Listen above all of them and only handle viewport movement here;
// scoring/history/navigation stay owned by their existing runtimes.
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('#nextQuestion'):null;
 if(!target||target.classList.contains('hidden')||target.disabled)return;
 scrollAfterQuestionChanges(marker());
},true);

document.documentElement.dataset.unifiedQuizAutoScroll=VERSION;
})();
