(()=>{'use strict';
if(window.__RISE_STABLE_ROOT_V4__)return;
window.__RISE_STABLE_ROOT_V4__={version:'1.0.0'};
const root=document.documentElement,app=document.getElementById('app');
if(!app)return;
const host=document.createElement('main');
host.id='riseStableMain';host.hidden=true;host.setAttribute('aria-live','polite');
app.insertAdjacentElement('afterend',host);
const custom={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const route=()=>{try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}};
let frame=0,lastSig='';
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)}
function sync(){
 const r=route();root.dataset.riseRoute=r;
 const selector=custom[r];
 if(!selector){host.hidden=true;root.removeAttribute('data-rise-stable-ready');return}
 const source=app.querySelector(`main ${selector}[data-ui-ver="4.2.0"]`);
 if(source){
   const sig=`${r}:${source.outerHTML.length}:${source.textContent?.length||0}`;
   if(sig!==lastSig||!host.querySelector(selector)){host.innerHTML=source.outerHTML;lastSig=sig}
   host.hidden=false;host.dataset.route=r;root.dataset.riseStableReady='1';root.dataset.riseHydrated='1';root.removeAttribute('data-rise-runtime-error');
   return;
 }
 const retained=host.querySelector(selector);
 if(retained&&host.dataset.route===r){host.hidden=false;root.dataset.riseStableReady='1';return}
 host.hidden=true;root.removeAttribute('data-rise-stable-ready');
}
const mo=new MutationObserver(schedule);mo.observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',schedule);addEventListener('pageshow',schedule);addEventListener('resize',schedule,{passive:true});
requestAnimationFrame(sync);
let attempts=0;const timer=setInterval(()=>{attempts++;sync();if(attempts>=80)clearInterval(timer)},250);
})();