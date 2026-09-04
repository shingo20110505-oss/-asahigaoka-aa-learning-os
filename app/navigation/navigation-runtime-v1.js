(()=>{'use strict';
if(window.__RISE_NAVIGATION_V1__)return;
const CORE_ROUTES=new Set(['home','subjects','analytics','settings']);
const SETTINGS_RENDER_ACTIONS=new Set(['theme','grammar','copy-backup','import-open','import-do','modal-close','reset']);
const root=document.documentElement;
let sequence=0;
function shell(){return window.AA_APP?.get?.('appShell')||null}
function stateRoute(){try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}}
function reviewUrl(){return new URL('./review/',location.href).href}
function isReviewAnchor(el){if(!el||el.tagName!=='A')return false;try{const u=new URL(el.href,location.href),r=new URL(reviewUrl());return u.origin===r.origin&&(u.pathname===r.pathname||u.pathname===`${r.pathname}index.html`)}catch(_){return false}}
function setNavLabel(el,label){if(!el)return false;let changed=false;if(el.getAttribute('aria-label')!==label){el.setAttribute('aria-label',label);changed=true}const span=el.querySelector('span');if(span&&span.textContent!==label){span.textContent=label;changed=true}return changed}
function syncPublicNav(){
 const nav=document.querySelector('#app .nav .navin');if(!nav)return false;
 const home=nav.querySelector('[data-route="home"]');
 const exam=nav.querySelector('[data-route="subjects"]');
 const learning=nav.querySelector('[data-route="analytics"]');
 const review=[...nav.querySelectorAll('a[href]')].find(isReviewAnchor);
 if(!home||!exam||!learning||!review)return false;
 let changed=false;
 changed=setNavLabel(home,'ホーム')||changed;
 changed=setNavLabel(exam,'入試')||changed;
 changed=setNavLabel(learning,'学習')||changed;
 changed=setNavLabel(review,'復習')||changed;
 const ordered=[home,exam,learning,review],children=[...nav.children];
 if(ordered.some((node,i)=>children[i]!==node)||children.length!==ordered.length){nav.replaceChildren(...ordered);changed=true}
 nav.dataset.risePublicNav='home-exam-learning-review';
 return changed;
}
let navSyncRaf=0;
function schedulePublicNavSync(){if(navSyncRaf)return;navSyncRaf=requestAnimationFrame(()=>{navSyncRaf=0;syncPublicNav()})}
function forcePublicNavSync(){syncPublicNav();schedulePublicNavSync()}
function concealLegacyGap(reason){
 root.classList.add('aa-app-booting');
 root.dataset.riseTransition=reason||'legacy-render';
}
function requestRiseRender(route,source,id){
 if(id!==sequence)return;
 document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source:'rise-navigation',route,navigationSource:source,sequence:id}}));
 const app=document.getElementById('app');
 if(app){const pulse=document.createComment(`rise-ui-sync:${id}:${route}`);app.appendChild(pulse);pulse.remove()}
 forcePublicNavSync();
}
function scheduleRiseRender(route,source,id){
 requestRiseRender(route,source,id);
 queueMicrotask(()=>requestRiseRender(route,source,id));
 requestAnimationFrame(()=>requestRiseRender(route,source,id));
 setTimeout(()=>requestRiseRender(route,source,id),40);
 setTimeout(()=>requestRiseRender(route,source,id),140);
}
function scheduleSettingsRecovery(action){
 const route=stateRoute();
 const fire=()=>{
  document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source:'settings-recovery',route,action}}));
  const app=document.getElementById('app');
  if(app){const pulse=document.createComment(`rise-settings-sync:${action}:${Date.now()}`);app.appendChild(pulse);pulse.remove()}
  forcePublicNavSync();
 };
 queueMicrotask(fire);
 requestAnimationFrame(fire);
 setTimeout(fire,40);
 setTimeout(fire,140);
}
function recoverSettingsAction(action){
 if(!SETTINGS_RENDER_ACTIONS.has(action))return false;
 if(stateRoute()!=='settings'&&action!=='theme')return false;
 concealLegacyGap(`settings:${action}`);
 scheduleSettingsRecovery(action);
 return true;
}
function navigateCore(route,source='ui'){
 if(!CORE_ROUTES.has(route))return false;
 const appShell=shell();if(!appShell?.navigate)return false;
 const id=++sequence;
 concealLegacyGap(`route:${route}`);
 root.dataset.riseNavigating=route;
 root.dataset.riseRoute=route;
 try{appShell.navigate(route)}catch(err){root.classList.remove('aa-app-booting');delete root.dataset.riseTransition;delete root.dataset.riseNavigating;root.dataset.riseNavigationError=String(err?.message||err).slice(0,220);return false}
 scheduleRiseRender(route,source,id);
 requestAnimationFrame(()=>{
  if(id!==sequence)return;
  root.dataset.riseRoute=stateRoute();
  delete root.dataset.riseNavigating;
  delete root.dataset.riseNavigationError;
  delete root.dataset.riseTransition;
  forcePublicNavSync();
  document.dispatchEvent(new CustomEvent('rise:navigation',{detail:{route:root.dataset.riseRoute,source,sequence:id}}));
 });
 return true;
}
function navigateReview(source='ui'){
 ++sequence;
 root.dataset.riseNavigating='review';
 document.dispatchEvent(new CustomEvent('rise:navigation',{detail:{route:'review',source,external:true}}));
 location.assign(reviewUrl());
}
document.addEventListener('click',e=>{
 const anchor=e.target.closest?.('a[href]');
 if(isReviewAnchor(anchor)){
  e.preventDefault();e.stopImmediatePropagation();navigateReview('review-link');return;
 }
 const target=e.target.closest?.('[data-route]');
 const route=target?.dataset?.route;
 if(CORE_ROUTES.has(route)){
  e.preventDefault();e.stopImmediatePropagation();navigateCore(route,'route-control');return;
 }
 const actionTarget=e.target.closest?.('[data-action]');
 recoverSettingsAction(actionTarget?.dataset?.action);
},true);
document.addEventListener('change',e=>{
 const actionTarget=e.target.closest?.('[data-action]');
 recoverSettingsAction(actionTarget?.dataset?.action);
},true);
document.addEventListener('rise:settings-changed',e=>{
 if(stateRoute()!=='settings')return;
 concealLegacyGap(`settings:${e.detail?.source||'changed'}`);
 scheduleSettingsRecovery(e.detail?.source||'changed');
});
const app=document.getElementById('app');
if(app)new MutationObserver(forcePublicNavSync).observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',forcePublicNavSync);
document.addEventListener('rise:navigation',forcePublicNavSync);
addEventListener('pageshow',forcePublicNavSync);
forcePublicNavSync();
let stabilizeTicks=0;const stabilizeTimer=setInterval(()=>{forcePublicNavSync();stabilizeTicks++;if(stabilizeTicks>=120)clearInterval(stabilizeTimer)},50);
window.__RISE_NAVIGATION_V1__=Object.freeze({version:'1.0.4',uiSync:'deterministic-public-four-tab-nav-plus-synchronous-boot-stabilization-and-preconceal-settings-recovery',coreRoutes:[...CORE_ROUTES],settingsRenderActions:[...SETTINGS_RENDER_ACTIONS],navigate:navigateCore,review:navigateReview,current:stateRoute,syncPublicNav});
})();