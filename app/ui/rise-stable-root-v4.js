(()=>{'use strict';
if(window.__RISE_STABLE_ROOT_V4__)return;
window.__RISE_STABLE_ROOT_V4__={version:'1.0.0',performance:'1.1'};
const root=document.documentElement,app=document.getElementById('app');
if(!app)return;
const host=document.createElement('main');
host.id='riseStableMain';host.hidden=true;host.setAttribute('aria-live','polite');
app.insertAdjacentElement('afterend',host);
const custom={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const route=()=>{try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}};
const params=new URLSearchParams(location.search),visualRoute=params.get('visual_route');
const visualMode=params.get('visual_verify')==='1'&&Object.hasOwn(custom,visualRoute||'');
let visualRouteApplied=false;
function applyVisualRoute(){if(!visualMode||visualRouteApplied)return;const target=app.querySelector(`[data-route="${visualRoute}"]`);if(!target)return;visualRouteApplied=true;target.click()}
let timer=0,lastSource=null,lastRoute='';
function schedule(delay=72){if(timer)return;timer=setTimeout(()=>{timer=0;sync()},delay)}
function mount(source,r,selector){
 const changed=source!==lastSource||r!==lastRoute||!host.querySelector(selector);
 if(changed){host.replaceChildren(source.cloneNode(true));lastSource=source;lastRoute=r}
 host.hidden=false;host.dataset.route=r;root.dataset.riseStableReady='1';root.dataset.riseHydrated='1';root.removeAttribute('data-rise-runtime-error');
}
function sync(){
 applyVisualRoute();
 const r=route();root.dataset.riseRoute=r;
 const selector=custom[r];
 if(!selector){host.hidden=true;lastSource=null;lastRoute=r;root.removeAttribute('data-rise-stable-ready');return}
 const source=app.querySelector(`main ${selector}[data-ui-ver="4.2.0"]`);
 if(source){mount(source,r,selector);return}
 const retained=host.querySelector(selector);
 if(retained&&host.dataset.route===r){host.hidden=false;root.dataset.riseStableReady='1';return}
 host.hidden=true;lastSource=null;root.removeAttribute('data-rise-stable-ready');
}
const mo=new MutationObserver(mutations=>{
 for(const m of mutations){
  if(m.type!=='childList'||(!m.addedNodes.length&&!m.removedNodes.length))continue;
  schedule();return;
 }
});
mo.observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',()=>schedule(0));addEventListener('pageshow',()=>schedule(0));
requestAnimationFrame(sync);
let attempts=0;const boot=setInterval(()=>{attempts++;sync();if(root.dataset.riseStableReady==='1'||attempts>=12)clearInterval(boot)},500);
})();