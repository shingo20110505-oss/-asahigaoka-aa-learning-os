(()=>{'use strict';
if(window.__RISE_LEGACY_SHELL_GUARD_V1__)return;
const root=document.documentElement;
const app=document.getElementById('app');
const CORE=new Set(['home','subjects','analytics','settings']);
const PANEL={home:'.riseHomeV4',subjects:'.riseSubjectsV4',analytics:'.riseAnalyticsV4',settings:'.riseSettingsV4'};
let syncQueued=false;
let legacyHits=0;

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
  return !title||title!=='Rise'||(!complete&&!!nav);
}
function pulse(source='legacy-shell-guard'){
  if(syncQueued)return;
  syncQueued=true;
  queueMicrotask(()=>{
    syncQueued=false;
    const r=route();
    if(!isCore(r))return;
    try{document.dispatchEvent(new CustomEvent('aa:v23ready',{detail:{source,route:r}}))}catch(_){}
    try{document.dispatchEvent(new CustomEvent('rise:legacy-shell-blocked',{detail:{source,route:r,hits:legacyHits}}))}catch(_){}
    if(app){const marker=document.createComment(`rise-legacy-shell-sync:${legacyHits}:${r}`);app.appendChild(marker);marker.remove()}
  });
}
function concealAndRecover(source){
  const r=route();
  if(!isCore(r))return false;
  if(!hasLegacyChrome()&&hasRisePanel(r))return false;
  legacyHits++;
  root.classList.add('aa-app-booting');
  root.dataset.riseLegacyShellBlocked=String(legacyHits);
  root.dataset.riseLegacyShellSource=source;
  pulse(source);
  requestAnimationFrame(()=>pulse(`${source}:raf`));
  setTimeout(()=>pulse(`${source}:40ms`),40);
  return true;
}
function wrapLegacyRender(){
  const fn=window.render;
  if(typeof fn!=='function'||fn.__riseLegacyShellGuarded)return false;
  function guardedRender(...args){
    const r=route();
    if(isCore(r))root.classList.add('aa-app-booting');
    const out=fn.apply(this,args);
    if(isCore(r))concealAndRecover('legacy-render');
    return out;
  }
  guardedRender.__riseLegacyShellGuarded=true;
  guardedRender.__riseLegacyOriginal=fn;
  window.render=guardedRender;
  return true;
}
function check(source='mutation'){
  wrapLegacyRender();
  if(isCore()&&(hasLegacyChrome()||!hasRisePanel()))concealAndRecover(source);
}

window.__RISE_LEGACY_SHELL_GUARD_V1__={
  version:'1.0.0',
  strategy:'conceal-legacy-core-shell-and-resync-rise',
  get blocked(){return legacyHits},
  check:()=>check('manual')
};

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
document.addEventListener('aa:v23ready',()=>wrapLegacyRender());
addEventListener('pageshow',()=>check('pageshow'));
setTimeout(()=>check('boot-250'),250);
setTimeout(()=>check('boot-1200'),1200);
})();
