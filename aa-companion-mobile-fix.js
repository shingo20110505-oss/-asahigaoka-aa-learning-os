(()=>{'use strict';
function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
function loadSettings(){loadScript('aa-pet-settings-loader','./v23-pet-settings.js?compat=229-loginzip1')}
function loadV23(){loadScript('aa-v23-loader','./v23-loader.js?compat=229-question-quality1')}
function loadLogin(){loadScript('aa-login-companion-loader','./login-companion-v1.js?v=1.1.0')}
function loadDailyAnalytics(){loadScript('aa-daily-analytics-loader','./analytics-daily-v1.js?v=1.0.0')}
function loadProductionLoginTest(){loadScript('aa-login-production-test-loader','./login-production-test-v1.js?v=1.0.0')}
function killLegacy(){for(const id of ['aaPet','aaPetSheet','companion7','aaPetSettingCard','petSettingWrap','petSettingCard'])document.getElementById(id)?.remove();document.querySelectorAll('#companion7-css,[data-companion-visual]').forEach(x=>x.remove())}
function wire(){if(!window.Companion7){setTimeout(wire,80);return}if(window.__AA_COMPANION_LOGIN_WIRED__)return;window.__AA_COMPANION_LOGIN_WIRED__=true;killLegacy();
 // Keep only the completion signal needed by the login Explosion/streak system.
 // Legacy non-login companion reactions (correct/wrong/streak/hard/complete voices or visuals) are intentionally not wired.
 document.addEventListener('aa:missionComplete',()=>{try{Companion7.recordStudyComplete?.()}catch(_){}});
 const mo=new MutationObserver(killLegacy);mo.observe(document.body,{childList:true,subtree:true});
}
loadSettings();loadV23();loadLogin();loadDailyAnalytics();loadProductionLoginTest();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();