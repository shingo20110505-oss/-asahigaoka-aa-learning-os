(()=>{'use strict';
if(window.__CHRONOLOGIA_C7_BRIDGE__)return;window.__CHRONOLOGIA_C7_BRIDGE__=true;
function killLegacy(){document.getElementById('chronoCompanion')?.remove();document.getElementById('ccToggle')?.remove();document.getElementById('ccPanel')?.remove();document.querySelectorAll('style').forEach(s=>{if((s.textContent||'').includes('#chronoCompanion'))s.remove()})}
function relay(type,detail={}){if(window.Companion7){if(type==='answer')Companion7.event(detail.correct?'correct':'wrong');else if(type==='streak')Companion7.event('streak');else if(type==='hard')Companion7.event('hard');else if(type==='complete')Companion7.event('complete')}}
killLegacy();
new MutationObserver(killLegacy).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('aa:answer',e=>relay('answer',e.detail||{}));
document.addEventListener('aa:streak',()=>relay('streak'));
document.addEventListener('aa:hard',()=>relay('hard'));
document.addEventListener('aa:missionComplete',()=>relay('complete'));
document.addEventListener('chronologia:voice',e=>{if(window.Companion7&&e.detail?.audio)Companion7.bindAudio(e.detail.audio)});
function loadScript(src){return new Promise(resolve=>{const base=src.split('?')[0];const found=document.querySelector(`script[src^="${base}"]`);if(found){resolve();return}const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=resolve;document.head.appendChild(s)})}

/* Mobile timeline guard: keep the V7 view filter compatible with the original
   display-count control and avoid an initial 1000-row render on narrow screens. */
function installTimelineLimitFix(){
  const limitSelect=document.getElementById('limitSelect');
  if(!limitSelect||typeof getTimelineItems!=='function')return;
  if(window.matchMedia?.('(max-width:620px)').matches&&limitSelect.value==='all'&&limitSelect.dataset.aaMobileDefault!=='1'){
    limitSelect.dataset.aaMobileDefault='1';
    limitSelect.value='100';
  }
  if(getTimelineItems.__aaTimelineLimitFixed)return;
  const base=getTimelineItems;
  const fixed=function(){
    let data=base();
    if(!Array.isArray(data))return data;
    const limit=limitSelect.value||'all';
    if(limit!=='all'){
      const n=Number(limit);
      if(Number.isFinite(n)&&n>=0)data=data.slice(0,n);
    }
    return data;
  };
  fixed.__aaTimelineLimitFixed=true;
  fixed.__aaTimelineLimitBase=base;
  getTimelineItems=fixed;
}
function installTimelineRenderGuard(){
  if(typeof renderTimeline!=='function'||renderTimeline.__aaTimelineRenderGuard)return;
  const base=renderTimeline;
  const guarded=function(...args){installTimelineLimitFix();return base.apply(this,args)};
  guarded.__aaTimelineRenderGuard=true;
  guarded.__aaTimelineRenderBase=base;
  renderTimeline=guarded;
}
installTimelineLimitFix();
installTimelineRenderGuard();
document.addEventListener('chronologia:content-updated',()=>{installTimelineLimitFix();installTimelineRenderGuard();forceTimelineReady()});

let timelineRefreshTimer=0;
function forceTimelineReady(){
  clearTimeout(timelineRefreshTimer);
  timelineRefreshTimer=setTimeout(()=>requestAnimationFrame(()=>{
    try{
      installTimelineLimitFix();installTimelineRenderGuard();
      if(typeof updateStats==='function')updateStats();
      if(typeof renderTimeline==='function')renderTimeline();
      if(typeof renderSync==='function')renderSync();
      if(typeof renderWeak==='function')renderWeak();
      if(typeof DATA!=='undefined'){
        document.querySelectorAll('.chrono-v7-badge').forEach(b=>b.textContent=`多角史 ${DATA.length}件`);
        document.documentElement.dataset.chronologiaItems=String(DATA.length);
        document.dispatchEvent(new CustomEvent('chronologia:content-ready',{detail:{items:DATA.length}}));
      }
    }catch(e){console.warn('Chronologia first-render refresh failed',e)}
  }),32);
}
async function ensureChronologia7(){if(window.__CHRONOLOGIA_V7_RUNTIME__||document.querySelector('script[data-chronologia-v7]')){forceTimelineReady();return}
for(const src of ['./chronologia-v7-data-1.js?v=7.0.1','./chronologia-v7-data-2a.js?v=7.0.1','./chronologia-v7-data-2b.js?v=7.0.1','./chronologia-v7-data-3.js?v=7.1.1','./chronologia-v7-data-4.js?v=7.2.1','./chronologia-v7-overrides.js?v=7.0.1'])await loadScript(src);
try{if(window.CHRONO_V7_EXTRA_READY)await window.CHRONO_V7_EXTRA_READY}catch(e){console.error('Chronologia 1000-item supplement failed',e)}
for(const src of [
'./chronologia-curated-001-050.js?v=1.0.2','./chronologia-curated-051-100.js?v=1.0.2','./chronologia-curated-101-149.js?v=1.0.2','./chronologia-curated-150.js?v=1.0.2','./chronologia-curated-151-200.js?v=1.0.2','./chronologia-curated-201-250.js?v=1.0.2','./chronologia-curated-251-300.js?v=1.0.2','./chronologia-curated-301-350.js?v=1.0.2','./chronologia-curated-351-400.js?v=1.0.2','./chronologia-curated-401-450.js?v=1.0.2','./chronologia-curated-451-500.js?v=1.0.2',
'./chronologia-curated-501-600.js?v=1.0.1','./chronologia-curated-601-700.js?v=1.0.1','./chronologia-curated-701-800.js?v=1.0.1','./chronologia-curated-801-900.js?v=1.0.1','./chronologia-curated-901-1000.js?v=1.0.1','./chronologia-curated-final-fixes.js?v=1.0.1'])await loadScript(src);
await new Promise(resolve=>{const s=document.createElement('script');s.dataset.chronologiaV7='1';s.src='./chronologia-v7-runtime.js?v=7.2.1';s.async=false;s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});forceTimelineReady()}
async function ensureDeepExplanations(){await loadScript('./chronologia-deep-explanations-v3.js?v=3.0.1');await loadScript('./chronologia-deep-polish-v1.js?v=1.0.1');try{if(window.ChronologiaDeepV3?.build)window.ChronologiaDeepV3.build()}catch(_){}forceTimelineReady()}
function ensure(){killLegacy();if(window.Companion7)return;if(!document.querySelector('script[data-c7-bridge]')){const s=document.createElement('script');s.dataset.c7Bridge='1';s.src='./companion7-runtime.js?v=7.4.0';s.async=false;document.head.appendChild(s)}}
async function boot(){installTimelineLimitFix();installTimelineRenderGuard();await ensureChronologia7();await ensureDeepExplanations();forceTimelineReady();ensure()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
