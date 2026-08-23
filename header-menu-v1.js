(()=>{'use strict';
if(window.__AA_HEADER_MENU_V1__)return;
window.__AA_HEADER_MENU_V1__={version:'1.0.1'};

const STYLE_ID='aa-header-menu-v1-style';
const OVERLAY_ID='aaHeaderMenuOverlay';
const PANEL_ID='aaHeaderMenuPanel';
const TOGGLE_ID='aaHeaderMenuToggle';
let raf=0,lastFocus=null;

function injectStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
 .topBtns>[data-aa-menu-source="1"]{display:none!important}
 #aaStudyTimerFab,#kokugoChronologiaQuickLink{display:none!important}
 #${TOGGLE_ID}{display:inline-grid;place-items:center;min-width:42px;min-height:40px;padding:7px 10px;font-size:22px;line-height:1;letter-spacing:0}
 #${OVERLAY_ID}{position:fixed;inset:0;z-index:110;background:rgba(7,12,22,.48);opacity:0;pointer-events:none;transition:opacity .18s ease}
 #${OVERLAY_ID}.open{opacity:1;pointer-events:auto}
 #${PANEL_ID}{position:absolute;top:0;right:0;height:100%;width:min(360px,88vw);background:var(--card,#fff);color:var(--ink,#172033);box-shadow:-18px 0 48px rgba(0,0,0,.24);transform:translateX(104%);transition:transform .2s ease;overflow:auto;padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(18px + env(safe-area-inset-bottom,0px));font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI","Yu Gothic",sans-serif}
 #${OVERLAY_ID}.open #${PANEL_ID}{transform:translateX(0)}
 .aaMenuHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 12px;border-bottom:1px solid var(--line,#d9e0ea)}
 .aaMenuHead strong{font-size:16px}.aaMenuClose{border:1px solid var(--line,#d9e0ea);background:transparent;color:inherit;border-radius:10px;min-width:40px;min-height:40px;font-size:20px;font-weight:900}
 .aaMenuList{display:grid;gap:8px;padding:14px 0}.aaMenuItem{width:100%;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;text-align:left;border:1px solid var(--line,#d9e0ea);background:var(--card,#fff);color:var(--ink,#172033);border-radius:13px;padding:11px 12px;min-height:52px;text-decoration:none;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:rgba(36,88,211,.12)}
 .aaMenuItem:active{transform:translateY(1px);background:color-mix(in srgb,var(--card,#fff) 88%,var(--blue2,#eaf0ff))}.aaMenuIcon{font-size:19px;text-align:center}.aaMenuText{min-width:0}.aaMenuText b{display:block;font-size:13px}.aaMenuText small{display:block;margin-top:2px;color:var(--sub,#667085);font-size:10px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aaMenuArrow{color:var(--muted,#98a2b3);font-weight:900}
 .aaMenuFoot{padding-top:10px;border-top:1px solid var(--line,#d9e0ea);font-size:10px;line-height:1.5;color:var(--sub,#667085)}
 @media(prefers-reduced-motion:reduce){#${OVERLAY_ID},#${PANEL_ID}{transition:none!important}}
 `;document.head.appendChild(s);
}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function source(sel){return document.querySelector(sel)}
function describeTimer(){const el=source('#aaStudyTimerFab');const t=(el?.textContent||'学習タイマー').trim();return t||'学習タイマー'}
function knownItems(){
 const theme=source('.topBtns [data-action="theme"]');
 const review=source('[data-aa-review]');
 const timer=source('#aaStudyTimerFab');
 const vocab=source('#kokugoChronologiaQuickLink');
 const settings=source('.topBtns [data-route="settings"]');
 return [
  {key:'review',icon:'↻',label:'復習',sub:'Review v2 を開く',source:review,fallback:'./review/'},
  {key:'timer',icon:'⏱',label:'学習タイマー',sub:describeTimer(),source:timer},
  {key:'vocab',icon:'語',label:(vocab?.textContent||'語彙').trim()||'語彙',sub:'語彙ページを開く',source:vocab,fallback:'./vocabulary.html'},
  {key:'theme',icon:'◐',label:'表示テーマ',sub:theme?`${(theme.textContent||'').trim()}モードへ切替`:'明るさを切替',source:theme},
  {key:'settings',icon:'⚙',label:'設定',sub:'アプリ設定を開く',source:settings}
 ];
}
function markHeaderSources(){
 const box=document.querySelector('.topBtns');if(!box)return null;
 [...box.children].forEach(el=>{if(el.id!==TOGGLE_ID)el.dataset.aaMenuSource='1'});
 let toggle=box.querySelector('#'+TOGGLE_ID);
 if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.id=TOGGLE_ID;toggle.className='iconBtn';toggle.setAttribute('aria-label','メニューを開く');toggle.setAttribute('aria-haspopup','dialog');toggle.setAttribute('aria-controls',PANEL_ID);toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';box.appendChild(toggle)}
 return toggle;
}
function ensureOverlay(){
 let o=document.getElementById(OVERLAY_ID);if(o)return o;
 o=document.createElement('div');o.id=OVERLAY_ID;o.setAttribute('aria-hidden','true');
 o.innerHTML=`<aside id="${PANEL_ID}" role="dialog" aria-modal="true" aria-label="アプリメニュー"><div class="aaMenuHead"><strong>メニュー</strong><button type="button" class="aaMenuClose" aria-label="メニューを閉じる">×</button></div><div class="aaMenuList"></div><div class="aaMenuFoot">下部のナビゲーションはこれまで通り使えます。</div></aside>`;
 document.body.appendChild(o);return o;
}
function renderItems(){
 const o=ensureOverlay(),list=o.querySelector('.aaMenuList');if(!list)return;
 const items=knownItems();
 list.innerHTML=items.map(x=>`<button type="button" class="aaMenuItem" data-aa-menu-key="${x.key}"><span class="aaMenuIcon">${x.icon}</span><span class="aaMenuText"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span><span class="aaMenuArrow">›</span></button>`).join('');
}
function openMenu(){const o=ensureOverlay();renderItems();lastFocus=document.activeElement;o.classList.add('open');o.setAttribute('aria-hidden','false');document.getElementById(TOGGLE_ID)?.setAttribute('aria-expanded','true')}
function closeMenu({restoreFocus=true}={}){const o=document.getElementById(OVERLAY_ID);if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true');document.getElementById(TOGGLE_ID)?.setAttribute('aria-expanded','false');if(restoreFocus&&lastFocus?.isConnected)setTimeout(()=>lastFocus.focus?.(),0)}
function activate(key){
 const item=knownItems().find(x=>x.key===key);if(!item)return;
 closeMenu({restoreFocus:false});
 const run=()=>{
  if(key==='review'){location.assign('./review/');return}
  if(key==='vocab'){location.assign('./vocabulary.html');return}
  const el=item.source;
  if(el){try{el.click();return}catch(_){}}
  if(item.fallback)location.assign(item.fallback);
 };
 setTimeout(run,0);
}
function apply(){raf=0;injectStyle();markHeaderSources();ensureOverlay()}
function queue(){if(raf)return;raf=requestAnimationFrame(apply)}
function bind(){
 document.addEventListener('click',e=>{
  const toggle=e.target.closest?.('#'+TOGGLE_ID);if(toggle){e.preventDefault();e.stopPropagation();openMenu();return}
  const close=e.target.closest?.('.aaMenuClose');if(close){e.preventDefault();e.stopPropagation();closeMenu();return}
  const item=e.target.closest?.('[data-aa-menu-key]');if(item){e.preventDefault();e.stopPropagation();activate(item.dataset.aaMenuKey);return}
  const o=document.getElementById(OVERLAY_ID);if(o&&e.target===o){e.preventDefault();closeMenu()}
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById(OVERLAY_ID)?.classList.contains('open')){e.preventDefault();closeMenu()}});
 new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('hashchange',queue);addEventListener('popstate',queue);queue();setTimeout(queue,300);setTimeout(queue,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
