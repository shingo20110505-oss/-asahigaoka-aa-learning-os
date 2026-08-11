(()=>{'use strict';
if(window.__CHRONOLOGIA_FORCE1000_V1__)return;window.__CHRONOLOGIA_FORCE1000_V1__=true;
if(!/(?:^|\/)chronologia\.html$/.test(location.pathname))return;
const PACKS=[
 './chronologia-v7-data-1.js?force1000=20260811a',
 './chronologia-v7-data-2a.js?force1000=20260811a',
 './chronologia-v7-data-2b.js?force1000=20260811a',
 './chronologia-v7-data-3.js?force1000=20260811a',
 './chronologia-v7-data-4.js?force1000=20260811a',
 './chronologia-v7-overrides.js?force1000=20260811a'
];
const CURATED=[
 './chronologia-curated-001-050.js?force1000=20260811a','./chronologia-curated-051-100.js?force1000=20260811a','./chronologia-curated-101-149.js?force1000=20260811a','./chronologia-curated-150.js?force1000=20260811a','./chronologia-curated-151-200.js?force1000=20260811a','./chronologia-curated-201-250.js?force1000=20260811a','./chronologia-curated-251-300.js?force1000=20260811a','./chronologia-curated-301-350.js?force1000=20260811a','./chronologia-curated-351-400.js?force1000=20260811a','./chronologia-curated-401-450.js?force1000=20260811a','./chronologia-curated-451-500.js?force1000=20260811a','./chronologia-curated-501-600.js?force1000=20260811a','./chronologia-curated-601-700.js?force1000=20260811a','./chronologia-curated-701-800.js?force1000=20260811a','./chronologia-curated-801-900.js?force1000=20260811a','./chronologia-curated-901-1000.js?force1000=20260811a','./chronologia-curated-final-fixes.js?force1000=20260811a'
];
function load(src){return new Promise(resolve=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(true);s.onerror=()=>{console.error('Chronologia recovery load failed',src);resolve(false)};document.head.appendChild(s)})}
function updateVisibleCount(n){
 document.querySelectorAll('.stat').forEach(card=>{const label=card.querySelector('.stat-label');const value=card.querySelector('.stat-value');if(label&&value&&/収録データ/.test(label.textContent||''))value.textContent=`${n}件`});
 document.querySelectorAll('.chrono-v7-badge').forEach(el=>el.textContent=`多角史 ${n}件`);
 document.documentElement.dataset.chronologiaItems=String(n);
}
function mergePacks(){
 try{
  if(typeof DATA==='undefined'||typeof byId==='undefined'||typeof state==='undefined')return 0;
  for(const pack of window.CHRONO_V7_PACKS||[]){
   for(const item of pack.items||[]){
    const id=Number(item?.id);if(!Number.isFinite(id))continue;
    const current=byId.get(id);
    if(current){Object.assign(current,item)}else{DATA.push(item);byId.set(id,item);if(typeof exactYearItems!=='undefined'&&/^(紀元前)?\d+年$/.test(item.date||''))exactYearItems.push(item)}
   }
   if(typeof RICH_NOTES!=='undefined')for(const [key,note] of Object.entries(pack.notes||{}))RICH_NOTES[key]={...note,__chronoV7:true};
  }
  const unique=new Map(DATA.map(x=>[Number(x.id),x]));
  if(unique.size!==DATA.length){DATA.splice(0,DATA.length,...[...unique.values()])}
  state.order=[...DATA].sort((a,b)=>(a.sort||0)-(b.sort||0)||(a.id||0)-(b.id||0)).map(x=>x.id);
  if(typeof rebuildSyncSelect==='function')rebuildSyncSelect();
  if(typeof updateStats==='function')updateStats();
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof renderSync==='function')renderSync();
  if(typeof renderWeak==='function')renderWeak();
  if(typeof updateResumeButton==='function')updateResumeButton();
  updateVisibleCount(DATA.length);
  document.dispatchEvent(new CustomEvent('chronologia:content-updated',{detail:{items:DATA.length,source:'force1000-v1'}}));
  return DATA.length;
 }catch(e){console.error('Chronologia recovery merge failed',e);return 0}
}
async function boot(){
 let current=0;try{current=typeof DATA!=='undefined'?DATA.length:0}catch(_){}
 if(current>=1000){updateVisibleCount(current);return}
 window.CHRONO_V7_PACKS=window.CHRONO_V7_PACKS||[];
 for(const src of PACKS)await load(src);
 try{if(window.CHRONO_V7_EXTRA_READY)await window.CHRONO_V7_EXTRA_READY}catch(e){console.error('Chronologia supplemental decode failed',e)}
 for(const src of CURATED)await load(src);
 const n=mergePacks();
 if(n<1000){setTimeout(()=>{const retry=mergePacks();if(retry<1000)console.error(`Chronologia recovery incomplete: ${retry}/1000`)},1200)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();