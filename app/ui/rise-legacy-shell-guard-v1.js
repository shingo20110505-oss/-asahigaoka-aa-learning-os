(()=>{'use strict';
if(window.__RISE_LEGACY_SHELL_GUARD_V1__)return;
const root=document.documentElement;
const app=document.getElementById('app');
const CORE=new Set(['home','subjects','analytics','settings']);
const PANEL={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
const AI_EXAM_SRC=new URL('../../ai-exam-route-v1.js?v=1.3.0',document.currentScript?.src||new URL('./app/ui/rise-legacy-shell-guard-v1.js',location.href)).href;
const SETTLE_MS=120;
const STARTUP_SUPPRESS_MS=3200;
let syncQueued=false;
let legacyHits=0;
let suppressedRenders=0;
let settleTimer=0;
let settleSeq=0;
let firstStableAt=0;

function loadAiExamRoute(){
  if(window.__AA_AI_EXAM_ROUTE_V1__||document.querySelector('script[data-aa-ai-exam-route="1"]'))return;
  const script=document.createElement('script');
  script.src=AI_EXAM_SRC;
  script.async=false;
  script.dataset.aaAiExamRoute='1';
  script.onerror=()=>console.error('Rise AI entrance exam route failed to load');
  document.head.appendChild(script);
}
function route(){
  try{return window.AA_APP?.get?.('state')?.get?.()?.route||root.dataset.riseRoute||'home'}catch(_){return root.dataset.riseRoute||'home'}
}
function isCore(r=route()){return CORE.has(r)}
function hasRisePanel(r=route()){
  if(!isCore(r))return true;
  const main=app?.querySelector('main');
  return !!main?.querySelector(`${PANEL[r]}[data-ui-ver="4.2.0"]`);
}
function hasLegacyChrome(){
  const title=app?.querySelector('.brand h1')?.textContent?.trim()||'';
  const nav=app?.querySelector('.nav .navin');
  const complete=String(nav?.dataset?.riseNav||'').startsWith('complete:');
  return (title&&title!=='Rise')||(!complete&&!!nav);
}
function noteStable(){
  const r=route();
  if(firstStableAt||!isCore(r)||!hasRisePanel(r)||hasLegacyChrome())return false;
  firstStableAt=Date.now();
  root.dataset.riseFirstStableAt=String(firstStableAt);
  return true;
}
function stableRiseOwnsCore(r=route()){
  if(!isCore(r)||!hasRisePanel(r)||hasLegacyChrome())return false;
  noteStable();
  return firstStableAt>0;
}
function pulse(source='legacy-shell-guard'){
  if(syncQueued)return;
  syncQueued=true;
  queueMicrotask(()=>{
    syncQueued=false;
    const r=route();
    if(!isCore(r))return;
    try{document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source,route:r}}))}catch(_){}
    try{document.dispatchEvent(new CustomEvent('rise:legacy-shell-blocked',{detail:{source,route:r,hits:legacyHits,suppressed:suppressedRenders}}))}catch(_){}
  });
}
function beginSettle(source){
  const r=route();
  if(!isCore(r))return false;
  legacyHits++;
  const seq=++settleSeq;
  root.classList.add('aa-app-booting');
  root.dataset.riseLegacySettling='1';
  root.dataset.riseLegacyShellBlocked=String(legacyHits);
  root.dataset.riseLegacyShellSource=source;
  clearTimeout(settleTimer);
  settleTimer=setTimeout(()=>{
    if(seq!==settleSeq||!isCore())return;
    pulse(`${source}:settled`);
    requestAnimationFrame(()=>{
      if(seq!==settleSeq)return;
      delete root.dataset.riseLegacySettling;
      noteStable();
      try{document.dispatchEvent(new CustomEvent('rise:legacy-settled',{detail:{source,route:route(),hits:legacyHits,suppressed:suppressedRenders}}))}catch(_){}
    });
  },SETTLE_MS);
  return true;
}
function concealAndRecover(source){
  const r=route();
  if(!isCore(r))return false;
  if(!hasLegacyChrome()&&hasRisePanel(r)){noteStable();return false}
  beginSettle(source);
  pulse(source);
  return true;
}
function wrapLegacyRender(){
  const fn=window.render;
  if(typeof fn!=='function'||fn.__riseLegacyShellGuarded)return false;
  function guardedRender(...args){
    const r=route();
    const core=isCore(r);
    if(core&&stableRiseOwnsCore(r)){
      suppressedRenders++;
      root.dataset.riseLegacyRenderSuppressed=String(suppressedRenders);
      pulse('legacy-render-suppressed');
      return;
    }
    if(core)beginSettle('legacy-render');
    const out=fn.apply(this,args);
    if(core)pulse('legacy-render');
    return out;
  }
  guardedRender.__riseLegacyShellGuarded=true;
  guardedRender.__riseLegacyOriginal=fn;
  window.render=guardedRender;
  return true;
}
function check(source='mutation'){
  wrapLegacyRender();
  const r=route();
  if(isCore(r)&&(hasLegacyChrome()||!hasRisePanel(r)))concealAndRecover(source);else noteStable();
}

window.__RISE_LEGACY_SHELL_GUARD_V1__={
  version:'1.0.3',
  build:'2026-09-11.1',
  strategy:'stable-rise-ownership-plus-coalesced-recovery',
  aiExamRoute:'1.3.0',
  settleMs:SETTLE_MS,
  startupSuppressMs:STARTUP_SUPPRESS_MS,
  get blocked(){return legacyHits},
  get suppressed(){return suppressedRenders},
  check:()=>check('manual')
};

loadAiExamRoute();
wrapLegacyRender();
if(app){
  let raf=0;
  new MutationObserver(()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;check('app-mutation')});
  }).observe(app,{childList:true,subtree:true});
}
document.addEventListener('rise:settings-changed',()=>check('settings-change'));
document.addEventListener('rise:navigation',()=>check('navigation'));
document.addEventListener('aa:v23ready',()=>{wrapLegacyRender();loadAiExamRoute();noteStable()});
addEventListener('pageshow',()=>{check('pageshow');loadAiExamRoute()});
setTimeout(()=>check('boot-250'),250);
})();
