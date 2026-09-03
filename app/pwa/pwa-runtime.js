(()=>{'use strict';
const A=window.AA_APP;if(!A)throw new Error('AA_APP registry missing');
const RISE_BOOT='4.3.0';
function cleanLegacyRefreshParams(){
 try{
  const u=new URL(location.href);
  if(u.searchParams.has('verify')||u.searchParams.has('visual_verify')||u.searchParams.has('aa_quality_ci'))return false;
  let changed=false;
  for(const k of ['refresh','sw'])if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true}
  if(u.searchParams.get('rise')&&u.searchParams.get('rise')!==RISE_BOOT){u.searchParams.set('rise',RISE_BOOT);changed=true}
  if(changed)history.replaceState(history.state,'',u.href);
  return changed;
 }catch(_){return false}
}
function migrateToRise(){return cleanLegacyRefreshParams()}
cleanLegacyRefreshParams();
if('serviceWorker'in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  document.documentElement.dataset.riseSwUpdated='1';
  document.dispatchEvent(new CustomEvent('rise:sw-updated'));
 });
 setTimeout(()=>navigator.serviceWorker.getRegistration().then(r=>r?.update?.()).catch(()=>{}),900);
}
A.register('pwa',{get:()=>typeof PWA==='object'?PWA:null,init:()=>typeof initPWA==='function'?initPWA():false,check:n=>typeof checkPWAUpdate==='function'?checkPWAUpdate(Boolean(n)):false,registration:()=>typeof PWA==='object'?PWA.registration:null,migrate:migrateToRise});
})();
