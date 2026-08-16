(()=>{'use strict';
if(window.__AA_STORAGE_RESILIENCE_LOADED__)return;
window.__AA_STORAGE_RESILIENCE_LOADED__=true;

const VERSION='3.0.0';
const DB_NAME='asahigaoka-aa-os-storage';
const DB_VERSION=1;
const DB_STORE='snapshots';
const STATE_SNAPSHOT='state';
const LEGACY_SNAPSHOT='legacy-pre-v2';
const ARCHIVE_INDEX='state-archive-index-v3';
const ATTEMPT_JOURNAL='attempt-journal-v3';
const SESSION_JOURNAL='session-journal-v3';
const AUTO_RECOVERY_KEY='aa-storage-auto-recovery-v3';
const RESET_INTENT_KEY='aa-storage-reset-intent-v3';
const MAX_ARCHIVES=24;
const MAX_ATTEMPTS=10000;
const STATUS=window.__AA_STORAGE_RESILIENCE__={
 version:VERSION,idbReady:false,localStorageReady:false,recovered:false,recoveredFrom:[],
 recoveredAttempts:0,recoveredAdded:0,suspiciousLoss:false,recoveryUnavailable:false,
 candidates:[],archiveCount:0,journalAttempts:0,legacyMoved:false,lastError:null
};
let dbPromise=null,archiveBusy=Promise.resolve(),journalBusy=Promise.resolve();

function errText(e){return e&&(`${e.name||'Error'}: ${e.message||String(e)}`)}
function isQuota(e){return !!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014)}
function parse(raw){try{return JSON.parse(raw)}catch(_){return null}}
function looksLikeState(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&(Array.isArray(x.attempts)||x.mastery||x.items||x.profile||x.schemaVersion!=null)}
function n(v){v=Number(v);return Number.isFinite(v)?Math.max(0,v):0}
function attemptKey(a){if(!a||typeof a!=='object')return'';return String(a.attemptId||`${a.itemId||''}:${a.timestamp||''}:${a.answer??''}`)}
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
function fingerprint(raw,obj){const m=metrics(obj);let h=2166136261>>>0,s=String(raw||'');for(let i=0;i<s.length;i+=Math.max(1,Math.floor(s.length/256))){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return `${m?.attempts||0}:${m?.masteryAttempts||0}:${m?.updatedAt||0}:${s.length}:${h.toString(36)}`}
function directGet(key){try{return localStorage.getItem(key)}catch(e){STATUS.lastError=errText(e);return null}}
function directSet(key,value){try{localStorage.setItem(key,value);return true}catch(e){STATUS.lastError=errText(e);return false}}
function directProbe(){const k='__aa_storage_probe__';try{localStorage.setItem(k,'1');localStorage.removeItem(k);STATUS.localStorageReady=true;return true}catch(e){STATUS.localStorageReady=false;STATUS.lastError=errText(e);return false}}
function rememberInMemory(key,value){try{if(typeof memStore!=='undefined'&&memStore)memStore[key]=value}catch(_){}}
function forgetInMemory(key){try{if(typeof memStore!=='undefined'&&memStore)delete memStore[key]}catch(_){}}
function setStorageFlag(ok){try{if(typeof storageOK!=='undefined')storageOK=!!ok}catch(_){}}
function renderSoon(){try{if(typeof render==='function')setTimeout(()=>{try{render()}catch(_){}},0)}catch(_){}}
function notify(text){try{const id='aaStorageRecoveryToast';document.getElementById(id)?.remove();const el=document.createElement('div');el.id=id;el.textContent=text;el.style.cssText='position:fixed;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483647;padding:13px 15px;border-radius:14px;background:#101828;color:#fff;font:700 13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI",sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.28)';document.body.appendChild(el);setTimeout(()=>el.remove(),10000)}catch(_){}}
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
async function getSnapshot(key){try{const db=await openDB();return await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),r=tx.objectStore(DB_STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error||new Error('IndexedDB read failed'))})}catch(e){STATUS.lastError=errText(e);return null}}
async function putSnapshot(key,value){try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'))});return true}catch(e){STATUS.lastError=errText(e);return false}}
async function deleteSnapshot(key){try{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB delete failed'))});return true}catch(_){return false}}

async function journalStateRawNow(raw){
 const obj=parse(raw);if(!looksLikeState(obj))return false;
 const old=await getSnapshot(ATTEMPT_JOURNAL),map=new Map();
 for(const a of (Array.isArray(old?.attempts)?old.attempts:[])){const k=attemptKey(a);if(k)map.set(k,a)}
 for(const a of (Array.isArray(obj.attempts)?obj.attempts:[])){const k=attemptKey(a);if(k)map.set(k,a)}
 let attempts=[...map.values()].filter(a=>Number.isFinite(Number(a?.timestamp))).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
 if(attempts.length>MAX_ATTEMPTS)attempts=attempts.slice(-MAX_ATTEMPTS);
 await putSnapshot(ATTEMPT_JOURNAL,{attempts,updatedAt:Date.now(),version:VERSION});STATUS.journalAttempts=attempts.length;
 const ss=obj.session;if(ss&&typeof ss==='object'&&ss.id){const rec=await getSnapshot(SESSION_JOURNAL),sessions={...(rec?.sessions||{})};sessions[ss.id]={id:ss.id,startedAt:n(ss.startedAt),endedAt:n(ss.endedAt)||null,accumulatedMs:n(ss.accumulatedMs),active:!!ss.active,abandoned:!!ss.abandoned,mode:ss.mode||'',kind:ss.kind||'',subject:ss.subject||'',updatedAt:Date.now()};const ids=Object.keys(sessions);if(ids.length>1000){ids.sort((a,b)=>(sessions[a].updatedAt||0)-(sessions[b].updatedAt||0));for(const id of ids.slice(0,ids.length-1000))delete sessions[id]}await putSnapshot(SESSION_JOURNAL,{sessions,updatedAt:Date.now(),version:VERSION})}
 return true;
}
function journalStateRaw(raw){journalBusy=journalBusy.then(()=>journalStateRawNow(raw)).catch(e=>{STATUS.lastError=errText(e)});return journalBusy}

async function putStrongStateSnapshot(raw){const obj=parse(raw);if(!looksLikeState(obj))return false;const old=await getSnapshot(STATE_SNAPSHOT),oldObj=parse(old?.raw||'');if(looksLikeState(oldObj)&&compareMetrics(metrics(oldObj),metrics(obj))>0)return false;return putSnapshot(STATE_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(obj),version:VERSION})}
async function archiveRawNow(raw,reason='save'){
 const obj=parse(raw);if(!looksLikeState(obj))return false;const m=metrics(obj);if(!m)return false;m.bytes=String(raw).length;
 const fp=fingerprint(raw,obj),idxRec=await getSnapshot(ARCHIVE_INDEX),idx=Array.isArray(idxRec?.entries)?idxRec.entries:[];
 if(idx.some(x=>x.fp===fp)){STATUS.archiveCount=idx.length;return false}
 const key=`archive:${Date.now()}:${m.attempts}:${Math.random().toString(36).slice(2,7)}`;await putSnapshot(key,{raw,updatedAt:Date.now(),reason,metrics:m,fp,version:VERSION});idx.push({key,at:Date.now(),reason,metrics:m,fp});idx.sort((a,b)=>b.at-a.at);
 while(idx.length>MAX_ARCHIVES){const old=idx.pop();if(old?.key)await deleteSnapshot(old.key)}await putSnapshot(ARCHIVE_INDEX,{entries:idx,updatedAt:Date.now(),version:VERSION});STATUS.archiveCount=idx.length;return true;
}
function archiveRaw(raw,reason){archiveBusy=archiveBusy.then(()=>archiveRawNow(raw,reason)).catch(e=>{STATUS.lastError=errText(e)});return archiveBusy}
async function archiveCandidates(){const idxRec=await getSnapshot(ARCHIVE_INDEX),idx=Array.isArray(idxRec?.entries)?idxRec.entries:[],out=[];for(const x of idx){const rec=await getSnapshot(x.key);if(rec?.raw)out.push({source:x.key,raw:rec.raw,obj:parse(rec.raw)})}STATUS.archiveCount=idx.length;return out}
function addCandidate(out,source,raw){const obj=parse(raw);if(!looksLikeState(obj))return;const m=metrics(obj);m.bytes=String(raw||'').length;out.push({source,raw,obj,metrics:m,fp:fingerprint(raw,obj)})}
async function collectCandidates(stateKey,legacyKey){
 const out=[];try{if(typeof state!=='undefined'&&looksLikeState(state))addCandidate(out,'memory',JSON.stringify(state))}catch(_){}
 addCandidate(out,'local-main',directGet(stateKey));addCandidate(out,'local-legacy',directGet(legacyKey));
 const snap=await getSnapshot(STATE_SNAPSHOT),legacy=await getSnapshot(LEGACY_SNAPSHOT);addCandidate(out,'idb-state',snap?.raw);addCandidate(out,'idb-legacy',legacy?.raw);
 for(const x of await archiveCandidates())addCandidate(out,x.source,x.raw);
 const j=await getSnapshot(ATTEMPT_JOURNAL);if(Array.isArray(j?.attempts)&&j.attempts.length){STATUS.journalAttempts=j.attempts.length;const shell={schemaVersion:4,attempts:j.attempts,mastery:{},items:{},stats:{days:{}},profile:{}};addCandidate(out,'attempt-journal',JSON.stringify(shell))}
 const seen=new Set(),dedup=[];for(const c of out){if(seen.has(c.fp))continue;seen.add(c.fp);dedup.push(c)}dedup.sort((a,b)=>compareMetrics(b.metrics,a.metrics));STATUS.candidates=dedup.map(c=>({source:c.source,...c.metrics}));return dedup;
}
function recentResetIntent(){const t=n(directGet(RESET_INTENT_KEY));return t&&Date.now()-t<10*60*1000}
async function purgeRecoveryStores(){
 const idxRec=await getSnapshot(ARCHIVE_INDEX),idx=Array.isArray(idxRec?.entries)?idxRec.entries:[];for(const x of idx)if(x?.key)await deleteSnapshot(x.key);
 for(const k of [ARCHIVE_INDEX,ATTEMPT_JOURNAL,SESSION_JOURNAL,STATE_SNAPSHOT,LEGACY_SNAPSHOT])await deleteSnapshot(k);
 STATUS.archiveCount=0;STATUS.journalAttempts=0;
}
function markResetIntent(){try{localStorage.setItem(RESET_INTENT_KEY,String(Date.now()));setTimeout(async()=>{try{const cur=parse(localStorage.getItem(typeof STORE_KEY!=='undefined'?STORE_KEY:'asahi_learning_os_v1'));if(looksLikeState(cur)&&Array.isArray(cur.attempts)&&cur.attempts.length===0)await purgeRecoveryStores()}catch(_){}},500)}catch(_){}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-action="reset"]'))markResetIntent()},true);

async function moveLegacyBackup(stateKey,legacyKey){const raw=directGet(legacyKey),obj=parse(raw);if(looksLikeState(obj)){await journalStateRawNow(raw);await archiveRaw(raw,'legacy-before-move');await putSnapshot(LEGACY_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(obj),version:VERSION})}const current=parse(directGet(stateKey));if(!looksLikeState(current)||!looksLikeState(obj))return false;try{localStorage.removeItem(legacyKey);localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now(),version:VERSION}));STATUS.legacyMoved=true;return true}catch(e){STATUS.lastError=errText(e);return false}}

function uniqueAttemptCount(x){const s=new Set();for(const a of (Array.isArray(x?.attempts)?x.attempts:[])){const k=attemptKey(a);if(k)s.add(k)}return s.size}
async function mergeAllCandidates(stateKey,legacyKey,{force=false}={}){
 const cs=await collectCandidates(stateKey,legacyKey);if(!cs.length)return false;
 let currentObj=null;try{if(typeof state!=='undefined'&&looksLikeState(state))currentObj=state}catch(_){}if(!currentObj)currentObj=parse(directGet(stateKey));if(!looksLikeState(currentObj))currentObj=cs[0].obj;
 const beforeCount=uniqueAttemptCount(currentObj),sources=[];let merged=currentObj,oldGlobal;
 try{oldGlobal=typeof state!=='undefined'?state:undefined}catch(_){}
 try{
  for(const c of [...cs].reverse()){
   if(!looksLikeState(c.obj))continue;
   const prior=uniqueAttemptCount(merged);
   if(typeof mergeState==='function'){
    try{if(typeof state!=='undefined')state=merged;merged=mergeState(c.obj)}catch(_){if(typeof migrate==='function')merged=migrate(merged)}
   }else{
    const by=new Map();for(const a of [...(merged.attempts||[]),...(c.obj.attempts||[])]){const k=attemptKey(a);if(k)by.set(k,a)}merged={...merged,attempts:[...by.values()].sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0))}
    if(typeof migrate==='function')merged=migrate(merged);
   }
   if(uniqueAttemptCount(merged)>prior)sources.push(c.source);
  }
 }finally{try{if(typeof state!=='undefined')state=merged}catch(_){}}
 const afterCount=uniqueAttemptCount(merged),added=Math.max(0,afterCount-beforeCount);
 STATUS.suspiciousLoss=added>0;
 if(!force&&recentResetIntent())return false;
 if(added<=0){const raw=JSON.stringify(merged);await journalStateRawNow(raw);await putStrongStateSnapshot(raw);return false}
 try{
  const beforeRaw=directGet(stateKey);if(beforeRaw)await archiveRaw(beforeRaw,'before-union-recovery');
  const raw=JSON.stringify(merged);if(typeof storageSet==='function')storageSet(stateKey,raw);else directSet(stateKey,raw);
  await journalStateRawNow(raw);await putStrongStateSnapshot(raw);await archiveRaw(raw,'after-union-recovery');
  STATUS.recovered=true;STATUS.recoveredFrom=[...new Set(sources)];STATUS.recoveredAttempts=afterCount;STATUS.recoveredAdded=added;STATUS.recoveryUnavailable=false;
  directSet(AUTO_RECOVERY_KEY,JSON.stringify({at:Date.now(),sources:STATUS.recoveredFrom,attempts:afterCount,added,version:VERSION}));
  try{localStorage.removeItem(RESET_INTENT_KEY)}catch(_){}
  renderSoon();notify(`学習履歴を復旧しました（+${added}問、合計${afterCount}問）`);document.dispatchEvent(new CustomEvent('aa:storage-recovered',{detail:{sources:STATUS.recoveredFrom,attempts:afterCount,added,version:VERSION}}));return true;
 }catch(e){STATUS.lastError=errText(e);try{if(oldGlobal&&typeof state!=='undefined')state=oldGlobal}catch(_){}return false}
}

function patchWarning(){try{if(typeof storageWarningHTML!=='function'||storageWarningHTML.__aaResiliencePatchedV3)return;const original=storageWarningHTML;const patched=function(){let extra='';if(STATUS.recovered)extra=`<div class="notice"><b>学習履歴を自動復旧：</b> 端末内の複数バックアップを統合し、${STATUS.recoveredAdded}問を追加して合計 ${STATUS.recoveredAttempts}問に戻しました。</div><div class="sp12"></div>`;else if(STATUS.recoveryUnavailable)extra=`<div class="notice"><b>学習履歴の復旧候補を確認中です。</b> アプリやSafariのWebサイトデータは削除しないでください。</div><div class="sp12"></div>`;try{if(typeof storageOK!=='undefined'&&storageOK)return extra}catch(_){}if(STATUS.idbReady)return extra+`<div class="notice"><b>保存方式を自動切替：</b> 学習状態は端末内のIndexedDBにも保存しています。</div><div class="sp12"></div>`;return extra+original()};patched.__aaResiliencePatchedV3=true;storageWarningHTML=patched}catch(e){STATUS.lastError=errText(e)}}
function patchStorage(stateKey,legacyKey){
 if(typeof storageSet!=='function'||storageSet.__aaResiliencePatchedV3)return;
 const patched=function(key,value){const raw=String(value);
  if(key===legacyKey){try{localStorage.setItem(key,raw);forgetInMemory(key);if(looksLikeState(parse(raw))){journalStateRaw(raw);archiveRaw(raw,'legacy-save');putSnapshot(LEGACY_SNAPSHOT,{raw,updatedAt:Date.now(),metrics:metrics(parse(raw)),version:VERSION})}return true}catch(e){rememberInMemory(key,raw);STATUS.lastError=errText(e);return false}}
  if(key===stateKey){const previous=directGet(key);if(previous&&previous!==raw&&looksLikeState(parse(previous))){journalStateRaw(previous);archiveRaw(previous,'before-main-save')}}
  try{localStorage.setItem(key,raw);forgetInMemory(key);STATUS.localStorageReady=true;setStorageFlag(true);if(key===stateKey){journalStateRaw(raw);putStrongStateSnapshot(raw);archiveRaw(raw,'main-save')}return true}
  catch(first){if(isQuota(first)){try{localStorage.removeItem(legacyKey);localStorage.setItem(legacyKey,JSON.stringify({movedTo:'IndexedDB',at:Date.now(),version:VERSION}));localStorage.setItem(key,raw);forgetInMemory(key);STATUS.localStorageReady=true;STATUS.legacyMoved=true;setStorageFlag(true);if(key===stateKey){journalStateRaw(raw);putStrongStateSnapshot(raw);archiveRaw(raw,'main-save-after-quota')}return true}catch(second){STATUS.lastError=errText(second)}}else STATUS.lastError=errText(first);rememberInMemory(key,raw);STATUS.localStorageReady=false;setStorageFlag(false);if(key===stateKey){journalStateRaw(raw);putStrongStateSnapshot(raw);archiveRaw(raw,'main-save-fallback')}return false}
 };
 patched.__aaResiliencePatchedV3=true;storageSet=patched;
}

async function boot(attempt=0){
 if(typeof STORE_KEY==='undefined'||typeof storageSet!=='function'){if(attempt<100)setTimeout(()=>boot(attempt+1),50);return}
 const stateKey=STORE_KEY,legacyKey=stateKey+'_pre_v2';patchStorage(stateKey,legacyKey);patchWarning();try{await openDB()}catch(_){}
 const initialMain=directGet(stateKey),initialLegacy=directGet(legacyKey);
 if(initialMain&&looksLikeState(parse(initialMain))){await journalStateRawNow(initialMain);await archiveRaw(initialMain,'boot-main')}
 if(initialLegacy&&looksLikeState(parse(initialLegacy))){await journalStateRawNow(initialLegacy);await archiveRaw(initialLegacy,'boot-legacy')}
 await moveLegacyBackup(stateKey,legacyKey);const lsOK=directProbe();setStorageFlag(lsOK);await mergeAllCandidates(stateKey,legacyKey);
 if(lsOK){try{if(typeof save==='function')save()}catch(e){STATUS.lastError=errText(e)}}renderSoon();
}
window.AAStorageRecoveryV3={
 version:VERSION,status:STATUS,
 inspect:async()=>{if(typeof STORE_KEY==='undefined')return[];const c=await collectCandidates(STORE_KEY,STORE_KEY+'_pre_v2');return c.map(x=>({source:x.source,...x.metrics}))},
 recover:async()=>{if(typeof STORE_KEY==='undefined')return false;return mergeAllCandidates(STORE_KEY,STORE_KEY+'_pre_v2',{force:true})},
 journal:async()=>{const j=await getSnapshot(ATTEMPT_JOURNAL);return{attempts:Array.isArray(j?.attempts)?j.attempts.length:0,updatedAt:j?.updatedAt||null}},
 purge:purgeRecoveryStores
};
window.AAStorageRecoveryV2=window.AAStorageRecoveryV3;
boot();
})();
