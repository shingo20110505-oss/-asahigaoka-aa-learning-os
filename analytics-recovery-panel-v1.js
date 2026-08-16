(()=>{'use strict';
if(window.__AA_ANALYTICS_RECOVERY_PANEL_V1__)return;window.__AA_ANALYTICS_RECOVERY_PANEL_V1__=true;
const MAIN_KEY='asahi_learning_os_v1',LEDGER_KEY='aa-daily-analytics-v1';
function safeParse(s,f){try{return JSON.parse(s)||f}catch(_){return f}}
function counts(){const s=safeParse(localStorage.getItem(MAIN_KEY),{}),l=safeParse(localStorage.getItem(LEDGER_KEY),{});return{attempts:Array.isArray(s?.attempts)?s.attempts.length:0,sessions:l&&l.sessions&&typeof l.sessions==='object'?Object.keys(l.sessions).length:0}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clarifyMetric(card){
 const boxes=[...card.querySelectorAll('.aaSummary>div')];
 const box=boxes.find(x=>(x.querySelector('span')?.textContent||'').includes('直近30日の学習日'));
 if(!box)return;const b=box.querySelector('b'),sp=box.querySelector('span');
 const m=(b?.textContent||'').match(/^(\d+)\s*\/\s*30$/);if(m)b.textContent=`${m[1]}日 / 30日`;
 if(sp)sp.textContent='直近30日のうち学習した日';
}
function removeMisleadingDateCopy(card){
 card.querySelectorAll('.tiny').forEach(el=>{const t=(el.textContent||'').trim();if(t.includes('端末のネイティブ時計で計算')||t.includes('日付は別フレームのネイティブ Date'))el.remove()});
}
async function inspect(){
 const api=window.AAStorageRecoveryV2;if(!api?.inspect)return null;
 try{const rows=await api.inspect();const arr=Array.isArray(rows)?rows:[];return{rows:arr,best:arr.reduce((m,x)=>Math.max(m,Number(x?.attempts)||0),0)}}catch(_){return null}
}
async function render(){
 const card=document.getElementById('aaDailyAnalyticsCard');if(!card)return;
 clarifyMetric(card);removeMisleadingDateCopy(card);
 let panel=document.getElementById('aaHistoryRecoveryPanel');if(!panel){panel=document.createElement('div');panel.id='aaHistoryRecoveryPanel';panel.style.margin='0 0 12px';const h=card.querySelector('.aaSummary');(h||card.firstChild)?.insertAdjacentElement?.('beforebegin',panel);if(!panel.isConnected)card.prepend(panel)}
 const c=counts();panel.innerHTML=`<div class="notice"><b>学習履歴の確認中…</b><br>現在の回答履歴 ${c.attempts}問 / 学習時間セッション ${c.sessions}件</div>`;
 const info=await inspect();if(!panel.isConnected)return;
 if(!info){panel.innerHTML=`<div class="notice"><b>学習履歴の診断を読み込めませんでした。</b><br>現在の回答履歴 ${c.attempts}問 / 学習時間セッション ${c.sessions}件</div>`;return}
 const best=info.best,hasBetter=best>c.attempts;
 const source=info.rows.find(x=>(Number(x?.attempts)||0)===best)?.source||'';
 if(hasBetter){panel.innerHTML=`<div class="notice"><b>端末内に復旧候補があります。</b><br>現在 ${c.attempts}問 / バックアップ最多 ${best}問${source?`（${esc(source)}）`:''}<div class="sp8"></div><button class="btn primary sm" type="button" data-aa-history-recover>このバックアップから復旧する</button></div>`}
 else if(c.attempts===0&&c.sessions>0){panel.innerHTML=`<div class="notice"><b>学習時間は残っていますが、回答履歴は0問です。</b><br>端末内バックアップを ${info.rows.length}件確認しました。最多でも ${best}問です。${best===0?' 現時点では回答履歴そのものを復元できる保存データが見つかっていません。':''}</div>`}
 else{panel.innerHTML=`<div class="notice"><b>学習履歴の保存状況</b><br>現在 ${c.attempts}問 / 端末内バックアップ最多 ${best}問 / 候補 ${info.rows.length}件</div>`}
}
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-aa-history-recover]');if(!b)return;e.preventDefault();b.disabled=true;b.textContent='復旧中…';
 try{const ok=await window.AAStorageRecoveryV2?.recover?.();b.textContent=ok?'復旧しました。再読込します':'復旧候補を適用できませんでした';if(ok)setTimeout(()=>location.reload(),700)}catch(_){b.textContent='復旧に失敗しました'}
});
let timer=0;const queue=()=>{clearTimeout(timer);timer=setTimeout(render,80)};
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('aa:storage-recovered',queue);addEventListener('pageshow',queue);queue();setInterval(queue,2500);
})();
