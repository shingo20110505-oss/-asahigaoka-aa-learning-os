(()=>{'use strict';
if(window.__AA_VOCAB_ROW_TOGGLE_V1__)return;window.__AA_VOCAB_ROW_TOGGLE_V1__=true;
const STORE='aa-vocab-row-toggle-session-v1';
let state={};
try{state=JSON.parse(sessionStorage.getItem(STORE)||'{}')||{}}catch(_){state={}}
function save(){try{sessionStorage.setItem(STORE,JSON.stringify(state))}catch(_){}}
function rowId(row){return row?.querySelector('td:nth-child(7) [data-s]')?.dataset?.s||''}
function actualHidden(id,part){const o=state[id]?.[part];if(o==='hide')return true;if(o==='show')return false;return document.body.classList.contains(part==='word'?'aa-vocab-hide-word':'aa-vocab-hide-meaning')}
function setOverride(id,part,mode){if(!id)return;if(!state[id])state[id]={};if(mode)state[id][part]=mode;else delete state[id][part];if(!state[id].word&&!state[id].meaning)delete state[id];save()}
function applyRow(row){const id=rowId(row);if(!id)return;const s=state[id]||{};row.classList.toggle('aa-row-hide-word',s.word==='hide');row.classList.toggle('aa-row-show-word',s.word==='show');row.classList.toggle('aa-row-hide-meaning',s.meaning==='hide');row.classList.toggle('aa-row-show-meaning',s.meaning==='show');const w=row.querySelector('td:nth-child(2)'),m=row.querySelector('td:nth-child(4)');if(w){w.dataset.aaTapToggle='word';w.setAttribute('role','button');w.setAttribute('tabindex','0');w.setAttribute('aria-label','英単語を表示・非表示');w.setAttribute('aria-pressed',String(actualHidden(id,'word')))}if(m){m.dataset.aaTapToggle='meaning';m.setAttribute('role','button');m.setAttribute('tabindex','0');m.setAttribute('aria-label','日本語訳を表示・非表示');m.setAttribute('aria-pressed',String(actualHidden(id,'meaning')))}}
function applyAll(){document.querySelectorAll('.vtable tbody tr').forEach(applyRow)}
function toggle(el){const row=el.closest('tr'),id=rowId(row),part=el.dataset.aaTapToggle;if(!id||!part)return;setOverride(id,part,actualHidden(id,part)?'show':'hide');applyRow(row)}
const style=document.createElement('style');style.id='aa-vocab-row-toggle-style';style.textContent=`
 .vtable td[data-aa-tap-toggle]{cursor:pointer;-webkit-tap-highlight-color:rgba(49,91,214,.12);touch-action:manipulation}
 .vtable tr.aa-row-hide-word td:nth-child(2) .word{color:transparent!important;background:#e8edf4!important;border-radius:7px!important;box-shadow:inset 0 0 0 1px #d7dee8!important;user-select:none!important;text-shadow:none!important;min-width:7.5em!important;display:inline-block!important}
 .vtable tr.aa-row-hide-meaning td:nth-child(4){color:transparent!important;background:#f2f4f7!important;border-radius:7px!important;user-select:none!important;text-shadow:none!important;min-height:1.6em!important}
 body.aa-vocab-hide-word .vtable tr.aa-row-show-word td:nth-child(2) .word{color:var(--ink)!important;background:transparent!important;box-shadow:none!important;user-select:auto!important;text-shadow:none!important;min-width:0!important;display:inline!important}
 body.aa-vocab-hide-meaning .vtable tr.aa-row-show-meaning td:nth-child(4){color:var(--ink)!important;background:transparent!important;user-select:auto!important;text-shadow:none!important}
 body.aa-vocab-hide-meaning .vtable tr.aa-row-show-meaning td:nth-child(4)::after{display:none!important;content:none!important}
 .vtable td[data-aa-tap-toggle]:active{opacity:.72}
`;
document.head.appendChild(style);
document.addEventListener('click',e=>{const el=e.target.closest?.('.vtable td[data-aa-tap-toggle]');if(!el||e.target.closest('button,a,input,select,textarea'))return;toggle(el)},true);
document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const el=e.target.closest?.('.vtable td[data-aa-tap-toggle]');if(!el)return;e.preventDefault();toggle(el)},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('#aa-vocab-recall-controls button[data-target]');if(!b)return;const part=b.dataset.target;if(part!=='word'&&part!=='meaning')return;for(const id of Object.keys(state)){delete state[id][part];if(!state[id].word&&!state[id].meaning)delete state[id]}save();setTimeout(applyAll,0)},true);
const mo=new MutationObserver(()=>applyAll());mo.observe(document.body,{childList:true,subtree:true});
applyAll();
document.body?.setAttribute('data-aa-vocab-row-toggle','v1');
})();
