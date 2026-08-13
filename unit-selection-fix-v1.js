/* 旭丘AA Learning OS — unit selection reliability fix v1.0.0 */
(()=>{'use strict';
if(window.__AA_UNIT_SELECTION_FIX_V1__)return;
window.__AA_UNIT_SELECTION_FIX_V1__=true;
let timer=0;
const actions={practice:'practice-unit',exam:'exam-unit'};
const sameUnits=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
function checkedUnits(action){
 return [...document.querySelectorAll(`[data-action="${action}"]:checked`)].map(el=>el.value);
}
function sync(action,{rerender=false,restoreLast=true}={}){
 const api=window.AA_V22_TEST_API;
 if(!api||typeof state==='undefined'||!state?.ui)return false;
 let units=checkedUnits(action);
 if(!units.length&&restoreLast){
  const current=action===actions.practice
   ? (state.ui.practiceConfig?.unitsBySubject?.[state.ui.practiceConfig?.subject]||[])
   : (state.ui.examConfig?.units||[]);
  const keep=current[0];
  if(keep){
   const input=[...document.querySelectorAll(`[data-action="${action}"]`)].find(el=>el.value===keep);
   if(input){input.checked=true;units=[keep]}
  }
 }
 if(!units.length)return false;
 let changed=false;
 if(action===actions.practice){
  const current=state.ui.practiceConfig||{};
  const subject=current.subject||state.ui.testSubject||'japanese';
  const configured=current.unitsBySubject?.[subject]||[];
  if(!sameUnits(configured,units)){
   const unitsBySubject={...(current.unitsBySubject||{}),[subject]:units};
   state.ui.practiceConfig=api.normalizePracticeConfig({...current,subject,unitsBySubject});
   changed=true;
  }
 }else if(action===actions.exam){
  const current=state.ui.examConfig||{};
  const configured=current.units||[];
  if(current.scope!=='custom'||!sameUnits(configured,units)){
   const next=api.normalizeConfig({...current,scope:'custom',units});
   state.ui.examConfig=next;
   state.ui.testSubject=next.subject;
   state.ui.testCourseLevel=next.level;
   changed=true;
  }
 }
 if(changed&&typeof save==='function')save();
 if(changed&&rerender&&typeof render==='function')render();
 return changed;
}
function schedule(action){
 clearTimeout(timer);
 timer=setTimeout(()=>sync(action,{rerender:true}),0);
}
document.addEventListener('click',event=>{
 const unit=event.target?.closest?.('[data-action="practice-unit"],[data-action="exam-unit"]');
 if(unit){schedule(unit.dataset.action);return}
 const start=event.target?.closest?.('[data-action="start-unit-practice"],[data-action="start-exam-v22"],[data-action="start-aichi-test"]');
 if(!start)return;
 if(start.dataset.action==='start-unit-practice')sync(actions.practice,{rerender:false});
 else sync(actions.exam,{rerender:false});
},true);
document.addEventListener('change',event=>{
 const unit=event.target?.closest?.('[data-action="practice-unit"],[data-action="exam-unit"]');
 if(unit)schedule(unit.dataset.action);
},true);
window.AA_UNIT_SELECTION_FIX={version:'1.0.0',syncPractice:()=>sync(actions.practice,{rerender:true}),syncExam:()=>sync(actions.exam,{rerender:true})};
})();
