(()=>{'use strict';
if(window.__AA_STORAGE_RESILIENCE_LOADED__)return;
window.__AA_STORAGE_RESILIENCE_LOADED__=true;

const VERSION='4.0.0';
const MAIN_KEY='asahi_learning_os_v1';
const LOCAL_BEST_KEY='aa-storage-best-v4';
const RESET_ARM_KEY='aa-storage-reset-armed-v4';
const DB_NAME='asahigaoka-aa-os-storage';
const DB_VERSION=1;
const DB_STORE='snapshots';
const DB_BEST_KEY='guard-best-v4';
const STATUS=window.__AA_STORAGE_RESILIENCE__={version:VERSION,guarded:true,lastError:null,blockedRegressions:0,recovered:false};
let dbPromise=null;

function parse(raw){try{return JSON.parse(raw)}catch(_){return null}}
function validState(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.attempts)}
function attemptCount(x){return validState(x)?x.attempts.length:-1}
function stronger(a,b){const ac=attemptCount(a),bc=attemptCount(b);if(ac!==bc)return ac>bc;return Number(a?.updatedAt||0)>=Number(b?.updatedAt||0)}
function rawState(raw){const x=parse(raw);return validState(x)?x:null}
function directGet(k){try{return localStorage.getItem(k)}catch(e){STATUS.lastError=String(e);return null}}
function directSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){STATUS.lastError=String(e);return false}}
function directRemove(k){try{localStorage.removeItem(k)}catch(_){}}
function resetArmed(){try{return Date.now()-Number(sessionStorage.getItem(RESET_ARM_KEY)||0)<7000}catch(_){return false}}
function armReset(){try{sessionStorage.setItem(RESET_ARM_KEY,String(Date.now()))}catch(_){}}
function disarmReset(){try{sessionStorage.removeItem(RESET_ARM_KEY)}catch(_){}}

function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB'in window)){reject(new Error('IndexedDB unavailable'));return}
  let req;try{req=indexedDB.open(DB_NAME,DB_VERSION)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));req.onblocked=()=>reject(new Error('IndexedDB blocked'));
 }).catch(e=>{STATUS.lastError=String(e);throw e});
 return dbPromise;
}
async function idbGet(){try{const db=await openDB();return await new Promise(resolve=>{const tx=db.transaction(DB_STORE,'readonly'),r=tx.objectStore(DB_STORE).get(DB_BEST_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null)})}catch(_){return null}}
async function idbPut(raw){const obj=rawState(raw);if(!obj)return false;try{const old=await idbGet(),oldObj=rawState(old?.raw||'');if(oldObj&&stronger(oldObj,obj))return false;const db=await openDB();return await new Promise(resolve=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({raw,attempts:obj.attempts.length,updatedAt:Date.now(),version:VERSION},DB_BEST_KEY);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false)})}catch(_){return false}}
async function idbClear(){try{const db=await openDB();await new Promise(resolve=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(DB_BEST_KEY);tx.oncomplete=tx.onerror=tx.onabort=()=>resolve()})}catch(_){}}

function preserveBest(raw){
 const obj=rawState(raw);if(!obj)return;
 const curRaw=directGet(LOCAL_BEST_KEY),cur=rawState(curRaw);
 if(!cur||!stronger(cur,obj))directSet(LOCAL_BEST_KEY,raw);
 idbPut(raw);
}
function clearBest(){directRemove(LOCAL_BEST_KEY);idbClear()}
function strongestLocal(){
 const mainRaw=directGet(MAIN_KEY),bestRaw=directGet(LOCAL_BEST_KEY),main=rawState(mainRaw),best=rawState(bestRaw);
 if(main&&best)return stronger(best,main)?{raw:bestRaw,obj:best}:{raw:mainRaw,obj:main};
 if(best)return{raw:bestRaw,obj:best};if(main)return{raw:mainRaw,obj:main};return null;
}
function restoreRaw(raw){
 const obj=rawState(raw);if(!obj)return false;
 if(!directSet(MAIN_KEY,raw))return false;
 try{if(typeof state!=='undefined')state=typeof migrate==='function'?migrate(obj):obj}catch(_){ }
 STATUS.recovered=true;try{if(typeof render==='function')setTimeout(()=>render(),0)}catch(_){ }
 return true;
}

function installGuard(){
 if(typeof storageSet!=='function'||storageSet.__aaLossGuardV4)return false;
 const original=storageSet;
 const guarded=function(key,value){
  const raw=String(value);
  if(key!==MAIN_KEY)return original(key,value);
  const incoming=rawState(raw);if(!incoming)return original(key,value);
  const armed=resetArmed();
  if(armed&&incoming.attempts.length===0){clearBest();disarmReset();const r=original(key,value);preserveBest(raw);return r}
  const strongest=strongestLocal();
  if(strongest&&attemptCount(incoming)<attemptCount(strongest.obj)){
   STATUS.blockedRegressions++;
   restoreRaw(strongest.raw);
   preserveBest(strongest.raw);
   return true;
  }
  const before=directGet(MAIN_KEY);if(before)preserveBest(before);
  const r=original(key,value);preserveBest(raw);return r;
 };
 guarded.__aaLossGuardV4=true;guarded.__original=original;storageSet=guarded;return true;
}

async function boot(attempt=0){
 if(typeof storageSet!=='function'){if(attempt<120)setTimeout(()=>boot(attempt+1),50);return}
 installGuard();
 const local=strongestLocal();if(local)preserveBest(local.raw);
 const idb=await idbGet(),idbObj=rawState(idb?.raw||'');
 const current=strongestLocal();
 if(idbObj&&(!current||stronger(idbObj,current.obj)))restoreRaw(idb.raw);
 const final=strongestLocal();if(final)preserveBest(final.raw);
}

document.addEventListener('click',e=>{if(e.target.closest?.('[data-action="reset"]'))armReset()},true);
window.AAStorageLossGuard={version:VERSION,status:STATUS,inspect:()=>{const x=strongestLocal();return{x:x?attemptCount(x.obj):0,blocked:STATUS.blockedRegressions}},preserve:()=>{const x=strongestLocal();if(x)preserveBest(x.raw)}};
boot();
})();
