(()=>{'use strict';
if(window.__CHRONOLOGIA_C7_BRIDGE__)return;window.__CHRONOLOGIA_C7_BRIDGE__=true;
function killLegacy(){document.getElementById('chronoCompanion')?.remove();document.getElementById('ccToggle')?.remove();document.getElementById('ccPanel')?.remove();document.querySelectorAll('style').forEach(s=>{if((s.textContent||'').includes('#chronoCompanion'))s.remove()})}
function relay(type,detail={}){if(window.Companion7){if(type==='answer')Companion7.event(detail.correct?'correct':'wrong');else if(type==='streak')Companion7.event('streak');else if(type==='hard')Companion7.event('hard');else if(type==='complete')Companion7.event('complete')}}
killLegacy();
new MutationObserver(killLegacy).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('aa:answer',e=>relay('answer',e.detail||{}));
document.addEventListener('aa:streak',()=>relay('streak'));
document.addEventListener('aa:hard',()=>relay('hard'));
document.addEventListener('aa:missionComplete',()=>relay('complete'));
document.addEventListener('chronologia:voice',e=>{if(window.Companion7&&e.detail?.audio)Companion7.bindAudio(e.detail.audio)});
function loadScript(src){return new Promise(resolve=>{const base=src.split('?')[0];const found=document.querySelector(`script[src^="${base}"]`);if(found){if(found.dataset.loaded==='1')resolve();else{found.addEventListener('load',resolve,{once:true});found.addEventListener('error',resolve,{once:true})}return}const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=resolve;document.head.appendChild(s)})}
async function ensureChronologia7(){if(window.__CHRONOLOGIA_V7_RUNTIME__||document.querySelector('script[data-chronologia-v7]'))return;await loadScript('./chronologia-v7-data-3.js?v=7.1.0');await loadScript('./chronologia-v7-data-4.js?v=7.2.0');try{if(window.CHRONO_V7_EXTRA_READY)await window.CHRONO_V7_EXTRA_READY}catch(e){console.error('Chronologia 1000-item supplement failed',e)}if(window.__CHRONOLOGIA_V7_RUNTIME__)return;const s=document.createElement('script');s.dataset.chronologiaV7='1';s.src='./chronologia-v7-runtime.js?v=7.2.0';s.async=false;document.head.appendChild(s)}
function ensureDeepExplanations(){return loadScript('./chronologia-deep-explanations-v1.js?v=1.0.0')}
function ensure(){killLegacy();if(window.Companion7)return;if(!document.querySelector('script[data-c7-bridge]')){const s=document.createElement('script');s.dataset.c7Bridge='1';s.src='./companion7-runtime.js?v=7.4.0';s.async=false;document.head.appendChild(s)}}
function boot(){ensureChronologia7();ensureDeepExplanations();ensure()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();