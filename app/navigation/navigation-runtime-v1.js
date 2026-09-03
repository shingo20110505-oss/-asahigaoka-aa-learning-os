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
function concealLegacyGap(reason){
 root.classList.add('aa-app-booting');
 root.dataset.riseTransition=reason||'legacy-render';
}
function requestRiseRender(route,source,id){
 if(id!==sequence)return;
 document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source:'rise-navigation',route,navigationSource:source,sequence:id}}));
 const app=document.getElementById('app');
 if(app){const pulse=document.createComment(`rise-ui-sync:${id}:${route}`);app.appendChild(pulse);pulse.remove()}
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
window.__RISE_NAVIGATION_V1__=Object.freeze({version:'1.0.3',uiSync:'preconceal-all-settings-legacy-renders-and-deterministic-multiphase-rise-recovery',coreRoutes:[...CORE_ROUTES],settingsRenderActions:[...SETTINGS_RENDER_ACTIONS],navigate:navigateCore,review:navigateReview,current:stateRoute});
})();
