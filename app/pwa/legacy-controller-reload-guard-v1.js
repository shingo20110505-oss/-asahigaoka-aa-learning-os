(()=>{'use strict';
if(window.__RISE_LEGACY_SW_RELOAD_GUARD__)return;
window.__RISE_LEGACY_SW_RELOAD_GUARD__={version:'1.0.0',blocked:0};
const sw=navigator.serviceWorker;
if(!sw||typeof sw.addEventListener!=='function')return;
const nativeAdd=sw.addEventListener.bind(sw);
const nativeRemove=sw.removeEventListener.bind(sw);
const blocked=new WeakSet();
function isLegacyReloadListener(type,listener){
 if(type!=='controllerchange'||typeof listener!=='function')return false;
 try{
  const source=Function.prototype.toString.call(listener);
  return /location\.reload\s*\(/.test(source)&&(source.includes('PWA.reloading')||source.includes('controllerchange'));
 }catch(_){return false}
}
sw.addEventListener=function(type,listener,options){
 if(isLegacyReloadListener(type,listener)){
  blocked.add(listener);
  window.__RISE_LEGACY_SW_RELOAD_GUARD__.blocked++;
  document.documentElement.dataset.riseLegacyReloadBlocked='1';
  return;
 }
 return nativeAdd(type,listener,options);
};
sw.removeEventListener=function(type,listener,options){
 if(blocked.has(listener))return;
 return nativeRemove(type,listener,options);
};
})();
