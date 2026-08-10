(()=>{'use strict';
function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
function loadSettings(){loadScript('aa-pet-settings-loader','./v23-pet-settings.js?compat=229-loginzip1')}
function loadV23(){loadScript('aa-v23-loader','./v23-loader.js?compat=229-loginzip1')}
function loadLogin(){loadScript('aa-login-companion-loader','./login-companion-v1.js?v=1.1.0')}
function killLegacy(){document.getElementById('aaPet')?.remove();document.getElementById('aaPetSheet')?.remove();document.getElementById('companion7')?.remove()}
function wire(){if(!window.Companion7){setTimeout(wire,80);return}if(window.__AA_COMPANION_VOICE_WIRED__)return;window.__AA_COMPANION_VOICE_WIRED__=true;killLegacy();
 document.addEventListener('aa:answer',e=>Companion7.event(e.detail?.correct?'correct':'wrong'));
 document.addEventListener('aa:streak',()=>Companion7.event('streak'));
 document.addEventListener('aa:hard',()=>Companion7.event('hard'));
 document.addEventListener('aa:missionComplete',()=>Companion7.event('complete'));
 const mo=new MutationObserver(killLegacy);mo.observe(document.body,{childList:true,subtree:true});
}
loadSettings();loadV23();loadLogin();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();