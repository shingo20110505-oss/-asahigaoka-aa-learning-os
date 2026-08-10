(()=>{'use strict';
if(window.__AA_COMPANION7_ENTRY__)return;window.__AA_COMPANION7_ENTRY__=true;
function killVisuals(){for(const id of ['companion7','aaPet','aaPetSheet','aaPetSettingCard','petSettingWrap','petSettingCard'])document.getElementById(id)?.remove()}
function patchVersion(){document.querySelectorAll('.tiny').forEach(el=>{if(el.textContent&&el.textContent.includes('版 2.2.7'))el.textContent=el.textContent.replace('版 2.2.7','版 2.2.9')})}
let queued=false;function patch(){queued=false;patchVersion();killVisuals()}function queuePatch(){if(queued)return;queued=true;requestAnimationFrame(patch)}
new MutationObserver(queuePatch).observe(document.documentElement,{childList:true,subtree:true});addEventListener('hashchange',queuePatch);addEventListener('popstate',queuePatch);document.addEventListener('click',()=>setTimeout(queuePatch,0),true);setTimeout(queuePatch,0);setTimeout(queuePatch,700);
async function forceCurrentSW(){if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('aa229-controller-refresh'))return;sessionStorage.setItem('aa229-controller-refresh','1');location.reload()},{once:true})}catch(e){console.warn('AA 2.2.9 SW refresh failed',e)}}
forceCurrentSW();killVisuals();
const s=document.createElement('script');s.src='./companion7-runtime.js?v=7.4.2-voice';s.async=false;s.onload=()=>{killVisuals();queuePatch()};s.onerror=()=>console.error('Companion voice runtime failed to load');document.head.appendChild(s);
})();