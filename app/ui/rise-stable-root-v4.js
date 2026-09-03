(()=>{'use strict';
if(window.__RISE_STABLE_ROOT_V4__)return;
window.__RISE_STABLE_ROOT_V4__={version:'2.3.0',performance:'2.4',navigation:'instant-four-tab',firstLoad:'immediate-capture',prewarm:'none-on-demand',reviewNavigation:'canonical-page'};
const root=document.documentElement,app=document.getElementById('app');
if(!app)return;
const host=document.createElement('main');
host.id='riseStableMain';host.hidden=true;host.setAttribute('aria-live','polite');
const panesHost=document.createElement('div');panesHost.id='riseStablePanes';host.appendChild(panesHost);
app.insertAdjacentElement('afterend',host);
const custom={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const panelSelector=Object.values(custom).map(s=>`${s}[data-ui-ver="4.2.0"]`).join(',');
const params=new URLSearchParams(location.search),visualRoute=params.get('visual_route');
const visualMode=params.get('visual_verify')==='1'&&Object.hasOwn(custom,visualRoute||'');
let visualRouteApplied=false,displayRoute='home',timer=0;
const panes=new Map(),sources=new Map();
function normalizeRoute(r){return ['subjects','mission','study','timeline'].includes(r)?'subjects':r==='analytics'?'analytics':r==='settings'?'settings':'home'}
function stateRoute(){try{return normalizeRoute(window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home')}catch(_){return normalizeRoute(root.dataset.riseRoute||'home')}}
function ensureStyle(){if(document.getElementById('rise-instant-nav-v1'))return;const s=document.createElement('style');s.id='rise-instant-nav-v1';s.textContent='html[data-rise-structure="optimized-4"] #riseStableMain>#riseStablePanes{display:block!important;width:100%}.riseStablePane[hidden]{display:none!important}.riseStablePane{display:block!important;width:100%}';document.head.appendChild(s)}
ensureStyle();
function pane(r){let p=panes.get(r);if(p)return p;p=document.createElement('div');p.className='riseStablePane';p.dataset.route=r;p.hidden=true;panes.set(r,p);panesHost.appendChild(p);return p}
function updateNav(r){for(const el of document.querySelectorAll('.navin > [data-route],.navin > a[href]')){const active=!!el.dataset?.route&&normalizeRoute(el.dataset.route)===r;el.classList.toggle('active',active)}}
function show(r){const p=panes.get(r);if(!p)return false;displayRoute=r;for(const [key,node] of panes)node.hidden=key!==r;host.hidden=false;host.dataset.route=r;root.dataset.riseRoute=r;root.dataset.riseStableReady='1';root.dataset.riseHydrated='1';root.dataset.riseInstantNav='1';root.removeAttribute('data-rise-runtime-error');updateNav(r);return true}
function cacheSource(r,source){const previous=sources.get(r);if(previous===source&&panes.get(r)?.firstChild)return;const p=pane(r);p.replaceChildren(source.cloneNode(true));sources.set(r,source)}
function routeForPanel(source){for(const [r,s] of Object.entries(custom))if(source.matches?.(s))return r;return null}
function captureAdded(node){if(node?.nodeType!==1)return false;const source=node.matches?.(panelSelector)?node:node.querySelector?.(panelSelector);if(!source)return false;const r=routeForPanel(source);if(!r)return false;cacheSource(r,source);if(displayRoute===r||(!host.dataset.route&&r==='home'))show(r);return true}
function isReviewLink(a){if(!a||a.tagName!=='A')return false;try{const u=new URL(a.href,location.href),review=new URL('./review/',location.href);return u.origin===review.origin&&u.pathname===review.pathname}catch(_){return false}}
function goReview(){location.assign(new URL('./review/',location.href).href)}
function applyVisualRoute(){if(!visualMode||visualRouteApplied)return;const target=app.querySelector(`[data-route="${visualRoute}"]`);if(!target)return;visualRouteApplied=true;displayRoute=normalizeRoute(visualRoute);target.click()}
function schedule(delay=24){if(timer)return;timer=setTimeout(()=>{timer=0;sync()},delay)}
function sync(){
 applyVisualRoute();
 const actual=stateRoute(),selector=custom[actual];
 if(selector){const source=app.querySelector(`main ${selector}[data-ui-ver="4.2.0"]`);if(source)cacheSource(actual,source)}
 if(panes.has(displayRoute)){show(displayRoute);return}
 if(!host.dataset.route&&panes.has(actual)){displayRoute=actual;show(actual);return}
 if(host.querySelector('.riseStablePane:not([hidden])'))return;
 host.hidden=true;root.removeAttribute('data-rise-stable-ready');
}
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a[href]');
 if(isReviewLink(a)){
  e.preventDefault();e.stopImmediatePropagation();
  goReview();return;
 }
 const target=e.target.closest?.('[data-route]');if(!target)return;
 const r=normalizeRoute(target.dataset.route);if(!Object.hasOwn(custom,r))return;
 displayRoute=r;root.dataset.riseRoute=r;
 if(panes.has(r))show(r);else schedule(0);
},true);
const mo=new MutationObserver(mutations=>{let changed=false;for(const m of mutations){if(m.type!=='childList')continue;for(const n of m.addedNodes)if(captureAdded(n))return;if(m.addedNodes.length||m.removedNodes.length)changed=true}if(changed)schedule()});mo.observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',()=>schedule(0));document.addEventListener('rise:sw-updated',()=>schedule(0));addEventListener('pageshow',()=>schedule(0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0)});
requestAnimationFrame(()=>sync());
let attempts=0;const boot=setInterval(()=>{attempts++;sync();if(root.dataset.riseStableReady==='1'||attempts>=24)clearInterval(boot)},250);
})();