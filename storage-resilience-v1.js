(()=>{'use strict';
if(window.__AA_STORAGE_RESILIENCE_LOADED__)return;
window.__AA_STORAGE_RESILIENCE_LOADED__=true;

const VERSION='2.0.0';
const DB_NAME='asahigaoka-aa-os-storage';
const DB_VERSION=1;
const DB_STORE='snapshots';
const STATE_SNAPSHOT='state';
const LEGACY_SNAPSHOT='legacy-pre-v2';
const ARCHIVE_INDEX='state-archive-index-v2';
const AUTO_RECOVERY_KEY='aa-storage-auto-recovery-v2';
const RESET_INTENT_KEY='aa-storage-reset-intent-v2';
const MAX_ARCHIVES=12;
const STATUS=window.__AA_STORAGE_RESILIENCE__={
 version:VERSION,idbReady:false,localStorageReady:false,recovered:false,recoveredFrom:null,
 recoveredAttempts:0,suspiciousLoss:false,recoveryUnavailable:false,candidates:[],archiveCount:0,
 legacyMoved:false,lastError:null
};
let dbPromise=null,archiveBusy=Promise.resolve();

function errText(e){return e&&(`${e.name||'Error'}: ${e.message||String(e)}`)}
function isQuota(e){return !!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014)}
function parse(raw){try{return JSON.parse(raw)}catch(_){return null}}
function looksLikeState(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&(Array.isArray(x.attempts)||x.mastery||x.items||x.profile||x.schemaVersion!=null)}
function n(v){v=Number(v);return Number.isFinite(v)?Math.max(0,v):0}
function metrics(x){
 if(!looksLikeState(x))return null;
 const attempts=Array.isArray(x.attempts)?x.attempts.length:0;
 const masteryAttempts=Object.values(x.mastery||{}).reduce((s,v)=>s+n(v?.attempts),0);
 const reviewedItems=Object.values(x.items||{}).reduce((s,v)=>s+n(v?.reviews||v?.seen),0);
 const days=Object.values(x.stats?.days||{}).filter(v=>v&&typeof v==='object'&&(n(v.attempts)>0||n(v.ms)>0)).length;
 const reading=Array.isArray(x.stats?.readingPace)?x.stats.readingPace.length:0;
 const known=Object.keys(x.profile?.knownWords||{}).length+Object.keys(x.profile?.unknownWords||{}).length;
 return{attempts,masteryAttempts,reviewedItems,days,reading,known,updatedAt:n(x.updatedAt),bytes:0};
}
function rank(m){return m?[m.attempts,m.masteryAttempts,m.reviewedItems,m.days,m.reading,m.known,m.updatedAt]:[-1]}
function compareMetrics(a,b){const A=rank(a),B=rank(b);for(let i=0;i<Math.max(A.length,B.length);i++){const d=(A[i]||0)-(B[i]||0);if(d)return d}return 0}
function fingerprint(raw,obj){
 const m=metrics(obj);let h=2166136261>>>0;
 const s=String(raw||'');for(let i=0;i<s.length;i+=Math.max(1,Math.floor(s.length/256))){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
 return `${m?.attempts||0}:${m?.masteryAttempts||0}:${m?.updatedAt||0}:${s.length}:${h.toString(36)}`;
}
function directGet(key){try{return localStorage.getItem(key)}catch(e){STATUS.lastError=errText(e);return null}}
function directSet(key,value){try{localStorage.setItem(key,value);return true}catch(e){STATUS.lastError=errText(e);return false}}
function directProbe(){const k='__aa_storage_probe__';try{localStorage.setItem(k,'1');localStorage.removeItem(k);STATUS.localStorageReady=true;return true}catch(e){STATUS.localStorageReady=false;STATUS.lastError=errText(e);return false}}
function rememberInMemory(key,value){try{if(typeof memStore!=='undefined'&&memStore)memStore[key]=value}catch(_){}}
function forgetInMemory(key){try{if(typeof memStore!=='undefined'&&memStore)delete memStore[key]}catch(_){}}
function setStorageFlag(ok){try{if(typeof storageOK!=='undefined')storageOK=!!ok}catch(_){}}
function renderSoon(){try{if(typeof render==='function')setTimeout(()=>{try{render()}catch(_){}},0)}catch(_){}}
function notify(text){
 try{
  const id='aaStorageRecoveryToast';document.getElementById(id)?.remove();
  const el=document.createElement('div');el.id=id;el.textContent=text;
  el.style.cssText='position:fixed;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483647;padding:13px 15px;border-radius:14px;background:#101828;color:#fff;font:700 13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI",sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.28)';
  document.body.appendChild(el);setTimeout(()=>el.remove(),9000);
 }catch(_){}
}
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(new Error('IndexedDB unavailable'));return}
  let req;try{req=indexedDB.open(DB_NAME,DB_VERSION)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));req.onblocked=()=>reject(new Error('IndexedDB open blocked'));
 }).then(db=>{STATUS.idbReady=true;return db}).catch(e=>{STATUS.lastError=errText(e);throw e});
 return dbPromise;
}
async function getSnapshot(key){
 try{const db=await openDB();return await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),r=tx.objectStore(DB_STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error||new Error('IndexedDB read failed'))})}
 catch(e){STATUS.lastError=errText(e);return null}
}
async function putSnapshot(key,value){
 try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'))});return true}
 catch(e){STATUS.lastError=errText(e);return false}
}
async function deleteSnapshot(key){
 try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB delete failed'))});return true}catch(_){return false}
}
async function putStrongStateSnapshot(raw){
 const obj=parse(raw);if(!looksLikeState(obj))return false;
 const old=await getSnapshot(STATE_SNAPSHOT),oldObj=parse(old?.raw||'');
 if(looksLikeState(oldObj)&&compareMetrics(metrics(oldObj),metrics(obj))>0)return false;
 return putSnapshot(STATE_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(obj),version:VERSION});
}
async function archiveRawNow(raw,reason='save'){
 const obj=parse(raw);if(!looksLikeState(obj))return false;
 const m=metrics(obj);if(!m)return false;m.bytes=String(raw).length;
 const fp=fingerprint(raw,obj),idxRec=await getSnapshot(ARCHIVE_INDEX),idx=Array.isArray(idxRec?.entries)?idxRec.entries:[];
 if(idx.some(x=>x.fp===fp)){STATUS.archiveCount=idx.length;return false}
 const key=`archive:${Date.now()}:${m.attempts}:${Math.random().toString(36).slice(2,7)}`;
 await putSnapshot(key,{raw,updatedAt:Date.now(),reason,metrics:m,fp,version:VERSION});
 idx.push({key,at:Date.now(),reason,metrics:m,fp});
 idx.sort((a,b)=>b.at-a.at);
 while(idx.length>MAX_ARCHIVES){const old=idx.pop();if(old?.key)await deleteSnapshot(old.key)}
 await putSnapshot(ARCHIVE_INDEX,{entries:idx,updatedAt:Date.now(),version:VERSION});
 STATUS.archiveCount=idx.length;return true;
}
function archiveRaw(raw,reason){archiveBusy=archiveBusy.then(()=>archiveRawNow(raw,reason)).catch(e=>{STATUS.lastError=errText(e)});return archiveBusy}
async function archiveCandidates(){
 const idxRec=await getSnapshot(ARCHIVE_INDEX),idx=Array.isArray(idxRec?.entries)?idxRec.entries:[];
 const out=[];for(const x of idx){const rec=await getSnapshot(x.key);if(rec?.raw)out.push({source:x.key,raw:rec.raw,obj:parse(rec.raw)})}
 STATUS.archiveCount=idx.length;return out;
}
function addCandidate(out,source,raw){
 const obj=parse(raw);if(!looksLikeState(obj))return;
 const m=metrics(obj);m.bytes=String(raw||'').length;out.push({source,raw,obj,metrics:m,fp:fingerprint(raw,obj)});
}
async function collectCandidates(stateKey,legacyKey){
 const out=[];
 try{if(typeof state!=='undefined'&&looksLikeState(state))addCandidate(out,'memory',JSON.stringify(state))}catch(_){}
 addCandidate(out,'local-main',directGet(stateKey));addCandidate(out,'local-legacy',directGet(legacyKey));
 const snap=await getSnapshot(STATE_SNAPSHOT),legacy=await getSnapshot(LEGACY_SNAPSHOT);
 addCandidate(out,'idb-state',snap?.raw);addCandidate(out,'idb-legacy',legacy?.raw);
 for(const x of await archiveCandidates())addCandidate(out,x.source,x.raw);
 const seen=new Set(),dedup=[];for(const c of out){if(seen.has(c.fp))continue;seen.add(c.fp);dedup.push(c)}
 dedup.sort((a,b)=>compareMetrics(b.metrics,a.metrics));
 STATUS.candidates=dedup.map(c=>({source:c.source,...c.metrics}));
 return dedup;
}
function recentResetIntent(){const t=n(directGet(RESET_INTENT_KEY));return t&&Date.now()-t<10*60*1000}
function markResetIntent(){
 try{localStorage.setItem(RESET_INTENT_KEY,String(Date.now()));setTimeout(()=>{try{if(Date.now()-n(localStorage.getItem(RESET_INTENT_KEY))>2*60*1000)localStorage.removeItem(RESET_INTENT_KEY)}catch(_){}},130000)}catch(_){}
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-action="reset"]'))markResetIntent()},true);

async function moveLegacyBackup(stateKey,legacyKey){
 const raw=directGet(legacyKey),obj=parse(raw);
 if(looksLikeState(obj)){await archiveRaw(raw,'legacy-before-move');await putSnapshot(LEGACY_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(obj),version:VERSION})}
 const current=parse(directGet(stateKey));if(!looksLikeState(current)||!looksLikeState(obj))return false;
 try{localStorage.removeItem(legacyKey);localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now(),version:VERSION}));STATUS.legacyMoved=true;return true}catch(e){STATUS.lastError=errText(e);return false}
}
function shouldRecover(best,current){
 if(!best?.metrics||!current)return false;
 if(best.metrics.attempts>current.attempts)return current.attempts===0||best.metrics.attempts-current.attempts>=2;
 if(best.metrics.attempts===current.attempts&&best.metrics.masteryAttempts>current.masteryAttempts+3)return true;
 return false;
}
async function applyCandidate(best,stateKey){
 try{
  const beforeRaw=directGet(stateKey);if(beforeRaw)await archiveRaw(beforeRaw,'before-auto-recovery');
  let restored=best.obj;
  if(typeof mergeState==='function')restored=mergeState(best.obj);
  else if(typeof migrate==='function')restored=migrate(best.obj);
  if(typeof state!=='undefined')state=restored;
  const raw=JSON.stringify(restored);
  if(typeof storageSet==='function')storageSet(stateKey,raw);else directSet(stateKey,raw);
  await putStrongStateSnapshot(raw);await archiveRaw(raw,'after-auto-recovery');
  STATUS.recovered=true;STATUS.recoveredFrom=best.source;STATUS.recoveredAttempts=metrics(restored)?.attempts||0;STATUS.recoveryUnavailable=false;
  directSet(AUTO_RECOVERY_KEY,JSON.stringify({at:Date.now(),from:best.source,attempts:STATUS.recoveredAttempts,fp:best.fp,version:VERSION}));
  try{localStorage.removeItem(RESET_INTENT_KEY)}catch(_){}
  renderSoon();notify(`学習履歴を復旧しました（${STATUS.recoveredAttempts}問）`);
  document.dispatchEvent(new CustomEvent('aa:storage-recovered',{detail:{from:best.source,attempts:STATUS.recoveredAttempts,version:VERSION}}));
  return true;
 }catch(e){STATUS.lastError=errText(e);return false}
}
async function recoverBestState(stateKey,legacyKey,{force=false}={}){
 const cs=await collectCandidates(stateKey,legacyKey);if(!cs.length)return false;
 let currentObj=null;try{if(typeof state!=='undefined'&&looksLikeState(state))currentObj=state}catch(_){}
 if(!currentObj)currentObj=parse(directGet(stateKey));
 const cm=metrics(currentObj)||{attempts:0,masteryAttempts:0,reviewedItems:0,days:0,reading:0,known:0,updatedAt:0};
 const best=cs[0];STATUS.suspiciousLoss=shouldRecover(best,cm);
 const ledger=(()=>{try{const x=parse(localStorage.getItem('aa-daily-analytics-v1'));return x&&x.sessions?Object.keys(x.sessions).length:0}catch(_){return 0}})();
 if(!STATUS.suspiciousLoss){if(looksLikeState(currentObj))await putStrongStateSnapshot(JSON.stringify(currentObj));return false}
 if(!force&&recentResetIntent())return false;
 const previous=parse(directGet(AUTO_RECOVERY_KEY));
 if(!force&&previous?.fp===best.fp&&previous?.version===VERSION)return false;
 const ok=await applyCandidate(best,stateKey);
 if(!ok&&cm.attempts===0&&ledger>0)STATUS.recoveryUnavailable=true;
 return ok;
}
function patchWarning(){
 try{
  if(typeof storageWarningHTML!=='function'||storageWarningHTML.__aaResiliencePatched)return;
  const original=storageWarningHTML;
  const patched=function(){
   let extra='';
   if(STATUS.recovered)extra=`<div class="notice"><b>学習履歴を自動復旧：</b> 端末内バックアップから ${STATUS.recoveredAttempts} 問の履歴を統合しました。</div><div class="sp12"></div>`;
   else if(STATUS.suspiciousLoss&&STATUS.recoveryUnavailable)extra=`<div class="notice"><b>学習履歴の復旧候補を確認中です。</b> アプリやSafariのWebサイトデータは削除しないでください。</div><div class="sp12"></div>`;
   try{if(typeof storageOK!=='undefined'&&storageOK)return extra}catch(_){}
   if(STATUS.idbReady)return extra+`<div class="notice"><b>保存方式を自動切替：</b> localStorageへの保存に問題があるため、学習状態を端末内のIndexedDBにも保存しています。</div><div class="sp12"></div>`;
   return extra+original();
  };
  patched.__aaResiliencePatched=true;storageWarningHTML=patched;
 }catch(e){STATUS.lastError=errText(e)}
}
function patchStorage(stateKey,legacyKey){
 if(typeof storageSet!=='function'||storageSet.__aaResiliencePatched)return;
 const patched=function(key,value){
  const raw=String(value);
  if(key===legacyKey){
   try{localStorage.setItem(key,raw);forgetInMemory(key);return true}catch(e){rememberInMemory(key,raw);if(looksLikeState(parse(raw))){archiveRaw(raw,'legacy-save');putSnapshot(LEGACY_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(parse(raw)),version:VERSION})}STATUS.lastError=errText(e);return false}
  }
  if(key===stateKey){
   const previous=directGet(key);if(previous&&previous!==raw)archiveRaw(previous,'before-main-overwrite');
  }
  try{
   localStorage.setItem(key,raw);forgetInMemory(key);STATUS.localStorageReady=true;setStorageFlag(true);
   if(key===stateKey){putStrongStateSnapshot(raw);archiveRaw(raw,'main-save')}
   return true;
  }catch(first){
   if(isQuota(first)){
    try{
     localStorage.removeItem(legacyKey);localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now(),version:VERSION}));
     localStorage.setItem(key,raw);forgetInMemory(key);STATUS.localStorageReady=true;STATUS.legacyMoved=true;setStorageFlag(true);
     if(key===stateKey){putStrongStateSnapshot(raw);archiveRaw(raw,'main-save-after-quota')}
     return true;
    }catch(second){STATUS.lastError=errText(second)}
   }else STATUS.lastError=errText(first);
   rememberInMemory(key,raw);STATUS.localStorageReady=false;setStorageFlag(false);
   if(key===stateKey){putStrongStateSnapshot(raw);archiveRaw(raw,'main-save-fallback')}
   return false;
  }
 };
 patched.__aaResiliencePatched=true;storageSet=patched;
}
async function boot(attempt=0){
 if(typeof STORE_KEY==='undefined'||typeof storageSet!=='function'){
  if(attempt<80)setTimeout(()=>boot(attempt+1),50);return;
 }
 const stateKey=STORE_KEY,legacyKey=stateKey+'_pre_v2';
 patchStorage(stateKey,legacyKey);patchWarning();
 try{await openDB()}catch(_){}
 const initialMain=directGet(stateKey);if(initialMain)await archiveRaw(initialMain,'boot-main');
 const initialLegacy=directGet(legacyKey);if(initialLegacy&&looksLikeState(parse(initialLegacy)))await archiveRaw(initialLegacy,'boot-legacy');
 await moveLegacyBackup(stateKey,legacyKey);
 const lsOK=directProbe();setStorageFlag(lsOK);
 await recoverBestState(stateKey,legacyKey);
 if(lsOK){try{if(typeof save==='function')save()}catch(e){STATUS.lastError=errText(e)}}
 renderSoon();
}
window.AAStorageRecoveryV2={
 version:VERSION,status:STATUS,
 inspect:async()=>{if(typeof STORE_KEY==='undefined')return[];return (await collectCandidates(STORE_KEY,STORE_KEY+'_pre_v2')).map(c=>({source:c.source,...c.metrics}))},
 recover:async()=>{if(typeof STORE_KEY==='undefined')return false;return recoverBestState(STORE_KEY,STORE_KEY+'_pre_v2',{force:true})}
};
boot();
})();