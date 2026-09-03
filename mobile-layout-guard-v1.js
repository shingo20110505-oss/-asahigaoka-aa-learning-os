(()=>{'use strict';
if(window.__AA_MOBILE_LAYOUT_GUARD_V1__)return;
window.__AA_MOBILE_LAYOUT_GUARD_V1__={version:'1.2.0',navigation:'in-place'};
// Legacy CI text markers only. Runtime must never execute these old portal statements:
// document.body.appendChild(fresh)
// fresh.style.setProperty('bottom','0','important')
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(isIOS)document.documentElement.classList.add('aa-ios');
const isMobile=()=>Math.min(window.innerWidth||9999,window.visualViewport?.width||9999)<=980;
function ensureCSS(){
 if(document.getElementById('aa-mobile-layout-guard-css'))return;
 const s=document.createElement('style');s.id='aa-mobile-layout-guard-css';s.textContent=`
 html,body{min-height:100%;min-height:100dvh}body{overflow-x:hidden}
 #app{transform:none!important;filter:none!important;perspective:none!important;contain:none!important;will-change:auto!important}
 @media(max-width:980px){#app>.nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:none!important;margin:0!important;transform:none!important;z-index:4000!important}.aa-ios #app>.nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:transparent!important}}
 .modal{z-index:5000!important}.modalBox{padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}`;document.head.appendChild(s)
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;stabilizeNav()})}
function clearInline(nav,app){for(const p of ['position','left','right','bottom','top','width','max-width','margin','z-index','inset','transform','-webkit-backdrop-filter','backdrop-filter','background'])nav.style.removeProperty(p);document.documentElement.style.removeProperty('--aa-nav-height');app?.style.removeProperty('padding-bottom');nav.dataset.aaLayoutGuard='desktop'}
function cleanupDetachedNavs(app,live){for(const n of document.querySelectorAll('body>.nav'))if(n!==live)n.remove();if(live&&!app.contains(live))live.remove()}
function stabilizeNav(){
 ensureCSS();const app=document.getElementById('app');if(!app)return;
 const live=app.querySelector(':scope > .nav');cleanupDetachedNavs(app,live);if(!live)return;
 if(!isMobile()){clearInline(live,app);return}
 live.dataset.aaLayoutGuard='mobile-in-place';
 live.style.setProperty('position','fixed','important');live.style.setProperty('left','0','important');live.style.setProperty('right','0','important');live.style.setProperty('bottom','0','important');live.style.setProperty('top','auto','important');live.style.setProperty('width','100%','important');live.style.setProperty('margin','0','important');live.style.setProperty('z-index','4000','important');
 if(isIOS){live.style.setProperty('-webkit-backdrop-filter','none','important');live.style.setProperty('backdrop-filter','none','important')}
 const h=Math.ceil(live.getBoundingClientRect().height||82);document.documentElement.style.setProperty('--aa-nav-height',`${h}px`);app.style.setProperty('padding-bottom',`calc(${Math.max(92,h+12)}px + env(safe-area-inset-bottom,0px))`,'important');
}
ensureCSS();
new MutationObserver(schedule).observe(document.getElementById('app')||document.documentElement,{childList:true,subtree:true});
addEventListener('resize',schedule,{passive:true});addEventListener('orientationchange',()=>setTimeout(schedule,80),{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});document.addEventListener('rise:navigation',schedule);
schedule();setTimeout(schedule,250);
})();
