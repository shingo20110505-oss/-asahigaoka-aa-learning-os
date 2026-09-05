(()=>{'use strict';
const VERSION='1.1.0';
if(window.__AA_READING_GLOSS_TAP_FIX__)return;
const STATUS=window.__AA_READING_GLOSS_TAP_FIX__={version:VERSION,allWordsTappable:false,unregisteredTaps:0,lastUnregistered:null};

const stateApi=()=>window.AA_APP?.get?.('state')||null;
const uiApi=()=>window.AA_APP?.get?.('ui')||null;
const getState=()=>stateApi()?.get?.()||null;
const currentReading=s=>{
  const session=s?.session;
  if(!session?.active)return null;
  const item=session.queue?.[session.index];
  return item?.type==='readingSet'?item:null;
};
const enableSupport=(renderNow=false)=>{
  const api=stateApi(),s=api?.get?.();
  if(!s?.profile)return false;
  if(s.profile.vocabSupport===true)return false;
  s.profile.vocabSupport=true;
  api.save?.();
  if(renderNow)uiApi()?.render?.();
  return true;
};
const cleanWord=word=>String(word||'').toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g,'');

// Scaffolded reading always starts with vocabulary tapping enabled.
// Exam reading keeps vocabulary support disabled.
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

// Repair scaffold sessions saved while Stage 5 diagnosis had disabled support.
const repairSavedScaffold=()=>{
  const s=getState(),read=currentReading(s);
  if(!read||read.assistMode==='exam'||s?.route!=='study')return;
  enableSupport(true);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(repairSavedScaffold,0),{once:true});
else setTimeout(repairSavedScaffold,0);

// In scaffold mode every English word is tappable. Registered words show their
// normal gloss. Unregistered words are marked and open the existing gloss modal,
// which clearly says "内蔵辞書に未登録" instead of silently doing nothing.
function installAllWordTap(attempt=0){
  try{
    if(typeof renderPassage!=='function'||typeof glossLookup!=='function'||typeof esc!=='function'||typeof state==='undefined'){
      if(attempt<100)setTimeout(()=>installAllWordTap(attempt+1),50);
      return;
    }
    if(renderPassage.__aaAllWordsTapV11){STATUS.allWordsTappable=true;return}
    renderPassage=function(read){
      if(read?.assistMode==='exam'||!state.profile.vocabSupport)return esc(read.passage);
      return String(read.passage).split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g).map(part=>{
        if(!/^[A-Za-z]/.test(part))return esc(part);
        const g=glossLookup(part),missing=!g?.meaning;
        const missingAttr=missing?' data-gloss-missing="1" title="辞書未登録"':'';
        const missingClass=missing?' wordTap--missing':'';
        const aria=missing?`${part} は辞書未登録。確認する`:`${part} の意味を見る`;
        return `<button type="button" class="wordTap${missingClass}" data-action="gloss" data-word="${esc(part)}"${missingAttr} aria-label="${esc(aria)}">${esc(part)}</button>`;
      }).join('');
    };
    renderPassage.__aaAllWordsTapV11=true;
    STATUS.allWordsTappable=true;
    try{if(state?.route==='study'&&state?.session?.active&&typeof render==='function')render()}catch(_){ }
  }catch(_){if(attempt<100)setTimeout(()=>installAllWordTap(attempt+1),50)}
}
installAllWordTap();

document.addEventListener('click',event=>{
  const el=event.target?.closest?.('[data-action="gloss"][data-gloss-missing="1"]');
  if(!el)return;
  STATUS.unregisteredTaps++;
  STATUS.lastUnregistered=cleanWord(el.dataset.word);
},true);

// Registered = blue dotted underline. Unregistered = warm dashed underline +
// very light background so learners can see coverage gaps before tapping.
const style=document.createElement('style');
style.id='aa-reading-gloss-tap-fix-style';
style.textContent='.passage .wordTap{text-decoration-line:underline;text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--blue) 55%,transparent);-webkit-tap-highlight-color:color-mix(in srgb,var(--blue) 18%,transparent);touch-action:manipulation}.passage .wordTap.wordTap--missing{text-decoration-style:dashed;text-decoration-thickness:1.5px;text-decoration-color:#b7791f;background:color-mix(in srgb,#f6ad55 9%,transparent);border-radius:3px}.passage .wordTap:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:3px}.passage .wordTap.wordTap--missing:focus-visible{outline-color:#b7791f}.passage .wordTap:active{background:var(--blue2);color:var(--blue)}.passage .wordTap.wordTap--missing:active{background:color-mix(in srgb,#f6ad55 20%,transparent);color:inherit}';
document.head.appendChild(style);
})();
