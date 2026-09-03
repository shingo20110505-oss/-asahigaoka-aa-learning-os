(()=>{'use strict';
if(window.__RISE_STABLE_ROOT_V4__)return;
window.__RISE_STABLE_ROOT_V4__={version:'2.1.0',performance:'2.2',navigation:'instant-four-tab',firstLoad:'prewarm-all-four'};
const root=document.documentElement,app=document.getElementById('app');
if(!app)return;
const host=document.createElement('main');
host.id='riseStableMain';host.hidden=true;host.setAttribute('aria-live','polite');
const panesHost=document.createElement('div');panesHost.id='riseStablePanes';host.appendChild(panesHost);
app.insertAdjacentElement('afterend',host);
const custom={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const primary=['home','subjects','analytics'];
const panelSelector=Object.values(custom).map(s=>`${s}[data-ui-ver="4.2.0"]`).join(',');
const params=new URLSearchParams(location.search),visualRoute=params.get('visual_route');
const visualMode=params.get('visual_verify')==='1'&&Object.hasOwn(custom,visualRoute||'');
const qualityMode=params.get('aa_quality_ci')==='1';
let visualRouteApplied=false,displayRoute='home',warming=false,warmStarted=false,warmClick=false,userChoiceEpoch=0,timer=0;
const panes=new Map(),sources=new Map();
function normalizeRoute(r){return ['subjects','mission','study','timeline'].includes(r)?'subjects':r==='analytics'?'analytics':r==='settings'?'settings':'home'}
function stateRoute(){try{return normalizeRoute(window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home')}catch(_){return normalizeRoute(root.dataset.riseRoute||'home')}}
function ensureStyle(){if(document.getElementById('rise-instant-nav-v1'))return;const s=document.createElement('style');s.id='rise-instant-nav-v1';s.textContent='#riseStablePanes{width:100%}.riseStablePane[hidden]{display:none!important}.riseStablePane{width:100%}.riseStableReviewPane{height:calc(100dvh - 150px);min-height:540px;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:rgba(12,29,60,.30);box-shadow:0 24px 64px rgba(5,13,35,.22)}.riseStableReviewFrame{display:block;width:100%;height:100%;border:0;background:transparent}@media(max-width:700px){.riseStableReviewPane{height:calc(100dvh - 132px);min-height:500px;border-radius:20px}}';document.head.appendChild(s)}
ensureStyle();
function pane(r,extra=''){let p=panes.get(r);if(p)return p;p=document.createElement('div');p.className=`riseStablePane ${extra}`.trim();p.dataset.route=r;p.hidden=true;panes.set(r,p);panesHost.appendChild(p);return p}
function updateNav(r){for(const el of document.querySelectorAll('.navin > [data-route],.navin > a[href]')){let active=false;if(r==='review'&&el.tagName==='A'){try{active=new URL(el.href,location.href).pathname.endsWith('/review/')}catch(_){}}else if(el.dataset?.route){active=normalizeRoute(el.dataset.route)===r}el.classList.toggle('active',active)}}
function show(r){const p=panes.get(r);if(!p)return false;displayRoute=r;for(const [key,node] of panes)node.hidden=key!==r;host.hidden=false;host.dataset.route=r;root.dataset.riseRoute=r;root.dataset.riseStableReady='1';root.dataset.riseHydrated='1';root.dataset.riseInstantNav='1';root.removeAttribute('data-rise-runtime-error');updateNav(r);return true}
function cacheSource(r,source){const previous=sources.get(r);if(previous===source&&panes.get(r)?.firstChild)return;const p=pane(r);p.replaceChildren(source.cloneNode(true));sources.set(r,source)}
function routeForPanel(source){for(const [r,s] of Object.entries(custom))if(source.matches?.(s))return r;return null}
function captureAdded(node){if(node?.nodeType!==1)return false;const source=node.matches?.(panelSelector)?node:node.querySelector?.(panelSelector);if(!source)return false;const r=routeForPanel(source);if(!r)return false;cacheSource(r,source);if(displayRoute===r||(!host.dataset.route&&r==='home'))show(r);return true}
function reviewFrame(){const p=pane('review','riseStableReviewPane');let f=p.querySelector('iframe');if(f)return f;f=document.createElement('iframe');f.className='riseStableReviewFrame';f.title='Rise 復習';f.loading='eager';f.src='./review/?rise_embed=1';f.addEventListener('load',()=>{p.dataset.ready='1';try{const d=f.contentDocument;if(!d||d.getElementById('rise-review-embed-style'))return;d.documentElement.dataset.riseEmbed='1';const s=d.createElement('style');s.id='rise-review-embed-style';s.textContent='.top{display:none!important}body{background:transparent!important}.app{max-width:none!important;padding:0!important}main#root{padding:4px 2px 80px!important}@media(max-width:520px){main#root{padding:2px 0 74px!important}}';d.head.appendChild(s)}catch(_){}});p.appendChild(f);return f}
function isReviewLink(a){if(!a||a.tagName!=='A')return false;try{const u=new URL(a.href,location.href),review=new URL('./review/',location.href);return u.origin===review.origin&&u.pathname===review.pathname}catch(_){return false}}
function applyVisualRoute(){if(!visualMode||visualRouteApplied)return;const target=app.querySelector(`[data-route="${visualRoute}"]`);if(!target)return;visualRouteApplied=true;displayRoute=normalizeRoute(visualRoute);target.click()}
function schedule(delay=24){if(timer)return;timer=setTimeout(()=>{timer=0;sync()},delay)}
function sync(){
 applyVisualRoute();
 const actual=stateRoute(),selector=custom[actual];
 if(selector){const source=app.querySelector(`main ${selector}[data-ui-ver="4.2.0"]`);if(source)cacheSource(actual,source)}
 if(displayRoute==='review'){reviewFrame();show('review');return}
 if(panes.has(displayRoute)){show(displayRoute);return}
 if(!warming&&panes.has(actual)){displayRoute=actual;show(actual);return}
 if(host.querySelector('.riseStablePane:not([hidden])'))return;
 host.hidden=true;root.removeAttribute('data-rise-stable-ready');
}
function waitForPane(r,timeout=1200){return new Promise(resolve=>{const start=performance.now();const tick=()=>{sync();if(panes.has(r))return resolve(true);if(performance.now()-start>timeout)return resolve(false);setTimeout(tick,24)};tick()})}
function clickUnderlying(r){const target=app.querySelector(`.nav [data-route="${r}"]`)||app.querySelector(`[data-route="${r}"]`);if(!target)return false;warmClick=true;try{target.click()}finally{warmClick=false}return true}
async function warmPrimary(){
 if(warmStarted||visualMode||qualityMode)return;
 warmStarted=true;warming=true;const restore=stateRoute(),visible=displayRoute,startEpoch=userChoiceEpoch;
 reviewFrame();
 for(const r of primary){
  if(panes.has(r))continue;
  if(userChoiceEpoch!==startEpoch)break;
  if(!clickUnderlying(r))continue;
  await waitForPane(r);
 }
 if(userChoiceEpoch===startEpoch){
  if(stateRoute()!==restore)clickUnderlying(restore);
  await waitForPane(restore,700);
  displayRoute=panes.has(visible)?visible:restore;
 }else if(displayRoute!=='review'){
  if(!panes.has(displayRoute))await waitForPane(displayRoute,900);
  if(stateRoute()!==displayRoute&&Object.hasOwn(custom,displayRoute))clickUnderlying(displayRoute);
 }
 warming=false;
 if(displayRoute==='review'){show('review');return}
 if(panes.has(displayRoute))show(displayRoute);else sync();
 if(userChoiceEpoch!==startEpoch){warmStarted=false;setTimeout(()=>queueWarm(400),400)}
}
function queueWarm(delay=40){if(qualityMode||visualMode||warmStarted)return;setTimeout(()=>warmPrimary().catch(()=>{warming=false}),delay)}
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a[href]');
 if(isReviewLink(a)){
  if(!warmClick)userChoiceEpoch++;
  e.preventDefault();displayRoute='review';reviewFrame();show('review');return;
 }
 const target=e.target.closest?.('[data-route]');if(!target)return;
 const r=normalizeRoute(target.dataset.route);if(!Object.hasOwn(custom,r))return;
 if(warmClick)return;
 userChoiceEpoch++;displayRoute=r;root.dataset.riseRoute=r;
 if(panes.has(r))show(r);else schedule(0);
},true);
const mo=new MutationObserver(mutations=>{let changed=false;for(const m of mutations){if(m.type!=='childList')continue;for(const n of m.addedNodes)if(captureAdded(n))return;if(m.addedNodes.length||m.removedNodes.length)changed=true}if(changed)schedule()});mo.observe(app,{childList:true,subtree:true});
function beginPrewarm(){if(qualityMode||visualMode)return;reviewFrame();queueWarm(20)}
document.addEventListener('aa:v23ready',()=>{displayRoute=stateRoute();schedule(0);setTimeout(beginPrewarm,20)});document.addEventListener('rise:sw-updated',()=>schedule(0));addEventListener('pageshow',()=>schedule(0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(0)});
requestAnimationFrame(()=>{displayRoute=stateRoute();sync();setTimeout(beginPrewarm,60)});
let attempts=0;const boot=setInterval(()=>{attempts++;sync();if(root.dataset.riseStableReady==='1'||attempts>=20){clearInterval(boot);beginPrewarm()}},250);
})();