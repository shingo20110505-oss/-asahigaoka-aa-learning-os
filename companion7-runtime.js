(()=>{'use strict';
const STATE_KEY='aa-companion-voice-state-v1';
const LEGACY_KEY='aa-companion7-state-v3';
const DB_NAME='aa-companion-voice-v1';
const STORE='voices';
const TYPES=['correct','wrong','streak','hard','complete','start','idle'];
const S={enabled:true,volume:.8};
const A={cache:new Map(),current:null,urls:new Map(),unlocked:false,lastType:null,lastAt:0};
function loadState(){try{Object.assign(S,JSON.parse(localStorage.getItem(STATE_KEY)||'{}'))}catch(_){}try{const old=JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}');if(localStorage.getItem(STATE_KEY)==null&&typeof old.visible==='boolean')S.enabled=old.visible}catch(_){}S.enabled=S.enabled!==false;S.volume=Math.max(0,Math.min(1,Number(S.volume)||0))}
function save(){try{localStorage.setItem(STATE_KEY,JSON.stringify(S))}catch(_){}}
function killVisuals(){for(const id of ['companion7','aaPet','aaPetSheet','aaPetSettingCard','petSettingWrap','petSettingCard'])document.getElementById(id)?.remove();document.querySelectorAll('#companion7-css,[data-companion-visual]').forEach(x=>x.remove())}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function readBlob(type){if(A.cache.has(type))return A.cache.get(type);try{const db=await openDB();const v=await new Promise(ok=>{const tx=db.transaction(STORE,'readonly'),q=tx.objectStore(STORE).get(type);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)});db.close();A.cache.set(type,v);return v}catch(_){A.cache.set(type,null);return null}}
async function setVoice(type,file){if(!TYPES.includes(type))throw new Error('unknown voice type');const blob=file instanceof Blob?file:new Blob([file],{type:file?.type||'audio/mpeg'});const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,type);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();A.cache.delete(type);revoke(type);document.dispatchEvent(new CustomEvent('companion7:voice-library',{detail:{type,registered:true}}));return true}
async function removeVoice(type){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(type);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}catch(_){}A.cache.delete(type);revoke(type);document.dispatchEvent(new CustomEvent('companion7:voice-library',{detail:{type,registered:false}}));return true}
async function listVoices(){const out={};for(const t of TYPES)out[t]=!!(await readBlob(t));return out}
function revoke(type){const u=A.urls.get(type);if(u){URL.revokeObjectURL(u);A.urls.delete(type)}}
async function audioFor(type){const blob=await readBlob(type);if(!blob)return null;let u=A.urls.get(type);if(!u){u=URL.createObjectURL(blob);A.urls.set(type,u)}const a=new Audio(u);a.preload='auto';a.playsInline=true;a.volume=S.volume;return a}
async function playVoice(type){if(!S.enabled)return false;const now=performance.now();if(A.lastType===type&&now-A.lastAt<350)return false;A.lastType=type;A.lastAt=now;const a=await audioFor(type);if(!a){document.dispatchEvent(new CustomEvent('companion7:voice',{detail:{type,played:false,reason:'unregistered'}}));return false}try{if(A.current){A.current.pause();A.current.currentTime=0}A.current=a;a.volume=S.volume;await a.play();document.dispatchEvent(new CustomEvent('companion7:voice',{detail:{type,played:true}}));return true}catch(e){document.dispatchEvent(new CustomEvent('companion7:voice',{detail:{type,played:false,reason:'blocked'}}));return false}}
function event(type){const t=TYPES.includes(type)?type:(type==='tap'?'idle':type);document.dispatchEvent(new CustomEvent('companion7:event',{detail:{type:t,mode:'voice-only'}}));playVoice(t);return true}
function setEnabled(v){S.enabled=!!v;save();if(!S.enabled&&A.current){A.current.pause();A.current.currentTime=0}document.dispatchEvent(new CustomEvent('companion7:voice-setting',{detail:{enabled:S.enabled,volume:S.volume}}));return S.enabled}
function setVolume(v){S.volume=Math.max(0,Math.min(1,Number(v)||0));save();if(A.current)A.current.volume=S.volume;document.dispatchEvent(new CustomEvent('companion7:voice-setting',{detail:{enabled:S.enabled,volume:S.volume}}));return S.volume}
function unlock(){A.unlocked=true;for(const t of TYPES)readBlob(t);document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('touchstart',unlock,true);document.removeEventListener('keydown',unlock,true)}
function expression(name){document.dispatchEvent(new CustomEvent('companion7:expression',{detail:{name,visual:false}}))}
function bindAudio(){return false}
function show(v=true){return setEnabled(v)}
function start(){killVisuals();new MutationObserver(killVisuals).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('pointerdown',unlock,true);document.addEventListener('touchstart',unlock,true);document.addEventListener('keydown',unlock,true);setTimeout(killVisuals,0);setTimeout(killVisuals,500)}
loadState();save();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.Companion7={version:'7.4.2-voice',mode:'voice-only',state:S,event,playVoice,setVoice,removeVoice,listVoices,setEnabled,setVolume,show,expression,bindAudio,save,reloadTexture:()=>false,get source(){return 'voice-only'}};
})();