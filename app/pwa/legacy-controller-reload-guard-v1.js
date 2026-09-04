(()=>{'use strict';
if(window.__RISE_LEGACY_SW_RELOAD_GUARD__)return;
window.__RISE_LEGACY_SW_RELOAD_GUARD__={version:'1.0.0',blocked:0,canonicalNav:'home-exam-learning-review'};
const root=document.documentElement;
const app=document.getElementById('app');
const sw=navigator.serviceWorker;
const navIcon={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M9 20v-6h6v6"/></svg>',
 exam:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v17H7a2.5 2.5 0 0 0-2.5 2z"/><path d="M19.5 5.5A2.5 2.5 0 0 0 17 3h-5v17h5a2.5 2.5 0 0 1 2.5 2z"/></svg>',
 learn:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V4m7 15v-7"/></svg>',
 review:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 5v6h-6"/></svg>'
};
function stateRoute(){try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}}
function navRoute(route){return ['subjects','mission','study','timeline'].includes(route)?'subjects':route==='analytics'?'analytics':'home'}
function routeButton(route,label,icon){const active=navRoute(stateRoute())===route?' active':'';return `<button type="button" class="${active.trim()}" data-route="${route}" aria-label="${label}"${active?' aria-current="page"':''}><b>${icon}</b><span>${label}</span></button>`}
function canonicalNavHTML(){return routeButton('home','ホーム',navIcon.home)+routeButton('subjects','入試',navIcon.exam)+routeButton('analytics','学習',navIcon.learn)+`<a href="./review/" aria-label="復習"><b>${navIcon.review}</b><span>復習</span></a>`}
function ensureCanonicalNav(){
 if(!app)return false;
 let shell=app.querySelector('.nav');
 if(!shell){if(!app.querySelector('main'))return false;shell=document.createElement('nav');shell.className='nav';shell.setAttribute('aria-label','メインナビゲーション');app.appendChild(shell)}
 let inner=shell.querySelector('.navin');if(!inner){inner=document.createElement('div');inner.className='navin';shell.replaceChildren(inner)}
 const route=navRoute(stateRoute()),sig=`complete:${route}`;
 const labels=[...inner.querySelectorAll(':scope > * > span')].map(x=>x.textContent?.trim()).join('/');
 const hasRoutes=!!inner.querySelector('[data-route="home"]')&&!!inner.querySelector('[data-route="subjects"]')&&!!inner.querySelector('[data-route="analytics"]')&&!!inner.querySelector('a[href*="review"]');
 if(inner.dataset.risePublicNav!=='home-exam-learning-review'||inner.dataset.riseNav!==sig||labels!=='ホーム/入試/学習/復習'||!hasRoutes){inner.innerHTML=canonicalNavHTML()}
 inner.dataset.riseNav=sig;
 inner.dataset.risePublicNav='home-exam-learning-review';
 inner.dataset.riseCanonicalOwner='boot-recovery-v1';
 const current=navRoute(stateRoute());
 for(const node of inner.querySelectorAll(':scope > *')){const active=node.dataset.route===current;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current')}
 return true;
}
let navRaf=0;function scheduleCanonicalNav(){if(navRaf)return;navRaf=requestAnimationFrame(()=>{navRaf=0;ensureCanonicalNav()})}
if(app){new MutationObserver(scheduleCanonicalNav).observe(app,{childList:true,subtree:true});scheduleCanonicalNav();document.addEventListener('aa:v23ready',scheduleCanonicalNav);document.addEventListener('rise:navigation',scheduleCanonicalNav);addEventListener('pageshow',scheduleCanonicalNav)}
let retrying=false;
async function refreshStaleRise(e){
 e?.preventDefault?.();e?.stopImmediatePropagation?.();if(retrying)return;retrying=true;
 root.classList.remove('aa-app-boot-error');root.classList.add('aa-app-booting','aa-app-boot-slow');
 try{const reg=await navigator.serviceWorker?.getRegistration?.();await reg?.update?.();reg?.waiting?.postMessage?.({type:'SKIP_WAITING'})}catch(_){}
 const u=new URL(location.href);u.searchParams.set('rise_refresh',Date.now().toString(36));location.replace(u.href);
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#riseBootRetry'))void refreshStaleRise(e)},true);
if(!sw||typeof sw.addEventListener!=='function')return;
const nativeAdd=sw.addEventListener.bind(sw);
const nativeRemove=sw.removeEventListener.bind(sw);
const blocked=new WeakSet();
function isLegacyReloadListener(type,listener){
 if(type!=='controllerchange'||typeof listener!=='function')return false;
 try{
  const source=Function.prototype.toString.call(listener);
  return /location\.reload\s*\(/.test(source)&&(source.includes('PWA.reloading')||source.includes('controllerchange'));
 }catch(_){return false}
}
sw.addEventListener=function(type,listener,options){
 if(isLegacyReloadListener(type,listener)){
  blocked.add(listener);
  window.__RISE_LEGACY_SW_RELOAD_GUARD__.blocked++;
  document.documentElement.dataset.riseLegacyReloadBlocked='1';
  return;
 }
 return nativeAdd(type,listener,options);
};
sw.removeEventListener=function(type,listener,options){
 if(blocked.has(listener))return;
 return nativeRemove(type,listener,options);
};
})();
