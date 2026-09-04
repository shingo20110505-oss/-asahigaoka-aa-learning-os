(()=>{'use strict';
if(window.__RISE_NAVIGATION_V1__)return;
const CORE_ROUTES=new Set(['home','subjects','analytics','settings']);
const SETTINGS_RENDER_ACTIONS=new Set(['theme','grammar','copy-backup','import-open','import-do','modal-close','reset']);
const root=document.documentElement;
let sequence=0,navSyncRaf=0;
function shell(){return window.AA_APP?.get?.('appShell')||null}
function stateRoute(){try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}}
function navRoute(route){return ['subjects','mission','study','timeline'].includes(route)?'subjects':route==='analytics'?'analytics':'home'}
function reviewUrl(){return new URL('./review/',location.href).href}
function isReviewAnchor(el){if(!el||el.tagName!=='A')return false;try{const u=new URL(el.href,location.href),r=new URL(reviewUrl());return u.origin===r.origin&&(u.pathname===r.pathname||u.pathname===`${r.pathname}index.html`)}catch(_){return false}}
const icons={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M9 20v-6h6v6"/></svg>',
 study:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v17H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M19.5 5.5A2.5 2.5 0 0 0 17 3h-5v17h5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
 record:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9m7 10V4m7 15v-7"/></svg>',
 review:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 5v6h-6"/></svg>'
};
function fallbackNavHtml(route){const r=navRoute(route),active=x=>r===x?'active':'';return `<button type="button" class="${active('home')}" data-route="home" aria-label="ホーム"><b>${icons.home}</b><span>ホーム</span></button><button type="button" class="${active('subjects')}" data-route="subjects" aria-label="入試"><b>${icons.study}</b><span>入試</span></button><button type="button" class="${active('analytics')}" data-route="analytics" aria-label="学習"><b>${icons.record}</b><span>学習</span></button><a href="./review/" aria-label="復習"><b>${icons.review}</b><span>復習</span></a>`}
function ensurePublicNav(){
 const app=document.getElementById('app');if(!app)return null;
 let navShell=app.querySelector('.nav');
 if(!navShell){navShell=document.createElement('nav');navShell.className='nav';navShell.setAttribute('aria-label','主要ナビゲーション');navShell.dataset.riseNavBootstrap='1';app.appendChild(navShell)}
 let nav=navShell.querySelector('.navin');
 if(!nav){nav=document.createElement('div');nav.className='navin';navShell.replaceChildren(nav)}
 const home=nav.querySelector('[data-route="home"]'),exam=nav.querySelector('[data-route="subjects"]'),learning=nav.querySelector('[data-route="analytics"]'),review=[...nav.querySelectorAll('a[href]')].find(isReviewAnchor);
 if(!home||!exam||!learning||!review){nav.innerHTML=fallbackNavHtml(stateRoute())}
 nav.dataset.riseNav=`complete:${navRoute(stateRoute())}`;
 return nav;
}
function setNavLabel(el,label){if(!el)return false;let changed=false;if(el.getAttribute('aria-label')!==label){el.setAttribute('aria-label',label);changed=true}const span=el.querySelector('span');if(span&&span.textContent!==label){span.textContent=label;changed=true}return changed}
function syncPublicNav(){
 const nav=ensurePublicNav();if(!nav)return false;
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
 const active=navRoute(stateRoute());
 for(const node of [home,exam,learning]){const should=node.dataset.route===active;if(node.classList.contains('active')!==should){node.classList.toggle('active',should);changed=true}}
 nav.dataset.riseNav=`complete:${active}`;
 nav.dataset.risePublicNav='home-exam-learning-review';
 return changed;
}
function schedulePublicNavSync(){if(navSyncRaf)return;navSyncRaf=requestAnimationFrame(()=>{navSyncRaf=0;syncPublicNav()})}
function forcePublicNavSync(){syncPublicNav();schedulePublicNavSync()}
function concealLegacyGap(reason){root.classList.add('aa-app-booting');root.dataset.riseTransition=reason||'legacy-render'}
function requestRiseRender(route,source,id){if(id!==sequence)return;document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source:'rise-navigation',route,navigationSource:source,sequence:id}}));const app=document.getElementById('app');if(app){const pulse=document.createComment(`rise-ui-sync:${id}:${route}`);app.appendChild(pulse);pulse.remove()}forcePublicNavSync()}
function scheduleRiseRender(route,source,id){requestRiseRender(route,source,id);queueMicrotask(()=>requestRiseRender(route,source,id));requestAnimationFrame(()=>requestRiseRender(route,source,id));setTimeout(()=>requestRiseRender(route,source,id),40);setTimeout(()=>requestRiseRender(route,source,id),140)}
function scheduleSettingsRecovery(action){const route=stateRoute();const fire=()=>{document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source:'settings-recovery',route,action}}));const app=document.getElementById('app');if(app){const pulse=document.createComment(`rise-settings-sync:${action}:${Date.now()}`);app.appendChild(pulse);pulse.remove()}forcePublicNavSync()};queueMicrotask(fire);requestAnimationFrame(fire);setTimeout(fire,40);setTimeout(fire,140)}
function recoverSettingsAction(action){if(!SETTINGS_RENDER_ACTIONS.has(action))return false;if(stateRoute()!=='settings'&&action!=='theme')return false;concealLegacyGap(`settings:${action}`);scheduleSettingsRecovery(action);return true}
function navigateCore(route,source='ui'){
 if(!CORE_ROUTES.has(route))return false;
 const appShell=shell();if(!appShell?.navigate)return false;
 const id=++sequence;concealLegacyGap(`route:${route}`);root.dataset.riseNavigating=route;root.dataset.riseRoute=route;
 try{appShell.navigate(route)}catch(err){root.classList.remove('aa-app-booting');delete root.dataset.riseTransition;delete root.dataset.riseNavigating;root.dataset.riseNavigationError=String(err?.message||err).slice(0,220);return false}
 scheduleRiseRender(route,source,id);
 requestAnimationFrame(()=>{if(id!==sequence)return;root.dataset.riseRoute=stateRoute();delete root.dataset.riseNavigating;delete root.dataset.riseNavigationError;delete root.dataset.riseTransition;forcePublicNavSync();document.dispatchEvent(new CustomEvent('rise:navigation',{detail:{route:root.dataset.riseRoute,source,sequence:id}}))});
 return true;
}
function navigateReview(source='ui'){++sequence;root.dataset.riseNavigating='review';document.dispatchEvent(new CustomEvent('rise:navigation',{detail:{route:'review',source,external:true}}));location.assign(reviewUrl())}
document.addEventListener('click',e=>{const anchor=e.target.closest?.('a[href]');if(isReviewAnchor(anchor)){e.preventDefault();e.stopImmediatePropagation();navigateReview('review-link');return}const target=e.target.closest?.('[data-route]'),route=target?.dataset?.route;if(CORE_ROUTES.has(route)){e.preventDefault();e.stopImmediatePropagation();navigateCore(route,'route-control');return}const actionTarget=e.target.closest?.('[data-action]');recoverSettingsAction(actionTarget?.dataset?.action)},true);
document.addEventListener('change',e=>{const actionTarget=e.target.closest?.('[data-action]');recoverSettingsAction(actionTarget?.dataset?.action)},true);
document.addEventListener('rise:settings-changed',e=>{if(stateRoute()!=='settings')return;concealLegacyGap(`settings:${e.detail?.source||'changed'}`);scheduleSettingsRecovery(e.detail?.source||'changed')});
const app=document.getElementById('app');if(app)new MutationObserver(schedulePublicNavSync).observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',schedulePublicNavSync);document.addEventListener('rise:navigation',schedulePublicNavSync);addEventListener('pageshow',forcePublicNavSync);
forcePublicNavSync();
for(const delay of [0,80,240,700,1600,3200])setTimeout(forcePublicNavSync,delay);
window.__RISE_NAVIGATION_V1__=Object.freeze({version:'1.0.5',uiSync:'self-healing-public-four-tab-nav-with-coalesced-observation',coreRoutes:[...CORE_ROUTES],settingsRenderActions:[...SETTINGS_RENDER_ACTIONS],navigate:navigateCore,review:navigateReview,current:stateRoute,syncPublicNav});
})();