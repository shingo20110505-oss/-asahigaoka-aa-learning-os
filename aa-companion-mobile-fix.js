(()=>{'use strict';
function loadV23(){if(document.getElementById('aa-v23-loader'))return;const v=document.createElement('script');v.id='aa-v23-loader';v.src='./v23-loader.js?compat=229-c74';v.async=false;document.head.appendChild(v)}
function killLegacy(){document.getElementById('aaPet')?.remove();document.getElementById('aaPetSheet')?.remove();}
function wire(){if(!window.Companion7){setTimeout(wire,80);return}killLegacy();
 document.addEventListener('aa:answer',e=>Companion7.event(e.detail?.correct?'correct':'wrong'));
 document.addEventListener('aa:streak',()=>Companion7.event('streak'));
 document.addEventListener('aa:hard',()=>Companion7.event('hard'));
 document.addEventListener('aa:missionComplete',()=>Companion7.event('complete'));
 document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>Companion7.bindAudio(a),{once:true}));
 const mo=new MutationObserver(()=>{killLegacy();const h=document.getElementById('companion7');if(h){const r=h.getBoundingClientRect();if(r.width>150&&innerWidth<500){h.style.width='116px';h.style.height='138px'}}});mo.observe(document.body,{childList:true,subtree:true});
 setTimeout(()=>Companion7.reloadTexture?.(),300);
 setTimeout(()=>{const h=document.getElementById('companion7');if(!h)return;const canvas=h.querySelector('canvas');const blank=!Companion7.source||Companion7.source==='none';if(blank)Companion7.reloadTexture?.();if(canvas&&!canvas.width){canvas.width=420;canvas.height=500}},1200);
 const old=document.getElementById('companion7-check-loader');if(!old){const c=document.createElement('script');c.id='companion7-check-loader';c.src='./companion7-check.js?v=7.3.0';document.head.appendChild(c)}
}
loadV23();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();