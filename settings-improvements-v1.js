(()=>{'use strict';
function load(id,src,onload){
 if(document.getElementById(id)){onload?.();return}
 const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
 if(onload)s.addEventListener('load',onload,{once:true});
 s.addEventListener('error',()=>console.error('AA loader failed:',src),{once:true});
 document.head.appendChild(s);
}
function loadMenu(){load('aa-header-menu-v1-loader','./header-menu-v1.js?v=1.1.0-20260903')}
load('aa-settings-improvements-core-v1-loader','./settings-improvements-core-v1.js?v=1.0.0-20260823',loadMenu);
})();
