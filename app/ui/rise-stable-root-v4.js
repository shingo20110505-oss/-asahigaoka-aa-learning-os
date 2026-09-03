(()=>{'use strict';
if(window.__RISE_STABLE_ROOT_V4__)return;
window.__RISE_STABLE_ROOT_V4__={version:'1.0.0',performance:'2.0',navigation:'instant-four-tab'};
const root=document.documentElement,app=document.getElementById('app');
if(!app)return;
const host=document.createElement('main');
host.id='riseStableMain';host.hidden=true;host.setAttribute('aria-live','polite');
const panesHost=document.createElement('div');panesHost.id='riseStablePanes';host.appendChild(panesHost);
app.insertAdjacentElement('afterend',host);
const custom={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const primary=['home','subjects','analytics'];
const params=new URLSearchParams(location.search),visualRoute=params.get('visual_route');
const visualMode=params.get('visual_verify')==='1'&&Object.hasOwn(custom,visualRoute||'');
const qualityMode=params.get('aa_quality_ci')==='1';
let visualRouteApplied=false,displayRoute='home',warming=false,warmStarted=false,userTouched=false,timer=0;
const panes=new Map(),sources=new Map();
function normalizeRoute(r){return ['subjects','mission','study','timeline'].includes(r)?'subjects':r==='analytics'?'analytics':r==='settings'?'settings':'home'}
function stateRoute(){try{return normalizeRoute(window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home')}catch(_){return normalizeRoute(root.dataset.riseRoute||'home')}}
function ensureStyle(){if(document.getElementById('rise-instant-nav-v1'))return;const s=document.createElement('style');s.id='rise-instant-nav-v1';s.textContent='#riseStablePanes{width:100%}.riseStablePane[hidden]{display:none!important}.riseStablePane{width:100%}.riseStableReviewPane{height:calc(100dvh - 150px);min-height:540px;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:rgba(12,29,60,.30);box-shadow:0 24px 64px rgba(5,13,35,.22)}.riseStableReviewFrame{display:block;width:100%;height:100%;border:0;background:transparent}@media(max-width:700px){.riseStableReviewPane{height:calc(100dvh - 132px);min-height:500px;border-radius:20px}}';document.head.appendChild(s)}
ensureStyle();
function pane(r,extra=''){let p=panes.get(r);if(p)return p;p=document.createElement('div');p.className=`riseStablePane ${extra}`.trim();p.dataset.route=r;p.hidden=true;panes.set(r,p);panesHost.appendChild(p);return p}
function updateNav(r){for(const el of document.querySelectorAll('.navin > [data-route],.navin > a[href]')){let active=false;if(r==='review'&&el.tagName==='A'){try{active=new URL(el.href,location.href).pathname.endsWith('/review/')}catch(_){}}else if(el.dataset?.route){active=normalizeRoute(el.dataset.route)===r}el.classList.toggle('active',active)}}
function show(r){const p=panes.get(r);if(!p)return false;displayRoute=r;for(const [key,node] of panes)node.hidden=key!==r;host.hidden=false;host.dataset.route=r;root.dataset.riseRoute=r;root.dataset.riseStableReady='1';root.dataset.riseHydrated='1';root.dataset.riseInstantNav='1';root.removeAttribute('data-rise-runtime-error');updateNav(r);return true}
function cacheSource(r,source){const previous=sources.get(r);if(previous===source&&panes.get(r)?.firstChild)return;const p=pane(r);p.replaceChildren(source.cloneNode(true));sources.set(r,source)}
function reviewFrame(){const p=pane('review','riseStableReviewPane');let f=p.querySelector('iframe');if(f)return f;f=document.createElement('iframe');f.className='riseStableReviewFrame';f.title='Rise 復習';f.loading='eager';f.src='./review/?rise_embed=1';f.addEventListener('load',()=>{try{const d=f.contentDocument;if(!d||d.getElementById('rise-review-embed-style'))return;d.documentElement.dataset.riseEmbed='1';const s=d.createElement('style');s.id='rise-review-embed-style';s.textContent='.top{display:none!important}body{background:transparent!important}.app{max-width:none!important;padding:0!important}main#root{padding:4px 2px 80px!important}@media(max-width:520px){main#root{padding:2px 0 74px!important}}';d.head.appendChild(s)}catch(_){}});p.appendChild(f);return f}
function isReviewLink(a){if(!a||a.tagName!=='A')return false;try{const u=new URL(a.href,location.href),review=new URL('./review/',location.href);return u.origin===review.origin&&u.pathname===review.pathname}catch(_){return false}}
function applyVisualRoute(){if(!visualMode||visualRouteApplied)return;const target=app.querySelector(`[data-route="${visualRoute}"]`);if(!target)return;visualRouteApplied=true;displayRoute=normalizeRoute(visualRoute);target.click()}
function schedule(delay=45){if(timer)return;timer=setTimeout(()=>{timer=0;sync()},delay)}
function sync(){
 applyVisualRoute();
 const actual=stateRoute(),selector=custom[actual];
 if(selector){const source=app.querySelector(`main ${selector}[data-ui-ver="4.2.0"]`);if(source)cacheSource(actual,source)}
 if(warming)return;
 if(displayRoute==='review'){reviewFrame();show('review');return}
 if(panes.has(displayRoute)){show(displayRoute);return}
 if(panes.has(actual)){displayRoute=actual;show(actual);return}
 host.hidden=true;root.removeAttribute('data-rise-stable-ready');
}
function waitForPane(r,timeout=1400){return new Promise(resolve=>{const start=performance.now();const tick=()=>{sync();if(panes.has(r))return resolve(true);if(performance.now()-start>timeout)return resolve(false);setTimeout(tick,35)};tick()})}
async function warmPrimary(){if(warmStarted||visualMode||qualityMode||userTouched)return;warmStarted=true;warming=true;const restore=stateRoute();const visible=displayRoute;for(const r of primary){if(panes.has(r))continue;const target=app.querySelector(`.nav [data-route="${r}"]`)||app.querySelector(`[data-route="${r}"]`);if(!target)continue;target.click();await waitForPane(r)}const back=app.querySelector(`.nav [data-route="${restore}"]`)||app.querySelector(`[data-route="${restore}"]`);if(back)back.click();await waitForPane(restore,800);warming=false;displayRoute=panes.has(visible)?visible:restore;show(displayRoute);reviewFrame()}
function queueWarm(){if(qualityMode||visualMode)return;const run=()=>warmPrimary().catch(()=>{});if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,650)}
document.addEventListener('pointerdown',()=>{userTouched=true},{once:true,passive:true,capture:true});
document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(isReviewLink(a)){e.preventDefault();displayRoute='review';reviewFrame();show('review');return}const target=e.target.closest?.('[data-route]');if(!target||warming)return;const r=normalizeRoute(target.dataset.route);if(!Object.hasOwn(custom,r))return;displayRoute=r;root.dataset.riseRoute=r;if(panes.has(r))show(r);else schedule(0)},true);
const mo=new MutationObserver(mutations=>{for(const m of mutations){if(m.type!=='childList'||(!m.addedNodes.length&&!m.removedNodes.length))continue;schedule();return}});mo.observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',()=>{displayRoute=stateRoute();schedule(0);queueWarm()});addEventListener('pageshow',()=>schedule(0));
requestAnimationFrame(()=>{displayRoute=stateRoute();sync();queueWarm()});
let attempts=0;const boot=setInterval(()=>{attempts++;sync();if(root.dataset.riseStableReady==='1'||attempts>=12){clearInterval(boot);queueWarm()}},350);
})();