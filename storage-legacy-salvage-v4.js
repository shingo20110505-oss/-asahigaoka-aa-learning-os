(()=>{'use strict';
if(window.__AA_STORAGE_LEGACY_SALVAGE_V4__)return;window.__AA_STORAGE_LEGACY_SALVAGE_V4__=true;
const VERSION='4.0.0',DB_NAME='asahigaoka-aa-os-storage',DB_STORE='snapshots',MAIN_KEY='asahi_learning_os_v1',DONE_KEY='aa-storage-legacy-salvage-v4-last';
const STATUS=window.__AA_STORAGE_LEGACY_SALVAGE_STATUS__={version:VERSION,scannedLocal:0,scannedIdb:0,candidates:0,before:0,after:0,added:0,sources:[],error:null};
function parse(s){try{return JSON.parse(s)}catch(_){return null}}
function looks(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&(Array.isArray(x.attempts)||x.mastery||x.items||x.profile||x.schemaVersion!=null)}
function akey(a){if(!a||typeof a!=='object')return'';return String(a.attemptId||`${a.itemId||''}:${a.timestamp||''}:${a.answer??''}`)}
function count(x){const s=new Set();for(const a of (Array.isArray(x?.attempts)?x.attempts:[])){const k=akey(a);if(k)s.add(k)}return s.size}
function shell(attempts){return{schemaVersion:4,attempts:Array.isArray(attempts)?attempts:[],mastery:{},items:{},stats:{days:{}},profile:{}}}
function add(out,seen,source,obj){if(!looks(obj))return;let raw='';try{raw=JSON.stringify(obj)}catch(_){return}const sig=`${count(obj)}:${raw.length}:${raw.slice(0,64)}:${raw.slice(-64)}`;if(seen.has(sig))return;seen.add(sig);out.push({source,obj})}
function notify(text){try{document.getElementById('aaLegacySalvageToast')?.remove();const d=document.createElement('div');d.id='aaLegacySalvageToast';d.textContent=text;d.style.cssText='position:fixed;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483647;padding:13px 15px;border-radius:14px;background:#101828;color:white;font:700 13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI",sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.28)';document.body.appendChild(d);setTimeout(()=>d.remove(),12000)}catch(_){}}
async function idbAll(){return new Promise(resolve=>{if(!('indexedDB'in window)){resolve([]);return}let req;try{req=indexedDB.open(DB_NAME)}catch(_){resolve([]);return}req.onerror=()=>resolve([]);req.onupgradeneeded=()=>{};req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE)){db.close();resolve([]);return}try{const tx=db.transaction(DB_STORE,'readonly'),st=tx.objectStore(DB_STORE),kr=st.getAllKeys(),vr=st.getAll();let keys=null,vals=null,done=()=>{if(keys&&vals){db.close();resolve(keys.map((k,i)=>({key:k,value:vals[i]})))}};kr.onsuccess=()=>{keys=kr.result||[];done()};vr.onsuccess=()=>{vals=vr.result||[];done()};kr.onerror=vr.onerror=()=>{db.close();resolve([])}}catch(_){db.close();resolve([])}}})}
async function collect(){const out=[],seen=new Set();
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k)continue;const raw=localStorage.getItem(k);STATUS.scannedLocal++;const obj=parse(raw);if(looks(obj))add(out,seen,`local:${k}`,obj);else if(obj&&Array.isArray(obj.attempts)&&obj.attempts.length)add(out,seen,`local-journal:${k}`,shell(obj.attempts))}}catch(e){STATUS.error=String(e)}
 const rows=await idbAll();STATUS.scannedIdb=rows.length;for(const row of rows){const k=String(row.key),v=row.value;if(looks(v))add(out,seen,`idb:${k}`,v);if(v&&typeof v==='object'){if(typeof v.raw==='string'){const o=parse(v.raw);if(looks(o))add(out,seen,`idb-raw:${k}`,o)}if(Array.isArray(v.attempts)&&v.attempts.length)add(out,seen,`idb-attempts:${k}`,shell(v.attempts))}}
 STATUS.candidates=out.length;return out}
async function run(force=false){try{
 if(typeof mergeState!=='function'||typeof save!=='function'||typeof state==='undefined'){setTimeout(()=>run(force),250);return false}
 const before=count(state);STATUS.before=before;const cs=await collect();let merged=state,sources=[];
 for(const c of cs.sort((a,b)=>count(a.obj)-count(b.obj))){const prior=count(merged);try{state=merged;merged=mergeState(c.obj)}catch(_){continue}if(count(merged)>prior)sources.push(c.source)}
 state=merged;const after=count(state),added=Math.max(0,after-before);STATUS.after=after;STATUS.added=added;STATUS.sources=[...new Set(sources)];
 if(added>0){save();try{localStorage.setItem(DONE_KEY,JSON.stringify({at:Date.now(),before,after,added,sources:STATUS.sources}))}catch(_){};try{await window.AAStorageRecoveryV3?.recover?.()}catch(_){};try{render()}catch(_){};notify(`過去の端末保存領域から学習履歴を${added}問復旧しました（合計${after}問）`);document.dispatchEvent(new CustomEvent('aa:legacy-storage-salvaged',{detail:{before,after,added,sources:STATUS.sources}}));return true}
 if(force)notify(`端末内の旧保存領域を全走査しましたが、追加で復旧できる回答は見つかりませんでした（現在${after}問）`);
 return false
 }catch(e){STATUS.error=String(e);if(force)notify('旧保存領域の走査中にエラーが発生しました。');return false}}
window.AAStorageLegacySalvageV4={version:VERSION,status:STATUS,run:()=>run(true),inspect:collect};
setTimeout(()=>run(false),500);setTimeout(()=>run(false),2500);
})();