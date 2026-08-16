(()=>{'use strict';
if(window.__AA_STORAGE_V1_EXACT_RECOVERY_V1__)return;window.__AA_STORAGE_V1_EXACT_RECOVERY_V1__=true;
const VERSION='1.0.0';
const DB_NAME='asahigaoka-aa-os-storage',DB_STORE='snapshots';
const MAIN_KEY='asahi_learning_os_v1',LEGACY_LOCAL_KEY='asahi_learning_os_v1_pre_v2';
const V1_STATE_KEY='state',V1_LEGACY_KEY='legacy-pre-v2';
const STATUS=window.__AA_STORAGE_V1_EXACT_STATUS__={version:VERSION,checked:false,before:0,after:0,added:0,entries:[],error:null};
function parse(s){try{return JSON.parse(s)}catch(_){return null}}
function looks(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&(Array.isArray(x.attempts)||x.mastery||x.items||x.profile||x.schemaVersion!=null)}
function akey(a){if(!a||typeof a!=='object')return'';return String(a.attemptId||`${a.itemId||''}:${a.timestamp||''}:${a.answer??''}`)}
function count(x){const s=new Set();for(const a of (Array.isArray(x?.attempts)?x.attempts:[])){const k=akey(a);if(k)s.add(k)}return s.size}
function range(x){const ts=(Array.isArray(x?.attempts)?x.attempts:[]).map(a=>Number(a?.timestamp)).filter(Number.isFinite).sort((a,b)=>a-b);return ts.length?{first:ts[0],last:ts[ts.length-1]}:{first:null,last:null}}
function unwrap(v){if(looks(v))return v;if(v&&typeof v==='object'&&typeof v.raw==='string'){const x=parse(v.raw);if(looks(x))return x}return null}
function localObj(key){try{return unwrap(parse(localStorage.getItem(key)))}catch(_){return null}}
async function idbKey(key){return new Promise(resolve=>{if(!('indexedDB'in window)){resolve({row:null,obj:null});return}let req;try{req=indexedDB.open(DB_NAME)}catch(_){resolve({row:null,obj:null});return}req.onerror=()=>resolve({row:null,obj:null});req.onupgradeneeded=()=>{};req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE)){db.close();resolve({row:null,obj:null});return}try{const tx=db.transaction(DB_STORE,'readonly'),r=tx.objectStore(DB_STORE).get(key);r.onsuccess=()=>{const row=r.result||null;db.close();resolve({row,obj:unwrap(row)})};r.onerror=()=>{db.close();resolve({row:null,obj:null})}}catch(_){db.close();resolve({row:null,obj:null})}}})}
function entry(source,obj,wrapperUpdatedAt=null){const rr=range(obj);return{source,found:!!obj,attempts:obj?count(obj):0,firstAt:rr.first,lastAt:rr.last,wrapperUpdatedAt:Number(wrapperUpdatedAt)||null}}
async function inspect(){
 const localMain=localObj(MAIN_KEY),localLegacy=localObj(LEGACY_LOCAL_KEY),idbState=await idbKey(V1_STATE_KEY),idbLegacy=await idbKey(V1_LEGACY_KEY);
 STATUS.entries=[entry('local-main',localMain),entry('local-pre-v2',localLegacy),entry('v1-idb-state',idbState.obj,idbState.row?.updatedAt),entry('v1-idb-legacy-pre-v2',idbLegacy.obj,idbLegacy.row?.updatedAt)];
 STATUS.checked=true;return{localMain,localLegacy,idbState:idbState.obj,idbLegacy:idbLegacy.obj,entries:STATUS.entries};
}
function toast(text){try{document.getElementById('aaV1RecoveryToast')?.remove();const d=document.createElement('div');d.id='aaV1RecoveryToast';d.textContent=text;d.style.cssText='position:fixed;left:14px;right:14px;top:calc(12px + env(safe-area-inset-top,0px));z-index:2147483647;padding:13px 15px;border-radius:14px;background:#101828;color:#fff;font:700 13px/1.5 -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI",sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.28)';document.body.appendChild(d);setTimeout(()=>d.remove(),12000)}catch(_){}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtDate(t){if(!t)return'--';const d=new Date(Number(t));if(!Number.isFinite(d.getTime()))return'--';return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function renderCard(){
 const host=document.getElementById('aaDailyAnalyticsCard');if(!host||!STATUS.checked)return;
 let box=document.getElementById('aaV1StorageDiagnostic');if(!box){box=document.createElement('div');box.id='aaV1StorageDiagnostic';box.className='notice';const h=host.querySelector('.aaSummary');if(h)h.insertAdjacentElement('beforebegin',box);else host.prepend(box)}
 const rows=STATUS.entries.map(e=>`<div style="display:flex;justify-content:space-between;gap:10px;margin-top:5px"><span>${esc(e.source)}</span><b>${e.found?e.attempts+'問':'なし'}</b></div>${e.found&&e.lastAt?`<div style="font-size:10px;color:var(--sub);text-align:right">最終回答 ${fmtDate(e.lastAt)}</div>`:''}`).join('');
 box.innerHTML=`<b>V1保存領域を直接調査</b><br><span style="font-size:11px">V1が使っていた固定キー state / legacy-pre-v2 と旧localStorageを個別確認しています。削除はしません。</span>${rows}<div style="margin-top:7px"><b>V1から追加復旧：${STATUS.added}問</b>（現在 ${STATUS.after||STATUS.before}問）</div>`;
}
async function recoverExact(forceNotice=false){
 try{
  if(typeof mergeState!=='function'||typeof save!=='function'||typeof state==='undefined'){setTimeout(()=>recoverExact(forceNotice),300);return false}
  const data=await inspect(),before=count(state);STATUS.before=before;let merged=state,sources=[];
  const candidates=[['local-main',data.localMain],['local-pre-v2',data.localLegacy],['v1-idb-state',data.idbState],['v1-idb-legacy-pre-v2',data.idbLegacy]];
  for(const [source,obj] of candidates){if(!looks(obj))continue;const prior=count(merged);try{state=merged;merged=mergeState(obj)}catch(_){continue}if(count(merged)>prior)sources.push(source)}
  state=merged;const after=count(state),added=Math.max(0,after-before);STATUS.after=after;STATUS.added=added;STATUS.sources=[...new Set(sources)];
  if(added>0){save();try{render()}catch(_){};toast(`V1保存領域から${added}問を追加復旧しました（合計${after}問）`)}else if(forceNotice)toast(`V1保存領域を直接調査しました。追加できる回答はありませんでした（現在${after}問）`);
  renderCard();document.dispatchEvent(new CustomEvent('aa:v1-storage-inspected',{detail:{...STATUS}}));return added>0;
 }catch(e){STATUS.error=String(e);STATUS.checked=true;renderCard();if(forceNotice)toast('V1保存領域の調査中にエラーが発生しました。');return false}
}
window.AAStorageV1ExactRecovery={version:VERSION,status:STATUS,inspect,recover:()=>recoverExact(true)};
new MutationObserver(()=>renderCard()).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>recoverExact(false),900);setTimeout(()=>{inspect().then(renderCard)},3200);
})();