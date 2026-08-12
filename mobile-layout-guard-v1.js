(()=>{'use strict';
if(window.__AA_MOBILE_LAYOUT_GUARD_V1__)return;
window.__AA_MOBILE_LAYOUT_GUARD_V1__={version:'1.0.1'};

const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(isIOS)document.documentElement.classList.add('aa-ios');

function ensureCSS(){
 if(document.getElementById('aa-mobile-layout-guard-css'))return;
 const s=document.createElement('style');
 s.id='aa-mobile-layout-guard-css';
 s.textContent=`
 html,body{min-height:100%;min-height:100dvh}
 body{overflow-x:hidden}
 #app{transform:none!important;filter:none!important;perspective:none!important;contain:none!important;will-change:auto!important}
 body>.nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:none!important;margin:0!important;transform:none!important;z-index:4000!important}
 .aa-ios body>.nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:var(--card)!important}
 .modal{z-index:5000!important}
 .modalBox{padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}
 `;
 document.head.appendChild(s);
}

let scheduled=false;
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;adoptNav()});
}

function adoptNav(){
 ensureCSS();
 const app=document.getElementById('app');
 const all=[...document.querySelectorAll('.nav')];
 if(!all.length)return;
 const fresh=all.find(n=>app?.contains(n))||all[all.length-1];
 for(const n of all)if(n!==fresh)n.remove();
 if(fresh.parentElement!==document.body)document.body.appendChild(fresh);
 fresh.dataset.aaLayoutGuard='1';
 fresh.style.setProperty('position','fixed','important');
 fresh.style.setProperty('left','0','important');
 fresh.style.setProperty('right','0','important');
 fresh.style.setProperty('bottom','0','important');
 fresh.style.setProperty('top','auto','important');
 fresh.style.setProperty('width','100%','important');
 fresh.style.setProperty('margin','0','important');
 fresh.style.setProperty('z-index','4000','important');
 if(isIOS){
   fresh.style.setProperty('-webkit-backdrop-filter','none','important');
   fresh.style.setProperty('backdrop-filter','none','important');
 }
 const h=Math.ceil(fresh.getBoundingClientRect().height||82);
 document.documentElement.style.setProperty('--aa-nav-height',`${h}px`);
 if(app)app.style.setProperty('padding-bottom',`calc(${Math.max(92,h+12)}px + env(safe-area-inset-bottom,0px))`,'important');
 setTimeout(()=>verifyNav(fresh),40);
}

function verifyNav(nav){
 if(!nav?.isConnected)return;
 const r=nav.getBoundingClientRect();
 const vh=window.innerHeight||document.documentElement.clientHeight||0;
 if(vh&&Math.abs(r.bottom-vh)>6){
   document.body.appendChild(nav);
   nav.style.setProperty('position','fixed','important');
   nav.style.setProperty('inset','auto 0 0 0','important');
   void nav.offsetHeight;
 }
}

ensureCSS();
const mo=new MutationObserver(schedule);
mo.observe(document.documentElement,{childList:true,subtree:true});
addEventListener('resize',schedule,{passive:true});
addEventListener('orientationchange',()=>setTimeout(schedule,80),{passive:true});
window.visualViewport?.addEventListener('resize',schedule,{passive:true});
window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
document.addEventListener('focusout',()=>setTimeout(schedule,120),true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(schedule,50)});
schedule();
setTimeout(schedule,250);
setTimeout(schedule,900);
})();
