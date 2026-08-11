(()=>{'use strict';
if(window.__AA_STORAGE_RESILIENCE_LOADED__)return;window.__AA_STORAGE_RESILIENCE_LOADED__=true;
const STATUS=window.__AA_STORAGE_RESILIENCE__={version:'1.0.0',idbReady:false,localStorageReady:false,recovered:false,legacyMoved:false,lastError:null};
const DB_NAME='asahigaoka-aa-os-storage';
const DB_VERSION=1;
const DB_STORE='snapshots';
const STATE_SNAPSHOT='state';
const LEGACY_SNAPSHOT='legacy-pre-v2';
let dbPromise=null;
function errText(e){return e&&(`${e.name||'Error'}: ${e.message||String(e)}`)}
function isQuota(e){return !!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014)}
function parse(raw){try{return JSON.parse(raw)}catch(_){return null}}
function looksLikeState(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&(Array.isArray(x.attempts)||x.mastery||x.items||x.profile||x.schemaVersion!=null)}
function stateUpdatedAt(x){return Number(x?.updatedAt)||0}
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(new Error('IndexedDB unavailable'));return}
  let req;
  try{req=indexedDB.open(DB_NAME,DB_VERSION)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
  req.onblocked=()=>reject(new Error('IndexedDB open blocked'));
 }).then(db=>{STATUS.idbReady=true;return db}).catch(e=>{STATUS.lastError=errText(e);throw e});
 return dbPromise;
}
async function putSnapshot(key,raw){
 if(typeof raw!=='string'||!raw)return false;
 try{
  const db=await openDB();
  await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({raw,updatedAt:Date.now()},key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'))});
  return true;
 }catch(e){STATUS.lastError=errText(e);return false}
}
async function getSnapshot(key){
 try{
  const db=await openDB();
  return await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error('IndexedDB read failed'))});
 }catch(e){STATUS.lastError=errText(e);return null}
}
function directGet(key){try{return localStorage.getItem(key)}catch(e){STATUS.lastError=errText(e);return null}}
function directProbe(){
 const key='__aa_storage_probe__';
 try{localStorage.setItem(key,'1');localStorage.removeItem(key);STATUS.localStorageReady=true;return true}catch(e){STATUS.localStorageReady=false;STATUS.lastError=errText(e);return false}
}
function rememberInMemory(key,value){try{if(typeof memStore!=='undefined'&&memStore)memStore[key]=value}catch(_){}}
function forgetInMemory(key){try{if(typeof memStore!=='undefined'&&memStore)delete memStore[key]}catch(_){}}
function setStorageFlag(ok){try{if(typeof storageOK!=='undefined')storageOK=!!ok}catch(_){}}
function renderSoon(){try{if(typeof render==='function')setTimeout(()=>{try{render()}catch(_){}},0)}catch(_){}}
async function moveLegacyBackup(stateKey,legacyKey){
 const currentRaw=directGet(stateKey);
 const current=parse(currentRaw);
 if(!looksLikeState(current))return false;
 const legacyRaw=directGet(legacyKey);
 if(legacyRaw){
  const legacy=parse(legacyRaw);
  if(looksLikeState(legacy))await putSnapshot(LEGACY_SNAPSHOT,legacyRaw);
 }
 try{
  localStorage.removeItem(legacyKey);
  localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now()}));
  STATUS.legacyMoved=true;
  return true;
 }catch(e){STATUS.lastError=errText(e);return false}
}
async function recoverNewestState(stateKey){
 const localRaw=directGet(stateKey);
 const localObj=parse(localRaw);
 const snap=await getSnapshot(STATE_SNAPSHOT);
 const snapObj=parse(snap?.raw||'');
 if(looksLikeState(snapObj)&&(!looksLikeState(localObj)||stateUpdatedAt(snapObj)>stateUpdatedAt(localObj))){
  try{
   const restored=typeof migrate==='function'?migrate(snapObj):snapObj;
   if(typeof state!=='undefined')state=restored;
   STATUS.recovered=true;
   try{storageSet(stateKey,JSON.stringify(restored))}catch(_){ }
   renderSoon();
   return true;
  }catch(e){STATUS.lastError=errText(e)}
 }
 if(looksLikeState(localObj))await putSnapshot(STATE_SNAPSHOT,localRaw);
 else{
  try{if(typeof state!=='undefined'&&looksLikeState(state))await putSnapshot(STATE_SNAPSHOT,JSON.stringify(state))}catch(_){ }
 }
 return false;
}
function patchWarning(){
 try{
  if(typeof storageWarningHTML!=='function'||storageWarningHTML.__aaResiliencePatched)return;
  const original=storageWarningHTML;
  const patched=function(){
   try{if(typeof storageOK!=='undefined'&&storageOK)return ''}catch(_){ }
   if(STATUS.idbReady)return `<div class="notice"><b>保存方式を自動切替：</b> localStorageへの保存に問題があるため、学習状態を端末内のIndexedDBにも保存しています。念のため設定からJSONバックアップも保存できます。</div><div class="sp12"></div>`;
   return original();
  };
  patched.__aaResiliencePatched=true;
  storageWarningHTML=patched;
 }catch(e){STATUS.lastError=errText(e)}
}
function patchStorage(stateKey,legacyKey){
 if(typeof storageSet!=='function'||storageSet.__aaResiliencePatched)return;
 const patched=function(key,value){
  const raw=String(value);
  if(key===legacyKey){
   try{localStorage.setItem(key,raw);forgetInMemory(key);return true}catch(e){
    rememberInMemory(key,raw);
    putSnapshot(LEGACY_SNAPSHOT,raw);
    if(!isQuota(e)){setStorageFlag(false);STATUS.localStorageReady=false}
    STATUS.lastError=errText(e);
    return false;
   }
  }
  try{
   localStorage.setItem(key,raw);
   forgetInMemory(key);
   STATUS.localStorageReady=true;
   setStorageFlag(true);
   if(key===stateKey)putSnapshot(STATE_SNAPSHOT,raw);
   return true;
  }catch(first){
   if(isQuota(first)){
    try{
     localStorage.removeItem(legacyKey);
     localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now()}));
     localStorage.setItem(key,raw);
     forgetInMemory(key);
     STATUS.localStorageReady=true;
     STATUS.legacyMoved=true;
     setStorageFlag(true);
     if(key===stateKey)putSnapshot(STATE_SNAPSHOT,raw);
     return true;
    }catch(second){STATUS.lastError=errText(second)}
   }else STATUS.lastError=errText(first);
   rememberInMemory(key,raw);
   STATUS.localStorageReady=false;
   setStorageFlag(false);
   if(key===stateKey)putSnapshot(STATE_SNAPSHOT,raw);
   return false;
  }
 };
 patched.__aaResiliencePatched=true;
 storageSet=patched;
}
async function boot(attempt=0){
 if(typeof STORE_KEY==='undefined'||typeof storageSet!=='function'){
  if(attempt<40)setTimeout(()=>boot(attempt+1),50);
  return;
 }
 const stateKey=STORE_KEY;
 const legacyKey=stateKey+'_pre_v2';
 patchStorage(stateKey,legacyKey);
 patchWarning();
 try{await openDB()}catch(_){ }
 await moveLegacyBackup(stateKey,legacyKey);
 const lsOK=directProbe();
 setStorageFlag(lsOK);
 await recoverNewestState(stateKey);
 if(lsOK){
  try{if(typeof save==='function')save()}catch(e){STATUS.lastError=errText(e)}
 }
 renderSoon();
}
boot();
})();
