(()=>{'use strict';
const VERSION='1.0.0';
if(window.__AA_READING_GLOSS_TAP_FIX__)return;
window.__AA_READING_GLOSS_TAP_FIX__={version:VERSION};

const stateApi=()=>window.AA_APP?.get?.('state')||null;
const uiApi=()=>window.AA_APP?.get?.('ui')||null;
const getState=()=>stateApi()?.get?.()||null;
const currentReading=s=>{
  const session=s?.session;
  if(!session?.active)return null;
  const item=session.queue?.[session.index];
  return item?.type==='readingSet'?item:null;
};
const enableSupport=(render=false)=>{
  const api=stateApi(),s=api?.get?.();
  if(!s?.profile)return false;
  if(s.profile.vocabSupport===true)return false;
  s.profile.vocabSupport=true;
  api.save?.();
  if(render)uiApi()?.render?.();
  return true;
};

// A scaffolded reading must start with tappable vocabulary support enabled.
// The learner can still turn it OFF explicitly during the session.
document.addEventListener('click',event=>{
  const el=event.target?.closest?.('[data-action]');
  if(!el)return;
  const action=el.dataset.action||'';
  if(action==='start-reading-exam'||action==='ai-reading-exam')return;
  if(action==='start-custom'&&el.dataset.kind==='reading')enableSupport(false);
  else if(action==='ai-reading-scaffold')enableSupport(false);
  else if(action==='another-set'){
    const read=currentReading(getState());
    if(read&&read.assistMode!=='exam')enableSupport(false);
  }
},true);

// Repair sessions saved before this fix where Stage 5 vocabulary diagnosis
// had automatically disabled the tap dictionary even in scaffold mode.
const repairSavedScaffold=()=>{
  const s=getState(),read=currentReading(s);
  if(!read||read.assistMode==='exam'||s?.route!=='study')return;
  enableSupport(true);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(repairSavedScaffold,0),{once:true});
else setTimeout(repairSavedScaffold,0);

// Make tappable words visibly tappable without changing passage layout.
const style=document.createElement('style');
style.id='aa-reading-gloss-tap-fix-style';
style.textContent='.passage .wordTap{text-decoration-line:underline;text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--blue) 55%,transparent);-webkit-tap-highlight-color:color-mix(in srgb,var(--blue) 18%,transparent);touch-action:manipulation}.passage .wordTap:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:3px}.passage .wordTap:active{background:var(--blue2);color:var(--blue)}';
document.head.appendChild(style);
})();
