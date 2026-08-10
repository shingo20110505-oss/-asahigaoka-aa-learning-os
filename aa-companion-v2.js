(()=>{'use strict';
if(window.__AA_COMPANION7_ENTRY__)return;window.__AA_COMPANION7_ENTRY__=true;
const PET_KEY='aa-companion7-state-v3';
function readPet(){try{return JSON.parse(localStorage.getItem(PET_KEY)||'{}').visible!==false}catch(_){return true}}
function writePet(v){try{const x=JSON.parse(localStorage.getItem(PET_KEY)||'{}');x.visible=!!v;localStorage.setItem(PET_KEY,JSON.stringify(x))}catch(_){}try{window.Companion7?.show?.(!!v)}catch(_){}const h=document.getElementById('companion7');if(h)h.dataset.hidden=String(!v);syncButton()}
function syncButton(){const b=document.getElementById('aaPetDisplayToggle');if(!b)return;const on=readPet();b.textContent='相棒表示 '+(on?'ON':'OFF');b.className='btn '+(on?'primary':'ghost')}
function patchVersion(){document.querySelectorAll('.tiny').forEach(el=>{if(el.textContent&&el.textContent.includes('版 2.2.7'))el.textContent=el.textContent.replace('版 2.2.7','版 2.2.9')})}
function settingsOpen(){return [...document.querySelectorAll('h1,h2,.h2')].some(el=>/設定・データ/.test(el.textContent||''))}
function ensurePetCard(){if(!settingsOpen())return;let card=document.getElementById('aaPetSettingCard');if(card){syncButton();return}const main=document.querySelector('main');if(!main)return;card=document.createElement('section');card.className='card';card.id='aaPetSettingCard';card.style.marginTop='12px';card.innerHTML='<div class="eyebrow">COMPANION</div><h3 class="h3">相棒（ペット）表示</h3><p class="sub">学習画面に相棒を表示するか選べます。設定はこの端末に保存されます。</p><div class="actions"><button class="btn primary" id="aaPetDisplayToggle" type="button">相棒表示 ON</button></div><div class="tiny" style="margin-top:8px">OFFにしても学習データや相棒の位置・設定は消えません。</div>';
const pwa=[...main.querySelectorAll('section.card')].find(x=>(x.textContent||'').includes('ホーム画面・オフライン'));if(pwa&&pwa.parentNode)pwa.insertAdjacentElement('afterend',card);else main.appendChild(card);card.querySelector('#aaPetDisplayToggle')?.addEventListener('click',()=>writePet(!readPet()));syncButton()}
let queued=false;function patch(){queued=false;patchVersion();ensurePetCard();const h=document.getElementById('companion7');if(h)h.dataset.hidden=String(!readPet())}
function queuePatch(){if(queued)return;queued=true;requestAnimationFrame(patch)}
new MutationObserver(queuePatch).observe(document.documentElement,{childList:true,subtree:true});
addEventListener('hashchange',queuePatch);addEventListener('popstate',queuePatch);document.addEventListener('click',()=>setTimeout(queuePatch,0),true);setTimeout(queuePatch,0);setTimeout(queuePatch,700);
async function forceCurrentSW(){if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;try{const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('aa229-controller-refresh'))return;sessionStorage.setItem('aa229-controller-refresh','1');location.reload()},{once:true})}catch(e){console.warn('AA 2.2.9 SW refresh failed',e)}}
forceCurrentSW();
document.getElementById('aaPet')?.remove();document.getElementById('aaPetSheet')?.remove();
const s=document.createElement('script');s.src='./companion7-runtime.js?v=7.4-petfix1';s.async=false;s.onload=()=>{document.getElementById('aaPet')?.remove();document.getElementById('aaPetSheet')?.remove();writePet(readPet());queuePatch()};s.onerror=()=>console.error('Companion 7.4 runtime failed to load');document.head.appendChild(s);
})();